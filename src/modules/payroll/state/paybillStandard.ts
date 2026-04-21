/**
 * PAYBILL STANDARD — canonical paybill formulae
 * Source: "Paybill Formulae.xlsx" (uploaded by MoF-DTA / GovTech, Apr 2026)
 *
 * This file is the SINGLE SOURCE OF TRUTH for paybill generation, recoveries,
 * cash-management reports, and remittance schedules to:
 *   • NPPF  (Provident Fund / Pension)
 *   • RICBL (Group Insurance Scheme)
 *   • DRC   (TDS, Health Contribution, House Rent)
 *   • NHDCL (House Rent)
 *   • RCSC  (CSWS)
 *   • RAA   (Audit Recoveries)
 *
 * Do NOT hardcode these values anywhere else — import from here.
 */

import type { PositionLevel } from "../types";

/* ═══════════════════════════════════════════════════════════════════════════
   1. PAYBILL HEADER FIELDS (one block per Payroll Department)
   ═══════════════════════════════════════════════════════════════════════════ */
export interface PaybillHeader {
  agencyCode: string;           // xxx_1 — UCoA org code
  payrollDeptUcoa: string;      // xxx_2 — Organizational Segment UCoA (ZESt; different for OPS)
  financialYear: string;        // xxx_3 — e.g. "FY2025-26"
  monthId: string;              // xxx_4 — "YYYY-MM"
  paymentOrderRef?: string;     // xxx_5 — Payment Order / Ack from Bank / RMA
  dateOfDisbursement?: string;  // xxx_6 — CM report
  bankName?: string;            // xxx_7
  bankBranch?: string;          // xxx_8
  journalNo?: string;           // xxx_9
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. PAYBILL LINE FORMULA        (Paybill sheet — header row 9/10)
   ───────────────────────────────────────────────────────────────────────────
   Earnings:
       A = Basic Pay
       B = Arrears
       C = Partial Pay
       D = Total Allowances
       X = A + B + C + D        (Total Earnings)

   Deductions (letters per sheet):
       E..K = per-line statutory + floating deductions
       Y = E + F + G + H + I + J  (Total Deductions)
       Z = X − Y                  (Net Pay)
   ═══════════════════════════════════════════════════════════════════════════ */
export interface PaybillLine {
  serialNo: number;
  name: string;
  eid: string;
  cidOrWp: string;
  tpn: string;
  dob: string;
  dateOfAppointment: string;
  dateOfSeparation?: string;
  employeeType: string;
  positionLevel: PositionLevel | string;

  // Earnings
  basicPay: number;          // A
  arrears: number;           // B
  partialPay: number;        // C
  totalAllowances: number;   // D
  totalEarnings: number;     // X = A+B+C+D

  // Deductions
  pf: number;                // E
  tds: number;               // F
  hc: number;                // G
  gis: number;               // H
  csws: number;              // I
  houseRent: number;         // J (DRC or NHDCL)
  auditRecoveries: number;   // K
  floatingDeductions: number;

