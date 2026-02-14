import React from 'react';
import { Bell, Speaker, MessageSquare, Target, Mail, ShieldAlert, Volume2 } from 'lucide-react';
import { UserPreferences } from '../../hooks/useSettings';
import clsx from 'clsx';
import { toast } from 'sonner';

interface NotificationSettingsProps {
    preferences: UserPreferences;
    setPreferences: (prefs: UserPreferences) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ preferences, setPreferences }) => {
    return (
        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl">
                    <Bell size={32} />
                </div>
                <div className="flex items-center justify-between w-full">
                    <div>
                        <h4 className="text-gray-800 font-semibold mb-1">Canais de Notificação</h4>
                        <p className="text-xs text-gray-400">Escolha quais eventos disparam alertas no sistema</p>
                    </div>
                    <button
                        onClick={() => {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                            audio.play().catch(() => { });
                            toast('Prévia do som de alerta');
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-bold px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg transition-colors flex items-center gap-2"
                        title="Ouvir som de notificação atual"
                    >
                        <Volume2 size={14} />
                        Ouvir Alerta
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-10">
                {/* Global Audio Toggle */}
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex gap-4">
                        <div className="p-3 bg-yellow-500 text-white rounded-xl shadow-lg shadow-yellow-200">
                            <Speaker size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">Efeitos Sonoros do Sistema</p>
                            <p className="text-sm text-slate-500">Habilitar sons para alertas, mensagens e notificações.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setPreferences({ ...preferences, playSounds: !preferences.playSounds });
                            toast.success(preferences.playSounds ? 'Sons silenciados' : 'Sons ativados!');
                        }}
                        className={clsx(
                            'w-14 h-7 rounded-full relative transition-all duration-300',
                            preferences.playSounds ? 'bg-yellow-500' : 'bg-slate-300'
                        )}
                    >
                        <div className={clsx('w-5 h-5 bg-white rounded-full absolute top-1 transition-all', preferences.playSounds ? 'left-8 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]' : 'left-1 shadow-[2px_0_4px_rgba(0,0,0,0.1)]')} />
                    </button>
                </div>

                {/* Specific Event Notifications */}
                <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Alertas por Evento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { id: 'wa' as const, label: 'WhatsApp', desc: 'Novas mensagens recebidas.', icon: MessageSquare, color: 'text-green-500' },
                            { id: 'leads' as const, label: 'Central de Leads', desc: 'Conclusão de importação de arquivos.', icon: Target, color: 'text-orange-500' },
                            { id: 'email' as const, label: 'E-mail Manager', desc: 'Confirmação de disparos e erros.', icon: Mail, color: 'text-blue-500' },
                            { id: 'system' as const, label: 'Segurança', desc: 'Tentativas de login e acessos.', icon: ShieldAlert, color: 'text-red-500' },
                        ].map((event) => (
                            <div key={event.id} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-yellow-200 hover:shadow-md transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={clsx("p-2 bg-slate-50 rounded-lg group-hover:bg-yellow-50 transition-colors", event.color)}>
                                        <event.icon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{event.label}</p>
                                        <p className="text-[11px] text-slate-500">{event.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const newEvents = {
                                            ...preferences.notificationEvents,
                                            [event.id]: !preferences.notificationEvents?.[event.id]
                                        };
                                        setPreferences({ ...preferences, notificationEvents: newEvents });
                                        toast.success(`${event.label}: ${newEvents[event.id] ? 'Ativado' : 'Desativado'}`);
                                    }}
                                    className={clsx(
                                        'w-10 h-5 rounded-full relative transition-all duration-300',
                                        preferences.notificationEvents?.[event.id] ? 'bg-green-500' : 'bg-slate-300'
                                    )}
                                >
                                    <div className={clsx(
                                        'w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all',
                                        preferences.notificationEvents?.[event.id] ? 'left-6' : 'left-0.5'
                                    )} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Desktop Notifications */}
                <div className="pt-6 border-t border-slate-50">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h4 className="font-bold text-lg mb-1">Notificações na Área de Trabalho</h4>
                            <p className="text-slate-400 text-sm">Receba alertas mesmo com o navegador em segundo plano.</p>
                        </div>
                        <button
                            onClick={() => {
                                if ("Notification" in window) {
                                    Notification.requestPermission().then(permission => {
                                        if (permission === "granted") toast.success("Permissão concedida!");
                                    });
                                }
                            }}
                            className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all shadow-xl active:scale-95"
                        >
                            PEDIR PERMISSÃO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
