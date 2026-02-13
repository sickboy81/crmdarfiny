(function () {
  'use strict';
  console.log('[CRM-FB-CS] Carregado (v2.6.0 - Robust Selectors)');

  var capturedGroups = {};
  var interceptActive = false;

  function hasCUserCookie() {
    return /(?:^|;\s*)c_user=(\d+)/.test(document.cookie);
  }

  function getSessionFromPage() {
    var logged = false;
    var fb_dtsg = '';
    var cookie = document.cookie;

    if (hasCUserCookie()) {
      logged = true;
    }

    var html = document.documentElement.innerHTML || '';
    var dtsgMatch = html.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/) ||
      html.match(/name="fb_dtsg" value="([^"]+)"/) ||
      html.match(/"dtsg":\{"token":"([^"]+)"/) ||
      html.match(/\["DTSGInitData",\[\],\{"token":"([^"]+)"/);
    if (dtsgMatch) {
      fb_dtsg = dtsgMatch[1];
    }

    return { logged: logged, fb_dtsg: fb_dtsg, cookie: cookie };
  }

  function sendToBackground(session) {
    chrome.runtime.sendMessage({
      from: 'content-fb-session',
      type: 'FB_PAGE_SESSION',
      logged: session.logged,
      fb_dtsg: session.fb_dtsg,
      cookie: session.cookie
    });
  }

  // --- EXTRAÇÃO DE GRUPOS ---

  function findGroupsInObject(obj, found, depth) {
    if (!obj || typeof obj !== 'object') return;
    if (depth > 20) return; // Prevent infinite recursion
    depth = depth || 0;

    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        findGroupsInObject(obj[i], found, depth + 1);
      }
      return;
    }

    // Match by __typename
    if (obj.__typename === 'Group' && obj.id && obj.name) {
      found[obj.id] = obj.name;
    }

    // Match by id + name heuristic
    if (obj.id && obj.name && typeof obj.name === 'string') {
      if (obj.group_id || (obj.url && obj.url.includes('/groups/'))) {
        found[obj.id] = obj.name;
      }
    }

    // Nested group object
    if (obj.group && obj.group.id && obj.group.name) {
      found[obj.group.id] = obj.group.name;
    }

    // node pattern (common in GraphQL responses)
    if (obj.node && obj.node.id && obj.node.name && obj.node.__typename === 'Group') {
      found[obj.node.id] = obj.node.name;
    }

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        findGroupsInObject(obj[key], found, depth + 1);
      }
    }
  }

  function extractGroupsFromJSON(text) {
    var found = {};

    // Try multiple JSON blocks (Facebook often sends concatenated JSON)
    var blocks = text.split('\n');
    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b].trim();
      if (!block || block.length < 20) continue;

      try {
        if (block.startsWith('for (;;);')) {
          block = block.substring(9);
        }
        var data = JSON.parse(block);
        findGroupsInObject(data, found, 0);
      } catch (e) {
        // Ignore parse errors for individual blocks
      }
    }

    // Fallback regex for any remaining
    var re = /"id":"(\d+)","name":"([^"]+)"/g;
    var m;
    while ((m = re.exec(text)) !== null) {
      if (m[1].length > 4 && !found[m[1]]) {
        found[m[1]] = m[2];
      }
    }

    // Another common pattern
    var re2 = /"group_id":"(\d+)"[^}]*"name":"([^"]+)"/g;
    while ((m = re2.exec(text)) !== null) {
      if (!found[m[1]]) {
        found[m[1]] = m[2];
      }
    }

    return found;
  }

  // --- INTERCEPTAÇÃO XHR/FETCH ---

  function setupXHRIntercept() {
    if (interceptActive) return;
    interceptActive = true;

    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._url = url;
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      var xhr = this;
      var url = this._url || '';

      // Intercept ALL graphql/group related requests
      if (url.includes('/api/graphql') || url.includes('groups') || url.includes('graphql')) {
        xhr.addEventListener('load', function () {
          try {
            var text = xhr.responseText || '';
            if (text.length > 100) {
              var found = extractGroupsFromJSON(text);
              var count = 0;
              for (var id in found) {
                if (!capturedGroups[id]) {
                  capturedGroups[id] = found[id];
                  count++;
                }
              }
              if (count > 0) {
                console.log('[CRM-FB] XHR interceptado: +' + count + ' grupos. Total: ' + Object.keys(capturedGroups).length);
              }
            }
          } catch (e) { }
        });
      }

      return originalSend.apply(this, arguments);
    };

    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

      return originalFetch.apply(this, arguments).then(function (response) {
        if (url && (url.includes('/api/graphql') || url.includes('groups') || url.includes('graphql'))) {
          var clone = response.clone();
          clone.text().then(function (text) {
            var found = extractGroupsFromJSON(text);
            var count = 0;
            for (var id in found) {
              if (!capturedGroups[id]) {
                capturedGroups[id] = found[id];
                count++;
              }
            }
            if (count > 0) {
              console.log('[CRM-FB] Fetch interceptado: +' + count + ' grupos. Total: ' + Object.keys(capturedGroups).length);
            }
          }).catch(function () { });
        }
        return response;
      });
    };

    console.log('[CRM-FB] Interceptadores XHR/Fetch instalados');
  }

  // --- EXTRAÇÃO DO DOM (multiple strategies) ---

  function extractGroupsFromDOM() {
    var groups = [];
    var seen = {};

    // Strategy 1: Links with /groups/DIGITS
    var links = document.querySelectorAll('a[href*="/groups/"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var match = href.match(/\/groups\/(\d+)/);
      if (match && match[1]) {
        var id = match[1];
        if (!seen[id]) {
          seen[id] = true;
          // Try to get name from multiple possible positions
          var name = '';

          // Try innerText of the link itself
          name = links[i].textContent.trim();

          // If text is too short, try parent elements
          if (name.length < 3 || name.match(/^\d+$/)) {
            var parent = links[i].closest('[role="listitem"]') || links[i].closest('div');
            if (parent) {
              var spans = parent.querySelectorAll('span');
              for (var s = 0; s < spans.length; s++) {
                var spanText = spans[s].textContent.trim();
                if (spanText.length > 2 && spanText.length < 100 && !spanText.match(/^\d+$/) && !spanText.includes('Membro') && !spanText.includes('membro') && !spanText.includes('post')) {
                  name = spanText;
                  break;
                }
              }
            }
          }

          if (name.length > 2 && name.length < 100 && !name.match(/^\d+$/) && !name.includes('Membro') && !name.includes('membro')) {
            groups.push({ id: id, name: name });
          }
        }
      }
    }

    // Strategy 2: Links with /groups/SLUG (non-numeric)
    var allGroupLinks = document.querySelectorAll('a[href*="/groups/"]');
    for (var j = 0; j < allGroupLinks.length; j++) {
      var href2 = allGroupLinks[j].getAttribute('href') || '';
      var slugMatch = href2.match(/\/groups\/([^/?]+)/);
      if (slugMatch && slugMatch[1] && !slugMatch[1].match(/^\d+$/) && slugMatch[1] !== 'joins' && slugMatch[1] !== 'feed' && slugMatch[1] !== 'discover') {
        // Use slug as ID temporarily
        var slugId = slugMatch[1];
        if (!seen[slugId]) {
          seen[slugId] = true;
          var linkName = allGroupLinks[j].textContent.trim();
          if (linkName.length > 2 && linkName.length < 100 && !linkName.match(/^\d+$/) && !linkName.includes('Membro')) {
            groups.push({ id: slugId, name: linkName });
          }
        }
      }
    }

    console.log('[CRM-FB] DOM extraction found: ' + groups.length + ' groups');
    return groups;
  }

  function extractGroupsFromHTML() {
    var found = {};
    var scripts = document.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var text = scripts[i].textContent || '';
      if (text.includes('Group') || text.includes('groups') || text.includes('group_id')) {
        var extracted = extractGroupsFromJSON(text);
        for (var id in extracted) {
          found[id] = extracted[id];
        }
      }
    }
    return found;
  }

  // --- AUTO-SCROLL ---

  function autoScrollAndCollect(onDone) {
    console.log('[CRM-FB] Iniciando auto-scroll...');
    var lastHeight = document.body.scrollHeight;
    var lastCount = Object.keys(capturedGroups).length;
    var noChangeCount = 0;
    var maxNoChange = 8;
    var tickCount = 0;

    function tick() {
      tickCount++;
      window.scrollTo(0, document.body.scrollHeight);

      setTimeout(function () {
        // Captura DOM a cada tick
        var domGroups = extractGroupsFromDOM();
        for (var i = 0; i < domGroups.length; i++) {
          if (!capturedGroups[domGroups[i].id]) {
            capturedGroups[domGroups[i].id] = domGroups[i].name;
          }
        }

        var newHeight = document.body.scrollHeight;
        var newCount = Object.keys(capturedGroups).length;

        console.log('[CRM-FB] Tick #' + tickCount + ': altura=' + newHeight + ' grupos=' + newCount);

        if (newHeight === lastHeight && newCount === lastCount) {
          noChangeCount++;
        } else {
          noChangeCount = 0;
          lastHeight = newHeight;
          lastCount = newCount;
        }

        if (noChangeCount >= maxNoChange) {
          console.log('[CRM-FB] Auto-scroll finalizado. Total:', newCount);
          onDone();
        } else {
          setTimeout(tick, 1500 + Math.random() * 500);
        }
      }, 1500 + Math.random() * 500);
    }

    tick();
  }

  // --- COLETA FINAL ---

  function collectAllGroups() {
    var allGroups = {};

    // XHR/Fetch interceptados
    for (var id in capturedGroups) {
      allGroups[id] = { id: id, name: capturedGroups[id] };
    }

    // DOM
    var domGroups = extractGroupsFromDOM();
    for (var i = 0; i < domGroups.length; i++) {
      if (!allGroups[domGroups[i].id]) {
        allGroups[domGroups[i].id] = domGroups[i];
      }
    }

    // HTML inline
    var htmlGroups = extractGroupsFromHTML();
    for (var id in htmlGroups) {
      if (!allGroups[id]) {
        allGroups[id] = { id: id, name: htmlGroups[id] };
      }
    }

    var result = [];
    for (var id in allGroups) {
      result.push(allGroups[id]);
    }

    console.log('[CRM-FB] collectAllGroups: ' + result.length + ' total');
    return result;
  }

  // --- MENSAGENS ---

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg.type === 'GET_SESSION') {
      var session = getSessionFromPage();
      sendResponse(session);
      return true;
    }

    if (msg.type === 'CRM_EXT_LOG') {
      console.log('[CRM-FB-REMOTE-LOG]', msg.message);
      return;
    }

    if (msg.type === 'START_EXTRACTION') {
      console.log('[CRM-FB-CS] Recebido START_EXTRACTION - iniciando scroll...');
      sendResponse({ status: 'started' });

      autoScrollAndCollect(function () {
        var groups = collectAllGroups();
        console.log('[CRM-FB] Extração completa:', groups.length, 'grupos.');

        // SALVA DIRETAMENTE NO STORAGE (não depende de mensagem)
        chrome.storage.local.set({
          last_captured_groups: groups,
          groups_captured_at: Date.now()
        }, function () {
          console.log('[CRM-FB] Grupos salvos no chrome.storage.local!');
        });

        // Tenta enviar pro background também (bonus, pode falhar)
        try {
          chrome.runtime.sendMessage({
            from: 'content-fb-session',
            type: 'GROUPS_COLLECTED',
            groups: groups
          });
        } catch (e) {
          console.log('[CRM-FB] Erro ao enviar mensagem (ok, salvou no storage):', e);
        }
      });

      return true;
    }
  });

  // --- INICIALIZAÇÃO ---

  function trySendSession() {
    var session = getSessionFromPage();
    if (session.logged || session.fb_dtsg) {
      sendToBackground(session);
      return true;
    }
    return false;
  }

  function runAfterLoad() {
    setupXHRIntercept();

    if (hasCUserCookie()) {
      trySendSession();
    } else {
      var attempts = 0;
      var interval = setInterval(function () {
        attempts++;
        if (trySendSession() || attempts >= 10) clearInterval(interval);
      }, 1500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(runAfterLoad, 500);
    });
  } else {
    setTimeout(runAfterLoad, 500);
  }
})();
