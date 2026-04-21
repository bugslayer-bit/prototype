import React, { useState, useMemo, useEffect, useRef } from "react";
import { useContractData, type StoredContract } from "../../../../shared/context/ContractDataContext";
import { useContractorData } from "../../../../shared/context/ContractorDataContext";
import { useMasterData } from "../../../../shared/context/MasterDataContext";
import { useAuth } from "../../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../../shared/data/agencyPersonas";
import {
  type WorkflowStepRuntime,
} from "../../../../shared/workflow";
import { ActionButton, actionButtonClass } from "../../../../shared";
import { buildSeedContracts } from "../seedContracts";
import {
  loadContracts,
  saveContracts,
  addContract,
  updateStoredContract,
  statusBadgeClass,
  statusLabel,
  methodLabel,
  type FilterKey,
  buildApprovalChain,
  findStepIndex,
  getInReviewKeys,
} from "./approvalQueue";

/* Re-export the canonical StoredContract type */
export type { StoredContract } from "../../../../shared/context/ContractDataContext";

/* Re-export legacy helpers for backward compatibility */
export { loadContracts, saveContracts, addContract, updateStoredContract };

/* ═══════════════════════════════════════════════════════════════════════ */

interface ContractListViewProps {
  onNewContract: (preselectedContractorId?: string) => void;
  onEditContract: (contract: StoredContract) => void;
  onAmendContract: (contract: StoredContract) => void;
}

