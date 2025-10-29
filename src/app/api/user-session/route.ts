// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(req: NextRequest) {
  try {
    const { room, session_id, name, email } = await req.json();
    if (!room || !session_id || !name || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: corsHeaders });
    }

    const [rooms] = await pool.query('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
    const roomId = (rooms as any[])[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
    }

    const [existing] = await pool.query(
      'SELECT 1 FROM user_sessions WHERE room_id = ? AND session_id = ?',
      [roomId, session_id]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ message: 'Session already exists' }, { status: 200, headers: corsHeaders });
    }

    await pool.query('INSERT INTO user_sessions (room_id, session_id, name, email, room_code) VALUES (?, ?, ?, ?, ?)', [
      roomId,
      session_id,
      name,
      email,
      room,
    ]);

    return NextResponse.json({ message: 'Session created' }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error saving user session:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Session already exists for this room' }, { status: 409, headers: corsHeaders });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}