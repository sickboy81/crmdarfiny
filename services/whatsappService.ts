import { WhatsAppConfig } from '../types';
import { useAppStore } from '../stores/useAppStore';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';


export const testWhatsAppConnection = async (): Promise<{ success: boolean; message: string }> => {
  const config = getWhatsAppConfig();
  if (!config?.accessToken?.trim() || !config?.phoneNumberId?.trim()) {
    return {
      success: false,
      message: 'Configure o Access Token e o Phone Number ID antes de testar.',
    };
  }
  try {
    const url = `${GRAPH_API_URL}/${config.phoneNumberId}?fields=verified_name,display_phone_number`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) {
      const errMsg =
        data.error?.message || data.error?.error_user_msg || JSON.stringify(data.error || data);
      return { success: false, message: errMsg };
    }
    const name = data.verified_name || data.display_phone_number || 'Número';
    return { success: true, message: `Conexão OK! Número verificado: ${name}.` };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: msg || 'Erro ao conectar. Verifique a rede e as credenciais.',
    };
  }
};

export const getWhatsAppConfig = (): WhatsAppConfig | null => {
  const settings = useAppStore.getState().settings;
  return settings?.whatsapp_config || null;
};

export const saveWhatsAppConfig = (config: WhatsAppConfig) => {
  console.warn('saveWhatsAppConfig is deprecated. Use useSettings instead.');
};

/**
 * Faz o upload de mídia para a Meta e retorna o ID da mídia.
 */
export const uploadWhatsAppMedia = async (file: File): Promise<{ success: boolean; id?: string; error?: string }> => {
  const config = getWhatsAppConfig();
  if (!config?.accessToken || !config?.phoneNumberId) {
    return { success: false, error: 'Configuração do WhatsApp ausente.' };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', file.type);
  formData.append('messaging_product', 'whatsapp');

  try {
    const response = await fetch(`${GRAPH_API_URL}/${config.phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Erro no upload de mídia' };
    }

    return { success: true, id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

interface SendMessageOptions {
  to: string;
  type: 'text' | 'template' | 'image' | 'audio' | 'document';
  content:
  | string
  | {
    name: string;
    language: string;
    variables?: string[];
  }
  | { id: string; caption?: string; filename?: string };
}

export const sendRealWhatsAppMessage = async (
  to: string,
  messageData: any,
  msgType: 'text' | 'template' | 'image' | 'audio' | 'video' | 'document' = 'text'
): Promise<{ success: boolean; error?: string }> => {
  const config = getWhatsAppConfig();

  // 1. Tentar enviar via Servidor Local (Baileys/Mirroring) primeiro
  // Isso resolve o problema de CORS e usa a conexão que o usuário acabou de configurar via QR Code
  try {
    const serverUrl = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';
    const localServerUrl = `${serverUrl}/send`;
    const cleanPhone = to.replace(/\D/g, '');

    // Formata o JID conforme padrão do WhatsApp/Baileys
    const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    const response = await fetch(localServerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: jid,
        message: msgType === 'text' ? messageData : `[Arquivo: ${msgType}]` // Simplificação para demo
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return { success: true };
      }
    }
    // Se o servidor local não responder ou falhar, tentamos a API Oficial (se configurada)
  } catch (err) {
    console.log('Servidor local Baileys não disponível, tentando API oficial...');
  }

  // 2. Fallback para API Oficial (Cloud API)
  if (!config || !config.accessToken || !config.phoneNumberId) {
    return { success: false, error: 'Conecte o WhatsApp (QR Code) ou configure a API Oficial' };
  }

  const cleanPhone = to.replace(/\D/g, '');

  const body: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: msgType,
  };

  if (msgType === 'text') {
    body.text = { preview_url: false, body: messageData };
  } else if (msgType === 'template') {
    const { name, language, variables } = messageData;
    const components = [];

    if (variables && variables.length > 0) {
      components.push({
        type: 'body',
        parameters: variables.map((v: string) => ({
          type: 'text',
          text: v,
        })),
      });
    }

    body.template = {
      name: name,
      language: { code: language || 'pt_BR' },
      components: components,
    };
  } else {
    body[msgType] = {
      id: messageData.id,
      caption: messageData.caption,
      filename: messageData.filename,
    };
  }

  try {
    // AVISO: Chamar o Graph API diretamente do frontend causa CORS.
    // O ideal é que isso também passasse por um proxy no seu servidor.
    const response = await fetch(`${GRAPH_API_URL}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return { success: false, error: data.error?.message || 'Erro na API do WhatsApp' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Falha na conexão: ${error.message}. Use o QR Code nas configurações.` };
  }
};
