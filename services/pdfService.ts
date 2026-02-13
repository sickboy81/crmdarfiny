/**
 * Geração de documentos em PDF no navegador (jsPDF).
 */

import { jsPDF } from 'jspdf';

export interface ChecklistPDFOptions {
  title: string;
  subtitle?: string;
  date?: string;
  items: string[];
  footerText?: string;
}

function buildChecklistPDFDoc(options: ChecklistPDFOptions): jsPDF {
  const {
    title,
    subtitle,
    date,
    items,
    footerText = 'Zapr CRM - Documento gerado automaticamente',
  } = options;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 12;

  if (subtitle?.trim()) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, margin, y);
    y += 8;
  }

  if (date?.trim()) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${date}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
  } else {
    y += 4;
  }

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const lineHeight = 10;
  const boxSize = 5;
  const boxMargin = 3;

  items.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const checkboxX = margin;
    const textX = margin + boxSize + boxMargin;
    doc.rect(checkboxX, y - 3.5, boxSize, boxSize);
    doc.text(item.trim() || `Item ${index + 1}`, textX, y + 1);
    y += lineHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 10);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin - doc.getTextWidth(`Página ${p} de ${totalPages}`),
      doc.internal.pageSize.getHeight() - 10
    );
    doc.setTextColor(0, 0, 0);
  }
  return doc;
}

/**
 * Gera um PDF de checklist e retorna uma URL para pré-visualização (blob URL).
 * Lembre-se de revogar a URL com URL.revokeObjectURL() quando não precisar mais.
 */
