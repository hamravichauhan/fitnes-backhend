import bcrypt from 'bcryptjs';

const ROUNDS = 12; // Increased for better security (balance with performance)

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const salt = await bcrypt.genSalt(ROUNDS);
  return bcrypt.hash(plain, salt);
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) {
    throw new Error('Password and hash are required');
  }
  return bcrypt.compare(plain, hash);
}