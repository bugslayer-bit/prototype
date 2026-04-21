/* ═══════════════════════════════════════════════════════════════════════════
   Step 5 — Approval (PRN 3.1.3 + 3.2.2)
   Renders the multi-stage approval chain for both Invoice and Bill.
   Each stage can be advanced (approved) or rejected with remarks.
   ═══════════════════════════════════════════════════════════════════════════ */
import type { ApprovalStep, InvoiceBillFormState } from "../types";

const panelClass =
  "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6";

const statusStyles: Record<ApprovalStep["status"], string> = {
  pending: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-sky-100 text-sky-700 border-sky-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  skipped: "bg-amber-100 text-amber-700 border-amber-200",
};

interface Props {
  form: InvoiceBillFormState;
  onInvoiceSteps: (steps: ApprovalStep[]) => void;
  onBillSteps: (steps: ApprovalStep[]) => void;
}

function advance(steps: ApprovalStep[], key: string, status: ApprovalStep["status"], remarks?: string): ApprovalStep[] {
  return steps.map((s) =>
    s.key === key
      ? {
          ...s,
          status,
          decidedAt: new Date().toISOString(),
          approverName: s.approverName || "Admin",
          remarks: remarks ?? s.remarks,
        }
      : s,
  );
}

function ChainCard({
  title,
  prn,
  steps,
  onChange,
}: {
  title: string;
  prn: string;
  steps: ApprovalStep[];
  onChange: (steps: ApprovalStep[]) => void;
}) {
  const completed = steps.filter((s) => s.status === "approved").length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-[11px] text-slate-500">{prn}</p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700">
          {completed} / {steps.length} approved
        </div>
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((s, idx) => (
          <li key={s.key} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                  <p className="text-[11px] text-slate-500">{s.role}</p>
                </div>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyles[s.status]}`}>
                {s.status.replace("_", " ")}
              </span>
            </div>
            {s.status !== "approved" && s.status !== "rejected" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onChange(advance(steps, s.key, "approved"))}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onChange(advance(steps, s.key, "rejected", "Returned for correction"))}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => onChange(advance(steps, s.key, "in_progress"))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Mark In Progress
                </button>
              </div>
            )}
            {(s.decidedAt || s.remarks) && (
              <p className="mt-2 text-[11px] text-slate-500">
                {s.approverName && <strong className="text-slate-700">{s.approverName}</strong>}
                {s.decidedAt && ` · ${new Date(s.decidedAt).toLocaleString()}`}
                {s.remarks && ` · ${s.remarks}`}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function InvoiceBillApprovalSection({ form, onInvoiceSteps, onBillSteps }: Props) {
  return (
    <section className={panelClass}>
      <header className="border-b border-slate-100 pb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">
          Step 5 · PRN 3.1.3 + 3.2.2
        </div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Multi-Stage Approval</h2>
        <p className="mt-1 text-sm text-slate-600">
          Invoice and bill approvals follow independent chains. Both must complete before payment release.
        </p>
      </header>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChainCard title="Invoice Approval Chain" prn="PRN 3.1.3" steps={form.invoiceApprovalSteps} onChange={onInvoiceSteps} />
        <ChainCard title="Bill Approval Chain" prn="PRN 3.2.2" steps={form.billApprovalSteps} onChange={onBillSteps} />
      </div>
    </section>
  );
}
