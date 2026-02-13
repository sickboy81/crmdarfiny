import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Property, Meeting } from '../types';

interface RealEstateState {
    properties: Property[];
    meetings: Meeting[];

    // Actions
    addProperty: (property: Property) => void;
    updateProperty: (id: string, updates: Partial<Property>) => void;
    deleteProperty: (id: string) => void;

    addMeeting: (meeting: Meeting) => void;
    updateMeeting: (id: string, updates: Partial<Meeting>) => void;
    deleteMeeting: (id: string) => void;
    setProperties: (properties: Property[]) => void;
}

// Initial mock data
const initialProperties: Property[] = [];


export const useRealEstateStore = create<RealEstateState>()(
    persist(
        (set) => ({
            properties: initialProperties,
            meetings: [],

            addProperty: (property) =>
                set((state) => ({ properties: [...state.properties, property] })),

            updateProperty: (id, updates) =>
                set((state) => ({
                    properties: state.properties.map((p) =>
                        p.id === id ? { ...p, ...updates } : p
                    ),
                })),

            deleteProperty: (id) =>
                set((state) => ({
                    properties: state.properties.filter((p) => p.id !== id),
                })),

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

            setProperties: (properties) => set({ properties }),
        }),
        {
            name: 'zapr-real-estate-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
