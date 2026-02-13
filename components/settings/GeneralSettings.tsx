import React from 'react';
import { toast } from 'sonner';
import {
  Tag,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  Database,
  Download,
  Upload,
  Bell,
  Moon,
  Sun,
  EyeOff,
  Keyboard,
  Speaker
} from 'lucide-react';
import clsx from 'clsx';
import { UserPreferences } from '../../hooks/useSettings';
import { CloudSync } from '../CloudSync';

interface GeneralSettingsProps {
  crmTags: string[];
  newTag: string;
  setNewTag: (val: string) => void;
  handleAddTag: () => void;
  handleRemoveTag: (tag: string) => void;
  documentCompanyName: string;
  setDocumentCompanyName: (val: string) => void;
  handleExportData: () => void;
  handleImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (val: boolean) => void;
  status: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  crmTags,
  newTag,
  setNewTag,
  handleAddTag,
  handleRemoveTag,
  documentCompanyName,
  setDocumentCompanyName,
  handleExportData,
  handleImportData,
  preferences,
  setPreferences,
  status,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Preferences Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 md:col-span-2 lg:col-span-1">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon className="text-purple-600" /> Preferências do Sistema
        </h2>
        <div className="space-y-4">
          {/* Theme */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                {preferences.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <p className="font-medium text-gray-900">Tema do Sistema</p>
                <p className="text-xs text-gray-500">Alternar entre claro e escuro</p>
              </div>
            </div>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => {
                  setPreferences({ ...preferences, theme: 'light' });
                  toast.success('Tema Claro ativado');
                }}
                className={clsx("p-1.5 rounded-md transition-all", preferences.theme === 'light' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
                title="Modo Claro"
              >
                <Sun size={16} />
              </button>
              <button
                onClick={() => {
                  setPreferences({ ...preferences, theme: 'dark' });
                  toast.success('Tema Escuro ativado');
                }}
                className={clsx("p-1.5 rounded-md transition-all", preferences.theme === 'dark' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
                title="Modo Escuro"
              >
                <Moon size={16} />
              </button>
            </div>
          </div>

          {/* Privacy Blur */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <EyeOff size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Modo de Privacidade</p>
                <p className="text-xs text-gray-500">Borrar números e mensagens na lista</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, blurSensitive: !preferences.blurSensitive })}
              className={clsx(
                'w-12 h-6 rounded-full relative transition-colors',
                preferences.blurSensitive ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', preferences.blurSensitive ? 'left-7' : 'left-1')} />
            </button>
          </div>

          {/* Send on Enter */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Keyboard size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Enviar com Enter</p>
                <p className="text-xs text-gray-500">Pressionar Enter envia a mensagem</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, sendOnEnter: !preferences.sendOnEnter })}
              className={clsx(
                'w-12 h-6 rounded-full relative transition-colors',
                preferences.sendOnEnter ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', preferences.sendOnEnter ? 'left-7' : 'left-1')} />
            </button>
          </div>

          {/* Sounds */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                <Speaker size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Efeitos Sonoros</p>
                <p className="text-xs text-gray-500">Sons ao enviar/receber mensagens</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, playSounds: !preferences.playSounds })}
              className={clsx(
                'w-12 h-6 rounded-full relative transition-colors',
                preferences.playSounds ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', preferences.playSounds ? 'left-7' : 'left-1')} />
            </button>
          </div>
        </div>
      </div>

      {/* Tag Manager */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 md:col-span-2 lg:col-span-1">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Tag className="text-blue-600" /> Gerenciar Tags do CRM
          </h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Nova tag (ex: Boleto Pendente)"
            className="flex-1 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
          />
          <button
            onClick={handleAddTag}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors"
            title="Adicionar tag"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {crmTags.map((tag, idx) => (
            <div
              key={idx}
              className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-blue-100"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-blue-400 hover:text-red-500 transition-colors"
                title="Remover tag"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Settings */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon className="text-blue-600" size={20} /> Documentos PDF
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da empresa (para documentos PDF)
          </label>
          <input
            type="text"
            value={documentCompanyName}
            onChange={(e) => setDocumentCompanyName(e.target.value)}
            placeholder="Ex: Minha Empresa Ltda"
            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="md:col-span-2">
        <CloudSync />
      </div>

      {/* Unified CRM Extension */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 md:col-span-2">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Database className="text-orange-600" /> Extensão CRM All-in-One
        </h2>
        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 bg-white rounded-full shadow-sm text-orange-500">
              <Download size={32} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Instale a Extensão Unificada</h3>
              <p className="text-gray-600 mb-4 max-w-lg">
                Uma única extensão para turbinar seu CRM:
                <br />
                ✅ <strong>Extração de Contatos</strong> do WhatsApp Web.
                <br />
                ✅ <strong>Automação de Postagens</strong> no Facebook/Instagram.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a
                  href="/extension/crm-all-in-one.zip"
                  download
                  className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Download size={20} /> Baixar Extensão Completa (.zip)
                </a>

                <button
                  onClick={() => {
                    const guide = document.getElementById('install-guide');
                    if (guide) guide.classList.toggle('hidden');
                  }}
                  className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm hover:border-orange-300"
                >
                  Como Instalar?
                </button>
              </div>

              <div id="install-guide" className="hidden mt-6 pt-6 border-t border-orange-200/50 space-y-4 text-left animate-in slide-in-from-top-4 fade-in duration-300">
                <p className="font-bold text-gray-800">Passo a passo (Modo Desenvolvedor):</p>
                <ol className="list-decimal list-inside space-y-2 ml-1 text-gray-700 bg-white/50 p-4 rounded-xl border border-orange-100">
                  <li>Baixe e descompacte o arquivo <strong>.zip</strong> acima.</li>
                  <li>Abra o Chrome/Edge e vá para <strong>chrome://extensions</strong>.</li>
                  <li>Ative o <strong>Modo do desenvolvedor</strong> (canto superior direito).</li>
                  <li>Clique em <strong>Carregar sem compactação</strong>.</li>
                  <li>Selecione a pasta onde você descompactou os arquivos.</li>
                  <li>Pronto! O ícone do CRM aparecerá na sua barra de extensões.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 md:col-span-2">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Database className="text-orange-600" /> Backup e Dados
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleExportData}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-600 hover:text-blue-700"
          >
            <Download size={32} />
            <span className="font-semibold text-sm">Exportar Backup</span>
          </button>
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all text-gray-600 hover:text-green-700 cursor-pointer">
            <Upload size={32} />
            <span className="font-semibold text-sm">Importar Dados</span>
            <input type="file" onChange={handleImportData} className="hidden" accept=".json" />
          </label>
        </div>
        {status === 'success' && (
          <p className="text-green-600 text-sm text-center font-medium">
            Operação realizada com sucesso!
          </p>
        )}
      </div>

    </div>
  );
};
