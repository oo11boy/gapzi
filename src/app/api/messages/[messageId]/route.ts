// app/api/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

interface MessageRow extends RowDataPacket {
  id: number;
  message_id: string;
  sender_type: 'admin' | 'guest';
  session_id: string;
  room_id: number;
  timestamp: string;
  message: string;
  user_id: number;
  edited?: 0 | 1;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// --- PATCH: ویرایش پیام ---
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: 'بدنه درخواست نامعتبر است (JSON مورد انتظار)' },
      { status: 400, headers: corsHeaders }
    );
  }

  const { message } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json(
      { error: 'پیام نمی‌تواند خالی باشد' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'احراز هویت لازم است' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { userId, role } = verifyToken(token);
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'دسترسی ممنوع: فقط ادمین' },
        { status: 403, headers: corsHeaders }
      );
    }

    const [rows] = await pool.query<MessageRow[]>(
      `SELECT m.*, cr.user_id 
       FROM messages m 
       JOIN chat_rooms cr ON m.room_id = cr.id 
       WHERE m.message_id = ?`,
      [messageId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: 'پیام یافت نشد' },
        { status: 404, headers: corsHeaders }
      );
    }

    const msg = rows[0];

    if (msg.sender_type === 'admin' && msg.user_id !== userId) {
      return NextResponse.json(
        { error: 'شما اجازه ویرایش این پیام را ندارید' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (msg.sender_type === 'guest') {
      const msgTime = new Date(msg.timestamp).getTime();
      const now = Date.now();
      const diffMinutes = (now - msgTime) / 60000;
      if (diffMinutes > 10) {
        return NextResponse.json(
          { error: 'مهلت ویرایش پیام گذشته است (حداکثر 10 دقیقه)' },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // فقط message و edited و updated_at آپدیت می‌شود
    await pool.query(
      `UPDATE messages 
       SET message = ?, edited = 1, updated_at = NOW()
       WHERE message_id = ?`,
      [message.trim(), messageId]
    );

    return NextResponse.json(
      {
        success: true,
        message: message.trim(),
        message_id: messageId,
        edited: true,
        timestamp: msg.created_at,  // زمان اصلی ارسال
        edited_at: new Date().toISOString(), // زمان ویرایش
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error editing message:', error);
    return NextResponse.json(
      { error: 'خطای داخلی سرور', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// --- DELETE: حذف پیام ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params; // await params

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'احراز هویت لازم است' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { userId, role } = verifyToken(token);
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'دسترسی ممنوع: فقط ادمین' },
        { status: 403, headers: corsHeaders }
      );
    }

    const [rows] = await pool.query<MessageRow[]>(
      `SELECT m.*, cr.user_id 
       FROM messages m 
       JOIN chat_rooms cr ON m.room_id = cr.id 
       WHERE m.message_id = ?`,
      [messageId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: 'پیام یافت نشد' },
        { status: 404, headers: corsHeaders }
      );
    }

    const msg = rows[0];

    // فقط ادمین مالک اتاق یا ادمین پیام خودش
    if (msg.sender_type === 'admin' && msg.user_id !== userId) {
      return NextResponse.json(
        { error: 'شما اجازه حذف این پیام را ندارید' },
        { status: 403, headers: corsHeaders }
      );
    }

    await pool.query('DELETE FROM messages WHERE message_id = ?', [messageId]);

    return NextResponse.json(
      { success: true, message_id: messageId },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'خطای داخلی سرور', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// --- OPTIONS: برای CORS ---
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}