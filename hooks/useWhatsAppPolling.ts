import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';
import { useAutomation } from './useAutomation';
import { toast } from 'sonner';
import { Message } from '../types';

export const useWhatsAppPolling = () => {
    const { addMessage } = useAppStore();
    const automation = useAutomation();

    useEffect(() => {
        // Listen to new messages in Supabase
        const channel = supabase
            .channel('messages_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const newMessage = payload.new as any;

                    // console.log('New Message from DB:', newMessage);

                    const mappedMessage: Message = {
                        id: newMessage.id || Date.now().toString(),
                        chatId: newMessage.contact_id || 'unknown',
                        senderId: newMessage.sender === 'user' ? 'me' : (newMessage.contact_id || 'unknown'),
                        content: newMessage.text || '',
                        timestamp: new Date(newMessage.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: newMessage.status || 'read', // Incoming is read? Or delivered?
                        type: (newMessage.type as any) || 'text'
                    };

                    // Only process incoming messages (from contact)
                    if (mappedMessage.senderId !== 'me') {
                        addMessage(mappedMessage.chatId, mappedMessage);
                        toast.info(`Nova mensagem de ${mappedMessage.senderId}`);

                        // Trigger Automation
                        automation.handleIncomingMessage(mappedMessage.chatId, mappedMessage);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [addMessage, automation]); // removed 'messages' dependency to avoid re-subscription loop
};
