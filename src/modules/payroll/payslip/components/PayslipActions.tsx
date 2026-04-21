/* ═══════════════════════════════════════════════════════════════════════════
   PayslipActions — action buttons for the currently-previewed payslip
   ───────────────────────────────────────────────────────────────────
   Print uses the browser's print dialog (the PayslipCard has print: utility
   classes for a clean output). Download-PDF and Bulk-generate are stubbed
   with a toast-style alert for now; wiring them to a real PDF backend is
   a follow-up.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";

export interface PayslipActionsProps {
  disabled: boolean;
  inScopeCount: number;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onBulkGenerate: () => void;
}

export function PayslipActions(props: PayslipActionsProps) {
  const { disabled, inScopeCount, onPrint, onDownloadPdf, onBulkGenerate } = props;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
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
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        📄 Download PDF
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
  );
}
