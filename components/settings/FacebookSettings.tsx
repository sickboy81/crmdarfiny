import React from 'react';
import { Shield, Loader2, PlayCircle, CheckCircle, AlertTriangle, Save } from 'lucide-react';
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
            ...
          </li>
          {/* Instructions follow same pattern */}
        </ol>
      </div>
    </div>
  );
};
