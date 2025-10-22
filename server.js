const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

console.log('Looking for db at:', require.resolve('./src/lib/db'));
const pool = require('./src/lib/db').default;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);

    socket.on('join_session', ({ room, session_id }) => {
      console.log('Socket', socket.id, 'joining session:', session_id, 'in room:', room);
      socket.join(`${room}:${session_id}`);
    });

    socket.on('send_message', async (data) => {
      const { room, message, sender, session_id } = data;
      console.log('Message received:', data);
      try {
        const [rooms] = await pool.query('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
        const roomId = rooms[0]?.id;
        if (!roomId) {
          console.error('Room not found:', room);
          return;
        }
        await pool.query(
          'INSERT INTO messages (room_id, sender_type, message, session_id) VALUES (?, ?, ?, ?)',
          [roomId, sender === 'Admin' ? 'owner' : 'guest', message, session_id]
        );
        console.log('Message saved to database:', { roomId, sender, message, session_id });
        io.to(`${room}:${session_id}`).emit('receive_message', { room, sender, message, session_id });
      } catch (error) {
        console.error('Socket error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});