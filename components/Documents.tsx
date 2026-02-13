import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  CheckSquare,
  Plus,
  Trash2,
  Download,
  FileSpreadsheet,
  ClipboardList,
  Receipt,
  PenTool,
  FileStack,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import {
  generateChecklistPDF,
  getChecklistPDFPreviewUrl,
  generateProposalPDF,
  getProposalPDFPreviewUrl,
  generateMeetingMinutesPDF,
  getMeetingMinutesPDFPreviewUrl,
  generateReceiptPDF,
  getReceiptPDFPreviewUrl,
  generateContractPDF,
  getContractPDFPreviewUrl,
  type ProposalItem,
} from '../services/pdfService';
import { getBotConfig } from '../services/geminiService';
import clsx from 'clsx';
import { UniPDF } from './unipdf/UniPDF';

const DOCUMENT_COMPANY_KEY = 'crm_document_company_name';

function getDocumentFooterText(): string {
  const name =
    (typeof localStorage !== 'undefined' && localStorage.getItem(DOCUMENT_COMPANY_KEY))?.trim() ||
    getBotConfig().botName?.trim();
  return name ? `${name} - Documento gerado automaticamente` : 'Documento gerado automaticamente';
}

function getDocumentIssuedBy(): string | undefined {
  const name =
    (typeof localStorage !== 'undefined' && localStorage.getItem(DOCUMENT_COMPANY_KEY))?.trim() ||
    getBotConfig().botName?.trim();
  return name || undefined;
}

const PREVIEW_DEBOUNCE_MS = 600;

const STANDARD_DOCUMENTS = [
  'Certidão de Nascimento ou Certidão de Casamento',
  'Documento de Identificação (RG, CNH ou Passaporte)',
  'CPF',
  'Comprovante de Residência',
  'Comprovante de Renda',
];

type DocType = 'checklist' | 'proposal' | 'ata' | 'receipt' | 'contract' | 'unipdf';

