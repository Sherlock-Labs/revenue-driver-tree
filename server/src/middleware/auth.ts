import { type Request, type Response, type NextFunction } from "express";
import { getAuth as clerkGetAuth } from "@clerk/express";

/**
 * Extract the Clerk user ID from the request.
 * Returns null if not authenticated.
 */
export function getUserId(req: Request): string | null {
  const auth = clerkGetAuth(req);
  return auth?.userId ?? null;
}

/**
 * Middleware that requires authentication.
 * Returns 401 if no valid session.
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  };
}
