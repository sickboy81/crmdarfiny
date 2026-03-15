import { GoogleGenAI, Type } from '@google/genai';
import { Message, BotConfig, AIProvider, AIConfig, SocialPostVariant } from '../types';
import { chatCompletion, PROVIDER_ENDPOINTS } from './openaiCompatibleService';
import { useAppStore } from '../stores/useAppStore';

// --- Configuração do provedor de IA ---

export const getAIConfig = (): AIConfig => {
  const settings = useAppStore.getState().settings;
  const config = settings?.ai_config;

  if (config) {
    return {
      provider: config.provider || 'gemini',
      apiKeys: config.apiKeys || {},
      modelOverrides: config.modelOverrides || {},
      bankExtractorModel: config.bankExtractorModel,
    };
  }
  return { provider: 'gemini', apiKeys: {} };
};

export const saveAIConfig = () => {
  // Now handled by useSettings/updateGlobalSettings
  console.warn('saveAIConfig is deprecated. Use useSettings instead.');
};

function getApiKeyForProvider(provider: AIProvider): string {
  const config = getAIConfig();
  const key = config.apiKeys[provider];
  if (key?.trim()) return key.trim();
  if (provider === 'gemini') {
    return import.meta.env.VITE_GOOGLE_API_KEY || '';
  }
  return '';
}

// Singleton Google AI (invalidado ao trocar provedor/chave)
let googleClient: GoogleGenAI | null = null;

export const resetAIClient = () => {
  googleClient = null;
};

/**
 * Utilitário para executar funções com retry e backoff exponencial.
 * Útil para lidar com limites de taxa (429) das APIs de IA.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit =
        error?.message?.includes('429') ||
        error?.status === 429 ||
        error?.message?.toLowerCase().includes('too many requests');

      if (isRateLimit && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `[AI Service] Rate limit atingindo. Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function getGoogleClient(): GoogleGenAI | null {
  const key = getApiKeyForProvider('gemini');
  if (!key) return null;
  if (!googleClient) {
    // Voltamos para v1beta, pois o 2.0 Flash costuma ter as cotas gratuitas liberadas nesta rota primeiro
    googleClient = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });
  }
  return googleClient;
}

/** Gera texto via provedor atual (Gemini ou OpenAI-compatible) */
async function generateWithProvider(prompt: string, jsonMode: boolean = false): Promise<string> {
  const config = getAIConfig();
  const provider = config.provider;

  if (provider === 'gemini') {
    const client = getGoogleClient();
    if (!client) return '';
    const response = await withRetry(() =>
      client.models.generateContent({
        model: config.modelOverrides?.gemini || 'gemini-1.5-flash',
        contents: prompt,
        ...(jsonMode && {
          config: {
            responseMimeType: 'application/json' as const,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
                summary: { type: Type.STRING },
                intent: { type: Type.STRING, enum: ['sales', 'support', 'inquiry', 'spam'] },
              },
              required: ['sentiment', 'summary', 'intent'],
            },
          },
        }),
      })
    );
    return response.text || '';
  }

  const endpoint = PROVIDER_ENDPOINTS[provider];
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey) return '';
  const model = config.modelOverrides?.[provider] || endpoint.defaultModel;
  const text = await chatCompletion(
    endpoint.baseUrl,
    apiKey,
    model,
    [{ role: 'user', content: prompt }],
    jsonMode
  );
  return text;
}

/**
 * Testa se a API do provedor está funcionando.
 * Pode receber config do formulário (não salva) para testar antes de salvar.
 */
export async function testAIConnection(options?: {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}): Promise<{ success: boolean; message: string }> {
  const provider = options?.provider ?? getAIConfig().provider;
  const apiKey = options?.apiKey?.trim() ?? getApiKeyForProvider(provider);
  if (!apiKey) {
    return { success: false, message: 'Informe a API Key antes de testar.' };
  }

  const prompt = 'Responda apenas: OK';
  try {
    if (provider === 'gemini') {
      const key = options?.apiKey?.trim() || getApiKeyForProvider('gemini');
      if (!key) return { success: false, message: 'API Key não configurada.' };
      const client = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });
      const model = options?.model || getAIConfig().modelOverrides?.gemini || 'gemini-1.5-flash';
      const response = await client.models.generateContent({ model, contents: prompt });
      return { success: !!response.text, message: 'Conexão OK! A API está funcionando.' };
    }
    const endpoint = PROVIDER_ENDPOINTS[provider];
    const model =
      options?.model || getAIConfig().modelOverrides?.[provider] || endpoint.defaultModel;
    await chatCompletion(
      endpoint.baseUrl,
      apiKey,
      model,
      [{ role: 'user', content: prompt }],
      false
    );
    return { success: true, message: 'Conexão OK! A API está funcionando.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg || 'Erro ao conectar. Verifique a chave e o modelo.' };
  }
}

