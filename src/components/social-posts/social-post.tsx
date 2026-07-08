'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles, Copy, Share2, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type Platform = 'facebook' | 'instagram' | 'x' | 'tiktok' | 'linkedin' | 'whatsapp'

interface PlatformInfo {
  id: Platform
  name: string
  icon: string
  charLimit: number
}

const PLATFORMS: PlatformInfo[] = [
  { id: 'facebook', name: 'Facebook', icon: '📘', charLimit: 63206 },
  { id: 'instagram', name: 'Instagram', icon: '📸', charLimit: 2200 },
  { id: 'x', name: 'X (Twitter)', icon: '🐦', charLimit: 280 },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', charLimit: 4000 },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', charLimit: 3000 },
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', charLimit: 65536 },
]

function buildPlatformPrompt(platform: Platform, input: string, t: (key: string, params?: Record<string, string>) => string): string {
  const base = input.trim()
  const platformName = PLATFORMS.find((p) => p.id === platform)?.name || platform

  const guidelineKeys: Record<Platform, string> = {
    facebook: 'guidelinesFacebook',
    instagram: 'guidelinesInstagram',
    x: 'guidelinesX',
    tiktok: 'guidelinesTiktok',
    linkedin: 'guidelinesLinkedin',
    whatsapp: 'guidelinesWhatsapp',
  }

  return t('promptSocial', {
    platform: platformName,
    input: base,
    guidelines: t(guidelineKeys[platform]),
  })
}

export function SocialPost() {
  const t = useTranslations('socialPosts')
  const [platform, setPlatform] = useState<Platform>('facebook')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) {
      toast.error(t('describePost'))
      return
    }

    setLoading(true)
    setOutput('')

    try {
      const prompt = buildPlatformPrompt(platform, input, t)
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 1024,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: t('generationFailed') }))
        throw new Error(err.error || t('generationFailed'))
      }

      const data = await response.json()
      setOutput(data.text || data.content || '')
      toast.success(t('postGenerated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('generationFailed'))
    } finally {
      setLoading(false)
    }
  }, [platform, input, t])

  const handleCopy = useCallback(async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    toast.success(t('copied'))
    setTimeout(() => setCopied(false), 2000)
  }, [output, t])

  const currentPlatform = PLATFORMS.find((p) => p.id === platform)!
  const charCount = output.length

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Input Panel */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">{t('selectPlatform')}</h3>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  platform === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">
            {t('whatToPost')}
          </h3>
          <Textarea
            placeholder={t('inputPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !input.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" />
              {t('generate', { platform: currentPlatform.name })}
            </>
          )}
        </Button>
      </div>

      {/* Output Panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{t('generatedPost')}</h3>
          {output && (
            <div className="flex items-center gap-3">
              <span
                className={`text-xs ${
                  charCount > currentPlatform.charLimit
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {charCount}/{currentPlatform.charLimit}
              </span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        <Card className="min-h-[250px]">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[210px] text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">{t('generatingPost')}</p>
              </div>
            ) : output ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {output}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[210px] text-muted-foreground">
                <Share2 className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{t('postWillAppear')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
