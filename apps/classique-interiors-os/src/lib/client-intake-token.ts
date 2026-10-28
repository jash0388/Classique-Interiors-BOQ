import crypto from "node:crypto";

const SESSION_MS = 2 * 60 * 60 * 1000;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be configured before accepting public uploads.");
  return value;
}

export function newClientUploadSession() {
  const sessionId = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + SESSION_MS;
  const payload = `${sessionId}.${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return { sessionId, token: `${payload}.${signature}` };
}

export function verifyClientUploadToken(token: string | null | undefined): { sessionId: string; expiresAt: number } | null {
  if (!token) return null;
  const [sessionId, expiryText, signature, extra] = token.split(".");
  if (extra || !/^[a-f0-9]{32}$/.test(sessionId ?? "")) return null;
  const expiresAt = Number(expiryText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now() || expiresAt > Date.now() + SESSION_MS + 60_000) return null;
  const expected = crypto.createHmac("sha256", secret()).update(`${sessionId}.${expiresAt}`).digest();
  let received: Buffer;
  try { received = Buffer.from(signature ?? "", "base64url"); } catch { return null; }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  return { sessionId, expiresAt };
}

export function hashTrackingToken(token: string) {
  return crypto.createHash("sha256").update(token.trim().toUpperCase()).digest("hex");
}

export function newTrackingToken() {
  return `CI-${new Date().getFullYear()}-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
}
