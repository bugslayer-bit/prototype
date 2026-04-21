import React from "react";

export function OpsManualPanel() {
  return (
    <div className="mb-4 rounded-[24px] border border-amber-200/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <h4 className="mb-2 text-sm font-bold text-amber-950">Manual Entry</h4>
      <p className="text-xs leading-6 text-slate-600">
        Use the <b>Employee Master</b> tab below to add OPS employees one by one. Required fields
        follow DDi 1.1–1.36. Pay scale dropdown is filtered to the chosen sub-category (Judiciary,
        Local Government, Parliament, Foreign Services, Religious Services, RBP, RBP Civil, RUB).
      </p>
    </div>
  );
}
