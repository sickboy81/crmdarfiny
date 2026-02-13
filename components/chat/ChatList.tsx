import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MoreVertical, Filter, UserPlus, FileText, Settings, Archive, MessageSquare, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useAppStore } from '../../stores/useAppStore';
import { View } from '../../types';
import { NewChatModal } from './NewChatModal';


interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ selectedChatId, onSelectChat }) => {
  const { contacts, messages, setCurrentView, updateContact, markChatReadStatus, deleteContact, deleteChat } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chatId: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContactName, setEditingContactName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check for main menu (MoreVertical)
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }

      // Check for context menu
      if (contextMenuRef.current && contextMenuRef.current.contains(event.target as Node)) {
        return; // Clicked inside context menu, don't close
      }

      setContextMenu(null); // Close context menu on click outside
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Deriva a lista de chats baseada nas mensagens do store
  const chats = useMemo(() => {
    return Object.entries(messages).map(([chatId, msgs]) => {
      const lastMsg = msgs[msgs.length - 1];
      const unread = msgs.filter(m => m.status !== 'read' && m.senderId !== 'me').length;
      const contact = contacts.find(c => c.id === chatId);

      // Assumindo que chatId é o ID do contato para 1:1
      return {
        id: chatId,
        contactId: chatId, // Simplificação: chatId = contactId
        unreadCount: unread,
        lastMessage: lastMsg,
        pinned: contact?.pinned || false,
        archived: contact?.status === 'archived'
      };
    }).sort((a, b) => {
      // 1. Pinned first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // 2. Date last message
      return b.lastMessage?.timestamp.localeCompare(a.lastMessage?.timestamp || '') || 0;
    });
  }, [messages, contacts]);

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      const contact = contacts.find((c) => c.id === chat.contactId);
      if (!contact) return false;

      // Filter logic
      if (activeFilter === 'archived') {
        if (contact.status !== 'archived') return false;
      } else {
        // Hide archived and blocked from normal views
        if (contact.status === 'archived' || contact.status === 'blocked') return false;
        if (activeFilter === 'unread' && chat.unreadCount === 0) return false;
      }

      const searchLower = searchQuery.toLowerCase();
      const matchesName = contact.name.toLowerCase().includes(searchLower);
      const matchesMessage = chat.lastMessage?.content.toLowerCase().includes(searchLower);
      const matchesPhone = contact.phoneNumber.includes(searchQuery);

      return matchesName || matchesMessage || matchesPhone;
    });
  }, [chats, contacts, searchQuery, activeFilter]);

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId });
  };

  const handleAction = (action: 'pin' | 'archive' | 'read' | 'delete' | 'block') => {
    if (!contextMenu) return;
    const chat = chats.find(c => c.id === contextMenu.chatId);
    if (!chat) return;

    const contact = contacts.find(c => c.id === chat.contactId);
    if (!contact) return;

    switch (action) {
      case 'pin':
        updateContact(contact.id, { pinned: !contact.pinned });
        toast.success(contact.pinned ? 'Conversa desafixada' : 'Conversa fixada');
        break;
      case 'archive':
        const newStatus = contact.status === 'archived' ? 'active' : 'archived';
        updateContact(contact.id, { status: newStatus });
        toast.success(newStatus === 'archived' ? 'Conversa arquivada' : 'Conversa desarquivada');
        break;
      case 'read':
        const isCurrentlyUnread = chat.unreadCount > 0;
        markChatReadStatus(chat.id, isCurrentlyUnread); // Toggle: if unread, mark read. If read, mark unread.
        toast.success(isCurrentlyUnread ? 'Marcada como lida' : 'Marcada como não lida');
        break;
      case 'delete':
        if (confirm(`Tem certeza que deseja excluir a conversa com ${contact.name}? Esta ação não pode ser desfeita.`)) {
          deleteChat(chat.id);
          toast.success(`Conversa com ${contact.name} excluída`);
        }
        break;
      case 'block':
        const isBlocked = contact.status === 'blocked';
        updateContact(contact.id, { status: isBlocked ? 'active' : 'blocked' });
        toast.success(isBlocked ? `${contact.name} desbloqueado` : `${contact.name} bloqueado`);
        break;
    }
    setContextMenu(null);
  };

  return (
    <div
      className={clsx(
        'w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col h-full bg-white relative',
        selectedChatId ? 'hidden md:flex' : 'flex'
      )}
    >
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Mensagens</h2>
          <div className="flex gap-2 relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={clsx(
                "p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors",
                isMenuOpen && "bg-gray-200 text-gray-800"
              )}
              title="Mais opções"
            >
              <MoreVertical size={20} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => { setShowNewChatModal(true); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 font-medium"
                >
                  <MessageSquare size={16} />
                  Nova Conversa
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={() => { setCurrentView(View.CONTACTS); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  Novo Contato
                </button>
                <button
                  onClick={() => { setCurrentView(View.PIPELINE); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText size={16} />
                  Ver Pipeline
                </button>
                <button
                  onClick={() => { setCurrentView(View.SETTINGS); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings size={16} />
                  Configurações
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'unread', label: 'Não lidas' },
            { id: 'archived', label: 'Arquivadas' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeFilter === filter.id
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            title="Buscar conversas"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400 group-focus-within:text-green-500 transition-colors" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar" onContextMenu={(e) => e.preventDefault()}>
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm p-4 text-center">
            <Search size={40} className="mb-2 opacity-20" />
            <p>Nenhuma conversa encontrada.</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const chatContact = contacts.find((c) => c.id === chat.contactId);
            if (!chatContact) return null;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                onContextMenu={(e) => handleContextMenu(e, chat.id)}
                className={clsx(
                  'flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all relative group',
                  selectedChatId === chat.id
                    ? 'bg-green-50 hover:bg-green-50'
                    : ''
                )}
              >
                {selectedChatId === chat.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                )}

                <div className="relative shrink-0">
                  <img
                    src={chatContact.avatar}
                    alt={chatContact.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-100"
                  />
                  <div className={clsx(
                    "absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full",
                    chatContact.status === 'active' ? "bg-green-500" : "bg-gray-300"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    {editingContactId === chatContact.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={editingContactName}
                          onChange={(e) => setEditingContactName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateContact(chatContact.id, { name: editingContactName });
                              setEditingContactId(null);
                              toast.success('Nome atualizado!');
                            } else if (e.key === 'Escape') {
                              setEditingContactId(null);
                            }
                          }}
                          onBlur={() => {
                            if (editingContactName.trim()) {
                              updateContact(chatContact.id, { name: editingContactName });
                              toast.success('Nome atualizado!');
                            }
                            setEditingContactId(null);
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-green-500 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            updateContact(chatContact.id, { name: editingContactName });
                            setEditingContactId(null);
                            toast.success('Nome atualizado!');
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Salvar"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingContactId(null)}
                          className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <h3
                        className="font-semibold text-gray-900 truncate text-[15px] flex items-center gap-1 cursor-pointer hover:text-green-600 transition-colors"
                        onDoubleClick={() => {
                          setEditingContactId(chatContact.id);
                          setEditingContactName(chatContact.name);
                        }}
                        title="Clique duas vezes para editar"
                      >
                        {chatContact.name}
                        {chat.pinned && (
                          <span className="text-gray-400 rotate-45">📌</span>
                        )}
                      </h3>
                    )}
                    <span className="text-[11px] text-gray-400 font-medium">
                      {chat.lastMessage.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate pr-2">
                      {/* Icone de arquivo se arquivado */}
                      {chatContact.status === 'archived' && <Archive size={12} className="inline mr-1 text-gray-400" />}
                      {chat.lastMessage.senderId === 'me' ? 'Você: ' : ''}
                      {chat.lastMessage.content}
                    </p>
                    {chat.unreadCount > 0 && (
                      <div className="bg-green-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (() => {
        const chat = chats.find(c => c.id === contextMenu.chatId);
        const contact = contacts.find(c => c.id === chat?.contactId);
        if (!chat || !contact) return null;

        return (
          <div
            ref={contextMenuRef}
            className="fixed bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[100] min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              onMouseDown={(e) => { e.stopPropagation(); handleAction('pin'); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="text-gray-500">{contact.pinned ? 'Desafixar' : 'Fixar conversa'}</span>
            </button>
            <button
              onMouseDown={(e) => { e.stopPropagation(); handleAction('archive'); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Archive size={16} />
              <span>{contact.status === 'archived' ? 'Desarquivar' : 'Arquivar conversa'}</span>
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onMouseDown={(e) => { e.stopPropagation(); handleAction('read'); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span>{chat.unreadCount > 0 ? 'Marcar como lida' : 'Marcar como não lida'}</span>
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onMouseDown={(e) => { e.stopPropagation(); handleAction('block'); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span>{contact.status === 'blocked' ? '🔓 Desbloquear contato' : '🚫 Bloquear contato'}</span>
            </button>
            <button
              onMouseDown={(e) => { e.stopPropagation(); handleAction('delete'); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <span>🗑️ Excluir conversa</span>
            </button>
          </div>
        );
      })()}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={(chatId) => {
          onSelectChat(chatId);
          setShowNewChatModal(false);
        }}
      />
    </div>
  );
};
