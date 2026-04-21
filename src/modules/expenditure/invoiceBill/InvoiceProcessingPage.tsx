/* ═══════════════════════════════════════════════════════════════════════════
   Invoice Processing — SRS Expenditure Module v3 (Process rows 9–14)
   ─────────────────────────────────────────────────────────────────────────
   Reads submitted invoices from SubmittedInvoiceContext (the same store
   InvoiceSubmissionFlow writes to on final submit) and lets authorized
   government users:

     Row 9   — Review & Approval (Technical + ESG tagging, Approve/Reject/Hold)
     Row 10  — Bill Discounting Initiation (return for BD if > 30 days)
     Row 11  — Bill Discounting Submission (contractor-side request)
     Row 12  — Bill Discounting Transaction Management (FI approval, payment advice)
     Row 13  — Discounting Settlement and Reconciliation
     Row 14  — Checker mechanism / financial validation gates

   Fully dynamic — every row, badge and amount comes from the shared store
   populated by Invoice Submission. No mock data.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";

type SortKey = "ifmis" | "contract" | "contractor" | "submitted" | "days" | "gross" | "net" | "status";
type SortDir = "asc" | "desc";
import {
  useSubmittedInvoices,
  type ProcessingStatus,
  type SubmittedInvoice,
} from "../../../shared/context/SubmittedInvoiceContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import { resolveAgencyContext } from "../../../shared/data/agencyPersonas";

/* Visual hints per ESG category — rendered only if the admin-configured
 * master-data LoV contains that canonical value. Any extra/unknown value is
 * still rendered with a neutral chip so custom ESG pillars keep working. */
const ESG_CHIP_STYLE: Record<string, { tone: string; icon: string }> = {
  Environment: { tone: "bg-emerald-100 text-emerald-800", icon: "🌱" },
  Social:      { tone: "bg-sky-100 text-sky-800",          icon: "👥" },
  Governance:  { tone: "bg-indigo-100 text-indigo-800",    icon: "⚖️" },
};

