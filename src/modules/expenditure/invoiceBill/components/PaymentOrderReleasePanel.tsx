/* ═══════════════════════════════════════════════════════════════════════════
   §3.4 · Payment Order & Release — Dashboard Panel
   ────────────────────────────────────────────────
   Sources its queue from the SubmittedInvoice store (same store that the
   Invoice Processing + Invoice Approval screens write to). Invoices become
   eligible as soon as Row 16 approval lands them at status
   "approved-for-payment". The panel adapts each SubmittedInvoice into a
   StoredInvoiceBill-shaped working record so the three inner sub-step
   functions (Create / Release / Cancel) can keep their existing UI + field
   access patterns.

     • 3.4.1  Payment Order Creation         (Row 60–61 — generate + push CM)
     • 3.4.2  Process Payment for Release    (Row 62 — disburse → reconcile → paid)
     • 3.4.3  Payment Order Cancellation     (Row 63 — exception off 3.4.1)
   ═══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useMemo, useState } from "react";
import {
  useSubmittedInvoices,
  type SubmittedInvoice,
  type SubmittedInvoicePaymentOrder,
} from "../../../../shared/context/SubmittedInvoiceContext";
import {
  PO_ACK_OPTIONS,
  loadPoCancellationReasons,
  formatInvoiceNumber,
  loadInvoiceNumberingFormat,
} from "../../../masterData/storage";
import type { PaymentOrderRecord, PaymentOrderStatus, StoredInvoiceBill } from "../types";

/* ── Default PaymentOrderRecord used when adapting a SubmittedInvoice that
 *    has not yet had a PO generated. Keeps the shape aligned with the
 *    existing StoredInvoiceBill consumers below. ──────────────────────── */
const EMPTY_PO: PaymentOrderRecord = {
  paymentOrderId: "",
  generatedAt: "",
  fifoSequence: 0,
  amount: "0",
  status: "not_generated",
  cmAcknowledgement: "",
  holdReason: "",
  rejectReason: "",
  cancellationReason: "",
  cancelledAt: "",
  cancelledBy: "",
  reversalLedgerPosted: false,
};

/* ── Adapter: SubmittedInvoice → shape expected by the inner step code.
 *    Only the fields the UI touches are populated; everything else is
 *    safely stubbed so no `undefined` lookups blow up. ───────────────── */
type PoWorkingRecord = Pick<
  StoredInvoiceBill,
  "id" | "recordId" | "workflowStatus" | "paymentOrder" | "updatedAt"
> & {
  invoice: Pick<StoredInvoiceBill["invoice"], "invoiceId" | "contractorName" | "agencyName" | "netPayableAmount">;
  bill: Pick<StoredInvoiceBill["bill"], "netPayableAmount">;
};

function adaptSubmittedInvoice(inv: SubmittedInvoice): PoWorkingRecord {
  return {
    id: inv.id,
    recordId: inv.ifmisNumber || inv.id,
    workflowStatus: "bill-approved",
    updatedAt: inv.paymentDecisionAt || inv.submittedAt || new Date().toISOString(),
    paymentOrder: { ...EMPTY_PO, ...(inv.paymentOrder as Partial<PaymentOrderRecord> | undefined) },
    invoice: {
      invoiceId: inv.invoiceNumber || inv.ifmisNumber || "",
      contractorName: inv.contractor || "",
      agencyName: inv.agencyName || "",
      netPayableAmount: String(inv.netPayable ?? 0),
    },
    bill: {
      netPayableAmount: String(inv.netPayable ?? 0),
    },
  };
}

interface Props {
  onBack: () => void;
}

type SubStep = "create" | "release" | "cancel";

const SUB_STEPS: { key: SubStep; tag: string; label: string; hint: string; icon: string }[] = [
  {
    key: "create",
    tag: "§3.4.1",
    label: "Payment Order Creation",
    hint: "Generate the PO from FIFO and push it to Cash Management.",
    icon: "💰",
  },
  {
    key: "release",
    tag: "§3.4.2",
    label: "Process Payment for Release",
    hint: "Move cleared POs through release → reconcile → paid.",
    icon: "🚀",
  },
  {
    key: "cancel",
    tag: "§3.4.3",
    label: "Payment Order Cancellation",
    hint: "Cancel a PO that is still Pending / Initiated.",
    icon: "🛑",
  },
];

const ACTIVE_TAB =
  "border-yellow-300 bg-yellow-100 text-yellow-900 ring-2 ring-yellow-300";
const INACTIVE_TAB =
  "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

const STATUS_BADGE: Record<PaymentOrderStatus, string> = {
  not_generated: "bg-slate-100 text-slate-600",
  queued_fifo: "bg-amber-100 text-amber-700",
  generated: "bg-sky-100 text-sky-700",
  pushed_to_cm: "bg-indigo-100 text-indigo-700",
  cleared: "bg-emerald-100 text-emerald-700",
  held: "bg-orange-100 text-orange-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-rose-200 text-rose-800",
};

