/* ═══════════════════════════════════════════════════════════════════════
   STEP 3 — Validation Rules for Payment Executing (PRN 6.1 Step 3)
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect } from "react";
import type { DebtFormState, DebtValidationCheck } from "../../../types";
import { useDebtMasterData } from "../../../state/useDebtMasterData";
import { Card } from "../../../ui/Card";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: DebtFormState;
  onChange: (next: DebtFormState | ((cur: DebtFormState) => DebtFormState)) => void;
  readOnly?: boolean;
}

export function Step3Validation({ form, onChange, readOnly = false }: SectionProps) {
  const master = useDebtMasterData();

  /* Reconcile validation list with master rules each render so admins editing
     LoV reflects in the UI immediately (without losing already-set states). */
  useEffect(() => {
    const existing = new Map(form.validationChecks.map((c) => [c.label, c]));
    const next: DebtValidationCheck[] = master.validationRule.map((rule) => ({
      key: rule.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: rule,
      passed: existing.get(rule)?.passed ?? false,
      message: existing.get(rule)?.message ?? "",
    }));
    /* Only update if list shape changed */
    const changed =
      next.length !== form.validationChecks.length ||
      next.some((c, i) => c.label !== form.validationChecks[i]?.label);
    if (changed) {
      onChange((cur) => ({ ...cur, validationChecks: next }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master.validationRule.join("|")]);

  const update = (idx: number, patch: Partial<DebtValidationCheck>) =>
    onChange((cur) => {
      const copy = [...cur.validationChecks];
      copy[idx] = { ...copy[idx], ...patch };
      return { ...cur, validationChecks: copy };
    });

  const allPass = form.validationChecks.length > 0 && form.validationChecks.every((c) => c.passed);

  return (
    <Card
      title="3. Validation Rules for Payment Executing"
      subtitle="PRN 6.1 Step 3 — System validation rules applied during creation/approval of debt servicing & payment orders."
      className={readOnly ? "pointer-events-none select-none opacity-70" : undefined}
    >
      {master.validationRule.length === 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ Validation Rule list is empty</p>
          <p className="mt-0.5">
            Populate this list in <span className="font-mono">/master-data</span> — key:{" "}
            <span className="font-mono text-[11px]">(debt-validation-rule)</span>
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {form.validationChecks.map((c, i) => (
          <div
            key={c.key}
            className="grid items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1.4fr_auto_2fr]"
          >
            <span className="text-sm font-semibold text-slate-800">{c.label}</span>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={c.passed}
                onChange={(e) => update(i, { passed: e.target.checked })}
              />
              Passed
            </label>
            <input
              className={inputCls}
              value={c.message}
              placeholder="Validation message / remarks"
              onChange={(e) => update(i, { message: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div
        className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
          allPass
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}
      >
        {allPass
          ? "All system validation checks passed — eligible for payment release."
          : "One or more validation checks pending. Resolve before approval."}
      </div>
    </Card>
  );
}
