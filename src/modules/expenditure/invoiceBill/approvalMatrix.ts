/* ═══════════════════════════════════════════════════════════════════════════
   Approval Matrix Resolver  (PRN 3.1.3 + 3.2.2)
   ─────────────────────────────────────────────
   Translates the threshold-encoded master rows
       "<maxAmount>|<stepKey>:<label>:<role>"
   (managed in /master-data → approval-matrix-invoice / approval-matrix-bill)
   into a typed ApprovalStep[] for whichever bracket a given net-payable
   amount falls into.

   Why this exists:
     • Approval routing previously used hard-coded chains in config.ts. Admins
       had no way to add a Secretary endorsement for high-value bills, etc.
     • Now the chain is fully data-driven from /master-data and is rebuilt
       automatically the moment the linked contract or net payable changes.
   ═══════════════════════════════════════════════════════════════════════════ */
import type { ApprovalStep } from "./types";

export interface ApprovalMatrixRow {
  maxAmount: number; /* Infinity for the highest tier */
  key: string;
  label: string;
  role: string;
}

/** Parse one master-data string row into a structured ApprovalMatrixRow. */
export function parseMatrixRow(raw: string): ApprovalMatrixRow | null {
  const [thresholdPart, defPart] = raw.split("|");
  if (!thresholdPart || !defPart) return null;
  const trimmed = thresholdPart.trim();
  const maxAmount =
    trimmed === "∞" || trimmed.toLowerCase() === "inf" || trimmed === ""
      ? Number.POSITIVE_INFINITY
      : parseFloat(trimmed);
  if (Number.isNaN(maxAmount)) return null;
  const [key, label, role] = defPart.split(":");
  if (!key || !label || !role) return null;
  return { maxAmount, key: key.trim(), label: label.trim(), role: role.trim() };
}

/**
 * Resolve the approval chain for a given net payable amount.
 * Picks the smallest threshold bucket the amount fits into.
 *
 * Returns a fresh ApprovalStep[] with status="pending" and (optionally)
 * the first step pre-set to "in_progress".
 */
export function resolveApprovalChain(
  rows: string[],
  amount: number,
  options: { startInProgress?: boolean } = {},
): ApprovalStep[] {
  if (!rows || rows.length === 0) return [];
  const parsed = rows
    .map(parseMatrixRow)
    .filter((r): r is ApprovalMatrixRow => r !== null);
  if (parsed.length === 0) return [];

  /* Find the smallest tier that can hold this amount. */
  const distinctTiers = Array.from(new Set(parsed.map((p) => p.maxAmount))).sort(
    (a, b) => a - b,
  );
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const chosenTier =
    distinctTiers.find((t) => safeAmount <= t) ??
    distinctTiers[distinctTiers.length - 1];

  const tierRows = parsed.filter((p) => p.maxAmount === chosenTier);

  return tierRows.map<ApprovalStep>((r, idx) => ({
    key: r.key,
    label: r.label,
    role: r.role,
    status: idx === 0 && options.startInProgress ? "in_progress" : "pending",
  }));
}

/**
 * Friendly label for the bracket the amount falls into — used by the
 * Approval section to show the user *why* a particular chain was rendered.
 */
export function describeMatrixTier(rows: string[], amount: number): string {
  const parsed = rows
    .map(parseMatrixRow)
    .filter((r): r is ApprovalMatrixRow => r !== null);
  if (parsed.length === 0) return "No matrix configured";
  const distinctTiers = Array.from(new Set(parsed.map((p) => p.maxAmount))).sort(
    (a, b) => a - b,
  );
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const chosenTier =
    distinctTiers.find((t) => safeAmount <= t) ??
    distinctTiers[distinctTiers.length - 1];
  if (chosenTier === Number.POSITIVE_INFINITY) {
    const prev = distinctTiers[distinctTiers.length - 2];
    return prev !== undefined ? `> Nu ${prev.toLocaleString()}` : "Top tier";
  }
  return `≤ Nu ${chosenTier.toLocaleString()}`;
}
