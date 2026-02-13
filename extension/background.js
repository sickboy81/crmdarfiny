const FB_ORIGIN = 'https://www.facebook.com';
const STORAGE_KEYS = { fb_dtsg: 'crm_fb_dtsg', userName: 'crm_fb_user_name' };

function getStoredDtsg() {
  return new Promise((resolve) => {
    chrome.storage.session.get([STORAGE_KEYS.fb_dtsg], (data) => resolve(data[STORAGE_KEYS.fb_dtsg] || null));
  });
}

function setStoredDtsg(value) {
  return new Promise((resolve) => {
    chrome.storage.session.set({ [STORAGE_KEYS.fb_dtsg]: value }, resolve);
  });
}

function setStoredUserName(value) {
  return new Promise((resolve) => {
    chrome.storage.session.set({ [STORAGE_KEYS.userName]: value }, resolve);
  });
}

const FACEBOOK_URL_PATTERNS = ['*://www.facebook.com/*', '*://web.facebook.com/*', '*://m.facebook.com/*', '*://mbasic.facebook.com/*'];
const CRM_URL_PATTERNS = [
  'http://localhost:3000/*',
  'http://localhost:3001/*',
  'http://localhost:3002/*',
  'http://localhost:5173/*',
  'http://127.0.0.1:3000/*',
  'http://127.0.0.1:3001/*',
  'http://127.0.0.1:3002/*',
  'http://127.0.0.1:5173/*'
];

async function checkSession() {
  const dtsg = await getStoredDtsg();
  if (dtsg) {
    return { logged: true, userName: 'Facebook User' };
  }

  return new Promise((resolve) => {
    chrome.tabs.query({ url: FACEBOOK_URL_PATTERNS }, async (tabs) => {
      if (tabs && tabs.length > 0) {
        for (let i = 0; i < tabs.length; i++) {
          try {
            const res = await chrome.tabs.sendMessage(tabs[i].id, { type: 'GET_SESSION' });
            if (res && (res.logged || res.fb_dtsg)) {
              if (res.fb_dtsg) await setStoredDtsg(res.fb_dtsg);
              if (res.userName) await setStoredUserName(res.userName);
              resolve({ logged: true, userName: res.userName || 'Facebook' });
              return;
            }
          } catch (_) { }
        }
        resolve({ logged: false, userName: null });
        return;
      }
      resolve({ logged: false, userName: null });
    });
  });
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(false);
    }, timeoutMs);

    const onUpdated = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(true);
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

function sendToCRMTabs(payload) {
  console.log('[CRM-FB] Tentando enviar dados para abas do CRM...');
  chrome.tabs.query({}, (tabs) => {
    let sentCount = 0;
    (tabs || []).forEach((t) => {
      const url = t.url || '';
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        chrome.tabs.sendMessage(t.id, { from: 'background', ...payload }).catch(() => { });
        sentCount++;
      }
    });
    console.log('[CRM-FB] Dados enviados para ' + sentCount + ' abas locais.');
  });
}

function logToCRM(msg) {
  sendToCRMTabs({ type: 'CRM_EXT_LOG', message: msg });
}

// === LOAD GROUPS (Main Logic) ===

async function loadGroups() {
  console.log('[CRM-FB] loadGroups iniciado (v2.5.0 - GraphQL/XHR Strategy)');
  const GROUPS_URL = 'https://www.facebook.com/groups/joins/';

  // MODO VISUAL APENAS (mas com interceptação XHR robusta no content script)
  logToCRM('Iniciando captura de grupos (Estratégia GraphQL)...');

  try {
    const tab = await chrome.tabs.create({ url: GROUPS_URL, active: true }); // Active tab for scroll to work
    const tabId = tab.id;

    const loaded = await waitForTabComplete(tabId, 30000);
    if (!loaded) {
      sendToCRMTabs({ type: 'CRM_EXT_GROUPS_LOADED', groups: [], error: 'Timeout ao carregar Facebook.' });
      return;
    }

    await new Promise(r => setTimeout(r, 2000));

    // Inicia extração (scrolling via content script)
    chrome.tabs.sendMessage(tabId, { type: 'START_EXTRACTION' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[CRM-FB] Erro START_EXTRACTION:', chrome.runtime.lastError);
        // Não falha aqui, pois pode ter funcionado e a resposta ter se perdido
        // Mas loga para debug
      }
      logToCRM('Rolando página para disparar APIs...');
    });

    // Listener para resultado do content script
    const listener = (msg) => {
      if (msg.from === 'content-fb-session' && msg.type === 'GROUPS_COLLECTED') {
        chrome.runtime.onMessage.removeListener(listener);
        const groups = msg.groups || [];

        // Persistir no storage como fallback
        chrome.storage.local.set({ last_captured_groups: groups }, () => {
          console.log('[CRM-FB] Grupos persistidos no storage local:', groups.length);
        });

        sendToCRMTabs({ type: 'CRM_EXT_GROUPS_LOADED', groups: groups });
        setTimeout(() => chrome.tabs.remove(tabId).catch(() => { }), 3000);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
    }, 120000); // 2 min timeout

  } catch (err) {
    console.error('[CRM-FB] Erro loadGroups:', err);
    sendToCRMTabs({ type: 'CRM_EXT_GROUPS_LOADED', groups: [], error: 'Erro: ' + err.message });
  }
}



