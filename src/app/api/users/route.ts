import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

// Define interfaces for query results
import { RowDataPacket } from 'mysql2';

interface Room extends RowDataPacket {
  id: number;
}

interface User extends RowDataPacket {
  session_id: string;
  name: string;
  email: string;
  room_id: number;
  newMessageCount: string | number; // newMessageCount may come as string from SQL
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }

  try {
    const { userId } = verifyToken(token);
    const roomCode = req.nextUrl.searchParams.get('room');
    if (!roomCode) {
      return NextResponse.json(
        { error: 'Missing room' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Type the rooms query result
    const [rooms] = await pool.query<Room[]>('SELECT id FROM chat_rooms WHERE room_code = ? AND user_id = ?', [
      roomCode,
      userId,
    ]);
    const roomId = rooms[0]?.id;
    if (!roomId) {
      return NextResponse.json(
        { error: 'Invalid room or unauthorized' },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Type the users query result
    const [users] = await pool.query<User[]>(
      `SELECT us.session_id, us.name, us.email, us.room_id,
              (SELECT COUNT(*) FROM messages m 
               WHERE m.room_id = us.room_id 
               AND m.session_id = us.session_id 
               AND m.is_read = FALSE 
               AND m.sender_type != 'owner') as newMessageCount
       FROM user_sessions us
       WHERE us.room_id = ?`,
      [roomId]
    );

    return NextResponse.json(
      users.map((user) => ({
        ...user,
        room_code: roomCode,
        newMessageCount: parseInt(String(user.newMessageCount)) || 0, // Ensure string is converted to number
      })),
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
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