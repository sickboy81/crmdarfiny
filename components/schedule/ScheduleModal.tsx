import React, { useState } from 'react';
import { useScheduleStore } from '../../stores/useScheduleStore';
import { useRealEstateStore } from '../../stores/useRealEstateStore';
import { MEETING_TYPES } from '../../constants';
import { X, Calendar, Clock, MapPin, Check } from 'lucide-react';
import { Meeting, Contact } from '../../types';

interface ScheduleModalProps {
    contact: Contact;
    onClose: () => void;
    onSchedule: (meeting: Meeting) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ contact, onClose, onSchedule }) => {
    const { addMeeting } = useScheduleStore();
    const { properties } = useRealEstateStore();

    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [type, setType] = useState<Meeting['type']>('visit');
    const [propertyId, setPropertyId] = useState('');
    const [notes, setNotes] = useState('');

    const handleSave = () => {
        if (!date || !time) return;

        const meetingDate = new Date(`${date}T${time}`);

        const newMeeting: Meeting = {
            id: `mtg-${Date.now()}`,
            contactId: contact.id,
            propertyId: propertyId || undefined,
            date: meetingDate.toISOString(),
            type,
            status: 'scheduled',
            notes
        };

        addMeeting(newMeeting);
        onSchedule(newMeeting);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Agendar Visita</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Agendamento</label>
                        <div className="grid grid-cols-3 gap-2">
                            {MEETING_TYPES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id as any)}
                                    className={`p-2 rounded-lg text-xs font-medium border transition-all ${type === t.id
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="date"
                                    className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="time"
                                    className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {type === 'visit' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Imóvel (Opcional)</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white"
                                    value={propertyId}
                                    onChange={(e) => setPropertyId(e.target.value)}
                                >
                                    <option value="">Selecione um imóvel...</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                        <textarea
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
                            placeholder="Observações sobre a visita..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!date || !time}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Check size={16} /> Confirmar Agendamento
                    </button>
                </div>
            </div>
        </div>
    );
};
