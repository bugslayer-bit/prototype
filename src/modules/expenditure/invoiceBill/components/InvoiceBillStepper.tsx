/* ═══════════════════════════════════════════════════════════════════════════
   Wizard stepper — visual nav for the 7 SRS-mapped steps WITH a hierarchical
   breakdown of the 22 SRS Process Description sub-steps (Rows 38–64) so the
   user can trace exactly which SRS row is currently in scope.
   ═══════════════════════════════════════════════════════════════════════════ */
import { invoiceBillSteps, invoiceBillSubSteps } from "../config";

interface Props {
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function InvoiceBillStepper({ currentStep, onStepChange }: Props) {
  const activeSubSteps = invoiceBillSubSteps[currentStep] ?? [];

  return (
    <nav className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
      {/* ── Top row: 7 main wizard steps ─────────────────────────────────── */}
      <ol className="flex flex-wrap items-center gap-2">
        {invoiceBillSteps.map((s, i) => {
          const active = s.id === currentStep;
          const done = s.id < currentStep;
          return (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onStepChange(s.id)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "border border-sky-200 bg-sky-50 text-sky-700 shadow-sm"
                    : done
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    active
                      ? "bg-white text-sky-700 ring-1 ring-sky-200"
                      : done
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {done ? "✓" : s.id}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
                <span className="hidden text-[9px] font-bold uppercase tracking-wider opacity-70 md:inline">
                  {s.prn}
                </span>
              </button>
              {i < invoiceBillSteps.length - 1 && (
                <span className="mx-1 hidden h-px w-4 bg-slate-200 md:inline-block" />
              )}
            </li>
          );
        })}
      </ol>

      {/* ── Sub-step breakdown for the active main step ──────────────────── */}
      {activeSubSteps.length > 0 && (
        <div className="mt-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                SRS Process Description
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                Step {currentStep} sub-steps ({activeSubSteps.length})
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-400">
              Hover any pill for the SRS row & helper text
            </span>
          </div>
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeSubSteps.map((sub) => (
              <li
                key={sub.code}
                title={`${sub.srsRow} · SRS No ${sub.srsNo} · ${sub.actor}\n${sub.helper}`}
                className="group flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition hover:border-sky-200 hover:shadow-md"
              >
                <span className="mt-0.5 flex h-5 min-w-[28px] items-center justify-center rounded-md bg-sky-100 px-1 text-[9px] font-bold text-sky-700">
                  {sub.code}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-slate-800">
                    {sub.label}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-400">
                    <span className="font-bold text-slate-500">{sub.srsRow}</span>
                    <span>•</span>
                    <span>SRS {sub.srsNo}</span>
                    <span>•</span>
                    <span className="truncate">{sub.actor}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
                    {sub.helper}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </nav>
  );
}
