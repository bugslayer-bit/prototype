/* ═══════════════════════════════════════════════════════════════════════
   FiWorkspace — 5-step wizard shell for SRS PRN 7.1.
   Owns the form state, stepper, and save/cancel toolbar. Fully role-aware:
   deep-links to the persona home step, locks steps other personas own, and
   disables the Save button when the active role is read-only.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { initialFiForm, type FiFormState, type StoredFi } from "../../types";
import { useFiStore } from "../../state/useFiStore";
import { useFiRoleCapabilities } from "../../state/useFiRoleCapabilities";
import { Step1Header } from "./steps/Step1Header";
import { Step2Validation } from "./steps/Step2Validation";
import { Step3Services } from "./steps/Step3Services";
import { Step4Monitoring } from "./steps/Step4Monitoring";
import { Step5Lifecycle } from "./steps/Step5Lifecycle";

type Step = 1 | 2 | 3 | 4 | 5;

interface WorkspaceProps {
  existing: StoredFi | null;
  onDone: () => void;
}

export function FiWorkspace({ existing, onDone }: WorkspaceProps) {
  const { upsertRecord, generateNextFiId, generateNextRecordId } = useFiStore();
  const caps = useFiRoleCapabilities();

  const [form, setForm] = useState<FiFormState>(() =>
    existing
      ? {
          header: existing.header,
          documents: existing.documents,
          validationChecks: existing.validationChecks,
          approvals: existing.approvals,
          services: existing.services,
          monitoring: existing.monitoring,
        }
      : { ...initialFiForm },
  );

  /* Auto-assign FI ID once on first open */
  useEffect(() => {
    if (existing) return;
    if (form.header.fiId) return;
    setForm((cur) => ({
      ...cur,
      header: { ...cur.header, fiId: generateNextFiId() },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<Step>(caps.homeStep);

  useEffect(() => {
    setStep(caps.homeStep);
  }, [caps.activeRoleId, caps.homeStep]);

  const stepEditable = caps.canEditStep(step);

  const headerReady = useMemo(
    () =>
      !!form.header.institutionName &&
      !!form.header.institutionType &&
      !!form.header.licenceCategory &&
      !!form.header.licenceNumber &&
      !!form.header.regulatoryBody &&
      !!form.header.reportingCurrency,
    [form.header],
  );

  const save = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredFi = {
      id,
      header: form.header,
      documents: form.documents,
      validationChecks: form.validationChecks,
      approvals: form.approvals,
      services: form.services,
      monitoring: form.monitoring,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    upsertRecord(record);
    onDone();
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        {(
          [
            { n: 1, label: "Institution Header" },
            { n: 2, label: "Validation & Approval" },
            { n: 3, label: "Services Profile" },
            { n: 4, label: "Monitoring" },
            { n: 5, label: "Lifecycle" },
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
            disabled={
              !headerReady ||
              (!caps.canCreate &&
                !caps.canEditHeader &&
                !caps.canAttachDocs &&
                !caps.canValidate &&
                !caps.canApprove &&
                !caps.canManageServices &&
                !caps.canMonitor &&
                !caps.canLifecycle)
            }
            title={
              caps.isReadOnly
                ? `${caps.activeRoleName} is read-only`
                : !headerReady
                  ? "Capture institution essentials first (name, type, licence, regulator, currency)"
                  : undefined
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {caps.isReadOnly
              ? "Save (locked)"
              : existing
                ? "Save Changes"
                : "Register Institution"}
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

      {step === 1 && <Step1Header form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 2 && <Step2Validation form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 3 && <Step3Services form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 4 && <Step4Monitoring form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 5 && <Step5Lifecycle form={form} onChange={setForm} readOnly={!stepEditable} />}
    </div>
  );
}
