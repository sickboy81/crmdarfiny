'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Upload,
  FileText,
  Loader2,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Table2,
  Sparkles,
  ChevronDown,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { extractBankTransactions } from '@/lib/bank-extractor/extract'
import { exportToXLSX } from '@/lib/bank-extractor/spreadsheet'
import type { BankTransaction, SpreadsheetData, SpreadsheetMeta } from '@/lib/bank-extractor/types'

const MONTH_NAMES_PT = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
]

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function buildSpreadsheetData(transactions: BankTransaction[]): SpreadsheetData {
  const data: SpreadsheetData = {}
  for (const t of transactions) {
    const [year, month, day] = t.date.split('-').map(Number)
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (!data[key]) data[key] = {}
    if (!data[key][day]) data[key][day] = []
    data[key][day].push(t.amount)
  }
  return data
}

interface UploadedFile {
  id: string
  file: File
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export function BankExtractor() {
  const t = useTranslations('bankExtractor')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactions, setTransactions] = useState<BankTransaction[] | null>(null)
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [meta, setMeta] = useState<SpreadsheetMeta>({
    processo: '',
    banco: '',
    profissao: '',
    agencia: '',
    dtInicial: '',
    nome: '',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: File[]) => {
    const accepted = newFiles.filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/'),
    )
    if (accepted.length !== newFiles.length) {
      toast.warning(t('onlySupported'))
    }
    const uploads: UploadedFile[] = accepted.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
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

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error(t('addFiles'))
      return
    }

    setIsProcessing(true)
    setTransactions(null)
    setSpreadsheetData(null)

    const allTransactions: BankTransaction[] = []
    const updatedFiles = [...files]

    for (let i = 0; i < updatedFiles.length; i++) {
      updatedFiles[i] = { ...updatedFiles[i], status: 'processing' }
      setFiles([...updatedFiles])

      try {
        const txns = await extractBankTransactions(updatedFiles[i].file)
        allTransactions.push(...txns)
        updatedFiles[i] = { ...updatedFiles[i], status: 'done' }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        updatedFiles[i] = { ...updatedFiles[i], status: 'error', error: msg }
        toast.error(t('processingError', { name: updatedFiles[i].file.name }))
      }
      setFiles([...updatedFiles])
    }

    if (allTransactions.length > 0) {
      const credits = allTransactions.filter((t) => t.type === 'credit')
      setTransactions(credits)
      setSpreadsheetData(buildSpreadsheetData(credits))
      toast.success(`${credits.length} credit(s) extracted successfully!`)
    } else {
      toast.warning(t('noTransactions'))
    }

