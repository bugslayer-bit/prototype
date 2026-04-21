/* ═══════════════════════════════════════════════════════════════════════════
   RentalDataContext
   ─────────────────
   Source of truth for Rental Payment Management (SRS PRN 5.1 R78-R80).
   Persists to localStorage so records survive reloads.

   Seed behaviour
   --------------
   Seven rental asset records (one per SRS sub-class — Land, House,
   Buildings, Vehicles, Aero Services, Machineries, Trademark) ship as
   seed via `rentalSeed.ts`. On every read we MERGE the seed with
   whatever the user has in localStorage. The user's copy ALWAYS wins —
   editing rent amount, toggling PTS verification, pushing a transaction
   from Pending → Approved → Paid, or adding a new transaction updates
   dynamically and persists in localStorage via the useEffect below.
   Fresh installs (no localStorage) start from the seven seeds.

   Bumping SEED_VERSION forces cached admin browsers to drop stored
   copies of seeded ids so fresh canonical values show up, while any
   user-added records (ids outside SEED_RENTALS) are preserved.
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
import type { StoredRental } from "../types";
import { SEED_RENTALS } from "../rentalSeed";

interface RentalDataContextValue {
  records: StoredRental[];
  addRental: (record: StoredRental) => void;
  updateRental: (id: string, patch: Partial<StoredRental>) => void;
  removeRental: (id: string) => void;
  generateNextAssetId: () => string;
  generateNextTransactionId: () => string;
  generateNextPaymentOrderId: () => string;
  generateNextRecordId: () => string;
}

const LS_KEY = "ifmis_rentals_v1";
const SEED_VERSION_KEY = "ifmis_rentals_seed_version";
const SEED_VERSION = "2026-04-10-ucoa-15records-v2";
const RentalDataContext = createContext<RentalDataContextValue | null>(null);

/* Merge the seed with whatever is in localStorage so we don't clobber
   edits made by the user. User records win when ids collide; the seed
   only fills in gaps. Ordering: most-recently-updated first so the
   queue feels live after edits. */
function mergeWithSeed(local: StoredRental[]): StoredRental[] {
  const byId = new Map<string, StoredRental>();
  for (const s of SEED_RENTALS) byId.set(s.id, s);
  for (const u of local) byId.set(u.id, u); // user record wins
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function readStorage(): StoredRental[] {
  if (typeof window === "undefined") return mergeWithSeed([]);
  const raw = window.localStorage.getItem(LS_KEY);
  if (!raw) {
    try {
      window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    } catch {
      /* ignore quota errors */
    }
    return mergeWithSeed([]);
  }
  try {
    const parsed = JSON.parse(raw) as StoredRental[];
    const local = Array.isArray(parsed) ? parsed : [];

    /* Seed-version check — if the canonical seed has been bumped since
       the last load, drop any stored copies of seeded ids so the new
       values show up. User-added records (ids outside SEED_RENTALS)
       are preserved. */
    const appliedVersion = window.localStorage.getItem(SEED_VERSION_KEY);
    if (appliedVersion !== SEED_VERSION) {
      const seedIds = new Set(SEED_RENTALS.map((s) => s.id));
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

export function RentalDataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<StoredRental[]>(() => readStorage());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(records));
  }, [records]);

  const addRental = useCallback((record: StoredRental) => {
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

  const updateRental = useCallback((id: string, patch: Partial<StoredRental>) => {
    setRecords((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRental = useCallback((id: string) => {
    setRecords((cur) => cur.filter((r) => r.id !== id));
  }, []);

  const generateNextAssetId = useCallback(
    () => nextSequential(`AST-${YEAR}-`, records.map((r) => r.asset.assetId)),
    [records],
  );

  const generateNextTransactionId = useCallback(
    () =>
      nextSequential(
        `RPT-${YEAR}-`,
        records.flatMap((r) => r.transactions.map((t) => t.transactionId)),
      ),
    [records],
  );

  const generateNextPaymentOrderId = useCallback(
    () =>
      nextSequential(
        `RPO-${YEAR}-`,
        records.flatMap((r) => r.transactions.map((t) => t.paymentOrderId)),
      ),
    [records],
  );

  const generateNextRecordId = useCallback(
    () => nextSequential(`RREC-${YEAR}-`, records.map((r) => r.id)),
    [records],
  );

  const value = useMemo<RentalDataContextValue>(
    () => ({
      records,
      addRental,
      updateRental,
      removeRental,
      generateNextAssetId,
      generateNextTransactionId,
      generateNextPaymentOrderId,
      generateNextRecordId,
    }),
    [
      records,
      addRental,
      updateRental,
      removeRental,
      generateNextAssetId,
      generateNextTransactionId,
      generateNextPaymentOrderId,
      generateNextRecordId,
    ],
  );

  return <RentalDataContext.Provider value={value}>{children}</RentalDataContext.Provider>;
}

export function useRentalData() {
  const ctx = useContext(RentalDataContext);
  if (!ctx) throw new Error("useRentalData must be used within RentalDataProvider");
  return ctx;
}
