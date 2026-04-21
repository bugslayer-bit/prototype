/* StatusPill — coloured chip for FI registration status. Tone is driven by
   keyword semantics so admin-renamed master-data values still colour correctly. */
import {
  isDraftStatus,
  isSubmittedStatus,
  isRmaReviewStatus,
  isDtaReviewStatus,
  isApprovedStatus,
  isActiveStatus,
  isSuspendedStatus,
  isRevokedStatus,
  isRejectedStatus,
  isExpiredStatus,
  isDeferredStatus,
} from "../state/useFiMasterData";

export function StatusPill({ value }: { value: string }) {
  const v = value || "";
  let cls = "bg-slate-100 text-slate-600";
  if (isActiveStatus(v)) cls = "bg-emerald-100 text-emerald-700";
  else if (isApprovedStatus(v)) cls = "bg-green-100 text-green-700";
  else if (isDtaReviewStatus(v)) cls = "bg-violet-100 text-violet-700";
  else if (isRmaReviewStatus(v)) cls = "bg-sky-100 text-sky-700";
  else if (isSubmittedStatus(v)) cls = "bg-amber-100 text-amber-700";
  else if (isDraftStatus(v)) cls = "bg-slate-100 text-slate-600";
  else if (isDeferredStatus(v)) cls = "bg-yellow-100 text-yellow-700";
  else if (isSuspendedStatus(v)) cls = "bg-orange-100 text-orange-700";
  else if (isRevokedStatus(v)) cls = "bg-rose-100 text-rose-700";
  else if (isRejectedStatus(v)) cls = "bg-rose-100 text-rose-700";
  else if (isExpiredStatus(v)) cls = "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {value || "—"}
    </span>
  );
}
