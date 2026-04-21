/* StatusPill — keyword-driven colouring so admin-renamed master-data values
   still resolve to the right tone. */
import {
  isDraftStatus,
  isSubmittedStatus,
  isCoordReviewStatus,
  isFinanceReviewStatus,
  isHeadReviewStatus,
  isApprovedStatus,
  isActiveStatus,
  isSuspendedStatus,
  isClosedStatus,
  isExpiredStatus,
  isRejectedStatus,
  isValidationTxn,
  isPoGeneratedTxn,
  isReleasedTxn,
} from "../state/useSbMasterData";

export function StatusPill({ value }: { value: string }) {
  const v = value || "";
  let cls = "bg-slate-100 text-slate-600";
  if (isReleasedTxn(v)) cls = "bg-emerald-100 text-emerald-700";
  else if (isPoGeneratedTxn(v)) cls = "bg-teal-100 text-teal-700";
  else if (isActiveStatus(v)) cls = "bg-emerald-100 text-emerald-700";
  else if (isApprovedStatus(v)) cls = "bg-green-100 text-green-700";
  else if (isValidationTxn(v)) cls = "bg-fuchsia-100 text-fuchsia-700";
  else if (isHeadReviewStatus(v)) cls = "bg-violet-100 text-violet-700";
  else if (isFinanceReviewStatus(v)) cls = "bg-sky-100 text-sky-700";
  else if (isCoordReviewStatus(v)) cls = "bg-blue-100 text-blue-700";
  else if (isSubmittedStatus(v)) cls = "bg-amber-100 text-amber-700";
  else if (isDraftStatus(v)) cls = "bg-slate-100 text-slate-600";
  else if (isSuspendedStatus(v)) cls = "bg-orange-100 text-orange-700";
  else if (isClosedStatus(v)) cls = "bg-rose-100 text-rose-700";
  else if (isRejectedStatus(v)) cls = "bg-rose-100 text-rose-700";
  else if (isExpiredStatus(v)) cls = "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {value || "—"}
    </span>
  );
}
