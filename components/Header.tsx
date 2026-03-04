'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  getUserSettings,
  saveUserSettings,
} from '@/lib/userSettings';

type Role = 'member' | 'admin';
type HeaderUser = { role: Role; email?: string };

export default function Header({
  isLoggedIn,
  user,
}: {
  isLoggedIn: boolean;
  user: HeaderUser;
}) {
  const pathname = usePathname();

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
    return (
      <Link href={href} className={clsx('btn btn-outline', active && 'btn--selected')}>
        {label}
      </Link>
    );
  };

  // --- User dropdown state/handlers ---
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      (window as any).google?.accounts?.id?.disableAutoSelect?.();
    } finally {
      window.location.href = '/login';
    }
  };

  const login = () => { window.location.href = '/login'; };
  const openSettings = () => {
    setSettings(getUserSettings());
    setSettingsOpen(true);
    setOpen(false);
  };
  const closeSettings = () => setSettingsOpen(false);
  const saveSettings = () => {
    saveUserSettings(settings);
    setSettingsOpen(false);
  };

  const label =
    user?.email?.split('@')[0] ??
    (user?.role === 'admin' ? 'Διαχειριστής' : 'Μέλος');

  return (
    <header className="header">
      <div className="header-inner container">

        <Link href="/" className="flex items-center gap-3 min-w-0 no-underline">
          <img
            src="/logo_frontistirio_psaltikis.png"
            alt="Ψαλτικοί Χοροί Αγ. Αθανασίου & Ευαγγελισμού Ευόσμου"
            className="h-[104px] w-auto shrink-0 mr-2 sm:mr-3 lg:mr-4"
          />
          {/* <span
            className="ml-4 text-black font-semibold leading-tight text-base sm:text-lg max-w-[38ch]"
            style={{ fontWeight: 300 }}
          >
            Φροντιστήριο Ψαλτικής <br/>
            Ιερά Μητρόπολη Νεαπόλεως & Σταυρουπόλεως  <br/>
            Ενορία Αγ. Αθανασίου &amp; Ευαγγελισμού Ευόσμου
          </span> */}
          <span className="sr-only">Αρχική</span>
        </Link>

        {/* Right column: NAV (top-right) + user area (below) */}
        <div className="header-right">
          {/* Top row: nav — login button sits inline here when logged out */}
          <nav className="nav">
            <NavLink href="/" label="Αρχική" />
            <NavLink href="/material" label="Υλικό" />
            <NavLink href="/akolouthies" label="Ακολουθίες" />
            <NavLink href="/calendar" label="Ημερολόγιο" />
            <NavLink href="/gallery" label="Στιγμιότυπα" />

            {user?.role === 'admin' && <NavLink href="/admin/analytics" label="Στατιστικά" />}
            {user?.role === 'admin' && <NavLink href="/upload" label="Ανέβασμα" />}

            {!isLoggedIn && (
              <button className="btn login-btn btn-gold" onClick={login}>Είσοδος</button>
            )}
          </nav>

          {/* Bottom row: user dropdown (only when logged in) */}
          {isLoggedIn && (
            <div className="actions-right relative">
              <div className="relative">
                <button
                  ref={btnRef}
                  className="btn btn-outline"
                  onClick={() => setOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  {label} <span aria-hidden>▾</span>
                </button>

                {open && (
                  <div
                    ref={menuRef}
                    role="menu"
                    className="dropdown"
                    style={{
                      position: 'absolute',
                      right: 0,
                      marginTop: '0.5rem',
                      background: '#fff',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      minWidth: '12rem',
                      boxShadow: '0 10px 20px rgba(10,27,63,0.10)',
                      zIndex: 50,
                    }}
                  >
                    <div className="px-3 py-2 text-xs text-muted">
                      {user.email || '—'}
                    </div>
                    <div className="border-t border-subtle" />
                    {/* Future entries */}
                    <button className="menu-item" onClick={openSettings}>Ρυθμίσεις</button>
                    <button className="menu-item" onClick={() => alert('Σύντομα')}>Πληρωμές (σύντομα)</button>
                    <div className="border-t border-subtle" />
                    <button className="menu-item" onClick={logout}>Έξοδος</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {settingsOpen && (
        <div className="overlay" onClick={closeSettings}>
          <div className="settings-modal card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="settings-title">Ρυθμίσεις</div>
            <div className="settings-grid">
              <label className="settings-row">
                <span className="settings-label">Default Non-stop</span>
                <input
                  type="checkbox"
                  checked={settings.defaultAutoplay}
                  onChange={(e) => setSettings((v) => ({ ...v, defaultAutoplay: e.target.checked }))}
                />
              </label>

              <label className="settings-row">
                <span className="settings-label">Προτιμώμενη ταχύτητα</span>
                <select
                  className="input input--full"
                  value={String(settings.playbackRate)}
                  onChange={(e) => setSettings((v) => ({ ...v, playbackRate: Number(e.target.value) }))}
                >
                  <option value="0.8">0.8x</option>
                  <option value="1">1.0x</option>
                  <option value="1.1">1.1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                </select>
              </label>

              <label className="settings-row">
                <span className="settings-label">Default tab Υλικού</span>
                <select
                  className="input input--full"
                  value={settings.defaultMaterialTab}
                  onChange={(e) =>
                    setSettings((v) => ({
                      ...v,
                      defaultMaterialTab: e.target.value === 'pdf' ? 'pdf' : 'podcast',
                    }))
                  }
                >
                  <option value="podcast">Podcasts</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>

              <label className="settings-row">
                <span className="settings-label">Θυμήσου τελευταίο φάκελο</span>
                <input
                  type="checkbox"
                  checked={settings.rememberLastFolder}
                  onChange={(e) => setSettings((v) => ({ ...v, rememberLastFolder: e.target.checked }))}
                />
              </label>
            </div>

            <div className="settings-actions">
              <button className="btn btn-outline" type="button" onClick={closeSettings}>
                Άκυρο
              </button>
              <button className="btn btn-gold" type="button" onClick={saveSettings}>
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local styles for dropdown items (keeps CSS minimal) */}
      <style jsx>{`
        .settings-modal {
          width: min(92vw, 520px);
          padding: 16px;
          margin: 10vh auto 0;
        }
        .settings-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 10px;
        }
        .settings-grid {
          display: grid;
          gap: 10px;
        }
        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--text);
          font-size: 0.92rem;
        }
        .settings-label {
          color: var(--text);
          font-weight: 500;
        }
        .settings-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
        }
        .menu-item {
          width: 100%;
          text-align: left;
          background: #fff;
          color: var(--text);
          border: 0;
          padding: 0.5rem 0.75rem;
          font-size: 0.95rem;
          line-height: 1.25;
          cursor: pointer;
        }
        .menu-item:hover {
          background: var(--blue-200);
          color: var(--blue-700);
        }
      `}</style>
    </header>
  );
}
