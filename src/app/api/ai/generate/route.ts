import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { loadAiConfig } from '@/lib/ai/config'
import { generateReply } from '@/lib/ai/generate'
import { AiError, type ChatMessage } from '@/lib/ai/types'

/**
 * POST /api/ai/generate  (agent+)
 *
 * Generic text generation endpoint for standalone AI tools (Writer, Social Post, etc.).
 * The client sends a messages array; the server uses the account's AI config
 * to generate a reply. No knowledge-base retrieval — pure generation.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')

    const limit = checkRateLimit(`ai-generate:${accountId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    const rawMessages = Array.isArray(body?.messages) ? body.messages : null
    const maxTokens = typeof body?.maxTokens === 'number' ? body.maxTokens : 2048

    if (!rawMessages || rawMessages.length === 0) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 })
    }

    const messages: ChatMessage[] = rawMessages
      .filter(
        (m: unknown): m is ChatMessage => {
          if (!m || typeof m !== 'object') return false
          const obj = m as ChatMessage
          if (obj.role !== 'user' && obj.role !== 'assistant') return false
          // Accept string content
          if (typeof obj.content === 'string' && obj.content.trim().length > 0) return true
          // Accept multimodal array content (for image extraction)
          if (Array.isArray(obj.content) && obj.content.length > 0) return true
          return false
        },
      )

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No valid messages provided.' }, { status: 400 })
    }

    const config = await loadAiConfig(supabase, accountId, {
      requireActive: false,
    }).catch((err) => {
      console.error('[ai/generate] loadAiConfig error:', err)
      throw new AiError('Stored API key could not be decrypted.', {
        code: 'key_decrypt_failed',
        status: 400,
      })
    })
    if (!config) {
      return NextResponse.json(
        {
          error: 'No AI agent configured. Add your provider key in Settings → AI Assistant.',
          code: 'ai_not_configured',
        },
        { status: 400 },
      )
    }

    let systemPrompt =
      'You are a professional copywriting and content generation assistant. ' +
      'Generate high-quality, professional text matching the user\'s instructions and template request. ' +
      'Follow the template rules and tone described in the user prompt.'

    if (config.systemPrompt && config.systemPrompt.trim()) {
      systemPrompt += `\n\nAdditional business context and tone guidelines to follow:\n${config.systemPrompt.trim()}`
    }

    const { text } = await generateReply({ config, systemPrompt, messages })
    return NextResponse.json({ text })
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    return toErrorResponse(err)
  }
}
