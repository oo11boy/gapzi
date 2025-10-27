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

        // به‌روزرسانی last_active هنگام اتصال
        await pool.query(
          'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = ? AND room_id = ?',
          [session_id, roomId]
        );

        const [updatedSession] = await pool.query(
          'SELECT last_active FROM user_sessions WHERE session_id = ? AND room_id = ?',
          [session_id, roomId]
        );

        // ارسال وضعیت به تمام کلاینت‌های متصل به اتاق
        io.to(room).emit('user_status', {
          session_id,
          last_active: updatedSession[0]?.last_active,
          isOnline: true,
        });

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

        // به‌روزرسانی last_active
        await pool.query(
          'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = ? AND room_id = ?',
          [session_id, roomId]
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

        const [updatedSession] = await pool.query(
          'SELECT last_active FROM user_sessions WHERE session_id = ? AND room_id = ?',
          [session_id, roomId]
        );

        // ارسال وضعیت کاربر به تمام کلاینت‌های متصل به اتاق
        io.to(room).emit('user_status', {
          session_id,
          last_active: updatedSession[0]?.last_active,
          isOnline: true,
        });

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

    socket.on('user_typing', async ({ room, name, session_id }) => {
      try {
        const [rooms] = await pool.query('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
        const roomId = rooms[0]?.id;
        if (!roomId) {
          socket.emit('error', { message: 'Invalid room' });
          return;
        }

        // به‌روزرسانی last_active هنگام تایپ
        await pool.query(
          'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE session_id = ? AND room_id = ?',
          [session_id, roomId]
        );

        const [updatedSession] = await pool.query(
          'SELECT last_active FROM user_sessions WHERE session_id = ? AND room_id = ?',
          [session_id, roomId]
        );

        // ارسال وضعیت کاربر به تمام کلاینت‌های متصل به اتاق
        io.to(room).emit('user_status', {
          session_id,
          last_active: updatedSession[0]?.last_active,
          isOnline: true,
        });

        socket.to(room).except(`${room}:${session_id}`).emit('user_typing', { name, session_id });
        socket.to(`${room}:${session_id}`).except(socket.id).emit('user_typing', { name, session_id });
      } catch (error) {
        console.error('⚠️ Error in user_typing:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  // بررسی دوره‌ای برای آفلاین کردن کاربران غیرفعال
  setInterval(async () => {
    try {
      const [sessions] = await pool.query(
        'SELECT session_id, room_id, last_active, room_code FROM user_sessions WHERE last_active < ?',
        [new Date(Date.now() - 2 * 60 * 1000).toISOString()]
      );

      for (const session of sessions) {
        io.to(session.room_code).emit('user_status', {
          session_id: session.session_id,
          last_active: session.last_active,
          isOnline: false,
        });
      }
    } catch (error) {
      console.error('⚠️ Error checking offline users:', error);
    }
  }, 30000); // هر 30 ثانیه بررسی می‌شود

  const PORT = 3000;
  server.listen(PORT, (err) => {
    if (err) {
      console.error('❌ Server failed to start:', err);
      throw err;
    }
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});