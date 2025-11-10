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

// نقشه کاربران آنلاین: session_id → تعداد اتصالات
const onlineUsers = new Map(); // <session_id, connectionCount>
const adminStatus = new Map(); // <room:adminId, lastPing>

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
    let activityInterval = null;

    // کاربر وارد جلسه شد
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

        // ثبت/آپدیت آخرین فعالیت
        await pool.execute(
          'INSERT INTO user_sessions (room_id, session_id, last_active) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_active = NOW()',
          [roomId, session_id]
        );

        // افزایش تعداد اتصالات
        const count = (onlineUsers.get(session_id) || 0) + 1;
        onlineUsers.set(session_id, count);

        // پینگ دوره‌ای برای به‌روزرسانی last_active (هر 25 ثانیه)
        activityInterval = setInterval(async () => {
          try {
            await pool.execute(
              'UPDATE user_sessions SET last_active = NOW() WHERE room_id = ? AND session_id = ?',
              [roomId, session_id]
            );
          } catch (err) {
            console.error('Activity ping failed:', err);
          }
        }, 25000);

        // ذخیره interval برای پاک کردن در disconnect
        socket.data.activityInterval = activityInterval;

        // اطلاع به ادمین: کاربر آنلاین است
        io.to(room).emit('user_status', {
          session_id,
          isOnline: true,
          last_active: new Date().toISOString(),
        });

      } catch (err) {
        console.error('Error in join_session:', err);
      }
    });

    // ارسال پیام
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

        // آپدیت last_active
        await pool.execute('UPDATE user_sessions_user_sessions SET last_active = NOW() WHERE session_id = ?', [sessionIdToUse]);

        const msg = {
          ...data,
          message_id: messageId,
          room: userRoom,
          session_id: sessionIdToUse,
          timestamp: timestamp || new Date().toISOString(),
        };

        socket.emit('receive_message', msg);
        if (sender_type === 'admin') {
          io.to(`${userRoom}:${sessionIdToUse}`).emit('receive_message', msg);
        } else {
          io.to(userRoom).emit('receive_message', msg);
        }
      } catch (err) {
        console.error('Error in send_message:', err);
      }
    });

    // در حال تایپ
    socket.on('user_typing', ({ name }) => {
      if (userRoom && userSession) {
        socket.to(userRoom).except(`${userRoom}:${userSession}`).emit('user_typing', {
          name,
          session_id: userSession,
        });
      }
    });

    // فعالیت دستی کاربر (از ویجت)
    socket.on('user_activity', async ({ room, session_id }) => {
      if (!room || !session_id) return;
      try {
        const [rows] = await pool.execute('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
        if (rows.length > 0) {
          await pool.execute(
            'UPDATE user_sessions SET last_active = NOW() WHERE room_id = ? AND session_id = ?',
            [rows[0].id, session_id]
          );
        }
      } catch (err) {
        console.error('user_activity error:', err);
      }
    });

    // ادمین متصل شد
    socket.on('admin_connect', ({ room, adminId }) => {
      adminStatus.set(`${room}:${adminId}`, Date.now());
      io.to(room).emit('admin_status', { isOnline: true });
    });

    // ویرایش پیام
    socket.on('edit_message', async (data) => {
      const { message_id, message, room, session_id } = data;
      if (!message_id || !message || !room || !session_id) {
        return socket.emit('error', 'Invalid edit data');
      }

      try {
        const [result] = await pool.execute(
          'UPDATE messages SET message = ?, edited = 1, updated_at = NOW() WHERE message_id = ?',
          [message, message_id]
        );

        if (result.affectedRows === 0) {
          return socket.emit('error', 'Message not found');
        }

        const [rows] = await pool.execute('SELECT created_at FROM messages WHERE message_id = ?', [message_id]);
        const originalTimestamp = rows[0]?.created_at || new Date().toISOString();

        const editData = {
          message_id,
          message,
          edited: true,
          timestamp: originalTimestamp,
          edited_at: new Date().toISOString(),
          room,
          session_id,
        };

        io.to(room).emit('message_edited', editData);
        io.to(`${room}:${session_id}`).emit('message_edited', editData);
      } catch (err) {
        console.error('Edit error:', err);
        socket.emit('error', 'Failed to edit message');
      }
    });

    // حذف پیام
    socket.on('delete_message', async ({ message_id, room }) => {
      try {
        await pool.execute('DELETE FROM messages WHERE message_id = ?', [message_id]);
        io.to(room).emit('message_deleted', { message_id });
      } catch (err) {
        console.error('Delete error:', err);
      }
    });

    // قطع اتصال
    socket.on('disconnect', async () => {
      if (!userRoom || !userSession) return;

      // پاک کردن interval
      if (socket.data.activityInterval) {
        clearInterval(socket.data.activityInterval);
      }

      try {
        const count = (onlineUsers.get(userSession) || 1) - 1;

        if (count <= 0) {
          onlineUsers.delete(userSession);

          const [rows] = await pool.execute('SELECT id FROM chat_rooms WHERE room_code = ?', [userRoom]);
          if (rows.length > 0) {
            const roomId = rows[0].id;
            const offlineTime = new Date().toISOString();

            await pool.execute(
              'UPDATE user_sessions SET last_active = ? WHERE room_id = ? AND session_id = ?',
              [offlineTime, roomId, userSession]
            );

            io.to(userRoom).emit('user_status', {
              session_id: userSession,
              isOnline: false,
              last_active: offlineTime,
            });

            console.log(`User ${userSession} went OFFLINE at ${offlineTime}`);
          }
        } else {
          onlineUsers.set(userSession, count);
        }
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    });
  });

  // بررسی وضعیت ادمین‌ها هر 30 ثانیه
  setInterval(() => {
    const now = Date.now();
    for (const [key, time] of adminStatus.entries()) {
      if (now - time > 600000) { // 10 دقیقه
        const [room] = key.split(':');
        adminStatus.delete(key);
        io.to(room).emit('admin_status', { isOnline: false });
      }
    }
  }, 30000);

  const port = 3000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);

  });
});