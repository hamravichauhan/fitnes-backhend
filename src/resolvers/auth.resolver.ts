import { z } from 'zod';
import type { AppContext } from '../context';
import User, { UserDoc } from '../adapters/mongo/models/User';
import Territory from '../adapters/mongo/models/Territory';
import { hashPassword, checkPassword } from '../auth/password';
import { signToken } from '../auth/jwt';

const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
  color: z.string().regex(/^#([0-9A-Fa-f]{6})$/, 'Color must be a valid hex code').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export interface AuthResponse {
  token: string;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  color: string;
  tilesOwned: number;
}

export default {
  Query: {
    me: async (_: unknown, __: unknown, { user }: AppContext): Promise<UserResponse | null> => {
      if (!user) return null;
      const u = await User.findById(user.id).select('email displayName color').lean();
      if (!u) return null;
      const tilesOwned = await Territory.countDocuments({ ownerUserId: u._id });
      return {
        id: String(u._id),
        email: u.email,
        displayName: u.displayName,
        color: u.color,
        tilesOwned,
      };
    },
  },

  Mutation: {
    signup: async (_: unknown, args: unknown): Promise<AuthResponse> => {
      const { email, password, displayName, color } = signupSchema.parse(args);
      const emailNorm = email.toLowerCase().trim();

      const existing = await User.findOne({ email: emailNorm }).lean();
      if (existing) throw new Error('Email already exists');

      const passwordHash = await hashPassword(password);
      const u = await User.create({
        email: emailNorm,
        passwordHash,
        displayName,
        color: color ?? '#888888',
      });

      return {
        token: signToken({
          id: String(u._id),
          email: u.email,
          displayName: u.displayName,
          color: u.color,
        }),
      };
    },

    login: async (_: unknown, args: unknown): Promise<AuthResponse> => {
      const { email, password } = loginSchema.parse(args);
      const emailNorm = email.toLowerCase().trim();

      const u = await User.findOne({ email: emailNorm }).select('+passwordHash').lean();
      if (!u) throw new Error('Invalid email or password');

      const ok = await checkPassword(password, u.passwordHash);
      if (!ok) throw new Error('Invalid email or password');

      // Update lastLogin
      await User.updateOne({ _id: u._id }, { lastLogin: new Date() });

      return {
        token: signToken({
          id: String(u._id),
          email: u.email,
          displayName: u.displayName,
          color: u.color,
        }),
      };
    },
  },
};