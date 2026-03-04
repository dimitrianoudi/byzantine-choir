"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SID_KEY = "bcp:activity:sid";
const START_KEY = "bcp:activity:start";

function getSessionId() {
  const existing = window.sessionStorage.getItem(SID_KEY);
  if (existing) return existing;
  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(SID_KEY, next);
  window.sessionStorage.setItem(START_KEY, String(Date.now()));
  return next;
}

export default function ActivityTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const sentPathRef = useRef<string>("");
  const path = useMemo(() => {
    const q = sp?.toString();
    return `${pathname || "/"}${q ? `?${q}` : ""}`;
  }, [pathname, sp]);

  useEffect(() => {
    if (!enabled) return;
    const sessionId = getSessionId();
    if (sentPathRef.current === path) return;
    sentPathRef.current = path;

    fetch("/api/analytics/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "page_view",
        sessionId,
        path,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [enabled, path]);

  useEffect(() => {
    if (!enabled) return;

    const sendEnd = () => {
      const sessionId = window.sessionStorage.getItem(SID_KEY);
      const started = Number(window.sessionStorage.getItem(START_KEY) || 0);
      if (!sessionId || !started) return;
      const durationMs = Math.max(0, Date.now() - started);
      const payload = JSON.stringify({
        event: "session_end",
        sessionId,
        path: path || "/",
        durationMs,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/activity", blob);
      } else {
        fetch("/api/analytics/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("pagehide", sendEnd);
    return () => window.removeEventListener("pagehide", sendEnd);
  }, [enabled, path]);

  return null;
}
