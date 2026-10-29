'use client';

import { useFormAction } from '@/components/use-form-action';
import { addTeamMember, updateBranding } from '../actions';
import { FormMessage } from '@/components/ui';

export function BrandingForm(props: { brandName: string; brandColor: string; logoUrl: string }) {
  const { state, pending, formProps } = useFormAction(updateBranding);
  return (
    <form {...formProps} className="card space-y-3">
      <h2 className="font-semibold">Branding</h2>
      <p className="muted">How the dashboard looks for your team.</p>
      <div>
        <label className="label" htmlFor="brandName">Business name</label>
        <input className="input" id="brandName" name="brandName" defaultValue={props.brandName} />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="label" htmlFor="logoUrl">Logo URL</label>
          <input className="input" id="logoUrl" name="logoUrl" placeholder="https://…" defaultValue={props.logoUrl} />
        </div>
        <div>
          <label className="label" htmlFor="brandColor">Colour</label>
          <input className="h-[38px] w-16 cursor-pointer rounded-lg border border-slate-300" id="brandColor" name="brandColor" type="color" defaultValue={props.brandColor} />
        </div>
      </div>
      <button className="btn-primary" disabled={pending}>Save branding</button>
      <FormMessage state={state} />
    </form>
  );
}

export function TeamForm({ allowPlatformAdmin }: { allowPlatformAdmin: boolean }) {
  const { state, pending, formProps } = useFormAction(addTeamMember, { resetOnSuccess: true });
  return (
    <form {...formProps} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <h3 className="text-sm font-semibold">Add a team member</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="input" name="name" placeholder="Name" />
        <input className="input" name="email" type="email" placeholder="Email" required />
        <input className="input" name="password" type="password" placeholder="Temporary password (10+ chars)" required minLength={10} />
        <select className="input" name="role" defaultValue="CLIENT_ADMIN">
          {allowPlatformAdmin && <option value="PLATFORM_ADMIN">Platform admin</option>}
          <option value="CLIENT_ADMIN">Admin</option>
          <option value="CLIENT_MEMBER">Viewer</option>
        </select>
      </div>
      <button className="btn-secondary" disabled={pending}>Add member</button>
      <FormMessage state={state} />
    </form>
  );
}
