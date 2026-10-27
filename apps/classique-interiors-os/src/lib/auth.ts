import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { COOKIE_NAME, signSession, verifySession, type SessionPayload } from "@/lib/session";

export type { SessionPayload };

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Restrict a page/action to certain roles; redirects home when unauthorized. */
export async function requireRole(...roles: string[]): Promise<SessionPayload> {
  const session = await requireUser();
  if (!roles.includes(session.role)) redirect("/");
  return session;
}

export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, await signSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function authenticate(email: string, password: string): Promise<SessionPayload | null> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { uid: user.id, name: user.name, email: user.email, role: user.role };
}
