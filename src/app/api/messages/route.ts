// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface Message extends RowDataPacket {
  id: number;
  message_id: string;
  room_id: number;
  session_id: string;
  sender_type: 'admin' | 'guest';
  message: string;
  created_at: string;  // تغییر از timestamp
  is_read: boolean;
  edited: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get('room');
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!roomCode || !sessionId) {
    return NextResponse.json({ error: 'Missing room or session_id' }, { status: 400, headers: corsHeaders });
  }

  try {
    const [rooms] = await pool.query<RowDataPacket[]>('SELECT id FROM chat_rooms WHERE room_code = ?', [roomCode]);
    const roomId = rooms[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
    }

    const query = `
      SELECT 
        id, message_id, room_id, session_id, sender_type, message, 
        created_at AS timestamp, is_read, edited
      FROM messages
      WHERE room_id = ? AND session_id = ?
      ORDER BY created_at ASC   -- فقط created_at
    `;
    const params = [roomId, sessionId];

    const [messages] = await pool.query<Message[]>(query, params);

    return NextResponse.json(
      messages.map((msg) => ({
        id: msg.id,
        message_id: msg.message_id,
        room_id: msg.room_id,
        session_id: msg.session_id,
        sender_type: msg.sender_type,
        message: msg.message,
        timestamp: msg.timestamp,
        is_read: !!msg.is_read,
        edited: !!msg.edited,
      })),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}