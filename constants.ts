import { Contact, Message, Chat } from './types';

export const PIPELINE_STAGES = [
  { id: 'new', label: 'Novo Lead', color: 'bg-blue-500' },
  { id: 'qualified', label: 'Qualificação', color: 'bg-indigo-500' },
  { id: 'visit_scheduled', label: 'Visita Agendada', color: 'bg-purple-500' },
  { id: 'proposal', label: 'Proposta Enviada', color: 'bg-yellow-500' },
  { id: 'negotiation', label: 'Negociação', color: 'bg-orange-500' },
  { id: 'won', label: 'Venda Fechada', color: 'bg-green-500' },
  { id: 'lost', label: 'Perdido', color: 'bg-red-500' },
];

export const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartamento' },
  { id: 'house', label: 'Casa' },
  { id: 'land', label: 'Terreno' },
  { id: 'commercial', label: 'Comercial' },
];

export const MEETING_TYPES = [
  { id: 'visit', label: 'Visita ao Imóvel', icon: 'key' },
  { id: 'call', label: 'Ligação / Videochamada', icon: 'phone' },
  { id: 'signing', label: 'Assinatura de Contrato', icon: 'pen' },
];

export const MOCK_CONTACTS: Contact[] = [];
export const MOCK_MESSAGES: Record<string, Message[]> = {};
export const MOCK_CHATS: Chat[] = [];

