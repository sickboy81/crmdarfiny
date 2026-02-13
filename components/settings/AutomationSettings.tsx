import React, { useState } from 'react';
import {
    Clock,
    MessageCircle,
    Zap,
    Calendar,
    Save,
    ToggleLeft,
    ToggleRight,
    AlertCircle,
    Smile,
    Moon as MoonIcon,
    LogOut,
    Timer,
    Repeat,
} from 'lucide-react';
import clsx from 'clsx';

export interface BusinessHours {
    enabled: boolean;
    timezone: string;
    schedule: {
        [key: string]: { start: string; end: string; active: boolean };
    };
}

export interface AutoMessages {
    welcomeEnabled: boolean;
    welcomeMessage: string;
    awayEnabled: boolean;
    awayMessage: string;
    closingEnabled: boolean;
    closingMessage: string;
    followUpEnabled: boolean;
    followUpDelayHours: number;
    followUpMessage: string;
}

interface AutomationSettingsProps {
    businessHours: BusinessHours;
    setBusinessHours: (hours: BusinessHours) => void;
    autoMessages: AutoMessages;
    setAutoMessages: (msgs: AutoMessages) => void;
    onSave: () => void;
}

const DAYS = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

export const AutomationSettings: React.FC<AutomationSettingsProps> = ({
    businessHours,
    setBusinessHours,
    autoMessages,
    setAutoMessages,
    onSave,
}) => {
    const toggleDay = (day: string) => {
        const schedule = { ...businessHours.schedule };
        schedule[day] = { ...schedule[day], active: !schedule[day].active };
        setBusinessHours({ ...businessHours, schedule });
    };

    const updateDayTime = (day: string, field: 'start' | 'end', value: string) => {
        const schedule = { ...businessHours.schedule };
        schedule[day] = { ...schedule[day], [field]: value };
        setBusinessHours({ ...businessHours, schedule });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl">

            {/* Business Hours */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="text-orange-500" size={20} />
                        Horário de Atendimento
                    </h3>
                    <button
                        onClick={() => setBusinessHours({ ...businessHours, enabled: !businessHours.enabled })}
                        className={clsx(
                            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            businessHours.enabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                        )}
                        title={businessHours.enabled ? 'Desativar horário' : 'Ativar horário'}
                    >
                        {businessHours.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {businessHours.enabled ? 'Ativo' : 'Inativo'}
                    </button>
                </div>

                {businessHours.enabled && (
                    <>
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-orange-700">
                                Fora do horário de atendimento, a mensagem de ausência será enviada automaticamente.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {DAYS.map((day) => {
                                const daySchedule = businessHours.schedule[day.key];
                                return (
                                    <div
                                        key={day.key}
                                        className={clsx(
                                            'flex items-center gap-3 p-3 rounded-xl transition-all',
                                            daySchedule?.active ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                                        )}
                                    >
                                        <button
                                            onClick={() => toggleDay(day.key)}
                                            className={clsx(
                                                'w-10 h-5 rounded-full relative transition-colors shrink-0',
                                                daySchedule?.active ? 'bg-green-500' : 'bg-gray-300'
                                            )}
                                            title={`Ativar/desativar ${day.label}`}
                                        >
                                            <div className={clsx('w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all', daySchedule?.active ? 'left-[22px]' : 'left-[3px]')} />
                                        </button>
                                        <span className={clsx('w-20 text-sm font-medium', daySchedule?.active ? 'text-gray-800' : 'text-gray-400')}>
                                            {day.label}
                                        </span>
                                        {daySchedule?.active && (
                                            <div className="flex items-center gap-2 ml-auto">
                                                <input
                                                    type="time"
                                                    value={daySchedule.start}
                                                    onChange={(e) => updateDayTime(day.key, 'start', e.target.value)}
                                                    className="p-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                    title={`Início ${day.label}`}
                                                />
                                                <span className="text-gray-400 text-xs">até</span>
                                                <input
                                                    type="time"
                                                    value={daySchedule.end}
                                                    onChange={(e) => updateDayTime(day.key, 'end', e.target.value)}
                                                    className="p-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                    title={`Fim ${day.label}`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Welcome Message */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Smile className="text-yellow-500" size={20} />
                        Mensagem de Boas-Vindas
                    </h3>
                    <button
                        onClick={() => setAutoMessages({ ...autoMessages, welcomeEnabled: !autoMessages.welcomeEnabled })}
                        className={clsx(
                            'w-12 h-6 rounded-full relative transition-colors',
                            autoMessages.welcomeEnabled ? 'bg-green-500' : 'bg-gray-300'
                        )}
                        title={autoMessages.welcomeEnabled ? 'Desativar' : 'Ativar'}
                    >
                        <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', autoMessages.welcomeEnabled ? 'left-7' : 'left-1')} />
                    </button>
                </div>
                {autoMessages.welcomeEnabled && (
                    <>
                        <p className="text-xs text-gray-500">Enviada automaticamente quando um novo contato inicia uma conversa.</p>
                        <textarea
                            value={autoMessages.welcomeMessage}
                            onChange={(e) => setAutoMessages({ ...autoMessages, welcomeMessage: e.target.value })}
                            placeholder="Olá! 👋 Seja bem-vindo(a)! Como posso ajudar você hoje?"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900 h-24 resize-none"
                        />
                    </>
                )}
            </div>

            {/* Away Message */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <MoonIcon className="text-indigo-500" size={20} />
                        Mensagem de Ausência
                    </h3>
                    <button
                        onClick={() => setAutoMessages({ ...autoMessages, awayEnabled: !autoMessages.awayEnabled })}
                        className={clsx(
                            'w-12 h-6 rounded-full relative transition-colors',
                            autoMessages.awayEnabled ? 'bg-green-500' : 'bg-gray-300'
                        )}
                        title={autoMessages.awayEnabled ? 'Desativar' : 'Ativar'}
                    >
                        <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', autoMessages.awayEnabled ? 'left-7' : 'left-1')} />
                    </button>
                </div>
                {autoMessages.awayEnabled && (
                    <>
                        <p className="text-xs text-gray-500">Enviada quando um contato escreve fora do horário de atendimento.</p>
                        <textarea
                            value={autoMessages.awayMessage}
                            onChange={(e) => setAutoMessages({ ...autoMessages, awayMessage: e.target.value })}
                            placeholder="Obrigado por nos contatar! No momento estamos fora do horário de atendimento. Retornaremos em breve! ⏰"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-900 h-24 resize-none"
                        />
                    </>
                )}
            </div>

            {/* Closing Message */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <LogOut className="text-rose-500" size={20} />
                        Mensagem de Encerramento
                    </h3>
                    <button
                        onClick={() => setAutoMessages({ ...autoMessages, closingEnabled: !autoMessages.closingEnabled })}
                        className={clsx(
                            'w-12 h-6 rounded-full relative transition-colors',
                            autoMessages.closingEnabled ? 'bg-green-500' : 'bg-gray-300'
                        )}
                        title={autoMessages.closingEnabled ? 'Desativar' : 'Ativar'}
                    >
                        <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', autoMessages.closingEnabled ? 'left-7' : 'left-1')} />
                    </button>
                </div>
                {autoMessages.closingEnabled && (
                    <>
                        <p className="text-xs text-gray-500">Enviada ao encerrar/finalizar um atendimento.</p>
                        <textarea
                            value={autoMessages.closingMessage}
                            onChange={(e) => setAutoMessages({ ...autoMessages, closingMessage: e.target.value })}
                            placeholder="Obrigado pelo contato! Se precisar de algo mais, estamos à disposição. Tenha um ótimo dia! 😊"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:outline-none text-gray-900 h-24 resize-none"
                        />
                    </>
                )}
            </div>

            {/* Follow-Up Message */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Repeat className="text-teal-500" size={20} />
                        Follow-up Automático
                    </h3>
                    <button
                        onClick={() => setAutoMessages({ ...autoMessages, followUpEnabled: !autoMessages.followUpEnabled })}
                        className={clsx(
                            'w-12 h-6 rounded-full relative transition-colors',
                            autoMessages.followUpEnabled ? 'bg-green-500' : 'bg-gray-300'
                        )}
                        title={autoMessages.followUpEnabled ? 'Desativar' : 'Ativar'}
                    >
                        <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-1 transition-all', autoMessages.followUpEnabled ? 'left-7' : 'left-1')} />
                    </button>
                </div>
                {autoMessages.followUpEnabled && (
                    <>
                        <p className="text-xs text-gray-500">Enviada automaticamente se o lead não responder após um período.</p>
                        <div className="flex items-center gap-3 mb-2">
                            <Timer size={16} className="text-teal-500" />
                            <span className="text-sm text-gray-700">Enviar após</span>
                            <select
                                value={autoMessages.followUpDelayHours}
                                onChange={(e) => setAutoMessages({ ...autoMessages, followUpDelayHours: Number(e.target.value) })}
                                className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                                title="Tempo de espera"
                            >
                                <option value={1}>1 hora</option>
                                <option value={2}>2 horas</option>
                                <option value={6}>6 horas</option>
                                <option value={12}>12 horas</option>
                                <option value={24}>24 horas</option>
                                <option value={48}>48 horas</option>
                                <option value={72}>72 horas</option>
                            </select>
                            <span className="text-sm text-gray-700">sem resposta</span>
                        </div>
                        <textarea
                            value={autoMessages.followUpMessage}
                            onChange={(e) => setAutoMessages({ ...autoMessages, followUpMessage: e.target.value })}
                            placeholder="Olá! Notamos que você demonstrou interesse. Gostaria de agendar uma visita ou tem alguma dúvida? 🏠"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:outline-none text-gray-900 h-24 resize-none"
                        />
                    </>
                )}
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-200 transition-all hover:shadow-xl hover:shadow-orange-300"
                >
                    <Save size={18} />
                    Salvar Automações
                </button>
            </div>
        </div>
    );
};
