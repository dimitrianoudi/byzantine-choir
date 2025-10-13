'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Logo from "@/components/Logo";

type Role = 'member' | 'admin';

export default function Header({ role }: { role: Role }) {
  const pathname = usePathname();

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={clsx(
        'btn btn-outline',
        pathname === href && 'btn--selected'
      )}
    >
      {label}
    </Link>
  );

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      // redirect client-side
      window.location.href = '/login';
    } catch {}
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size={56} withWordmark />
        </div>
        <div className="header-spacer" />
        <nav className="nav">
          {link('/', 'Υλικό')}
          {role === 'admin' && link('/upload', 'Ανέβασμα')}
        </nav>

        <div className="header-spacer" />

        <div className="actions">
          <span className="badge">{role === 'admin' ? 'Διαχειριστής' : 'Μέλος'}</span>
          <button className="btn btn-gold" onClick={logout}>Έξοδος</button>
        </div>
      </div>
    </header>
  );
}
