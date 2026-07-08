# Plano de Migração: Features do Darfiny CRM → WACRM

> **Objetivo:** Portar todas as funcionalidades únicas do projeto antigo (Darfiny CRM) para o novo wacrm, sem modificar o projeto original.

**Stack wacrm:** Next.js 16 (App Router) + Supabase + shadcn/ui + Tailwind v4
**Stack antigo:** Vite + React SPA + Turso (SQLite) + componentes customizados

---

## Features a Portar (10 módulos)

### BATCH 1 — Serviços Standalone (sem mudanças de DB)

| # | Feature | Arquivos antigos | Complexidade |
|---|---------|-----------------|-------------|
| 1 | **AutoPost FB** | `AutoPostFB.tsx` (974L), `facebookService.ts` (198L) | Média |
| 2 | **BankExtractor** | `BankExtractor.tsx` (707L), `aiService.ts` (parcial) | Média |
| 3 | **AIWriter** | `AIWriter.tsx` (~400L), `aiService.ts` (parcial) | Baixa |
| 4 | **SocialPost** | `SocialPost.tsx` (~200L), `aiService.ts` (parcial) | Baixa |
| 5 | **ContactExtractor** | `ContactExtractor.tsx`, `extractionService.ts` (210L) | Média |

### BATCH 2 — Precisam de Schema no Supabase

| # | Feature | Arquivos antigos | Complexidade |
|---|---------|-----------------|-------------|
| 6 | **EmailManager** | `EmailManager.tsx` (927L), `emailService.ts` (69L) | Alta |
| 7 | **ImageManager** | `ImageManager.tsx` (848L) | Média |
| 8 | **LinkBio** | `LinkBio.tsx`, `bioService.ts` (122L), `App.tsx` (rota /bio) | Média |
| 9 | **Properties** | `PropertyCatalog.tsx`, `PropertyFormModal.tsx`, `PropertyCard.tsx` | Média |
| 10 | **UniPDF** | `UniPDF.tsx`, `AIModal.tsx`, `CropModal.tsx`, `DropZone.tsx` | Alta |

---

## Detalhamento por Feature

### 1. AutoPost FB (Facebook Group Auto Poster)

**O que faz:** Publica automaticamente em grupos do Facebook via API ou extensão Chrome.

**Arquivos a criar no wacrm:**
- `src/app/(dashboard)/autopost/page.tsx` — Página
- `src/components/autopost/auto-post-fb.tsx` — Componente principal
- `src/lib/facebook/service.ts` — Service (API Graph)
- `src/lib/facebook/types.ts` — Tipos

**Dependências npm:** Nenhuma nova (usa fetch nativo)

**Adaptações:**
- Migrar de `useAppStore` (Zustand) para settings do Supabase
- Usar shadcn/ui para botões, inputs, cards
- Manter lógica de extensão Chrome (postMessage)

---

### 2. BankExtractor (Apuração de Renda)

**O que faz:** Upload de extratos bancários (PDF/IMG), OCR via IA, gera planilha XLSX.

**Arquivos a criar:**
- `src/app/(dashboard)/bank-extractor/page.tsx`
- `src/components/bank-extractor/bank-extractor.tsx`
- `src/lib/bank-extractor/extract.ts` — Lógica de extração
- `src/lib/bank-extractor/spreadsheet.ts` — Geração XLSX

**Dependências npm:**
- `xlsx` (já usado no projeto antigo)
- `pdfjs-dist` (para renderizar PDF → canvas)

**Adaptações:**
- IA via `src/lib/ai/` do wacrm (já tem providers OpenAI + Anthropic)
- Adicionar Google Gemini como provider opcional
- Usar Supabase Storage para armazenar arquivos processados

---

### 3. AIWriter (Escritor IA)

**O que faz:** Gera textos (emails, contratos, propostas, WhatsApp) via IA.

**Arquivos a criar:**
- `src/app/(dashboard)/ai-writer/page.tsx`
- `src/components/ai-writer/ai-writer.tsx`

**Dependências npm:** Nenhuma

**Adaptações:**
- Reutilizar `src/lib/ai/generate.ts` do wacrm
- Adaptar prompts para o sistema de providers existente

---

### 4. SocialPost (Posts para Redes Sociais)

**O que faz:** Gera conteúdo para Facebook, Instagram, X, TikTok, LinkedIn via IA.

**Arquivos a criar:**
- `src/app/(dashboard)/social-posts/page.tsx`
- `src/components/social-posts/social-post.tsx`

