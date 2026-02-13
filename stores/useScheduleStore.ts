import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Meeting } from '../types';

interface ScheduleState {
    meetings: Meeting[];

    // Actions
    addMeeting: (meeting: Meeting) => void;
    updateMeeting: (id: string, updates: Partial<Meeting>) => void;
    deleteMeeting: (id: string) => void;
    getMeetingsByDate: (date: Date) => Meeting[];
}

export const useScheduleStore = create<ScheduleState>()(
    persist(
        (set, get) => ({
            meetings: [],

            addMeeting: (meeting) =>
                set((state) => ({ meetings: [...state.meetings, meeting] })),

            updateMeeting: (id, updates) =>
                set((state) => ({
                    meetings: state.meetings.map((m) =>
                        m.id === id ? { ...m, ...updates } : m
                    ),
                })),

            deleteMeeting: (id) =>
                set((state) => ({
                    meetings: state.meetings.filter((m) => m.id !== id),
                })),

            getMeetingsByDate: (date) => {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);

                return get().meetings.filter(m => {
                    const mDate = new Date(m.date);
                    return mDate >= start && mDate <= end;
                });
            }
        }),
        {
            name: 'zapr-schedule-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
