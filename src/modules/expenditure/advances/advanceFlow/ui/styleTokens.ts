/* Style tokens shared across the Advances wizard */
export const panelClass =
  "overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]";

export const headerClass =
  "border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/50 px-6 py-5";

export const inputClass =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-inner transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100";

export const lockedClass =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 cursor-not-allowed";

export const labelClass = "flex flex-col gap-1 text-sm font-semibold text-slate-700";

export const btnClass = "rounded-2xl px-5 py-3 text-sm font-bold transition shadow-lg";

/* Placeholder tag helpers — rendered nothing, kept for SRS traceability hooks */
export function ddTag(_v: string) { return null; }
export function lovTag(_v: string) { return null; }
export function brTag(_v: string) { return null; }
