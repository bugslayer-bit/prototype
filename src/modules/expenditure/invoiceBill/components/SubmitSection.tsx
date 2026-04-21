/* ═══════════════════════════════════════════════════════════════════════════
   Step 7 — Submit (PRN 3.2.3)
   Final review screen — summarises every key field, surfaces blockers, and
   exposes the Save / Submit / Reset actions.
   ═══════════════════════════════════════════════════════════════════════════ */
import type { InvoiceBillFormState, StoredInvoiceBill } from "../types";
import { downloadHtml, downloadJson, printAsPdf } from "../utils/downloadInvoiceBill";

const panelClass =
  "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6";

interface Props {
  form: InvoiceBillFormState;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onReset: () => void;
}

/* The Submit screen always has a working form (with recordId) — wrap it
   into the StoredInvoiceBill shape the download util needs. The `id` here
   is just the recordId since this isn't yet a persisted row. */
const asStored = (form: InvoiceBillFormState): StoredInvoiceBill => ({
  ...form,
  id: form.recordId || `draft-${Date.now()}`,
});

function StatItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ?? "border-slate-200 bg-slate-50"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function SubmitSection({ form, onSaveDraft, onSubmit, onReset }: Props) {
  const inv = form.invoice;
  const bill = form.bill;
  const blockers = form.validationChecks.filter((c) => c.severity === "blocker" && !c.passed);
  const invApproved = form.invoiceApprovalSteps.every((s) => s.status === "approved");
  const billApproved = form.billApprovalSteps.every((s) => s.status === "approved");

  return (
    <section className={panelClass}>
      <header className="border-b border-slate-100 pb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
          Step 7 · PRN 3.2.3
        </div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Final Review & Submit</h2>
        <p className="mt-1 text-sm text-slate-600">
          Confirm everything below, then save as draft or submit for processing.
        </p>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatItem label="Invoice Number" value={inv.invoiceNumber || "—"} />
        <StatItem label="Contract" value={inv.contractId || "—"} />
        <StatItem label="Contractor" value={inv.contractorName || "—"} />
        <StatItem label="Currency" value={inv.currency} />
        <StatItem label="Invoice Gross" value={Number(inv.invoiceGrossAmount || 0).toLocaleString()} />
        <StatItem label="Bill Gross" value={Number(bill.billAmountGross || 0).toLocaleString()} />
        <StatItem label="Total Tax" value={Number(inv.totalTaxAmount || 0).toLocaleString()} />
        <StatItem
          label="Net Payable"
          value={Number(inv.netPayableAmount || 0).toLocaleString()}
          accent="border-emerald-200 bg-emerald-50"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${blockers.length === 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Validation</p>
          <p className={`mt-1 text-lg font-bold ${blockers.length === 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {blockers.length === 0 ? "All Passed" : `${blockers.length} Blocker(s)`}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 ${invApproved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice Chain</p>
          <p className={`mt-1 text-lg font-bold ${invApproved ? "text-emerald-700" : "text-amber-700"}`}>
            {invApproved ? "Approved" : "Pending"}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 ${billApproved ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bill Chain</p>
          <p className={`mt-1 text-lg font-bold ${billApproved ? "text-emerald-700" : "text-amber-700"}`}>
            {billApproved ? "Approved" : "Pending"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Submit & Approve
        </button>

        {/* Download cluster — works at any stage, including draft */}
        <button
          type="button"
          onClick={() => printAsPdf(asStored(form))}
          className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-100"
          title="Open a printable receipt and save as PDF"
        >
          ⬇ Download PDF
        </button>
        <button
          type="button"
          onClick={() => downloadHtml(asStored(form))}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          title="Download a stand-alone HTML receipt"
        >
          ⬇ HTML
        </button>
        <button
          type="button"
          onClick={() => downloadJson(asStored(form))}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          title="Download the raw structured record"
        >
          ⬇ JSON
        </button>

        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
        >
          Reset Wizard
        </button>
      </div>
    </section>
  );
}
