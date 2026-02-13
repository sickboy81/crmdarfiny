import React, { useState } from 'react';
import { X, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../../stores/useAppStore';
import { Contact } from '../../types';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChatCreated: (chatId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
    const { contacts, addContact } = useAppStore();
    const [countryCode, setCountryCode] = useState('55');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [contactName, setContactName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!phoneNumber.trim()) {
            toast.error('Digite um número de telefone');
            return;
        }

        // Limpa o número (remove caracteres não numéricos)
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const fullPhone = countryCode.replace(/\D/g, '') + cleanPhone;

        if (cleanPhone.length < 10) {
            toast.error('Número de telefone inválido (deve incluir DDD)');
            return;
        }

        // Verifica se já existe um contato com esse número
        let existingContact = contacts.find(c => {
            const cleanContactPhone = c.phoneNumber.replace(/\D/g, '');
            return cleanContactPhone === fullPhone;
        });

        if (existingContact) {
            // Se já existe, apenas abre o chat
            toast.info(`Abrindo conversa com ${existingContact.name}`);
            onChatCreated(existingContact.id);
            onClose();
            setPhoneNumber('');
            setContactName('');
            return;
        }

        // Cria um novo contato
        const newContact: Contact = {
            id: fullPhone,
            name: contactName.trim() || `Contato (${fullPhone})`,
            phoneNumber: fullPhone,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName || fullPhone)}&background=0D8ABC&color=fff`,
            status: 'active',
            tags: ['WhatsApp'],
            lastSeen: 'Nunca',
            pipelineStage: 'new'
        };

        addContact(newContact);
        toast.success(`Contato ${newContact.name} criado!`);
        onChatCreated(newContact.id);
        onClose();
        setPhoneNumber('');
        setContactName('');
    };

    const formatPhoneNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        if (cleaned.length <= 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <MessageSquare className="text-green-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Nova Conversa</h2>
                            <p className="text-sm text-gray-500">Inicie um chat pelo número</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Fechar"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Phone size={16} className="inline mr-1" />
                            Número do WhatsApp *
                        </label>
                        <div className="flex gap-2">
                            <div className="relative w-24">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+</span>
                                <input
                                    type="text"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    className="w-full pl-6 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center font-medium"
                                    placeholder="55"
                                />
                            </div>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                                placeholder="(21) 99999-9999"
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Ex: +55 (21) 99999-9999</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome do Contato (opcional)
                        </label>
                        <input
                            type="text"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Você pode alterar depois</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                        >
                            Iniciar Conversa
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
