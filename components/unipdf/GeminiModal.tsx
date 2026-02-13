import React, { useState } from 'react';
import { X, Sparkles, Loader2, Wand2 } from 'lucide-react';
import clsx from 'clsx';

interface GeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string, description: string) => Promise<void>;
  isLoading: boolean;
}

export const GeminiModal: React.FC<GeminiModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      await onConfirm(title, description);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white/95 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-white/90 mb-1">
              <Sparkles size={18} className="text-yellow-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Unigravity AI</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Gerar Capa com IA</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Crie uma introdução profissional para seu documento.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            disabled={isLoading}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Título do Documento</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400"
              placeholder="Ex: Relatório Trimestral 2024"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Descrição / Contexto{' '}
              <span className="text-slate-400 font-normal ml-1">(para a IA basear o texto)</span>
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 resize-none"
              placeholder="Descreva o conteúdo dos arquivos anexos e o objetivo deste documento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 text-right">
              A IA irá gerar 2-3 parágrafos formais.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || !description.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all hover:translate-y-[-1px]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Gerar Capa e Baixar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