// --- CONFIGURAÇÃO DO BOT (STORAGE) ---
export const getBotConfig = (): BotConfig => {
  const settings = useAppStore.getState().settings;
  const config = settings?.bot_config;

  if (config) {
    return {
      ...config,
      useHistoryLearning: config.useHistoryLearning ?? true,
    };
  }
  return {
    botName: 'Assistente Virtual',
    businessContext: 'Você é um assistente útil e educado. Ajude o cliente com suas dúvidas.',
    isActive: false,
    useHistoryLearning: true,
  };
};

export const saveBotConfig = () => {
  console.warn('saveBotConfig is deprecated. Use useSettings instead.');
};

// --- FUNÇÕES DE IA (multi-provedor) ---

export const generateSmartReply = async (
  conversationHistory: Message[],
  contactName: string
): Promise<string> => {
  const config = getAIConfig();
  const apiKey = getApiKeyForProvider(config.provider);
  if (!apiKey)
    return 'Erro: API Key não configurada. Vá em Configurações > Inteligência Artificial.';

  const botConfig = getBotConfig();
  const historyText = conversationHistory
    .map((msg) => `${msg.senderId === 'me' ? 'Atendente' : contactName}: ${msg.content}`)
    .join('\n');

  const prompt = `Contexto do negócio: "${botConfig.businessContext}"

Conversa atual no WhatsApp (leia todo o histórico para entender o contexto):
${historyText}

Com base no que já foi dito na conversa acima, responda ao que o cliente ${contactName} disse por último. Sua resposta deve fazer sentido com o assunto em discussão e com o que o atendente já respondeu.
Escreva APENAS a próxima mensagem que o atendente deve enviar (1 ou 2 frases curtas, tom profissional e amigável, português do Brasil). NÃO faça perguntas ao atendente. NÃO dê alternativas. Saída: somente o texto da mensagem pronta para colar e enviar.`;

  try {
    let text = await generateWithProvider(prompt, false);
    if (text) {
      text = text
        .trim()
        .replace(/^(sugestão|resposta|mensagem):\s*/i, '')
        .trim();
    }
    return text || 'Não foi possível gerar uma resposta.';
  } catch (error) {
    console.error('AI Error:', error);
    return 'Erro ao conectar com a IA.';
  }
};

export const analyzeConversation = async (conversationHistory: Message[], contactName: string) => {
  const config = getAIConfig();
  const apiKey = getApiKeyForProvider(config.provider);
  if (!apiKey) return null;

  const historyText = conversationHistory
    .map((msg) => `${msg.senderId === 'me' ? 'Atendente' : contactName}: ${msg.content}`)
    .join('\n');

  const prompt = `
    Analise a seguinte conversa de WhatsApp entre um Atendente e o cliente ${contactName}.
    Retorne um JSON com:
    1. sentiment: 'positive', 'neutral', ou 'negative'.
    2. summary: Um resumo de UMA frase em português do Brasil do que está sendo discutido.
    3. intent: Qual a intenção do cliente ('sales', 'support', 'inquiry', 'spam').
    Regra: o campo summary DEVE estar sempre em português do Brasil.
    Histórico:
    ${historyText}
  `;

  try {
    const text = await generateWithProvider(prompt, true);
    if (text) return JSON.parse(text);
    return null;
  } catch (error) {
    console.error('Analysis Error:', error);
    return null;
  }
};

