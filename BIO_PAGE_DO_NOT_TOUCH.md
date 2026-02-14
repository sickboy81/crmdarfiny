# 🚨 BIO PAGE — NÃO ALTERE ESTES ARQUIVOS 🚨

> **ÚLTIMA ATUALIZAÇÃO:** 14/02/2026
> **STATUS:** ✅ FUNCIONANDO EM PRODUÇÃO
> **TESTADO EM:** darfinyavila.com.br/bio e crm.darfinyavila.com.br/bio

---

## ⛔ REGRA ABSOLUTA

**OS SEGUINTES ARQUIVOS NÃO DEVEM SER ALTERADOS SEM AUTORIZAÇÃO EXPLÍCITA DO USUÁRIO:**

1. `api/bio.js` — Renderiza a página pública da Bio
2. `vercel.json` — Roteamento do Vercel (regras de rewrite)

Qualquer alteração nesses arquivos pode quebrar a página pública da Bio, que é usada para compartilhamento em redes sociais (WhatsApp, Instagram, etc).

---

## 🏗️ Arquitetura Atual (ESTÁVEL — NÃO MUDE)

### Como funciona o `/bio`:

```
Usuário acessa darfinyavila.com.br/bio
         │
         ▼
   vercel.json rewrite:
   /bio  →  /api/bio
         │
         ▼
   api/bio.js (Edge Function):
   1. Busca dados do Supabase (bio_configs)
   2. Gera HTML COMPLETO no servidor (SSR)
   3. Retorna página pronta com:
      - Meta tags OG (prévia WhatsApp/Instagram)
      - Avatar, nome, bio
      - Links clicáveis com estilo do tema
      - Ícones de redes sociais
      - Rodapé com créditos
         │
         ▼
   Navegador recebe página HTML completa
   ✅ SEM JavaScript necessário
   ✅ SEM redirecionamentos  
   ✅ SEM ?app=true
   ✅ Funciona em QUALQUER domínio
```

### Por que essa arquitetura foi escolhida:

1. **Tentativa 1 (FALHOU):** Redirecionar `/bio` para o React app com `?app=true`. Causava loop infinito de redirecionamento.
2. **Tentativa 2 (FALHOU):** Usar detecção de User-Agent no Vercel para rotear bots vs humanos. O Vercel não processava as regras de forma consistente entre domínios.
3. **Solução final (FUNCIONA):** Server-Side Rendering direto no `api/bio.js`. O servidor gera a página HTML completa, sem depender do React, sem JavaScript, sem redirecionamentos. Funciona para humanos E para bots de redes sociais.

---

## 📁 Arquivos Relacionados

| Arquivo | Função | Pode alterar? |
|---|---|---|
| `api/bio.js` | Renderiza a Bio pública (SSR) | ⛔ NÃO |
| `vercel.json` | Roteamento `/bio` → `/api/bio` | ⛔ NÃO |
| `components/LinkBio.tsx` | Editor da Bio (dentro do CRM) | ✅ SIM (com cuidado) |
| `services/bioService.ts` | Salva configs no Supabase | ✅ SIM (com cuidado) |
| `App.tsx` (seção isBioPath) | Fallback Bio no CRM | ✅ SIM (secundário) |

---

## 🗄️ Banco de Dados (Supabase)

Tabela: `bio_configs`

Colunas necessárias:
- `user_id` (uuid, unique)
- `profile_name` (text)
- `bio` (text)
- `avatar_url` (text)
- `og_title` (text) — ⚠️ Precisa ser criada manualmente no Supabase
- `og_description` (text) — ⚠️ Precisa ser criada manualmente no Supabase
- `og_image_url` (text) — ⚠️ Precisa ser criada manualmente no Supabase
- `theme` (jsonb)
- `links` (jsonb)
- `socials` (jsonb)
- `active` (boolean)
- `created_at`, `updated_at` (timestamps)

### SQL para adicionar colunas OG (se ainda não existirem):
```sql
ALTER TABLE bio_configs
ADD COLUMN IF NOT EXISTS og_title text,
ADD COLUMN IF NOT EXISTS og_description text,
ADD COLUMN IF NOT EXISTS og_image_url text;
```

---

## 🔗 URLs

- **Bio pública (principal):** https://darfinyavila.com.br/bio
- **Bio pública (CRM):** https://crm.darfinyavila.com.br/bio
- **Editor da Bio (dentro do CRM):** Configurações → Bio & SEO

---

## ❌ O que NÃO fazer

1. **NÃO** adicione redirecionamentos no `api/bio.js`
2. **NÃO** use `?app=true` ou qualquer query parameter para rotear
3. **NÃO** tente usar detecção de User-Agent no `vercel.json`
4. **NÃO** mude a regra `/bio → /api/bio` no `vercel.json`
5. **NÃO** faça o `/bio` depender do React app carregar
6. **NÃO** adicione `<script>` tags com `window.location.replace()` no `api/bio.js`

## ✅ O que PODE fazer (com cuidado)

1. Alterar o visual/CSS dentro do `api/bio.js` (cores, fontes, layout)
2. Adicionar mais campos de dados (ex: telefone, endereço)
3. Alterar o editor (`LinkBio.tsx`) para salvar novos campos
4. Alterar o `bioService.ts` para salvar/ler novos campos
