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
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let googleButtonObserver: MutationObserver | undefined;
    let edgeFixFrame: number | undefined;

    const renderGoogleButton = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        retryCount += 1;
        if (retryCount >= 100) return;
        retryTimer = setTimeout(renderGoogleButton, 100);
        return;
      }

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
      if (!el) return;
      const availableWidth = Math.floor(
        el.getBoundingClientRect().width,
      );
      const buttonWidth = Math.min(
        316,
        Math.max(120, availableWidth - 8),
      );
      el.replaceChildren();
      const addPersonalizedButtonBreathingRoom = () => {
        const button = el.querySelector<HTMLElement>('[role="button"]');
        if (!button || button.dataset.edgeSpacingApplied === "true") {
          return;
        }

        const renderedWidth = Math.ceil(
          button.getBoundingClientRect().width,
        );
        if (!renderedWidth) return;

        button.dataset.edgeSpacingApplied = "true";
        button.style.setProperty(
          "width",
          `${Math.min(renderedWidth + 4, availableWidth - 4)}px`,
          "important",
        );
        button.style.setProperty("max-width", "none", "important");
        button.style.transform = "translateX(-2px)";
      };

      googleButtonObserver?.disconnect();
      googleButtonObserver = new MutationObserver(
        addPersonalizedButtonBreathingRoom,
      );
      googleButtonObserver.observe(el, {
        childList: true,
        subtree: true,
      });
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: buttonWidth,
      });
      addPersonalizedButtonBreathingRoom();
      edgeFixFrame = requestAnimationFrame(
        addPersonalizedButtonBreathingRoom,
      );
    };

    renderGoogleButton();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (edgeFixFrame) cancelAnimationFrame(edgeFixFrame);
      googleButtonObserver?.disconnect();
    };
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

      <style jsx global>{`
        #google-btn,
        #google-btn > div,
        #google-btn > div > div {
          overflow: visible !important;
        }
      `}</style>

      {googleOnly && (
        <p className="text-xs text-muted mt-6 text-center">
          
        </p>
      )}
    </div>
  );
}
