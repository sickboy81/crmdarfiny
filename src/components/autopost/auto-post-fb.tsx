'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Share2,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Send,
  Image as ImageIcon,
  Search,
  Users,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface SelectedGroup {
  id: string
  name: string
}

export function AutoPostFB() {
  const [message, setMessage] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoUrlInput, setPhotoUrlInput] = useState('')
  const [delaySeconds, setDelaySeconds] = useState(3)
  const [selectedGroups, setSelectedGroups] = useState<SelectedGroup[]>([])
  const [groupIdInput, setGroupIdInput] = useState('')
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupsLoadError, setGroupsLoadError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<
    Array<{ id: string; name: string; success: boolean; error?: string }>
  >([])
  const [bulkImportText, setBulkImportText] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return selectedGroups
    const q = groupSearch.trim().toLowerCase()
    return selectedGroups.filter(
      (g) => g.name.toLowerCase().includes(q) || g.id.includes(q),
    )
  }, [selectedGroups, groupSearch])

  const addPhotoUrl = useCallback(() => {
    const url = photoUrlInput.trim()
    if (!url) return
    if (!url.match(/^https?:\/\//)) {
      toast.error('Please enter a valid URL')
      return
    }
    setPhotoUrls((prev) => [...prev, url])
    setPhotoUrlInput('')
  }, [photoUrlInput])

  const removePhotoUrl = useCallback((index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddGroupById = useCallback(() => {
    const id = groupIdInput.trim().replace(/\D/g, '')
    if (!id) return
    if (selectedGroups.some((g) => g.id === id)) {
      setGroupIdInput('')
      return
    }
    setSelectedGroups((prev) => [...prev, { id, name: `Group ${id}` }])
    setGroupIdInput('')
  }, [groupIdInput, selectedGroups])

  const removeGroup = useCallback((id: string) => {
    setSelectedGroups((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const handleBulkImport = useCallback(() => {
    try {
      const json = JSON.parse(bulkImportText)
      if (Array.isArray(json)) {
        const newGroups = json
          .filter((g: any) => g.id && g.name)
          .map((g: any) => ({ id: String(g.id), name: g.name }))

        if (newGroups.length > 0) {
          setSelectedGroups((prev) => {
            const existing = new Set(prev.map((p) => p.id))
            const unique = newGroups.filter((n: any) => !existing.has(n.id))
            return [...prev, ...unique]
          })
          toast.success(`${newGroups.length} groups imported!`)
          setBulkImportText('')
          setShowBulkImport(false)
          return
        }
      }
    } catch {
      // Not JSON, try plain text
    }

    const lines = bulkImportText.split('\n').filter((line) => line.trim())
    const newGroups: SelectedGroup[] = []
    for (const line of lines) {
      const cleaned = line.trim()
      if (!cleaned) continue
      const idMatch = cleaned.match(/\/(\d{5,})/)
      if (idMatch) {
        newGroups.push({ id: idMatch[1], name: `Group ${idMatch[1]}` })
      } else if (/^\d{5,}$/.test(cleaned)) {
        newGroups.push({ id: cleaned, name: `Group ${cleaned}` })
      }
    }

    if (newGroups.length > 0) {
      setSelectedGroups((prev) => {
        const existing = new Set(prev.map((p) => p.id))
        const unique = newGroups.filter((n) => !existing.has(n.id))
        return [...prev, ...unique]
      })
      toast.success(`${newGroups.length} groups imported!`)
      setBulkImportText('')
      setShowBulkImport(false)
    } else {
      toast.error('No valid group IDs found')
    }
  }, [bulkImportText])

  const handlePost = useCallback(async () => {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    if (selectedGroups.length === 0) {
      toast.error('Please add at least one group')
      return
    }

    setPosting(true)
    setResults([])
    setProgress({ current: 0, total: selectedGroups.length })

    const allResults: Array<{ id: string; name: string; success: boolean; error?: string }> = []

    for (let i = 0; i < selectedGroups.length; i++) {
      const group = selectedGroups[i]
      setProgress({ current: i + 1, total: selectedGroups.length })

      try {
        // Try posting via Chrome extension first
        const extensionAvailable = !!window.postMessage

        if (extensionAvailable) {
          window.postMessage(
            {
              type: 'CRM_FB_POST',
              groupId: group.id,
              message: message,
              photoUrls: photoUrls,
            },
            '*',
          )

          // Wait for response or timeout
          const response = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => resolve(false), 5000)
            const handler = (event: MessageEvent) => {
              if (event.data?.type === 'CRM_FB_POST_RESULT' && event.data.groupId === group.id) {
                clearTimeout(timeout)
                window.removeEventListener('message', handler)
                resolve(!!event.data.success)
              }
            }
            window.addEventListener('message', handler)
          })

          allResults.push({
            id: group.id,
            name: group.name,
            success: response,
            error: response ? undefined : 'Extension not available',
          })
        } else {
          allResults.push({
            id: group.id,
            name: group.name,
            success: false,
            error: 'Chrome extension not detected',
          })
        }
      } catch (error) {
        allResults.push({
          id: group.id,
          name: group.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Delay between posts
      if (i < selectedGroups.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000))
      }
    }

    setResults(allResults)
    setPosting(false)

    const successCount = allResults.filter((r) => r.success).length
    if (successCount > 0) {
      toast.success(`Posted to ${successCount}/${selectedGroups.length} groups`)
    } else {
      toast.error('Failed to post to any groups')
    }
  }, [message, photoUrls, selectedGroups, delaySeconds])

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write your Facebook post here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />

            <div className="flex items-center gap-2">
              <Input
                type="url"
                placeholder="Paste image URL..."
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhotoUrl())}
                className="flex-1"
              />
              {photoUrlInput.trim() && (
                <Button variant="outline" size="icon" onClick={addPhotoUrl}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {photoUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhotoUrl(i)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="text-sm text-muted-foreground">Delay between posts:</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value) || 3)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </CardContent>
        </Card>

        {/* Facebook Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Facebook Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  F
                </div>
                <div>
                  <div className="font-bold text-sm">Your Page</div>
                  <div className="text-xs text-muted-foreground">Just now</div>
                </div>
              </div>
              <div className="text-sm whitespace-pre-wrap mb-3">
                {message || <span className="text-muted-foreground italic">Your message will appear here...</span>}
              </div>
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                  {photoUrls.slice(0, 4).map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups & Results */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Target Groups</CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowBulkImport(!showBulkImport)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showBulkImport && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <Textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder="Paste group IDs or JSON..."
                  rows={4}
                  className="resize-none text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleBulkImport} className="flex-1">
                    Import
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowBulkImport(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Group ID"
                value={groupIdInput}
                onChange={(e) => setGroupIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroupById()}
              />
              <Button size="icon" variant="outline" onClick={handleAddGroupById}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {selectedGroups.length} groups selected
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {filteredGroups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{g.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeGroup(g.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handlePost}
              disabled={posting || !message.trim() || selectedGroups.length === 0}
              className="w-full"
            >
              {posting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting {progress.current}/{progress.total}...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post to {selectedGroups.length} Groups
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                      r.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    {r.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.name}</div>
                      {r.error && <div className="text-xs text-destructive truncate">{r.error}</div>}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        r.success ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {r.success ? 'OK' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