**Dependências npm:** Nenhuma

**Adaptações:**
- Reutilizar `src/lib/ai/generate.ts`

---

### 5. ContactExtractor (Extrator de Leads)

**O que faz:** Extrai contatos de imagens, PDFs, planilhas via IA/regex.

**Arquivos a criar:**
- `src/app/(dashboard)/contacts/extractor/page.tsx` (ou sub-página)
- `src/components/contacts/contact-extractor.tsx`
- `src/lib/contacts/extract-leads.ts`

**Dependências npm:**
- `xlsx` (para planilhas)

---

### 6. EmailManager (Gerenciador de E-mails)

**O que faz:** Interface completa de email com envio via Resend, templates, agendamento.

**Arquivos a criar:**
- `src/app/(dashboard)/email/page.tsx`
- `src/components/email/email-manager.tsx`
- `src/lib/email/service.ts` — Envio via Resend
- Migration: `031_emails.sql`

**Schema Supabase:**
```sql
CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  from_email TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'sent',
  attachments JSONB DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  is_starred BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 7. ImageManager (Galeria de Imagens)

**O que faz:** Upload, edição (crop/rotate), conversão WebP, download.

**Arquivos a criar:**
- `src/app/(dashboard)/images/page.tsx`
- `src/components/images/image-manager.tsx`
- `src/components/images/image-editor.tsx` — Crop/rotate modal
- Migration: `032_images.sql`

**Schema Supabase:**
```sql
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  size BIGINT DEFAULT 0,
  type TEXT,
  source TEXT DEFAULT 'upload',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Dependências npm:**
- `react-image-crop` (já usado no antigo)

---

### 8. LinkBio (Página de Bio)

**O que faz:** Gerencia e exibe página pública tipo "Link na Bio".

**Arquivos a criar:**
- `src/app/(dashboard)/link-bio/page.tsx` — Editor
- `src/components/link-bio/link-bio-editor.tsx`
- `src/app/bio/page.tsx` — Página pública (já existe rota /bio)
- `src/lib/bio/service.ts`
- Migration: `033_bio_configs.sql`

**Schema Supabase:**
```sql
CREATE TABLE bio_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  profile_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  theme JSONB,
  links JSONB DEFAULT '[]',
  socials JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 9. Properties (Catálogo de Imóveis)

**O que faz:** CRUD de imóveis com fotos, specs, status.

**Arquivos a criar:**
- `src/app/(dashboard)/properties/page.tsx`
- `src/components/properties/property-catalog.tsx`
- `src/components/properties/property-form.tsx`
- `src/components/properties/property-card.tsx`
- `src/lib/properties/types.ts`
- Migration: `034_properties.sql`

**Schema Supabase:**
```sql
CREATE TABLE properties (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id),
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'apartment',
  status TEXT DEFAULT 'available',
  price NUMERIC DEFAULT 0,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  specs JSONB DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 10. UniPDF (Ferramentas PDF)

**O que faz:** Unificar, cortar, gerar PDFs com IA, propostas, contratos.

**Arquivos a criar:**
- `src/app/(dashboard)/pdf/page.tsx`
- `src/components/pdf/uni-pdf.tsx`
- `src/components/pdf/ai-modal.tsx`
- `src/components/pdf/crop-modal.tsx`
- `src/components/pdf/drop-zone.tsx`
- `src/lib/pdf/service.ts` — jsPDF + pdf-lib

**Dependências npm:**
- `jspdf` (geração de PDF)
- `pdf-lib` (edição de PDF)
- `pdfjs-dist` (leitura de PDF)

---

## Ordem de Implementação Recomendada

1. **AIWriter** — Mais simples, reutiliza IA existente
2. **SocialPost** — Simples, reutiliza IA existente
3. **AutoPost FB** — Standalone, sem DB
4. **BankExtractor** — Standalone, precisa de xlsx + pdfjs
5. **ContactExtractor** — Standalone, precisa de xlsx
6. **ImageManager** — Precisa de migration
7. **Properties** — Precisa de migration
8. **LinkBio** — Precisa de migration + rota pública
9. **EmailManager** — Precisa de migration + Resend API
10. **UniPDF** — Mais complexo, múltiplas dependências

---

## Comando para criar todas as migrations

```bash
# No Supabase SQL Editor, rodar cada migration na ordem:
031_emails.sql
032_images.sql
033_bio_configs.sql
034_properties.sql
```

## Dependências npm a instalar

```bash
npm install xlsx pdfjs-dist jspdf pdf-lib react-image-crop
```
