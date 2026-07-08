'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Send,
  Inbox,
  Star,
  Trash2,
  Search,
  Plus,
  Loader2,
  FileText,
  Paperclip,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

interface Email {
  id: string
  from_email: string | null
  to_email: string
  subject: string
  content: string | null
  status: string
  is_starred: boolean
  is_draft: boolean
  created_at: string
}

export function EmailManager() {
  const { user } = useAuth()
  const t = useTranslations('email')
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [activeTab, setActiveTab] = useState<'inbox' | 'starred' | 'drafts'>('inbox')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const db = createClient()

  const TEMPLATES = [
    { id: 'followup', name: t('templateFollowUp'), subject: t('templateFollowUpSubject'), content: t('templateFollowUpContent') },
    { id: 'newproperty', name: t('templateNewProperty'), subject: t('templateNewPropertySubject'), content: t('templateNewPropertyContent') },
    { id: 'visit', name: t('templateVisitConfirmation'), subject: t('templateVisitConfirmationSubject'), content: t('templateVisitConfirmationContent') },
    { id: 'priceupdate', name: t('templatePriceUpdate'), subject: t('templatePriceUpdateSubject'), content: t('templatePriceUpdateContent') },
    { id: 'contract', name: t('templateContractExpiry'), subject: t('templateContractExpirySubject'), content: t('templateContractExpiryContent') },
    { id: 'thankyou', name: t('templateThankYou'), subject: t('templateThankYouSubject'), content: t('templateThankYouContent') },
    { id: 'documents', name: t('templateDocumentRequest'), subject: t('templateDocumentRequestSubject'), content: t('templateDocumentRequestContent') },
    { id: 'birthday', name: t('templateBirthday'), subject: t('templateBirthdaySubject'), content: t('templateBirthdayContent') },
  ]

  // Compose form
  const [form, setForm] = useState({
    to: '',
    subject: '',
    content: '',
  })

  useEffect(() => {
    if (!user) return
    loadEmails()
  }, [user])

  const loadEmails = async () => {
    setLoading(true)
    const { data } = await db
      .from('user_emails')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setEmails(data)
    setLoading(false)
  }

  const sendEmail = async () => {
    if (!form.to || !form.subject || !form.content) {
      toast.error(t('fillAllFields'))
      return
    }

    setSending(true)
    try {
      // Save to database first
      const { data: saved, error: saveError } = await db
        .from('user_emails')
        .insert({
          user_id: user?.id,
          from_email: user?.email || '',
          to_email: form.to,
          subject: form.subject,
          content: form.content,
          status: 'sending',
        })
        .select()
        .single()

      if (saveError) throw saveError

      // Send via API
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.to,
          subject: form.subject,
          content: form.content,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Update status to failed
        await db.from('user_emails').update({ status: 'failed' }).eq('id', saved.id)
        throw new Error(data.error || 'Failed to send')
      }

      // Update status to sent and save resend_id for webhook tracking
      await db.from('user_emails').update({
        status: 'sent',
        resend_id: data.id || null,
      }).eq('id', saved.id)

      toast.success(t('emailSent'))
      setComposing(false)
      setForm({ to: '', subject: '', content: '' })
      await loadEmails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('failedToSend'))
    } finally {
      setSending(false)
    }
  }

  const toggleStar = async (email: Email) => {
    const { error } = await db
      .from('user_emails')
      .update({ is_starred: !email.is_starred })
      .eq('id', email.id)

    if (!error) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, is_starred: !e.is_starred } : e)),
      )
    }
  }

  const deleteEmail = async (id: string) => {
    const { error } = await db.from('user_emails').delete().eq('id', id)
    if (!error) {
      setEmails((prev) => prev.filter((e) => e.id !== id))
      if (selectedEmail?.id === id) setSelectedEmail(null)
      toast.success(t('emailDeleted'))
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setForm((prev) => ({
        ...prev,
        subject: template.subject,
        content: template.content,
      }))
    }
  }

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error(t('aiPromptRequired'))
      return
    }
    setAiGenerating(true)
    try {
      const promptParts = [
        form.subject ? `Assunto: ${form.subject}` : '',
        form.to ? `Destinatário: ${form.to}` : '',
        `Solicitação: ${aiPrompt}`,
      ].filter(Boolean).join('\n')

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: promptParts }],
          maxTokens: 1024,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('aiFailed'))
      }

      setForm((prev) => ({ ...prev, content: data.text }))
      setAiPrompt('')
      toast.success(t('aiGenerated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('aiFailed'))
    } finally {
      setAiGenerating(false)
    }
  }

  const filteredEmails = emails.filter((e) => {
    if (activeTab === 'starred') return e.is_starred
    if (activeTab === 'drafts') return e.is_draft
    if (search) {
      const q = search.toLowerCase()
      return (
        e.subject.toLowerCase().includes(q) ||
        e.to_email.toLowerCase().includes(q) ||
        (e.content?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Sidebar */}
      <div className="space-y-4">
        <Button onClick={() => setComposing(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {t('compose')}
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {[
            { id: 'inbox' as const, label: t('inbox'), icon: Inbox },
            { id: 'starred' as const, label: t('starred'), icon: Star },
            { id: 'drafts' as const, label: t('drafts'), icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-md transition-all ${
                activeTab === id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Email List */}
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {t('noEmails')}
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold truncate">{email.to_email}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(email) }}
                    className={`shrink-0 ${email.is_starred ? 'text-yellow-500' : 'text-muted-foreground/30'}`}
                  >
                    <Star className="h-3 w-3" fill={email.is_starred ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(email.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-2">
        {composing ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">{t('newEmail')}</h3>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                    className="text-xs border rounded-md px-2 py-1 bg-background"
                  >
                    <option value="">{t('templates')}</option>
                    {TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>{t('cancel')}</Button>
                </div>
              </div>

              <Input
                placeholder={t('to')}
                value={form.to}
                onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
              />
              <Input
                placeholder={t('subject')}
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              />
              <Textarea
                placeholder={t('writeEmail')}
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                rows={12}
                className="resize-none"
              />

              {/* AI Section */}
              <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {t('aiWrite')}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('aiPlaceholder')}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && generateWithAI()}
                    className="text-xs"
                    disabled={aiGenerating}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={generateWithAI}
                    disabled={aiGenerating || !aiPrompt.trim()}
                  >
                    {aiGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setComposing(false)}>{t('cancel')}</Button>
                <Button onClick={sendEmail} disabled={sending}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t('send')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : selectedEmail ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{selectedEmail.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    To: {selectedEmail.to_email}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {new Date(selectedEmail.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleStar(selectedEmail)}>
                    <Star className="h-4 w-4" fill={selectedEmail.is_starred ? 'currentColor' : 'none'} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteEmail(selectedEmail.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm whitespace-pre-wrap">{selectedEmail.content}</p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  selectedEmail.status === 'sent' ? 'bg-green-500/10 text-green-600'
                    : selectedEmail.status === 'failed' ? 'bg-red-500/10 text-red-600'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {selectedEmail.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="min-h-[400px]">
            <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <Inbox className="h-16 w-16 mb-3 opacity-30" />
              <p className="text-sm">{t('selectEmail')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
