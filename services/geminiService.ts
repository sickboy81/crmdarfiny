import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Message, BotConfig, AIProvider, AIConfig } from '../types';
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
    };
  }
  return { provider: 'gemini', apiKeys: {} };
};

export const saveAIConfig = (config: AIConfig) => {
  // Now handled by useSettings/updateGlobalSettings
  console.warn('saveAIConfig is deprecated. Use useSettings instead.');
};

function getApiKeyForProvider(provider: AIProvider): string {
  const config = getAIConfig();
  const key = config.apiKeys[provider];
  if (key?.trim()) return key.trim();
  if (provider === 'gemini') {
    return '';
  }
  return '';
}

// Singleton Gemini (invalidado ao trocar provedor/chave)
let geminiClient: GoogleGenAI | null = null;

export const resetGeminiClient = () => {
  geminiClient = null;
};

function getGeminiClient(): GoogleGenAI | null {
  const key = getApiKeyForProvider('gemini');
  if (!key) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}

/** Gera texto via provedor atual (Gemini ou OpenAI-compatible) */
async function generateWithProvider(prompt: string, jsonMode: boolean = false): Promise<string> {
  const config = getAIConfig();
  const provider = config.provider;

  if (provider === 'gemini') {
    const client = getGeminiClient();
    if (!client) return '';
    const response = await client.models.generateContent({
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
    });
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
      const client = new GoogleGenAI({ apiKey: key });
      const model = options?.model || getAIConfig().modelOverrides?.gemini || 'gemini-1.5-flash';
      const response = await client.models.generateContent({ model, contents: prompt });
      const text = response.text?.trim() || '';
      return { success: true, message: 'Conexão OK! A API está funcionando.' };
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

export const saveBotConfig = (config: BotConfig) => {
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
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
  const lastClientMessage = [...recentHistory].reverse().find(m => m.senderId !== 'me');
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
      .map(l => l.trim())
      .filter(l => l.length > 0)
      // Remove numeração ou marcadores
      .map(l => l.replace(/^[\d\-\*\.]+[\.\):\s]*/g, '').trim())
      // Remove aspas extras
      .map(l => l.replace(/^["']|["']$/g, '').trim())
      .filter(l => l.length > 10) // Filtra respostas muito curtas
      .slice(0, 3);

    return replies.length > 0 ? replies : ['Entendi! Vou verificar isso para você.', 'Posso te ajudar com mais alguma coisa?', 'Obrigado pelo contato! 😊'];
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

    if (provider === 'gemini') {
      const client = getGeminiClient();
      if (!client) throw new Error('Cliente Gemini não inicializado.');

      const model = config.modelOverrides?.gemini || 'gemini-1.5-flash';

      const response = await client.models.generateContent({
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
      });

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
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      return text + '\n\n[OCR via Tesseract (Fallback)]';
    } catch (tesseractError) {
      console.error('Tesseract Fallback Error:', tesseractError);
      throw error; // Throw original AI error if fallback also fails
    }
  }
};
