import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { hashPassword } from '../../../lib/auth';

export async function POST(req: NextRequest) {
  const { username, password, role } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'User exists' }, { status: 409 });
    }

    const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [role || 'user']);
    const roleId = (roles as any[])[0]?.id || 2; // Default to user role

    const hash = await hashPassword(password);
    await pool.query('INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)', [
      username,
      hash,
      roleId,
    ]);

    return NextResponse.json({ message: 'Registered' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}