// ============================================================================
// SHARED TYPE DEFINITIONS
// ============================================================================

export type EmployeeCategory = "civil-servant" | "other-public-servant";

export type PayrollRole =
  | "system-administrator"
  | "hr-officer"
  | "finance-officer"
  | "head-of-agency"
  | "agency-staff"
  | "auditor";

export type HRActionType =
  | "increment"
  | "promotion"
  | "demotion"
  | "transfer"
  | "contract-extension"
  | "position-title-change"
  | "position-remapping"
  | "agency-bifurcation"
  | "secondment"
  | "ltt"
  | "stt"
  | "leave"
  | "hr-audit"
  | "legal"
  | "separation"
  | "arrears-allowance"
  | "pay-fixation"
  | "rejoin";

export interface FormFieldConfig {
  id: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "dropdown"
    | "textarea"
    | "checkbox"
    | "radio";
  mandatory: boolean;
  source?: string;
  category?: EmployeeCategory[];
  conditionalOn?: { field: string; value: any };
  lovKey?: string;
  minLength?: number;
  pattern?: string;
  step?: number;
}

export interface EmployeeData {
  empIdMasterId?: number;
  employeeId?: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  nationality?: string;
  cid?: string;
  workPermit?: string;
  tpn?: string;
  employeeCategory?: EmployeeCategory;
  employeeType?: string;
  dateOfBirth?: string;
  positionTitle?: string;
  designation?: string;
  positionLevel?: string;
  payScale?: string;
  monthlyBasicPay?: number;
  yearsOfService?: number;
  workingAgency?: string;
  organizationSegment?: string;
  appointmentDate?: string;
  joiningDate?: string;
  incrementDate?: string;
  superannuationDate?: string;
  contractEndDate?: string;
  pfEligible?: string;
  pfAccountNumber?: string;
  gisEligible?: string;
  gisNumber?: string;
  isTaxExempted?: string;
  reasonForTaxExemption?: string;
  isHealthContributionExempted?: string;
  isCswsMember?: string;
  emailId?: string;
  mobileNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  employeeStatus?: string;
  [key: string]: any;
}

export interface HRActionData {
  hrAction?: HRActionType;
  employeeId?: number;
  oldBasicPay?: number;
  increment?: number;
  newBasicPay?: number;
  promotionType?: string;
  newPositionTitle?: string;
  newPayScale?: string;
  newWorkingAgency?: string;
  newIncrementDate?: string;
  transferType?: string;
  dateOfJoining?: string;
  contractExtendedDate?: string;
  secondmentFrom?: string;
  secondmentUntil?: string;
  secondmentCountry?: string;
  leaveType?: string;
  separationType?: string;
  payFixationType?: string;
  rejoinDate?: string;
  remarks?: string;
  [key: string]: any;
}

export interface PayrollData {
  employeeName?: string;
  positionTitle?: string;
  cid?: string;
  monthlyBasicPay?: number;
  arrears?: number;
  fixedPay?: string;
  variablePay?: string[];
  grossPay?: number;
  statutoryDeductions?: string[];
  otherDeductions?: string[];
  totalDeductions?: number;
  netPay?: number;
  [key: string]: any;
}

export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
}
