/* Stable Field component — module-scoped so React doesn't unmount inputs
   on every keystroke. Must stay outside any parent component body. */
import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  required?: boolean;
  locked?: boolean;
  helper?: string;
  children: ReactNode;
}

export function Field({ label, required, locked, helper, children }: FieldProps) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
        {locked && (
          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">🔒 SYSTEM</span>
        )}
      </span>
      <div className="mt-1">{children}</div>
      {helper && <p className="mt-1 text-[11px] text-slate-500">{helper}</p>}
    </label>
  );
}
