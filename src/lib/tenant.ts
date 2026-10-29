import 'server-only';
import { cookies } from 'next/headers';
import { db } from './db';
import { isPlatformAdmin } from './auth';

// Platform admins can "view as" any client workspace; everyone else is pinned
// to their own. Every tenant-scoped query must go through activeWorkspaceId.
export const VIEW_AS_COOKIE = 'bela_view_as';

export async function activeWorkspace(user: { role: string; workspaceId: string; workspace: { id: string } }) {
  if (isPlatformAdmin(user)) {
    const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    if (viewAs) {
      const ws = await db.workspace.findUnique({ where: { id: viewAs } });
      if (ws) return ws;
    }
  }
  return db.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } });
}
