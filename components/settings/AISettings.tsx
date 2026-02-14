import React from 'react';
import { Sparkles, BrainCircuit, Bot, Database, Save, CheckCircle, PlayCircle, Loader2, AlertTriangle } from 'lucide-react';
import { AIProvider, BotConfig } from '../../types';
import { PROVIDER_ENDPOINTS } from '../../services/openaiCompatibleService';
import clsx from 'clsx';

const AI_PROVIDER_OPTIONS: { value: AIProvider; label: string; url: string }[] = [
    { value: 'gemini', label: 'Google Gemini', url: 'https://aistudio.google.com/apikey' },
    { value: 'chatgpt', label: 'ChatGPT (OpenAI)', url: 'https://platform.openai.com/api-keys' },
    { value: 'deepseek', label: 'DeepSeek', url: 'https://platform.deepseek.com/api_keys' },
    { value: 'kimi', label: 'Kimi K2 (Moonshot)', url: 'https://platform.moonshot.ai/console/api-keys' },
    { value: 'glm', label: 'GLM (Z.ai)', url: 'https://z.ai/manage-apikey/apikey-list' },
    { value: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/keys' },
];

interface AISettingsProps {
    aiConfig: { provider: AIProvider; apiKeys: Partial<Record<AIProvider, string>>; modelOverrides?: Partial<Record<AIProvider, string>> };
    setAiConfig: (config: any) => void;
    botConfig: BotConfig;
    setBotConfig: (config: BotConfig) => void;
    status: string;
    testStatus: { testing: boolean; result: { success: boolean; message: string } | null };
    handleSaveAIProvider: () => void;
    handleTestAPI: () => void;
    handleSaveBot: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
    aiConfig, setAiConfig, botConfig, setBotConfig, status, testStatus,
    handleSaveAIProvider, handleTestAPI, handleSaveBot
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-6">
                {/* Provedor de IA e chave */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Sparkles className="text-amber-500" /> Provedor de IA
                    </h2>
                    <p className="text-sm text-gray-500">Escolha o modelo de IA para sugestões de resposta, análise de conversa, bot automático e templates.</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provedor</label>
                        <select
                            aria-label="Provedor de IA"
                            value={aiConfig.provider}
                            onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value as AIProvider })}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900"
                        >
                            {AI_PROVIDER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <form onSubmit={(e) => e.preventDefault()}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                            <input
                                type="password"
                                autoComplete="off"
                                value={aiConfig.apiKeys[aiConfig.provider] || ''}
                                onChange={(e) => setAiConfig({
                                    ...aiConfig,
                                    apiKeys: { ...aiConfig.apiKeys, [aiConfig.provider]: e.target.value },
                                })}
                                placeholder={aiConfig.provider === 'gemini' ? 'Ex: AIza...' : 'Cole sua chave aqui'}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono text-sm text-gray-900"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Obtenha em <a href={AI_PROVIDER_OPTIONS.find(o => o.value === aiConfig.provider)?.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">painel do provedor</a>.
                            </p>
                        </form>
                    </div>
                    {aiConfig.provider !== 'gemini' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo (opcional)</label>
                            <input
                                type="text"
                                value={aiConfig.modelOverrides?.[aiConfig.provider] ?? (PROVIDER_ENDPOINTS[aiConfig.provider]?.defaultModel || '')}
                                onChange={(e) => setAiConfig({
                                    ...aiConfig,
                                    modelOverrides: { ...aiConfig.modelOverrides, [aiConfig.provider]: e.target.value || undefined },
                                })}
                                placeholder={PROVIDER_ENDPOINTS[aiConfig.provider]?.defaultModel}
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm text-gray-900"
                            />
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveAIProvider}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            {status === 'success' ? <CheckCircle size={20} /> : <Save size={20} />}
                            Salvar
                        </button>
                        <button
                            type="button"
                            onClick={handleTestAPI}
                            disabled={testStatus.testing || !(aiConfig.apiKeys[aiConfig.provider] || '').trim()}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200"
                        >
                            {testStatus.testing ? <Loader2 size={20} className="animate-spin" /> : <PlayCircle size={20} />}
                            {testStatus.testing ? 'Testando...' : 'Testar API'}
                        </button>
                    </div>
                    {testStatus.result && (
                        <div className={clsx(
                            'p-3 rounded-xl text-sm flex items-center gap-2',
                            testStatus.result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                        )}>
                            {testStatus.result.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                            {testStatus.result.message}
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Bot className="text-purple-600" /> Identidade do Bot
                        </h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Assistente</label>
                        <input
                            type="text"
                            value={botConfig.botName}
                            onChange={(e) => setBotConfig({ ...botConfig, botName: e.target.value })}
                            placeholder="Ex: Ana, DarfinyBot, Atendente..."
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                            <span>Contexto e Regras do Negócio</span>
                            <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">O Cérebro do Bot</span>
                        </label>
                        <textarea
                            value={botConfig.businessContext}
                            onChange={(e) => setBotConfig({ ...botConfig, businessContext: e.target.value })}
                            placeholder="Descreva sua empresa aqui. Ex: Somos a Pizzaria Bella. Nossas pizzas custam R$50. Entregamos em 30min. Aceitamos Pix. Se o cliente reclamar, peça desculpas e ofereça cupom..."
                            className="w-full h-64 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none text-sm leading-relaxed text-gray-900"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            Quanto mais detalhes você der aqui, mais inteligente o bot será. Inclua preços, prazos, políticas de reembolso e tom de voz.
                        </p>
                    </div>

                    {/* Learning Toggle */}
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-lg text-purple-600 border border-purple-100">
                                <Database size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 text-sm">Aprender com Histórico</h4>
                                <p className="text-xs text-gray-500 mt-0.5">O bot vai ler conversas passadas para imitar seu estilo.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setBotConfig({ ...botConfig, useHistoryLearning: !botConfig.useHistoryLearning })}
                            className={clsx(
                                "w-12 h-6 rounded-full relative transition-colors duration-300",
                                botConfig.useHistoryLearning ? "bg-purple-600" : "bg-gray-300"
                            )}
                            title={botConfig.useHistoryLearning ? "Desativar aprendizado" : "Ativar aprendizado"}
                        >
                            <div className={clsx(
                                "w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300",
                                botConfig.useHistoryLearning ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>

                    <button
                        onClick={handleSaveBot}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        {status === 'success' ? <CheckCircle size={20} /> : <Save size={20} />}
                        {status === 'success' ? 'Treinamento Salvo!' : 'Salvar Treinamento'}
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                    <Sparkles className="absolute top-4 right-4 text-purple-400 opacity-50" size={48} />
                    <h3 className="text-xl font-bold mb-4">Dicas de Treinamento</h3>
                    <p className="text-purple-200 text-sm mb-6">
                        Para a IA funcionar como seu atendente, estruture o contexto do negócio assim:
                    </p>

                    <div className="space-y-4 text-sm bg-white/10 p-4 rounded-xl border border-white/10">
                        <div>
                            <strong className="text-purple-300 block mb-1">1. Quem somos:</strong>
                            "Somos a Darfiny, uma consultoria de software."
                        </div>
                        <div>
                            <strong className="text-purple-300 block mb-1">2. O que vendemos:</strong>
                            "Planos Basic (R$100) e Pro (R$200)."
                        </div>
                        <div>
                            <strong className="text-purple-300 block mb-1">3. Regras de Ouro:</strong>
                            "Nunca dê descontos maiores que 10%. Seja sempre formal."
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
