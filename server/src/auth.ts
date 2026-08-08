import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

export type TokenPayload = { sub: string; role: 'team' | 'admin' };

export const hashPassword = async (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = async (password: string, hash: string) => bcrypt.compare(password, hash);

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30m' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