async function postToGroup(groupId, message, fb_dtsg) {
  try {
    const url = FB_ORIGIN + '/api/graphql/';
    const body = new URLSearchParams();
    body.append('fb_dtsg', fb_dtsg);
    body.append('fb_api_caller_class', 'RelayModern');
    body.append('fb_api_req_friendly_name', 'CometGroupDiscussionComposerMutation');
    body.append('variables', JSON.stringify({
      input: {
        group_id: groupId,
        message: { text: message },
        composer_session_id: 'ext-' + Date.now(),
        source: 'WWW',
      },
    }));
    body.append('doc_id', '7431670587298892');

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FB-Friendly-Name': 'CometGroupDiscussionComposerMutation',
        'Origin': FB_ORIGIN,
        'Referer': FB_ORIGIN + '/groups/' + groupId + '/',
      },
      body: body.toString(),
    });

    // Tenta parse JSON
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { }

    if (!data) return { success: false, error: 'Resposta inválida' };
    if (data.errors) return { success: false, error: data.errors[0]?.message || 'Erro desconhecido' };

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function postAll(payload, sendProgress) {
  const { groups, message, delaySeconds = 3 } = payload;
  let fb_dtsg = await getStoredDtsg();
  const total = groups.length;
  const results = [];

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!fb_dtsg) {
      const session = await checkSession();
      fb_dtsg = await getStoredDtsg();
      if (!session.logged || !fb_dtsg) {
        // Erro fatal de sessão
        const err = 'Sessão perdida';
        if (sendProgress) sendProgress({ type: 'CRM_EXT_PROGRESS', current: i + 1, total, groupId: g.id, groupName: g.name, success: false, error: err });
        results.push({ id: g.id, name: g.name, success: false, error: err });
        continue;
      }
    }

    const r = await postToGroup(g.id, message, fb_dtsg);
    results.push({ id: g.id, name: g.name, success: r.success, error: r.error });
    if (sendProgress) sendProgress({ type: 'CRM_EXT_PROGRESS', current: i + 1, total, groupId: g.id, groupName: g.name, success: r.success, error: r.error });

    // Se erro de dtsg, limpa para forçar refresh
    if (!r.success && (r.error || '').includes('dtsg')) {
      await setStoredDtsg(null);
      fb_dtsg = null;
    }

    if (i < groups.length - 1 && delaySeconds > 0) {
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }
  return results;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FB_PAGE_SESSION') {
    if (message.fb_dtsg) setStoredDtsg(message.fb_dtsg);
    if (message.userName) setStoredUserName(message.userName);
    sendResponse({});
    return true;
  }
  if (message.type === 'CHECK_SESSION') {
    checkSession().then(sendResponse);
    return true;
  }
  // FIRE AND FORGET
  if (message.type === 'LOAD_GROUPS') {
    sendResponse({ status: 'started' });
    loadGroups(); // Async call, runs in background
    return true;
  }
  if (message.type === 'POST_ALL') {
    const tabId = sender.tab && sender.tab.id;
    const sendProgress = (payload) => {
      if (tabId) chrome.tabs.sendMessage(tabId, { from: 'background', ...payload }).catch(() => { });
    };
    postAll(message.payload, sendProgress).then((results) => {
      sendProgress({ type: 'CRM_EXT_DONE', results });
      sendResponse({});
    });
    return true;
  }
  // Drafts
  if (message.type === 'SAVE_DRAFT') {
    chrome.storage.local.set({ crm_fb_extension_draft: message.draft }, () => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'GET_DRAFT') {
    chrome.storage.local.get(['crm_fb_extension_draft'], (data) => sendResponse({ draft: data.crm_fb_extension_draft ?? null }));
    return true;
  }
  if (message.type === 'CLEAR_DRAFT') {
    chrome.storage.local.remove(['crm_fb_extension_draft'], () => sendResponse({ ok: true }));
    return true;
  }
});
