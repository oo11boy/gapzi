// server.js
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const { v4: uuidv4 } = require('uuid'); // برای تولید شناسه یکتا

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const pool = require('./src/lib/db').default;

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));

  const io = new Server(server, {
    cors: {
      origin: '*', // در حالت production آدرس دامنه واقعی را قرار بده
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ New socket connected:', socket.id);

    socket.on('join_session', ({ room, session_id }) => {
      console.log('🔹 Socket joined:', socket.id, 'Room:', room, 'Session:', session_id);
      socket.join(`${room}:${session_id}`); // اتاق مخصوص کاربر
      socket.join(room); // اتاق عمومی برای ادمین‌ها
    });

    socket.on('send_message', async ({ room, message, sender, session_id, timestamp }) => {
      console.log('💬 Message received:', { room, message, sender, session_id, timestamp });

      try {
        // بررسی وجود اتاق
        const [rooms] = await pool.query(
          'SELECT id FROM chat_rooms WHERE room_code = ?',
          [room]
        );
        const roomId = rooms[0]?.id;
        if (!roomId) {
          console.error('❌ Room not found:', room);
          return;
        }

        // ایجاد شناسه یکتا برای پیام
        const messageId = uuidv4();

        // درج در دیتابیس
        await pool.query(
          'INSERT INTO messages (message_id, room_id, sender_type, message, session_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [
            messageId,
            roomId,
            sender === 'Admin' ? 'owner' : 'guest',
            message,
            session_id,
            timestamp || new Date().toISOString(),
          ]
        );

        console.log('💾 Message saved in DB with ID:', messageId);

        const msg = {
          room,
          sender,
          message,
          session_id,
          timestamp: timestamp || new Date().toISOString(),
          message_id: messageId,
        };

        // ارسال پیام برای کاربران و ادمین‌ها
        socket.emit('receive_message', msg); // خودش پیام را ببیند
        socket.to(room).except(`${room}:${session_id}`).emit('receive_message', msg); // بقیه ادمین‌ها
        socket.to(`${room}:${session_id}`).except(socket.id).emit('receive_message', msg); // بقیه کاربران

      } catch (error) {
        console.error('⚠️ Socket error while saving message:', error);
      }
    });

    socket.on('user_typing', ({ room, name, session_id }) => {
      socket.to(room).except(`${room}:${session_id}`).emit('user_typing', { name, session_id });
      socket.to(`${room}:${session_id}`).except(socket.id).emit('user_typing', { name, session_id });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('🚀 Server running at http://localhost:3000');
  });
});
