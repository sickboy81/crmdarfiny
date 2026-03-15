import React, { useState, useRef } from 'react';
import {
  Wand2,
  Copy,
  Check,
  Send,
  FileText,
  Mail,
  MessageSquare,
  FileSignature,
  Briefcase,
  ChevronDown,
  Loader2,
  RotateCcw,
  Edit3,
  Download,
  Sparkles,
  AlertCircle,
  X,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { generateWithAIWriter } from '../services/aiService';
import { useAppStore } from '../stores/useAppStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocType = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  toneOptions: string[];
  placeholder: string;
};

type Tone = string;

// ─── Document type catalog ────────────────────────────────────────────────────

const DOC_TYPES: DocType[] = [
  {
    id: 'email',
    label: 'E-mail',
    icon: Mail,
    description: 'E-mail profissional ou comercial',
    toneOptions: ['Formal', 'Amigável', 'Persuasivo', 'Urgente'],
    placeholder:
      'Ex: Quero enviar um e-mail de follow-up para um cliente que visitou o imóvel na semana passada e não deu retorno.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
    description: 'Mensagem curta para WhatsApp',
    toneOptions: ['Casual', 'Profissional', 'Persuasivo', 'Cordial'],
    placeholder:
      'Ex: Mensagem lembrando o cliente sobre a proposta que enviamos ontem, com um CTA para fechar negócio.',
  },
  {
    id: 'proposal',
    label: 'Proposta Comercial',
    icon: Briefcase,
    description: 'Proposta de negócios estruturada',
    toneOptions: ['Formal', 'Executivo', 'Consultivo'],
    placeholder:
      'Ex: Proposta para venda de um apartamento de 3 quartos no valor de R$450.000, com entrada de 20%.',
  },
  {
    id: 'contract',
    label: 'Minuta / Contrato',
    icon: FileSignature,
    description: 'Esboço de contrato ou minuta',
    toneOptions: ['Jurídico', 'Formal', 'Simplificado'],
    placeholder:
      'Ex: Minuta de contrato de prestação de serviços de consultoria imobiliária por 3 meses.',
  },
  {
    id: 'document',
    label: 'Documento Geral',
    icon: FileText,
    description: 'Relatório, ata, carta ou outro',
    toneOptions: ['Formal', 'Técnico', 'Informativo', 'Persuasivo'],
    placeholder:
      'Ex: Relatório mensal de vendas do time com os principais resultados de março de 2026.',
  },
  {
    id: 'campaign',
    label: 'Mensagem de Campanha',
    icon: Users,
    description: 'Texto para disparo em massa via WhatsApp',
    toneOptions: ['Casual', 'Persuasivo', 'Urgente', 'Promocional'],
    placeholder:
      'Ex: Mensagem anunciando lançamento de novo empreendimento para base de leads que visitaram apartamentos no último mês.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const AIWriter: React.FC = () => {
  const { contacts, settings } = useAppStore();

  // Form state
  const [selectedType, setSelectedType] = useState<DocType>(DOC_TYPES[0]);
  const [instruction, setInstruction] = useState('');
  const [tone, setTone] = useState<Tone>(DOC_TYPES[0].toneOptions[0]);
  const [context, setContext] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);

  // Result state
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState('');

  // Send to contact state
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTypeChange = (docType: DocType) => {
    setSelectedType(docType);
    setTone(docType.toneOptions[0]);
    setShowTypeDropdown(false);
    setResult('');
    setError('');
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) {
      toast.error('Descreva o que você precisa antes de gerar.');
      return;
    }

    const aiConfig = settings?.ai_config;
    if (!aiConfig?.provider || !aiConfig?.apiKeys?.[aiConfig.provider]) {
      setError(
        'API Key não configurada. Vá em Configurações > Inteligência Artificial e configure sua chave.'
      );
      return;
    }

    setIsLoading(true);
    setResult('');
    setError('');
    setIsEditing(false);

    try {
      const generated = await generateWithAIWriter({
        docType: selectedType.label,
        instruction: instruction.trim(),
        tone,
        context: context.trim(),
        recipientName: recipientName.trim(),
      });
      setResult(generated);
      setEditedResult(generated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Erro ao gerar o texto. Verifique sua API Key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const text = isEditing ? editedResult : result;
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('Texto copiado!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = isEditing ? editedResult : result;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType.label.toLowerCase().replace(/\s/g, '_')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado!');
  };

  const handleSendWhatsApp = () => {
    if (!selectedContactId) {
      toast.error('Selecione um contato para enviar.');
      return;
    }
    const contact = contacts.find((c) => c.id === selectedContactId);
    if (!contact) return;
    const text = isEditing ? editedResult : result;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${contact.phoneNumber.replace(/\D/g, '')}?text=${encoded}`, '_blank');
    setShowSendModal(false);
    toast.success(`Abrindo WhatsApp para ${contact.name}`);
  };

  const handleReset = () => {
    setInstruction('');
    setContext('');
    setRecipientName('');
    setResult('');
    setEditedResult('');
    setError('');
    setIsEditing(false);
  };

  const displayText = isEditing ? editedResult : result;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] p-6 lg:p-8 space-y-8 custom-scrollbar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Wand2 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              AI Writer
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] pl-13">
            Descreva o que precisa e a IA gera o texto perfeito — e-mail, contrato, WhatsApp e muito mais.
          </p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] transition-all"
          >
            <RotateCcw size={14} />
            Novo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* ── LEFT PANEL: Inputs ── */}
        <div className="space-y-5">
          {/* Document type selector */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
              Tipo de Texto
            </label>
            <div className="relative">
              <button
                id="doc-type-trigger"
                onClick={() => setShowTypeDropdown((v) => !v)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-primary)] font-bold hover:border-violet-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <selectedType.icon size={18} className="text-violet-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{selectedType.label}</p>
                    <p className="text-xs text-[var(--text-secondary)] font-normal">{selectedType.description}</p>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={clsx('text-[var(--text-secondary)] transition-transform', showTypeDropdown && 'rotate-180')}
                />
              </button>

              {showTypeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {DOC_TYPES.map((dt) => {
                    const Icon = dt.icon;
                    return (
                      <button
                        key={dt.id}
                        onClick={() => handleTypeChange(dt)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-500/10 transition-all text-left',
                          selectedType.id === dt.id && 'bg-violet-500/10'
                        )}
                      >
                        <Icon size={16} className={clsx(selectedType.id === dt.id ? 'text-violet-500' : 'text-[var(--text-secondary)]')} />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{dt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{dt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Instruction */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
              O que você precisa? <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={textareaRef}
              id="ai-writer-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={selectedType.placeholder}
              rows={4}
              className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm resize-none focus:outline-none focus:border-violet-500/70 transition-all"
            />
          </div>

          {/* Recipient and Tone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
                Nome do Destinatário
              </label>
              <input
                id="ai-writer-recipient"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm focus:outline-none focus:border-violet-500/70 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
                Tom de Voz
              </label>
              <div className="relative">
                <button
                  id="tone-trigger"
                  onClick={() => setShowToneDropdown((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-primary)] text-sm font-bold hover:border-violet-500/50 transition-all"
                >
                  {tone}
                  <ChevronDown
                    size={14}
                    className={clsx('text-[var(--text-secondary)] transition-transform', showToneDropdown && 'rotate-180')}
                  />
                </button>
                {showToneDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-xl z-50 overflow-hidden">
                    {selectedType.toneOptions.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTone(t); setShowToneDropdown(false); }}
                        className={clsx(
                          'w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-violet-500/10 transition-all',
                          tone === t ? 'text-violet-500' : 'text-[var(--text-primary)]'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Extra context */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
              Contexto Adicional <span className="text-[var(--text-secondary)] font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              id="ai-writer-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: A empresa se chama Darfiny Imóveis. O cliente demonstrou interesse em apartamentos de 2 quartos no bairro Centro. Telefone: (11) 99999-0000."
              rows={3}
              className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm resize-none focus:outline-none focus:border-violet-500/70 transition-all"
            />
          </div>

          {/* Generate button */}
          <button
            id="ai-writer-generate"
            onClick={handleGenerate}
            disabled={isLoading || !instruction.trim()}
            className={clsx(
              'w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all duration-300 active:scale-[0.98]',
              isLoading || !instruction.trim()
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-900/30 hover:shadow-violet-900/50 hover:scale-[1.01]'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Gerando com IA...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Gerar Texto com IA
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT PANEL: Result ── */}
        <div className="space-y-4">
          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && !result && (
            <div className="space-y-3 p-6 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl animate-pulse">
              <div className="h-4 bg-[var(--border-main)] rounded-full w-3/4" />
              <div className="h-4 bg-[var(--border-main)] rounded-full w-full" />
              <div className="h-4 bg-[var(--border-main)] rounded-full w-5/6" />
              <div className="h-4 bg-[var(--border-main)] rounded-full w-2/3" />
              <div className="h-4 bg-[var(--border-main)] rounded-full w-full" />
              <div className="h-4 bg-[var(--border-main)] rounded-full w-4/5" />
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Result header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
                    Texto Gerado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="ai-writer-edit-toggle"
                    onClick={() => setIsEditing((v) => !v)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                      isEditing
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)]'
                    )}
                  >
                    <Edit3 size={12} />
                    {isEditing ? 'Editando' : 'Editar'}
                  </button>
                </div>
              </div>

              {/* Text area */}
              <div className="relative">
                {isEditing ? (
                  <textarea
                    id="ai-writer-edit-area"
                    value={editedResult}
                    onChange={(e) => setEditedResult(e.target.value)}
                    rows={18}
                    className="w-full px-5 py-4 bg-[var(--bg-card)] border border-violet-500/50 rounded-2xl text-[var(--text-primary)] text-sm resize-none focus:outline-none focus:border-violet-500 transition-all leading-relaxed font-mono"
                  />
                ) : (
                  <div className="px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                    {displayText}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  id="ai-writer-copy"
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-violet-500/50 hover:text-violet-400 transition-all"
                >
                  {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  {isCopied ? 'Copiado!' : 'Copiar'}
                </button>

                <button
                  id="ai-writer-download"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-violet-500/50 hover:text-violet-400 transition-all"
                >
                  <Download size={16} />
                  Baixar .txt
                </button>

                <button
                  id="ai-writer-send-wa"
                  onClick={() => setShowSendModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-green-600 text-white hover:bg-green-500 transition-all"
                >
                  <Send size={16} />
                  Enviar WhatsApp
                </button>
              </div>

              {/* Regenerate */}
              <button
                id="ai-writer-regenerate"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm text-[var(--text-secondary)] hover:text-violet-400 hover:bg-violet-500/10 transition-all border border-dashed border-[var(--border-main)] hover:border-violet-500/40"
              >
                <RotateCcw size={14} className={clsx(isLoading && 'animate-spin')} />
                Gerar novamente
              </button>
            </div>
          )}

          {/* Empty state */}
          {!result && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-[var(--bg-card)] border border-dashed border-[var(--border-main)] rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Wand2 size={28} className="text-violet-500/60" />
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)]">Seu texto vai aparecer aqui</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Preencha o formulário ao lado e clique em <strong>Gerar Texto com IA</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Send to contact Modal ── */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-[var(--text-primary)]">Enviar via WhatsApp</h3>
              <button onClick={() => setShowSendModal(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-colors">
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Selecione um contato para abrir o WhatsApp com o texto já preenchido.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {contacts.filter(c => c.status === 'active').map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    selectedContactId === contact.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-[var(--border-main)] hover:border-green-500/40'
                  )}
                >
                  <img
                    src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=25D366&color=fff`}
                    alt={contact.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{contact.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{contact.phoneNumber}</p>
                  </div>
                </button>
              ))}
              {contacts.filter(c => c.status === 'active').length === 0 && (
                <p className="text-sm text-center text-[var(--text-secondary)] py-6">Nenhum contato ativo encontrado.</p>
              )}
            </div>
            <button
              id="ai-writer-confirm-send"
              onClick={handleSendWhatsApp}
              disabled={!selectedContactId}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-all',
                selectedContactId
                  ? 'bg-green-600 text-white hover:bg-green-500'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              <Send size={16} />
              Abrir no WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

