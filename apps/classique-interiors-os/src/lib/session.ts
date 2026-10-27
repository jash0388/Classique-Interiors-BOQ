import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "ci_session";

export type SessionPayload = {
  uid: string;
  name: string;
  email: string;
  role: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
  return new TextEncoder().encode(secret || "dev-only-secret-change-me");
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.uid || !payload.role) return null;
    return {
      uid: String(payload.uid),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}
