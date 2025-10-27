import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import { RowDataPacket } from 'mysql2';

interface Room extends RowDataPacket {
  id: number;
  user_id: number;
}

interface User extends RowDataPacket {
  session_id: string;
  name: string;
  email: string;
  room_id: number;
  last_active: string;
  newMessageCount: string | number;
  role_name: string;
}

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get('room');
  const isWidget = req.nextUrl.searchParams.get('widget') === 'true';
  const token = req.cookies.get('token')?.value;

  if (!roomCode) {
    return NextResponse.json(
      { error: 'Missing room' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
    );
  }

  try {
    if (isWidget || !token) {
      const [rooms] = await pool.query<Room[]>('SELECT id, user_id FROM chat_rooms WHERE room_code = ?', [roomCode]);
      const room = rooms[0];
      if (!room) {
        return NextResponse.json(
          { error: 'Invalid room' },
          { status: 404, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
        );
      }

      const [adminSessions] = await pool.query<User[]>(
        `SELECT us.last_active, r.name as role_name
         FROM user_sessions us
         JOIN chat_rooms cr ON us.room_id = ? AND cr.id = us.room_id
         JOIN users u ON cr.user_id = u.id
         JOIN roles r ON u.role_id = r.id
         WHERE us.room_id = ? AND r.name = 'admin'
         LIMIT 1`,
        [room.id, room.id]
      );

      if (adminSessions.length === 0) {
        return NextResponse.json(
          { last_active: null, role: 'admin', room_code: roomCode },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
        );
      }

      return NextResponse.json(
        adminSessions.map((user) => ({
          last_active: user.last_active,
          role: user.role_name,
          room_code: roomCode,
        })),
        { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
      );
    }

    const { userId, role } = verifyToken(token);
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admins only' },
        { status: 403, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
      );
    }

    const [rooms] = await pool.query<Room[]>('SELECT id FROM chat_rooms WHERE room_code = ? AND user_id = ?', [roomCode, userId]);
    const roomId = rooms[0]?.id;
    if (!roomId) {
      return NextResponse.json(
        { error: 'Invalid room or unauthorized' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
      );
    }

    const [users] = await pool.query<User[]>(
      `SELECT us.session_id, us.name, us.email, us.room_id, us.last_active,
              (SELECT COUNT(*) FROM messages m 
               WHERE m.room_id = us.room_id 
               AND m.session_id = us.session_id 
               AND m.is_read = FALSE 
               AND m.sender_type != 'admin') as newMessageCount,
              r.name as role_name
       FROM user_sessions us
       JOIN chat_rooms cr ON us.room_id = ?
       JOIN users u ON cr.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE us.room_id = ?`,
      [roomId, roomId]
    );

    return NextResponse.json(
      users.map((user) => ({
        ...user,
        room_code: roomCode,
        newMessageCount: parseInt(String(user.newMessageCount)) || 0,
        isOnline: new Date(user.last_active).getTime() > Date.now() - 2 * 60 * 1000, // آنلاین اگر در 2 دقیقه گذشته فعال بوده
      })),
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}