import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../stores/useAppStore';
import { Message, Contact } from '../types';
import { toast } from 'sonner';

export const useWhatsAppSocket = () => {
    const { addMessage, addContact, contacts, messages, updateMessageStatus } = useAppStore();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Conecta apenas uma vez
        if (socketRef.current) return;

        console.log('🔌 Iniciando conexão Socket.IO com servidor WhatsApp...');
        const socket = io('http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ Conectado ao servidor de espelhamento WhatsApp');
        });

        socket.on('disconnect', () => {
            console.log('❌ Desconectado do servidor WhatsApp');
        });

        socket.on('message', (payload) => {
            console.log('📩 MENSAGEM RECEBIDA DO SERVIDOR:', payload);

            const phone = payload.from.split('@')[0];
            console.log('📱 Número extraído:', phone);

            // Busca o contato atual (sempre pega o estado mais recente)
            const currentContacts = useAppStore.getState().contacts;
            let contact = currentContacts.find(c => {
                const cleanContactPhone = c.phoneNumber.replace(/\D/g, '');
                const cleanIncomingPhone = phone.replace(/\D/g, '');
                return cleanContactPhone.includes(cleanIncomingPhone) || cleanIncomingPhone.includes(cleanContactPhone);
            });

            // Se não encontrar o contato, CRIA UM NOVO com as informações reais do WhatsApp
            if (!contact) {
                console.log('👤 Criando novo contato para:', phone);
                const realName = payload.contactName || `Novo Contato (${phone})`;
                const realAvatar = payload.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=0D8ABC&color=fff`;

                const newContact: Contact = {
                    id: phone,
                    name: realName,
                    phoneNumber: phone,
                    avatar: realAvatar,
                    status: 'active',
                    tags: ['WhatsApp'],
                    lastSeen: 'Agora',
                    pipelineStage: 'new'
                };
                useAppStore.getState().addContact(newContact);
                contact = newContact;
            } else {
                // Se o contato já existe, atualiza o nome e foto se vieram do WhatsApp
                if (payload.contactName && contact.name.startsWith('Novo Contato')) {
                    useAppStore.getState().updateContact(contact.id, {
                        name: payload.contactName,
                        avatar: payload.profilePicUrl || contact.avatar
                    });
                    contact = { ...contact, name: payload.contactName };
                }
            }

            const chatId = contact.id;
            const senderName = contact.name;

            console.log('🆔 Usando chatId:', chatId, '| Nome:', senderName);

            const mappedMessage: Message = {
                id: `msg-${Date.now()}-${Math.random()}`,
                chatId: chatId,
                senderId: chatId,
                content: payload.text,
                timestamp: new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'read',
                type: 'text'
            };

            console.log('💾 Adicionando mensagem ao chat:', chatId, mappedMessage);
            console.log('📊 Estado atual de contatos:', useAppStore.getState().contacts.length);
            console.log('📊 Estado atual de mensagens:', Object.keys(useAppStore.getState().messages).length);

            useAppStore.getState().addMessage(chatId, mappedMessage);

            console.log('✅ Mensagem adicionada! Novo estado:', {
                contacts: useAppStore.getState().contacts.length,
                messages: Object.keys(useAppStore.getState().messages).length,
                messagesInThisChat: useAppStore.getState().messages[chatId]?.length || 0
            });

            toast.info(`Nova mensagem de ${senderName}`, {
                description: payload.text.substring(0, 50) + (payload.text.length > 50 ? '...' : '')
            });
        });

        // Confirmação de mensagem enviada pelo CRM
        socket.on('message_sent', (payload) => {
            console.log('✅ Confirmação de envio recebida:', payload);

            const phone = payload.to.split('@')[0];
            const currentContacts = useAppStore.getState().contacts;
            const contact = currentContacts.find(c => {
                const cleanContactPhone = c.phoneNumber.replace(/\D/g, '');
                const cleanIncomingPhone = phone.replace(/\D/g, '');
                return cleanContactPhone.includes(cleanIncomingPhone) || cleanIncomingPhone.includes(cleanContactPhone);
            });

            const chatId = contact ? contact.id : phone;

            // Encontra a última mensagem enviada por mim
            const currentMessages = useAppStore.getState().messages;
            const chatMessages = currentMessages[chatId] || [];
            const lastMeMessage = [...chatMessages].reverse().find(m => m.senderId === 'me' && m.status === 'sent');

            if (lastMeMessage) {
                useAppStore.getState().updateMessageStatus(chatId, lastMeMessage.id, 'delivered');
            }
        });

        return () => {
            console.log('🔌 Desconectando Socket.IO...');
            socket.disconnect();
            socketRef.current = null;
        };
    }, []); // Array vazio - conecta apenas uma vez!
};
