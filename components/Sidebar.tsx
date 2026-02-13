import React, { useMemo } from 'react';
import { View } from '../types';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Zap,
  Megaphone,
  KanbanSquare,
  FileText,
  Share2,
  FileStack,
  Building2,
} from 'lucide-react';
import clsx from 'clsx';

import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { messages, contacts } = useAppStore();

  const totalUnreadCount = useMemo(() => {
    return Object.entries(messages).reduce((acc, [chatId, msgs]) => {
      // Find the unread messages for this specific chat
      // Only count if contact is not archived or blocked (optional, keeping it simple for now)
      const contact = contacts.find(c => c.id === chatId);
      if (contact?.status === 'blocked' || contact?.status === 'archived') return acc;

      const unreadCount = msgs.filter(m => m.status !== 'read' && m.senderId !== 'me').length;
      return acc + unreadCount;
    }, 0);
  }, [messages, contacts]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
    }
  };

  const navItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.PIPELINE, label: 'Pipeline', icon: KanbanSquare },
    { id: View.PROPERTIES, label: 'Imóveis', icon: Building2 },
    { id: View.INBOX, label: 'Inbox', icon: MessageSquare, badge: totalUnreadCount },
    { id: View.CONTACTS, label: 'Contatos', icon: Users },
    { id: View.CAMPAIGNS, label: 'Campanhas', icon: Megaphone },
    { id: View.DOCUMENTS, label: 'Documentos', icon: FileText },
    { id: View.EXTRACTOR, label: 'Extrator', icon: Users },
    { id: View.UNIPDF, label: 'UniPDF', icon: FileStack },
    { id: View.AUTOPOST_FB, label: 'Auto Post', icon: Share2 },
    { id: View.SETTINGS, label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800 transition-all duration-300">
      <div className="p-4 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-800 h-16">
        <div className="bg-green-500 p-2 rounded-lg">
          <Zap size={24} className="text-white" fill="currentColor" />
        </div>
        <span className="font-bold text-xl hidden lg:block tracking-tight">Zapr CRM</span>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon
                size={22}
                className={clsx(isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')}
              />
              <span className="hidden lg:block font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="hidden lg:flex ml-auto bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-slate-900 shadow-lg">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 w-full transition-colors"
        >
          <LogOut size={22} />
          <span className="hidden lg:block font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
};
