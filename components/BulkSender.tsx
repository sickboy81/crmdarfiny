import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Contact, Campaign, CampaignLog } from '../types';
import {
  Megaphone,
  Search,
  CheckSquare,
  Square,
  Send,
  CheckCircle2,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Settings2,
  ShieldCheck,
  XCircle,
  Plus,
  Trash2,
  History,
  LayoutList,
  Calendar,
  Filter,
  Users,
  ChevronRight,
  MoreVertical,
  AlertCircle,
  MessageSquarePlus
} from 'lucide-react';
import { sendRealWhatsAppMessage } from '../services/whatsappService';
import { useAppStore } from '../stores/useAppStore';
import { PIPELINE_STAGES } from '../constants';
import clsx from 'clsx';
import { toast } from 'sonner';

interface BulkSenderProps {
  contacts: Contact[];
}

export const BulkSender: React.FC<BulkSenderProps> = ({ contacts }) => {
  const { campaigns, addCampaign, updateCampaign } = useAppStore();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // --- Campaign State ---
  const [stage, setStage] = useState<'audience' | 'content' | 'review' | 'running'>('audience');
  const [campaignName, setCampaignName] = useState('');

  // Audience
  const [includedTags, setIncludedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [pipelineStage, setPipelineStage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Content
  const [messageType, setMessageType] = useState<'template' | 'text'>('text');
  const [templateName, setTemplateName] = useState('hello_world');
  const [templateLang, setTemplateLang] = useState('pt_BR');
  const [variables, setVariables] = useState<string[]>(['{{nome}}']);
  const [messageText, setMessageText] = useState('');

  // Config
  const [delaySeconds, setDelaySeconds] = useState(30);
  const [scheduledDate, setScheduledDate] = useState('');

  // Execution
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [queue, setQueue] = useState<CampaignLog[]>([]);
  const [isPaused, setIsPaused] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const processingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Filter Logic ---
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach((c) => c.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // 1. Search
      if (searchTerm && !contact.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

      // 2. Pipeline Stage
      if (pipelineStage !== 'all' && contact.pipelineStage !== pipelineStage) return false;

      // 3. Included Tags (OR logic - if has ANY included tag)
      if (includedTags.length > 0) {
        const hasIncluded = contact.tags.some(t => includedTags.includes(t));
        if (!hasIncluded) return false;
      }

      // 4. Excluded Tags (AND logic - if has ANY excluded tag, remove)
      if (excludedTags.length > 0) {
        const hasExcluded = contact.tags.some(t => excludedTags.includes(t));
        if (hasExcluded) return false;
      }

      return true;
    });
  }, [contacts, searchTerm, pipelineStage, includedTags, excludedTags]);

  // Determine selectable contacts (only those with phone numbers)
  const validContacts = useMemo(() => filteredContacts.filter(c => c.phoneNumber), [filteredContacts]);

  // Sync selection when filter changes
  useEffect(() => {
    // Optional: auto-select all valid filtered contacts? 
    // Usually better to keep selection manual or provide "Select All" button
  }, [filteredContacts]);

  const toggleAll = () => {
    if (selectedContactIds.length === validContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(validContacts.map((c) => c.id));
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // --- Campaign Execution Logic ---
  const startCampaign = () => {
    const newId = Date.now().toString();
    const newQueue: CampaignLog[] = validContacts
      .filter(c => selectedContactIds.includes(c.id))
      .map(c => ({
        id: c.id,
        contactName: c.name,
        phone: c.phoneNumber,
        status: 'pending'
      }));

    const newCampaign: Campaign = {
      id: newId,
      name: campaignName || `Campanha ${new Date().toLocaleDateString()}`,
      status: 'running',
      createdAt: new Date().toISOString(),
      templateName,
      stats: { total: newQueue.length, sent: 0, success: 0, failed: 0 },
      logs: newQueue, // Initial logs
      audienceSnapshot: {
        tags: includedTags,
        pipelineStage,
        count: newQueue.length
      }
    };

    addCampaign(newCampaign);
    setCurrentCampaignId(newId);
    setQueue(newQueue);
    setCurrentIndex(0);
    setStage('running');
    setIsPaused(false);
  };

  const processNextMessage = async () => {
    if (currentIndex >= queue.length) {
      setIsPaused(true);
      if (currentCampaignId) {
        updateCampaign(currentCampaignId, { status: 'completed' });
      }
      return;
    }

    const currentItem = queue[currentIndex];

    // Update local queue status
    setQueue(prev => prev.map((item, idx) => idx === currentIndex ? { ...item, status: 'sending' } : item));

    let finalMessageText = '';
    let result;

    if (messageType === 'text') {
      // Processa mensagem de texto simples
      finalMessageText = messageText
        .replace(/\{\{nome\}\}/g, currentItem.contactName.split(' ')[0])
        .replace(/\{\{empresa\}\}/g, 'Sua Empresa');

      // Envia como texto simples
      result = await sendRealWhatsAppMessage(
        currentItem.phone,
        finalMessageText,
        'text'
      );
    } else {
      // Processa template
      const processedVars = variables.map(v =>
        v.replace(/\{\{nome\}\}/g, currentItem.contactName.split(' ')[0])
          .replace(/\{\{empresa\}\}/g, 'Sua Empresa')
      );

      finalMessageText = processedVars.length > 0 ? processedVars.join(' ') : `Template: ${templateName}`;

      // Envia como template
      result = await sendRealWhatsAppMessage(
        currentItem.phone,
        { name: templateName, language: templateLang, variables: processedVars },
        'template'
      );
    }

    const status = result.success ? 'success' : 'failed';
    const now = new Date().toLocaleTimeString();

    // Se enviou com sucesso, adiciona ao inbox
    if (result.success) {
      const { addMessage } = useAppStore.getState();
      const contactId = currentItem.id;

      addMessage(contactId, {
        id: `campaign-${Date.now()}-${currentIndex}`,
        chatId: contactId,
        content: finalMessageText,
        senderId: 'me',
        timestamp: new Date().toISOString(),
        status: 'sent',
        type: 'text'
      });

      console.log(`✅ Mensagem adicionada ao inbox para ${currentItem.contactName}`);
    }

    // Update Queue
    const updatedQueue = queue.map((item, idx) =>
      idx === currentIndex ? { ...item, status, error: result.error, timestamp: now } : item
    );
    setQueue(updatedQueue);

    // Update Store
    if (currentCampaignId) {
      updateCampaign(currentCampaignId, {
        logs: updatedQueue,
        stats: {
          total: updatedQueue.length,
          sent: currentIndex + 1,
          success: updatedQueue.filter(i => i.status === 'success').length,
          failed: updatedQueue.filter(i => i.status === 'failed').length
        }
      });
    }

    setCurrentIndex(p => p + 1);
  };

  // Heartbeat - Dispara mensagens automaticamente
  useEffect(() => {
    // Só executa se estiver em modo running e não pausado
    if (stage !== 'running' || isPaused) {
      return;
    }

    // Se já terminou a fila
    if (currentIndex >= queue.length) {
      setIsPaused(true);
      if (currentCampaignId) {
        updateCampaign(currentCampaignId, { status: 'completed' });
        toast.success('Campanha finalizada!');
      }
      return;
    }

    // Se já está processando, não dispara novamente
    if (processingRef.current) {
      return;
    }

    // Marca como processando e agenda o próximo envio
    processingRef.current = true;

    console.log(`📤 Agendando envio ${currentIndex + 1}/${queue.length} em ${delaySeconds}s...`);

    timerRef.current = setTimeout(async () => {
      try {
        await processNextMessage();
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        toast.error('Erro ao enviar mensagem');
      } finally {
        processingRef.current = false;
      }
    }, delaySeconds * 1000);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stage, isPaused, currentIndex]); // Removido 'queue' das dependências




  // --- Render Helpers ---
  const renderHistory = () => (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Histórico de Campanhas</h2>
        <button onClick={() => { setActiveTab('new'); setStage('audience'); }} className="text-sm text-green-600 font-bold hover:underline">
          + Nova Campanha
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium">Nome</th>
              <th className="p-4 font-medium">Data</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Progresso</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns?.slice().reverse().map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{c.name}</td>
                <td className="p-4 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={clsx(
                    "px-2 py-1 rounded-full text-xs font-bold uppercase",
                    c.status === 'completed' ? "bg-green-100 text-green-700" :
                      c.status === 'running' ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                  )}>
                    {c.status}
                  </span>
                </td>
                <td className="p-4 text-gray-600">
                  {c.stats.sent}/{c.stats.total} ({Math.round(c.stats.sent / c.stats.total * 100)}%)
                </td>
                <td className="p-4 text-right">
                  <button className="text-blue-600 hover:text-blue-800 font-medium">Ver Detalhes</button>
                </td>
              </tr>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">Nenhuma campanha registrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (activeTab === 'history') return <div className="p-8 bg-gray-50 h-full">{renderHistory()}</div>;

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col p-4 shadow-xl z-20">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-8">
          <Megaphone className="text-green-600" /> Campanhas
        </h1>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('new')}
            className={clsx(
              "w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'new' ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Plus size={18} /> Nova Campanha
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={clsx(
              "w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors",
              activeTab === 'history' ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <History size={18} /> Histórico
          </button>
        </nav>

        {activeTab === 'new' && (
          <div className="mt-8">
            <div className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Etapas</div>
            <div className="space-y-4 relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100 z-0" />
              {[
                { id: 'audience', label: 'Audiência' },
                { id: 'content', label: 'Conteúdo' },
                { id: 'review', label: 'Revisão' },
                { id: 'running', label: 'Envio' }
              ].map((s, idx) => (
                <div key={s.id} className={clsx("relative z-10 flex items-center gap-3 text-sm", stage === s.id ? "font-bold text-gray-800" : "text-gray-400")}>
                  <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                    stage === s.id ? "bg-green-600 border-green-600 text-white" :
                      // Verified step logic could go here
                      "bg-white border-gray-200"
                  )}>
                    {idx + 1}
                  </div>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">

        {/* STEP 1: AUDIENCE */}
        {stage === 'audience' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4">
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Quem deve receber esta campanha?</h2>
              <p className="text-gray-500">Selecione contatos usando tags, pipeline ou busca.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Filters Panel */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-500"
                      placeholder="Nome ou telefone..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estágio do Funil</label>
                  <select
                    value={pipelineStage}
                    onChange={(e) => setPipelineStage(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-500"
                  >
                    <option value="all">Todos os Estágios</option>
                    {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tags (Incluir)</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setIncludedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])}
                        className={clsx("px-2 py-1 rounded text-xs border transition-colors", includedTags.includes(tag) ? "bg-green-100 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600")}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results List */}
              <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button onClick={toggleAll} className="text-gray-400 hover:text-green-600">
                      {selectedContactIds.length === validContacts.length && validContacts.length > 0 ? <CheckSquare /> : <Square />}
                    </button>
                    <span className="font-semibold text-gray-700">{selectedContactIds.length} selecionados</span>
                    <span className="text-gray-400 text-sm">de {validContacts.length} filtrados</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {validContacts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                      <Users size={48} className="mb-2 opacity-20" />
                      <p>Nenhum contato encontrado com os filtros atuais.</p>
                    </div>
                  ) : (
                    validContacts.map(c => (
                      <div key={c.id} onClick={() => toggleContact(c.id)} className={clsx("flex items-center gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer", selectedContactIds.includes(c.id) && "bg-green-50/30")}>
                        <div className={selectedContactIds.includes(c.id) ? "text-green-600" : "text-gray-300"}>
                          {selectedContactIds.includes(c.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{c.phoneNumber}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{c.pipelineStage ? PIPELINE_STAGES.find(p => p.id === c.pipelineStage)?.label : 'Novo Lead'}</span>
                          </div>
                        </div>
                        {c.tags.slice(0, 2).map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded border border-gray-200">{t}</span>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStage('content')}
                disabled={selectedContactIds.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/10 transition-all"
              >
                Próximo: Conteúdo <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONTENT */}
        {stage === 'content' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4">
            <header className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Configurar Mensagem</h2>
                <p className="text-gray-500">Defina o template e variáveis da campanha.</p>
              </div>
              <button onClick={() => setStage('audience')} className="text-gray-500 hover:text-gray-800 text-sm font-medium">Voltar</button>
            </header>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Campanha (Interno)</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Oferta Black Friday - Segmento A"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Tipo de Mensagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Mensagem</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMessageType('text')}
                    className={clsx(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      messageType === 'text'
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <div className="font-bold text-gray-900 mb-1">📝 Texto Simples</div>
                    <div className="text-xs text-gray-500">Mensagem de texto livre (recomendado)</div>
                  </button>
                  <button
                    onClick={() => setMessageType('template')}
                    className={clsx(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      messageType === 'template'
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <div className="font-bold text-gray-900 mb-1">🎯 Template</div>
                    <div className="text-xs text-gray-500">Template aprovado pela Meta</div>
                  </button>
                </div>
              </div>

              {/* Conteúdo baseado no tipo */}
              {messageType === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem aqui... Use {{nome}} para inserir o primeiro nome do contato."
                    rows={6}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Dica: Use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{nome}}'}</code> para personalizar com o primeiro nome do contato
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Template (Meta ID)</label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                      <input
                        type="text"
                        value={templateLang}
                        onChange={(e) => setTemplateLang(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variáveis</label>
                    <div className="space-y-2">
                      {variables.map((v, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="p-2.5 bg-gray-100 text-gray-500 rounded-lg font-mono text-sm">Var {idx + 1}</span>
                          <input
                            type="text"
                            value={v}
                            onChange={(e) => {
                              const newVars = [...variables];
                              newVars[idx] = e.target.value;
                              setVariables(newVars);
                            }}
                            className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                          />
                          {idx > 0 && (
                            <button onClick={() => setVariables(variables.filter((_, i) => i !== idx))} className="p-2.5 text-red-400 hover:bg-red-50 rounded-lg">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setVariables([...variables, ''])} className="text-sm text-green-600 font-bold hover:underline flex items-center gap-1 mt-2">
                        <Plus size={16} /> Adicionar Variável
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Dica: Use <code>&#123;&#123;nome&#125;&#125;</code> para inserir o primeiro nome do contato.</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <strong>Atenção:</strong> O template deve estar aprovado no Gerenciador do WhatsApp. Caso contrário, o envio falhará.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStage('review')}
                disabled={messageType === 'text' ? !messageText || !campaignName : !templateName || !campaignName}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/10 transition-all"
              >
                Próximo: Revisão <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {stage === 'review' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4">
            <header className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Revisão Final</h2>
                <p className="text-gray-500">Confira os detalhes antes de iniciar.</p>
              </div>
              <button onClick={() => setStage('content')} className="text-gray-500 hover:text-gray-800 text-sm font-medium">Voltar</button>
            </header>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-100 flex justify-between">
                <span className="text-gray-500">Campanha</span>
                <span className="font-bold text-gray-800">{campaignName}</span>
              </div>
              <div className="p-4 border-b border-gray-100 flex justify-between">
                <span className="text-gray-500">Público Alvo</span>
                <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{selectedContactIds.length} contatos</span>
              </div>
              <div className="p-4 border-b border-gray-100 flex justify-between">
                <span className="text-gray-500">Template</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{templateName}</span>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500">Velocidade (Delay)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="5" max="60" step="5"
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="font-bold text-gray-800">{delaySeconds}s</span>
                </div>
              </div>
            </div>

            {/* Pré-visualização da Mensagem */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquarePlus size={18} className="text-green-600" />
                  Pré-visualização da Mensagem
                </h3>
                <p className="text-xs text-gray-500 mt-1">Como a mensagem aparecerá para os contatos</p>
              </div>
              <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
                {/* Simula um chat do WhatsApp */}
                <div className="max-w-md">
                  <div className="bg-green-50 border border-green-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                    {messageType === 'template' && (
                      <div className="text-xs text-green-700 font-semibold mb-2 flex items-center gap-1">
                        <ShieldCheck size={12} />
                        Template: {templateName}
                      </div>
                    )}
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                      {messageType === 'text' ? (
                        // Preview de texto simples
                        (() => {
                          const exampleName = validContacts.length > 0 ? validContacts[0].name.split(' ')[0] : 'Cliente';
                          const processed = messageText
                            .replace(/\{\{nome\}\}/g, exampleName)
                            .replace(/\{\{empresa\}\}/g, 'Sua Empresa');
                          return processed || <span className="text-gray-400 italic">Digite uma mensagem...</span>;
                        })()
                      ) : (
                        // Preview de template
                        variables.length > 0 ? (
                          variables.map((v, idx) => {
                            const exampleName = validContacts.length > 0 ? validContacts[0].name.split(' ')[0] : 'Cliente';
                            const processed = v
                              .replace(/\{\{nome\}\}/g, exampleName)
                              .replace(/\{\{empresa\}\}/g, 'Sua Empresa');
                            return (
                              <div key={idx} className="mb-1">
                                {processed}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-gray-400 italic">Nenhuma variável configurada</span>
                        )
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-2 text-right">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    💡 Exemplo com o primeiro contato: {validContacts.length > 0 ? validContacts[0].name : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-yellow-800 text-sm mb-6">
              <p>Iniciando agora, a campanha levará aproximadamente <strong>{Math.ceil(selectedContactIds.length * delaySeconds / 60)} minutos</strong> para ser concluída.</p>
            </div>

            <button
              onClick={startCampaign}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
            >
              <Send size={24} /> Iniciar Disparo
            </button>
          </div>
        )}

        {/* STEP 4: RUNNING */}
        {stage === 'running' && (
          <div className="h-full flex flex-col animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{campaignName}</h2>
                <p className="text-gray-500 flex items-center gap-2">
                  <span className={clsx("w-2 h-2 rounded-full", isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse")} />
                  {isPaused ? "Pausado" : "Enviando..."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={clsx("px-4 py-2 rounded-lg font-bold flex items-center gap-2", isPaused ? "bg-green-600 text-white" : "bg-yellow-500 text-white")}
                >
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  {isPaused ? "Retomar" : "Pausar"}
                </button>
                {isPaused && (
                  <button onClick={() => { setStage('audience'); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold">
                    Novo Envio
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Total</div>
                <div className="text-2xl font-bold text-gray-800">{queue.length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Enviados</div>
                <div className="text-2xl font-bold text-blue-600">{currentIndex}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Sucesso</div>
                <div className="text-2xl font-bold text-green-600">{queue.filter(q => q.status === 'success').length}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Falha</div>
                <div className="text-2xl font-bold text-red-600">{queue.filter(q => q.status === 'failed').length}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
              <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(currentIndex / queue.length) * 100}%` }} />
            </div>

            {/* Log Table */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">Log em Tempo Real</div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-gray-500 sticky top-0 border-b border-gray-100">
                    <tr>
                      <th className="p-3">Contato</th>
                      <th className="p-3">Telefone</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {queue.map(item => (
                      <tr key={item.id} className={clsx(item.status === 'sending' && "bg-blue-50")}>
                        <td className="p-3 font-medium text-gray-800">{item.contactName}</td>
                        <td className="p-3 text-gray-500">{item.phone}</td>
                        <td className="p-3 text-right">
                          {item.status === 'pending' && <span className="text-gray-400">Pendente</span>}
                          {item.status === 'sending' && <span className="text-blue-600 font-bold animate-pulse">Enviando...</span>}
                          {item.status === 'success' && <span className="text-green-600 font-bold flex justify-end items-center gap-1"><CheckCircle2 size={14} /> OK</span>}
                          {item.status === 'failed' && <span className="text-red-600 font-bold flex justify-end items-center gap-1"><XCircle size={14} /> Erro</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
