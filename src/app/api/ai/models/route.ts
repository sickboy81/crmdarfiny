import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { decrypt } from '@/lib/whatsapp/encryption'

export interface ModelInfo {
  id: string
  name: string
  provider: string
  context_length?: number
}

/**
 * GET /api/ai/models?provider=openrouter
 *
 * Fetch available models from a provider's API.
 * Currently supports OpenRouter's /api/v1/models endpoint.
 */
export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (provider === 'openrouter') {
      // Get the stored API key
      const { data } = await supabase
        .from('ai_configs')
        .select('api_key')
        .eq('account_id', accountId)
        .maybeSingle()

      let apiKey = ''
      if (data?.api_key) {
        try {
          apiKey = decrypt(data.api_key)
        } catch {
          return NextResponse.json({ error: 'Could not decrypt API key' }, { status: 400 })
        }
      }

      // If no stored key, try the request header
      if (!apiKey) {
        apiKey = request.headers.get('x-api-key') ?? ''
      }

      if (!apiKey) {
        return NextResponse.json({ error: 'No API key available' }, { status: 400 })
      }

      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        return NextResponse.json(
          { error: `OpenRouter API error: ${res.status} ${detail}` },
          { status: res.status },
        )
      }

      const data_models = await res.json() as {
        data?: Array<{
          id: string
          name?: string
          architecture?: { modality?: string }
          context_length?: number
        }>
      }

      const models: ModelInfo[] = (data_models.data ?? [])
        // Filter to chat models (exclude embeddings, image generation, etc.)
        .filter((m) => {
          const modality = m.architecture?.modality ?? ''
          return modality.includes('text') || modality === ''
        })
        .map((m) => ({
          id: m.id,
          name: m.name ?? m.id,
          provider: 'openrouter',
          context_length: m.context_length,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      return NextResponse.json({ models })
    }

    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
