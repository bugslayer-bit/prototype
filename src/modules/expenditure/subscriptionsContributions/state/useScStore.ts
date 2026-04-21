/* ═══════════════════════════════════════════════════════════════════════════
   useScStore — localStorage-backed CRUD for Subscriptions & Contributions.

   Seed behaviour (mirrors useDebtStore / RentalDataContext)
   ────────────────────────────────────────────────────────
   10 canonical subscription & contribution records ship via `scSeed.ts`.
   On every read we MERGE the seed with whatever the user has in localStorage.
   The user's copy ALWAYS wins — editing entity details, updating transactions,
   changing approvals, or adding a new record updates dynamically and persists.
   Fresh installs (no localStorage) start from the seeds.

   Bumping SEED_VERSION forces cached browsers to drop stored copies of seeded
   ids so fresh canonical values show up, while any user-added records (ids
   outside SEED_SC_RECORDS) are preserved.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useState } from "react";
import { SEED_SC_RECORDS } from "../scSeed";
import type { StoredSc } from "../types";

const SC_KEY = "ifmis-sc-records";
const SEED_VERSION_KEY = "ifmis-sc-seed-version";
const SEED_VERSION = "2026-04-10-10records-v1";

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
function readRecords(): StoredSc[] {
  if (typeof window === "undefined") return mergeById(SEED_SC_RECORDS, []);
  const local = readArr<StoredSc>(SC_KEY);

  const appliedVersion = window.localStorage.getItem(SEED_VERSION_KEY);
  if (appliedVersion !== SEED_VERSION) {
    /* Seed version bumped — drop stored copies of seeded ids, keep user-added */
    const seedIds = new Set(SEED_SC_RECORDS.map((s) => s.id));
    const preserved = local.filter((r) => !seedIds.has(r.id));
    try {
      window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    } catch {
      /* ignore */
    }
    return mergeById(SEED_SC_RECORDS, preserved);
  }

  return mergeById(SEED_SC_RECORDS, local);
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
export function useScStore() {
  const [records, setRecords] = useState<StoredSc[]>(() => readRecords());

  useEffect(() => writeArr(SC_KEY, records), [records]);

  const generateNextRecordId = useCallback(
    () => nextSequential(`SCR-${YEAR}-`, records.map((r) => r.id)),
    [records],
  );

  const generateNextScId = useCallback(
    () => nextSequential(`SC-${YEAR}-`, records.map((r) => r.header.scId)),
    [records],
  );

  const generateNextTxnId = useCallback(
    () =>
      nextSequential(
        `TXN-${YEAR}-`,
        records.flatMap((r) => r.transactions.map((t) => t.id)),
      ),
    [records],
  );

  const generateNextDocId = useCallback(
    () =>
      nextSequential(
        `DOC-${YEAR}-`,
        records.flatMap((r) => r.documents.map((d) => d.id)),
      ),
    [records],
  );

  const generateNextApprovalId = useCallback(
    () =>
      nextSequential(
        `APP-${YEAR}-`,
        records.flatMap((r) => r.approvals.map((a) => a.id)),
      ),
    [records],
  );

  const generateNextLifecycleId = useCallback(
    () =>
      nextSequential(
        `LIFE-${YEAR}-`,
        records.flatMap((r) => r.lifecycle.map((l) => l.id)),
      ),
    [records],
  );

  const upsertRecord = useCallback((record: StoredSc) => {
    setRecords((cur) => {
      const idx = cur.findIndex((d) => d.id === record.id);
      if (idx === -1) return [record, ...cur];
      const copy = [...cur];
      copy[idx] = record;
      return copy;
    });
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((cur) => cur.filter((d) => d.id !== id));
  }, []);

  return useMemo(
    () => ({
      records,
      upsertRecord,
      removeRecord,
      generateNextRecordId,
      generateNextScId,
      generateNextTxnId,
      generateNextDocId,
      generateNextApprovalId,
      generateNextLifecycleId,
    }),
    [
      records,
      upsertRecord,
      removeRecord,
      generateNextRecordId,
      generateNextScId,
      generateNextTxnId,
      generateNextDocId,
      generateNextApprovalId,
      generateNextLifecycleId,
    ],
  );
}
