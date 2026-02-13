import { FacebookConfig } from '../types';
import { useAppStore } from '../stores/useAppStore';

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export const getFacebookConfig = (): FacebookConfig | null => {
  const settings = useAppStore.getState().settings;
  return settings?.facebook_config || null;
};

export const saveFacebookConfig = (config: FacebookConfig): void => {
  console.warn('saveFacebookConfig is deprecated. Use useSettings instead.');
};

export const testFacebookConnection = async (): Promise<{ success: boolean; message: string }> => {
  const config = getFacebookConfig();
  if (!config?.accessToken?.trim()) {
    return {
      success: false,
      message: 'Configure o Access Token nas Configurações antes de testar.',
    };
  }
  try {
    const url = `${GRAPH_API_BASE}/me?fields=id,name`;
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
    const name = data.name || data.id || 'Usuário';
    return { success: true, message: `Conexão OK! Conectado como: ${name}.` };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: msg || 'Erro ao conectar. Verifique a rede e o token.' };
  }
};

export interface GetGroupsResult {
  groups: Array<{ id: string; name: string }>;
  error?: string;
}

export const getGroups = async (): Promise<GetGroupsResult> => {
  const config = getFacebookConfig();
  if (!config?.accessToken?.trim()) {
    return { groups: [], error: 'Token não configurado.' };
  }
  try {
    const url = `${GRAPH_API_BASE}/me/groups?fields=id,name`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) {
      const errMsg =
        data.error?.message || data.error?.error_user_msg || JSON.stringify(data.error || data);
      return { groups: [], error: errMsg };
    }
    const list = Array.isArray(data.data) ? data.data : [];
    const groups = (list as Array<{ id: string; name: string }>).map((g) => ({
      id: g.id,
      name: g.name || `Grupo ${g.id}`,
    }));
    if (groups.length === 0) {
      return {
        groups: [],
        error:
          'A API do Facebook retorna apenas grupos em que você é administrador. Adicione outros pelo ID (URL do grupo).',
      };
    }
    return { groups, error: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { groups: [], error: msg || 'Erro ao carregar grupos.' };
  }
};

export interface PostToGroupOptions {
  photoUrls?: string[];
  photoFiles?: File[];
}

/**
 * Publica no grupo: só texto, uma foto (direto) ou várias fotos (upload não publicado + feed com attached_media).
 */
export const postToGroup = async (
  groupId: string,
  message: string,
  options?: PostToGroupOptions
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  const config = getFacebookConfig();
  if (!config?.accessToken?.trim()) {
    return { success: false, error: 'Access Token não configurado.' };
  }
  if (!message?.trim()) {
    return { success: false, error: 'Mensagem vazia.' };
  }
  const trimmedMessage = message.trim();
  const token = config.accessToken.trim();
  const urls = (options?.photoUrls ?? []).filter((u) => u?.trim().startsWith('http'));
  const files = options?.photoFiles ?? [];
  const totalPhotos = urls.length + files.length;

  try {
    if (totalPhotos === 0) {
      const response = await fetch(`${GRAPH_API_BASE}/${groupId}/feed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errMsg =
          data.error?.message || data.error?.error_user_msg || JSON.stringify(data.error || data);
        return { success: false, error: errMsg };
      }
      return { success: true, postId: data.id };
    }

    const photoIds: string[] = [];

    for (const url of urls) {
      const res = await fetch(`${GRAPH_API_BASE}/${groupId}/photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim(), published: false }),
      });
      const data = await res.json();
      if (res.ok && data.id) photoIds.push(data.id);
    }

    for (const file of files) {
      const form = new FormData();
      form.append('source', file);
      form.append('published', 'false');
      const res = await fetch(`${GRAPH_API_BASE}/${groupId}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.id) photoIds.push(data.id);
    }

    if (photoIds.length === 0) {
      const response = await fetch(`${GRAPH_API_BASE}/${groupId}/feed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errMsg =
          data.error?.message || data.error?.error_user_msg || JSON.stringify(data.error || data);
        return { success: false, error: errMsg };
      }
      return { success: true, postId: data.id };
    }

    const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
    const response = await fetch(`${GRAPH_API_BASE}/${groupId}/feed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: trimmedMessage,
        attached_media: attachedMedia,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      const errMsg =
        data.error?.message || data.error?.error_user_msg || JSON.stringify(data.error || data);
      return { success: false, error: errMsg };
    }
    return { success: true, postId: data.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg || 'Erro ao publicar.' };
  }
};
