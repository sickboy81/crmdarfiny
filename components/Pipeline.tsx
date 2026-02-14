import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Contact, View } from '../types';
import { PIPELINE_STAGES } from '../constants';
import { MoreHorizontal, Plus, DollarSign, Calendar, X, Home, MessageSquare, Search, Check } from 'lucide-react';
import { useRealEstateStore } from '../stores/useRealEstateStore';
import { useAppStore } from '../stores/useAppStore';
import clsx from 'clsx';


interface PipelineProps {
  contacts: Contact[];
  onUpdateContact: (id: string, updates: Partial<Contact>) => void;
  onAddContact?: (contact: Contact) => void;
}

const emptyForm = () => ({
  name: '',
  company: '',
  phoneNumber: '',
  dealValue: 0,
  pipelineStage: 'new' as Contact['pipelineStage'],
  tagsStr: '',
  notes: '',
});

export const Pipeline: React.FC<PipelineProps> = ({ contacts, onUpdateContact, onAddContact }) => {
  const { properties } = useRealEstateStore();
  const { setSelectedContactId, setCurrentView } = useAppStore();
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);

  const handleChat = (contactId: string) => {
    setSelectedContactId(contactId);
    setCurrentView(View.INBOX);
  };

  const [preselectedStageId, setPreselectedStageId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // New state for contact selection
  const [contactSearch, setContactSearch] = useState('');
  const [selectedExistingContactId, setSelectedExistingContactId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, contactId: string } | null>(null);

  const CARD_COLORS = [
    { id: 'white', bg: '#ffffff', border: 'border-gray-200', label: 'Padrão' },
    { id: 'blue', bg: '#bfdbfe', border: 'border-blue-300', label: 'Azul' }, // blue-200
    { id: 'green', bg: '#bbf7d0', border: 'border-green-300', label: 'Verde' }, // green-200
    { id: 'yellow', bg: '#fef08a', border: 'border-yellow-300', label: 'Amarelo' }, // yellow-200
    { id: 'red', bg: '#fecaca', border: 'border-red-300', label: 'Vermelho' }, // red-200
    { id: 'purple', bg: '#e9d5ff', border: 'border-purple-300', label: 'Roxo' }, // purple-200
  ];

  const handleContextMenu = (e: React.MouseEvent, contactId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, contactId });
  };

  const handleColorSelect = (colorId: string) => {
    if (contextMenu) {
      onUpdateContact(contextMenu.contactId, { cardColor: colorId });
      setContextMenu(null);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getCardColorBg = (colorId?: string) => {
    const color = CARD_COLORS.find(c => c.id === colorId) || CARD_COLORS[0];
    return color.bg;
  };

  const getCardBorderClass = (colorId?: string) => {
    const color = CARD_COLORS.find(c => c.id === colorId) || CARD_COLORS[0];
    return color.border;
  };

  const openCreate = (stageId?: string) => {
    setForm({ ...emptyForm(), pipelineStage: (stageId || 'new') as Contact['pipelineStage'] });
    setPreselectedStageId(stageId || null);
    setEditingContact(null);
    setContactSearch('');
    setSelectedExistingContactId(null);
    setModalMode('create');
    setMenuOpenId(null);
  };

  const openEdit = (c: Contact) => {
    setForm({
      name: c.name,
      company: c.company || '',
      phoneNumber: c.phoneNumber,
      dealValue: c.dealValue ?? 0,
      pipelineStage: c.pipelineStage || 'new',
      tagsStr: (c.tags || []).join(', '),
      notes: c.notes || '',
    });
    setPreselectedStageId(null);
    setEditingContact(c);
    setSelectedExistingContactId(null);
    setModalMode('edit');
    setMenuOpenId(null);
  };

  const getPropertyDetails = (propertyId?: string) => {
    return properties.find(p => p.id === propertyId);
  };

  const closeModal = () => {
    setModalMode(null);
    setPreselectedStageId(null);
    setEditingContact(null);
    setForm(emptyForm());
    setContactSearch('');
    setSelectedExistingContactId(null);
  };

  const handleSave = () => {
    const tags = form.tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // If selecting an existing contact for a new opportunity, we UPDATE it instead of creating duplicate
    if (modalMode === 'create' && selectedExistingContactId) {
      onUpdateContact(selectedExistingContactId, {
        dealValue: form.dealValue,
        pipelineStage: (preselectedStageId || form.pipelineStage) as Contact['pipelineStage'],
        notes: form.notes || undefined,
        // Optionally update other fields if changed, but maybe keep original? 
        // Let's update basic info too just in case they fixed a typo
        name: form.name,
        company: form.company || undefined,
        phoneNumber: form.phoneNumber.length >= 10 && form.phoneNumber.length <= 11 && !form.phoneNumber.startsWith('55')
          ? `55${form.phoneNumber}`
          : form.phoneNumber,
        tags: tags.length > 0 ? tags : undefined // Merge? simplistic replace for now
      });
      closeModal();
      return;
    }

    if (modalMode === 'create' && onAddContact) {
      const newContact: Contact = {
        id: `c-${Date.now()}`,
        name: form.name,
        phoneNumber: form.phoneNumber.length >= 10 && form.phoneNumber.length <= 11 && !form.phoneNumber.startsWith('55')
          ? `55${form.phoneNumber}`
          : form.phoneNumber,
        avatar: 'https://picsum.photos/200',
        status: 'active',
        tags,
        lastSeen: 'Agora',
        company: form.company || undefined,
        pipelineStage: (preselectedStageId || form.pipelineStage) as Contact['pipelineStage'],
        dealValue: form.dealValue,
        notes: form.notes || undefined,
      };
      onAddContact(newContact);
    } else if (modalMode === 'edit' && editingContact) {
      onUpdateContact(editingContact.id, {
        name: form.name,
        company: form.company || undefined,
        phoneNumber: form.phoneNumber.length >= 10 && form.phoneNumber.length <= 11 && !form.phoneNumber.startsWith('55')
          ? `55${form.phoneNumber}`
          : form.phoneNumber,
        dealValue: form.dealValue,
        pipelineStage: form.pipelineStage,
        tags,
        notes: form.notes || undefined,
      });
    }
    closeModal();
  };

  const handleSelectContact = (contact: Contact) => {
    setForm({
      name: contact.name,
      company: contact.company || '',
      phoneNumber: contact.phoneNumber,
      dealValue: contact.dealValue || 0,
      pipelineStage: (preselectedStageId || contact.pipelineStage || 'new') as Contact['pipelineStage'],
      tagsStr: (contact.tags || []).join(', '),
      notes: contact.notes || '',
    });
    setSelectedExistingContactId(contact.id);
    setContactSearch('');
  };

  const filteredContacts = contactSearch.length > 1
    ? contacts.filter(c =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phoneNumber.includes(contactSearch)
    ).slice(0, 5)
    : [];

  const removeFromPipeline = (contactId: string) => {
    onUpdateContact(contactId, { pipelineStage: 'lost' });
    setMenuOpenId(null);
  };

  const getColumnTotal = (stageId: string) => {
    return contacts
      .filter((c) => (c.pipelineStage || 'new') === stageId)
      .reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  };

  const getColumnCount = (stageId: string) => {
    return contacts.filter((c) => (c.pipelineStage || 'new') === stageId).length;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Update contact stage
    onUpdateContact(draggableId, { pipelineStage: destination.droppableId as Contact['pipelineStage'] });
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F3F6] overflow-hidden relative font-sans">
      {/* Immersive Header */}
      <div className="px-10 py-10 bg-white/80 backdrop-blur-md flex justify-between items-end shrink-0 z-10 border-b border-gray-100/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-3 bg-gradient-to-r from-gray-900 to-gray-500 bg-clip-text text-transparent">FUNIL DE VENDAS</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {contacts.length} Oportunidades Ativas · {formatCurrency(contacts.reduce((acc, c) => acc + (c.dealValue || 0), 0))} em Negociação
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-gray-50/50 rounded-2xl border border-gray-100 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sincronização Ativa</span>
          </div>
          <button
            onClick={() => openCreate()}
            className="group relative px-8 py-4 bg-gray-900 text-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] overflow-hidden transition-all hover:scale-105 active:scale-95 hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.35)]"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <div className="relative flex items-center gap-3">
              <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-xs font-black uppercase tracking-[0.15em]">Novo</span>
            </div>
          </button>
        </div>
      </div>

      {/* Board Area */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden custom-scrollbar pb-6">
          <div className="h-full flex px-6 gap-4 min-w-max pt-6">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.id}
                className="w-[280px] flex flex-col h-full max-h-full"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-8 px-5">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-6 bg-gray-900 rounded-full"></div>
                    <div>
                      <span className="text-[12px] font-black text-gray-900 uppercase tracking-widest block">
                        {stage.label}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {getColumnCount(stage.id)} Negócios
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white/50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-700 shadow-sm">
                    {formatCurrency(getColumnTotal(stage.id))}
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={clsx(
                        "flex-1 rounded-[32px] transition-all duration-300 flex flex-col gap-5 p-4 overflow-y-auto scrollbar-hide pb-24 border border-slate-300/50 bg-slate-200/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)]",
                        snapshot.isDraggingOver ? "bg-slate-200/80 ring-4 ring-blue-500/20" : ""
                      )}
                    >
                      {contacts
                        .filter((c) => (c.pipelineStage || 'new') === stage.id)
                        .map((contact, index) => (
                          <Draggable key={contact.id} draggableId={contact.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openEdit(contact)}
                                onContextMenu={(e) => handleContextMenu(e, contact.id)}
                                className={clsx(
                                  "group relative bg-white p-4 rounded-[20px] transition-all duration-300 border border-gray-200 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.15)] cursor-pointer hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.25)] hover:scale-[1.02] hover:-translate-y-1 hover:border-blue-300",
                                  snapshot.isDragging ? "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] rotate-2 scale-110 z-50 ring-4 ring-blue-600 border-blue-600" : ""
                                )}
                                style={{
                                  ...provided.draggableProps.style,
                                  backgroundColor: contact.cardColor && contact.cardColor !== 'white' ? getCardColorBg(contact.cardColor) : undefined,
                                  border: contact.cardColor && contact.cardColor !== 'white' ? '1px solid rgba(0,0,0,0.05)' : undefined
                                }}
                              >
                                {/* Card Actions */}
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <button
                                    onMouseDown={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === contact.id ? null : contact.id); }}
                                    className="p-2 bg-gray-50 hover:bg-white rounded-xl text-gray-400 hover:text-gray-900 transition-all shadow-sm"
                                  >
                                    <MoreHorizontal size={18} />
                                  </button>
                                </div>

                                {menuOpenId === contact.id && (
                                  <div className="absolute right-6 top-14 z-[60] bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100/50 py-2 min-w-[200px] animate-in fade-in zoom-in-95" onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                      onMouseDown={(e) => { e.stopPropagation(); openEdit(contact); }}
                                      className="w-full text-left px-5 py-3 text-xs font-black text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    >
                                      EDITAR DETALHES
                                    </button>
                                    <div className="h-px bg-gray-50 mx-2 my-1" />
                                    <div className="px-5 py-3">
                                      <p className="text-[10px] uppercase font-black text-gray-400 mb-3 tracking-widest">MARCAÇÃO VISUAL</p>
                                      <div className="flex flex-wrap gap-2">
                                        {CARD_COLORS.map(color => (
                                          <button
                                            key={color.id}
                                            onMouseDown={(e) => { e.stopPropagation(); onUpdateContact(contact.id, { cardColor: color.id }); }}
                                            className={clsx(
                                              "w-6 h-6 rounded-lg transition-all hover:scale-125 border border-black/5 shadow-sm",
                                              (contact.cardColor === color.id) && "ring-2 ring-offset-2 ring-blue-500 scale-110"
                                            )}
                                            style={{ backgroundColor: color.bg }}
                                            title={color.label}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <div className="h-px bg-gray-50 mx-2 my-1" />
                                    <button
                                      onMouseDown={(e) => { e.stopPropagation(); removeFromPipeline(contact.id); }}
                                      className="w-full text-left px-5 py-3 text-xs font-black text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                      ARQUIVAR NEGÓCIO
                                    </button>
                                  </div>
                                )}

                                {/* Card Content */}
                                <div className="space-y-4">
                                  <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 overflow-hidden flex-shrink-0 relative group-hover:shadow-md transition-shadow">
                                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        {contact.company && (
                                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                                            {contact.company}
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-sm font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors truncate">
                                        {contact.name}
                                      </h4>
                                    </div>
                                  </div>

                                  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 shadow-inner group-hover:bg-white transition-colors">
                                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                                      <DollarSign size={14} className="text-green-500" />
                                      <span className="text-[10px] font-black tracking-widest uppercase">Valor do Negócio</span>
                                    </div>
                                    <div className="text-xl font-black text-gray-900 tracking-tighter">
                                      {contact.dealValue ? formatCurrency(contact.dealValue) : "R$ 0,00"}
                                    </div>
                                  </div>

                                  {(contact.tags && contact.tags.length > 0) && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {contact.tags.slice(0, 3).map((tag) => (
                                        <span key={tag} className="px-2.5 py-1 rounded-xl bg-white border border-gray-100 text-[9px] font-black text-gray-500 uppercase tracking-tighter shadow-sm">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-4 border-t border-gray-100/80">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300">
                                      <Calendar size={12} />
                                      <span className="uppercase tracking-widest">Ativo há 2d</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onMouseDown={(e) => { e.stopPropagation(); handleChat(contact.id); }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 text-white hover:bg-blue-600 transition-all shadow-md active:scale-95"
                                      >
                                        <MessageSquare size={14} strokeWidth={3} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}

                      {/* Add Button Inside Column */}
                      <button
                        onClick={() => openCreate(stage.id)}
                        className="group flex flex-col items-center justify-center gap-3 p-8 rounded-[32px] border-2 border-dashed border-gray-200/50 hover:border-blue-400/40 hover:bg-white transition-all text-gray-300 hover:text-blue-600 shadow-sm hover:shadow-xl"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-all group-hover:rotate-180">
                          <Plus size={20} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Adicionar Deal</span>
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Context Menu (Global Overlay for Color) */}
      {contextMenu && (
        <div
          className="fixed z-[9999]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.preventDefault()} // Prevent closing immediately
        >
          {/* Reusing the card dropdown logic essentially, but this is the right-click fallback */}
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-2 min-w-[150px] animate-in fade-in zoom-in-95">
            <div className="px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações Rápidas</div>
            <div className="grid grid-cols-6 gap-1 p-2">
              {CARD_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => handleColorSelect(color.id)}
                  className="w-5 h-5 rounded-full border border-gray-100 hover:scale-125 transition-transform"
                  style={{ backgroundColor: color.bg }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Oportunidade / Editar */}
      {modalMode && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-md"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 bg-[#101828] flex items-center justify-between sticky top-0 z-10 w-full">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {modalMode === 'create' ? 'Novo Negócio' : 'Editar Negócio'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Preencha os detalhes da oportunidade abaixo.</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-700/50 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1 w-full bg-gray-50/50">

              {/* Seção Principal */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 w-full">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                  <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                  Informações Principais
                </h3>

                {modalMode === 'create' && (
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Vincular Contato (Opcional)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Buscar contato existente..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-500 text-gray-900 font-medium"
                      />
                      {filteredContacts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 z-50 max-h-48 overflow-y-auto">
                          {filteredContacts.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectContact(c)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 overflow-hidden">
                                {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full object-cover" /> : c.name.charAt(0)}
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                                <div className="text-xs text-gray-400">{c.phoneNumber}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">Nome do Lead</label>
                    <input
                      type="text"
                      placeholder="Ex: Ana Silva"
                      className="w-full px-4 py-2.5 bg-white border border-gray-400 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-500 text-gray-900 text-sm font-medium"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ex: 11999999999"
                      className="w-full px-4 py-2.5 bg-white border border-gray-400 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-500 text-gray-900 text-sm font-medium"
                      value={form.phoneNumber}
                      onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-gray-700">Valor Estimado</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">R$</span>
                    <input
                      type="number"
                      value={form.dealValue || ''}
                      onChange={(e) => setForm((f) => ({ ...f, dealValue: Number(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-400 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-gray-900 text-sm font-medium transition-all placeholder:text-gray-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-semibold text-gray-700">Estágio do Funil</label>
                <div className="grid grid-cols-3 gap-3">
                  {PIPELINE_STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => !preselectedStageId && setForm(f => ({ ...f, pipelineStage: s.id as any }))}
                      disabled={!!preselectedStageId}
                      className={clsx(
                        "px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all border shadow-sm",
                        (preselectedStageId || form.pipelineStage) === s.id
                          ? "bg-slate-900 border-slate-900 text-white shadow-md transform scale-[1.02]"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seção Detalhes */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 w-full">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                  <span className="w-1 h-4 bg-purple-600 rounded-full"></span>
                  Detalhes Adicionais
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Tags (Separar por vírgula)</label>
                  <input
                    value={form.tagsStr}
                    onChange={(e) => setForm((f) => ({ ...f, tagsStr: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-gray-900 font-medium placeholder:text-gray-500"
                    placeholder="investidor, alto padrão, urgente..."
                  />
                  <p className="text-[10px] text-gray-400">Pressione Enter ou Vírgula para separar</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Anotações Internas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-400 rounded-lg h-24 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-sm text-gray-900 font-medium resize-none placeholder-gray-500"
                    placeholder="Detalhes sobre a negociação..."
                  />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-200 bg-white flex justify-end gap-3 sticky bottom-0 z-10 w-full rounded-b-[32px]">
              <button
                onClick={closeModal}
                className="px-5 py-2 text-sm text-gray-600 font-semibold hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Check size={16} />
                Salvar Negócio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
