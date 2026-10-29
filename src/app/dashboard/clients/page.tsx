import { db } from '@/lib/db';
import { requirePlatformAdmin } from '@/lib/auth';
import { formatMoney, startOfMonth } from '@/lib/billing';
import { Badge, PageHeader } from '@/components/ui';
import { setClientActive, updateClientPlan, viewAs } from '../actions';
import { CreateClientForm } from './create-form';

export default async function ClientsPage() {
  await requirePlatformAdmin();
  const since = startOfMonth();
  const clients = await db.workspace.findMany({
    where: { isPlatform: false },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { agents: true, users: true } } },
  });
  const usage = await db.call.groupBy({
    by: ['workspaceId'],
    where: { createdAt: { gte: since } },
    _sum: { durationSec: true, billedCents: true, providerCostCents: true },
  });
  const byId = new Map(usage.map((u) => [u.workspaceId, u._sum]));

  return (
    <>
      <PageHeader title="Clients" description="Businesses you resell to. Each gets its own branded dashboard." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          {clients.length === 0 ? (
            <p className="muted py-8 text-center">No clients yet. Create your first one.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Client</th><th>Plan</th><th>This month</th><th>Margin</th><th /></tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const u = byId.get(c.id);
                  const revenue = u?.billedCents ?? 0;
                  const cost = u?.providerCostCents ?? 0;
                  return (
                    <tr key={c.id} className="align-top">
                      <td>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-slate-500">{c._count.agents} agents · {c._count.users} users</div>
                        {!c.active && <Badge tone="suspended">suspended</Badge>}
                      </td>
                      <td>
                        <form action={updateClientPlan.bind(null, c.id)} className="flex flex-wrap items-center gap-1 text-xs">
                          <input name="pricePerMinute" type="number" step="0.01" min="0" defaultValue={(c.pricePerMinuteCents / 100).toFixed(2)} className="input w-20 py-1" aria-label="Price per minute" />
                          <span>/min,</span>
                          <input name="includedMinutes" type="number" min="0" defaultValue={c.includedMinutes} className="input w-20 py-1" aria-label="Included minutes" />
                          <span>incl.</span>
                          <button className="text-brand hover:underline">Save</button>
                        </form>
                      </td>
                      <td>
                        <div>{formatMoney(revenue)}</div>
                        <div className="text-xs text-slate-500">{Math.round((u?.durationSec ?? 0) / 60)} min</div>
                      </td>
                      <td className={revenue - cost < 0 ? 'text-red-600' : 'text-emerald-700'}>{formatMoney(revenue - cost)}</td>
                      <td className="space-y-1 text-right">
                        <form action={viewAs.bind(null, c.id)}>
                          <button className="btn-secondary py-1 text-xs">Open dashboard</button>
                        </form>
                        <form action={setClientActive.bind(null, c.id, !c.active)}>
                          <button className="text-xs text-slate-500 hover:underline">{c.active ? 'Suspend' : 'Reactivate'}</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <CreateClientForm />
      </div>
    </>
  );
}
