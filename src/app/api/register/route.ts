import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { hashPassword } from '../../../lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'User exists' }, { status: 409 });
    }

    const hash = await hashPassword(password);
    await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);

    return NextResponse.json({ message: 'Registered' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}