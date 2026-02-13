export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  avatar: string;
  status: 'active' | 'archived' | 'blocked';
  tags: string[];
  lastSeen: string;
  email?: string;
  company?: string;
  // Novos campos para o Pipeline Imobiliário
  pipelineStage?: 'new' | 'qualified' | 'visit_scheduled' | 'proposal' | 'negotiation' | 'won' | 'lost';
  dealValue?: number;
  propertyInterest?: string; // ID do imóvel de interesse
  realEstatePreferences?: {
    type: 'buy' | 'rent' | 'invest';
    budgetMin?: number;
    budgetMax?: number;
    propertyType?: string[]; // apartamento, casa, terreno
    bedrooms?: number;
    location?: string[];
  };
  notes?: string;
  pinned?: boolean;
  cardColor?: string; // Hex color or Tailwind class for pipeline card background
}

export interface Property {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'land' | 'commercial' | 'village_house' | 'studio';
  status: 'available' | 'reserved' | 'sold' | 'rented';
  price: number;
  address: string;
  neighborhood: string;
  city: string;
  features: string[];
  specs: {
    area: number;
    bedrooms: number;
    bathrooms: number;
    parking: number;
  };
  photos: string[];
  ownerId?: string;
}

export interface Meeting {
  id: string;
  contactId: string;
  propertyId?: string;
  date: string; // ISO string
  type: 'visit' | 'call' | 'signing';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  googleCalendarId?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: 'me' | string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'system' | 'audio' | 'video' | 'document' | 'note';
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
}

export interface Chat {
  id: string;
  contactId: string;
  unreadCount: number;
  lastMessage: Message;
  pinned: boolean;
}

export interface AIAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  suggestedReply: string;
  intent: 'sales' | 'support' | 'inquiry' | 'spam';
}

export interface AIExtractedLeadData {
  interest: 'buy' | 'rent' | 'invest' | null;
  budgetMin: number | null;
  budgetMax: number | null;
  propertyType: string[];
  bedrooms: number | null;
  location: string[];
  notes: string;
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
}

export type FacebookPostMethod = 'api' | 'extension';

export interface FacebookConfig {
  accessToken: string;
  /** Como publicar em grupos: API (token) ou extensão no navegador. Default: 'api' */
  postMethod?: FacebookPostMethod;
}

export interface BotConfig {
  botName: string;
  businessContext: string;
  isActive: boolean;
  useHistoryLearning: boolean;
}

/** Provedores de IA suportados */
export type AIProvider = 'gemini' | 'chatgpt' | 'deepseek' | 'kimi' | 'glm' | 'openrouter';

/** Configuração do provedor de IA selecionado e chaves por provedor */
export interface AIConfig {
  provider: AIProvider;
  apiKeys: Partial<Record<AIProvider, string>>;
  /** Modelo customizado por provedor (opcional) */
  modelOverrides?: Partial<Record<AIProvider, string>>;
}

export enum View {
  DASHBOARD = 'dashboard',
  INBOX = 'inbox',
  CONTACTS = 'contacts',
  CAMPAIGNS = 'campaigns',
  PIPELINE = 'pipeline',
  DOCUMENTS = 'documents',
  AUTOPOST_FB = 'autopost_fb',
  SETTINGS = 'settings',
  UNIPDF = 'unipdf',
  PROPERTIES = 'properties',
  EXTRACTOR = 'extractor',
  WIDGETS = 'widgets',
}

export interface WhatsAppSession {
  id: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  qrCode?: string;
  connectedNumber?: string;
  lastUpdate: string;
}

export interface CampaignLog {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  status: 'pending' | 'sending' | 'success' | 'failed';
  error?: string;
  timestamp?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  createdAt: string;
  scheduledFor?: string;
  templateName: string;
  stats: {
    total: number;
    sent: number;
    success: number;
    failed: number;
  };
  logs: CampaignLog[];
  audienceSnapshot?: {
    tags: string[];
    pipelineStage?: string;
    count: number;
  };
}
