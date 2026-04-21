/* Display helpers — status colours and type icons */
export const statusColor = (s: string) => {
  if (s === "Active") return "bg-red-100 text-red-700 border-red-200";
  if (s === "Lifted") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "Expired") return "bg-slate-100 text-slate-600 border-slate-200";
  if (s === "Approved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "Hold") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

export const typeIcon = (t: string) => {
  if (t === "Suspension") return "\u23F8\uFE0F";
  if (t === "Debarment") return "\uD83D\uDEAB";
  if (t === "Warning") return "\u26A0\uFE0F";
  return "\uD83D\uDCCB";
};
