import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { contractorMasterData as defaultMasterData, type MasterDataGroup } from "../data/masterData";

interface MasterDataContextValue {
  masterData: MasterDataGroup[];
  masterDataMap: Map<string, string[]>;
  addValueToGroup: (groupId: string, value: string) => void;
  removeValueFromGroup: (groupId: string, value: string) => void;
}

const MASTER_DATA_KEY = "ifmis-master-data";
const MASTER_DATA_API = "/api/master-data";
const GENDER_VALUES = ["Male", "Female", "Others"];

/** These groups are derived from authoritative external registries (UCoA hierarchy, RMA bank registry) and always use code defaults.
 *  All other groups (nationality, contractor-category, contractor-type, etc.) are user-managed via the Admin master data page. */
const AUTHORITATIVE_GROUP_IDS = new Set(["gewog", "dungkhag", "thromde", "dzongkhag", "bank-name"]);

/** Per-group seed-version map. When the version of a group is bumped here, the next page load
 *  will FORCE-replace any cached values in localStorage with the latest defaults from masterData.ts.
 *  Use this when an admin needs to ship a curated list change (e.g. updated SRS LoVs) without
 *  asking every user to clear their browser cache. Increment the suffix to trigger re-seed. */
const FORCED_SEED_VERSIONS: Record<string, string> = {
  "advance-imprest-purpose": "2026-04-08-v2",
  "advance-imprest-budget-code": "2026-04-08-v1",
  /* SRS Contract_Category (DD 14.1.22 / LoV 7.4) — Goods/Works/Services. Force-seeded so the
     entry shows up immediately for admins who already have a stale localStorage snapshot. */
  "contract-category": "2026-04-08-v1",
  /* Alias group exposing the same taxonomy under the "Contract Type" label so admins searching
     for either name find the canonical list. */
  "contract-type": "2026-04-08-v1",
  /* Debt Payment Management — SRS PRN 6.1. New module shipped 2026-04-08; force-seed
     so admins immediately see every Debt LoV without clearing browser storage. */
  "debt-creditor-type": "2026-04-08-v1",
  "debt-data-source": "2026-04-08-v1",
  "debt-category": "2026-04-08-v1",
  "debt-payment-type": "2026-04-08-v1",
  "debt-payment-status": "2026-04-08-v1",
  "debt-loan-term-unit": "2026-04-08-v1",
  "debt-amortization-schedule": "2026-04-08-v1",
  "debt-payment-order-channel": "2026-04-08-v1",
  "debt-source-of-fund": "2026-04-08-v1",
  "debt-applicable-deduction": "2026-04-08-v1",
  "debt-meridian-action": "2026-04-08-v1",
  "debt-validation-rule": "2026-04-08-v1",
  /* Canonicalisation pass 2026-04-09 — force-reseed the shared LoVs so
     every admin immediately sees the consolidated currency / payment
     frequency / approval level / approval decision lists. */
  "currency-type": "2026-04-09-canonical-v1",
  "approval-decision": "2026-04-09-canonical-v1",
  "approval-level": "2026-04-09-canonical-v1",
  "payment-frequency": "2026-04-09-canonical-v1",
  "esg-category": "2026-04-09-canonical-v1",
  /* Utility Management — SRS PRN 5.1 service provider catalogue.
     Force-seeded 2026-04-09 so the five authoritative providers and
     their per-provider service-type LoVs appear instantly on every
     browser without requiring a manual cache clear. */
  "utility-service-provider": "2026-04-09-utility-srs-v1",
  "utility-service-type-bhutan-telecom-ltd": "2026-04-09-utility-srs-v1",
  "utility-service-type-tashi-cell": "2026-04-09-utility-srs-v1",
  "utility-service-type-bhutan-power-corporation-ltd": "2026-04-09-utility-srs-v1",
  "utility-service-type-bhutan-starlink": "2026-04-09-utility-srs-v1",
  "utility-service-type-municipalities-thromdes": "2026-04-09-utility-srs-v1",
  /* SRS DD 19.3 — authoritative Utility Type LoV
     (Electricity / Sewerage / Water / Telephone / Internet/Leasedline /
     Gasoline). Force-reseed so cached admin browsers replace the
     legacy Electricity/Water/Phone/Internet/Gas/Postal values. */
  "utility-type": "2026-04-09-srs-dd19-v1",
  "utility-billing-cycle": "2026-04-09-srs-dd19-v1",
  "utility-status": "2026-04-09-srs-dd19-v1",
  "utility-bill-status": "2026-04-09-srs-dd19-v1",
  "utility-bill-source": "2026-04-09-srs-dd19-v1",
  /* Payroll Module — SRS V1 master data groups. Force-seeded 2026-04-10
     so every browser immediately gets payroll LoVs without cache clear. */
  "payroll-employee-category": "2026-04-15-payroll-v2",
  "payroll-employee-type": "2026-04-15-payroll-v1",
  "payroll-employee-status": "2026-04-10-payroll-v1",
  "payroll-data-source": "2026-04-10-payroll-v1",
  "payroll-nppf-tier": "2026-04-10-payroll-v1",
  "payroll-tds-slab": "2026-04-10-payroll-v1",
  "payroll-gis-slab": "2026-04-10-payroll-v1",
  "payroll-one-off-fixed": "2026-04-10-payroll-v1",
  "payroll-advance-rules": "2026-04-10-payroll-v1",
  "payroll-frequency": "2026-04-10-payroll-v1",
  "payroll-allowance-calc-method": "2026-04-10-payroll-v1",
  "payroll-deduction-category": "2026-04-10-payroll-v1",
  "payroll-remit-to": "2026-04-10-payroll-v1",
  "musterroll-beneficiary-type": "2026-04-10-payroll-v1",
  "musterroll-payment-frequency": "2026-04-10-payroll-v1",
  "musterroll-project-status": "2026-04-10-payroll-v1",
  "sitting-fee-category": "2026-04-10-payroll-v1",
};

