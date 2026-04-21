import React from "react";
import { EmployeeCategory } from "../types";
import { PayrollAnalyticsDashboard } from "./PayrollAnalyticsDashboard";

export interface PayrollOverviewSectionProps {
  category: EmployeeCategory;
  count: number;
  agencyCode: string;
  onDrillDown: () => void;
}

export function PayrollOverviewSection({
  category,
  count,
  agencyCode,
  onDrillDown,
}: PayrollOverviewSectionProps) {
  const isCS = category === "civil-servant";
  const tone = isCS
    ? {
        shell:
          "border-blue-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))]",
        accent: "bg-[linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)]",
        badge: "bg-blue-100 text-blue-700",
        title: "Civil Service",
      }
    : {
        shell:
          "border-amber-200/90 bg-[linear-gradient(135deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))]",
        accent: "bg-[linear-gradient(135deg,#b45309,#d97706,#f59e0b)]",
        badge: "bg-amber-100 text-amber-700",
        title: "Other Public Service",
      };

  return (
    <section className={`overflow-hidden rounded-[30px] border shadow-[0_26px_70px_rgba(15,23,42,0.08)] ${tone.shell}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${tone.accent}`} />
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">{tone.title}</h3>
            <p className="text-xs text-slate-500">
              {isCS ? "ZESt source only" : "Interface / Manual / Bulk Upload"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone.badge}`}>
            {count} records
          </span>
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            {agencyCode ? `UCoA ${agencyCode}` : "All agencies"}
          </span>
          <button
            onClick={onDrillDown}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Open workspace →
          </button>
        </div>
      </div>
      <div className="p-5">
        <PayrollAnalyticsDashboard category={category} agencyCode={agencyCode} />
      </div>
    </section>
  );
}