export const generateTemplate = async (
  topic: string,
  tone: string,
  includeButtons: boolean = false
): Promise<string> => {
  const apiKey = getApiKeyForProvider(getAIConfig().provider);
  if (!apiKey) return 'Erro: API Key não configurada.';

  const prompt = `
    Crie um template de mensagem de WhatsApp curto e efetivo.
    Objetivo: "${topic}". Tom: "${tone}".
    Regras: Use emojis; quebras de linha; variável {{Nome}}; texto em Português do Brasil.
    ${includeButtons ? 'Adicione ao final 2 ou 3 botões no formato [Botão: Texto]. Máx 20 caracteres por botão.' : ''}
  `;

  try {
    const text = await generateWithProvider(prompt, false);
    return text || 'Não foi possível gerar o template.';
  } catch (error) {
    console.error('Template Error:', error);
    return 'Erro ao gerar template.';
  }
};

export const generateCustomerSimulation = async (
  conversationHistory: Message[],
  contactName: string,
  contactProfile: string
): Promise<string> => {
  const apiKey = getApiKeyForProvider(getAIConfig().provider);
  if (!apiKey) return 'Erro IA';

  const historyText = conversationHistory
    .map((msg) => `${msg.senderId === 'me' ? 'Empresa' : contactName}: ${msg.content}`)
    .join('\n');

  const prompt = `
    Atue como o cliente ${contactName}. Perfil: ${contactProfile}.
    Contexto: WhatsApp com uma empresa.
    Responda a última mensagem do atendente de forma natural, curta e realista (como mensagem de zap).
    Histórico: ${historyText}
    Sua resposta (apenas o texto):
  `;

  try {
    const text = await generateWithProvider(prompt, false);
    return text?.trim() || '...';
  } catch (error) {
    console.error('Simulation Error:', error);
    return 'Ok.';
  }
};

function getLearningExamples(
  allMessages: Record<string, Message[]>,
  currentChatId: string
): string {
  let examples = '';
  let count = 0;
  for (const [chatId, messages] of Object.entries(allMessages)) {
    if (chatId === currentChatId || messages.length < 2) continue;
    const lastMessages = messages.slice(-4);
    const lastMsg = lastMessages[lastMessages.length - 1];
    if (lastMsg.senderId === 'me') {
      examples += `\n--- Exemplo ${count + 1} ---\n`;
      examples += lastMessages
        .map((m) => `${m.senderId === 'me' ? 'Atendente' : 'Cliente'}: ${m.content}`)
        .join('\n');
      count++;
    }
    if (count >= 3) break;
  }
  return examples;
}

export const generateBotAutoResponse = async (
  conversationHistory: Message[],
  contactName: string,
  allMessages?: Record<string, Message[]>
): Promise<string> => {
  const apiKey = getApiKeyForProvider(getAIConfig().provider);
  if (!apiKey) return 'Erro Bot';

  const botConfig = getBotConfig();
  const historyText = conversationHistory
    .map((msg) => `${msg.senderId === 'me' ? botConfig.botName : contactName}: ${msg.content}`)
    .join('\n');

  let learningContext = '';
  if (botConfig.useHistoryLearning && allMessages?.length) {
    const currentChatId = conversationHistory[0]?.chatId;
    const examples = getLearningExamples(allMessages, currentChatId);
    if (examples) {
      learningContext = `
      EXEMPLOS DE ATENDIMENTO REAL (imite o estilo):
      ${examples}
      `;
    }
  }

  const prompt = `
    Você é "${botConfig.botName}", atendente virtual. Cliente: ${contactName}.
    CONTEXTO DO NEGÓCIO (SIGA RIGOROSAMENTE): "${botConfig.businessContext}"
    ${learningContext}
    Regras: Educado; respostas curtas para WhatsApp; se não souber, diga que vai transferir; não invente preços/produtos.
    Histórico: ${historyText}
    Sua Resposta:
  `;

  try {
    const text = await generateWithProvider(prompt, false);
    return text?.trim() || 'Olá, em que posso ajudar?';
  } catch (error) {
    return 'Desculpe, não entendi. Vou chamar um humano.';
  }
};

