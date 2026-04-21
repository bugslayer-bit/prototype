/* ═══════════════════════════════════════════════════════════════════════════
   Invoice Approval — SRS Expenditure Module v3 (Process rows 15–16)
   ─────────────────────────────────────────────────────────────────────────
   Reads invoices that completed Invoice Processing (status = "approved")
   from SubmittedInvoiceContext and runs:

     Row 15  — Semi-Automated computation for payables
                 • auto-shows tax / retention / advance recovery
                 • lets reviewer add LD/penalty/audit-recovery (AIN) lines
                 • re-computes net = gross − tax − retention − advance − other
                 • persists computation timestamp + actor

     Row 16  — Approval for Payment
                 • runs system checks: MCP allocation, budget, commitment,
                   vendor active, vendor bank active
                 • Approve / Reject / Hold (comment required for reject/hold)
                 • final status: approved-for-payment | payment-rejected | payment-on-hold
                 • computes processing duration vs SLA, flags breaches

   100% dynamic — every row, badge and number reads from the live store
   populated by Invoice Submission and Invoice Processing.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";

type SortKey = "ifmis" | "contract" | "contractor" | "submitted" | "age" | "gross" | "net" | "status";
type SortDir = "asc" | "desc";
import {
  useSubmittedInvoices,
  type AdditionalDeduction,
  type ProcessingStatus,
  type SubmittedInvoice,
  type SystemChecks,
} from "../../../shared/context/SubmittedInvoiceContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../shared/data/agencyPersonas";

/* SLA in days from submission to payment-decision (Row 16 KPI gate) */
const SLA_DAYS = 30;

const STATUS_TONE: Record<ProcessingStatus, string> = {
  submitted:             "bg-slate-100 text-slate-700 border-slate-200",
  approved:              "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected:              "bg-red-100 text-red-800 border-red-200",
  "on-hold":             "bg-yellow-100 text-yellow-900 border-yellow-200",
  "returned-for-bd":     "bg-violet-100 text-violet-800 border-violet-200",
  "bd-submitted":        "bg-sky-100 text-sky-800 border-sky-200",
  "bd-approved":         "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bd-settled":          "bg-teal-100 text-teal-800 border-teal-200",
  computed:              "bg-cyan-100 text-cyan-800 border-cyan-200",
  "approved-for-payment":"bg-emerald-100 text-emerald-800 border-emerald-200",
  "payment-rejected":    "bg-red-100 text-red-800 border-red-200",
  "payment-on-hold":     "bg-yellow-100 text-yellow-900 border-yellow-200",
};

const STATUS_LABEL: Record<ProcessingStatus, string> = {
  submitted: "Awaiting Review",
  approved: "Ready for Approval",
  rejected: "Rejected",
  "on-hold": "On Hold",
  "returned-for-bd": "Returned for BD",
  "bd-submitted": "BD Submitted",
  "bd-approved": "BD Approved",
  "bd-settled": "BD Settled",
  computed: "Computed",
  "approved-for-payment": "Approved for Payment",
  "payment-rejected": "Payment Rejected",
  "payment-on-hold": "Payment On Hold",
};

/* Statuses that the Approval queue should show */
const APPROVAL_STATUSES: ProcessingStatus[] = [
  "approved",
  "computed",
  "approved-for-payment",
  "payment-rejected",
  "payment-on-hold",
];

