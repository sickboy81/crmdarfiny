/**
 * Serviço para APIs compatíveis com o formato OpenAI Chat Completions.
 * Usado por: ChatGPT (OpenAI), DeepSeek, Kimi (Moonshot), GLM (Z.ai), OpenRouter.
 */

import { AIProvider } from '../types';

export const OPENAI_COMPATIBLE_PROVIDERS: AIProvider[] = [
  'chatgpt',
  'deepseek',
  'kimi',
  'glm',
  'openrouter',
];

export interface ProviderEndpoint {
  baseUrl: string;
  defaultModel: string;
  label: string;
}

export const PROVIDER_ENDPOINTS: Record<Exclude<AIProvider, 'gemini'>, ProviderEndpoint> = {
  chatgpt: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    label: 'ChatGPT (OpenAI)',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    label: 'DeepSeek',
  },
  kimi: {
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    label: 'Kimi K2 (Moonshot)',
  },
  glm: {
    baseUrl: 'https://api.z.ai/api/paas/v4',
    defaultModel: 'glm-4.7',
    label: 'GLM (Z.ai)',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    label: 'OpenRouter',
  },
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Chama o endpoint /chat/completions (formato OpenAI).
 * @param baseUrl - URL base (ex: https://api.openai.com/v1)
 * @param apiKey - Bearer token
 * @param model - Nome do modelo
 * @param messages - Lista de mensagens
 * @param jsonMode - Se true, pede resposta em JSON (response_format: { type: "json_object" })
 */
export async function chatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  jsonMode: boolean = false
): Promise<string> {
  const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://vibecode.app';
    headers['X-Title'] = 'CRM Whatsapp AI';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg: string;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error?.message || errJson.message || errText;
    } catch {
      errMsg = errText || response.statusText;
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Resposta inválida da API');
  }
  return content;
}
