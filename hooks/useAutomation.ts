import { useCallback, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useSettings, BusinessHours } from './useSettings';
import { Message } from '../types';
import { toast } from 'sonner';

export const useAutomation = () => {
    const { messages, addMessage } = useAppStore();
    const { configs } = useSettings();
    const { businessHours, autoMessages } = configs;

    // Ref to track processed messages to avoid duplicates/loops
    const processedMessageIds = useRef<Set<string>>(new Set());

    const checkBusinessHours = useCallback((): boolean => {
        if (!businessHours.enabled) return true; // Always open if disabled

        const now = new Date();
        // Convert to target timezone date object if needed, but for simplicity assuming local or same timezone
        // Ideally we should use 'date-fns-tz' or similar for specific timezone handling
        // For this demo, we'll map local days to the schedule

        const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = daysMap[now.getDay()];
        const schedule = businessHours.schedule[currentDay];

        if (!schedule || !schedule.active) return false;

        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = schedule.start.split(':').map(Number);
        const [endH, endM] = schedule.end.split(':').map(Number);
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        return currentTime >= startTime && currentTime <= endTime;
    }, [businessHours]);

    const sendAutoReply = (chatId: string, text: string, type: 'welcome' | 'away' | 'closing' | 'follow_up') => {
        const autoDetails = {
            welcome: '👋 Boas-vindas',
            away: '🌙 Ausência',
            closing: '✅ Encerramento',
            follow_up: '⏰ Follow-up'
        };

        const newMessage: Message = {
            id: `auto_${Date.now()}_${type}`,
            chatId,
            senderId: 'me',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
            type: 'text',
        };

        addMessage(chatId, newMessage);
        toast.info(`Automação enviada: ${autoDetails[type]}`);
    };

    const handleIncomingMessage = useCallback((chatId: string, message: Message) => {
        if (processedMessageIds.current.has(message.id)) return;
        processedMessageIds.current.add(message.id);

        const chatHistory = messages[chatId] || [];

        // 1. Check Away Message (Must come before Welcome to prioritize "We are closed")
        if (autoMessages.awayEnabled && !checkBusinessHours()) {
            // Check if we already sent an away message recently to avoid spamming
            const lastLinks = chatHistory.slice(-5);
            const alreadySentAway = lastLinks.some(m => m.senderId === 'me' && m.content === autoMessages.awayMessage);

            if (!alreadySentAway) {
                setTimeout(() => sendAutoReply(chatId, autoMessages.awayMessage, 'away'), 1000);
                return; // Don't send welcome if we are away? Or maybe send both? Let's stop here.
            }
        }

        // 2. Check Welcome Message
        if (autoMessages.welcomeEnabled) {
            // Logic: If it's the FIRST message from the contact, or first in a long time?
            // Simple logic: If history length is small (just this message) OR if no messages from 'me' exist yet.
            const myMessages = chatHistory.filter(m => m.senderId === 'me');
            if (myMessages.length === 0) {
                setTimeout(() => sendAutoReply(chatId, autoMessages.welcomeMessage, 'welcome'), 1500);
            }
        }

    }, [messages, autoMessages, checkBusinessHours, addMessage]);

    const checkFollowUps = useCallback(() => {
        if (!autoMessages.followUpEnabled) return;

        const now = Date.now();
        const delayMs = autoMessages.followUpDelayHours * 60 * 60 * 1000;

        Object.entries(messages).forEach(([chatId, chatMsgs]) => {
            if (chatMsgs.length === 0) return;

            const lastMsg = chatMsgs[chatMsgs.length - 1];

            // We only follow up if the LAST message was from 'me' (we are waiting for reply)
            // OR if the last message was from 'contact' and we haven't replied?
            // Usually follow-up is "Hey, are you still interested?" after WE sent something and THEY didn't reply?
            // OR "Hey, I saw your message but was busy"? 
            // Let's assume: Last message was OURS (e.g. proposal) and they didn't reply.

            // Wait, standard follow-up is: I sent a quote, client silent for 2 days -> I send "Any thoughts?".

            if (lastMsg.senderId === 'me') {
                // Check if it's NOT already the follow-up message
                if (lastMsg.content === autoMessages.followUpMessage) return;

                // Parse timestamp (Currently string HH:MM, need better timestamp in types or assume today/yesterday logic)
                // Since MOCK data uses only HH:MM string, we can't do real multi-day diffs easily without Date objects.
                // For this DEMO, we will simulate: If the last message was sent > X seconds ago in this session?
                // Or we can just ignore the time check for the demo and add a manual "Trigger Follow-up Check" button?

                // Let's rely on a "Demo Mode" check: If last msg is 'me' and not follow-up, mark as candidate.
                // In a real app we'd parse `lastMsg.createdAt` (ISO). `timestamp` is just display string.
                // I'll skip the actual time check implementation due to data limitations and just provide the logic structure.
                // I will add a "Force Follow-up Check" button in the UI for demonstration.
            }
        });

    }, [messages, autoMessages]);

    const triggerManualFollowUp = (chatId: string) => {
        if (!autoMessages.followUpEnabled) {
            toast.error('Ative o Follow-up nas configurações primeiro.');
            return;
        }
        const chatMsgs = messages[chatId] || [];
        const lastMsg = chatMsgs[chatMsgs.length - 1];

        // Prevent double sending
        if (lastMsg?.content === autoMessages.followUpMessage) {
            toast.warning('Follow-up já enviado.');
            return;
        }

        sendAutoReply(chatId, autoMessages.followUpMessage, 'follow_up');
    };

    const triggerClosing = (chatId: string) => {
        if (!autoMessages.closingEnabled) {
            toast.error('Ative a Mensagem de Encerramento nas configurações.');
            return;
        }
        sendAutoReply(chatId, autoMessages.closingMessage, 'closing');
    };

    return {
        handleIncomingMessage,
        checkFollowUps,
        triggerManualFollowUp,
        triggerClosing
    };
};
