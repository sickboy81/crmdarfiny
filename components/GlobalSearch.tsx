import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, MessageSquare, User, Home, ArrowRight, X } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../stores/useAppStore';
import { View } from '../types';

export const GlobalSearch: React.FC = () => {
    const {
        contacts,
        messages,
        campaigns,
        setCurrentView,
        setSelectedContactId,
        settings,
        isSearchOpen: open,
        setIsSearchOpen: setOpen,
        toggleSearch
    } = useAppStore();
    const isPrivacyMode = settings.crm_preferences?.blurSensitive;

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
                e.preventDefault();
                toggleSearch();
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleSelectContact = (contactId: string) => {
        setCurrentView(View.INBOX);
        setSelectedContactId(contactId);
        setOpen(false);
    };

    const handleSelectCampaign = (campaignId: string) => {
        // Future: Navigate to specific campaign
        setCurrentView(View.CAMPAIGNS);
        setOpen(false);
    }

    // Properties are currently in a separate store or hardcoded in MOCK, 
    // but for now we search contacts and messages which are the core based on useAppStore.
    // Ideally we should have a usePropertyStore or similar.
    // For this implementation, I will focus on Contacts and recent Messages.

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Busca Global"
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
            }}
        >
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 relative">
                <div className="flex items-center border-b border-gray-100 px-4 py-3 g-2">
                    <Search className="w-5 h-5 text-gray-400 mr-2" />
                    <Command.Input
                        placeholder="Busque por contatos, mensagens ou ações..."
                        className="w-full text-base outline-none text-gray-700 placeholder:text-gray-400"
                    />
                    <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <Command.List className="max-h-[60vh] overflow-y-auto p-2 scroll-py-2 custom-scrollbar">
                    <Command.Empty className="py-6 text-center text-sm text-gray-500">
                        Nenhum resultado encontrado.
                    </Command.Empty>

                    <Command.Group heading="Contatos" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                        {contacts.map((contact) => (
                            <Command.Item
                                key={contact.id}
                                onSelect={() => handleSelectContact(contact.id)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                    <img src={contact.avatar} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <div className={clsx("font-medium flex items-center gap-2", isPrivacyMode && "privacy-blur")}>
                                        {contact.name}
                                        {contact.tags.map(tag => (
                                            <span key={tag} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-normal lowercase">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className={clsx("text-xs text-gray-400", isPrivacyMode && "privacy-blur")}>{contact.phoneNumber}</div>
                                </div>
                                <ArrowRight size={16} className="text-gray-300 opacity-0 group-aria-selected:opacity-100" />
                            </Command.Item>
                        ))}
                    </Command.Group>

                    <Command.Group heading="Ações Rápidas" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-2">
                        <Command.Item
                            onSelect={() => { setCurrentView(View.CONTACTS); setOpen(false); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                <User size={18} />
                            </div>
                            <span>Novo Contato</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => { setCurrentView(View.PROPERTIES); setOpen(false); }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                <Home size={18} />
                            </div>
                            <span>Ver Imóveis</span>
                        </Command.Item>
                    </Command.Group>

                    {/* Future: Add Message Search here recursively over all messages if performance allows, 
               or use a specialized search service */}
                </Command.List>

                <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5 shadow-sm font-mono">↑↓</kbd> navegar</span>
                        <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5 shadow-sm font-mono">↵</kbd> selecionar</span>
                    </div>
                    <span>Global Search</span>
                </div>
            </div>
        </Command.Dialog>
    );
};
