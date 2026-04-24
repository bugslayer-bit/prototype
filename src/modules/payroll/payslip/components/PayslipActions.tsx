/* ═══════════════════════════════════════════════════════════════════════════
   PayslipActions — action buttons for the currently-previewed payslip
   ───────────────────────────────────────────────────────────────────
   Includes a Regular / Last variant toggle (SRS: "system shall have option
   to download 2 different format of payslip"). "Auto" is the default — the
   system picks based on the employee's separation date falling in the
   selected period.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import type { PayslipVariant } from "../helpers/buildPayslip";

export type VariantMode = PayslipVariant | "auto";

export interface PayslipActionsProps {
  disabled: boolean;
  inScopeCount: number;
  variant: VariantMode;
  autoDetected: PayslipVariant | null;
  separationType: string;
  onVariantChange: (next: VariantMode) => void;
  onSeparationTypeChange: (next: string) => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onBulkGenerate: () => void;
}

const SEPARATION_TYPES = [
  "Superannuation",
  "Voluntary Resignation",
  "Early Retirement Scheme",
  "Special Retirement Scheme",
  "Compulsory Retirement",
  "Termination",
  "Agency Severance",
  "Transfer",
  "Dismissal",
  "Deceased",
];

export function PayslipActions(props: PayslipActionsProps) {
  const {
    disabled, inScopeCount, variant, autoDetected, separationType,
    onVariantChange, onSeparationTypeChange,
    onPrint, onDownloadPdf, onBulkGenerate,
  } = props;

  const effective: PayslipVariant = variant === "auto" ? (autoDetected ?? "regular") : variant;
  const isLast = effective === "last";

  return (
    <div className="mt-4 flex flex-col gap-3 print:hidden">
      {/* Variant toggle row */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
        <span className="font-bold uppercase tracking-wider text-slate-500">
          Payslip Format
        </span>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
          {(["auto", "regular", "last"] as VariantMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onVariantChange(v)}
              className={`px-3 py-1 text-xs font-semibold transition ${
                variant === v
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {v === "auto" ? "Auto" : v === "regular" ? "Regular" : "Last"}
            </button>
          ))}
        </div>
        {variant === "auto" && autoDetected && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            auto → {autoDetected}
          </span>
        )}
        {isLast && (
          <>
            <label className="ml-2 flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-500">
                Separation Type
              </span>
              <select
                value={separationType}
                onChange={(e) => onSeparationTypeChange(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              >
                {SEPARATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          🖨️ Print
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDownloadPdf}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isLast ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          📄 Download {isLast ? "Last " : ""}PDF
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            {inScopeCount} employees in scope
          </span>
          <button
            type="button"
            disabled={inScopeCount === 0}
            onClick={onBulkGenerate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            📦 Bulk generate ({inScopeCount})
          </button>
        </div>
      </div>
    </div>
  );
}
