// app/api/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userId, role } = verifyToken(token);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });

    const [rooms] = await pool.query('SELECT * FROM chat_rooms WHERE user_id = ?', [userId]);
    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { site_url } = await req.json();
    if (!site_url) return NextResponse.json({ error: 'Site URL is required' }, { status: 400 });

    const { userId, role } = verifyToken(token);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });

    const roomCode = crypto.randomBytes(16).toString('hex');
    await pool.query('INSERT INTO chat_rooms (user_id, room_code, site_url) VALUES (?, ?, ?)', [
      userId,
      roomCode,
      site_url,
    ]);

    const embedCode = `<script src="${process.env.NEXT_PUBLIC_BASE_URL}/chat-widget.js?room=${roomCode}"></script>`;
    return NextResponse.json({ embedCode, roomCode, site_url }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}