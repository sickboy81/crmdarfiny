import React, { useState } from 'react';
import {
  Shield, Loader2, Wifi, CheckCircle, AlertTriangle, Save,
  QrCode, MessageSquare, Info
} from 'lucide-react';
import { WhatsAppConfig } from '../../types';
import clsx from 'clsx';
import { saveWhatsAppConfig, testWhatsAppConnection } from '../../services/whatsappService';
import { WhatsAppConnection } from './WhatsAppConnection';

interface WhatsAppSettingsProps {
  waConfig: WhatsAppConfig;
  setWaConfig: (config: WhatsAppConfig) => void;
  waTestStatus: { testing: boolean; result: { success: boolean; message: string } | null };
  setWaTestStatus: (status: any) => void;
  handleSaveWa: () => void;
  status: string;
}

export const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({
  waConfig,
  setWaConfig,
  waTestStatus,
  setWaTestStatus,
  handleSaveWa,
  status,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'qr' | 'api'>('qr');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sub-tabs Selector */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('qr')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeSubTab === 'qr'
              ? "bg-white text-green-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <QrCode size={18} />
          Conexão QR Code
        </button>
        <button
          onClick={() => setActiveSubTab('api')}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeSubTab === 'api'
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <MessageSquare size={18} />
          API Cloud (Oficial)
        </button>
      </div>

      {activeSubTab === 'qr' ? (
        <WhatsAppConnection />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-blue-700 bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4">
              <Shield size={20} />
              <div className="text-xs">
                <p className="font-bold">Configuração de Desenvolvedor</p>
                <p className="text-blue-600/70">Utilize a API oficial da Meta para maior estabilidade em envios de massa.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Access Token</label>
                <input
                  type="password"
                  value={waConfig.accessToken}
                  onChange={(e) => setWaConfig({ ...waConfig, accessToken: e.target.value })}
                  placeholder="EAA..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number ID</label>
                <input
                  type="text"
                  value={waConfig.phoneNumberId}
                  onChange={(e) => setWaConfig({ ...waConfig, phoneNumberId: e.target.value })}
                  placeholder="Ex: 1045267..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm text-gray-900 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={async () => {
                  saveWhatsAppConfig(waConfig);
                  setWaTestStatus({ testing: true, result: null });
                  const result = await testWhatsAppConnection();
                  setWaTestStatus({ testing: false, result });
                }}
                disabled={
                  waTestStatus.testing ||
                  !waConfig.accessToken?.trim() ||
                  !waConfig.phoneNumberId?.trim()
                }
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {waTestStatus.testing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Wifi size={20} />
                )}
                {waTestStatus.testing ? 'Testando...' : 'Testar Conexão API'}
              </button>

              {waTestStatus.result && (
                <div
                  className={clsx(
                    'p-4 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in zoom-in-95',
                    waTestStatus.result.success
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  )}
                >
                  {waTestStatus.result.success ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertTriangle size={20} />
                  )}
                  <span className="font-medium">{waTestStatus.result.message}</span>
                </div>
              )}

              <button
                onClick={handleSaveWa}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                {status === 'success' ? <CheckCircle size={22} /> : <Save size={22} />}
                {status === 'success' ? 'CONFIGURAÇÕES SALVAS!' : 'SALVAR NA NUVEM'}
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Info className="text-blue-500" /> Guia de Configuração API
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black flex-shrink-0">1</div>
                <div className="text-sm">
                  <p className="font-bold text-slate-800">Crie um App na Meta</p>
                  <p className="text-slate-500 leading-relaxed">Acesse developers.facebook.com e crie um app do tipo "Empresa".</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black flex-shrink-0">2</div>
                <div className="text-sm">
                  <p className="font-bold text-slate-800">Adicione o WhatsApp</p>
                  <p className="text-slate-500 leading-relaxed">No painel do app, adicione o produto WhatsApp e conecte um número.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black flex-shrink-0">3</div>
                <div className="text-sm">
                  <p className="font-bold text-slate-800">Gere o Token Permanente</p>
                  <p className="text-slate-500 leading-relaxed">Vá em Configurações do Negócio {"->"} Usuários do Sistema para gerar um token.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[11px] text-slate-500 italic">
                Dica: Use a Conexão QR Code para uso pessoal/diário e a API Cloud apenas para automações complexas e disparo de campanhas oficiais.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