const STATUS_LABEL: Record<PaymentOrderStatus, string> = {
  not_generated: "Not Generated",
  queued_fifo: "Queued (FIFO)",
  generated: "Generated",
  pushed_to_cm: "Pushed to Cash Mgmt",
  cleared: "Cleared",
  held: "Held",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main panel
   ═══════════════════════════════════════════════════════════════════════════ */
export function PaymentOrderReleasePanel({ onBack }: Props) {
  const { invoices, updateSubmittedInvoice } = useSubmittedInvoices();
  const [activeStep, setActiveStep] = useState<SubStep>("create");

  /* Row 16 `approved-for-payment` is the gate to enter §3.4. Invoices that
   * have already been released show up too so users can see the Paid tail. */
  const eligibleRecords = useMemo(
    () =>
      invoices
        .filter((inv) => ["approved-for-payment", "payment-on-hold"].includes(inv.status))
        .map(adaptSubmittedInvoice),
    [invoices],
  );

  /* updateRecord bridge — mutates the underlying SubmittedInvoice's
   * paymentOrder sub-object (and mirrors workflow transitions via the
   * SubmittedInvoice status field when PRs are released). */
  const updateRecord = useCallback(
    (id: string, patch: Partial<StoredInvoiceBill>) => {
      const submittedPatch: Partial<SubmittedInvoice> = {};
      if (patch.paymentOrder) {
        submittedPatch.paymentOrder = patch.paymentOrder as SubmittedInvoicePaymentOrder;
      }
      if (patch.workflowStatus === "paid") {
        /* Row 62 release → mirror as terminal "approved-for-payment" + keep
         * history; full payment-cleared state lives inside paymentOrder. */
        submittedPatch.paymentDecisionAt = new Date().toISOString();
      }
      if (Object.keys(submittedPatch).length > 0) {
        updateSubmittedInvoice(id, submittedPatch);
      }
    },
    [updateSubmittedInvoice],
  );

  const counts = useMemo(() => {
    return {
      create: eligibleRecords.filter(
        (r) => !r.paymentOrder?.paymentOrderId || r.paymentOrder?.status === "queued_fifo",
      ).length,
      release: eligibleRecords.filter((r) => r.paymentOrder?.status === "cleared").length,
      cancel: eligibleRecords.filter((r) =>
        r.paymentOrder?.status
          ? ["generated", "pushed_to_cm", "queued_fifo"].includes(r.paymentOrder.status)
          : false,
      ).length,
    } as Record<SubStep, number>;
  }, [eligibleRecords]);

  return (
    <section className="overflow-hidden rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-7">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
            §3.4 · Post-Approval
          </span>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Payment Order &amp; Release</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Live dynamic flow operating directly on bill-approved records. All
            dropdown values are loaded from the Master Data registry.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Invoice &amp; Bill Dashboard
        </button>
      </header>

      {/* Sub-step tabs */}
      <nav className="mt-5 grid gap-3 sm:grid-cols-3">
        {SUB_STEPS.map((s) => {
          const isActive = activeStep === s.key;
          const badge = counts[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveStep(s.key)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${isActive ? ACTIVE_TAB : INACTIVE_TAB}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg text-emerald-700">
                {s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isActive ? "text-yellow-800" : "text-emerald-700"}`}
                >
                  {s.tag}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{s.label}</p>
                <p className="text-[11px] text-slate-500">{s.hint}</p>
              </div>
              {badge > 0 && (
                <span
                  className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[11px] font-bold ${
                    isActive ? "bg-yellow-300 text-yellow-900" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active sub-step body */}
      <div className="mt-5">
        {activeStep === "create" && (
          <CreateStep records={eligibleRecords} updateRecord={updateRecord} />
        )}
        {activeStep === "release" && (
          <ReleaseStep records={eligibleRecords} updateRecord={updateRecord} />
        )}
        {activeStep === "cancel" && (
          <CancelStep records={eligibleRecords} updateRecord={updateRecord} />
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 1 · Payment Order Creation (3.4.1)
   ═══════════════════════════════════════════════════════════════════════════ */
function CreateStep({
  records,
  updateRecord,
}: {
  records: PoWorkingRecord[];
  updateRecord: (id: string, patch: Partial<StoredInvoiceBill>) => void;
}) {
  /* FIFO ordering on bill-approved date */
  const queue = useMemo(
    () =>
      [...records]
        .filter(
          (r) =>
            !r.paymentOrder.paymentOrderId ||
            r.paymentOrder.status === "queued_fifo" ||
            r.paymentOrder.status === "generated",
        )
        .sort((a, b) => (a.updatedAt > b.updatedAt ? 1 : -1)),
    [records],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [ack, setAck] = useState<"" | "cleared" | "held" | "rejected">("");
  const [ackReason, setAckReason] = useState("");

  const selected = queue.find((r) => r.id === selectedId);

  const generatePo = () => {
    if (!selected) return;
    /* Use the live Master Data numbering format with PO prefix override */
    const cfg = loadInvoiceNumberingFormat();
    const seq = Math.floor(Math.random() * 900000) + 100000;
    const poId = cfg.active
      ? formatInvoiceNumber(cfg, { seq, channel: "manual" }).replace(/^[A-Z]+-/, "PO-")
      : `PO-${new Date().getFullYear()}-${seq}`;

    const po: PaymentOrderRecord = {
      ...selected.paymentOrder,
      paymentOrderId: poId,
      generatedAt: new Date().toISOString(),
      fifoSequence: queue.findIndex((r) => r.id === selected.id) + 1,
      amount: selected.bill.netPayableAmount || selected.invoice.netPayableAmount || "0",
      status: "generated",
    };
    updateRecord(selected.id, { paymentOrder: po });
  };

  const pushToCm = () => {
    if (!selected) return;
    updateRecord(selected.id, {
      paymentOrder: {
        ...selected.paymentOrder,
        status: "pushed_to_cm",
        cmAcknowledgement: `CM-ACK-${Date.now().toString().slice(-6)}`,
      },
    });
  };

  const submitAck = () => {
    if (!selected || !ack) return;
    if ((ack === "held" || ack === "rejected") && !ackReason.trim()) return;
    updateRecord(selected.id, {
      paymentOrder: {
        ...selected.paymentOrder,
        status: ack,
        holdReason: ack === "held" ? ackReason : "",
        rejectReason: ack === "rejected" ? ackReason : "",
      },
    });
    setAck("");
    setAckReason("");
  };

  return (
    <div className="grid gap-4">
      <QueueTable
        title="FIFO Queue · Awaiting Payment Order"
        records={queue}
        selectedId={selectedId}
        onSelect={setSelectedId}
        emptyText="No bill-approved records waiting for a Payment Order."
      />

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Selected · {selected.recordId}
              </p>
              <p className="text-sm font-bold text-slate-900">
                {selected.invoice.contractorName || "Unnamed"} ·{" "}
                <span className="font-mono text-xs">
                  {selected.bill.netPayableAmount || selected.invoice.netPayableAmount} BTN
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!selected.paymentOrder.paymentOrderId && (
                <button
                  type="button"
                  onClick={generatePo}
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                >
                  Generate PO →
                </button>
              )}
              {selected.paymentOrder.status === "generated" && (
                <button
                  type="button"
                  onClick={pushToCm}
                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
                >
                  Push to Cash Mgmt →
                </button>
              )}
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[selected.paymentOrder.status]}`}
              >
                {STATUS_LABEL[selected.paymentOrder.status]}
              </span>
            </div>
          </div>

          {/* PO snapshot */}
          {selected.paymentOrder.paymentOrderId && (
            <div className="mt-3 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">PO Number</p>
                <p className="font-mono font-bold text-slate-900">
                  {selected.paymentOrder.paymentOrderId}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">FIFO #</p>
                <p className="font-mono text-slate-800">{selected.paymentOrder.fifoSequence}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CM Ack</p>
                <p className="font-mono text-slate-800">
                  {selected.paymentOrder.cmAcknowledgement || "—"}
                </p>
              </div>
            </div>
          )}

          {/* Cash-Mgmt acknowledgement (Master Data driven) */}
          {selected.paymentOrder.status === "pushed_to_cm" && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cash Mgmt Acknowledgement (dynamic)
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {PO_ACK_OPTIONS.map((opt) => {
                  const isActive = ack === (opt.value === "hold" ? "held" : opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setAck(opt.value === "hold" ? "held" : (opt.value as "cleared" | "rejected"))
                      }
                      className={`rounded-xl border p-2 text-left text-xs transition ${isActive ? ACTIVE_TAB : INACTIVE_TAB}`}
                    >
                      <p className="font-bold text-slate-900">{opt.label}</p>
                      <p className="text-[11px] text-slate-500">{opt.hint}</p>
                    </button>
                  );
                })}
              </div>
              {(ack === "held" || ack === "rejected") && (
                <textarea
                  value={ackReason}
                  onChange={(e) => setAckReason(e.target.value)}
                  rows={2}
                  placeholder="Capture justification (required)"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                />
              )}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!ack || ((ack === "held" || ack === "rejected") && !ackReason.trim())}
                  onClick={submitAck}
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300"
                >
                  Save Acknowledgement
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 2 · Process Payment for Release (3.4.2)
   ═══════════════════════════════════════════════════════════════════════════ */
function ReleaseStep({
  records,
  updateRecord,
}: {
  records: PoWorkingRecord[];
  updateRecord: (id: string, patch: Partial<StoredInvoiceBill>) => void;
}) {
  const cleared = useMemo(
    () => records.filter((r) => r.paymentOrder.status === "cleared"),
    [records],
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = cleared.find((r) => r.id === selectedId);

  const release = () => {
    if (!selected) return;
    updateRecord(selected.id, {
      workflowStatus: "paid",
      paymentOrder: {
        ...selected.paymentOrder,
        cmAcknowledgement:
          selected.paymentOrder.cmAcknowledgement || `CM-REL-${Date.now().toString().slice(-6)}`,
      },
    });
  };

  return (
    <div className="grid gap-4">
      <QueueTable
        title="Cleared POs · Ready for Disbursement"
        records={cleared}
        selectedId={selectedId}
        onSelect={setSelectedId}
        emptyText="No cleared Payment Orders waiting for release. Generate and clear one first."
      />
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Releasing {selected.paymentOrder.paymentOrderId}
            </p>
            <p className="text-sm font-bold text-slate-900">
              {selected.invoice.contractorName} —{" "}
              <span className="font-mono">{selected.paymentOrder.amount} BTN</span>
            </p>
            <p className="text-[11px] text-slate-600">
              Pushes payment-released → reconciled → paid and posts ledger entries.
            </p>
          </div>
          <button
            type="button"
            onClick={release}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            Release Payment →
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 3 · Payment Order Cancellation (3.4.3)
   ═══════════════════════════════════════════════════════════════════════════ */
function CancelStep({
  records,
  updateRecord,
}: {
  records: PoWorkingRecord[];
  updateRecord: (id: string, patch: Partial<StoredInvoiceBill>) => void;
}) {
  const reasons = useMemo(() => loadPoCancellationReasons(), []);
  const cancellable = useMemo(
    () =>
      records.filter((r) =>
        ["generated", "pushed_to_cm", "queued_fifo"].includes(r.paymentOrder.status),
      ),
    [records],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);

  const selected = cancellable.find((r) => r.id === selectedId);

  const cancel = () => {
    if (!selected || !reason || !ack) return;
    updateRecord(selected.id, {
      paymentOrder: {
        ...selected.paymentOrder,
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: "current.user",
        reversalLedgerPosted: true,
      },
    });
    setSelectedId("");
    setReason("");
    setAck(false);
  };

  return (
    <div className="grid gap-4">
      <QueueTable
        title="Active POs · Eligible for Cancellation"
        records={cancellable}
        selectedId={selectedId}
        onSelect={setSelectedId}
        emptyText="No active Payment Orders to cancel. Released or paid POs cannot be cancelled here."
      />

      {selected && (
        <div className="grid gap-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cancellation Reason (Master Data)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select reason —</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">
              {reasons.length} reason(s) loaded dynamically from Master Data → PO Cancellation
              Reasons.
            </p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Selected PO
            </label>
            <p className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900">
              {selected.paymentOrder.paymentOrderId} · {selected.paymentOrder.amount} BTN
            </p>
          </div>
          <label className="sm:col-span-2 flex items-start gap-2">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600"
            />
            <span className="text-xs text-slate-700">
              I acknowledge that cancelling this Payment Order will post reversal entries and
              release the encumbrance on the contract commitment (Row 63).
            </span>
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="button"
              disabled={!reason || !ack}
              onClick={cancel}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow disabled:bg-slate-300"
            >
              Cancel Payment Order →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable mini-table for record selection
   ═══════════════════════════════════════════════════════════════════════════ */
function QueueTable({
  title,
  records,
  selectedId,
  onSelect,
  emptyText,
}: {
  title: string;
  records: PoWorkingRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      {records.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Pick</th>
              <th className="px-3 py-2 text-left">Record</th>
              <th className="px-3 py-2 text-left">Contractor</th>
              <th className="px-3 py-2 text-right">Net Payable</th>
              <th className="px-3 py-2 text-left">PO Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => {
              const isActive = r.id === selectedId;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={`cursor-pointer ${isActive ? "bg-yellow-100 ring-1 ring-yellow-300" : "hover:bg-slate-50"}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="radio"
                      checked={isActive}
                      readOnly
                      className="h-4 w-4 text-emerald-600"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-mono text-[11px] font-bold text-slate-900">
                      {r.recordId}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {r.invoice.invoiceId}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-800">
                      {r.invoice.contractorName || "—"}
                    </div>
                    <div className="text-[10px] text-slate-500">{r.invoice.agencyName || ""}</div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-800">
                    {r.bill.netPayableAmount || r.invoice.netPayableAmount || "0"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[r.paymentOrder.status]}`}
                    >
                      {STATUS_LABEL[r.paymentOrder.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
