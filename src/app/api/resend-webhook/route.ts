import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/resend-webhook
 *
 * Handles Resend webhook events for email status tracking.
 * Configure this URL in Resend Dashboard → Webhooks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Verify webhook token if configured
    const webhookToken = process.env.RESEND_WEBHOOK_TOKEN
    if (webhookToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${webhookToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Use service role key for database updates
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Map Resend event types to our status values
    const statusMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delayed',
      'email.complained': 'complained',
      'email.bounced': 'bounced',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
    }

    const status = statusMap[type]
    if (status && data?.email_id) {
      // Update email status in database
      await supabase
        .from('user_emails')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('resend_id', data.email_id)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[resend-webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
