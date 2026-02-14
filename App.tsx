import React, { useState, useEffect } from 'react';
import { View } from './types';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { ContactList } from './components/ContactList';
import { Settings } from './components/Settings';
import { BulkSender } from './components/BulkSender';
import { Pipeline } from './components/Pipeline';
import { Documents } from './components/Documents';
import { AutoPostFB } from './components/AutoPostFB';
import { UniPDF } from './components/unipdf/UniPDF';
import { ContactExtractor } from './components/tools/ContactExtractor';
import { LeadManagement } from './components/LeadManagement';
import { EmailManager } from './components/EmailManager';
import { ImageManager } from './components/ImageManager';
import { Header } from './components/Header';
import { SocialPost } from './components/SocialPost';
import { LinkBio } from './components/LinkBio';
import { GlobalSearch } from './components/GlobalSearch';
import { useAppStore } from './stores/useAppStore';
import { Toaster } from 'sonner';
import { Instagram, Linkedin, Zap } from 'lucide-react';
import { bioService } from './services/bioService';
import clsx from 'clsx';
import { PropertyCatalog } from './components/properties/PropertyCatalog';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Session, User } from '@supabase/supabase-js';
import { getDBSettings, saveDBSettings } from './services/settingsService';
import { useWhatsAppPolling } from './hooks/useWhatsAppPolling';
import { useWhatsAppSocket } from './hooks/useWhatsAppSocket';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { supabaseService } from './services/supabaseService';
import { useRealEstateStore } from './stores/useRealEstateStore';

