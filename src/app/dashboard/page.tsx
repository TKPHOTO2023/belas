import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser, isPlatformAdmin } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { formatDuration, formatMoney, startOfMonth } from '@/lib/billing';
import { voiceConfigured } from '@/lib/voice';
import { Badge, Notice, PageHeader, Stat } from '@/components/ui';
import { CallsChart } from '@/components/calls-chart';

export default async function Overview() {
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const platformView = isPlatformAdmin(user) && workspace.isPlatform;
  // Platform admins see totals across every client; clients see their own.
  const scope = platformView ? {} : { workspaceId: workspace.id };
  const since = startOfMonth();

  const [month, successCount, recent, agentCount, daily] = await Promise.all([
    db.call.aggregate({
      where: { ...scope, createdAt: { gte: since } },
      _count: true,
      _sum: { durationSec: true, billedCents: true, providerCostCents: true },
    }),
    db.call.count({ where: { ...scope, createdAt: { gte: since }, successful: true } }),
    db.call.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { agent: { select: { name: true } }, workspace: { select: { name: true } } },
    }),
    db.agent.count({ where: scope }),
    dailyCalls(platformView ? null : workspace.id),
  ]);

  const calls = month._count;
  const minutes = Math.round((month._sum.durationSec ?? 0) / 60);
  const revenue = month._sum.billedCents ?? 0;
  const cost = month._sum.providerCostCents ?? 0;

  return (
    <>
      <PageHeader
        title={platformView ? 'Platform overview' : 'Overview'}
        description={platformView ? 'All clients, this month.' : `${workspace.brandName || workspace.name}, this month.`}
        action={!platformView && <Link href="/dashboard/agents" className="btn-primary">Manage agents</Link>}
      />
      {isPlatformAdmin(user) && !voiceConfigured() && (
        <Notice tone="warn">
          The voice engine isn&apos;t connected yet. Set <code>VAPI_API_KEY</code>, <code>NEXT_PUBLIC_VAPI_PUBLIC_KEY</code> and{' '}
          <code>APP_URL</code> to start taking calls. Everything else works without them.
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Calls" value={calls} />
        <Stat label="Minutes" value={minutes} />
        {platformView ? (
          <>
            <Stat label="Revenue" value={formatMoney(revenue)} hint="Billed to clients" />
            <Stat label="Gross margin" value={formatMoney(revenue - cost)} hint={`Provider cost ${formatMoney(cost)}`} />
          </>
        ) : (
          <>
            <Stat label="Success rate" value={calls ? `${Math.round((successCount / calls) * 100)}%` : '—'} hint="Calls that met the agent's goal" />
            <Stat label="Agents" value={agentCount} />
          </>
        )}
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 font-semibold">Calls, last 14 days</h2>
        <CallsChart data={daily} />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent calls</h2>
          <Link href="/dashboard/calls" className="text-sm font-medium text-brand">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="muted py-6 text-center">No calls yet. Create an agent and press “Test call” to try it.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                {platformView && <th>Client</th>}
                <th>Agent</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/dashboard/calls/${c.id}`} className="font-medium text-brand">{c.createdAt.toLocaleString()}</Link></td>
                  {platformView && <td>{c.workspace.name}</td>}
                  <td>{c.agent?.name ?? '—'}</td>
                  <td className="capitalize">{c.direction}</td>
                  <td>{formatDuration(c.durationSec)}</td>
                  <td><Badge>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

async function dailyCalls(workspaceId: string | null) {
  const days = 14;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  const rows = await db.call.findMany({
    where: { createdAt: { gte: from }, ...(workspaceId ? { workspaceId } : {}) },
    select: { createdAt: true },
  });
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    return { date: d, count: 0 };
  });
  for (const r of rows) {
    const idx = Math.floor((r.createdAt.getTime() - from.getTime()) / 86_400_000);
    if (buckets[idx]) buckets[idx].count++;
  }
  return buckets.map((b) => ({ label: b.date.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count: b.count }));
}
