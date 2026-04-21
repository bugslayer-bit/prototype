/* Initial form state + static option catalogues for ContractAmendmentPage */
import type { AmendmentFormState, RevisionType, MilestoneChange } from "../../types";
import { buildAmendmentApprovalSteps } from "../state/approvalSteps";

export const INITIAL_STATE: AmendmentFormState = {
  amendmentId: `AMD-${Date.now().toString(36).toUpperCase()}`,
  contractId: "",
  contractTitle: "",
  currentContractValue: "",
  currentEndDate: "",
  amountAlreadyPaid: "",
  commitmentBalance: "",
  origin: "agency-initiated",
  justification: "",
  selectedRevisions: [],
  newContractValue: "",
  valueChangeDirection: "",
  commitmentEnhancementRef: "",
  commitmentEnhancementApproved: false,
  milestoneChanges: [],
  newEndDate: "",
  extensionJustification: "",
  multiYearImplication: false,
  newRetentionPercent: "",
  newAdvanceRecoveryRule: "",
  newTaxApplicability: "",
  newLdRule: "",
  financialChangeNote: "",
  variationDocuments: [],
  workflowStatus: "draft",
  approvalSteps: buildAmendmentApprovalSteps(),
  submittedAt: "",
  approvedAt: "",
  versionNumber: 1,
};

export const REVISION_OPTIONS: { key: RevisionType; label: string; icon: string; description: string }[] = [
  { key: "value-change", label: "Contract Value Increase / Decrease", icon: "\u{1F4B0}", description: "Modify contract value \u2014 requires commitment enhancement for increases" },
  { key: "milestone-change", label: "Milestone Change", icon: "\u{1F4CA}", description: "Add, modify date/amount, or delete future milestones" },
  { key: "time-extension", label: "Time Extension", icon: "\u{1F4C5}", description: "Extend contract end date within policy limits" },
  { key: "financial-rule-change", label: "Financial Rule Change", icon: "\u{1F4D0}", description: "Change retention %, advance recovery, tax, or LD rules" },
];

export const MOCK_MILESTONES: MilestoneChange[] = [
  { milestoneId: "M1", milestoneName: "Foundation Complete", action: "modify-date", originalValue: "2026-06-30", newValue: "", isPaid: true, blocked: true, blockReason: "Already paid \u2014 modification blocked" },
  { milestoneId: "M2", milestoneName: "Structural Works", action: "modify-amount", originalValue: "500000", newValue: "", isPaid: false, blocked: false, blockReason: "" },
  { milestoneId: "M3", milestoneName: "Finishing & Handover", action: "modify-date", originalValue: "2026-12-31", newValue: "", isPaid: false, blocked: false, blockReason: "" },
];
