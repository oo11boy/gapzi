// server.js
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

const adminStatus = new Map(); // Map<room:adminId, timestamp>

app.prepare().then(() => {
  const server = createServer(handle);
  const io = new Server(server, {
    cors: { origin: ['http://localhost:3000'], methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    let userRoom = null;
    let userSession = null;

    socket.on('join_session', async ({ room, session_id }) => {
      if (!room || !session_id) return;

      userRoom = room;
      userSession = session_id;

      socket.join(room);
      if (!session_id.startsWith('admin-') && session_id !== 'admin-global') {
        socket.join(`${room}:${session_id}`);
      }

      try {
        const [rows] = await pool.execute(
          'SELECT id FROM chat_rooms WHERE room_code = ?',
          [room]
        );
        if (!rows.length) return socket.emit('error', 'Invalid room');

        await pool.execute(
          'UPDATE user_sessions SET last_active = NOW() WHERE room_id = ? AND session_id = ?',
          [rows[0].id, session_id]
        );

        const isAdminOnline = Array.from(adminStatus.entries())
          .some(([k, t]) => k.startsWith(`${room}:`) && Date.now() - t < 600000);

        socket.emit('admin_status', { isOnline: isAdminOnline });
        io.to(room).emit('user_status', { session_id, isOnline: true });
      } catch (err) {
        console.error('Error in join_session:', err);
      }
    });

    socket.on('send_message', async (data) => {
      if (!userRoom || !userSession) return;

      const { message, sender, sender_type = 'guest', timestamp, session_id: dataSessionId } = data;
      if (!message?.trim()) return;

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

        await pool.execute(
          'UPDATE user_sessions SET last_active = NOW() WHERE session_id = ?',
          [sessionIdToUse]
        );

        const msg = {
          ...data,
          message_id: messageId,
          room_id: roomId,
          room: userRoom,
          session_id: sessionIdToUse,
          timestamp: timestamp || new Date().toISOString(),
        };

        // ارسال به فرستنده
        socket.emit('receive_message', msg);

        if (sender_type === 'admin') {
          // فقط به کاربر مقصد
          io.to(`${userRoom}:${sessionIdToUse}`).emit('receive_message', msg);
        } else {
          // به همه ادمین‌ها در room
          io.to(userRoom).emit('receive_message', msg);
        }

      } catch (err) {
        console.error('Error in send_message:', err);
      }
    });

    socket.on('user_typing', async ({ name }) => {
      if (!userRoom || !userSession) return;
      socket.to(userRoom).except(`${userRoom}:${userSession}`).emit('user_typing', { name, session_id: userSession });
    });

    socket.on('admin_connect', ({ room, adminId }) => {
      adminStatus.set(`${room}:${adminId}`, Date.now());
      io.to(room).emit('admin_status', { isOnline: true });
    });

    socket.on('disconnect', () => {
      if (userRoom && userSession) {
        setTimeout(() => {
          io.to(userRoom).emit('user_status', { session_id: userSession, isOnline: false });
        }, 120000);
      }
    });
  });

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

  server.listen(3000, () => console.log('Server running on http://localhost:3000'));
});