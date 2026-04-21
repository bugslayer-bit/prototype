/* ═══════════════════════════════════════════════════════════════════════════
   UtilityQueue — SRS PRN 5.1 list view with role-aware KPIs and filters.
   ─────────────────────────────────────────────────────────────────────────
   Fully dynamic:
     • Provider tabs SOURCED FROM master data (utility-service-provider LoV)
     • Provider → Utility Type mapping from master data (utility-provider-types-<slug>)
     • Service-type chips from per-provider catalogues
     • Status / Billing Cycle / Payment Method / Agency filters (LoV 15.x)
     • KPIs change per role
     • Action buttons gated by useUtilityRoleCapabilities()
     • One-click Payment Order generation (SRS R77)
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { useUtilityData } from "../context/UtilityDataContext";
import type { StoredUtility } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { InitiatePaymentDialog } from "./InitiatePaymentDialog";
import {
  isActiveUtilityStatus,
  isSuspendedUtilityStatus,
  isPendingStatus,
  isOverdueStatus,
  isPaidStatus,
  isDisputedStatus,
  isClearedStatus,
  providerSlug,
  useUtilityMasterData,
} from "../hooks/useUtilityMasterData";
import { useUtilityRoleCapabilities } from "../hooks/useUtilityRoleCapabilities";
import { useAuth } from "../../../../shared/context/AuthContext";
import { getRoleTheme } from "../../../../shared/roleTheme";
import { useLiveContractorLookup } from "../../../../shared/context/useLiveContractorName";
import { resolveAgencyContext } from "../../../../shared/data/agencyPersonas";

/* ── Agency record-matching helpers ─────────────────────────────────────── */
/**
 * Tokens the record's `agencyName` can reasonably contain for a given persona.
 * Covers the full ministry name, the shortCode (e.g. "MoH"), and common aliases
 * used in seed records (e.g. "Health" for MoH, "GovTech" for Govt Technology).
 */
