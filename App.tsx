import React from 'react';
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
import { GlobalSearch } from './components/GlobalSearch';
import { useAppStore } from './stores/useAppStore';
import { Toaster } from 'sonner';
import { PropertyCatalog } from './components/properties/PropertyCatalog';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Session, User } from '@supabase/supabase-js';
import { getDBSettings, saveDBSettings } from './services/settingsService';
import { useWhatsAppPolling } from './hooks/useWhatsAppPolling';
import { useWhatsAppSocket } from './hooks/useWhatsAppSocket';
import { supabaseService } from './services/supabaseService';
import { useRealEstateStore } from './stores/useRealEstateStore';

const App: React.FC = () => {
  useWhatsAppPolling();
  useWhatsAppSocket();

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

          if (dbContacts.length > 0) setContacts(dbContacts);
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
      case View.UNIPDF:
        return <UniPDF />;
      case View.AUTOPOST_FB:
        return <AutoPostFB onNavigate={setCurrentView} />;
      case View.SETTINGS:
        return <Settings />;
      default:
        return <Dashboard contacts={contacts} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Toaster position="top-right" richColors />
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <main className="flex-1 overflow-hidden relative bg-white lg:rounded-l-3xl shadow-2xl lg:my-2 lg:mr-2 border border-gray-100">
        {renderContent()}
        <GlobalSearch />
      </main>
    </div>
  );
};

export default App;
