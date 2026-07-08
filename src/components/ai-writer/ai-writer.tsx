'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Copy, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type TemplateType = 'email' | 'proposal' | 'contract' | 'whatsapp' | 'custom'

interface Template {
  id: TemplateType
  nameKey: string
  icon: string
}

const TEMPLATES: Template[] = [
  { id: 'email', nameKey: 'email', icon: '📧' },
  { id: 'proposal', nameKey: 'proposal', icon: '📋' },
  { id: 'contract', nameKey: 'contract', icon: '📝' },
  { id: 'whatsapp', nameKey: 'whatsapp', icon: '💬' },
  { id: 'custom', nameKey: 'custom', icon: '✨' },
]

function buildPrompt(template: TemplateType, input: string, lang: string): string {
  const base = input.trim()
  const langSuffix =
    lang === 'auto'
      ? ''
      : ` Write the final output in ${
          lang === 'pt' ? 'Portuguese' : lang === 'es' ? 'Spanish' : 'English'
        }.`

  switch (template) {
    case 'email':
      return `Write a professional email based on this description: ${base}. Format with subject line, greeting, body, and closing. Keep it concise and professional.${langSuffix}`
    case 'proposal':
      return `Write a business proposal based on this description: ${base}. Include executive summary, objectives, scope, timeline, and pricing. Be professional and persuasive.${langSuffix}`
    case 'contract':
      return `Write contract terms based on this description: ${base}. Include parties, scope, payment terms, timeline, and signatures section. Use formal legal language.${langSuffix}`
    case 'whatsapp':
      return `Write a WhatsApp message based on this description: ${base}. Keep it friendly, concise, and conversational. Use emojis sparingly.${langSuffix}`
    case 'custom':
      return base + (langSuffix ? ` (Write it in ${lang === 'pt' ? 'Portuguese' : lang === 'es' ? 'Spanish' : 'English'})` : '')
    default:
      return base
  }
}