/** Legacy → canonical key migration map.
 *  On boot we merge any values still sitting under a legacy prefixed key into
 *  the canonical key (dedup-preserving case-insensitive match), then drop the
 *  legacy key from storage. Written once per browser via LEGACY_MIGRATION_KEY
 *  so admins never see a duplicate list in /master-data. */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  "sc-currency": "currency-type",
  "fi-currency": "currency-type",
  "soe-currency": "currency-type",
  "debt-payment-currency": "currency-type",

  "sc-payment-frequency": "payment-frequency",
  "vendor-payment-frequency": "payment-frequency",
  "rental-payment-frequency": "payment-frequency",
  "debt-repayment-frequency": "payment-frequency",
  "soe-frequency": "payment-frequency",

  "sc-approval-level": "approval-level",
  "sb-approval-level": "approval-level",
  "fi-approval-level": "approval-level",
  "soe-approval-level": "approval-level",

  "sc-approval-decision": "approval-decision",
  "sb-approval-decision": "approval-decision",
  "fi-approval-decision": "approval-decision"
};
const LEGACY_MIGRATION_KEY = "ifmis-master-data-legacy-migration";
const LEGACY_MIGRATION_VERSION = "2026-04-09-canonical-v1";
const FORCED_SEED_VERSION_KEY = "ifmis-master-data-seed-versions";

const MasterDataContext = createContext<MasterDataContextValue | null>(null);

/**
 * Read master data from localStorage.
 *
 * KEY DESIGN: localStorage is the single source of truth for user-managed groups.
 * Once a user adds or deletes a value from a group (e.g. nationality), that decision
 * is permanent until the user explicitly changes it again.
 *
 * - First-ever load (no key in localStorage): seed from code defaults and save immediately.
 * - Subsequent loads: use stored data as-is. Only inject brand-new groups that were added
 *   in a code update and don't yet exist in the stored data (forward-compatibility).
 * - Authoritative groups (dzongkhag, gewog, etc.) always use code defaults.
 * - Gender is constrained to the fixed set.
 */
