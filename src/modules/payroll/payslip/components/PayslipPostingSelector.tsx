/* ═══════════════════════════════════════════════════════════════════════════
   PayslipPostingSelector — pick a posted payroll run as the payslip scope
   ───────────────────────────────────────────────────────────────────
   Payslips should only be generated for payroll runs that have been
   Posted to MCP (status: awaiting-payment / processing / paid).
   Rejected postings are hidden. Selecting "All processed runs" lets
   officers browse every employee in the current category.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import type {
  PayrollPosting,
  PayrollPostingStream,
} from "../../state/payrollPostings";
import { nu, periodLabel } from "../helpers/payslipFormatters";

export interface PayslipPostingSelectorProps {
  postings: PayrollPosting[];
  stream: PayrollPostingStream;
  selectedPostingId: string | null;
  onSelect: (postingId: string | null) => void;
}

function isEligible(p: PayrollPosting): boolean {
  return p.status !== "rejected";
}

export function PayslipPostingSelector(props: PayslipPostingSelectorProps) {
  const { postings, stream, selectedPostingId, onSelect } = props;
  const eligible = postings.filter(
    (p) => p.stream === stream && isEligible(p),
  );

  if (eligible.length === 0) {
    return (
      <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">
          Payroll posting
        </div>
        No payroll runs have been posted for this stream yet. Payslips will be
        available once a run is processed via{" "}
        <strong>Payroll Generation → Post to MCP</strong>. You can still preview
        calculated payslips from the employee table below.
      </div>
    );
  }

  const selected = eligible.find((p) => p.id === selectedPostingId) ?? null;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        Payroll posting
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedPostingId ?? ""}
          onChange={(e) => onSelect(e.target.value || null)}
          className="min-w-[320px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">All processed runs ({eligible.length})</option>
          {eligible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.journalEntryId} — {p.agencyName} — {periodLabel(p.month, p.year)}
            </option>
          ))}
        </select>

        {selected && (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
              {selected.employeeCount} employees
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
              Net: {nu(selected.netAmount)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                selected.status === "paid"
                  ? "bg-emerald-100 text-emerald-700"
                  : selected.status === "processing"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {selected.status.replace("-", " ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
