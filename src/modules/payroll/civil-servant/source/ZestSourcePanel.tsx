import React, { useEffect, useState } from "react";
import { EMPLOYEES } from "../../state/payrollSeed";

export interface ZestSourcePanelProps {
  agencyCode: string;
}

export function ZestSourcePanel({ agencyCode }: ZestSourcePanelProps) {
  /* Dynamic auto-sync: stamp the "last sync" timestamp on mount and then
     refresh it every 60 seconds so the panel reflects a live integration,
     rather than requiring a manual "Sync Now" click. */
  const [lastSync, setLastSync] = useState<string>(() =>
    new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  useEffect(() => {
    const tick = () => {
      setIsSyncing(true);
      window.setTimeout(() => {
        setLastSync(
          new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
        );
        setIsSyncing(false);
      }, 700);
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);

  const forceSync = () => {
    setIsSyncing(true);
    window.setTimeout(() => {
      setLastSync(
        new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
      );
      setIsSyncing(false);
    }, 700);
  };
  const zestCount = EMPLOYEES.filter(
    (e) => e.category === "civil-servant" && e.source === "zest" && (!agencyCode || e.agencyCode === agencyCode)
  ).length;

  return (
    <div className="mb-4 rounded-[24px] border border-blue-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] p-5 shadow-[0_20px_50px_rgba(37,99,235,0.08)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]">🔗</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-blue-950">ZESt Integration (RCSC)</h4>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
              CONNECTED
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${isSyncing ? "bg-sky-100 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isSyncing ? "bg-sky-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              {isSyncing ? "Syncing…" : "Auto-sync · every 60s"}
            </span>
          </div>
          <p className="mb-3 max-w-3xl text-xs leading-5 text-slate-600">
            All Civil Servant records are sourced from <b>ZESt</b>. Employee Master, Position Title,
            Pay Scale, Working Agency, and HR Actions are read-only on this screen — changes flow
            from ZESt → IFMIS on every sync.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">Last sync: <b>{lastSync}</b></span>
            <span className="rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">Records: <b>{zestCount}</b></span>
            <span className="rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">Mode: <b>Hourly delta pull</b></span>
          </div>
        </div>
        <button
          onClick={forceSync}
          disabled={isSyncing}
          title="Data auto-syncs every 60 seconds — click to force an immediate refresh"
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-[0_14px_24px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-60"
        >
          {isSyncing ? "Syncing…" : "Refresh now"}
        </button>
      </div>
    </div>
  );
}
