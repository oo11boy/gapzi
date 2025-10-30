const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'chat_system',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: '+00:00',
});

// نقشه‌ای برای نگه داشتن کاربران آنلاین (مثل تلگرام)
const onlineUsers = new Map(); // <session_id, socketCount>
const adminStatus = new Map(); // <room:adminId, timestamp>

app.prepare().then(() => {
  const server = createServer(handle);
  const io = new Server(server, {
    cors: { origin: ['http://localhost:3000'], methods: ['GET', 'POST'] },
    pingTimeout: 25000,
    pingInterval: 10000,
  });

  io.on('connection', (socket) => {
    let userRoom = null;
    let userSession = null;

    // 🟢 کاربر وارد شد
    socket.on('join_session', async ({ room, session_id }) => {
      if (!room || !session_id) return;
      userRoom = room;
      userSession = session_id;

      socket.join(room);
      if (!session_id.startsWith('admin-') && session_id !== 'admin-global') {
        socket.join(`${room}:${session_id}`);
      }

      try {
        const [rows] = await pool.execute('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
        if (!rows.length) return socket.emit('error', 'Invalid room');
        const roomId = rows[0].id;

        // ثبت آخرین فعالیت
        await pool.execute('UPDATE user_sessions SET last_active = NOW() WHERE room_id = ? AND session_id = ?', [
          roomId,
          session_id,
        ]);

        // بروزرسانی در حافظه
        const count = onlineUsers.get(session_id) || 0;
        onlineUsers.set(session_id, count + 1);

        // اطلاع به ادمین‌ها
        io.to(room).emit('user_status', {
          session_id,
          isOnline: true,
          last_active: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error in join_session:', err);
      }
    });

    // 💬 ارسال پیام
    socket.on('send_message', async (data) => {
      if (!userRoom || !data.message?.trim()) return;

      const { sender_type = 'guest', session_id: dataSessionId, message, timestamp } = data;
      const sessionIdToUse = dataSessionId || userSession;

      try {
        const [rooms] = await pool.execute('SELECT id FROM chat_rooms WHERE room_code = ?', [userRoom]);
        if (!rooms.length) return;
        const roomId = rooms[0].id;
        const messageId = uuidv4();

        await pool.execute(
          'INSERT INTO messages (message_id, room_id, session_id, sender_type, message, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [messageId, roomId, sessionIdToUse, sender_type, message, timestamp || new Date().toISOString()]
        );

        await pool.execute('UPDATE user_sessions SET last_active = NOW() WHERE session_id = ?', [sessionIdToUse]);

        const msg = {
          ...data,
          message_id: messageId,
          room_id: roomId,
          room: userRoom,
          session_id: sessionIdToUse,
          timestamp: timestamp || new Date().toISOString(),
        };

        socket.emit('receive_message', msg);
        if (sender_type === 'admin') io.to(`${userRoom}:${sessionIdToUse}`).emit('receive_message', msg);
        else io.to(userRoom).emit('receive_message', msg);
      } catch (err) {
        console.error('Error in send_message:', err);
      }
    });

    // ⌨️ در حال تایپ
    socket.on('user_typing', ({ name }) => {
      if (userRoom && userSession)
        socket.to(userRoom).except(`${userRoom}:${userSession}`).emit('user_typing', { name, session_id: userSession });
    });

    // 🧑‍💼 ادمین آنلاین شد
socket.on('admin_connect', ({ room, adminId }) => {
  adminStatus.set(`${room}:${adminId}`, Date.now());
  io.to(room).emit('admin_status', { isOnline: true }); // به همه کاربران ویجت
});

// در فایل server.ts
socket.on('disconnect', async () => {
  if (!userRoom || !userSession) return;

  try {
    const count = (onlineUsers.get(userSession) || 1) - 1;

    if (count <= 0) {
      onlineUsers.delete(userSession);

      const [rows] = await pool.execute('SELECT id FROM chat_rooms WHERE room_code = ?', [userRoom]);
      if (rows.length > 0) {
        const roomId = rows[0].id;

        // همیشه last_active را آپدیت کن (حتی اگر قبلاً آپدیت شده)
        await pool.execute(
          'UPDATE user_sessions SET last_active = NOW() WHERE room_id = ? AND session_id = ?',
          [roomId, userSession]
        );

        const offlineTime = new Date().toISOString();

        // اطلاع فوری به ادمین‌ها
        io.to(userRoom).emit('user_status', {
          session_id: userSession,
          isOnline: false,
          last_active: offlineTime,
        });

        console.log(`User ${userSession} went offline at ${offlineTime}`);
      }
    } else {
      onlineUsers.set(userSession, count);
    }
  } catch (err) {
    console.error('Error on disconnect:', err);
  }
});

  });

  // بررسی وضعیت ادمین‌ها (هر 30 ثانیه)
  setInterval(() => {
    const now = Date.now();
    for (const [key, time] of adminStatus.entries()) {
      if (now - time > 600000) {
        const [room] = key.split(':');
        adminStatus.delete(key);
        io.to(room).emit('admin_status', { isOnline: false });
      }
    }
  }, 30000);

  server.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));
});
