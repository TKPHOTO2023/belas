import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { isPlatformAdmin, requireUser } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { formatDuration, formatMoney } from '@/lib/billing';
import { Badge, PageHeader } from '@/components/ui';

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const admin = isPlatformAdmin(user);
  // Platform admins can open any call from the platform overview.
  const call = await db.call.findFirst({
    where: { id, ...(admin && workspace.isPlatform ? {} : { workspaceId: workspace.id }) },
    include: { agent: { select: { id: true, name: true } }, workspace: { select: { name: true } } },
  });
  if (!call) notFound();

  const lines = (call.transcript ?? '').split('\n').filter(Boolean);

  return (
    <>
      <Link href="/dashboard/calls" className="muted mb-2 inline-block hover:text-slate-900">← Call logs</Link>
      <PageHeader title={`Call on ${call.createdAt.toLocaleString()}`} description={call.workspace.name} action={<Badge>{call.status}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {call.summary && (
            <div className="card">
              <h2 className="mb-2 font-semibold">Summary</h2>
              <p className="text-sm leading-relaxed">{call.summary}</p>
            </div>
          )}
          {call.recordingUrl && (
            <div className="card">
              <h2 className="mb-2 font-semibold">Recording</h2>
              <audio controls src={call.recordingUrl} className="w-full" />
            </div>
          )}
          <div className="card">
            <h2 className="mb-3 font-semibold">Transcript</h2>
            {lines.length === 0 ? (
              <p className="muted">The transcript appears here when the call ends.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {lines.map((line, i) => {
                  const m = /^(AI|Assistant|User|Customer|Bot):\s*(.*)$/i.exec(line);
                  const isAgent = m ? /^(ai|assistant|bot)$/i.test(m[1]) : false;
                  return (
                    <div key={i} className={`flex ${isAgent ? '' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isAgent ? 'bg-slate-100' : 'bg-brand/10'}`}>
                        {m && <div className="text-xs font-semibold text-slate-500">{isAgent ? 'Agent' : 'Caller'}</div>}
                        {m ? m[2] : line}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="card h-fit text-sm">
          <dl className="space-y-3">
            <Row label="Agent">{call.agent ? <Link className="text-brand" href={`/dashboard/agents/${call.agent.id}`}>{call.agent.name}</Link> : '—'}</Row>
            <Row label="Type"><span className="capitalize">{call.direction}</span></Row>
            <Row label="From">{call.fromNumber ?? '—'}</Row>
            <Row label="To">{call.toNumber ?? '—'}</Row>
            <Row label="Duration">{formatDuration(call.durationSec)}</Row>
            <Row label="Charge">{formatMoney(call.billedCents)}</Row>
            {admin && <Row label="Provider cost">{formatMoney(call.providerCostCents)}</Row>}
            <Row label="Ended because">{call.endedReason ?? '—'}</Row>
            <Row label="Goal met">{call.successful === null ? '—' : call.successful ? 'Yes' : 'No'}</Row>
          </dl>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
