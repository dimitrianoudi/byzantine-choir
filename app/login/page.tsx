'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const router = useRouter();
  const googleDivRef = useRef<HTMLDivElement>(null);

  // Create session via your existing code login
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    if (res.ok) router.push("/");
    else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Λάθος κωδικός");
      setLoading(false);
    }
  };

  // Load Google Identity Services and render the button
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return;

    // Inject script once
    const id = "google-gsi";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.id = id;
      s.onload = initGis;
      document.head.appendChild(s);
    } else {
      initGis();
    }

    function initGis() {
      if (!window.google || !googleDivRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: any) => {
          try {
            setError(null);
            const r = await fetch("/api/login/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: resp.credential }),
            });
            if (r.ok) {
              router.push("/");
            } else {
              const data = await r.json().catch(() => ({}));
              setError(data?.error || "Google login failed");
            }
          } catch (e: any) {
            setError(e?.message || "Google login failed");
          }
        },
        auto_select: false,
        ux_mode: "popup",
      });

      window.google.accounts.id.renderButton(googleDivRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: 260,
      });
    }
  }, [router]);

  return (
    <main className="container">
      <div className="max-w-md mx-auto mt-16">
        <h1 className="font-heading text-blue" style={{ fontWeight: 700, fontSize: 22 }}>
          Είσοδος Μελών
        </h1>
        <p className="text-sm text-muted mt-1">
          Συνδεθείτε με κωδικό ή με Google.
        </p>

        <div className="card p-6 mt-5 space-y-4">
          {/* Google button */}
          <div className="flex items-center justify-center">
            <div ref={googleDivRef} />
          </div>

          <div className="border-t border-subtle my-2" />

          {/* Existing code login */}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="code" className="text-sm text-muted">Κωδικός</label>
              <input
                id="code" className="input mt-1" type="password"
                value={code} onChange={(e)=>setCode(e.target.value)}
                placeholder="π.χ. ISOKRATIMA2025" required
              />
            </div>
            {error && <div className="text-sm" style={{ color: '#b91c1c' }}>{error}</div>}
            <div className="actions">
              <button className="btn btn-gold" disabled={loading} type="submit">
                {loading ? "Σύνδεση…" : "Σύνδεση"}
              </button>
              <a className="btn btn-outline" href="/">Επιστροφή</a>
            </div>
          </form>
        </div>

        <p className="text-xs text-muted mt-3">
          Μόνο εγκεκριμένοι λογαριασμοί μπορούν να εισέλθουν.
        </p>
      </div>
    </main>
  );
}
