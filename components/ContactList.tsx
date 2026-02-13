import React, { useState, useMemo } from 'react';
import { Contact, View } from '../types';
import { useAppStore } from '../stores/useAppStore';
import { PIPELINE_STAGES } from '../constants';
import {
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  Tag,
  X,
  Check,
  Pencil,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  Trash2,
  Download,
  Users,
  Target,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

interface ContactListProps {
  contacts: Contact[];
  onUpdateContact: (id: string, updates: Partial<Contact>) => void;
  onAddContact: (contact: Contact) => void;
}

const DEFAULT_AVATAR = 'https://picsum.photos/200';
const STATUS_OPTIONS: { value: Contact['status']; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'archived', label: 'Arquivado' },
  { value: 'blocked', label: 'Bloqueado' },
];

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  onUpdateContact,
  onAddContact,
}) => {
  const { setCurrentView, addMessage, messages, setSelectedContactId } = useAppStore();
  const [filterText, setFilterText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<Contact['status'] | 'all'>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const total = contacts.length;
    const leads = contacts.filter(c => c.tags.includes('Lead') || (c.pipelineStage && c.pipelineStage !== 'new')).length;
    const potentialValue = contacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
    return { total, leads, potentialValue };
  }, [contacts]);

  // --- Filtering ---
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts?.forEach((contact) => contact.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesText =
        contact.name.toLowerCase().includes(filterText.toLowerCase()) ||
        (contact.company?.toLowerCase().includes(filterText.toLowerCase()) ?? false) ||
        contact.phoneNumber.includes(filterText);
      const matchesTags =
        selectedTags.length === 0 || selectedTags.some((tag) => contact.tags.includes(tag));
      const matchesStatus = filterStatus === 'all' || contact.status === filterStatus;
      const matchesStage = filterStage === 'all' || (contact.pipelineStage || 'new') === filterStage;

      return matchesText && matchesTags && matchesStatus && matchesStage;
    });
  }, [contacts, filterText, selectedTags, filterStatus, filterStage]);

  // --- Actions ---
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setFilterText('');
    setFilterStatus('all');
    setFilterStage('all');
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContactIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (confirm(`Tem certeza que deseja excluir ${selectedContactIds.size} contatos?`)) {
      const { deleteContact } = useAppStore.getState();
      selectedContactIds.forEach(id => {
        deleteContact(id);
      });
      setSelectedContactIds(new Set());
      toast.success(`${selectedContactIds.size} contatos excluídos.`);
    }
  };

  const handleExportSelected = () => {
    const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id));
    const csvContent = "data:text/csv;charset=utf-8," +
      "Nome,Telefone,Email,Empresa,Status,Tags\n" +
      selectedContacts.map(c =>
        `"${c.name}","${c.phoneNumber}","${c.email || ''}","${c.company || ''}","${c.status}","${c.tags.join(';')}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contatos_export_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartChat = (contact: Contact) => {
    // Check if chat exists, if not, logic to create (handled by ChatInterface usually or selecting contact)
    // Here we just navigate to inbox and ideally would select this contact.
    // Since AppStore setCurrentView doesn't support params yet, we assume the user just wants to go to Inbox
    // In a full implementation, we'd set the 'selectedChatId' in the store.
    // For now, let's just go to Inbox.
    setSelectedContactId(contact.id);
    setCurrentView(View.INBOX);
    toast.success(`Indo para o chat com ${contact.name}`);
  };

  const handleOpenWhatsApp = (phoneNumber: string) => {
    window.open(`https://wa.me/${phoneNumber.replace(/\D/g, '')}`, '_blank');
  };


  // --- Modals --- (Keep existing modal logic, simplified for brevity in this replace but fully kept in code)
  const openNewModal = () => { setShowNewModal(true); setMenuOpenId(null); };
  const openEditModal = (contact: Contact) => { setEditContact({ ...contact }); setMenuOpenId(null); };
  const closeModals = () => { setShowNewModal(false); setEditContact(null); };

  const handleAddContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value?.trim();
    const countryCode = (form.querySelector('[name="countryCode"]') as HTMLInputElement)?.value?.replace(/\D/g, '') || '55';
    const phoneInput = (form.querySelector('[name="phoneNumber"]') as HTMLInputElement)?.value?.replace(/\D/g, '');

    if (!name || !phoneInput) return;

    const fullPhoneNumber = countryCode + phoneInput;

    const newContact: Contact = {
      id: 'c' + Date.now(),
      name,
      phoneNumber: fullPhoneNumber,
      avatar: (form.querySelector('[name="avatar"]') as HTMLInputElement)?.value?.trim() || DEFAULT_AVATAR,
      status: (form.querySelector('[name="status"]') as HTMLSelectElement)?.value as Contact['status'],
      pipelineStage: (form.querySelector('[name="pipelineStage"]') as HTMLSelectElement)?.value as Contact['pipelineStage'],
      dealValue: Number((form.querySelector('[name="dealValue"]') as HTMLInputElement)?.value) || 0,
      tags: (form.querySelector('[name="tags"]') as HTMLInputElement)?.value?.trim().split(/[,;]/).map(t => t.trim()).filter(Boolean) || ['Contato'],
      lastSeen: 'Agora',
      email: (form.querySelector('[name="email"]') as HTMLInputElement)?.value?.trim() || undefined,
      company: (form.querySelector('[name="company"]') as HTMLInputElement)?.value?.trim() || undefined,
    };
    onAddContact(newContact);
    closeModals();
    toast.success('Contato criado com sucesso!');
  };

  const handleUpdateContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editContact) return;
    const form = e.currentTarget;

    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value?.trim();
    const countryCode = (form.querySelector('[name="countryCode"]') as HTMLInputElement)?.value?.replace(/\D/g, '') || '55';
    const phoneInput = (form.querySelector('[name="phoneNumber"]') as HTMLInputElement)?.value?.replace(/\D/g, '');

    if (!name || !phoneInput) return;

    const fullPhoneNumber = countryCode + phoneInput;

    const updates = {
      name,
      phoneNumber: fullPhoneNumber,
      company: (form.querySelector('[name="company"]') as HTMLInputElement)?.value?.trim() || undefined,
      email: (form.querySelector('[name="email"]') as HTMLInputElement)?.value?.trim() || undefined,
      avatar: (form.querySelector('[name="avatar"]') as HTMLInputElement)?.value?.trim() || DEFAULT_AVATAR,
      status: (form.querySelector('[name="status"]') as HTMLSelectElement)?.value as Contact['status'],
      pipelineStage: (form.querySelector('[name="pipelineStage"]') as HTMLSelectElement)?.value as Contact['pipelineStage'],
      dealValue: Number((form.querySelector('[name="dealValue"]') as HTMLInputElement)?.value) || 0,
      tags: (form.querySelector('[name="tags"]') as HTMLInputElement)?.value?.trim().split(/[,;]/).map(t => t.trim()).filter(Boolean) || [],
    };

    onUpdateContact(editContact.id, updates);
    closeModals();
    toast.success('Contato atualizado!');
  };


  const renderContactForm = (contact?: Contact | null, isEdit = false) => {
    const c = contact ?? null;

    // Tenta extrair DDI e Telefone caso já existam
    let defaultDDI = '55';
    let defaultPhone = c?.phoneNumber || '';

    if (c?.phoneNumber && c.phoneNumber.startsWith('55')) {
      defaultDDI = '55';
      defaultPhone = c.phoneNumber.slice(2);
    } else if (c?.phoneNumber && c.phoneNumber.startsWith('+')) {
      // Lógica simples para outros DDIs se necessário
      // Por enquanto focamos no 55
    }

    return (
      <form onSubmit={isEdit ? handleUpdateContactSubmit : handleAddContactSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input name="name" defaultValue={c?.name} required className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Nome completo" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">DDI</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">+</span>
              <input
                name="countryCode"
                defaultValue={defaultDDI}
                className="w-full p-2.5 pl-5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm text-center"
                placeholder="55"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (com DDD) *</label>
            <input
              name="phoneNumber"
              type="tel"
              defaultValue={defaultPhone}
              required
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="21999999999"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select aria-label="Status do contato" name="status" defaultValue={c?.status ?? 'active'} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {/* Pipeline Fields */}
        <div className="grid grid-cols-2 gap-4 bg-purple-50 p-3 rounded-lg border border-purple-100">
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-1">Estágio do Pipeline</label>
            <select aria-label="Estágio do Pipeline" name="pipelineStage" defaultValue={c?.pipelineStage ?? 'new'} className="w-full p-2.5 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white">
              {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-1">Valor do Negócio (R$)</label>
            <input name="dealValue" type="number" defaultValue={c?.dealValue} className="w-full p-2.5 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <input name="company" defaultValue={c?.company} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Empresa" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input name="email" type="email" defaultValue={c?.email} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="email@..." />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separadas por vírgula)</label>
          <input name="tags" defaultValue={c?.tags?.join(', ')} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Lead, Cliente, VIP" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL da foto</label>
          <input aria-label="URL da foto" name="avatar" defaultValue={c?.avatar || DEFAULT_AVATAR} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={closeModals} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">{isEdit ? 'Salvar' : 'Criar contato'}</button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50/50">

      {/* Header & Stats */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
            <p className="text-gray-500">Gerencie seus leads e clientes do WhatsApp.</p>
          </div>
          <button
            onClick={openNewModal}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm font-medium"
            title="Novo Contato"
          >
            <UserPlus size={18} />
            Novo Contato
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Contatos</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Target size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Leads Ativos</p>
              <p className="text-2xl font-bold text-gray-800">{stats.leads}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Valor em Potencial</p>
              <p className="text-2xl font-bold text-gray-800">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.potentialValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 bg-white space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">

            {/* Search */}
            <div className="relative max-w-md w-full">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, empresa..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Buscar contatos"
              />
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              {selectedContactIds.size > 0 ? (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-right-4">
                  <span className="text-xs font-semibold text-blue-800 mr-2">
                    {selectedContactIds.size} selecionados
                  </span>
                  <div className="h-4 w-px bg-blue-200 mx-1" />
                  <button
                    onClick={handleExportSelected}
                    className="p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    title="Exportar CSV"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Excluir selecionados"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as Contact['status'] | 'all')}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Filtrar por Status"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativos</option>
                    <option value="archived">Arquivados</option>
                    <option value="blocked">Bloqueados</option>
                  </select>

                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 hidden sm:block"
                    aria-label="Filtrar por Estágio"
                  >
                    <option value="all">Fases do Pipeline</option>
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors whitespace-nowrap',
                      showFilters || selectedTags.length > 0
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                    title="Filtros avançados"
                  >
                    <Filter size={18} />
                    <span className="hidden sm:inline">Filtros</span>
                    {selectedTags.length > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">
                        {selectedTags.length}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tags Filter */}
          {(showFilters || selectedTags.length > 0) && (
            <div className="pt-2 animate-in slide-in-from-top-2 fade-in duration-200 border-t border-gray-100 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={12} /> Filtrar por Tags
                </span>
                {(selectedTags.length > 0 || filterText || filterStatus !== 'all' || filterStage !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    title="Limpar todos os filtros"
                  >
                    <X size={12} /> Limpar tudo
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-sm border transition-all flex items-center gap-2',
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 border-blue-200 text-blue-800 font-medium'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    )}
                    title={`Filtrar por ${tag}`}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase font-medium border-b border-gray-100">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedContactIds.size > 0 && selectedContactIds.size === filteredContacts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    aria-label="Selecionar todos os contatos"
                  />
                </th>
                <th className="p-4 pl-2">Nome</th>
                <th className="p-4 hidden md:table-cell">Empresa</th>
                <th className="p-4 hidden sm:table-cell">Status</th>
                <th className="p-4">Estágio</th>
                <th className="p-4 hidden lg:table-cell">Tags</th>
                <th className="p-4 text-center">Ações</th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className={clsx(
                  'hover:bg-gray-50 transition-colors group',
                  selectedContactIds.has(contact.id) && 'bg-blue-50/30'
                )}>
                  <td className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={() => toggleSelectContact(contact.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      aria-label={`Selecionar ${contact.name}`}
                    />
                  </td>
                  <td className="p-4 pl-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAvatarPreviewUrl(contact.avatar)}
                        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                        title={`Ver foto de ${contact.name}`}
                      >
                        <img
                          src={contact.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover hover:opacity-90 cursor-pointer border border-gray-100"
                        />
                      </button>
                      <div>
                        <div className="font-semibold text-gray-900">{contact.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{contact.phoneNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-medium whitespace-nowrap hidden md:table-cell">
                    {contact.company || '-'}
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                        contact.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : contact.status === 'archived'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                      )}
                    >
                      {contact.status === 'active' ? 'Ativo' : contact.status === 'archived' ? 'Arquivado' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="p-4">
                    {(() => {
                      const stage = PIPELINE_STAGES.find(s => s.id === (contact.pipelineStage || 'new'));
                      return (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${stage?.color || 'bg-gray-300'}`} />
                          <span className="text-sm text-gray-700 max-w-[100px] truncate">{stage?.label || 'Novo'}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className={clsx(
                            'px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors',
                            'bg-gray-50 text-gray-600 border-gray-200'
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 3 && (
                        <span className="text-xs text-gray-400 flex items-center" title={contact.tags.slice(3).join(', ')}>+{contact.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleStartChat(contact)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Conversar"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenWhatsApp(contact.phoneNumber)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Abrir WhatsApp Externo"
                      >
                        <ExternalLink size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === contact.id ? null : contact.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Mais opções"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {menuOpenId === contact.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-2 top-12 z-20 py-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[140px] animate-in slide-in-from-top-2 fade-in duration-200">
                          <button
                            onClick={() => openEditModal(contact)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Pencil size={16} />
                            Editar
                          </button>
                          <button
                            onClick={() => { setAvatarPreviewUrl(contact.avatar); setMenuOpenId(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <ImageIcon size={16} />
                            Ver foto
                          </button>
                          {contact.status === 'blocked' && (
                            <button
                              onClick={() => {
                                onUpdateContact(contact.id, { status: 'active' });
                                setMenuOpenId(null);
                                toast.success(`${contact.name} desbloqueado!`);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                            >
                              <Check size={16} />
                              🔓 Desbloquear
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={32} className="text-gray-300" />
                      <p>Nenhum contato encontrado com os filtros atuais.</p>
                      <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline mt-2">
                        Limpar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
          Mostrando {filteredContacts.length} de {contacts.length} contatos
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModals}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Novo Contato</h2>
              <button onClick={closeModals} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" title="Fechar"><X size={20} /></button>
            </div>
            {renderContactForm(null, false)}
          </div>
        </div>
      )}

      {editContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModals}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Editar Contato</h2>
              <button onClick={closeModals} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" title="Fechar"><X size={20} /></button>
            </div>
            {renderContactForm(editContact, true)}
          </div>
        </div>
      )}

      {avatarPreviewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setAvatarPreviewUrl(null)}>
          <button onClick={() => setAvatarPreviewUrl(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white z-10" title="Fechar"><X size={24} /></button>
          <img src={avatarPreviewUrl} alt="Foto do contato" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};
