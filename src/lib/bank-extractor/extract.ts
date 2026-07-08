import type { BankTransaction } from './types'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function applyFilterRule(transactions: BankTransaction[]): BankTransaction[] {
  const byDay: Record<string, BankTransaction[]> = {}
  for (const t of transactions) {
    ;(byDay[t.date] = byDay[t.date] || []).push(t)
  }

  const filtered: BankTransaction[] = []
  for (const group of Object.values(byDay)) {
    const credits = group.filter((t) => t.type === 'credit')
    const debits = group.filter((t) => t.type === 'debit')
    const debitAmounts = new Set(debits.map((d) => Math.round(d.amount * 100)))

    for (const c of credits) {
      if (debitAmounts.has(Math.round(c.amount * 100))) {
        debitAmounts.delete(Math.round(c.amount * 100))
        continue
      }
      filtered.push(c)
    }
  }
  return filtered
}

const EXTRACTION_PROMPT = `You are a bank statement analysis expert.
Analyze this image of a bank statement and extract ALL visible transactions.

RETURN ONLY a JSON in this format:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": 123.45,
      "description": "Transaction description",
      "type": "credit"
    }
  ]
}

IMPORTANT RULES:
- "type" must be exactly "credit" for deposits/credits or "debit" for withdrawals/debits.
- "amount" must always be a POSITIVE number (no negative sign).
- "date" must be in ISO format YYYY-MM-DD. If the year is not clear, use the most recent visible year or current year.
- "description" must be a brief textual description of the transaction.
- Include ALL transactions (credits AND debits), as filtering will be done after.
- If no transactions are visible, return { "transactions": [] }.
- Do NOT include balance lines, only transactions.
- Ignore headers, period totals and non-transactional information.

Return ONLY pure JSON, no markdown, no explanations.`

export async function extractBankTransactions(file: File): Promise<BankTransaction[]> {
  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'application/octet-stream'

  // Call the wacrm AI generate endpoint with a vision-capable prompt
  // We send the image as base64 in the message
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      maxTokens: 4096,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Extraction failed' }))
    throw new Error(err.error || `Extraction failed (${response.status})`)
  }

  const data = await response.json()
  const text = data.text || ''

  // Parse JSON from response
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  const txns: BankTransaction[] = (parsed.transactions || [])
    .filter(
      (t: any) =>
        t.date && typeof t.amount === 'number' && (t.type === 'credit' || t.type === 'debit'),
    )
    .map((t: any) => ({
      date: t.date,
      amount: Math.abs(t.amount),
      description: t.description || '',
      type: t.type as 'credit' | 'debit',
    }))

  return applyFilterRule(txns)
}
