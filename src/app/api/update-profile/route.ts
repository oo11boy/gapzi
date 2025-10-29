// app/api/update-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userId } = verifyToken(token);
    const { first_name, last_name, username, email } = await req.json();

    // بررسی تکراری نبودن نام کاربری و ایمیل
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email || '', userId]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { error: 'نام کاربری یا ایمیل قبلاً استفاده شده است' },
        { status: 409 }
      );
    }

    await pool.query(
      'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ? WHERE id = ?',
      [first_name || null, last_name || null, username, email || null, userId]
    );

    return NextResponse.json({ message: 'اطلاعات با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}