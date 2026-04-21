/**
 * OPS TDS (Tax Deducted at Source) Slab
 * Derived from Payroll SRS V1 TDS Slab 2025 sheet
 * Progressive taxation model: 0% up to 25,000 Nu, then 5% per 100 Nu increment
 */

export interface TdsSlabEntry {
  from: number;
  to: number;
  tds: number;
}

/**
 * Generate complete TDS slab table programmatically
 */
export function generateCompleteTdsTable(maxSalary: number = 325000): TdsSlabEntry[] {
  const table: TdsSlabEntry[] = [];

  // Add the no-tax bracket (0-25,000)
  table.push({
    from: 0,
    to: 25000,
    tds: 0
  });

  // Add taxable brackets (25,001 onwards)
  for (let from = 25001; from <= maxSalary; from += 100) {
    const to = Math.min(from + 99, maxSalary);
    const tds = computeTDS(from);
    table.push({
      from,
      to,
      tds
    });
  }

  return table;
}

/**
 * Compute TDS for a given gross salary
 * Formula: if salary <= 25,000, TDS = 0
 *          if salary > 25,000, TDS = ceil((salary - 25,000) / 100) * 5
 */
export function computeTDS(grossSalary: number): number {
  if (grossSalary <= 25000) {
    return 0;
  }
  return Math.ceil((grossSalary - 25000) / 100) * 5;
}

/**
 * Get TDS slab entries for display/lookup
 * Generates slab from 0 to maxSalary in 100 Nu increments
 */
export function getTdsSlabEntries(maxSalary: number = 325000): TdsSlabEntry[] {
  const slabs: TdsSlabEntry[] = [];

  // 0-25000: TDS = 0
  slabs.push({
    from: 0,
    to: 25000,
    tds: 0
  });

  // From 25,001 onwards: TDS = ceil((salary - 25,000) / 100) * 5
  for (let from = 25001; from <= maxSalary; from += 100) {
    const to = Math.min(from + 99, maxSalary);
    const tds = computeTDS(from);
    slabs.push({
      from,
      to,
      tds
    });
  }

  return slabs;
}

/**
 * Find applicable TDS slab for a given salary
 */
export function getTdsSlabForSalary(salary: number): TdsSlabEntry | undefined {
  const slabs = getTdsSlabEntries(Math.max(salary, 325000));
  return slabs.find((slab) => salary >= slab.from && salary <= slab.to);
}

/**
 * Comprehensive TDS slab lookup (full table 0-325,000)
 * Generated programmatically to ensure complete coverage
 */
export const TDS_SLAB_FULL: TdsSlabEntry[] = generateCompleteTdsTable(325000);

/**
 * Validate if a salary is within the standard TDS range
 */
export function isSalaryInTdsRange(salary: number): boolean {
  return salary >= 0 && salary <= 325000;
}
