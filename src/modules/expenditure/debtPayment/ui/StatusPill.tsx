/* StatusPill — coloured chip for Debt Servicing payment status.
   Tone is driven by keyword semantics so admin-renamed master-data values
   still colour correctly. Never hard-codes exact strings. */
import {
  isPaidStatus,
  isApprovedStatus,
  isProcessedStatus,
  isPendingStatus,
  isOverdueStatus,
  isCancelledStatus,
  isHoldStatus,
} from "../state/useDebtMasterData";

export function StatusPill({ value }: { value: string }) {
  const v = value || "";
  let cls = "bg-slate-100 text-slate-600";
  if (isPaidStatus(v)) cls = "bg-emerald-100 text-emerald-700";
  else if (isApprovedStatus(v) || isProcessedStatus(v)) cls = "bg-green-100 text-green-700";
  else if (isPendingStatus(v)) cls = "bg-amber-100 text-amber-700";
  else if (isOverdueStatus(v)) cls = "bg-rose-100 text-rose-700";
  else if (isHoldStatus(v)) cls = "bg-orange-100 text-orange-700";
  else if (isCancelledStatus(v)) cls = "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {value || "—"}
    </span>
  );
}
