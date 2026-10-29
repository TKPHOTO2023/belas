// Usage pricing: clients are billed per started minute at their workspace rate.

export function billedCentsFor(durationSec: number, pricePerMinuteCents: number) {
  if (durationSec <= 0) return 0;
  return Math.ceil(durationSec / 60) * pricePerMinuteCents;
}

export function formatMoney(cents: number, currency = process.env.NEXT_PUBLIC_CURRENCY || 'USD') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
