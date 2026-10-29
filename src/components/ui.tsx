import Link from 'next/link';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h1">{title}</h1>
        {description && <p className="muted mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ended: 'bg-slate-100 text-slate-700',
  'in-progress': 'bg-emerald-100 text-emerald-700',
  ringing: 'bg-amber-100 text-amber-700',
  queued: 'bg-sky-100 text-sky-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-slate-100 text-slate-600',
  suspended: 'bg-red-100 text-red-700',
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${STATUS_STYLES[tone ?? String(children)] ?? 'bg-slate-100 text-slate-700'}`}>{children}</span>;
}

export function Empty({ title, children, href, cta }: { title: string; children?: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="card py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="muted mx-auto mt-1 max-w-md">{children}</p>}
      {href && cta && <Link href={href} className="btn-primary mt-4">{cta}</Link>}
    </div>
  );
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) {
  const cls = tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-sky-200 bg-sky-50 text-sky-800';
  return <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } | null | undefined }) {
  if (!state) return null;
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-emerald-700">{state.ok}</p>;
  return null;
}
