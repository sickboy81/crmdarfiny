import * as XLSX from 'xlsx'
import type { SpreadsheetData, SpreadsheetMeta } from './types'

const MONTH_NAMES_PT = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]

export function exportToXLSX(data: SpreadsheetData, meta: SpreadsheetMeta) {
  const months = Object.keys(data).sort()
  if (months.length === 0) return

  const wb = XLSX.utils.book_new()
  const ws_data: (string | number | null)[][] = []

  // Header section
  ws_data.push([])
  ws_data.push(['', '', '', 'Bank Statement Extraction'])
  ws_data.push([])
  ws_data.push(['Case:', meta.processo, '', 'Bank:', meta.banco])
  ws_data.push([])
  ws_data.push(['', '', '', 'Profession:', meta.profissao])
  ws_data.push(['Agency / Account:', meta.agencia, '', 'Start Date:', meta.dtInicial])
  ws_data.push([])
  ws_data.push(['Name:', meta.nome])
  ws_data.push([])
  ws_data.push([])
  ws_data.push([])

  // Credits label row
  ws_data.push(['', ...Array(months.length).fill(''), 'CREDITS'])
  ws_data.push([
    'MONTH',
    ...months.map((m) => {
      const [y, mo] = m.split('-')
      return `${MONTH_NAMES_PT[Number(mo) - 1]} ${y}`
    }),
  ])
  ws_data.push(['DAY', ...months.map(() => '')])

  // Data rows (day 1..31)
  for (let day = 1; day <= 31; day++) {
    const row: (string | number | null)[] = [day]
    for (const m of months) {
      const amounts = data[m]?.[day]
      if (amounts && amounts.length > 0) {
        row.push(amounts.reduce((a, b) => a + b, 0))
      } else {
        row.push(null)
      }
    }
    ws_data.push(row)
  }

  // TOTAL row
  const totals: number[] = months.map((m) => {
    const md = data[m] || {}
    return Object.values(md)
      .flat()
      .reduce((a, v) => a + v, 0)
  })
  ws_data.push(['TOTAL', ...totals])

  // Summary
  ws_data.push([])
  const mediaApurada = totals.reduce((a, b) => a + b, 0) / (totals.length || 1)
  ws_data.push(['Months Extracted', months.length, '', 'Average', mediaApurada])

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  XLSX.utils.book_append_sheet(wb, ws, 'Extraction')
  XLSX.writeFile(wb, 'Bank_Extraction.xlsx')
}
