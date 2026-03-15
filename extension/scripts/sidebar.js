
(function() {
  'use strict';
  
  const LOG_PREFIX = '[Darfiny CRM]';
  let sidebarElement = null;
  let isOpen = false;
  let currentContact = null;
  let injectionRetries = 0;
  let activeTab = 'lead'; // Default tab

  console.log(`${LOG_PREFIX} Loading expanded sidebar script...`);

  function createSidebar() {
    if (document.getElementById('crm-sidebar-root')) return;

    sidebarElement = document.createElement('div');
    sidebarElement.id = 'crm-sidebar-root';
    sidebarElement.className = 'crm-whatsapp-sidebar';
    sidebarElement.innerHTML = `
      <div class="crm-toggle-btn" id="crm-sidebar-toggle" title="Abrir Darfiny CRM">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>
      <div class="crm-sidebar-header">
        <div class="crm-logo">
          <span class="crm-logo-icon">D</span>
          Darfiny CRM
        </div>
        <button id="crm-sidebar-close" style="background:transparent; border:none; color:white; cursor:pointer; padding:5px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="crm-tabs" id="crm-sidebar-tabs" style="display:none;">
        <div class="crm-tab active" data-tab="lead">Lead</div>
        <div class="crm-tab" data-tab="midia">Mídia</div>
        <div class="crm-tab" data-tab="templates">Respostas</div>
        <div class="crm-tab" data-tab="agenda">Agenda</div>
        <div class="crm-tab" data-tab="history">Histórico</div>
      </div>

      <div class="crm-sidebar-content" id="crm-sidebar-content">
        <div class="crm-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p>Selecione uma conversa para ver os detalhes no CRM</p>
          <a href="#" id="crm-manual-refresh" style="margin-top:10px; font-size:12px; color:#4f46e5; text-decoration:underline;">Tentar identificar agora</a>
        </div>
      </div>
      <div id="crm-toast" class="crm-toast">
        <div class="crm-toast-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <span id="crm-toast-msg">Mensagem salva</span>
      </div>
    `;

    document.body.appendChild(sidebarElement);
    
    // Tab switching logic
    sidebarElement.addEventListener('click', (e) => {
      if (e.target.classList.contains('crm-tab')) {
        document.querySelectorAll('.crm-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        activeTab = e.target.getAttribute('data-tab');
        updateSidebarUI();
      }
    });

    document.getElementById('crm-sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('crm-sidebar-close').addEventListener('click', () => {
        isOpen = false;
        sidebarElement.classList.remove('open');
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('crm-toast');
    const msgEl = document.getElementById('crm-toast-msg');
    msgEl.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  function toggleSidebar() {
    isOpen = !isOpen;
    if (isOpen) {
      sidebarElement.classList.add('open');
      document.getElementById('crm-sidebar-toggle').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
      updateSidebarUI();
    } else {
      sidebarElement.classList.remove('open');
      document.getElementById('crm-sidebar-toggle').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
    }
  }

  function updateSidebarUI() {
    const content = document.getElementById('crm-sidebar-content');
    const tabs = document.getElementById('crm-sidebar-tabs');

    if (!currentContact) {
      tabs.style.display = 'none';
      return;
    }
    
    tabs.style.display = 'flex';

    if (activeTab === 'lead') {
      renderLeadTab(content);
    } else if (activeTab === 'midia') {
      renderMidiaTab(content);
    } else if (activeTab === 'templates') {
      renderTemplatesTab(content);
    } else if (activeTab === 'agenda') {
      renderAgendaTab(content);
    } else if (activeTab === 'history') {
      renderHistoryTab(content);
    }
  }

  function renderLeadTab(content) {
    const stages = ['new', 'contact', 'qualified', 'negotiation', 'won'];
    const currentStage = currentContact.stage || 'new';
    const stageIdx = stages.indexOf(currentStage);

    content.innerHTML = `
      <div class="crm-contact-card">
        <img src="${currentContact.avatar || 'https://ui-avatars.com/api/?name='+encodeURIComponent(currentContact.name)}" class="crm-avatar" onerror="this.src='https://ui-avatars.com/api/?name=User'">
        <h3 class="crm-name">${currentContact.name}</h3>
        <p class="crm-phone">${currentContact.phone || 'Conversa Identificada'}</p>
        <div class="crm-badge crm-badge-new">Lead no CRM</div>
      </div>

      <div class="crm-funnel-container">
        <div class="crm-funnel-steps">
          ${stages.map((s, i) => `
            <div class="crm-step-dot ${i <= stageIdx ? (i === stageIdx ? 'active' : 'completed') : ''}" title="${s}"></div>
          `).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; font-weight:bold; text-transform:uppercase;">
          <span>Novo</span>
          <span>Negociação</span>
          <span>Vendido</span>
        </div>
      </div>

      <div class="crm-field">
        <label class="crm-label" style="display:flex; justify-content:space-between; align-items:center;">
          Dados do Lead
          <span id="ai-extract" style="color:#4f46e5; cursor:pointer; font-size:10px; font-weight:bold;">✨ EXTRAIR DA BIO</span>
        </label>
        <div class="crm-input-group" style="margin-top:8px;">
          <input type="text" class="crm-input" id="lead-email" placeholder="E-mail" value="${currentContact.email || ''}">
        </div>
        <div class="crm-input-group">
          <input type="text" class="crm-input" id="lead-company" placeholder="Empresa" value="${currentContact.company || ''}">
        </div>
      </div>

      <div class="crm-field">
        <label class="crm-label">Etapa do Funil</label>
        <select class="crm-select" id="lead-stage">
          <option value="new" ${currentStage === 'new' ? 'selected' : ''}>Novo Lead</option>
          <option value="contact" ${currentStage === 'contact' ? 'selected' : ''}>Em Atendimento</option>
          <option value="qualified" ${currentStage === 'qualified' ? 'selected' : ''}>Interessado</option>
          <option value="negotiation" ${currentStage === 'negotiation' ? 'selected' : ''}>Negociação</option>
          <option value="won" ${currentStage === 'won' ? 'selected' : ''}>Vendido</option>
          <option value="lost" ${currentStage === 'lost' ? 'selected' : ''}>Perdido</option>
        </select>
      </div>

      <div class="crm-field">
        <label class="crm-label">Notas Rápidas</label>
        <textarea class="crm-textarea" rows="3" placeholder="Escreva algo sobre este cliente..."></textarea>
      </div>

      <button class="crm-btn-primary" id="save-to-crm">Salvar Alterações</button>
      
      <a href="http://localhost:5173" target="_blank" class="crm-dashboard-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        Ver Perfil no CRM
      </a>
    `;

    document.getElementById('ai-extract').addEventListener('click', () => {
      showToast('IA analisando perfil...');
      setTimeout(() => {
        document.getElementById('lead-email').value = 'contato@' + currentContact.name.toLowerCase().replace(/\s/g, '') + '.com.br';
        document.getElementById('lead-company').value = currentContact.name + ' Ltda.';
        showToast('Dados extraídos com sucesso!');
      }, 1200);
    });

    document.getElementById('save-to-crm').addEventListener('click', () => {
        const btn = document.getElementById('save-to-crm');
        btn.innerText = 'Salvando...';
        btn.disabled = true;
        
        // Update current contact mock
        currentContact.email = document.getElementById('lead-email').value;
        currentContact.company = document.getElementById('lead-company').value;
        currentContact.stage = document.getElementById('lead-stage').value;

        setTimeout(() => {
            btn.innerText = 'Salvar Alterações';
            btn.disabled = false;
            showToast('Dados atualizados no CRM!');
            updateSidebarUI(); // Refresh to update progress bar
        }, 1000);
    });
  }

  function renderMidiaTab(content) {
    const media = [
      { type: 'pdf', name: 'Catálogo 2026', link: 'https://exemplo.com/catalogo.pdf' },
      { type: 'img', name: 'Tabela de Preços', link: 'https://exemplo.com/precos.png' },
      { type: 'vid', name: 'Demo do Produto', link: 'https://youtube.com/demo' },
      { type: 'doc', name: 'Contrato Padrão', link: 'https://exemplo.com/contrato.doc' }
    ];

    content.innerHTML = `
      <div class="crm-section-title">Arquivos e Mídia</div>
      <div class="crm-media-grid">
        ${media.map(m => `
          <div class="crm-media-card" data-link="${m.link}">
            <div class="crm-media-icon">
              ${m.type === 'pdf' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' : ''}
              ${m.type === 'img' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' : ''}
              ${m.type === 'vid' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' : ''}
              ${m.type === 'doc' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' : ''}
            </div>
            <div class="crm-media-name">${m.name}</div>
          </div>
        `).join('')}
      </div>
      <p style="text-align:center; font-size:11px; color:#94a3b8; margin-top:20px;">
        Clique para enviar o link do arquivo.
      </p>
    `;

    content.querySelectorAll('.crm-media-card').forEach(card => {
      card.addEventListener('click', () => {
        injectTextIntoWhatsApp(card.getAttribute('data-link'));
        showToast('Link do arquivo enviado!');
      });
    });
  }

  function renderTemplatesTab(content) {
    const templates = [
      { id: 1, text: "Olá! Como posso te ajudar hoje?" },
      { id: 2, text: "Aguarde um momento, estou verificando seu cadastro." },
      { id: 3, text: "Aqui está o link para o nosso catálogo: [LINK]" },
      { id: 4, text: "Temos uma promoção especial para você este mês!" },
      { id: 5, text: "Obrigado pelo seu contato! Posso ajudar em algo mais?" }
    ];

    content.innerHTML = `
      <div class="crm-section-title">IA Smart Reply (Beta)</div>
      <button class="crm-btn-primary" id="crm-ai-suggest" style="margin-bottom:15px; background:linear-gradient(45deg, #4f46e5, #818cf8);">
        ✨ Sugerir Resposta com IA
      </button>

      <div class="crm-section-title">Respostas Rápidas</div>
      <div class="crm-template-grid">
        ${templates.map(t => `
          <button class="crm-template-btn" data-text="${t.text}">
            ${t.text.substring(0, 40)}${t.text.length > 40 ? '...' : ''}
          </button>
        `).join('')}
      </div>
    `;

    document.getElementById('crm-ai-suggest').addEventListener('click', () => {
      showToast('IA analisando conversa...');
      setTimeout(() => {
        const aiText = "Com base no histórico, sugiro oferecer o Plano Premium com 20% de desconto.";
        injectTextIntoWhatsApp(aiText);
        showToast('Sugestão enviada!');
      }, 1500);
    });

    content.querySelectorAll('.crm-template-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        injectTextIntoWhatsApp(btn.getAttribute('data-text'));
        showToast('Texto copiado para o WhatsApp!');
      });
    });
  }

  function renderAgendaTab(content) {
    content.innerHTML = `
      <div class="crm-section-title">Agendar Retorno</div>
      <div class="crm-field">
        <label class="crm-label">Lembrete em:</label>
        <div class="crm-agenda-presets">
          <button class="crm-preset-btn agenda-btn" data-time="1h">1h</button>
          <button class="crm-preset-btn agenda-btn" data-time="4h">4h</button>
          <button class="crm-preset-btn agenda-btn" data-time="24h">24h</button>
          <button class="crm-preset-btn agenda-btn" data-time="3d">3d</button>
          <button class="crm-preset-btn agenda-btn" data-time="7d">1s</button>
          <button class="crm-preset-btn agenda-btn" data-time="15d">15d</button>
          <button class="crm-preset-btn agenda-btn" data-time="30d">30d</button>
          <button class="crm-preset-btn agenda-btn" data-time="90d">90d</button>
        </div>
      </div>
      <div class="crm-field" style="margin-top:20px;">
        <label class="crm-label">Data Personalizada</label>
        <input type="datetime-local" class="crm-input" id="crm-custom-date">
      </div>
      <button class="crm-btn-primary" id="crm-create-task">Criar Agendamento</button>
    `;

    content.querySelectorAll('.agenda-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`Lembrete agendado para daqui a ${btn.getAttribute('data-time')}!`);
      });
    });

    document.getElementById('crm-create-task').addEventListener('click', () => {
      const date = document.getElementById('crm-custom-date').value;
      if (!date) {
        showToast('❌ Selecione uma data!');
        return;
      }
      showToast('✅ Tarefa criada no CRM!');
    });
  }

  function renderHistoryTab(content) {
    const history = [
      { date: '10/03/2026', title: 'Venda de Produto A', status: 'won' },
      { date: '05/03/2026', title: 'Orçamento Enviado', status: 'contact' },
      { date: '01/03/2026', title: 'Lead Qualificado', status: 'qualified' }
    ];

    content.innerHTML = `
      <div class="crm-section-title">Últimas Interações</div>
      ${history.map(item => `
        <div class="crm-history-item ${item.status}">
          <div class="crm-history-date">${item.date}</div>
          <div class="crm-history-title">${item.title}</div>
        </div>
      `).join('')}
      <p style="text-align:center; font-size:11px; color:#94a3b8; margin-top:20px;">
        Histórico completo disponível no Dashboard.
      </p>
    `;
  }

  function injectTextIntoWhatsApp(text) {
    const main = document.querySelector('#main');
    if (!main) return;
    
    const input = main.querySelector('div[contenteditable="true"]');
    if (input) {
      input.focus();
      document.execCommand('insertText', false, text);
      
      // Secondary attempt for newer WA versions
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(inputEvent);
    }
  }

  function identifyContact() {
    const LOG_ID = '[identifyContact]';
    
    // 1. Target the main chat area specifically to avoid picking up the sidebar header
    const chatPane = document.querySelector('#main') || 
                     document.querySelector('[role="main"]') || 
                     document.querySelector('div.vK77m'); // Common WA container class
    
    if (!chatPane) {
      console.log(`${LOG_PREFIX} ${LOG_ID} Chat pane not found`);
      return null;
    }

    // 2. Find the header within the chat area
    const header = chatPane.querySelector('header');
    if (!header) {
      console.log(`${LOG_PREFIX} ${LOG_ID} Header not found in chat pane`);
      return null;
    }

    let name = '';
    
    // 3. Robust selectors for Contact Name
    // We prioritize elements with 'title' as they usually contain the full name
    const selectors = [
      'span[title][dir="auto"]', 
      '[role="button"] span[title]',
      'header .copyable-text.selectable-text',
      'span[dir="ltr"]',
      'header [role="button"] span'
    ];

    for (const selector of selectors) {
      const el = header.querySelector(selector);
      if (el) {
        const title = el.getAttribute('title');
        const text = el.innerText?.trim();
        
        const candidate = (title && title !== 'WhatsApp') ? title : text;
        
        if (candidate && candidate.trim() !== '' && candidate !== 'WhatsApp') {
          name = candidate.trim();
          break;
        }
      }
    }
    
    // 4. Fallback: Search any child span with title in the header
    if (!name) {
      const allSpans = header.querySelectorAll('span[title]');
      for (const span of allSpans) {
        const t = span.getAttribute('title');
        if (t && t !== 'WhatsApp' && t.length > 1 && !t.includes(':')) {
           name = t;
           break;
        }
      }
    }

    if (!name) {
      console.log(`${LOG_PREFIX} ${LOG_ID} Contact name not found`);
      return null;
    }

    const avatar = header.querySelector('img')?.src || '';
    
    return { name, avatar, phone: '' };
  }

  function startObservation() {
    console.log(`${LOG_PREFIX} Starting MutationObserver...`);
    const observer = new MutationObserver((mutations) => {
        const contact = identifyContact();
        if (contact && (!currentContact || currentContact.name !== contact.name)) {
            console.log(`${LOG_PREFIX} Detected active chat: ${contact.name}`);
            currentContact = contact;
            requestAnimationFrame(() => updateSidebarUI());
        }
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false
    });

    // Fallback: periodic check every 3 seconds in case observer misses it
    setInterval(() => {
        if (!isOpen) return;
        const contact = identifyContact();
        if (contact && (!currentContact || currentContact.name !== contact.name)) {
            currentContact = contact;
            updateSidebarUI();
        }
    }, 3000);
  }

  function init() {
    if (injectionRetries > 30) {
      console.warn(`${LOG_PREFIX} Injection failed after 30 retries.`);
      return;
    }

    if (document.body && document.querySelector('#app')) {
      createSidebar();
      startObservation();
    } else {
      injectionRetries++;
      setTimeout(init, 2000);
    }
  }

  // Handle manual refresh
  document.addEventListener('click', (e) => {
    if (e.target.id === 'crm-manual-refresh') {
      const contact = identifyContact();
      if (contact) {
        currentContact = contact;
        updateSidebarUI();
      } else {
        alert('Nenhuma conversa ativa detectada no cabeçalho.');
      }
    }
  });

  // Start initialization
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }

})();
