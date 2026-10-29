import { requireUser, isPlatformAdmin } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { brandRgb, PLATFORM_NAME } from '@/lib/brand';
import { logout } from '../login/actions';
import { viewAs } from './actions';
import { NavLinks } from '@/components/nav-links';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const admin = isPlatformAdmin(user);
  const viewingClient = admin && workspace.id !== user.workspaceId;
  const brandName = workspace.isPlatform ? PLATFORM_NAME : workspace.brandName || workspace.name;

  return (
    <div style={{ ['--brand' as string]: brandRgb(workspace.brandColor) }} className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          {workspace.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-bold text-white">{brandName[0]}</div>
          )}
          <span className="truncate font-bold">{brandName}</span>
        </div>
        <NavLinks showClients={admin && !viewingClient} />
        <div className="hidden border-t border-slate-200 px-5 py-4 text-sm md:absolute md:inset-x-0 md:bottom-0 md:block">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
          <form action={logout}>
            <button className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-900">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 md:ml-60">
        {viewingClient && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-6 py-2 text-sm text-amber-900">
            <span>Viewing as <strong>{workspace.name}</strong>: changes apply to this client.</span>
            <form action={viewAs.bind(null, null)}>
              <button className="font-semibold underline">Back to {PLATFORM_NAME} admin</button>
            </form>
          </div>
        )}
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
