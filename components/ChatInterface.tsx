import React, { useState, useRef } from 'react';
import { PanelRight, BrainCircuit, MessageSquare, X, Download, Maximize2, Sparkles, User, LogOut, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { ChatList } from './chat/ChatList';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';
import { AIChatAnalysis } from './chat/AIChatAnalysis';
import { IAAssistant } from './chat/IAAssistant';
import { ChatCRMSidebar } from './chat/ChatCRMSidebar';
import { PropertyPicker } from './properties/PropertyPicker';
import { ScheduleModal } from './schedule/ScheduleModal';
import { PIPELINE_STAGES } from '../constants';
import { useChat } from '../hooks/useChat';
import { useAppStore } from '../stores/useAppStore';
import { useAutomation } from '../hooks/useAutomation';
import { generateCustomerSimulation } from '../services/geminiService';
import { toast } from 'sonner';

export const ChatInterface: React.FC = () => {
    const { selectedContactId: globalSelectedContactId, setSelectedContactId: setGlobalSelectedContactId, addMessage } = useAppStore();
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const automation = useAutomation();

    // Sync global state to local state (Navigation from other views)
    React.useEffect(() => {
        if (globalSelectedContactId && globalSelectedContactId !== selectedChatId) {
            setSelectedChatId(globalSelectedContactId);
        }
    }, [globalSelectedContactId]);

    // Sync local state to global (Selection in list)
    const handleSelectChat = (id: string | null) => {
        setSelectedChatId(id);
        setGlobalSelectedContactId(id);
    };

    const {
        messages,
        contact,
        isAIThinking,
        isBotActive,
        setIsBotActive,
        aiAnalysis,
        setAiAnalysis,
        isSending,
        replyingTo,
        setReplyingTo,
        handleSendMessage,
        handleSmartReply,
        handleAnalyzeChat,
        handleQuickAction,
        audioRecorder,
        showEmojiPicker,
        setShowEmojiPicker,
        showTemplateSelector,
        setShowTemplateSelector,
        updateContact,
        handleRewrite // Destructure handleRewrite
    } = useChat(selectedChatId);


    const [input, setInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [isContactInfoOpen, setIsContactInfoOpen] = useState(true);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
    const [showPropertyPicker, setShowPropertyPicker] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [isIAAssistantOpen, setIsIAAssistantOpen] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onSendMessage = async () => {
        const success = await handleSendMessage(input, selectedFile, previewUrl);
        if (success) {
            setInput('');
            clearFile();
        }
    };

    const onSendAudio = async (blob: Blob) => {
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        const success = await handleSendMessage('', file, null);
        if (success) {
            toast.success('Áudio enviado com sucesso!');
        }
    };

    const clearFile = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null);
            }
        }
        event.target.value = '';
    };

    const onSmartReply = async () => {
        const suggestion = await handleSmartReply();
        if (suggestion) setInput(suggestion);
    };

    const handleSimulateCustomer = async () => {
        if (!selectedChatId || !contact) return;
        setIsSimulating(true);
        try {
            // 1. Generate simulation text
            const text = await generateCustomerSimulation(messages, contact.name, 'Interessado em imóveis, direto e objetivo');

            // 2. Add to store
            const newMessage = {
                id: Date.now().toString(),
                chatId: selectedChatId,
                senderId: contact.id, // From contact
                content: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'read',
                type: 'text'
            } as any;

            addMessage(selectedChatId, newMessage);
            toast.success(`Cliente simulado: "${text.substring(0, 20)}..."`);

            // 3. Trigger Automation Check
            automation.handleIncomingMessage(selectedChatId, newMessage);

        } catch (error) {
            toast.error('Erro na simulação');
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="flex h-full bg-white relative animate-fade-in overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                title="Selecionar arquivo"
            />

            {/* Sidebar List */}
            <ChatList selectedChatId={selectedChatId} onSelectChat={handleSelectChat} />

            {/* Main Chat Area */}
            {selectedChatId && contact ? (
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] relative min-w-0">
                        {/* Chat Header */}
                        <div className="bg-white p-3 px-6 border-b border-gray-200 flex justify-between items-center z-10 shadow-sm shrink-0">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleSelectChat(null)}
                                    className="md:hidden text-gray-500 mr-2 p-1 hover:bg-gray-100 rounded-full"
                                    title="Voltar para a lista"
                                >
                                    <X size={20} />
                                </button>
                                <div
                                    className="relative cursor-pointer"
                                    onClick={() => setMediaPreviewUrl(contact.avatar)}
                                >
                                    <img
                                        src={contact.avatar}
                                        alt={contact.name}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                    />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div
                                    className="cursor-pointer group"
                                    onClick={() => setIsContactInfoOpen(true)}
                                >
                                    <h3 className="font-bold text-gray-800 text-[15px] group-hover:text-green-600 transition-colors">
                                        {contact.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] text-gray-400 font-medium tracking-wide">
                                            VISTO POR ÚLTIMO HOJE ÀS {contact.lastSeen}
                                        </p>
                                        {/* Pipeline Badge */}
                                        <select
                                            onClick={(e) => e.stopPropagation()}
                                            value={contact.pipelineStage || 'new'}
                                            onChange={(e) => updateContact(contact.id, { pipelineStage: e.target.value as any })}
                                            className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-100 outline-none cursor-pointer hover:bg-purple-100"
                                        >
                                            {PIPELINE_STAGES.map(activeStage => (
                                                <option key={activeStage.id} value={activeStage.id}>
                                                    {activeStage.label.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Simulation & Test Buttons */}
                                <div className="hidden lg:flex items-center gap-1 mr-2 border-r border-gray-200 pr-2">
                                    <button
                                        onClick={handleSimulateCustomer}
                                        disabled={isSimulating}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs font-medium transition-colors"
                                        title="Simular mensagem recebida do cliente para testar automação"
                                    >
                                        <User size={14} />
                                        {isSimulating ? '...' : 'Simular Cliente'}
                                    </button>
                                    <button
                                        onClick={() => automation.triggerClosing(selectedChatId)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-xs font-medium transition-colors"
                                        title="Enviar mensagem de encerramento"
                                    >
                                        <LogOut size={14} />
                                        Encerrar
                                    </button>
                                    <button
                                        onClick={() => automation.triggerManualFollowUp(selectedChatId)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 text-xs font-medium transition-colors"
                                        title="Checar se precisa de follow-up"
                                    >
                                        <CheckCircle size={14} />
                                        Follow-up
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsIAAssistantOpen(!isIAAssistantOpen)}
                                    className={clsx(
                                        'p-2.5 rounded-full transition-colors',
                                        isIAAssistantOpen ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:bg-gray-100'
                                    )}
                                    title="Assistente de IA"
                                >
                                    <Sparkles size={20} />
                                </button>
                                <button
                                    onClick={() => setIsBotActive(!isBotActive)}
                                    className={clsx(
                                        'p-2.5 rounded-full transition-all',
                                        isBotActive ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                                    )}
                                    title={isBotActive ? "Desativar assistente automático" : "Ativar assistente automático"}
                                >
                                    <MessageSquare size={20} className={isBotActive ? "animate-pulse" : ""} />
                                </button>
                                <button
                                    onClick={() => setIsContactInfoOpen(!isContactInfoOpen)}
                                    className={clsx(
                                        'p-2.5 rounded-full transition-colors',
                                        isContactInfoOpen ? 'bg-gray-100 text-green-600' : 'text-gray-400 hover:bg-gray-100'
                                    )}
                                    title={isContactInfoOpen ? "Fechar painel lateral" : "Abrir painel lateral"}
                                >
                                    <PanelRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 relative">
                            <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-[0.06] pointer-events-none z-0"></div>

                            {/* IA Assistant Overlay */}
                            {isIAAssistantOpen && (
                                <IAAssistant
                                    messages={messages}
                                    contactName={contact.name}
                                    onClose={() => setIsIAAssistantOpen(false)}
                                    onSelectReply={(text) => {
                                        setInput(text);
                                        setIsIAAssistantOpen(false);
                                    }}
                                    onApplyData={(data) => {
                                        updateContact(contact.id, {
                                            pipelineStage: 'qualified',
                                            notes: (contact.notes || '') + (data.notes ? `\n\n[IA Info]: ${data.notes}` : ''),
                                            realEstatePreferences: {
                                                type: data.interest || 'buy',
                                                budgetMin: data.budgetMin || undefined,
                                                budgetMax: data.budgetMax || undefined,
                                                propertyType: data.propertyType,
                                                bedrooms: data.bedrooms || undefined,
                                                location: data.location
                                            }
                                        });
                                        toast.success('Perfil do contato atualizado pela IA!');
                                        setIsIAAssistantOpen(false);
                                    }}
                                />
                            )}

                            {aiAnalysis && (
                                <div className="z-10 bg-white/90 backdrop-blur-md border-b border-purple-100 mx-4 mt-2 rounded-xl shadow-lg animate-in slide-in-from-top-2">
                                    <AIChatAnalysis analysis={aiAnalysis} onClose={() => setAiAnalysis(null)} />
                                </div>
                            )}

                            <ChatMessageList
                                messages={messages}
                                onReply={setReplyingTo}
                                onImageClick={setMediaPreviewUrl}
                            />

                            {isAIThinking && (
                                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-full shadow-lg border border-purple-100 flex items-center gap-2 text-[13px] text-purple-600 animate-bounce">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                    IA pensando...
                                </div>
                            )}

                            <ChatInput
                                input={input}
                                setInput={setInput}
                                onSendMessage={onSendMessage}
                                selectedFile={selectedFile}
                                previewUrl={previewUrl}
                                clearFile={clearFile}
                                onFileClick={() => fileInputRef.current?.click()}
                                isSending={isSending}
                                sendingError={null}
                                successMessage={null}
                                isBotActive={isBotActive}
                                setIsBotActive={setIsBotActive}
                                isAIThinking={isAIThinking}
                                onSmartReply={() => setIsIAAssistantOpen(true)} // Atalho do botão smart reply original abre o assistente agora
                                onTemplateClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                isActionsMenuOpen={isActionsMenuOpen}
                                setIsActionsMenuOpen={setIsActionsMenuOpen}
                                replyingTo={replyingTo}
                                clearReply={() => setReplyingTo(null)}
                                showEmojiPicker={showEmojiPicker}
                                setShowEmojiPicker={setShowEmojiPicker}
                                showTemplateSelector={showTemplateSelector}
                                setShowTemplateSelector={setShowTemplateSelector}
                                audioRecorder={audioRecorder}
                                onSendAudio={onSendAudio}
                                onOpenPropertyPicker={() => setShowPropertyPicker(true)}
                                onRewrite={handleRewrite} // Pass prop
                                onQuickAction={(action) => {
                                    if (action === 'schedule') {
                                        setShowScheduleModal(true);
                                    } else {
                                        handleQuickAction(action);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {isContactInfoOpen && (
                        <ChatCRMSidebar
                            contact={contact}
                            onClose={() => setIsContactInfoOpen(false)}
                            onAvatarClick={setMediaPreviewUrl}
                        />
                    )}

                    {showPropertyPicker && (
                        <PropertyPicker
                            onClose={() => setShowPropertyPicker(false)}
                            onSelect={(property) => {
                                const message = `🏢 *${property.title}*\n\n${property.description}\n\n💰 *${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}*\n\n📍 ${property.neighborhood}, ${property.city}\n\n🔗 Código: ${property.code}`;
                                handleSendMessage(message, null, property.photos[0]);
                                setShowPropertyPicker(false);
                            }}
                        />
                    )}

                    {showScheduleModal && (
                        <ScheduleModal
                            contact={contact}
                            onClose={() => setShowScheduleModal(false)}
                            onSchedule={(meeting) => {
                                const date = new Date(meeting.date);
                                const formattedDate = date.toLocaleDateString('pt-BR');
                                const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                                const message = `🗓️ *Agendamento Confirmado*\n\n📅 Data: ${formattedDate}\n⏰ Horário: ${formattedTime}\n📝 Tipo: ${meeting.type === 'visit' ? 'Visita ao Imóvel' : meeting.type === 'call' ? 'Chamada' : 'Assinatura'}\n\nEstarei aguardando!`;

                                handleSendMessage(message, null, null);
                                setShowScheduleModal(false);
                                toast.success('Agendamento realizado com sucesso!');
                            }}
                        />
                    )}
                </div>
            ) : (
                <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f8f9fa] text-gray-400 border-b-[6px] border-green-500 relative">
                    <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] opacity-[0.03] pointer-events-none"></div>
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                        <MessageSquare size={48} className="text-gray-200 ml-1" />
                    </div>
                    <h2 className="text-3xl font-light text-gray-700 mb-2">Vibecode CRM</h2>
                    <p className="max-w-md text-center text-sm leading-relaxed text-gray-500">
                        Conecte-se com seus clientes via WhatsApp, organize seu pipeline e use inteligência artificial para otimizar suas vendas.
                    </p>
                    <div className="mt-12 flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Online e Seguro
                    </div>
                </div>
            )}

            {mediaPreviewUrl && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300"
                    onClick={() => setMediaPreviewUrl(null)}
                >
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                        <div className="flex items-center gap-3 text-white">
                            <img src={contact?.avatar} className="w-8 h-8 rounded-full" alt="" />
                            <span className="font-medium">{contact?.name}</span>
                        </div>
                        <div className="flex gap-4">
                            <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors" title="Download">
                                <Download size={20} />
                            </button>
                            <button
                                onClick={() => setMediaPreviewUrl(null)}
                                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                                title="Fechar"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    <img
                        src={mediaPreviewUrl}
                        alt="Media"
                        className="max-w-full max-h-[85vh] rounded-sm shadow-2xl object-contain animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
