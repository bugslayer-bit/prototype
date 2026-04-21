export type ModuleCategory = "Expenditure" | "Contract" | "Payroll" | "Reference";

export interface StatItem {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}

export interface StepItem {
  title: string;
  owner: string;
  description: string;
}

export interface DetailSection {
  title: string;
  description: string;
  bullets: string[];
}

export interface ProcessStage {
  title: string;
  summary: string;
}

export interface ModuleDefinition {
  slug: string;
  title: string;
  shortTitle: string;
  category: ModuleCategory;
  summary: string;
  sourceFile: string;
  routeLabel: string;
  metrics: StatItem[];
  steps: StepItem[];
  sections: DetailSection[];
  process: ProcessStage[];
}

export type ContractorKind = "individual" | "business";

export type VerificationStatus = "Pending" | "Verified" | "Rejected" | "Resubmitted";

/* ── Agency-level verification checklist (SRS PRN 1 Step 2) ── */
export interface VerificationCheck {
  key: string;
  label: string;
  system: string;          // e.g. "Census/DCRC", "RAMIS/BITS", "CBS"
  status: "pending" | "valid" | "invalid" | "skipped";
  checkedAt?: string;
  checkedBy?: string;
  remarks?: string;
}

/* ── Multi-level approval workflow step (SRS PRN 1 Step 5) ── */
export type WorkflowStepStatus = "pending" | "approved" | "rejected" | "skipped";
export interface WorkflowStep {
  level: number;
  role: string;             // e.g. "Data Entry Operator", "Reviewer", "Approver"
  roleIds?: string[];
  requiredPermissionId?: string;
  policyReference?: string;
  policyKey?: string;
  assignee?: string;
  status: WorkflowStepStatus;
  actionAt?: string;
  remarks?: string;
}

/* ── Audit trail entry ── */
export interface AuditEntry {
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string;
}

export interface EditHistoryEntry {
  editedBy: string;
  editedAt: string;
  changes: { field: string; oldValue: string; newValue: string }[];
  remarks?: string;
}

export interface ContractorRecord {
  id: string;
  kind: ContractorKind;
  submittedVia?: "public" | "admin";
  submitterEmail?: string;
  displayName: string;
  contractorType: string;
  contractualType?: string;
  category: string;
  nationality: string;
  registrationNumber: string;
  taxNumber: string;
  email: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: "Draft" | "Active and verified";
  verification: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  reviewRemarks?: string;
  /* Agency-level verification & approval (SRS PRN 1) */
  verificationChecks?: VerificationCheck[];
  workflowSteps?: WorkflowStep[];
  currentWorkflowLevel?: number;
  auditTrail?: AuditEntry[];
  editHistory?: EditHistoryEntry[];
  createdAt: string;
  profile: Record<string, string>;
}

/* SRS DD section 27 — Vendor Management
   Categories per SRS Process Description rows 109-112:
   Utility | Contract | Subscription | Contribution | Others
   Sources: System (contractual), API-Banks, BITS, RAMIS, IBLS */
export type VendorCategory =
  | "Utility"
  | "Contract"
  | "Subscription"
  | "Contribution"
  | "Others";

export type VendorStatus =
  | "Draft"
  | "Pending approval"
  | "Approved"
  | "Rejected"
  | "Amendment requested";

export type VendorIntegrationSource =
  | "System"
  | "Manual"
  | "API-Banks"
  | "BITS"
  | "RAMIS"
  | "IBLS";

export interface VendorAuditEntry {
  at: string;
  by: string;
  action: string;
  remarks?: string;
  fromStatus?: VendorStatus;
  toStatus?: VendorStatus;
}

export interface VendorVehicleDetail {
  vehicleNumber: string;        // DD 27.1.1
  agencyCode: string;           // DD 27.1.2
  budgetCode: string;           // DD 27.1.3
  expenditureType: string;      // DD 27.1.4
  vehicleExpensesType: string;  // DD 27.1.5
  vehicleType: string;          // DD 27.1.6
  fuelProvidersName: string;   // DD 27.1.7
  payableAmount: string;        // DD 27.1.8
}

export interface VendorRecord {
  id: string;                  // DD 27.1 Vendor ID
  contractorId: string;
  cid?: string;                // DD 27.2 CID
  vendorName: string;          // DD 27.3
  bankName?: string;           // DD 27.4 Bank Account Details
  bankAccountNumber?: string;
  bankAccountName?: string;
  address?: string;            // DD 27.5
  phone?: string;              // DD 27.6
  email?: string;              // DD 27.7
  tpn?: string;                // DD 27.8 TPN
  vendorCategory?: VendorCategory;
  serviceCategory: string;
  contractCategories?: string[];
  contactStatus?: "Active" | "Inactive";
  contactCategory?: string;
  paymentFrequency: string;
  fundingSource: string;
  integrationSource?: VendorIntegrationSource;
  status: VendorStatus;
  createdAt: string;
  /* Workflow */
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionRemarks?: string;
  currentApprover?: string;
  /* Amendment */
  amendmentRequested?: boolean;
  amendmentRemarks?: string;
  /* DD 27.1.1-27.1.8 (optional, only for vehicle/fuel vendors) */
  vehicleDetail?: VendorVehicleDetail;
  /* Mandatory audit trail per SRS 4.0 Amendment row 112 */
  auditTrail?: VendorAuditEntry[];
}
