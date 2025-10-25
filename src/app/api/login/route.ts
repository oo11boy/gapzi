import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { comparePassword, generateToken } from '../../../lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const [users] = await pool.query('SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = ?', [username]);
    const user = (users as any[])[0];
    if (!user || !(await comparePassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user.id, user.role);
    const response = NextResponse.json({ token }, { status: 200 });
    response.cookies.set('token', token, { httpOnly: true });
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}