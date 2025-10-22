import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const { room, session_id, name, email } = await req.json();
    if (!room || !session_id || !name || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const [rooms] = await pool.query('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
    const roomId = (rooms as any[])[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Invalid room' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // چک کردن وجود session_id برای این room
    const [existing] = await pool.query(
      'SELECT 1 FROM user_sessions WHERE room_id = ? AND session_id = ?',
      [roomId, session_id]
    );
    if ((existing as any[]).length > 0) {
      // session_id برای این room قبلاً وجود داره، می‌تونیم ادامه بدیم
      return NextResponse.json({ message: 'Session already exists' }, { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    await pool.query('INSERT INTO user_sessions (room_id, session_id, name, email) VALUES (?, ?, ?, ?)', [
      roomId,
      session_id,
      name,
      email,
    ]);

    return NextResponse.json({ message: 'Session created' }, { 
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: any) {
    console.error('Error saving user session:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Session already exists for this room' }, { 
        status: 409,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    return NextResponse.json({ error: 'Server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}