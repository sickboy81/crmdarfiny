# Guia de Deploy no Coolify (AlexHost) 🚀

Para rodar o seu **Zapr CRM** em produção usando o Coolify na sua VPS AlexHost, siga estes passos:

## 1. Servidor de Espelhamento WhatsApp (Backend)

No Coolify, crie uma nova **Application** apontando para o seu repositório do GitHub.

### Configurações:
- **Build Pack**: Dockerfile (o Coolify detectará automaticamente o `Dockerfile` que criamos).
- **Port**: 3001
- **Volumes**: 
  - Adicione um volume para manter a conexão do WhatsApp ativa mesmo se o servidor reiniciar:
  - Destino: `/app/auth_info_baileys`
  - *Isso é crucial para não ter que ler o QR Code toda hora.*

### Variáveis de Ambiente (Secrets):
No painel do Coolify, adicione:
- `PORT`: 3001

---

## 2. Frontend (Vite)

Você pode hospedar o frontend no mesmo Coolify (como uma aplicação estática) ou na Vercel/Netlify.

### Variáveis de Ambiente Necessárias:
Independente de onde hospedar, o Frontend precisa destas variáveis:
- `VITE_SUPABASE_URL`: Sua URL do Supabase.
- `VITE_SUPABASE_ANON_KEY`: Sua chave anon do Supabase.
- `VITE_WHATSAPP_SERVER_URL`: **A URL que o Coolify gerou para o seu servidor backend** (ex: `https://whatsapp-api.seu-dominio.com`).

---

## 3. Fluxo de Conexão
1. Faça o deploy do Backend no Coolify primeiro.
2. Copie o domínio gerado pelo Coolify.
3. Configure esse domínio na variável `VITE_WHATSAPP_SERVER_URL` do seu Frontend e faça o deploy dele.
4. No sistema, vá em **Configurações > Conexão WhatsApp** e escaneie o QR Code.

### Comandos Úteis na VPS:
Se precisar rodar algo via SSH:
- `pm2 status` (se estiver usando PM2 fora do Coolify).
- `docker ps` (para ver o container do Coolify).
