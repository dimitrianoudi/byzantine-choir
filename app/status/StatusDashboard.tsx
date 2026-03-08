"use client";

import { useEffect, useMemo, useState } from "react";
import type { SystemStatus } from "@/lib/status";

const REFRESH_MS = 30_000;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("el-GR");
}

function groupDescription(group: string) {
  if (group === "Platform") return "Core application and member access";
  if (group === "Infrastructure") return "Monitoring and storage services";
  return "External services connected to the portal";
}

export default function StatusDashboard({ initialStatus }: { initialStatus: SystemStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState(Date.now() + REFRESH_MS);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      setIsRefreshing(true);
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data: SystemStatus = await res.json();
        if (!mounted) return;
        setStatus(data);
        setRefreshError(null);
        setNextRefreshAt(Date.now() + REFRESH_MS);
      } catch (err: any) {
        if (!mounted) return;
        setRefreshError(err?.message || "Unable to refresh");
        setNextRefreshAt(Date.now() + REFRESH_MS);
      } finally {
        if (mounted) setIsRefreshing(false);
      }
    }

    const refreshTimer = window.setInterval(refresh, REFRESH_MS);
    const countdownTimer = window.setInterval(() => {
      if (mounted) setNow(Date.now());
    }, 1000);

    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
      window.clearInterval(countdownTimer);
    };
  }, []);

  const groupedServices = useMemo(() => {
    const groups = new Map<string, SystemStatus["services"]>();
    for (const service of status.services) {
      const list = groups.get(service.group) || [];
      list.push(service);
      groups.set(service.group, list);
    }
    return Array.from(groups.entries());
  }, [status]);

  const okCount = status.services.filter((s) => s.ok).length;
  const badCount = status.services.length - okCount;
  const secondsUntilRefresh = Math.max(0, Math.ceil((nextRefreshAt - now) / 1000));

  return (
    <main className="container section space-y-6">
      <section className="card status-hero">
        <div className="status-hero-copy">
          <div className="status-kicker">Ζωντανή κατάσταση συστήματος</div>
          <h1 className="font-heading text-blue status-title">Πίνακας Κατάστασης Υπηρεσιών</h1>
          <p className="text-muted status-subtitle">
            Δημόσια επισκόπηση των βασικών συστημάτων και των συνδεδεμένων υπηρεσιών της πλατφόρμας.
          </p>
        </div>
        <div className={status.healthy ? "badge status-badge-ok" : "badge status-badge-bad"}>
          {status.healthy ? "All systems operational" : "Service disruption detected"}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-muted">Τρέχουσα εικόνα λειτουργίας</div>
          <div className="text-lg font-semibold mt-1">{status.healthy ? "Ομαλή" : "Υποβαθμισμένη"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Υγιείς υπηρεσίες</div>
          <div className="text-2xl font-semibold mt-1">{okCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Προβλήματα</div>
          <div className="text-2xl font-semibold mt-1">{badCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Τελευταίος έλεγχος</div>
          <div className="text-sm font-medium mt-1">{fmtDate(status.checkedAt)}</div>
        </div>
      </div>

      <div className="card status-toolbar">
        <div className="text-sm text-muted">
          Αυτόματη ανανέωση κάθε 30 δευτερόλεπτα. Επόμενη ανανέωση σε {secondsUntilRefresh}δ.
        </div>
        <div className="status-toolbar-right">
          {refreshError ? <span className="badge status-badge-bad">{refreshError}</span> : null}
          {isRefreshing ? <span className="badge">Refreshing...</span> : null}
        </div>
      </div>

      {groupedServices.map(([group, services]) => (
        <section key={group} className="card p-4 space-y-3">
          <div className="status-section-head">
            <div>
              <h2 className="font-semibold">{group}</h2>
              <div className="text-sm text-muted">{groupDescription(group)}</div>
            </div>
            <div className="text-xs text-muted">
              {services.filter((service) => service.ok).length}/{services.length} operational
            </div>
          </div>

          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.key} className="status-row">
                <div className="status-row-main">
                  <span className={service.ok ? "status-dot status-dot-ok" : "status-dot status-dot-bad"} />
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted">{service.message}</div>
                  </div>
                </div>
                <div className={service.ok ? "status-pill status-pill-ok" : "status-pill status-pill-bad"}>
                  {service.ok ? "Operational" : "Down"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <style jsx>{`
        .status-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 20px;
        }
        .status-hero-copy {
          min-width: 0;
        }
        .status-kicker {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .status-title {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.1;
          margin: 0;
        }
        .status-subtitle {
          margin-top: 10px;
          max-width: 60ch;
        }
        .status-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
        }
        .status-toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid var(--border);
        }
        .status-row:first-child {
          border-top: 0;
          padding-top: 0;
        }
        .status-row-main {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          margin-top: 6px;
          flex: 0 0 auto;
        }
        .status-dot-ok {
          background: #16a34a;
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.14);
        }
        .status-dot-bad {
          background: #dc2626;
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.14);
        }
        .status-pill {
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .status-pill-ok,
        .status-badge-ok {
          background: rgba(22, 163, 74, 0.12);
          color: #166534;
        }
        .status-pill-bad,
        .status-badge-bad {
          background: rgba(220, 38, 38, 0.12);
          color: #991b1b;
        }
        @media (max-width: 768px) {
          .status-hero,
          .status-toolbar,
          .status-section-head,
          .status-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .status-title {
            font-size: 24px;
          }
        }
      `}</style>
    </main>
  );
}
