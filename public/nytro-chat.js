/**
 * Nytro Bot — Widget de Chat para Site
 * Design inspirado no WhatsApp com a logo da Nytro
 */

(function() {
  'use strict';
  if (window.__NYTRO_CHAT_LOADED__) return;
  window.__NYTRO_CHAT_LOADED__ = true;

  const VERCEL_URL = 'https://vercel-nytro-git-main-nytro3.vercel.app';
  const API_ENDPOINT = VERCEL_URL + '/api/chat';
  const LOGO_URL = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAXcElEQVR4nO3de3gdZZ0H8O9vzjlpA0mLZSnKRZ4CFSHYNOfMSUIoSsAbInJ5NMpN0VXwgq4rKi7iouttXei6wiKwuC48Cmhku8ICykUCuzUmOTMnROgKy9LiculytWxD0+acmd/+kVO20lvOnJl5Z3K+n+fhv8z7fhv6fjtnzsw7ABERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERFR+ojpALRjruu+X1VvAJAxnaVBnoicWSgUfmo6CG2PBZBAc2jxb8USSCgWQMLMwcW/FUsggVgACTKHF/9WLIGEYQEkRBMs/q1YAgnCAkiAJlr8W7EEEoIFYFgTLv6tWAIJwAIwqIkX/1YsAcNYAIZw8b+CJWAQC8AALv7tsAQMYQHEjIt/p1gCBrAAYsTFv1ssgZixAGLCxT9rLIEYsQBiwMVfN5ZATFgAEePiD4wlEAMWQIS4+BvGEogYCyAiXPyhYQlEiAUQAS7+0LEEIsICCBkXf2RYAhFgAYSIiz9yLIGQsQBCwsUfG5ZAiFgAIeDijx1LICQsgAZx8RvDEggBC6ABXPzGsQQaNKcKwHGcPTKZzOJKpbKniET9Z+sRkWvAxW+ap6rnARiNchJV1Vwu97Lnec/atr0pyrnilNoCKJfL+/m+fyyAXgDLAbwRwD5GQ1GzeA7AwwAeADBiWdZ9+Xz+acOZAklVAYyOji7JZDJnATgNM4ueKCkeALDK87wf9/T0rDMdZrZSUQCu6x6nqhcAOAEpyUxNSwH8QkRWFgqFe02H2Z1EL6ZyuWyr6mWq+hbTWYjqJSL3i8jn8/m8YzrLziSyAIaGhua3tbV9W0Q+A8AynYeoAb6qXj45OfkX/f39m02HebXEFYDruoeq6ioAbzKdhShED4rIaYVC4b9MB9lWogqgXC4f5fv+vwLY23QWogi8YFnWSfl8/jemg2yVmAKoLf67ALSZzkIUoUnLst6elBJIRAGMj48v9TxvBMAi01mIYvBiJpPp7erqetR0EOMX2IaHh1s9z1sFLn5qHos8z1s1PDzc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V1V/1dLScnJnZ+fLUYwfJRYAbWd4eHhRLpcbFJHjI57KB1ACcK+qjmQyGaeRr83K5fJBnucVReQoAMcDWIbo/47fvHDhwrOWLl0aya3IUWMB0A4NDg5mlixZclkDL7wI6gUReURVHxeRJ1X1ORF5CcCU7/tVADnLslp9399LRBar6gEisgQzn+cXxpz1skKhcGESrm0ExQKgXSqVSh8UkWsAzDedJUE2i8gnCoXCdaaDNIoFQLs1NjZWtCzrXwDsbzpLAqwVkQHTL/QIC+8DoN3q7u4u+b5vA7jddBbDbqxWq11zZfEDPAOgOjmO8z4A3wPQTG8Rfk5Ezi8UCoOmg4SNZwBUF9u2fwbgcABXA0jcBhchU1X9p+np6TfOxcUP8AyAGlAul4/yff8fABxpOksERkXks4VCYcR0kCixAKghta8LB0TkQgCdpvOE4Heq+pfFYvFm00HiwAKg0JRKpRMAfElE3mw6SwDjIvKdfD7/szR/r18vFgCFrvbR4EIA7waQMZ1nFyoAblHVK4vF4n2mw5jAAqDITExMLJ6enj7Vsqz3quqxSMgu1KrqALixpaXlhs7OzmdN5zGJBUCxGB0d3duyrJNrZfBWALkYp98sIqsB3F6tVm/p6elZF+PcicYCoNitXr26vbW19WhV7VPVooh0Adg3xCmeEJFxAKO+7w9PTk6OzOXtyxvBAqBEGB0d3VtEDstkMger6oEisp+qLlLVRQD2EJF5mPkIURWRzar6MmZ2NX5ORJ7yff8JzNym+4ht2y+Z/LMQERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERUdr9H6oZ2+ARvN4/AAAAAElFTkSuQmCC';
  const PRIMARY_COLOR = '#0F766E';
  const ACCENT_COLOR = '#10B981';
  const WHATSAPP_GREEN = '#25D366';
  const WHATSAPP_BG = '#ECE5DD';
  const WHATSAPP_OUT = '#FFFFFF';
  const WHATSAPP_IN = '#DCF8C6';
  const SESSION_ID = 'web-' + Math.random().toString(36).slice(2, 12);

  let isOpen = false;
  let messages = [{ role: 'assistant', content: 'Olá! Sou o assistente virtual da Nytro. Como posso te ajudar hoje?' }];
  let isLoading = false;

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    #nytro-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${WHATSAPP_GREEN}, ${ACCENT_COLOR});
      box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    #nytro-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(37, 211, 102, 0.5);
    }
    #nytro-bubble svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    #nytro-bubble .nytro-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #25D366;
      border: 2.5px solid white;
      animation: nytro-pulse 2s infinite;
    }
    @keyframes nytro-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    #nytro-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 580px;
      max-height: calc(100vh - 120px);
      background: ${WHATSAPP_BG};
      border-radius: 12px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #nytro-window.open {
      display: flex;
      animation: nytro-slide 0.3s ease;
    }
    @keyframes nytro-slide {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .nytro-header {
      background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${ACCENT_COLOR});
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nytro-header img {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: white;
      object-fit: contain;
      padding: 2px;
    }
    .nytro-header-info {
      flex: 1;
      color: white;
    }
    .nytro-header-name {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .nytro-header-status {
      font-size: 12px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nytro-header-status::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34d399;
    }
    .nytro-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
    }
    .nytro-close:hover { opacity: 1; }
    .nytro-close svg { width: 22px; height: 22px; fill: white; }

    .nytro-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: ${WHATSAPP_BG};
      background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="1" fill="%23ddd"/></svg>');
      scroll-behavior: smooth;
    }
    .nytro-body::-webkit-scrollbar { width: 5px; }
    .nytro-body::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }

    .nytro-bubble-msg {
      max-width: 75%;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.45;
      margin-bottom: 8px;
      position: relative;
      box-shadow: 0 1px 1px rgba(0,0,0,0.1);
      word-wrap: break-word;
    }
    .nytro-bubble-bot {
      background: ${WHATSAPP_OUT};
      border-top-left-radius: 0;
      align-self: flex-start;
    }
    .nytro-bubble-user {
      background: ${WHATSAPP_IN};
      border-top-right-radius: 0;
      align-self: flex-end;
      margin-left: auto;
    }
    .nytro-bubble-time {
      font-size: 10px;
      color: #999;
      float: right;
      margin-top: 4px;
      margin-left: 8px;
    }
    .nytro-bubble-lead {
      background: #e7f5ee;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      text-align: center;
    }

    .nytro-typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: ${WHATSAPP_OUT};
      border-radius: 8px;
      border-top-left-radius: 0;
      width: fit-content;
      margin-bottom: 8px;
      box-shadow: 0 1px 1px rgba(0,0,0,0.1);
    }
    .nytro-typing span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
      animation: nytro-typing 1.4s infinite;
    }
    .nytro-typing span:nth-child(2) { animation-delay: 0.2s; }
    .nytro-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes nytro-typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    .nytro-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 12px;
      background: ${WHATSAPP_BG};
    }
    .nytro-suggestion-btn {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 6px 14px;
      font-size: 12px;
      color: ${PRIMARY_COLOR};
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      box-shadow: 0 1px 1px rgba(0,0,0,0.05);
    }
    .nytro-suggestion-btn:hover {
      background: ${WHATSAPP_IN};
      border-color: ${ACCENT_COLOR};
    }

    .nytro-input-bar {
      padding: 8px 12px;
      background: #f0f0f0;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .nytro-input-wrap {
      flex: 1;
      background: white;
      border-radius: 24px;
      display: flex;
      align-items: center;
      padding: 2px 4px 2px 14px;
    }
    .nytro-input {
      flex: 1;
      border: none;
      padding: 10px 4px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      background: transparent;
    }
    .nytro-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: ${WHATSAPP_GREEN};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s;
    }
    .nytro-send-btn:hover { transform: scale(1.05); }
    .nytro-send-btn:disabled { opacity: 0.5; }
    .nytro-send-btn svg { width: 20px; height: 20px; fill: white; }

    @media (max-width: 480px) {
      #nytro-window {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        max-height: 100%;
        border-radius: 0;
      }
      #nytro-bubble {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  document.head.appendChild(style);

  // Bubble
  const bubble = document.createElement('div');
  bubble.id = 'nytro-bubble';
  bubble.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    <div class="nytro-badge"></div>
  `;
  bubble.onclick = toggleChat;
  document.body.appendChild(bubble);

  // Window
  const win = document.createElement('div');
  win.id = 'nytro-window';
  win.innerHTML = `
    <div class="nytro-header">
      <img src="${LOGO_URL}" alt="Nytro" style="width:42px;height:42px;border-radius:50%;background:white;object-fit:contain;padding:2px;" />
      <div class="nytro-header-info">
        <div class="nytro-header-name">Assistente Nytro</div>
        <div class="nytro-header-status">Online agora</div>
      </div>
      <button class="nytro-close" id="nytro-close-btn">
        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
    <div class="nytro-body" id="nytro-body"></div>
    <div class="nytro-suggestions" id="nytro-suggestions">
      <button class="nytro-suggestion-btn" data-text="Quero saber sobre o Nytro Fiscal Cloud">Nytro Fiscal Cloud</button>
      <button class="nytro-suggestion-btn" data-text="Quais soluções a Nytro oferece?">Soluções Nytro</button>
      <button class="nytro-suggestion-btn" data-text="Como funciona o ERP Odoo?">ERP Odoo</button>
    </div>
    <div class="nytro-input-bar">
      <div class="nytro-input-wrap">
        <input type="text" class="nytro-input" id="nytro-input" placeholder="Digite uma mensagem" autocomplete="off" />
      </div>
      <button class="nytro-send-btn" id="nytro-send-btn">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(win);

  // Events
  document.getElementById('nytro-close-btn').onclick = function() { isOpen = false; win.classList.remove('open'); };
  document.getElementById('nytro-send-btn').onclick = function() { sendFromInput(); };
  document.getElementById('nytro-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') sendFromInput(); });
  
  document.querySelectorAll('.nytro-suggestion-btn').forEach(function(btn) {
    btn.onclick = function() { sendMessage(btn.getAttribute('data-text')); };
  });

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('open');
      setTimeout(function() { document.getElementById('nytro-input').focus(); }, 300);
      renderMessages();
    } else {
      win.classList.remove('open');
    }
  }

  function sendFromInput() {
    var input = document.getElementById('nytro-input');
    var text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    sendMessage(text);
  }

  function getTime() {
    var d = new Date();
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  function renderMessages() {
    var body = document.getElementById('nytro-body');
    body.innerHTML = '';
    messages.forEach(function(msg) {
      var div = document.createElement('div');
      div.className = 'nytro-bubble-msg ' + (msg.role === 'user' ? 'nytro-bubble-user' : 'nytro-bubble-bot');
      div.innerHTML = msg.content.replace(/</g, '&lt;') + '<span class="nytro-bubble-time">' + getTime() + '</span>';
      body.appendChild(div);
    });
    if (isLoading) {
      var typing = document.createElement('div');
      typing.className = 'nytro-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(typing);
    }
    body.scrollTop = body.scrollHeight;

    var sug = document.getElementById('nytro-suggestions');
    var hasUserMsg = messages.some(function(m) { return m.role === 'user'; });
    sug.style.display = hasUserMsg ? 'none' : 'flex';
  }

  function sendMessage(text) {
    if (isLoading) return;
    messages.push({ role: 'user', content: text });
    isLoading = true;
    renderMessages();

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        message: text,
        history: messages.slice(0, -1).map(function(m) {
          return { role: m.role, content: m.content };
        }),
      }),
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      messages.push({ role: 'assistant', content: data.reply });
      if (data.leadCreated) {
        messages.push({ role: 'assistant', content: '✅ Seu contato foi registrado! Um especialista da Nytro entrará em contato em até 1 dia útil.' });
      }
    })
    .catch(function() {
      messages.push({ role: 'assistant', content: 'Desculpe, tive um problema técnico. Pode tentar novamente?' });
    })
    .finally(function() {
      isLoading = false;
      renderMessages();
    });
  }

  setTimeout(function() { if (isOpen) renderMessages(); }, 100);
})();
