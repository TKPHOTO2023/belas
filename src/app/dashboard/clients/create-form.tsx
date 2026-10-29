'use client';

import { useFormAction } from '@/components/use-form-action';
import { createClient } from '../actions';
import { FormMessage } from '@/components/ui';

export function CreateClientForm() {
  const { state, pending, formProps } = useFormAction(createClient, { resetOnSuccess: true });
  return (
    <form {...formProps} className="card h-fit space-y-3">
      <h2 className="font-semibold">New client</h2>
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input className="input" id="name" name="name" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pricePerMinute">Price / minute</label>
          <input className="input" id="pricePerMinute" name="pricePerMinute" type="number" step="0.01" min="0" defaultValue="1.50" required />
        </div>
        <div>
          <label className="label" htmlFor="includedMinutes">Included min</label>
          <input className="input" id="includedMinutes" name="includedMinutes" type="number" min="0" defaultValue="0" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="adminName">Client admin name</label>
        <input className="input" id="adminName" name="adminName" />
      </div>
      <div>
        <label className="label" htmlFor="adminEmail">Client admin email</label>
        <input className="input" id="adminEmail" name="adminEmail" type="email" required />
      </div>
      <div>
        <label className="label" htmlFor="adminPassword">Temporary password</label>
        <input className="input" id="adminPassword" name="adminPassword" type="password" minLength={10} required />
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Creating…' : 'Create client'}</button>
      <FormMessage state={state} />
    </form>
  );
}
