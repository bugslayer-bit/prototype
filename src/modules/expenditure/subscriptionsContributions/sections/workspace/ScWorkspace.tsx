/* ═══════════════════════════════════════════════════════════════════════
   ScWorkspace — 4-step wizard shell for SRS PRN 9.1 (Subscriptions &
   Contributions). Mirrors SbWorkspace: owns form state, stepper, toolbar
   and is fully role-aware.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { initialScForm, type ScFormState, type StoredSc } from "../../types";
import { useScStore } from "../../state/useScStore";
import { useScRoleCapabilities, type ScStep } from "../../state/useScRoleCapabilities";
import { Step1Entity } from "./steps/Step1Entity";
import { Step2Payments } from "./steps/Step2Payments";
import { Step3Validation } from "./steps/Step3Validation";
import { Step4Lifecycle } from "./steps/Step4Lifecycle";

interface WorkspaceProps {
  existing: StoredSc | null;
  onDone: () => void;
}

export function ScWorkspace({ existing, onDone }: WorkspaceProps) {
  const { upsertRecord, generateNextScId, generateNextRecordId } = useScStore();
  const caps = useScRoleCapabilities();

  const [form, setForm] = useState<ScFormState>(() =>
    existing
      ? {
          header: existing.header,
          documents: existing.documents,
          transactions: existing.transactions,
          validationChecks: existing.validationChecks,
          approvals: existing.approvals,
          lifecycle: existing.lifecycle,
        }
      : { ...initialScForm },
  );

  /* Auto-assign SC ID on first open of a new record. */
  useEffect(() => {
    if (existing) return;
    if (form.header.scId) return;
    setForm((cur) => ({
      ...cur,
      header: { ...cur.header, scId: generateNextScId() },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<ScStep>(caps.homeStep);

  /* Re-snap to persona's home step when the active role changes. */
  useEffect(() => {
    setStep(caps.homeStep);
  }, [caps.activeRoleId, caps.homeStep]);

  const stepEditable = caps.canEditStep(step);

  const headerReady = useMemo(
    () =>
      !!form.header.scId &&
      !!form.header.txnType &&
      !!form.header.scope &&
      !!form.header.entityName &&
      !!form.header.budgetCode,
    [form.header],
  );

  const save = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredSc = {
      id,
      header: form.header,
      documents: form.documents,
      transactions: form.transactions,
      validationChecks: form.validationChecks,
      approvals: form.approvals,
      lifecycle: form.lifecycle,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    upsertRecord(record);
    onDone();
  };

  const stepDefs: { n: ScStep; label: string }[] = [
    { n: 1, label: "Entity Master" },
    { n: 2, label: "Payment Transactions" },
    { n: 3, label: "Validation & Approval" },
    { n: 4, label: "Lifecycle" },
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
                !caps.canAttachDocs &&
                !caps.canCreateTxn &&
                !caps.canValidate &&
                !caps.canApprove &&
                !caps.canReleasePayment &&
                !caps.canLifecycle)
            }
            title={
              caps.isReadOnly
                ? `${caps.activeRoleName} is read-only`
                : !headerReady
                  ? "Capture entity essentials first (type, scope, name, budget code)"
                  : undefined
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {caps.isReadOnly
              ? "Save (locked)"
              : existing
                ? "Save Changes"
                : "Register Entity"}
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

      {step === 1 && <Step1Entity form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 2 && <Step2Payments form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 3 && <Step3Validation form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 4 && <Step4Lifecycle form={form} onChange={setForm} readOnly={!stepEditable} />}
    </div>
  );
}
