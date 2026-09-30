/**
 * Sessão admin via JWT em cookie httpOnly.
 * O segredo é ADMIN_SESSION_SECRET (definido na Vercel).
 */
import jwt from "jsonwebtoken";

const COOKIE_NAME = "nytro_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type SessionPayload = {
  uid: number;
  username: string;
};

export function signSession(payload: SessionPayload): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado");
  return jwt.sign(payload, secret, { expiresIn: COOKIE_MAX_AGE });
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret) as SessionPayload;
    if (typeof decoded.uid !== "number" || typeof decoded.username !== "string") return null;
    return decoded;
  } catch {
    return null;
  }
}

export function sessionCookie(value: string) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
