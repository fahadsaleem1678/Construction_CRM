import bcrypt from 'bcryptjs';

const rounds = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, rounds);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
