import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { first_name, last_name, username, email, password } = await req.json(); // role حذف شد

    if (!first_name || !last_name || !username || !email || !password) {
      return NextResponse.json({ error: 'تمام فیلدها الزامی هستند' }, { status: 400 });
    }

    // بررسی تکراری نبودن ایمیل یا نام کاربری
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'کاربر با این نام کاربری یا ایمیل وجود دارد' }, { status: 409 });
    }

    // همیشه role_id = 1 استفاده می‌شود
    const roleId = 1;

    const hash = await hashPassword(password);
    await pool.query(
      'INSERT INTO users (first_name, last_name, email, username, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?)',
      [first_name, last_name, email, username, hash, roleId]
    );

    return NextResponse.json({ message: 'ثبت‌نام با موفقیت انجام شد' }, { status: 201 });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}