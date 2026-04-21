/* ═══════════════════════════════════════════════════════════════════════════
   SubmissionQueuePanel — Invoice Submission list-first view.
   Shows every invoice that has been pushed into SubmittedInvoiceContext by
   the 8-step Invoice Submission Flow, with search + status filter + paging
   so it scales to 100+ submissions/day. A prominent "+ New Invoice
   Submission" CTA opens the wizard.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import {
  useSubmittedInvoices,
  type ProcessingStatus,
  type SubmittedInvoice,
} from "../../../../shared/context/SubmittedInvoiceContext";

interface Props {
  onNewSubmission: () => void;
}

const STATUS_LABEL: Record<ProcessingStatus, string> = {
  submitted: "Submitted",
  approved: "Verified (Row 9)",
  rejected: "Rejected",
  "on-hold": "On Hold",
  "returned-for-bd": "Returned · BD",
  "bd-submitted": "BD Submitted",
  "bd-approved": "BD Approved",
  "bd-settled": "BD Settled",
  computed: "Computed (Row 15)",
  "approved-for-payment": "Approved for Payment",
  "payment-rejected": "Payment Rejected",
  "payment-on-hold": "Payment On Hold",
};

const STATUS_TONE: Record<ProcessingStatus, string> = {
  submitted: "bg-sky-50 text-sky-700 border-sky-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  "on-hold": "bg-amber-50 text-amber-700 border-amber-200",
  "returned-for-bd": "bg-violet-50 text-violet-700 border-violet-200",
  "bd-submitted": "bg-violet-50 text-violet-700 border-violet-200",
  "bd-approved": "bg-violet-50 text-violet-700 border-violet-200",
  "bd-settled": "bg-violet-50 text-violet-700 border-violet-200",
  computed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "approved-for-payment": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "payment-rejected": "bg-rose-50 text-rose-700 border-rose-200",
  "payment-on-hold": "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_FILTERS: Array<{ key: "all" | ProcessingStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Verified" },
  { key: "approved-for-payment", label: "Approved · Pay" },
  { key: "on-hold", label: "On Hold" },
  { key: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 25;

function fmtAmt(n: number, ccy: string) {
  try {
    return `${ccy} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  } catch {
    return `${ccy} ${n}`;
  }
}
function fmtDate(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SubmissionQueuePanel({ onNewSubmission }: Props) {
  const { invoices } = useSubmittedInvoices();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProcessingStatus>("all");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [page, setPage] = useState(1);

  /* Dropdown options derived live from the invoice list so new agencies /
     categories / channels show up automatically. */
  const filterOptions = useMemo(() => {
    const agencies = new Set<string>();
    const categories = new Set<string>();
    const channels = new Set<string>();
    for (const i of invoices) {
      if (i.agencyName) agencies.add(i.agencyName);
      if (i.category) categories.add(i.category);
      if (i.channel) channels.add(i.channel);
    }
    return {
      agencies: Array.from(agencies).sort(),
      categories: Array.from(categories).sort(),
      channels: Array.from(channels).sort(),
    };
  }, [invoices]);

  /* Apply filters + free-text search, then sort newest-first so the most
     recently submitted (or updated) invoice is always at the top. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = invoices.filter((inv: SubmittedInvoice) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (agencyFilter && inv.agencyName !== agencyFilter) return false;
      if (categoryFilter && inv.category !== categoryFilter) return false;
      if (channelFilter && inv.channel !== channelFilter) return false;
      if (!q) return true;
      return (
        inv.ifmisNumber?.toLowerCase().includes(q) ||
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.contractor?.toLowerCase().includes(q) ||
        inv.contractTitle?.toLowerCase().includes(q) ||
        inv.agencyName?.toLowerCase().includes(q)
      );
    });
    /* Newest first — use the latest history entry if available, otherwise
       the original submittedAt timestamp. This keeps recently-updated rows
       (e.g. just approved, just moved to computed) at the top of the list. */
    return [...matched].sort((a, b) => {
      const lastA = a.history?.length ? a.history[a.history.length - 1].at : a.submittedAt;
      const lastB = b.history?.length ? b.history[b.history.length - 1].at : b.submittedAt;
      return new Date(lastB || 0).getTime() - new Date(lastA || 0).getTime();
    });
  }, [invoices, query, statusFilter, agencyFilter, categoryFilter, channelFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: invoices.length };
    for (const i of invoices) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [invoices]);

  const activeExtraFilters =
    (agencyFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (channelFilter ? 1 : 0);

  const clearExtraFilters = () => {
    setAgencyFilter("");
    setCategoryFilter("");
    setChannelFilter("");
    setPage(1);
  };

  return (
    <section className="rounded-[24px] border border-sky-200 bg-gradient-to-br from-sky-50/40 via-white to-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-7">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
            Invoice Submission · PRN 3.1
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Submission Queue</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            All invoices that have completed the 8-step submission flow. Use the
            filters and search to narrow down — the queue is designed for
            100+ submissions per day. Click <strong>+ New Invoice Submission</strong>{" "}
            to open the intake wizard.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewSubmission}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-600 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          + New Invoice Submission
        </button>
      </header>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {f.label}
              <span
                className={`ml-2 rounded-full px-1.5 text-[10px] ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
        <div className="ml-auto min-w-[240px] flex-1 sm:max-w-sm">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search IFMIS # / invoice # / contractor / agency…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      {/* Extra relational filters — agency / category / channel */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Agency</span>
          <select
            value={agencyFilter}
            onChange={(e) => {
              setAgencyFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All agencies</option>
            {filterOptions.agencies.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[180px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-[200px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Channel</span>
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All channels</option>
            {filterOptions.channels.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </label>
        {activeExtraFilters > 0 && (
          <button
            type="button"
            onClick={clearExtraFilters}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            Clear ({activeExtraFilters})
          </button>
        )}
        <p className="ml-auto text-[11px] font-semibold text-slate-500">
          Sorted: <span className="text-slate-700">Newest first</span>
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3 text-left">SI</th>
                <th className="px-4 py-3 text-left">IFMIS #</th>
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th className="px-4 py-3 text-left">Contractor</th>
                <th className="px-4 py-3 text-left">Agency</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-right">Net Payable</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                    {invoices.length === 0
                      ? "No invoices have been submitted yet. Click + New Invoice Submission to start."
                      : "No invoices match your current filters."}
                  </td>
                </tr>
              ) : (
                pageRows.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    className="border-t border-slate-100 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">
                      {(pageSafe - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                      {inv.ifmisNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.invoiceNumber || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="truncate font-semibold">{inv.contractor || "—"}</div>
                      <div className="truncate text-[11px] text-slate-400">
                        {inv.contractTitle || inv.contractId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.agencyName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                        {inv.category || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {inv.channel || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {fmtAmt(inv.netPayable ?? 0, inv.currency || "BTN")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(inv.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          STATUS_TONE[inv.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-3 text-xs text-slate-600">
            <span>
              Showing <strong>{(pageSafe - 1) * PAGE_SIZE + 1}</strong>–
              <strong>{Math.min(pageSafe * PAGE_SIZE, filtered.length)}</strong> of{" "}
              <strong>{filtered.length}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-2 font-semibold">
                {pageSafe} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
