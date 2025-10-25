import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';
import { verifyToken } from '@/lib/auth';
import pool from '@/lib/db';


interface Room extends RowDataPacket {
  id: number;
}

export async function POST(req: NextRequest) {
  try {
    const { roomCode, sessionId } = await req.json();
    if (!roomCode || !sessionId) {
      return NextResponse.json({ error: 'Room code and session ID are required' }, { status: 400 });
    }

    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = verifyToken(token);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });

    const [rooms] = await pool.query<Room[]>('SELECT id FROM chat_rooms WHERE room_code = ?', [roomCode]);
    const roomId = rooms[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE room_id = ? AND session_id = ? AND sender_type != ?',
      [roomId, sessionId, 'admin']
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}