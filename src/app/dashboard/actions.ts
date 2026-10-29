'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canManage, hashPassword, requirePlatformAdmin, requireUser, ROLES } from '@/lib/auth';
import { activeWorkspace, VIEW_AS_COOKIE } from '@/lib/tenant';
import { voice, voiceConfigured } from '@/lib/voice';
import { AGENT_TEMPLATES, type TemplateKey } from '@/lib/templates';

export type ActionState = { error?: string; ok?: string } | null;

/** Signed-in manager and the workspace they're acting on. */
async function managerContext() {
  const user = await requireUser();
  if (!canManage(user)) throw new Error('You do not have permission to do that.');
  const workspace = await activeWorkspace(user);
  return { user, workspace };
}

function fail(e: unknown): ActionState {
  return { error: e instanceof Error ? e.message : 'Something went wrong.' };
}

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

// ---------- Agents ----------

export async function createAgent(form: FormData) {
  const { workspace } = await managerContext();
  const key = (str(form, 'template') || 'receptionist') as TemplateKey;
  const tpl = AGENT_TEMPLATES[key] ?? AGENT_TEMPLATES.receptionist;
  const business = workspace.brandName || workspace.name;
  const agent = await db.agent.create({
    data: {
      workspaceId: workspace.id,
      name: str(form, 'name') || `${tpl.label} agent`,
      firstMessage: tpl.firstMessage.replaceAll('{business}', business),
      systemPrompt: tpl.systemPrompt.replaceAll('{business}', business),
    },
  });
  await syncAgent(agent.id).catch(() => {
    // Saved locally; the edit page shows the sync error and retries on save.
  });
  redirect(`/dashboard/agents/${agent.id}`);
}

const agentSchema = z.object({
  name: z.string().min(1).max(80),
  firstMessage: z.string().min(1).max(1000),
  systemPrompt: z.string().min(1).max(20000),
  knowledge: z.string().max(50000),
  language: z.string().min(2).max(10),
  model: z.string().regex(/^[\w-]+\/[\w.-]+$/),
  voice: z.string().regex(/^[\w-]+\/[\w.-]+$/),
  temperature: z.coerce.number().min(0).max(1),
  maxDurationSec: z.coerce.number().int().min(30).max(3600),
  transferNumber: z.string().regex(/^(\+\d{7,15})?$/, 'Transfer number must be in +E.164 format, e.g. +27821234567'),
  status: z.enum(['active', 'paused']),
});

export async function updateAgent(agentId: string, _: unknown, form: FormData): Promise<ActionState> {
  try {
    const { workspace } = await managerContext();
    const parsed = agentSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const d = parsed.data;
    const [llmProvider, llmModel] = d.model.split('/');
    const [voiceProvider, voiceId] = d.voice.split('/');
    const { count } = await db.agent.updateMany({
      where: { id: agentId, workspaceId: workspace.id },
      data: {
        name: d.name,
        firstMessage: d.firstMessage,
        systemPrompt: d.systemPrompt,
        knowledge: d.knowledge,
        language: d.language,
        llmProvider,
        llmModel,
        voiceProvider,
        voiceId,
        temperature: d.temperature,
        maxDurationSec: d.maxDurationSec,
        transferNumber: d.transferNumber || null,
        status: d.status,
      },
    });
    if (!count) return { error: 'Agent not found.' };
    await syncAgent(agentId);
    revalidatePath(`/dashboard/agents/${agentId}`);
    return { ok: voiceConfigured() ? 'Saved and published to the voice engine.' : 'Saved. It goes live once the voice engine is connected.' };
  } catch (e) {
    return fail(e);
  }
}

/** Push the agent config to the voice provider and store its id. */
async function syncAgent(agentId: string) {
  if (!voiceConfigured()) return;
  const agent = await db.agent.findUniqueOrThrow({ where: { id: agentId } });
  const providerAgentId = await voice().upsertAgent(agent, agent.providerAgentId);
  if (providerAgentId !== agent.providerAgentId) {
    await db.agent.update({ where: { id: agentId }, data: { providerAgentId } });
  }
}

