import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, Message, View, Campaign, EmailMessage, StoredImage, Notification } from '../types';
import { MOCK_CONTACTS, MOCK_MESSAGES } from '../constants';
import { User, Session } from '@supabase/supabase-js';
import { supabaseService } from '../services/supabaseService';

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
  emails: EmailMessage[];
  images: StoredImage[];
  notifications: Notification[];
  isSearchOpen: boolean;

  waConnectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';

  setCurrentView: (view: View) => void;
  setContacts: (contacts: Contact[]) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  setWaConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  addContact: (contact: Contact) => void;
  addMessage: (chatId: string, message: Message) => void;
  addEmail: (email: EmailMessage) => void;
  addImage: (image: StoredImage) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
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
  setIsSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: View.INBOX,
      contacts: [],
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
          qrTagline: 'Darfiny CRM · Automação Inteligente',
        }
      },
      emails: [],
      images: [],
      notifications: [],
      waConnectionStatus: 'disconnected',
      isSearchOpen: false,

      setCurrentView: (view) => set({ currentView: view }),

      setSelectedContactId: (id) => set({ selectedContactId: id }),

      setContacts: (contacts) => set({ contacts }),

      setWaConnectionStatus: (status) => set({ waConnectionStatus: status }),

      updateContact: (id, updates) =>
        set((state) => {
          const updatedContacts = state.contacts.map((c) => (c.id === id ? { ...c, ...updates } : c));
          const contact = updatedContacts.find(c => c.id === id);
          if (contact) {
            supabaseService.saveContact(contact).catch(console.error);
          }
          return { contacts: updatedContacts };
        }),

      addContact: (contact) =>
        set((state) => {
          supabaseService.saveContact(contact).catch(console.error);
          return {
            contacts: [...state.contacts, contact],
          };
        }),

      addMessage: (chatId, message) =>
        set((state) => {
          // Persist to Supabase
          supabaseService.saveMessage(chatId, message).catch(console.error);

          const chatMessages = state.messages[chatId] || [];
          const newState = {
            messages: {
              ...state.messages,
              [chatId]: [...chatMessages, message],
            },
          };
          // ... rest of the logic remains the same

          // Trigger notification for incoming WhatsApp messages
          if (message.senderId !== 'me' && message.type !== 'system') {
            const contact = state.contacts.find(c => c.id === chatId);
            const notification = {
              id: `wa-${message.id}`,
              title: `WhatsApp: ${contact?.name || message.senderId}`,
              message: message.content,
              timestamp: new Date().toLocaleTimeString(),
              type: 'info' as const,
              category: 'wa' as const,
              read: false,
              link: 'inbox'
            };

            // We'll call the store's own addNotification logic (below) 
            // but for simplicity inside set, we'll just merge it.
            const prefs = state.settings.crm_preferences;
            if (prefs?.notificationEvents?.wa !== false) {
              return {
                ...newState,
                notifications: [notification, ...(state.notifications || [])]
              };
            }
          }

          return newState;
        }),

      addCampaign: (campaign) =>
        set((state) => {
          const newCampaigns = [...(state.campaigns || []), campaign];
          supabaseService.syncCampaigns(newCampaigns).catch(console.error);
          return { campaigns: newCampaigns };
        }),

      updateCampaign: (id, updates) =>
        set((state) => {
          const updatedCampaigns = (state.campaigns || []).map((c) =>
            c.id === id ? { ...c, ...updates } : c
          );
          supabaseService.syncCampaigns(updatedCampaigns).catch(console.error);
          return { campaigns: updatedCampaigns };
        }),

      addEmail: (email) =>
        set((state) => {
          const newState = {
            emails: [email, ...(state.emails || [])],
          };

          // If it's an incoming email, trigger notification
          if (email.status === 'received') {
            const notification = {
              id: `email-${email.id}`,
              title: 'Novo E-mail Recebido',
              message: `${email.from}: ${email.subject}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'info' as const,
              category: 'email' as const,
              read: false,
              link: 'email_manager'
            };
            return {
              ...newState,
              notifications: [notification, ...(state.notifications || [])]
            };
          }

          return newState;
        }),

      addImage: (image) =>
        set((state) => ({
          images: [image, ...(state.images || [])],
        })),

      addNotification: (notification) =>
        set((state) => {
          const prefs = state.settings.crm_preferences;

          // Check if category is enabled (if category exists)
          if (notification.category && prefs?.notificationEvents && prefs.notificationEvents[notification.category] === false) {
            return state;
          }

          // Play sound if enabled
          if (prefs?.playSounds !== false) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
            audio.play().catch(() => { }); // Browser might block un-interacted audio
          }

          return {
            notifications: [notification, ...(state.notifications || [])],
          };
        }),

      markNotificationAsRead: (id) =>
        set((state) => ({
          notifications: (state.notifications || []).map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setCampaigns: (campaigns) => set({ campaigns }),
      setMessages: (messages) => set({ messages }),
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setSettings: (settings) => set({ settings }),
      updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),

      updateMessageStatus: (chatId, messageId, status) =>
        set((state) => {
          supabaseService.updateMessageStatus(messageId, status).catch(console.error);
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

      setIsSearchOpen: (open) => set({ isSearchOpen: open }),
      toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
    }),
    {
      name: 'zapr-crm-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