// --- UNIPDF / GERADOR DE CAPA ---
export const generateIntroText = async (description: string): Promise<string> => {
  const prompt = `
    Atue como um redator corporativo sênior.
    Com base na seguinte descrição/contexto: "${description}"
    Escreva um texto introdutório formal e profissional (2 a 3 parágrafos).
    O texto será usado na capa de um documento PDF unificado.
    Não use saudações como "Olá" ou "Prezados". Vá direto ao ponto, com linguagem executiva.
    Foque no objetivo do documento e na organização dos arquivos anexos.
  `;

  try {
    const text = await generateWithProvider(prompt, false);
    return text?.trim() || 'Não foi possível gerar.';
  } catch (error) {
    console.error('Intro Text Error:', error);
    return 'Erro ao gerar texto.';
  }
};

// --- ANÁLISE AVANÇADA DE LEAD (EXTRAÇÃO DE DADOS) ---
import { AIExtractedLeadData } from '../types';

export const extractLeadData = async (
  conversationHistory: Message[],
  contactName: string
): Promise<AIExtractedLeadData | null> => {
  const config = getAIConfig();
  const apiKey = getApiKeyForProvider(config.provider);
  if (!apiKey) return null;

  const historyText = conversationHistory
    .map((msg) => `${msg.senderId === 'me' ? 'Corretor' : contactName}: ${msg.content}`)
    .join('\n');

  const prompt = `
    Analise a conversa de WhatsApp abaixo entre um Corretor e o cliente ${contactName} interessado em imóveis.
    Extraia as preferências do cliente para preencher o CRM.
    
    Retorne APENAS um JSON com os seguintes campos (use null se não encontrar a informação):
    1. interest: 'buy', 'rent', ou 'invest'.
    2. budgetMin: número (valor mínimo) ou null.
    3. budgetMax: número (valor máximo) ou null.
    4. propertyType: array de strings (ex: ['casa', 'apartamento', 'terreno']).
    5. bedrooms: número de quartos ou null.
    6. location: array de strings (bairros ou cidades).
    7. notes: string com um resumo curto de outras preferências (ex: "precisa de varanda", "aceita permuta").

    Histórico:
    ${historyText}
  `;

  try {
    const text = await generateWithProvider(prompt, true);
    if (text) {
      // Tenta limpar markdown code blocks se houver
      const jsonStr = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(jsonStr) as AIExtractedLeadData;
    }
    return null;
  } catch (error) {
    console.error('Lead Extraction Error:', error);
    return null;
  }
};

