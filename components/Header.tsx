import React, { useState } from 'react';
import { Bell, Search, User, LogOut, Settings, Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useSettings } from '../hooks/useSettings';
import { View, Notification } from '../types';
import clsx from 'clsx';

export const Header: React.FC = () => {
    const { currentView, notifications, markNotificationAsRead, clearNotifications, setCurrentView } = useAppStore();
    const { configs } = useSettings();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getViewTitle = () => {
        switch (currentView) {
            case View.DASHBOARD: return 'Dashboard';
            case View.INBOX: return 'WhatsApp';
            case View.CONTACTS: return 'Contatos';
            case View.CAMPAIGNS: return 'Campanhas';
            case View.PIPELINE: return 'Pipeline de Vendas';
            case View.DOCUMENTS: return 'Documentos';
            case View.AUTOPOST_FB: return 'Facebook Post';
            case View.SETTINGS: return 'Configurações';
            case View.UNIPDF: return 'UniPDF Organizador';
            case View.PROPERTIES: return 'Imóveis';
            case View.EXTRACTOR: return 'Extrator IA';
            case View.LEAD_HUB: return 'Central de Leads';
            case View.EMAIL_MANAGER: return 'E-mail Manager';
            case View.IMAGE_MANAGER: return 'Image Manager';
            default: return 'CRM Whatsapp';
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-green-500" size={18} />;
            case 'warning': return <AlertTriangle className="text-yellow-500" size={18} />;
            case 'error': return <XCircle className="text-red-500" size={18} />;
            default: return <Info className="text-blue-500" size={18} />;
        }
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 shrink-0">
            <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 font-medium">Darfiny CRM</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 font-bold tracking-tight">{getViewTitle()}</span>
            </div>

            <div className="flex items-center gap-4">
                {/* Search Bar Trigger */}
                <div
                    onClick={() => useAppStore.getState().setIsSearchOpen(true)}
                    className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 gap-2 w-64 border border-transparent hover:border-green-500 cursor-pointer transition-all"
                >
                    <Search size={18} className="text-gray-400" />
                    <span className="text-gray-400 text-sm select-none">Buscar... (Ctrl+K)</span>
                </div>

                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={clsx(
                            "p-2 rounded-full transition-colors relative",
                            isNotificationsOpen ? "bg-gray-100 text-green-600" : "text-gray-500 hover:bg-gray-100"
                        )}
                        title="Notificações"
                    >
                        <Bell size={22} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {isNotificationsOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsNotificationsOpen(false)}
                            />
                            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="font-bold text-gray-800">Notificações</h3>
                                    <button
                                        onClick={clearNotifications}
                                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                                    >
                                        Limpar Tudo
                                    </button>
                                </div>
                                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Bell size={40} className="mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm text-gray-400">Nenhuma notificação por aqui.</p>
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div
                                                key={n.id}
                                                onClick={() => {
                                                    markNotificationAsRead(n.id);
                                                    if (n.link) {
                                                        // Handle link navigation if needed
                                                    }
                                                }}
                                                className={clsx(
                                                    "p-4 border-b border-gray-50 cursor-pointer transition-colors flex gap-3",
                                                    n.read ? "bg-white" : "bg-green-50/30"
                                                )}
                                            >
                                                <div className="mt-0.5 shrink-0">
                                                    {getIcon(n.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={clsx("text-sm mb-0.5", n.read ? "text-gray-700 font-medium" : "text-gray-900 font-bold")}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">{n.timestamp}</p>
                                                </div>
                                                {!n.read && (
                                                    <div className="w-2 h-2 bg-green-500 rounded-full self-center" />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                                {notifications.length > 0 && (
                                    <div className="p-3 text-center border-t border-gray-100">
                                        <button className="text-xs font-semibold text-green-600 hover:text-green-700">Ver Todas</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-gray-200 mx-1" />

                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-800">{configs.userProfile.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{configs.userProfile.role}</p>
                    </div>
                    <button
                        onClick={() => setCurrentView(View.SETTINGS)}
                        className="w-10 h-10 rounded-full border-2 border-green-100 overflow-hidden hover:border-green-500 transition-all shadow-sm"
                        title="Perfil"
                    >
                        <img
                            src={configs.userProfile.photoUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </button>
                </div>
            </div>
        </header>
    );
};