    setIsProcessing(false)
  }

  const months = spreadsheetData ? Object.keys(spreadsheetData).sort() : []
  const totals = months.map((m) => {
    const md = spreadsheetData?.[m] || {}
    return Object.values(md)
      .flat()
      .reduce((a, v) => a + v, 0)
  })
  const grandTotal = totals.reduce((a, b) => a + b, 0)
  const mediaApurada = totals.length > 0 ? grandTotal / totals.length : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
              <Table2 size={20} className="text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold">{t('headerTitle')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('headerDesc')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowInfoPanel((v) => !v)}>
          <Info className="h-4 w-4 mr-1" />
          {t('rules')}
        </Button>
      </div>

      {showInfoPanel && (
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl space-y-2">
          <p className="text-sm font-bold text-primary">{t('rulesTitle')}</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{t('rules1')}</li>
            <li>{t('rules2')}</li>
            <li>{t('rules3')}</li>
            <li>{t('rules4')}</li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* LEFT: Upload + Meta */}
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
                {isDragging ? t('dropZoneActive') : t('dropZone')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t('supportedFormats')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
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
                        {uf.status === 'error' ? uf.error : `${(uf.file.size / 1024).toFixed(0)} KB`}
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
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => { setFiles([]); setTransactions(null); setSpreadsheetData(null) }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t('removeAll')}
              </Button>
            </div>
          )}

          {/* Meta fields */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t('spreadsheetData')}
              </p>
              {[
                { key: 'nome' as const, label: t('name') },
                { key: 'processo' as const, label: t('case') },
                { key: 'banco' as const, label: t('bank') },
                { key: 'profissao' as const, label: t('profession') },
                { key: 'agencia' as const, label: t('agency') },
                { key: 'dtInicial' as const, label: t('startDate') },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </label>
                  <Input
                    type="text"
                    value={meta[key]}
                    onChange={(e) => setMeta((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={label}
                    className="mt-1"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button
            onClick={processFiles}
            disabled={isProcessing || files.length === 0}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('extractButton')}
              </>
            )}
          </Button>
        </div>

        {/* RIGHT: Preview table */}
        <div className="xl:col-span-2 space-y-4">
          {!spreadsheetData && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border border-dashed rounded-xl">
              <Table2 className="h-16 w-16 text-muted-foreground/30" />
              <div>
                <p className="font-bold">{t('spreadsheetEmpty')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('spreadsheetEmptyDesc')}
                </p>
              </div>
            </div>
          )}

          {isProcessing && !spreadsheetData && (
            <div className="space-y-3 p-6 border rounded-xl animate-pulse">
              {[80, 65, 90, 70, 85, 60, 75, 95].map((w, i) => (
                <div key={i} className="h-4 bg-muted rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {spreadsheetData && months.length > 0 && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {t('months')}
                    </p>
                    <p className="text-2xl font-bold text-primary">{months.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Total Credits
                    </p>
                    <p className="text-lg font-bold text-primary">{BRL(grandTotal)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center bg-primary/5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {t('average')}
                    </p>
                    <p className="text-lg font-bold text-primary">{BRL(mediaApurada)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Export button */}
              <Button onClick={() => exportToXLSX(spreadsheetData, meta)} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {t('exportXLSX')}
              </Button>

              {/* Table preview */}
              <Card>
                <CardContent className="p-0 overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{t('headerTitle')}</p>
                      {meta.nome && <p className="text-xs text-muted-foreground">{t('name')}: {meta.nome}</p>}
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {t('creditsCount', { count: transactions?.length || 0 })}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-primary text-primary-foreground font-bold px-4 py-3 text-left w-16">
                            {t('date').toUpperCase()}
                          </th>
                          {months.map((m) => {
                            const [y, mo] = m.split('-')
                            return (
                              <th key={m} className="bg-primary text-primary-foreground font-bold px-4 py-3 text-right whitespace-nowrap min-w-[120px]">
                                {MONTH_NAMES_PT[Number(mo) - 1]} {y}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                          const hasAny = months.some((m) => spreadsheetData[m]?.[day]?.length)
                          return (
                            <tr key={day} className={`border-b ${hasAny ? 'hover:bg-primary/5' : 'opacity-40'}`}>
                              <td className="sticky left-0 bg-card font-bold text-muted-foreground px-4 py-2 border-r">
                                {day}
                              </td>
                              {months.map((m) => {
                                const amounts = spreadsheetData[m]?.[day]
                                const total = amounts ? amounts.reduce((a, b) => a + b, 0) : null
                                return (
                                  <td key={m} className="px-4 py-2 text-right font-bold">
                                    {total !== null ? (
                                      <span className="text-primary">{BRL(total)}</span>
                                    ) : (
                                      <span className="text-muted-foreground/30">—</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                        <tr className="bg-primary">
                          <td className="sticky left-0 bg-primary font-bold text-primary-foreground px-4 py-3">TOTAL</td>
                          {totals.map((t, i) => (
                            <td key={i} className="px-4 py-3 text-right font-bold text-primary-foreground">{BRL(t)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Raw transactions */}
              {transactions && transactions.length > 0 && (
                <details className="border rounded-xl overflow-hidden group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-sm list-none hover:bg-muted/50 transition-colors">
                    <span>{t('viewTransactions', { count: transactions.length })}</span>
                    <ChevronDown size={16} className="text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted sticky top-0">
                          <th className="px-4 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">{t('date')}</th>
                          <th className="px-4 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider">{t('description')}</th>
                          <th className="px-4 py-2 text-right font-bold text-muted-foreground uppercase tracking-wider">{t('amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t, i) => (
                          <tr key={i} className="border-t hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                              {t.date.split('-').reverse().join('/')}
                            </td>
                            <td className="px-4 py-2 max-w-[200px] truncate">{t.description || '—'}</td>
                            <td className="px-4 py-2 text-right font-bold text-primary">{BRL(t.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
