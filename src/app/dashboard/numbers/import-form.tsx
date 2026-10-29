'use client';

import { useFormAction } from '@/components/use-form-action';
import { useState } from 'react';
import { importNumber } from '../actions';
import { FormMessage } from '@/components/ui';

export function ImportNumberForm() {
  const { state, pending, formProps } = useFormAction(importNumber, { resetOnSuccess: true });
  const [kind, setKind] = useState<'twilio' | 'sip'>('twilio');
  return (
    <form {...formProps} className="card space-y-3">
      <h3 className="font-semibold">Add a number</h3>
      <div className="flex gap-2 text-sm">
        {(['twilio', 'sip'] as const).map((k) => (
          <label key={k} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${kind === k ? 'border-brand bg-brand/5 font-semibold text-brand' : 'border-slate-300'}`}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
            {k === 'twilio' ? 'Twilio' : 'SIP trunk'}
          </label>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="number">Number</label>
        <input className="input" id="number" name="number" placeholder="+27101234567" required />
      </div>
      <div>
        <label className="label" htmlFor="label">Label</label>
        <input className="input" id="label" name="label" placeholder="Main line" />
      </div>
      {kind === 'twilio' ? (
        <>
          <div>
            <label className="label" htmlFor="accountSid">Twilio Account SID</label>
            <input className="input" id="accountSid" name="accountSid" required />
          </div>
          <div>
            <label className="label" htmlFor="authToken">Twilio Auth Token</label>
            <input className="input" id="authToken" name="authToken" type="password" required />
          </div>
        </>
      ) : (
        <div>
          <label className="label" htmlFor="credentialId">SIP trunk credential ID</label>
          <input className="input" id="credentialId" name="credentialId" required />
          <p className="mt-1 text-xs text-slate-500">Create the SIP trunk credential in the Vapi dashboard first, then paste its ID here.</p>
        </div>
      )}
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Adding…' : 'Add number'}</button>
      <FormMessage state={state} />
    </form>
  );
}
