/* ═══════════════════════════════════════════════════════════════════════════
   buildPayslip — pure fn: Employee + Period → PayslipDocument
   ───────────────────────────────────────────────────────────────────
   Translates the raw Employee record and the computeEmployeePay() output
   into the row-by-row earnings / deductions structure the payslip UI
   consumes.

   Per SRS Payslip spec, two variants are supported:
     • "regular" — standard monthly payslip (default).
     • "last"    — issued when the employee separates mid-month (or at end
                   of agency service). Earnings + prorated deductions are
                   scaled by workedDays / monthDays. A Separation block is
                   attached. Trigger: employee.dateOfSeparation falls inside
                   the selected period (auto-detected), OR explicit override.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Employee } from "../../types";
import { computeEmployeePay } from "../../state/payrollSeed";
import { payslipRefId, periodLabel } from "./payslipFormatters";

export type PayslipVariant = "regular" | "last";

export interface PayslipLine {
  label: string;
  amount: number;
}

export interface PayslipSeparation {
  /** Human-readable separation type, e.g. "Superannuation", "Transfer". */
  type: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** "Issued for <purpose>" banner text — derived from the separation type. */
  purpose: string;
  workedDays: number;
  monthDays: number;
  /** workedDays / monthDays, clamped to [0, 1]. */
  prorationFactor: number;
}

export interface PayslipDocument {
  refId: string;
  variant: PayslipVariant;
  period: { month: number; year: number; label: string };
  employee: {
    id: string;
    cid: string;
    name: string;
    positionTitle: string;
    positionLevel: string;
    departmentName: string;
    agencyName: string;
    bankName: string;
    bankAccountNo: string;
    /** Populated when the employee has a recorded date of separation. */
    dateOfSeparation?: string;
  };
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  totals: {
    grossPay: number;
    totalDeductions: number;
    netPay: number;
  };
  /** Only present when variant === "last". */
  separation?: PayslipSeparation;
}

export interface BuildPayslipOptions {
  /** Force a specific variant. When omitted, auto-detected from the employee. */
  variantOverride?: PayslipVariant;
  /** Supply a separation type when the HR action is known (e.g. "Transfer" /
   *  "Superannuation"). Ignored for variant === "regular". */
  separationType?: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Returns the separation date as a Date if it falls in the pay period,
 *  otherwise null. Period is 1-based month. */
function separationInPeriod(employee: Employee, period: { month: number; year: number }): Date | null {
  if (!employee.dateOfSeparation) return null;
  const d = new Date(employee.dateOfSeparation);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== period.year) return null;
  if (d.getMonth() + 1 !== period.month) return null;
  return d;
}

/** Pretty-label + purpose copy for the Purpose banner. */
function purposeFor(type: string): string {
  if (!type) return "Last Payslip — final monthly disbursement";
  return `Issued for ${type}`;
}

/** Build the earnings rows from computeEmployeePay output (optionally prorated). */
function buildEarningRows(
  basicPay: number,
  pay: ReturnType<typeof computeEmployeePay>,
  factor: number,
): PayslipLine[] {
  const scale = (n: number) => Math.round(n * factor);
  const rows: PayslipLine[] = [
    { label: "Basic Pay", amount: scale(basicPay) },
    { label: "Leave Encashment (LE 8.33%)", amount: scale(pay.le) },
    { label: "Leave Travel Concession (LTC 8.33%)", amount: scale(pay.ltc) },
    { label: "Lump Sum Revision (50%)", amount: scale(pay.lumpSum) },
    { label: "Indexation (5%)", amount: scale(pay.indexation) },
  ];
  if (pay.oneOffFixed > 0) {
    rows.push({ label: "One-off Fixed Payment", amount: scale(pay.oneOffFixed) });
  }
  return rows;
}

/** Build the deduction rows. GIS and CSWS stay flat (full-month coverage);
 *  PF/HC/TDS prorate with the earnings. */
function buildDeductionRows(
  pay: ReturnType<typeof computeEmployeePay>,
  factor: number,
): PayslipLine[] {
  const scale = (n: number) => Math.round(n * factor);
  return [
    { label: "Provident Fund (PF 11%)", amount: scale(pay.pf) },
    { label: "Group Insurance Scheme (GIS)", amount: pay.gis },
    { label: "Health Contribution (HC 1%)", amount: scale(pay.hc) },
    { label: "TDS (progressive)", amount: scale(pay.tds) },
    { label: "CSWS", amount: pay.csws },
  ];
}

/**
 * Produce a full PayslipDocument for an employee in a given period.
 * `period` is the pay period (1-based month + year).
 */
export function buildPayslip(
  employee: Employee,
  period: { month: number; year: number },
  options: BuildPayslipOptions = {},
): PayslipDocument {
  const pay = computeEmployeePay(employee.basicPay, employee.positionLevel);

  /* ── Decide variant: explicit override wins; else auto-detect. ───────── */
  const separationDate = separationInPeriod(employee, period);
  const autoVariant: PayslipVariant = separationDate ? "last" : "regular";
  const variant: PayslipVariant = options.variantOverride ?? autoVariant;

  /* ── Proration — only for the "last" variant. ────────────────────────── */
  const monthDays = daysInMonth(period.year, period.month);
  const workedDays = variant === "last" && separationDate
    ? separationDate.getDate()
    : monthDays;
  const prorationFactor = variant === "last" ? Math.max(0, Math.min(1, workedDays / monthDays)) : 1;

  const earnings = buildEarningRows(employee.basicPay, pay, prorationFactor);
  const deductions = buildDeductionRows(pay, prorationFactor);
  const grossPay = earnings.reduce((s, r) => s + r.amount, 0);
  const totalDeductions = deductions.reduce((s, r) => s + r.amount, 0);

  /* ── Separation metadata (only for "last"). ──────────────────────────── */
  let separation: PayslipSeparation | undefined;
  if (variant === "last") {
    const type = options.separationType ?? "Separation";
    separation = {
      type,
      date: employee.dateOfSeparation ?? `${period.year}-${String(period.month).padStart(2, "0")}-${String(workedDays).padStart(2, "0")}`,
      purpose: purposeFor(type),
      workedDays,
      monthDays,
      prorationFactor,
    };
  }

  return {
    refId: payslipRefId(employee.id, period.month, period.year),
    variant,
    period: {
      month: period.month,
      year: period.year,
      label: periodLabel(period.month, period.year),
    },
    employee: {
      id: employee.id,
      cid: employee.cid,
      name: employee.name,
      positionTitle: employee.positionTitle,
      positionLevel: employee.positionLevel,
      departmentName: employee.departmentName,
      agencyName: employee.agencyName,
      bankName: employee.bankName,
      bankAccountNo: employee.bankAccountNo,
      dateOfSeparation: employee.dateOfSeparation,
    },
    earnings,
    deductions,
    totals: {
      grossPay,
      totalDeductions,
      netPay: grossPay - totalDeductions,
    },
    separation,
  };
}
