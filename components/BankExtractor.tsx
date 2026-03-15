import React, { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { extractBankTransactions } from '../services/aiService';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

interface Transaction {
  date: string;   // ISO 'YYYY-MM-DD'
  amount: number;
  description: string;
  type: 'credit' | 'debit';
}

// day -> amount[] (multiples per day allowed)
type MonthData = Record<number, number[]>;
// 'YYYY-MM' -> MonthData
type SpreadsheetData = Record<string, MonthData>;

const MONTH_NAMES_PT = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Applies the rule: if the same amount appears as both credit and debit on the same day,
 * discard the credit.
 */
function applyFilterRule(transactions: Transaction[]): Transaction[] {
  const byDay: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    (byDay[t.date] = byDay[t.date] || []).push(t);
  }

  const filtered: Transaction[] = [];
  for (const [, group] of Object.entries(byDay)) {
    const credits = group.filter(t => t.type === 'credit');
    const debits = group.filter(t => t.type === 'debit');
    const debitAmounts = new Set(debits.map(d => Math.round(d.amount * 100)));

    for (const c of credits) {
      if (debitAmounts.has(Math.round(c.amount * 100))) {
        // neutralise: remove one occurrence of this debit to avoid double-counting
        debitAmounts.delete(Math.round(c.amount * 100));
        continue; // discard this credit
      }
      filtered.push(c);
    }
  }
  return filtered;
}

function buildSpreadsheetData(credits: Transaction[]): SpreadsheetData {
  const data: SpreadsheetData = {};
  for (const t of credits) {
    const [year, month, day] = t.date.split('-').map(Number);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!data[key]) data[key] = {};
    if (!data[key][day]) data[key][day] = [];
    data[key][day].push(t.amount);
  }
  return data;
}

// ─── XLSX Export ─────────────────────────────────────────────────────────────

