/* ═══════════════════════════════════════════════════════════════════════
   DebtWorkspace — 5-step wizard shell.
   Owns the form state, stepper, and save/cancel toolbar. Each step is
   rendered by a child component under ./steps/.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { initialDebtForm, type DebtFormState, type StoredDebt } from "../../types";
import { useDebtStore } from "../../state/useDebtStore";
import { useDebtRoleCapabilities } from "../../state/useDebtRoleCapabilities";
import { Step1Donor } from "./steps/Step1Donor";
import { Step2PaymentOrder } from "./steps/Step2PaymentOrder";
import { Step3Validation } from "./steps/Step3Validation";
import { Step4Meridian } from "./steps/Step4Meridian";
import { Step5Processing } from "./steps/Step5Processing";

type Step = 1 | 2 | 3 | 4 | 5;

interface WorkspaceProps {
  existing: StoredDebt | null;
  onDone: () => void;
}

export function DebtWorkspace({ existing, onDone }: WorkspaceProps) {
  const { upsertDebt, generateNextDebtServicingId, generateNextRecordId } = useDebtStore();
  const caps = useDebtRoleCapabilities();

  const [form, setForm] = useState<DebtFormState>(() =>
    existing
      ? {
          header: existing.header,
          donor: existing.donor,
          repayments: existing.repayments,
          validationChecks: existing.validationChecks,
          meridianLog: existing.meridianLog,
        }
      : { ...initialDebtForm },
  );

  /* Auto-assign Debt Servicing ID once on first open */
  useEffect(() => {
    if (existing) return;
    if (form.header.debtServicingId) return;
    setForm((cur) => ({
      ...cur,
      header: { ...cur.header, debtServicingId: generateNextDebtServicingId() },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Deep-link to the persona's natural home step (Initiator → 1, Agency
     Finance → 3, Head of Agency → 4, Payment Release → 5, etc.) */
  const [step, setStep] = useState<Step>(caps.homeStep);

  /* Re-snap when the user switches roles mid-session so they immediately land
     on their work-in-progress step. */
  useEffect(() => {
    setStep(caps.homeStep);
  }, [caps.activeRoleId, caps.homeStep]);

  /* Whether the form on this specific step is editable for this persona */
  const stepEditable = caps.canEditStep(step);

  const headerReady = useMemo(
    () =>
      !!form.header.loanInstrumentIdGov &&
      !!form.header.creditorId &&
      !!form.header.debtCategory &&
      !!form.header.paymentCurrencyId &&
      parseFloat(form.header.principalLoanAmount || "0") > 0,
    [form.header],
  );

  const save = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredDebt = {
      id,
      header: form.header,
      donor: form.donor,
      repayments: form.repayments,
      validationChecks: form.validationChecks,
      meridianLog: form.meridianLog,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    upsertDebt(record);
    onDone();
  };

  return (
    <div className="grid gap-6">
      {/* Stepper — every step is reachable (read-only when persona can't edit
          it) so users always see the SRS context regardless of role. */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        {(
          [
            { n: 1, label: "Donor & Debt Data" },
            { n: 2, label: "Payment Order" },
            { n: 3, label: "Validation" },
            { n: 4, label: "Meridian Sync" },
            { n: 5, label: "Processing" },
          ] as { n: Step; label: string }[]
        ).map((s) => {
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
            disabled={!headerReady || (!caps.canCreate && !caps.canEditHeader && !caps.canValidate && !caps.canApprove && !caps.canRelease)}
            title={
              caps.isReadOnly
                ? `${caps.activeRoleName} is read-only`
                : !headerReady
                  ? "Capture donor + DD 20.* essentials first"
                  : undefined
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {caps.isReadOnly
              ? "Save (locked)"
              : existing
                ? "Save Changes"
                : "Create Debt Servicing"}
          </button>
        </div>
      </div>

      {/* Persona-aware read-only banner pinned to the active step */}
      {!stepEditable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">🔒 Read-only for {caps.activeRoleName}</p>
          <p className="mt-0.5">
            This step is owned by another persona. Switch the top-bar role to a
            persona that owns Step {step} to enable edits.
          </p>
        </div>
      )}

      {step === 1 && <Step1Donor form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 2 && <Step2PaymentOrder form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 3 && <Step3Validation form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 4 && <Step4Meridian form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 5 && <Step5Processing form={form} />}
    </div>
  );
}
