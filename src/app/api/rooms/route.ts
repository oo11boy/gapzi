import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userId } = verifyToken(token);
    const [rooms] = await pool.query('SELECT * FROM chat_rooms WHERE user_id = ?', [userId]);
    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}