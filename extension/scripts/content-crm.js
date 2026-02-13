(function () {
  'use strict';
  console.log('%c[CRM-FB-EXT] Content script v3.1.0 (Storage-First)', 'background:#000;color:#0f0;padding:4px;font-weight:bold');

  function postToPage(payload) {
    window.postMessage({ source: 'crm-fb-extension', ...payload }, '*');
  }

  // Escuta mensagens da PÁGINA (CRM app)
  window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data || event.data.source === 'crm-fb-extension') return;
    var d = event.data;

    if (d.type === 'CRM_EXT_CHECK_SESSION') {
      chrome.runtime.sendMessage({ type: 'CHECK_SESSION' }, function (res) {
        postToPage({ type: 'CRM_EXT_SESSION', logged: res && res.logged, userName: res && res.userName });
      });
      return;
    }

    if (d.type === 'CRM_EXT_LOAD_GROUPS') {
      console.log('[CRM-FB-EXT] Solicitando carregamento de grupos...');

      // Pede pro background abrir o FB e extrair
      chrome.runtime.sendMessage({ type: 'LOAD_GROUPS' });

      // Inicia polling do storage (a fonte da verdade)
      var pollCount = 0;
      var startTime = Date.now();
      var pollInterval = setInterval(function () {
        pollCount++;
        chrome.storage.local.get(['last_captured_groups', 'groups_captured_at'], function (data) {
          var groups = data.last_captured_groups;
          var capturedAt = data.groups_captured_at || 0;

          // Só aceita grupos capturados DEPOIS que pedimos
          if (groups && groups.length > 0 && capturedAt > startTime) {
            console.log('%c[CRM-FB-EXT] GRUPOS ENCONTRADOS NO STORAGE! Total: ' + groups.length,
              'background:green;color:white;font-size:14px;padding:4px');

            clearInterval(pollInterval);
            postToPage({ type: 'CRM_EXT_GROUPS_LOADED', groups: groups });

            // Limpa para não reutilizar
            chrome.storage.local.remove(['last_captured_groups', 'groups_captured_at']);
          }
        });

        // Timeout de 3 minutos
        if (pollCount > 90) {
          clearInterval(pollInterval);
          console.log('[CRM-FB-EXT] Timeout (3 min). Nenhum grupo encontrado.');
          postToPage({ type: 'CRM_EXT_GROUPS_LOADED', groups: [], error: 'Timeout - tente novamente' });
        }
      }, 2000); // A cada 2 segundos

      return;
    }

    if (d.type === 'CRM_EXT_POST_ALL') {
      chrome.runtime.sendMessage({ type: 'POST_ALL', payload: d.payload }, function () { });
      return;
    }

    if (d.type === 'CRM_FB_EXTENSION_DRAFT' && d.payload) {
      chrome.runtime.sendMessage({ type: 'SAVE_DRAFT', draft: d.payload });
    }
  });

  // Escuta mensagens do BACKGROUND
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.from !== 'background') return;

    if (msg.type === 'CRM_EXT_LOG') {
      console.log('[CRM-FB-REMOTE]', msg.message);
      return;
    }

    if (msg.type === 'CRM_EXT_GROUPS_LOADED') {
      console.log('[CRM-FB-EXT] Grupos recebidos via mensagem direta:', (msg.groups || []).length);
      postToPage({ type: 'CRM_EXT_GROUPS_LOADED', groups: msg.groups || [], error: msg.error });
      return;
    }

    if (msg.type === 'CRM_EXT_PROGRESS' || msg.type === 'CRM_EXT_DONE') {
      postToPage(msg);
    }
  });

  // Auto-check session
  chrome.runtime.sendMessage({ type: 'CHECK_SESSION' }, function (res) {
    postToPage({ type: 'CRM_EXT_SESSION', logged: res && res.logged, userName: res && res.userName });
  });
})();
