/* ═══════════════════════════════════════════════════════════════════════════
   InitiatePaymentDialog — queue-level shortcut for PRN 5.1 R77 tail-end.
   Opens from the Utility Queue "Initiate Payment" action button and lets the
   agency generate Payment Orders against payable bills of a single utility
   account without re-entering the 3-step wizard.

   Dynamic behaviour:
     • Lists every bill on the selected StoredUtility that is NOT yet paid/
       approved and has no PO id (i.e. still payable). Source of truth is
       UtilityDataContext, so the list updates the moment a bill is added,
       edited, or cleared.
     • Uses master-data-driven status helpers so custom bill statuses
       configured by admins still classify correctly.
     • On confirm, for each selected bill it:
         1. Synthesises PO-YYYY-###### and a CM-ACK-xxxxxx acknowledgement.
         2. Pushes a SubmittedInvoice to SubmittedInvoiceContext with
            paymentOrder.status = "pushed_to_cm" so the Cash Management
            module picks it up instantly.
         3. Updates the bill in-place (paymentOrderId, status → Approved
            label) via UtilityDataContext.updateUtility — persisted to
            localStorage automatically.
     • The queue KPIs, tab badges and Cash Management queue all re-render
       from the shared context — no page reload required.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import type { StoredUtility, UtilityBill } from "../types";
import { useUtilityData } from "../context/UtilityDataContext";
import {
  useUtilityMasterData,
  findLabel,
  isApprovedStatus,
  isPaidOrApprovedStatus,
} from "../hooks/useUtilityMasterData";
import {
  useSubmittedInvoices,
  type SubmittedInvoice,
} from "../../../../shared/context/SubmittedInvoiceContext";

interface Props {
  open: boolean;
  record: StoredUtility | null;
  onClose: () => void;
}

const isPayableBill = (b: UtilityBill) =>
  !b.paymentOrderId && !isPaidOrApprovedStatus(b.status || "");

const fmtNu = (v: string | number) => {
  const n = typeof v === "number" ? v : parseFloat(v || "0") || 0;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function InitiatePaymentDialog({ open, record, onClose }: Props) {
  const { updateUtility } = useUtilityData();
  const { addSubmittedInvoice } = useSubmittedInvoices();
  const master = useUtilityMasterData();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<
    { poCount: number; totalAmount: number } | null
  >(null);

  /* Reset selection every time the dialog opens for a new record. */
  useEffect(() => {
    if (!open) return;
    setSelected({});
    setLastResult(null);
  }, [open, record?.id]);

  /* Esc to close. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const payableBills = useMemo(
    () => (record?.bills || []).filter(isPayableBill),
    [record],
  );

  const selectedBills = useMemo(
    () => payableBills.filter((b) => selected[b.id]),
    [payableBills, selected],
  );

  const totalSelected = useMemo(
    () =>
      selectedBills.reduce(
        (s, b) => s + (parseFloat(b.totalBillAmount || "0") || 0),
        0,
      ),
    [selectedBills],
  );

  const approvedLabel =
    findLabel(master.billStatus, isApprovedStatus) ||
    findLabel(master.billStatus, isPaidOrApprovedStatus) ||
    "Approved";

  const toggleAll = (checked: boolean) => {
    if (!checked) return setSelected({});
    const next: Record<string, boolean> = {};
    for (const b of payableBills) next[b.id] = true;
    setSelected(next);
  };

  const handleConfirm = () => {
    if (!record || selectedBills.length === 0) return;
    setSubmitting(true);
    const now = new Date();
    const year = now.getFullYear();
    const nowIso = now.toISOString();

    /* Build the per-bill mutation + invoice fan-out in a single pass so
       the context updates atomically and nothing gets double-posted. */
    const updatedBills: UtilityBill[] = record.bills.map((b) => {
      if (!selected[b.id]) return b;
      const seq = Math.floor(Math.random() * 900000) + 100000;
      const poId = `PO-${year}-${seq}`;
      const ack = `CM-ACK-${Date.now().toString().slice(-6)}${seq
        .toString()
        .slice(-2)}`;
      const totalNum = parseFloat(b.totalBillAmount || "0") || 0;

      const invoice: SubmittedInvoice = {
        id: `UTIL-INV-${Date.now()}-${seq}`,
        ifmisNumber: `UTIL-${year}-${seq}`,
        invoiceNumber: b.billId,
        contractId: record.header.utilityId,
        contractTitle: `${record.header.utilityType} — ${record.header.serviceProviderName}`,
        contractor: record.header.serviceProviderName,
        contractorId: record.header.serviceProviderId,
        agencyName: record.header.agencyName,
        category: "Services",
        grossAmount: parseFloat(b.billAmount || "0") || 0,
        taxAmount: parseFloat(b.applicableTaxes || "0") || 0,
        retentionAmount: 0,
        deductionAmount: 0,
        netPayable: totalNum,
        currency: "BTN",
        invoiceDate: b.billDueDate || nowIso.slice(0, 10),
        submittedAt: nowIso,
        submittedBy: "Utility Management (Queue)",
        channel: "utility-api",
        taxType: "Utility",
        documents: [],
        status: "approved-for-payment",
        esg: null,
        history: [
          {
            at: nowIso,
            by: "Utility Management",
            action: "Payment initiated from queue",
            comment: `Bill ${b.billId} pushed to Cash Management via Initiate Payment action.`,
          },
        ],
        paymentOrder: {
          paymentOrderId: poId,
          generatedAt: nowIso,
          fifoSequence: 1,
          amount: totalNum.toFixed(2),
          status: "pushed_to_cm",
          cmAcknowledgement: ack,
          holdReason: "",
          rejectReason: "",
          cancellationReason: "",
          cancelledAt: "",
          cancelledBy: "",
          reversalLedgerPosted: false,
        },
      };
      addSubmittedInvoice(invoice);

      return {
        ...b,
        paymentOrderId: poId,
        paymentOrderGeneratedAt: nowIso,
        paymentOrderAck: ack,
        paymentOrderStatus: "pushed_to_cm",
        status: approvedLabel,
      };
    });

    updateUtility(record.id, { bills: updatedBills, updatedAt: nowIso });

    setLastResult({ poCount: selectedBills.length, totalAmount: totalSelected });
    setSubmitting(false);
    setSelected({});
  };

  if (!open || !record) return null;

  const allSelected =
    payableBills.length > 0 && selectedBills.length === payableBills.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-sky-200">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-500" />
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                PRN 5.1 · Initiate Payment
              </span>
              <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">
                {record.header.utilityId} — {record.header.agencyName || "—"}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {record.header.utilityType || "—"} ·{" "}
                {record.header.serviceProviderName || "—"} ·{" "}
                {record.header.billingCycle || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>
        </div>

        {lastResult ? (
          <div className="px-6 pb-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <div className="text-2xl">✅</div>
              <p className="mt-2 text-sm font-semibold text-emerald-900">
                {lastResult.poCount} Payment Order
                {lastResult.poCount > 1 ? "s" : ""} pushed to Cash Management
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Total initiated: Nu. {fmtNu(lastResult.totalAmount)}
              </p>
              <p className="mt-3 text-[11px] text-emerald-800/80">
                Each bill is now linked to its PO, visible in the Cash
                Management queue, and reflected in the queue KPIs.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : payableBills.length === 0 ? (
          <div className="px-6 pb-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-2xl">💤</div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                No payable bills for this utility account
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Every bill is already paid, approved or has a Payment Order.
                Add a new bill from the workspace to initiate another payment.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-[420px] overflow-auto border-y border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-3">Bill ID</th>
                    <th className="px-3 py-3">Period</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 text-right">Tax</th>
                    <th className="px-3 py-3 text-right">Total (Nu.)</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payableBills.map((b) => {
                    const checked = !!selected[b.id];
                    return (
                      <tr
                        key={b.id}
                        className={checked ? "bg-sky-50/60" : "hover:bg-slate-50"}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelected((cur) => ({
                                ...cur,
                                [b.id]: e.target.checked,
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-700">
                          {b.billId}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {b.billingPeriodFrom || "—"} → {b.billingPeriodTo || "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {b.billDueDate || "—"}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-700">
                          {fmtNu(b.billAmount)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-700">
                          {fmtNu(b.applicableTaxes)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900">
                          {fmtNu(b.totalBillAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            {b.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-6 py-4">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">
                  {selectedBills.length}
                </span>{" "}
                of {payableBills.length} bills selected ·{" "}
                <span className="font-semibold text-slate-900">
                  Nu. {fmtNu(totalSelected)}
                </span>{" "}
                to initiate
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={submitting || selectedBills.length === 0}
                  className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting
                    ? "Generating…"
                    : `Initiate Payment (${selectedBills.length})`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
