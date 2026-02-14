import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Contact } from '../types';

export interface ExtractedLead {
    name: string;
    phone: string;
    email: string;
    source: string;
}

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const phoneRegex = /(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})[-.\s]?(\d{4}))/g;

/**
 * Proximity-based text processor (Sliding window)
 */
export const extractLeadsFromText = (text: string, sourceName: string): ExtractedLead[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const leads: ExtractedLead[] = [];

    for (let i = 0; i < lines.length; i++) {
        const window = lines.slice(i, i + 4);
        let name = '';
        let phone = '';
        let email = '';

        window.forEach((line) => {
            const emails = line.match(emailRegex);
            const phones = [...line.matchAll(phoneRegex)].map(m => `${m[2] || ''}${m[3]}${m[4]}`.replace(/\D/g, ''));

            if (emails && !email) email = emails[0];
            if (phones.length > 0 && !phone) phone = phones[0];
            if (!name && line.length > 2 && line.length < 40 && !line.includes('---') && !emails && phones.length === 0) {
                name = line;
            }
        });

        if (phone || email) {
            leads.push({
                name: name || (email ? email.split('@')[0] : `Lead ${phone?.slice(-4) || 'S/N'}`),
                phone: phone || '',
                email: email || '',
                source: sourceName
            });
            // Jump used lines
            if (phone && email) i += 2;
            else i += 1;
        }
    }
    return leads;
};

/**
 * Process Excel/CSV files using XLSX
 */
export const extractLeadsFromSpreadsheet = async (file: File): Promise<ExtractedLead[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                const leads: ExtractedLead[] = [];

                // Find columns for name, phone, email
                let nameCol = -1, phoneCol = -1, emailCol = -1;

                if (jsonData.length > 0) {
                    const headers = jsonData[0].map(h => String(h).toLowerCase());
                    nameCol = headers.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('cliente'));
                    phoneCol = headers.findIndex(h => h.includes('tel') || h.includes('cel') || h.includes('fone') || h.includes('phone') || h.includes('contato'));
                    emailCol = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
                }

                // Process rows
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    let name = '', phone = '', email = '';

                    if (nameCol !== -1) name = String(row[nameCol] || '');
                    if (phoneCol !== -1) phone = String(row[phoneCol] || '').replace(/\D/g, '');
                    if (emailCol !== -1) email = String(row[emailCol] || '');

                    // Fallback if columns not found: scan row
                    if (!phone && !email) {
                        row.forEach(cell => {
                            const sCell = String(cell || '');
                            if (sCell.match(emailRegex)) email = sCell.match(emailRegex)![0];
                            const phones = sCell.match(/\d{8,11}/);
                            if (phones) phone = phones[0];
                        });
                    }

                    if (phone || email) {
                        leads.push({
                            name: name || (email ? email.split('@')[0] : `Lead ${phone?.slice(-4) || 'S/N'}`),
                            phone: phone,
                            email: email,
                            source: `Planilha: ${file.name}`
                        });
                    }
                }
                resolve(leads);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Process PDF via Vision IA (converts pages to images)
 */
export const extractLeadsFromPdf = async (file: File): Promise<ExtractedLead[]> => {
    const { convertPdfToImages } = await import('../utils/pdfProcessor');
    const { extractContactsFromImage } = await import('./geminiService');

    const images = await convertPdfToImages(file);
    const allLeads: ExtractedLead[] = [];

    for (let i = 0; i < images.length; i++) {
        toast.loading(`Lendo PDF: página ${i + 1} de ${images.length}...`, { id: 'pdf-import' });
        try {
            const results = await extractContactsFromImage(images[i]);
            if (results && results.length > 0) {
                results.forEach((r: any) => {
                    allLeads.push({
                        name: r.name || '',
                        phone: (r.phone || '').replace(/\D/g, ''),
                        email: r.email || '',
                        source: `PDF: ${file.name} (Pág ${i + 1})`
                    });
                });
            }
        } catch (e) {
            console.error(`Error page ${i + 1}`, e);
        }
    }
    toast.dismiss('pdf-import');
    return allLeads;
};

/**
 * Consolidated saving to Store
 */
export const saveLeadsToStore = (newLeads: ExtractedLead[], addContact: (c: Contact) => void, existingContacts: Contact[]) => {
    let count = 0;
    newLeads.forEach(lead => {
        // Check for duplicates in existing contacts (phone or email)
        const duplicate = existingContacts.find(c =>
            (lead.phone && c.phoneNumber === lead.phone) ||
            (lead.email && c.email === lead.email)
        );

        if (!duplicate) {
            addContact({
                id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: lead.name,
                phoneNumber: lead.phone,
                email: lead.email || undefined,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=random`,
                status: 'active',
                tags: ['Importado', 'Central'],
                isLead: true,
                source: lead.source,
                lastSeen: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            count++;
        }
    });

    if (count > 0) toast.success(`${count} novos leads adicionados à Central!`);
    else toast.info('Nenhum lead novo encontrado (duplicados ignorados).');
};
