/* ═══════════════════════════════════════════════════════════════════════════
   PayslipFiltersBar — search + department filter
   ───────────────────────────────────────────────────────────────────
   Two small inputs that filter the employee table below. Parent owns the
   state; this component is dumb.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";

export interface PayslipFiltersBarProps {
  search: string;
  onSearchChange: (next: string) => void;
  department: string;
  departments: string[];
  onDepartmentChange: (next: string) => void;
  matchedCount: number;
}

export function PayslipFiltersBar(props: PayslipFiltersBarProps) {
  const {
    search,
    onSearchChange,
    department,
    departments,
    onDepartmentChange,
    matchedCount,
  } = props;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Search
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Name, CID, EID or Employee ID"
          className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Department
        </label>
        <select
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="all">All departments ({departments.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2 text-[12px] text-slate-600">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
          {matchedCount} matching
        </span>
      </div>
    </div>
  );
}
