/* ═══════════════════════════════════════════════════════════════════════════
   useSbStore — localStorage-backed CRUD for Social Benefits & Stipend.

   Seed behaviour (mirrors useDebtStore)
   ───────────────────────────────────────────────────────────────
   8 canonical social benefit records ship via `sbSeed.ts`. On every read we
   MERGE the seed with whatever the user has in localStorage. The user's copy
   ALWAYS wins — editing program details, changing beneficiary status, adding
   transactions, or creating new records updates dynamically and persists in
   localStorage. Fresh installs (no localStorage) start from the seeds.

   Bumping SEED_VERSION forces cached browsers to drop stored copies of seeded
   ids so fresh canonical values show up, while any user-added records (ids
   outside SEED_SB_RECORDS) are preserved.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StoredSb } from "../types";
import { SEED_SB_RECORDS } from "../sbSeed";

const SB_KEY = "ifmis-sb-records";
const SEED_VERSION_KEY = "ifmis-sb-seed-version";
const SEED_VERSION = "2026-04-10-8records-v1";

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
function readRecords(): StoredSb[] {
  if (typeof window === "undefined") return mergeById(SEED_SB_RECORDS, []);
  const local = readArr<StoredSb>(SB_KEY);

  const appliedVersion = window.localStorage.getItem(SEED_VERSION_KEY);
  if (appliedVersion !== SEED_VERSION) {
    /* Seed version bumped — drop stored copies of seeded ids, keep user-added */
    const seedIds = new Set(SEED_SB_RECORDS.map((s) => s.id));
    const preserved = local.filter((r) => !seedIds.has(r.id));
    try {
      window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    } catch { /* ignore */ }
    return mergeById(SEED_SB_RECORDS, preserved);
  }

  return mergeById(SEED_SB_RECORDS, local);
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
export function useSbStore() {
  const [records, setRecords] = useState<StoredSb[]>(() => readRecords());

  useEffect(() => writeArr(SB_KEY, records), [records]);

  const generateNextRecordId = useCallback(
    () => nextSequential(`SBR-${YEAR}-`, records.map((r) => r.id)),
    [records],
  );

  const generateNextSbId = useCallback(
    () => nextSequential(`SB-${YEAR}-`, records.flatMap((r) => r.header.sbId)),
    [records],
  );

  const generateNextBeneficiaryId = useCallback(
    () =>
      nextSequential(
        `BEN-${YEAR}-`,
        records.flatMap((r) => r.beneficiaries.map((b) => b.id)),
      ),
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

  const generateNextDeductionId = useCallback(
    () =>
      nextSequential(
        `DED-${YEAR}-`,
        records.flatMap((r) => r.deductions.map((d) => d.id)),
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

  const upsertRecord = useCallback((record: StoredSb) => {
    setRecords((cur) => {
      const idx = cur.findIndex((d) => d.id === record.id);
      if (idx === -1) return [...cur, record];
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
      generateNextSbId,
      generateNextBeneficiaryId,
      generateNextTxnId,
      generateNextDeductionId,
      generateNextApprovalId,
    }),
    [
      records,
      upsertRecord,
      removeRecord,
      generateNextRecordId,
      generateNextSbId,
      generateNextBeneficiaryId,
      generateNextTxnId,
      generateNextDeductionId,
      generateNextApprovalId,
    ],
  );
}
