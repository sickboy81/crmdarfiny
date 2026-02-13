import React, { useState, useEffect } from 'react';
import { QrCode, RefreshCw, CheckCircle2, AlertCircle, Smartphone, ShieldCheck, Link2 } from 'lucide-react';
import clsx from 'clsx';
import { io, Socket } from 'socket.io-client';

export const WhatsAppConnection: React.FC = () => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(60);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const serverUrl = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';
        const newSocket = io(serverUrl);
        setSocket(newSocket);

        newSocket.on('status', (newStatus: string) => {
            setStatus(newStatus as any);
        });

        newSocket.on('qr', (qrData: string) => {
            // Gera QR Code a partir dos dados do Baileys
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Conexão Multi-Dispositivo</h2>
                        <p className="text-gray-500 text-sm mt-1">Conecte seu WhatsApp para espelhar conversas e automatizar respostas.</p>
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-start gap-2 max-w-lg">
                            <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                            <p className="text-[11px] text-green-800">
                                <strong>Baileys Integrado:</strong> Conexão real via biblioteca oficial. Inicie o servidor com <code className="bg-green-100 px-1 rounded">node server/whatsapp-server.js</code>
                            </p>
                        </div>
                    </div>
                    <div className={clsx(
                        "px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2",
                        status === 'connected' ? "bg-green-100 text-green-700" :
                            status === 'connecting' ? "bg-blue-100 text-blue-700 animate-pulse" :
                                status === 'error' ? "bg-red-100 text-red-700" :
                                    "bg-gray-100 text-gray-700"
                    )}>
                        <div className={clsx("w-2 h-2 rounded-full",
                            status === 'connected' ? "bg-green-500" :
                                status === 'connecting' ? "bg-blue-500 animate-pulse" :
                                    status === 'error' ? "bg-red-500" :
                                        "bg-gray-400"
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
                            <div className="w-[280px] h-[280px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-full shadow-sm text-gray-400">
                                    <QrCode size={48} />
                                </div>
                                <p className="text-sm text-gray-500">Clique no botão abaixo para gerar um QR Code de conexão.</p>
                                <button
                                    onClick={startConnection}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md shadow-green-100 active:scale-95"
                                >
                                    Conectar WhatsApp
                                </button>
                            </div>
                        )}

                        {status === 'connecting' && qrCode && (
                            <div className="relative p-4 bg-white border-2 border-green-500 rounded-2xl shadow-xl animate-in zoom-in-95 duration-300">
                                <img src={qrCode} alt="WhatsApp QR Code" className="w-[250px] h-[250px]" />
                                <div className="absolute inset-0 bg-white/10 pointer-events-none" />
                                <div className="mt-4 text-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expira em {countdown}s</p>
                                </div>
                            </div>
                        )}

                        {status === 'connecting' && !qrCode && (
                            <div className="w-[280px] h-[280px] bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-full shadow-sm text-blue-500 animate-pulse">
                                    <RefreshCw size={48} className="animate-spin" />
                                </div>
                                <p className="text-sm text-blue-700">Aguardando QR Code do servidor...</p>
                            </div>
                        )}

                        {status === 'connected' && (
                            <div className="w-[280px] h-[280px] bg-green-50 border-2 border-green-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-full shadow-sm text-green-500">
                                    <CheckCircle2 size={48} />
                                </div>
                                <h3 className="font-bold text-green-800">WhatsApp Conectado!</h3>
                                <p className="text-xs text-green-700">As mensagens agora estão sendo sincronizadas em tempo real com seu CRM.</p>
                                <button
                                    onClick={handleDisconnect}
                                    className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                                >
                                    Desconectar
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="w-[280px] h-[280px] bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
                                <div className="bg-white p-4 rounded-full shadow-sm text-red-500">
                                    <AlertCircle size={48} />
                                </div>
                                <h3 className="font-bold text-red-800">Erro na Conexão</h3>
                                <p className="text-xs text-red-700">Verifique se o servidor está rodando na porta 3001</p>
                                <button
                                    onClick={() => setStatus('disconnected')}
                                    className="text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Instructions Section */}
                    <div className="space-y-6">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Smartphone size={18} className="text-blue-500" /> Como conectar:
                        </h4>
                        <ol className="space-y-4">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                                <p className="text-sm text-gray-600">Abra o **WhatsApp** no seu aparelho celular.</p>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                                <p className="text-sm text-gray-600">Toque em **Aparelhos Conectados** no seu menu de configurações.</p>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                                <p className="text-sm text-gray-600">Toque em **Conectar um aparelho** e aponte a câmera para o QR Code ao lado.</p>
                            </li>
                        </ol>

                        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3">
                            <ShieldCheck className="text-yellow-600 flex-shrink-0" size={20} />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-yellow-800">Segurança da Sessão</p>
                                <p className="text-[10px] text-yellow-700 leading-relaxed">
                                    Usamos tecnologia de espelhamento multi-dispositivo. Suas mensagens são criptografadas e não ficam armazenadas em nossos servidores após o envio para o CRM.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Features Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-start gap-4">
                    <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900 text-sm">Auto-Reconnect</h5>
                        <p className="text-xs text-gray-500 mt-1">Conecta automaticamente caso a sessão caia por instabilidade.</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-start gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                        <Smartphone size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900 text-sm">Multi-Agente</h5>
                        <p className="text-xs text-gray-500 mt-1">Sua equipe pode responder usando o mesmo número conectado.</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-start gap-4">
                    <div className="bg-green-50 p-3 rounded-xl text-green-600">
                        <Link2 size={24} />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900 text-sm">API Webhook</h5>
                        <p className="text-xs text-gray-500 mt-1">Notificações instantâneas de novas conversas no Kanban.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
