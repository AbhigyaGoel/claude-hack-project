import { cookies } from "next/headers";

/**
 * Session cookie — stores the currently-signed-in user's UUID.
 *
 * Security is explicitly out of scope for the demo. The cookie value is the
 * raw user id with no signing or expiry check; anyone who can set the cookie
 * can impersonate any user. Swap for a signed session token (JWT, or a
 * random session id + `sessions` table) before shipping to anyone real.
 */
export const SESSION_COOKIE = "vero_user_id";
const YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Read the current user id from the session cookie. Server-only.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Read the current user id, throwing a 401-shaped error if absent.
 * Routes can catch and return `Response.json({ error: "unauthorized" }, { status: 401 })`.
 */
export async function requireCurrentUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new UnauthorizedError();
  return id;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