export function InvoiceApprovalPage() {
  const { invoices, updateSubmittedInvoice, appendHistory } = useSubmittedInvoices();
  const { user, activeRoleId, activeAgencyCode } = useAuth();
  const agencyCtx = resolveAgencyContext(activeRoleId);

  const queue = useMemo(() => {
    const base = invoices.filter((i) => APPROVAL_STATUSES.includes(i.status));
    /* Auto-filter by active agency to show only that agency's invoices */
    if (agencyCtx) {
      const name = agencyCtx.agency.name;
      const agencyFiltered = base.filter((i) => !i.agencyName || i.agencyName === name);
      return agencyFiltered.length > 0 ? agencyFiltered : base;
    }
    return base;
  }, [invoices, activeAgencyCode]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Auto-select the first eligible invoice when the queue changes */
  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.find((i) => i.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);

  const selected = useMemo(
    () => queue.find((i) => i.id === selectedId) || null,
    [queue, selectedId],
  );

  /* Row 15 — additional deductions input state (one form per render) */
  const [adType, setAdType] = useState<AdditionalDeduction["type"]>("LD / Penalty");
  const [adAmount, setAdAmount] = useState("");
  const [adReason, setAdReason] = useState("");
  const [adAin, setAdAin] = useState("");

  /* Row 16 — comment for decision */
  const [comment, setComment] = useState("");

  /* Table controls */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProcessingStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("submitted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const sortIcon = (k: SortKey) => sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "";

  const visibleQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = queue.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return [
        inv.ifmisNumber, inv.invoiceNumber, inv.contractId, inv.contractTitle,
        inv.contractor, inv.agencyName, inv.category,
      ].filter(Boolean).some((v) => v!.toString().toLowerCase().includes(q));
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av: string | number = "", bv: string | number = "";
      switch (sortKey) {
        case "ifmis": av = a.ifmisNumber; bv = b.ifmisNumber; break;
        case "contract": av = a.contractTitle; bv = b.contractTitle; break;
        case "contractor": av = a.contractor; bv = b.contractor; break;
        case "submitted": av = new Date(a.submittedAt).getTime(); bv = new Date(b.submittedAt).getTime(); break;
        case "age": av = (Date.now() - new Date(a.submittedAt).getTime()); bv = (Date.now() - new Date(b.submittedAt).getTime()); break;
        case "gross": av = a.grossAmount; bv = b.grossAmount; break;
        case "net": av = a.netPayable; bv = b.netPayable; break;
        case "status": av = a.status; bv = b.status; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [queue, search, statusFilter, sortKey, sortDir]);

  const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  /* Computed numbers (Row 15) ---------------------------------------- */
  const additionalTotal = useMemo(() => {
    if (!selected?.additionalDeductions) return 0;
    return selected.additionalDeductions.reduce((s, d) => s + (d.amount || 0), 0);
  }, [selected]);

  const computedNet = useMemo(() => {
    if (!selected) return 0;
    return Math.max(
      0,
      selected.grossAmount - selected.taxAmount - selected.retentionAmount - selected.deductionAmount - additionalTotal,
    );
  }, [selected, additionalTotal]);

  /* Default system checks — vendor + bank seeded as active, agency hard-checks left to confirm */
  const seededChecks = (s: SubmittedInvoice): SystemChecks =>
    s.systemChecks ?? {
      mcpAllocation: false,
      budgetAvailable: false,
      commitmentAvailable: false,
      vendorActive: true,
      vendorBankActive: true,
    };

  /* SLA / breach (Row 16) ---------------------------------------------- */
  const slaInfo = useMemo(() => {
    if (!selected) return null;
    const submitted = new Date(selected.submittedAt).getTime();
    const target = submitted + SLA_DAYS * 24 * 60 * 60 * 1000;
    const decision = selected.paymentDecisionAt ? new Date(selected.paymentDecisionAt).getTime() : Date.now();
    const elapsedDays = Math.floor((decision - submitted) / (1000 * 60 * 60 * 24));
    const breach = decision > target;
    return { elapsedDays, breach };
  }, [selected]);

  /* ── Row 15 actions ─────────────────────────────────────────────── */
  const handleAddDeduction = () => {
    if (!selected) return;
    const v = Number(adAmount);
    if (!v || v <= 0) { alert("Amount must be > 0."); return; }
    if (!adReason.trim()) { alert("A reason is required."); return; }
    if (adType === "Audit Recovery (AIN)" && !adAin.trim()) {
      alert("AIN is required for Audit Recovery (Row 15)."); return;
    }
    const next: AdditionalDeduction = {
      id: `ad-${Date.now()}`,
      type: adType,
      amount: v,
      reason: adReason.trim(),
      ain: adType === "Audit Recovery (AIN)" ? adAin.trim() : undefined,
    };
    const list = [...(selected.additionalDeductions || []), next];
    updateSubmittedInvoice(selected.id, { additionalDeductions: list });
    appendHistory(selected.id, {
      at: new Date().toISOString(),
      by: user?.name || user?.id || "system",
      action: `Additional deduction added (${next.type})`,
      comment: `${next.amount.toLocaleString()} BTN — ${next.reason}${next.ain ? ` (AIN ${next.ain})` : ""}`,
    });
    setAdAmount(""); setAdReason(""); setAdAin("");
  };

  const handleRemoveDeduction = (id: string) => {
    if (!selected) return;
    const list = (selected.additionalDeductions || []).filter((d) => d.id !== id);
    updateSubmittedInvoice(selected.id, { additionalDeductions: list });
  };

  const handleFinaliseComputation = () => {
    if (!selected) return;
    const at = new Date().toISOString();
    const by = user?.name || user?.id || "system";
    updateSubmittedInvoice(selected.id, {
      status: "computed",
      netPayable: computedNet,
      computedAt: at,
      computedBy: by,
    });
    appendHistory(selected.id, {
      at, by,
      action: "Semi-automated computation finalised (Row 15)",
      comment: `Net payable = ${computedNet.toLocaleString()} BTN (gross ${selected.grossAmount.toLocaleString()} − tax ${selected.taxAmount.toLocaleString()} − retention ${selected.retentionAmount.toLocaleString()} − advance ${selected.deductionAmount.toLocaleString()} − other ${additionalTotal.toLocaleString()})`,
    });
  };

  /* ── Row 16 actions ─────────────────────────────────────────────── */
  const toggleCheck = (key: keyof SystemChecks) => {
    if (!selected) return;
    const cur = seededChecks(selected);
    const next: SystemChecks = { ...cur, [key]: !cur[key] };
    updateSubmittedInvoice(selected.id, { systemChecks: next });
  };

  const allChecksPassed = (s: SubmittedInvoice) => {
    const c = seededChecks(s);
    return c.mcpAllocation && c.budgetAvailable && c.commitmentAvailable && c.vendorActive && c.vendorBankActive;
  };

  const decide = (status: ProcessingStatus, action: string) => {
    if (!selected) return;
    if ((status === "payment-rejected" || status === "payment-on-hold") && !comment.trim()) {
      alert("Comment is required for Reject / Hold.");
      return;
    }
    if (status === "approved-for-payment" && !allChecksPassed(selected)) {
      alert("All five system checks must pass before approval.");
      return;
    }
    const at = new Date().toISOString();
    const by = user?.name || user?.id || "system";
    updateSubmittedInvoice(selected.id, {
      status,
      paymentDecisionAt: at,
      paymentDecisionBy: by,
    });
    appendHistory(selected.id, { at, by, action, comment: comment.trim() || undefined });
    setComment("");
  };

  /* KPIs */
  const kpis = useMemo(() => {
    return {
      eligible: queue.filter((i) => i.status === "approved").length,
      computed: queue.filter((i) => i.status === "computed").length,
      paid: queue.filter((i) => i.status === "approved-for-payment").length,
      heldOrRej: queue.filter((i) => i.status === "payment-rejected" || i.status === "payment-on-hold").length,
      total: queue.length,
    };
  }, [queue]);

  return (
    <div className="grid gap-5">
      {/* Header strip */}
      <section className="rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-2xl text-white shadow-md">
              💳
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600">
                SRS Expenditure v3 · Process 15–16
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Invoice Approval</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-600">
                Semi-automated computation of payables (taxes, retention, advance recovery, additional deductions)
                followed by formal Approval for Payment with MCP, budget, commitment and vendor checks. Live queue —
                invoices marked <strong>Ready for Approval</strong> in Invoice Processing flow here automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "In Queue", value: kpis.total, cls: "border-slate-200 bg-slate-50/60" },
          { label: "Awaiting Computation", value: kpis.eligible, cls: "border-amber-200 bg-amber-50/60" },
          { label: "Computed", value: kpis.computed, cls: "border-cyan-200 bg-cyan-50/60" },
          { label: "Approved for Payment", value: kpis.paid, cls: "border-emerald-200 bg-emerald-50/60" },
          { label: "Held / Rejected", value: kpis.heldOrRej, cls: "border-red-200 bg-red-50/60" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border px-4 py-3 ${k.cls}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Full-width tabular queue */}
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-amber-50/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Approval Queue</h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              {visibleQueue.length} of {queue.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search IFMIS#, invoice, contract, contractor…"
                className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-1.5 pl-8 text-xs text-slate-800 shadow-inner placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | ProcessingStatus)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            >
              <option value="all">All Statuses</option>
              {APPROVAL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            {(search || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-sm text-slate-500">
            <div className="mb-3 text-4xl">📭</div>
            <p className="font-semibold text-slate-700">No invoices ready for approval</p>
            <p className="mt-1 text-xs">Approve an invoice in <strong>Invoice Processing</strong> and it will appear here automatically.</p>
          </div>
        ) : visibleQueue.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">No invoices match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600">
                <tr>
                  {([
                    ["ifmis", "IFMIS #"],
                    ["contract", "Contract"],
                    ["contractor", "Contractor"],
                    ["submitted", "Submitted"],
                    ["age", "SLA Age"],
                    ["gross", "Gross (BTN)"],
                    ["net", "Net Payable"],
                    ["status", "Status"],
                  ] as [SortKey, string][]).map(([k, label]) => (
                    <th
                      key={k}
                      onClick={() => toggleSort(k)}
                      className={`cursor-pointer select-none border-b border-slate-200 px-3 py-2.5 text-left font-bold hover:bg-slate-100 ${
                        ["gross", "net"].includes(k) ? "text-right" : ""
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <span className="text-[8px] text-amber-600">{sortIcon(k)}</span>
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 px-3 py-2.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleQueue.map((inv) => {
                  const isActive = inv.id === selectedId;
                  const days = daysSince(inv.submittedAt);
                  const breach = days > SLA_DAYS;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedId(inv.id)}
                      className={`cursor-pointer transition ${
                        isActive ? "bg-yellow-100 ring-1 ring-yellow-300" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="font-mono text-[11px] font-bold text-slate-900">{inv.ifmisNumber}</div>
                        <div className="font-mono text-[10px] text-slate-500">{inv.invoiceNumber}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800">{inv.contractTitle}</div>
                        <div className="text-[10px] text-slate-500">{inv.contractId} · {inv.category}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{inv.contractor}</div>
                        <div className="text-[10px] text-slate-500">{inv.agencyName}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(inv.submittedAt).toLocaleDateString()}
                        <div className="text-[10px] text-slate-500">{new Date(inv.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          breach ? "bg-red-100 text-red-700" : days > 20 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {days}d {breach && "⚠"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{inv.grossAmount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">{inv.netPayable.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_TONE[inv.status]}`}>
                          {STATUS_LABEL[inv.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(inv.id); }}
                          className={`rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                            isActive
                              ? "bg-yellow-200 text-yellow-900 ring-1 ring-yellow-400"
                              : "border border-amber-300 text-amber-700 hover:bg-amber-50"
                          }`}
                        >
                          {isActive ? "Selected" : "Open"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 text-[11px]">
                <tr>
                  <td colSpan={5} className="px-3 py-2.5 font-bold text-slate-600">
                    Showing {visibleQueue.length} record(s)
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">
                    {visibleQueue.reduce((s, i) => s + i.grossAmount, 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                    {visibleQueue.reduce((s, i) => s + i.netPayable, 0).toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Detail panel */}
      <div>
        <section className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
          {!selected ? (
            <div className="flex h-full min-h-[260px] items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
              Select an invoice on the left to compute payables and approve for payment.
            </div>
          ) : (
            <div className="space-y-5 p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{selected.contractId}</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{selected.contractTitle}</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {selected.contractor} · {selected.agencyName} · {selected.category}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_TONE[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{selected.ifmisNumber}</p>
                </div>
              </div>

              {/* ─── Row 15 — Semi-Automated Computation ─── */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Semi-Automated Computation (Row 15)</h4>
                  {selected.computedAt && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                      Computed by {selected.computedBy} · {new Date(selected.computedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Auto rows */}
                <div className="mt-3 grid gap-2 text-xs">
                  {[
                    { l: "Gross amount (auto from invoice)", v: selected.grossAmount, sign: "+" },
                    { l: "Tax / withholding (auto from contract rules)", v: selected.taxAmount, sign: "−" },
                    { l: "Retention (auto, conditional on contract %)", v: selected.retentionAmount, sign: "−" },
                    { l: "Advance recovery (auto, conditional on outstanding advance)", v: selected.deductionAmount, sign: "−" },
                  ].map((r) => (
                    <div key={r.l} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                      <span className="text-slate-700">{r.l}</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {r.sign} {r.v.toLocaleString()} BTN
                      </span>
                    </div>
                  ))}
                </div>

                {/* Additional deductions list */}
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Additional deductions (LD / penalty / audit recovery / other)</p>
                  {(selected.additionalDeductions || []).length === 0 ? (
                    <p className="mt-1 text-[11px] italic text-slate-500">None captured.</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-xs">
                      {selected.additionalDeductions!.map((d) => (
                        <li key={d.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                          <div>
                            <span className="font-semibold text-slate-800">{d.type}</span>
                            <span className="ml-2 text-slate-600">— {d.reason}</span>
                            {d.ain && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">AIN {d.ain}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900">− {d.amount.toLocaleString()} BTN</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDeduction(d.id)}
                              className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50"
                              disabled={selected.status !== "approved"}
                              title={selected.status !== "approved" ? "Already finalised" : "Remove"}
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {selected.status === "approved" && (
                    <div className="mt-2 grid gap-2 rounded-lg border border-amber-200 bg-white p-2 sm:grid-cols-[1fr_120px_auto]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          value={adType}
                          onChange={(e) => setAdType(e.target.value as AdditionalDeduction["type"])}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px]"
                        >
                          <option>LD / Penalty</option>
                          <option>Audit Recovery (AIN)</option>
                          <option>Other</option>
                        </select>
                        <input
                          value={adReason}
                          onChange={(e) => setAdReason(e.target.value)}
                          placeholder="Reason"
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px]"
                        />
                        {adType === "Audit Recovery (AIN)" && (
                          <input
                            value={adAin}
                            onChange={(e) => setAdAin(e.target.value)}
                            placeholder="AIN (from ARMS)"
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] sm:col-span-2"
                          />
                        )}
                      </div>
                      <input
                        value={adAmount}
                        onChange={(e) => setAdAmount(e.target.value)}
                        placeholder="Amount"
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={handleAddDeduction}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Net payable line */}
                <div className="mt-3 flex items-center justify-between rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Net payable = Gross − Tax − Retention − Advance − Other
                  </span>
                  <span className="font-mono text-base font-bold text-emerald-700">
                    {(selected.status === "approved" ? computedNet : selected.netPayable).toLocaleString()} BTN
                  </span>
                </div>

                {selected.status === "approved" && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleFinaliseComputation}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700"
                    >
                      ✓ Finalise computation
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Row 16 — Approval for Payment ─── */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <h4 className="text-sm font-bold text-slate-900">Approval for Payment (Row 16)</h4>

                {/* System checks */}
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">System checks</p>
                <div className="mt-1 grid gap-1.5 text-xs">
                  {(
                    [
                      ["mcpAllocation", "MCP allocation verified"],
                      ["budgetAvailable", "Budget availability confirmed"],
                      ["commitmentAvailable", "Commitment availability confirmed"],
                      ["vendorActive", "Vendor status: Active"],
                      ["vendorBankActive", "Vendor bank account: Active"],
                    ] as Array<[keyof SystemChecks, string]>
                  ).map(([k, label]) => {
                    const checks = seededChecks(selected);
                    const on = checks[k];
                    const locked = selected.status !== "computed";
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={locked}
                        onClick={() => toggleCheck(k)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                          on
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 bg-white text-slate-700"
                        } ${locked ? "cursor-not-allowed opacity-70" : "hover:bg-emerald-100"}`}
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-base">{on ? "✓" : "○"}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SLA / breach indicator */}
                {slaInfo && (
                  <div
                    className={`mt-3 rounded-lg border-l-4 px-3 py-2 text-[11px] ${
                      slaInfo.breach
                        ? "border-l-red-500 bg-red-50 text-red-800"
                        : "border-l-emerald-500 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {slaInfo.breach
                      ? `⚠ KPI breach — ${slaInfo.elapsedDays} day(s) since submission (SLA ${SLA_DAYS} days). Escalation will be sent.`
                      : `✓ Within SLA — ${slaInfo.elapsedDays} day(s) of ${SLA_DAYS}-day window`}
                  </div>
                )}

                {/* Decision controls */}
                {selected.status === "computed" && (
                  <>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Decision comment (mandatory for Reject / Hold)…"
                      rows={2}
                      className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => decide("approved-for-payment", "Approved for Payment (Row 16)")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        ✓ Approve for Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => decide("payment-on-hold", "Payment placed on Hold (Row 16)")}
                        className="rounded-lg bg-yellow-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-yellow-600"
                      >
                        ⏸ Hold
                      </button>
                      <button
                        type="button"
                        onClick={() => decide("payment-rejected", "Payment Rejected (Row 16)")}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </>
                )}

                {selected.status === "approved-for-payment" && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-800">
                    ✓ Approved for Payment / Awaiting Payment — contractor &amp; agency notified by SMS / Email.
                  </div>
                )}
                {selected.status === "payment-rejected" && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-800">
                    ✗ Payment rejected. Contractor &amp; agency notified.
                  </div>
                )}
                {selected.status === "payment-on-hold" && (
                  <div className="mt-3 rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs text-yellow-800">
                    ⏸ Payment on hold pending information.
                  </div>
                )}
              </div>

              {/* Audit trail */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Audit Trail</h4>
                {selected.history.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">No history yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-[11px]">
                    {selected.history.map((h, idx) => (
                      <li key={idx} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                        <span className="mt-0.5 text-slate-400">•</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800">{h.action}</span>
                            <span className="text-[10px] text-slate-500">{new Date(h.at).toLocaleString()}</span>
                          </div>
                          <div className="text-slate-600">by {h.by}{h.comment ? ` — ${h.comment}` : ""}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
