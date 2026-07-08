import * as XLSX from 'xlsx'

export interface ExtractedLead {
  name: string
  phone: string
  email: string
  source: string
}

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const phoneRegex =
  /(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})[-.\s]?(\d{4}))/g

/**
 * Proximity-based text processor (Sliding window)
 */
export function extractLeadsFromText(text: string, sourceName: string): ExtractedLead[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const leads: ExtractedLead[] = []

  for (let i = 0; i < lines.length; i++) {
    const window = lines.slice(i, i + 4)
    let name = ''
    let phone = ''
    let email = ''

    window.forEach((line) => {
      const emails = line.match(emailRegex)
      const phones = [...line.matchAll(phoneRegex)].map((m) =>
        `${m[2] || ''}${m[3]}${m[4]}`.replace(/\D/g, ''),
      )

      if (emails && !email) email = emails[0]
      if (phones.length > 0 && !phone) phone = phones[0]
      if (
        !name &&
        line.length > 2 &&
        line.length < 40 &&
        !line.includes('---') &&
        !emails &&
        phones.length === 0
      ) {
        name = line
      }
    })

    if (phone || email) {
      leads.push({
        name: name || (email ? email.split('@')[0] : `Lead ${phone?.slice(-4) || 'S/N'}`),
        phone: phone || '',
        email: email || '',
        source: sourceName,
      })
      if (phone && email) i += 2
      else i += 1
    }
  }
  return leads
}

/**
 * Process Excel/CSV files using XLSX
 */
export function extractLeadsFromSpreadsheet(file: File): Promise<ExtractedLead[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        const leads: ExtractedLead[] = []
        let nameCol = -1,
          phoneCol = -1,
          emailCol = -1

        if (jsonData.length > 0) {
          const headers = jsonData[0].map((h) => String(h).toLowerCase())
          nameCol = headers.findIndex(
            (h) => h.includes('nome') || h.includes('name') || h.includes('cliente'),
          )
          phoneCol = headers.findIndex(
            (h) =>
              h.includes('tel') ||
              h.includes('cel') ||
              h.includes('fone') ||
              h.includes('phone') ||
              h.includes('contato'),
          )
          emailCol = headers.findIndex((h) => h.includes('email') || h.includes('e-mail'))
        }

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          let name = '',
            phone = '',
            email = ''

          if (nameCol !== -1) name = String(row[nameCol] || '')
          if (phoneCol !== -1) phone = String(row[phoneCol] || '').replace(/\D/g, '')
          if (emailCol !== -1) email = String(row[emailCol] || '')

          if (!phone && !email) {
            row.forEach((cell) => {
              const sCell = String(cell || '')
              if (sCell.match(emailRegex)) email = sCell.match(emailRegex)![0]
              const phones = sCell.match(/\d{8,11}/)
              if (phones) phone = phones[0]
            })
          }

          if (phone || email) {
            leads.push({
              name: name || (email ? email.split('@')[0] : `Lead ${phone?.slice(-4) || 'S/N'}`),
              phone,
              email,
              source: `Spreadsheet: ${file.name}`,
            })
          }
        }
        resolve(leads)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Extract contacts from image using AI vision
 */
export async function extractLeadsFromImage(file: File): Promise<ExtractedLead[]> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const prompt = `Analyze this image and extract all visible contacts.
For each contact, extract: name, phone number, email address.
Return ONLY a JSON array in this format:
[{"name": "John", "phone": "11999998888", "email": "john@example.com"}]
If a field is not found, use empty string.
Return ONLY pure JSON, no markdown, no explanations.`

  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } },
          ],
        },
      ],
      maxTokens: 2048,
    }),
  })

  if (!response.ok) throw new Error('AI extraction failed')

  const data = await response.json()
  const text = data.text || '[]'
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  return (Array.isArray(parsed) ? parsed : []).map((r: any) => ({
    name: r.name || '',
    phone: (r.phone || '').replace(/\D/g, ''),
    email: r.email || '',
    source: `Image: ${file.name}`,
  }))
}
