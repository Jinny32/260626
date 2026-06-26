(function () {
  'use strict';

  const ACCENT = '#7c3aed';
  const ACCENT_LIGHT = '#ede9fe';
  const MAX_HISTORY = 10;

  let messages = []; // { role, content }
  let isOpen = false;
  let isLoading = false;

  /* ── DOM 생성 ── */
  function buildWidget() {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

      #fp-chat-btn {
        position: fixed; bottom: 28px; right: 28px; z-index: 9999;
        width: 58px; height: 58px; border-radius: 50%;
        background: ${ACCENT};
        box-shadow: 0 6px 24px rgba(124,58,237,0.45);
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.5rem;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      #fp-chat-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 10px 32px rgba(124,58,237,0.55);
      }
      #fp-chat-btn .fp-icon-open  { display: flex; }
      #fp-chat-btn .fp-icon-close { display: none; }
      #fp-chat-btn.open .fp-icon-open  { display: none; }
      #fp-chat-btn.open .fp-icon-close { display: flex; }

      #fp-chat-window {
        position: fixed; bottom: 100px; right: 28px; z-index: 9998;
        width: 370px; max-width: calc(100vw - 40px);
        height: 520px; max-height: calc(100vh - 130px);
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 16px 48px rgba(124,58,237,0.18), 0 4px 12px rgba(0,0,0,0.08);
        display: flex; flex-direction: column;
        overflow: hidden;
        font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
        transform: translateY(20px) scale(0.97);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
      }
      #fp-chat-window.open {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: all;
      }

      /* 헤더 */
      .fp-header {
        background: ${ACCENT};
        padding: 16px 20px;
        display: flex; align-items: center; gap: 12px; flex-shrink: 0;
      }
      .fp-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem;
      }
      .fp-header-info { flex: 1; }
      .fp-header-name {
        color: #fff; font-size: 0.95rem; font-weight: 700; line-height: 1;
      }
      .fp-header-status {
        color: rgba(255,255,255,0.75); font-size: 0.75rem; margin-top: 3px;
        display: flex; align-items: center; gap: 5px;
      }
      .fp-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #4ade80; display: inline-block;
      }

      /* 메시지 영역 */
      .fp-messages {
        flex: 1; overflow-y: auto; padding: 20px 16px;
        display: flex; flex-direction: column; gap: 12px;
        scroll-behavior: smooth;
      }
      .fp-messages::-webkit-scrollbar { width: 4px; }
      .fp-messages::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }

      .fp-msg {
        display: flex; gap: 8px; align-items: flex-end; max-width: 85%;
      }
      .fp-msg.bot { align-self: flex-start; }
      .fp-msg.user { align-self: flex-end; flex-direction: row-reverse; }

      .fp-msg-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        background: ${ACCENT_LIGHT};
        display: flex; align-items: center; justify-content: center;
        font-size: 0.85rem; flex-shrink: 0;
      }
      .fp-msg.user .fp-msg-avatar { background: #dbeafe; }

      .fp-bubble {
        padding: 10px 14px; border-radius: 16px;
        font-size: 0.875rem; line-height: 1.6; word-break: keep-all;
      }
      .fp-msg.bot .fp-bubble {
        background: #f5f3ff; color: #1e1b4b;
        border-bottom-left-radius: 4px;
      }
      .fp-msg.user .fp-bubble {
        background: ${ACCENT}; color: #fff;
        border-bottom-right-radius: 4px;
      }

      /* 로딩 점 */
      .fp-loading {
        display: flex; gap: 5px; padding: 12px 14px;
        background: #f5f3ff; border-radius: 16px; border-bottom-left-radius: 4px;
        align-items: center;
      }
      .fp-loading span {
        width: 7px; height: 7px; border-radius: 50%;
        background: ${ACCENT}; opacity: 0.4;
        animation: fp-bounce 1.2s infinite;
      }
      .fp-loading span:nth-child(2) { animation-delay: 0.2s; }
      .fp-loading span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes fp-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-6px); opacity: 1; }
      }

      /* 에러 */
      .fp-error {
        background: #fff1f2; color: #be123c;
        border: 1px solid #fecdd3; border-radius: 10px;
        padding: 10px 14px; font-size: 0.8rem; text-align: center;
        align-self: center;
      }

      /* 입력 영역 */
      .fp-input-area {
        padding: 12px 14px; border-top: 1px solid #f3f4f6;
        display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
      }
      .fp-textarea {
        flex: 1; border: 1.5px solid #e5e7eb; border-radius: 12px;
        padding: 10px 14px; font-size: 0.875rem;
        font-family: inherit; resize: none; outline: none;
        max-height: 120px; min-height: 42px; line-height: 1.5;
        color: #1e1b4b; transition: border-color 0.2s;
        field-sizing: content;
      }
      .fp-textarea:focus { border-color: ${ACCENT}; }
      .fp-textarea::placeholder { color: #9ca3af; }
      .fp-send-btn {
        width: 40px; height: 40px; border-radius: 10px;
        background: ${ACCENT}; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s, transform 0.1s;
      }
      .fp-send-btn:hover { background: #6d28d9; }
      .fp-send-btn:active { transform: scale(0.92); }
      .fp-send-btn:disabled { background: #c4b5fd; cursor: not-allowed; }
      .fp-send-btn svg { width: 18px; height: 18px; }

      @media (max-width: 480px) {
        #fp-chat-btn { bottom: 20px; right: 20px; }
        #fp-chat-window { right: 20px; bottom: 90px; }
      }
    `;
    document.head.appendChild(style);

    // 토글 버튼
    const btn = document.createElement('button');
    btn.id = 'fp-chat-btn';
    btn.setAttribute('aria-label', '챗봇 열기');
    btn.innerHTML = `
      <span class="fp-icon-open">💬</span>
      <span class="fp-icon-close" style="color:#fff;font-size:1.2rem;">✕</span>
    `;
    btn.addEventListener('click', toggleChat);
    document.body.appendChild(btn);

    // 채팅창
    const win = document.createElement('div');
    win.id = 'fp-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Finance Partner 챗봇');
    win.innerHTML = `
      <div class="fp-header">
        <div class="fp-avatar">🤖</div>
        <div class="fp-header-info">
          <div class="fp-header-name">FP 어시스턴트</div>
          <div class="fp-header-status"><span class="fp-dot"></span> 온라인</div>
        </div>
      </div>
      <div class="fp-messages" id="fp-messages"></div>
      <div class="fp-input-area">
        <textarea class="fp-textarea" id="fp-textarea"
          placeholder="무엇이든 물어보세요..." rows="1"></textarea>
        <button class="fp-send-btn" id="fp-send-btn" aria-label="전송">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(win);

    // 이벤트
    document.getElementById('fp-send-btn').addEventListener('click', sendMessage);
    document.getElementById('fp-textarea').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // 환영 메시지
    setTimeout(function () {
      appendMessage('bot', '안녕하세요! 👋 Finance Partner 어시스턴트입니다.\n재무·세무·서비스 관련 궁금한 점을 편하게 물어보세요!');
    }, 1000);
  }

  /* ── 채팅창 토글 ── */
  function toggleChat() {
    isOpen = !isOpen;
    document.getElementById('fp-chat-btn').classList.toggle('open', isOpen);
    document.getElementById('fp-chat-window').classList.toggle('open', isOpen);
    if (isOpen) {
      setTimeout(function () {
        document.getElementById('fp-textarea').focus();
        scrollToBottom();
      }, 50);
    }
  }

  /* ── 메시지 추가 ── */
  function appendMessage(role, text) {
    const container = document.getElementById('fp-messages');
    const wrap = document.createElement('div');
    wrap.className = 'fp-msg ' + role;
    const avatar = document.createElement('div');
    avatar.className = 'fp-msg-avatar';
    avatar.textContent = role === 'bot' ? '🤖' : '🙂';
    const bubble = document.createElement('div');
    bubble.className = 'fp-bubble';
    bubble.textContent = text;
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    container.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function appendError(text) {
    const container = document.getElementById('fp-messages');
    const el = document.createElement('div');
    el.className = 'fp-error';
    el.textContent = text;
    container.appendChild(el);
    scrollToBottom();
  }

  function showLoading() {
    const container = document.getElementById('fp-messages');
    const wrap = document.createElement('div');
    wrap.className = 'fp-msg bot';
    wrap.id = 'fp-loading-wrap';
    const avatar = document.createElement('div');
    avatar.className = 'fp-msg-avatar';
    avatar.textContent = '🤖';
    const dots = document.createElement('div');
    dots.className = 'fp-loading';
    dots.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(avatar);
    wrap.appendChild(dots);
    container.appendChild(wrap);
    scrollToBottom();
  }

  function hideLoading() {
    const el = document.getElementById('fp-loading-wrap');
    if (el) el.remove();
  }

  function scrollToBottom() {
    const c = document.getElementById('fp-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  /* ── 메시지 전송 ── */
  async function sendMessage() {
    if (isLoading) return;
    const textarea = document.getElementById('fp-textarea');
    const text = textarea.value.trim();
    if (!text) return;

    textarea.value = '';
    textarea.style.height = 'auto';
    appendMessage('user', text);

    // 히스토리에 추가 (최대 MAX_HISTORY 유지)
    messages.push({ role: 'user', content: text });
    if (messages.length > MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);

    isLoading = true;
    document.getElementById('fp-send-btn').disabled = true;
    showLoading();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages }),
      });

      hideLoading();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendError('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        console.error('Chat API error:', err);
      } else {
        const data = await res.json();
        const reply = data.reply || '응답을 받지 못했습니다.';
        appendMessage('bot', reply);
        messages.push({ role: 'assistant', content: reply });
        if (messages.length > MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);
      }
    } catch (e) {
      hideLoading();
      appendError('네트워크 오류가 발생했습니다. 연결을 확인해 주세요.');
      console.error('Fetch error:', e);
    } finally {
      isLoading = false;
      document.getElementById('fp-send-btn').disabled = false;
      textarea.focus();
    }
  }

  /* ── 초기화 ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
