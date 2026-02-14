import React, { useState } from 'react';
import {
    Share2,
    Facebook,
    Instagram,
    Twitter,
    Linkedin,
    Video,
    Sparkles,
    Copy,
    Check,
    RefreshCw,
    Image as ImageIcon,
    Send,
    ArrowRight,
    TrendingUp,
    Hash,
    MessageSquare
} from 'lucide-react';
import { generateSocialPosts } from '../services/geminiService';
import { SocialPostVariant } from '../types';
import { toast } from 'sonner';
import clsx from 'clsx';

export const SocialPost: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [tone, setTone] = useState('friendly');
    const [mediaDescription, setMediaDescription] = useState('');
    const [generating, setGenerating] = useState(false);
    const [variants, setVariants] = useState<SocialPostVariant[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            toast.error('Descreva o que deseja postar');
            return;
        }

        setGenerating(true);
        try {
            const result = await generateSocialPosts(topic, tone, mediaDescription);
            setVariants(result);
            if (result.length > 0) {
                toast.success('Postagens geradas com sucesso!');
            } else {
                toast.error('Não foi possível gerar as postagens. Tente novamente.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar postagens');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        toast.success('Copiado para a área de transferência');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'facebook': return <Facebook className="text-blue-600" size={20} />;
            case 'instagram': return <Instagram className="text-pink-600" size={20} />;
            case 'x': return <Twitter className="text-gray-900" size={20} />;
            case 'tiktok': return <Video className="text-black" size={20} />;
            case 'linkedin': return <Linkedin className="text-blue-700" size={20} />;
            default: return <Share2 size={20} />;
        }
    };

    return (
        <div className="flex h-full bg-[#f8fafc] overflow-hidden">
            {/* Sidebar de Configuração */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col p-6 shadow-sm z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                        <Sparkles className="text-white" size={22} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Social AI</h1>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">O que vamos postar?</label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Ex: Oferta de um apartamento na Barra da Tijuca com 3 quartos..."
                            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none leading-relaxed"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tom de Voz</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['friendly', 'professional', 'persuasive', 'luxury'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t)}
                                    className={clsx(
                                        "px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all",
                                        tone === t
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                                    )}
                                >
                                    {t === 'friendly' ? 'Amigável' : t === 'professional' ? 'Profissional' : t === 'persuasive' ? 'Persuasivo' : 'Luxo'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição da Foto/Vídeo (Opcional)</label>
                        <input
                            type="text"
                            value={mediaDescription}
                            onChange={(e) => setMediaDescription(e.target.value)}
                            placeholder="Ex: Foto da varanda gourmet..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating || !topic.trim()}
                    className="mt-6 w-full py-4 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                >
                    {generating ? (
                        <RefreshCw className="animate-spin" size={20} />
                    ) : (
                        <Sparkles size={18} />
                    )}
                    {generating ? 'Gerando...' : 'Gerar Postagens'}
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {variants.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 text-slate-400">
                            <MessageSquare size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Suas postagens aparecerão aqui</h2>
                        <p className="text-slate-500 leading-relaxed">
                            Descreva sua ideia na barra lateral e a nossa IA criará versões otimizadas para todas as suas redes sociais automaticamente.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-12 w-full text-left">
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <TrendingUp className="text-indigo-600 mb-2" size={20} />
                                <h3 className="font-bold text-sm text-slate-800">Alta Conversão</h3>
                                <p className="text-xs text-slate-500 mt-1">Copywriting focado em vendas e retenção.</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <ImageIcon className="text-indigo-600 mb-2" size={20} />
                                <h3 className="font-bold text-sm text-slate-800">Multi-Plataforma</h3>
                                <p className="text-xs text-slate-500 mt-1">Formatos específicos para cada rede social.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header className="flex items-center justify-between border-b border-slate-200 pb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Postagens Geradas</h2>
                                <p className="text-sm text-slate-500 mt-1">Clique para copiar as variações e hashtags.</p>
                            </div>
                            <button
                                onClick={() => setVariants([])}
                                className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm font-bold uppercase tracking-wider"
                            >
                                Limpar Tudo
                            </button>
                        </header>

                        <div className="grid grid-cols-1 gap-6">
                            {variants.map((v, i) => (
                                <div key={i} className="group relative bg-white border border-slate-200 rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300">
                                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                {getPlatformIcon(v.platform)}
                                            </div>
                                            <span className="font-black text-slate-900 uppercase tracking-widest text-xs">{v.platform}</span>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(v.content + '\n\n' + v.hashtags.join(' '), i)}
                                            className={clsx(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                                                copiedIndex === i ? "bg-green-600 text-white" : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm"
                                            )}
                                        >
                                            {copiedIndex === i ? <Check size={14} /> : <Copy size={14} />}
                                            {copiedIndex === i ? 'Copiado' : 'Copiar Texto'}
                                        </button>
                                    </div>

                                    <div className="p-8">
                                        <p className="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                                            {v.content}
                                        </p>

                                        <div className="mt-8 flex flex-wrap gap-2">
                                            <Hash className="text-slate-300" size={16} />
                                            {v.hashtags.map((tag, idx) => (
                                                <span key={idx} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                            Ready to post <ArrowRight size={10} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <footer className="text-center pt-10 pb-20">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Crafted with AI Intelligence</p>
                        </footer>
                    </div>
                )}
            </div>
        </div>
    );
};
