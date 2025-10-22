import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = 'my-secret-key-123'; // بعداً در .env

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { userId: number };
}