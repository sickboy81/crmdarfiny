'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  Loader2,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Sparkles,
  Copy,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  extractLeadsFromText,
  extractLeadsFromSpreadsheet,
  extractLeadsFromImage,
  type ExtractedLead,
} from '@/lib/contacts/extract-leads'

interface UploadedFile {
  id: string
  file: File
  type: 'image' | 'spreadsheet' | 'text'
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export function ContactExtractor() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [textInput, setTextInput] = useState('')
  const [leads, setLeads] = useState<ExtractedLead[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileType = (file: File): 'image' | 'spreadsheet' | 'text' => {
    if (file.type.startsWith('image/')) return 'image'
    if (
      file.type === 'application/pdf' ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.csv')
    )
      return 'spreadsheet'
    return 'text'
  }

  const addFiles = useCallback((newFiles: File[]) => {
    const accepted = newFiles.filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf' ||
        f.type.includes('spreadsheet') ||
        f.type.includes('excel') ||
        f.name.endsWith('.xlsx') ||
        f.name.endsWith('.xls') ||
        f.name.endsWith('.csv') ||
        f.name.endsWith('.txt'),
    )
    if (accepted.length !== newFiles.length) {
      toast.warning('Some files were ignored (unsupported format).')
    }
    const uploads: UploadedFile[] = accepted.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      type: getFileType(f),
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...uploads])
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(Array.from(e.dataTransfer.files))
    },
    [addFiles],
  )

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const processAll = async () => {
    const allLeads: ExtractedLead[] = []

    // Process text input
    if (textInput.trim()) {
      const textLeads = extractLeadsFromText(textInput, 'Text Input')
      allLeads.push(...textLeads)
    }

    // Process files
    const updatedFiles = [...files]
    for (let i = 0; i < updatedFiles.length; i++) {
      updatedFiles[i] = { ...updatedFiles[i], status: 'processing' }
      setFiles([...updatedFiles])

      try {
        let extracted: ExtractedLead[] = []
        if (updatedFiles[i].type === 'image') {
          extracted = await extractLeadsFromImage(updatedFiles[i].file)
        } else if (updatedFiles[i].type === 'spreadsheet') {
          extracted = await extractLeadsFromSpreadsheet(updatedFiles[i].file)
        }
        allLeads.push(...extracted)
        updatedFiles[i] = { ...updatedFiles[i], status: 'done' }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        updatedFiles[i] = { ...updatedFiles[i], status: 'error', error: msg }
      }
      setFiles([...updatedFiles])
    }

    // Deduplicate
    const unique = allLeads.filter(
      (lead, index, self) =>
        index ===
        self.findIndex(
          (l) =>
            (lead.phone && l.phone === lead.phone) || (lead.email && l.email === lead.email),
        ),
    )

    setLeads(unique)
    if (unique.length > 0) {
      toast.success(`${unique.length} contact(s) extracted!`)
    } else {
      toast.warning('No contacts found.')
    }
    setIsProcessing(false)
  }

  const handleExport = () => {
    if (leads.length === 0) return
    const ws = XLSX.utils.json_to_sheet(
      leads.map((l) => ({
        Name: l.name,
        Phone: l.phone,
        Email: l.email,
        Source: l.source,
      })),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
    XLSX.writeFile(wb, 'extracted_contacts.xlsx')
    toast.success('Exported!')
  }

  const handleCopy = useCallback(async () => {
    if (leads.length === 0) return
    const text = leads.map((l) => `${l.name}\t${l.phone}\t${l.email}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }, [leads])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Input Panel */}
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <Upload className={`h-10 w-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-center">
              <p className="font-bold text-sm">
                {isDragging ? 'Drop files here' : 'Click or drag files'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, spreadsheets (XLSX/CSV), PDFs, or text files
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files))
                e.target.value = ''
              }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Files ({files.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((uf) => (
                  <div key={uf.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      uf.status === 'done' ? 'bg-green-500/20'
                        : uf.status === 'error' ? 'bg-red-500/20'
                        : uf.status === 'processing' ? 'bg-blue-500/20'
                        : 'bg-muted'
                    }`}>
                      {uf.status === 'processing' ? (
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                      ) : uf.status === 'done' ? (
                        <CheckCircle2 size={14} className="text-green-500" />
                      ) : uf.status === 'error' ? (
                        <AlertCircle size={14} className="text-red-500" />
                      ) : (
                        <FileText size={14} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{uf.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {uf.status === 'error' ? uf.error : `${uf.type} — ${(uf.file.size / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                    {uf.status === 'pending' && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(uf.id)}>
                        <X size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text input */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Or paste text
            </p>
            <Textarea
              placeholder="Paste text containing contacts (names, phones, emails)..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <Button
            onClick={processAll}
            disabled={isProcessing || (files.length === 0 && !textInput.trim())}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Extract Contacts
              </>
            )}
          </Button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Extracted Contacts ({leads.length})
            </h3>
            {leads.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-3 w-3 mr-1" />
                  Export XLSX
                </Button>
              </div>
            )}
          </div>

          {leads.length === 0 ? (
            <Card className="min-h-[300px]">
              <CardContent className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Extracted contacts will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted sticky top-0">
                        <th className="px-4 py-2 text-left font-bold">Name</th>
                        <th className="px-4 py-2 text-left font-bold">Phone</th>
                        <th className="px-4 py-2 text-left font-bold">Email</th>
                        <th className="px-4 py-2 text-left font-bold">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, i) => (
                        <tr key={i} className="border-t hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-2 font-medium">{lead.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{lead.phone || '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{lead.email || '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground text-[10px]">{lead.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