export const Documents: React.FC = () => {
  const [docType, setDocType] = useState<DocType>('checklist');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Checklist State
  const [checklistTitle, setChecklistTitle] = useState('');
  const [checklistSubtitle, setChecklistSubtitle] = useState('');
  const [checklistDate, setChecklistDate] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const [checklistItems, setChecklistItems] = useState<string[]>(STANDARD_DOCUMENTS);

  // Proposal State
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalSubtitle, setProposalSubtitle] = useState('');
  const [proposalClientName, setProposalClientName] = useState('');
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([{ description: '', value: 0 }]);
  const [proposalValidity, setProposalValidity] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');

  // Ata State
  const [ataTitle, setAtaTitle] = useState('');
  const [ataDate, setAtaDate] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const [ataParticipants, setAtaParticipants] = useState('');
  const [ataAgenda, setAtaAgenda] = useState('');
  const [ataDiscussion, setAtaDiscussion] = useState<string[]>(['']);
  const [ataDecisions, setAtaDecisions] = useState<string[]>(['']);
  const [ataNextSteps, setAtaNextSteps] = useState<string[]>(['']);

  // Receipt State
  const [receiptPayer, setReceiptPayer] = useState('');
  const [receiptReceiver, setReceiptReceiver] = useState(getDocumentIssuedBy() || '');
  const [receiptValue, setReceiptValue] = useState<number>(0);
  const [receiptReference, setReceiptReference] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const [receiptCity, setReceiptCity] = useState('São Paulo');
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState('');

  // Contract State
  const [contractTitle, setContractTitle] = useState('CONTRATO DE PRESTAÇÃO DE SERVIÇOS');
  const [contractPartyA, setContractPartyA] = useState(getDocumentIssuedBy() || '');
  const [contractPartyB, setContractPartyB] = useState('');
  const [contractObject, setContractObject] = useState('');
  const [contractValue, setContractValue] = useState<number>(0);
  const [contractConditions, setContractConditions] = useState('');
  const [contractDate, setContractDate] = useState(() => new Date().toLocaleDateString('pt-BR'));

  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Logic for preview updates
  useEffect(() => {
    if (docType === 'unipdf') return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const footerText = getDocumentFooterText();
        let url: string = '';

        if (docType === 'checklist') {
          url = getChecklistPDFPreviewUrl({
            title: checklistTitle.trim() || 'Checklist',
            subtitle: checklistSubtitle.trim() || undefined,
            date: checklistDate.trim() || undefined,
            items: checklistItems.map((i) => i.trim()).filter(Boolean).length ? checklistItems.map((i) => i.trim()).filter(Boolean) : ['Item 1'],
            footerText,
          });
        } else if (docType === 'proposal') {
          const items = proposalItems.filter((i) => (i.description || '').trim() || (i.value ?? 0) !== 0);
          url = getProposalPDFPreviewUrl({
            title: proposalTitle.trim() || 'Proposta Comercial',
            subtitle: proposalSubtitle.trim() || undefined,
            clientName: proposalClientName.trim() || undefined,
            issuedBy: getDocumentIssuedBy(),
            items: items.length ? items : [{ description: '—', value: 0 }],
            total: proposalItems.reduce((s, i) => s + (Number(i.value) || 0), 0),
            validity: proposalValidity.trim() || undefined,
            notes: proposalNotes.trim() || undefined,
            footerText,
          });
        } else if (docType === 'ata') {
          url = getMeetingMinutesPDFPreviewUrl({
            title: ataTitle.trim() || 'Ata de Reunião',
            date: ataDate.trim() || undefined,
            participants: ataParticipants.trim() || undefined,
            agenda: ataAgenda.trim() || undefined,
            discussionItems: ataDiscussion.map((s) => s.trim()).filter(Boolean),
            decisions: ataDecisions.map((s) => s.trim()).filter(Boolean),
            nextSteps: ataNextSteps.map((s) => s.trim()).filter(Boolean),
            footerText,
          });
        } else if (docType === 'receipt') {
          url = getReceiptPDFPreviewUrl({
            payer: receiptPayer.trim() || 'Nome do Pagador',
            receiver: receiptReceiver.trim() || 'Nome do Recebedor',
            value: receiptValue || 0,
            reference: receiptReference.trim() || 'Referente a...',
            date: receiptDate.trim() || undefined,
            city: receiptCity.trim() || undefined,
            paymentMethod: receiptPaymentMethod.trim() || undefined,
            footerText,
          });
        } else if (docType === 'contract') {
          url = getContractPDFPreviewUrl({
            title: contractTitle.trim() || 'CONTRATO',
            partyA: contractPartyA.trim() || 'Contratado/Locador',
            partyB: contractPartyB.trim() || 'Contratante/Locatário',
            object: contractObject.trim() || 'Descrição do objeto...',
            value: contractValue || 0,
            conditions: contractConditions.trim() || 'Condições gerais...',
            date: contractDate.trim() || undefined,
            footerText,
          });
        }

        if (url) {
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (_) { }
      debounceRef.current = null;
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    docType, checklistTitle, checklistSubtitle, checklistDate, checklistItems,
    proposalTitle, proposalSubtitle, proposalClientName, proposalItems, proposalValidity, proposalNotes,
    ataTitle, ataDate, ataParticipants, ataAgenda, ataDiscussion, ataDecisions, ataNextSteps,
    receiptPayer, receiptReceiver, receiptValue, receiptReference, receiptDate, receiptCity, receiptPaymentMethod,
    contractTitle, contractPartyA, contractPartyB, contractObject, contractValue, contractConditions, contractDate
  ]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // -- Handlers (Same structure as before, extended for new types) -- //

  // Checklist Handlers
  const addChecklistItem = () => setChecklistItems((prev) => [...prev, '']);
  const removeChecklistItem = (index: number) => { if (checklistItems.length > 1) setChecklistItems((prev) => prev.filter((_, i) => i !== index)); };
  const updateChecklistItem = (index: number, value: string) => setChecklistItems((prev) => { const n = [...prev]; n[index] = value; return n; });
  const addStandardChecklist = () => setChecklistItems((prev) => [...prev, ...STANDARD_DOCUMENTS.filter((doc) => !prev.includes(doc))].filter(Boolean));
  const handleGenerateChecklist = () => generateChecklistPDF({ title: checklistTitle || 'Checklist', subtitle: checklistSubtitle, date: checklistDate, items: checklistItems.filter(Boolean), footerText: getDocumentFooterText() });

  // Proposal Handlers
  const addProposalItem = () => setProposalItems((p) => [...p, { description: '', value: 0 }]);
  const removeProposalItem = (index: number) => { if (proposalItems.length > 1) setProposalItems((p) => p.filter((_, i) => i !== index)); };
  const updateProposalItem = (i: number, f: 'description' | 'value', v: string | number) => setProposalItems((p) => { const n = [...p]; n[i] = { ...n[i], [f]: f === 'value' ? Number(v) || 0 : v }; return n; });
  const handleGenerateProposal = () => generateProposalPDF({
    title: proposalTitle || 'Proposta',
    subtitle: proposalSubtitle,
    clientName: proposalClientName,
    issuedBy: getDocumentIssuedBy(),
    items: proposalItems.filter(i => i.description || i.value),
    total: proposalItems.reduce((s, i) => s + (Number(i.value) || 0), 0),
    validity: proposalValidity,
    notes: proposalNotes,
    footerText: getDocumentFooterText()
  });

  // Ata Handlers (Simplified for brevity, similar structure)
  const addAtaLine = (setter: any) => setter((p: any) => [...p, '']);
  const removeAtaLine = (setter: any, i: number, l: any[]) => { if (l.length > 1) setter(l.filter((_, idx) => idx !== i)); };
  const updateAtaLine = (setter: any, i: number, v: string) => setter((p: any) => { const n = [...p]; n[i] = v; return n; });
  const handleGenerateAta = () => generateMeetingMinutesPDF({
    title: ataTitle || 'Ata', date: ataDate, participants: ataParticipants, agenda: ataAgenda,
    discussionItems: ataDiscussion.filter(Boolean), decisions: ataDecisions.filter(Boolean), nextSteps: ataNextSteps.filter(Boolean),
    footerText: getDocumentFooterText()
  });

  // Receipt & Contract Handlers
  const handleGenerateReceipt = () => generateReceiptPDF({
    payer: receiptPayer, receiver: receiptReceiver, value: receiptValue, reference: receiptReference,
    date: receiptDate, city: receiptCity, paymentMethod: receiptPaymentMethod, footerText: getDocumentFooterText()
  });

  const handleGenerateContract = () => generateContractPDF({
    title: contractTitle, partyA: contractPartyA, partyB: contractPartyB, object: contractObject,
    value: contractValue, conditions: contractConditions, date: contractDate, footerText: getDocumentFooterText()
  });

  // Sidebar Items
  const menuItems: { id: DocType; label: string; icon: any }[] = [
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'proposal', label: 'Proposta', icon: FileSpreadsheet },
    { id: 'ata', label: 'Ata de Reunião', icon: ClipboardList },
    { id: 'receipt', label: 'Recibo', icon: Receipt },
    { id: 'contract', label: 'Contrato', icon: PenTool },
    { id: 'unipdf', label: 'Unir PDFs (IA)', icon: FileStack },
  ];

  if (docType === 'unipdf') {
    return (
      <div className="flex h-full bg-slate-50">
        {/* Sidebar Minimized / Maximized logic could be applied here too if needed, but UniPDF is full screen */}
        <div className={clsx(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-20 shadow-sm",
          isSidebarOpen ? "w-64" : "w-16"
        )}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            {isSidebarOpen && <h2 className="font-bold text-gray-800 flex items-center gap-2"><FileText className="text-blue-600" /> Documentos</h2>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              {isSidebarOpen ? <Menu size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setDocType(item.id)}
                className={clsx(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm",
                  docType === item.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  !isSidebarOpen && "justify-center"
                )}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <item.icon size={20} />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-hidden">
          <UniPDF />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className={clsx(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-20 shadow-sm",
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {isSidebarOpen && <h2 className="font-bold text-gray-800 flex items-center gap-2"><FileText className="text-blue-600" /> Documentos</h2>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            {isSidebarOpen ? <Menu size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setDocType(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm",
                docType === item.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                !isSidebarOpen && "justify-center"
              )}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">

        {/* Form Panel */}
        <div className="w-full lg:w-[420px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">
              {docType === 'checklist' && 'Novo Checklist'}
              {docType === 'proposal' && 'Nova Proposta'}
              {docType === 'ata' && 'Nova Ata'}
              {docType === 'receipt' && 'Novo Recibo'}
              {docType === 'contract' && 'Novo Contrato'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Preencha os dados para gerar o PDF.</p>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

            {/* === CHECKLIST FORM === */}
            {docType === 'checklist' && (
              <>
                <input value={checklistTitle} onChange={e => setChecklistTitle(e.target.value)} placeholder="Título" className="w-full p-3 border rounded-xl" />
                <input value={checklistSubtitle} onChange={e => setChecklistSubtitle(e.target.value)} placeholder="Subtítulo" className="w-full p-3 border rounded-xl" />
                <input value={checklistDate} onChange={e => setChecklistDate(e.target.value)} placeholder="Data" className="w-full p-3 border rounded-xl" />

                <div className="space-y-2">
                  <div className="flex justify-between items-center"><label className="text-sm font-medium">Itens</label> <button onClick={addChecklistItem} className="text-blue-600 text-sm flex gap-1 items-center"><Plus size={14} /> Add</button></div>
                  <button onClick={addStandardChecklist} className="text-xs text-blue-600 underline w-full text-right mb-2">Carregar Padrão Imobiliário</button>
                  {checklistItems.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item} onChange={e => updateChecklistItem(i, e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" placeholder={`Item ${i + 1}`} />
                      <button onClick={() => removeChecklistItem(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={handleGenerateChecklist} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Download size={20} /> Baixar PDF</button>
              </>
            )}

            {/* === RECEIPT FORM === */}
            {docType === 'receipt' && (
              <>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Pagador</label><input value={receiptPayer} onChange={e => setReceiptPayer(e.target.value)} placeholder="Nome do Pagador" className="w-full p-3 border rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Recebedor</label><input value={receiptReceiver} onChange={e => setReceiptReceiver(e.target.value)} placeholder="Nome do Recebedor" className="w-full p-3 border rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Valor (R$)</label><input type="number" value={receiptValue || ''} onChange={e => setReceiptValue(Number(e.target.value))} placeholder="0.00" className="w-full p-3 border rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Referência</label><input value={receiptReference} onChange={e => setReceiptReference(e.target.value)} placeholder="Ex: Aluguel Março/2025" className="w-full p-3 border rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={receiptDate} onChange={e => setReceiptDate(e.target.value)} placeholder="Data" className="w-full p-3 border rounded-xl" />
                  <input value={receiptCity} onChange={e => setReceiptCity(e.target.value)} placeholder="Cidade" className="w-full p-3 border rounded-xl" />
                </div>
                <input value={receiptPaymentMethod} onChange={e => setReceiptPaymentMethod(e.target.value)} placeholder="Forma de Pgto (Ex: PIX)" className="w-full p-3 border rounded-xl" />
                <button onClick={handleGenerateReceipt} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Download size={20} /> Baixar Recibo</button>
              </>
            )}

            {/* === CONTRACT FORM === */}
            {docType === 'contract' && (
              <>
                <input value={contractTitle} onChange={e => setContractTitle(e.target.value)} placeholder="Título do Contrato" className="w-full p-3 border rounded-xl font-bold" />
                <div className="grid grid-cols-1 gap-3">
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Parte A (Contratado/Locador)</label><input value={contractPartyA} onChange={e => setContractPartyA(e.target.value)} className="w-full p-3 border rounded-xl" /></div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Parte B (Contratante/Locatário)</label><input value={contractPartyB} onChange={e => setContractPartyB(e.target.value)} className="w-full p-3 border rounded-xl" /></div>
                </div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Objeto do Contrato</label><textarea value={contractObject} onChange={e => setContractObject(e.target.value)} placeholder="Descrição do imóvel ou serviço..." className="w-full p-3 border rounded-xl h-24 resize-none" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Valor Total (R$)</label><input type="number" value={contractValue || ''} onChange={e => setContractValue(Number(e.target.value))} className="w-full p-3 border rounded-xl" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Condições Gerais</label><textarea value={contractConditions} onChange={e => setContractConditions(e.target.value)} placeholder="Prazo, forma de pagamento, multas..." className="w-full p-3 border rounded-xl h-32 resize-none" /></div>
                <input value={contractDate} onChange={e => setContractDate(e.target.value)} placeholder="Data e Local" className="w-full p-3 border rounded-xl" />
                <button onClick={handleGenerateContract} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Download size={20} /> Baixar Contrato</button>
              </>
            )}

            {/* === PROPOSAL FORM (Simplified) === */}
            {docType === 'proposal' && (
              <>
                <input value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} placeholder="Título" className="w-full p-3 border rounded-xl" />
                <input value={proposalClientName} onChange={e => setProposalClientName(e.target.value)} placeholder="Cliente" className="w-full p-3 border rounded-xl" />
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><label className="text-sm font-medium">Itens</label> <button onClick={addProposalItem} className="text-blue-600 text-sm flex gap-1 items-center"><Plus size={14} /> Add</button></div>
                  {proposalItems.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item.description} onChange={e => updateProposalItem(i, 'description', e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" placeholder="Item" />
                      <input type="number" value={item.value || ''} onChange={e => updateProposalItem(i, 'value', e.target.value)} className="w-20 p-2 border rounded-lg text-sm" placeholder="R$" />
                      <button onClick={() => removeProposalItem(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <input value={proposalValidity} onChange={e => setProposalValidity(e.target.value)} placeholder="Validade" className="w-full p-3 border rounded-xl" />
                <button onClick={handleGenerateProposal} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Download size={20} /> Baixar PDF</button>
              </>
            )}

            {/* === ATA FORM (Simplified) === */}
            {docType === 'ata' && (
              <>
                <input value={ataTitle} onChange={e => setAtaTitle(e.target.value)} placeholder="Título" className="w-full p-3 border rounded-xl" />
                <input value={ataDate} onChange={e => setAtaDate(e.target.value)} placeholder="Data" className="w-full p-3 border rounded-xl" />
                <textarea value={ataAgenda} onChange={e => setAtaAgenda(e.target.value)} placeholder="Pauta" className="w-full p-3 border rounded-xl h-20" />
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><label className="text-sm font-medium">Decisões</label> <button onClick={() => addAtaLine(setAtaDecisions)} className="text-blue-600 text-sm flex gap-1 items-center"><Plus size={14} /> Add</button></div>
                  {ataDecisions.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item} onChange={e => updateAtaLine(setAtaDecisions, i, e.target.value)} className="flex-1 p-2 border rounded-lg text-sm" placeholder={`Decisão ${i + 1}`} />
                      <button onClick={() => removeAtaLine(setAtaDecisions, i, ataDecisions)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={handleGenerateAta} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 flex justify-center gap-2"><Download size={20} /> Baixar PDF</button>
              </>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 min-w-0 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/30">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-gray-400" /> Pré-visualização do Documento
            </h3>
            {previewUrl && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                Atualizado automaticamente
              </span>
            )}
          </div>
          <div className="flex-1 bg-gray-100/50 p-6 overflow-hidden flex flex-col">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-xl shadow-lg border border-gray-200 bg-white flex-1"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
                <p>Gerando pré-visualização...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
