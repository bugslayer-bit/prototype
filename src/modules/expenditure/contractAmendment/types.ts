export type RevisionType =
  | "value-change"
  | "milestone-change"
  | "time-extension"
  | "financial-rule-change";

export type AmendmentOrigin =
  | "contractor-initiated"
  | "agency-initiated";

export type AmendmentWorkflowStatus =
  | "draft"
  | "pending-validation"
  | "submitted"
  | "approver-review"
  | "agency-review"
  | "budget-review"
  | "approved"
  | "rejected"
  | "reprocessing";

export interface AmendmentApprovalStep {
  role: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  approverName: string;
  timestamp: string;
  remarks: string;
}

export interface VariationDocument {
  id: string;
  label: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  mandatory: boolean;
}

export interface MilestoneChange {
  milestoneId: string;
  milestoneName: string;
  action: "add" | "modify-date" | "modify-amount" | "delete";
  originalValue: string;
  newValue: string;
  isPaid: boolean;
  blocked: boolean;
  blockReason: string;
}

export interface AmendmentFormState {
  /* Header */
  amendmentId: string;
  contractId: string;
  contractTitle: string;
  currentContractValue: string;
  currentEndDate: string;
  amountAlreadyPaid: string;
  commitmentBalance: string;
  origin: AmendmentOrigin;
  justification: string;

  /* Revision selection */
  selectedRevisions: RevisionType[];

  /* Value change */
  newContractValue: string;
  valueChangeDirection: "increase" | "decrease" | "";
  commitmentEnhancementRef: string;
  commitmentEnhancementApproved: boolean;

  /* Milestone change */
  milestoneChanges: MilestoneChange[];

  /* Time extension */
  newEndDate: string;
  extensionJustification: string;
  multiYearImplication: boolean;

  /* Financial rule change */
  newRetentionPercent: string;
  newAdvanceRecoveryRule: string;
  newTaxApplicability: string;
  newLdRule: string;
  financialChangeNote: string;

  /* Documents */
  variationDocuments: VariationDocument[];

  /* Workflow */
  workflowStatus: AmendmentWorkflowStatus;
  approvalSteps: AmendmentApprovalStep[];
  submittedAt: string;
  approvedAt: string;
  versionNumber: number;
}

export interface AmendmentValidationResult {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning";
}
