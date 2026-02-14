import React, { useState, useEffect, useRef } from 'react';
import {
    Link,
    Plus,
    Trash2,
    Move,
    ExternalLink,
    Smartphone,
    Palette,
    Type,
    Image as ImageIcon,
    Layout,
    Save,
    Copy,
    Check,
    Instagram,
    Facebook,
    Twitter,
    Linkedin,
    Search,
    MessageSquare,
    Zap,
    Globe
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { bioService } from '../services/bioService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import clsx from 'clsx';

interface BioLink {
    id: string;
    title: string;
    url: string;
    icon?: string;
    active: boolean;
}

interface LinkBioConfig {
    profileName: string;
    bio: string;
    avatarUrl: string;
    theme: {
        backgroundColor: string;
        buttonColor: string;
        textColor: string;
        buttonTextColor: string;
        fontFamily: string;
        cardStyle: 'flat' | 'rounded' | 'glass' | 'shadow';
    };
    links: BioLink[];
    socials: {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        linkedin?: string;
    };
}

const DEFAULT_CONFIG: LinkBioConfig = {
    profileName: 'Seu Nome ou Empresa',
    bio: 'Personalize sua bio aqui. Adicione links importantes e redes sociais.',
    avatarUrl: 'https://ui-avatars.com/api/?name=User&background=random',
    theme: {
        backgroundColor: '#0F172A',
        buttonColor: '#25D366',
        textColor: '#FFFFFF',
        buttonTextColor: '#000000',
        fontFamily: 'sans-serif',
        cardStyle: 'rounded'
    },
    links: [
        { id: '1', title: 'Falar no WhatsApp', url: 'https://wa.me/5511999999999', active: true },
        { id: '2', title: 'Ver Site Oficial', url: 'https://google.com', active: true }
    ],
    socials: {}
};

export const LinkBio: React.FC = () => {
    const { settings, updateSettings, user } = useAppStore();
    const [config, setConfig] = useState<LinkBioConfig>(settings.linkBio || DEFAULT_CONFIG);
    const [activeTab, setActiveTab] = useState<'content' | 'appearance' | 'share'>('content');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadBio = async () => {
            if (user?.id) {
                const dbBio = await bioService.getBioConfig(user.id);
                if (dbBio) {
                    setConfig({
                        profileName: dbBio.profile_name,
                        bio: dbBio.bio,
                        avatarUrl: dbBio.avatar_url,
                        theme: dbBio.theme,
                        links: dbBio.links,
                        socials: dbBio.socials
                    });
                }
            }
        };
        loadBio();
    }, [user?.id]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 2MB.');
            return;
        }

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/avatar.${fileExt}`;
            const filePath = `${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('bio-assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.error('Upload Error:', uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('bio-assets')
                .getPublicUrl(filePath);

            setConfig(prev => ({ ...prev, avatarUrl: publicUrl }));
            toast.success('Imagem carregada com sucesso!');
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error('Erro ao fazer upload da imagem.');
        }
    };

    const handleSave = async () => {
        console.log('Attempting to save bio. User ID:', user?.id);
        if (!user?.id) {
            toast.error('Usuário não autenticado!');
            return;
        }

        try {
            console.log('Save payload:', config);
            await bioService.saveBioConfig(user.id, config);
            updateSettings({ linkBio: config });
            toast.success('Configurações da Bio salvas no banco de dados!');
        } catch (error: any) {
            console.error('Explicit save error:', error);
            toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const addLink = () => {
        const newLink: BioLink = {
            id: Date.now().toString(),
            title: 'Novo Link',
            url: 'https://',
            active: true
        };
        setConfig(prev => ({ ...prev, links: [...prev.links, newLink] }));
    };

    const removeLink = (id: string) => {
        setConfig(prev => ({ ...prev, links: prev.links.filter(l => l.id !== id) }));
    };

    const updateLink = (id: string, updates: Partial<BioLink>) => {
        setConfig(prev => ({
            ...prev,
            links: prev.links.map(l => l.id === id ? { ...l, ...updates } : l)
        }));
    };

    const copyBioLink = () => {
        // Points to the main domain, assuming a Vercel Rewrite is configured there
        const url = `https://darfinyavila.com.br/bio`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link da Bio copiado!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-gray-50 dark:bg-slate-950">
            {/* Sidebar Editor */}
            <div className="w-full lg:w-[450px] flex flex-col border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {/* Tabs Header */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2 dark:text-white">
                        <Globe size={20} className="text-green-500" />
                        Bio Link Pró
                    </h2>
                    <button
                        onClick={handleSave}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-2"
                    >
                        <Save size={14} /> Salvar
                    </button>
                </div>

                <div className="flex p-2 bg-gray-100 dark:bg-slate-800 mx-4 mt-4 rounded-xl">
                    <button
                        onClick={() => setActiveTab('content')}
                        className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'content' ? "bg-white dark:bg-slate-700 shadow-sm dark:text-white" : "text-gray-500")}
                    >
                        Conteúdo
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'appearance' ? "bg-white dark:bg-slate-700 shadow-sm dark:text-white" : "text-gray-500")}
                    >
                        Design
                    </button>
                    <button
                        onClick={() => setActiveTab('share')}
                        className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'share' ? "bg-white dark:bg-slate-700 shadow-sm dark:text-white" : "text-gray-500")}
                    >
                        Divulgação
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            {/* Profile Info */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Perfil</h3>
                                <div className="flex items-center gap-4">
                                    <div className="relative group" onClick={() => fileInputRef.current?.click()}>
                                        <img src={config.avatarUrl} alt="Avatar Preview" className="w-16 h-16 rounded-full border-2 border-gray-100 dark:border-slate-700 object-cover" />
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <ImageIcon size={18} className="text-white" />
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <input
                                            value={config.profileName}
                                            onChange={e => setConfig({ ...config, profileName: e.target.value })}
                                            className="w-full p-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-sm font-bold dark:text-white focus:ring-2 focus:ring-green-500/20"
                                            placeholder="Nome do Perfil"
                                        />
                                        <textarea
                                            value={config.bio}
                                            onChange={e => setConfig({ ...config, bio: e.target.value })}
                                            className="w-full p-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-xs dark:text-gray-300 focus:ring-2 focus:ring-green-500/20"
                                            placeholder="Breve descrição..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Links List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Meus Links</h3>
                                    <button onClick={addLink} className="text-green-500 hover:text-green-600 flex items-center gap-1 text-xs font-bold">
                                        <Plus size={14} /> Adicionar
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {config.links.map(link => (
                                        <div key={link.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-3 group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Move size={14} className="text-gray-400 cursor-move" />
                                                    <input
                                                        value={link.title}
                                                        onChange={e => updateLink(link.id, { title: e.target.value })}
                                                        className="bg-transparent border-none font-bold text-sm focus:ring-0 p-0 dark:text-white"
                                                        placeholder="Título do botão"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateLink(link.id, { active: !link.active })}
                                                        className={clsx("w-8 h-4 rounded-full transition-all relative", link.active ? "bg-green-500" : "bg-gray-300")}
                                                    >
                                                        <div className={clsx("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", link.active ? "right-0.5" : "left-0.5")} />
                                                    </button>
                                                    <button onClick={() => removeLink(link.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                                                <ExternalLink size={12} className="text-gray-400" />
                                                <input
                                                    value={link.url}
                                                    onChange={e => updateLink(link.id, { url: e.target.value })}
                                                    className="bg-transparent border-none text-[11px] w-full focus:ring-0 p-0 dark:text-gray-400"
                                                    placeholder="URL ou Link"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Socials */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Redes Sociais (Username)</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg">
                                        <Instagram size={14} className="text-pink-500" />
                                        <input
                                            value={config.socials.instagram || ''}
                                            onChange={e => setConfig({ ...config, socials: { ...config.socials, instagram: e.target.value } })}
                                            className="bg-transparent border-none text-[11px] w-full focus:ring-0 p-0 dark:text-white"
                                            placeholder="Instagram"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg">
                                        <Linkedin size={14} className="text-blue-600" />
                                        <input
                                            value={config.socials.linkedin || ''}
                                            onChange={e => setConfig({ ...config, socials: { ...config.socials, linkedin: e.target.value } })}
                                            className="bg-transparent border-none text-[11px] w-full focus:ring-0 p-0 dark:text-white"
                                            placeholder="Linkedin"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-in slide-in-from-right-2 duration-300">
                            {/* Colors */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Esquema de Cores</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500">Fundo</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={config.theme.backgroundColor} onChange={e => setConfig({ ...config, theme: { ...config.theme, backgroundColor: e.target.value } })} className="w-8 h-8 rounded-lg overflow-hidden border-none" />
                                            <span className="text-[10px] font-mono dark:text-white uppercase">{config.theme.backgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500">Botões</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={config.theme.buttonColor} onChange={e => setConfig({ ...config, theme: { ...config.theme, buttonColor: e.target.value } })} className="w-8 h-8 rounded-lg overflow-hidden border-none" />
                                            <span className="text-[10px] font-mono dark:text-white uppercase">{config.theme.buttonColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500">Texto Botão</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={config.theme.buttonTextColor} onChange={e => setConfig({ ...config, theme: { ...config.theme, buttonTextColor: e.target.value } })} className="w-8 h-8 rounded-lg overflow-hidden border-none" />
                                            <span className="text-[10px] font-mono dark:text-white uppercase">{config.theme.buttonTextColor}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Styles */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estilo dos Card</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['flat', 'rounded', 'glass', 'shadow'] as const).map(style => (
                                        <button
                                            key={style}
                                            onClick={() => setConfig({ ...config, theme: { ...config.theme, cardStyle: style } })}
                                            className={clsx(
                                                "p-3 rounded-xl border text-[11px] font-bold capitalize transition-all",
                                                config.theme.cardStyle === style ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20" : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 dark:text-white"
                                            )}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'share' && (
                        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-900/30 text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto">
                                    <ExternalLink size={32} className="text-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold dark:text-white">Seu link está pronto!</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Copie e use na sua bio do Instagram, TikTok ou WhatsApp.</p>
                                </div>
                                <div className="flex bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-200 dark:border-slate-800 items-center gap-3">
                                    <span className="flex-1 text-[11px] text-gray-400 font-mono truncate px-2">
                                        {window.location.origin}/bio
                                    </span>
                                    <button
                                        onClick={copyBioLink}
                                        className="bg-gray-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all"
                                    >
                                        {copied ? <Check size={14} /> : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-400 flex items-center gap-2 mb-2">
                                    <Zap size={16} /> Dica de Performance
                                </h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300/80 leading-relaxed">
                                    Adicione o link do seu **WhatsApp Direct** no topo da lista para converter visitantes mais rápido. Use cores contrastantes nos botões.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Mockup */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-100 dark:bg-slate-950 overflow-y-auto">
                <div className="relative w-[340px] aspect-[9/18.5] bg-white rounded-[45px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-[8px] border-slate-900 dark:border-slate-800 overflow-hidden">
                    {/* Top Bar Mock */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-900 rounded-b-2xl z-20 flex items-center justify-center">
                        <div className="w-12 h-1 bg-white/20 rounded-full" />
                    </div>

                    <div
                        className="h-full w-full overflow-y-auto p-6 pt-12 flex flex-col items-center custom-scrollbar"
                        style={{ backgroundColor: config.theme.backgroundColor }}
                    >
                        {/* Avatar */}
                        <img
                            src={config.avatarUrl}
                            alt={config.profileName}
                            className="w-24 h-24 rounded-full border-4 border-white/20 shadow-xl mb-4 object-cover"
                        />

                        {/* Name & Bio */}
                        <div className="text-center space-y-2 mb-8">
                            <h1 className="text-xl font-black tracking-tight" style={{ color: config.theme.textColor }}>
                                {config.profileName}
                            </h1>
                            <p className="text-xs opacity-80 leading-relaxed px-4" style={{ color: config.theme.textColor }}>
                                {config.bio}
                            </p>
                        </div>

                        {/* Links */}
                        <div className="w-full space-y-3">
                            {config.links.filter(l => l.active).map(link => (
                                <div
                                    key={link.id}
                                    className={clsx(
                                        "w-full py-4 px-6 text-center text-sm font-black tracking-tight transition-transform active:scale-95 cursor-pointer",
                                        config.theme.cardStyle === 'rounded' && "rounded-2xl",
                                        config.theme.cardStyle === 'flat' && "rounded-none",
                                        config.theme.cardStyle === 'shadow' && "rounded-2xl shadow-xl",
                                        config.theme.cardStyle === 'glass' && "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20"
                                    )}
                                    style={{
                                        backgroundColor: config.theme.cardStyle === 'glass' ? 'transparent' : config.theme.buttonColor,
                                        color: config.theme.buttonTextColor,
                                        boxShadow: config.theme.cardStyle === 'shadow' ? `0 10px 15px -3px ${config.theme.buttonColor}40` : 'none'
                                    }}
                                >
                                    {link.title}
                                </div>
                            ))}
                        </div>

                        {/* Social Icons */}
                        <div className="mt-8 flex gap-5">
                            {config.socials.instagram && <Instagram size={20} style={{ color: config.theme.textColor }} className="opacity-80" />}
                            {config.socials.linkedin && <Linkedin size={20} style={{ color: config.theme.textColor }} className="opacity-80" />}
                            {config.socials.twitter && <Twitter size={20} style={{ color: config.theme.textColor }} className="opacity-80" />}
                            {config.socials.facebook && <Facebook size={20} style={{ color: config.theme.textColor }} className="opacity-80" />}
                        </div>

                        {/* Logo / Footer */}
                        <div className="mt-auto py-8">
                            <div className="flex items-center gap-2 opacity-30 grayscale" style={{ color: config.theme.textColor }}>
                                <Zap size={14} fill="currentColor" />
                                <span className="text-[10px] font-black tracking-widest uppercase">Egeolabs - 2026</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
