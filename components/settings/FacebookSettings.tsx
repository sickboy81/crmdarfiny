import React from 'react';
import { Shield, Loader2, PlayCircle, CheckCircle, AlertTriangle, Save, Share2, Download } from 'lucide-react';
import { FacebookConfig } from '../../types';
import clsx from 'clsx';
import { saveFacebookConfig, testFacebookConnection } from '../../services/facebookService';

interface FacebookSettingsProps {
  fbConfig: FacebookConfig;
  setFbConfig: (config: FacebookConfig) => void;
  fbTestStatus: { testing: boolean; result: { success: boolean; message: string } | null };
  setFbTestStatus: (status: any) => void;
  status: string;
  setStatus: (status: any) => void;
}

export const FacebookSettings: React.FC<FacebookSettingsProps> = ({
  fbConfig,
  setFbConfig,
  fbTestStatus,
  setFbTestStatus,
  status,
  setStatus,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
            <Shield size={20} />
            <span className="text-sm font-medium">O token é salvo apenas no seu navegador.</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Como postar em grupos
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fbPostMethod"
                  checked={(fbConfig.postMethod ?? 'api') === 'api'}
                  onChange={() => setFbConfig({ ...fbConfig, postMethod: 'api' })}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-800">Postar via API (token)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fbPostMethod"
                  checked={(fbConfig.postMethod ?? 'api') === 'extension'}
                  onChange={() => setFbConfig({ ...fbConfig, postMethod: 'extension' })}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-800">Postar via extensão (navegador)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token do Facebook
            </label>
            <input
              type="password"
              value={fbConfig.accessToken || ''}
              onChange={(e) => setFbConfig({ ...fbConfig, accessToken: e.target.value })}
              placeholder="EAA..."
              className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm text-gray-900"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={async () => {
                saveFacebookConfig(fbConfig);
                setFbTestStatus({ testing: true, result: null });
                const result = await testFacebookConnection();
                setFbTestStatus({ testing: false, result });
              }}
              disabled={
                fbTestStatus.testing ||
                (fbConfig.postMethod ?? 'api') !== 'api' ||
                !fbConfig.accessToken?.trim()
              }
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fbTestStatus.testing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <PlayCircle size={20} />
              )}
              {fbTestStatus.testing ? 'Testando...' : 'Testar conexão'}
            </button>
            {fbTestStatus.result && (
              <div
                className={clsx(
                  'p-3 rounded-xl flex items-center gap-2 text-sm',
                  fbTestStatus.result.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                )}
              >
                {fbTestStatus.result.success ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
                {fbTestStatus.result.message}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              saveFacebookConfig(fbConfig);
              setStatus('success');
              setTimeout(() => setStatus('idle'), 3000);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={20} />
            Salvar
          </button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">
            Como obter o Access Token (API do Facebook)
          </h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
            <li>
              <strong>Criar um App na Meta:</strong> Acesse{' '}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                developers.facebook.com
              </a>
            </li>
            <li>Selecione o tipo de App como <strong>Empresas</strong> ou <strong>Consumidor</strong>.</li>
            <li>Adicione o produto <strong>Facebook Login for Business</strong> (ou Login do Facebook).</li>
            <li>Vá para <strong>Ferramentas</strong> &gt; <strong>Gerador de Token</strong>.</li>
            <li>Selecione sua página e as permissões de <code>publish_video</code>, <code>pages_manage_posts</code> e <code>pages_read_engagement</code>.</li>
          </ol>
        </div>
      </div>

      {/* Unified CRM Extension */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Share2 className="text-blue-600" /> Extensão Automator
        </h2>
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-blue-500/10 group-hover:scale-110 transition-transform duration-700">
            <Share2 size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="p-6 bg-white rounded-3xl shadow-xl shadow-slate-200 text-blue-500">
              <Download size={40} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Postagem em Grupos via Extensão</h3>
              <p className="text-slate-500 mb-6 max-w-lg text-sm leading-relaxed">
                Para postar em grupos sem depender da API oficial e evitar bloqueios, utilize nossa extensão dedicada para o navegador. Ela automatiza o clique para você.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a
                  href="/extension/crm-all-in-one.zip"
                  download
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
                >
                  <Download size={20} /> BAIXAR EXTENSÃO (.ZIP)
                </a>

                <button
                  onClick={() => {
                    const guide = document.getElementById('install-guide');
                    if (guide) guide.classList.toggle('hidden');
                  }}
                  className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:border-blue-500 hover:text-blue-600 transition-all font-bold text-sm shadow-sm"
                >
                  COMO INSTALAR?
                </button>
              </div>

              <div id="install-guide" className="hidden mt-8 pt-8 border-t border-slate-200 space-y-6 text-left animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="font-bold text-slate-800 text-sm">Ativando Modo Desenvolvedor:</p>
                    <ul className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
                      <li>Vá para <code className="bg-slate-100 px-1 py-0.5 rounded uppercase font-mono">chrome://extensions</code></li>
                      <li>Ative a chave <span className="font-bold text-blue-600">Modo do Desenvolvedor</span></li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <p className="font-bold text-slate-800 text-sm">Carregando a Pasta:</p>
                    <ul className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
                      <li>Clique em <span className="font-bold">Carregar sem compactação</span></li>
                      <li>Selecione a pasta descompactada da extensão</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