function exportToXLSX(
  data: SpreadsheetData,
  meta: { processo: string; banco: string; profissao: string; agencia: string; dtInicial: string; nome: string }
) {
  const months = Object.keys(data).sort();
  if (months.length === 0) { toast.error('Sem dados para exportar.'); return; }

  const wb = XLSX.utils.book_new();
  const ws_data: (string | number | null)[][] = [];

  // ─── Header section ───────────────────────────────────────────────────────
  ws_data.push([]);
  ws_data.push(['', '', '', 'Planilha de Apuração de Renda Informal']);
  ws_data.push([]);
  ws_data.push(['Processo:', meta.processo, '', 'Banco:', meta.banco]);
  ws_data.push([]);
  ws_data.push(['', '', '', 'Profissão:', meta.profissao]);
  ws_data.push(['Agência / Conta:', meta.agencia, '', 'Dt Inicial da profissão:', meta.dtInicial]);
  ws_data.push([]);
  ws_data.push(['Nome:', meta.nome]);
  ws_data.push([]);
  ws_data.push([]);
  ws_data.push([]);

  // ─── CRÉDITOS label row ───────────────────────────────────────────────────
  ws_data.push(['', ...Array(months.length).fill(''), 'CRÉDITOS']);
  ws_data.push(['MÊS', ...months.map(m => {
    const [y, mo] = m.split('-');
    return `${MONTH_NAMES_PT[Number(mo) - 1]} ${y}`;
  })]);
  ws_data.push(['DIA', ...months.map(() => '')]);

  // ─── Data rows (day 1..31) ────────────────────────────────────────────────
  for (let day = 1; day <= 31; day++) {
    const row: (string | number | null)[] = [day];
    for (const m of months) {
      const amounts = data[m]?.[day];
      if (amounts && amounts.length > 0) {
        row.push(amounts.reduce((a, b) => a + b, 0));
      } else {
        row.push(null);
      }
    }
    ws_data.push(row);
  }

  // ─── TOTAL row ────────────────────────────────────────────────────────────
  const totals: number[] = months.map(m => {
    const md = data[m] || {};
    return Object.values(md).flat().reduce((a, v) => a + v, 0);
  });
  ws_data.push(['TOTAL', ...totals]);

  // ─── Summary ──────────────────────────────────────────────────────────────
  ws_data.push([]);
  const mediaApurada = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
  ws_data.push(['Nº de Meses Apurados', months.length, '', 'Média Apurada', mediaApurada]);

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Apuração');
  XLSX.writeFile(wb, 'Apuracao_Renda_Informal.xlsx');
  toast.success('Planilha exportada com sucesso!');
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BankExtractor: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Meta fields
  const [meta, setMeta] = useState({
    processo: '', banco: '', profissao: '', agencia: '', dtInicial: '', nome: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── File handling ────────────────────────────────────────────────────────

  const addFiles = useCallback((newFiles: File[]) => {
    const accepted = newFiles.filter(f =>
      f.type === 'application/pdf' ||
      f.type.startsWith('image/')
    );
    if (accepted.length !== newFiles.length) {
      toast.warning('Apenas PDF, JPG e PNG são suportados. Outros arquivos foram ignorados.');
    }
    const uploads: UploadedFile[] = accepted.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...uploads]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  // ─── Processing ───────────────────────────────────────────────────────────

  const processFiles = async () => {
    if (files.length === 0) { toast.error('Adicione ao menos um arquivo.'); return; }
    setIsProcessing(true);
    setTransactions(null);
    setSpreadsheetData(null);

    const allTransactions: Transaction[] = [];
    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      updatedFiles[i] = { ...updatedFiles[i], status: 'processing' };
      setFiles([...updatedFiles]);

      try {
        const txns = await extractBankTransactions(updatedFiles[i].file);
        allTransactions.push(...txns);
        updatedFiles[i] = { ...updatedFiles[i], status: 'done' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updatedFiles[i] = { ...updatedFiles[i], status: 'error', error: msg };
        toast.error(`Erro ao processar ${updatedFiles[i].file.name}`);
      }
      setFiles([...updatedFiles]);
    }

    if (allTransactions.length > 0) {
      const filtered = applyFilterRule(allTransactions);
      const credits = filtered.filter(t => t.type === 'credit');
      setTransactions(credits);
      setSpreadsheetData(buildSpreadsheetData(credits));
      toast.success(`${credits.length} crédito(s) extraído(s) com sucesso!`);
    } else {
      toast.warning('Nenhuma transação foi encontrada nos arquivos.');
    }

    setIsProcessing(false);
  };

  // ─── Derived values ───────────────────────────────────────────────────────

  const months = spreadsheetData ? Object.keys(spreadsheetData).sort() : [];
  const totals = months.map(m => {
    const md = spreadsheetData?.[m] || {};
    return Object.values(md).flat().reduce((a, v) => a + v, 0);
  });
  const grandTotal = totals.reduce((a, b) => a + b, 0);
  const mediaApurada = totals.length > 0 ? grandTotal / totals.length : 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] p-6 lg:p-8 space-y-6 custom-scrollbar">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Table2 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              Apuração de Renda
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] pl-1">
            Envie extratos bancários (PDF, JPG, PNG) — a IA extrai créditos e gera a planilha automaticamente.
          </p>
        </div>
        <button
          onClick={() => setShowInfoPanel(v => !v)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl transition-all"
        >
          <Info size={14} />
          Regras
        </button>
      </div>

      {/* ── Info panel ── */}
      {showInfoPanel && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
          <p className="text-sm font-bold text-emerald-400">📋 Regras de Apuração</p>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
            <li>Apenas <strong>entradas (créditos)</strong> são contabilizadas.</li>
            <li>Saídas (débitos) são desconsideradas.</li>
            <li><strong>Regra especial:</strong> se o mesmo valor aparecer como crédito E débito no mesmo dia, o crédito é desconsiderado (estorno/repasse).</li>
            <li>Múltiplos arquivos do mesmo período são somados automaticamente.</li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT: Upload + Meta ── */}
        <div className="xl:col-span-1 space-y-5">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300',
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-[var(--border-main)] hover:border-emerald-500/50 bg-[var(--bg-card)]'
            )}
          >
            <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center transition-all', isDragging ? 'bg-emerald-500/20' : 'bg-[var(--bg-main)]')}>
              <Upload size={22} className={clsx(isDragging ? 'text-emerald-400' : 'text-[var(--text-secondary)]')} />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm text-[var(--text-primary)]">
                {isDragging ? 'Solte os arquivos aqui' : 'Clique ou arraste arquivos'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">PDF, JPG, PNG suportados</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ''; }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
                Arquivos ({files.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {files.map(uf => (
                  <div key={uf.id} className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl">
                    <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      uf.status === 'done' ? 'bg-green-500/20' :
                      uf.status === 'error' ? 'bg-red-500/20' :
                      uf.status === 'processing' ? 'bg-blue-500/20' : 'bg-[var(--bg-main)]'
                    )}>
                      {uf.status === 'processing' ? <Loader2 size={14} className="animate-spin text-blue-400" /> :
                       uf.status === 'done' ? <CheckCircle2 size={14} className="text-green-400" /> :
                       uf.status === 'error' ? <AlertCircle size={14} className="text-red-400" /> :
                       <FileText size={14} className="text-[var(--text-secondary)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{uf.file.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {uf.status === 'error' ? uf.error : `${(uf.file.size / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                    {uf.status === 'pending' && (
                      <button onClick={() => removeFile(uf.id)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                        <X size={12} className="text-[var(--text-secondary)] hover:text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setFiles([]); setTransactions(null); setSpreadsheetData(null); }}
                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-bold transition-colors"
              >
                <Trash2 size={12} />
                Remover todos
              </button>
            </div>
          )}

          {/* Meta fields */}
          <div className="space-y-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl">
            <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
              Dados da Planilha
            </p>
            {[
              { key: 'nome', label: 'Nome' },
              { key: 'processo', label: 'Processo' },
              { key: 'banco', label: 'Banco' },
              { key: 'profissao', label: 'Profissão' },
              { key: 'agencia', label: 'Agência / Conta' },
              { key: 'dtInicial', label: 'Dt Inicial da Profissão' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</label>
                <input
                  type="text"
                  value={meta[key as keyof typeof meta]}
                  onChange={e => setMeta(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={label}
                  className="w-full mt-1 px-3 py-2 text-sm bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/60 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Process button */}
          <button
            id="bank-extractor-process"
            onClick={processFiles}
            disabled={isProcessing || files.length === 0}
            className={clsx(
              'w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all duration-300 active:scale-[0.98]',
              isProcessing || files.length === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-900/30 hover:shadow-emerald-900/50 hover:scale-[1.01]'
            )}
          >
            {isProcessing ? (
              <><Loader2 size={20} className="animate-spin" />Processando com IA...</>
            ) : (
              <><Sparkles size={20} />Extrair e Gerar Planilha</>
            )}
          </button>
        </div>

        {/* ── RIGHT: Preview table ── */}
        <div className="xl:col-span-2 space-y-4">
          {!spreadsheetData && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-[var(--bg-card)] border border-dashed border-[var(--border-main)] rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Table2 size={28} className="text-emerald-500/50" />
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">Planilha aparecerá aqui</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Adicione os extratos e clique em <strong>Extrair e Gerar Planilha</strong>.
                </p>
              </div>
            </div>
          )}

          {isProcessing && !spreadsheetData && (
            <div className="space-y-3 p-6 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl animate-pulse">
              {[80, 65, 90, 70, 85, 60, 75, 95].map((w, i) => (
                <div key={i} className="h-4 bg-[var(--border-main)] rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {spreadsheetData && months.length > 0 && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-center">
                  <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Meses Apurados</p>
                  <p className="text-2xl font-black text-emerald-400">{months.length}</p>
                </div>
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-center">
                  <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Total Créditos</p>
                  <p className="text-lg font-black text-teal-400">{BRL(grandTotal)}</p>
                </div>
                <div className="p-4 bg-[var(--bg-card)] border border-emerald-500/30 rounded-2xl text-center bg-emerald-500/5">
                  <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Média Apurada</p>
                  <p className="text-lg font-black text-emerald-400">{BRL(mediaApurada)}</p>
                </div>
              </div>

              {/* Export button */}
              <button
                id="bank-extractor-export"
                onClick={() => exportToXLSX(spreadsheetData, meta)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
              >
                <Download size={16} />
                Exportar Planilha (.xlsx)
              </button>

              {/* Table preview */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
                  <div>
                    <p className="font-black text-sm text-[var(--text-primary)]">Planilha de Apuração de Renda Informal</p>
                    {meta.nome && <p className="text-xs text-[var(--text-secondary)]">Nome: {meta.nome}</p>}
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                    {transactions?.length || 0} créditos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-emerald-600 text-white font-black px-4 py-3 text-left w-16">DIA</th>
                        {months.map(m => {
                          const [y, mo] = m.split('-');
                          return (
                            <th key={m} className="bg-emerald-600 text-white font-black px-4 py-3 text-right whitespace-nowrap min-w-[120px]">
                              {MONTH_NAMES_PT[Number(mo) - 1]} {y}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                        const hasAny = months.some(m => spreadsheetData[m]?.[day]?.length);
                        return (
                          <tr key={day} className={clsx(
                            'border-b border-[var(--border-main)] transition-colors',
                            hasAny ? 'hover:bg-emerald-500/5' : 'opacity-40'
                          )}>
                            <td className="sticky left-0 bg-[var(--bg-card)] font-black text-[var(--text-secondary)] px-4 py-2 border-r border-[var(--border-main)]">{day}</td>
                            {months.map(m => {
                              const amounts = spreadsheetData[m]?.[day];
                              const total = amounts ? amounts.reduce((a, b) => a + b, 0) : null;
                              return (
                                <td key={m} className="px-4 py-2 text-right text-[var(--text-primary)] font-bold">
                                  {total !== null ? (
                                    <span className="text-emerald-400">{BRL(total)}</span>
                                  ) : (
                                    <span className="text-[var(--border-main)]">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* TOTAL row */}
                      <tr className="bg-emerald-600">
                        <td className="sticky left-0 bg-emerald-600 font-black text-white px-4 py-3">TOTAL</td>
                        {totals.map((t, i) => (
                          <td key={i} className="px-4 py-3 text-right font-black text-white">{BRL(t)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw transactions (collapsible) */}
              {transactions && transactions.length > 0 && (
                <details className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl overflow-hidden group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-sm text-[var(--text-primary)] list-none hover:bg-[var(--bg-main)] transition-colors">
                    <span>Ver todas as transações ({transactions.length})</span>
                    <ChevronDown size={16} className="text-[var(--text-secondary)] group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--bg-main)] sticky top-0">
                          <th className="px-4 py-2 text-left font-black text-[var(--text-secondary)] uppercase tracking-wider">Data</th>
                          <th className="px-4 py-2 text-left font-black text-[var(--text-secondary)] uppercase tracking-wider">Descrição</th>
                          <th className="px-4 py-2 text-right font-black text-[var(--text-secondary)] uppercase tracking-wider">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t, i) => (
                          <tr key={i} className="border-t border-[var(--border-main)] hover:bg-[var(--bg-main)] transition-colors">
                            <td className="px-4 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                              {t.date.split('-').reverse().join('/')}
                            </td>
                            <td className="px-4 py-2 text-[var(--text-primary)] max-w-[200px] truncate">{t.description || '—'}</td>
                            <td className="px-4 py-2 text-right font-bold text-emerald-400">{BRL(t.amount)}</td>
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
  );
};

