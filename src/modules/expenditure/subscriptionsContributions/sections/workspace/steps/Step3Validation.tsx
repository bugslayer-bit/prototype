/* ═══════════════════════════════════════════════════════════════════════
   STEP 3 — Validation & Approval (PD row 108 + 109)
   ═══════════════════════════════════════════════════════════════════════
   Validation rules auto-sync from the sc-validation-rule master-data LoV
   (keyword matched so admin renames keep working). Approval chain uses
   sc-approval-level + sc-approval-decision LoVs. First-line Agency
   Finance validates, Head of Agency approves.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect } from "react";
import type { ScFormState } from "../../../types";
import { useScStore } from "../../../state/useScStore";
import { useScMasterData } from "../../../state/useScMasterData";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: ScFormState;
  onChange: (next: ScFormState | ((cur: ScFormState) => ScFormState)) => void;
  readOnly?: boolean;
}

function keyFor(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function Step3Validation({ form, onChange, readOnly = false }: SectionProps) {
  const master = useScMasterData();
  const { generateNextApprovalId } = useScStore();

  /* Auto-sync the validation rules array from master data. Preserves the
     passed/message state for any rule that still exists, and drops rows
     whose rule was removed from the LoV. */
  useEffect(() => {
    const desired = master.validationRule.map((label) => ({
      key: keyFor(label),
      label,
    }));
    onChange((cur) => {
      const existing = new Map(cur.validationChecks.map((c) => [c.key, c]));
      const next = desired.map((d) => {
        const prev = existing.get(d.key);
        return prev
          ? { ...prev, label: d.label }
          : { key: d.key, label: d.label, passed: false, message: "" };
      });
      /* If the set is identical, skip the state update to avoid infinite loop. */
      if (
        next.length === cur.validationChecks.length &&
        next.every(
          (n, i) =>
            cur.validationChecks[i] &&
            cur.validationChecks[i].key === n.key &&
            cur.validationChecks[i].label === n.label,
        )
      ) {
        return cur;
      }
      return { ...cur, validationChecks: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master.validationRule.join("|")]);

  const toggleCheck = (key: string, passed: boolean) =>
    onChange((cur) => ({
      ...cur,
      validationChecks: cur.validationChecks.map((c) =>
        c.key === key ? { ...c, passed } : c,
      ),
    }));
  const updateCheckMessage = (key: string, message: string) =>
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
    onChange((cur) => ({
      ...cur,
      approvals: cur.approvals.filter((a) => a.id !== id),
    }));
  const updateApproval = <K extends keyof ScFormState["approvals"][number]>(
    id: string,
    key: K,
    value: ScFormState["approvals"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      approvals: cur.approvals.map((a) =>
        a.id === id ? { ...a, [key]: value } : a,
      ),
    }));

  const passedCount = form.validationChecks.filter((c) => c.passed).length;
  const totalChecks = form.validationChecks.length;

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      <Card
        title="3a. SRS Validation Rules"
        subtitle={`PD row 109. ${passedCount}/${totalChecks} rules passing. Rules auto-sync from the sc-validation-rule LoV — admins can add / rename without touching code.`}
      >
        {totalChecks === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ⚠️ No validation rules defined yet in master data. Ask an admin to populate <strong>sc-validation-rule</strong>.
          </div>
        ) : (
          <div className="grid gap-3">
            {form.validationChecks.map((c) => (
              <div key={c.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-400"
                    checked={c.passed}
                    onChange={(e) => toggleCheck(c.key, e.target.checked)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                    <input
                      className={inputCls + " mt-2"}
                      placeholder="Findings / remarks…"
                      value={c.message}
                      onChange={(e) => updateCheckMessage(c.key, e.target.value)}
                    />
                  </div>
                </label>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="3b. Approval Chain"
        subtitle="PD row 108. Capture every approval decision made by Finance Officer, Agency Finance, Head of Agency and Payment Release Officer."
      >
        {form.approvals.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No approval entries yet. Click <strong>+ Record Decision</strong>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Level</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Decided At</th>
                  <th className="px-2 py-2">Decision</th>
                  <th className="px-2 py-2">Remarks</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.approvals.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-2 py-1.5">
                      <Select
                        value={a.level}
                        options={master.approvalLevel}
                        onChange={(v) => updateApproval(a.id, "level", v)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        value={a.actor}
                        onChange={(e) => updateApproval(a.id, "actor", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={a.decidedAt}
                        onChange={(e) => updateApproval(a.id, "decidedAt", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={a.decision}
                        options={master.approvalDecision}
                        onChange={(v) => updateApproval(a.id, "decision", v)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        value={a.remarks}
                        onChange={(e) => updateApproval(a.id, "remarks", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
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
          + Record Decision
        </button>
      </Card>
    </div>
  );
}
