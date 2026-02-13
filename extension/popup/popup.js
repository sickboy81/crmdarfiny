
document.addEventListener('DOMContentLoaded', function () {

  // --- Tab Switching Logic ---
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // --- Facebook Auto Post Logic ---
  function checkSession() {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: 'CHECK_SESSION' }, function (res) {
        resolve(res || { logged: false, userName: null });
      });
    });
  }

  function renderFb(session) {
    const content = document.getElementById('fb-content');
    const logged = session && session.logged;
    const name = session && session.userName;

    content.innerHTML = `
      <div class="status ${logged ? 'ok' : 'err'}" style="margin-bottom:15px;">
        ${logged ? `Conectado como <strong>${name || 'Facebook User'}</strong>` : 'Não logado no Facebook.'}
      </div>
      
      <button class="btn-fb" id="btn-load-groups" style="background:#1877f2;color:white;padding:12px;font-size:14px;border:none;border-radius:6px;width:100%;cursor:pointer;">
        🔍 Extrair Grupos (Backup Manual)
      </button>
      
      <div id="fb-status" class="status" style="display:none; margin-top:15px; padding:10px; background:#f0f2f5; border-radius:6px;"></div>

      <div id="result-area" style="display:none; margin-top:15px;">
        <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:5px;">Copie abaixo e cole no CRM:</label>
        <textarea id="json-output" style="width:100%; height:120px; font-family:monospace; font-size:11px; padding:8px; border:1px solid #ccc; border-radius:4px; resize:none;" readonly></textarea>
        <button id="btn-copy-manual" style="margin-top:5px; background:#42b72a; color:white; padding:8px; border:none; border-radius:4px; width:100%; cursor:pointer;">
            📋 Copiar JSON
        </button>
      </div>
    `;

    document.getElementById('btn-load-groups').addEventListener('click', () => {
      const status = document.getElementById('fb-status');
      const resultArea = document.getElementById('result-area');

      status.style.display = 'block';
      status.textContent = 'Carregando Facebook... Aguarde a página completa.';
      resultArea.style.display = 'none';

      chrome.tabs.create({ url: 'https://www.facebook.com/groups/joins/?ref=bookmarks', active: true }, (tab) => {

        // Loop de tentativa de conexão
        let attempts = 0;
        const tryConnect = () => {
          attempts++;
          status.textContent = `Tentando conectar com a página... (${attempts}/10)`;

          chrome.tabs.sendMessage(tab.id, { type: 'START_EXTRACTION' }, (res) => {
            if (chrome.runtime.lastError) {
              if (attempts < 10) {
                setTimeout(tryConnect, 2000); // Tenta a cada 2s
              } else {
                status.textContent = 'Erro: A extensão não conseguiu carregar na página do Facebook. Tente recarregar a extensão.';
                status.className = 'status err';
              }
            } else {
              status.textContent = 'Conectado! Rolando página para pegar grupos...';
            }
          });
        };

        // Espera carregamento real da aba
        chrome.tabs.onUpdated.addListener(function onTabUpdated(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            status.textContent = 'Página carregada. Iniciando em 3s...';
            setTimeout(tryConnect, 3000); // Começa a tentar conectar
          }
        });

        // Escuta resposta (JSON)
        const listener = (msg) => {
          if (msg.from === 'content-fb-session' && msg.type === 'GROUPS_COLLECTED') {
            chrome.runtime.onMessage.removeListener(listener);
            const groups = msg.groups || [];
            const json = JSON.stringify(groups);

            // Exibe resultado
            status.style.display = 'none';
            resultArea.style.display = 'block';

            const textarea = document.getElementById('json-output');
            if (textarea) {
              textarea.value = json;
              textarea.select();
            }

            // Fecha a aba do FB para não atrapalhar
            setTimeout(() => chrome.tabs.remove(tab.id), 2000);
          }
        };
        chrome.runtime.onMessage.addListener(listener);
      });
    });

    document.getElementById('btn-copy-manual').addEventListener('click', () => {
      const textarea = document.getElementById('json-output');
      textarea.select();
      document.execCommand('copy');
      const btn = document.getElementById('btn-copy-manual');
      btn.textContent = 'Copiado! Agora vá no CRM.';
      btn.style.background = '#3578E5';
      setTimeout(() => window.close(), 3000);
    });
  }

  checkSession().then(renderFb);

  // --- WhatsApp Extractor Logic ---
  const btnExtract = document.getElementById('btn-extract');
  const btnDownload = document.getElementById('btn-download-csv');
  const waStatus = document.getElementById('wa-status');

  if (btnExtract) {
    btnExtract.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url.includes('web.whatsapp.com')) {
        waStatus.style.display = 'block';
        waStatus.textContent = 'Abra o WhatsApp Web primeiro.';
        return;
      }
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_CURRENT_CONTACT' });
        if (response && response.success) {
          waStatus.style.display = 'block';
          waStatus.textContent = `Extraído: ${response.data.name}`;
        } else {
          throw new Error(response?.error || 'Falha ao extrair');
        }
      } catch (err) {
        waStatus.style.display = 'block';
        waStatus.textContent = 'Erro: Abra uma conversa.';
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', async () => {
      waStatus.style.display = 'block';
      waStatus.textContent = 'Funcionalidade em breve...';
    });
  }
});
