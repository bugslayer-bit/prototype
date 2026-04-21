/* ClosureType is a slug derived from the closure-type master data. It is
   intentionally left open as `string` so admins can add / rename closure
   types from /master-data without a code change. Semantic helpers in
   `useContractClosureMasterData` (isCompletionKey, isCourtVerdictKey, ...)
   inspect the slug for keywords to drive rule-based validation. */
export type ClosureType = string;

export type ClosureWorkflowStatus =
  | "draft"
  | "pending-settlement"
  | "submitted"
  | "head-of-agency-review"
  | "approved"
  | "budget-released"
  | "egp-cms-notified"
  | "closed"
  | "rejected";

export interface ClosureDocument {
  id: string;
  label: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  mandatory: boolean;
}

/* Settlement line type is an open slug string. The form derives the
   dropdown list from the closure-settlement-type master data. Helpers in
   useContractClosureMasterData give semantic flags (isRetentionType,
   isAdvanceType, ...) so rule-based logic still works. */
export type SettlementLineType = string;

export interface SettlementItem {
  id: string;
  description: string;
  amount: string;
  type: SettlementLineType;
  settled: boolean;
  taxApplicable: boolean;
  taxAmount: string;
  taxType: string;
}

export interface ClosureApprovalStep {
  role: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  approverName: string;
  timestamp: string;
  remarks: string;
}

export interface ClosureFormState {
  /* Header */
  closureId: string;
  contractId: string;
  contractTitle: string;
  contractValue: string;
  totalPaid: string;
  outstandingBalance: string;
  retentionHeld: string;

  /* Closure Details */
  closureType: ClosureType | "";
  closureJustification: string;
  closureDate: string;

  /* Settlement */
  settlementItems: SettlementItem[];
  netSettlementAmount: string;
  allDuesSettled: boolean;

  /* Budget Release */
  budgetReleaseTriggered: boolean;
  budgetBalanceOnActivity: string;
  commitmentReleaseAmount: string;

  /* System Triggers */
  egpNotified: boolean;
  cmsNotified: boolean;
  /* Category key is now a plain string (derived from the
     closure-trigger-category master data), so admins can extend the list
     without a code change. */
  contractCategoryForTrigger: string;

  /* SRS — Retention Release Integration */
  retentionReleaseTriggered: boolean;
  retentionReleaseAmount: string;
  retentionReleaseDate: string;
  totalTaxOnSettlement: string;
  finalPaymentOrderRef: string;

  /* Documents */
  closureDocuments: ClosureDocument[];

  /* Workflow */
  workflowStatus: ClosureWorkflowStatus;
  approvalSteps: ClosureApprovalStep[];
  submittedAt: string;
  approvedAt: string;
  closedAt: string;
}

export interface ClosureValidationResult {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning";
}
