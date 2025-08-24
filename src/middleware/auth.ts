import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtUser } from "../auth/jwt";

declare global {
  namespace Express {
    interface Request {
      authUser?: JwtUser | null;
    }
  }
}

/**
 * Authentication middleware to decode and attach JWT user to request.
 * - Extracts Bearer token from `Authorization` header.
 * - Verifies token and attaches `req.authUser`.
 * - If missing/invalid, sets `req.authUser = null`.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    req.authUser = null;
    return next();
  }

  const token = authHeader.substring("Bearer ".length).trim();

  if (!token) {
    req.authUser = null;
    return next();
  }

  try {
    const user = verifyToken(token);

    // ✅ Extra safety check for required fields
    if (!user?.id || !user?.email) {
      req.authUser = null;
      return next();
    }

    req.authUser = user;
    return next();
  } catch (error) {
    req.authUser = null;

    // Log error in dev mode, silent in prod
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[authMiddleware] JWT verification failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return next();
  }
}
