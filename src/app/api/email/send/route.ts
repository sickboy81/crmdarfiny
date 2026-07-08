import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * POST /api/email/send
 *
 * Sends an email via Resend API. The API key is read from the
 * RESEND_API_KEY environment variable on the server.
 */
export async function POST(request: Request) {
  try {
    await requireRole('agent')

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { to, subject, content, verifiedSender, attachments } = body

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'to, subject, and content are required' },
        { status: 400 },
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Resend API key not configured. Add RESEND_API_KEY to environment variables.' },
        { status: 400 },
      )
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: verifiedSender || process.env.RESEND_DEFAULT_FROM || 'onboarding@resend.dev',
        to: [to],
        subject,
        text: content,
        attachments: attachments?.map((a: any) => ({
          filename: a.filename,
          content: a.content,
        })),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || `Resend API error (${response.status})` },
        { status: response.status },
      )
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    return toErrorResponse(err)
  }
}