function agencyMatchTokens(agency: {
  name: string;
  shortCode?: string;
}): string[] {
  const base = [agency.name, agency.shortCode || ""].filter(Boolean);
  /* Known aliases — extend as new seed records appear */
  const ALIASES: Record<string, string[]> = {
    "Ministry of Health": ["Health"],
    "Government Technology Agency": ["GovTech", "Govt Technology"],
    "Ministry of Education & Skills Development": ["Education"],
    "Ministry of Industry, Commerce and Employment": ["Industry, Commerce"],
    "Ministry of Agriculture and Livestock": ["Agriculture"],
    "Ministry of Infrastructure and Transport": ["Infrastructure", "Works and Human Settlement"],
    "Ministry of Energy and Natural Resources": ["Energy"],
    "Ministry of Foreign Affairs & External Trade": ["Foreign Affairs"],
  };
  const extra = ALIASES[agency.name] || [];
  return [...base, ...extra]
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function recordBelongsToAgency(
  recordAgencyName: string,
  tokens: string[],
): boolean {
  const hay = (recordAgencyName || "").toLowerCase();
  if (!hay) return false;
  return tokens.some((t) => hay.includes(t));
}

/**
 * Tokens that identify a utility-provider persona against the
 * record's `serviceProviderName` (e.g. "Bhutan Telecom", "BT",
 * "TashiCell", "BPC", "Starlink", "Thromde"). The agency code is
 * authoritative (UP-BT / UP-TC / UP-BPC / UP-STL / UP-MUN).
 */
function providerMatchTokens(agencyCode: string): string[] {
  switch (agencyCode) {
    case "UP-BT":
      return ["bhutan telecom", "btl", "bt "];
    case "UP-TC":
      return ["tashi cell", "tashicell", "tashi"];
    case "UP-BPC":
      return ["bhutan power", "bpc", "power corporation"];
    case "UP-STL":
      return ["starlink"];
    case "UP-MUN":
      return ["thromde", "municipal", "municipality"];
    default:
      return [];
  }
}

function recordMatchesProvider(
  recordProviderName: string,
  tokens: string[],
): boolean {
  const hay = (recordProviderName || "").toLowerCase();
  if (!hay) return false;
  return tokens.some((t) => hay.includes(t));
}

interface Props {
  onNewRecord: () => void;
  onEditRecord: (record: StoredUtility) => void;
}

const ALL_PROVIDERS = "__ALL__";
const ALL_TYPES = "__ALL__";
const ALL_STATUSES = "__ALL__";
const ALL_CYCLES = "__ALL__";
const ALL_AGENCIES = "__ALL__";
const ALL_PAY_METHODS = "__ALL__";

export function UtilityQueue({ onNewRecord, onEditRecord }: Props) {
  const { records: rawRecords, removeUtility } = useUtilityData();
  const master = useUtilityMasterData();
  const roleCaps = useUtilityRoleCapabilities();
  const { activeRoleId, activeAgencyCode, roleSwitchEpoch } = useAuth();
  const theme = getRoleTheme(activeRoleId);
  const agencyCtx = resolveAgencyContext(activeRoleId);

  /* ── Dynamic per-agency scoping ──────────────────────────────────────────
     Three persona tiers drive what the list shows:
       1. MoF (isCentral = true)           → sees EVERY record
       2. Utility Provider persona (UP-*)  → sees ONLY records where the
                                              serviceProviderName matches
                                              their company (BT / TC / BPC …)
       3. Any other agency (MoH, GovTech…) → sees ONLY records whose
                                              agencyName belongs to them
     The `providerFiltered` pipeline below further narrows these. */
  const isCentralAgency = !!agencyCtx?.agency.isCentral;
  const activeAgencyCodeStr = agencyCtx?.agency.code ?? "";
  const isUtilityProviderPersona = activeAgencyCodeStr.startsWith("UP-");

  const scopedRecords = useMemo(() => {
    if (isCentralAgency || !agencyCtx) return rawRecords;

    /* Utility-provider persona — filter by serviceProviderName.
       Provider personas (UP-BT, UP-TC, etc.) see all records
       whose serviceProviderId matches. Falls back to text
       tokens when legacy records lack a code. */
    if (isUtilityProviderPersona) {
      const tokens = providerMatchTokens(activeAgencyCodeStr);
      return rawRecords.filter((r) =>
        recordMatchesProvider(
          r.header.serviceProviderName || "",
          tokens,
        ),
      );
    }

    /* Regular consuming agency — filter by canonical agencyCode.
       If a record has the agencyCode field, use strict equality.
       If it's a legacy record without agencyCode, fall back to
       text-matching so nothing silently disappears. */
    return rawRecords.filter((r) => {
      if (r.header.agencyCode) {
        return r.header.agencyCode === activeAgencyCodeStr;
      }
      /* Legacy fallback — text-matching for records created before agencyCode was added */
      const tokens = agencyMatchTokens(agencyCtx.agency);
      return recordBelongsToAgency(r.header.agencyName, tokens);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rawRecords,
    isCentralAgency,
    isUtilityProviderPersona,
    activeAgencyCodeStr,
    roleSwitchEpoch,
  ]);

  /* Alias — downstream filters operate on the agency-scoped list */
  const records = scopedRecords;

  const [query, setQuery] = useState("");
  const [activeProvider, setActiveProvider] = useState<string>(ALL_PROVIDERS);
  const [activeType, setActiveType] = useState<string>(ALL_TYPES);
  const [activeStatus, setActiveStatus] = useState<string>(ALL_STATUSES);
  const [activeCycle, setActiveCycle] = useState<string>(ALL_CYCLES);
  /* For central (MoF) the agency filter starts at "All". For scoped
     agencies the filter is effectively irrelevant (records are already
     filtered) but we keep the state for the controls to remain consistent. */
  const [activeAgency, setActiveAgency] = useState<string>(
    isCentralAgency || isUtilityProviderPersona
      ? ALL_AGENCIES
      : agencyCtx?.agency.name ?? ALL_AGENCIES,
  );
  const [activePayMethod, setActivePayMethod] = useState<string>(ALL_PAY_METHODS);

  /* Auto-sync agency filter when user switches agency via the picker.
     Central (MoF)         → reset to "All Agencies" (full queue).
     Utility-provider desk → "All Agencies" too, because records are already
                             provider-scoped; filtering by agencyName would
                             zero-out the view (the provider is NOT a
                             consuming agency — it supplies the service).
     Consuming agency      → lock filter to that agency's name. */
  useEffect(() => {
    if (isCentralAgency || isUtilityProviderPersona) {
      setActiveAgency(ALL_AGENCIES);
    } else if (agencyCtx) {
      setActiveAgency(agencyCtx.agency.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgencyCode, isCentralAgency, isUtilityProviderPersona]);

  const [toDelete, setToDelete] = useState<StoredUtility | null>(null);
  const [toPay, setToPay] = useState<StoredUtility | null>(null);
  const [showDisputeFor, setShowDisputeFor] = useState<StoredUtility | null>(null);
  const resolveContractorName = useLiveContractorLookup();

  /* ── Dynamic provider tab list from master data ──────────────────────── */
  const providerTabs = useMemo(() => {
    const all = master.serviceProviders.map((name) => ({
      id: providerSlug(name),
      label: name,
      /* Keywords for matching — lowercase slug fragments from the provider name */
      match: providerSlug(name)
        .split("-")
        .filter((seg) => seg.length > 2),
      /* Utility types this provider serves (SRS LoV 15.1) */
      utilityTypes: master.getUtilityTypesForProvider(name),
    }));

    /* When acting as a utility-provider persona (e.g. Tashi Cell desk),
       the tab list collapses to only that provider. MoF + consuming
       agencies still see every provider. */
    if (isUtilityProviderPersona) {
      const providerTokens = providerMatchTokens(activeAgencyCodeStr);
      return all.filter((t) =>
        providerTokens.some(
          (tok) =>
            t.label.toLowerCase().includes(tok) ||
            t.match.some((m) => tok.includes(m)),
        ),
      );
    }
    return all;
  }, [master, isUtilityProviderPersona, activeAgencyCodeStr]);

  /* When the persona is a utility-provider, auto-select the sole provider
     tab so the landing screen immediately shows "my services" rather than
     the empty "All Providers" view. */
  useEffect(() => {
    if (!isUtilityProviderPersona) return;
    if (providerTabs.length === 1) {
      setActiveProvider(providerTabs[0].id);
    } else {
      setActiveProvider(ALL_PROVIDERS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUtilityProviderPersona, activeAgencyCodeStr, providerTabs.length]);

  /* ── Provider tab filter ─────────────────────────────────────────────── */
  const providerFiltered = useMemo(() => {
    if (activeProvider === ALL_PROVIDERS) return records;
    const tab = providerTabs.find((t) => t.id === activeProvider);
    if (!tab) return records;
    return records.filter((r) => {
      const liveName = resolveContractorName(
        r.header.serviceProviderId,
        r.header.serviceProviderName,
      ).toLowerCase();
      const slug = providerSlug(liveName);
      return tab.match.some((m) => slug.includes(m) || liveName.includes(m));
    });
  }, [records, activeProvider, providerTabs, resolveContractorName]);

  /* ── Service-type catalogue for active provider ──────────────────────── */
  const activeProviderLabel = useMemo(
    () => providerTabs.find((t) => t.id === activeProvider)?.label ?? "",
    [activeProvider, providerTabs],
  );

  const activeProviderUtilityTypes = useMemo(
    () => providerTabs.find((t) => t.id === activeProvider)?.utilityTypes ?? [],
    [activeProvider, providerTabs],
  );

  const providerServiceTypes = useMemo(() => {
    if (activeProvider === ALL_PROVIDERS) return master.utilityType;
    const catalog = master.getServiceTypesForProvider(activeProviderLabel);
    return catalog.length > 0 ? catalog : master.utilityType;
  }, [master, activeProviderLabel, activeProvider]);

  const isProviderCatalog = useMemo(
    () =>
      activeProvider !== ALL_PROVIDERS &&
      master.getServiceTypesForProvider(activeProviderLabel).length > 0,
    [master, activeProviderLabel, activeProvider],
  );

  useEffect(() => {
    setActiveType(ALL_TYPES);
  }, [activeProvider]);

  const matchesType = (r: StoredUtility, t: string): boolean => {
    const needle = t.toLowerCase();
    if (isProviderCatalog) {
      return r.serviceMaps.some((m) =>
        (m.serviceName || "").toLowerCase().includes(needle),
      );
    }
    return (r.header.utilityType || "").toLowerCase().includes(needle);
  };

  /* ── Multi-filter pipeline ───────────────────────────────────────────── */
  const multiFiltered = useMemo(() => {
    let result = providerFiltered;

    if (activeType !== ALL_TYPES) {
      result = result.filter((r) => matchesType(r, activeType));
    }
    if (activeStatus !== ALL_STATUSES) {
      result = result.filter(
        (r) =>
          r.header.utilityStatus.toLowerCase() === activeStatus.toLowerCase(),
      );
    }
    if (activeCycle !== ALL_CYCLES) {
      result = result.filter(
        (r) =>
          r.header.billingCycle.toLowerCase() === activeCycle.toLowerCase(),
      );
    }
    if (activeAgency !== ALL_AGENCIES) {
      /* Token-based match so the dropdown value "Ministry of Health" also
         catches seed records labelled "Health", and "Government Technology
         Agency" catches "GovTech Agency". */
      const tokens = agencyMatchTokens({ name: activeAgency });
      result = result.filter((r) =>
        recordBelongsToAgency(r.header.agencyName, tokens),
      );
    }
    if (activePayMethod !== ALL_PAY_METHODS) {
      result = result.filter(
        (r) =>
          (r.header.paymentMethod || "").toLowerCase() ===
          activePayMethod.toLowerCase(),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    providerFiltered,
    activeType,
    activeStatus,
    activeCycle,
    activeAgency,
    activePayMethod,
    isProviderCatalog,
  ]);

  /* Per-type counts */
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [ALL_TYPES]: providerFiltered.length,
    };
    for (const t of providerServiceTypes) {
      counts[t] = providerFiltered.filter((r) => matchesType(r, t)).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerFiltered, providerServiceTypes, isProviderCatalog]);

  /* Free-text search */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return multiFiltered;
    return multiFiltered.filter((r) => {
      const liveName = resolveContractorName(
        r.header.serviceProviderId,
        r.header.serviceProviderName,
      );
      return (
        r.header.utilityId.toLowerCase().includes(q) ||
        r.header.agencyName.toLowerCase().includes(q) ||
        liveName.toLowerCase().includes(q) ||
        r.header.utilityType.toLowerCase().includes(q) ||
        r.header.connectionReference.toLowerCase().includes(q)
      );
    });
  }, [multiFiltered, query, resolveContractorName]);

  /* Distinct agencies */
  const distinctAgencies = useMemo(() => {
    const set = new Set(
      records.map((r) => r.header.agencyName).filter(Boolean),
    );
    return Array.from(set).sort();
  }, [records]);

  /* ── Role-aware KPIs ─────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const src = multiFiltered;
    const active = src.filter((r) =>
      isActiveUtilityStatus(r.header.utilityStatus),
    ).length;
    const suspended = src.filter((r) =>
      isSuspendedUtilityStatus(r.header.utilityStatus),
    ).length;
    const allBills = src.flatMap((r) => r.bills);
    const pending = allBills.filter((b) => isPendingStatus(b.status)).length;
    const overdue = allBills.filter((b) => isOverdueStatus(b.status)).length;
    const paid = allBills.filter((b) => isPaidStatus(b.status)).length;
    const disputed = allBills.filter((b) => isDisputedStatus(b.status)).length;
    const cleared = allBills.filter((b) => isClearedStatus(b.status)).length;
    const monthly = src.reduce(
      (s, r) =>
        s + (parseFloat(r.header.monthlyBudgetAllocation || "0") || 0),
      0,
    );
    const totalBilled = allBills.reduce(
      (s, b) => s + (parseFloat(b.totalBillAmount || "0") || 0),
      0,
    );
    const autoPay = src.filter((r) => r.header.autoPaymentEnabled).length;
    const individual = src.filter(
      (r) => (r.header.paymentMethod || "").toLowerCase() === "individual",
    ).length;
    const consolidated = src.filter(
      (r) => (r.header.paymentMethod || "").toLowerCase() === "consolidated",
    ).length;
    return {
      total: src.length,
      active,
      suspended,
      pending,
      overdue,
      paid,
      disputed,
      cleared,
      monthly,
      totalBilled,
      totalBills: allBills.length,
      autoPay,
      individual,
      consolidated,
    };
  }, [multiFiltered]);

  /* Tab counts */
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { [ALL_PROVIDERS]: records.length };
    for (const t of providerTabs) {
      counts[t.id] = records.filter((r) => {
        const liveName = resolveContractorName(
          r.header.serviceProviderId,
          r.header.serviceProviderName,
        ).toLowerCase();
        const slug = providerSlug(liveName);
        return t.match.some((m) => slug.includes(m) || liveName.includes(m));
      }).length;
    }
    return counts;
  }, [records, providerTabs, resolveContractorName]);

  /* ── Role-specific stat cards ────────────────────────────────────────── */
  const statCards = useMemo(() => {
    const role = activeRoleId ?? "";
    const base = [
      { label: "Utility Accounts", value: kpis.total, tone: "slate" },
      { label: "Active", value: kpis.active, tone: "emerald" },
    ];

    if (role === "role-finance-officer") {
      return [
        ...base,
        { label: "Cleared for Payment", value: kpis.cleared, tone: "sky" },
        { label: "Paid", value: kpis.paid, tone: "emerald" },
        {
          label: "Monthly Allocation (Nu.)",
          value: fmtNu(kpis.monthly),
          tone: "violet",
        },
      ];
    }
    if (role === "role-auditor") {
      return [
        ...base,
        { label: "Total Bills", value: kpis.totalBills, tone: "sky" },
        { label: "Overdue", value: kpis.overdue, tone: "rose" },
        { label: "Disputed", value: kpis.disputed, tone: "amber" },
        {
          label: "Total Billed (Nu.)",
          value: fmtNu(kpis.totalBilled),
          tone: "violet",
        },
        { label: "Auto-Pay Enabled", value: kpis.autoPay, tone: "sky" },
      ];
    }
    if (
      role === "role-head-of-agency" ||
      role === "role-finance-officer"
    ) {
      return [
        ...base,
        { label: "Pending Approval", value: kpis.pending, tone: "amber" },
        { label: "Overdue", value: kpis.overdue, tone: "rose" },
        { label: "Disputed", value: kpis.disputed, tone: "amber" },
        {
          label: "Monthly Allocation (Nu.)",
          value: fmtNu(kpis.monthly),
          tone: "violet",
        },
      ];
    }
    if (role === "role-procurement") {
      return [
        ...base,
        { label: "Suspended", value: kpis.suspended, tone: "amber" },
        {
          label: "Total Billed (Nu.)",
          value: fmtNu(kpis.totalBilled),
          tone: "violet",
        },
      ];
    }
    return [
      ...base,
      { label: "Pending Bills", value: kpis.pending, tone: "amber" },
      { label: "Overdue Bills", value: kpis.overdue, tone: "rose" },
      { label: "Individual Pay", value: kpis.individual, tone: "sky" },
      { label: "Consolidated Pay", value: kpis.consolidated, tone: "violet" },
      {
        label: "Monthly Allocation (Nu.)",
        value: fmtNu(kpis.monthly),
        tone: "sky",
      },
    ];
  }, [activeRoleId, kpis]);

  return (
    <section className="space-y-5">
      {/* ── Dynamic Provider tabs from master data ──────────────────────── */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {/* "All Providers" tab — hidden for utility-provider personas
            (they only ever see their own company, so the tab is noise). */}
        {!isUtilityProviderPersona && (
          <button
            type="button"
            onClick={() => setActiveProvider(ALL_PROVIDERS)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300 ${
              activeProvider === ALL_PROVIDERS
                ? "bg-sky-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>All Providers</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeProvider === ALL_PROVIDERS
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {tabCounts[ALL_PROVIDERS] ?? 0}
            </span>
          </button>
        )}
        {providerTabs.map((t) => {
          const isActive = activeProvider === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveProvider(t.id)}
              className={`flex flex-col items-start gap-0.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-sky-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tabCounts[t.id] ?? 0}
                </span>
              </div>
              {/* Show associated utility types under each provider */}
              {t.utilityTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {t.utilityTypes.map((ut) => (
                    <span
                      key={ut}
                      className={`rounded-full px-1.5 py-0 text-[8px] font-medium ${
                        isActive
                          ? "bg-white/15 text-white/90"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {ut}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Provider → Utility Type association hint ────────────────────── */}
      {activeProvider !== ALL_PROVIDERS &&
        activeProviderUtilityTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
              {activeProviderLabel} serves
            </span>
            {activeProviderUtilityTypes.map((ut) => (
              <span
                key={ut}
                className="rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-sky-700"
              >
                {ut}
              </span>
            ))}
          </div>
        )}

      {/* ── Service-type / Utility Type chips ──────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {isProviderCatalog
            ? `${activeProviderLabel} · Service`
            : "Utility Type"}
        </span>
        <button
          type="button"
          onClick={() => setActiveType(ALL_TYPES)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
            activeType === ALL_TYPES
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          All
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              activeType === ALL_TYPES
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {typeCounts[ALL_TYPES] ?? 0}
          </span>
        </button>
        {providerServiceTypes.map((t) => {
          const isActive = activeType === t;
          const count = typeCounts[t] ?? 0;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveType(t)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                isActive
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── SRS LoV 15.x Advanced Filters ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Filters · LoV 15.1
        </span>

        {/* Billing Status (DD 19.10) */}
        <select
          value={activeStatus}
          onChange={(e) => setActiveStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
        >
          <option value={ALL_STATUSES}>All Statuses</option>
          {master.utilityStatus.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Billing Cycle (DD 19.7) */}
        <select
          value={activeCycle}
          onChange={(e) => setActiveCycle(e.target.value)}
          className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
        >
          <option value={ALL_CYCLES}>All Cycles</option>
          {master.billingCycle.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Payment Method (LoV 15.1) */}
        <select
          value={activePayMethod}
          onChange={(e) => setActivePayMethod(e.target.value)}
          className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
        >
          <option value={ALL_PAY_METHODS}>All Payment Methods</option>
          {master.paymentMethod.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* Agency (DD 19.2)
            Only MoF (central) can choose an agency — for every other
            persona the records are already scoped to their own agency, so
            we show a read-only chip instead of a dropdown. */}
        {isCentralAgency ? (
          <select
            value={activeAgency}
            onChange={(e) => setActiveAgency(e.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-700"
          >
            <option value={ALL_AGENCIES}>All Agencies</option>
            {distinctAgencies.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        ) : isUtilityProviderPersona ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-800">
            <span className="text-[9px] font-bold uppercase tracking-wider text-sky-500">
              Provider Desk
            </span>
            {agencyCtx?.agency.name ?? "—"} · All Consuming Agencies
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-800">
            <span className="text-[9px] font-bold uppercase tracking-wider text-sky-500">
              Agency
            </span>
            {agencyCtx?.agency.name ?? "—"}
          </span>
        )}

        {/* Clear filters */}
        {(activeStatus !== ALL_STATUSES ||
          activeCycle !== ALL_CYCLES ||
          (isCentralAgency && activeAgency !== ALL_AGENCIES) ||
          activePayMethod !== ALL_PAY_METHODS) && (
          <button
            type="button"
            onClick={() => {
              setActiveStatus(ALL_STATUSES);
              setActiveCycle(ALL_CYCLES);
              /* Only central (MoF) can revert to "All Agencies".
                 Non-central personas stay locked to their agency. */
              if (isCentralAgency) setActiveAgency(ALL_AGENCIES);
              setActivePayMethod(ALL_PAY_METHODS);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Role-themed KPI row ────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Kpi
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
          />
        ))}
      </div>

      {/* ── Actions bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ID, agency, provider, type, or connection ref…"
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {roleCaps.canExport && (
            <button
              type="button"
              onClick={() => {
                alert(
                  "Export feature — CSV/Excel download of filtered utility data.",
                );
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Export
            </button>
          )}
          {roleCaps.canCreateAccount && (
            <button
              type="button"
              onClick={onNewRecord}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              + New Utility Account
            </button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">
              No utility accounts match
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {roleCaps.canCreateAccount ? (
                <>
                  Click <b>+ New Utility Account</b> to register a provider and
                  start capturing bills.
                </>
              ) : (
                "Adjust your filters or search to find utility accounts."
              )}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Utility ID</th>
                <th className="px-4 py-3">Agency</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Service Types</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3">Pay Method</th>
                <th className="px-4 py-3">Auto-Pay</th>
                <th className="px-4 py-3">Bills</th>
                <th className="px-4 py-3">Budget (Nu.)</th>
                <th className="px-4 py-3">Budget Code</th>
                <th className="px-4 py-3">Funding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {r.header.utilityId}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.header.agencyName || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.header.utilityType || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.serviceMaps.length === 0 ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {Array.from(
                          new Set(
                            r.serviceMaps
                              .map((m) => m.serviceName)
                              .filter((s) => s && s.trim().length > 0),
                          ),
                        ).map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {resolveContractorName(
                      r.header.serviceProviderId,
                      r.header.serviceProviderName,
                    ) || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.header.billingCycle}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        (r.header.paymentMethod || "").toLowerCase() ===
                        "consolidated"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {r.header.paymentMethod || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        r.header.autoPaymentEnabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.header.autoPaymentEnabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.bills.length}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {fmtNu(
                      parseFloat(r.header.monthlyBudgetAllocation || "0"),
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.header.budgetCode ? (
                      <span
                        className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                        title={r.header.budgetCode}
                      >
                        {r.header.budgetCode.split(" — ")[0] || r.header.budgetCode}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.header.fundingSource ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.header.fundingSource === "RGOB"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.header.fundingSource === "Donor"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.header.fundingSource}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isActiveUtilityStatus(r.header.utilityStatus)
                          ? "bg-emerald-100 text-emerald-700"
                          : isSuspendedUtilityStatus(r.header.utilityStatus)
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.header.utilityStatus || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {/* One-click Payment Order (SRS R77) */}
                      {roleCaps.canInitiatePayment &&
                        (() => {
                          const payableCount = r.bills.filter(
                            (b) =>
                              !b.paymentOrderId &&
                              !/paid|approv|settl|releas|cleared/i.test(
                                b.status || "",
                              ),
                          ).length;
                          return (
                            <button
                              onClick={() => setToPay(r)}
                              disabled={payableCount === 0}
                              title={
                                payableCount === 0
                                  ? "No payable bills"
                                  : `Generate PO & send to Cash Management (${payableCount} bill(s))`
                              }
                              className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Generate PO
                              {payableCount > 0 && (
                                <span className="ml-1 rounded-full bg-white px-1.5 text-[9px] font-bold text-sky-700">
                                  {payableCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}

                      {/* Dispute */}
                      {roleCaps.canManageDisputes &&
                        (() => {
                          const disputedCount = r.bills.filter((b) =>
                            isDisputedStatus(b.status),
                          ).length;
                          const overdueCount = r.bills.filter((b) =>
                            isOverdueStatus(b.status),
                          ).length;
                          const flagCount = disputedCount + overdueCount;
                          if (flagCount === 0) return null;
                          return (
                            <button
                              onClick={() => setShowDisputeFor(r)}
                              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              Dispute
                              <span className="ml-1 rounded-full bg-white px-1.5 text-[9px] font-bold text-amber-700">
                                {flagCount}
                              </span>
                            </button>
                          );
                        })()}

                      {/* Edit */}
                      {roleCaps.canEditAccount && (
                        <button
                          onClick={() => onEditRecord(r)}
                          title="Edit details"
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      )}

                      {/* View for read-only */}
                      {roleCaps.isReadOnly && (
                        <button
                          onClick={() => onEditRecord(r)}
                          title="View details"
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                      )}

                      {/* Delete */}
                      {roleCaps.canDeleteAccount && (
                        <button
                          onClick={() => setToDelete(r)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <InitiatePaymentDialog
        open={!!toPay}
        record={toPay}
        onClose={() => setToPay(null)}
      />

      {showDisputeFor && (
        <DisputeSettlementDialog
          record={showDisputeFor}
          onClose={() => setShowDisputeFor(null)}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete utility account?"
        message={`This will permanently remove ${toDelete?.header.utilityId ?? ""} and all ${toDelete?.bills.length ?? 0} associated bill(s) from the local store.`}
        detail="This action cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeUtility(toDelete.id);
          setToDelete(null);
        }}
      />
    </section>
  );
}

/* ── Dispute & Settlement Dialog (SRS LoV 15.2) ───────────────────────── */
function DisputeSettlementDialog({
  record,
  onClose,
}: {
  record: StoredUtility;
  onClose: () => void;
}) {
  const { updateUtility } = useUtilityData();
  const master = useUtilityMasterData();
  const roleCaps = useUtilityRoleCapabilities();
  const flaggedBills = useMemo(
    () =>
      record.bills.filter(
        (b) => isDisputedStatus(b.status) || isOverdueStatus(b.status),
      ),
    [record],
  );
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const handleResolve = () => {
    const approvedLabel =
      master.billStatus.find((s) => /clear/i.test(s)) || "Cleared for Payment";
    const updatedBills = record.bills.map((b) => {
      const res = resolutions[b.id];
      if (!res) return b;
      return { ...b, status: res === "waive" ? approvedLabel : b.status };
    });
    updateUtility(record.id, {
      bills: updatedBills,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-amber-200">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                LoV 15.2 · Dispute & Settlement
              </span>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {record.header.utilityId} — Flagged Bills
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {record.header.serviceProviderName} ·{" "}
                {record.header.utilityType}
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

        <div className="max-h-[380px] overflow-auto border-y border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Bill ID</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Amount (Nu.)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flaggedBills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-700">
                    {b.billId}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {b.billingPeriodFrom} → {b.billingPeriodTo}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {fmtNu(b.totalBillAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isOverdueStatus(b.status)
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {roleCaps.canResolveDisputes ? (
                      <select
                        value={resolutions[b.id] || ""}
                        onChange={(e) =>
                          setResolutions((p) => ({
                            ...p,
                            [b.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
                      >
                        <option value="">Select…</option>
                        <option value="waive">Waive & Clear</option>
                        <option value="escalate">
                          Escalate to Provider
                        </option>
                        <option value="hold">Hold for Review</option>
                        <option value="write-off">Write-Off</option>
                      </select>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        No permission
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          {roleCaps.canResolveDisputes && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={
                Object.values(resolutions).filter(Boolean).length === 0
              }
              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Apply Resolutions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shared helpers ────────────────────────────────────────────────────── */
const fmtNu = (v: string | number) => {
  const n = typeof v === "number" ? v : parseFloat(v || "0") || 0;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) {
  const toneMap: Record<string, string> = {
    slate: "from-slate-50 to-white ring-slate-200 text-slate-900",
    emerald: "from-emerald-50 to-white ring-emerald-200 text-emerald-800",
    amber: "from-amber-50 to-white ring-amber-200 text-amber-800",
    rose: "from-rose-50 to-white ring-rose-200 text-rose-800",
    sky: "from-sky-50 to-white ring-sky-200 text-sky-800",
    violet: "from-violet-50 to-white ring-violet-200 text-violet-800",
  };
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-4 shadow-sm ring-1 transition-all duration-500 ${toneMap[tone] || toneMap.slate}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
