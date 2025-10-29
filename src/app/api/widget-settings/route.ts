// app/api/widget-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { verifyToken } from '@/lib/auth';

interface WidgetSettings extends RowDataPacket {
  primary_color: string;
  secondary_color: string;
  chat_title: string;
  placeholder_text: string;
  welcome_message: string | null;
  font_family: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get('room');
  if (!roomCode) {
    return NextResponse.json({ error: 'Missing room code' }, { status: 400, headers: corsHeaders });
  }

  try {
    const [rooms] = await pool.query<RowDataPacket[]>('SELECT id FROM chat_rooms WHERE room_code = ?', [roomCode]);
    const roomId = rooms[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
    }

    const [settings] = await pool.query<WidgetSettings[]>(
      'SELECT primary_color, secondary_color, chat_title, placeholder_text, welcome_message, font_family FROM widget_settings WHERE room_id = ?',
      [roomId]
    );

    if (settings.length === 0) {
      return NextResponse.json(
        {
          primary_color: '#007bff',
          secondary_color: '#ffffff',
          chat_title: 'چت زنده',
          placeholder_text: 'پیام خود را بنویسید...',
          welcome_message: null,
          font_family: 'Vazirmatn',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(settings[0], { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching widget settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userId, role } = verifyToken(token);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });

    const { room_code, primary_color, secondary_color, chat_title, placeholder_text, welcome_message, font_family } = await req.json();
    if (!room_code) return NextResponse.json({ error: 'Room code is required' }, { status: 400 });

    const [rooms] = await pool.query<RowDataPacket[]>('SELECT id FROM chat_rooms WHERE room_code = ? AND user_id = ?', [room_code, userId]);
    const roomId = rooms[0]?.id;
    if (!roomId) return NextResponse.json({ error: 'Invalid room or unauthorized' }, { status: 404 });

    const [existing] = await pool.query('SELECT id FROM widget_settings WHERE room_id = ?', [roomId]);
    if ((existing as any[]).length > 0) {
      await pool.query(
        'UPDATE widget_settings SET primary_color = ?, secondary_color = ?, chat_title = ?, placeholder_text = ?, welcome_message = ?, font_family = ? WHERE room_id = ?',
        [primary_color || '#007bff', secondary_color || '#ffffff', chat_title || 'چت زنده', placeholder_text || 'پیام خود را بنویسید...', welcome_message, font_family || 'Vazirmatn', roomId]
      );
    } else {
      await pool.query(
        'INSERT INTO widget_settings (room_id, primary_color, secondary_color, chat_title, placeholder_text, welcome_message, font_family) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [roomId, primary_color || '#007bff', secondary_color || '#ffffff', chat_title || 'چت زنده', placeholder_text || 'پیام خود را بنویسید...', welcome_message, font_family || 'Vazirmatn']
      );
    }

    return NextResponse.json({ message: 'Settings saved' }, { status: 200 });
  } catch (error) {
    console.error('Error saving widget settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}