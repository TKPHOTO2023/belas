// Signed, HttpOnly session cookie. Edge-safe (used by middleware), so no
// Prisma or Node-only imports here.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'bela_session';
export const SESSION_TTL_SEC = 60 * 60 * 12;

export type SessionPayload = {
  uid: string;
  wid: string;
  role: string;
};

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: String(payload.uid), wid: String(payload.wid), role: String(payload.role) };
  } catch {
    return null;
  }
}
