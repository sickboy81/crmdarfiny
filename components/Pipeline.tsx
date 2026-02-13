import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Contact, View } from '../types';
import { PIPELINE_STAGES } from '../constants';
import { MoreHorizontal, Plus, DollarSign, Calendar, X, Home, MessageSquare, Search } from 'lucide-react';
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
        phoneNumber: form.phoneNumber,
        tags: tags.length > 0 ? tags : undefined // Merge? simplistic replace for now
      });
      closeModal();
      return;
    }

    if (modalMode === 'create' && onAddContact) {
      const newContact: Contact = {
        id: `c-${Date.now()}`,
        name: form.name,
        phoneNumber: form.phoneNumber,
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
        phoneNumber: form.phoneNumber,
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
      <div className="px-10 py-8 bg-white flex justify-between items-end shrink-0 z-10 border-b border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">PIPELINE</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {contacts.length} Active Opportunities · {formatCurrency(contacts.reduce((acc, c) => acc + (c.dealValue || 0), 0))} Pipeline Value
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Sync</span>
          </div>
          <button
            onClick={() => openCreate()}
            className="group relative px-6 py-3 bg-[#0F172A] text-white rounded-xl shadow-xl shadow-gray-200 overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <div className="relative flex items-center gap-2">
              <Plus size={18} strokeWidth={3} />
              <span className="text-xs font-black uppercase tracking-widest">New Deal</span>
            </div>
          </button>
        </div>
      </div>

      {/* Board Area */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div className="h-full flex px-10 pb-10 gap-8 min-w-max pt-10">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.id}
                className="w-[340px] flex flex-col h-full max-h-full"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-6 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-[0.1em]">
                      {stage.label}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-200/50 text-[10px] font-bold text-gray-600 rounded-md">
                      {getColumnCount(stage.id)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-gray-400">
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
                        "flex-1 rounded-[28px] transition-all duration-300 flex flex-col gap-4 p-3 overflow-y-auto scrollbar-hide pb-20 bg-gray-200/30 border border-gray-200/40",
                        snapshot.isDraggingOver ? "bg-gray-200/60 ring-2 ring-blue-200 ring-inset" : ""
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
                                  "group relative bg-white p-5 rounded-[20px] transition-all duration-300 border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-[0_15px_45px_rgba(0,0,0,0.12)] hover:border-blue-400/30 hover:translate-y-[-4px]",
                                  snapshot.isDragging ? "shadow-2xl rotate-2 scale-105 z-50 ring-2 ring-blue-500 border-blue-400" : ""
                                )}
                                style={{
                                  ...provided.draggableProps.style,
                                  backgroundColor: contact.cardColor && contact.cardColor !== 'white' ? getCardColorBg(contact.cardColor) : undefined
                                }}
                              >
                                {/* Card Actions */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onMouseDown={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === contact.id ? null : contact.id); }}
                                    className="p-1.5 hover:bg-black/5 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                </div>

                                {menuOpenId === contact.id && (
                                  <div className="absolute right-4 top-10 z-[60] bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px] animate-in fade-in zoom-in-95" onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                      onMouseDown={(e) => { e.stopPropagation(); openEdit(contact); }}
                                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    >
                                      Editar Detalhes
                                    </button>
                                    <div className="h-px bg-gray-50 my-1" />
                                    <div className="px-4 py-2">
                                      <p className="text-[10px] uppercase font-black text-gray-300 mb-2">Marcação</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {CARD_COLORS.map(color => (
                                          <button
                                            key={color.id}
                                            onMouseDown={(e) => { e.stopPropagation(); onUpdateContact(contact.id, { cardColor: color.id }); }}
                                            className={clsx(
                                              "w-5 h-5 rounded-full transition-transform hover:scale-110 border border-black/5",
                                              (contact.cardColor === color.id) && "ring-2 ring-offset-2 ring-gray-400"
                                            )}
                                            style={{ backgroundColor: color.bg }}
                                            title={color.label}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <div className="h-px bg-gray-50 my-1" />
                                    <button
                                      onMouseDown={(e) => { e.stopPropagation(); removeFromPipeline(contact.id); }}
                                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50"
                                    >
                                      Arquivar
                                    </button>
                                  </div>
                                )}

                                {/* Card Content */}
                                <div className="pr-6">
                                  {contact.company ? (
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                                        {contact.company}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="h-6"></div>
                                  )}

                                  <h4 className="text-sm font-bold text-gray-900 leading-tight mb-3">
                                    {contact.name}
                                  </h4>

                                  <div className="flex items-center gap-2 mb-4">
                                    <span className={clsx(
                                      "text-lg font-black tracking-tight",
                                      contact.dealValue ? "text-gray-900" : "text-gray-300"
                                    )}>
                                      {contact.dealValue ? formatCurrency(contact.dealValue) : "R$ 0,00"}
                                    </span>
                                  </div>

                                  {(contact.tags && contact.tags.length > 0) && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                      {contact.tags.slice(0, 3).map((tag) => (
                                        <span key={tag} className="px-1.5 py-0.5 rounded-md border border-gray-100 bg-gray-50 text-[10px] font-medium text-gray-500">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between pt-4 border-t border-gray-100/50">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                      <Calendar size={12} />
                                      <span>2d atrás</span>
                                    </div>
                                    <button
                                      onMouseDown={(e) => { e.stopPropagation(); handleChat(contact.id); }}
                                      className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    >
                                      <MessageSquare size={14} strokeWidth={2.5} />
                                    </button>
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
                        className="group flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-gray-400 hover:text-blue-600"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <Plus size={14} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Adicionar</span>
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
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">
                    {modalMode === 'create' ? 'Novo Lead' : 'Editar Deal'}
                  </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Detalhamento</h2>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {modalMode === 'create' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Vincular Contato Existente</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Buscar pessoa ou empresa..."
                      className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                    />
                    {selectedExistingContactId && (
                      <button onClick={() => { setSelectedExistingContactId(null); setForm(emptyForm()); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600"><X size={14} /></button>
                    )}
                  </div>

                  {filteredContacts.length > 0 && (
                    <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                      {filteredContacts.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectContact(c)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between group border-b border-gray-50 last:border-0"
                        >
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{c.name}</div>
                            <div className="text-[10px] text-gray-400">{c.phoneNumber}</div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Vincular</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Cliente</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-900"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa / Org</label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium text-gray-900"
                    placeholder="Ex: Acme Inc"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Whatsapp</label>
                  <input
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-medium text-gray-900 font-mono text-xs"
                    placeholder="+55..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor do Deal</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      value={form.dealValue || ''}
                      onChange={(e) => setForm((f) => ({ ...f, dealValue: Number(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-900"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estágio do Funil</label>
                <div className="grid grid-cols-2 gap-2">
                  {PIPELINE_STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => !preselectedStageId && setForm(f => ({ ...f, pipelineStage: s.id as any }))}
                      disabled={!!preselectedStageId}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border",
                        (preselectedStageId || form.pipelineStage) === s.id
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tags (Separar por vírgula)</label>
                <input
                  value={form.tagsStr}
                  onChange={(e) => setForm((f) => ({ ...f, tagsStr: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-sm"
                  placeholder="Quente, Indicação, ..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas Internas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent rounded-xl h-24 focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-sm resize-none"
                  placeholder="Detalhes importantes sobre a negociação..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-[32px]">
              <button
                onClick={closeModal}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 text-xs uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.phoneNumber.trim()}
                className="px-8 py-3 bg-[#0F172A] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                Confirmar Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
