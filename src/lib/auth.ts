import { sign, verify } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (userId: number, role: string) => {
  return sign({ userId, role }, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string) => {
  try {
    return verify(token, JWT_SECRET) as { userId: number; role: string };
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};