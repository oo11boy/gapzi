import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

/* -------------------------------
   TYPES
--------------------------------*/
interface MetadataRow extends RowDataPacket {
  id: number;
  session_id: string;
  room_id: number;
  ip_address: string;
  referrer: string;
  current_page: string;
  page_history: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  device_type: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
}

/* -------------------------------
   CORS HEADERS
--------------------------------*/
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/* -------------------------------
   HELPER: دریافت IP واقعی کاربر
--------------------------------*/
function getClientIp(req: NextRequest): string {
  const headers = req.headers;
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // در محیط local
  return '127.0.0.1';
}

/* -------------------------------
   HELPER: دریافت کشور و شهر از IP
   از ipwho.is استفاده می‌کنیم (بدون نیاز به key)
--------------------------------*/
async function getGeoInfo(ip: string) {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return { country: 'لوکال', city: 'لوکال' };
  }

  try {
    const res = await fetch(`https://ipwho.is/${ip}`, { next: { revalidate: 3600 } }); // cache 1h
    const data = await res.json();

    if (!data.success) throw new Error('Geo lookup failed');
    return {
      country: data.country || 'نامشخص',
      city: data.city || 'نامشخص',
    };
  } catch (err) {
    console.warn('Geo API error:', err);
    return { country: 'نامشخص', city: 'نامشخص' };
  }
}

/* -------------------------------
   POST: ثبت متادیتا و GeoIP
--------------------------------*/
export async function POST(req: NextRequest) {
  try {
    const { room, session_id, name, email, metadata } = await req.json();

    if (!room || !session_id || !metadata) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: corsHeaders });
    }

    // پیدا کردن room
    const [rooms] = await pool.query<RowDataPacket[]>('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
    const roomId = (rooms as any[])[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
    }

    // IP و Geo
    const ip = metadata.ip_address || getClientIp(req);
    const { country, city } = await getGeoInfo(ip);

    // ذخیره session (در صورت وجود، به‌روزرسانی)
    await pool.query(
      `INSERT INTO user_sessions (session_id, name, email, room_id, room_code)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = ?, email = ?, last_active = NOW()`,
      [session_id, name, email, roomId, room, name, email]
    );

    // ذخیره metadata
    await pool.query(
      `INSERT INTO user_metadata 
        (session_id, room_id, ip_address, referrer, current_page, page_history, country, city, browser, os, device_type, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ip_address = VALUES(ip_address),
         referrer = VALUES(referrer),
         current_page = VALUES(current_page),
         page_history = VALUES(page_history),
         country = VALUES(country),
         city = VALUES(city),
         browser = VALUES(browser),
         os = VALUES(os),
         device_type = VALUES(device_type),
         user_agent = VALUES(user_agent),
         updated_at = NOW()`,
      [
        session_id,
        roomId,
        ip,
        metadata.referrer || 'مستقیم',
        metadata.current_page || '',
        JSON.stringify(metadata.page_history || []),
        country,
        city,
        metadata.browser || '',
        metadata.os || '',
        metadata.device_type || '',
        metadata.user_agent || '',
      ]
    );

    return NextResponse.json({ success: true, ip, country, city }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error saving user metadata:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

/* -------------------------------
   GET: واکشی اطلاعات کاربر
--------------------------------*/
export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const session_id = req.nextUrl.searchParams.get('session_id');

  if (!room || !session_id) {
    return NextResponse.json({ error: 'Missing room or session_id' }, { status: 400, headers: corsHeaders });
  }

  try {
    const [rooms] = await pool.query<RowDataPacket[]>('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
    const roomId = (rooms as any[])[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
    }

    const [rows] = await pool.query<MetadataRow[]>(
      'SELECT * FROM user_metadata WHERE room_id = ? AND session_id = ? ORDER BY updated_at DESC LIMIT 1',
      [roomId, session_id]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Metadata not found' }, { status: 404, headers: corsHeaders });
    }

    const meta = rows[0];
    meta.page_history = meta.page_history ? JSON.parse(meta.page_history) : [];

    return NextResponse.json(meta, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching user metadata:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

/* -------------------------------
   OPTIONS: برای CORS
--------------------------------*/
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
