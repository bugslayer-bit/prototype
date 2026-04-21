import React from "react";
import { EmployeeCategory } from "../types";

export type PayrollOverviewMode = "all" | EmployeeCategory;

export interface PayrollOverviewFiltersProps {
  mode: PayrollOverviewMode;
  onChange: (mode: PayrollOverviewMode) => void;
  csCount: number;
  opsCount: number;
}

export function PayrollOverviewFilters({
  mode,
  onChange,
  csCount,
  opsCount,
}: PayrollOverviewFiltersProps) {
  const filters = [
    {
      id: "all" as const,
      label: "All Payroll Streams",
      sub: "Flow through the whole payroll landscape",
      count: csCount + opsCount,
      active:
        "border-slate-900 bg-slate-900 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]",
      inactive: "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
    },
    {
      id: "civil-servant" as const,
      label: "Civil Service",
      sub: "Fully ZESt-driven, no manual onboarding here",
      count: csCount,
      active:
        "border-blue-500 bg-[linear-gradient(135deg,#1d4ed8,#2563eb)] text-white shadow-[0_16px_30px_rgba(37,99,235,0.18)]",
      inactive: "border-blue-100 bg-blue-50/60 text-blue-700 hover:border-blue-300",
    },
    {
      id: "other-public-servant" as const,
      label: "Other Public Service",
      sub: "Interface, manual entry, and bulk upload channels",
      count: opsCount,
      active:
        "border-amber-500 bg-[linear-gradient(135deg,#b45309,#d97706)] text-white shadow-[0_16px_30px_rgba(217,119,6,0.18)]",
      inactive: "border-amber-100 bg-amber-50/60 text-amber-700 hover:border-amber-300",
    },
  ];

  return (
    <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/80">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Dynamic View Filters
          </div>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
            Shape the payroll story on this screen
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {filters.map((filter) => {
          const isActive = mode === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onChange(filter.id)}
              className={`rounded-[24px] border p-4 text-left transition ${
                isActive ? filter.active : filter.inactive
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black leading-tight">{filter.label}</div>
                  <div
                    className={`mt-2 text-xs leading-5 ${
                      isActive ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {filter.sub}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    isActive ? "bg-white/15 text-white" : "bg-white/90 text-slate-700"
                  }`}
                >
                  {filter.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
