import type { Request } from 'express';
import type { JwtUser } from './auth/jwt';

export type AppContext = {
  user: JwtUser | null;
};

export function makeContext(req: Request): AppContext {
  return { user: req.authUser ?? null };
}
