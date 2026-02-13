import React from 'react';
import { Bot } from 'lucide-react';
import { AIAnalysis } from '../../types';

interface AIChatAnalysisProps {
  analysis: AIAnalysis;
  onClose: () => void;
}

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
};
const INTENT_LABELS: Record<string, string> = {
  sales: 'Vendas',
  support: 'Suporte',
  inquiry: 'Consulta',
  spam: 'Spam',
};

export const AIChatAnalysis: React.FC<AIChatAnalysisProps> = ({ analysis, onClose }) => {
  return (
    <div className="bg-purple-50 border-b border-purple-100 p-4 z-10 flex flex-col md:flex-row gap-4 items-start md:items-center text-sm animate-in slide-in-from-top-4 fade-in shrink-0">
      <div className="flex items-center gap-2">
        <Bot className="text-purple-600" size={20} />
        <span className="font-bold text-purple-800">Insight da IA:</span>
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="bg-white/60 p-2 rounded border border-purple-100">
          <span className="text-xs text-purple-500 uppercase font-bold">Sentimento</span>
          <div className="font-medium text-purple-900">
            {SENTIMENT_LABELS[analysis.sentiment] ?? analysis.sentiment}
          </div>
        </div>
        <div className="bg-white/60 p-2 rounded border border-purple-100">
          <span className="text-xs text-purple-500 uppercase font-bold">Intenção</span>
          <div className="font-medium text-purple-900">
            {INTENT_LABELS[analysis.intent] ?? analysis.intent}
          </div>
        </div>
        <div className="bg-white/60 p-2 rounded border border-purple-100">
          <span className="text-xs text-purple-500 uppercase font-bold">Resumo</span>
          <div className="font-medium text-purple-900 truncate">{analysis.summary}</div>
        </div>
      </div>
      <button onClick={onClose} className="text-purple-400 hover:text-purple-700 text-xs">
        Fechar
      </button>
    </div>
  );
};
