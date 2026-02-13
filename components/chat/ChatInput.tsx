import React, { useRef, useEffect, useState } from 'react';
import {
  Send,
  Paperclip,
  Plus,
  Wand2,
  Sparkles,
  X,
  FileText,
  Mic,
  Smile,
  Trash2,
  StickyNote,
  Bot,
  Calendar,
  MapPin,
  Lock,
  RefreshCw,
  Home
} from 'lucide-react';
import { Message } from '../../types';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import clsx from 'clsx';
import { toast } from 'sonner';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (type?: 'note' | 'text') => void; // Updated signature
  selectedFile: File | null;
  previewUrl: string | null;
  clearFile: () => void;
  onFileClick: () => void;
  isSending: boolean;
  sendingError: string | null;
  successMessage: string | null;
  isBotActive: boolean;
  setIsBotActive: (value: boolean) => void;
  isAIThinking: boolean;
  onSmartReply: () => void;
  onTemplateClick: () => void;
  isActionsMenuOpen: boolean;
  setIsActionsMenuOpen: (value: boolean) => void;
  onQuickAction: (action: 'lead' | 'schedule' | 'analyze') => void;
  replyingTo: Message | null;
  clearReply: () => void;

  // Emoji Picker & Templates
  showEmojiPicker: boolean;
  setShowEmojiPicker: (value: boolean) => void;
  showTemplateSelector: boolean;
  setShowTemplateSelector: (value: boolean) => void;

  // Audio Recorder
  audioRecorder: {
    isRecording: boolean;
    recordingTime: number;
    audioBlob: Blob | null;
    startRecording: () => void;
    stopRecording: () => void;
    cancelRecording: () => void;
    formatTime: (s: number) => string;
    setAudioBlob: (b: Blob | null) => void;
  };
  onSendAudio: (blob: Blob) => void;
  onOpenPropertyPicker: () => void;

  // New Features
  onRewrite: (text: string, tone: 'formal' | 'friendly' | 'persuasive') => Promise<string>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSendMessage,
  selectedFile,
  previewUrl,
  clearFile,
  onFileClick,
  isSending,
  isBotActive,
  setIsBotActive,
  isAIThinking,
  onSmartReply,
  onTemplateClick,
  isActionsMenuOpen,
  setIsActionsMenuOpen,
  onQuickAction,
  replyingTo,
  clearReply,
  showEmojiPicker,
  setShowEmojiPicker,
  showTemplateSelector,
  setShowTemplateSelector,
  audioRecorder,
  onSendAudio,
  onOpenPropertyPicker,
  onRewrite
}) => {
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [showRewriteOptions, setShowRewriteOptions] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowEmojiPicker]);

  const handleEmojiClick = (emojiData: any) => {
    setInput(input + emojiData.emoji);
  };

  const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, cancelRecording, formatTime, setAudioBlob } = audioRecorder;

  useEffect(() => {
    if (audioBlob) {
      onSendAudio(audioBlob);
      setAudioBlob(null);
    }
  }, [audioBlob, onSendAudio, setAudioBlob]);

  const handleRewriteClick = async (tone: 'formal' | 'friendly' | 'persuasive') => {
    if (!input.trim()) {
      toast.error('Digite algo para reescrever.');
      return;
    }
    setIsRewriting(true);
    setShowRewriteOptions(false);
    const text = await onRewrite(input, tone);
    setInput(text);
    setIsRewriting(false);
    toast.success(`Texto reescrito (Tom: ${tone})`);
  };

  const QUICK_CHIPS = [
    { label: '👋 Olá', text: 'Olá, tudo bem? Como posso ajudar?' },
    { label: '📅 Agendar', text: 'Vamos agendar uma visita? Qual seu melhor horário?' },
    { label: '📍 Local', text: 'Segue a localização do imóvel:' },
    { label: '📄 Docs', text: 'Poderia me enviar os documentos para análise?' },
    { label: '🤔 Interesse?', text: 'Olá! Ainda tem interesse neste imóvel?' },
  ];

  return (
    <div className={clsx(
      "p-4 border-t z-10 relative shrink-0 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)] transition-colors duration-300",
      isNoteMode ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"
    )}>

      {/* Quick Chips Row */}
      {!isNoteMode && !isRecording && (
        <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar mb-1">
          {QUICK_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => setInput(chip.text)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap transition-colors border border-transparent hover:border-green-200 flex items-center gap-1"
            >
              {chip.label}
            </button>
          ))}
          <button
            onClick={onSmartReply}
            className="px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-full text-xs font-medium whitespace-nowrap transition-colors border border-purple-100 flex items-center gap-1"
          >
            <Sparkles size={12} />
            Sugestão IA
          </button>
        </div>
      )}

      {/* Templates Selector */}
      {showTemplateSelector && (
        <div className="absolute bottom-full left-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 mb-2 w-80 z-30 animate-in slide-in-from-bottom-2">
          {/* ... keeping existing template selector logic ... */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Templates WhatsApp</h3>
            <button onClick={() => setShowTemplateSelector(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {['saudacao_inicial', 'boas_vindas_crm', 'agendamento_confirmado', 'proposta_comercial'].map(t => (
              <button
                key={t}
                onClick={() => {
                  setInput(`Olá! Gostaria de falar sobre o template: ${t}`);
                  setShowTemplateSelector(false);
                }}
                className="w-full p-3 rounded-xl bg-gray-50 hover:bg-green-50 text-left text-sm border border-gray-100 hover:border-green-200 transition-all group"
              >
                <p className="font-semibold text-gray-700 group-hover:text-green-700">{t.replace(/_/g, ' ').toUpperCase()}</p>
                <p className="text-[11px] text-gray-400">Template aprovado via Meta API</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rewrite Options Popover */}
      {showRewriteOptions && (
        <div className="absolute bottom-20 right-4 bg-white rounded-xl shadow-2xl border border-purple-100 p-2 z-40 animate-in slide-in-from-bottom-2 w-48">
          <p className="text-xs font-bold text-gray-400 uppercase px-2 py-1">Melhorar Texto</p>
          <button onClick={() => handleRewriteClick('formal')} className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded-lg text-sm text-gray-700">👔 Formal</button>
          <button onClick={() => handleRewriteClick('friendly')} className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded-lg text-sm text-gray-700">😊 Amigável</button>
          <button onClick={() => handleRewriteClick('persuasive')} className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded-lg text-sm text-gray-700">🚀 Persuasivo</button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full left-4 mb-2 z-30 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
            lazyLoadEmojis={true}
            searchPlaceholder="Buscar emoji..."
          />
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="absolute bottom-full left-0 w-full bg-white/95 border-b border-gray-100 p-3 px-6 backdrop-blur-sm z-20 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <FileText size={24} />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              title="Remover arquivo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="absolute bottom-full left-0 w-full bg-gray-50 border-b border-gray-200 p-3 px-6 z-20 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-l-4 border-l-green-500 pl-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-green-600 mb-0.5">
                Respondendo a {replyingTo.senderId === 'me' ? 'Você' : 'Cliente'}
              </p>
              <p className="text-sm text-gray-500 truncate">{replyingTo.content}</p>
            </div>
            <button
              onClick={clearReply}
              className="p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
              title="Cancelar resposta"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Actual Input Controls */}
      <div className="flex items-center gap-2 md:gap-3 relative">
        {isRecording ? (
          <div className="flex-1 flex items-center gap-4 bg-gray-50 rounded-full px-6 py-2 border border-green-200 animate-pulse">
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="font-mono text-lg font-bold">{formatTime(recordingTime)}</span>
            </div>
            <div className="flex-1 text-gray-400 text-sm">Gravando áudio...</div>
            <button onClick={cancelRecording} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Cancelar gravação">
              <Trash2 size={24} />
            </button>
            <button onClick={stopRecording} className="p-3 bg-green-500 text-white rounded-full shadow-lg" title="Parar e enviar">
              <Send size={24} />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <button
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                className={clsx(
                  'p-2.5 rounded-full transition-all duration-300',
                  isActionsMenuOpen
                    ? 'bg-green-600 text-white rotate-[135deg] shadow-lg'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
                title="Ações Rápidas"
              >
                <Plus size={24} />
              </button>
              {/* Actions Menu (Same as before) can be kept or enhanced */}
              {isActionsMenuOpen && (
                <div className="absolute bottom-16 left-0 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-30 animate-in slide-in-from-bottom-4 fade-in">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">CRM Quick Actions</p>
                  {/* ... reusing previous buttons ... */}
                  <button onClick={() => onQuickAction('lead')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 text-left text-sm text-gray-700 transition-colors group">
                    <div className="bg-orange-100 text-orange-600 p-2 rounded-lg group-hover:bg-orange-200"><Sparkles size={18} /></div>
                    <div><p className="font-semibold">Qualificar como Lead</p></div>
                  </button>
                  <button onClick={() => onQuickAction('schedule')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-left text-sm text-gray-700 transition-colors group">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-200"><Calendar size={18} /></div>
                    <div><p className="font-semibold">Agendar Reunião</p></div>
                  </button>
                  <button onClick={() => onQuickAction('analyze')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 text-left text-sm text-gray-700 transition-colors group">
                    <div className="bg-purple-100 text-purple-600 p-2 rounded-lg group-hover:bg-purple-200"><Bot size={18} /></div>
                    <div><p className="font-semibold">Analisar com IA</p></div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsNoteMode(!isNoteMode)}
              className={clsx(
                "p-2.5 rounded-full transition-colors hidden sm:block",
                isNoteMode ? "bg-yellow-100 text-yellow-600" : "text-gray-400 hover:bg-yellow-50 hover:text-yellow-500"
              )}
              title="Modo Nota Interna (Privado)"
            >
              <StickyNote size={24} />
            </button>

            <button
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className={clsx(
                "p-2.5 rounded-full transition-colors hidden sm:block",
                showTemplateSelector ? "bg-purple-100 text-purple-600" : "text-purple-600 hover:bg-purple-50"
              )}
              title="Templates WhatsApp"
            >
              <Wand2 size={24} />
            </button>

            <button
              onClick={onOpenPropertyPicker}
              className="p-2.5 rounded-full transition-colors hidden sm:block text-orange-600 hover:bg-orange-50"
              title="Enviar Imóvel"
            >
              <Home size={24} />
            </button>

            <button
              onClick={onFileClick}
              className={clsx(
                'p-2.5 rounded-full transition-colors hidden sm:block',
                selectedFile ? 'bg-green-100 text-green-600' : 'text-gray-500 hover:bg-gray-100'
              )}
              title="Anexar arquivo"
            >
              <Paperclip size={24} />
            </button>

            <div className={clsx(
              "flex-1 relative flex items-center gap-2 rounded-full px-4 py-1.5 border transition-all min-w-0",
              isNoteMode ? "bg-yellow-100 border-yellow-300 focus-within:bg-yellow-50" : "bg-[#f0f2f5] border-transparent focus-within:bg-white focus-within:border-gray-200 focus-within:shadow-sm"
            )}>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={clsx(
                  "p-1.5 rounded-full transition-colors",
                  showEmojiPicker ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"
                )}
                title="Emojis"
              >
                <Smile size={22} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSendMessage(isNoteMode ? 'note' : 'text')}
                placeholder={isNoteMode ? "Adicionar nota interna privada..." : "Digite uma mensagem..."}
                disabled={isSending}
                className="flex-1 bg-transparent py-2 text-[15px] focus:outline-none min-w-0"
              />

              {/* Rewrite Button (Improver) */}
              {input.trim() && !isNoteMode && (
                <button
                  onClick={() => setShowRewriteOptions(!showRewriteOptions)}
                  className={clsx(
                    "p-1.5 rounded-full transition-colors shrink-0",
                    showRewriteOptions ? "bg-purple-200 text-purple-700" : "text-purple-400 hover:bg-purple-100"
                  )}
                  title="Melhorar mensagem com IA"
                  disabled={isRewriting}
                >
                  <RefreshCw size={18} className={isRewriting ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            {input.trim() || selectedFile ? (
              <button
                onClick={() => onSendMessage(isNoteMode ? 'note' : 'text')}
                className={clsx(
                  'p-3 rounded-full transition-all shadow-md flex items-center justify-center text-white hover:scale-105 active:scale-95 shrink-0',
                  isSending && 'opacity-70 animate-pulse',
                  isNoteMode ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"
                )}
                disabled={isSending}
                title={isNoteMode ? "Salvar Nota" : "Enviar mensagem"}
              >
                {isNoteMode ? <Lock size={20} /> : <Send size={20} />}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-all active:scale-95 shrink-0"
                title="Gravar áudio"
              >
                <Mic size={24} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