export function AiWriter() {
  const t = useTranslations('aiWriter')
  const [template, setTemplate] = useState<TemplateType>('email')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [language, setLanguage] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Multi-step loader states
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Steps based on chosen template
  const getSteps = useCallback((type: TemplateType) => {
    switch (type) {
      case 'email':
        return [
          { title: 'Analisando assunto e destinatário', desc: 'Identificando pontos-chave' },
          { title: 'Definindo tom e estrutura', desc: 'Ajustando formalidade' },
          { title: 'Escrevendo corpo do e-mail', desc: 'Redigindo conteúdo principal' },
          { title: 'Formatando e refinando', desc: 'Polimento final' },
        ]
      case 'proposal':
        return [
          { title: 'Criando escopo do projeto', desc: 'Definindo limites' },
          { title: 'Estruturando objetivos', desc: 'Alinhando metas comerciais' },
          { title: 'Gerando termos de precificação', desc: 'Calculando estimativas' },
          { title: 'Formatando documento de proposta', desc: 'Polimento final' },
        ]
      case 'contract':
        return [
          { title: 'Identificando partes e obrigações', desc: 'Carregando dados da descrição' },
          { title: 'Estruturando cláusulas legais', desc: 'Definindo termos do contrato' },
          { title: 'Redigindo disposições gerais', desc: 'Formalizando a minuta' },
          { title: 'Revisando conformidade e assinaturas', desc: 'Polimento final' },
        ]
      case 'whatsapp':
        return [
          { title: 'Definindo tom da conversa', desc: 'Ajustando estilo dinâmico' },
          { title: 'Criando gancho inicial', desc: 'Buscando engajamento imediato' },
          { title: 'Redigindo mensagem concisa', desc: 'Escrevendo conteúdo e emojis' },
          { title: 'Revisando formatação', desc: 'Polimento final' },
        ]
      case 'custom':
      default:
        return [
          { title: 'Processando instruções', desc: 'Analisando prompt personalizado' },
          { title: 'Estruturando resposta', desc: 'Planejando seções' },
          { title: 'Redigindo conteúdo detalhado', desc: 'Escrevendo resposta' },
          { title: 'Formatando e refinando', desc: 'Polimento final' },
        ]
    }
  }, [])

  const steps = getSteps(template)

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) {
      toast.error(t('enterDescription'))
      return
    }

    setLoading(true)
    setOutput('')
    setElapsedTime(0)
    setCurrentStepIndex(0)

    // Timer interval
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    // Simulation steps interval
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 2500)

    try {
      const prompt = buildPrompt(template, input, language)
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 2048,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: t('generationFailed') }))
        throw new Error(err.error || t('generationFailed'))
      }

      const data = await response.json()
      
      // Fast forward steps to completion on success
      setCurrentStepIndex(steps.length)
      setOutput(data.text || data.content || '')
      toast.success(t('contentGenerated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('generationFailed'))
    } finally {
      clearInterval(timerInterval)
      clearInterval(stepInterval)
      setLoading(false)
    }
  }, [template, input, language, t, steps.length])

  const handleCopy = useCallback(async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    toast.success(t('copied'))
    setTimeout(() => setCopied(false), 2000)
  }, [output, t])

  const wordCount = output ? output.trim().split(/\s+/).filter(Boolean).length : 0

  // Format elapsed time (e.g. 1m 14s or 14s)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  // Calculate simulated progress percentage
  // If loading is finished and output is ready, it's 100%
  // Otherwise, it increases as stepIndex increases
  const progressPercent = loading
    ? Math.min(
        95,
        Math.round(((currentStepIndex + 0.5) / steps.length) * 100)
      )
    : output
      ? 100
      : 0

  // Get dynamic loading title
  const getLoadingTitle = () => {
    switch (template) {
      case 'email':
        return 'Gerando seu e-mail...'
      case 'proposal':
        return 'Gerando sua proposta...'
      case 'contract':
        return 'Gerando seu contrato...'
      case 'whatsapp':
        return 'Gerando sua mensagem...'
      case 'custom':
      default:
        return 'Gerando seu conteúdo...'
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Input Panel */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">{t('chooseTemplate')}</h3>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setTemplate(tmpl.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  template === tmpl.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span>{tmpl.icon}</span>
                <span>{tmpl.id === 'email' ? 'Email' : tmpl.id === 'whatsapp' ? 'WhatsApp' : t(tmpl.nameKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('language')}</Label>
          <Select value={language} onValueChange={(val) => setLanguage(val || 'auto')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t('langAuto')}</SelectItem>
              <SelectItem value="pt">{t('langPt')}</SelectItem>
              <SelectItem value="en">{t('langEn')}</SelectItem>
              <SelectItem value="es">{t('langEs')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">
            {t('describeNeed')}
          </h3>
          <Textarea
            placeholder={
              template === 'email'
                ? t('placeholderEmail')
                : template === 'proposal'
                  ? t('placeholderProposal')
                  : template === 'contract'
                    ? t('placeholderContract')
                    : template === 'whatsapp'
                      ? t('placeholderWhatsapp')
                      : t('placeholderCustom')
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
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
              <Sparkles className="mr-2 h-4 w-4" />
              {t('generate')}
            </>
          )}
        </Button>
      </div>

      {/* Output Panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{t('generatedContent')}</h3>
          {output && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {wordCount} {t('words')}
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

        <Card className="min-h-[380px] flex flex-col justify-between">
          <CardContent className="p-6 flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="w-full max-w-md mx-auto space-y-6">
                {/* Header info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums font-mono bg-secondary/50 px-2 py-0.5 rounded">
                      {formatTime(elapsedTime)}
                    </span>
                    <span className="text-emerald-500 font-semibold">{progressPercent}%</span>
                  </div>
                  <h4 className="text-base font-semibold text-foreground tracking-tight">
                    {getLoadingTitle()}
                  </h4>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-secondary/80 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/80 italic">
                    A IA está escrevendo e refinando o conteúdo (pode levar alguns segundos)
                  </p>
                </div>

                {/* Steps List */}
                <div className="space-y-3 pt-2">
                  {steps.map((step, idx) => {
                    const isDone = idx < currentStepIndex
                    const isActive = idx === currentStepIndex
                    const isPending = idx > currentStepIndex

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 transition-opacity duration-300 ${
                          isPending ? 'opacity-40' : 'opacity-100'
                        }`}
                      >
                        {/* Icon Indicator */}
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                          ) : isActive ? (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-emerald-500 text-emerald-500 animate-pulse relative">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute" />
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-muted" />
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isActive ? 'text-emerald-500 font-semibold' : 'text-foreground'
                              }`}
                            >
                              {step.title}
                            </span>
                            {isDone && (
                              <span className="text-[10px] font-bold text-emerald-500 tracking-wider">
                                FEITO
                              </span>
                            )}
                          </div>
                          {step.desc && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                              {step.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : output ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed self-start w-full">
                {output}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground w-full">
                <FileText className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{t('placeholderDefault')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
