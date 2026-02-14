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
  ShieldCheck
} from 'lucide-react';
import { UserPreferences } from '../../hooks/useSettings';
import { CloudSync } from '../CloudSync';
import clsx from 'clsx';

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Tag Manager */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Tag className="text-blue-600" /> Etiquetas do CRM
        </h2>
        <p className="text-xs text-slate-500">Crie etiquetas para organizar seus contatos e leads.</p>

        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Nova tag..."
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
          <button
            onClick={handleAddTag}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {crmTags.map((tag, idx) => (
            <div
              key={idx}
              className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-blue-100 group"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-blue-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Settings */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="text-indigo-600" size={20} /> Documentos PDF
        </h2>
        <p className="text-xs text-slate-500">Configurações para geração de propostas e recibos.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Assinatura / Nome da Empresa
            </label>
            <input
              type="text"
              value={documentCompanyName}
              onChange={(e) => setDocumentCompanyName(e.target.value)}
              placeholder="Ex: Darfiny Imóveis Ltda"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
            />
          </div>
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-[11px] text-indigo-700 flex gap-3">
            <div className="p-1.5 bg-indigo-100 rounded-lg h-fit text-indigo-600">
              <SettingsIcon size={14} />
            </div>
            Este nome aparecerá no rodapé de todos os documentos gerados pelo sistema.
          </div>
        </div>
      </div>

      {/* Interface Preferences */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="text-green-600" size={20} /> Privacidade e Interface
        </h2>
        <p className="text-xs text-slate-500">Controle a exibição de dados sensíveis na tela.</p>

        <div className="space-y-4">
          <div
            onClick={() => setPreferences({ ...preferences, blurSensitive: !preferences.blurSensitive })}
            className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-green-200 cursor-pointer transition-all group"
          >
            <div>
              <p className="font-bold text-slate-800 text-sm">Modo Privacidade (Borrar Dados)</p>
              <p className="text-[10px] text-slate-500">Esconde números de telefone e mensagens na tela.</p>
            </div>
            <div className={clsx(
              "w-12 h-6 rounded-full relative transition-all duration-300",
              preferences.blurSensitive ? "bg-green-500" : "bg-gray-300"
            )}>
              <div className={clsx(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                preferences.blurSensitive ? "right-1" : "left-1"
              )} />
            </div>
          </div>

          <div
            onClick={() => setPreferences({ ...preferences, sendOnEnter: !preferences.sendOnEnter })}
            className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-blue-200 cursor-pointer transition-all group"
          >
            <div>
              <p className="font-bold text-slate-800 text-sm">Enviar com Enter</p>
              <p className="text-[10px] text-slate-500">Pressione Enter para disparar mensagens no chat.</p>
            </div>
            <div className={clsx(
              "w-12 h-6 rounded-full relative transition-all duration-300",
              preferences.sendOnEnter ? "bg-blue-500" : "bg-gray-300"
            )}>
              <div className={clsx(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                preferences.sendOnEnter ? "right-1" : "left-1"
              )} />
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Database className="text-cyan-600" size={20} /> Sincronização em Nuvem
        </h2>
        <CloudSync />
      </div>

      {/* Backup & Restore */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Database className="text-slate-600" /> Exportação e Segurança
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportData}
            className="flex items-center gap-4 p-6 rounded-2xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Download size={24} />
            </div>
            <div className="text-left">
              <span className="font-bold text-slate-800 block">Exportar Backup Total</span>
              <span className="text-[10px] text-slate-400 uppercase font-black">JSON Format</span>
            </div>
          </button>

          <label className="flex items-center gap-4 p-6 rounded-2xl border border-slate-100 hover:border-green-500 hover:bg-green-50/30 transition-all group cursor-pointer">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all">
              <Upload size={24} />
            </div>
            <div className="text-left">
              <span className="font-bold text-slate-800 block">Restaurar de Arquivo</span>
              <span className="text-[10px] text-slate-400 uppercase font-black">Importar JSON</span>
            </div>
            <input type="file" onChange={handleImportData} className="hidden" accept=".json" />
          </label>
        </div>
        {status === 'success' && (
          <p className="text-green-600 text-xs text-center font-bold bg-green-50 py-2 rounded-lg">
            🎉 Operação Finalizada com Sucesso!
          </p>
        )}
      </div>

    </div>
  );
};
