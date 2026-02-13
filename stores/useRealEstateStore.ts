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
const initialProperties: Property[] = [
    {
        id: 'prop-1',
        code: 'AP-101',
        title: 'Apartamento de Luxo no Jardins',
        description: 'Excelente apartamento com 3 suítes, varanda gourmet e vista panorâmica. Condomínio com lazer completo.',
        type: 'apartment',
        status: 'available',
        price: 2500000,
        address: 'Rua Oscar Freire, 1234',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        features: ['Piscina', 'Academia', 'Portaria 24h', 'Varanda Gourmet'],
        specs: {
            area: 180,
            bedrooms: 3,
            bathrooms: 4,
            parking: 3
        },
        photos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'],
    },
    {
        id: 'prop-2',
        code: 'CS-202',
        title: 'Casa em Condomínio Fechado',
        description: 'Casa moderna com projeto arquitetônico premiado. Área de lazer privativa e segurança total.',
        type: 'house',
        status: 'available',
        price: 4200000,
        address: 'Av. Morumbi, 4500',
        neighborhood: 'Morumbi',
        city: 'São Paulo',
        features: ['Piscina Privativa', 'Jardim', 'Lareira', 'Home Theater'],
        specs: {
            area: 450,
            bedrooms: 4,
            bathrooms: 6,
            parking: 4
        },
        photos: ['https://images.unsplash.com/photo-1600596542815-e495e33f74c4?w=800&q=80'],
    }
];

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
