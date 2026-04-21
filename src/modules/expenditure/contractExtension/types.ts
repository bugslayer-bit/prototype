/* ═══════════════════════════════════════════════════════════════════════════
   Contract Extension Types — SRS PD Row 29
   DD 14.1.17 (Duration), DD 14.1.18 (Start), DD 14.1.19 (End)
   ═══════════════════════════════════════════════════════════════════════════ */

export type ExtensionStatus =
  | "draft"
  | "validating"
  | "pending-documents"
  | "submitted"
  | "approver-review"
  | "agency-review"
  | "budget-review"
  | "approved"
  | "rejected"
  | "reprocessing";

export interface ExtensionApprovalStep {
  role: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  approverName: string;
  timestamp: string;
  remarks: string;
}

export interface ExtensionDocument {
  id: string;
  label: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  mandatory: boolean;
  uploaded: boolean;
}

export interface MilestoneRecord {
  id: string;
  number: number;
  name: string;
  amount: number;
  estimatedDate: string;
  status: "Pending" | "Completed" | "Paid" | "Overdue";
}

export interface ContractForExtension {
  id: string;                    /* DD 14.1.1 */
  title: string;                 /* DD 14.1.3 */
  contractorId: string;          /* DD 14.1.4 */
  contractorName: string;
  agencyId: string;              /* DD 14.1.21 */
  agencyName: string;
  category: string;              /* DD 14.1.22 — Works/Goods/Services */
  totalValue: number;            /* DD 14.1.24 */
  amountPaid: number;
  startDate: string;             /* DD 14.1.18 */
  endDate: string;               /* DD 14.1.19 */
  duration: string;              /* DD 14.1.17 */
  status: string;                /* DD 14.1.37 */
  currency: string;              /* DD 14.1.23 */
  commitmentRef: string;         /* DD 14.1.6 */
  budgetCode: string;            /* DD 14.1.7 */
  milestones: MilestoneRecord[];
  multiYear: boolean;
}

export interface ExtensionFormState {
  extensionId: string;
  contractId: string;

  /* Extension Details — PD Row 29 */
  newEndDate: string;
  extensionDays: number;
  extensionJustification: string;
  multiYearImplication: boolean;   /* PD Row 29: "Multi-year implication flagged" */

  /* Milestone impact */
  milestoneAdjustments: {
    milestoneId: string;
    originalDate: string;
    newDate: string;
    adjusted: boolean;
  }[];

  /* Documents — PD Row 31 */
  documents: ExtensionDocument[];

  /* Workflow — PD Rows 32-33 */
  status: ExtensionStatus;
  approvalSteps: ExtensionApprovalStep[];
  submittedAt: string;
  approvedAt: string;
  versionNumber: number;
}

export interface ExtensionValidation {
  id: string;
  check: string;
  pass: boolean;
  source: string;
  ref: string;
}
