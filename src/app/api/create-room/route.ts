import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { site_url } = await req.json();
  if (!site_url) return NextResponse.json({ error: 'Site URL is required' }, { status: 400 });

  try {
    const { userId } = verifyToken(token);
    const roomCode = crypto.randomBytes(16).toString('hex');

    await pool.query('INSERT INTO chat_rooms (user_id, room_code, site_url) VALUES (?, ?, ?)', [
      userId,
      roomCode,
      site_url,
    ]);

    const embedCode = `<script src="http://localhost:3000/chat-widget.js?room=${roomCode}"></script>`;

    return NextResponse.json({ embedCode, roomCode }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}