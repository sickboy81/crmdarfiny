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

// Configuração Supabase (Usando Anon Key por enquanto, pois as políticas permitem)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Endpoints
app.get('/status', (req, res) => res.json({ status: connectionStatus, qr: qrCodeData }));
app.post('/connect', (req, res) => {
    if (connectionStatus === 'disconnected') connectToWhatsApp();
    res.json({ message: 'Iniciando...' });
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

io.on('connection', (socket) => {
    socket.emit('status', connectionStatus);
    if (qrCodeData) socket.emit('qr', qrCodeData);
});

const PORT = 3001;
server.listen(PORT, () => console.log(`🚀 Servidor WhatsApp/Supabase Bridge rodando na porta ${PORT}`));
connectToWhatsApp(); // Tenta conectar no início se houver auth salvo
