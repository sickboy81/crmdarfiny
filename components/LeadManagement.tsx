import React, { useState } from 'react';
import {
    Users, Target, Search, Filter, Trash2, CheckCircle2,
    MoreVertical, Mail, Phone, Calendar, Tag, ExternalLink,
    MessageSquare, UserPlus, ShieldAlert, FileText, FileSpreadsheet
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { Contact } from '../types';
import { toast } from 'sonner';
import clsx from 'clsx';

export const LeadManagement: React.FC = () => {
    const { contacts, updateContact, deleteContact, addContact, addNotification } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

    // Filter only leads
    const leads = contacts.filter(c => c.isLead && (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ));

    const handlePromote = (id: string) => {
        updateContact(id, { isLead: false });
        addNotification({
            id: `promote-${id}`,
            title: 'Lead Promovido',
            message: 'O lead foi validado e agora é um contato oficial.',
            timestamp: new Date().toLocaleTimeString(),
            type: 'success',
            read: false
        });
        toast.success('Lead promovido a Contato com sucesso!');
    };

    const handleBulkPromote = () => {
        selectedLeads.forEach(id => updateContact(id, { isLead: false }));
        toast.success(`${selectedLeads.length} leads promovidos!`);
        setSelectedLeads([]);
    };

    const handleBulkDelete = () => {
        if (!confirm('Deseja excluir permanentemente os leads selecionados?')) return;
        selectedLeads.forEach(id => deleteContact(id));
        toast.info('Leads excluídos.');
        setSelectedLeads([]);
    };

    const toggleSelect = (id: string) => {
        setSelectedLeads(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'sheet') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const { extractLeadsFromPdf, extractLeadsFromSpreadsheet, saveLeadsToStore } = await import('../services/extractionService');

        const toastId = toast.loading(`Processando ${type === 'pdf' ? 'PDF' : 'Planilha'}...`);
        try {
            let extractedLeads = [];
            if (type === 'pdf') {
                extractedLeads = await extractLeadsFromPdf(file);
            } else {
                extractedLeads = await extractLeadsFromSpreadsheet(file);
            }

            saveLeadsToStore(extractedLeads, addContact, contacts);
            addNotification({
                id: `import-${Date.now()}`,
                title: 'Importação Concluída',
                message: `${extractedLeads.length} novos leads foram adicionados via ${type === 'pdf' ? 'PDF' : 'Planilha'}.`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'info',
                read: false
            });
            toast.dismiss(toastId);
        } catch (error) {
            console.error('Import Error:', error);
            toast.error('Erro ao processar arquivo.');
            toast.dismiss(toastId);
        }
        e.target.value = '';
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Hidden File Inputs */}
            <input
                type="file"
                id="pdf-import"
                className="hidden"
                accept=".pdf"
                onChange={(e) => handleFileImport(e, 'pdf')}
            />
            <input
                type="file"
                id="sheet-import"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileImport(e, 'sheet')}
            />

            {/* Header */}
            <header className="bg-white border-b border-slate-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Target className="text-green-600" />
                            Central de Leads
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Gerencie contatos recém-extraídos antes de integrá-los à sua carteira principal.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => document.getElementById('pdf-import')?.click()}
                            className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-red-100"
                        >
                            <FileText size={18} /> Importar PDF
                        </button>
                        <button
                            onClick={() => document.getElementById('sheet-import')?.click()}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-indigo-100"
                        >
                            <FileSpreadsheet size={18} /> Importar Planilha
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar leads..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Bulk Actions Bar */}
            {selectedLeads.length > 0 && (
                <div className="bg-green-600 text-white px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <span className="font-medium">{selectedLeads.length} selecionados</span>
                    <div className="flex gap-4">
                        <button
                            onClick={handleBulkPromote}
                            className="flex items-center gap-2 hover:bg-white/10 px-3 py-1 rounded-lg transition-colors"
                        >
                            <CheckCircle2 size={18} /> Validar Tudo
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 hover:bg-white/10 px-3 py-1 rounded-lg transition-colors text-red-100"
                        >
                            <Trash2 size={18} /> Excluir
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-auto p-6">
                {leads.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                        <div className="bg-white p-6 rounded-full shadow-sm border border-slate-100">
                            <Target size={48} className="text-slate-200" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-slate-600">Nenhum lead encontrado</p>
                            <p className="text-sm">Use o Extrator de Contatos para alimentar esta lista.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {leads.map((lead) => (
                            <div
                                key={lead.id}
                                className={clsx(
                                    "bg-white rounded-2xl p-5 border transition-all duration-200 group relative",
                                    selectedLeads.includes(lead.id) ? "border-green-500 ring-1 ring-green-500/10 shadow-md" : "border-slate-100 hover:border-slate-300 hover:shadow-sm"
                                )}
                            >
                                <div className="flex gap-4">
                                    {/* Selection */}
                                    <button
                                        onClick={() => toggleSelect(lead.id)}
                                        className={clsx(
                                            "mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                            selectedLeads.includes(lead.id) ? "bg-green-500 border-green-500 text-white" : "border-slate-300 bg-slate-50"
                                        )}
                                    >
                                        {selectedLeads.includes(lead.id) && <CheckCircle2 size={14} strokeWidth={3} />}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-slate-900 truncate pr-8">{lead.name || 'Sem Nome'}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                                        Fonte: {lead.source || 'Desconhecida'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button className="text-slate-400 hover:text-slate-600 p-1">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                                                    <Phone size={14} />
                                                </div>
                                                <span className="truncate">{lead.phoneNumber}</span>
                                            </div>
                                            {lead.email && (
                                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                        <Mail size={14} />
                                                    </div>
                                                    <span className="truncate">{lead.email}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-5 flex gap-2">
                                            <button
                                                onClick={() => handlePromote(lead.id)}
                                                className="flex-1 bg-slate-900 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={16} /> Validar Contato
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Excluir este lead?')) deleteContact(lead.id);
                                                }}
                                                className="w-12 h-10 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
