import React, { useState } from 'react';
import { MousePointer2, Code, Smartphone, MessageSquare, Copy, Check, ExternalLink, QrCode, Layout, Palette, Zap, X, Save, Download } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { toast } from 'sonner';
import clsx from 'clsx';
import { toPng } from 'html-to-image';

export const LeadCaptureSettings: React.FC = () => {
    const { settings, updateSettings } = useAppStore();
    const leadCapture = settings.leadCapture || {};
    const qrCardRef = React.useRef<HTMLDivElement>(null);

    const [themeColor, setThemeColor] = useState(leadCapture.themeColor || '#25D366');
    const [welcomeMessage, setWelcomeMessage] = useState(leadCapture.welcomeMessage || 'Olá! Gostaria de mais informações sobre este imóvel.');
    const [phoneNumber, setPhoneNumber] = useState(leadCapture.phoneNumber || '');
    const [position, setPosition] = useState<'right' | 'left'>(leadCapture.position || 'right');
    const [showLabel, setShowLabel] = useState(leadCapture.showLabel !== undefined ? leadCapture.showLabel : true);
    const [labelText, setLabelText] = useState(leadCapture.labelText || 'Falar com corretor');
    const [copied, setCopied] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);

    // QR Card Text Customization
    const [qrLabelTop, setQrLabelTop] = useState(leadCapture.qrLabelTop || 'Escaneie para falar no');
    const [qrTitle, setQrTitle] = useState(leadCapture.qrTitle || 'WHATSAPP');
    const [qrTagline, setQrTagline] = useState(leadCapture.qrTagline || 'Darfiny CRM · Automação Inteligente');

    const generatedCode = `
<!-- Início Widget WhatsApp CRM -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://crm-vibe-widgets.com/loader.js';
    script.onload = function() {
      VibeWidget.init({
        phoneNumber: '${phoneNumber || 'SEU_NUMERO'}',
        message: '${welcomeMessage}',
        color: '${themeColor}',
        position: '${position}',
        label: ${showLabel ? `'${labelText}'` : 'null'},
        source: 'Website_Widget'
      });
    };
    document.head.appendChild(script);
  })();
</script>
<!-- Fim Widget WhatsApp CRM -->
    `.trim();

    const handleSave = () => {
        updateSettings({
            leadCapture: {
                themeColor,
                welcomeMessage,
                phoneNumber,
                position,
                showLabel,
                labelText,
                qrLabelTop,
                qrTitle,
                qrTagline
            }
        });
        toast.success('Configurações salvas com sucesso!');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        toast.success('Código copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
    };

    const generateQRCode = () => {
        if (!phoneNumber) {
            toast.error('Por favor, informe seu número de WhatsApp primeiro.');
            return;
        }

        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(welcomeMessage)}`;
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(waLink)}`;

        setQrCodeUrl(url);
        setShowQRModal(true);
        toast.success('QR Code gerado com sucesso!');
    };

    return (
        <div className="max-w-5xl space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 p-8 rounded-3xl text-white shadow-lg shadow-green-100 flex justify-between items-center overflow-hidden relative">
                <Zap className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MousePointer2 size={24} />
                        Automação de Captura de Leads
                    </h2>
                    <p className="text-green-50 mt-2 max-w-lg">
                        Transforme visitantes do seu site em leads qualificados no seu CRM automaticamente via WhatsApp.
                    </p>
                </div>
                <div className="hidden md:flex flex-col items-end gap-3 relative z-10">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30">
                        <QrCode size={48} />
                    </div>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-white text-green-600 px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-green-50 transition-all active:scale-95"
                    >
                        <Save size={18} />
                        Salvar Configurações
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
                        <div>
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                                <Layout size={18} className="text-blue-500" />
                                Configuração do Widget
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Seu WhatsApp (com DDD)</label>
                                        <input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="Ex: 5511999999999"
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem de Boas-vindas</label>
                                        <textarea
                                            value={welcomeMessage}
                                            onChange={(e) => setWelcomeMessage(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                                            rows={3}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2">Esta mensagem será pré-preenchida no WhatsApp do cliente.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Tema</label>
                                        <div className="flex gap-3">
                                            {['#25D366', '#2563eb', '#7c3aed', '#db2777', '#ea580c'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setThemeColor(color)}
                                                    className={clsx(
                                                        "w-8 h-8 rounded-full border-2 transition-all",
                                                        themeColor === color ? "border-gray-900 scale-110 shadow-md" : "border-transparent"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                value={themeColor}
                                                onChange={(e) => setThemeColor(e.target.value)}
                                                className="w-8 h-8 rounded-full border-0 p-0 overflow-hidden cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Posição na Tela</label>
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button
                                                onClick={() => setPosition('left')}
                                                className={clsx("flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all", position === 'left' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
                                            >
                                                Esquerda
                                            </button>
                                            <button
                                                onClick={() => setPosition('right')}
                                                className={clsx("flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all", position === 'right' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
                                            >
                                                Direita
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Palette size={18} className="text-purple-500" />
                                    Textos do QR Code de Placa
                                </h3>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Label Superior</label>
                                    <input
                                        value={qrLabelTop}
                                        onChange={(e) => setQrLabelTop(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                        placeholder="Ex: Escaneie para falar no"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Título do Card</label>
                                    <input
                                        value={qrTitle}
                                        onChange={(e) => setQrTitle(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                        placeholder="Ex: WHATSAPP"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Tagline (Rodapé)</label>
                                    <input
                                        value={qrTagline}
                                        onChange={(e) => setQrTagline(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                        placeholder="Slogan ou nome da empresa..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <MessageSquare size={18} className="text-blue-500" />
                                        Etiqueta flutuante
                                    </h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={showLabel} onChange={() => setShowLabel(!showLabel)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {showLabel && (
                                    <input
                                        value={labelText}
                                        onChange={(e) => setLabelText(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                                        placeholder="Texto da etiqueta..."
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Embedding Code */}
                    <div className="bg-gray-900 rounded-2xl p-8 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Code size={18} className="text-green-400" />
                                Código de Integração
                            </h3>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copiado!' : 'Copiar Código'}
                            </button>
                        </div>
                        <p className="text-gray-400 text-xs">Copie e cole este código antes do fechamento da tag <code>&lt;/body&gt;</code> do seu site.</p>
                        <div className="p-4 bg-black/30 rounded-xl border border-white/5 overflow-x-auto">
                            <pre className="text-green-400 text-xs leading-relaxed">
                                {generatedCode}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 text-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pré-visualização Mobile</span>
                        </div>
                        <div className="flex-1 relative bg-gray-100 overflow-hidden">
                            {/* Mock Website Grid */}
                            <div className="p-4 space-y-4">
                                <div className="h-40 bg-white rounded-xl shadow-sm animate-pulse" />
                                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-20 bg-white rounded-xl shadow-sm animate-pulse" />
                                    <div className="h-20 bg-white rounded-xl shadow-sm animate-pulse" />
                                </div>
                            </div>

                            {/* Floating Button Preview */}
                            <div className={clsx(
                                "absolute bottom-8 transition-all duration-500 flex items-center gap-3",
                                position === 'right' ? "right-6" : "left-6 flex-row-reverse"
                            )}>
                                {showLabel && (
                                    <div className="bg-white shadow-xl px-4 py-2 rounded-full border border-gray-100">
                                        <p className="text-[11px] font-bold text-gray-800 whitespace-nowrap">{labelText}</p>
                                    </div>
                                )}
                                <div
                                    className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform active:scale-95"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <MessageSquare size={28} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2 mb-2">
                            <Smartphone size={16} /> QR Code de Captura
                        </h4>
                        <p className="text-xs text-blue-700 leading-relaxed mb-4">
                            Gere um QR Code para imprimir em placas ou panfletos. Ao escanear, o lead é criado no CRM com uma tag de origem física.
                        </p>
                        <button
                            onClick={generateQRCode}
                            className="w-full bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 flex items-center justify-center gap-2"
                        >
                            <QrCode size={14} /> Gerar QR Code de Placa
                        </button>
                    </div>
                </div>
            </div>

            {/* Premium QR Code Modal */}
            {showQRModal && qrCodeUrl && (
                <div className="fixed inset-0 z-[999] bg-[#0F172A]/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
                    <div
                        ref={qrCardRef}
                        className="relative w-full max-w-[380px] aspect-[3/4] rounded-[40px] shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in zoom-in-95 duration-500"
                        onClick={e => e.stopPropagation()}
                        style={{ background: `linear-gradient(135deg, ${themeColor} 0%, #0F172A 100%)` }}
                    >
                        {/* Decorative Patterns (Instagram-like) */}
                        <div className="absolute inset-0 opacity-20">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-32 h-32 border-4 border-white rounded-full"
                                    style={{
                                        top: `${Math.random() * 100}%`,
                                        left: `${Math.random() * 100}%`,
                                        transform: `scale(${0.5 + Math.random()})`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Card Content */}
                        <div className="relative h-full flex flex-col items-center justify-between p-10 text-white">
                            <div className="text-center space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{qrLabelTop}</p>
                                <h3 className="text-2xl font-black tracking-tight">{qrTitle}</h3>
                            </div>

                            {/* Stylized QR Container */}
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-white/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative bg-white p-6 rounded-[32px] shadow-2xl">
                                    <img
                                        src={qrCodeUrl}
                                        alt="QR Code Lead"
                                        className="w-48 h-48 rounded-lg"
                                    />
                                    {/* Logo Overlay in Center */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-2xl shadow-lg border-4 border-white">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: themeColor }}>
                                            <MessageSquare size={18} fill="white" className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-lg font-bold tracking-tight mb-1">{phoneNumber}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{qrTagline}</p>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={async () => {
                                        if (!qrCardRef.current) return;
                                        try {
                                            const dataUrl = await toPng(qrCardRef.current, {
                                                cacheBust: true,
                                                pixelRatio: 2, // High quality
                                            });
                                            const link = document.createElement('a');
                                            link.download = `placa-qr-lead-${phoneNumber || 'contato'}.png`;
                                            link.href = dataUrl;
                                            link.click();
                                            toast.success('Placa do QR Code salva com sucesso!');
                                        } catch (err) {
                                            toast.error('Erro ao gerar imagem da placa.');
                                            console.error(err);
                                        }
                                    }}
                                    className="flex-1 bg-white text-gray-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Download size={14} /> Download Placa PNG
                                </button>
                                <button
                                    onClick={() => setShowQRModal(false)}
                                    className="w-14 h-14 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
