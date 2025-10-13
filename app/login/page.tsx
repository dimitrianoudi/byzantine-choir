'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      router.push('/');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Λάθος κωδικός');
    }
    setLoading(false);
  };

  return (
    <main className="container">
      <div className="max-w-md mx-auto mt-16">
        {/* Brand / heading */}
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Είσοδος Μελών
        </h1>
        <p className="text-sm text-muted mt-1">
          Πληκτρολογήστε τον κωδικό πρόσβασης που χρησιμοποιεί η χορωδία.
        </p>

        {/* Card */}
        <div className="card p-6 mt-5 space-y-4">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="code" className="text-sm text-muted">
                Κωδικός
              </label>
              <input
                id="code"
                className="input mt-1"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="π.χ. ISOKRATIMA2025"
                required
              />
            </div>

            {error && (
              <div className="text-sm" style={{ color: '#b91c1c' /* red-700 */ }}>
                {error}
              </div>
            )}

            <div className="actions">
              <button className="btn btn-gold" disabled={loading} type="submit">
                {loading ? 'Σύνδεση…' : 'Σύνδεση'}
              </button>
              <a className="btn btn-outline" href="/">
                Επιστροφή
              </a>
            </div>
          </form>

          <p className="text-xs text-muted">
            Σημ.: Ο δάσκαλος έχει ξεχωριστό κωδικό διαχειριστή.
          </p>
        </div>
      </div>
    </main>
  );
}
