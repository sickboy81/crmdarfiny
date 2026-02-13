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

export const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Ana Silva',
    phoneNumber: '+55 11 99999-9999',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    lastMessage: 'Gostaria de saber mais sobre o apartamento no Jardins.',
    lastMessageTime: '10:30',
    unreadCount: 2,
    status: 'active',
    tags: ['Interessado', 'Alto Padrão'],
    lastSeen: 'Hoje às 10:25',
    email: 'ana.silva@email.com',
    company: 'Particular',
    pipelineStage: 'new',
    dealValue: 2500000,
    notes: 'Cliente procura apartamento de 3 dormitórios na zona sul.',
    propertyInterest: 'prop-1'
  },
  {
    id: '2',
    name: 'Carlos Santos',
    phoneNumber: '+55 11 98888-8888',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    lastMessage: 'Qual o valor do condomínio da casa?',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    status: 'active',
    tags: ['Investidor'],
    lastSeen: 'Ontem às 18:40',
    email: 'carlos.santos@invest.com',
    pipelineStage: 'qualified',
    dealValue: 4200000,
    propertyInterest: 'prop-2'
  },
  {
    id: '3',
    name: 'Mariana Oliveira',
    phoneNumber: '+55 21 97777-7777',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    lastMessage: 'Podemos agendar uma visita para terça-feira?',
    lastMessageTime: 'Ontem',
    unreadCount: 1,
    status: 'active',
    tags: ['Quente', 'Urgente'],
    lastSeen: 'Ontem às 14:15',
    pipelineStage: 'visit_scheduled',
    dealValue: 1800000,
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      chatId: '1',
      senderId: 'contact',
      content: 'Olá, bom dia! Vi o anúncio do apartamento no Jardins.',
      timestamp: '10:28',
      status: 'read',
      type: 'text',
    },
    {
      id: 'm2',
      chatId: '1',
      senderId: 'contact',
      content: 'Gostaria de saber mais detalhes sobre a área de lazer.',
      timestamp: '10:30',
      status: 'read',
      type: 'text',
    },
  ],
  '2': [
    {
      id: 'm3',
      chatId: '2',
      senderId: 'me',
      content: 'Boa tarde, tudo bem?',
      timestamp: '14:00',
      status: 'read',
      type: 'text',
    },
    {
      id: 'm4',
      chatId: '2',
      senderId: 'contact',
      content: 'Tudo ótimo! Vi que você tem interesse em investimentos imobiliários.',
      timestamp: '14:05',
      status: 'read',
      type: 'text',
    },
  ],
};

export const MOCK_CHATS: Chat[] = [
  {
    id: '1',
    contactId: '1',
    unreadCount: 2,
    lastMessage: MOCK_MESSAGES['1'][1],
    pinned: false,
  },
  {
    id: '2',
    contactId: '2',
    unreadCount: 0,
    lastMessage: MOCK_MESSAGES['2'][1],
    pinned: true,
  },
];
