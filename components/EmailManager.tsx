import React, { useState } from 'react';
import { Mail, Send, Inbox, Archive, Trash2, Search, Plus, Filter, Paperclip, Clock, CheckCircle, XCircle, RefreshCw, Target, Star, FileText, AlertCircle } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { EmailMessage } from '../types';
import clsx from 'clsx';
import { toast } from 'sonner';

export const EmailManager: React.FC = () => {
    const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);

    const [showTemplates, setShowTemplates] = useState(false);
    const [isCompositionOpen, setIsCompositionOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'inbox' | 'sent' | 'scheduled' | 'archived' | 'trash' | 'starred' | 'drafts' | 'spam'>('inbox');

    // Form states for composition
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [scheduledDate, setScheduledDate] = useState<string>('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const editorRef = React.useRef<HTMLDivElement>(null);
    const { 
        emails, 
        addEmail, 
        updateEmail, 
        bulkUpdateEmails, 
        emailTemplates, 
        syncEmails, 
        addNotification, 
        settings 
    } = useAppStore();

    const handleSyncEmails = React.useCallback(async () => {
        setIsSyncing(true);
        try {
            await syncEmails();
            toast.success('E-mails sincronizados com sucesso!');
        } catch (error) {
            toast.error('Erro ao sincronizar e-mails.');
        } finally {
            setIsSyncing(false);
        }
    }, [syncEmails]);

    const handleToggleStar = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const email = emails.find(e => e.id === id);
        if (email) {
            updateEmail(id, { isStarred: !email.isStarred });
        }
    };

    const handleBulkDelete = () => {
        bulkUpdateEmails(selectedEmailIds, { status: 'trash' });
        setSelectedEmailIds([]);
        toast.success(`${selectedEmailIds.length} e-mails movidos para a lixeira.`);
    };

    const handleBulkArchive = () => {
        bulkUpdateEmails(selectedEmailIds, { status: 'archived' });
        setSelectedEmailIds([]);
        toast.success(`${selectedEmailIds.length} e-mails arquivados.`);
    };

    const handleBulkMarkAsRead = () => {
        // Assuming we add isRead to EmailMessage later, for now just a toast
        toast.success(`${selectedEmailIds.length} e-mails marcados como lidos.`);
        setSelectedEmailIds([]);
    };

    const handleBulkSpam = () => {
        bulkUpdateEmails(selectedEmailIds, { isSpam: true });
        setSelectedEmailIds([]);
        toast.success(`${selectedEmailIds.length} e-mails marcados como spam.`);
    };

    const handleToggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEmailIds(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const formatDoc = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
    };

    const handleSaveDraft = () => {
        if (!to && !subject && !content) return;
        const draft: any = {
            id: `draft-${Date.now()}`,
            to,
            subject,
            content,
            timestamp: new Date().toLocaleTimeString(),
            status: 'sent',
            isDraft: true
        };
        addEmail(draft);
        setIsCompositionOpen(false);
        toast.success('Rascunho salvo.');
    };

    React.useEffect(() => {
        handleSyncEmails();
    }, [handleSyncEmails]);

    const handleAISuggestion = async () => {
        if (!subject && !to) {
            toast.info('Digite um assunto ou destinatário para ajudar na sugestão.');
        }
        
        const loadingToast = toast.loading('IA gerando sugestão...');
        try {
            const { generateSmartReply } = await import('../services/aiService');
            // Mocking a context for smarter reply if no history
            const suggestion = await generateSmartReply([], to || 'Cliente');
            setContent(suggestion);
            toast.success('Sugestão gerada com sucesso!', { id: loadingToast });
        } catch (error) {
            toast.error('Erro ao gerar sugestão da IA.', { id: loadingToast });
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result as string;
                // Remove the data:image/png;base64, part
                resolve(base64String.split(',')[1]);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSendEmail = async () => {
        if (!to || !subject || !content) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        setIsSending(true);
        try {
            const { emailService } = await import('../services/emailService');
            const emailConfig = (settings as any).email_config;
            const apiKey = emailConfig?.apiKey;
            const verifiedSender = emailConfig?.verifiedSender;

            // Process attachments if any
            const attachments = await Promise.all(
                selectedFiles.map(async (file) => ({
                    filename: file.name,
                    content: await fileToBase64(file)
                }))
            );

            await emailService.sendEmail({ 
                to, 
                subject, 
                content, 
                apiKey, 
                verifiedSender,
                attachments: attachments.length > 0 ? attachments : undefined,
                scheduledAt: scheduledDate || undefined
            });

            const newEmail: EmailMessage = {
                id: Date.now().toString(),
                to,
                subject,
                content,
                timestamp: new Date().toLocaleString('pt-BR'),
                status: scheduledDate ? 'scheduled' : 'sent',
                attachments: attachments.length > 0 ? attachments : undefined,
                scheduledAt: scheduledDate || undefined
            };

            addEmail(newEmail);
            
            // Salvar no Supabase
            try {
                const { supabaseService: service } = await import('../services/supabaseService');
                await service.saveEmail(newEmail);
            } catch (saveError) {
                console.error('Error saving sent email to Supabase:', saveError);
            }

            addNotification({
                id: `email-${newEmail.id}`,
                title: scheduledDate ? 'E-mail Agendado' : 'E-mail Enviado',
                message: `Para: ${to} - Assunto: ${subject}`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'success',
                read: false
            });

            toast.success(scheduledDate ? 'E-mail agendado com sucesso!' : 'E-mail enviado com sucesso!');
            setIsCompositionOpen(false);
            setTo('');
            setSubject('');
            setContent('');
            setSelectedFiles([]);
            setScheduledDate('');
            setShowDatePicker(false);
        } catch (error: any) {
            toast.error(error.message || 'Erro ao enviar e-mail.');
        } finally {
            setIsSending(false);
        }
    };

    const handleSimulateIncoming = () => {
        const id = Date.now().toString();
        const incomingEmail: EmailMessage = {
            id,
            from: 'contato@vendasimoveis.com.br',
            to: 'me@darfiny.com',
            subject: 'Novo interesse no imóvel da Rua das Flores',
            content: 'Olá, gostaria de saber se o imóvel ainda está disponível para visita amanhã às 14h.\n\nNome: João Pereira\nTelefone: (11) 98888-7777\nE-mail: joao@email.com',
            timestamp: new Date().toLocaleString('pt-BR'),
            status: 'received'
        };
        addEmail(incomingEmail);
        toast.info('Simulação: Novo e-mail recebido!');
    };

    const filteredEmails = emails.filter(e => {
        const matchesSearch = e.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.from?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.content.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory =
            (filterCategory === 'inbox' && e.status === 'received' && !e.isSpam) ||
            (filterCategory === 'sent' && e.status === 'sent') ||
            (filterCategory === 'scheduled' && e.status === 'scheduled') ||
            (filterCategory === 'starred' && e.isStarred) ||
            (filterCategory === 'drafts' && e.isDraft) ||
            (filterCategory === 'spam' && e.isSpam) ||
            (filterCategory === 'archived' && e.status === 'archived') ||
            (filterCategory === 'trash' && e.status === 'trash');

        return matchesSearch && matchesCategory;
    });

    const emailConfig = (settings as any).email_config;
    const isConfigured = !!emailConfig?.apiKey && !!emailConfig?.verifiedSender;

    return (
        <div className="flex h-full bg-gray-50 overflow-hidden">
            {/* Sidebar de Categorias */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
                <div className="p-4">
                    <button
                        onClick={() => setIsCompositionOpen(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Escrever
                    </button>
                </div>

                <div className="flex-1 px-3 space-y-1">
                    {[
                        { icon: <Inbox size={18} />, label: 'Entrada', id: 'inbox', count: emails.filter(e => e.status === 'received' && !e.isSpam).length },
                        { icon: <Star size={18} />, label: 'Com Estrela', id: 'starred', count: emails.filter(e => e.isStarred).length },
                        { icon: <Send size={18} />, label: 'Enviados', id: 'sent', count: emails.filter(e => e.status === 'sent').length },
                        { icon: <Clock size={18} />, label: 'Agendados', id: 'scheduled', count: emails.filter(e => e.status === 'scheduled').length },
                        { icon: <FileText size={18} />, label: 'Rascunhos', id: 'drafts', count: emails.filter(e => e.isDraft).length },
                        { icon: <Archive size={18} />, label: 'Arquivados', id: 'archived', count: emails.filter(e => e.status === 'archived').length },
                        { icon: <AlertCircle size={18} />, label: 'Spam', id: 'spam', count: emails.filter(e => e.isSpam).length },
                        { icon: <Trash2 size={18} />, label: 'Lixeira', id: 'trash', count: emails.filter(e => e.status === 'trash').length },
                    ].map((item: any, idx) => (
                        <button
                            key={idx}
                            onClick={() => setFilterCategory(item.id)}
                            className={clsx(
                                "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                                filterCategory === item.id ? "bg-green-50 text-green-700 font-bold" : "text-gray-500 hover:bg-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {item.icon}
                                <span className="text-sm">{item.label}</span>
                            </div>
                            {item.count > 0 && (
                                <span className={clsx("text-xs px-2 py-0.5 rounded-full", item.active ? "bg-green-200" : "bg-gray-100")}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

            </div>

            {/* Lista de E-mails */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="h-16 border-b border-gray-100 flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 gap-2 w-full max-w-md border border-transparent focus-within:border-green-500 focus-within:bg-white transition-all">
                        <Search size={18} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar nos e-mails..."
                            title="Buscar nos e-mails"
                            className="bg-transparent border-none outline-none text-sm w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                        <button 
                            onClick={handleSyncEmails}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold" 
                            disabled={isSyncing}
                            title="Sincronizar"
                        >
                            <RefreshCw size={18} className={clsx(isSyncing && "animate-spin")} />
                            {isSyncing ? 'SINC...' : 'SINCRONIZAR'}
                        </button>
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Filtrar">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                {!isConfigured && (
                    <div className="m-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <Clock className="text-orange-500 shrink-0 mt-0.5" size={18} />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-orange-800">API Resend não configurada</p>
                            <p className="text-xs text-orange-600 mt-0.5">
                                Para enviar e-mails reais, vá em <strong>Configurações &gt; E-mail SMTP/API</strong> e informe sua API Key e e-mail verificado.
                            </p>
                        </div>
                    </div>
                )}

                {/* Bulk Actions Toolbar */}
                {selectedEmailIds.length > 0 && (
                    <div className="mx-6 mb-2 p-3 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                title="Selecionar todos os e-mails"
                                checked={selectedEmailIds.length === filteredEmails.length && filteredEmails.length > 0}
                                onChange={() => {
                                    if (selectedEmailIds.length === filteredEmails.length) {
                                        setSelectedEmailIds([]);
                                    } else {
                                        setSelectedEmailIds(filteredEmails.map(e => e.id));
                                    }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm font-bold text-green-800">{selectedEmailIds.length} selecionados</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleBulkArchive}
                                className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                                title="Arquivar Selecionados"
                            >
                                <Archive size={16} />
                                ARQUIVAR
                            </button>
                            <button 
                                onClick={handleBulkDelete}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                                title="Excluir Selecionados"
                            >
                                <Trash2 size={16} />
                                EXCLUIR
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredEmails.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-inner">
                                <Mail size={40} className="text-gray-200" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-600 mb-1">Nenhum e-mail por aqui</h3>
                            <p className="text-sm max-w-xs">Busque por outros termos ou escreva seu primeiro e-mail para um lead.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredEmails.map((email) => (
                                <div
                                    key={email.id}
                                    onClick={() => setSelectedEmail(email)}
                                    className={clsx(
                                        "p-4 hover:bg-gray-50 cursor-pointer transition-colors flex gap-4 items-center group",
                                        selectedEmail?.id === email.id && "bg-green-50/50 border-l-4 border-l-green-600 pl-3",
                                        selectedEmailIds.includes(email.id) && "bg-green-50/30"
                                    )}
                                >
                                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedEmailIds.includes(email.id)}
                                            onChange={(e) => {
                                                if (selectedEmailIds.includes(email.id)) {
                                                    setSelectedEmailIds(prev => prev.filter(id => id !== email.id));
                                                } else {
                                                    setSelectedEmailIds(prev => [...prev, email.id]);
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <button 
                                            onClick={(ev) => handleToggleStar(email.id, ev)}
                                            className={clsx(
                                                "transition-colors",
                                                email.isStarred ? "text-yellow-400" : "text-gray-300 hover:text-yellow-400"
                                            )}
                                            title={email.isStarred ? "Remover estrela" : "Adicionar estrela"}
                                        >
                                            <Star size={18} fill={email.isStarred ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm",
                                        email.status === 'received' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                                    )}>
                                        {(email.status === 'received' ? email.from : email.to)?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <p className="font-bold text-gray-800 truncate text-[15px]">
                                                {email.status === 'received' ? email.from : email.to}
                                            </p>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{email.timestamp}</span>
                                        </div>
                                        <p className="text-xs font-bold text-green-600 mb-1 truncate uppercase tracking-wide">
                                            {email.subject}
                                        </p>
                                        <p className="text-xs text-gray-400 line-clamp-1">
                                            {email.content.replace(/<[^>]*>/g, '')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={() => updateEmail(email.id, { status: 'archived' })}
                                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                            title="Arquivar"
                                        >
                                            <Archive size={16} />
                                        </button>
                                        <button 
                                            onClick={() => updateEmail(email.id, { isSpam: !email.isSpam })}
                                            className={clsx(
                                                "p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100",
                                                email.isSpam ? "text-red-500 bg-red-50" : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                            )}
                                            title="Spam"
                                        >
                                            <AlertCircle size={16} />
                                        </button>
                                        <button 
                                            onClick={() => updateEmail(email.id, { status: 'trash' })}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    {email.status === 'sent' && (
                                        <CheckCircle size={14} className="text-green-500 mt-1 shrink-0" />
                                    )}
                                    {email.status === 'received' && (
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0 animate-pulse" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detalhes do E-mail Selecionado */}
            {selectedEmail && (
                <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col shrink-0 animate-in slide-in-from-right-4">
                    <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
                        <h3 className="font-bold text-gray-800">Visualizar E-mail</h3>
                        <button
                            onClick={() => setSelectedEmail(null)}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                    <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="mb-8">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destinatário</p>
                            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                    {selectedEmail.to.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">{selectedEmail.to}</p>
                                    <p className="text-xs text-gray-500">{selectedEmail.timestamp}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Assunto</p>
                            <h2 className="text-xl font-bold text-gray-800 leading-tight">{selectedEmail.subject}</h2>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedEmail.content}
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={async () => {
                                    const { extractLeadsFromText, saveLeadsToStore } = await import('../services/extractionService');
                                    const leads = await extractLeadsFromText(selectedEmail.content, `E-mail: ${selectedEmail.subject}`);
                                    if (leads.length > 0) {
                                        const { contacts, addContact } = useAppStore.getState();
                                        saveLeadsToStore(leads, addContact, contacts);
                                        addNotification({
                                            id: `extract-${Date.now()}`,
                                            title: 'Leads Extraídos',
                                            message: `${leads.length} leads foram extraídos do corpo do e-mail.`,
                                            timestamp: new Date().toLocaleTimeString(),
                                            type: 'success',
                                            read: false
                                        });
                                        toast.success(`${leads.length} leads extraídos!`);
                                    } else {
                                        toast.info('Nenhum dado de lead encontrado no texto.');
                                    }
                                }}
                                className="w-full border-2 border-green-500 text-green-600 font-bold py-3 rounded-xl hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Target size={18} />
                                EXTRAIR LEADS DESTE E-MAIL
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                            <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all">Arquivar</button>
                            <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-all">Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Composição */}
            {isCompositionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                            <div className="flex items-center gap-3 text-green-600">
                                <Mail size={24} />
                                <h3 className="text-xl font-bold">Novo E-mail</h3>
                            </div>
                            <button
                                onClick={() => setIsCompositionOpen(false)}
                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                                title="Fechar composição"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Para</label>
                                <input
                                    type="email"
                                    placeholder="email@exemplo.com"
                                    className="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-medium"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assunto</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Proposta Comercial Imóvel #123"
                                    className="w-full px-5 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-medium"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    <div className="flex justify-between items-center w-full">
                                        <span>Mensagem</span>
                                        <div className="flex gap-3">
                                            <span 
                                                onClick={() => setShowTemplates(!showTemplates)}
                                                className="text-[9px] text-blue-600 hover:underline cursor-pointer font-bold"
                                            >
                                                {showTemplates ? 'Fechar Modelos' : 'Usar Modelo'}
                                            </span>
                                            <span 
                                                onClick={handleAISuggestion}
                                                className="text-[9px] text-green-600 hover:underline cursor-pointer font-bold"
                                            >
                                                Sugestão IA
                                            </span>
                                        </div>
                                    </div>
                                </label>
                                
                                {/* Rich Text Toolbar */}
                                <div className="flex items-center gap-1 mb-2 p-2 bg-gray-50 border border-gray-100 rounded-t-2xl border-b-0">
                                    <button onClick={() => formatDoc('bold')} className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all text-xs font-bold" title="Negrito">B</button>
                                    <button onClick={() => formatDoc('italic')} className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all text-xs italic" title="Itálico">I</button>
                                    <button onClick={() => formatDoc('underline')} className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all text-xs underline" title="Sublinhado">U</button>
                                    <div className="w-px h-4 bg-gray-200 mx-1" />
                                    <button onClick={() => formatDoc('insertUnorderedList')} className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all text-xs" title="Lista">• List</button>
                                    <button onClick={() => formatDoc('insertOrderedList')} className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all text-xs" title="Lista Numérica">1. List</button>
                                </div>

                                {showTemplates && (
                                    <div className="mb-4 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                                        {emailTemplates.length === 0 ? (
                                            <div className="col-span-2 p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                Nenhum modelo cadastrado.
                                            </div>
                                        ) : (
                                            emailTemplates.map(template => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => {
                                                        setSubject(template.subject);
                                                        setContent(template.content);
                                                        if (editorRef.current) {
                                                            editorRef.current.innerHTML = template.content;
                                                        }
                                                        setShowTemplates(false);
                                                    }}
                                                    className="p-3 text-left border border-gray-100 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                                                >
                                                    <p className="text-xs font-bold text-gray-800 group-hover:text-green-700">{template.name}</p>
                                                    <p className="text-[10px] text-gray-500 truncate">{template.subject}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                <div 
                                    ref={editorRef}
                                    contentEditable
                                    onInput={(e) => setContent(e.currentTarget.innerHTML)}
                                    className="w-full min-h-[200px] px-5 py-4 rounded-b-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-medium overflow-y-auto"
                                    placeholder="Escreva sua mensagem aqui..."
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 pt-2">
                                    <input 
                                        type="file" 
                                        multiple 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        title="Arquivos para anexo"
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-green-300 hover:text-green-600 transition-all text-xs font-bold"
                                    >
                                        <Paperclip size={16} />
                                        ANEXAR ARQUIVOS
                                    </button>
                                    <button 
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl transition-all text-xs font-bold",
                                            scheduledDate ? "border-orange-500 text-orange-600 bg-orange-50" : "text-gray-400 hover:border-orange-300 hover:text-orange-600"
                                        )}
                                    >
                                        <Clock size={16} />
                                        {scheduledDate ? 'ALTERAR AGENDAMENTO' : 'AGENDAR ENVIO'}
                                    </button>
                                </div>

                                {/* Lista de Arquivos Selecionados */}
                                {selectedFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-600">
                                                <Paperclip size={10} />
                                                <span className="truncate max-w-[120px]">{file.name}</span>
                                                <button 
                                                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                    className="hover:text-red-500"
                                                    title="Remover anexo"
                                                >
                                                    <XCircle size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Seletor de Data de Agendamento */}
                                {showDatePicker && (
                                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Escolha Data e Hora</label>
                                            {scheduledDate && (
                                                <button 
                                                    onClick={() => {
                                                        setScheduledDate('');
                                                        setShowDatePicker(false);
                                                    }}
                                                    className="text-[10px] font-bold text-red-500 hover:underline"
                                                >
                                                    Remover Agendamento
                                                </button>
                                            )}
                                        </div>
                                        <input 
                                            type="datetime-local" 
                                            className="w-full px-4 py-2 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                                            value={scheduledDate}
                                            title="Data de agendamento"
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                        />
                                        <p className="text-[9px] text-orange-500">O e-mail será enviado automaticamente na data selecionada.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setIsCompositionOpen(false)}
                                className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={isSending}
                                className={clsx(
                                    "px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-100 flex items-center gap-2 transition-all active:scale-95",
                                    isSending && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isSending ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" />
                                        {scheduledDate ? 'Agendando...' : 'Enviando...'}
                                    </>
                                ) : (
                                    <>
                                        {scheduledDate ? <Clock size={20} /> : <Send size={20} />}
                                        {scheduledDate ? 'Agendar Envio' : 'Enviar Agora'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
