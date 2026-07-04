import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  signSession,
  verifySession,
} from "./auth";

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("Missing env: ADMIN_SESSION_SECRET (zie .env.local.example)");
  return s;
}

export function adminPassword(): string {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("Missing env: ADMIN_PASSWORD (zie .env.local.example)");
  return p;
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, sessionSecret(), Date.now());
}

// Beveiligt pagina's: redirect naar login als de sessie ongeldig is.
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthed())) redirect("/admin/login");
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(Date.now() + SESSION_MAX_AGE_MS, sessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: "/admin" });
}
