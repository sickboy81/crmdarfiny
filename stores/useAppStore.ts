import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, Message, View, Campaign } from '../types';
import { MOCK_CONTACTS, MOCK_MESSAGES } from '../constants';
import { User, Session } from '@supabase/supabase-js';

interface AppState {
  currentView: View;
  contacts: Contact[];
  messages: Record<string, Message[]>;
  campaigns?: Campaign[];
  selectedContactId: string | null;
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  settings: {
    leadCapture?: {
      themeColor: string;
      welcomeMessage: string;
      phoneNumber: string;
      position: 'right' | 'left';
      showLabel: boolean;
      labelText: string;
      qrLabelTop: string;
      qrTitle: string;
      qrTagline: string;
    }
    [key: string]: any;
  };

  setCurrentView: (view: View) => void;
  setContacts: (contacts: Contact[]) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  addContact: (contact: Contact) => void;
  addMessage: (chatId: string, message: Message) => void;
  setSelectedContactId: (id: string | null) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  setCampaigns: (campaigns: Campaign[]) => void;
  setMessages: (messages: Record<string, Message[]>) => void;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setSettings: (settings: any) => void;
  updateSettings: (updates: any) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: 'sent' | 'delivered' | 'read' | 'failed') => void;
  deleteContact: (id: string) => void;
  deleteChat: (chatId: string) => void;
  markChatReadStatus: (chatId: string, isRead: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: View.INBOX,
      contacts: MOCK_CONTACTS,
      messages: MOCK_MESSAGES,
      campaigns: [],
      selectedContactId: null,
      user: null,
      session: null,
      isAdmin: false,
      settings: {
        leadCapture: {
          themeColor: '#25D366',
          welcomeMessage: 'Olá! Gostaria de mais informações sobre este imóvel.',
          phoneNumber: '',
          position: 'right',
          showLabel: true,
          labelText: 'Falar com corretor',
          qrLabelTop: 'Escaneie para falar no',
          qrTitle: 'WHATSAPP',
          qrTagline: 'Zapr CRM · Automação Inteligente',
        }
      },

      setCurrentView: (view) => set({ currentView: view }),

      setSelectedContactId: (id) => set({ selectedContactId: id }),

      setContacts: (contacts) => set({ contacts }),

      updateContact: (id, updates) =>
        set((state) => ({
          contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      addContact: (contact) =>
        set((state) => ({
          contacts: [...state.contacts, contact],
        })),

      addMessage: (chatId, message) =>
        set((state) => {
          const chatMessages = state.messages[chatId] || [];
          return {
            messages: {
              ...state.messages,
              [chatId]: [...chatMessages, message],
            },
          };
        }),

      addCampaign: (campaign) =>
        set((state) => ({
          campaigns: [...(state.campaigns || []), campaign],
        })),

      updateCampaign: (id, updates) =>
        set((state) => ({
          campaigns: (state.campaigns || []).map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      setCampaigns: (campaigns) => set({ campaigns }),
      setMessages: (messages) => set({ messages }),
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setSettings: (settings) => set({ settings }),
      updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),

      updateMessageStatus: (chatId, messageId, status) =>
        set((state) => {
          const chatMessages = state.messages[chatId] || [];
          return {
            messages: {
              ...state.messages,
              [chatId]: chatMessages.map((msg) =>
                msg.id === messageId ? { ...msg, status } : msg
              ),
            },
          };
        }),

      deleteContact: (id) =>
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== id),
        })),

      deleteChat: (chatId) =>
        set((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[chatId];
          return { messages: newMessages };
        }),

      markChatReadStatus: (chatId: string, isRead: boolean) =>
        set((state) => {
          const chatMessages = state.messages[chatId] || [];
          if (chatMessages.length === 0) return {};

          const updatedMessages = chatMessages.map((msg) => {
            // Only update messages from contact (not 'me')
            if (msg.senderId === 'me') return msg;

            if (isRead) {
              // Mark all as read
              return { ...msg, status: 'read' as const };
            } else {
              // Mark as unread (set last message to delivered)
              // This is a simplification. Ideally finding the last one and setting it.
              // But here, if we mark as unread, let's just set the LAST message to 'delivered'.
              return msg;
            }
          });

          // If marking as unread, specifically target the last message from contact
          if (!isRead) {
            // Use reverse find to simulate findLastIndex for compatibility
            const reversedIndex = [...updatedMessages].reverse().findIndex(m => m.senderId !== 'me');
            if (reversedIndex !== -1) {
              const lastContactMsgIndex = updatedMessages.length - 1 - reversedIndex;
              updatedMessages[lastContactMsgIndex] = { ...updatedMessages[lastContactMsgIndex], status: 'delivered' };
            }
          }

          return {
            messages: {
              ...state.messages,
              [chatId]: updatedMessages,
            },
          };
        }),
    }),
    {
      name: 'zapr-crm-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