export function getChecklistPDFPreviewUrl(options: ChecklistPDFOptions): string {
  const doc = buildChecklistPDFDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

/**
 * Gera um PDF de checklist e inicia o download.
 */
export function generateChecklistPDF(options: ChecklistPDFOptions): void {
  const doc = buildChecklistPDFDoc(options);
  const safeTitle =
    (options.title || 'checklist').replace(/[^a-zA-Z0-9\u00C0-\u00FF\s-]/g, '').trim() ||
    'checklist';
  doc.save(`${safeTitle.substring(0, 50)}.pdf`);
}

// --- Proposta comercial / Orçamento ---

export interface ProposalItem {
  description: string;
  value: number;
}

export interface ProposalPDFOptions {
  title: string;
  subtitle?: string;
  clientName?: string;
  issuedBy?: string;
  items: ProposalItem[];
  total: number;
  validity?: string;
  notes?: string;
  footerText?: string;
}

function buildProposalPDFDoc(options: ProposalPDFOptions): jsPDF {
  const {
    title,
    subtitle,
    clientName,
    issuedBy,
    items,
    total,
    validity,
    notes,
    footerText = 'Zapr CRM - Documento gerado automaticamente',
  } = options;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 12;

  if (subtitle?.trim()) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, margin, y);
    y += 8;
  }

  if (clientName?.trim()) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Para: ${clientName.trim()}`, margin, y);
    y += 8;
  }
  if (issuedBy?.trim()) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emitido por: ${issuedBy.trim()}`, margin, y);
    y += 8;
  }

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  const colDesc = margin;
  const colValue = pageWidth - margin - 28;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição', colDesc, y);
  doc.text('Valor (R$)', colValue, y);
  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      v
    );
  items.forEach((item) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    const desc = (item.description || '').trim() || '—';
    doc.text(desc.substring(0, 80), colDesc, y + 4);
    doc.text(formatMoney(item.value), colValue, y + 4);
    y += 10;
  });

  y += 6;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', colDesc, y);
  doc.text(`R$ ${formatMoney(total)}`, colValue, y);
  y += 14;

  if (validity?.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Validade: ${validity}`, margin, y);
    y += 10;
  }

  if (notes?.trim()) {
    doc.setFontSize(10);
    doc.text('Observações:', margin, y);
    y += 6;
    const lines = doc.splitTextToSize(notes, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    });
    y += 4;
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 10);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin - doc.getTextWidth(`Página ${p} de ${totalPages}`),
      doc.internal.pageSize.getHeight() - 10
    );
    doc.setTextColor(0, 0, 0);
  }
  return doc;
}

export function generateProposalPDF(options: ProposalPDFOptions): void {
  const doc = buildProposalPDFDoc(options);
  const safeTitle =
    (options.title || 'proposta').replace(/[^a-zA-Z0-9\u00C0-\u00FF\s-]/g, '').trim() || 'proposta';
  doc.save(`${safeTitle.substring(0, 50)}.pdf`);
}

export function getProposalPDFPreviewUrl(options: ProposalPDFOptions): string {
  const doc = buildProposalPDFDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

// --- Ata de reunião ---

export interface MeetingMinutesPDFOptions {
  title: string;
  date?: string;
  participants?: string;
  agenda?: string;
  discussionItems?: string[];
  decisions?: string[];
  nextSteps?: string[];
  footerText?: string;
}

function buildMeetingMinutesPDFDoc(options: MeetingMinutesPDFOptions): jsPDF {
  const {
    title,
    date,
    participants,
    agenda,
    discussionItems = [],
    decisions = [],
    nextSteps = [],
    footerText = 'Zapr CRM - Documento gerado automaticamente',
  } = options;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 12;

  if (date?.trim()) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Data: ${date}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  const section = (label: string, content: string | string[]) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(label, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = Array.isArray(content)
      ? content.filter(Boolean).map((line, i) => `${i + 1}. ${line}`)
      : doc.splitTextToSize(content || '—', pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    });
    y += 10;
  };

  if (participants?.trim()) section('Participantes', participants);
  if (agenda?.trim()) section('Pauta', agenda);
  if (discussionItems.length) section('Itens de discussão', discussionItems);
  if (decisions.length) section('Decisões', decisions);
  if (nextSteps.length) section('Próximos passos', nextSteps);

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 10);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin - doc.getTextWidth(`Página ${p} de ${totalPages}`),
      doc.internal.pageSize.getHeight() - 10
    );
    doc.setTextColor(0, 0, 0);
  }
  return doc;
}

export function generateMeetingMinutesPDF(options: MeetingMinutesPDFOptions): void {
  const doc = buildMeetingMinutesPDFDoc(options);
  const safeTitle =
    (options.title || 'ata').replace(/[^a-zA-Z0-9\u00C0-\u00FF\s-]/g, '').trim() || 'ata';
  doc.save(`${safeTitle.substring(0, 50)}.pdf`);
}

export function getMeetingMinutesPDFPreviewUrl(options: MeetingMinutesPDFOptions): string {
  const doc = buildMeetingMinutesPDFDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
// --- Recibo de Pagamento ---

export interface ReceiptPDFOptions {
  payer: string;
  receiver: string;
  value: number;
  reference: string;
  date: string;
  city?: string;
  paymentMethod?: string;
  footerText?: string;
}

function buildReceiptPDFDoc(options: ReceiptPDFOptions): jsPDF {
  const {
    payer,
    receiver,
    value,
    reference,
    date,
    city = 'São Paulo',
    paymentMethod,
    footerText = 'Zapr CRM - Documento gerado automaticamente',
  } = options;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 30;

  // Título
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Valor box
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - 2 * margin, 20, 'F');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
  doc.text(`Valor: ${formattedValue}`, pageWidth / 2, y + 13, { align: 'center' });
  y += 35;

  // Corpo do texto
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const lineHeight = 10;

  const text = `Recebi(emos) de ${payer.toUpperCase()}, a importância de ${formattedValue}, referente a ${reference}.`;
  const splitText = doc.splitTextToSize(text, pageWidth - 2 * margin);
  doc.text(splitText, margin, y);
  y += splitText.length * lineHeight + 10;

  doc.text(
    `Para maior clareza, firmo(amos) o presente recibo para que produza os seus devidos efeitos legais.`,
    margin,
    y
  );
  y += 20;

  if (paymentMethod) {
    doc.text(`Forma de pagamento: ${paymentMethod}`, margin, y);
    y += 15;
  }

  // Data e Assinatura
  doc.text(`${city}, ${date}.`, margin, y);
  y += 40;

  doc.line(margin, y, pageWidth / 2 + 20, y);
  doc.setFontSize(10);
  doc.text(receiver.toUpperCase(), margin, y + 5);
  doc.text('Assinatura / Responsável', margin, y + 10);

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 10);
    doc.setTextColor(0, 0, 0);
  }

  return doc;
}

export function generateReceiptPDF(options: ReceiptPDFOptions): void {
  const doc = buildReceiptPDFDoc(options);
  const safeRef = options.reference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || 'recibo';
  doc.save(`recibo-${safeRef}.pdf`);
}

export function getReceiptPDFPreviewUrl(options: ReceiptPDFOptions): string {
  const doc = buildReceiptPDFDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

// --- Contrato Simples (Locação/Venda) ---

export interface ContractPDFOptions {
  title: string;
  partyA: string; // Locador/Vendedor
  partyB: string; // Locatário/Comprador
  object: string; // Imóvel/Objeto
  value: number;
  conditions: string; // Prazo, forma de pagto, etc.
  date: string;
  footerText?: string;
}

function buildContractPDFDoc(options: ContractPDFOptions): jsPDF {
  const {
    title,
    partyA,
    partyB,
    object,
    value,
    conditions,
    date,
    footerText = 'Zapr CRM - Documento gerado automaticamente',
  } = options;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Corpo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const lineHeight = 6;

  const addParagraph = (text: string) => {
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    if (y + lines.length * lineHeight > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 6;
  };

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

  // Cláusula 1: Partes
  doc.setFont('helvetica', 'bold');
  addParagraph('CLÁUSULA PRIMEIRA - DAS PARTES');
  doc.setFont('helvetica', 'normal');
  addParagraph(
    `De um lado, ${partyA.toUpperCase()}, doravante denominado(a) PARTE A; e de outro lado, ${partyB.toUpperCase()}, doravante denominado(a) PARTE B, têm entre si justo e contratado o presente instrumento particular.`
  );

  // Cláusula 2: Objeto
  doc.setFont('helvetica', 'bold');
  addParagraph('CLÁUSULA SEGUNDA - DO OBJETO');
  doc.setFont('helvetica', 'normal');
  addParagraph(`O presente contrato tem como objeto: ${object}.`);

  // Cláusula 3: Valor
  doc.setFont('helvetica', 'bold');
  addParagraph('CLÁUSULA TERCEIRA - DO VALOR E PAGAMENTO');
  doc.setFont('helvetica', 'normal');
  addParagraph(
    `Pelo objeto deste contrato, a PARTE B pagará à PARTE A a importância de ${formattedValue}.`
  );

  // Cláusula 4: Condições
  doc.setFont('helvetica', 'bold');
  addParagraph('CLÁUSULA QUARTA - DAS CONDIÇÕES GERAIS');
  doc.setFont('helvetica', 'normal');
  addParagraph(conditions);

  // Cláusula 5: Foro
  doc.setFont('helvetica', 'bold');
  addParagraph('CLÁUSULA QUINTA - DO FORO');
  doc.setFont('helvetica', 'normal');
  addParagraph(
    'As partes elegem o foro da comarca local para dirimir quaisquer dúvidas oriundas deste contrato.'
  );

  y += 10;
  addParagraph(`Local e Data: ${date}`);

  y += 20;

  // Assinaturas
  if (y + 40 > 270) {
    doc.addPage();
    y = 40;
  }

  doc.line(margin, y, pageWidth / 2 - 10, y);
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.text('PARTE A', margin, y);
  doc.text('PARTE B', pageWidth / 2 + 10, y);

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(footerText, margin, doc.internal.pageSize.getHeight() - 10);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin - doc.getTextWidth(`Página ${p} de ${totalPages}`),
      doc.internal.pageSize.getHeight() - 10
    );
    doc.setTextColor(0, 0, 0);
  }

  return doc;
}

export function generateContractPDF(options: ContractPDFOptions): void {
  const doc = buildContractPDFDoc(options);
  const safeTitle =
    (options.title || 'contrato').replace(/[^a-zA-Z0-9\u00C0-\u00FF\s-]/g, '').trim() || 'contrato';
  doc.save(`${safeTitle.substring(0, 50)}.pdf`);
}

export function getContractPDFPreviewUrl(options: ContractPDFOptions): string {
  const doc = buildContractPDFDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