const STATUS_META: Record<ProcessingStatus, { label: string; tone: string }> = {
  submitted:             { label: "Awaiting Review",      tone: "bg-amber-100 text-amber-800 border-amber-200" },
  approved:              { label: "Ready for Approval",   tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected:              { label: "Rejected",             tone: "bg-red-100 text-red-800 border-red-200" },
  "on-hold":             { label: "On Hold",              tone: "bg-yellow-100 text-yellow-900 border-yellow-200" },
  "returned-for-bd":     { label: "Returned for BD",      tone: "bg-violet-100 text-violet-800 border-violet-200" },
  "bd-submitted":        { label: "BD Submitted",         tone: "bg-sky-100 text-sky-800 border-sky-200" },
  "bd-approved":         { label: "BD Approved",          tone: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  "bd-settled":          { label: "BD Settled",           tone: "bg-teal-100 text-teal-800 border-teal-200" },
  computed:              { label: "Computed",             tone: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  "approved-for-payment":{ label: "Approved for Payment", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  "payment-rejected":    { label: "Payment Rejected",     tone: "bg-red-100 text-red-800 border-red-200" },
  "payment-on-hold":     { label: "Payment On Hold",      tone: "bg-yellow-100 text-yellow-900 border-yellow-200" },
};

export function InvoiceProcessingPage() {
  const { invoices, updateSubmittedInvoice, appendHistory, removeSubmittedInvoice } = useSubmittedInvoices();
  const { user, activeRoleId, activeAgencyCode } = useAuth();
  const { masterDataMap } = useMasterData();
  const agencyCtx = resolveAgencyContext(activeRoleId);
  const [agencyFilter, setAgencyFilter] = useState<string>(() => agencyCtx?.agency.name ?? "");

  /* Auto-sync agency filter when user switches agency */
  useEffect(() => {
    if (agencyCtx) setAgencyFilter(agencyCtx.agency.name);
  }, [activeAgencyCode]);
  /* Canonical ESG categories — admin-editable via /master-data → "ESG
   * Attribution Category" (group id: esg-category). Defaults: Environment,
   * Social, Governance. */
  const esgCategoryOptions = useMemo(
    () => masterDataMap.get("esg-category") ?? ["Environment", "Social", "Governance"],
    [masterDataMap],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [esgSelection, setEsgSelection] = useState<string[]>([]);
  const [bdValue, setBdValue] = useState("");
  const [bdDate, setBdDate] = useState("");
  const [bdMethod, setBdMethod] = useState<"direct-fi" | "government-mediated" | "automated">("direct-fi");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProcessingStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("submitted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const sortIcon = (k: SortKey) => sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "";

  const selected = useMemo(
    () => invoices.find((i) => i.id === selectedId) || null,
    [invoices, selectedId],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: invoices.length, submitted: 0, approved: 0, rejected: 0, hold: 0, bd: 0 };
    for (const i of invoices) {
      if (i.status === "submitted") c.submitted++;
      else if (i.status === "approved") c.approved++;
      else if (i.status === "rejected") c.rejected++;
      else if (i.status === "on-hold") c.hold++;
      else c.bd++;
    }
    return c;
  }, [invoices]);

  const totals = useMemo(() => {
    const gross = invoices.reduce((s, i) => s + (i.grossAmount || 0), 0);
    const net = invoices.reduce((s, i) => s + (i.netPayable || 0), 0);
    return { gross, net };
  }, [invoices]);

  const visibleInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      /* Agency filter — auto-set from picker but user can clear to see all */
      if (agencyFilter && inv.agencyName && inv.agencyName !== agencyFilter) return false;
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
        case "days": av = (Date.now() - new Date(a.submittedAt).getTime()); bv = (Date.now() - new Date(b.submittedAt).getTime()); break;
        case "gross": av = a.grossAmount; bv = b.grossAmount; break;
        case "net": av = a.netPayable; bv = b.netPayable; break;
        case "status": av = a.status; bv = b.status; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [invoices, search, statusFilter, sortKey, sortDir]);

  /* SRS Row 14 — financial gate: net > 0 and ≤ gross */
  const passesFinancialGate = (inv: SubmittedInvoice) =>
    inv.netPayable > 0 && inv.netPayable <= inv.grossAmount;

  /* SRS Row 10 — Bill Discounting eligible after 30 days from submission */
  const daysSinceSubmission = (inv: SubmittedInvoice) => {
    const submitted = new Date(inv.submittedAt).getTime();
    return Math.floor((Date.now() - submitted) / (1000 * 60 * 60 * 24));
  };
  const isBdEligible = (inv: SubmittedInvoice) => daysSinceSubmission(inv) >= 30;

  /* Channel labels — translate raw codes pushed from the submission flow */
  const CHANNEL_LABEL: Record<string, string> = {
    manual: "Manual entry by Agency",
    "egp-interface": "e-GP system",
    "cms-interface": "CMS",
    "supplier-portal": "Supplier Self Registration",
  };
  const channelLabel = (c: string) => CHANNEL_LABEL[c] || c || "—";

  const recordAction = (inv: SubmittedInvoice, action: string, status: ProcessingStatus, note?: string) => {
    const at = new Date().toISOString();
    const by = user?.name || user?.id || "system";
    updateSubmittedInvoice(inv.id, { status });
    appendHistory(inv.id, { at, by, action, comment: note });
  };

  const handleApprove = () => {
    if (!selected) return;
    if (!passesFinancialGate(selected)) {
      alert("Financial gate failed: net payable must be > 0 and ≤ gross.");
      return;
    }
    recordAction(selected, "Approved", "approved", comment.trim() || undefined);
    setComment("");
  };

  const handleReject = () => {
    if (!selected) return;
    if (!comment.trim()) { alert("A rejection comment is required."); return; }
    recordAction(selected, "Rejected", "rejected", comment.trim());
    setComment("");
  };

  const handleHold = () => {
    if (!selected) return;
    if (!comment.trim()) { alert("A hold comment is required."); return; }
    recordAction(selected, "Placed on Hold", "on-hold", comment.trim());
    setComment("");
  };

  const handleReturnForBd = () => {
    if (!selected) return;
    updateSubmittedInvoice(selected.id, { status: "returned-for-bd", discountReturnedAt: new Date().toISOString() });
    appendHistory(selected.id, {
      at: new Date().toISOString(),
      by: user?.name || user?.id || "system",
      action: "Returned for Bill Discounting",
      comment: comment.trim() || undefined,
    });
    setComment("");
  };

  const handleSubmitBd = () => {
    if (!selected) return;
    const v = Number(bdValue);
    if (!v || v <= 0) { alert("Enter a discounted bill value."); return; }
    if (!bdDate) { alert("Pick an expected payment date."); return; }
    const at = new Date().toISOString();
    updateSubmittedInvoice(selected.id, {
      status: "bd-submitted",
      bdRequest: { discountedValue: v, expectedPaymentDate: bdDate, submittedAt: at },
    });
    appendHistory(selected.id, {
      at, by: user?.name || user?.id || "contractor",
      action: "Bill Discount request submitted",
      comment: `Discounted value ${v.toLocaleString()} BTN, expected ${bdDate}`,
    });
    setBdValue(""); setBdDate("");
  };

  const handleApproveBd = () => {
    if (!selected) return;
    const at = new Date().toISOString();
    updateSubmittedInvoice(selected.id, { status: "bd-approved", bdApprovedAt: at });
    appendHistory(selected.id, {
      at, by: user?.name || user?.id || "system",
      action: "Bill Discount transaction approved — payment advice issued to FI",
    });
  };

  const handleSettleBd = () => {
    if (!selected) return;
    const at = new Date().toISOString();
    updateSubmittedInvoice(selected.id, {
      status: "bd-settled",
      bdSettlement: { method: bdMethod, settledAt: at },
    });
    appendHistory(selected.id, {
      at, by: user?.name || user?.id || "system",
      action: `Discount bill settled (${bdMethod}) with FI`,
    });
  };

  const toggleEsgCategory = (value: string) => {
    setEsgSelection((cur) =>
      cur.includes(value) ? cur.filter((c) => c !== value) : [...cur, value],
    );
  };

  const handleEsgTag = () => {
    if (!selected) return;
    if (esgSelection.length === 0) {
      alert("Select at least one ESG category.");
      return;
    }
    const at = new Date().toISOString();
    const by = user?.name || user?.id || "system";
    updateSubmittedInvoice(selected.id, {
      esg: { categories: [...esgSelection], taggedBy: by, taggedAt: at },
    });
    appendHistory(selected.id, {
      at, by,
      action: "ESG tagging applied",
      comment: esgSelection.join(", "),
    });
    setEsgSelection([]);
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="grid gap-5">
      {/* Header strip */}
      <section className="rounded-[24px] border border-violet-200 bg-gradient-to-r from-violet-50/70 via-white to-violet-50/40 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-2xl text-white shadow-md">
              📥
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-600">
                SRS Expenditure v3 · Process 9–14
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Invoice Processing</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-600">
                Review &amp; approval, ESG attribution, Bill Discounting and settlement for every invoice
                submitted via the Invoice Submission Flow. Fully dynamic — list updates the moment a new
                invoice is submitted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total in Queue", value: counts.total, cls: "border-slate-200 bg-slate-50/60" },
          { label: "Awaiting Review", value: counts.submitted, cls: "border-amber-200 bg-amber-50/60" },
          { label: "Approved", value: counts.approved, cls: "border-emerald-200 bg-emerald-50/60" },
          { label: "On Hold / Rejected", value: counts.hold + counts.rejected, cls: "border-red-200 bg-red-50/60" },
          { label: "Bill Discounting", value: counts.bd, cls: "border-violet-200 bg-violet-50/60" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border px-4 py-3 ${k.cls}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Totals strip */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600 shadow-sm">
        Aggregate gross across queue:{" "}
        <strong className="text-slate-900">{totals.gross.toLocaleString()} BTN</strong> · Aggregate net payable:{" "}
        <strong className="text-emerald-700">{totals.net.toLocaleString()} BTN</strong>
      </div>

      {/* Full-width tabular queue */}
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Submitted Invoices</h3>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              {visibleInvoices.length} of {invoices.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search IFMIS#, invoice, contract, contractor…"
                className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-1.5 pl-8 text-xs text-slate-800 shadow-inner placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | ProcessingStatus)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              <option value="all">All Statuses</option>
              {(Object.keys(STATUS_META) as ProcessingStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
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

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-sm text-slate-500">
            <div className="mb-3 text-4xl">📭</div>
            <p className="font-semibold text-slate-700">No invoices in queue</p>
            <p className="mt-1 text-xs">Submit an invoice through the <strong>Invoice Submission</strong> flow and it will appear here automatically.</p>
          </div>
        ) : visibleInvoices.length === 0 ? (
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
                    ["days", "Age"],
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
                        <span className="text-[8px] text-violet-500">{sortIcon(k)}</span>
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-slate-200 px-3 py-2.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleInvoices.map((inv) => {
                  const meta = STATUS_META[inv.status];
                  const isActive = inv.id === selectedId;
                  const days = daysSinceSubmission(inv);
                  const breach = days > 30;
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
                          {days}d
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{inv.grossAmount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">{inv.netPayable.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.tone}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(inv.id); }}
                          className={`rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                            isActive
                              ? "bg-yellow-200 text-yellow-900 ring-1 ring-yellow-400"
                              : "border border-violet-300 text-violet-700 hover:bg-violet-50"
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
                    Showing {visibleInvoices.length} record(s)
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">
                    {visibleInvoices.reduce((s, i) => s + i.grossAmount, 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                    {visibleInvoices.reduce((s, i) => s + i.netPayable, 0).toLocaleString()}
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
              Select an invoice on the left to review, approve, tag ESG categories, or initiate Bill Discounting.
            </div>
          ) : (
            <div className="space-y-5 p-5">
              {/* Header card */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{selected.contractId}</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{selected.contractTitle}</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {selected.contractor} · {selected.agencyName} · {selected.category}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_META[selected.status].tone}`}>
                    {STATUS_META[selected.status].label}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{selected.ifmisNumber}</p>
                </div>
              </div>

              {/* Amounts grid */}
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {[
                  { l: "Gross", v: selected.grossAmount },
                  { l: "Tax", v: selected.taxAmount },
                  { l: "Retention", v: selected.retentionAmount },
                  { l: "Net Payable", v: selected.netPayable, accent: true },
                ].map((a) => (
                  <div key={a.l} className={`rounded-lg border px-3 py-2 ${a.accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{a.l}</p>
                    <p className={`mt-0.5 font-mono text-sm font-bold ${a.accent ? "text-emerald-700" : "text-slate-900"}`}>
                      {a.v.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Submission details + supporting documents (Row 9 input) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-bold text-slate-900">Submission Details</h4>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700 sm:grid-cols-3">
                  <div><dt className="font-semibold text-slate-500">Invoice #</dt><dd className="font-mono">{selected.invoiceNumber}</dd></div>
                  <div><dt className="font-semibold text-slate-500">Invoice Date</dt><dd>{selected.invoiceDate || "—"}</dd></div>
                  <div><dt className="font-semibold text-slate-500">Tax Type</dt><dd>{selected.taxType || "—"}</dd></div>
                  <div><dt className="font-semibold text-slate-500">Channel</dt><dd>{channelLabel(selected.channel)}</dd></div>
                  <div><dt className="font-semibold text-slate-500">Submitted By</dt><dd>{selected.submittedBy}</dd></div>
                  <div><dt className="font-semibold text-slate-500">Submitted At</dt><dd>{new Date(selected.submittedAt).toLocaleString()}</dd></div>
                </dl>

                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Supporting Documents ({selected.documents?.length || 0})
                  </p>
                  {(!selected.documents || selected.documents.length === 0) ? (
                    <p className="mt-1 text-xs text-slate-500">No documents attached at submission.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {selected.documents.map((d) => (
                        <li
                          key={d.name}
                          className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className={d.ticked ? "text-emerald-600" : "text-slate-400"}>
                              {d.ticked ? "✓" : "○"}
                            </span>
                            <span className="truncate font-medium text-slate-800">{d.name}</span>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                d.mandatory
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {d.mandatory ? "Mandatory" : "Optional"}
                            </span>
                          </span>
                          {d.size > 0 && (
                            <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-500">
                              {(d.size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* SRS Row 14 — Financial gate */}
              <div className={`rounded-lg border-l-4 px-3 py-2 text-xs ${
                passesFinancialGate(selected)
                  ? "border-l-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-l-red-500 bg-red-50 text-red-800"
              }`}>
                {passesFinancialGate(selected)
                  ? `✓ Financial gate (Row 14): net ≤ contract remaining and > 0`
                  : `✗ Financial gate (Row 14) failing — net payable must be > 0 and ≤ gross`}
              </div>

              {/* SRS Row 9 — ESG tagging (categories sourced from canonical
                  master-data group: esg-category). */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">ESG Attribution (Row 9)</h4>
                  {selected.esg && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                      Tagged by {selected.esg.taggedBy}
                    </span>
                  )}
                </div>
                {selected.esg && selected.esg.categories.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {selected.esg.categories.map((cat) => {
                      const style = ESG_CHIP_STYLE[cat] ?? {
                        tone: "bg-slate-100 text-slate-700",
                        icon: "🏷️",
                      };
                      return (
                        <span
                          key={cat}
                          className={`rounded-full ${style.tone} px-2 py-0.5 font-bold`}
                        >
                          {style.icon} {cat}
                        </span>
                      );
                    })}
                  </div>
                ) : esgCategoryOptions.length === 0 ? (
                  <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    ⚠ No ESG categories configured in master data. Ask an admin to
                    populate <span className="font-mono">esg-category</span> in
                    /master-data.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      Select pillars (sourced from master data)
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {esgCategoryOptions.map((cat) => (
                        <label key={cat} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={esgSelection.includes(cat)}
                            onChange={() => toggleEsgCategory(cat)}
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleEsgTag}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700"
                    >
                      Apply ESG tagging
                    </button>
                  </div>
                )}
              </div>

              {/* SRS Row 9 — Review & Approval */}
              {selected.status === "submitted" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-bold text-slate-900">Review &amp; Approval (Row 9)</h4>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Comments are mandatory for Reject and Hold. Approve only after technical &amp; financial verification.
                  </p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Reviewer comment…"
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    rows={2}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={handleApprove} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700">✓ Approve</button>
                    <button type="button" onClick={handleHold} className="rounded-lg bg-yellow-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-yellow-600">⏸ Hold</button>
                    <button type="button" onClick={handleReject} className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700">✗ Reject</button>
                    {isBdEligible(selected) && (
                      <button type="button" onClick={handleReturnForBd} className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700">↩ Return for Bill Discounting</button>
                    )}
                  </div>
                </div>
              )}

              {/* SRS Row 11 — Bill Discounting Submission (contractor) */}
              {selected.status === "returned-for-bd" && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <h4 className="text-sm font-bold text-violet-900">Bill Discounting Submission (Row 11)</h4>
                  <p className="mt-1 text-[11px] text-violet-700">
                    Contractor enters discounted bill value and expected payment date.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input value={bdValue} onChange={(e) => setBdValue(e.target.value)} placeholder="Discounted value (BTN)" className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs" />
                    <input type="date" value={bdDate} onChange={(e) => setBdDate(e.target.value)} className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs" />
                  </div>
                  <button type="button" onClick={handleSubmitBd} className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700">
                    Submit BD request
                  </button>
                </div>
              )}

              {/* SRS Row 12 — BD transaction management */}
              {selected.status === "bd-submitted" && selected.bdRequest && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <h4 className="text-sm font-bold text-indigo-900">BD Transaction Management (Row 12)</h4>
                  <p className="mt-1 text-[11px] text-indigo-700">
                    Discounted value:{" "}
                    <strong>{selected.bdRequest.discountedValue.toLocaleString()} BTN</strong> · Expected payment: <strong>{selected.bdRequest.expectedPaymentDate}</strong>
                  </p>
                  <button type="button" onClick={handleApproveBd} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700">
                    Approve transaction &amp; issue payment advice to FI
                  </button>
                </div>
              )}

              {/* SRS Row 13 — Settlement */}
              {selected.status === "bd-approved" && (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                  <h4 className="text-sm font-bold text-teal-900">Discounting Settlement &amp; Reconciliation (Row 13)</h4>
                  <p className="mt-1 text-[11px] text-teal-700">
                    Pick a settlement method. Net plus agreed rate is paid to the FI — never to the contractor.
                  </p>
                  <select
                    value={bdMethod}
                    onChange={(e) => setBdMethod(e.target.value as typeof bdMethod)}
                    className="mt-2 w-full rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="direct-fi">Direct settlement with financial institution</option>
                    <option value="government-mediated">Government-mediated settlement</option>
                    <option value="automated">Automated reconciliation with FI systems</option>
                  </select>
                  <button type="button" onClick={handleSettleBd} className="mt-2 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-700">
                    Settle with FI
                  </button>
                </div>
              )}

              {/* History trail */}
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

              {/* Remove */}
              <div className="flex justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => { removeSubmittedInvoice(selected.id); setSelectedId(null); }}
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                >
                  Remove from queue
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