const App: React.FC = () => {
  useWhatsAppPolling();
  useWhatsAppSocket();
  useRealtimeSync();

  const {
    currentView,
    setCurrentView,
    contacts,
    updateContact,
    addContact,
    session,
    setSession,
    setUser,
    setIsAdmin,
    settings,
    setSettings,
    setContacts,
    setMessages,
    setCampaigns
  } = useAppStore();

  const { setProperties } = useRealEstateStore();

  React.useEffect(() => {
    const updateAuthState = async (session: Session | null) => {
      setSession(session);
      const user = session?.user ?? null;
      setUser(user);
      setIsAdmin(user?.email === 'consultoradarfiny@gmail.com');

      if (user) {
        // Load settings from DB
        const dbSettings = await getDBSettings(user.id);
        if (dbSettings) {
          setSettings(dbSettings);
        } else {
          // Migration from LocalStorage to DB on first login
          const localSettings: any = {};
          const keys = [
            'ai_config', 'bot_config', 'whatsapp_config', 'facebook_config',
            'crm_preferences', 'crm_company_profile', 'crm_business_hours',
            'crm_auto_messages', 'crm_tags', 'crm_document_company_name'
          ];
          keys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) {
              try { localSettings[key] = JSON.parse(val); } catch { localSettings[key] = val; }
            }
          });

          if (Object.keys(localSettings).length > 0) {
            await saveDBSettings(user.id, localSettings);
            setSettings(localSettings);
          }
        }

        // Load CRM Data from Supabase
        try {
          const [dbContacts, dbMessages, dbProperties, dbCampaigns] = await Promise.all([
            supabaseService.fetchContacts(),
            supabaseService.fetchMessages(),
            supabaseService.fetchProperties(),
            supabaseService.fetchCampaigns()
          ]);

          setContacts(dbContacts);
          if (Object.keys(dbMessages).length > 0) setMessages(dbMessages);
          if (dbProperties.length > 0) setProperties(dbProperties);
          if (dbCampaigns.length > 0) setCampaigns(dbCampaigns);
        } catch (error) {
          console.error('Error loading CRM data from Supabase:', error);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthState(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setIsAdmin, setSettings, setContacts, setMessages, setCampaigns, setProperties]);

  // Simulated Email Reception Logic
  React.useEffect(() => {
    const fetchInterval = setInterval(() => {
      // 10% chance to receive an email every 2 minutes for demo purposes
      if (Math.random() > 0.9) {
        const { addEmail } = useAppStore.getState();
        addEmail({
          id: `sim-${Date.now()}`,
          from: 'lead-automacao@sistema.com',
          to: 'admin@darfiny.com',
          subject: 'Nova oportunidade detectada',
          content: 'O sistema identificou um novo lead interessado no anúncio do Instagram.',
          timestamp: new Date().toLocaleString('pt-BR'),
          status: 'received'
        });
      }
    }, 120000);

    return () => clearInterval(fetchInterval);
  }, []);

  // Dark Mode Logic
  React.useEffect(() => {
    const theme = settings.crm_preferences?.theme || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [settings.crm_preferences?.theme]);

  const isBioPath = window.location.pathname === '/bio';
  const [publicBio, setPublicBio] = useState<any>(null);

  useEffect(() => {
    if (isBioPath) {
      const loadPublicBio = async () => {
        const data = await bioService.getPublicBio();
        if (data) setPublicBio(data);
      };
      loadPublicBio();
    }
  }, [isBioPath]);

  if (isBioPath) {
    if (!publicBio) {
      return <div className="h-screen w-full bg-[#0F172A]" />; // Placeholder dark background while loading
    }

    const config = {
      profileName: publicBio.profile_name || 'Darfiny CRM',
      bio: publicBio.bio || 'Página em construção',
      avatarUrl: publicBio.avatar_url || 'https://ui-avatars.com/api/?name=D&background=random',
      theme: publicBio.theme || { backgroundColor: '#0F172A', buttonColor: '#25D366', textColor: '#FFFFFF', buttonTextColor: '#000000', cardStyle: 'rounded' },
      links: publicBio.links || [],
      socials: publicBio.socials || {}
    };

    return (
      <div className="h-screen w-full overflow-y-auto" style={{ backgroundColor: config.theme.backgroundColor }}>
        <div className="max-w-[480px] mx-auto min-h-full p-6 pt-12 flex flex-col items-center">
          <img src={config.avatarUrl} alt={config.profileName} className="w-32 h-32 rounded-full border-4 border-white/20 shadow-xl mb-6 object-cover" />
          <div className="text-center space-y-3 mb-12">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: config.theme.textColor }}>{config.profileName}</h1>
            <p className="opacity-80 leading-relaxed px-4" style={{ color: config.theme.textColor }}>{config.bio}</p>
          </div>
          <div className="w-full space-y-4">
            {config.links.filter((l: any) => l.active).map((link: any) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "block w-full py-4 px-6 text-center text-lg font-black tracking-tight transition-all active:scale-95",
                  config.theme.cardStyle === 'rounded' && "rounded-2xl",
                  config.theme.cardStyle === 'flat' && "rounded-none",
                  config.theme.cardStyle === 'shadow' && "rounded-2xl shadow-xl",
                  config.theme.cardStyle === 'glass' && "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20"
                )}
                style={{
                  backgroundColor: config.theme.cardStyle === 'glass' ? 'transparent' : config.theme.buttonColor,
                  color: config.theme.buttonTextColor,
                }}
              >
                {link.title}
              </a>
            ))}
          </div>
          <div className="mt-auto py-12 flex flex-col items-center gap-6">
            <div className="flex gap-6">
              {config.socials.instagram && <Instagram size={24} style={{ color: config.theme.textColor }} className="opacity-80" />}
              {config.socials.linkedin && <Linkedin size={24} style={{ color: config.theme.textColor }} className="opacity-80" />}
            </div>
            <div className="flex items-center gap-2 opacity-30 grayscale" style={{ color: config.theme.textColor }}>
              <Zap size={16} fill="currentColor" />
              <span className="text-xs font-black tracking-widest uppercase">Egeolabs - 2026</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Auth />
      </>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard contacts={contacts} />;
      case View.INBOX:
        return <ChatInterface />;
      case View.CONTACTS:
        return (
          <ContactList
            contacts={contacts}
            onUpdateContact={updateContact}
            onAddContact={addContact}
          />
        );
      case View.CAMPAIGNS:
        return <BulkSender contacts={contacts} />;
      case View.PIPELINE:
        return (
          <Pipeline
            contacts={contacts}
            onUpdateContact={updateContact}
            onAddContact={addContact}
          />
        );
      case View.PROPERTIES:
        return <PropertyCatalog />;
      case View.DOCUMENTS:
        return <Documents />;
      case View.EXTRACTOR:
        return <ContactExtractor />;
      case View.LEAD_HUB:
        return <LeadManagement />;
      case View.UNIPDF:
        return <UniPDF />;
      case View.AUTOPOST_FB:
        return <AutoPostFB onNavigate={setCurrentView} />;
      case View.EMAIL_MANAGER:
        return <EmailManager />;
      case View.IMAGE_MANAGER:
        return <ImageManager />;
      case View.SOCIAL_POSTS:
        return <SocialPost />;
      case View.LINK_BIO:
        return <LinkBio />;
      case View.SETTINGS:
        return <Settings />;
      default:
        return <Dashboard contacts={contacts} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-main)] overflow-hidden font-sans transition-colors duration-500">
      <Toaster position="top-right" richColors />
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <main className="flex-1 overflow-hidden relative bg-[var(--bg-card)] lg:rounded-l-3xl shadow-2xl lg:my-2 lg:mr-2 border border-[var(--border-main)] flex flex-col transition-all duration-500">
        <Header />
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>
        <GlobalSearch />
      </main>
    </div>
  );
};

export default App;
