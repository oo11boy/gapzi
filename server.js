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
  connectionLimit: 10,
  queueLimit: 0,
});

// ذخیره زمان آخرین فعالیت ادمین‌ها
const adminLastActive = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: '*', // در production آدرس دامنه واقعی را تنظیم کنید
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`✅ New socket connected: ${socket.id}`);

    socket.on('admin_connect', async ({ room, adminId }) => {
      adminLastActive.set(`${room}:${adminId}`, Date.now());
      io.to(room).emit('admin_status', { isOnline: true });
    });

    socket.on('join_session', async ({ room, session_id }) => {
      console.log(`🔹 Socket joined: ${socket.id}, Room: ${room}, Session: ${session_id}`);
      socket.join(`${room}:${session_id}`);
      socket.join(room);

      try {
        const [rooms] = await pool.query('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
        const roomId = rooms[0]?.id;
        if (!roomId) {
          socket.emit('error', { message: 'Invalid room' });
          return;
        }

        const adminActive = [...adminLastActive.keys()].some(
          (key) => key.startsWith(`${room}:`) && Date.now() - adminLastActive.get(key) < 10 * 60 * 1000
        );
        socket.emit('admin_status', { isOnline: adminActive });
      } catch (error) {
        console.error('⚠️ Error joining session:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('send_message', async ({ room, message, sender, sender_type, session_id, timestamp }) => {
      console.log('💬 Message received:', { room, message, sender, sender_type, session_id, timestamp });

      try {
        const [rooms] = await pool.query('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
        const roomId = rooms[0]?.id;
        if (!roomId) {
          console.error('❌ Room not found:', room);
          socket.emit('error', { message: 'Invalid room' });
          return;
        }

        const messageId = uuidv4();
        const senderType = sender_type || (sender === 'Admin' ? 'admin' : 'guest');

        await pool.query(
          'INSERT INTO messages (message_id, room_id, sender_type, message, session_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [messageId, roomId, senderType, message, session_id, timestamp || new Date().toISOString()]
        );

        console.log('💾 Message saved in DB with ID:', messageId);

        if (senderType === 'admin') {
          const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [sender]);
          if (users[0]?.id) {
            adminLastActive.set(`${room}:${users[0].id}`, Date.now());
            io.to(room).emit('admin_status', { isOnline: true });
          } else {
            console.warn(`⚠️ Admin user "${sender}" not found in users table`);
          }
        }

        const msg = {
          room,
          sender,
          sender_type: senderType,
          message,
          session_id,
          timestamp: timestamp || new Date().toISOString(),
          message_id: messageId,
        };

        socket.emit('receive_message', msg);
        socket.to(room).except(`${room}:${session_id}`).emit('receive_message', msg);
        socket.to(`${room}:${session_id}`).except(socket.id).emit('receive_message', msg);
      } catch (error) {
        console.error('⚠️ Error saving message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('user_typing', ({ room, name, session_id }) => {
      socket.to(room).except(`${room}:${session_id}`).emit('user_typing', { name, session_id });
      socket.to(`${room}:${session_id}`).except(socket.id).emit('user_typing', { name, session_id });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [key, lastActive] of adminLastActive) {
      if (now - lastActive > 10 * 60 * 1000) {
        adminLastActive.delete(key);
        const room = key.split(':')[0];
        io.to(room).emit('admin_status', { isOnline: false });
      }
    }
  }, 60000);

  const PORT = 3000;
  server.listen(PORT, (err) => {
    if (err) {
      console.error('❌ Server failed to start:', err);
      throw err;
    }
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});