  totalDeductions: number;   // Y = E+F+G+H+I+J (+K + floating)
  netPay: number;            // Z = X - Y
}

export function computePaybillTotals(line: Omit<PaybillLine, "totalEarnings" | "totalDeductions" | "netPay">): PaybillLine {
  const totalEarnings = line.basicPay + line.arrears + line.partialPay + line.totalAllowances;
  const totalDeductions =
    line.pf + line.tds + line.hc + line.gis + line.csws +
    line.houseRent + line.auditRecoveries + line.floatingDeductions;
  return {
    ...line,
    totalEarnings,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. PAYBILL RECOVERIES          (Paybill Recoveries sheet)
   ───────────────────────────────────────────────────────────────────────────
   Columns:   PF | TDS | HC | GIS | CSWS | House Rent | Audit Recoveries
   Formula:   O = E + F + G + H + I + J + K
   ═══════════════════════════════════════════════════════════════════════════ */
export function computeTotalRecoveries(r: {
  pf: number; tds: number; hc: number; gis: number;
  csws: number; houseRent: number; auditRecoveries: number;
}): number {
  return r.pf + r.tds + r.hc + r.gis + r.csws + r.houseRent + r.auditRecoveries;
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. PROVIDENT FUND (NPPF)        (Remittances-PF sheet)
   ───────────────────────────────────────────────────────────────────────────
   Employer Contribution : 15 % of Basic Pay
   Employee Contribution : 11 % of Basic Pay
   Tier 1 / Tier 2 supported (Tier 2 optional "Or else function")
   Remit : Debit TSA → Credit NPPF common CD Account
   PF Account No: auto-fetched GIS system → ZESt
   ═══════════════════════════════════════════════════════════════════════════ */
export const PF_EMPLOYER_RATE = 0.15;
export const PF_EMPLOYEE_RATE = 0.11;

export function computePF(basicPay: number): { employer: number; employee: number; total: number } {
  const employer = Math.round(basicPay * PF_EMPLOYER_RATE);
  const employee = Math.round(basicPay * PF_EMPLOYEE_RATE);
  return { employer, employee, total: employer + employee };
}

export type PfTier = "tier-1" | "tier-2";

/* ═══════════════════════════════════════════════════════════════════════════
   5. GROUP INSURANCE SCHEME (RICBL) (Remittances-GIS sheet — Table XXXII)
   ═══════════════════════════════════════════════════════════════════════════ */
export interface GisGroupRule {
  group: "A" | "B" | "C" | "D";
  levels: string[];
  subscriptionRate: number;
  insuranceCoverage: number;
}

export const GIS_GROUPS: GisGroupRule[] = [
  { group: "A", levels: ["EX1","EX2","EX3","ES1","ES2","ES3"], subscriptionRate: 500, insuranceCoverage: 500000 },
  { group: "B", levels: ["P1","P1A","P2","P2A","P3","P3A","P4","P4A","P5","P5A"], subscriptionRate: 400, insuranceCoverage: 400000 },
  { group: "C", levels: ["S1","S1A","S2","S2A","S3","S3A","S4","S4A","S5","S5A"], subscriptionRate: 300, insuranceCoverage: 300000 },
  { group: "D", levels: ["O1","O2","O3","O4"], subscriptionRate: 200, insuranceCoverage: 200000 },
];

export function getGisRule(level: string): GisGroupRule | undefined {
  return GIS_GROUPS.find((g) => g.levels.includes(level));
}

export function computeGisPaybill(level: string): number {
  return getGisRule(level)?.subscriptionRate ?? 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. DRC — TDS & Health Contribution   (Remittances-DRC(ToS, HC))
   ───────────────────────────────────────────────────────────────────────────
   Schedule columns:   Basic Pay | Arrears | Allowances | Gross Pay | TDS | HC
   Formula:            O = I + J    (TDS + HC per employee)
   Remit:              Contra Entry in TSA
   ═══════════════════════════════════════════════════════════════════════════ */
export const HC_RATE = 0.01; // 1 % of Gross Pay
export function computeHC(grossPay: number): number {
  return Math.round(grossPay * HC_RATE);
}

/* TDS slab (FY2025-26) — kept consistent with existing computeTDS in payrollSeed.
   Exemption threshold : Nu 25,000/month
      up to 8,333     : 10 %
      up to 16,667    : 15 % + 833
      up to 33,333    : 20 % + 2,083
      above 33,333    : 25 % + 5,416                                            */
export function computeTDS(monthlyGross: number): number {
  if (monthlyGross <= 25000) return 0;
  const taxable = monthlyGross - 25000;
  if (taxable <= 8333) return Math.round(taxable * 0.10);
  if (taxable <= 16667) return Math.round(833 + (taxable - 8333) * 0.15);
  if (taxable <= 33333) return Math.round(2083 + (taxable - 16667) * 0.20);
  return Math.round(5416 + (taxable - 33333) * 0.25);
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. HOUSE RENT — DRC & NHDCL schedules
   ═══════════════════════════════════════════════════════════════════════════ */
export interface HouseRentLine {
  location: string;
  buildingNo: string;
  flatNo: string;
  amount: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. CSWS — Civil Servant Welfare Scheme (RCSC / RICBL)
   ───────────────────────────────────────────────────────────────────────────
   Fixed subscription; default Nu 150 — configurable per Master Data group.
   ═══════════════════════════════════════════════════════════════════════════ */
export const CSWS_DEFAULT = 150;

/* ═══════════════════════════════════════════════════════════════════════════
   9. RAA — Audit Recoveries schedule
   ═══════════════════════════════════════════════════════════════════════════ */
export interface AuditRecoveryLine {
  ainNo: string;           // Audit Identification No
  amount: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. REMITTANCE SCHEDULES — destinations
   ═══════════════════════════════════════════════════════════════════════════ */
export const REMITTANCE_DESTINATIONS = {
  pf:        { body: "NPPF",  account: "NPPF Common CD Account", contra: "TSA Debit" },
  gis:       { body: "RICBL", account: "GIS Remittance Account", contra: "TSA Debit" },
  tds:       { body: "DRC",   account: "DRC Revenue (TDS)",      contra: "TSA Contra" },
  hc:        { body: "DRC",   account: "DRC Revenue (HC)",       contra: "TSA Contra" },
  rentDrc:   { body: "DRC",   account: "DRC Rent Pool",          contra: "TSA Contra" },
  rentNhdcl: { body: "NHDCL", account: "NHDCL Rent Pool",        contra: "TSA Debit" },
  csws:      { body: "RCSC",  account: "CSWS via RICBL",         contra: "TSA Debit" },
  audit:     { body: "RAA",   account: "RAA Recoveries",         contra: "TSA Contra" },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   11. PAYBILL REPORT-TO-CM  (Paybill report to be sent to CM)
   ───────────────────────────────────────────────────────────────────────────
   Columns: Serial | Name | CID/WP | Designation | Bank A/C (validated) | NetPay
   Post:    "To Cash Management"  — triggers disbursement.
   ═══════════════════════════════════════════════════════════════════════════ */
export interface CashManagementLine {
  serialNo: number;
  name: string;
  cidOrWp: string;
  designation: string;
  bankAccountNo: string;   // populated only after validation complete
  netPay: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. FULL PAY COMPUTATION — wraps everything above for a single employee
   ═══════════════════════════════════════════════════════════════════════════ */
export interface PayComputationInput {
  basicPay: number;
  arrears?: number;
  partialPay?: number;
  totalAllowances: number;
  positionLevel: string;
  houseRent?: number;
  auditRecoveries?: number;
  floatingDeductions?: number;
  cswsOverride?: number;
}

export function computeStandardPay(inp: PayComputationInput) {
  const basicPay = inp.basicPay;
  const arrears = inp.arrears ?? 0;
  const partialPay = inp.partialPay ?? 0;
  const totalEarnings = basicPay + arrears + partialPay + inp.totalAllowances;

  const pf = computePF(basicPay);
  const gis = computeGisPaybill(inp.positionLevel);
  const hc = computeHC(totalEarnings);
  const tds = computeTDS(totalEarnings);
  const csws = inp.cswsOverride ?? CSWS_DEFAULT;
  const houseRent = inp.houseRent ?? 0;
  const auditRecoveries = inp.auditRecoveries ?? 0;
  const floating = inp.floatingDeductions ?? 0;

  const totalDeductions =
    pf.employee + tds + hc + gis + csws + houseRent + auditRecoveries + floating;

  return {
    totalEarnings,
    pfEmployer: pf.employer,
    pfEmployee: pf.employee,
    tds,
    hc,
    gis,
    csws,
    houseRent,
    auditRecoveries,
    floatingDeductions: floating,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
  };
}

/* Standard label list for the Paybill generation UI header strip. */
export const PAYBILL_SCHEDULES = [
  { id: "paybill",      label: "Paybill",                          body: "MoF / Agency" },
  { id: "recoveries",   label: "Paybill Recoveries",               body: "MoF" },
  { id: "cm-report",    label: "Paybill Report to CM",             body: "Cash Mgmt" },
  { id: "drc-tds-hc",   label: "DRC Schedule (TDS + HC)",          body: "DRC" },
  { id: "pf-pension",   label: "PF & Pension Schedule",            body: "NPPF" },
  { id: "gis",          label: "GIS Schedule",                     body: "RICBL" },
  { id: "rent-drc",     label: "DRC House Rent Schedule",          body: "DRC" },
  { id: "rent-nhdcl",   label: "NHDCL House Rent Schedule",        body: "NHDCL" },
  { id: "csws",         label: "CSWS Schedule",                    body: "RCSC / RICBL" },
  { id: "audit-rec",    label: "RAA Audit Recoveries Schedule",    body: "RAA" },
] as const;

export type PaybillScheduleId = (typeof PAYBILL_SCHEDULES)[number]["id"];
