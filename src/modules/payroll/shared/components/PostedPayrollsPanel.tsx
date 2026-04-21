/* ═══════════════════════════════════════════════════════════════════════════
   Posted Payrolls Panel
   ─────────────────────
   Cross-agency queue of PayBills posted to MCP. MoF consumes this queue from
   the Payroll Management dashboard to release payments; originating agencies
   see a read-only list of their own outbound postings with current status.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from "react";
import {
  usePayrollPostings,
  markAsProcessing,
  markAsPaid,
  rejectPosting,
  PayrollPosting,
  PayrollPostingStatus,
} from "../../state/payrollPostings";

interface Props {
  activeAgencyCode: string | null | undefined;
  isCentralMoF: boolean;
  /** Optional stream scope — when set, only postings for that stream are
   *  shown. Used on the Payroll Management landing so the queue inside the
   *  Civil Servant workspace never leaks OPS rows and vice-versa. */
  streamFilter?: "civil-servant" | "other-public-servant" | null;
}

const STATUS_META: Record<PayrollPostingStatus, { label: string; cls: string }> = {
  "awaiting-payment": {
    label: "Awaiting Payment",
    cls: "bg-amber-50 text-amber-800 border-amber-200",
  },
  processing: {
    label: "Processing",
    cls: "bg-blue-50 text-blue-800 border-blue-200",
  },
  paid: {
    label: "Paid",
    cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

function fmtMoney(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtPeriod(p: PayrollPosting) {
  const monthName = new Date(p.year, p.month - 1, 1).toLocaleString("en-US", {
    month: "short",
  });
  return `${monthName} ${p.year}`;
}

function fmtWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const PostedPayrollsPanel: React.FC<Props> = ({
  activeAgencyCode,
  isCentralMoF,
  streamFilter = null,
}) => {
  const rawPostings = usePayrollPostings(isCentralMoF ? "all" : activeAgencyCode);
  /* Apply stream scope first so every downstream count / filter is already
     narrowed to the active channel. */
  const postings = useMemo(
    () => (streamFilter ? rawPostings.filter((p) => p.stream === streamFilter) : rawPostings),
    [rawPostings, streamFilter],
  );
  const [statusFilter, setStatusFilter] = useState<PayrollPostingStatus | "all">(
    "all",
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return postings;
    return postings.filter((p) => p.status === statusFilter);
  }, [postings, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<PayrollPostingStatus, number> = {
      "awaiting-payment": 0,
      processing: 0,
      paid: 0,
      rejected: 0,
    };
    postings.forEach((p) => {
      c[p.status] = (c[p.status] || 0) + 1;
    });
    return c;
  }, [postings]);

  const handleProcess = (id: string) => {
    markAsProcessing(id);
  };

  const handlePay = (id: string) => {
    const pon = window.prompt(
      "Enter Payment Order Number (e.g. PO-2026-00123):",
      `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    );
    if (!pon) return;
    markAsPaid(id, pon);
  };

  const handleReject = (id: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    rejectPosting(id, reason);
  };

  if (postings.length === 0) {
    return (
      <div className="mb-6 rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {isCentralMoF ? "MoF · Payment Queue" : "My Postings"}
            </div>
            <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
              Posted Payrolls — Awaiting Payment
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {isCentralMoF
                ? "No payrolls have been posted to MCP yet. When an agency posts a PayBill it will appear here for payment processing."
                : "You have not posted any payrolls to MCP yet. Posted PayBills will appear here with their payment status."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            {isCentralMoF ? "MoF · Payment Queue" : "My Postings"}
          </div>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
            Posted Payrolls — Awaiting Payment
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {isCentralMoF
              ? "Cross-agency queue — review, process and release payment."
              : "Status of PayBills you've posted to MCP."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "awaiting-payment", "processing", "paid", "rejected"] as const).map(
            (key) => {
              const n =
                key === "all" ? postings.length : counts[key as PayrollPostingStatus];
              const active = statusFilter === key;
              const label =
                key === "all"
                  ? "All"
                  : STATUS_META[key as PayrollPostingStatus].label;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label} · {n}
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Journal Entry</th>
              <th className="px-3 py-2 text-left font-semibold">Agency</th>
              <th className="px-3 py-2 text-left font-semibold">Category</th>
              <th className="px-3 py-2 text-left font-semibold">Period</th>
              <th className="px-3 py-2 text-right font-semibold">Employees</th>
              <th className="px-3 py-2 text-right font-semibold">Net (Nu.)</th>
              <th className="px-3 py-2 text-left font-semibold">Posted</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              {isCentralMoF && (
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const meta = STATUS_META[p.status];
              return (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">
                    {p.journalEntryId}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{p.agencyName}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      #{p.agencyCode}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {p.stream === "civil-servant"
                      ? "Civil Service"
                      : p.opsCategoryName || "OPS"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{fmtPeriod(p)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {p.employeeCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                    {fmtMoney(p.netAmount)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    <div>{fmtWhen(p.postedAt)}</div>
                    {p.postedByRoleName && (
                      <div className="text-[10px] text-slate-400">
                        {p.postedByRoleName}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                    {p.status === "paid" && p.paymentOrderNumber && (
                      <div className="mt-1 font-mono text-[10px] text-emerald-700">
                        {p.paymentOrderNumber}
                      </div>
                    )}
                    {p.status === "rejected" && p.rejectedReason && (
                      <div
                        className="mt-1 max-w-[180px] truncate text-[10px] text-rose-700"
                        title={p.rejectedReason}
                      >
                        {p.rejectedReason}
                      </div>
                    )}
                  </td>
                  {isCentralMoF && (
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {p.status === "awaiting-payment" && (
                          <>
                            <button
                              onClick={() => handleProcess(p.id)}
                              className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Process
                            </button>
                            <button
                              onClick={() => handlePay(p.id)}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {p.status === "processing" && (
                          <>
                            <button
                              onClick={() => handlePay(p.id)}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(p.status === "paid" || p.status === "rejected") && (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={isCentralMoF ? 9 : 8}
                  className="px-3 py-6 text-center text-sm text-slate-400"
                >
                  No postings match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
