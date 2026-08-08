import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
export const hashPassword = async (password) => bcrypt.hash(password, 10);
export const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);
export function signToken(payload) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '30m' });
}
export function verifyToken(token) {
    return jwt.verify(token, config.jwtSecret);
}
