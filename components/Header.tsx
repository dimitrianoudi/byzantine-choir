'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Logo from '@/components/Logo';

type Role = 'member' | 'admin';

export default function Header({ role }: { role: Role }) {
  const pathname = usePathname();

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
    return (
      <Link href={href} className={clsx('btn btn-outline', active && 'btn--selected')}>
        {label}
      </Link>
    );
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {}
  };

  return (
    <header className="header">
      <div className="header-inner">
        {/* Left: brand/logo (can grow tall without pushing right column) */}
        <div className="flex items-center gap-3 min-w-0">
          <Logo size={66} withWordmark />
        </div>

        {/* Right: NAV (top-right) + actions (below-right) */}
        <div className="header-right">
          <nav className="nav">
            <NavLink href="/" label="Αρχική" />
            <NavLink href="/material" label="Υλικό" />
            <NavLink href="/calendar" label="Ημερολόγιο" />
            {role === 'admin' && <NavLink href="/upload" label="Ανέβασμα" />}
          </nav>

          <div className="actions-right">
            <span className="badge">{role === 'admin' ? 'Διαχειριστής' : 'Μέλος'}</span>
            <button className="btn btn-gold" onClick={logout}>Έξοδος</button>
          </div>
        </div>
      </div>
    </header>
  );
}
