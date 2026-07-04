import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "fd_admin";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 dagen

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// Cookie-waarde: "<payload>.<sig>" met payload = base64url(JSON{exp}).
export function signSession(expMs: number, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ exp: expMs })).toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifySession(
  value: string | undefined,
  secret: string,
  nowMs: number
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = hmac(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof parsed.exp === "number" && parsed.exp > nowMs;
  } catch {
    return false;
  }
}

// Constant-time vergelijking; beide naar vaste 32-byte hash zodat lengte niet lekt.
export function checkPassword(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
