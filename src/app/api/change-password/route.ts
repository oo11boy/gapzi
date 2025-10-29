// app/api/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { comparePassword, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userId } = verifyToken(token);
    const { current_password, new_password } = await req.json();

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'فیلدها الزامی هستند' }, { status: 400 });
    }

    // دریافت رمز فعلی
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    const user = (rows as any[])[0];
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    // بررسی رمز فعلی
    const isValid = await comparePassword(current_password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'رمز عبور فعلی اشتباه است' }, { status: 400 });
    }

    // هش کردن رمز جدید
    const hash = await hashPassword(new_password);

    // به‌روزرسانی
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    return NextResponse.json({ message: 'رمز عبور با موفقیت تغییر کرد' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}