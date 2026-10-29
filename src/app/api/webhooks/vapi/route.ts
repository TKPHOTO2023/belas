import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { billedCentsFor } from '@/lib/billing';
import { vapiProvider } from '@/lib/voice/vapi';

// Vapi posts status updates and end-of-call reports here (configured per
// assistant in lib/voice/vapi.ts). We upsert the Call and bill the client.
export async function POST(req: Request) {
  let event;
  try {
    event = vapiProvider.parseWebhook(req.headers, await req.json());
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!event) return NextResponse.json({ ok: true });

  const agent = event.providerAgentId
    ? await db.agent.findUnique({ where: { providerAgentId: event.providerAgentId }, include: { workspace: true } })
    : null;
  const existing = await db.call.findUnique({ where: { providerCallId: event.providerCallId } });
  const workspaceId = existing?.workspaceId ?? agent?.workspaceId;
  // Calls from assistants we don't know about aren't ours to record.
  if (!workspaceId) return NextResponse.json({ ok: true });

  const workspace = agent?.workspace ?? (await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } }));
  const ended = event.status === 'ended';
  const data = {
    status: event.status,
    ...(event.fromNumber ? { fromNumber: event.fromNumber } : {}),
    ...(event.toNumber ? { toNumber: event.toNumber } : {}),
    ...(event.startedAt ? { startedAt: event.startedAt } : {}),
    ...(ended
      ? {
          endedAt: event.endedAt,
          durationSec: event.durationSec ?? 0,
          providerCostCents: event.providerCostCents ?? 0,
          billedCents: billedCentsFor(event.durationSec ?? 0, workspace.pricePerMinuteCents),
          endedReason: event.endedReason,
          transcript: event.transcript,
          summary: event.summary,
          recordingUrl: event.recordingUrl,
          successful: event.successful,
        }
      : {}),
  };

  // Status updates can arrive after the end-of-call report; never un-end a call.
  if (existing?.status === 'ended' && !ended) return NextResponse.json({ ok: true });

  await db.call.upsert({
    where: { providerCallId: event.providerCallId },
    update: data,
    create: {
      ...data,
      providerCallId: event.providerCallId,
      workspaceId,
      agentId: agent?.id ?? null,
      direction: event.direction,
    },
  });
  return NextResponse.json({ ok: true });
}
