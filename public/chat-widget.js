(function () {
  console.log('Chat widget script loaded');

  // خواندن room code از query string
  const scriptSrc = document.currentScript.src;
  const room = new URLSearchParams(scriptSrc.split('?')[1]).get('room');

  if (!room) {
    console.error('No room code provided in script src');
    return;
  }

  // تولید یا بازیابی session ID
  const sessionKey = `chat_session_id_${room}`;
  let sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(sessionKey, sessionId);
  }

  // متغیر برای ردیابی تعداد پیام‌های خوانده‌نشده
  let unreadCount = parseInt(localStorage.getItem(`unread_count_${room}`) || '0');

  // تابع برای جمع‌آوری metadata
  function collectMetadata() {
    const userAgent = navigator.userAgent;
    const referrer = document.referrer || 'مستقیم';
    const currentPage = window.location.href;
    const pageHistory = JSON.parse(localStorage.getItem(`page_history_${room}`) || '[]');

    // تشخیص device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
    let deviceType = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';

    // تشخیص browser و OS (ساده‌سازی شده)
    let browser = 'نامشخص';
    let os = 'نامشخص';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // به‌روزرسانی page history
    const now = new Date().toISOString();
    const lastPage = pageHistory[pageHistory.length - 1];
    const duration = lastPage ? Math.floor((Date.now() - new Date(lastPage.timestamp).getTime()) / 1000) : 0;
    if (lastPage) lastPage.duration = duration;

    pageHistory.push({ url: currentPage, timestamp: now, duration: 0 });
    localStorage.setItem(`page_history_${room}`, JSON.stringify(pageHistory.slice(-10))); // نگه‌داری 10 مورد آخر

    return {
      referrer,
      current_page: currentPage,
      page_history: pageHistory,
      browser,
      os,
      device_type: deviceType,
      user_agent: userAgent,
      ip_address: '', // سرور اضافه می‌کند
    };
  }

  // تابع برای ارسال metadata به سرور
  async function sendMetadata(name, email) {
    const metadata = collectMetadata();
    try {
      await fetch('http://localhost:3000/api/user-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, session_id: sessionId, name, email, metadata }),
      });
      console.log('Metadata sent successfully');
    } catch (error) {
      console.error('Failed to send metadata:', error);
    }
  }

  // تابع برای به‌روزرسانی page tracking هر 30 ثانیه
  function startPageTracking() {
    setInterval(() => {
      const metadata = collectMetadata();
      fetch('http://localhost:3000/api/user-metadata/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, session_id: sessionId, current_page: metadata.current_page, page_history: metadata.page_history }),
      }).catch(console.error);
    }, 30000);
  }

  // تابع برای دریافت تنظیمات ویجت از سرور
  async function fetchWidgetSettings() {
    try {
      const response = await fetch(`http://localhost:3000/api/widget-settings?room=${room}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching widget settings:', error.message);
      return {
        primary_color: '#007bff',
        secondary_color: '#ffffff',
        chat_title: 'چت زنده',
        placeholder_text: 'پیام خود را بنویسید...',
        welcome_message: null,
        font_family: 'Vazirmatn',
      };
    }
  }

  // تابع‌های کمکی برای مدیریت رنگ‌ها
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  function lightenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const r = (num >> 16) + amt;
    const g = ((num >> 8) & 0x00ff) + amt;
    const b = (num & 0x0000ff) + amt;
    return `#${(
      0x1000000 +
      (r < 255 ? (r < 1 ? 0 : r) : 255) * 0x10000 +
      (g < 255 ? (g < 1 ? 0 : g) : 255) * 0x100 +
      (b < 255 ? (b < 1 ? 0 : b) : 255)
    )
      .toString(16)
      .slice(1)}`;
  }

  function darkenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const r = (num >> 16) - amt;
    const g = ((num >> 8) & 0x00ff) - amt;
    const b = (num & 0x0000ff) - amt;
    return `#${(
      0x1000000 +
      (r < 255 ? (r < 1 ? 0 : r) : 255) * 0x10000 +
      (g < 255 ? (g < 1 ? 0 : g) : 255) * 0x100 +
      (b < 255 ? (b < 1 ? 0 : b) : 255)
    )
      .toString(16)
      .slice(1)}`;
  }

  // اجرای تابع اصلی
  (async () => {
    const settings = await fetchWidgetSettings();

    // استایل‌های ویجت
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=${settings.font_family}&display=swap');

      * {
        box-sizing: border-box;
        font-family: '${settings.font_family}', sans-serif;
      }

      #chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        direction: rtl;
      }

      #chat-button {
        width: 60px;
        height: 60px;
        background: ${settings.primary_color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        transition: transform 0.3s ease, background 0.3s ease, opacity 0.3s ease;
        position: relative;
      }

      #chat-button:hover {
        background: ${darkenColor(settings.primary_color, 10)};
      }

      #chat-button.hidden {
        opacity: 0;
        pointer-events: none;
      }

      #chat-button svg {
        width: 28px;
        height: 28px;
        fill: ${settings.secondary_color};
      }

      #chat-button .badge {
        position: absolute;
        top: -8px;
        left: -8px;
        background: #ff4444;
        color: ${settings.secondary_color};
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: none;
      }

      #chat-button .badge.visible {
        display: flex;
      }

      #chat-container {
        width: 360px;
        height: 500px;
        background: ${settings.secondary_color};
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      #chat-container.open {
        display: flex;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      #chat-header {
        background: ${settings.primary_color};
        color: ${settings.secondary_color};
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        gap: 4px;
      }

      .chat-header-top {
        width: 100%;
        display:flex;
        align-items: center;
        justify-content: space-between;
      }

      .chat-title {
        font-size: 18px;
        font-weight: 700;
      }

      #chat-header button {
        background: none;
        border: none;
        color: ${settings.secondary_color};
        font-size: 24px;
        cursor: pointer;
      }

      #admin-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 500;
        color: ${lightenColor(settings.secondary_color, 20)};
        background: rgba(255, 255, 255, 0.15);
        padding: 4px 10px;
        border-radius: 20px;
        backdrop-filter: blur(4px);
        transition: all 0.3s ease;
      }

      #admin-status.online {
        color: #22c55e;
        background: rgba(34, 197, 94, 0.15);
      }

      #admin-status.offline {
        color: #facc15;
        background: rgba(250, 204, 21, 0.15);
      }

      #admin-status svg {
        width: 10px;
        height: 10px;
        fill: currentColor;
      }

      #messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: ${lightenColor(settings.secondary_color, 5)};
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 12px;
        margin: 4px 0;
        line-height: 1.5;
        font-size: 14px;
        word-break: break-word;
      }

      .message.user {
        background: ${settings.primary_color};
        color: ${settings.secondary_color};
        align-self: flex-end;
        border-bottom-right-radius: 2px;
      }

      .message.admin {
        background: ${lightenColor(settings.secondary_color, 10)};
        color: #333;
        align-self: flex-start;
        border-bottom-left-radius: 2px;
      }

      .message-time {
        font-size: 10px;
        opacity: 0.7;
        text-align: right;
        margin-top: 4px;
      }

      #chat-typing {
        padding: 8px 16px;
        font-size: 12px;
        color: #6b7280;
        display: none;
      }

      #chat-input-container {
        padding: 12px;
        background: ${settings.secondary_color};
        border-top: 1px solid ${lightenColor(settings.secondary_color, 15)};
        display: flex;
        gap: 8px;
      }

      #message-input {
        flex: 1;
        padding: 10px;
        border: 1px solid ${lightenColor(settings.secondary_color, 20)};
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        resize: none;
        min-height: 40px;
        max-height: 100px;
      }

      #message-input:focus {
        border-color: ${settings.primary_color};
        box-shadow: 0 0 0 2px rgba(${hexToRgb(settings.primary_color)}, 0.2);
      }

      #send-message {
        background: ${settings.primary_color};
        color: ${settings.secondary_color};
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.3s ease;
      }

      #send-message:hover {
        background: ${darkenColor(settings.primary_color, 10)};
      }

      #auth-form {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      #auth-form input {
        padding: 10px;
        border: 1px solid ${lightenColor(settings.secondary_color, 20)};
        border-radius: 8px;
        font-size: 14px;
        outline: none;
      }

      #auth-form input:focus {
        border-color: ${settings.primary_color};
        box-shadow: 0 0 0 2px rgba(${hexToRgb(settings.primary_color)}, 0.2);
      }

      #submit-auth {
        background: ${settings.primary_color};
        color: ${settings.secondary_color};
        border: none;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: background 0.3s ease;
      }

      #submit-auth:hover {
        background: ${darkenColor(settings.primary_color, 10)};
      }

      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: ${lightenColor(settings.secondary_color, 10)};
      }

      ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;
    document.head.appendChild(style);

    // ایجاد ویجت UI
    const chatWidget = document.createElement('div');
    chatWidget.id = 'chat-widget';
    chatWidget.innerHTML = `
      <div id="chat-button">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
        <span id="unread-count" class="badge">0</span>
      </div>
      <div id="chat-container">
        <div id="chat-header">
          <div class="chat-header-top">
            <span class="chat-title">${settings.chat_title}</span>
            <button id="close-chat">×</button>
          </div>
          <div id="admin-status"></div>
        </div>
        <div id="messages">
          ${settings.welcome_message ? `<div class="message admin">${settings.welcome_message}</div>` : ''}
        </div>
        <div id="chat-typing"></div>
        <div id="chat-input-container">
          <textarea id="message-input" placeholder="${settings.placeholder_text}"></textarea>
          <button id="send-message">ارسال</button>
        </div>
      </div>
    `;
    document.body.appendChild(chatWidget);

    const chatButton = document.getElementById('chat-button');
    const chatContainer = document.getElementById('chat-container');
    const closeChat = document.getElementById('close-chat');
    const adminStatus = document.getElementById('admin-status');

    // تابع برای به‌روزرسانی نشانگر تعداد پیام‌های خوانده‌نشده
    function updateUnreadBadge() {
      const badge = document.getElementById('unread-count');
      if (badge) {
        badge.textContent = unreadCount.toString();
        badge.classList.toggle('visible', unreadCount > 0);
        localStorage.setItem(`unread_count_${room}`, unreadCount.toString());
      }
    }

    // تابع برای به‌روزرسانی وضعیت ادمین
    async function updateAdminStatus() {
      try {
        const response = await fetch(`http://localhost:3000/api/users?room=${room}&widget=true`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();

        if (data.isOnline) {
          adminStatus.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg> ادمین آنلاین است`;
          adminStatus.className = 'online';
        } else {
          adminStatus.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg> آخرین بازدید به تازگی`;
          adminStatus.className = 'offline';
        }
      } catch (error) {
        console.error('Error fetching admin status:', error);
        adminStatus.textContent = 'آخرین بازدید به تازگی';
        adminStatus.className = 'offline';
      }
    }

    // باز کردن ویجت
    chatButton.onclick = () => {
      chatContainer.classList.add('open');
      chatButton.classList.add('hidden');
      unreadCount = 0;
      updateUnreadBadge();
      document.getElementById('message-input')?.focus();
      updateAdminStatus();
    };

    // بستن ویجت
    closeChat.onclick = () => {
      chatContainer.classList.remove('open');
      chatButton.classList.remove('hidden');
    };

    // بررسی احراز هویت
    let userInfo = JSON.parse(localStorage.getItem(`chat_user_info_${room}`) || '{}');
    let isAuthenticated = userInfo.name && userInfo.email && userInfo.room === room;

    function initChatUI() {
      chatContainer.innerHTML = `
        <div id="chat-header">
          <div class="chat-header-top">
            <span class="chat-title">${settings.chat_title}</span>
            <button id="close-chat">×</button>
          </div>
          <div id="admin-status"></div>
        </div>
        <div id="messages">
          ${settings.welcome_message ? `<div class="message admin">${settings.welcome_message}</div>` : ''}
        </div>
        <div id="chat-typing"></div>
        <div id="chat-input-container">
          <textarea id="message-input" placeholder="${settings.placeholder_text}"></textarea>
          <button id="send-message">ارسال</button>
        </div>
      `;

      const messagesDiv = document.getElementById('messages');
      const input = document.getElementById('message-input');
      const button = document.getElementById('send-message');
      const closeChat = document.getElementById('close-chat');
      const adminStatus = document.getElementById('admin-status');

      closeChat.onclick = () => {
        chatContainer.classList.remove('open');
        chatButton.classList.remove('hidden');
      };

      // تنظیم ارتفاع خودکار textarea
      input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      });

      // ارسال با Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          button.click();
        }
      });

      // بارگذاری پیام‌های قبلی
      fetch(`http://localhost:3000/api/messages?room=${room}&session_id=${sessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then((messages) => {
          messagesDiv.innerHTML = settings.welcome_message 
            ? `<div class="message admin">${settings.welcome_message}</div>` 
            : '';

          messages.forEach((msg) => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${msg.sender_type === 'admin' ? 'admin' : 'user'}`;
            messageElement.dataset.messageId = msg.message_id;
            messageElement.innerHTML = `
              <div>${msg.message}</div>
              <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
              })}</div>
            `;
            messagesDiv.appendChild(messageElement);
          });

          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        })
        .catch((err) => console.error('Failed to load messages:', err.message));

      // بارگذاری socket.io
      if (!window.io) {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
        script.async = true;
        script.onload = setupSocket;
        script.onerror = () => console.error('Failed to load socket.io');
        document.head.appendChild(script);
      } else {
        setupSocket();
      }

      function setupSocket() {
        if (!window.chatSocket) {
          window.chatSocket = io('http://localhost:3000', {
            transports: ['websocket', 'polling'],
            timeout: 20000,
          });

          window.chatSocket.on('connect', () => {
            console.log('Widget socket connected');
            window.chatSocket.emit('join_session', { room, session_id: sessionId });
          });

          // وضعیت ادمین
          window.chatSocket.on('admin_status', (status) => {
            const adminStatusEl = document.getElementById('admin-status');
            if (!adminStatusEl) return;

            if (status.isOnline) {
              adminStatusEl.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg> ادمین آنلاین است`;
              adminStatusEl.className = 'online';
            } else {
              adminStatusEl.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg> آخرین بازدید به تازگی`;
              adminStatusEl.className = 'offline';
            }
          });

          // دریافت پیام جدید
          window.chatSocket.on('receive_message', (data) => {
            if (data.room !== room || data.session_id !== sessionId) return;

            const messagesDiv = document.getElementById('messages');
            const existingMessage = messagesDiv.querySelector(`[data-message-id="${data.message_id}"]`);
            if (existingMessage) return;

            const p = document.createElement('div');
            p.className = `message ${data.sender_type === 'admin' ? 'admin' : 'user'}`;
            p.dataset.messageId = data.message_id;
            p.innerHTML = `
              <div>${data.message}</div>
              <div class="message-time">${new Date(data.timestamp).toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
              })}${data.edited ? '' : ''}</div>
            `;
            messagesDiv.appendChild(p);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            if (!chatContainer.classList.contains('open') && data.sender_type === 'admin') {
              unreadCount++;
              updateUnreadBadge();
            }
          });

          // دریافت ویرایش پیام
          window.chatSocket.on('message_edited', (data) => {
            if (data.room !== room || data.session_id !== sessionId) return;

            const messagesDiv = document.getElementById('messages');
            const messageEl = messagesDiv.querySelector(`[data-message-id="${data.message_id}"]`);
            if (!messageEl) return;

            // آپدیت متن پیام
            const textDiv = messageEl.querySelector('div');
            if (textDiv) textDiv.textContent = data.message;

            // آپدیت زمان + (ویرایش شده)
            const timeDiv = messageEl.querySelector('.message-time');
            if (timeDiv) {
              timeDiv.innerHTML = `
                ${new Date(data.timestamp).toLocaleTimeString('fa-IR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              
              `;
            }
          });

          // حذف پیام (اختیاری)
          window.chatSocket.on('message_deleted', ({ message_id }) => {
            const messagesDiv = document.getElementById('messages');
            const messageEl = messagesDiv.querySelector(`[data-message-id="${message_id}"]`);
            if (messageEl) {
              messageEl.remove();
            }
          });
        }

        // ارسال پیام
        button.onclick = () => {
          const msg = input.value.trim();
          if (msg && window.chatSocket) {
            window.chatSocket.emit('send_message', {
              room,
              message: msg,
              sender: userInfo.name,
              sender_type: 'guest',
              session_id: sessionId,
              timestamp: new Date().toISOString(),
            });
            input.value = '';
            input.style.height = 'auto';
          }
        };
      }
    }

    // فرم احراز هویت
    if (!isAuthenticated) {
      chatContainer.innerHTML = `
        <div id="chat-header">
          <div class="chat-header-top">
            <span class="chat-title">${settings.chat_title}</span>
            <button id="close-chat">×</button>
          </div>
          <div id="admin-status"></div>
        </div>
        <div id="auth-form">
          <input id="name" type="text" placeholder="نام شما">
          <input id="email" type="email" placeholder="ایمیل شما">
          <button id="submit-auth">شروع چت</button>
        </div>
      `;

      const closeChat = document.getElementById('close-chat');
      closeChat.onclick = () => {
        chatContainer.classList.remove('open');
        chatButton.classList.remove('hidden');
      };

      document.getElementById('submit-auth').onclick = async () => {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        if (!name || !email) {
          alert('لطفاً نام و ایمیل خود را وارد کنید');
          return;
        }

        userInfo = { name, email, room };
        localStorage.setItem(`chat_user_info_${room}`, JSON.stringify(userInfo));

        // ارسال metadata بعد از احراز هویت
        await sendMetadata(name, email);
        startPageTracking();

        try {
          const res = await fetch('http://localhost:3000/api/user-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room, session_id: sessionId, name, email }),
          });
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          isAuthenticated = true;
          initChatUI();
          chatContainer.classList.add('open');
          chatButton.classList.add('hidden');
        } catch (err) {
          console.error('Failed to save user session:', err.message);
          alert('خطا در شروع چت: ' + err.message);
        }
      };
    } else {
      // اگر قبلاً احراز هویت شده، metadata را ارسال کن
      await sendMetadata(userInfo.name, userInfo.email);
      startPageTracking();
      initChatUI();
    }

    updateUnreadBadge();
    updateAdminStatus();

    // به‌روزرسانی دوره‌ای وضعیت ادمین
    setInterval(() => {
      if (chatContainer.classList.contains('open')) {
        updateAdminStatus();
      }
    }, 60000);
  })();
})();