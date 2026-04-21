/* ═══════════════════════════════════════════════════════════════════════
   STEP 2 — Validation & Approval Chain (SRS PRN 7.1 Step 2)
   ═══════════════════════════════════════════════════════════════════════
   Auto-syncs validation checks from master data — if the admin adds a
   new validation rule to the LoV, it appears here on the next render.
   Approval levels, decisions, etc. are all master-data driven. */
import { useEffect, useMemo } from "react";
import type { FiFormState, FiValidationCheck } from "../../../types";
import { useFiMasterData } from "../../../state/useFiMasterData";
import { useFiStore } from "../../../state/useFiStore";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: FiFormState;
  onChange: (next: FiFormState | ((cur: FiFormState) => FiFormState)) => void;
  readOnly?: boolean;
}

export function Step2Validation({ form, onChange, readOnly = false }: SectionProps) {
  const master = useFiMasterData();
  const { generateNextRecordId } = useFiStore();

  /* Auto-sync validation checks from the LoV — additions appear, removals
     stay (the history is preserved). */
  useEffect(() => {
    const have = new Set(form.validationChecks.map((c) => c.key));
    const toAdd: FiValidationCheck[] = master.validationRule
      .filter((rule) => !have.has(rule))
      .map((rule) => ({ key: rule, label: rule, passed: false, message: "" }));
    if (toAdd.length === 0) return;
    onChange((cur) => ({
      ...cur,
      validationChecks: [...cur.validationChecks, ...toAdd],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master.validationRule.join("|")]);

  const togglePassed = (key: string, passed: boolean) =>
    onChange((cur) => ({
      ...cur,
      validationChecks: cur.validationChecks.map((c) =>
        c.key === key ? { ...c, passed } : c,
      ),
    }));

  const setMessage = (key: string, message: string) =>
    onChange((cur) => ({
      ...cur,
      validationChecks: cur.validationChecks.map((c) =>
        c.key === key ? { ...c, message } : c,
      ),
    }));

  const allPassed = useMemo(
    () => form.validationChecks.length > 0 && form.validationChecks.every((c) => c.passed),
    [form.validationChecks],
  );

  /* Approval chain */
  const addApproval = () =>
    onChange((cur) => ({
      ...cur,
      approvals: [
        ...cur.approvals,
        {
          id: generateNextRecordId(),
          level: "",
          actor: "",
          decidedAt: "",
          decision: "",
          remarks: "",
        },
      ],
    }));
  const removeApproval = (id: string) =>
    onChange((cur) => ({ ...cur, approvals: cur.approvals.filter((a) => a.id !== id) }));
  const updateApproval = <K extends keyof FiFormState["approvals"][number]>(
    id: string,
    key: K,
    value: FiFormState["approvals"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      approvals: cur.approvals.map((a) => (a.id === id ? { ...a, [key]: value } : a)),
    }));

  const lovChecks: { key: string; values: string[] }[] = [
    { key: "fi-validation-rule", values: master.validationRule },
    { key: "approval-level", values: master.approvalLevel },
    { key: "approval-decision", values: master.approvalDecision },
  ];
  const emptyLovs = lovChecks.filter((c) => c.values.length === 0);

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      {emptyLovs.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ {emptyLovs.length} master-data list(s) empty</p>
          <p className="mt-0.5">
            Populate in <span className="font-mono">/master-data</span>:{" "}
            {emptyLovs.map((l) => l.key).join(", ")}
          </p>
        </div>
      )}

      <Card
        title="2. Validation Checks"
        subtitle="PRN 7.1 Step 2 — Run the SRS-mandated RMA / DTA validation rules. New rules added by the admin appear here automatically."
      >
        {form.validationChecks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No validation rules configured in master data. Add them under{" "}
            <span className="font-mono">fi-validation-rule</span>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2 w-20">Passed</th>
                  <th className="px-2 py-2">Rule</th>
                  <th className="px-2 py-2">Reviewer Note</th>
                </tr>
              </thead>
              <tbody>
                {form.validationChecks.map((c) => (
                  <tr key={c.key} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={c.passed}
                        onChange={(e) => togglePassed(c.key, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                    </td>
                    <td className="px-2 py-2 font-semibold text-slate-700">{c.label}</td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={c.message}
                        onChange={(e) => setMessage(c.key, e.target.value)}
                        placeholder="Optional note / variance / evidence ref"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-bold uppercase ${
              allPassed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {allPassed ? "All checks passed" : "Pending checks"}
          </span>
          <span className="text-slate-500">
            {form.validationChecks.filter((c) => c.passed).length} of{" "}
            {form.validationChecks.length} passed
          </span>
        </div>
      </Card>

      <Card
        title="Approval Chain"
        subtitle="PRN 7.1 Step 2 — Each decision row uses master-data LoVs (fi-approval-level, fi-approval-decision)."
      >
        {form.approvals.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No approval entries yet.
          </p>
        ) : (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Level</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Decided At</th>
                  <th className="px-2 py-2">Decision</th>
                  <th className="px-2 py-2">Remarks</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.approvals.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <Select
                        value={a.level}
                        options={master.approvalLevel}
                        onChange={(v) => updateApproval(a.id, "level", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={a.actor}
                        onChange={(e) => updateApproval(a.id, "actor", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={a.decidedAt}
                        onChange={(e) => updateApproval(a.id, "decidedAt", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={a.decision}
                        options={master.approvalDecision}
                        onChange={(v) => updateApproval(a.id, "decision", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={a.remarks}
                        onChange={(e) => updateApproval(a.id, "remarks", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeApproval(a.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={addApproval}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Approval Entry
        </button>
      </Card>
    </div>
  );
}
