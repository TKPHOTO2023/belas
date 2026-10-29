'use client';

import { useFormAction } from '@/components/use-form-action';
import { startOutboundCall } from '../../actions';
import { FormMessage } from '@/components/ui';

export function OutboundCall({ agentId, numbers }: { agentId: string; numbers: { id: string; number: string; label: string | null }[] }) {
  const { state, pending, formProps } = useFormAction(startOutboundCall.bind(null, agentId));
  return (
    <form {...formProps} className="card space-y-3">
      <h3 className="font-semibold">Place a phone call</h3>
      {numbers.length === 0 ? (
        <p className="muted">Add a phone number first to make outbound calls.</p>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="numberId">From</label>
            <select className="input" id="numberId" name="numberId">
              {numbers.map((n) => (
                <option key={n.id} value={n.id}>{n.label && n.label !== n.number ? `${n.label} (${n.number})` : n.number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="to">To</label>
            <input className="input" id="to" name="to" placeholder="+27821234567" required />
          </div>
          <button className="btn-primary w-full" disabled={pending}>{pending ? 'Dialling…' : 'Call now'}</button>
          <FormMessage state={state} />
        </>
      )}
    </form>
  );
}
