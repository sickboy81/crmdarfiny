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
  Target,
  Mail,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  Globe
} from 'lucide-react';
import clsx from 'clsx';

import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';
import { useSettings } from '../hooks/useSettings';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

interface NavGroup {
  label: string;
  items: {
    id: View;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { messages, contacts, waConnectionStatus } = useAppStore();
  const { configs } = useSettings();

  const totalUnreadCount = useMemo(() => {
    return Object.entries(messages).reduce((acc, [chatId, msgs]) => {
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

  const menuGroups: NavGroup[] = [
    {
      label: 'Operacional',
      items: [
        { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
        { id: View.PIPELINE, label: 'Pipeline', icon: KanbanSquare },
        { id: View.INBOX, label: 'WhatsApp', icon: MessageSquare, badge: totalUnreadCount },
        { id: View.CONTACTS, label: 'Contatos', icon: Users },
      ]
    },
    {
      label: 'Vendas & Leads',
      items: [
        { id: View.LEAD_HUB, label: 'Central de Leads', icon: Target },
        { id: View.CAMPAIGNS, label: 'Campanhas', icon: Megaphone },
        { id: View.PROPERTIES, label: 'Imóveis', icon: Building2 },
      ]
    },
    {
      label: 'Inteligência e Marketing',
      items: [
        { id: View.EXTRACTOR, label: 'Extrator IA', icon: Zap },
        { id: View.AUTOPOST_FB, label: 'Auto Post', icon: Share2 },
        { id: View.SOCIAL_POSTS, label: 'Marketing Social', icon: Sparkles },
        { id: View.LINK_BIO, label: 'Bio & SEO', icon: Globe },
      ]
    },
    {
      label: 'Arquivos e Utilitários',
      items: [
        { id: View.DOCUMENTS, label: 'Documentos', icon: FileText },
        { id: View.EMAIL_MANAGER, label: 'E-mail Manager', icon: Mail },
        { id: View.IMAGE_MANAGER, label: 'Banco de Imagens', icon: ImageIcon },
        { id: View.UNIPDF, label: 'UniPDF', icon: FileStack },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { id: View.SETTINGS, label: 'Configurações', icon: Settings },
      ]
    }
  ];

  return (
    <div className="w-20 lg:w-72 bg-slate-950 text-white flex flex-col h-full border-r border-slate-800/50 transition-all duration-500 ease-in-out relative z-40 shadow-2xl">
      <div className="p-6 flex items-center justify-between gap-3 h-20 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 p-2.5 rounded-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-transform cursor-pointer" onClick={() => onChangeView(View.DASHBOARD)}>
            <Zap size={24} className="text-white" fill="currentColor" />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="font-black text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Darfiny CRM</span>
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest leading-none">Powered by AI</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded-full border border-slate-800">
          <div className={clsx(
            "w-2 h-2 rounded-full shadow-[0_0_8px]",
            waConnectionStatus === 'connected' ? "bg-green-500 shadow-green-500/50" :
              waConnectionStatus === 'connecting' ? "bg-blue-500 animate-pulse shadow-blue-500/50" :
                "bg-red-500 shadow-red-500/50"
          )} />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">WA</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8 custom-scrollbar scroll-smooth">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="hidden lg:block px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChangeView(item.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 lg:px-4 rounded-2xl transition-all duration-300 group relative overflow-hidden',
                      isActive
                        ? 'bg-gradient-to-r from-green-600/90 to-green-500 text-white shadow-xl shadow-green-900/20'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    )}
                  >
                    <div className={clsx(
                      "transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-green-400"
                    )}>
                      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </div>

                    <span className="hidden lg:block font-bold text-sm tracking-tight flex-1 text-left">
                      {item.label}
                    </span>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={clsx(
                        "absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 lg:ml-auto w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full ring-2 ring-slate-950 shadow-lg transition-colors",
                        isActive ? "bg-white text-green-600" : "bg-green-500 text-white"
                      )}>
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                      <div className="hidden lg:block">
                        <ChevronRight size={14} className="text-white/50" />
                      </div>
                    )}

                    {!isActive && (
                      <div className="absolute left-0 w-1 h-0 bg-green-500 transition-all duration-300 group-hover:h-6 rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer Section */}
      <div className="p-4 border-t border-slate-900 bg-slate-900/40">
        <div className="hidden lg:flex items-center gap-3 p-3 mb-3 bg-slate-950/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-all group">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800 group-hover:border-green-500 transition-colors">
            <img src={configs.userProfile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{configs.userProfile.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase truncate tracking-tighter italic">{configs.userProfile.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center lg:justify-start gap-4 p-4 rounded-2xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 w-full transition-all duration-300 active:scale-95 group"
          title="Sair do Sistema"
        >
          <LogOut size={22} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden lg:block font-bold text-sm">Encerrar Sessão</span>
        </button>
      </div>
    </div>
  );
};
