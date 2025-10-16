'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window { google?: any }
}

export default function SocialRegisterButton({
  label = 'Ἐγγραφή για φυσική παρουσία στο Φροντιστήριο',
  className = 'btn btn-gold',
  redirectTo = '/material', // where to go after successful sign-in
}: {
  label?: string;
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    const id = 'google-gsi';
    const onload = () => setReady(true);
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = onload;
      document.head.appendChild(s);
    } else {
      onload();
    }
  }, [clientId]);

  const handleClick = () => {
    if (!ready || !window.google || !clientId) {
      // Fallback: go to the normal login page
      router.push('/login');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (resp: any) => {
        try {
          setBusy(true);
          const r = await fetch('/api/login/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: resp.credential }),
          });
          if (r.ok) {
            router.push(redirectTo);
          } else {
            const data = await r.json().catch(() => ({}));
            alert(data?.error || 'Google login failed');
            setBusy(false);
          }
        } catch (e: any) {
          alert(e?.message || 'Google login failed');
          setBusy(false);
        }
      },
      auto_select: false,
      ux_mode: 'popup',
    });

    window.google.accounts.id.prompt(); // show popup chooser
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={busy}
      aria-disabled={busy}
    >
      {busy ? 'Σύνδεση…' : label}
    </button>
  );
}
