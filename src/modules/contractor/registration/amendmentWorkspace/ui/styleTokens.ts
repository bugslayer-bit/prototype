/* Style tokens for ContractorAmendmentWorkspace */
export const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

export const editableAmendmentInputClass =
  "mt-2 w-full rounded-2xl border-2 border-orange-300 bg-orange-50/30 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

export const labelClass = "block text-sm font-semibold text-slate-800";

export const cardClass =
  "rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_18px_48px_rgba(39,57,64,0.08)]";

export const lockedInputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none";

/* primaryAccountOptions intentionally typed as the literal union the
   BankAccountStage prop expects. The values themselves are conceptually a
   boolean-choice and admins can rename the display label via the
   "boolean-choice" master group, but the underlying form value stays
   strictly typed as "Yes" | "No" for downstream payload safety. */
export const primaryAccountOptions = ["Yes", "No"] as const;
