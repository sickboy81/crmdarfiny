import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega variáveis do .env do projeto
dotenv.config({ path: './.env' });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Configuração Supabase
// Tenta pegar com VITE_ (padrão frontend) ou sem prefixo (comum no backend)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('--- Debug de Ambiente ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Configurado ✅' : 'Ausente ❌');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Configurado ✅' : 'Ausente ❌');
console.log('-------------------------');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!');
    console.error('Certifique-se de que os nomes estão EXATAMENTE como VITE_SUPABASE_URL ou SUPABASE_URL.');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Força reinicialização no Coolify para podermos ver o erro
    }
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase inicializado.');

app.use(cors());
app.use(express.json());

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Darfiny CRM', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = qr;
            connectionStatus = 'connecting';
            io.emit('qr', qr);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            connectionStatus = 'disconnected';
            io.emit('status', 'disconnected');
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            connectionStatus = 'connected';
            qrCodeData = null;
            io.emit('status', 'connected');
            console.log('✅ WhatsApp conectado e pronto para sincronizar!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.key.fromMe && msg.message) {
            const phoneJid = msg.key.remoteJid;
            const phoneNumber = phoneJid.split('@')[0];
            const messageText = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                '[Mídia]';

            const contactName = msg.pushName || phoneNumber;
            const contactId = `c-${phoneNumber}`;

            try {
                // 1. Sincroniza Contato no Supabase
                const { error: contactError } = await supabase.from('contacts').upsert({
                    id: contactId,
                    name: contactName,
                    phone_number: phoneNumber,
                    source: 'WhatsApp',
                    last_seen: new Date().toISOString(),
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName)}&background=random`
                }, { onConflict: 'id' });

                if (contactError) console.error('Erro ao salvar contato:', contactError);

                // 2. Salva Mensagem no Supabase
                const { error: msgError } = await supabase.from('messages').upsert({
                    id: msg.key.id,
                    contact_id: contactId,
                    text: messageText,
                    sender: 'contact',
                    timestamp: new Date().toISOString(),
                    status: 'received'
                }, { onConflict: 'id' });

                if (msgError) console.error('Erro ao salvar mensagem:', msgError);

                // 3. Emite para o frontend (Opcional, pois o useRealtimeSync do frontend já vai pegar do Supabase!)
                io.emit('message', {
                    from: phoneJid,
                    text: messageText,
                    contactName
                });

                console.log(`📩 [SYNC] Mensagem de ${contactName} salva no banco.`);
            } catch (err) {
                console.error('Falha crítica na sincronização Supabase:', err);
            }
        }
    });
}

/**
 * Helper to find or create a contact by email
 */
async function findContactByEmail(email) {
    if (!email) return null;
    
    const cleanEmail = email.toLowerCase().trim();
    
    try {
        const { data: contact, error } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle(); // Use maybeSingle to avoid 406 errors if not found
            
        if (contact) return contact.id;
        
        const nameFromEmail = cleanEmail.split('@')[0];
        const newId = `e-${Date.now()}`;
        
        const { error: insertError } = await supabase.from('contacts').insert({
            id: newId,
            name: nameFromEmail,
            email: cleanEmail,
            source: 'Email',
            last_seen: new Date().toISOString()
        });

        if (insertError) {
            console.error('❌ [DB] Erro ao criar contato por email:', insertError);
            throw insertError;
        }
        
        return newId;
    } catch (err) {
        console.error('❌ [DB] Falha crítica no findContactByEmail:', err);
        throw err;
    }
}

// Endpoints
app.get('/status', (req, res) => res.json({ status: connectionStatus, qr: qrCodeData }));
app.post('/connect', (req, res) => {
    if (connectionStatus === 'disconnected') connectToWhatsApp();
    res.json({ message: 'Iniciando...' });
});

/**
 * Public endpoint to test server connectivity for webhooks
 */
app.get('/test-webhook', (req, res) => {
    res.json({ 
        message: 'Servidor alcançável! Use esta URL no Resend.',
        url: 'https://server.darfinyavila.com.br/webhooks/resend',
        status: connectionStatus,
        time: new Date().toISOString()
    });
});

/**
 * Webhook for Resend Inbound
 */
app.post('/webhooks/resend', async (req, res) => {
    console.log('📩 [WEBHOOK] Recebido do Resend:', JSON.stringify(req.body, null, 2));
    
    // Resend webhooks costumam enviar o objeto de email dentro de 'data'
    const payload = req.body.data || req.body;
    const { from, to, subject, text, html, attachments } = payload;
    
    if (!from || !to) {
        console.warn('⚠️ [WEBHOOK] Payload incompleto ignorado. "from" ou "to" ausentes.');
        return res.status(400).json({ error: 'Payload inválido' });
    }

    try {
        const fromEmail = from.includes('<') ? from.match(/<([^>]+)>/)[1] : from;
        console.log(`🔍 [WEBHOOK] Processando email de: ${fromEmail}`);
        
        const contactId = await findContactByEmail(fromEmail);
        
        const emailRecord = {
            id: payload.id || payload.email_id || `res-${Date.now()}`,
            from_email: fromEmail,
            to_email: Array.isArray(to) ? to[0] : to,
            subject: subject || '(Sem assunto)',
            content: html || text || '',
            status: 'received',
            timestamp: payload.created_at || new Date().toISOString(),
            attachments: attachments || [],
            contact_id: contactId
        };

        const { error } = await supabase.from('emails').upsert(emailRecord);
        
        if (error) {
            console.error('❌ [WEBHOOK] Erro ao salvar email no banco:', error);
            // Retorna o erro real para o Resend mostrar no Dashboard
            return res.status(500).json({ 
                error: 'Erro ao salvar no banco', 
                details: error,
                message: error.message 
            });
        }

        console.log(`✅ [WEBHOOK] Email de ${fromEmail} salvo com sucesso.`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('💥 [WEBHOOK] Erro crítico no processamento:', err);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});
app.post('/disconnect', async (req, res) => {
    if (sock) await sock.logout();
    res.json({ message: 'Desconectado' });
});
app.post('/send', async (req, res) => {
    const { to, message } = req.body;
    if (!sock || connectionStatus !== 'connected') return res.status(400).json({ error: 'Offline' });

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        const result = await sock.sendMessage(jid, { text: message });

        // Salva mensagem enviada no Supabase para manter histórico completo
        await supabase.from('messages').insert({
            id: result.key.id,
            contact_id: `c-${to.replace(/\D/g, '')}`,
            text: message,
            sender: 'user',
            timestamp: new Date().toISOString(),
            status: 'sent'
        });

        res.json({ success: true, id: result.key.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Proxy to send emails via Resend
 */
app.post('/emails/send', async (req, res) => {
    const { to, subject, content, apiKey, verifiedSender, attachments, scheduled_at } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'Configuração ausente: API Key do Resend não informada.' });
    }

    try {
        const sender = verifiedSender || 'CRM <contato@seudominio.com.br>';
        
        console.log(`📤 [EMAIL] Enviando para ${to} via Resend...`);

        const emailPayload = {
            from: sender,
            to: [to],
            subject: subject,
            html: content.replace(/\n/g, '<br>'),
        };

        if (attachments && attachments.length > 0) {
            emailPayload.attachments = attachments;
        }

        if (scheduled_at) {
            emailPayload.scheduled_at = scheduled_at;
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ [EMAIL] Falha no Resend:', {
                status: response.status,
                data,
                sender: emailPayload.from,
                to: emailPayload.to
            });
            return res.status(response.status).json({ 
                error: data.message || 'Erro ao enviar via Resend',
                details: data
            });
        }

        console.log(`✅ [EMAIL] Sucesso! ID: ${data.id} | De: ${emailPayload.from} | Para: ${emailPayload.to}`);
        res.json({ success: true, id: data.id });
    } catch (error) {
        console.error('💥 [EMAIL] Erro crítico no envio:', error);
        res.status(500).json({ error: error.message });
    }
});

io.on('connection', (socket) => {
    socket.emit('status', connectionStatus);
    if (qrCodeData) socket.emit('qr', qrCodeData);
});

const PORT = 3001;
server.listen(PORT, () => console.log(`🚀 Servidor WhatsApp/Supabase Bridge rodando na porta ${PORT}`));
connectToWhatsApp(); // Tenta conectar no início se houver auth salvo
