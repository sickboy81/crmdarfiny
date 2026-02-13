import { useState, useEffect } from 'react';
import { WhatsAppConfig, BotConfig, AIProvider, FacebookConfig } from '../types';
import { testWhatsAppConnection } from '../services/whatsappService';
import { testFacebookConnection } from '../services/facebookService';
import { resetGeminiClient, testAIConnection } from '../services/geminiService';
import { PROVIDER_ENDPOINTS } from '../services/openaiCompatibleService';
import { toast } from 'sonner';
import { useAppStore } from '../stores/useAppStore';
import { saveDBSettings } from '../services/settingsService';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  blurSensitive: boolean;
  sendOnEnter: boolean;
  playSounds: boolean;
}

export interface CompanyProfile {
  companyName: string;
  ownerName: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  website: string;
  logo: string;
  creci: string;
}

export interface BusinessHours {
  enabled: boolean;
  timezone: string;
  schedule: {
    [key: string]: { start: string; end: string; active: boolean };
  };
}

export interface AutoMessages {
  welcomeEnabled: boolean;
  welcomeMessage: string;
  awayEnabled: boolean;
  awayMessage: string;
  closingEnabled: boolean;
  closingMessage: string;
  followUpEnabled: boolean;
  followUpDelayHours: number;
  followUpMessage: string;
}

const DEFAULT_SCHEDULE: BusinessHours['schedule'] = {
  monday: { start: '08:00', end: '18:00', active: true },
  tuesday: { start: '08:00', end: '18:00', active: true },
  wednesday: { start: '08:00', end: '18:00', active: true },
  thursday: { start: '08:00', end: '18:00', active: true },
  friday: { start: '08:00', end: '18:00', active: true },
  saturday: { start: '09:00', end: '13:00', active: true },
  sunday: { start: '00:00', end: '00:00', active: false },
};

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: '',
  ownerName: '',
  cnpj: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  website: '',
  logo: '',
  creci: '',
};

const DEFAULT_AUTO_MESSAGES: AutoMessages = {
  welcomeEnabled: false,
  welcomeMessage: '',
  awayEnabled: false,
  awayMessage: '',
  closingEnabled: false,
  closingMessage: '',
  followUpEnabled: false,
  followUpDelayHours: 24,
  followUpMessage: '',
};

