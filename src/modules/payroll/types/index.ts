/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Management — Types (Payroll SRS V1 — Civil Service)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Employee Category ──────────────────────────────────────────────────── */
export type EmployeeCategory = "civil-servant" | "other-public-servant";
export type CivilServantType = "civil-servant" | "esp-gsp" | "para-regular";
export type OPSType = "rub" | "judiciary" | "ecb" | "rbp" | "local-govt" | "parliamentary" | "constitutional-bodies" | "local-recruits";

/* ── Position levels (Bhutan Civil Service) ─────────────────────────────── */
export type PositionLevel =
  | "EX" | "ES1" | "ES2" | "ES3"
  | "P1" | "P1A" | "P2" | "P2A" | "P3" | "P3A" | "P4" | "P4A" | "P5" | "P5A"
  | "S1" | "S1A" | "S2" | "S2A" | "S3" | "S3A" | "S4" | "S4A" | "S5" | "S5A"
  | "O1" | "O2" | "O3" | "O4" | "O5"
  | "GSP" | "ESP";

/* ── Pay Scale ──────────────────────────────────────────────────────────── */
export interface PayScale {
  level: PositionLevel;
  label: string;
  minPay: number;
  increment: number;
  maxPay: number;
}

/* ── Allowance ──────────────────────────────────────────────────────────── */
export type AllowanceFrequency = "monthly" | "annual" | "one-time";
export type AllowanceType = "recurring" | "one-time" | "conditional";
export interface Allowance {
  id: string;
  name: string;
  ucoaCode: string;
  type: AllowanceType;
  frequency: AllowanceFrequency;
  /** Calculation: "fixed", "pct-basic", "slab" */
  calcMethod: "fixed" | "pct-basic" | "slab";
  /** Fixed amount or percentage */
  value: number;
  /** Applicable position levels (empty = all) */
  applicableLevels: PositionLevel[];
  /** Applicable agencies (empty = all) */
  applicableAgencies: string[];
  active: boolean;
}

/* ── Deduction ──────────────────────────────────────────────────────────── */
export type DeductionCategory = "statutory" | "floating" | "recovery";
/** Which employee types this deduction applies to */
export type DeductionApplicability = "civil-servant" | "ops" | "both";
export interface Deduction {
  id: string;
  name: string;
  ucoaCode: string;
  category: DeductionCategory;
  calcMethod: "pct-basic" | "pct-gross" | "fixed" | "slab" | "schedule";
  value: number;
  mandatory: boolean;
  remitTo: string;
  /** Which employee category this deduction applies to (default: "both") */
  applicableTo: DeductionApplicability;
}

/* ── Employee ───────────────────────────────────────────────────────────── */
export type EmployeeStatus = "active" | "on-leave" | "suspended" | "separated" | "transferred";
export interface Employee {
  id: string;
  masterEmpId: string;
  eid: string;
  cid: string;
  tpn: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  dateOfBirth: string;
  dateOfEmployment: string;
  dateOfSeparation?: string;
  category: EmployeeCategory;
  subType: CivilServantType | OPSType;
  /** SRS employee engagement type — sourced from Master Data
   *  (payroll-employee-type LoV: Regular, Contract,
   *  Consolidated-Contract, GSP/ESP, Para-Regular). */
  employeeType?: string;
  /** SRS employee category — sourced from Master Data
   *  (payroll-employee-category LoV).  Maps to a payroll stream via
   *  `streamFor()` in payrollEmployeeCategories.ts. */
  employeeCategoryLabel?: string;
  positionLevel: PositionLevel;
  positionTitle: string;
  occupationalGroup: string;
  agencyCode: string;
  agencyName: string;
  departmentCode: string;
  departmentName: string;
  /** Sub-division within the department */
  subDivision?: string;
  /** UCoA Organizational Segment Code */
  ucoaOrgSegment: string;
  basicPay: number;
  payScale: PayScale;
  /** Eligible allowances (IDs) */
  allowanceIds: string[];
  /** Computed gross */
  grossPay: number;
  /** Computed statutory deductions */
  totalDeductions: number;
  /** Net pay */
  netPay: number;
  bankName: string;
  bankAccountNo: string;
  bankBranch: string;
  pfAccountNo: string;
  gisAccountNo: string;
  nppfTier: "tier1" | "tier2" | "both";
  status: EmployeeStatus;
  source: "zest" | "manual" | "excel-upload";
  lastHRAction?: string;
  lastHRActionDate?: string;
}

/* ── Payroll Record ─────────────────────────────────────────────────────── */
export type PayrollStatus = "draft" | "computed" | "finalized" | "approved" | "posted" | "rejected";
export type PayrollFrequency = "monthly" | "fortnightly";
export interface PayrollRecord {
  id: string;
  period: string;
  month: number;
  year: number;
  frequency: PayrollFrequency;
  agencyCode: string;
  agencyName: string;
  departmentCode: string;
  departmentName: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: PayrollStatus;
  generatedBy: string;
  generatedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  budgetCode: string;
  mcpStatus: "pending" | "cleared" | "failed";
}

/* ── Salary Advance ─────────────────────────────────────────────────────── */
export type AdvanceStatus = "pending" | "approved" | "rejected" | "disbursed" | "recovering" | "settled";
export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  cid: string;
  agencyCode: string;
  amount: number;
  monthlyDeduction: number;
  reason: string;
  status: AdvanceStatus;
  requestDate: string;
  approvedDate?: string;
  totalRecovered: number;
  balanceRemaining: number;
  installments: number;
  completedInstallments: number;
}

/* ── Muster Roll ────────────────────────────────────────────────────────── */
export type MusterRollStatus = "active" | "completed" | "inactive";
export interface MusterRollProject {
  id: string;
  programName: string;
  shortName: string;
  description: string;
  startDate: string;
  endDate: string;
  agencyCode: string;
  agencyName: string;
  budgetCode: string;
  paymentFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  status: MusterRollStatus;
  beneficiaryCount: number;
  totalDisbursed: number;
}

export interface MusterRollBeneficiary {
  id: string;
  projectId: string;
  name: string;
  cid: string;
  workPermit?: string;
  gender: "Male" | "Female" | "Other";
  dateOfBirth: string;
  contactNo: string;
  beneficiaryType: "skilled" | "semi-skilled";
  dailyWage: number;
  bankName: string;
  bankAccountNo: string;
  bankBranch: string;
  status: "active" | "inactive";
}

/* ── Sitting Fee / Honorarium ───────────────────────────────────────────── */
export interface SittingFeeBeneficiary {
  id: string;
  name: string;
  cid: string;
  tpn: string;
  category: "sitting-fee" | "honorarium";
  ratePerDay: number;
  bankName: string;
  bankAccountNo: string;
  bankBranch: string;
  status: "active" | "inactive";
}

/* ── Payroll Generation Steps ───────────────────────────────────────────── */
export type PayrollGenStep =
  | "select-department"
  | "confirm-data"
  | "system-checks"
  | "draft-paybill"
  | "finalize"
  | "book-compensation"
  | "post-mcp";
