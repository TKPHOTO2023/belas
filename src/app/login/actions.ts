'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { endSession, startSession, verifyPassword } from '@/lib/auth';

export async function login(_: unknown, form: FormData) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const next = String(form.get('next') || '/dashboard');

  const user = await db.user.findUnique({ where: { email }, include: { workspace: true } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Incorrect email or password.' };
  }
  if (!user.workspace.active) {
    return { error: 'This account is suspended. Please contact your provider.' };
  }
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  redirect(next.startsWith('/dashboard') ? next : '/dashboard');
}

export async function logout() {
  await endSession();
  redirect('/login');
}