export const useSettings = () => {
  const { settings, setSettings, user } = useAppStore();

  const [waConfig, setWaConfig] = useState<WhatsAppConfig>(settings.whatsapp_config || {
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
  });

  const [aiConfig, setAiConfig] = useState<{
    provider: AIProvider;
    apiKeys: Partial<Record<AIProvider, string>>;
    modelOverrides?: Partial<Record<AIProvider, string>>;
  }>(settings.ai_config || { provider: 'gemini', apiKeys: {} });

  const [botConfig, setBotConfig] = useState<BotConfig>(settings.bot_config || {
    botName: '',
    businessContext: '',
    isActive: false,
    useHistoryLearning: false,
  });

  const [fbConfig, setFbConfig] = useState<FacebookConfig>(settings.facebook_config || { accessToken: '', postMethod: 'api' });
  const [crmTags, setCrmTags] = useState<string[]>(settings.crm_tags || [
    'Cliente VIP',
    'Lead Quente',
    'Novo Lead',
    'Ex-Cliente',
    'Suporte',
  ]);
  const [documentCompanyName, setDocumentCompanyName] = useState(settings.crm_document_company_name || '');
  const [preferences, setPreferences] = useState<UserPreferences>(settings.crm_preferences || {
    theme: 'light',
    blurSensitive: false,
    sendOnEnter: true,
    playSounds: true,
  });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(settings.crm_company_profile || DEFAULT_COMPANY_PROFILE);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(settings.crm_business_hours || {
    enabled: false,
    timezone: 'America/Sao_Paulo',
    schedule: DEFAULT_SCHEDULE,
  });
  const [autoMessages, setAutoMessages] = useState<AutoMessages>(settings.crm_auto_messages || DEFAULT_AUTO_MESSAGES);

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    result: { success: boolean; message: string } | null;
  }>({ testing: false, result: null });
  const [waTestStatus, setWaTestStatus] = useState<{
    testing: boolean;
    result: { success: boolean; message: string } | null;
  }>({ testing: false, result: null });
  const [fbTestStatus, setFbTestStatus] = useState<{
    testing: boolean;
    result: { success: boolean; message: string } | null;
  }>({ testing: false, result: null });

  // Update local states when global settings change (e.g. after DB load)
  useEffect(() => {
    if (settings.whatsapp_config) setWaConfig(settings.whatsapp_config);
    if (settings.ai_config) setAiConfig(settings.ai_config);
    if (settings.bot_config) setBotConfig(settings.bot_config);
    if (settings.facebook_config) setFbConfig(settings.facebook_config);
    if (settings.crm_tags) setCrmTags(settings.crm_tags);
    if (settings.crm_document_company_name !== undefined) setDocumentCompanyName(settings.crm_document_company_name);
    if (settings.crm_preferences) setPreferences(settings.crm_preferences);
    if (settings.crm_company_profile) setCompanyProfile(settings.crm_company_profile);
    if (settings.crm_business_hours) setBusinessHours(settings.crm_business_hours);
    if (settings.crm_auto_messages) setAutoMessages(settings.crm_auto_messages);
  }, [settings]);

  const updateGlobalSettings = async (updates: any) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    if (user) {
      try {
        await saveDBSettings(user.id, newSettings);
      } catch (e) {
        toast.error('Erro ao sincronizar com o banco de dados.');
      }
    }
  };

  const handleSavePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    const updatedSettings = { ...settings, crm_preferences: newPrefs };
    setSettings(updatedSettings); // Update Store

    // Persist to DB
    if (user) {
      saveDBSettings(user.id, updatedSettings).then(() => {
        toast.success('Preferências salvas!');
      }).catch(() => {
        toast.error('Erro ao salvar preferências.');
      });
    }
  };

  const handleSaveCompanyProfile = () => {
    updateGlobalSettings({ crm_company_profile: companyProfile });
    toast.success('Dados da empresa salvos!');
  };

  const handleSaveAutomation = () => {
    updateGlobalSettings({
      crm_business_hours: businessHours,
      crm_auto_messages: autoMessages
    });
    toast.success('Automações salvas com sucesso!');
  };

  const handleSaveWa = () => {
    if (!waConfig.accessToken || !waConfig.phoneNumberId) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    updateGlobalSettings({ whatsapp_config: waConfig });
    toast.success('Configurações de WhatsApp salvas!');
  };

  const handleSaveAIProvider = () => {
    const key = (aiConfig.apiKeys[aiConfig.provider] || '').trim();
    if (!key) {
      toast.error('Informe a API Key.');
      return;
    }
    const filteredAiConfig = {
      ...aiConfig,
      apiKeys: { ...aiConfig.apiKeys, [aiConfig.provider]: key }
    };
    updateGlobalSettings({ ai_config: filteredAiConfig });
    resetGeminiClient();
    toast.success('Provedor de IA salvo!');
  };

  const handleTestAPI = async () => {
    const key = (aiConfig.apiKeys[aiConfig.provider] || '').trim();
    if (!key) {
      toast.error('Informe a API Key antes de testar.');
      return;
    }
    setTestStatus({ testing: true, result: null });
    const model =
      aiConfig.provider === 'gemini'
        ? aiConfig.modelOverrides?.gemini
        : aiConfig.modelOverrides?.[aiConfig.provider] ||
        PROVIDER_ENDPOINTS[aiConfig.provider]?.defaultModel;
    const result = await testAIConnection({
      provider: aiConfig.provider,
      apiKey: key,
      model: model || undefined,
    });
    setTestStatus({ testing: false, result });
  };

  const handleSaveBot = () => {
    if (!botConfig.botName || !botConfig.businessContext) {
      toast.error('Preencha o nome e o contexto do bot.');
      return;
    }
    updateGlobalSettings({ bot_config: botConfig });
    toast.success('Treinamento do Bot salvo!');
  };

  return {
    configs: { waConfig, aiConfig, botConfig, fbConfig, crmTags, documentCompanyName, preferences, companyProfile, businessHours, autoMessages },
    sets: {
      setWaConfig,
      setAiConfig,
      setBotConfig,
      setFbConfig,
      setCrmTags: (tags: string[]) => {
        setCrmTags(tags);
        updateGlobalSettings({ crm_tags: tags });
      },
      setDocumentCompanyName: (name: string) => {
        setDocumentCompanyName(name);
        updateGlobalSettings({ crm_document_company_name: name });
      },
      setPreferences: handleSavePreferences,
      setCompanyProfile,
      setBusinessHours,
      setAutoMessages,
    },
    actions: { handleSaveWa, handleSaveAIProvider, handleTestAPI, handleSaveBot, handleSaveCompanyProfile, handleSaveAutomation },
    statuses: {
      status,
      setStatus,
      testStatus,
      waTestStatus,
      setWaTestStatus,
      fbTestStatus,
      setFbTestStatus,
    },
  };
};

