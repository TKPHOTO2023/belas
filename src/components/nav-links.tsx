'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/agents', label: 'Agents' },
  { href: '/dashboard/numbers', label: 'Phone numbers' },
  { href: '/dashboard/calls', label: 'Call logs' },
  { href: '/dashboard/billing', label: 'Usage & billing' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function NavLinks({ showClients }: { showClients: boolean }) {
  const path = usePathname();
  const links = showClients ? [...LINKS.slice(0, 1), { href: '/dashboard/clients', label: 'Clients' }, ...LINKS.slice(1)] : LINKS;
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
      {links.map((l) => {
        const active = l.href === '/dashboard' ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