export const generateMagicReplies = async (
  conversationHistory: Message[],
  contactName: string
): Promise<string[]> => {
  const apiKey = getApiKeyForProvider(getAIConfig().provider);
  if (!apiKey) return [];

  const botConfig = getBotConfig();

  // Pega as últimas 10 mensagens para contexto
  const recentHistory = conversationHistory.slice(-10);
  const historyText = recentHistory
    .map((msg) => `${msg.senderId === 'me' ? 'Você (Atendente)' : contactName}: ${msg.content}`)
    .join('\n');

  // Identifica a última mensagem do cliente
  const lastClientMessage = [...recentHistory].reverse().find((m) => m.senderId !== 'me');
  const lastClientText = lastClientMessage?.content || '';

  const prompt = `Você é "${botConfig.botName}", um atendente profissional.

IDENTIDADE E CONTEXTO DO NEGÓCIO:
${botConfig.businessContext}

CONVERSA ATUAL COM ${contactName}:
${historyText}

TAREFA:
Com base no contexto do seu negócio e na conversa acima, gere 3 sugestões DISTINTAS de resposta para a última mensagem do cliente: "${lastClientText}"

As 3 opções devem ser:
1. **Resposta Direta**: Responda objetivamente ao que o cliente perguntou/comentou, usando informações do seu contexto de negócio.
2. **Próximo Passo**: Sugira uma ação concreta (agendar visita, enviar mais informações, marcar reunião, etc).
3. **Relacionamento**: Uma resposta empática que mantém o engajamento e mostra interesse genuíno.

REGRAS IMPORTANTES:
- Use o tom e linguagem adequados ao seu tipo de negócio
- Mensagens curtas e diretas (estilo WhatsApp)
- Seja específico e relevante ao contexto da conversa
- Use emojis com moderação e apenas se apropriado ao seu negócio
- NÃO invente informações que não estão no seu contexto
- Se não souber algo específico, ofereça verificar ou transferir para especialista

FORMATO DE SAÍDA:
Retorne APENAS as 3 frases, uma por linha, sem numeração, prefixos ou explicações.`;

  try {
    const text = await generateWithProvider(prompt, false);
    if (!text) return [];

    // Limpa e processa as respostas
    const replies = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      // Remove numeração ou marcadores
      .map((l) => l.replace(/^[\d\-\*\.]+[\.\):\s]*/g, '').trim())
      // Remove aspas extras
      .map((l) => l.replace(/^["']|["']$/g, '').trim())
      .filter((l) => l.length > 10) // Filtra respostas muito curtas
      .slice(0, 3);

    return replies.length > 0
      ? replies
      : [
          'Entendi! Vou verificar isso para você.',
          'Posso te ajudar com mais alguma coisa?',
          'Obrigado pelo contato! 😊',
        ];
  } catch (error) {
    console.error('Magic Replies Error:', error);
    return [];
  }
};

export const rewriteMessage = async (
  text: string,
  tone: 'formal' | 'friendly' | 'persuasive' = 'friendly'
): Promise<string> => {
  const apiKey = getApiKeyForProvider(getAIConfig().provider);
  if (!apiKey) return text;

  const prompt = `
    Atue como um redator especialista em comunicação via WhatsApp.
    Reescreva a seguinte mensagem para que fique mais clara, correta gramaticalmente e com o tom "${tone}".
    Mantenha a mensagem concisa (estilo WhatsApp).
    
    Mensagem original: "${text}"
    
    Mensagem original: "${text}"
    
    Regra: Retorne SOMENTE o texto da mensagem reescrita. Não use aspas. Não use prefixos como "Sugestão:" ou "Aqui está:".
    Reescrita:
  `;

  try {
    const result = await generateWithProvider(prompt, false);
    // Cleanup extra text if any
    let cleaned = result?.trim() || text;
    cleaned = cleaned.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    cleaned = cleaned.replace(/^(Aqui está|Sugestão|Reescrita):/i, '').trim();
    return cleaned;
  } catch (error) {
    console.error('Rewrite Error:', error);
    return text;
  }
};

// --- PROCESSAMENTO DE IMAGEM (OCR VIA IA) ---
export const processImageWithAI = async (
  file: File,
  prompt: string = 'Extraia todo o texto visível nesta imagem.'
): Promise<string> => {
  const config = getAIConfig();
  const provider = config.provider;

  // Converter File para Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
        // Fix base64 padding if needed
        const padding = encoded.length % 4;
        if (padding > 0) {
          encoded += '='.repeat(4 - padding);
        }
        resolve(encoded);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  try {
    const base64Image = await fileToBase64(file);
    const geminiKey = getApiKeyForProvider('gemini');

    // Se temos uma chave do Gemini, vamos usá-lo para OCR (mesmo que o provedor global seja outro),
    // pois o Gemini 1.5 Flash é superior e mais barato/grátis para isso.
    if (provider === 'gemini' || geminiKey) {
      const client = getGoogleClient();
      if (!client)
        throw new Error(
          'API Key do Gemini não configurada. Verifique nas configurações do CRM ou no .env'
        );

      const model = config.modelOverrides?.gemini || 'gemini-1.5-flash';

      const response = await withRetry(() =>
        client.models.generateContent({
          model: model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: base64Image,
                    mimeType: file.type,
                  },
                },
              ],
            },
          ],
        })
      );

      return response.text || '';
    } else {
      // Fallback para OpenAI-compatible se suportar visão (ex: gpt-4o)

      const endpoint = PROVIDER_ENDPOINTS[provider];
      const apiKey = getApiKeyForProvider(provider);
      if (!apiKey) throw new Error('API Key não configurada.');

      // Exemplo básico para OpenAI Vision
      const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(provider === 'openrouter' && {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'CRM Whatsapp',
          }),
        },
        body: JSON.stringify({
          model: config.modelOverrides?.[provider] || 'gpt-4o', // Vision model default
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.type};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`Erro na API Vision: ${response.statusText}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Sem resposta de texto.';
    }
  } catch (error) {
    console.error('AI OCR Error:', error);
    console.info('Falling back to Tesseract.js...');

    try {
      // Dynamic import to avoid loading it if not needed
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();
      return text + '\n\n[OCR via Tesseract (Fallback)]';
    } catch (tesseractError) {
      console.error('Tesseract Fallback Error:', tesseractError);
      throw error; // Throw original AI error if fallback also fails
    }
  }
};

export const extractContactsFromImage = async (file: File): Promise<any[]> => {
  const config = getAIConfig();
  const provider = config.provider;
  const apiKey = getApiKeyForProvider(provider);

  if (!apiKey) throw new Error('API Key não configurada.');

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
        const padding = encoded.length % 4;
        if (padding > 0) encoded += '='.repeat(4 - padding);
        resolve(encoded);
      };
      reader.onerror = reject;
    });
  };

  const prompt = `
    Analise esta imagem que contém informações de contatos (pode ser um print de tela, cartão de visita, lista ou planilha).
    Extraia TODOS os contatos encontrados.
    Retorne APENAS um JSON no seguinte formato array:
    [
      { "name": "Nome", "phone": "Telefone (apenas números com DDD)", "email": "Email" }
    ]
    Se não encontrar nada, retorne [].
    Tente corrigir OCR de telefones (ex: 'O' virar '0', 'l' virar '1').
    Ignore cabeçalhos ou textos irrelevantes.
  `;

  try {
    const base64Image = await fileToBase64(file);
    const geminiKey = getApiKeyForProvider('gemini');
    let jsonStr = '';

    // Priorizamos o Gemini para OCR de imagem por ser superior e mais barato/grátis
    if (provider === 'gemini' || geminiKey) {
      const client = getGoogleClient();
      if (!client) throw new Error('Gemini Client Error - Verifique sua API Key');

      const model = config.modelOverrides?.gemini || 'gemini-1.5-flash';
      const response = await withRetry(() =>
        client.models.generateContent({
          model: model,
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }, { inlineData: { data: base64Image, mimeType: file.type } }],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  email: { type: Type.STRING },
                },
              },
            },
          },
        })
      );
      jsonStr = response.text || '[]';
    } else {
      // OpenAI Fallback para outros provedores (ChatGPT, OpenRouter, etc)
      const endpoint = PROVIDER_ENDPOINTS[provider];
      const model = config.modelOverrides?.[provider] || endpoint.defaultModel;

      const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(provider === 'openrouter' && {
            'HTTP-Referer': 'https://darfiny.com',
            'X-Title': 'Darfiny CRM',
          }),
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt + ' Responda apenas com o JSON puro (array de objetos).',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:${file.type};base64,${base64Image}` },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      jsonStr = data.choices?.[0]?.message?.content || '[]';
    }

    // Clean markdown if present
    jsonStr = jsonStr
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    // Handle cases where output might be wrapped in { "contacts": [...] } by some models
    if (jsonStr.trim().startsWith('{')) {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.contacts)) return parsed.contacts;
      if (Array.isArray(parsed.data)) return parsed.data;
      return []; // Unexpected object format
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Structured OCR Error:', error);
    // Fallback to text mode handled by caller if this fails
    throw error;
  }
};

