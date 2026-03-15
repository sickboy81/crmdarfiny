import React from 'react';
import { MessageSquare, ExternalLink, ShieldCheck, Zap, Download, Info } from 'lucide-react';
import { toast } from 'sonner';

export const ExternalWhatsAppView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 relative overflow-hidden h-full">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-2xl w-full bg-white rounded-[32px] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative z-10 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm">
          <MessageSquare size={40} className="text-green-600" />
        </div>

        <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">
          WhatsApp Web <span className="text-green-600">Oficial</span>
        </h1>

        <p className="text-slate-600 text-lg leading-relaxed mb-10">
          Agora você pode usar a interface oficial do WhatsApp com todo o poder do seu CRM integrado diretamente na página.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-10">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-2 text-indigo-600 font-bold text-sm">
              <ShieldCheck size={18} />
              SEGURO E OFICIAL
            </div>
            <p className="text-xs text-slate-500">
              Use o site oficial sem riscos de bloqueio ou limitações da versão simulada.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-2 text-indigo-600 font-bold text-sm">
              <Zap size={18} />
              CRM INTEGRADO
            </div>
            <p className="text-xs text-slate-500">
              Uma barra lateral aparece direto no WhatsApp para você gerenciar seus leads em tempo real.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-green-900/10 text-lg hover:-translate-y-1"
          >
            Abrir WhatsApp
            <ExternalLink size={20} />
          </a>

          <a
            href="/extension.zip"
            download="darfiny-crm-extension.zip"
            onClick={() => {
              toast.info('Instruções de Instalação', {
                description: 'Após baixar, descompacte o arquivo. Acesse chrome://extensions, ative o Modo Desenvolvedor e carregue a pasta descompactada.',
                duration: 8000,
              });
            }}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl transition-all shadow-lg shadow-slate-900/10 text-lg hover:-translate-y-1"
          >
            Baixar Extensão
            <Download size={20} />
          </a>
        </div>

        <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Info size={20} />
            </div>
            <h3 className="font-bold text-indigo-900">Como instalar a extensão:</h3>
          </div>
          <ol className="space-y-3">
            {[
              'Acesse a pasta do projeto e localize a pasta "extension"',
              'No Chrome, abra chrome://extensions',
              'Ative o "Modo do desenvolvedor" no topo direito',
              'Clique em "Carregar sem compactação" e selecione a pasta "extension"'
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-indigo-700">
                <span className="font-black text-indigo-400">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-xs font-medium uppercase tracking-widest">
        Darfiny CRM • Conectando você ao sucesso
      </p>
    </div>
  );
};
