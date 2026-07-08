export interface BankTransaction {
  date: string
  amount: number
  description: string
  type: 'credit' | 'debit'
}

export type MonthData = Record<number, number[]>
export type SpreadsheetData = Record<string, MonthData>

export interface SpreadsheetMeta {
  processo: string
  banco: string
  profissao: string
  agencia: string
  dtInicial: string
  nome: string
}