export const generateSocialPosts = async (
  topic: string,
  tone: string = 'professional',
  mediaDescription?: string
): Promise<SocialPostVariant[]> => {
  const config = getAIConfig();
  const apiKey = getApiKeyForProvider(config.provider);
  if (!apiKey) return [];

  const prompt = `
    Atue como um especialista em marketing digital e mídias sociais.
    OBJETIVO: Criar postagens para diferentes redes sociais baseadas no seguinte tópico:
    "${topic}"
    ${mediaDescription ? `DESCRIÇÃO DA Mídia (Foto/Vídeo): ${mediaDescription}` : ''}
    TOM DE VOZ: ${tone}

    REGRAS POR PLATAFORMA:
    1. Facebook: Texto engajador, pode ser mais longo, use emojis, CTA claro.
    2. Instagram: Foco em storytelling visual, legendas que prendem a atenção, uso estratégico de emojis.
    3. X (Twitter): Curto, direto, provocativo ou informativo, máximo 280 caracteres.
    4. TikTok: Roteiro curto e ganchos iniciais fortes (hooks), linguagem jovem e dinâmica.
    5. LinkedIn: Profissional, focado em insights, valor e autoridade.

    RETORNE APENAS um JSON no formato:
    {
      "variants": [
        {
          "platform": "facebook",
          "content": "texto aqui",
          "hashtags": ["#marketing", "#exemplo"]
        },
        ...
      ]
    }

    Regra: O conteúdo deve estar em Português do Brasil.
  `;

  try {
    const text = await generateWithProvider(prompt, true);
    if (text) {
      const data = JSON.parse(
        text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim()
      );
      return data.variants || [];
    }
    return [];
  } catch (error) {
    console.error('Social Posts Error:', error);
    return [];
  }
};

