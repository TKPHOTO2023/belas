import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { formatDuration, formatMoney } from '@/lib/billing';
import { Badge, PageHeader } from '@/components/ui';

const PAGE_SIZE = 50;

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ page?: string; agent?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const where = { workspaceId: workspace.id, ...(sp.agent ? { agentId: sp.agent } : {}) };
  const [calls, total, agents] = await Promise.all([
    db.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { agent: { select: { name: true } } },
    }),
    db.call.count({ where }),
    db.agent.findMany({ where: { workspaceId: workspace.id }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => `?page=${p}${sp.agent ? `&agent=${sp.agent}` : ''}`;

  return (
    <>
      <PageHeader
        title="Call logs"
        description={`${total} calls`}
        action={
          <form className="flex gap-2">
            <select name="agent" defaultValue={sp.agent ?? ''} className="input py-1.5">
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button className="btn-secondary py-1.5">Filter</button>
          </form>
        }
      />
      <div className="card overflow-x-auto">
        {calls.length === 0 ? (
          <p className="muted py-8 text-center">No calls yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>When</th><th>Agent</th><th>Type</th><th>Caller / callee</th><th>Duration</th><th>Charge</th><th>Outcome</th></tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/dashboard/calls/${c.id}`} className="font-medium text-brand">{c.createdAt.toLocaleString()}</Link></td>
                  <td>{c.agent?.name ?? '—'}</td>
                  <td className="capitalize">{c.direction}</td>
                  <td>{(c.direction === 'outbound' ? c.toNumber : c.fromNumber) ?? '—'}</td>
                  <td>{formatDuration(c.durationSec)}</td>
                  <td>{formatMoney(c.billedCents)}</td>
                  <td>
                    {c.status !== 'ended' ? <Badge>{c.status}</Badge>
                      : c.successful === true ? <Badge tone="active">Success</Badge>
                      : c.successful === false ? <Badge tone="suspended">Unsuccessful</Badge>
                      : <Badge>ended</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && <Link className="btn-secondary" href={qs(page - 1)}>Previous</Link>}
          <span className="muted self-center">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-secondary" href={qs(page + 1)}>Next</Link>}
        </div>
      )}
    </>
  );
}