export async function deleteAgent(agentId: string) {
  const { workspace } = await managerContext();
  const agent = await db.agent.findFirst({ where: { id: agentId, workspaceId: workspace.id } });
  if (!agent) return;
  if (agent.providerAgentId && voiceConfigured()) {
    await voice().deleteAgent(agent.providerAgentId).catch(() => {});
  }
  await db.agent.delete({ where: { id: agent.id } });
  redirect('/dashboard/agents');
}

export async function startOutboundCall(agentId: string, _: unknown, form: FormData): Promise<ActionState> {
  try {
    const { workspace } = await managerContext();
    const to = str(form, 'to');
    if (!/^\+\d{7,15}$/.test(to)) return { error: 'Enter the number in +E.164 format, e.g. +27821234567.' };
    const agent = await db.agent.findFirst({ where: { id: agentId, workspaceId: workspace.id } });
    if (!agent?.providerAgentId) return { error: 'Publish the agent first (save it with the voice engine configured).' };
    const number = await db.phoneNumber.findFirst({
      where: { id: str(form, 'numberId'), workspaceId: workspace.id },
    });
    if (!number?.providerNumberId) return { error: 'Choose a phone number to call from.' };
    const providerCallId = await voice().startOutboundCall({
      providerAgentId: agent.providerAgentId,
      providerNumberId: number.providerNumberId,
      to,
    });
    await db.call.create({
      data: {
        workspaceId: workspace.id,
        agentId: agent.id,
        providerCallId,
        direction: 'outbound',
        fromNumber: number.number,
        toNumber: to,
      },
    });
    revalidatePath('/dashboard/calls');
    return { ok: `Calling ${to}…` };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Phone numbers ----------

export async function importNumber(_: unknown, form: FormData): Promise<ActionState> {
  try {
    const { workspace } = await managerContext();
    const number = str(form, 'number');
    if (!/^\+\d{7,15}$/.test(number)) return { error: 'Enter the number in +E.164 format, e.g. +27101234567.' };
    const label = str(form, 'label') || number;
    const kind = str(form, 'kind');
    let providerNumberId: string | null = null;
    if (voiceConfigured()) {
      providerNumberId = await voice().importNumber(
        kind === 'sip'
          ? { kind: 'sip', number, credentialId: str(form, 'credentialId') }
          : { kind: 'twilio', number, accountSid: str(form, 'accountSid'), authToken: str(form, 'authToken') },
        label,
      );
    }
    await db.phoneNumber.create({ data: { workspaceId: workspace.id, number, label, providerNumberId } });
    revalidatePath('/dashboard/numbers');
    return { ok: `${number} added.` };
  } catch (e) {
    return fail(e);
  }
}

export async function assignNumber(numberId: string, form: FormData) {
  const { workspace } = await managerContext();
  const number = await db.phoneNumber.findFirst({ where: { id: numberId, workspaceId: workspace.id } });
  if (!number) return;
  const agentId = str(form, 'agentId') || null;
  const agent = agentId ? await db.agent.findFirst({ where: { id: agentId, workspaceId: workspace.id } }) : null;
  if (number.providerNumberId && voiceConfigured()) {
    await voice().assignNumber(number.providerNumberId, agent?.providerAgentId ?? null);
  }
  await db.phoneNumber.update({ where: { id: number.id }, data: { agentId: agent?.id ?? null } });
  revalidatePath('/dashboard/numbers');
}

export async function removeNumber(numberId: string) {
  const { workspace } = await managerContext();
  const number = await db.phoneNumber.findFirst({ where: { id: numberId, workspaceId: workspace.id } });
  if (!number) return;
  if (number.providerNumberId && voiceConfigured()) {
    await voice().releaseNumber(number.providerNumberId).catch(() => {});
  }
  await db.phoneNumber.delete({ where: { id: number.id } });
  revalidatePath('/dashboard/numbers');
}

// ---------- Workspace settings & team ----------

export async function updateBranding(_: unknown, form: FormData): Promise<ActionState> {
  try {
    const { workspace } = await managerContext();
    const brandColor = str(form, 'brandColor');
    if (!/^#[0-9a-f]{6}$/i.test(brandColor)) return { error: 'Brand colour must look like #7c3aed.' };
    const logoUrl = str(form, 'logoUrl');
    if (logoUrl && !/^https:\/\//.test(logoUrl)) return { error: 'Logo URL must start with https://' };
    await db.workspace.update({
      where: { id: workspace.id },
      data: { brandName: str(form, 'brandName') || null, brandColor, logoUrl: logoUrl || null },
    });
    revalidatePath('/dashboard', 'layout');
    return { ok: 'Branding updated.' };
  } catch (e) {
    return fail(e);
  }
}

export async function addTeamMember(_: unknown, form: FormData): Promise<ActionState> {
  try {
    const { user, workspace } = await managerContext();
    const email = str(form, 'email').toLowerCase();
    const password = str(form, 'password');
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid email.' };
    if (password.length < 10) return { error: 'Password must be at least 10 characters.' };
    const requested = str(form, 'role');
    // Only platform admins can create other platform admins, and only in the platform workspace.
    const role =
      requested === ROLES.PLATFORM_ADMIN && user.role === ROLES.PLATFORM_ADMIN && workspace.isPlatform
        ? ROLES.PLATFORM_ADMIN
        : requested === ROLES.CLIENT_MEMBER
          ? ROLES.CLIENT_MEMBER
          : ROLES.CLIENT_ADMIN;
    if (await db.user.findUnique({ where: { email } })) return { error: 'That email is already in use.' };
    await db.user.create({
      data: { email, name: str(form, 'name') || email, passwordHash: await hashPassword(password), role, workspaceId: workspace.id },
    });
    revalidatePath('/dashboard/settings');
    return { ok: `${email} can now sign in.` };
  } catch (e) {
    return fail(e);
  }
}

export async function removeTeamMember(userId: string) {
  const { user, workspace } = await managerContext();
  if (userId === user.id) return;
  await db.user.deleteMany({ where: { id: userId, workspaceId: workspace.id } });
  revalidatePath('/dashboard/settings');
}

// ---------- Platform admin: clients ----------

const clientSchema = z.object({
  name: z.string().min(1).max(100),
  pricePerMinute: z.coerce.number().min(0).max(1000),
  includedMinutes: z.coerce.number().int().min(0).max(1_000_000),
  adminName: z.string().max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(10, 'Admin password must be at least 10 characters.'),
});

export async function createClient(_: unknown, form: FormData): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
    const parsed = clientSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const d = parsed.data;
    const email = d.adminEmail.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) return { error: 'That admin email is already in use.' };
    const base = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    await db.workspace.create({
      data: {
        name: d.name,
        slug,
        brandName: d.name,
        pricePerMinuteCents: Math.round(d.pricePerMinute * 100),
        includedMinutes: d.includedMinutes,
        users: {
          create: {
            email,
            name: d.adminName || email,
            passwordHash: await hashPassword(d.adminPassword),
            role: ROLES.CLIENT_ADMIN,
          },
        },
      },
    });
    revalidatePath('/dashboard/clients');
    return { ok: `${d.name} created. ${email} can sign in now.` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateClientPlan(workspaceId: string, form: FormData) {
  await requirePlatformAdmin();
  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      pricePerMinuteCents: Math.round(Math.max(0, Number(form.get('pricePerMinute')) || 0) * 100),
      includedMinutes: Math.max(0, Math.floor(Number(form.get('includedMinutes')) || 0)),
    },
  });
  revalidatePath('/dashboard/clients');
}

export async function setClientActive(workspaceId: string, active: boolean) {
  await requirePlatformAdmin();
  await db.workspace.updateMany({ where: { id: workspaceId, isPlatform: false }, data: { active } });
  revalidatePath('/dashboard/clients');
}

export async function viewAs(workspaceId: string | null) {
  await requirePlatformAdmin();
  const jar = await cookies();
  if (workspaceId) {
    jar.set(VIEW_AS_COOKIE, workspaceId, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });
  } else {
    jar.delete(VIEW_AS_COOKIE);
  }
  redirect('/dashboard');
}
