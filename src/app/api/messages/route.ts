import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const roomCode = req.nextUrl.searchParams.get('room');
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!roomCode || !sessionId) {
      return NextResponse.json([], { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const [rooms] = await pool.query('SELECT id FROM chat_rooms WHERE room_code = ?', [roomCode]);
    const roomId = (rooms as any[])[0]?.id;
    if (!roomId) {
      return NextResponse.json([], { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const [messages] = await pool.query(
      `SELECT m.message, m.timestamp, 
              CASE 
                WHEN m.sender_type = 'owner' THEN 'Admin'
                ELSE us.name 
              END as sender
       FROM messages m
       LEFT JOIN user_sessions us ON m.session_id = us.session_id AND m.room_id = us.room_id
       WHERE m.room_id = ? AND m.session_id = ?
       ORDER BY m.timestamp`,
      [roomId, sessionId]
    );

    return NextResponse.json(messages || [], { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}