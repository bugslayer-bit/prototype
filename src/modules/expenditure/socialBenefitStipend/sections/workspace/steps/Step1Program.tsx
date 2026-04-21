/* ═══════════════════════════════════════════════════════════════════════
   STEP 1 — Program Master Data (SRS PRN row 99 "Social Benefits Program
   Master Data Management")
   ═══════════════════════════════════════════════════════════════════════
   The program type drives the entire downstream flow:
     • Stipend Program      → Step 2 shows student fields, Step 3 deductions
                              section is active
     • Social Benefit       → Step 2 shows beneficiary-category fields,
                              Step 3 deductions section is hidden
   Every dropdown is sourced from master data; cascading rules:
     • Expenditure Type narrows Budget Code list
     • Program Type narrows which Beneficiary Category values apply downstream
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from "react";
import type { SbFormState } from "../../../types";
import {
  useSbMasterData,
  filterBudgetByExpType,
  isStipendProgram,
  isSocialBenefitProgram,
} from "../../../state/useSbMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SbFormState;
  onChange: (next: SbFormState | ((cur: SbFormState) => SbFormState)) => void;
  readOnly?: boolean;
}

export function Step1Program({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSbMasterData();
  const h = form.header;

  const set = <K extends keyof SbFormState["header"]>(
    key: K,
    value: SbFormState["header"][K],
  ) => onChange((cur) => ({ ...cur, header: { ...cur.header, [key]: value } }));

  const filteredBudgetCodes = useMemo(
    () => filterBudgetByExpType(h.expenditureType, master.budgetCode),
    [h.expenditureType, master.budgetCode],
  );

  /* If the current budget code is no longer in the filtered set, clear it. */
  useEffect(() => {
    if (!h.budgetCode) return;
    if (!filteredBudgetCodes.includes(h.budgetCode)) {
      set("budgetCode", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBudgetCodes.join("|")]);

  /* Changing programType clears downstream beneficiary/transaction rows that
     were captured under the old program type (so a Stipend → Social Benefit
     switch doesn't leave orphan student-category beneficiaries behind). */
  useEffect(() => {
    if (!h.programType) return;
    const isStipend = isStipendProgram(h.programType);
    const isBenefit = isSocialBenefitProgram(h.programType);
    if (!isStipend && !isBenefit) return;
    onChange((cur) => {
      /* Beneficiaries whose student fields contradict the current program
         type get cleared of the conflicting values (we keep the row so users
         can re-key the right data). */
      const beneficiaries = cur.beneficiaries.map((b) =>
        isStipend
          ? { ...b, ageGroup: "" }
          : { ...b, studentCode: "", studentCategory: "" },
      );
      return { ...cur, beneficiaries };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.programType]);

  const lovChecks: { key: string; label: string; values: string[] }[] = [
    { key: "sb-program-type", label: "Program Type", values: master.programType },
    { key: "sb-expenditure-type", label: "Expenditure Type", values: master.expenditureType },
    { key: "sb-budget-source", label: "Budget Source", values: master.budgetSource },
    { key: "sb-payment-account", label: "Payment Account", values: master.paymentAccount },
    { key: "sb-program-status", label: "Program Status", values: master.programStatus },
    { key: "budget-codes", label: "Budget Codes", values: master.budgetCode },
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
        title="1. Program Master"
        subtitle="PRN row 99 — Capture the social benefit / stipend program. The Program Type drives which fields are active downstream. Every dropdown is master-data-driven."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Program ID (auto)">
            <input className={inputCls} value={h.sbId} readOnly placeholder="SB-YYYY-NNNN" />
          </Field>
          <Field
            label="Program Type"
            hint="Selecting Stipend vs Social Benefit enables / disables downstream fields."
          >
            <Select
              value={h.programType}
              options={master.programType}
              onChange={(v) => set("programType", v)}
            />
          </Field>
          <Field label="Program Status">
            <Select
              value={h.programStatus}
              options={master.programStatus}
              onChange={(v) => set("programStatus", v)}
            />
          </Field>

          <Field label="Program Name">
            <input
              className={inputCls}
              value={h.programName}
              onChange={(e) => set("programName", e.target.value)}
            />
          </Field>
          <Field label="Short Name / Acronym">
            <input
              className={inputCls}
              value={h.programShortName}
              onChange={(e) => set("programShortName", e.target.value)}
            />
          </Field>
          <Field label="Implementing Agency">
            <input
              className={inputCls}
              value={h.implementingAgency}
              onChange={(e) => set("implementingAgency", e.target.value)}
            />
          </Field>

          <Field label="Expenditure Type">
            <Select
              value={h.expenditureType}
              options={master.expenditureType}
              onChange={(v) => set("expenditureType", v)}
            />
          </Field>
          <Field label="Budget Source">
            <Select
              value={h.budgetSource}
              options={master.budgetSource}
              onChange={(v) => set("budgetSource", v)}
            />
          </Field>
          <Field
            label="Budget Code"
            hint={
              h.expenditureType
                ? `${filteredBudgetCodes.length} of ${master.budgetCode.length} codes apply to ${h.expenditureType}`
                : "Pick an Expenditure Type first to narrow this list"
            }
          >
            <Select
              value={h.budgetCode}
              options={filteredBudgetCodes}
              onChange={(v) => set("budgetCode", v)}
              disabled={!h.expenditureType}
            />
          </Field>

          <Field label="Payment Account">
            <Select
              value={h.paymentAccount}
              options={master.paymentAccount}
              onChange={(v) => set("paymentAccount", v)}
            />
          </Field>
          <Field label="Allocated Budget">
            <input
              className={inputCls}
              value={h.allocatedBudget}
              onChange={(e) => set("allocatedBudget", e.target.value)}
            />
          </Field>
          <Field label="Start Date">
            <input
              type="date"
              className={inputCls}
              value={h.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>

          <Field label="Planned End Date">
            <input
              type="date"
              className={inputCls}
              value={h.plannedEndDate}
              onChange={(e) => set("plannedEndDate", e.target.value)}
            />
          </Field>
          <Field label="Program Description" className="md:col-span-2">
            <textarea
              className={inputCls + " min-h-[80px]"}
              value={h.programDescription}
              onChange={(e) => set("programDescription", e.target.value)}
              placeholder="Eligibility criteria, program objectives, target population…"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
