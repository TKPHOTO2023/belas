import { db } from '@/lib/db';
import { canManage, requireUser } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { PageHeader } from '@/components/ui';
import { assignNumber, removeNumber } from '../actions';
import { ImportNumberForm } from './import-form';

export default async function NumbersPage() {
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const manage = canManage(user);
  const [numbers, agents] = await Promise.all([
    db.phoneNumber.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: 'desc' } }),
    db.agent.findMany({ where: { workspaceId: workspace.id }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Phone numbers" description="Connect numbers and choose which agent answers each one." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-x-auto">
          {numbers.length === 0 ? (
            <p className="muted py-8 text-center">No numbers yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Number</th><th>Answered by</th><th /></tr>
              </thead>
              <tbody>
                {numbers.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <div className="font-medium">{n.number}</div>
                      {n.label && n.label !== n.number && <div className="text-xs text-slate-500">{n.label}</div>}
                      {!n.providerNumberId && <div className="text-xs text-amber-600">Not connected to voice engine</div>}
                    </td>
                    <td>
                      <form action={assignNumber.bind(null, n.id)} className="flex gap-2">
                        <select name="agentId" defaultValue={n.agentId ?? ''} className="input py-1.5" disabled={!manage}>
                          <option value="">Nobody</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                        {manage && <button className="btn-secondary py-1.5">Save</button>}
                      </form>
                    </td>
                    <td className="text-right">
                      {manage && (
                        <form action={removeNumber.bind(null, n.id)}>
                          <button className="text-sm text-red-600 hover:underline">Remove</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {manage && <ImportNumberForm />}
      </div>
    </>
  );
}
