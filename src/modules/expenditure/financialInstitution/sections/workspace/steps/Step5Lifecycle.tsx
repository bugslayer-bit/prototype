/* ═══════════════════════════════════════════════════════════════════════
   STEP 5 — Lifecycle (Activate / Suspend / Revoke / Reactivate)
   ═══════════════════════════════════════════════════════════════════════
   Provides quick-action chips to advance the registration status through
   the admin-defined LoV. The set of next-allowed statuses is derived
   dynamically from the current status via keyword matching, so admins
   can rename LoV values without breaking the flow. */
import type { FiFormState } from "../../../types";
import {
  useFiMasterData,
  nextAllowedStatuses,
} from "../../../state/useFiMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { StatusPill } from "../../../ui/StatusPill";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: FiFormState;
  onChange: (next: FiFormState | ((cur: FiFormState) => FiFormState)) => void;
  readOnly?: boolean;
}

export function Step5Lifecycle({ form, onChange, readOnly = false }: SectionProps) {
  const master = useFiMasterData();
  const current = form.header.registrationStatus;
  const next = nextAllowedStatuses(current, master.registrationStatus);

  const advance = (status: string) =>
    onChange((cur) => ({ ...cur, header: { ...cur.header, registrationStatus: status } }));

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      <Card
        title="5. Lifecycle Actions"
        subtitle="PRN 7.1 Step 5 — Advance the registration through the master-data status lifecycle. Only statuses allowed from the current state are offered."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Current Status">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <StatusPill value={current} />
              <span className="text-xs text-slate-500">
                {current || "— not set —"}
              </span>
            </div>
          </Field>
          <Field label="Next Allowed Transitions (from master-data)">
            <div className="flex flex-wrap gap-2">
              {next.length === 0 ? (
                <span className="text-xs italic text-slate-500">
                  No onward transitions from this status.
                </span>
              ) : (
                next.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => advance(s)}
                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    Advance → {s}
                  </button>
                ))
              )}
            </div>
          </Field>
          <Field label="Lifecycle Narrative" className="md:col-span-2">
            <textarea
              className={inputCls + " min-h-[80px]"}
              value={form.header.narrative}
              onChange={(e) =>
                onChange((cur) => ({
                  ...cur,
                  header: { ...cur.header, narrative: e.target.value },
                }))
              }
              placeholder="Reason for suspension / revocation / reactivation, supporting reference…"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
