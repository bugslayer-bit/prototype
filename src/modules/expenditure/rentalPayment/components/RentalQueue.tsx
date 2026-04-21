/* ═══════════════════════════════════════════════════════════════════════════
   RentalQueue — list view with role-specific KPIs, dynamic filters,
   UCoA columns, and role-gated actions for Rental Payment Management.
   SRS PRN 5.1 R78–R80 • LoV 10.1 • UCoA CWT Feb 2026.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { useRentalData } from "../context/RentalDataContext";
import { useRentalMasterData } from "../hooks/useRentalMasterData";
import { useRentalRoleCapabilities } from "../hooks/useRentalRoleCapabilities";
import type { StoredRental } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { filterByQuery } from "../../../../shared/utils/deepSearch";
import { useAuth } from "../../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../../shared/data/agencyPersonas";

/* ── Keyword-based status / type matchers ─────────────────────────────── */
const hasKeyword = (v: string | undefined | null, ...keywords: string[]) => {
  if (!v) return false;
  const lc = v.toLowerCase();
  return keywords.some((k) => lc.includes(k));
};
const isActiveStatus = (s?: string) => hasKeyword(s, "active", "live", "in-use");
const isPendingTxn = (s?: string) => hasKeyword(s, "pending", "draft", "submitted", "awaiting");
const isPaidTxn = (s?: string) => hasKeyword(s, "paid", "settled", "released");
const isApprovedTxn = (s?: string) => hasKeyword(s, "approved", "cleared");

const fmtNu = (n: number) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

/* ── Agency record-matching helpers (shared pattern w/ UtilityQueue) ─── */
/**
 * Tokens the record's `agencyName` can reasonably contain for a given persona.
 * Covers the full ministry name, the shortCode (e.g. "MoH"), and common aliases
 * used in seed records (e.g. "Health" for MoH, "GovTech" for Govt Technology).
 */
