import React from "react";

export type OpsSourceMode = "interface" | "manual" | "bulk";

export interface OpsSourceTabsProps {
  mode: OpsSourceMode;
  onChange: (m: OpsSourceMode) => void;
}

export function OpsSourceTabs({ mode, onChange }: OpsSourceTabsProps) {
  const modes: Array<{ id: OpsSourceMode; label: string; icon: string; desc: string }> = [
    {
      id: "interface",
      label: "Interfacing System",
      icon: "🔗",
      desc: "Pull from RBP HRMS, Judiciary HRIS, Parliament HR, NA/NC, LG portals",
    },
    { id: "manual", label: "Manual Entry", icon: "✍️", desc: "Enter records one by one via Employee Master form" },
    { id: "bulk", label: "Bulk Upload", icon: "📥", desc: "Upload XLSX / CSV template (DDi 1.1–1.36 columns)" },
  ];
  return (
    <div className="mb-4 rounded-[24px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.98),rgba(255,255,255,0.98))] p-4 shadow-[0_20px_50px_rgba(217,119,6,0.08)]">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
        Other Public Servant — Data Source
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {modes.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`text-left rounded-2xl border p-4 shadow-sm transition ${
                active
                  ? "border-amber-500 bg-white shadow-[0_14px_30px_rgba(217,119,6,0.12)] ring-2 ring-amber-100"
                  : "border-white/80 bg-white/85 hover:border-amber-300 hover:bg-white"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-amber-600 text-white shadow-[0_10px_20px_rgba(217,119,6,0.18)]" : "bg-amber-50 text-amber-700"}`}>{m.icon}</span>
                <span className={`text-sm font-bold ${active ? "text-amber-950" : "text-slate-800"}`}>
                  {m.label}
                </span>
              </div>
              <div className="text-[11px] leading-snug text-slate-600">{m.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
