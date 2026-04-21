import { useState, useMemo, useEffect } from "react";
import { useContractData, type StoredContract } from "../../../shared/context/ContractDataContext";
/* Cross-process live link: keeps the Contractor column in sync with the
   Contractor Master module. If a contractor is renamed in Contractor
   Management the lifecycle table updates on the next render — no need
   to re-save each contract. */
import { useLiveContractorLookup } from "../../../shared/context/useLiveContractorName";
import type {
  TrackedMilestone,
  ContractAlert,
  ContractProgressSummary,
} from "./types";
import {
  panelClass,
  headerClass,
  adherenceColor,
  statusColor,
  fmt,
  todayISO,
  daysBetween,
  overlayKey,
  defaultOverlay,
  seedOverlayFromStatus,
  buildTrackedMilestone,
  buildContractSummary,
  buildAlerts,
  ContractIdentityStrip,
  ContractSnapshotPanel,
  type LifecycleOverlay,
  type Tab,
} from "./lifecycleFlow";
export function ContractLifecyclePage() {
  const { contracts } = useContractData();
  const resolveContractorName = useLiveContractorLookup();

  /* Only contracts that have milestones to track are useful here.
     We still show the others in a "no milestones" empty state if the user
     selects them. */
  const trackable = useMemo<StoredContract[]>(
    () => contracts.filter((c) => c.formData?.milestoneRows?.length > 0),
    [contracts],
  );
  const fallback = useMemo<StoredContract[]>(() => (trackable.length ? trackable : contracts), [trackable, contracts]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [overlay, setOverlay] = useState<Record<string, LifecycleOverlay>>({});
  const [acknowledged, setAcknowledged] = useState<Record<string, true>>({});

  /* ── Filter + pagination state for the contract selector table ──
     The Contract Lifecycle selector doubles as the "all contracts" table and
     must scale to thousands of rows, so we paginate client-side and expose a
     search + several relational filters bound to the live ContractData. */
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterClassification, setFilterClassification] = useState("");
  const [filterAgency, setFilterAgency] = useState("");
  const [filterFunding, setFilterFunding] = useState("");
  const [filterAdherence, setFilterAdherence] = useState("");
  const [filterWorkflow, setFilterWorkflow] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  /* Auto-select the first available contract whenever the list changes
     and the current selection has been removed. */
  useEffect(() => {
    if (fallback.length === 0) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!fallback.find((c) => c.id === selectedId)) setSelectedId(fallback[0].id);
  }, [fallback, selectedId]);

  const selectedContract = useMemo(
    () => fallback.find((c) => c.id === selectedId) ?? null,
    [fallback, selectedId],
  );

  /* Build derived data for the current selection */
  const milestones = useMemo<TrackedMilestone[]>(() => {
    if (!selectedContract) return [];
    return selectedContract.formData.milestoneRows.map((_r, idx) =>
      buildTrackedMilestone(selectedContract, idx, overlay),
    );
  }, [selectedContract, overlay]);

  const summary = useMemo<ContractProgressSummary | null>(
    () => (selectedContract ? buildContractSummary(selectedContract, milestones) : null),
    [selectedContract, milestones],
  );

  const alerts = useMemo<ContractAlert[]>(
    () => (selectedContract && summary ? buildAlerts(selectedContract, summary, milestones) : []),
    [selectedContract, summary, milestones],
  );

  /* Selector cards across the top — also dynamic. Each entry pairs the
     derived progress summary with the underlying StoredContract so the
     selector table can show relational fields (contractor, agency, funding
     source, currency, dates) without a second lookup per row. */
  const selectorRows = useMemo(() => {
    return fallback.map((c) => {
      const ms = c.formData.milestoneRows.map((_r, idx) => buildTrackedMilestone(c, idx, overlay));
      return { stored: c, summary: buildContractSummary(c, ms) };
    });
  }, [fallback, overlay]);

  /* Unique values for the dropdown filters — derived from the live contract
     set so admins see exactly the values currently present in the system. */
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const classifications = new Set<string>();
    const agencies = new Set<string>();
    const fundings = new Set<string>();
    const workflows = new Set<string>();
    for (const { stored } of selectorRows) {
      stored.contractCategory.forEach((cat) => cat && categories.add(cat));
      if (stored.contractClassification) classifications.add(stored.contractClassification);
      if (stored.agencyName) agencies.add(stored.agencyName);
      if (stored.fundingSource) fundings.add(stored.fundingSource);
      if (stored.workflowStatus) workflows.add(stored.workflowStatus);
    }
    return {
      categories: Array.from(categories).sort(),
      classifications: Array.from(classifications).sort(),
      agencies: Array.from(agencies).sort(),
      fundings: Array.from(fundings).sort(),
      workflows: Array.from(workflows).sort(),
    };
  }, [selectorRows]);

  /* Apply filters + free-text search */
  const filteredRows = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return selectorRows.filter(({ stored, summary }) => {
      if (filterCategory && !stored.contractCategory.includes(filterCategory)) return false;
      if (filterClassification && stored.contractClassification !== filterClassification) return false;
      if (filterAgency && stored.agencyName !== filterAgency) return false;
      if (filterFunding && stored.fundingSource !== filterFunding) return false;
      if (filterAdherence && summary.timelineAdherence !== filterAdherence) return false;
      if (filterWorkflow && stored.workflowStatus !== filterWorkflow) return false;
      if (q) {
        const liveContractorName = resolveContractorName(
          stored.contractorId,
          stored.contractorName,
        );
        const hay = [
          stored.contractId,
          stored.contractTitle,
          liveContractorName,
          stored.contractorId,
          stored.agencyName,
          stored.fundingSource,
          stored.contractValue,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [selectorRows, filterSearch, filterCategory, filterClassification, filterAgency, filterFunding, filterAdherence, filterWorkflow, resolveContractorName]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRows = useMemo(
    () => filteredRows.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize),
    [filteredRows, safePageIndex, pageSize],
  );

  /* Reset to page 0 whenever any filter changes so the user always sees the
     first matching results, not a stale empty page. */
  useEffect(() => {
    setPageIndex(0);
  }, [filterSearch, filterCategory, filterClassification, filterAgency, filterFunding, filterAdherence, filterWorkflow, pageSize]);

  const activeFilterCount =
    (filterSearch ? 1 : 0) +
    (filterCategory ? 1 : 0) +
    (filterClassification ? 1 : 0) +
    (filterAgency ? 1 : 0) +
    (filterFunding ? 1 : 0) +
    (filterAdherence ? 1 : 0) +
    (filterWorkflow ? 1 : 0);

  const clearFilters = () => {
    setFilterSearch("");
    setFilterCategory("");
    setFilterClassification("");
    setFilterAgency("");
    setFilterFunding("");
    setFilterAdherence("");
    setFilterWorkflow("");
  };

  /* Small helpers reused in the table body */
  const formatCurrency = (value: string, currency: string | undefined) => {
    const n = parseFloat((value || "").replace(/,/g, ""));
    if (!isFinite(n) || n === 0) return `${currency || "BTN"} —`;
    return `${currency || "BTN"} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  /* ── Workflow toggles (1.0 Automated Milestone Tracking + Deliverable
     Submission/Acceptance Workflow) ── */
  const patchOverlay = (mid: string, patch: Partial<LifecycleOverlay>) => {
    if (!selectedContract) return;
    const k = overlayKey(selectedContract.id, mid);
    setOverlay((prev) => {
      const cur = prev[k] ?? seedOverlayFromStatus(
        selectedContract.formData.milestoneRows.find((r) => (r.milestoneId || r.id) === mid)?.milestoneStatus || "",
      );
      return { ...prev, [k]: { ...cur, ...patch } };
    });
  };
  const acknowledgeAlert = (id: string) => setAcknowledged((p) => ({ ...p, [id]: true }));
  const openContractDetail = (id: string) => {
    setSelectedId(id);
    setActiveTab("dashboard");
    setIsDetailOpen(true);
  };
  const closeContractDetail = () => setIsDetailOpen(false);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "dashboard", label: "Progress Dashboard", icon: "📊" },
    { key: "details", label: "Contract Details", icon: "🧾" },
    { key: "milestones", label: "Milestone Tracking", icon: "🎯" },
    { key: "alerts", label: "Alerts & Notifications", icon: "🔔" },
  ];

  /* ─── empty state ─── */
  if (!selectedContract || !summary) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400">Expenditure</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Contract Lifecycle Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time milestone tracking, progress monitoring, and automated alerts (SRS LoP 2.2.4)
          </p>
        </div>
        <div className={panelClass}>
          <div className="px-8 py-16 text-center">
            <p className="text-2xl font-extrabold text-slate-300">📭</p>
            <p className="mt-2 text-lg font-bold text-slate-500">No contracts available</p>
            <p className="mt-1 text-sm text-slate-400">
              Create a contract in the Contract Creation page — it will appear here automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const unackedForContract = alerts.filter((a) => !acknowledged[a.id]).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ─── header ─── */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400">Expenditure</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Contract Lifecycle Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Real-time milestone tracking, progress monitoring, and automated alerts (SRS LoP 2.2.4)
        </p>
      </div>

      {/* ─── contract selector — filter bar + enriched table + pagination ─── */}
      <section className={panelClass}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">All Contracts</h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing {filteredRows.length === 0 ? 0 : safePageIndex * pageSize + 1}–
              {Math.min((safePageIndex + 1) * pageSize, filteredRows.length)} of {filteredRows.length}
              {activeFilterCount > 0 && ` (filtered from ${selectorRows.length})`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Clear filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4 md:grid-cols-4 lg:grid-cols-7">
          <label className="flex flex-col gap-1 md:col-span-2 lg:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Search</span>
            <input
              type="search"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Contract ID, title, contractor, agency…"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Classification</span>
            <select
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All</option>
              {filterOptions.classifications.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Agency</span>
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All agencies</option>
              {filterOptions.agencies.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Funding</span>
            <select
              value={filterFunding}
              onChange={(e) => setFilterFunding(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All sources</option>
              {filterOptions.fundings.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Timeline</span>
            <select
              value={filterAdherence}
              onChange={(e) => setFilterAdherence(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All</option>
              <option value="on-track">On track</option>
              <option value="at-risk">At risk</option>
              <option value="delayed">Delayed</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workflow</span>
            <select
              value={filterWorkflow}
              onChange={(e) => setFilterWorkflow(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All statuses</option>
              {filterOptions.workflows.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </label>
        </div>

        {/* ── Enriched table ── */}
        <div className="overflow-hidden border-t border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-[1600px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Contract ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Contractor</th>
                  <th className="px-4 py-3">Agency</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Funding</th>
                  <th className="px-4 py-3">Timeline</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-sm text-slate-400">
                      No contracts match the current filters.
                    </td>
                  </tr>
                )}
                {pagedRows.map(({ stored, summary }) => {
                  const active = stored.id === selectedId;
                  const currency = stored.formData.contractCurrencyId || "BTN";
                  return (
                    <tr key={stored.id} className={active ? "bg-amber-50/60" : "hover:bg-slate-50/70"}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{stored.contractId}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{stored.contractTitle}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{stored.contractClassification || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {resolveContractorName(stored.contractorId, stored.contractorName) || "—"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{stored.contractorId || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{stored.agencyName || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {stored.contractCategory.length === 0 && <span className="text-xs text-slate-400">—</span>}
                          {stored.contractCategory.map((cat) => (
                            <span key={cat} className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                        {formatCurrency(stored.contractValue, currency)}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        <p>{stored.startDate || "—"}</p>
                        <p className="text-slate-400">to {stored.endDate || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{stored.fundingSource || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${adherenceColor(summary.timelineAdherence)}`}>
                          {summary.timelineAdherence.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-sky-500"
                              style={{ width: `${summary.percentComplete}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700">{summary.percentComplete}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          {stored.workflowStatus || "draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                            active && isDetailOpen
                              ? "border-amber-200 bg-amber-100 text-amber-900"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => openContractDetail(stored.id)}
                        >
                          {active && isDetailOpen ? "Selected" : "Select"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination controls ── */}
        {filteredRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-xs">
            <p className="font-semibold text-slate-600">
              Page {safePageIndex + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex(0)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 disabled:opacity-40"
              >
                « First
              </button>
              <button
                type="button"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 disabled:opacity-40"
              >
                ‹ Prev
              </button>
              <button
                type="button"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 disabled:opacity-40"
              >
                Next ›
              </button>
              <button
                type="button"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => setPageIndex(totalPages - 1)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 disabled:opacity-40"
              >
                Last »
              </button>
            </div>
          </div>
        )}
      </section>

      {isDetailOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]">
          <div className="flex h-full w-full items-start justify-center overflow-y-auto p-3 sm:p-5 lg:p-8">
            <div className="relative my-auto flex min-h-0 w-full max-w-[1180px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Selected Contract</p>
                  <p className="truncate text-sm font-bold text-slate-700">{selectedContract.contractId}</p>
                </div>
                <button
                  type="button"
                  onClick={closeContractDetail}
                  aria-label="Close contract details"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              <div className="space-y-6">
                {/* ─── dynamic identity strip for the selected contract ─── */}
                <ContractIdentityStrip contract={selectedContract} />

                {/* ─── tabs ─── */}
                <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`min-w-0 flex-1 rounded-[20px] px-4 py-3 text-sm font-bold transition ${
                        activeTab === tab.key ? "bg-amber-100 text-amber-900 shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                      {tab.key === "alerts" && unackedForContract > 0 && (
                        <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs">
                          {unackedForContract}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ─── DASHBOARD TAB ─── */}
                {activeTab === "dashboard" && (
                  <div className="space-y-6">
          {/* summary table */}
          <section className={panelClass}>
            <div className="overflow-hidden rounded-[20px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-[640px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Contract Value</th>
                      <th className="px-4 py-3">Amount Paid</th>
                      <th className="px-4 py-3">Remaining</th>
                      <th className="px-4 py-3">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="px-4 py-4 text-xl font-extrabold text-slate-900">BTN {fmt(summary.contractValue)}</td>
                      <td className="px-4 py-4 text-xl font-extrabold text-slate-900">BTN {fmt(summary.amountPaid)}</td>
                      <td className="px-4 py-4 text-xl font-extrabold text-slate-900">BTN {fmt(summary.amountRemaining)}</td>
                      <td className="px-4 py-4 text-xl font-extrabold text-slate-900">{summary.percentComplete}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* progress bar */}
          <section className={panelClass}>
            <div className={headerClass}>
              <h2 className="text-xl font-extrabold text-slate-900">Contract Progress</h2>
              <p className="mt-1 text-xs text-slate-600">
                {summary.contractId} — {summary.startDate || "—"} to {summary.endDate || "—"}
              </p>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="relative h-8 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${summary.percentComplete}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                  {summary.percentComplete}% Complete
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { v: summary.milestonesTotal, l: "Total Milestones" },
                  { v: summary.milestonesCompleted, l: "Completed" },
                  { v: summary.milestonesPending, l: "Pending" },
                  { v: summary.milestonesOverdue, l: "Overdue" },
                ].map((b) => (
                  <div key={b.l} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                    <p className="text-2xl font-extrabold text-slate-800">{b.v}</p>
                    <p className="text-xs text-slate-500">{b.l}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-5 py-3">
                  <span className="text-sm font-bold text-slate-700">Timeline Adherence:</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${adherenceColor(summary.timelineAdherence)}`}>
                    {summary.timelineAdherence.replace("-", " ").toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-5 py-3">
                  <span className="text-sm font-bold text-slate-700">Payment Adherence:</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${adherenceColor(summary.paymentAdherence)}`}>
                    {summary.paymentAdherence.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* ESG framework + SLA compliance (SRS 3.2.2.4) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">ESG Score</p>
                    <p className="text-xs text-slate-500">Environment / Social / Governance composite</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-slate-900">{summary.esgScore}</span>
                    <span className="text-xs text-slate-500">/100</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">SLA Compliance</p>
                    <p className="text-xs text-slate-500">Delivery against contractual SLA deadlines</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-extrabold text-slate-700">
                    {summary.slaCompliancePercent}%
                  </span>
                </div>
              </div>
            </div>
          </section>
                  </div>
                )}

                {/* ─── DETAILS TAB — fully dynamic snapshot of every contract field ─── */}
                {activeTab === "details" && <ContractSnapshotPanel contract={selectedContract} />}

                {/* ─── MILESTONES TAB ─── */}
                {activeTab === "milestones" && (
                  <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-2xl text-white">🎯</div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Milestone Tracking</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Real-time progress monitoring against planned milestones with deliverable acceptance workflow
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-4">
            {milestones.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <p className="text-lg font-bold text-slate-400">This contract has no milestones defined</p>
              </div>
            )}
            {milestones.length > 0 && (
              <div className="overflow-hidden rounded-[20px] border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[1320px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Milestone</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Dates</th>
                        <th className="px-4 py-3">Amounts</th>
                        <th className="px-4 py-3">Progress</th>
                        <th className="px-4 py-3">Workflow</th>
                        <th className="px-4 py-3">ESG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {milestones.map((m) => (
                        <tr key={m.milestoneId} className="align-top hover:bg-slate-50/70">
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white">
                                {m.milestoneNumber}
                              </span>
                              <div>
                                <p className="font-bold text-slate-800">{m.milestoneName}</p>
                                {m.slaBreached && (
                                  <span className="mt-2 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                                    SLA BREACHED
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor(m.status)}`}>
                              {m.status.replace("-", " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600">
                            <div className="space-y-1">
                              <p>Planned: {m.plannedDate || "—"}</p>
                              <p>Actual: {m.actualDate || "—"}</p>
                              <p className={m.slaBreached ? "font-bold text-rose-600" : ""}>SLA: {m.slaDeadline || "—"}</p>
                              {m.daysOverdue > 0 && <p className="font-bold text-rose-600">{m.daysOverdue}d overdue</p>}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600">
                            <div className="space-y-1">
                              <p>Gross: BTN {fmt(m.grossAmount)}</p>
                              <p>Net: BTN {fmt(m.netAmount)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="min-w-[220px] space-y-3">
                              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-sky-500 transition-all duration-500"
                                  style={{ width: `${m.completionPercent}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={m.completionPercent}
                                  onChange={(e) =>
                                    patchOverlay(m.milestoneId, {
                                      completionPercent: parseInt(e.target.value, 10),
                                      actualDate:
                                        parseInt(e.target.value, 10) === 100 && !m.actualDate ? todayISO() : m.actualDate,
                                    })
                                  }
                                  className="flex-1 accent-sky-500"
                                  disabled={m.paymentReleased}
                                />
                                <span className="w-10 text-right text-xs font-bold text-slate-700">{m.completionPercent}%</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex max-w-[320px] flex-wrap gap-2">
                              {[
                                {
                                  label: "Deliverable Submitted",
                                  done: m.deliverableSubmitted,
                                  onClick: () => patchOverlay(m.milestoneId, { deliverableSubmitted: !m.deliverableSubmitted }),
                                },
                                {
                                  label: "Deliverable Accepted",
                                  done: m.deliverableAccepted,
                                  onClick: () =>
                                    patchOverlay(m.milestoneId, {
                                      deliverableAccepted: !m.deliverableAccepted,
                                      deliverableSubmitted: !m.deliverableAccepted ? true : m.deliverableSubmitted,
                                      completionPercent: !m.deliverableAccepted ? 100 : m.completionPercent,
                                      actualDate: !m.deliverableAccepted && !m.actualDate ? todayISO() : m.actualDate,
                                    }),
                                },
                                {
                                  label: "Invoice Submitted",
                                  done: m.invoiceSubmitted,
                                  onClick: () => patchOverlay(m.milestoneId, { invoiceSubmitted: !m.invoiceSubmitted }),
                                },
                                {
                                  label: "Payment Released",
                                  done: m.paymentReleased,
                                  onClick: () =>
                                    patchOverlay(m.milestoneId, {
                                      paymentReleased: !m.paymentReleased,
                                      invoiceSubmitted: !m.paymentReleased ? true : m.invoiceSubmitted,
                                      deliverableAccepted: !m.paymentReleased ? true : m.deliverableAccepted,
                                      deliverableSubmitted: !m.paymentReleased ? true : m.deliverableSubmitted,
                                      completionPercent: !m.paymentReleased ? 100 : m.completionPercent,
                                    }),
                                },
                              ].map((step) => (
                                <button
                                  type="button"
                                  key={step.label}
                                  onClick={step.onClick}
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                                    step.done
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {step.done ? "✅" : "⬜"} {step.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              {[
                                { k: "esgEnvironmentTag" as const, label: "Environment", v: m.esgEnvironmentTag },
                                { k: "esgSocialTag" as const, label: "Social", v: m.esgSocialTag },
                                { k: "esgGovernanceTag" as const, label: "Governance", v: m.esgGovernanceTag },
                              ].map((t) => (
                                <button
                                  type="button"
                                  key={t.k}
                                  onClick={() => patchOverlay(m.milestoneId, { [t.k]: !t.v } as Partial<LifecycleOverlay>)}
                                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                                    t.v ? "bg-sky-100 text-sky-700 hover:bg-sky-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {t.v ? "✓" : "○"} {t.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
                  </section>
                )}

                {/* ─── ALERTS TAB ─── */}
                {activeTab === "alerts" && (
                  <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-2xl text-white">🔔</div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Alerts & Notifications</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upcoming milestone reminders, overdue alerts, payment eligibility, expiry, SLA breach & ESG flags
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-3">
            {alerts.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <p className="text-lg font-bold text-slate-400">No alerts for this contract</p>
              </div>
            )}
            {alerts.map((alert) => {
              const ack = !!acknowledged[alert.id];
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-4 rounded-2xl border px-5 py-4 ${
                    alert.severity === "critical"
                      ? "border-rose-200 bg-rose-50"
                      : alert.severity === "warning"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  } ${ack ? "opacity-60" : ""}`}
                >
                  <span className="text-2xl">
                    {alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{alert.title}</p>
                      <span className="text-xs text-slate-400">{alert.createdAt}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{alert.message}</p>
                  </div>
                  {!ack && (
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              );
            })}

            {/* alert summary */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-bold text-slate-700">Alert Types (SRS LoP 2.2.4 → 3.0)</p>
              <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                <p>1. Upcoming milestone due-date reminders</p>
                <p>2. Overdue milestone alerts to contract managers</p>
                <p>3. Payment eligibility notifications upon milestone completion</p>
                <p>4. Contract expiry notifications</p>
                <p>5. Budget threshold warnings</p>
                <p>6. SLA breach alerts — escalate to Head of Agency</p>
                <p>7. ESG framework compliance flags (SRS 3.2.2.4)</p>
              </div>
            </div>
          </div>
                  </section>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
