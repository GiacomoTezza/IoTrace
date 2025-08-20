import { parse as parseCookie } from "cookie";

/**
 * Extracts the JWT token from request cookies.
 * Returns null if not present.
 */
export function getJwtFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);
  // `jwt` is the cookie name setted in the login action
  return typeof cookies.jwt === "string" ? cookies.jwt : null;
}
