import React, { useState } from 'react';
import { Image as ImageIcon, Search, Filter, Grid, List, Download, Trash2, Maximize2, Share2, Upload, FileType, CheckCircle, Tag, MoreHorizontal, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { StoredImage } from '../types';
import clsx from 'clsx';
import { toast } from 'sonner';

export const ImageManager: React.FC = () => {
    const { images, addImage } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterSource, setFilterSource] = useState<StoredImage['source'] | 'all'>('all');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const newImage: StoredImage = {
                id: Date.now().toString(),
                url: event.target?.result as string,
                name: file.name,
                size: file.size,
                type: file.type,
                timestamp: new Date().toLocaleString('pt-BR'),
                source: 'upload',
                tags: ['Manual']
            };
            addImage(newImage);
            toast.success('Imagem carregada com sucesso!');
        };
        reader.readAsDataURL(file);
    };

    const filteredImages = images.filter(img => {
        const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSource = filterSource === 'all' || img.source === filterSource;
        return matchesSearch && matchesSource;
    });

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="flex h-full bg-gray-50 overflow-hidden">
            {/* Main Gallery Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white shadow-sm border-r border-gray-100">
                <div className="h-16 border-b border-gray-100 flex items-center px-6 justify-between shrink-0 bg-white z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 gap-2 w-full max-w-md border border-transparent focus-within:border-green-500 focus-within:bg-white transition-all">
                            <Search size={18} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar arquivos de imagem..."
                                className="bg-transparent border-none outline-none text-sm w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 p-1 rounded-xl mr-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-green-600" : "text-gray-400")}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-green-600" : "text-gray-400")}
                            >
                                <List size={18} />
                            </button>
                        </div>
                        <input
                            type="file"
                            id="img-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                        <label
                            htmlFor="img-upload"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-green-100"
                        >
                            <Upload size={18} />
                            Upload
                        </label>
                    </div>
                </div>

                {/* Categories/Source Pills */}
                <div className="px-6 py-4 flex gap-2 overflow-x-auto custom-scrollbar shrink-0 border-b border-gray-50">
                    {[
                        { id: 'all', label: 'Todos Arquivos' },
                        { id: 'upload', label: 'Manual' },
                        { id: 'chat', label: 'Do Chat' },
                        { id: 'pdf', label: 'Extraído de PDF' },
                        { id: 'lead_hub', label: 'Lead Hub' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterSource(tab.id as any)}
                            className={clsx(
                                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                filterSource === tab.id
                                    ? "bg-green-600 text-white border-green-600 shadow-md"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-green-500 hover:text-green-600"
                            )}
                        >
                            {tab.label.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
                    {filteredImages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                            <ImageIcon size={64} className="text-gray-200 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600 mb-1">Galeria Vazia</h3>
                            <p className="text-sm max-w-xs">Arraste imagens do chat ou extrator para gerenciar seus arquivos Visuais aqui.</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {filteredImages.map((img) => (
                                <div
                                    key={img.id}
                                    onClick={() => setSelectedEmail(null)} // Reset other views
                                    className={clsx(
                                        "group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-green-500 hover:shadow-xl transition-all cursor-pointer relative",
                                        selectedImage?.id === img.id && "ring-4 ring-green-500/20 border-green-500"
                                    )}
                                    onClickCapture={() => setSelectedImage(img)}
                                >
                                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button className="p-2 bg-white rounded-full text-gray-700 hover:text-green-600"><Maximize2 size={18} /></button>
                                            <button className="p-2 bg-white rounded-full text-gray-700 hover:text-green-600"><Download size={18} /></button>
                                        </div>
                                        <div className="absolute top-2 left-2">
                                            <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-bold text-gray-600 uppercase shadow-sm">
                                                {img.source}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-bold text-gray-800 truncate mb-0.5">{img.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase">{formatBytes(img.size)} • {img.timestamp.split(' ')[0]}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            {filteredImages.map((img) => (
                                <div
                                    key={img.id}
                                    onClick={() => setSelectedImage(img)}
                                    className={clsx(
                                        "flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                                        selectedImage?.id === img.id && "bg-green-50"
                                    )}
                                >
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 text-sm truncate">{img.name}</p>
                                        <div className="flex gap-4 mt-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <FileType size={12} /> {img.type.split('/')[1].toUpperCase()}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <Tag size={12} /> {img.source.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-gray-600">{formatBytes(img.size)}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{img.timestamp}</p>
                                    </div>
                                    <button className="p-2 text-gray-300 hover:text-gray-600 ml-4"><MoreHorizontal size={20} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Detalhes da Imagem */}
            {selectedImage && (
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 animate-in slide-in-from-right-4 relative z-20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">Detalhes do Arquivo</h3>
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-inner mb-6 bg-gray-50 flex items-center justify-center p-2">
                            <img src={selectedImage.url} alt={selectedImage.name} className="max-w-full max-h-full object-contain shadow-sm" />
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Informações</h4>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Nome', value: selectedImage.name },
                                        { label: 'Formato', value: selectedImage.type.split('/')[1].toUpperCase() },
                                        { label: 'Tamanho', value: formatBytes(selectedImage.size) },
                                        { label: 'Data', value: selectedImage.timestamp },
                                        { label: 'Origem', value: selectedImage.source.toUpperCase() },
                                    ].map((info, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-xs">
                                            <span className="text-gray-500">{info.label}</span>
                                            <span className="font-bold text-gray-800 text-right truncate max-w-[150px]">{info.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedImage.tags?.map((tag, idx) => (
                                        <span key={idx} className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-green-200">
                                            {tag}
                                        </span>
                                    ))}
                                    <button className="px-2 py-1 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-green-300 hover:text-green-600 transition-all text-[10px] font-bold flex items-center gap-1">
                                        <Plus size={10} /> ADD TAG
                                    </button>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
                                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gray-50 hover:bg-green-50 hover:text-green-600 hover:border-green-100 border border-transparent transition-all group">
                                    <Download size={20} className="text-gray-400 group-hover:text-green-600" />
                                    <span className="text-[10px] font-bold uppercase">Baixar</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 border border-transparent transition-all group">
                                    <Share2 size={20} className="text-gray-400 group-hover:text-blue-600" />
                                    <span className="text-[10px] font-bold uppercase">Enviar</span>
                                </button>
                                <button
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-transparent transition-all col-span-2 mt-2"
                                >
                                    <Trash2 size={20} />
                                    <span className="text-[10px] font-bold uppercase">Mover para Lixeira</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
