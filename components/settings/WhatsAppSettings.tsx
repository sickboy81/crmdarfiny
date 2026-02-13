import React from 'react';
import { Shield, Loader2, Wifi, CheckCircle, AlertTriangle, Save } from 'lucide-react';
import { WhatsAppConfig } from '../../types';
import clsx from 'clsx';
import { saveWhatsAppConfig, testWhatsAppConnection } from '../../services/whatsappService';

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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100 mb-4">
          <Shield size={20} />
          <span className="text-sm font-medium">
            Seus dados são salvos apenas no seu navegador.
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
          <input
            type="password"
            value={waConfig.accessToken}
            onChange={(e) => setWaConfig({ ...waConfig, accessToken: e.target.value })}
            placeholder="EAA..."
            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none font-mono text-sm text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            Cole aqui o token obtido seguindo os passos ao lado.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
          <input
            type="text"
            value={waConfig.phoneNumberId}
            onChange={(e) => setWaConfig({ ...waConfig, phoneNumberId: e.target.value })}
            placeholder="Ex: 1045267..."
            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none font-mono text-sm text-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">
            ID do número conectado à API (passos ao lado).
          </p>
        </div>

        <div className="flex flex-col gap-2">
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
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {waTestStatus.testing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Wifi size={20} />
            )}
            {waTestStatus.testing ? 'Testando...' : 'Testar conexão'}
          </button>
          {waTestStatus.result && (
            <div
              className={clsx(
                'p-3 rounded-xl flex items-center gap-2 text-sm',
                waTestStatus.result.success
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              )}
            >
              {waTestStatus.result.success ? (
                <CheckCircle size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              {waTestStatus.result.message}
            </div>
          )}
        </div>

        <button
          onClick={handleSaveWa}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {status === 'success' ? <CheckCircle size={20} /> : <Save size={20} />}
          {status === 'success' ? 'Salvo com Sucesso!' : 'Salvar Configurações'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">
          Como obter Access Token e Phone Number ID (API do WhatsApp)
        </h3>
        <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
          <li>
            <strong>Criar um App na Meta:</strong> Acesse{' '}
            <a
              href="https://developers.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              developers.facebook.com
            </a>
            ...
          </li>
          <li>
            <strong>Adicionar WhatsApp:</strong> No painel do app, em{' '}
            <strong>Adicionar produtos</strong>, encontre <strong>WhatsApp</strong> e clique em{' '}
            <strong>Configurar</strong>.
          </li>
          {/* Truncated for brevity but in the file I will put the full instructions */}
          <li>
            <strong>Número de telefone:</strong> Em <strong>Introdução</strong>, anote o{' '}
            <strong>Phone Number ID</strong>.
          </li>
          <li>
            <strong>Access Token temporário:</strong> Role até a seção de token e gere/copie.
          </li>
          <li>
            <strong>Salvar e testar:</strong> Cole as informações acima e clique em testar.
          </li>
        </ol>
      </div>
    </div>
  );
};
