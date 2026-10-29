import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { canManage, requireUser } from '@/lib/auth';
import { activeWorkspace } from '@/lib/tenant';
import { voiceConfigured } from '@/lib/voice';
import { Notice, PageHeader } from '@/components/ui';
import { AgentForm } from './agent-form';
import { TestCall } from './test-call';
import { OutboundCall } from './outbound-call';
import { deleteAgent } from '../../actions';

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const workspace = await activeWorkspace(user);
  const agent = await db.agent.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!agent) notFound();
  const numbers = await db.phoneNumber.findMany({
    where: { workspaceId: workspace.id, providerNumberId: { not: null } },
    select: { id: true, number: true, label: true },
  });
  const manage = canManage(user);

  return (
    <>
      <Link href="/dashboard/agents" className="muted mb-2 inline-block hover:text-slate-900">← Agents</Link>
      <PageHeader
        title={agent.name}
        description={agent.providerAgentId ? 'Published to the voice engine.' : 'Not live yet.'}
        action={<TestCall assistantId={agent.providerAgentId} publicKey={process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? null} />}
      />
      {voiceConfigured() && !agent.providerAgentId && (
        <Notice tone="warn">This agent isn&apos;t live yet. Press Save &amp; publish to put it live.</Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <AgentForm agent={agent} readOnly={!manage} />
        <div className="space-y-6">
          {manage && <OutboundCall agentId={agent.id} numbers={numbers} />}
          {manage && (
            <form action={deleteAgent.bind(null, agent.id)} className="card">
              <h3 className="font-semibold">Delete agent</h3>
              <p className="muted mt-1">Removes the agent and unassigns its numbers. Call logs are kept.</p>
              <button className="btn-danger mt-3">Delete</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
