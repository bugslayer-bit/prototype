/* ─── Contractor Sanction (DD 13.0) ─── */

export type SanctionType = "Suspension" | "Debarment" | "Warning";
export type SanctionCategory = "Financial" | "Contractual" | "Legal";
export type SanctionSuspensionCategory = "Temporary Suspension" | "Permanent Suspension";
export type SanctionStatus = "Active" | "Lifted" | "Expired";
export type AutoReactivation = "Y" | "N";

export interface ContractorSanctionRecord {
  /* DD 13.1 */ sanctionId: string;
  /* DD 13.2 */ contractorId: string;
  contractorName: string;
  /* DD 13.3 */ sanctionType: SanctionType | "";
  /* DD 13.4 */ sanctionStartDate: string;
  /* DD 13.5 */ sanctionEndDate: string;
  /* DD 13.6 */ autoReactivation: AutoReactivation;
  /* DD 13.7 */ sanctionReason: string;
  /* DD 13.8 */ sanctionCategory: SanctionCategory | "";
  suspensionCategory: SanctionSuspensionCategory | "";
  /* DD 13.9 */ affectedAgencies: string[];
  /* DD 13.10 */ sanctioningAgency: string;
  /* DD 13.11 */ supportingDocuments: SanctionDocument[];
  /* DD 13.12 */ sanctionStatus: SanctionStatus;
  /* meta */
  createdAt: string;
  lastAmendedAt: string;
}

export interface SanctionDocument {
  id: string;
  label: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
}

/* ─── Advance Sanctioning (Process 15) ─── */

export type AdvanceType = "Mobilization" | "Material" | "Secured";
export type ImprestStatus = "Pending" | "Approved" | "Hold" | "Settled" | "Unsettled";

export interface ContractualAdvanceRecord {
  advanceId: string;
  contractId: string;
  contractorId: string;
  agencyId: string;
  advanceType: AdvanceType | "";
  amount: string;
  maxAllowable: string;
  purpose: string;
  contractStatus: string;
  workStatus: string;
  /* UCoA Hierarchy Level — Fund / Sector / Programme / Activity / Object Code */
  ucoaLevel: string;
  /* Mobilization-specific */
  bankGuaranteeRef: string;
  bankGuaranteeValid: boolean;
  bankGuaranteeAmount: string;
  /* Material-specific */
  physicalProgressPercent: string;
  siteInspectionReport: boolean;
  materialAtApprovedSite: boolean;
  /* Secured-specific */
  securityDocuments: boolean;
  verificationCertificate: boolean;
  /* Workflow */
  status: ImprestStatus;
  sanctioningAuthority: string;
  approvedAt: string;
  adjustedAgainstRAB: boolean;
}

export interface EmployeeImprestRecord {
  imprestId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  agencyCode: string;
  amount: string;
  purpose: string;
  ceilingLimit: string;
  previousImprestSettled: boolean;
  budgetAvailable: boolean;
  commitmentLinked: boolean;
  status: ImprestStatus;
  approvedAt: string;
  settledAt: string;
  taxApplicable: boolean;
}

/* ─── Validation ─── */

export interface SanctionValidationResult {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning";
}

/* ─── Page State ─── */

export type SanctionTab = "contractor-sanctions" | "advance-contractual" | "advance-imprest";
