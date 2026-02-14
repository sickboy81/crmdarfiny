import React, { useState } from 'react';
import {
  BrainCircuit, MessageSquare, Share2, Settings as SettingsIcon,
  Building2, Zap, QrCode, MousePointer2, User, Bell, Palette,
  Database, ShieldCheck, Mail, Globe, Clock, Bot
} from 'lucide-react';
import clsx from 'clsx';
import { AISettings } from './settings/AISettings';
import { WhatsAppSettings } from './settings/WhatsAppSettings';
import { LeadCaptureSettings } from './settings/LeadCaptureSettings';
import { FacebookSettings } from './settings/FacebookSettings';
import { GeneralSettings } from './settings/GeneralSettings';
import { AccountSettings } from './settings/AccountSettings';
import { AutomationSettings } from './settings/AutomationSettings';
import { useSettings } from '../hooks/useSettings';
import { toast } from 'sonner';

type TabKey =
  | 'ai' | 'wa_connection' | 'lead_capture' | 'whatsapp'
  | 'facebook' | 'account' | 'automation' | 'general'
  | 'email_api' | 'notifications' | 'appearance';

interface SettingCategory {
  title: string;
  items: {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    color: string;
  }[];
}

const CATEGORIES: SettingCategory[] = [
  {
    title: 'Conectividade',
    items: [
      { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600 bg-green-50' },
      { key: 'facebook', label: 'Facebook / Instagram', icon: Share2, color: 'text-indigo-600 bg-indigo-50' },
      { key: 'email_api', label: 'E-mail SMTP/API', icon: Mail, color: 'text-blue-600 bg-blue-50' },
    ]
  },
  {
    title: 'Inteligência e Automação',
    items: [
      { key: 'ai', label: 'Modelos de IA', icon: BrainCircuit, color: 'text-purple-600 bg-purple-50' },
      { key: 'automation', label: 'Fluxos e Horários', icon: Zap, color: 'text-orange-600 bg-orange-50' },
      { key: 'lead_capture', label: 'Captura de Leads', icon: MousePointer2, color: 'text-teal-600 bg-teal-50' },
    ]
  },
  {
    title: 'Organização',
    items: [
      { key: 'account', label: 'Perfil da Empresa', icon: Building2, color: 'text-cyan-600 bg-cyan-50' },
      { key: 'general', label: 'Tags e Documentos', icon: SettingsIcon, color: 'text-slate-600 bg-slate-100' },
      { key: 'notifications', label: 'Notificações', icon: Bell, color: 'text-yellow-600 bg-yellow-50' },
      { key: 'appearance', label: 'Aparência', icon: Palette, color: 'text-pink-600 bg-pink-50' },
    ]
  }
];

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('ai');
  const { configs, sets, actions, statuses } = useSettings();

  const handleAddTag = (newTag: string) => {
    if (newTag.trim() && !configs.crmTags.includes(newTag.trim())) {
      const updatedTags = [...configs.crmTags, newTag.trim()];
      sets.setCrmTags(updatedTags);
      return true;
    }
    return false;
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = configs.crmTags.filter((t) => t !== tagToRemove);
    sets.setCrmTags(updatedTags);
  };

  const [newTagInput, setNewTagInput] = useState('');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ai':
        return (
          <AISettings
            aiConfig={configs.aiConfig}
            setAiConfig={sets.setAiConfig}
            botConfig={configs.botConfig}
            setBotConfig={sets.setBotConfig}
            status={statuses.status}
            testStatus={statuses.testStatus}
            handleSaveAIProvider={actions.handleSaveAIProvider}
            handleTestAPI={actions.handleTestAPI}
            handleSaveBot={actions.handleSaveBot}
          />
        );
      case 'lead_capture':
        return <LeadCaptureSettings />;
      case 'whatsapp':
        return (
          <WhatsAppSettings
            waConfig={configs.waConfig}
            setWaConfig={sets.setWaConfig}
            waTestStatus={statuses.waTestStatus}
            setWaTestStatus={statuses.setWaTestStatus}
            handleSaveWa={actions.handleSaveWa}
            status={statuses.status}
          />
        );
      case 'facebook':
        return (
          <FacebookSettings
            fbConfig={configs.fbConfig}
            setFbConfig={sets.setFbConfig}
            fbTestStatus={statuses.fbTestStatus}
            setFbTestStatus={statuses.setFbTestStatus}
            status={statuses.status}
            setStatus={statuses.setStatus}
          />
        );
      case 'account':
        return (
          <AccountSettings
            profile={configs.companyProfile}
            setProfile={sets.setCompanyProfile}
            onSave={actions.handleSaveCompanyProfile}
            userProfile={configs.userProfile}
            setUserProfile={sets.setUserProfile}
            onSaveUser={actions.handleSaveUserProfile}
          />
        );
      case 'automation':
        return (
          <AutomationSettings
            businessHours={configs.businessHours}
            setBusinessHours={sets.setBusinessHours}
            autoMessages={configs.autoMessages}
            setAutoMessages={sets.setAutoMessages}
            onSave={actions.handleSaveAutomation}
          />
        );
      case 'general':
        return (
          <GeneralSettings
            crmTags={configs.crmTags}
            newTag={newTagInput}
            setNewTag={setNewTagInput}
            handleAddTag={() => {
              if (handleAddTag(newTagInput)) setNewTagInput('');
            }}
            handleRemoveTag={handleRemoveTag}
            documentCompanyName={configs.documentCompanyName}
            setDocumentCompanyName={sets.setDocumentCompanyName}
            handleExportData={() => {
              toast.success('Exportando dados...');
            }}
            handleImportData={() => {
              toast.info('Importar dados via backup em breve');
            }}
            preferences={configs.preferences}
            setPreferences={sets.setPreferences}
            notificationsEnabled={configs.preferences.playSounds}
            setNotificationsEnabled={(val) => sets.setPreferences({ ...configs.preferences, playSounds: val })}
            status={statuses.status}
          />
        );
      case 'email_api':
        return (
          <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                <Mail size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Serviço de E-mail</h2>
                <p className="text-slate-500">Configure o envio de e-mails para campanhas e notificações.</p>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Resend API Key</label>
                <input
                  type="password"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="re_..."
                  value={(configs as any).emailConfig?.apiKey || ''}
                  onChange={(e) => {
                    const newConfig = { ...(configs as any).emailConfig, apiKey: e.target.value };
                    sets.setPreferences({ ...configs.preferences, email_config: newConfig } as any);
                  }}
                />
                <p className="text-[10px] text-slate-400 mt-2 italic">Obtenha sua chave em resend.com. Este CRM usa a API do Resend para envios seguros.</p>
              </div>
              <button
                onClick={() => toast.success('Configurações de e-mail salvas!')}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-100"
              >
                SALVAR CONFIGURAÇÕES
              </button>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl">
                <Bell size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Centro de Notificações</h2>
                <p className="text-slate-500">Controle como e quando você é avisado sobre eventos.</p>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    id: 'wa',
                    label: 'Mensagens no WhatsApp',
                    desc: 'Alertar sobre novas conversas recebidas.',
                    active: !!configs.preferences.notificationEvents?.wa,
                    toggle: () => sets.setPreferences({
                      ...configs.preferences,
                      notificationEvents: {
                        ...(configs.preferences.notificationEvents || {}),
                        wa: !configs.preferences.notificationEvents?.wa
                      }
                    })
                  },
                  {
                    id: 'leads',
                    label: 'Novos Leads Importados',
                    desc: 'Avisar quando a extração for concluída.',
                    active: !!configs.preferences.notificationEvents?.leads,
                    toggle: () => sets.setPreferences({
                      ...configs.preferences,
                      notificationEvents: {
                        ...(configs.preferences.notificationEvents || {}),
                        leads: !configs.preferences.notificationEvents?.leads
                      }
                    })
                  },
                  {
                    id: 'email',
                    label: 'Alertas de E-mail',
                    desc: 'Notificar sobre novos e-mails ou confirmação de envios.',
                    active: !!configs.preferences.notificationEvents?.email,
                    toggle: () => sets.setPreferences({
                      ...configs.preferences,
                      notificationEvents: {
                        ...(configs.preferences.notificationEvents || {}),
                        email: !configs.preferences.notificationEvents?.email
                      }
                    })
                  },
                  {
                    id: 'system',
                    label: 'Alertas do Sistema',
                    desc: 'Avisos sobre atualizações, segurança e erros.',
                    active: !!configs.preferences.notificationEvents?.system,
                    toggle: () => sets.setPreferences({
                      ...configs.preferences,
                      notificationEvents: {
                        ...(configs.preferences.notificationEvents || {}),
                        system: !configs.preferences.notificationEvents?.system
                      }
                    })
                  },
                  {
                    id: 'sounds',
                    label: 'Sons de Alerta',
                    desc: 'Reproduzir áudio em todos os eventos.',
                    active: configs.preferences.playSounds,
                    toggle: () => sets.setPreferences({
                      ...configs.preferences,
                      playSounds: !configs.preferences.playSounds
                    })
                  }
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={item.toggle}
                    className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-transparent hover:border-yellow-200 hover:bg-white transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </div>
                    <div className={clsx(
                      "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                      item.active ? "bg-green-500" : "bg-gray-300"
                    )}>
                      <div className={clsx(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                        item.active ? "right-1" : "left-1"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-pink-50 text-pink-600 rounded-2xl">
                <Palette size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Aparência do CRM</h2>
                <p className="text-slate-500">Personalize o tema e o estilo visual da plataforma.</p>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'light', label: 'Claro', icon: <Globe />, color: 'bg-white border-slate-200' },
                  { id: 'dark', label: 'Escuro', icon: <Bot />, color: 'bg-slate-900 border-slate-800 text-white' },
                  { id: 'system', label: 'Sistema', icon: <Clock />, color: 'bg-slate-100 border-slate-200' }
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => sets.setPreferences({ ...configs.preferences, theme: theme.id as any })}
                    className={clsx(
                      "p-6 rounded-2xl border-4 transition-all flex flex-col items-center gap-4",
                      configs.preferences.theme === theme.id ? "border-pink-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className={clsx("w-full h-24 rounded-xl flex items-center justify-center text-3xl", theme.color)}>
                      {theme.icon}
                    </div>
                    <span className="font-bold text-slate-700">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return <div className="p-12 text-center text-gray-400">Selecione uma categoria ao lado</div>;
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden transition-all duration-500">
      {/* Dynamic Settings Sidebar */}
      <aside className="w-80 border-r border-gray-100 flex flex-col h-full bg-slate-50/50 shrink-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 py-8 space-y-8">
          {CATEGORIES.map((category, idx) => (
            <div key={idx}>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">
                {category.title}
              </h2>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group",
                      activeTab === item.key
                        ? "bg-white shadow-xl shadow-slate-200/50 text-slate-900 border border-slate-100 translate-x-1"
                        : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-800"
                    )}
                  >
                    <div className={clsx(
                      "p-2 rounded-xl transition-all",
                      activeTab === item.key ? item.color : "bg-white text-slate-400 group-hover:text-slate-600 border border-gray-100"
                    )}>
                      <item.icon size={18} />
                    </div>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-100">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status do Sistema</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-xs font-bold">Todos os serviços online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Content Area */}
      <main className="flex-1 overflow-y-auto bg-white p-12 custom-scrollbar">
        {renderActiveTab()}
      </main>
    </div>
  );
};
