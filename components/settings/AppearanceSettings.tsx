import React from 'react';
import { Palette, Moon, Sun, Monitor, EyeOff, Keyboard, Layout } from 'lucide-react';
import { UserPreferences } from '../../hooks/useSettings';
import clsx from 'clsx';
import { toast } from 'sonner';

interface AppearanceSettingsProps {
    preferences: UserPreferences;
    setPreferences: (prefs: UserPreferences) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ preferences, setPreferences }) => {
    return (
        <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-pink-50 text-pink-600 rounded-2xl">
                    <Palette size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Aparência e Personalização</h2>
                    <p className="text-slate-500">Ajuste o visual do CRM para ficar do seu jeito.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Theme Toggle */}
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Monitor size={20} className="text-slate-400" />
                        Tema da Interface
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'light', label: 'Modo Claro', icon: Sun, desc: 'Ideal para ambientes iluminados.' },
                            { id: 'dark', label: 'Modo Escuro (Beta)', icon: Moon, desc: 'Conforto visual para trabalho noturno.' },
                            { id: 'system', label: 'Automático', icon: Monitor, desc: 'Segue o tema do seu computador.' },
                        ].map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => {
                                    setPreferences({ ...preferences, theme: theme.id as any });
                                    toast.success(`Tema ${theme.label} selecionado!`);
                                }}
                                className={clsx(
                                    "p-6 rounded-2xl border-2 transition-all text-left group",
                                    preferences.theme === theme.id
                                        ? "border-pink-500 bg-pink-50/50"
                                        : "border-slate-50 bg-slate-50 hover:border-slate-200"
                                )}
                            >
                                <theme.icon className={clsx("mb-4", preferences.theme === theme.id ? "text-pink-600" : "text-slate-400")} size={28} />
                                <p className="font-bold text-slate-800">{theme.label}</p>
                                <p className="text-xs text-slate-500 mt-1">{theme.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Behavioral Toggles */}
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Layout size={20} className="text-slate-400" />
                        Comportamento
                    </h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl h-fit">
                                    <EyeOff size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Modo Privacidade</p>
                                    <p className="text-xs text-slate-500">Borra nomes e fotos na tela principal.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreferences({ ...preferences, blurSensitive: !preferences.blurSensitive })}
                                className={clsx(
                                    'w-12 h-6 rounded-full relative transition-all duration-300',
                                    preferences.blurSensitive ? 'bg-pink-500' : 'bg-slate-200'
                                )}
                            >
                                <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', preferences.blurSensitive ? 'left-7 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]' : 'left-1 shadow-[2px_0_4px_rgba(0,0,0,0.1)]')} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl h-fit">
                                    <Keyboard size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Enviar com Enter</p>
                                    <p className="text-xs text-slate-500">Desative para usar Enter para pular linha.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreferences({ ...preferences, sendOnEnter: !preferences.sendOnEnter })}
                                className={clsx(
                                    'w-12 h-6 rounded-full relative transition-all duration-300',
                                    preferences.sendOnEnter ? 'bg-pink-500' : 'bg-slate-200'
                                )}
                            >
                                <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', preferences.sendOnEnter ? 'left-7 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]' : 'left-1 shadow-[2px_0_4px_rgba(0,0,0,0.1)]')} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Palette size={20} className="text-slate-400" />
                        Identidade Visual
                    </h3>
                    <p className="text-xs text-slate-400 mb-6">Em breve: Personalize as cores da marca e logo do seu CRM.</p>
                    <div className="flex gap-3">
                        {['#16a34a', '#2563eb', '#9333ea', '#ea580c', '#db2777'].map((color) => (
                            <div
                                key={color}
                                className="w-10 h-10 rounded-full border-4 border-white shadow-sm cursor-not-allowed opacity-50 transition-transform"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
