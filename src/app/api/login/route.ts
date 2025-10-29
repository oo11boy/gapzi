import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2'; // اضافه شد

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  role_id: number;
  role: string;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const [rows] = await pool.query<UserRow[]>(
      'SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = ?',
      [username]
    );

    const user = rows[0];
    if (!user || !(await comparePassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user.id, user.role);
    const response = NextResponse.json({ token }, { status: 200 });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}