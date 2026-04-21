/* ═══════════════════════════════════════════════════════════════════════════
   useDebtStore — localStorage-backed CRUD for Debt Payment Management.

   Seed behaviour (mirrors RentalDataContext / UtilityDataContext)
   ───────────────────────────────────────────────────────────────
   12 canonical debt servicing records + 8 donor master records ship via
   `debtSeed.ts`. On every read we MERGE the seed with whatever the user
   has in localStorage. The user's copy ALWAYS wins — editing loan terms,
   toggling Meridian sync, pushing a repayment from Pending → Paid, or
   adding a new record updates dynamically and persists in localStorage.
   Fresh installs (no localStorage) start from the seeds.

   Bumping SEED_VERSION forces cached browsers to drop stored copies of
   seeded ids so fresh canonical values show up, while any user-added
   records (ids outside SEED_DEBTS / SEED_DONORS) are preserved.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DonorMaster, StoredDebt } from "../types";
import { SEED_DEBTS, SEED_DONORS } from "../debtSeed";

const DEBT_KEY = "ifmis-debt-records";
const DONOR_KEY = "ifmis-debt-donors";
const SEED_VERSION_KEY = "ifmis-debt-seed-version";
const SEED_VERSION = "2026-04-10-12records-v1";

/* ── Merge helpers ───────────────────────────────────────────────────────── */
function mergeById<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  seed: T[],
  local: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const s of seed) byId.set(s.id, s);
  for (const u of local) byId.set(u.id, u); // user record wins
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date((a as any).updatedAt || (a as any).createdAt || 0).getTime();
    const tb = new Date((b as any).updatedAt || (b as any).createdAt || 0).getTime();
    return tb - ta;
  });
}

function readArr<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArr<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

/* ── Read with seed merge ────────────────────────────────────────────────── */
function readDebts(): StoredDebt[] {
  if (typeof window === "undefined") return mergeById(SEED_DEBTS, []);
  const local = readArr<StoredDebt>(DEBT_KEY);

  const appliedVersion = window.localStorage.getItem(SEED_VERSION_KEY);
  if (appliedVersion !== SEED_VERSION) {
    /* Seed version bumped — drop stored copies of seeded ids, keep user-added */
    const seedIds = new Set(SEED_DEBTS.map((s) => s.id));
    const preserved = local.filter((r) => !seedIds.has(r.id));
    try {
      window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    } catch { /* ignore */ }
    return mergeById(SEED_DEBTS, preserved);
  }

  return mergeById(SEED_DEBTS, local);
}

function readDonors(): DonorMaster[] {
  if (typeof window === "undefined") return mergeById(SEED_DONORS, []);
  const local = readArr<DonorMaster>(DONOR_KEY);

  const appliedVersion = window.localStorage.getItem(SEED_VERSION_KEY);
  /* Re-check seed version — donors piggyback on the same version key */
  if (appliedVersion !== SEED_VERSION) {
    const seedIds = new Set(SEED_DONORS.map((s) => s.id));
    const preserved = local.filter((r) => !seedIds.has(r.id));
    return mergeById(SEED_DONORS, preserved);
  }

  return mergeById(SEED_DONORS, local);
}

/* ── ID generation — scan existing records for max sequence ──────────────── */
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

/* ── Hook ────────────────────────────────────────────────────────────────── */
export function useDebtStore() {
  const [debts, setDebts] = useState<StoredDebt[]>(() => readDebts());
  const [donors, setDonors] = useState<DonorMaster[]>(() => readDonors());

  useEffect(() => writeArr(DEBT_KEY, debts), [debts]);
  useEffect(() => writeArr(DONOR_KEY, donors), [donors]);

  const generateNextDebtServicingId = useCallback(
    () => nextSequential(`DSV-${YEAR}-`, debts.map((d) => d.header.debtServicingId)),
    [debts],
  );

  const generateNextPaymentOrderId = useCallback(
    () =>
      nextSequential(
        `PO-${YEAR}-`,
        debts.flatMap((d) => d.repayments.map((r) => r.paymentOrderId)),
      ),
    [debts],
  );

  const generateNextDonorId = useCallback(
    () => nextSequential(`DN-${YEAR}-`, donors.map((d) => d.donorId)),
    [donors],
  );

  const generateNextRecordId = useCallback(
    () => nextSequential(`DBT-${YEAR}-`, debts.map((d) => d.id)),
    [debts],
  );

  const upsertDebt = useCallback((record: StoredDebt) => {
    setDebts((cur) => {
      const idx = cur.findIndex((d) => d.id === record.id);
      if (idx === -1) return [record, ...cur];
      const copy = [...cur];
      copy[idx] = record;
      return copy;
    });
  }, []);

  const removeDebt = useCallback((id: string) => {
    setDebts((cur) => cur.filter((d) => d.id !== id));
  }, []);

  const upsertDonor = useCallback((donor: DonorMaster) => {
    setDonors((cur) => {
      const idx = cur.findIndex((d) => d.id === donor.id);
      if (idx === -1) return [donor, ...cur];
      const copy = [...cur];
      copy[idx] = donor;
      return copy;
    });
  }, []);

  const removeDonor = useCallback((id: string) => {
    setDonors((cur) => cur.filter((d) => d.id !== id));
  }, []);

  return useMemo(
    () => ({
      debts,
      donors,
      upsertDebt,
      removeDebt,
      upsertDonor,
      removeDonor,
      generateNextDebtServicingId,
      generateNextPaymentOrderId,
      generateNextDonorId,
      generateNextRecordId,
    }),
    [
      debts,
      donors,
      upsertDebt,
      removeDebt,
      upsertDonor,
      removeDonor,
      generateNextDebtServicingId,
      generateNextPaymentOrderId,
      generateNextDonorId,
      generateNextRecordId,
    ],
  );
}
