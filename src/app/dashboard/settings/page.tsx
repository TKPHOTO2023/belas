import { db } from '@/lib/db';
import { canManage, isPlatformAdmin, requireUser } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { PageHeader } from '@/components/ui';
import { logout } from '../../login/actions';
import { removeTeamMember } from '../actions';
import { BrandingForm, TeamForm } from './forms';

export default async function SettingsPage() {
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const manage = canManage(user);
  const members = await db.user.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: 'asc' } });

  return (
    <>
      <PageHeader title="Settings" description={workspace.name} action={<form action={logout}><button className="btn-secondary">Sign out</button></form>} />
      <div className="grid gap-6 lg:grid-cols-2">
        {manage && !workspace.isPlatform && (
          <BrandingForm brandName={workspace.brandName ?? ''} brandColor={workspace.brandColor} logoUrl={workspace.logoUrl ?? ''} />
        )}
        <div className="card">
          <h2 className="mb-3 font-semibold">Team</h2>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.email} · {m.role.replace('_', ' ').toLowerCase()}</div>
                </div>
                {manage && m.id !== user.id && (
                  <form action={removeTeamMember.bind(null, m.id)}>
                    <button className="text-xs text-red-600 hover:underline">Remove</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {manage && <TeamForm allowPlatformAdmin={isPlatformAdmin(user) && workspace.isPlatform} />}
        </div>
      </div>
    </>
  );
}
