// Simple dependency-free bar chart.
export function CallsChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-brand/80 transition group-hover:bg-brand"
              style={{ height: `${Math.max(d.count ? 4 : 1, (d.count / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-xs text-white group-hover:block">
              {d.label}: {d.count}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
