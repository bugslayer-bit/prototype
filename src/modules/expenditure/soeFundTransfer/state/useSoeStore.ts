/* ═══════════════════════════════════════════════════════════════════════════
   useSoeStore — localStorage-backed CRUD for SOE & Fund Transfer.

   Seed behaviour (mirrors useDebtStore)
   ────────────────────────────────────────────────────────────────
   10 canonical SOE records ship via `soeSeed.ts`. On every read we MERGE
   the seed with whatever the user has in localStorage. The user's copy
   ALWAYS wins — editing transfer headers, adding SOE lines, updating status,
   or adding new records updates dynamically and persists in localStorage.
   Fresh installs (no localStorage) start from the seeds.

   Bumping SEED_VERSION forces cached browsers to drop stored copies of
   seeded ids so fresh canonical values show up, while any user-added
   records (ids outside SEED_SOE_RECORDS) are preserved.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StoredSoe } from "../types";
import { SEED_SOE_RECORDS } from "../soeSeed";

const SOE_KEY = "ifmis-soe-records";
const SOE_SEQ_KEY = "ifmis-soe-seq";
const SOE_LINE_SEQ_KEY = "ifmis-soe-line-seq";
const SOE_RECORD_SEQ_KEY = "ifmis-soe-record-seq";
const SEED_VERSION_KEY = "ifmis-soe-seed-version";
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
function readRecords(): StoredSoe[] {
  if (typeof window === "undefined") return mergeById(SEED_SOE_RECORDS, []);
  const local = readArr<StoredSoe>(SOE_KEY);

  const appliedVersion = window.localStorage.getItem(SEED_VERSION_KEY);
  if (appliedVersion !== SEED_VERSION) {
    /* Seed version bumped — drop stored copies of seeded ids, keep user-added */
    const seedIds = new Set(SEED_SOE_RECORDS.map((s) => s.id));
    const preserved = local.filter((r) => !seedIds.has(r.id));
    try {
      window.localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    } catch {
      /* ignore */
    }
    return mergeById(SEED_SOE_RECORDS, preserved);
  }

  return mergeById(SEED_SOE_RECORDS, local);
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
export function useSoeStore() {
  const [records, setRecords] = useState<StoredSoe[]>(() => readRecords());

  useEffect(() => writeArr(SOE_KEY, records), [records]);

  const generateNextTransferId = useCallback(
    () => nextSequential(`SOE-${YEAR}-`, records.map((r) => r.header.transferId)),
    [records],
  );

  const generateNextLineId = useCallback(
    () =>
      nextSequential(
        `SOL-`,
        records.flatMap((r) => r.soeLines.map((l) => l.id)),
      ),
    [records],
  );

  const generateNextRecordId = useCallback(
    () => nextSequential(`STR-${YEAR}-`, records.map((r) => r.id)),
    [records],
  );

  const upsertRecord = useCallback((record: StoredSoe) => {
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
      generateNextTransferId,
      generateNextLineId,
      generateNextRecordId,
    }),
    [records, upsertRecord, removeRecord, generateNextTransferId, generateNextLineId, generateNextRecordId],
  );
}
