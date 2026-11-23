'use client';

import { useEffect } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const googleOnly = process.env.NEXT_PUBLIC_AUTH_MODE === "google_only";

  useEffect(() => {
    // Initialize Google Identity button when script + client id are available
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        try {
          const res = await fetch("/api/login/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });
          if (res.ok) {
            window.location.replace("/");
          } else {
            const data = await res.json().catch(() => ({}));
            alert(data?.error || "Αποτυχία σύνδεσης με Google");
          }
        } catch {
          alert("Αποτυχία σύνδεσης με Google");
        }
      },
    });

    const el = document.getElementById("google-btn");
    if (el) {
      const availableWidth = Math.floor(
        el.getBoundingClientRect().width,
      );
      const buttonWidth = Math.min(
        316,
        Math.max(120, availableWidth - 8),
      );
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: buttonWidth,
      });
    }
    // Optional: One-tap prompt
    // window.google.accounts.id.prompt();
  }, []);

  return (
    <div className="max-w-md mx-auto mt-16 card p-6 text-center">
      <h2 className="text-xl font-semibold mb-4 text-red">Είσοδος Μελών</h2>
      <p className="text-muted text-sm mb-6">
        Συνδεθείτε με τον λογαριασμό σας Google.
      </p>

      {/* Google button mount point */}
      <div
        id="google-btn"
        className="flex w-full min-w-0 justify-center px-1"
      />

      {googleOnly && (
        <p className="text-xs text-muted mt-6 text-center">
          
        </p>
      )}
    </div>
  );
}
