import React, { useState, useRef } from 'react';
import {
    Database, Search, Copy, Download, UserPlus, Trash2,
    FileText, Mail, Phone, Upload, X, Tag, CheckSquare, Square,
    AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../../stores/useAppStore';
import clsx from 'clsx';
// No AI import

interface ExtractedContact {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    selected: boolean;
    source: string; // The original line or context
}

export const ContactExtractor: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [extractedData, setExtractedData] = useState<ExtractedContact[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { addContact } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Bulk Actions State
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(['Importado']);

    const processText = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const newLeads: ExtractedContact[] = [];

        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})[-.\s]?(\d{4}))/g;

        // Smart Window Processing: Look at blocks of 4 lines
        for (let i = 0; i < lines.length; i++) {
            const window = lines.slice(i, i + 4);
            let name = '';
            let phone = '';
            let email = '';

            window.forEach((line, idx) => {
                const emails = line.match(emailRegex);
                const phones = [...line.matchAll(phoneRegex)].map(m => `${m[2] || ''}${m[3]}${m[4]}`.replace(/\D/g, ''));

                if (emails) {
                    if (!email) email = emails[0];
                } else if (phones.length > 0) {
                    if (!phone) phone = phones[0];
                } else if (!name && line.length > 2 && line.length < 40 && !line.includes('---')) {
                    // Possible name if it's not a phone/email and look like a short label
                    name = line;
                }
            });

            if (phone || email) {
                newLeads.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: name,
                    phone: phone,
                    email: email,
                    source: window[0].substring(0, 30),
                    selected: true
                });

                // Skip the lines we consumed to avoid duplicate fragments
                if (phone && email) i += 2;
                else if (phone || email) i += 1;
            }
        }

        consolidateAndSetLeads(newLeads);
    };

    const consolidateAndSetLeads = (newLeads: ExtractedContact[]) => {
        setExtractedData(prev => {
            const consolidated: ExtractedContact[] = [...prev];

            newLeads.forEach(current => {
                const existing = consolidated.find(c =>
                    (current.phone && c.phone === current.phone) ||
                    (current.email && c.email === current.email) ||
                    (current.name && c.name && current.name.toLowerCase() === c.name.toLowerCase() && current.name.length > 3)
                );

                if (existing) {
                    if (!existing.name && current.name) existing.name = current.name;
                    if (!existing.phone && current.phone) existing.phone = current.phone;
                    if (!existing.email && current.email) existing.email = current.email;
                    if (current.source && !existing.source.includes(current.source)) {
                        existing.source += ` | ${current.source}`;
                    }
                } else {
                    consolidated.push({ ...current });
                }
            });

            return consolidated;
        });

        if (newLeads.length > 0) toast.success(`${newLeads.length} leads qualificados processados!`);
    };

    const performOCR = async (source: File | string, filename: string, isPdfPage = false) => {
        try {
            const { extractContactsFromImage } = await import('../../services/geminiService');

            if (!isPdfPage) toast.loading('IA do Google analisando documento...', { id: 'ocr-loading' });

            let fileToProcess: File;
            if (typeof source === 'string') {
                const res = await fetch(source);
                const blob = await res.blob();
                fileToProcess = new File([blob], filename, { type: 'image/png' });
            } else {
                fileToProcess = source;
            }

            const results = await extractContactsFromImage(fileToProcess);

            if (!results || results.length === 0) {
                // If structured extraction fails or finds nothing, try literal text as fallback
                const { processImageWithAI } = await import('../../services/geminiService');
                const text = await processImageWithAI(fileToProcess, "Extraia todo o texto literal para busca manual.");
                if (text) {
                    setInputText(prev => prev + '\n\n' + `--- Texto OCR: ${filename} ---\n` + text);
                    processText(text);
                }
            } else {
                // Process structured results
                const newLeads: ExtractedContact[] = results.map((r: any) => ({
                    id: Math.random().toString(36).substring(2, 11),
                    name: r.name || '',
                    phone: r.phone || '',
                    email: r.email || '',
                    selected: true,
                    source: `IA Vision: ${filename}`
                }));

                consolidateAndSetLeads(newLeads);
            }

            if (!isPdfPage) {
                toast.dismiss('ocr-loading');
            }
        } catch (error: any) {
            console.error('AI OCR Error:', error);
            if (!isPdfPage) {
                toast.dismiss('ocr-loading');
                toast.error('Erro ao processar imagem via IA.');
            }
            throw error;
        }
    };

    const processImage = async (file: File) => {
        setIsProcessing(true);
        try {
            await performOCR(file, file.name);
        } finally {
            setIsProcessing(false);
        }
    };

    const processPdf = async (file: File) => {
        setIsProcessing(true);
        const toastId = toast.loading('Convertendo PDF para imagens...');

        try {
            const { convertPdfToImages } = await import('../../utils/pdfProcessor');
            const images = await convertPdfToImages(file);

            toast.dismiss(toastId);
            toast.success(`${images.length} páginas encontradas. Iniciando leitura...`);

            for (let i = 0; i < images.length; i++) {
                toast.loading(`Lendo página ${i + 1} de ${images.length}...`, { id: 'pdf-ocr' });
                // Add slight delay to allow UI update
                await new Promise(r => setTimeout(r, 100));
                await performOCR(images[i], `${file.name} (Pág ${i + 1})`, true);
            }

            toast.dismiss('pdf-ocr');
            toast.success('Leitura do PDF concluída!');

        } catch (error) {
            console.error('PDF Process Error:', error);
            toast.dismiss(toastId);
            toast.dismiss('pdf-ocr');
            toast.error('Erro ao processar PDF.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) processImage(blob);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            processPdf(file);
        } else if (file.type.startsWith('image/')) {
            processImage(file);
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                processText(content);
                setInputText(prev => prev + '\n\n' + `--- Arquivo: ${file.name} ---\n` + content);
            };

            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                reader.readAsText(file);
            } else {
                toast.error('Formato não suportado. Use .txt, .csv, PDF ou Imagens');
            }
        }

        // Reset input
        e.target.value = '';
    };

    // --- Bulk Actions ---
    const toggleSelectAll = () => {
        const allSelected = extractedData.every(c => c.selected);
        setExtractedData(prev => prev.map(c => ({ ...c, selected: !allSelected })));
    };

    const toggleSelect = (id: string) => {
        setExtractedData(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
    };

    const deleteSelected = () => {
        setExtractedData(prev => prev.filter(c => !c.selected));
    };

    const importSelected = () => {
        const toImport = extractedData.filter(c => c.selected);
        if (toImport.length === 0) {
            toast.warning('Nenhum contato selecionado.');
            return;
        }

        let count = 0;
        toImport.forEach(c => {
            addContact({
                id: `ext_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: c.name || (c.email ? c.email.split('@')[0] : `Lead ${c.phone?.substr(-4) || 'S/N'}`),
                phoneNumber: c.phone || '',
                email: c.email || undefined,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'L')}&background=random`,
                status: 'active',
                tags: [...tags, 'Extrator'],
                isLead: true,
                source: c.source,
                lastSeen: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            count++;
        });

        // Remove imported
        setExtractedData(prev => prev.filter(c => !c.selected));
        toast.success(`${count} leads importados e agrupados com sucesso!`);
    };

    const downloadCSV = () => {
        const toExport = extractedData.filter(c => c.selected);
        if (toExport.length === 0) {
            toast.warning('Selecione contatos para exportar.');
            return;
        }
        const csvContent = "data:text/csv;charset=utf-8,Nome,Telefone,Email,Fonte,Tags\n" +
            toExport.map(c => `"${c.name || ''}",${c.phone || ''},${c.email || ''},"${c.source}","${tags.join(';')}"`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "leads_extraidos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 gap-6 overflow-hidden relative">
            {isProcessing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-indigo-700 font-bold text-lg">Processando...</p>
                    <p className="text-gray-500 text-sm">Lendo documentos...</p>
                </div>
            )}

            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Database className="text-indigo-600" />
                        Extrator de Contatos Pro
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Cole prints, textos, PDFs ou CSVs para gerar leads qualificados.
                    </p>
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Input Area */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <FileText size={16} />
                            Fonte de Dados (Texto ou Imagem)
                        </span>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".txt,.csv,.pdf"
                                onChange={handleFileUpload}
                            />
                            <input
                                type="file"
                                ref={imageInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-50 transition-colors font-medium border border-purple-100"
                            >
                                <Upload size={14} /> OCR (Imagem)
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors font-medium border border-indigo-100"
                            >
                                <Upload size={14} /> Upload (PDF/TXT/CSV)
                            </button>
                            <button
                                onClick={() => setInputText('')}
                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={14} /> Limpar
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="flex-1 p-4 resize-none focus:outline-none text-gray-700 text-sm leading-relaxed font-mono"
                        placeholder="Cole aqui o texto, CSV ou PRINTS DE TELA (Ctrl+V)..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onPaste={handlePaste}
                    />
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={() => processText(inputText)}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                            <Search size={18} />
                            Extrair Contatos Agora
                        </button>
                    </div>
                </div>

                {/* Processing & Results Area */}
                <div className="w-[420px] flex flex-col gap-4">

                    {/* Tags Config */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2">
                            <Tag size={14} /> Tags para Importação
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs border border-indigo-100 flex items-center gap-1">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                placeholder="Nova tag..."
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                            />
                            <button onClick={addTag} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600">
                                <UserPlus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-0">
                        <div className="p-3 border-b border-gray-100 bg-indigo-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                Leads
                                <div className="flex gap-1 items-center">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                        <Database size={10} /> {extractedData.length} Contatos
                                    </span>
                                </div>
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={deleteSelected} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Excluir Selecionados">
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={toggleSelectAll} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Selecionar Todos">
                                    {extractedData.length > 0 && extractedData.every(c => c.selected) ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {extractedData.length > 0 ? (
                                extractedData.map((item) => (
                                    <div
                                        key={item.id}
                                        className={clsx(
                                            "group flex flex-col gap-2 p-3 border rounded-xl transition-all cursor-pointer select-none",
                                            item.selected ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-gray-100 hover:border-indigo-200"
                                        )}
                                        onClick={() => toggleSelect(item.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={item.selected ? "text-indigo-600" : "text-gray-300"}>
                                                {item.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-900 font-bold truncate">
                                                    {item.name || 'Lead s/ Nome'}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-mono italic">
                                                {item.source.split(':').pop()?.trim().substring(0, 15)}...
                                            </div>
                                        </div>

                                        <div className="pl-7 space-y-1">
                                            {item.phone && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <div className="p-1 bg-green-50 text-green-600 rounded">
                                                        <Phone size={10} />
                                                    </div>
                                                    {item.phone}
                                                </div>
                                            )}
                                            {item.email && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <div className="p-1 bg-orange-50 text-orange-600 rounded">
                                                        <Mail size={10} />
                                                    </div>
                                                    {item.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                                    <Search size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm">Os dados extraídos aparecerão aqui.</p>
                                </div>
                            )}
                        </div>

                        {extractedData.length > 0 && (
                            <div className="p-3 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-3">
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium shadow-sm"
                                >
                                    <FileSpreadsheet size={16} />
                                    CSV
                                </button>
                                <button
                                    onClick={importSelected}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors font-bold shadow-md shadow-indigo-200"
                                >
                                    <UserPlus size={16} />
                                    Importar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
