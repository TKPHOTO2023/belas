import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { SESSION_COOKIE, SESSION_TTL_SEC, signSession, verifySession } from './session';

export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  CLIENT_ADMIN: 'CLIENT_ADMIN',
  CLIENT_MEMBER: 'CLIENT_MEMBER',
} as const;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function startSession(user: { id: string; workspaceId: string; role: string }) {
  const token = await signSession({ uid: user.id, wid: user.workspaceId, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user with their workspace, or a redirect to /login. */
export async function requireUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');
  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { workspace: true },
  });
  if (!user || !user.workspace.active) redirect('/login');
  return user;
}

export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (user.role !== ROLES.PLATFORM_ADMIN) redirect('/dashboard');
  return user;
}

export function isPlatformAdmin(user: { role: string }) {
  return user.role === ROLES.PLATFORM_ADMIN;
}

export function canManage(user: { role: string }) {
  return user.role === ROLES.PLATFORM_ADMIN || user.role === ROLES.CLIENT_ADMIN;
}
