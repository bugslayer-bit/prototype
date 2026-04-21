/* ═══════════════════════════════════════════════════════════════════════
   STEP 3 — Validation & Approval Chain (SRS PRN 6.2 Step 3)
   ═══════════════════════════════════════════════════════════════════════
   Runs the SRS validation rules on the transfer, then captures decisions
   from each approval level (Initiator → Finance Officer → Head of Agency
   → MoF Budget Desk → Parliament Sanction). Both lists are driven by
   master data — no hardcoded rule names or approval levels. */
import { useEffect } from "react";
import type {
  SoeApprovalEntry,
  SoeFormState,
  SoeValidationCheck,
} from "../../../types";
import { useSoeMasterData } from "../../../state/useSoeMasterData";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { Empty } from "../../../ui/Empty";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SoeFormState;
  onChange: (next: SoeFormState | ((cur: SoeFormState) => SoeFormState)) => void;
  readOnly?: boolean;
}

export function Step3Validation({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSoeMasterData();

  /* Sync validation list with master rules. */
  useEffect(() => {
    const existing = new Map(form.validationChecks.map((c) => [c.label, c]));
    const next: SoeValidationCheck[] = master.validationRule.map((rule) => ({
      key: rule.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: rule,
      passed: existing.get(rule)?.passed ?? false,
      message: existing.get(rule)?.message ?? "",
    }));
    const changed =
      next.length !== form.validationChecks.length ||
      next.some((c, i) => c.label !== form.validationChecks[i]?.label);
    if (changed) {
      onChange((cur) => ({ ...cur, validationChecks: next }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master.validationRule.join("|")]);

  const updateCheck = (idx: number, patch: Partial<SoeValidationCheck>) =>
    onChange((cur) => {
      const copy = [...cur.validationChecks];
      copy[idx] = { ...copy[idx], ...patch };
      return { ...cur, validationChecks: copy };
    });

  const allPass =
    form.validationChecks.length > 0 && form.validationChecks.every((c) => c.passed);

  const addApproval = () =>
    onChange((cur) => ({
      ...cur,
      approvals: [
        ...cur.approvals,
        {
          id: crypto.randomUUID(),
          level: master.approvalLevel[0] ?? "",
          actor: "",
          decidedAt: new Date().toISOString().slice(0, 16),
          decision: master.approvalDecision[0] ?? "",
          remarks: "",
        },
      ],
    }));

  const updateApproval = (id: string, patch: Partial<SoeApprovalEntry>) =>
    onChange((cur) => ({
      ...cur,
      approvals: cur.approvals.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));

  const removeApproval = (id: string) =>
    onChange((cur) => ({ ...cur, approvals: cur.approvals.filter((a) => a.id !== id) }));

  const emptyRules = master.validationRule.length === 0;
  const emptyLevels = master.approvalLevel.length === 0;
  const emptyDecisions = master.approvalDecision.length === 0;

  return (
    <div className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`} aria-disabled={readOnly}>
      <Card
        title="3a. Validation Rules"
        subtitle="PRN 6.2 Step 3 — System validation rules applied during creation/approval of SOE fund transfers."
      >
        {emptyRules && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <p className="font-bold">⚠️ Validation Rule list is empty</p>
            <p className="mt-0.5">
              Populate in <span className="font-mono">/master-data</span> — key:{" "}
              <span className="font-mono text-[11px]">(soe-validation-rule)</span>
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
                  onChange={(e) => updateCheck(i, { passed: e.target.checked })}
                />
                Passed
              </label>
              <input
                className={inputCls}
                value={c.message}
                placeholder="Validation remark"
                onChange={(e) => updateCheck(i, { message: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            allPass ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {allPass
            ? "All validation checks passed — transfer eligible for approval chain."
            : "One or more validation checks pending. Resolve before proceeding."}
        </div>
      </Card>

      <Card
        title="3b. Approval Chain"
        subtitle="PRN 6.2 Step 3 — Record approval decisions from each SRS-mandated level (Initiator → Finance → Head of Agency → MoF Budget Desk → Parliament)."
      >
        {(emptyLevels || emptyDecisions) && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <p className="font-bold">⚠️ Master-data list(s) empty</p>
            <p className="mt-0.5">
              Populate in <span className="font-mono">/master-data</span>:{" "}
              {[
                emptyLevels ? "approval-level" : null,
                emptyDecisions ? "approval-decision" : null,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={addApproval}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            + Add Approval Entry
          </button>
        </div>

        {form.approvals.length === 0 ? (
          <Empty>No approval decisions recorded yet.</Empty>
        ) : (
          <div className="grid gap-3">
            {form.approvals.map((a) => (
              <div
                key={a.id}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_1.6fr_auto]"
              >
                <Select
                  value={a.level}
                  options={master.approvalLevel}
                  onChange={(v) => updateApproval(a.id, { level: v })}
                />
                <input
                  className={inputCls}
                  placeholder="Actor / Officer"
                  value={a.actor}
                  onChange={(e) => updateApproval(a.id, { actor: e.target.value })}
                />
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={a.decidedAt}
                  onChange={(e) => updateApproval(a.id, { decidedAt: e.target.value })}
                />
                <Select
                  value={a.decision}
                  options={master.approvalDecision}
                  onChange={(v) => updateApproval(a.id, { decision: v })}
                />
                <input
                  className={inputCls}
                  placeholder="Remarks"
                  value={a.remarks}
                  onChange={(e) => updateApproval(a.id, { remarks: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeApproval(a.id)}
                  className="self-start rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
