/* ═══════════════════════════════════════════════════════════════════════════
   PaymentStatusPage — Public Portal "Payment Status"
   SRS PRN 3 (Invoice & Bill Management) Rows 39–49 + Row 16 "Approval for
   Payment", Row 20 "Payment Order", Row 21 "Payment Order Cancellation".

   Dynamic flow:
     1. Read logged-in contractor (role-public, EXT) from AuthContext.
     2. Match contractor record by email via ContractorDataContext.
     3. Filter SubmittedInvoices by contractorId (or contractor name fallback).
     4. Show KPI strip + invoice list grouped by processing status with the
        associated Payment Order info (if generated).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { useContractorData } from "../../shared/context/ContractorDataContext";
import { useSubmittedInvoices } from "../../shared/context/SubmittedInvoiceContext";

const STATUS_GROUPS = [
  { key: "submitted", label: "Submitted", tone: "bg-sky-100 text-sky-700" },
  { key: "approved", label: "Approved", tone: "bg-emerald-100 text-emerald-700" },
  { key: "on-hold", label: "On Hold", tone: "bg-amber-100 text-amber-800" },
  { key: "rejected", label: "Rejected", tone: "bg-rose-100 text-rose-700" },
  { key: "paid", label: "Paid", tone: "bg-indigo-100 text-indigo-700" },
];

export default function PaymentStatusPage() {
  const { user, activeRoleId, activeAgencyCode } = useAuth();
  const { contractors } = useContractorData();
  const { invoices } = useSubmittedInvoices();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");

  const myContractor = useMemo(() => {
    if (!user) return null;
    return (
      contractors.find(
        (c) => c.email?.toLowerCase() === user.email?.toLowerCase(),
      ) ??
      contractors.find(
        (c) => c.displayName?.toLowerCase() === user.name?.toLowerCase(),
      ) ??
      null
    );
  }, [contractors, user]);

  const myInvoices = useMemo(() => {
    if (!user) return [];
    return invoices.filter((inv) => {
      if (myContractor && inv.contractorId === myContractor.id) return true;
      if (inv.contractor?.toLowerCase() === user.name?.toLowerCase()) return true;
      return false;
    });
  }, [invoices, myContractor, user]);

  const kpis = useMemo(() => {
    const total = myInvoices.length;
    const totalGross = myInvoices.reduce((s, i) => s + (i.grossAmount || 0), 0);
    const totalNet = myInvoices.reduce((s, i) => s + (i.netPayable || 0), 0);
    const pending = myInvoices.filter(
      (i) => i.status === "submitted" || i.status === "on-hold",
    ).length;
    const paid = myInvoices.filter(
      (i) => i.paymentOrder?.status === "cleared",
    ).length;
    return { total, totalGross, totalNet, pending, paid };
  }, [myInvoices]);

  const filtered = useMemo(() => {
    if (filter === "all") return myInvoices;
    if (filter === "paid") {
      return myInvoices.filter((i) => i.paymentOrder?.status === "cleared");
    }
    return myInvoices.filter((i) => i.status === filter);
  }, [myInvoices, filter]);

  if (activeRoleId !== "role-public" || activeAgencyCode !== "EXT") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        This page is available only to logged-in contractors / vendors.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-6">
        <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600">
          Contractor Portal
          <span className="h-1 w-1 rounded-full bg-indigo-300" />
          PRN 3.16 · 3.20
          <span className="h-1 w-1 rounded-full bg-indigo-300" />
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            Payment Status
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Payment Status
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
          Track the processing status of every invoice you have submitted — from
          approval to Payment Order release.
          {myContractor && (
            <span className="ml-1">
              Showing records for <span className="font-semibold">{myContractor.displayName}</span>.
            </span>
          )}
        </p>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total Invoices" value={kpis.total.toString()} />
        <Kpi label="Gross Billed" value={fmtMoney(kpis.totalGross)} />
        <Kpi label="Net Payable" value={fmtMoney(kpis.totalNet)} />
        <Kpi label="Pending Review" value={kpis.pending.toString()} tone="amber" />
        <Kpi label="Paid" value={kpis.paid.toString()} tone="emerald" />
      </section>

      {/* ── Filter pills ─────────────────────────────────────────────────── */}
      <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({myInvoices.length})
        </Chip>
        {STATUS_GROUPS.map((g) => {
          const c = myInvoices.filter((i) =>
            g.key === "paid"
              ? i.paymentOrder?.status === "cleared"
              : i.status === g.key,
          ).length;
          return (
            <Chip
              key={g.key}
              active={filter === g.key}
              onClick={() => setFilter(g.key)}
            >
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${g.tone}`} />
              {g.label} ({c})
            </Chip>
          );
        })}
      </section>

      {/* ── Invoice list ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No invoices to show
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {myInvoices.length === 0
              ? "You haven't submitted any invoices yet."
              : "No invoices match the selected filter."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/modules/invoice-bill")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Submit a new invoice →
          </button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">IFMIS No.</th>
                  <th className="px-4 py-3 text-left">Contract</th>
                  <th className="px-4 py-3 text-left">Agency</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Net Payable</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Payment Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => {
                  const statusCfg = getStatusCfg(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                        {inv.ifmisNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-xs font-semibold text-slate-900">
                          {inv.contractTitle}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {inv.contractId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{inv.agencyName}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900">
                        {fmtMoney(inv.grossAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-emerald-700">
                        {fmtMoney(inv.netPayable)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(inv.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusCfg.tone}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {inv.paymentOrder ? (
                          <div className="space-y-0.5">
                            <div className="font-mono font-semibold text-slate-900">
                              {inv.paymentOrder.paymentOrderId ?? "—"}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {inv.paymentOrder.status === "cleared"
                                ? `Paid ${new Date(
                                    inv.paymentOrder.generatedAt,
                                  ).toLocaleDateString()}`
                                : inv.paymentOrder.status}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not issued</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => navigate("/modules/invoice-bill")}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          Submit New Invoice →
        </button>
        <button
          type="button"
          onClick={() => navigate("/public/my-contracts")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          View My Contracts
        </button>
      </section>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function getStatusCfg(inv: any) {
  if (inv.paymentOrder?.status === "cleared")
    return { label: "Paid", tone: "bg-indigo-100 text-indigo-700" };
  if (inv.status === "approved")
    return { label: "Approved", tone: "bg-emerald-100 text-emerald-700" };
  if (inv.status === "rejected")
    return { label: "Rejected", tone: "bg-rose-100 text-rose-700" };
  if (inv.status === "on-hold")
    return { label: "On Hold", tone: "bg-amber-100 text-amber-800" };
  if (inv.status === "submitted")
    return { label: "Submitted", tone: "bg-sky-100 text-sky-700" };
  return { label: inv.status ?? "Pending", tone: "bg-slate-100 text-slate-700" };
}

function fmtMoney(n: number) {
  if (!n) return "Nu. 0";
  return `Nu. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "emerald";
}) {
  const border =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-sky-400 bg-sky-100 text-sky-800"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
