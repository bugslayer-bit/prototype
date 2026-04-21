/* ═══════════════════════════════════════════════════════════════════════════
   OPS Payroll Management — Comprehensive Types (Payroll SRS DDi)
   ═══════════════════════════════════════════════════════════════════════════

   This file defines ALL types from the DDi (Data Dictionary) of the Payroll SRS,
   covering the complete spectrum of OPS payroll operations including:
   - Employee master data (DDi 1.0)
   - HR actions and pay updates (DDi 2.0)
   - Pay scales (DDi 3.0-6.0)
   - Payroll records (DDi 7.0)
   - Arrears, pay fixation, rejoining (DDi 23-25)
   - Salary and travel advances (DDi 26-30)
   - Muster rolls, sitting fees, honorariums (DDi 31-34)
   - Retirement benefits (DDi 35.0)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   ENUMERATION TYPES & UNION TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * DDi 1.4 - Gender (Dropdown/LoV)
 */
export type OpsGender = "Male" | "Female" | "Other";

/**
 * DDi 1.5 - Nationality (Dropdown/LoV)
 */
export type OpsNationality =
  | "Bhutanese"
  | "Indian"
  | "Bangladeshi"
  | "Nepalese"
  | "Other";

/**
 * DDi 1.9 - Employee Categories (Dropdown/LoV)
 */
export type OpsEmployeeCategory =
  | "civil-servant"
  | "esp-gsp"
  | "para-regular"
  | "rub"
  | "judiciary"
  | "ecb"
  | "rbp"
  | "local-govt"
  | "parliamentary"
  | "constitutional-bodies"
  | "local-recruits";

/**
 * DDi 1.10 - Employee Type (Dropdown/LoV)
 */
export type OpsEmployeeType =
  | "permanent"
  | "contractual"
  | "temporary"
  | "adhoc"
  | "consultant";

/**
 * DDi 1.12-1.15 - Position & Designation (Dropdown/LoV)
 */
export type OpsPositionLevel =
  | "EX" | "ES1" | "ES2" | "ES3"
  | "P1" | "P1A" | "P2" | "P2A" | "P3" | "P3A" | "P4" | "P4A" | "P5" | "P5A"
  | "S1" | "S1A" | "S2" | "S2A" | "S3" | "S3A" | "S4" | "S4A" | "S5" | "S5A"
  | "O1" | "O2" | "O3" | "O4" | "O5"
  | "GSP" | "ESP" | "SS1";

/**
 * DDi 1.23 - PF Eligible (Dropdown/LoV)
 */
export type OpsPFEligibility = "yes" | "no" | "partial";

/**
 * DDi 1.25 - GIS Eligible (Dropdown/LoV)
 */
export type OpsGISEligibility = "yes" | "no";

/**
 * DDi 1.27 - Is Tax Exempted Y/N (Dropdown/LoV)
 */
export type OpsTaxExemptionStatus = "yes" | "no";

/**
 * DDi 1.29 - Is Health Contribution Exempted Y/N (Dropdown/LoV)
 */
export type OpsHealthContributionExemptionStatus = "yes" | "no";

/**
 * DDi 1.30 - Is CSWS Member (Dropdown/LoV)
 */
export type OpsCswsMemberStatus = "yes" | "no";

/**
 * DDi 2.1 - HR Actions (Dropdown/LoV)
 */
export type OpsHrActionType =
  | "salary-increment"
  | "promotion"
  | "transfer"
  | "contract-extension"
  | "secondment"
  | "ltt"
  | "stt"
  | "leave"
  | "hr-audit"
  | "legal-action"
  | "separation";

/**
 * DDi 2.6 - Promotion Type (Dropdown/LoV)
 */
export type OpsPromotionType =
  | "normal-promotion"
  | "accelerated-promotion"
  | "in-situ-promotion"
  | "lateral-promotion";

/**
 * DDi 2.11 - Transfer Type (Dropdown/LoV)
 */
export type OpsTransferType =
  | "normal-transfer"
  | "urgent-transfer"
  | "inter-agency-transfer"
  | "intra-agency-transfer";

/**
 * DDi 2.25 - Leave Type (Dropdown/LoV)
 */
export type OpsLeaveType =
  | "annual-leave"
  | "sick-leave"
  | "study-leave"
  | "maternity-leave"
  | "paternity-leave"
  | "compassionate-leave"
  | "deputation-leave"
  | "unpaid-leave";

/**
 * DDi 2.27 - HR Audit Type (Dropdown/LoV)
 */
export type OpsHrAuditType =
  | "compliance-audit"
  | "payroll-audit"
  | "documentation-audit"
  | "benefits-audit";

/**
 * DDi 2.28 - Legal Action Type (Dropdown/LoV)
 */
export type OpsLegalActionType =
  | "suspension"
  | "dismissal"
  | "demotion"
  | "wage-recovery"
  | "recovery-proceeding";

/**
 * DDi 2.29 - Separation Type (Dropdown/LoV)
 */
export type OpsSeparationType =
  | "superannuation"
  | "compulsory-retirement"
  | "termination-with-benefits"
  | "early-retirement"
  | "voluntary-resignation"
  | "disability-medical"
  | "death";

/**
 * DDi 7.5 - Arrears handling (Dropdown/LoV, conditional)
 */
export type OpsArrearsType =
  | "delayed-promotion"
  | "salary-revision"
  | "correction-past-errors"
  | "other";

/**
 * DDi 7.6/7.7 - Fixed/Variable Pay (Dropdown/LoV)
 */
