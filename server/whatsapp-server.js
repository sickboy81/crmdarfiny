import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeData = qr;
            connectionStatus = 'connecting';
            io.emit('qr', qr);
            console.log('📱 QR Code gerado! Escaneie com seu WhatsApp.');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Conexão fechada. Reconectando:', shouldReconnect);
            connectionStatus = 'disconnected';
            io.emit('status', 'disconnected');

            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp conectado com sucesso!');
            connectionStatus = 'connected';
            qrCodeData = null;
            io.emit('status', 'connected');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.key.fromMe && msg.message) {
            console.log('📩 Nova mensagem:', msg);

            // WhatsApp usa remoteJidAlt para o número real quando remoteJid é um LID
            const phoneJid = msg.key.remoteJidAlt || msg.key.remoteJid;
            const messageText = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                '[Mídia]';

            // Busca informações reais do contato no WhatsApp
            let contactName = msg.pushName && msg.pushName !== '.' ? msg.pushName : null;
            let profilePicUrl = null;

            try {
                // Tenta buscar a foto de perfil
                try {
                    profilePicUrl = await sock.profilePictureUrl(phoneJid, 'image');
                    console.log('✅ Foto de perfil encontrada para:', phoneJid);
                } catch (e) {
                    console.log('⚠️ Sem foto de perfil para:', phoneJid);
                }

                // Se não tiver nome, tenta buscar do WhatsApp Business
                if (!contactName) {
                    try {
                        const [result] = await sock.onWhatsApp(phoneJid);
                        if (result?.verifiedName) {
                            contactName = result.verifiedName;
                            console.log('✅ Nome verificado encontrado:', contactName);
                        }
                    } catch (e) {
                        console.log('⚠️ Não foi possível buscar nome verificado');
                    }
                }
            } catch (error) {
                console.log('⚠️ Erro ao buscar info do contato:', error.message);
            }

            console.log(`📱 De: ${contactName || phoneJid.split('@')[0]} (${phoneJid}) | Mensagem: ${messageText}`);

            // Envia a mensagem para o frontend via Socket.IO
            io.emit('message', {
                from: phoneJid,
                text: messageText,
                timestamp: new Date(msg.messageTimestamp * 1000),
                contactName: contactName,
                profilePicUrl: profilePicUrl
            });
        }
    });
}

// API Endpoints
app.get('/status', (req, res) => {
    res.json({
        status: connectionStatus,
        qr: qrCodeData
    });
});

app.post('/connect', async (req, res) => {
    if (connectionStatus === 'disconnected') {
        connectToWhatsApp();
        res.json({ message: 'Iniciando conexão...' });
    } else {
        res.json({ message: 'Já conectado ou conectando' });
    }
});

app.post('/disconnect', async (req, res) => {
    if (sock) {
        await sock.logout();
        connectionStatus = 'disconnected';
        res.json({ message: 'Desconectado com sucesso' });
    } else {
        res.json({ message: 'Nenhuma conexão ativa' });
    }
});

app.post('/send', async (req, res) => {
    const { to, message } = req.body;

    console.log(`📤 Tentando enviar mensagem para ${to}: ${message}`);

    if (!sock || connectionStatus !== 'connected') {
        console.error('❌ Erro: WhatsApp não conectado no servidor');
        return res.status(400).json({ error: 'WhatsApp não conectado' });
    }

    try {
        // Formatar JID se necessário
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;

        const result = await sock.sendMessage(jid, { text: message });

        console.log(`✅ Mensagem enviada com sucesso para ${jid}`);

        // Emitir confirmação para o frontend
        io.emit('message_sent', {
            to: jid,
            text: message,
            status: 'sent',
            id: result.key.id
        });

        res.json({ success: true, id: result.key.id });
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({ error: error.message });
    }
});

// Socket.IO para comunicação em tempo real
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado ao Socket.IO');

    socket.emit('status', connectionStatus);
    if (qrCodeData) {
        socket.emit('qr', qrCodeData);
    }

    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Servidor Baileys rodando na porta ${PORT}`);
    console.log(`📡 Socket.IO pronto para conexões em tempo real`);
});
