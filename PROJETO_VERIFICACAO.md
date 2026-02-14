# Relatório de Verificação do Projeto – CRM WhatsApp & Auto Post

**Data:** 2026-02-08  

---

## 1. Visão Geral

| Item | Status |
|------|--------|
| **Nome** | Darfiny CRM (darfiny-crm) |
| **Tipo** | React + Vite, Extensão Chrome |
| **Versão** | package.json v0.0.0 |
| **Extensão** | v3.0.1 "CRM All-in-One (WhatsApp & AutoPost)" |

---

## 2. Estrutura Principal

```
CRM Whatsapp/
├── App.tsx              # App principal, rotas, auth Supabase
├── components/          # AutoPostFB, ChatInterface, Dashboard, etc.
├── extension/           # Extensão Chrome
│   ├── background.js    # Service worker
│   ├── manifest.json
│   ├── popup/
│   └── scripts/
│       ├── content-fb-session.js   # Facebook (sessão + grupos)
│       ├── content-whatsapp.js     # WhatsApp Web
│       └── content-crm.js          # Comunicação CRM ↔ Extensão
├── services/            # facebookService, whatsappService, etc.
└── stores/              # Zustand (useAppStore, etc.)
```

---

## 3. Fluxo Auto Post (Modo Extensão)

### 3.1 Carregar grupos

1. **AutoPostFB** → `window.postMessage({ type: 'CRM_EXT_LOAD_GROUPS' })`
2. **content-crm.js** (localhost) → `chrome.runtime.sendMessage({ type: 'LOAD_GROUPS' })`
3. **background.js** → cria aba **ativa** em `https://www.facebook.com/groups/joins/`
4. **background** → `chrome.tabs.sendMessage(tabId, { type: 'START_EXTRACTION' })`
5. **content-fb-session.js** → `autoScrollAndCollect()`:
   - Intercepta XHR/Fetch (GraphQL) → preenche `capturedGroups`
   - Rola a página até o fim
   - `extractGroupsFromDOM()` a cada tick
   - Ao fim → salva em `chrome.storage.local` e envia `GROUPS_COLLECTED`
6. **background** → escuta `GROUPS_COLLECTED` → `sendToCRMTabs(CRM_EXT_GROUPS_LOADED)`
7. **content-crm** → recebe ou faz polling no storage → `postToPage(CRM_EXT_GROUPS_LOADED)`
8. **AutoPostFB** → atualiza `extensionGroups`

### 3.2 Postar em todos

1. **AutoPostFB** → `postMessage({ type: 'CRM_EXT_POST_ALL', payload })`
2. **content-crm** → `chrome.runtime.sendMessage({ type: 'POST_ALL', payload })`
3. **background** → `postAll()` com `getStoredDtsg()`, envia via GraphQL
4. **background** → envia `CRM_EXT_PROGRESS` e `CRM_EXT_DONE`
5. **AutoPostFB** → atualiza progresso e resultados

---

## 4. Problemas Identificados

### 4.1 Grupos: postagens em vez da lista (crítico)

**Situação:** `extractGroupsFromDOM()` pega qualquer `a[href*="/groups/"]`, incluindo links de **postagens** do feed (ex.: "Publicado em Grupo X").

**Causa:** Em `/groups/joins/`, o Facebook mostra feed + lista. O seletor atual não diferencia:
- itens da lista de grupos (alvo correto);
- links de grupos dentro de posts (ruídos).

**Sugestão de correção:**
- Restringir busca a containers específicos (ex.: sidebar "Seus grupos", `[role="navigation"]`, etc.).
- Ou filtrar links que estão em blocos de post (`[role="article"]`, `.feed`, etc.) e ignorar.
- Priorizar links com estrutura mais próxima de “card de grupo” (imagem, nome curto, sem “Publicado em”).

---

### 4.2 Sessão: `userName` ausente

**Situação:** `content-fb-session.js` envia `FB_PAGE_SESSION` com `logged`, `fb_dtsg`, `cookie`, mas **sem** `userName`.

**Efeito:** O background usa `userName` para exibir “Conectado como X” no popup/AutoPostFB. Sem isso, pode ficar genérico ou vazio.

**Sugestão:** Em `getSessionFromPage()`, extrair nome de `meta[property="og:title"]` ou scripts/JSON da página e enviar no payload.

---

### 4.3 Aba sempre ativa

**Situação:** `chrome.tabs.create({ url: GROUPS_URL, active: true })` abre a aba em primeiro plano.

**Efeito:** O usuário vê a página do Facebook abrindo e rolando. Não fica “invisível” como em FewFeed.

**Sugestão:** Usar `active: false` e, se possível, uma janela específica para a extensão.

---

### 4.4 LOAD_GROUPS fire-and-forget

**Situação:** `loadGroups()` não retorna dados via `sendResponse`. O CRM depende de:
- mensagem `CRM_EXT_GROUPS_LOADED` enviada pelo background às abas do CRM, ou
- polling em `chrome.storage.local`.

**Efeito:** Mais complexo, mas funcional se o content-crm estiver rodando no localhost.

---

## 5. Pontos Positivos

- Interceptação XHR/Fetch para capturar grupos via GraphQL.
- Vários tipos de extração: DOM + JSON inline + intercept.
- Polling no storage como fallback.
- Fluxo de post via GraphQL com `fb_dtsg`.
- Invalidação de sessão quando há erro de dtsg.
- Content scripts configurados em www, web, m e mbasic do Facebook.

---

## 6. Recomendações de Prioridade

| Prioridade | Item | Ação |
|------------|------|------|
| **Alta** | Extração de grupos | Ajustar `extractGroupsFromDOM()` para ignorar links de posts e priorizar lista de grupos |
| **Média** | Sessão | Adicionar `userName` em `getSessionFromPage()` |
| **Baixa** | UX | Abrir aba em segundo plano (`active: false`) |

---

## 7. Arquivos Críticos para Auto Post

| Arquivo | Função principal |
|---------|-----------------|
| `extension/scripts/content-fb-session.js` | Extração, scroll, intercept, sessão |
| `extension/background.js` | Orquestração, post GraphQL |
| `extension/scripts/content-crm.js` | Bridge CRM ↔ extensão |
| `components/AutoPostFB.tsx` | UI Auto Post modo extensão |

---

## 8. Dependências

- React 19, Zustand, Supabase, Tailwind
- Extensão: manifest v3, host permissions para Facebook e WhatsApp Web
- `postMethod === 'extension'` para usar fluxo de extensão no Auto Post
