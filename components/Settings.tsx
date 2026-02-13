import React, { useState } from 'react';
import { BrainCircuit, MessageSquare, Share2, Settings as SettingsIcon, Building2, Zap, QrCode, MousePointer2 } from 'lucide-react';
import clsx from 'clsx';
import { AISettings } from './settings/AISettings';
import { WhatsAppSettings } from './settings/WhatsAppSettings';
import { WhatsAppConnection } from './settings/WhatsAppConnection';
import { LeadCaptureSettings } from './settings/LeadCaptureSettings';
import { FacebookSettings } from './settings/FacebookSettings';
import { GeneralSettings } from './settings/GeneralSettings';
import { AccountSettings } from './settings/AccountSettings';
import { AutomationSettings } from './settings/AutomationSettings';
import { useSettings } from '../hooks/useSettings';
import { toast } from 'sonner';

type TabKey = 'ai' | 'whatsapp' | 'wa_connection' | 'lead_capture' | 'facebook' | 'account' | 'automation' | 'general';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; activeColor: string }[] = [
  { key: 'ai', label: 'Inteligência Artificial', icon: <BrainCircuit size={20} />, activeColor: 'purple' },
  { key: 'wa_connection', label: 'Conexão WhatsApp', icon: <QrCode size={20} />, activeColor: 'green' },
  { key: 'lead_capture', label: 'Captura de Leads', icon: <MousePointer2 size={20} />, activeColor: 'blue' },
  { key: 'whatsapp', label: 'WhatsApp API', icon: <MessageSquare size={20} />, activeColor: 'slate' },
  { key: 'facebook', label: 'Facebook', icon: <Share2 size={20} />, activeColor: 'indigo' },
  { key: 'account', label: 'Conta e Empresa', icon: <Building2 size={20} />, activeColor: 'cyan' },
  { key: 'automation', label: 'Automação', icon: <Zap size={20} />, activeColor: 'orange' },
  { key: 'general', label: 'Geral e Dados', icon: <SettingsIcon size={20} />, activeColor: 'slate' },
];

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('ai');
  const { configs, sets, actions, statuses } = useSettings();

  const handleAddTag = (newTag: string) => {
    if (newTag.trim() && !configs.crmTags.includes(newTag.trim())) {
      const updatedTags = [...configs.crmTags, newTag.trim()];
      sets.setCrmTags(updatedTags);
      localStorage.setItem('crm_tags', JSON.stringify(updatedTags));
      return true;
    }
    return false;
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = configs.crmTags.filter((t) => t !== tagToRemove);
    sets.setCrmTags(updatedTags);
    localStorage.setItem('crm_tags', JSON.stringify(updatedTags));
  };

  const [newTagInput, setNewTagInput] = useState('');

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden font-sans">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 font-sans">Configurações</h1>

        <div className="flex gap-4 border-b border-gray-100 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'pb-3 flex items-center gap-2 font-medium transition-colors border-b-2 whitespace-nowrap text-sm',
                activeTab === tab.key
                  ? `border-${tab.activeColor}-600 text-${tab.activeColor}-700`
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
              style={
                activeTab === tab.key
                  ? {
                    borderColor:
                      tab.activeColor === 'purple' ? '#9333ea' :
                        tab.activeColor === 'green' ? '#16a34a' :
                          tab.activeColor === 'blue' ? '#2563eb' :
                            tab.activeColor === 'indigo' ? '#4f46e5' :
                              tab.activeColor === 'cyan' ? '#0891b2' :
                                tab.activeColor === 'orange' ? '#ea580c' :
                                  '#475569',
                    color:
                      tab.activeColor === 'purple' ? '#7e22ce' :
                        tab.activeColor === 'green' ? '#15803d' :
                          tab.activeColor === 'blue' ? '#1d4ed8' :
                            tab.activeColor === 'indigo' ? '#4338ca' :
                              tab.activeColor === 'cyan' ? '#0e7490' :
                                tab.activeColor === 'orange' ? '#c2410c' :
                                  '#334155',
                  }
                  : {}
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
        {activeTab === 'ai' && (
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
        )}
        {activeTab === 'wa_connection' && <WhatsAppConnection />}
        {activeTab === 'lead_capture' && <LeadCaptureSettings />}
        {activeTab === 'whatsapp' && (
          <WhatsAppSettings
            waConfig={configs.waConfig}
            setWaConfig={sets.setWaConfig}
            waTestStatus={statuses.waTestStatus}
            setWaTestStatus={statuses.setWaTestStatus}
            handleSaveWa={actions.handleSaveWa}
            status={statuses.status}
          />
        )}
        {activeTab === 'facebook' && (
          <FacebookSettings
            fbConfig={configs.fbConfig}
            setFbConfig={sets.setFbConfig}
            fbTestStatus={statuses.fbTestStatus}
            setFbTestStatus={statuses.setFbTestStatus}
            status={statuses.status}
            setStatus={statuses.setStatus}
          />
        )}
        {activeTab === 'account' && (
          <AccountSettings
            profile={configs.companyProfile}
            setProfile={sets.setCompanyProfile}
            onSave={actions.handleSaveCompanyProfile}
          />
        )}
        {activeTab === 'automation' && (
          <AutomationSettings
            businessHours={configs.businessHours}
            setBusinessHours={sets.setBusinessHours}
            autoMessages={configs.autoMessages}
            setAutoMessages={sets.setAutoMessages}
            onSave={actions.handleSaveAutomation}
          />
        )}
        {activeTab === 'general' && (
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
        )}
      </div>
    </div>
  );
};
