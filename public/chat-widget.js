(function() {
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

  // استایل‌های کلی
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap');
    * { box-sizing: border-box; font-family: 'Vazirmatn', sans-serif; }
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
      background: #007bff; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
      box-shadow: 0 4px 10px rgba(0,0,0,0.3); 
      transition: transform 0.3s ease, background 0.3s ease, opacity 0.3s ease; 
    }
    #chat-button:hover { 
      transform: scale(1.1); 
      background: #0056b3; 
    }
    #chat-button.hidden { 
      opacity: 0; 
      pointer-events: none; 
    }
    #chat-button svg { 
      width: 28px; 
      height: 28px; 
      fill: white; 
    }
    #chat-container { 
      width: 360px; 
      height: 500px; 
      background: #ffffff; 
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
      background: #007bff; 
      color: white; 
      padding: 16px; 
      font-size: 18px; 
      font-weight: 700; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
    }
    #chat-header button { 
      background: none; 
      border: none; 
      color: white; 
      font-size: 24px; 
      cursor: pointer; 
    }
    #messages { 
      flex: 1; 
      overflow-y: auto; 
      padding: 16px; 
      background: #f8f9fa; 
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
    }
    .message.user { 
      background: #007bff; 
      color: white; 
      align-self: flex-end; 
      border-bottom-right-radius: 2px; 
    }
    .message.admin { 
      background: #e9ecef; 
      color: #333; 
      align-self: flex-start; 
      border-bottom-left-radius: 2px; 
    }
    #chat-input-container { 
      padding: 12px; 
      background: #ffffff; 
      border-top: 1px solid #e0e0e0; 
      display: flex; 
      gap: 8px; 
    }
    #message-input { 
      flex: 1; 
      padding: 10px; 
      border: 1px solid #ddd; 
      border-radius: 8px; 
      font-size: 14px; 
      outline: none; 
    }
    #message-input:focus { 
      border-color: #007bff; 
      box-shadow: 0 0 0 2px rgba(0,123,255,0.2); 
    }
    #send-message { 
      background: #007bff; 
      color: white; 
      border: none; 
      padding: 10px 16px; 
      border-radius: 8px; 
      cursor: pointer; 
      font-size: 14px; 
      transition: background 0.3s ease; 
    }
    #send-message:hover { 
      background: #0056b3; 
    }
    #auth-form { 
      padding: 16px; 
      display: flex; 
      flex-direction: column; 
      gap: 12px; 
    }
    #auth-form input { 
      padding: 10px; 
      border: 1px solid #ddd; 
      border-radius: 8px; 
      font-size: 14px; 
      outline: none; 
    }
    #auth-form input:focus { 
      border-color: #007bff; 
      box-shadow: 0 0 0 2px rgba(0,123,255,0.2); 
    }
    #submit-auth { 
      background: #007bff; 
      color: white; 
      border: none; 
      padding: 12px; 
      border-radius: 8px; 
      cursor: pointer; 
      font-size: 16px; 
      transition: background 0.3s ease; 
    }
    #submit-auth:hover { 
      background: #0056b3; 
    }
    ::-webkit-scrollbar { 
      width: 8px; 
    }
    ::-webkit-scrollbar-track { 
      background: #f1f1f1; 
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
    </div>
    <div id="chat-container">
      <div id="chat-header">
        <span>چت زنده</span>
        <button id="close-chat">×</button>
      </div>
      <div id="messages"></div>
      <div id="chat-input-container">
        <input id="message-input" type="text" placeholder="پیام خود را بنویسید...">
        <button id="send-message">ارسال</button>
      </div>
    </div>
  `;
  document.body.appendChild(chatWidget);

  const chatButton = document.getElementById('chat-button');
  const chatContainer = document.getElementById('chat-container');
  const closeChat = document.getElementById('close-chat');

  // باز و بسته کردن ویجت
  chatButton.onclick = () => {
    chatContainer.classList.add('open');
    chatButton.classList.add('hidden');
    document.getElementById('message-input')?.focus();
  };
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
        <span>چت زنده</span>
        <button id="close-chat">×</button>
      </div>
      <div id="messages"></div>
      <div id="chat-input-container">
        <input id="message-input" type="text" placeholder="پیام خود را بنویسید...">
        <button id="send-message">ارسال</button>
      </div>
    `;

    const messagesDiv = document.getElementById('messages');
    const input = document.getElementById('message-input');
    const button = document.getElementById('send-message');
    const closeChat = document.getElementById('close-chat');

    closeChat.onclick = () => {
      chatContainer.classList.remove('open');
      chatButton.classList.remove('hidden');
    };

    // بارگذاری پیام‌های قبلی
    fetch(`http://localhost:3000/api/messages?room=${room}&session_id=${sessionId}`)
      .then(res => res.json())
      .then(messages => {
        messages.forEach(msg => {
          const p = document.createElement('div');
          p.className = `message ${msg.sender === 'Admin' ? 'admin' : 'user'}`;
          p.textContent = `${msg.sender}: ${msg.message}`;
          messagesDiv.appendChild(p);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      })
      .catch(err => console.error('Failed to load messages:', err));

    // بارگذاری socket.io
    if (!window.io) {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = setupSocket;
      script.onerror = () => console.error('Failed to load socket.io');
      document.head.appendChild(script);
    } else {
      setupSocket();
    }

    function setupSocket() {
      if (!window.chatSocket) {
        window.chatSocket = io('http://localhost:3000', { transports: ['websocket', 'polling'], timeout: 20000 });

        window.chatSocket.on('connect', () => {
          console.log('Widget socket connected:', window.chatSocket.id);
          window.chatSocket.emit('join_session', { room, session_id: sessionId });
        });

        window.chatSocket.on('connect_error', (err) => {
          console.error('Widget socket connection error:', err);
        });

        window.chatSocket.on('receive_message', (data) => {
          if (data.session_id === sessionId || data.sender === 'Admin') {
            const p = document.createElement('div');
            p.className = `message ${data.sender === 'Admin' ? 'admin' : 'user'}`;
            p.textContent = `${data.sender}: ${data.message}`;
            messagesDiv.appendChild(p);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }
        });

        input.addEventListener('input', () => {
          window.chatSocket.emit('user_typing', { room, name: userInfo.name, session_id: sessionId });
        });
      }

      button.onclick = () => {
        const msg = input.value.trim();
        if (msg && window.chatSocket) {
          window.chatSocket.emit('send_message', { room, message: msg, sender: userInfo.name, session_id: sessionId });
          input.value = '';
        }
      };

      input.onkeypress = (e) => {
        if (e.key === 'Enter') button.click();
      };
    }
  }

  if (!isAuthenticated) {
    chatContainer.innerHTML = `
      <div id="chat-header">
        <span>چت زنده</span>
        <button id="close-chat">×</button>
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
      if (!name || !email) return alert('لطفاً نام و ایمیل خود را وارد کنید');

      userInfo = { name, email, room };
      localStorage.setItem(`chat_user_info_${room}`, JSON.stringify(userInfo));

      try {
        const res = await fetch('http://localhost:3000/api/user-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, session_id: sessionId, name, email }),
        });
        if (!res.ok) throw new Error('Failed to save session');
        isAuthenticated = true;
        initChatUI();
        chatContainer.classList.add('open');
        chatButton.classList.add('hidden');
      } catch (err) {
        console.error('Failed to save user session:', err);
        alert('خطا در شروع چت: ' + err.message);
      }
    };
  } else {
    initChatUI();
  }
})();