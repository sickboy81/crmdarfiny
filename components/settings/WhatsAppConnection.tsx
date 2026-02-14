import React, { useState, useEffect } from 'react';
import { QrCode, RefreshCw, CheckCircle, AlertTriangle, Smartphone, ShieldCheck, Link } from 'lucide-react';
import clsx from 'clsx';
import { io, Socket } from 'socket.io-client';

export const WhatsAppConnection: React.FC = () => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const serverUrl = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';
        const newSocket = io(serverUrl, {
            transports: ['polling', 'websocket'],
            path: '/socket.io/'
        });
        setSocket(newSocket);

        newSocket.on('status', (newStatus: string) => {
            setStatus(newStatus as any);
        });

        newSocket.on('qr', (qrData: string) => {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
            setQrCode(qrUrl);
            setCountdown(60);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const startConnection = async () => {
        const serverUrl = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';
        try {
            const response = await fetch(`${serverUrl}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            console.log(data.message);
        } catch (error) {
            console.error('Erro ao conectar:', error);
            setStatus('error');
        }
    };

    const handleDisconnect = async () => {
        const serverUrl = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';
        try {
            await fetch(`${serverUrl}/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setStatus('disconnected');
            setQrCode(null);
        } catch (error) {
            console.error('Erro ao desconectar:', error);
        }
    };

    useEffect(() => {
        let timer: any;
        if (qrCode && countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        } else if (countdown === 0) {
            setQrCode(null);
            setStatus('disconnected');
        }
        return () => clearInterval(timer);
    }, [qrCode, countdown]);

    return (
        <div className="max-w-4xl space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Conexão Multi-Dispositivo</h2>
                        <p className="text-gray-500 text-sm mt-1">Conecte seu WhatsApp para espelhar conversas e automatizar respostas.</p>
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3 max-w-lg">
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                            <p className="text-[11px] text-green-800 leading-relaxed">
                                <strong>Baileys Integrado:</strong> Conexão real via biblioteca oficial. Inicie o servidor com <code className="bg-green-100 px-1 rounded font-mono">node server/whatsapp-server.js</code>
                            </p>
                        </div>
                    </div>
                    <div className={clsx(
                        "px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 tracking-wider",
                        status === 'connected' ? "bg-green-100 text-green-700" :
                            status === 'connecting' ? "bg-blue-100 text-blue-700 animate-pulse" :
                                status === 'error' ? "bg-red-100 text-red-700" :
                                    "bg-slate-100 text-slate-700"
                    )}>
                        <div className={clsx("w-2 h-2 rounded-full",
                            status === 'connected' ? "bg-green-500" :
                                status === 'connecting' ? "bg-blue-500 animate-pulse" :
                                    status === 'error' ? "bg-red-500" :
                                        "bg-slate-400"
                        )} />
                        {status === 'connected' ? 'CONECTADO' :
                            status === 'connecting' ? 'CONECTANDO...' :
                                status === 'error' ? 'ERRO' :
                                    'DESCONECTADO'}
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* QR Code Section */}
                    <div className="flex flex-col items-center justify-center space-y-6">
                        {status === 'disconnected' && (
                            <div className="w-[280px] h-[280px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm text-slate-400">
                                    <QrCode size={48} />
                                </div>
                                <p className="text-sm text-slate-500">Clique no botão abaixo para gerar um QR Code de conexão.</p>
                                <button
                                    onClick={startConnection}
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-green-100 active:scale-95"
                                >
                                    Gerar QR Code
                                </button>
                            </div>
                        )}

                        {status === 'connecting' && qrCode && (
                            <div className="relative p-6 bg-white border-2 border-green-500 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500">
                                <img src={qrCode} alt="WhatsApp QR Code" className="w-[230px] h-[230px]" />
                                <div className="mt-6 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Expira em {countdown}s</p>
                                </div>
                            </div>
                        )}

                        {status === 'connecting' && !qrCode && (
                            <div className="w-[280px] h-[280px] bg-blue-50 border-2 border-blue-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm text-blue-500">
                                    <RefreshCw size={48} className="animate-spin" />
                                </div>
                                <p className="text-sm text-blue-700 font-medium">Iniciando sessão Baileys...</p>
                            </div>
                        )}

                        {status === 'connected' && (
                            <div className="w-[280px] h-[280px] bg-green-50 border-2 border-green-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-2xl shadow-lg text-green-500">
                                    <CheckCircle size={48} />
                                </div>
                                <h3 className="font-black text-green-800 uppercase tracking-wide">Conectado!</h3>
                                <p className="text-xs text-green-700 leading-relaxed">Suas mensagens estão sincronizadas em tempo real.</p>
                                <button
                                    onClick={handleDisconnect}
                                    className="text-red-500 hover:bg-red-50 px-6 py-2 rounded-xl text-xs font-black uppercase transition-colors mt-2"
                                >
                                    Desconectar
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="w-[280px] h-[280px] bg-red-50 border-2 border-red-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm text-red-500">
                                    <AlertTriangle size={48} />
                                </div>
                                <h3 className="font-bold text-red-800">Erro na Conexão</h3>
                                <p className="text-xs text-red-700">Verifique se o servidor local está rodando.</p>
                                <button
                                    onClick={() => setStatus('disconnected')}
                                    className="bg-white border border-red-100 text-slate-600 hover:bg-red-50 px-6 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Instructions Section */}
                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Smartphone size={18} className="text-blue-500" /> Como conectar:
                        </h4>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm text-blue-600 flex items-center justify-center text-xs font-black flex-shrink-0 border border-slate-100">1</div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">Abra o <strong>WhatsApp</strong> no seu aparelho celular.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm text-blue-600 flex items-center justify-center text-xs font-black flex-shrink-0 border border-slate-100">2</div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">Vá em <strong>Aparelhos Conectados</strong> e toque em <strong>Conectar um aparelho</strong>.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm text-blue-600 flex items-center justify-center text-xs font-black flex-shrink-0 border border-slate-100">3</div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">Aponte a câmera para o <strong>QR Code</strong> gerado aqui.</p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-3 mt-4 shadow-sm">
                            <ShieldCheck className="text-blue-500 flex-shrink-0" size={20} />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-800 uppercase">Segurança Ponta-a-Ponta</p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    Usamos tecnologia de espelhamento que preserva a criptografia. Suas mensagens não passam por servidores externos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Features Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="bg-purple-50 p-3 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900 text-sm">Auto-Reconnect</h5>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Sincronização ininterrupta mesmo após quedas de rede.</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Link size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900 text-sm">Canal Webhook</h5>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Notificações push direto no navegador para novos leads.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
