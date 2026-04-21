/* ═══════════════════════════════════════════════════════════════════════════
   ReversalAuthorisationPanel — SRS Rows 58–59 (Process Steps 5.4 / 5.5)
   "Approved-in-error" reversal flow. Allowed only when payment has NOT yet
   been released to the contractor / retailer. Captures the reason, stamps
   the requester, then lets a system action execute the reversal.
   ═══════════════════════════════════════════════════════════════════════════ */
import type { InvoiceBillFormState, ReversalRequest } from "../types";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";
const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

interface Props {
  form: InvoiceBillFormState;
  onReversal: (r: ReversalRequest) => void;
}

const STATUS_BADGE: Record<ReversalRequest["status"], string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  rejected: "bg-rose-100 text-rose-700",
  executed: "bg-emerald-100 text-emerald-700",
};

export function ReversalAuthorisationPanel({ form, onReversal }: Props) {
  const r = form.reversal;
  const set = <K extends keyof ReversalRequest>(k: K, v: ReversalRequest[K]) =>
    onReversal({ ...r, [k]: v });

  const blocked = r.paymentAlreadyReleased;
  const released =
    form.workflowStatus === "paid" || form.paymentOrder.status === "cleared";

  const submit = () => {
    if (released || blocked) return;
    onReversal({
      ...r,
      id: r.id || `rev-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: "submitted",
    });
  };

  const approve = () => onReversal({ ...r, status: "approved" });
  const reject = () => onReversal({ ...r, status: "rejected" });
  const execute = () =>
    onReversal({ ...r, status: "executed", remarks: r.remarks || "Reversal posted to ledger" });

  return (
    <section className={panelClass}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Reversal Authorisation</h3>
          <p className="text-xs text-slate-500">
            SRS Rows 58–59 · Steps 5.4–5.5 — Initiate and execute an approved-in-error
            reversal. Only allowed before payment has been released to the contractor.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${STATUS_BADGE[r.status]}`}
        >
          {r.status}
        </span>
      </header>

      {released && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          ⛔ Payment has already been released to the contractor. Reversal is not allowed
          per SRS Row 58. Use a separate refund / recovery workflow instead.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Requested By
          </label>
          <input
            value={r.requestedBy}
            onChange={(e) => set("requestedBy", e.target.value)}
            placeholder="User ID / officer name"
            disabled={released}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Requested At
          </label>
          <input
            value={r.requestedAt ? r.requestedAt.slice(0, 16).replace("T", " ") : "—"}
            disabled
            className={`${inputClass} bg-slate-50`}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Reason for Reversal
        </label>
        <textarea
          value={r.reason}
          onChange={(e) => set("reason", e.target.value)}
          rows={2}
          disabled={released}
          className={inputClass}
          placeholder="Why is this approval being reversed?"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          id="rev-released"
          type="checkbox"
          checked={r.paymentAlreadyReleased}
          onChange={(e) => set("paymentAlreadyReleased", e.target.checked)}
          disabled={released}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="rev-released" className="text-xs font-semibold text-slate-600">
          Confirm payment has NOT yet been released
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={released || blocked || !r.reason || !r.requestedBy || r.status !== "draft"}
          className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-sky-700"
        >
          Submit Request
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={r.status !== "submitted"}
          className="rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-100"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={r.status !== "submitted"}
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-100"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={execute}
          disabled={r.status !== "approved"}
          className="rounded-xl border border-sky-300 bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-sky-600"
        >
          Execute Reversal (Post to Ledger)
        </button>
      </div>

      {r.status === "executed" && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
          ✓ Reversal executed — approval status reset, liabilities &amp; commitments adjusted,
          ledger entries posted (SRS Row 59).
        </div>
      )}
    </section>
  );
}
