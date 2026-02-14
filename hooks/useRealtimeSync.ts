import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';
import { useRealEstateStore } from '../stores/useRealEstateStore';
import { supabaseService } from '../services/supabaseService';
import { Contact, Message, Property, Campaign } from '../types';

export const useRealtimeSync = () => {
    const {
        user,
        setContacts,
        setMessages,
        setCampaigns,
        addNotification
    } = useAppStore();
    const { setProperties } = useRealEstateStore();

    useEffect(() => {
        if (!user) return;

        // --- Contacts Sync ---
        const contactsChannel = supabase
            .channel('public:contacts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'contacts' },
                async (payload) => {
                    console.log('Realtime Contact change:', payload);
                    const updatedContacts = await supabaseService.fetchContacts();
                    setContacts(updatedContacts);

                    if (payload.eventType === 'INSERT') {
                        const newContact = payload.new as any;
                        addNotification({
                            id: `notif-${Date.now()}`,
                            title: 'Novo Lead Recebido',
                            message: `${newContact.name} entrou no sistema via ${newContact.source || 'WhatsApp'}.`,
                            timestamp: new Date().toLocaleTimeString(),
                            type: 'info',
                            read: false,
                            category: 'leads'
                        });
                    }
                }
            )
            .subscribe();

        // --- Messages Sync ---
        const messagesChannel = supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    console.log('Realtime Message received:', payload);
                    const dbMessages = await supabaseService.fetchMessages();
                    setMessages(dbMessages);

                    const msg = payload.new as any;
                    if (msg.sender === 'contact') {
                        addNotification({
                            id: `msg-${Date.now()}`,
                            title: 'Nova Mensagem',
                            message: msg.text ? (msg.text.length > 30 ? msg.text.substring(0, 30) + '...' : msg.text) : 'Recebeu um arquivo.',
                            timestamp: new Date().toLocaleTimeString(),
                            type: 'info',
                            read: false,
                            category: 'wa'
                        });
                    }
                }
            )
            .subscribe();

        // --- Properties Sync ---
        const propertiesChannel = supabase
            .channel('public:properties')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'properties' },
                async () => {
                    const updatedProps = await supabaseService.fetchProperties();
                    setProperties(updatedProps);
                }
            )
            .subscribe();

        // --- Settings Sync ---
        const settingsChannel = supabase
            .channel(`public:settings:user_id=eq.${user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'settings', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log('Realtime Settings update:', payload);
                    const { setSettings } = useAppStore.getState();
                    setSettings(payload.new.data);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(contactsChannel);
            supabase.removeChannel(messagesChannel);
            supabase.removeChannel(propertiesChannel);
            supabase.removeChannel(settingsChannel);
        };
    }, [user, setContacts, setMessages, setCampaigns, setProperties, addNotification]);
};
