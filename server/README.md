# 🚀 Servidor WhatsApp com Baileys

Este servidor permite conectar seu WhatsApp ao CRM usando a biblioteca **Baileys**.

## 📦 Instalação

As dependências já foram instaladas automaticamente:
- `@whiskeysockets/baileys` - Biblioteca para WhatsApp Web
- `express` - Servidor HTTP
- `socket.io` - Comunicação em tempo real
- `cors` - Permitir requisições do frontend

## ▶️ Como Usar

### 1. Inicie o servidor WhatsApp

```bash
npm run whatsapp-server
```

O servidor iniciará na porta **3001** e exibirá:
```
🚀 Servidor Baileys rodando na porta 3001
📡 Socket.IO pronto para conexões em tempo real
```

### 2. Acesse o CRM

No navegador, vá para **Configurações → Conexão WhatsApp** e clique em **"Conectar WhatsApp"**.

### 3. Escaneie o QR Code

- Um QR Code será exibido na tela
- Abra o WhatsApp no seu celular
- Vá em **Configurações → Aparelhos Conectados**
- Toque em **"Conectar um aparelho"**
- Escaneie o QR Code

### 4. Pronto! 🎉

Agora todas as mensagens recebidas no WhatsApp serão espelhadas no CRM em tempo real.

## 🔌 API Endpoints

O servidor expõe os seguintes endpoints:

### `GET /status`
Retorna o status atual da conexão e o QR Code (se disponível).

```json
{
  "status": "connected",
  "qr": null
}
```

### `POST /connect`
Inicia uma nova conexão com o WhatsApp.

### `POST /disconnect`
Desconecta a sessão atual do WhatsApp.

### `POST /send`
Envia uma mensagem via WhatsApp.

```json
{
  "to": "5511999999999@s.whatsapp.net",
  "message": "Olá! Esta é uma mensagem automática."
}
```

## 🔄 Socket.IO Events

### Eventos recebidos do servidor:

- **`status`**: Atualização do status da conexão (`disconnected`, `connecting`, `connected`)
- **`qr`**: QR Code gerado (string)
- **`message`**: Nova mensagem recebida

### Exemplo de uso no frontend:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('status', (status) => {
  console.log('Status:', status);
});

socket.on('qr', (qrData) => {
  console.log('QR Code:', qrData);
});

socket.on('message', (msg) => {
  console.log('Nova mensagem:', msg);
});
```

## 📁 Sessão Persistente

A autenticação do WhatsApp é salva na pasta `auth_info_baileys/`. Isso significa que você não precisará escanear o QR Code toda vez que reiniciar o servidor.

**⚠️ IMPORTANTE**: Nunca compartilhe ou faça commit da pasta `auth_info_baileys/` no Git, pois ela contém suas credenciais de sessão.

## 🛠️ Troubleshooting

### Erro: "WhatsApp não conectado"
- Verifique se o servidor está rodando (`npm run whatsapp-server`)
- Confirme que a porta 3001 não está sendo usada por outro processo

### QR Code não aparece
- Aguarde alguns segundos após clicar em "Conectar WhatsApp"
- Verifique o console do servidor para mensagens de erro

### Desconexão frequente
- Certifique-se de que seu celular está com internet estável
- Não desconecte o aparelho manualmente no WhatsApp

## 🔐 Segurança

- As mensagens são criptografadas de ponta a ponta pelo WhatsApp
- A sessão é armazenada localmente no servidor
- Use HTTPS em produção para proteger a comunicação com o frontend