export function ContractListView({ onNewContract, onEditContract, onAmendContract }: ContractListViewProps) {
  const { contracts: allContracts, addContract, updateContract, removeContract } = useContractData();
  const { contractors } = useContractorData();
  const { masterData, addValueToGroup } = useMasterData();
  const { activeRoleId, activeAgencyCode } = useAuth();
  const agencyCtx = resolveAgencyContext(activeRoleId);
  const agencyName = agencyCtx?.agency.name ?? "";

  /* Filter contracts to active agency — admin sees all, others see only their agency */
  const contracts = useMemo(() => {
    if (activeRoleId === "role-admin" || activeRoleId === "role-auditor") return allContracts;
    if (!agencyName) return allContracts;
    return allContracts.filter(c => c.agencyName === agencyName || c.agencyName === "");
  }, [allContracts, agencyName, activeRoleId]);

  /* ── Contract Category — Single source of truth: Master Data ─────────────
     The "Contract Category" pill rendered in the Approved Contractors table
     is NOT hard-coded. It is resolved live from the master-data group
     `contract-category` (SRS DD 14.1.22 — Goods / Works / Services).

     Resolution rules:
       1. Read the canonical list from master data.
       2. Normalize a contractor's stored `contractualType` against that
          list — case-insensitive substring match. This automatically maps
          legacy values:
              "Consultancy"          → "Services"
              "Consultancy Services" → "Services"
              "Works Contractor"     → "Works"
       3. If a brand-new value comes in from Contractor Registration that
          isn't yet in master data, we add it on-the-fly via
          `addValueToGroup` so the master data list stays in sync with
          live contractor records — exactly what the user asked for:
          "if there is no contract category then create in the master data".
  */
  const contractCategoryOptions = useMemo(() => {
    const group = masterData.find((g) => g.id === "contract-category");
    return group?.values ?? ["Goods", "Works", "Services"];
  }, [masterData]);

  const normalizeContractCategory = useMemo(() => {
    const opts = contractCategoryOptions;
    return (raw: string | undefined | null): string => {
      const v = (raw || "").trim();
      if (!v) return "";
      const lower = v.toLowerCase();
      /* Legacy alias map — pulls everything pre-SRS-rename onto the
         canonical Goods / Works / Services axis. */
      if (lower.startsWith("consult")) return "Services";
      if (lower === "works contractor") return "Works";
      if (lower === "goods supplier") return "Goods";
      /* Exact (case-insensitive) match against master data */
      const exact = opts.find((o) => o.toLowerCase() === lower);
      if (exact) return exact;
      /* Substring match: "Goods and Services" → "Goods" if user typed "goods" */
      const partial = opts.find(
        (o) => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(lower)
      );
      return partial ?? v;
    };
  }, [contractCategoryOptions]);

  /* If a contractor surfaces a contract category we've never seen before,
     register it in master data so the canonical list grows automatically.
     Runs once per unique unknown value, gated by addValueToGroup's own
     dedupe (it's a no-op if the value already exists). */
  useEffect(() => {
    const existing = new Set(contractCategoryOptions.map((v) => v.toLowerCase()));
    for (const c of contractors) {
      const normalized = normalizeContractCategory(c.contractualType);
      if (!normalized) continue;
      if (!existing.has(normalized.toLowerCase())) {
        addValueToGroup("contract-category", normalized);
        existing.add(normalized.toLowerCase());
      }
    }
  }, [contractors, contractCategoryOptions, normalizeContractCategory, addValueToGroup]);

  /* ── Approved contractors eligible to initiate a contract ─────────────────
     Pulled live from the Contractor Registration module. A contractor is
     eligible only when the FULL registration approval workflow is complete:
       • status === "Active and verified"
       • verification === "Verified"
       • all workflowSteps cleared (approved/skipped) — when present     */
  const approvedContractors = useMemo(() => {
    return contractors.filter((c) => {
      if (c.status !== "Active and verified") return false;
      if (c.verification !== "Verified") return false;
      if (Array.isArray(c.workflowSteps) && c.workflowSteps.length > 0) {
        const allCleared = c.workflowSteps.every(
          (s) => s.status === "approved" || s.status === "skipped"
        );
        if (!allCleared) return false;
      }
      return true;
    });
  }, [contractors]);

  const [contractorSearch, setContractorSearch] = useState("");
  const [showAllApproved, setShowAllApproved] = useState(false);

  /* ── Dynamic filters for Approved Contractors table ────────────────────
     Facets are derived LIVE from the current approvedContractors list so
     that new contractor types / contractual types / categories that get
     added through Contractor Registration automatically show up here
     without any code change. Empty string ("") means "All". Category
     options are cascaded — when a Contractual Type is selected, only the
     categories that exist under that contractual type are shown. */
  /* ── Single unified filter chip with cascading visibility ────────────
     One row with: All · Individual · Business · Goods · Services · Works.
     Selecting a chip from one group (contractor type vs contract category)
     hides the SIBLINGS in the same group AND re-counts the OTHER group's
     chips against the filtered subset. Chips that would end up with zero
     after the recount are hidden entirely so the bar never shows dead
     options. */
  type ChipGroup = "type" | "category";
  type ContractorFilterChip = {
    key: string;
    label: string;
    group: ChipGroup;
    /** Predicate used to count + match contractors */
    match: (c: typeof approvedContractors[number]) => boolean;
  };

  const filterChips: ContractorFilterChip[] = useMemo(
    () => [
      {
        key: "individual",
        label: "Individual",
        group: "type",
        match: (c) =>
          (c.contractorType || "").toLowerCase().includes("individual") ||
          c.kind === "individual",
      },
      {
        key: "business",
        label: "Business",
        group: "type",
        match: (c) =>
          (c.contractorType || "").toLowerCase().includes("business") ||
          c.kind === "business",
      },
      {
        key: "goods",
        label: "Goods",
        group: "category",
        match: (c) => normalizeContractCategory(c.contractualType) === "Goods",
      },
      {
        key: "services",
        label: "Services",
        group: "category",
        match: (c) => normalizeContractCategory(c.contractualType) === "Services",
      },
      {
        key: "works",
        label: "Works",
        group: "category",
        match: (c) => normalizeContractCategory(c.contractualType) === "Works",
      },
    ],
    [normalizeContractCategory]
  );

  /* ── Two-axis filter state ──────────────────────────────────────────────
     The user can hold ONE selection per group simultaneously:
       • activeType     ∈ "" | "individual" | "business"
       • activeCategory ∈ "" | "goods" | "services" | "works"
     This makes the filter feel like an intersection: pick "Individual"
     and the Goods/Services/Works counts immediately recount within that
     subset, then pick "Goods" and the table shows only individual goods
     contractors. Picking the same chip again clears just that axis. */
  const [activeType, setActiveType] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("");

  const chipByKey = useMemo(() => {
    const m = new Map<string, ContractorFilterChip>();
    filterChips.forEach((c) => m.set(c.key, c));
    return m;
  }, [filterChips]);

  const activeTypeChip = activeType ? chipByKey.get(activeType) ?? null : null;
  const activeCategoryChip = activeCategory ? chipByKey.get(activeCategory) ?? null : null;

  /* Apply both axes (AND) to get the final pool used by every count below
     and by the table itself. */
  const intersectedPool = useMemo(() => {
    return approvedContractors.filter((c) => {
      if (activeTypeChip && !activeTypeChip.match(c)) return false;
      if (activeCategoryChip && !activeCategoryChip.match(c)) return false;
      return true;
    });
  }, [approvedContractors, activeTypeChip, activeCategoryChip]);

  function toggleChip(chip: ContractorFilterChip) {
    if (chip.group === "type") {
      setActiveType((cur) => (cur === chip.key ? "" : chip.key));
    } else {
      setActiveCategory((cur) => (cur === chip.key ? "" : chip.key));
    }
  }

  function clearAllChips() {
    setActiveType("");
    setActiveCategory("");
  }

  /* Per-chip count + visibility:
       • The active chip in a group is always visible and shows its OWN
         intersected total (size of the active selection on that axis).
       • Other chips IN THE SAME GROUP recount against the OTHER group's
         current selection only — so siblings stay visible and re-tally
         to show "if I picked this instead, how many would I get". This is
         the dynamic top-level behaviour the user asked for: pick
         Individual, then Goods/Services/Works show how many individuals
         match each; pick Goods, then Individual/Business show how many
         goods contractors are individual vs business.
       • Zero-count siblings are hidden so the bar never shows dead chips. */
  const filterChipDisplay = useMemo(() => {
    return filterChips.map((chip) => {
      const isActive =
        (chip.group === "type" && chip.key === activeType) ||
        (chip.group === "category" && chip.key === activeCategory);

      if (isActive) {
        return { chip, count: intersectedPool.length, visible: true };
      }

      /* Recount this chip while keeping the OTHER axis fixed. */
      const otherAxisChip =
        chip.group === "type" ? activeCategoryChip : activeTypeChip;

      const count = approvedContractors.filter((c) => {
        if (otherAxisChip && !otherAxisChip.match(c)) return false;
        return chip.match(c);
      }).length;

      return { chip, count, visible: count > 0 };
    });
  }, [
    filterChips,
    approvedContractors,
    intersectedPool,
    activeType,
    activeCategory,
    activeTypeChip,
    activeCategoryChip,
  ]);

  const activeFilterCount = (activeType ? 1 : 0) + (activeCategory ? 1 : 0);

  const filteredApprovedContractors = useMemo(() => {
    const q = contractorSearch.trim().toLowerCase();
    return intersectedPool.filter((c) => {
      if (!q) return true;
      return (
        c.displayName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.registrationNumber || "").toLowerCase().includes(q)
      );
    });
  }, [intersectedPool, contractorSearch]);
  const displayedApprovedContractors = showAllApproved
    ? filteredApprovedContractors
    : filteredApprovedContractors.slice(0, 6);

  /* ── Per-contractor contract index ────────────────────────────────────────
     One contractor can hold many contracts. We compute a Map keyed by
     contractorId so the Approved Contractors table can show how many
     contracts each contractor already holds and the total committed value
     across them. This recomputes on every change to the contracts context,
     so a freshly created contract is reflected the moment it lands in
     ContractDataContext. */
  const contractsByContractor = useMemo(() => {
    const map = new Map<string, { count: number; totalValue: number; latest: StoredContract | null }>();
    for (const c of contracts) {
      if (!c.contractorId) continue;
      const entry = map.get(c.contractorId) ?? { count: 0, totalValue: 0, latest: null as StoredContract | null };
      entry.count += 1;
      const v = Number((c.contractValue || "0").toString().replace(/,/g, ""));
      if (Number.isFinite(v)) entry.totalValue += v;
      if (!entry.latest || (c.submittedAt || "") > (entry.latest.submittedAt || "")) entry.latest = c;
      map.set(c.contractorId, entry);
    }
    return map;
  }, [contracts]);

  /* ── Eligibility math ─────────────────────────────────────────────────────
     "Eligible" decrements live as contracts get created. A contractor moves
     from the Eligible bucket into the Engaged bucket the moment they hold
     at least one contract. This gives the Contract Creation page a real
     producer/consumer feel — contractor pool shrinks while the Contract
     Management workspace counters grow. */
  const eligibleApprovedContractors = useMemo(
    () => approvedContractors.filter((c) => !contractsByContractor.has(c.id)),
    [approvedContractors, contractsByContractor]
  );
  const engagedApprovedContractors = useMemo(
    () => approvedContractors.filter((c) => contractsByContractor.has(c.id)),
    [approvedContractors, contractsByContractor]
  );

  function formatNu(n: number): string {
    if (!Number.isFinite(n) || n === 0) return "—";
    return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  const [filter, setFilter] = useState<FilterKey>("all");
  const seededRef = useRef(false);

  /* ── Auto-seed 3 demo contracts (one per system source: eGP, CMS, File
       Upload) the first time the user lands on an empty list. Each contract
       is fully populated from methodMeta.suggestedValues and lands in a
       different stage of the workflow so the dashboard looks alive. */
  useEffect(() => {
    if (seededRef.current) return;
    if (contracts.length > 0) { seededRef.current = true; return; }
    const seeds = buildSeedContracts();
    seeds.forEach((seed) => addContract(seed));
    seededRef.current = true;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [contracts.length]);

  function reseedDemo() {
    const seeds = buildSeedContracts();
    seeds.forEach((seed) => addContract(seed));
  }
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [approvalDialog, setApprovalDialog] = useState<{ contract: StoredContract; action: "approve" | "reject" | "send-back" } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<StoredContract | null>(null);

  /* Dynamic chain from workflow engine — recalculates when RBAC/config changes */
  const APPROVAL_CHAIN = useMemo(() => buildApprovalChain(), []);
  const inReviewKeys = useMemo(() => getInReviewKeys(APPROVAL_CHAIN), [APPROVAL_CHAIN]);

  const filtered = useMemo(() => {
    let list = contracts;
    if (filter === "submitted") list = list.filter((c) => c.workflowStatus === "submitted");
    else if (filter === "in-review") list = list.filter((c) => inReviewKeys.includes(c.workflowStatus));
    else if (filter === "approved") list = list.filter((c) => c.workflowStatus === "approved");
    else if (filter === "rejected") list = list.filter((c) => c.workflowStatus === "rejected");
    else if (filter === "draft") list = list.filter((c) => c.workflowStatus === "draft");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.contractTitle.toLowerCase().includes(q) ||
        c.contractId.toLowerCase().includes(q) ||
        c.contractorName.toLowerCase().includes(q) ||
        c.agencyName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contracts, filter, search]);

  const counts = useMemo(() => ({
    all: contracts.length,
    draft: contracts.filter((c) => c.workflowStatus === "draft").length,
    submitted: contracts.filter((c) => c.workflowStatus === "submitted").length,
    inReview: contracts.filter((c) => inReviewKeys.includes(c.workflowStatus)).length,
    approved: contracts.filter((c) => c.workflowStatus === "approved").length,
    rejected: contracts.filter((c) => c.workflowStatus === "rejected").length,
  }), [contracts]);

  function advanceWorkflow(id: string, action: "approve" | "reject" | "send-back") {
    const c = contracts.find((ct) => ct.id === id);
    if (!c) return;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const patch: Partial<StoredContract> = {};

    if (action === "reject") {
      patch.workflowStatus = "rejected";
      patch.contractStatus = "Rejected";
      patch.rejectedAt = now;
      patch.approvalRemarks = actionRemarks || "Rejected by approver";
    } else if (action === "send-back") {
      patch.workflowStatus = "draft";
      patch.contractStatus = "Draft — Returned";
      patch.approvalRemarks = actionRemarks || "Returned for corrections";
    } else {
      /* ── Dynamic advancement using the workflow engine chain ── */
      let currentIdx = APPROVAL_CHAIN.findIndex((s) => s.key === c.workflowStatus);
      /* Handle legacy "submitted" status → map to first step (submitter) */
      if (currentIdx < 0 && c.workflowStatus === "submitted") currentIdx = 0;
      if (currentIdx >= 0 && currentIdx < APPROVAL_CHAIN.length - 1) {
        const nextStep = APPROVAL_CHAIN[currentIdx + 1];
        patch.workflowStatus = nextStep.key;
        patch.currentApprover = nextStep.role;
        patch.contractStatus = nextStep.role; // label shown in status column
      } else {
        /* Last step reached → fully approved */
        patch.workflowStatus = "approved";
        patch.contractStatus = "Approved";
        patch.approvedAt = now;
        patch.currentApprover = "";
      }
      patch.approvalRemarks = actionRemarks || "";
    }

    updateContract(id, patch);
    setActionRemarks("");
    setExpandedId(null);
  }

  function deleteContract(id: string) {
    removeContract(id);
  }

  const STATS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "Total", count: counts.all },
    { key: "draft", label: "Draft", count: counts.draft },
    { key: "submitted", label: "Pending", count: counts.submitted },
    { key: "in-review", label: "In Review", count: counts.inReview },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="min-w-0 space-y-6">
      {/* ── Approved Contractors — Ready to Initiate Contract ──────────────
           Dynamically pulled from the Contractor Registration module. Only
           contractors who have completed the FULL registration approval
           workflow appear here. Click "Initiate Contract" on any card to
           jump straight into the Contract Creation form with that
           contractor pre-selected. */}
      <div className="overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 shadow-[0_22px_55px_rgba(16,185,129,0.08)] sm:p-7">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">Approved Contractors</h2>
                <span
                  className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700"
                  title="Approved contractors who do not yet hold any contract"
                >
                  {eligibleApprovedContractors.length} eligible
                </span>
                {engagedApprovedContractors.length > 0 && (
                  <span
                    className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-700"
                    title="Already holding at least one contract — still selectable for additional contracts"
                  >
                    {engagedApprovedContractors.length} engaged
                  </span>
                )}
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {approvedContractors.length} approved total
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Live from Contractor Registration · <span className="font-semibold text-emerald-700">Eligible</span> = approved &amp; not yet engaged (decreases when a contract is created) · <span className="font-semibold text-sky-700">Engaged</span> = already hold a contract · One contractor can hold many contracts · Click <span className="font-semibold text-emerald-700">Initiate Contract</span> any time to start a new contract with that contractor pre-selected.
              </p>
            </div>
          </div>
          {approvedContractors.length > 0 && (
            <div className="relative w-full xl:max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={contractorSearch}
                onChange={(e) => setContractorSearch(e.target.value)}
                placeholder="Search approved contractors..."
                className="w-full rounded-xl border border-emerald-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          )}
        </div>

        {/* ── Unified Single-Row Filter ───────────────────────────────────
             One row with mutually-exclusive chips: All · Individual ·
             Business · Goods · Services · Works. Each chip shows live
             counts derived from approvedContractors via the chip's own
             match() predicate, so adding new contractors instantly
             updates the numbers. */}
        {approvedContractors.length > 0 && (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-white/70 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Filter Contractors</h3>
                {activeFilterCount > 0 ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Filtering by:
                    </span>
                    {activeTypeChip && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white"
                        title={`Contractor Category: ${activeTypeChip.label}`}
                      >
                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {activeTypeChip.label}
                      </span>
                    )}
                    {activeTypeChip && activeCategoryChip && (
                      <span className="text-[10px] font-bold text-slate-400">×</span>
                    )}
                    {activeCategoryChip && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-bold text-white"
                        title={`Contract Category: ${activeCategoryChip.label}`}
                      >
                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {activeCategoryChip.label}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {intersectedPool.length} match{intersectedPool.length === 1 ? "" : "es"}
                    </span>
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                    Showing all ({approvedContractors.length})
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllChips}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {/* All chip — clears BOTH axes at once */}
              <button
                onClick={clearAllChips}
                className={`rounded-xl border px-4 py-2 text-left transition-all ${
                  activeFilterCount === 0
                    ? "border-emerald-600 bg-emerald-600 text-white shadow"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                }`}
              >
                <p className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${activeFilterCount === 0 ? "text-emerald-100" : "text-slate-400"}`}>All Contractors</p>
                <p className="mt-0.5 text-base font-bold leading-tight">{approvedContractors.length}</p>
              </button>

              {filterChipDisplay
                .filter((d) => d.visible)
                .map(({ chip, count }) => {
                  const active =
                    (chip.group === "type" && chip.key === activeType) ||
                    (chip.group === "category" && chip.key === activeCategory);
                  /* Color-code: contractor types (emerald), contract categories (sky) */
                  const isCategoryChip = chip.group === "category";
                  const activeBorder = isCategoryChip ? "border-sky-600 bg-sky-600" : "border-emerald-600 bg-emerald-600";
                  const hoverBorder = isCategoryChip ? "hover:border-sky-300" : "hover:border-emerald-300";
                  const labelColor = active ? (isCategoryChip ? "text-sky-100" : "text-emerald-100") : "text-slate-400";
                  return (
                    <button
                      key={chip.key}
                      onClick={() => toggleChip(chip)}
                      className={`rounded-xl border px-4 py-2 text-left transition-all ${
                        active
                          ? `${activeBorder} text-white shadow`
                          : `border-slate-200 bg-white text-slate-700 ${hoverBorder}`
                      }`}
                    >
                      <p className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${labelColor}`}>{chip.label}</p>
                      <p className="mt-0.5 text-base font-bold leading-tight">{count}</p>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {approvedContractors.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-emerald-300 bg-white px-5 py-8 text-center">
            <svg className="mx-auto h-9 w-9 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="mt-3 text-sm font-semibold text-slate-700">No approved contractors yet</p>
            <p className="mt-1 text-xs text-slate-500">Complete a contractor registration approval in the Contractor Registration module to see eligible contractors here.</p>
          </div>
        ) : filteredApprovedContractors.length === 0 ? (
          <p className="mt-5 text-center text-xs text-slate-500">No approved contractors match "{contractorSearch}".</p>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="mt-5 hidden min-w-0 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_16px_40px_rgba(16,185,129,0.08)] lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-emerald-50/80">
                  <tr className="border-b border-emerald-100 text-left">
                    {["SI", "Contractor ID", "Name", "Contractor Category", "Contract Category", "Registration No.", "Bank", "Contracts", "Status", "Action"].map((h) => (
                      <th key={h} className="px-5 py-4 font-semibold text-emerald-800 text-[10px] uppercase tracking-[0.18em] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedApprovedContractors.map((c, index) => {
                    const stats = contractsByContractor.get(c.id);
                    const hasContracts = (stats?.count ?? 0) > 0;
                    return (
                      <tr key={c.id} className="border-b border-emerald-50 last:border-0 align-top transition hover:bg-emerald-50/40">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-semibold text-slate-700">
                            {c.id}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[220px]">
                            <p className="text-sm font-semibold leading-5 text-slate-900">{c.displayName}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{c.email || c.phone || "Registered contractor"}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200"
                            title="Contractor Category — Individual / Business"
                          >
                            {c.contractorType || (c.kind === "business" ? "Business Contractor" : "Individual Contractor")}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {(() => {
                            const cc = normalizeContractCategory(c.contractualType);
                            return cc ? (
                              <span
                                title={`Contract Category — Master Data \u2192 contract-category (SRS DD 14.1.22). Resolved \u201C${c.contractualType}\u201D \u2192 \u201C${cc}\u201D.`}
                                className="inline-flex w-fit rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200"
                              >
                                {cc}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-700 whitespace-nowrap">{c.registrationNumber || "—"}</td>
                        <td className="px-5 py-4">
                          <div className="max-w-[180px] truncate text-xs text-slate-700">{c.bankName || "—"}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {hasContracts ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                {stats!.count} contract{stats!.count > 1 ? "s" : ""}
                              </span>
                              <span className="text-[10px] text-slate-500">Total: Nu. {formatNu(stats!.totalValue)}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">No contracts yet</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            Approved
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            onClick={() => onNewContract(c.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                            title={hasContracts ? `Add another contract for ${c.displayName}` : `Start the first contract for ${c.displayName}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            {hasContracts ? "Initiate Another" : "Initiate Contract"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Mobile / tablet card view */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:hidden">
              {displayedApprovedContractors.map((c, index) => {
                const stats = contractsByContractor.get(c.id);
                const hasContracts = (stats?.count ?? 0) > 0;
                return (
                  <div key={c.id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-100/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            SI {index + 1}
                          </span>
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-700">
                            {c.id}
                          </span>
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                            Approved
                          </span>
                          {hasContracts && (
                            <span className="inline-flex rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-700">
                              {stats!.count} contract{stats!.count > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm font-bold leading-5 text-slate-900">{c.displayName}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{c.contractorType || "Registered contractor"}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium capitalize text-slate-700">
                        {c.kind}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Registration</p>
                        <p className="mt-1 text-slate-700">{c.registrationNumber || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bank</p>
                        <p className="mt-1 truncate text-slate-700">{c.bankName || "—"}</p>
                      </div>
                      {hasContracts && (
                        <div className="rounded-xl bg-sky-50 px-3 py-2 sm:col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-500">Existing contracts</p>
                          <p className="mt-1 text-sky-800">{stats!.count} · Total Nu. {formatNu(stats!.totalValue)}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onNewContract(c.id)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                      {hasContracts ? "Initiate Another Contract" : "Initiate Contract"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {displayedApprovedContractors.length} of {filteredApprovedContractors.length} approved contractor{filteredApprovedContractors.length === 1 ? "" : "s"}
              </span>
              {filteredApprovedContractors.length > 6 && (
                <button
                  onClick={() => setShowAllApproved((v) => !v)}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                >
                  {showAllApproved ? "Show fewer" : `Show all ${filteredApprovedContractors.length}`}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Contract Table ── */}
      <div className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.05)] sm:p-7">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Contract Workspace</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Contract Management</h2>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {STATS.map((s) => (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className={`min-w-0 rounded-2xl border p-4 text-left transition-all ${
                  filter === s.key
                    ? "border-[#2563eb] bg-[#2563eb] text-white shadow-lg"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${filter === s.key ? "text-slate-300" : "text-slate-500"}`}>{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${filter === s.key ? "text-white" : "text-slate-900"}`}>{s.count}</p>
              </button>
            ))}
          </div>

          {counts.submitted > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 animate-pulse">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-900">{counts.submitted} contract{counts.submitted > 1 ? "s" : ""} awaiting approval</p>
                <p className="mt-0.5 text-xs text-amber-600">Submitted contracts need Technical Approver review to proceed.</p>
              </div>
              <button onClick={() => setFilter("submitted")} className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition">
                Review Now
              </button>
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search by title, ID, contractor, agency..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-100 transition"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <div />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            <p className="text-sm text-slate-400">{search ? "No contracts match your search." : "No contracts created yet."}</p>
            <ActionButton onClick={() => onNewContract()} className="mt-4" variant="primary" size="md">
              Create First Contract
            </ActionButton>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="mt-4 hidden min-w-0 overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] lg:block">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-separate border-spacing-y-3 text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    {["SI", "Contract ID", "Title", "Method", "Category", "Value (Nu.)", "Contractor", "Status", "Approver", "Submitted", "Actions"].map((h) => (
                      <th key={h} className="px-3 pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-[0.16em] whitespace-nowrap first:pl-4 last:pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, index) => {
                    const isExpanded = expandedId === c.id;
                    const canApprove = [...APPROVAL_CHAIN.map((s) => s.key), "submitted"].includes(c.workflowStatus) && c.workflowStatus !== "approved";
                    return (
                      <React.Fragment key={c.id}>
                      <tr className="group">
                        <td className="border-b border-l border-t border-slate-200/90 bg-white py-4 pl-4 pr-3 whitespace-nowrap shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">
                          <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {index + 1}
                          </span>
                        </td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 font-mono text-xs font-semibold whitespace-nowrap text-indigo-600 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">{c.contractId}</td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">
                          <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="text-left">
                            <span className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900 transition hover:text-indigo-700">{c.contractTitle || "Untitled"}</span>
                          </button>
                        </td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{methodLabel(c.method)}</span>
                            {c.formData?.fieldChanges?.length > 0 && (
                              <span
                                title={`${c.formData.fieldChanges.length} imported field(s) edited by admin — see audit trail`}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200"
                              >
                                ✎ {c.formData.fieldChanges.length} edited
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 text-xs text-slate-600 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">{c.contractCategory.join(", ") || "—"}</td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 font-mono text-xs text-slate-700 whitespace-nowrap shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">{c.contractValue || "—"}</td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 text-xs text-slate-600 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">
                          <div className="max-w-[170px]">
                            <p className="font-medium leading-5 text-slate-700">{c.contractorName || "—"}</p>
                          </div>
                        </td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusBadgeClass(c.workflowStatus)}`}>
                            {statusLabel(c.workflowStatus)}
                          </span>
                        </td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 text-xs text-slate-500 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">
                          <div className="max-w-[110px] leading-5">{c.currentApprover || "—"}</div>
                        </td>
                        <td className="border-y border-slate-200/90 bg-white px-3 py-4 text-xs text-slate-400 whitespace-nowrap shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">{c.submittedAt ? new Date(c.submittedAt.replace(" ", "T")).toLocaleDateString() : "—"}</td>
                        <td className="border-b border-r border-t border-slate-200/90 bg-white px-3 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] transition-colors group-hover:border-slate-300 group-hover:bg-slate-50">
                          <div className="flex min-w-[190px] flex-wrap items-center gap-2">
                            <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className={actionButtonClass("secondary", "xs", "gap-1.5")}>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              {isExpanded ? "Close" : "View"}
                            </button>
                            <button onClick={() => onEditContract(c)} className={actionButtonClass("info-soft", "xs", "gap-1.5")}>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              Edit
                            </button>
                            <button onClick={() => onAmendContract(c)} className={actionButtonClass("violet-soft", "xs", "gap-1.5")}>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h6m-6 5h8M6 3h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" /></svg>
                              Amend
                            </button>
                            {canApprove && (
                              <>
                                <button onClick={() => setApprovalDialog({ contract: c, action: "approve" })} className={actionButtonClass("success", "xs", "gap-1.5")}>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  Approve
                                </button>
                                <button onClick={() => setApprovalDialog({ contract: c, action: "reject" })} className={actionButtonClass("danger-soft", "xs", "gap-1.5")}>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => setDeleteDialog(c)} className={actionButtonClass("ghost", "xs", "p-1.5")} title="Delete">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* ── Expanded Detail Row ── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="px-3 pb-2 pt-0">
                            <div className="space-y-4 border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-5 py-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                              {/* Detail grid */}
                              <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
                                {[
                                  { l: "Agency", v: c.agencyName },
                                  { l: "Contractor ID", v: c.contractorId },
                                  { l: "Funding Source", v: c.fundingSource },
                                  { l: "Expenditure Type", v: c.expenditureType },
                                  { l: "Classification", v: c.contractClassification },
                                  { l: "Period", v: c.startDate && c.endDate ? `${c.startDate} to ${c.endDate}` : "—" },
                                  { l: "Submitted", v: c.submittedAt || "—" },
                                  { l: "Approved", v: c.approvedAt || "—" },
                                ].map((d) => (
                                  <div key={d.l}>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{d.l}</p>
                                    <p className="mt-0.5 text-xs text-slate-700">{d.v || "—"}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Approval chain */}
                              {c.workflowStatus !== "draft" && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-slate-500 mr-1">Workflow:</span>
                                  {APPROVAL_CHAIN.map((step, i) => {
                                    const stages = APPROVAL_CHAIN.map((s) => s.key);
                                    const currentIdx = stages.indexOf(c.workflowStatus);
                                    const isDone = c.workflowStatus === "approved" || i < currentIdx;
                                    const isCurrent = i === currentIdx && c.workflowStatus !== "rejected";
                                    return (
                                      <div key={step.key} className="flex items-center gap-1">
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${isDone ? "bg-emerald-100 text-emerald-700" : isCurrent ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300" : "bg-slate-100 text-slate-400"}`}>
                                          {isDone ? "✓" : isCurrent ? "●" : "○"} {step.short}
                                        </span>
                                        {i < APPROVAL_CHAIN.length - 1 && <span className="text-slate-300 text-[8px]">→</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Remarks */}
                              {c.approvalRemarks && (
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Remarks</p>
                                  <p className="mt-1 text-xs text-slate-700">{c.approvalRemarks}</p>
                                </div>
                              )}

                              {/* ── Audit trail (system-fed methods only) ── */}
                              {c.method && c.method !== "manual" && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                      Audit Trail — {methodLabel(c.method)} Import
                                    </p>
                                    <span className="text-[9px] font-semibold text-amber-700">
                                      {c.formData?.fieldChanges?.length || 0} field(s) edited by admin
                                    </span>
                                  </div>
                                  {c.formData?.fieldChanges?.length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-left text-[9px] uppercase tracking-wider text-amber-700/80">
                                            <th className="py-1 pr-3 font-bold">Field</th>
                                            <th className="py-1 pr-3 font-bold">Imported (from {methodLabel(c.method)})</th>
                                            <th className="py-1 pr-3 font-bold">Admin Override</th>
                                            <th className="py-1 font-bold">Edited At</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {c.formData.fieldChanges.map((ch) => (
                                            <tr key={ch.field} className="border-t border-amber-100">
                                              <td className="py-1.5 pr-3 font-semibold text-slate-700">{ch.label}</td>
                                              <td className="py-1.5 pr-3">
                                                <span className="inline-block rounded bg-white px-2 py-0.5 text-[10px] text-slate-500 line-through ring-1 ring-slate-200">
                                                  {ch.originalValue || "—"}
                                                </span>
                                              </td>
                                              <td className="py-1.5 pr-3">
                                                <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                  {ch.currentValue || "—"}
                                                </span>
                                              </td>
                                              <td className="py-1.5 text-[10px] text-slate-500">
                                                {ch.editedAt ? new Date(ch.editedAt).toLocaleString() : "—"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-600">
                                      All imported values were approved as-is. No admin overrides recorded.
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Actions row */}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button onClick={() => onEditContract(c)} className={actionButtonClass("info-soft", "xs")}>Edit Contract</button>
                                <button onClick={() => onAmendContract(c)} className={actionButtonClass("violet-soft", "xs")}>Amend Contract</button>
                                {canApprove && (
                                  <>
                                    <button onClick={() => setApprovalDialog({ contract: c, action: "approve" })} className={actionButtonClass("success", "xs")}>
                                      {APPROVAL_CHAIN.length > 0 && c.workflowStatus === APPROVAL_CHAIN[APPROVAL_CHAIN.length - 1].key ? "Final Approve" : "Approve"}
                                    </button>
                                    <button onClick={() => setApprovalDialog({ contract: c, action: "reject" })} className={actionButtonClass("danger", "xs")}>Reject</button>
                                    <button onClick={() => setApprovalDialog({ contract: c, action: "send-back" })} className={actionButtonClass("secondary", "xs")}>Send Back</button>
                                  </>
                                )}
                                <button onClick={() => setDeleteDialog(c)} className={actionButtonClass("danger-soft", "xs")}>Delete</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 lg:hidden">
              {filtered.map((c, index) => {
                const isExpanded = expandedId === c.id;
                const canApprove = [...APPROVAL_CHAIN.map((s) => s.key), "submitted"].includes(c.workflowStatus) && c.workflowStatus !== "approved";
                return (
                  <div key={c.id} className={`rounded-[24px] border bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] ${canApprove ? "border-amber-200" : "border-slate-200"}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                            {index + 1}
                          </span>
                          <p className="font-mono text-[10px] text-indigo-600">{c.contractId}</p>
                        </div>
                        <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900">{c.contractTitle || "Untitled"}</p>
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-slate-700 transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} /></svg>
                      </button>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{methodLabel(c.method)}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusBadgeClass(c.workflowStatus)}`}>{statusLabel(c.workflowStatus)}</span>
                      {c.contractCategory[0] && <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600">{c.contractCategory[0]}</span>}
                      {c.formData?.fieldChanges?.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-200">
                          ✎ {c.formData.fieldChanges.length} edited
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Contractor</p>
                        <p className="mt-1 text-slate-700">{c.contractorName || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Value</p>
                        <p className="mt-1 font-mono text-slate-700">{c.contractValue || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Approver</p>
                        <p className="mt-1 text-slate-700">{c.currentApprover || "—"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Submitted</p>
                        <p className="mt-1 text-slate-700">{c.submittedAt ? new Date(c.submittedAt.replace(" ", "T")).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                        {/* Detail grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { l: "Agency", v: c.agencyName },
                            { l: "Funding", v: c.fundingSource },
                            { l: "Period", v: c.startDate && c.endDate ? `${c.startDate} to ${c.endDate}` : "—" },
                            { l: "Classification", v: c.contractClassification },
                          ].map((d) => (
                            <div key={d.l}>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{d.l}</p>
                              <p className="text-xs text-slate-700">{d.v || "—"}</p>
                            </div>
                          ))}
                        </div>

                        {/* Approval chain */}
                        {c.workflowStatus !== "draft" && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {APPROVAL_CHAIN.map((step, i) => {
                              const stages = APPROVAL_CHAIN.map((s) => s.key);
                              const currentIdx = stages.indexOf(c.workflowStatus);
                              const isDone = c.workflowStatus === "approved" || i < currentIdx;
                              const isCurrent = i === currentIdx && c.workflowStatus !== "rejected";
                              return (
                                <div key={step.key} className="flex items-center gap-1">
                                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${isDone ? "bg-emerald-100 text-emerald-700" : isCurrent ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300" : "bg-slate-100 text-slate-400"}`}>
                                    {isDone ? "✓" : isCurrent ? "●" : "○"} {step.short}
                                  </span>
                                  {i < APPROVAL_CHAIN.length - 1 && <span className="text-slate-300 text-[8px]">→</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Audit trail (system-fed only) */}
                        {c.method && c.method !== "manual" && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                              Audit Trail — {methodLabel(c.method)} ({c.formData?.fieldChanges?.length || 0} edited)
                            </p>
                            {c.formData?.fieldChanges?.length > 0 ? (
                              <ul className="space-y-1">
                                {c.formData.fieldChanges.map((ch) => (
                                  <li key={ch.field} className="text-[10px]">
                                    <span className="font-semibold text-slate-700">{ch.label}: </span>
                                    <span className="text-slate-500 line-through">{ch.originalValue || "—"}</span>
                                    <span className="text-slate-400"> → </span>
                                    <span className="font-semibold text-emerald-700">{ch.currentValue || "—"}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[10px] text-slate-600">All imported values approved as-is.</p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {canApprove && (
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setApprovalDialog({ contract: c, action: "approve" })} className={actionButtonClass("success", "xs", "gap-1.5")}>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              {APPROVAL_CHAIN.length > 0 && c.workflowStatus === APPROVAL_CHAIN[APPROVAL_CHAIN.length - 1].key ? "Final Approve" : "Approve"}
                            </button>
                            <button onClick={() => setApprovalDialog({ contract: c, action: "reject" })} className={actionButtonClass("danger", "xs", "gap-1.5")}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Reject</button>
                            <button onClick={() => setApprovalDialog({ contract: c, action: "send-back" })} className={actionButtonClass("secondary", "xs", "gap-1.5")}><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7 7-7" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" /></svg>Send Back</button>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <button onClick={() => onEditContract(c)} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>Edit</button>
                          <button onClick={() => onAmendContract(c)} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 12h6m-6 5h8M6 3h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" /></svg>Amend</button>
                          <button onClick={() => setDeleteDialog(c)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Approval Workflow Reference ── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Approval Workflow — Dynamic (PRN 2.1)</p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
          {APPROVAL_CHAIN.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2">
              <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 font-semibold">{step.role}</span>
              {i < APPROVAL_CHAIN.length - 1 && <span className="text-slate-400">→</span>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Each approver can approve (forward to next), reject, or send back for corrections.</p>
      </div>

      {approvalDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <h3 className="text-xl font-bold text-slate-900">
              {approvalDialog.action === "approve" ? "Approve Contract" : approvalDialog.action === "reject" ? "Reject Contract" : "Send Back for Correction"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {approvalDialog.contract.contractTitle || approvalDialog.contract.contractId}
            </p>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Remarks
              <textarea
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-inner focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="Add optional review remarks"
              />
            </label>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setApprovalDialog(null);
                  setActionRemarks("");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  advanceWorkflow(approvalDialog.contract.id, approvalDialog.action);
                  setApprovalDialog(null);
                }}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white ${
                  approvalDialog.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : approvalDialog.action === "reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <h3 className="text-xl font-bold text-slate-900">Delete Contract</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-800">{deleteDialog.contractTitle || deleteDialog.contractId}</span>? This will remove the stored contract record and its amendment draft.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteContract(deleteDialog.id);
                  setDeleteDialog(null);
                }}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* Keep backward-compatible exports */
export function ContractApprovalQueue() {
  return <ContractListView onNewContract={() => {}} onEditContract={() => {}} onAmendContract={() => {}} />;
}
