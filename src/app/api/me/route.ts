// app/api/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const user = verifyToken(token);
    return NextResponse.json({ authenticated: true, user }, { status: 200 });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}