export type OpsPayComponentType =
  | "basic"
  | "allowance"
  | "bonus"
  | "honorarium"
  | "advance-recovery"
  | "other";

/**
 * DDi 24.2 - Pay Fixation Type (Dropdown/LoV)
 */
export type OpsPayFixationType =
  | "first-appointment"
  | "promotion-fixation"
  | "pay-revision-fixation"
  | "re-joining-fixation"
  | "miscellaneous-fixation";

/**
 * DDi 26.12 - Deduction Method (Dropdown/LoV)
 */
export type OpsDeductionMethod =
  | "single-installment"
  | "multiple-installments"
  | "monthly-deduction"
  | "lump-sum-recovery";

/**
 * Status enums for various records
 */
export type OpsRecordStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "processed"
  | "completed";

export type OpsPaymentStatus =
  | "pending"
  | "approved"
  | "disbursed"
  | "failed"
  | "settled";

export type OpsEmployeeStatus =
  | "active"
  | "on-leave"
  | "suspended"
  | "separated"
  | "transferred"
  | "retired";

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 1.0 - EMPLOYEE MASTER DATA (36 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Employee Full - Complete employee record with all DDi 1.0 fields
 * References: DDi 1.1 through 1.36
 */
export interface OpsEmployeeFull {
  /** DDi 1.1 - EmpID-MasterID (Numeric, Y) - System-generated unique identifier */
  masterEmpId: string;

  /** DDi 1.2 - Employee ID (Numeric, Y) - Government employee ID */
  eid: string;

  /** DDi 1.3 - First Name (VARCHAR, Y) */
  firstName: string;

  /** DDi 1.3 - Middle Name (VARCHAR, optional) */
  middleName?: string;

  /** DDi 1.3 - Last Name/Surname (VARCHAR, Y) */
  lastName: string;

  /** DDi 1.4 - Gender (Dropdown/LoV, Y) */
  gender: OpsGender;

  /** DDi 1.5 - Nationality (Dropdown/LoV, Y) */
  nationality: OpsNationality;

  /** DDi 1.6 - CID (Citizenship ID) (Numeric, Y, 11-digit) */
  cid: string;

  /** DDi 1.7 - Work Permit (Alphanumeric, Y) */
  workPermit: string;

  /** DDi 1.8 - TPN (Tax Payer Number) (Alphanumeric, Y) */
  tpn: string;

  /** DDi 1.9 - Employee Categories (Dropdown/LoV, Y) */
  employeeCategory: OpsEmployeeCategory;

  /** DDi 1.10 - Employee Type (Dropdown/LoV, Y) */
  employeeType: OpsEmployeeType;

  /** DDi 1.11 - Date of Birth (Date, Y, DD/MM/YYYY format) */
  dateOfBirth: string;

  /** DDi 1.12 - Position Title (Dropdown/LoV, Y) */
  positionTitle: string;

  /** DDi 1.13 - Designation (Dropdown/LoV, Y) */
  designation: string;

  /** DDi 1.14 - Position Level (Dropdown/LoV, Y) */
  positionLevel: OpsPositionLevel;

  /** DDi 1.15 - Pay Scale (Dropdown/LoV, Y) - Reference to pay scale ID */
  payScaleId: string;

  /** DDi 1.16 - Monthly Basic Pay (Numeric, Y) */
  monthlyBasicPay: number;

  /** DDi 1.17 - Working Agency (Dropdown/LoV, Y) - Agency code/ID */
  workingAgency: string;

  /** DDi 1.18 - Organization Segment (Dropdown/LoV, Y) - UCoA segment */
  organizationSegment: string;

  /** DDi 1.19 - Appointment Date (Date, Y) */
  appointmentDate: string;

  /** DDi 1.20 - Increment Date (Date, conditional) */
  incrementDate?: string;

  /** DDi 1.21 - Superannuation Date (Date, Y) */
  superannuationDate: string;

  /** DDi 1.22 - Contract End Date (Date, Y) */
  contractEndDate: string;

  /** DDi 1.23 - PF Eligible (Dropdown/LoV, Y) */
  pfEligible: OpsPFEligibility;

  /** DDi 1.24 - PF Account Number (VARCHAR, conditional) */
  pfAccountNo?: string;

  /** DDi 1.25 - GIS Eligible (Dropdown/LoV, Y) */
  gisEligible: OpsGISEligibility;

  /** DDi 1.26 - GIS Number (VARCHAR, conditional) */
  gisAccountNo?: string;

  /** DDi 1.27 - Is Tax Exempted Y/N (Dropdown/LoV, Y) */
  isTaxExempted: OpsTaxExemptionStatus;

  /** DDi 1.28 - Reason for Tax Exemption (VARCHAR, conditional) */
  taxExemptionReason?: string;

  /** DDi 1.29 - Is Health Contribution Exempted Y/N (Dropdown/LoV, Y) */
  isHealthContributionExempted: OpsHealthContributionExemptionStatus;

  /** DDi 1.30 - Is CSWS Member (Dropdown/LoV, Y) */
  isCswsMember: OpsCswsMemberStatus;

  /** DDi 1.31 - Email ID (VARCHAR, Y) */
  emailId: string;

  /** DDi 1.32 - Mobile Number (Numeric, Y) */
  mobileNumber: string;

  /** DDi 1.33 - Bank Name (Dropdown/LoV, Y) */
  bankName: string;

  /** DDi 1.34 - Bank Account Number (Numeric, Y) */
  bankAccountNumber: string;

  /** DDi 1.35 - Bank Branch (Dropdown/LoV, Y) */
  bankBranch: string;

  /** DDi 1.36 - Joining Date (Date, Y) */
  joiningDate: string;

  /** Additional metadata - source of record */
  source: "zest" | "manual" | "excel-upload";

  /** Record status */
  status: OpsEmployeeStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 2.0 - EMPLOYEE PAY UPDATE / HR ACTIONS (30 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS HR Action - Complete HR action record with all DDi 2.0 fields
 * References: DDi 2.1 through 2.30
 */
export interface OpsHrAction {
  /** System-generated unique identifier */
  id: string;

  /** DDi 2.1 - HR Actions (Dropdown/LoV, Y) - Type of action being taken */
  hrAction: OpsHrActionType;

  /** DDi 2.2 - Employee ID (Numeric, Y) */
  employeeId: string;

  /** DDi 2.3 - Old Basic Pay (Numeric, Y) */
  oldBasicPay: number;

  /** DDi 2.4 - Increment (Numeric, Y) */
  increment: number;

  /** DDi 2.5 - New Basic Pay (Numeric, Y) */
  newBasicPay: number;

  // ─── Promotion-specific fields (DDi 2.6-2.8) ───
  /** DDi 2.6 - Promotion Type (Dropdown/LoV, Y) - Conditional on promotion action */
  promotionType?: OpsPromotionType;

  /** DDi 2.7 - New Position Title (Dropdown/LoV, Y) - Conditional on promotion */
  newPositionTitle?: string;

  /** DDi 2.8 - New Pay Scale (Numeric, Y) - Conditional on promotion */
  newPayScale?: string;

  /** DDi 2.9 - New Working Agency (Dropdown/LoV, Y) - Conditional on promotion */
  newWorkingAgency?: string;

  /** DDi 2.10 - New Increment Date (Date, Y) - Conditional on promotion */
  newIncrementDate?: string;

  // ─── Transfer-specific fields (DDi 2.11-2.12) ───
  /** DDi 2.11 - Transfer Type (Dropdown/LoV, Y) - Conditional on transfer */
  transferType?: OpsTransferType;

  /** DDi 2.12 - Date of Joining (Date, Y) - Conditional on transfer */
  dateOfJoining?: string;

  // ─── Contract Extension fields (DDi 2.13-2.14) ───
  /** DDi 2.13 - Contract Extended Date (Date, Y) - Conditional on extension */
  contractExtendedDate?: string;

  /** DDi 2.14 - New Position Title (Dropdown, Y) - Conditional on extension */
  contractNewPositionTitle?: string;

  // ─── Secondment fields (DDi 2.15-2.16) ───
  /** DDi 2.15 - Secondment from date (Date, Y) - Conditional on secondment */
  secondmentFromDate?: string;

  /** DDi 2.16 - Secondment Until date (Date, Y) - Conditional on secondment */
  secondmentUntilDate?: string;

  // ─── LTT (Long-term Training) fields (DDi 2.17-2.20) ───
  /** DDi 2.17 - LTT from date (Date, Y) - Conditional on LTT */
  lttFromDate?: string;

  /** DDi 2.18 - LTT until date (Date, Y) - Conditional on LTT */
  lttUntilDate?: string;

  /** DDi 2.19 - LTT Country (Dropdown/LoV, Y) - Conditional on LTT */
  lttCountry?: string;

  /** DDi 2.20 - LTT Place of Training (VARCHAR, Y) - Conditional on LTT */
  lttPlaceOfTraining?: string;

  // ─── STT (Short-term Training) fields (DDi 2.21-2.24) ───
  /** DDi 2.21 - STT from date (Date, Y) - Conditional on STT */
  sttFromDate?: string;

  /** DDi 2.22 - STT until date (Date, Y) - Conditional on STT */
  sttUntilDate?: string;

  /** DDi 2.23 - STT Country (VARCHAR, Y) - Conditional on STT */
  sttCountry?: string;

  /** DDi 2.24 - STT Place of Training (VARCHAR, Y) - Conditional on STT */
  sttPlaceOfTraining?: string;

  // ─── Leave fields (DDi 2.25-2.26) ───
  /** DDi 2.25 - Leave Type (Dropdown/LoV, Y) - Conditional on leave action */
  leaveType?: OpsLeaveType;

  /** DDi 2.26 - Leave till date (Date, Y) - Conditional on leave */
  leaveTillDate?: string;

  // ─── HR Audit field (DDi 2.27) ───
  /** DDi 2.27 - HR Audit Type (Dropdown/LoV, Y) - Conditional on audit */
  hrAuditType?: OpsHrAuditType;

  // ─── Legal Action field (DDi 2.28) ───
  /** DDi 2.28 - Legal Action Type (Dropdown/LoV, Y) - Conditional on legal action */
  legalActionType?: OpsLegalActionType;

  // ─── Separation fields (DDi 2.29-2.30) ───
  /** DDi 2.29 - Separation Type (Dropdown/LoV, Y) - Conditional on separation */
  separationType?: OpsSeparationType;

  /** DDi 2.30 - Separation Date (Date, Y) - Conditional on separation */
  separationDate?: string;

  /** Action date/effective date */
  effectiveDate: string;

  /** Record status */
  status: OpsRecordStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 3.0-6.0 - PAY SCALE & SCHEDULE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Pay Scale - References DDi 3.0
 * Contains minimum pay (3.1), increment (3.2), and maximum pay (3.3)
 */
export interface OpsPayScale {
  /** System-generated unique identifier */
  id: string;

  /** Pay scale code/name */
  code: string;

  /** Position level */
  level: OpsPositionLevel;

  /** DDi 3.1 - Minimum Pay (Numeric) */
  minPay: number;

  /** DDi 3.2 - Increment (Numeric) - Annual/step increment */
  increment: number;

  /** DDi 3.3 - Maximum Pay (Numeric) */
  maxPay: number;

  /** Applicable from date */
  effectiveFrom: string;

  /** Applicable until date (optional) */
  effectiveUntil?: string;

  /** Active status */
  active: boolean;
}

/**
 * OPS Pay Schedule - References DDi 4.0-6.0
 * Manages payment schedule dates and deadlines
 */
export interface OpsPaySchedule {
  /** System-generated unique identifier */
  id: string;

  /** Financial year (YYYY format) */
  financialYear: string;

  /** Month (1-12) */
  month: number;

  /** DDi 4.1 - Pay Generation Day (specific date for pay generation) */
  payGenerationDay: string;

  /** DDi 5.1 - Pay Disbursement Day (specific date for disbursement) */
  payDisbursementDay: string;

  /** DDi 6.1 - Pay Update Deadline (deadline for HR action updates) */
  payUpdateDeadline: string;

  /** Status */
  status: "scheduled" | "active" | "completed";
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 7.0 - PAYROLL RECORD (13 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Payroll Record - Complete payroll entry with all DDi 7.0 fields
 * References: DDi 7.1 through 7.13
 */
export interface OpsPayrollRecord {
  /** System-generated unique identifier */
  id: string;

  /** Payroll period identifier (YYYY-MM format) */
  period: string;

  /** Financial year */
  year: number;

  /** Month (1-12) */
  month: number;

  // ─── Employee identification (DDi 7.1, 7.3) ───
  /** DDi 7.1 - Employee Name (VARCHAR) */
  employeeName: string;

  /** DDi 7.2 - Position Title (VARCHAR) */
  positionTitle: string;

  /** DDi 7.3 - CID (Numeric) */
  cid: string;

  /** Employee ID reference */
  employeeId: string;

  // ─── Pay components (DDi 7.4-7.7) ───
  /** DDi 7.4 - Monthly Basic Pay (Numeric) */
  monthlyBasicPay: number;

  /** DDi 7.5 - Arrears (Dropdown, conditional) */
  arrears?: {
    type: OpsArrearsType;
    amount: number;
    reason?: string;
  };

  /** DDi 7.6 - Fixed Pay (Dropdown/LoV) - Allowances that are fixed */
  fixedPay: {
    components: OpsPayComponentType[];
    amount: number;
  };

  /** DDi 7.7 - Variable Pay (Dropdown/LoV) - Allowances that are variable */
  variablePay: {
    components: OpsPayComponentType[];
    amount: number;
  };

  // ─── Computed pay (DDi 7.8-7.11) ───
  /** DDi 7.8 - Gross Pay (Numeric) - Basic + Fixed + Variable + Arrears */
  grossPay: number;

  /** DDi 7.9 - Statutory Deductions (Numeric) - PF, GIS, HC, etc. */
  statutoryDeductions: number;

  /** DDi 7.10 - Other Deductions (Numeric) - Floating, loans, advances, etc. */
  otherDeductions: number;

  /** DDi 7.11 - Total Deductions (Numeric) */
  totalDeductions: number;

  // ─── Net & Special Deductions (DDi 7.12-7.13) ───
  /** DDi 7.12 - Net Pay (Numeric) - Gross - Total Deductions */
  netPay: number;

  /** DDi 7.13 - GPF (General Provident Fund) (Numeric) - Subset of deductions */
  gpfDeduction: number;

  /** Agency information */
  agencyCode: string;
  agencyName: string;

  /** Department information */
  departmentCode?: string;
  departmentName?: string;

  /** Payroll status */
  status: OpsRecordStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 23.0 - ARREARS AND ALLOWANCE (4 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Arrears Record - Complete arrears and allowance record
 * References: DDi 23.1 through 23.4
 */
export interface OpsArrearsRecord {
  /** System-generated unique identifier */
  id: string;

  /** DDi 23.1 - Emp ID (Numeric) */
  employeeId: string;

  /** Employee name for reference */
  employeeName: string;

  /** DDi 23.2 - Salary Arrears (Numeric, conditional)
   * Reasons: delayed promotion, salary revision, correction of past errors */
  salaryArrears?: {
    amount: number;
    reason: OpsArrearsType;
    description?: string;
    applicableFromDate: string;
    applicableToDate: string;
  };

  /** DDi 23.3 - Allowance Arrears (Numeric, conditional) */
  allowanceArrears?: {
    allowanceId: string;
    allowanceName: string;
    amount: number;
    applicableFromDate: string;
    applicableToDate: string;
  }[];

  /** DDi 23.4 - Add any other allowance arrears (Numeric, conditional) */
  otherAllowanceArrears?: {
    description: string;
    amount: number;
    applicableFromDate: string;
    applicableToDate: string;
  }[];

  /** Total arrears amount */
  totalArrearsAmount: number;

  /** Record status */
  status: OpsRecordStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 24.0 - PAY FIXATION (4 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Pay Fixation - Complete pay fixation record
 * References: DDi 24.1 through 24.4
 */
export interface OpsPayFixation {
  /** System-generated unique identifier */
  id: string;

  /** DDi 24.1 - Emp ID (Numeric) */
  employeeId: string;

  /** Employee name for reference */
  employeeName: string;

  /** DDi 24.2 - Pay Fixation Type (Dropdown/LoV) */
  payFixationType: OpsPayFixationType;

  /** DDi 24.3 - New Basic Pay (Numeric) */
  newBasicPay: number;

  /** DDi 24.4 - Allowances/Arrears (Numeric, composite) */
  allowancesAndArrears: {
    allowances: Array<{
      allowanceId: string;
      name: string;
      amount: number;
    }>;
    arrears?: {
      amount: number;
      reason: string;
    };
  };

  /** Effective from date */
  effectiveFromDate: string;

  /** Pay fixation date */
  payFixationDate: string;

  /** Record status */
  status: OpsRecordStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 25.0 - RE-JOINING (2 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Re-join Record - Employee re-joining record
 * References: DDi 25.1 through 25.2
 */
export interface OpsRejoin {
  /** System-generated unique identifier */
  id: string;

  /** DDi 25.1 - Emp ID (Numeric) */
  employeeId: string;

  /** Employee name for reference */
  employeeName: string;

  /** DDi 25.2 - Re-join date (Date) */
  rejoinDate: string;

  /** Previous separation date */
  previousSeparationDate?: string;

  /** Reason for rejoining */
  rejoinReason?: string;

  /** Record status */
  status: OpsRecordStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 26.0 - SALARY ADVANCE (13 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Salary Advance - Complete salary advance record
 * References: DDi 26.1 through 26.13
 */
export interface OpsSalaryAdvance {
  /** System-generated unique identifier */
  id: string;

  /** DDi 26.1 - Employee Name (VARCHAR) */
  employeeName: string;

  /** DDi 26.2 - Position Title (VARCHAR) */
  positionTitle: string;

  /** DDi 26.3 - CID (Numeric) */
  cid: string;

  /** Employee ID reference */
  employeeId: string;

  /** DDi 26.4 - Basic Pay (Numeric) */
  basicPay: number;

  /** DDi 26.5 - Gross Pay (Numeric) */
  grossPay: number;

  /** DDi 26.6 - Advance Requested (Numeric) */
  advanceRequested: number;

  /** DDi 26.7 - Payroll Department Name (VARCHAR) */
  payrollDepartmentName: string;

  /** DDi 26.8 - Agency Name (VARCHAR) */
  agencyName: string;

  /** DDi 26.9 - Budget Code (VARCHAR) */
  budgetCode: string;

  /** DDi 26.10 - Budget Balance Check (Numeric) - Available balance check */
  budgetBalanceCheck: number;

  /** DDi 26.11 - Commitment Amount Check (Numeric) - Committed amount check */
  commitmentAmountCheck: number;

  /** DDi 26.12 - Deduction Method (Dropdown/LoV) */
  deductionMethod: OpsDeductionMethod;

  /** DDi 26.13 - Payment Order creation and MCP Check (VARCHAR/Status) */
  paymentOrderStatus: "pending" | "created" | "mcp-cleared" | "failed";

  /** Payment order reference number */
  paymentOrderNumber?: string;

  /** Advance amount approved */
  amountApproved: number;

  /** Deduction details */
  deductionDetails?: {
    installmentCount: number;
    monthlyDeduction: number;
    startMonth: string;
  };

  /** Record status */
  status: OpsPaymentStatus;

  /** Request date */
  requestDate: string;

  /** Approval date */
  approvalDate?: string;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 27.0 - FLOATING DEDUCTIONS (7 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Floating Deduction - Temporary deductions not part of statutory structure
 * References: DDi 27.1 through 27.7
 */
export interface OpsFloatingDeduction {
  /** System-generated unique identifier */
  id: string;

  /** DDi 27.1 - Employee Name (VARCHAR) */
  employeeName: string;

  /** DDi 27.2 - Position Title (VARCHAR) */
  positionTitle: string;

  /** DDi 27.3 - CID (Numeric) */
  cid: string;

  /** Employee ID reference */
  employeeId: string;

  /** DDi 27.4 - Basic Pay (Numeric) */
  basicPay: number;

  /** DDi 27.5 - Gross Pay (Numeric) */
  grossPay: number;

  /** DDi 27.6 - Name of floating deductions (VARCHAR) */
  deductionName: string;

  /** Deduction amount */
  deductionAmount: number;

  /** DDi 27.7 - Deduction method (VARCHAR - single/multiple installments) */
  deductionMethod: OpsDeductionMethod;

  /** Applicable from date */
  applicableFromDate: string;

  /** Applicable until date */
  applicableUntilDate?: string;

  /** Reason for deduction */
  reason?: string;

  /** Record status */
  status: "active" | "completed" | "cancelled";

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 28.0 - TRAVEL ADVANCE - LOCAL CURRENCY (12 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Travel Advance (Local Currency) - Travel advance in local currency
 * References: DDi 28.1 through 29.2 (as per spec)
 */
export interface OpsTravelAdvanceLocal {
  /** System-generated unique identifier */
  id: string;

  /** DDi 28.1 - Employee Name (VARCHAR) */
  employeeName: string;

  /** DDi 28.2 - Position Title (VARCHAR) */
  positionTitle: string;

  /** DDi 28.3 - CID (Numeric) */
  cid: string;

  /** Employee ID reference */
  employeeId: string;

  /** DDi 28.4 - Agency Name (VARCHAR) */
  agencyName: string;

  /** Agency code */
  agencyCode?: string;

  /** DDi 28.5 - Budget Code (VARCHAR) */
  budgetCode: string;

  /** DDi 28.6 - Approved TA reference no. (from e-DATS) (VARCHAR) */
  approvedTARefNo: string;

  /** DDi 28.7 - Approved advance amount (Numeric) */
  approvedAdvanceAmount: number;

  /** DDi 28.8 - Date of approval (Date) */
  dateOfApproval: string;

  /** DDi 28.9 - Travel purpose (VARCHAR) */
  travelPurpose: string;

  /** DDi 29.0 - Budget code (VARCHAR, duplicate reference in spec) */
  // Covered by budgetCode above

  /** DDi 29.1 - Payment transaction ref (IFMIS) (VARCHAR) */
  paymentTransactionRef: string;

  /** DDi 29.2 - Status for Advances (VARCHAR) */
  advanceStatus: OpsPaymentStatus;

  /** Currency (local) */
  currency: string;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 29.0 - TRAVEL ADVANCE - FOREIGN CURRENCY (12 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Travel Advance (Foreign Currency) - Travel advance in foreign currency
 * References: DDi 29.1 through 29.12
 */
export interface OpsTravelAdvanceForeign {
  /** System-generated unique identifier */
  id: string;

  /** DDi 29.1 - Employee Name (VARCHAR) */
  employeeName: string;

  /** DDi 29.2 - Position Title (VARCHAR) */
  positionTitle: string;

  /** DDi 29.3 - CID (Numeric) */
  cid: string;

  /** Employee ID reference */
  employeeId: string;

  /** DDi 29.4 - Agency name/ID (VARCHAR) */
  agencyName: string;

  /** Agency code */
  agencyCode?: string;

  /** DDi 29.5 - Approved TA ref (e-DATS) (VARCHAR) */
  approvedTARef: string;

  /** DDi 29.6 - Approved advance amount (Numeric) */
  approvedAdvanceAmount: number;

  /** DDi 29.7 - Date of approval (Date) */
  dateOfApproval: string;

  /** DDi 29.8 - Travel purpose (VARCHAR) */
  travelPurpose: string;

  /** DDi 29.9 - Budget code (VARCHAR) */
  budgetCode: string;

  /** DDi 29.10 - Country of travel (VARCHAR) */
  countryOfTravel: string;

  /** DDi 29.11 - Currency (VARCHAR) */
  currency: string;

  /** DDi 29.12 - Payment transaction ref (IFMIS) (VARCHAR) */
  paymentTransactionRef: string;

  /** Advance status */
  advanceStatus: OpsPaymentStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 30.0 - TRAVEL PLAN (11 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Travel Plan - Travel plan details and approval
 * References: DDi 30.1 through 30.11
 */
export interface OpsTravelPlan {
  /** System-generated unique identifier */
  id: string;

  /** DDi 30.1 - Employee Name (VARCHAR) */
  employeeName: string;

  /** DDi 30.2 - Position Title (VARCHAR) */
  positionTitle: string;

  /** DDi 30.3 - CID (Numeric) */
  cid: string;

  /** Employee ID reference */
  employeeId: string;

  /** DDi 30.4 - Agency name/ID (VARCHAR) */
  agencyName: string;

  /** Agency code */
  agencyCode?: string;

  /** DDi 30.5 - Approved TA ref (e-DATS) (VARCHAR) */
  approvedTARef: string;

  /** DDi 30.6 - Date of approval (Date) */
  dateOfApproval: string;

  /** DDi 30.7 - Travel purpose (VARCHAR) */
  travelPurpose: string;

  /** DDi 30.8 - Budget code (VARCHAR) */
  budgetCode: string;

  /** DDi 30.9 - Country of travel (VARCHAR) */
  countryOfTravel: string;

  /** DDi 30.10 - Currency (VARCHAR) */
  currency: string;

  /** DDi 30.11 - Payment transaction ref (IFMIS) (VARCHAR) */
  paymentTransactionRef: string;

  /** Travel plan status */
  planStatus: "draft" | "submitted" | "approved" | "completed" | "cancelled";

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 31.0 - MUSTERROLL BENEFICIARY (13 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Musterroll Beneficiary - Master record for musterroll workers
 * References: DDi 31.1 through 31.13
 */
export interface OpsMusterrollBeneficiary {
  /** System-generated unique identifier */
  id: string;

  /** DDi 31.1 - Name (VARCHAR) */
  name: string;

  /** DDi 31.2 - CID (Numeric) */
  cid: string;

  /** DDi 31.3 - Work Permit (VARCHAR) */
  workPermit: string;

  /** DDi 31.4 - Nationality (VARCHAR) */
  nationality: OpsNationality;

  /** DDi 31.5 - Agency name/ID (VARCHAR) */
  agencyName: string;

  /** Agency code */
  agencyCode?: string;

  /** DDi 31.6 - Category (VARCHAR) */
  category: string;

  /** DDi 31.7 - Position/Job (VARCHAR) */
  positionJob: string;

  /** DDi 31.8 - Daily Wage (Numeric) */
  dailyWage: number;

  /** DDi 31.9 - Lumpsum Amount (Numeric) */
  lumpsumAmount: number;

  /** DDi 31.10 - Location (VARCHAR) */
  location: string;

  /** DDi 31.11 - Bank Name (VARCHAR) */
  bankName: string;

  /** DDi 31.12 - Bank Account Number (VARCHAR) */
  bankAccountNumber: string;

  /** DDi 31.13 - TPN (Numeric) */
  tpn: string;

  /** Bank branch */
  bankBranch?: string;

  /** Beneficiary status */
  status: "active" | "inactive" | "completed";

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 32.0 - MUSTERROLL PAYMENT (10 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Musterroll Payment - Payment record for musterroll workers
 * References: DDi 32.1 through 32.10
 */
export interface OpsMusterrollPayment {
  /** System-generated unique identifier */
  id: string;

  /** DDi 32.1 - Name (VARCHAR) */
  name: string;

  /** DDi 32.2 - CID (Numeric) */
  cid: string;

  /** DDi 32.3 - Work Permit (VARCHAR) */
  workPermit: string;

  /** DDi 32.4 - Agency name/ID (VARCHAR) */
  agencyName: string;

  /** Agency code */
  agencyCode?: string;

  /** DDi 32.5 - Position/Job (VARCHAR) */
  positionJob: string;

  /** DDi 32.6 - Daily Wage (Numeric) */
  dailyWage: number;

  /** DDi 32.7 - Monthly Wage (Numeric) */
  monthlyWage: number;

  /** DDi 32.8 - Other allowance (Numeric) */
  otherAllowance: number;

  /** DDi 32.9 - Deduction (Numeric) */
  deduction: number;

  /** DDi 32.10 - Net Pay (Numeric) */
  netPay: number;

  /** Payment period */
  paymentPeriod: string;

  /** Payment status */
  paymentStatus: OpsPaymentStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 33.0 - SITTING FEE DETAILS (11 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Sitting Fee Record - Sitting fee payment record
 * References: DDi 33.1 through 33.21
 */
export interface OpsSittingFeeRecord {
  /** System-generated unique identifier */
  id: string;

  /** DDi 33.1 - Name (VARCHAR) */
  name: string;

  /** DDi 33.2 - CID (Numeric) */
  cid: string;

  /** DDi 32.3 - Work Permit (VARCHAR) */
  workPermit: string;

  /** DDi 32.4 - TPN No (VARCHAR) */
  tpn: string;

  /** DDi 33.5 - Start Date (Date) */
  startDate: string;

  /** DDi 33.6 - End Date (Date) */
  endDate: string;

  /** DDi 33.7 - Duration/No. of days attended (Numeric) */
  daysAttended: number;

  /** DDi 33.8 - Rates per hour/day (Numeric) */
  ratePerDay: number;

  /** DDi 33.9 - Gross Amount (Numeric) */
  grossAmount: number;

  /** DDi 33.2 - Taxes or Deductions (Numeric) - Note: spec shows duplicate field number */
  taxesDeductions: number;

  /** DDi 33.21 - Net Pay (Numeric) - Note: spec shows out-of-sequence number */
  netPay: number;

  /** Payment status */
  paymentStatus: OpsPaymentStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 34.0 - HONORARIUM DETAILS (11 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Honorarium Record - Honorarium payment record
 * References: DDi 34.1 through 34.21
 */
export interface OpsHonorariumRecord {
  /** System-generated unique identifier */
  id: string;

  /** DDi 34.1 - Name (VARCHAR) */
  name: string;

  /** DDi 34.2 - CID (Numeric) */
  cid: string;

  /** DDi 32.3 - Work Permit (VARCHAR) */
  workPermit: string;

  /** DDi 32.4 - TPN No (VARCHAR) */
  tpn: string;

  /** DDi 34.5 - Start Date (Date) */
  startDate: string;

  /** DDi 34.6 - End Date (Date) */
  endDate: string;

  /** DDi 34.7 - Duration/No. of days attended (Numeric) */
  daysAttended: number;

  /** DDi 34.8 - Rates per hour/day (Numeric) */
  ratePerDay: number;

  /** DDi 34.9 - Gross Amount (Numeric) */
  grossAmount: number;

  /** DDi 34.2 - Taxes or Deductions (Numeric) - Note: spec shows duplicate field number */
  taxesDeductions: number;

  /** DDi 34.21 - Net Pay (Numeric) - Note: spec shows out-of-sequence number */
  netPay: number;

  /** Payment status */
  paymentStatus: OpsPaymentStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DDi 35.0 - RETIREMENT BENEFITS (35 fields)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Retirement Benefit Dependent/Nominee
 * Sub-interface for nominee/dependent details (DDi 35.26-35.31)
 */
export interface OpsRetirementBenefitNominee {
  /** DDi 35.26 - Name (VARCHAR) */
  name: string;

  /** DDi 35.27 - Relationship (VARCHAR) */
  relationship: string;

  /** DDi 35.28 - Bank Account Number (VARCHAR) */
  bankAccountNumber: string;

  /** DDi 35.29 - Bank Name (VARCHAR) */
  bankName: string;

  /** DDi 35.30 - Bank Branch (VARCHAR) */
  bankBranch: string;

  /** DDi 35.31 - Amount (Numeric) */
  amount: number;
}

/**
 * OPS Retirement Benefit - Complete retirement benefit record
 * References: DDi 35.1 through 35.35
 */
export interface OpsRetirementBenefit {
  /** System-generated unique identifier */
  id: string;

  // ─── Retirement Type (DDi 35.1-35.6) ───
  /** DDi 35.1-35.6 - Retirement Type */
  retirementType: OpsSeparationType;

  // ─── Agency Details (DDi 35.7-35.8) ───
  /** DDi 35.7 - Agency Code (VARCHAR) */
  agencyCode: string;

  /** Agency name */
  agencyName: string;

  /** DDi 35.8 - Budget Code (VARCHAR) */
  budgetCode: string;

  // ─── Employee Details (DDi 35.9-35.15) ───
  /** DDi 35.9 - Name (VARCHAR) */
  name: string;

  /** DDi 35.10 - CID (Numeric) */
  cid: string;

  /** DDi 35.11 - EID (Numeric) */
  eid: string;

  /** DDi 35.12 - Work Permit (VARCHAR) */
  workPermit: string;

  /** DDi 35.13 - TPN (VARCHAR) */
  tpn: string;

  /** DDi 35.14 - Last working agency (VARCHAR) */
  lastWorkingAgency: string;

  /** DDi 35.15 - Payroll Department (VARCHAR) */
  payrollDepartment: string;

  // ─── Service Details (DDi 35.16) ───
  /** DDi 35.16 - Completed years of service (Numeric) */
  completedYearsOfService: number;

  // ─── Benefit Components (DDi 35.17-35.25) ───
  /** DDi 35.17 - Gratuity Amount (Numeric) */
  gratuityAmount: number;

  /** DDi 35.18 - Transfer Grant (Numeric) */
  transferGrant: number;

  /** DDi 35.19 - Travelling Allowance (Numeric) */
  travellingAllowance: number;

  /** DDi 35.20 - Transport Charges (Numeric) */
  transportCharges: number;

  /** DDi 35.21 - Leave Balance Encashment (Numeric) */
  leaveBalanceEncashment: number;

  /** DDi 35.22 - Mileage (Numeric) */
  mileage: number;

  /** DDi 35.23 - Gross benefit amount (Numeric) */
  grossBenefitAmount: number;

  /** DDi 35.24 - Taxes or Deductions (Numeric) */
  taxesDeductions: number;

  /** DDi 35.25 - Net Benefit Amount (Numeric) */
  netBenefitAmount: number;

  // ─── Dependent/Nominee Details (DDi 35.26-35.31) ───
  /** DDi 35.26-35.31 - Dependent/Nominee information */
  nominees: OpsRetirementBenefitNominee[];

  // ─── Payment Details (DDi 35.31-35.35) ───
  /** DDi 35.31 - Agency Code (Numeric) - Payment agency */
  paymentAgencyCode?: string;

  /** DDi 35.32 - Budget Code (VARCHAR) - Payment budget */
  paymentBudgetCode?: string;

  /** DDi 35.33 - Commitment Check (VARCHAR/Status) */
  commitmentCheck: "passed" | "failed" | "pending";

  /** DDi 35.34 - Fund Balance Check (VARCHAR/Status) */
  fundBalanceCheck: "passed" | "failed" | "pending";

  /** DDi 35.35 - Payment Order creation (VARCHAR/Status) */
  paymentOrderStatus: "pending" | "created" | "mcp-cleared" | "failed";

  /** Payment order reference number */
  paymentOrderNumber?: string;

  /** Retirement date */
  retirementDate: string;

  /** Record status */
  status: OpsRecordStatus;

  /** System metadata */
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RE-EXPORTS OF EXISTING TYPES (from payroll module)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * OPS Allowance - Recurring or one-time allowance definition
 * Used in payroll calculations and employee eligibility
 */
export interface OpsAllowance {
  /** Unique identifier */
  id: string;

  /** Allowance name */
  name: string;

  /** UCoA code for accounting */
  ucoaCode: string;

  /** Allowance type */
  type: "recurring" | "one-time" | "conditional";

  /** Payment frequency */
  frequency: "monthly" | "annual" | "one-time";

  /** Calculation method */
  calcMethod: "fixed" | "pct-basic" | "pct-gross" | "slab";

  /** Fixed amount or percentage value */
  value: number;

  /** Applicable to specific position levels (empty = all) */
  applicableLevels: OpsPositionLevel[];

  /** Applicable to specific agencies (empty = all) */
  applicableAgencies: string[];

  /** Applicable categories (empty = all) */
  applicableCategories: OpsEmployeeCategory[];

  /** Active status */
  active: boolean;
}

/**
 * OPS Deduction - Statutory or floating deduction definition
 * Used in payroll calculations
 */
export interface OpsDeduction {
  /** Unique identifier */
  id: string;

  /** Deduction name */
  name: string;

  /** UCoA code for accounting */
  ucoaCode: string;

  /** Deduction category */
  category: "statutory" | "floating" | "recovery";

  /** Calculation method */
  calcMethod: "pct-basic" | "pct-gross" | "fixed" | "slab" | "schedule";

  /** Fixed amount or percentage value */
  value: number;

  /** Mandatory deduction flag */
  mandatory: boolean;

  /** Remit to (destination agency/fund) */
  remitTo: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAYROLL GENERATION STEP TYPE
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Payroll generation workflow steps
 */
export type OpsPayrollGenStep =
  | "select-department"
  | "confirm-data"
  | "system-checks"
  | "draft-paybill"
  | "finalize"
  | "post-mcp";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSITE TYPES FOR COMMON OPERATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Employee with allowances and deductions
 * Extended version of OpsEmployee used in payroll records
 */
export interface OpsEmployeeWithPayDetails extends OpsEmployeeFull {
  /** Applicable allowances */
  allowances: OpsAllowance[];

  /** Applicable deductions */
  deductions: OpsDeduction[];

  /** Computed gross salary */
  computedGrossSalary: number;

  /** Computed net salary */
  computedNetSalary: number;
}

/**
 * Payroll processing result
 */
export interface OpsPayrollProcessingResult {
  /** Processing status */
  status: "success" | "partial" | "failed";

  /** Total employees processed */
  totalEmployees: number;

  /** Successfully processed count */
  successCount: number;

  /** Failed employee records */
  failures: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
  }>;

  /** Payroll summary */
  summary: {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalAllowances: number;
    totalStatutoryDeductions: number;
    totalOtherDeductions: number;
  };

  /** Generated payroll record ID */
  payrollRecordId?: string;

  /** Processing timestamp */
  processedAt: string;
}