function agencyMatchTokens(agency: { name: string; shortCode?: string }): string[] {
  const base = [agency.name, agency.shortCode || ""].filter(Boolean);
  const ALIASES: Record<string, string[]> = {
    "Ministry of Health": ["Health"],
    "Government Technology Agency": ["GovTech", "Govt Technology"],
    "Ministry of Education & Skills Development": ["Education"],
    "Ministry of Education and Skills Development": ["Education"],
    "Ministry of Industry, Commerce and Employment": ["Industry, Commerce", "MoICE"],
    "Ministry of Agriculture and Livestock": ["Agriculture", "MoAL"],
    "Ministry of Infrastructure and Transport": ["Infrastructure", "MoIT"],
    "Ministry of Energy and Natural Resources": ["Energy", "MoENR"],
    "Ministry of Foreign Affairs & External Trade": ["Foreign Affairs", "MoFAET"],
    "Ministry of Home Affairs": ["Home Affairs", "MoHA"],
    "Ministry of Finance": ["Finance", "MoF"],
  };
  const extra = ALIASES[agency.name] || [];
  return [...base, ...extra]
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function recordBelongsToAgency(recordAgencyName: string, tokens: string[]): boolean {
  const hay = (recordAgencyName || "").toLowerCase();
  if (!hay) return false;
  return tokens.some((t) => hay.includes(t));
}

interface Props {
  onNewRecord: () => void;
  onEditRecord: (record: StoredRental) => void;
}

export function RentalQueue({ onNewRecord, onEditRecord }: Props) {
  const { records: rawRecords, removeRental } = useRentalData();
  const master = useRentalMasterData();
  const roleCaps = useRentalRoleCapabilities();
  const { activeRoleId, activeAgencyCode, roleSwitchEpoch } = useAuth();
  const agencyCtx = resolveAgencyContext(activeRoleId);
  const isCentralAgency = !!agencyCtx?.agency.isCentral;

  /* ── Three-tier scoping ───────────────────────────────────────────────
     MoF (central)   → sees ALL rental records
     Agency persona  → token-matched filter on `agencyName` so
                        "Government Technology Agency" also catches
                        "Government Technology Agency (GovTech)" / "GovTech Agency".
     Any other       → falls through to `rawRecords` unchanged. */
  const records = useMemo(() => {
    if (isCentralAgency || !agencyCtx) return rawRecords;
    const tokens = agencyMatchTokens(agencyCtx.agency);
    return rawRecords.filter((r) => recordBelongsToAgency(r.asset.agencyName, tokens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRecords, isCentralAgency, activeAgencyCode, roleSwitchEpoch]);

  /* ── Filter state ───────────────────────────────────────────────────── */
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrequency, setFilterFrequency] = useState("");
  const [filterFunding, setFilterFunding] = useState("");
  /* Only central (MoF) uses the agency dropdown; other personas are scoped
     upstream so we leave this empty by default. */
  const [filterAgency, setFilterAgency] = useState<string>("");
  const [toDelete, setToDelete] = useState<StoredRental | null>(null);

  /* Reset the agency dropdown value when persona switches so the previous
     selection doesn't leak across personas. */
  useEffect(() => {
    setFilterAgency("");
  }, [activeAgencyCode]);

  /* ── Multi-filter pipeline ──────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = records;
    if (filterCategory) list = list.filter((r) => r.asset.assetCategory === filterCategory);
    if (filterType) list = list.filter((r) => r.asset.assetType === filterType);
    if (filterStatus) list = list.filter((r) => r.asset.status === filterStatus);
    if (filterFrequency) list = list.filter((r) => r.asset.paymentFrequency === filterFrequency);
    if (filterFunding) list = list.filter((r) => r.asset.fundingSource === filterFunding);
    if (filterAgency) {
      const tokens = agencyMatchTokens({ name: filterAgency });
      list = list.filter((r) => recordBelongsToAgency(r.asset.agencyName, tokens));
    }
    if (query) list = filterByQuery(list, query);
    return list;
  }, [records, filterCategory, filterType, filterStatus, filterFrequency, filterFunding, filterAgency, query]);

  /* ── Unique filter values from data ─────────────────────────────────── */
  const uniqueCategories = useMemo(
    () => [...new Set(records.map((r) => r.asset.assetCategory).filter(Boolean))],
    [records],
  );
  const uniqueTypes = useMemo(
    () => [...new Set(records.map((r) => r.asset.assetType).filter(Boolean))],
    [records],
  );
  const uniqueFunding = useMemo(
    () => [...new Set(records.map((r) => r.asset.fundingSource).filter(Boolean))],
    [records],
  );

  /* ── KPIs ────────────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const active = records.filter((r) => isActiveStatus(r.asset.status)).length;
    const immovable = records.filter((r) =>
      hasKeyword(r.asset.assetType, "immovable"),
    ).length;
    const movable = records.filter((r) =>
      hasKeyword(r.asset.assetType, "movable") && !hasKeyword(r.asset.assetType, "immovable"),
    ).length;
    const ip = records.filter((r) =>
      hasKeyword(r.asset.assetType, "intellectual"),
    ).length;
    const allTxns = records.flatMap((r) => r.transactions);
    const pending = allTxns.filter((t) => isPendingTxn(t.status)).length;
    const approved = allTxns.filter((t) => isApprovedTxn(t.status)).length;
    const paid = allTxns.filter((t) => isPaidTxn(t.status)).length;
    const totalRent = records.reduce(
      (s, r) => s + (parseFloat(r.asset.rentAmount || "0") || 0),
      0,
    );
    const rgobCount = records.filter((r) => r.asset.fundingSource === "RGOB").length;
    const donorCount = records.filter((r) =>
      r.asset.fundingSource === "Donor" || r.asset.fundingSource === "Project Fund",
    ).length;
    return { total: records.length, active, immovable, movable, ip, pending, approved, paid, totalRent, rgobCount, donorCount };
  }, [records]);

  /* ── Role-specific stat cards ───────────────────────────────────────── */
  const statCards = useMemo(() => {
    const base: { label: string; value: number | string; tone: string }[] = [
      { label: "Assets on Rent", value: kpis.total, tone: "slate" },
      { label: "Active", value: kpis.active, tone: "emerald" },
    ];

    if (roleCaps.canManagePTS) {
      base.push({ label: "Immovable (PTS)", value: kpis.immovable, tone: "sky" });
    }
    if (roleCaps.canApproveTransaction || roleCaps.canInitiatePayment) {
      base.push({ label: "Pending Txns", value: kpis.pending, tone: "amber" });
      base.push({ label: "Approved", value: kpis.approved, tone: "blue" });
    }
    if (roleCaps.canReleasePayment) {
      base.push({ label: "Paid / Released", value: kpis.paid, tone: "emerald" });
    }
    if (roleCaps.isReadOnly) {
      // Auditor / Procurement — compliance-oriented view
      base.push({ label: "Immovable (PTS)", value: kpis.immovable, tone: "sky" });
      base.push({ label: "Movable", value: kpis.movable, tone: "cyan" });
      base.push({ label: "IP Assets", value: kpis.ip, tone: "violet" });
    }
    if (roleCaps.canConfigureBudget) {
      base.push({ label: "RGOB Funded", value: kpis.rgobCount, tone: "emerald" });
      base.push({ label: "Donor / Project", value: kpis.donorCount, tone: "blue" });
    }

    base.push({ label: "Total Rent (Nu.)", value: fmtNu(kpis.totalRent), tone: "violet" });
    return base;
  }, [kpis, roleCaps]);

  const activeFilterCount = [filterCategory, filterType, filterStatus, filterFrequency, filterFunding].filter(Boolean).length;

  return (
    <section
      className="flex w-full min-w-0 max-w-full flex-col gap-4 overflow-hidden"
      style={{ height: "calc(100vh - 120px)" }}
    >
      {/* ═══ FIXED HEADER ZONE (KPIs + Filters) — never scrolls horizontally ═══ */}
      <div className="w-full min-w-0 max-w-full flex-shrink-0 space-y-4 overflow-hidden">

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {statCards.map((k) => (
          <Kpi key={k.label} label={k.label} value={k.value} tone={k.tone} />
        ))}
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any field — ID, title, lessor, agency, UCoA, budget code…"
            className="w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm xl:max-w-sm"
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-1 xl:flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs xl:w-auto"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs xl:w-auto"
            >
              <option value="">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs xl:w-auto"
            >
              <option value="">All Statuses</option>
              {master.assetStatus.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs xl:w-auto"
            >
              <option value="">All Frequencies</option>
              {master.paymentFrequency.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            {uniqueFunding.length > 0 && (
              <select
                value={filterFunding}
                onChange={(e) => setFilterFunding(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs xl:w-auto"
              >
                <option value="">All Funding</option>
                {uniqueFunding.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            )}

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterCategory("");
                  setFilterType("");
                  setFilterStatus("");
                  setFilterFrequency("");
                  setFilterFunding("");
                  setQuery("");
                }}
                className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 xl:w-auto"
              >
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </button>
            )}
          </div>

          <div className="xl:ml-auto">
            {roleCaps.canCreateAsset && (
              <button
                type="button"
                onClick={onNewRecord}
                className="w-full rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 xl:w-auto"
              >
                + New Rental Asset
              </button>
            )}
          </div>
        </div>

        {/* Active filter summary */}
        {activeFilterCount > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filterCategory && (
              <FilterChip label={`Category: ${filterCategory}`} onClear={() => setFilterCategory("")} />
            )}
            {filterType && (
              <FilterChip label={`Type: ${filterType}`} onClear={() => setFilterType("")} />
            )}
            {filterStatus && (
              <FilterChip label={`Status: ${filterStatus}`} onClear={() => setFilterStatus("")} />
            )}
            {filterFrequency && (
              <FilterChip label={`Freq: ${filterFrequency}`} onClear={() => setFilterFrequency("")} />
            )}
            {filterFunding && (
              <FilterChip label={`Funding: ${filterFunding}`} onClear={() => setFilterFunding("")} />
            )}
          </div>
        )}
      </div>
      </div>{/* end fixed header zone */}

      {/* ═══ SCROLLABLE TABLE ZONE — only this part scrolls ═══════════ */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-900">
            {records.length === 0 ? "No rental assets yet" : "No assets match current filters"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {records.length === 0
              ? roleCaps.canCreateAsset
                ? <>Click <b>+ New Rental Asset</b> to register the first one.</>
                : "Your role does not have permission to create rental assets."
              : "Adjust your filters or search to find rental assets."}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-1">
          <div className="flex flex-shrink-0 items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-slate-400">
              {filtered.length} asset{filtered.length !== 1 ? "s" : ""} — scroll table to see all columns
            </span>
          </div>

          {/* The ONLY scrollable container — fills remaining space.
              `min-w-0` + `max-w-full` prevents the wide table (minWidth:1700)
              from pushing the outer page layout horizontally. Only THIS box
              scrolls on the X-axis; KPIs, filters and the rest of the page
              stay locked to the viewport width. */}
          <div
            className="flex-1 min-h-0 min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white"
            style={{
              overflowX: "auto",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table className="w-full border-collapse text-left text-sm" style={{ minWidth: 1700 }}>
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500" style={{ position: "sticky", top: 0, zIndex: 5 }}>
                <tr>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Asset ID</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50" style={{ minWidth: 190 }}>Title</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Category</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Type</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Sub-Class</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50" style={{ minWidth: 140 }}>Lessor</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50" style={{ minWidth: 150 }}>Agency</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50 text-right">Rent (Nu.)</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Freq.</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Budget Code</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Funding</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Txns</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50">Status</th>
                  <th className="whitespace-nowrap px-3 py-3 bg-slate-50 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const pendingCount = r.transactions.filter((t) => isPendingTxn(t.status)).length;
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-700">
                        {r.asset.assetId}
                      </td>
                      <td className="px-3 py-3 text-slate-700" style={{ maxWidth: 210 }}>
                        <span className="block truncate" title={r.asset.assetTitle}>
                          {r.asset.assetTitle || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-700">
                        {r.asset.assetCategory || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            hasKeyword(r.asset.assetType, "immovable")
                              ? "bg-sky-100 text-sky-700"
                              : hasKeyword(r.asset.assetType, "movable")
                              ? "bg-amber-100 text-amber-700"
                              : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {r.asset.assetType || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                        {r.asset.assetSubClass || "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700" style={{ maxWidth: 160 }}>
                        <span className="block truncate" title={r.asset.lessorName}>
                          {r.asset.lessorName || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600" style={{ maxWidth: 170 }}>
                        <span className="block truncate" title={r.asset.agencyName}>
                          {r.asset.agencyName || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs text-slate-700">
                        {fmtNu(parseFloat(r.asset.rentAmount || "0"))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                        {r.asset.paymentFrequency || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {r.asset.budgetCode ? (
                          <span
                            className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                            title={r.asset.budgetCode}
                          >
                            {r.asset.budgetCode.split(" — ")[0] || r.asset.budgetCode}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {r.asset.fundingSource ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              r.asset.fundingSource === "RGOB"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : r.asset.fundingSource === "Donor"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {r.asset.fundingSource}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="text-xs text-slate-700">{r.transactions.length}</span>
                        {pendingCount > 0 && (
                          <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                            {pendingCount}p
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isActiveStatus(r.asset.status)
                              ? "bg-emerald-100 text-emerald-700"
                              : hasKeyword(r.asset.status, "inactive", "terminated", "ended")
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {r.asset.status || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {roleCaps.canApproveTransaction && pendingCount > 0 && (
                            <button
                              onClick={() => onEditRecord(r)}
                              className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                            >
                              Review
                            </button>
                          )}
                          {roleCaps.canEditAsset && (
                            <button
                              onClick={() => onEditRecord(r)}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                          )}
                          {roleCaps.isReadOnly && (
                            <button
                              onClick={() => onEditRecord(r)}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </button>
                          )}
                          {roleCaps.canDeleteAsset && (
                            <button
                              onClick={() => setToDelete(r)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete rental asset?"
        message={`This will permanently remove ${toDelete?.asset.assetId ?? ""} and all ${toDelete?.transactions.length ?? 0} transaction(s) from the local store.`}
        detail="This action cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeRental(toDelete.id);
          setToDelete(null);
        }}
      />
    </section>
  );
}

/* ── Reusable KPI card ─────────────────────────────────────────────────── */
function Kpi({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  const toneMap: Record<string, string> = {
    slate: "from-slate-50 to-white ring-slate-200 text-slate-900",
    emerald: "from-emerald-50 to-white ring-emerald-200 text-emerald-800",
    sky: "from-sky-50 to-white ring-sky-200 text-sky-800",
    amber: "from-amber-50 to-white ring-amber-200 text-amber-800",
    violet: "from-violet-50 to-white ring-violet-200 text-violet-800",
    blue: "from-blue-50 to-white ring-blue-200 text-blue-800",
    cyan: "from-cyan-50 to-white ring-cyan-200 text-cyan-800",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 shadow-sm ring-1 ${toneMap[tone] ?? toneMap.slate}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

/* ── Filter chip ───────────────────────────────────────────────────────── */
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
      {label}
      <button
        onClick={onClear}
        className="ml-0.5 rounded-full bg-sky-200 px-1 text-[9px] font-bold text-sky-800 hover:bg-sky-300"
      >
        ×
      </button>
    </span>
  );
}