// ─── AI WRITER ────────────────────────────────────────────────────────────────

export interface AIWriterParams {
  docType: string;
  instruction: string;
  tone: string;
  context?: string;
  recipientName?: string;
}

/**
 * Gera qualquer tipo de texto (email, contrato, WhatsApp, proposta, etc.)
 * baseado nas instruções livres do usuário, usando o provedor de IA configurado nas settings.
 */
export const generateWithAIWriter = async (params: AIWriterParams): Promise<string> => {
  const config = getAIConfig();
  const apiKey = getApiKeyForProvider(config.provider);
  if (!apiKey)
    throw new Error('API Key não configurada. Vá em Configurações > Inteligência Artificial.');

  const { docType, instruction, tone, context, recipientName } = params;

  const prompt = `Você é um redator profissional especialista em comunicação corporativa brasileira.

TAREFA: Criar um(a) ${docType} completo(a) e pronto(a) para uso imediato.

INSTRUÇÕES DO USUÁRIO:
"${instruction}"

TOM DE VOZ: ${tone}
${recipientName ? `DESTINATÁRIO: ${recipientName}` : ''}
${context ? `\nCONTEXTO ADICIONAL:\n${context}` : ''}

REGRAS OBRIGATÓRIAS:
- Escreva SOMENTE o texto final pronto para uso. Sem explicações, sem comentários, sem prefixos como "Aqui está:" ou "Veja abaixo:".
- O texto deve estar em Português do Brasil (a menos que a instrução peça outro idioma).
- Use o tom de voz "${tone}" de forma consistente do início ao fim.
- Seja específico, profissional e completo. Não deixe lacunas obrigatórias como "[NOME DA EMPRESA]" sem preencher com informações do contexto.
- Se o texto for um e-mail, inclua assunto, saudação, corpo e despedida.
- Se for WhatsApp, seja conciso e direto (máximo 5 parágrafos curtos, use emojis quando pertinente ao tom).
- Se for um contrato ou minuta, estruture com cláusulas numeradas.
- Se for uma proposta comercial, inclua apresentação, proposta de valor, escopo, investimento e próximos passos.

SAÍDA: Apenas o texto final, sem nenhuma anotação extra.`;

  try {
    const text = await generateWithProvider(prompt, false);
    return text?.trim() || 'Não foi possível gerar o texto. Tente novamente.';
  } catch (error) {
    console.error('AI Writer Error:', error);
    throw error;
  }
};

// ─── BANK EXTRACTOR ───────────────────────────────────────────────────────────

export interface BankTransaction {
  date: string; // ISO format: 'YYYY-MM-DD'
  amount: number; // positive number
  description: string;
  type: 'credit' | 'debit';
}

/**
 * Converts a PDF file to an array of base64 image strings (one per page),
 * using pdfjs-dist and an in-browser canvas.
 */
async function pdfToImages(file: File): Promise<{ base64: string; mimeType: string }[]> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  // Use the bundled worker from pdfjs-dist
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const images: { base64: string; mimeType: string }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // high-res for better OCR
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    const base64 = canvas.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '');
    images.push({ base64, mimeType: 'image/jpeg' });
  }
  return images;
}

/**
 * Converts an image File to base64.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:[^;]+;base64,/, ''));
    };
    reader.onerror = reject;
  });
}

/**
 * Extracts bank transactions from a single file (PDF or image).
 * Supports Gemini (vision) and OpenAI-compatible providers (vision endpoint).
 * Returns a structured list of transactions.
 */
