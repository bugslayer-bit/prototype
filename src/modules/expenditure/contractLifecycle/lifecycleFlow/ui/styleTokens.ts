/* Style tokens + formatters for ContractLifecyclePage */
export const panelClass =
  "overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]";
export const headerClass = "border-b border-slate-200 bg-slate-50/80 px-6 py-5";

export const adherenceColor = (v: string) => {
  if (v === "on-track" || v === "ahead") return "bg-emerald-100 text-emerald-700";
  if (v === "at-risk") return "bg-amber-100 text-amber-700";
  if (v === "delayed" || v === "behind") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
};

export const statusColor = (s: string) => {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "completed") return "bg-blue-100 text-blue-700";
  if (s === "overdue") return "bg-rose-100 text-rose-700";
  if (s === "in-progress") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

export const fmt = (v: string | number) => {
  const n = typeof v === "number" ? v : parseFloat(v || "0");
  if (isNaN(n)) return String(v);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
