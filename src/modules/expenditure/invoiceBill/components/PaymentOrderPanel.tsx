/* ═══════════════════════════════════════════════════════════════════════════
   PaymentOrderPanel — SRS Rows 60–64 (Process Steps 7.1 → 7.5)
   FIFO payment-order generation, push to Cash Management, and the optional
   PO cancellation + post-cancel reversal flow. Stable state is held in
   form.paymentOrder so the PO ID does NOT regenerate on every render.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect } from "react";
import type { InvoiceBillFormState, PaymentOrderRecord } from "../types";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";
const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

interface Props {
  form: InvoiceBillFormState;
  onPaymentOrder: (po: PaymentOrderRecord) => void;
}

const STATUS_BADGE: Record<PaymentOrderRecord["status"], string> = {
  not_generated: "bg-slate-100 text-slate-600",
  queued_fifo: "bg-amber-100 text-amber-700",
  generated: "bg-sky-100 text-sky-700",
  pushed_to_cm: "bg-indigo-100 text-indigo-700",
  cleared: "bg-emerald-100 text-emerald-700",
  held: "bg-orange-100 text-orange-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-rose-200 text-rose-800",
};

const STATUS_LABEL: Record<PaymentOrderRecord["status"], string> = {
  not_generated: "Not Generated",
  queued_fifo: "Queued (FIFO)",
  generated: "Generated",
  pushed_to_cm: "Pushed to Cash Mgmt",
  cleared: "Cleared",
  held: "Held",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function PaymentOrderPanel({ form, onPaymentOrder }: Props) {
  const po = form.paymentOrder;
  const billNet = form.bill.netPayableAmount || form.invoice.netPayableAmount || "0";

  /* Auto-sync the amount with the live bill total whenever it changes
     (only while the PO is still in the early states). */
  useEffect(() => {
    if (po.status === "cleared" || po.status === "cancelled") return;
    if (po.amount !== billNet) {
      onPaymentOrder({ ...po, amount: billNet });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billNet]);

  const set = <K extends keyof PaymentOrderRecord>(k: K, v: PaymentOrderRecord[K]) =>
    onPaymentOrder({ ...po, [k]: v });

  /* SRS Row 60 — generate the Payment Order ID exactly once via the
     state-update path so React renders cannot create a new ID each time. */
  const generate = () => {
    if (po.paymentOrderId) return;
    const yr = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 900000) + 100000);
    onPaymentOrder({
      ...po,
      paymentOrderId: `PO-IB-${yr}-${seq}`,
      generatedAt: new Date().toISOString(),
      fifoSequence: po.fifoSequence || Math.floor(Math.random() * 9000) + 1000,
      amount: billNet,
      status: "generated",
    });
  };

  const queue = () => onPaymentOrder({ ...po, status: "queued_fifo" });
  const pushToCm = () =>
    onPaymentOrder({
      ...po,
      status: "pushed_to_cm",
      cmAcknowledgement: `CM-ACK-${Date.now().toString().slice(-6)}`,
    });
  const clear = () => onPaymentOrder({ ...po, status: "cleared" });
  const hold = () => onPaymentOrder({ ...po, status: "held" });
  const reject = () => onPaymentOrder({ ...po, status: "rejected" });

  const cancel = () => {
    if (!po.cancellationReason) {
      alert("Provide a cancellation reason first (SRS Row 62).");
      return;
    }
    if (po.status === "cleared") {
      alert("Cannot cancel — payment has already been cleared (SRS Row 62).");
      return;
    }
    onPaymentOrder({
      ...po,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelledBy: po.cancelledBy || "Current User",
      reversalLedgerPosted: true,
    });
  };

  return (
    <section className={panelClass}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Payment Order (FIFO + Cancellation)</h3>
          <p className="text-xs text-slate-500">
            SRS Rows 60–64 · Steps 7.1–7.5 — Generate the PO from approved bills via
            FIFO, push to Cash Management, optionally cancel before clearance.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${STATUS_BADGE[po.status]}`}
        >
          {STATUS_LABEL[po.status]}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Payment Order ID
          </label>
          <input
            value={po.paymentOrderId || "— not generated —"}
            disabled
            className={`${inputClass} bg-slate-50 font-mono`}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            FIFO Sequence
          </label>
          <input
            value={po.fifoSequence || "—"}
            disabled
            className={`${inputClass} bg-slate-50`}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            PO Amount
          </label>
          <input
            value={po.amount}
            disabled
            className={`${inputClass} bg-slate-50 text-right font-bold`}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Generated At
          </label>
          <input
            value={po.generatedAt ? po.generatedAt.slice(0, 16).replace("T", " ") : "—"}
            disabled
            className={`${inputClass} bg-slate-50`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            CM Acknowledgement
          </label>
          <input
            value={po.cmAcknowledgement || "—"}
            disabled
            className={`${inputClass} bg-slate-50 font-mono`}
          />
        </div>
      </div>

      {/* Action row 1 — generation + lifecycle */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={!!po.paymentOrderId}
          className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-sky-700"
        >
          Generate (FIFO)
        </button>
        <button
          type="button"
          onClick={queue}
          disabled={po.status !== "generated"}
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-amber-100"
        >
          Queue (FIFO)
        </button>
        <button
          type="button"
          onClick={pushToCm}
          disabled={po.status !== "generated" && po.status !== "queued_fifo"}
          className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-100"
        >
          Push to Cash Mgmt
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={po.status !== "pushed_to_cm"}
          className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-700"
        >
          Mark Cleared
        </button>
        <button
          type="button"
          onClick={hold}
          disabled={po.status === "cleared" || po.status === "cancelled"}
          className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-orange-100"
        >
          Hold
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={po.status === "cleared" || po.status === "cancelled"}
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-100"
        >
          Reject
        </button>
      </div>

      {(po.status === "held" || po.status === "rejected") && (
        <div className="mt-3 grid gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Hold Reason
            </label>
            <input
              value={po.holdReason}
              onChange={(e) => set("holdReason", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Reject Reason
            </label>
            <input
              value={po.rejectReason}
              onChange={(e) => set("rejectReason", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Cancellation block — SRS Rows 62–63 */}
      <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
        <h4 className="text-sm font-bold text-rose-800">PO Cancellation (SRS Rows 62–63)</h4>
        <p className="text-[11px] text-rose-600">
          Cancellation is only allowed BEFORE the PO is cleared. The PO ID is never reused
          and the system will post reversal entries automatically.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cancellation Reason
            </label>
            <input
              value={po.cancellationReason}
              onChange={(e) => set("cancellationReason", e.target.value)}
              disabled={po.status === "cleared" || po.status === "cancelled"}
              className={inputClass}
              placeholder="Why is this PO being cancelled?"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cancelled By
            </label>
            <input
              value={po.cancelledBy}
              onChange={(e) => set("cancelledBy", e.target.value)}
              disabled={po.status === "cleared" || po.status === "cancelled"}
              className={inputClass}
              placeholder="User ID / officer name"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={cancel}
          disabled={po.status === "cleared" || po.status === "cancelled" || !po.paymentOrderId}
          className="mt-3 rounded-xl border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-700"
        >
          Cancel PO &amp; Post Reversal
        </button>
        {po.status === "cancelled" && po.reversalLedgerPosted && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3 text-xs text-rose-700">
            ✓ PO <strong>{po.paymentOrderId}</strong> cancelled at{" "}
            {po.cancelledAt.slice(0, 16).replace("T", " ")} by {po.cancelledBy}. Reversal
            entries posted to ledger / cash control. Invoice status reset.
          </div>
        )}
      </div>
    </section>
  );
}
