/* ═══════════════════════════════════════════════════════════════════════════
   PayslipHero — page banner + period selector
   ───────────────────────────────────────────────────────────────────
   Purely presentational header card. All state lives in the parent page;
   this component only renders what it's given and fires callbacks.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import { MONTH_LABELS, periodLabel } from "../helpers/payslipFormatters";

export interface PayslipHeroProps {
  category: "civil-servant" | "other-public-servant";
  period: { month: number; year: number };
  onChangePeriod: (next: { month: number; year: number }) => void;
  activeCount: number;
  totalCount: number;
}

function yearOptions(current: number): number[] {
  return [current - 2, current - 1, current, current + 1];
}

export function PayslipHero(props: PayslipHeroProps) {
  const { category, period, onChangePeriod, activeCount, totalCount } = props;
  const toneBadge =
    category === "civil-servant"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";
  const subtitle =
    category === "civil-servant"
      ? "Civil Servant payslips for the selected pay period."
      : "Other Public Servant (OPS) payslips for the selected pay period.";

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              Payroll · Payslip Generation
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${toneBadge}`}>
              {category === "civil-servant" ? "Civil Servant" : "OPS"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Payslips — {periodLabel(period.month, period.year)}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Period
          </label>
          <select
            value={period.month}
            onChange={(e) =>
              onChangePeriod({ ...period, month: parseInt(e.target.value, 10) })
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {MONTH_LABELS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={period.year}
            onChange={(e) =>
              onChangePeriod({ ...period, year: parseInt(e.target.value, 10) })
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {yearOptions(new Date().getFullYear()).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 font-semibold">
          In scope: {activeCount} / {totalCount} employees
        </span>
        <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5">
          Figures recompute from the live employee master + Paybill Standard.
        </span>
      </div>
    </div>
  );
}
