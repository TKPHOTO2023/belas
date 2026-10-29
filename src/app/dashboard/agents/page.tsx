import Link from 'next/link';
import { db } from '@/lib/db';
import { canManage, requireUser } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { AGENT_TEMPLATES } from '@/lib/templates';
import { Badge, PageHeader } from '@/components/ui';
import { createAgent } from '../actions';

export default async function AgentsPage() {
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const agents = await db.agent.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { calls: true } }, numbers: { select: { number: true } } },
  });

  return (
    <>
      <PageHeader title="Agents" description="Each agent is a voice assistant with its own prompt, voice and phone numbers." />
      {canManage(user) && (
        <form action={createAgent} className="card mb-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="label" htmlFor="name">Agent name</label>
            <input className="input" id="name" name="name" placeholder="e.g. Front desk" />
          </div>
          <div>
            <label className="label" htmlFor="template">Start from</label>
            <select className="input" id="template" name="template">
              {Object.entries(AGENT_TEMPLATES).map(([k, t]) => (
                <option key={k} value={k}>{t.label}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary">Create agent</button>
        </form>
      )}
      {agents.length === 0 ? (
        <p className="muted text-center">No agents yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Link key={a.id} href={`/dashboard/agents/${a.id}`} className="card transition hover:border-brand/50 hover:shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{a.name}</h3>
                <Badge>{a.status}</Badge>
              </div>
              <p className="muted mt-2 line-clamp-2">“{a.firstMessage}”</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{a._count.calls} calls</span>
                <span>{a.numbers.length ? a.numbers.map((n) => n.number).join(', ') : 'No number'}</span>
                <span>{a.providerAgentId ? 'Published' : 'Not published'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
