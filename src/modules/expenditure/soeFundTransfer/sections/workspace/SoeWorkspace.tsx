/* ═══════════════════════════════════════════════════════════════════════
   SoeWorkspace — 5-step wizard shell for SRS PRN 6.2.
   Owns the form state, stepper, and save/cancel toolbar. Fully role-aware:
   deep-links to the persona home step, locks steps other personas own, and
   disables the Save button when the active role is read-only.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { initialSoeForm, type SoeFormState, type StoredSoe } from "../../types";
import { useSoeStore } from "../../state/useSoeStore";
import { useSoeRoleCapabilities } from "../../state/useSoeRoleCapabilities";
import { Step1Header } from "./steps/Step1Header";
import { Step2SoeLines } from "./steps/Step2SoeLines";
import { Step3Validation } from "./steps/Step3Validation";
import { Step4Release } from "./steps/Step4Release";
import { Step5Reconciliation } from "./steps/Step5Reconciliation";

type Step = 1 | 2 | 3 | 4 | 5;

interface WorkspaceProps {
  existing: StoredSoe | null;
  onDone: () => void;
}

export function SoeWorkspace({ existing, onDone }: WorkspaceProps) {
  const { upsertRecord, generateNextTransferId, generateNextRecordId } = useSoeStore();
  const caps = useSoeRoleCapabilities();

  const [form, setForm] = useState<SoeFormState>(() =>
    existing
      ? {
          header: existing.header,
          soeLines: existing.soeLines,
          validationChecks: existing.validationChecks,
          approvals: existing.approvals,
          releases: existing.releases,
          reconciliation: existing.reconciliation,
        }
      : { ...initialSoeForm },
  );

  /* Auto-assign Transfer ID once on first open */
  useEffect(() => {
    if (existing) return;
    if (form.header.transferId) return;
    setForm((cur) => ({
      ...cur,
      header: { ...cur.header, transferId: generateNextTransferId() },
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
      !!form.header.transferType &&
      !!form.header.sourceOfFund &&
      !!form.header.originatingAgency &&
      !!form.header.receivingAgency &&
      !!form.header.currency &&
      parseFloat(form.header.totalAmount || "0") > 0,
    [form.header],
  );

  const save = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredSoe = {
      id,
      header: form.header,
      soeLines: form.soeLines,
      validationChecks: form.validationChecks,
      approvals: form.approvals,
      releases: form.releases,
      reconciliation: form.reconciliation,
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
            { n: 1, label: "Transfer Header" },
            { n: 2, label: "SoE Lines" },
            { n: 3, label: "Validation & Approval" },
            { n: 4, label: "Release" },
            { n: 5, label: "Reconciliation" },
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
                !caps.canAttachSoe &&
                !caps.canValidate &&
                !caps.canApprove &&
                !caps.canRelease &&
                !caps.canReconcile)
            }
            title={
              caps.isReadOnly
                ? `${caps.activeRoleName} is read-only`
                : !headerReady
                  ? "Capture the transfer header essentials first (type, source, agencies, currency, total)"
                  : undefined
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {caps.isReadOnly
              ? "Save (locked)"
              : existing
                ? "Save Changes"
                : "Create Fund Transfer"}
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
      {step === 2 && <Step2SoeLines form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 3 && <Step3Validation form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 4 && <Step4Release form={form} onChange={setForm} readOnly={!stepEditable} />}
      {step === 5 && <Step5Reconciliation form={form} onChange={setForm} readOnly={!stepEditable} />}
    </div>
  );
}
