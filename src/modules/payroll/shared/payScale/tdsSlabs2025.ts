/**
 * TDS (Tax Deducted at Source) — Slab 2025.
 *
 * Source: Payroll SRS v1 `TDS Slab 2025` sheet. The slab follows a stepped
 * bracket model:
 *   - Monthly salary 0 – 25,000 Nu.       → TDS = 0
 *   - From 25,001 upwards, every 100 Nu. bracket adds 5 Nu. to the TDS.
 *     (25,001–25,100 → 5, 25,101–25,200 → 10, 25,201–25,300 → 15, …)
 *
 * The function is deterministic and closed-form so we do not need to embed
 * the ~3000-row table in the bundle.
 */
export function computeMonthlyTDS(monthlySalary: number): number {
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 25000) return 0;
  const bracketsAbove = Math.ceil((monthlySalary - 25000) / 100);
  return bracketsAbove * 5;
}

/**
 * Convenience helper — net monthly pay after TDS (no other deductions).
 */
export function computeNetAfterTDS(monthlySalary: number): number {
  return monthlySalary - computeMonthlyTDS(monthlySalary);
}
