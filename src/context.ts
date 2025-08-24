import type { Request } from "express";
import type { JwtUser } from "./auth/jwt";

/**
 * Application-wide context type
 * - Can be extended later with db, cache, etc.
 */
export interface AppContext {
  user: JwtUser | null;
}

/**
 * Builds the request context for GraphQL or route handlers.
 * - Attaches `req.authUser` (set by authMiddleware).
 * - Defaults to `null` if no valid user is authenticated.
 *
 * @param req Express request with optional `authUser`
 * @returns {AppContext} The context object
 */
export function makeContext(req: Request): AppContext {
  // Ensure type safety in case middleware didn't run
  const user: JwtUser | null = req.authUser ?? null;
  return { user };
}
