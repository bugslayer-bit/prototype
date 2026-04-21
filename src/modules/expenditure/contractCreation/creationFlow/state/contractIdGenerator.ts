/* Sequential contract ID generator.
   Scans every existing StoredContract for the canonical AGY-CTR-NNN pattern
   and returns the next zero-padded number. The prefix is fixed for now but
   could become per-agency in the future. */
export const CONTRACT_ID_PREFIX = "AGY-CTR-";

export function generateNextContractId(existing: { contractId?: string }[]): string {
  const re = new RegExp(`^${CONTRACT_ID_PREFIX}(\\d+)$`, "i");
  let max = 0;
  for (const c of existing) {
    const id = c?.contractId ?? "";
    const m = re.exec(id);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${CONTRACT_ID_PREFIX}${String(max + 1).padStart(3, "0")}`;
}
