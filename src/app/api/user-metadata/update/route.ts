import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(req: NextRequest) {
  try {
    const { room, session_id, current_page, page_history } = await req.json();

    if (!room || !session_id || !current_page) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400, headers: corsHeaders });
    }

    const [rooms] = await pool.query<RowDataPacket[]>('SELECT id FROM chat_rooms WHERE room_code = ?', [room]);
    const roomId = (rooms as any[])[0]?.id;
    if (!roomId) {
      return NextResponse.json({ error: 'Invalid room' }, { status: 404, headers: corsHeaders });
    }

    await pool.query(
      'UPDATE user_metadata SET current_page = ?, page_history = ?, updated_at = NOW() WHERE session_id = ? AND room_id = ?',
      [current_page, JSON.stringify(page_history || []), session_id, roomId]
    );

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Error updating user metadata:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}