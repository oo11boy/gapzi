import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface User extends RowDataPacket {
  session_id: string;
  name: string;
  email: string;
  last_active: string;
  room_id: number;
  newMessageCount: number;
}

// تابع تبدیل تاریخ به جمله مشابه تلگرام
function formatLastSeen(lastActive: string): string {
  const now = new Date();
  const last = new Date(lastActive);
  const diff = Math.floor((now.getTime() - last.getTime()) / 1000);

  if (diff < 60) return 'آخرین بازدید چند لحظه پیش';
  if (diff < 3600) return `آخرین بازدید ${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `آخرین بازدید ${Math.floor(diff / 3600)} ساعت پیش`;

  const days = Math.floor(diff / 86400);
  if (days === 1) return 'دیروز';
  if (days < 7) return `${days} روز پیش`;
  return last.toLocaleDateString('fa-IR');
}

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get('room');
  const widgetMode = req.nextUrl.searchParams.get('widget') === 'true';
  const token = req.cookies.get('token')?.value;

  if (!roomCode) {
    return NextResponse.json({ error: 'Missing room' }, { status: 400, headers: corsHeaders });
  }

  try {
    // ========================================
    // حالت ویجت: فقط وضعیت ادمین (بدون توکن)
    // ========================================
    if (widgetMode) {
      const [roomRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM chat_rooms WHERE room_code = ?',
        [roomCode]
      );

      if (roomRows.length === 0) {
        return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
      }

      const roomId = roomRows[0].id;

      // آخرین فعالیت در این اتاق (ادمین یا کاربر)
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT last_active FROM user_sessions WHERE room_id = ? ORDER BY last_active DESC LIMIT 1`,
        [roomId]
      );

      const lastActive = rows[0]?.last_active || null;
      const now = new Date();
      const diffMinutes = lastActive
        ? Math.floor((now.getTime() - new Date(lastActive).getTime()) / (1000 * 60))
        : null;

      const isOnline = diffMinutes !== null && diffMinutes < 10;

      return NextResponse.json(
        {
          isOnline,
          lastSeen: isOnline ? 'آنلاین' : 'آخرین بازدید به تازگی',
          lastActive,
          diffMinutes,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ========================================
    // حالت داشبورد ادمین: نیاز به توکن
    // ========================================
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { userId, role } = verifyToken(token);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403, headers: corsHeaders });
    }

    const [roomRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM chat_rooms WHERE room_code = ? AND user_id = ?',
      [roomCode, userId]
    );

    if (roomRows.length === 0) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
    }

    const roomId = roomRows[0].id;

    const [rows] = await pool.query<User[]>(
      `
      SELECT 
        us.session_id,
        us.name,
        us.email,
        us.last_active,
        (SELECT COUNT(*) FROM messages m 
         WHERE m.room_id = us.room_id 
         AND m.session_id = us.session_id 
         AND m.is_read = FALSE 
         AND m.sender_type != 'admin') AS newMessageCount
      FROM user_sessions us
      WHERE us.room_id = ?
      ORDER BY us.last_active DESC
      `,
      [roomId]
    );

    const now = new Date();

    const users = rows.map((user) => {
      const lastActive = new Date(user.last_active);
      const diffSeconds = Math.floor((now.getTime() - lastActive.getTime()) / 1000);
      const isOnline = diffSeconds < 25; // 25 ثانیه

      return {
        session_id: user.session_id,
        name: user.name,
        email: user.email,
        isOnline,
        newMessageCount: user.newMessageCount || 0,
        last_active: user.last_active,
        last_seen_text: isOnline ? 'آنلاین' : formatLastSeen(user.last_active),
      };
    });

    return NextResponse.json(users, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('Error in /api/users:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}