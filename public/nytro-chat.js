/**
 * Nytro Bot — Widget de Chat para Site
 * 
 * Para instalar no site da Nytro (Odoo):
 * 1. Vá no editor do site Odoo
 * 2. Adicione um bloco "HTML/Code"
 * 3. Cole: <script src="https://vercel-nytro-git-main-nytro3.vercel.app/nytro-chat.js"></script>
 * 4. Salve e publique
 * 
 * O widget aparece como balão verde no canto inferior direito.
 */

(function() {
  'use strict';

  // Prevent double-loading
  if (window.__NYTRO_CHAT_LOADED__) return;
  window.__NYTRO_CHAT_LOADED__ = true;

  // Configuration
  const VERCEL_URL = 'https://vercel-nytro-git-main-nytro3.vercel.app';
  const API_ENDPOINT = VERCEL_URL + '/api/chat';
  const PRIMARY_COLOR = '#0F766E';
  const ACCENT_COLOR = '#10B981';
  const SESSION_ID = 'web-' + Math.random().toString(36).slice(2, 12);

  // State
  let isOpen = false;
  let messages = [{ role: 'assistant', content: 'Olá! Sou o assistente virtual da Nytro. Como posso te ajudar hoje?' }];
  let isLoading = false;

  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .nytro-chat-bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${ACCENT_COLOR});
      box-shadow: 0 4px 20px rgba(15, 118, 110, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .nytro-chat-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(15, 118, 110, 0.5);
    }
    .nytro-chat-bubble svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .nytro-chat-bubble .nytro-pulse {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #34d399;
      border: 2px solid white;
      animation: nytro-pulse-anim 2s infinite;
    }
    @keyframes nytro-pulse-anim {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.15); }
    }

    .nytro-chat-window {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 48px);
      height: 560px;
      max-height: calc(100vh - 140px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .nytro-chat-window.open {
      display: flex;
      animation: nytro-slide-up 0.3s ease;
    }
    @keyframes nytro-slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .nytro-chat-header {
      background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${ACCENT_COLOR});
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nytro-chat-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      flex-shrink: 0;
    }
    .nytro-chat-header-info {
      flex: 1;
    }
    .nytro-chat-header-title {
      font-size: 15px;
      font-weight: 600;
      margin: 0;
    }
    .nytro-chat-header-status {
      font-size: 12px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nytro-chat-header-status::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
      display: inline-block;
    }
    .nytro-chat-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .nytro-chat-close:hover { opacity: 1; }
    .nytro-chat-close svg { width: 20px; height: 20px; fill: white; }

    .nytro-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8fafc;
      scroll-behavior: smooth;
    }
    .nytro-chat-messages::-webkit-scrollbar { width: 6px; }
    .nytro-chat-messages::-webkit-scrollbar-track { background: transparent; }
    .nytro-chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

    .nytro-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 10px;
      word-wrap: break-word;
    }
    .nytro-msg-bot {
      background: white;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .nytro-msg-user {
      background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${ACCENT_COLOR});
      color: white;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
      margin-left: auto;
    }
    .nytro-msg-lead {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 10px;
      text-align: center;
    }

    .nytro-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }
    .nytro-typing span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      animation: nytro-typing-anim 1.4s infinite;
    }
    .nytro-typing span:nth-child(2) { animation-delay: 0.2s; }
    .nytro-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes nytro-typing-anim {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .nytro-chat-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e2e8f0;
      background: white;
      display: flex;
      gap: 8px;
    }
    .nytro-chat-input {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    .nytro-chat-input:focus {
      border-color: ${ACCENT_COLOR};
    }
    .nytro-chat-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${ACCENT_COLOR});
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s;
    }
    .nytro-chat-send:hover { transform: scale(1.05); }
    .nytro-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
    .nytro-chat-send svg { width: 18px; height: 18px; fill: white; }

    .nytro-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 16px 8px;
    }
    .nytro-suggestion {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 6px 12px;
      font-size: 12px;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .nytro-suggestion:hover {
      background: #f0fdf4;
      border-color: ${ACCENT_COLOR};
      color: ${PRIMARY_COLOR};
    }

    @media (max-width: 480px) {
      .nytro-chat-window {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        max-height: 100%;
        border-radius: 0;
      }
      .nytro-chat-bubble {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create bubble button
  const bubble = document.createElement('div');
  bubble.className = 'nytro-chat-bubble';
  bubble.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    <div class="nytro-pulse"></div>
  `;
  bubble.onclick = toggleChat;
  document.body.appendChild(bubble);

  // Create chat window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'nytro-chat-window';
  chatWindow.innerHTML = `
    <div class="nytro-chat-header">
      <div class="nytro-chat-header-avatar">N</div>
      <div class="nytro-chat-header-info">
        <div class="nytro-chat-header-title">Assistente Nytro</div>
        <div class="nytro-chat-header-status">Online agora</div>
      </div>
      <button class="nytro-chat-close" onclick="window.__NYTRO_CLOSE__()">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
    <div class="nytro-chat-messages" id="nytro-messages"></div>
    <div class="nytro-suggestions" id="nytro-suggestions">
      <button class="nytro-suggestion" onclick="window.__NYTRO_SUGGEST__('Quero saber sobre o Nytro Fiscal Cloud')">Nytro Fiscal Cloud</button>
      <button class="nytro-suggestion" onclick="window.__NYTRO_SUGGEST__('Quais soluções a Nytro oferece?')">Soluções Nytro</button>
      <button class="nytro-suggestion" onclick="window.__NYTRO_SUGGEST__('Como funciona o ERP Odoo?')">ERP Odoo</button>
    </div>
    <div class="nytro-chat-input-area">
      <input type="text" class="nytro-chat-input" id="nytro-input" placeholder="Digite sua mensagem..." onkeydown="if(event.key==='Enter')window.__NYTRO_SEND__()" />
      <button class="nytro-chat-send" onclick="window.__NYTRO_SEND__()">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(chatWindow);

  // Functions
  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      chatWindow.classList.add('open');
      setTimeout(() => document.getElementById('nytro-input').focus(), 300);
      renderMessages();
    } else {
      chatWindow.classList.remove('open');
    }
  }

  window.__NYTRO_CLOSE__ = function() {
    isOpen = false;
    chatWindow.classList.remove('open');
  };

  window.__NYTRO_SEND__ = function() {
    const input = document.getElementById('nytro-input');
    const text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    sendMessage(text);
  };

  window.__NYTRO_SUGGEST__ = function(text) {
    if (isLoading) return;
    sendMessage(text);
  };

  function renderMessages() {
    const container = document.getElementById('nytro-messages');
    container.innerHTML = '';
    messages.forEach(function(msg) {
      const div = document.createElement('div');
      div.className = 'nytro-msg ' + (msg.role === 'user' ? 'nytro-msg-user' : 'nytro-msg-bot');
      div.textContent = msg.content;
      container.appendChild(div);
    });
    if (isLoading) {
      const typing = document.createElement('div');
      typing.className = 'nytro-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      container.appendChild(typing);
    }
    container.scrollTop = container.scrollHeight;

    // Hide suggestions after first user message
    const suggestions = document.getElementById('nytro-suggestions');
    if (messages.filter(function(m) { return m.role === 'user'; }).length > 0) {
      suggestions.style.display = 'none';
    }
  }

  async function sendMessage(text) {
    messages.push({ role: 'user', content: text });
    isLoading = true;
    renderMessages();

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: SESSION_ID,
          message: text,
          history: messages.slice(0, -1).map(function(m) {
            return { role: m.role, content: m.content };
          }),
        }),
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();

      messages.push({ role: 'assistant', content: data.reply });

      if (data.leadCreated) {
        messages.push({ role: 'assistant', content: '✅ Seu contato foi registrado! Um especialista da Nytro entrará em contato em até 1 dia útil.' });
      }
    } catch (e) {
      messages.push({
        role: 'assistant',
        content: 'Desculpe, tive um problema técnico. Pode tentar novamente?',
      });
    } finally {
      isLoading = false;
      renderMessages();
    }
  }

  // Initial render
  setTimeout(function() {
    if (isOpen) renderMessages();
  }, 100);

})();
