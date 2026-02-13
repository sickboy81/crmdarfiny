import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Message, AIAnalysis } from '../types';
import {
  generateBotAutoResponse,
  generateCustomerSimulation,
  generateSmartReply,
  analyzeConversation,
  rewriteMessage,
} from '../services/geminiService';
import {
  getWhatsAppConfig,
  sendRealWhatsAppMessage,
  uploadWhatsAppMedia
} from '../services/whatsappService';
import { toast } from 'sonner';
import { useAudioRecorder } from './useAudioRecorder';

export const useChat = (selectedChatId: string | null) => {
  const { contacts, messages, addMessage, updateContact } = useAppStore();
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isBotActive, setIsBotActive] = useState(false);
  const [isSimulatingCustomer, setIsSimulatingCustomer] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const audioRecorder = useAudioRecorder();

  const selectedMessages = selectedChatId ? messages[selectedChatId] || [] : [];
  const contact = selectedChatId
    ? contacts.find((c) => c.id === selectedChatId.replace('chat', 'c'))
    : null;

  useEffect(() => {
    setAiAnalysis(null);
    setIsBotActive(false);
    setReplyingTo(null);
  }, [selectedChatId]);

  const handleSendMessage = async (text: string, file: File | null, previewUrl: string | null, typeOverride?: 'note' | 'text') => {
    if ((!text.trim() && !file) || !selectedChatId || !contact) return;

    setIsSending(true);
    const whatsappConfig = getWhatsAppConfig();
    let status: 'sent' | 'failed' = 'sent';

    // Envia a mensagem real (Baileys ou API Oficial) se não for uma nota interna
    if (typeOverride !== 'note') {
      let result;

      if (file) {
        // Envio de mídia real
        const uploadResult = await uploadWhatsAppMedia(file);
        if (uploadResult.success && uploadResult.id) {
          const mediaType = file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('audio/') ? 'audio' :
              file.type.startsWith('video/') ? 'video' : 'document';

          result = await sendRealWhatsAppMessage(contact.phoneNumber, {
            id: uploadResult.id,
            filename: file.name,
            caption: text || undefined
          }, mediaType as any);
        } else {
          result = { success: false, error: uploadResult.error };
        }
      } else {
        // Envio de texto real
        result = await sendRealWhatsAppMessage(contact.phoneNumber, text, 'text');
      }

      if (!result.success) {
        status = 'failed';
        toast.error(`Erro no WhatsApp Real: ${result.error}`);
      }
    }

    const messageType = typeOverride || (file?.type.startsWith('image/') ? 'image' :
      file?.type.startsWith('audio/') ? 'audio' : 'text');

    const content = file ? previewUrl || file.name : text;

    const newMessage: Message = {
      id: Date.now().toString(),
      chatId: selectedChatId,
      senderId: 'me',
      content: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: status,
      type: messageType as any,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderName: replyingTo.senderId === 'me' ? 'Você' : contact.name
      } : undefined
    };

    addMessage(selectedChatId, newMessage);
    setReplyingTo(null);
    setIsSending(false);
    return true;
  };

  const handleQuickAction = (action: 'lead' | 'schedule' | 'analyze') => {
    if (!contact) return;

    switch (action) {
      case 'lead':
        updateContact(contact.id, { pipelineStage: 'qualified', tags: [...new Set([...contact.tags, 'Lead'])] });
        toast.success(`${contact.name} marcado como Lead Qualificado!`);
        break;
      case 'schedule':
        toast.info(`Agendamento para ${contact.name} aberto.`);
        break;
      case 'analyze':
        handleAnalyzeChat();
        break;
    }
  };

  const handleSmartReply = async () => {
    if (!selectedChatId || !contact) return '';
    setIsAIThinking(true);
    try {
      const suggestion = await generateSmartReply(selectedMessages, contact.name);
      return suggestion;
    } catch (error) {
      toast.error('Erro ao gerar sugestão.');
      return '';
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleAnalyzeChat = async () => {
    if (!selectedChatId || !contact) return;
    setIsAIThinking(true);
    try {
      const analysis = await analyzeConversation(selectedMessages, contact.name);
      if (analysis) {
        setAiAnalysis(analysis as AIAnalysis);
        return true;
      }
    } catch (error) {
      toast.error('Erro ao analisar conversa.');
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleRewrite = async (text: string, tone: 'formal' | 'friendly' | 'persuasive') => {
    setIsAIThinking(true);
    try {
      const rewritten = await rewriteMessage(text, tone);
      return rewritten;
    } catch (error) {
      toast.error('Erro ao reescrever mensagem.');
      return text;
    } finally {
      setIsAIThinking(false);
    }
  };

  return {
    messages: selectedMessages,
    contact,
    isAIThinking,
    isBotActive,
    setIsBotActive,
    isSimulatingCustomer,
    aiAnalysis,
    setAiAnalysis,
    isSending,
    replyingTo,
    setReplyingTo,
    handleSendMessage,
    handleSmartReply,
    handleAnalyzeChat,
    handleQuickAction,
    handleRewrite,
    audioRecorder,
    showEmojiPicker,
    setShowEmojiPicker,
    showTemplateSelector,
    setShowTemplateSelector,
    updateContact,
  };
};
