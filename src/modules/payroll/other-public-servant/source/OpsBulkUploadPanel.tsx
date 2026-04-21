import React from "react";

export function OpsBulkUploadPanel() {
  return (
    <div className="mb-4 rounded-[24px] border border-amber-200/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <h4 className="mb-3 text-sm font-bold text-amber-950">Bulk Upload</h4>
      <div className="rounded-[24px] border-2 border-dashed border-amber-300 bg-[linear-gradient(180deg,rgba(255,251,235,0.9),rgba(255,255,255,0.96))] p-8 text-center">
        <div className="mb-3 text-4xl">📥</div>
        <p className="mb-3 text-sm leading-6 text-slate-700">
          Drop an XLSX or CSV file matching the <b>DDi 1.1–1.36</b> template, or click to browse.
        </p>
        <button className="rounded-xl bg-amber-600 px-5 py-2.5 font-bold text-white shadow-[0_14px_24px_rgba(217,119,6,0.22)] transition hover:-translate-y-0.5 hover:bg-amber-700">
          Choose File
        </button>
        <div className="mt-4 text-[11px] leading-5 text-slate-500">
          Template columns: EID, CID, Name, Gender, DoB, Category, Sub-Category, Position Title,
          Pay Scale, Working Agency (UCoA), Basic Pay, PF Eligible, GIS Eligible, Bank, A/C No, Status…
        </div>
      </div>
      <div className="mt-4 flex gap-2 text-xs">
        <button className="rounded-xl border border-amber-300 bg-amber-50/70 px-3.5 py-2 font-semibold text-amber-700 transition hover:bg-amber-100">
          Download Template
        </button>
        <button className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold text-slate-700 transition hover:bg-slate-50">
          View Upload History
        </button>
      </div>
    </div>
  );
}
