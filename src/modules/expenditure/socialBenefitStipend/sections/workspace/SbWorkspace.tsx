/* ═══════════════════════════════════════════════════════════════════════
   SbWorkspace — 5-step wizard shell for SRS PRN 8.1 (Social Benefits &
   Stipend). Mirrors FiWorkspace: owns form state, stepper, toolbar and
   is fully role-aware.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { initialSbForm, type SbFormState, type StoredSb } from "../../types";
import { useSbStore } from "../../state/useSbStore";
import { useSbRoleCapabilities, type SbStep } from "../../state/useSbRoleCapabilities";
import { Step1Program } from "./steps/Step1Program";
import { Step2Beneficiary } from "./steps/Step2Beneficiary";
import { Step3Deductions } from "./steps/Step3Deductions";
import { Step4Validation } from "./steps/Step4Validation";
import { Step5Payment } from "./steps/Step5Payment";

interface WorkspaceProps {
  existing: StoredSb | null;
  onDone: () => void;
}

export function SbWorkspace({ existing, onDone }: WorkspaceProps) {
  const { upsertRecord, generateNextSbId, generateNextRecordId } = useSbStore();
  const caps = useSbRoleCapabilities();

  const [form, setForm] = useState<SbFormState>(() =>
    existing
      ? {
          header: existing.header,
          beneficiaries: existing.beneficiaries,
          deductions: existing.deductions,
          validationChecks: existing.validationChecks,
          approvals: existing.approvals,
          transactions: existing.transactions,
        }
      : { ...initialSbForm },
  );

  /* Auto-assign Program (SB) ID on first open of a new record. */
  useEffect(() => {
    if (existing) return;
    if (form.header.sbId) return;
    setForm((cur) => ({
      ...cur,
      header: { ...cur.header, sbId: generateNextSbId() },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<SbStep>(caps.homeStep);

  /* Re-snap to persona's home step when the active role changes. */
  useEffect(() => {
    setStep(caps.homeStep);
  }, [caps.activeRoleId, caps.homeStep]);

  const stepEditable = caps.canEditStep(step);

  const headerReady = useMemo(
    () =>
      !!form.header.sbId &&
      !!form.header.programType &&
      !!form.header.programName &&
      !!form.header.implementingAgency &&
      !!form.header.expenditureType &&
      !!form.header.budgetCode,
    [form.header],
  );

  const save = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredSb = {
      id,
      header: form.header,
      beneficiaries: form.beneficiaries,
      deductions: form.deductions,
      validationChecks: form.validationChecks,
      approvals: form.approvals,
      transactions: form.transactions,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    upsertRecord(record);
    onDone();
  };

  const stepDefs: { n: SbStep; label: string }[] = [
    { n: 1, label: "Program Master" },
    { n: 2, label: "Beneficiary Roster" },
    { n: 3, label: "Deductions" },
    { n: 4, label: "Validation & Approval" },
    { n: 5, label: "Payments" },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        {stepDefs.map((s) => {
          const editable = caps.canEditStep(s.n);
          const isCurrent = step === s.n;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                isCurrent
                  ? "bg-sky-100 text-sky-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title={
                editable
                  ? `${caps.activeRoleName} can edit this step`
                  : `${caps.activeRoleName} can only read this step`
              }
            >
              {s.n}. {s.label}
              {!editable && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">
                  read
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={
              !headerReady ||
              (!caps.canCreate &&
                !caps.canEditProgram &&
                !caps.canOnboardBeneficiary &&
                !caps.canManageDeductions &&
                !caps.canValidate &&
                !caps.canApprove &&
                !caps.canProcessPayment &&
                !caps.canReleasePayment)
            }
            title={
              caps.isReadOnly
                ? `${caps.activeRoleName} is read-only`
                : !headerReady
                  ? "Capture program essentials first (type, name, agency, expenditure type, budget code)"
                  : undefined
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {caps.isReadOnly
              ? "Save (locked)"
              : existing
                ? "Save Changes"
                : "Register Program"}
          </button>
        </div>
      </div>

      {!stepEditable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">🔒 Read-only for {caps.activeRoleName}</p>
          <p className="mt-0.5">
            This step is owned by another persona. Switch the top-bar role to a
            persona that owns Step {step} to enable edits.
          </p>
        </div>
      )}

      {step === 1 && <Step1Program form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 2 && <Step2Beneficiary form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 3 && <Step3Deductions form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 4 && <Step4Validation form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 5 && <Step5Payment form={form} onChange={setForm} readOnly={!stepEditable} />}
    </div>
  );
}
