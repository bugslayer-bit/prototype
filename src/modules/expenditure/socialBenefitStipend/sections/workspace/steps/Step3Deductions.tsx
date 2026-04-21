/* ═══════════════════════════════════════════════════════════════════════
   STEP 3 — Stipend Deductions (DD 28.10-28.13)
   ═══════════════════════════════════════════════════════════════════════
   Only applicable when Step 1 Program Type = Stipend. The beneficiary-ref
   dropdown is populated dynamically from Step 2's roster, and stale rows
   referencing removed beneficiaries are cleaned up automatically.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from "react";
import type { SbFormState } from "../../../types";
import { useSbStore } from "../../../state/useSbStore";
import { useSbMasterData, isStipendProgram } from "../../../state/useSbMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SbFormState;
  onChange: (next: SbFormState | ((cur: SbFormState) => SbFormState)) => void;
  readOnly?: boolean;
}

export function Step3Deductions({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSbMasterData();
  const { generateNextDeductionId } = useSbStore();

  const isStipend = useMemo(
    () => isStipendProgram(form.header.programType),
    [form.header.programType],
  );

  /* Beneficiary ref list sourced from Step 2 — cascades when Step 2 changes. */
  const benRefOptions = useMemo(
    () =>
      form.beneficiaries.map(
        (b) =>
          `${b.id} · ${[b.firstName, b.lastName].filter(Boolean).join(" ") || "(unnamed)"}${
            b.studentCode ? " · " + b.studentCode : ""
          }`,
      ),
    [form.beneficiaries],
  );

  /* Auto-clean deductions referencing beneficiaries that no longer exist. */
  useEffect(() => {
    const ids = new Set(form.beneficiaries.map((b) => b.id));
    onChange((cur) => ({
      ...cur,
      deductions: cur.deductions.filter((d) => {
        const refId = d.beneficiaryRefId.split(" · ")[0];
        return ids.has(refId);
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.beneficiaries.map((b) => b.id).join("|")]);

  const addDeduction = () =>
    onChange((cur) => ({
      ...cur,
      deductions: [
        ...cur.deductions,
        {
          id: generateNextDeductionId(),
          beneficiaryRefId: "",
          deductionType: "",
          amount: "",
          recipientBankAccount: "",
          remarks: "",
        },
      ],
    }));

  const removeDeduction = (id: string) =>
    onChange((cur) => ({ ...cur, deductions: cur.deductions.filter((d) => d.id !== id) }));

  const update = <K extends keyof SbFormState["deductions"][number]>(
    id: string,
    key: K,
    value: SbFormState["deductions"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      deductions: cur.deductions.map((d) => (d.id === id ? { ...d, [key]: value } : d)),
    }));

  if (!form.header.programType) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Pick a Program Type on Step 1 first.
      </div>
    );
  }

  if (!isStipend) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        <p className="font-bold">Deductions only apply to Stipend programs.</p>
        <p className="mt-1 text-xs">
          The current program type is <strong>{form.header.programType}</strong>.
          DD 28.10-28.12 (House Rent / Mess / Other deductions) are only
          captured for Stipend programs. Change Program Type on Step 1 if
          deductions are required.
        </p>
      </div>
    );
  }

  if (form.beneficiaries.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Onboard at least one beneficiary on Step 2 before capturing deductions.
      </div>
    );
  }

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      <Card
        title="3. Stipend Deductions"
        subtitle="DD 28.10-28.13 — Capture house-rent, mess and other deductions. Recipient bank account routes the deduction amount to the receiving entity."
      >
        {form.deductions.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No deductions yet. Click <strong>+ Add Deduction</strong> below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Beneficiary</th>
                  <th className="px-2 py-2">Deduction Type</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Recipient Bank A/C</th>
                  <th className="px-2 py-2">Remarks</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.deductions.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 min-w-[220px]">
                      <Select
                        value={d.beneficiaryRefId}
                        options={benRefOptions}
                        onChange={(v) => update(d.id, "beneficiaryRefId", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={d.deductionType}
                        options={master.deductionType}
                        onChange={(v) => update(d.id, "deductionType", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={d.amount}
                        onChange={(e) => update(d.id, "amount", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={d.recipientBankAccount}
                        onChange={(e) => update(d.id, "recipientBankAccount", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={d.remarks}
                        onChange={(e) => update(d.id, "remarks", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeDeduction(d.id)}
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
          onClick={addDeduction}
          className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Deduction
        </button>
      </Card>
    </div>
  );
}
