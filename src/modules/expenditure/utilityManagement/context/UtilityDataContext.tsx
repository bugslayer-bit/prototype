/* ═══════════════════════════════════════════════════════════════════════════
   UtilityDataContext
   ─────────────────
   Single source of truth for Utility Management records (SRS PRN 5.1).
   Persists to localStorage so records survive reloads.

   Seed behaviour
   --------------
   Six utility provider accounts (SRS rows 74-76) are shipped as seed via
   `utilitySeed.ts`. On every read we MERGE the seed with whatever the
   user has in localStorage. The user's copy ALWAYS wins — so editing a
   seeded provider, toggling autoPayment, changing budget, or pushing a
   bill from Pending → Paid dynamically updates and persists. Fresh
   installs (no localStorage) start from the six seeds.
   ═══════════════════════════════════════════════════════════════════════════ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoredUtility } from "../types";
import { SEED_UTILITIES } from "../utilitySeed";

interface UtilityDataContextValue {
  records: StoredUtility[];
  addUtility: (record: StoredUtility) => void;
  updateUtility: (id: string, patch: Partial<StoredUtility>) => void;
  removeUtility: (id: string) => void;
  generateNextUtilityId: () => string;
  generateNextBillId: () => string;
  generateNextRecordId: () => string;
}

const LS_KEY = "ifmis_utilities_v1";
/* Seed version — bump this whenever the canonical seed in utilitySeed.ts
   changes so cached admin browsers get the new provider names/types
   without a manual cache clear. User-added records (ids not in the
   seed set) are preserved across the reseed. */
const SEED_VERSION_KEY = "ifmis_utilities_seed_version";
const SEED_VERSION = "2026-04-10-ucoa-25records-v2";
const UtilityDataContext = createContext<UtilityDataContextValue | null>(null);

/* Merge the seed with whatever is in localStorage so we don't clobber
   edits made by the user. The user record wins when ids collide; the
   seed only fills in gaps. Ordering: most-recently-updated first so
   the queue feels live. */
function mergeWithSeed(local: StoredUtility[]): StoredUtility[] {
  const byId = new Map<string, StoredUtility>();
  for (const s of SEED_UTILITIES) byId.set(s.id, s);
  for (const u of local) byId.set(u.id, u); // user record wins
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function readStorage(): StoredUtility[] {
  if (typeof window === "undefined") return mergeWithSeed([]);
  const raw = window.localStorage.getItem(LS_KEY);
  if (!raw) {
    /* Fresh install — persist the seed version alongside the data. */
    try {
      window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    } catch {
      /* ignore quota errors */
    }
    return mergeWithSeed([]);
  }
  try {
    const parsed = JSON.parse(raw) as StoredUtility[];
    const local = Array.isArray(parsed) ? parsed : [];

    /* Seed-version check — if the canonical seed has been bumped since
       the last load, drop any stored copies of seeded ids so the new
       provider names/types show up. User-added records (ids outside
       SEED_UTILITIES) are preserved. */
    const appliedVersion = window.localStorage.getItem(SEED_VERSION_KEY);
    if (appliedVersion !== SEED_VERSION) {
      const seedIds = new Set(SEED_UTILITIES.map((s) => s.id));
      const preserved = local.filter((r) => !seedIds.has(r.id));
      try {
        window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      } catch {
        /* ignore */
      }
      return mergeWithSeed(preserved);
    }

    return mergeWithSeed(local);
  } catch {
    return mergeWithSeed([]);
  }
}

const YEAR = new Date().getFullYear();

function nextSequential(prefix: string, existing: string[]): string {
  const re = new RegExp(`^${prefix}(\\d+)$`, "i");
  let max = 0;
  for (const id of existing) {
    const m = re.exec(id ?? "");
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function UtilityDataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<StoredUtility[]>(() => readStorage());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(records));
  }, [records]);

  const addUtility = useCallback((record: StoredUtility) => {
    setRecords((cur) => {
      const idx = cur.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        const next = [...cur];
        next[idx] = record;
        return next;
      }
      return [record, ...cur];
    });
  }, []);

  const updateUtility = useCallback((id: string, patch: Partial<StoredUtility>) => {
    setRecords((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeUtility = useCallback((id: string) => {
    setRecords((cur) => cur.filter((r) => r.id !== id));
  }, []);

  const generateNextUtilityId = useCallback(() => {
    return nextSequential(
      `UTL-${YEAR}-`,
      records.map((r) => r.header.utilityId),
    );
  }, [records]);

  const generateNextBillId = useCallback(() => {
    const allBillIds = records.flatMap((r) => r.bills.map((b) => b.billId));
    return nextSequential(`UB-${YEAR}-`, allBillIds);
  }, [records]);

  const generateNextRecordId = useCallback(() => {
    return nextSequential(
      `UREC-${YEAR}-`,
      records.map((r) => r.id),
    );
  }, [records]);

  const value = useMemo<UtilityDataContextValue>(
    () => ({
      records,
      addUtility,
      updateUtility,
      removeUtility,
      generateNextUtilityId,
      generateNextBillId,
      generateNextRecordId,
    }),
    [
      records,
      addUtility,
      updateUtility,
      removeUtility,
      generateNextUtilityId,
      generateNextBillId,
      generateNextRecordId,
    ],
  );

  return <UtilityDataContext.Provider value={value}>{children}</UtilityDataContext.Provider>;
}

export function useUtilityData() {
  const ctx = useContext(UtilityDataContext);
  if (!ctx) throw new Error("useUtilityData must be used within UtilityDataProvider");
  return ctx;
}
