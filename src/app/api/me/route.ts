// app/api/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const { userId, role } = verifyToken(token);

    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.username, u.email, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    const user = (rows as any[])[0];
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        username: user.username,
        email: user.email,
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        initials: (
          (user.first_name?.[0] || '') + (user.last_name?.[0] || user.username[0] || '')
        ).toUpperCase(),
        isOnline: true, // ادمین همیشه آنلاین فرض می‌شه
      },
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}