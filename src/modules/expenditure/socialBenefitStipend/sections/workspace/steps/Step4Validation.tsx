/* ═══════════════════════════════════════════════════════════════════════
   STEP 4 — Validation Rules & Approval Chain
   ═══════════════════════════════════════════════════════════════════════
   SRS PRN rows 101 + 106 — "System Validation Controls". Validation rows
   auto-sync from the sb-validation-rule LoV so whenever an admin adds a
   new rule the existing records surface it automatically.
   Approval chain follows PRN row 103: Coordinator → Finance → Head.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect } from "react";
import type { SbFormState } from "../../../types";
import { useSbStore } from "../../../state/useSbStore";
import { useSbMasterData } from "../../../state/useSbMasterData";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SbFormState;
  onChange: (next: SbFormState | ((cur: SbFormState) => SbFormState)) => void;
  readOnly?: boolean;
}

export function Step4Validation({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSbMasterData();
  const { generateNextApprovalId } = useSbStore();

  /* Auto-sync validation checks from the master-data LoV: if a rule was
     added in /master-data after this record was created, surface it here. */
  useEffect(() => {
    const existingKeys = new Set(form.validationChecks.map((c) => c.key));
    const missing = master.validationRule.filter((r) => !existingKeys.has(r));
    if (missing.length === 0) return;
    onChange((cur) => ({
      ...cur,
      validationChecks: [
        ...cur.validationChecks,
        ...missing.map((r) => ({ key: r, label: r, passed: false, message: "" })),
      ],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master.validationRule.join("|")]);

  const toggleCheck = (key: string, passed: boolean) =>
    onChange((cur) => ({
      ...cur,
      validationChecks: cur.validationChecks.map((c) =>
        c.key === key ? { ...c, passed } : c,
      ),
    }));
  const setCheckMessage = (key: string, message: string) =>
    onChange((cur) => ({
      ...cur,
      validationChecks: cur.validationChecks.map((c) =>
        c.key === key ? { ...c, message } : c,
      ),
    }));

  const addApproval = () =>
    onChange((cur) => ({
      ...cur,
      approvals: [
        ...cur.approvals,
        {
          id: generateNextApprovalId(),
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
  const updateApproval = <K extends keyof SbFormState["approvals"][number]>(
    id: string,
    key: K,
    value: SbFormState["approvals"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      approvals: cur.approvals.map((a) => (a.id === id ? { ...a, [key]: value } : a)),
    }));

  const lovChecks: { key: string; label: string; values: string[] }[] = [
    { key: "sb-validation-rule", label: "Validation Rules", values: master.validationRule },
    { key: "approval-level", label: "Approval Levels", values: master.approvalLevel },
    { key: "approval-decision", label: "Approval Decisions", values: master.approvalDecision },
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
        title="4a. SRS Validation Rules"
        subtitle="PRN row 101 / 106 — System Validation Controls. Rules auto-sync from the sb-validation-rule LoV."
      >
        {form.validationChecks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No validation rules to show. Populate <span className="font-mono">sb-validation-rule</span> in master-data.
          </p>
        ) : (
          <div className="grid gap-2">
            {form.validationChecks.map((c) => (
              <div
                key={c.key}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.passed}
                    onChange={(e) => toggleCheck(c.key, e.target.checked)}
                  />
                  <span className="text-xs font-semibold text-slate-800">{c.label}</span>
                </label>
                <input
                  className={inputCls + " flex-1 min-w-[220px]"}
                  placeholder="Finding / message (if any)"
                  value={c.message}
                  onChange={(e) => setCheckMessage(c.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="4b. Approval Chain"
        subtitle="PRN row 103 — Program Coordinator → Finance Officer → Head of Institution / Agency Finance → Head of Agency."
      >
        {form.approvals.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No approval decisions logged yet. Click <strong>+ Add Approval</strong> below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Level</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Decided On</th>
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
                        type="date"
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
          className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Approval
        </button>
      </Card>
    </div>
  );
}