export async function extractBankTransactions(file: File): Promise<BankTransaction[]> {
  const config = getAIConfig();
  const provider = config.provider;
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey)
    throw new Error('API Key não configurada. Vá em Configurações > Inteligência Artificial.');

  const extractionPrompt = `Você é um especialista em análise de extratos bancários.
Analise esta imagem de um extrato bancário e extraia TODAS as transações visíveis.

RETORNE APENAS um JSON no seguinte formato:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": 123.45,
      "description": "Descrição da transação",
      "type": "credit"
    }
  ]
}

REGRAS IMPORTANTES:
- "type" deve ser EXATAMENTE "credit" para entradas/créditos ou "debit" para saídas/débitos.
- "amount" deve ser sempre um número POSITIVO (sem sinal negativo).
- "date" deve estar no formato ISO YYYY-MM-DD. Se o ano não estiver claro, use o ano mais recente visível ou o atual.
- "description" deve ser uma descrição textual breve da transação.
- Inclua TODAS as transações (créditos E débitos), pois a filtragem será feita após.
- Se não houver transações visíveis, retorne { "transactions": [] }.
- NÃO inclua linhas de saldo, apenas movimentações.
- Ignore cabeçalhos, totais de período e informações não transacionais.

Retorne SOMENTE o JSON puro, sem markdown, sem explicações.`;

  // ── Prepare image(s) ──────────────────────────────────────────────────────
  let images: { base64: string; mimeType: string }[] = [];

  if (file.type === 'application/pdf') {
    try {
      images = await pdfToImages(file);
    } catch (pdfErr) {
      console.error('PDF render error, trying as raw upload:', pdfErr);
      // Fallback: treat as generic binary (only works with Gemini)
      images = [{ base64: await fileToBase64(file), mimeType: 'application/pdf' }];
    }
  } else {
    images = [{ base64: await fileToBase64(file), mimeType: file.type }];
  }

  // ── Call AI for each page and aggregate results ───────────────────────────
  const allTransactions: BankTransaction[] = [];

  for (const image of images) {
    let jsonStr = '';

    if (provider === 'gemini') {
      const client = getGoogleClient();
      if (!client) throw new Error('Gemini Client não disponível. Verifique a API Key.');

      const model =
        config.bankExtractorModel || config.modelOverrides?.gemini || 'gemini-2.0-flash';
      const response = await withRetry(() =>
        client.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: extractionPrompt },
                { inlineData: { data: image.base64, mimeType: image.mimeType } },
              ],
            },
          ],
        })
      );
      jsonStr = response.text || '{"transactions":[]}';

      // Delay de 1s entre páginas para evitar burst limit no free tier
      if (images.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      // OpenAI-compatible providers with vision support (gpt-4o, gpt-4-turbo, etc.)
      const endpoint = PROVIDER_ENDPOINTS[provider];
      const model =
        config.bankExtractorModel || config.modelOverrides?.[provider] || endpoint.defaultModel;
      console.log(`[BankExtractor] Usando modelo: ${model} no provedor: ${provider}`);

      const response = await fetch(`${endpoint.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(provider === 'openrouter' && {
            'HTTP-Referer': 'https://darfiny.com',
            'X-Title': 'Darfiny CRM',
          }),
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: extractionPrompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (
          response.status === 404 ||
          errText.toLowerCase().includes('vision') ||
          errText.toLowerCase().includes('model')
        ) {
          throw new Error(
            `O modelo escolhido (${model}) não parece suportar visão (leitura de imagens). Por favor, use um modelo como 'google/gemini-2.0-flash-001' ou use o provedor Gemini nas configurações.`
          );
        }
        throw new Error(`Erro na API (${response.status}): ${errText.substring(0, 200)}`);
      }
      const data = await response.json();
      jsonStr = data.choices?.[0]?.message?.content || '{"transactions":[]}';
    }

    // ── Parse JSON ────────────────────────────────────────────────────────
    try {
      const cleaned = jsonStr
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      const txns: BankTransaction[] = (parsed.transactions || [])
        .filter(
          (t: { date?: unknown; amount?: unknown; type?: unknown }) =>
            t.date && typeof t.amount === 'number' && (t.type === 'credit' || t.type === 'debit')
        )
        .map(
          (t: {
            date: string;
            amount: number;
            description?: string;
            type: 'credit' | 'debit';
          }) => ({
            date: t.date,
            amount: Math.abs(t.amount),
            description: t.description || '',
            type: t.type,
          })
        );
      allTransactions.push(...txns);
    } catch (parseErr) {
      console.error('JSON parse error for page:', parseErr, jsonStr.substring(0, 300));
    }
  }

  return allTransactions;
}
