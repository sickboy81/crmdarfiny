import React, { useState } from 'react';
import { Mail, Send, Inbox, Archive, Trash2, Search, Plus, Filter, Paperclip, Clock, CheckCircle, XCircle, MoreVertical, RefreshCw, Target } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { EmailMessage } from '../types';
import clsx from 'clsx';
import { toast } from 'sonner';

export const EmailManager: React.FC = () => {
    const { emails, addEmail, addNotification, settings } = useAppStore();
    const [isCompositionOpen, setIsCompositionOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'inbox' | 'sent' | 'scheduled' | 'archived' | 'trash'>('inbox');

    // Form states for composition
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');

    const handleSendEmail = async () => {
        if (!to || !subject || !content) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        setIsSending(true);
        try {
            const { emailService } = await import('../services/emailService');
            const apiKey = (settings as any).email_config?.apiKey;

            await emailService.sendEmail({ to, subject, content, apiKey });

            const newEmail: EmailMessage = {
                id: Date.now().toString(),
                to,
                subject,
                content,
                timestamp: new Date().toLocaleString('pt-BR'),
                status: 'sent'
            };

            addEmail(newEmail);
            addNotification({
                id: `email-${newEmail.id}`,
                title: 'E-mail Enviado',
                message: `Para: ${to} - Assunto: ${subject}`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'success',
                read: false
            });

            toast.success('E-mail enviado com sucesso!');
            setIsCompositionOpen(false);
            setTo('');
            setSubject('');
            setContent('');
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
            (filterCategory === 'inbox' && e.status === 'received') ||
            (filterCategory === 'sent' && e.status === 'sent') ||
            (filterCategory === 'scheduled' && e.status === 'scheduled');

        return matchesSearch && matchesCategory;
    });

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
                        { icon: <Inbox size={18} />, label: 'Entrada', id: 'inbox', count: emails.filter(e => e.status === 'received').length },
                        { icon: <Send size={18} />, label: 'Enviados', id: 'sent', count: emails.filter(e => e.status === 'sent').length },
                        { icon: <Clock size={18} />, label: 'Agendados', id: 'scheduled', count: emails.filter(e => e.status === 'scheduled').length },
                        { icon: <Archive size={18} />, label: 'Arquivados', id: 'archived', count: 0 },
                        { icon: <Trash2 size={18} />, label: 'Lixeira', id: 'trash', count: 0 },
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

                <div className="p-4 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sincronização</p>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-600">Gmail • Ativo</span>
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                        </div>
                        <button
                            onClick={handleSimulateIncoming}
                            className="flex items-center gap-2 text-[10px] font-bold text-green-600 hover:text-green-700"
                        >
                            <RefreshCw size={12} />
                            SIMULAR RECEBIMENTO
                        </button>
                    </div>
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
                            className="bg-transparent border-none outline-none text-sm w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Filtrar">
                            <Filter size={20} />
                        </button>
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Ações">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

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
                                        "p-4 hover:bg-gray-50 cursor-pointer transition-colors flex gap-4 items-start",
                                        selectedEmail?.id === email.id && "bg-green-50/50 border-l-4 border-l-green-600 pl-3"
                                    )}
                                >
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
                                        <p className="text-xs text-gray-500 line-clamp-1">{email.content}</p>
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
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                    Mensagem
                                    <span className="text-[9px] text-green-600 hover:underline cursor-pointer">Usar Sugestão IA</span>
                                </label>
                                <textarea
                                    rows={8}
                                    placeholder="Escreva sua mensagem aqui..."
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-medium resize-none"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-green-300 hover:text-green-600 transition-all text-xs font-bold">
                                    <Paperclip size={16} />
                                    ANEXAR ARQUIVOS
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-orange-300 hover:text-orange-600 transition-all text-xs font-bold">
                                    <Clock size={16} />
                                    AGENDAR ENVIO
                                </button>
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
                                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-100 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Send size={20} />
                                Enviar Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
