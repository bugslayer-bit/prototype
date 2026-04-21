/* ═══════════════════════════════════════════════════════════════════════════
   Invoice & Bill Queue — list / approver landing view.
   Shows every record with status, amounts, and quick actions.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { useInvoiceBillData } from "../context/InvoiceBillDataContext";
import type { StoredInvoiceBill } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { ActionButton, actionButtonClass } from "../../../../shared";
import { printAsPdf } from "../utils/downloadInvoiceBill";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";

const statusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  "invoice-submitted": "bg-sky-100 text-sky-700",
  "invoice-verified": "bg-sky-100 text-sky-700",
  "invoice-approved": "bg-indigo-100 text-indigo-700",
  "bill-created": "bg-violet-100 text-violet-700",
  "bill-submitted": "bg-violet-100 text-violet-700",
  "bill-verified": "bg-violet-100 text-violet-700",
  "bill-approved": "bg-emerald-100 text-emerald-700",
  discounted: "bg-pink-100 text-pink-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

interface Props {
  onNewRecord: () => void;
  onEditRecord: (record: StoredInvoiceBill) => void;
}

export function InvoiceBillQueue({ onNewRecord, onEditRecord }: Props) {
  const { records, removeRecord } = useInvoiceBillData();
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StoredInvoiceBill | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.invoice.invoiceNumber.toLowerCase().includes(q) ||
        r.invoice.contractId.toLowerCase().includes(q) ||
        r.invoice.contractorName.toLowerCase().includes(q) ||
        r.recordId.toLowerCase().includes(q),
    );
  }, [records, search]);

  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let approved = 0;
    let pending = 0;
    for (const r of records) {
      gross += parseFloat(r.invoice.invoiceGrossAmount || "0") || 0;
      net += parseFloat(r.invoice.netPayableAmount || "0") || 0;
      if (r.workflowStatus === "bill-approved" || r.workflowStatus === "paid") approved += 1;
      else pending += 1;
    }
    return { gross, net, approved, pending };
  }, [records]);

  return (
    <div className="grid gap-5">
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Records</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{records.length}</p>
        </div>
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/70 p-4 shadow-[0_8px_22px_rgba(16,185,129,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{totals.approved}</p>
        </div>
        <div className="rounded-[20px] border border-amber-200 bg-amber-50/70 p-4 shadow-[0_8px_22px_rgba(245,158,11,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{totals.pending}</p>
        </div>
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Net Payable</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totals.net.toLocaleString()} BTN</p>
        </div>
      </div>

      <section className={panelClass}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Invoice & Bill Queue</h3>
            <p className="text-sm text-slate-600">All invoice/bill records — past and in-progress.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice / contract / contractor"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-50 sm:min-w-[280px] lg:w-[280px]"
            />
            <ActionButton
              type="button"
              onClick={onNewRecord}
              variant="primary"
              size="md"
            >
              + New Invoice & Bill
            </ActionButton>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-200">
          <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Record / Invoice</th>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3">Contractor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Net Payable</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No records found. Click "+ New Invoice & Bill" to start.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="transition hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.invoice.invoiceNumber || "(unsaved)"}</p>
                    <p className="text-[11px] text-slate-500">{r.recordId}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.invoice.contractId || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.invoice.contractorName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {r.bill.billCategory}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {Number(r.invoice.invoiceGrossAmount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {Number(r.invoice.netPayableAmount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        statusColor[r.workflowStatus] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.workflowStatus.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditRecord(r)}
                        className={actionButtonClass("secondary", "xs")}
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() => printAsPdf(r)}
                        title="Download invoice & bill as PDF"
                        className={actionButtonClass("secondary", "xs")}
                      >
                        ⬇ Download PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingDelete(r)}
                        title="Delete this record"
                        className={actionButtonClass("danger-soft", "xs", "px-2")}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="Delete Invoice & Bill Record?"
        message={
          pendingDelete
            ? `You are about to permanently delete record "${pendingDelete.recordId}". This action cannot be undone.`
            : ""
        }
        detail={
          pendingDelete
            ? `Invoice ${pendingDelete.invoice.invoiceNumber || "(unsaved)"} · Contract ${pendingDelete.invoice.contractId || "—"} · Net Payable ${Number(pendingDelete.invoice.netPayableAmount || 0).toLocaleString()} ${pendingDelete.invoice.currency || ""}`
            : undefined
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeRecord(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
