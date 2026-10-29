import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { formatMoney } from '@/lib/billing';
import { PageHeader, Stat } from '@/components/ui';

export default async function BillingPage() {
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - i, 1);
  });

  const rows = await Promise.all(
    months.map(async (start) => {
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const agg = await db.call.aggregate({
        where: { workspaceId: workspace.id, createdAt: { gte: start, lt: end } },
        _count: true,
        _sum: { durationSec: true, billedCents: true },
      });
      const usage = agg._sum.billedCents ?? 0;
      const credit = Math.min(usage, workspace.includedMinutes * workspace.pricePerMinuteCents);
      return { start, calls: agg._count, minutes: Math.round((agg._sum.durationSec ?? 0) / 60), usage, credit, due: usage - credit };
    }),
  );
  const current = rows[0];

  return (
    <>
      <PageHeader title="Usage & billing" description="Calls are billed per started minute." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Rate" value={`${formatMoney(workspace.pricePerMinuteCents)}/min`} />
        <Stat label="Included minutes" value={workspace.includedMinutes} hint="Per month" />
        <Stat label="Minutes this month" value={current.minutes} />
        <Stat label="Estimated bill" value={formatMoney(current.due)} hint="This month so far" />
      </div>
      <div className="card mt-6 overflow-x-auto">
        <h2 className="mb-3 font-semibold">Monthly statements</h2>
        <table className="table">
          <thead>
            <tr><th>Month</th><th>Calls</th><th>Minutes</th><th>Usage</th><th>Included</th><th>Amount due</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.start.toISOString()}>
                <td className="font-medium">{r.start.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</td>
                <td>{r.calls}</td>
                <td>{r.minutes}</td>
                <td>{formatMoney(r.usage)}</td>
                <td>−{formatMoney(r.credit)}</td>
                <td className="font-semibold">{formatMoney(r.due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
