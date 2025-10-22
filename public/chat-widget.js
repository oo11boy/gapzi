(function() {
  console.log('Chat widget script loaded');

  // خواندن room code
  const scriptSrc = document.currentScript.src;
  const room = new URLSearchParams(scriptSrc.split('?')[1]).get('room');
  
  console.log('Script src:', scriptSrc);
  console.log('Room code:', room);

  if (!room) {
    console.error('No room code provided in script src');
    return;
  }

  // تولید یا بازیابی session ID برای این room
  const sessionKey = `chat_session_id_${room}`;
  let sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(sessionKey, sessionId);
  }
  console.log('Session ID:', sessionId);

  // ایجاد ویجت UI
  const chatDiv = document.createElement('div');
  chatDiv.style.position = 'fixed';
  chatDiv.style.bottom = '20px';
  chatDiv.style.right = '20px';
  chatDiv.style.width = '300px';
  chatDiv.style.background = 'white';
  chatDiv.style.border = '1px solid #ccc';
  chatDiv.style.borderRadius = '8px';
  chatDiv.style.padding = '10px';
  chatDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  chatDiv.style.zIndex = '1000';
  chatDiv.style.overflowY = 'auto';
  chatDiv.id = 'chat-widget';
  document.body.appendChild(chatDiv);

  // بررسی احراز هویت
  let userInfo = JSON.parse(localStorage.getItem(`chat_user_info_${room}`) || '{}');
  let isAuthenticated = userInfo.name && userInfo.email && userInfo.room === room;

  if (!isAuthenticated) {
    chatDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">Live Chat</div>
      <div id="auth-form">
        <input id="name" type="text" placeholder="Your Name" style="width: 100%; padding: 5px; margin-bottom: 5px; border: 1px solid #ccc; border-radius: 4px;">
        <input id="email" type="email" placeholder="Your Email" style="width: 100%; padding: 5px; margin-bottom: 5px; border: 1px solid #ccc; border-radius: 4px;">
        <button id="submit-auth" style="width: 100%; padding: 5px; background: #007bff; color: white; border: none; border-radius: 4px;">Start Chat</button>
      </div>
    `;

    document.getElementById('submit-auth').onclick = async () => {
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      if (!name || !email) {
        alert('Please enter your name and email');
        return;
      }

      userInfo = { name, email, room };
      localStorage.setItem(`chat_user_info_${room}`, JSON.stringify(userInfo));

      try {
        console.log('Sending user session to server:', { room, session_id: sessionId, name, email });
        const res = await fetch('http://localhost:3000/api/user-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, session_id: sessionId, name, email }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save session');
        }
        console.log('Session saved successfully:', await res.json());
        isAuthenticated = true;
        initChat();
      } catch (err) {
        console.error('Failed to save user session:', err);
        alert('Failed to start chat: ' + err.message);
      }
    };
  } else {
    console.log('User already authenticated:', userInfo);
    initChat();
  }

  function initChat() {
    console.log('Initializing chat UI');
    chatDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">Live Chat</div>
      <div id="messages" style="height: 300px; overflow-y: scroll; border: 1px solid #eee; padding: 5px; margin-bottom: 10px;"></div>
      <div>
        <input id="message-input" type="text" placeholder="Type your message..." style="width: 70%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
        <button id="send-message" style="width: 25%; padding: 5px; background: #007bff; color: white; border: none; border-radius: 4px; margin-left: 5px;">Send</button>
      </div>
    `;

    const messagesDiv = document.getElementById('messages');
    const input = document.getElementById('message-input');
    const button = document.getElementById('send-message');

    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.onload = () => initSocket();
    script.onerror = () => console.error('Failed to load socket.io');
    document.head.appendChild(script);

    function initSocket() {
      console.log('Loading socket.io for room:', room);
      const socket = io('http://localhost:3000', { transports: ['websocket', 'polling'], timeout: 20000 });

      socket.on('connect', () => {
        console.log('Widget socket connected:', socket.id);
        socket.emit('join_session', { room, session_id: sessionId });
      });

      socket.on('connect_error', (err) => {
        console.error('Widget socket connection error:', err);
      });

      socket.on('receive_message', (data) => {
        if (data.session_id === sessionId || data.sender === 'Admin') {
          console.log('Widget received message:', data);
          const p = document.createElement('p');
          p.textContent = `${data.sender}: ${data.message}`;
          p.style.margin = '2px 0';
          p.style.padding = '2px';
          if (data.sender === 'Admin') {
            p.style.background = '#e3f2fd';
          } else {
            p.style.background = '#f5f5f5';
          }
          messagesDiv.appendChild(p);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
      });

      fetch(`http://localhost:3000/api/messages?room=${room}&session_id=${sessionId}`)
        .then(res => {
          console.log('Fetch messages status:', res.status);
          if (!res.ok) throw new Error('Failed to fetch messages');
          return res.json();
        })
        .then(messages => {
          console.log('Loaded previous messages:', messages);
          messages.forEach(msg => {
            const p = document.createElement('p');
            p.textContent = `${msg.sender}: ${msg.message}`;
            p.style.margin = '2px 0';
            p.style.padding = '2px';
            messagesDiv.appendChild(p);
          });
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        })
        .catch(err => console.error('Failed to load messages:', err));

      button.onclick = () => {
        const msg = input.value.trim();
        if (msg) {
          console.log('Sending message:', msg);
          socket.emit('send_message', { room, message: msg, sender: userInfo.name, session_id: sessionId });
          input.value = '';
        }
      };

      input.onkeypress = (e) => {
        if (e.key === 'Enter') {
          button.click();
        }
      };
    }
  }
})();