/* StatusPill — coloured chip for SOE transfer status. Tone is driven by
   keyword semantics so admin-renamed master-data values still colour correctly. */
import {
  isDraftStatus,
  isSubmittedStatus,
  isValidatedStatus,
  isApprovedStatus,
  isParliamentSanctionedStatus,
  isReleasedStatus,
  isReconciledStatus,
  isRejectedStatus,
  isCancelledStatus,
} from "../state/useSoeMasterData";

export function StatusPill({ value }: { value: string }) {
  const v = value || "";
  let cls = "bg-slate-100 text-slate-600";
  if (isReconciledStatus(v)) cls = "bg-emerald-100 text-emerald-700";
  else if (isReleasedStatus(v)) cls = "bg-green-100 text-green-700";
  else if (isParliamentSanctionedStatus(v)) cls = "bg-violet-100 text-violet-700";
  else if (isApprovedStatus(v)) cls = "bg-sky-100 text-sky-700";
  else if (isValidatedStatus(v)) cls = "bg-blue-100 text-blue-700";
  else if (isSubmittedStatus(v)) cls = "bg-amber-100 text-amber-700";
  else if (isDraftStatus(v)) cls = "bg-slate-100 text-slate-600";
  else if (isRejectedStatus(v)) cls = "bg-rose-100 text-rose-700";
  else if (isCancelledStatus(v)) cls = "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>
      {value || "—"}
    </span>
  );
}