function readStorage(): MasterDataGroup[] {
  if (typeof window === "undefined") {
    return defaultMasterData;
  }

  const raw = window.localStorage.getItem(MASTER_DATA_KEY);

  /* ── First-ever load: no key exists yet → seed from defaults ── */
  if (raw === null) {
    window.localStorage.setItem(MASTER_DATA_KEY, JSON.stringify(defaultMasterData));
    return defaultMasterData;
  }

  try {
    let parsed = JSON.parse(raw) as MasterDataGroup[];

    /* If stored array is somehow empty, treat as first load */
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(MASTER_DATA_KEY, JSON.stringify(defaultMasterData));
      return defaultMasterData;
    }

    /* ══════════════════════════════════════════════════════════════════
       LEGACY → CANONICAL MIGRATION
       ──────────────────────────────────────────────────────────────────
       Runs once per browser (gated by LEGACY_MIGRATION_KEY). For every
       entry in LEGACY_TO_CANONICAL we:
         1. Merge the legacy group's values into the canonical group
            (case-insensitive dedup, preserve the canonical group's
            existing order, then append any extras the legacy group had).
         2. Delete the legacy group entirely.
       This is how "Declare once, use everywhere" ships retroactively:
       users keep every value they had previously populated, but the
       registry now reads from a single canonical key.
       ══════════════════════════════════════════════════════════════════ */
    try {
      const migrationVersion = window.localStorage.getItem(LEGACY_MIGRATION_KEY);
      if (migrationVersion !== LEGACY_MIGRATION_VERSION) {
        const byId = new Map(parsed.map((g) => [g.id, g] as const));
        for (const [legacyId, canonicalId] of Object.entries(LEGACY_TO_CANONICAL)) {
          const legacyGroup = byId.get(legacyId);
          if (!legacyGroup) continue;

          let canonicalGroup = byId.get(canonicalId);
          if (!canonicalGroup) {
            /* Canonical group doesn't exist yet — clone the legacy one but
               rebrand it with the canonical id so later passes pick up the
               latest defaults from code via AUTHORITATIVE / FORCED_SEED. */
            const defaultCanonical = defaultMasterData.find((d) => d.id === canonicalId);
            canonicalGroup = defaultCanonical
              ? { ...defaultCanonical }
              : { id: canonicalId, title: legacyGroup.title, description: legacyGroup.description, values: [] };
            byId.set(canonicalId, canonicalGroup);
          }

          const existingLower = new Set(canonicalGroup.values.map((v) => v.trim().toLowerCase()));
          const merged = [...canonicalGroup.values];
          for (const v of legacyGroup.values) {
            const norm = v.trim().toLowerCase();
            if (!existingLower.has(norm)) {
              merged.push(v);
              existingLower.add(norm);
            }
          }
          canonicalGroup.values = merged;

          /* Drop the legacy group from the registry. */
          byId.delete(legacyId);
        }
        parsed = Array.from(byId.values());
        window.localStorage.setItem(MASTER_DATA_KEY, JSON.stringify(parsed));
        window.localStorage.setItem(LEGACY_MIGRATION_KEY, LEGACY_MIGRATION_VERSION);
      }
    } catch {
      /* Never block boot on a migration failure — fall through with the
         un-migrated registry and rely on force-seed to recover. */
    }

    const storedMap = new Map(parsed.map((group) => [group.id, group]));

    /* Read previously-applied forced-seed versions from localStorage */
    let appliedVersions: Record<string, string> = {};
    try {
      const rawV = window.localStorage.getItem(FORCED_SEED_VERSION_KEY);
      if (rawV) appliedVersions = JSON.parse(rawV) as Record<string, string>;
    } catch {
      appliedVersions = {};
    }

    /* Start from stored data as the base (authoritative for user-managed groups) */
    const result: MasterDataGroup[] = [];

    /* First pass: iterate stored groups and apply overrides only for authoritative/gender/forced-seed */
    for (const storedGroup of parsed) {
      if (AUTHORITATIVE_GROUP_IDS.has(storedGroup.id)) {
        /* Authoritative groups always use latest code defaults */
        const defaultGroup = defaultMasterData.find((d) => d.id === storedGroup.id);
        result.push(defaultGroup ?? storedGroup);
      } else if (storedGroup.id === "gender") {
        result.push({
          ...storedGroup,
          values: storedGroup.values.filter((value) => GENDER_VALUES.includes(value))
        });
      } else if (FORCED_SEED_VERSIONS[storedGroup.id] && appliedVersions[storedGroup.id] !== FORCED_SEED_VERSIONS[storedGroup.id]) {
        /* Forced-seed group with a new version → replace with latest code defaults */
        const defaultGroup = defaultMasterData.find((d) => d.id === storedGroup.id);
        result.push(defaultGroup ?? storedGroup);
      } else {
        /* User-managed group → use stored values as-is (respecting deletions) */
        result.push(storedGroup);
      }
    }

    /* Persist the now-applied seed versions so we don't re-force on every load */
    try {
      window.localStorage.setItem(FORCED_SEED_VERSION_KEY, JSON.stringify(FORCED_SEED_VERSIONS));
    } catch {
      /* ignore quota errors */
    }

    /* Second pass: inject any brand-new groups from defaults that don't exist in storage
       (forward-compatibility when code adds new master data groups in future updates) */
    for (const defaultGroup of defaultMasterData) {
      if (!storedMap.has(defaultGroup.id)) {
        result.push(defaultGroup);
      }
    }

    return result;
  } catch {
    return defaultMasterData;
  }
}

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [masterData, setMasterData] = useState<MasterDataGroup[]>(() => readStorage());

  useEffect(() => {
    let active = true;

    async function pushLocalStateToSharedStore() {
      try {
        await fetch(MASTER_DATA_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(masterData)
        });
      } catch {
        /* Keep localStorage as fallback if the shared dev API is unavailable. */
      }
    }

    async function hydrateFromSharedStore() {
      try {
        const response = await fetch(MASTER_DATA_API, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load shared master data");
        }
        const remote = (await response.json()) as MasterDataGroup[];
        if (!active || !Array.isArray(remote) || remote.length === 0) {
          return;
        }

        /* Admin app remains the authoritative source: preserve current effective local admin data. */
        await pushLocalStateToSharedStore();
      } catch {
        /* Fall back to localStorage-only behavior when the shared API is not available. */
      }
    }

    void hydrateFromSharedStore();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MASTER_DATA_KEY, JSON.stringify(masterData));
  }, [masterData]);

  useEffect(() => {
    void (async () => {
      try {
        await fetch(MASTER_DATA_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(masterData)
        });
      } catch {
        /* Keep localStorage as fallback if the shared dev API is unavailable. */
      }
    })();
  }, [masterData]);

  const value = useMemo<MasterDataContextValue>(
    () => ({
      masterData,
      masterDataMap: new Map(masterData.map((group) => [group.id, group.values])),
      addValueToGroup: (groupId, value) => {
        const cleanValue = value.trim();

        if (!cleanValue) {
          return;
        }

        setMasterData((current) =>
          current.map((group) =>
            group.id !== groupId || group.values.includes(cleanValue)
              ? group
              : { ...group, values: [...group.values, cleanValue] }
          )
        );
      },
      removeValueFromGroup: (groupId, value) => {
        setMasterData((current) =>
          current.map((group) =>
            group.id !== groupId
              ? group
              : { ...group, values: group.values.filter((item) => item !== value) }
          )
        );
      }
    }),
    [masterData]
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
}

export function useMasterData() {
  const context = useContext(MasterDataContext);

  if (!context) {
    throw new Error("useMasterData must be used within MasterDataProvider");
  }

  return context;
}
