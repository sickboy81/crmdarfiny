import React, { useState } from 'react';
import { Sparkles, Wand2, BrainCircuit, X, MessageSquarePlus, Check, Loader2 } from 'lucide-react';
import { Message, AIExtractedLeadData } from '../../types';
import { extractLeadData, generateMagicReplies } from '../../services/geminiService';
import { toast } from 'sonner';

interface IAAssistantProps {
    messages: Message[];
    contactName: string;
    onApplyData: (data: AIExtractedLeadData) => void;
    onSelectReply: (text: string) => void;
    onClose: () => void;
}

export const IAAssistant: React.FC<IAAssistantProps> = ({
    messages,
    contactName,
    onApplyData,
    onSelectReply,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<'replies' | 'analysis'>('replies');
    const [loading, setLoading] = useState(false);
    const [replies, setReplies] = useState<string[]>([]);
    const [analysisData, setAnalysisData] = useState<AIExtractedLeadData | null>(null);

    const handleGenerateReplies = async () => {
        setLoading(true);
        try {
            const suggestions = await generateMagicReplies(messages, contactName);
            setReplies(suggestions);
            if (suggestions.length === 0) toast.error('Não foi possível gerar sugestões.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const data = await extractLeadData(messages, contactName);
            setAnalysisData(data);
            if (!data) toast.error('Não foi possível extrair dados da conversa.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-run on mount based on tab? Maybe better manual triggers to save tokens.
    // Let's keep it manual or trigger on mount if empty.

    React.useEffect(() => {
        if (activeTab === 'replies' && replies.length === 0 && !loading) {
            handleGenerateReplies();
        }
        if (activeTab === 'analysis' && !analysisData && !loading) {
            handleAnalyze();
        }
    }, [activeTab]);

    return (
        <div className="absolute bottom-20 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in z-50">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2 font-bold">
                    <Sparkles size={18} className="text-yellow-300" />
                    IA Assistant
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('replies')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'replies'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <Wand2 size={16} />
                    Magic Replies
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'analysis'
                        ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <BrainCircuit size={16} />
                    Analisar Lead
                </button>
            </div>

            {/* Content */}
            <div className="p-4 bg-gray-50/50 min-h-[250px] max-h-[400px] overflow-y-auto custom-scrollbar">

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-sm font-medium animate-pulse">Pensando...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'replies' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                                    Sugestões de Resposta
                                </p>
                                {replies.length > 0 ? (
                                    replies.map((reply, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => onSelectReply(reply)}
                                            className="w-full text-left p-3 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl transition-all group relative shadow-sm hover:shadow-md"
                                        >
                                            <p className="text-sm text-gray-700 group-hover:text-indigo-900 leading-relaxed pr-6">
                                                {reply}
                                            </p>
                                            <MessageSquarePlus
                                                size={16}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-indigo-500 transition-colors"
                                            />
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>Nenhuma sugestão gerada.</p>
                                        <button
                                            onClick={handleGenerateReplies}
                                            className="mt-2 text-indigo-600 text-sm font-medium hover:underline"
                                        >
                                            Tentar novamente
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'analysis' && (
                            <div className="space-y-4">
                                {analysisData ? (
                                    <>
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Interesse</span>
                                                <span className="text-sm font-bold text-gray-800 capitalize bg-gray-100 px-2 py-0.5 rounded">{analysisData.interest || 'N/A'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase block">Orçamento Min</span>
                                                    <span className="text-sm text-gray-700">
                                                        {analysisData.budgetMin ? `R$ ${analysisData.budgetMin.toLocaleString()}` : '-'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase block">Orçamento Max</span>
                                                    <span className="text-sm text-gray-700">
                                                        {analysisData.budgetMax ? `R$ ${analysisData.budgetMax.toLocaleString()}` : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block">Localização</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {analysisData.location?.length > 0 ? (
                                                        analysisData.location.map((loc, i) => (
                                                            <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">{loc}</span>
                                                        ))
                                                    ) : <span className="text-sm text-gray-400">-</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block">Tipos de Imóvel</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {analysisData.propertyType?.length > 0 ? (
                                                        analysisData.propertyType.map((type, i) => (
                                                            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">{type}</span>
                                                        ))
                                                    ) : <span className="text-sm text-gray-400">-</span>}
                                                </div>
                                            </div>
                                            {analysisData.notes && (
                                                <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100 text-xs text-yellow-800">
                                                    <span className="font-bold block mb-1">Notas:</span>
                                                    {analysisData.notes}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onApplyData(analysisData)}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check size={18} />
                                            Aplicar ao Perfil do Cliente
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <p>Não foi possível analisar.</p>
                                        <button
                                            onClick={handleAnalyze}
                                            className="mt-2 text-purple-600 text-sm font-medium hover:underline"
                                        >
                                            Tentar novamente
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
