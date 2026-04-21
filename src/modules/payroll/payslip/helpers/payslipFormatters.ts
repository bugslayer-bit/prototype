/* ═══════════════════════════════════════════════════════════════════════════
   Payslip Formatters — pure helpers
   ───────────────────────────────────────────────────────────────────
   Small, reusable string/number formatting helpers used throughout the
   payslip module. Kept in their own file so they stay pure (no React,
   no hooks) and can be unit-tested independently.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Month labels — January … December */
export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Format a number as Bhutanese Ngultrum, e.g. 12345 → "Nu. 12,345". */
export function nu(amount: number): string {
  return `Nu. ${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Month label for a 1-based month index (1 = Jan, 12 = Dec). */
export function monthLabel(monthOneBased: number): string {
  const idx = Math.max(1, Math.min(12, monthOneBased)) - 1;
  return MONTH_LABELS[idx];
}

/** Human-readable period string, e.g. { month: 4, year: 2026 } → "April 2026". */
export function periodLabel(month: number, year: number): string {
  return `${monthLabel(month)} ${year}`;
}

/** Current date formatted for payslip footer. */
export function todayLong(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Short payslip id — deterministic per employee + period so reprints match. */
export function payslipRefId(
  empId: string,
  month: number,
  year: number,
): string {
  const mm = String(month).padStart(2, "0");
  return `PS-${year}${mm}-${empId}`;
}
