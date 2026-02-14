import React, { useEffect, useRef } from 'react';
import { Message } from '../../types';
import { Play, Pause, CornerUpRight, Image as ImageIcon, FileText, Download, Lock, StickyNote, Save } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { toast } from 'sonner';
import clsx from 'clsx';

interface ChatMessageListProps {
  messages: Message[];
  onReply?: (msg: Message) => void;
  onImageClick?: (url: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  onReply,
  onImageClick
}) => {
  const { addImage, addNotification, settings } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isPrivacyMode = settings.crm_preferences?.blurSensitive;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 z-0 custom-scrollbar bg-[#e5ddd5]/50">
      {messages.map((msg) => {
        if (msg.type === 'note') {
          return (
            <div key={msg.id} className="flex justify-center my-4 opacity-80 hover:opacity-100 transition-opacity">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-[85%] text-sm text-yellow-800 flex flex-col gap-1 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-yellow-600">
                  <Lock size={12} />
                  Nota Interna Privada
                </div>
                <p className={clsx("whitespace-pre-wrap leading-relaxed", isPrivacyMode && "privacy-blur")}>{msg.content}</p>
                <span className="text-[10px] text-yellow-500 self-end mt-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={clsx('flex group', msg.senderId === 'me' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={clsx(
                'max-w-[85%] md:max-w-[70%] rounded-xl p-2.5 shadow-sm relative group transition-all',
                msg.senderId === 'me'
                  ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none'
                  : 'bg-white text-gray-800 rounded-tl-none'
              )}
            >
              {/* Reply Label */}
              <div className="mb-2 p-2 bg-black/5 rounded-lg border-l-4 border-l-green-600/50 text-xs">
                <p className={clsx("font-bold text-green-700 mb-0.5", isPrivacyMode && "privacy-blur")}>{msg.replyTo.senderName}</p>
                <p className={clsx("text-gray-600 truncate", isPrivacyMode && "privacy-blur")}>{msg.replyTo.content}</p>
              </div>

              {/* Quick Reply Button on Hover */}
              <button
                onClick={() => onReply?.(msg)}
                className={clsx(
                  "absolute -right-10 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all",
                  msg.senderId === 'me' && "left-auto -left-10"
                )}
                title="Responder"
              >
                <CornerUpRight size={16} />
              </button>

              {msg.type === 'image' && (
                <div className="mb-1 cursor-pointer overflow-hidden rounded-lg" onClick={() => onImageClick?.(msg.content)}>
                  <img
                    src={msg.content}
                    alt="Imagem enviada"
                    className="rounded-lg max-h-80 object-cover w-full hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addImage({
                        id: `chat-${msg.id}`,
                        url: msg.content,
                        name: `Chat Image ${msg.timestamp}`,
                        size: 0,
                        type: 'image/jpeg',
                        timestamp: new Date().toLocaleString(),
                        source: 'chat',
                        tags: ['WhatsApp']
                      });
                      addNotification({
                        id: `save-${msg.id}`,
                        title: 'Imagem Salva',
                        message: 'A imagem foi adicionada à sua galeria.',
                        timestamp: new Date().toLocaleTimeString(),
                        type: 'success',
                        read: false
                      });
                      toast.success('Imagem salva na galeria!');
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur rounded-full text-gray-700 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Salvar na Galeria"
                  >
                    <Save size={16} />
                  </button>
                </div>
              )}

              {msg.type === 'audio' && (
                <div className="flex items-center gap-3 p-1 min-w-[200px]">
                  <button className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm" title="Reproduzir áudio">
                    <Play size={20} fill="currentColor" />
                  </button>
                  <div className="flex-1 h-1 bg-gray-200 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-green-500 w-[40%]" />
                  </div>
                  <span className="text-[11px] text-gray-400">0:42</span>
                </div>
              )}

              {msg.type === 'document' && (
                <div className="flex items-center gap-3 p-2 bg-black/5 rounded-lg border border-black/10 min-w-[200px]">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-sm font-semibold truncate text-gray-800", isPrivacyMode && "privacy-blur")}>{msg.content.split('/').pop() || 'Documento.pdf'}</p>
                    <p className="text-[10px] text-gray-500 uppercase">PDF • 1.2 MB</p>
                  </div>
                  <a
                    href={msg.content}
                    download
                    className="p-1.5 hover:bg-black/5 rounded-full text-gray-400"
                    title="Baixar arquivo"
                  >
                    <Download size={18} />
                  </a>
                </div>
              )}

              {msg.type === 'text' && (
                <p className={clsx("text-[14px] leading-[19px] whitespace-pre-wrap px-1", isPrivacyMode && "privacy-blur")}>{msg.content}</p>
              )}

              {msg.type === 'system' && (
                <p className="text-[12px] text-center italic text-gray-500 w-full py-2">{msg.content}</p>
              )}

              <div className="flex items-center justify-end gap-1 mt-1 px-1">
                <span className="text-[10px] text-gray-400 font-medium uppercase">
                  {msg.timestamp}
                </span>
                {msg.senderId === 'me' && (
                  <span className={clsx(
                    "text-[14px]",
                    msg.status === 'read' ? "text-blue-400" : "text-gray-400"
                  )}>
                    {msg.status === 'sent' ? '✓' : '✓✓'}
                  </span>
                )}
                {msg.status === 'failed' && <span className="text-red-500 font-bold ml-1 text-xs">!</span>}
              </div>
            </div>
          </div>
        ); // End normal message return
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
