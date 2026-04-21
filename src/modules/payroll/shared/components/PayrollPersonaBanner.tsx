/* ═══════════════════════════════════════════════════════════════════════════
   PayrollPersonaBanner
   ────────────────────
   Reusable banner for every payroll page — shows the currently active role
   (System Administrator / HR Officer / Finance Officer / HoA / Auditor…),
   their one-line tagline, and their top capabilities as pills.

   Fully driven by usePayrollRoleCapabilities(), which reacts to
   AuthContext.activeRoleId → every page using this banner updates instantly
   when the top-bar role switcher fires.
   ═══════════════════════════════════════════════════════════════════════════ */
import React from "react";
import {
  usePayrollRoleCapabilities,
  payrollToneClasses,
  type PayrollRoleCapabilities,
} from "../../state/usePayrollRoleCapabilities";

export interface PayrollPersonaBannerProps {
  /** Optional module label shown on the right ("Pay Scale Master", "HR Actions", …) */
  moduleLabel?: string;
  /** Hide blocked-actions list (useful when the page is read-only by nature) */
  hideBlocked?: boolean;
  /** Tailwind class appended to the outer wrapper */
  className?: string;
  /** Override caps (e.g. when the parent already consumes the hook) */
  caps?: PayrollRoleCapabilities;
}

export function PayrollPersonaBanner({
  moduleLabel,
  hideBlocked = false,
  className = "",
  caps: capsOverride,
}: PayrollPersonaBannerProps) {
  const capsHook = usePayrollRoleCapabilities();
  const caps = capsOverride ?? capsHook;
  const tone = payrollToneClasses(caps.personaTone);

  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-4 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
            <span className={`text-sm font-bold ${tone.text}`}>{caps.activeRoleName}</span>
            {caps.isReadOnly && (
              <span className="rounded-full bg-slate-800/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                Read-only
              </span>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">
            {caps.personaTagline}
          </p>
          {caps.capabilityList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {caps.capabilityList.slice(0, 4).map((c) => (
                <span key={c} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.pill}`}>
                  {c}
                </span>
              ))}
            </div>
          )}
          {!hideBlocked && caps.blockedList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {caps.blockedList.slice(0, 3).map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-100"
                >
                  🚫 {b}
                </span>
              ))}
            </div>
          )}
        </div>
        {moduleLabel && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tone.pill}`}
          >
            {moduleLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default PayrollPersonaBanner;
