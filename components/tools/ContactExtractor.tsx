import React, { useState, useRef } from 'react';
import {
    Database, Search, Copy, Download, UserPlus, Trash2,
    FileText, Mail, Phone, Upload, X, Tag, CheckSquare, Square,
    AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../../stores/useAppStore';
import clsx from 'clsx';

import { processImageWithAI } from '../../services/geminiService';

interface ExtractedContact {
    id: string; // unique temp id
    type: 'email' | 'phone';
    value: string;
    original: string;
    selected: boolean;
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
        // Regex for Emails
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = text.match(emailRegex) || [];

        // Advanced Regex for BR Phones: 
        // Handles: +55 11 99999-9999, (11) 99999-9999, 11 999999999, 99999-9999
        // This is a permissive regex to catch most candidates, then we filter.
        const phoneRegex = /(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})[-.\s]?(\d{4}))/g;

        const matches = [...text.matchAll(phoneRegex)];
        const phones = matches.map(m => {
            const ddd = m[2];
            const part1 = m[3];
            const part2 = m[4];

            // Reconstruct standard format
            const clean = `${ddd || ''}${part1}${part2}`.replace(/\D/g, '');

            // Basic validation for BR numbers
            // 10 digits (Landline w/ DDD): 11 3333 4444
            // 11 digits await (Mobile w/ DDD): 11 99999 8888
            // 8 digits (Landline wo/ DDD): 3333 4444 (skip? maybe risky)
            // 9 digits (Mobile wo/ DDD): 99999 8888 (skip? risky)
            if (clean.length < 10) return null; // Only accept with DDD for safety or strict 10/11 digits

            return {
                original: m[0],
                clean: clean
            };
        }).filter(Boolean);

        const newContacts: ExtractedContact[] = [];

        emails.forEach(e => {
            newContacts.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'email',
                value: e,
                original: e,
                selected: true
            });
        });

        phones.forEach(p => {
            if (p) {
                newContacts.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'phone',
                    value: p.clean,
                    original: p.original,
                    selected: true
                });
            }
        });

        // Deduplicate against existing extracted data
        const unique = newContacts.filter(
            nc => !extractedData.some(ed => ed.value === nc.value)
        );

        if (unique.length > 0) {
            setExtractedData(prev => [...prev, ...unique]);
            toast.success(`${unique.length} novos contatos encontrados!`);
        } else {
            toast.info('Nenhum dado novo encontrado.');
        }
    };

    const processImage = async (file: File) => {
        setIsProcessing(true);
        toast.info('Iniciando OCR com IA... analisando imagem.');
        try {
            // Using AI for OCR (respects configured provider)
            const text = await processImageWithAI(file,
                "Analise esta imagem e extraia TODO o texto legível. Se for um print de conversa ou lista, tente manter a estrutura. O objetivo é encontrar nomes, telefones e emails."
            );

            setInputText(prev => prev + '\n\n' + `--- OCR (IA): ${file.name} ---\n` + text);
            processText(text);
            toast.success('OCR via IA concluído com sucesso!');
        } catch (error) {
            console.error('OCR Error:', error);
            toast.error('Erro ao processar imagem. Verifique sua chave de IA.');
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

        if (file.type.startsWith('image/')) {
            processImage(file);
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                processText(content);
                setInputText(prev => prev + '\n\n' + `--- Arquivo: ${file.name} ---\n` + content);
            };

            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                reader.readAsText(file); // logic is same as txt for regex extraction
            } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                reader.readAsText(file);
            } else {
                toast.error('Formato não suportado. Use .txt, .csv ou Imagens (OCR)');
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
                name: c.type === 'email' ? c.value.split('@')[0] : `Lead ${c.value.substr(-4)}`,
                phoneNumber: c.type === 'phone' ? c.value : '',
                email: c.type === 'email' ? c.value : undefined,
                avatar: `https://ui-avatars.com/api/?name=${c.type === 'email' ? 'E' : 'T'}&background=random`,
                status: 'active',
                tags: tags, // Apply configured tags
                lastSeen: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            count++;
        });

        // Remove imported
        setExtractedData(prev => prev.filter(c => !c.selected));
        toast.success(`${count} contatos importados com sucesso!`);
    };

    const downloadCSV = () => {
        const toExport = extractedData.filter(c => c.selected);
        if (toExport.length === 0) {
            toast.warning('Selecione contatos para exportar.');
            return;
        }
        const csvContent = "data:text/csv;charset=utf-8,Type,Value,Original,Tags\n" +
            toExport.map(c => `${c.type},${c.value},"${c.original}","${tags.join(';')}"`).join("\n");
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
                    <p className="text-indigo-700 font-bold text-lg">Processando Imagem com IA...</p>
                    <p className="text-gray-500 text-sm">Extraindo texto para encontrar contatos</p>
                </div>
            )}

            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Database className="text-indigo-600" />
                        Extrator de Contatos Pro
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Cole prints, textos ou CSVs para gerar leads qualificados.
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
                                accept=".txt,.csv"
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
                                <Upload size={14} /> Upload (.txt/.csv)
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
                                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                                    {extractedData.length}
                                </span>
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
                                            "group flex items-center gap-3 p-3 border rounded-lg transition-all cursor-pointer select-none",
                                            item.selected ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-100 hover:border-indigo-200"
                                        )}
                                        onClick={() => toggleSelect(item.id)}
                                    >
                                        <div className={item.selected ? "text-indigo-600" : "text-gray-300"}>
                                            {item.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </div>

                                        <div className={`p-2 rounded-full shrink-0 ${item.type === 'email' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                                            {item.type === 'email' ? <Mail size={16} /> : <Phone size={16} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-gray-800 font-medium truncate">{item.value}</div>
                                            <div className="text-xs text-gray-400 truncate" title={item.original}>{item.original}</div>
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
