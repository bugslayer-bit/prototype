export type CreationMethod = "manual" | "file-upload" | "egp-interface" | "cms-interface";

export type WorkflowStatus =
  | "draft"
  | "precondition-check"
  | "pending-submission"
  | "submitted"
  | "technical-review"
  | "finance-review"
  | "agency-review"
  | "approved"
  | "rejected"
  | "locked";

export interface MilestoneRow {
  id: string;
  milestoneId: string;
  contractId: string;
  milestoneNumber: string;
  milestoneName: string;
  milestoneDescription: string;
  estimatedPaymentDate: string;
  milestoneAmountGross: string;
  milestoneTaxAmount1: string;
  milestoneTaxAmount2: string;
  milestoneDeduction1: string;
  milestoneDeduction2: string;
  netMilestoneAmount: string;
  milestoneStatus: string;
}

export interface ContractItemRow {
  id: string;
  contractItemId: string;
  contractId: string;
  itemCode: string;
  itemDescription: string;
  itemCategory: string;
  itemSubCategory: string;
  itemQuantity: string;
  itemUnit: string;
  itemUnitRate: string;
  itemTotalAmount: string;
  quantityBalance: string;
  amountBalance: string;
}

export interface SupportingDocument {
  id: string;
  label: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: "uploaded" | "pending";
}

export interface PreconditionResult {
  key: string;
  label: string;
  passed: boolean;
  message: string;
  severity: "blocker" | "warning";
}

export interface ApprovalStep {
  role: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  approverName: string;
  timestamp: string;
  remarks: string;
}

/* ── Audit trail entry for system-fed methods ─────────────────────────────
   When an admin edits a value that was originally imported from eGP, CMS
   or a File Upload template, we record the change so the approver can see
   exactly what came in vs what the admin overrode. */
export interface FieldChangeEntry {
  field: string;
  label: string;
  originalValue: string;
  currentValue: string;
  editedAt: string;
}

export interface ContractFormState {
  method: CreationMethod | "";
  contractId: string;
  agencyContractId: string;
  contractTitle: string;
  contractDescription: string;
  expenditureType: string;
  contractCategory: string[];
  contractClassification: string;
  contractStatus: string;
  workflowStatus: WorkflowStatus;

  budgetCode: string;
  commitmentReference: string;
  commitmentBalance: string;
  expenditureCategoryId: string;
  sectorId: string;
  subSectorId: string;
  /* UCoA hierarchy level (Fund / Sector / Sub-Sector / Programme / Activity / Object Code) */
  ucoaLevel: string;
  contractValue: string;
  fundingSource: string;
  fundingAgencyName: string;
  paymentSource: string;
  paymentAccount: string;
  programProjectId: string;
  programProjectName: string;

  contractDuration: string;
  startDate: string;
  endDate: string;
  contractClosureDate: string;
  /* SRS DD 14.1.39 — Closure_Type LoV: Normal / Early / Terminated */
  closureType: string;
  /* SRS DD 14.1.40 — Closure_Reason free text */
  closureReason: string;
  multiYearFlag: boolean;
  multiYearCommitmentRef: string;
  agencyId: string;
  agencyName: string;
  contractCurrencyId: string;
  /* BFTN (Bhutan Financial Transaction Network) integration ID — required when currency ≠ BTN */
  bftnIdNumber: string;
  grossAmount: string;

  contractorId: string;
  contractorName: string;
  contractorStatus: string;
  contractorBankAccount: string;
  contractorDebarmentStatus: string;
  officerId: string;
  officerContractId: string;
  officerSalutation: string;
  officerFirstName: string;
  officerMiddleName: string;
  officerLastName: string;
  officerEmail: string;
  officerPhoneNumber: string;
  paymentStructure: string;

  advancePayment: boolean;
  advanceAmount: string;
  advanceRecoverable: boolean;
  advanceRecoveryMethod: string;
  mobilizationAdvance: string;
  mobilizationAdvancePercent: string;

  taxApplicable: boolean;
  taxType: string[];
  taxExemptionReason: string;
  tdsApplicable: boolean;
  tdsRate: string;
  gstApplicable: boolean;
  gstRate: string;
  incomeTaxApplicable: boolean;
  incomeTaxRate: string;

  /* SRS Tax Master driven fields ───────────────────────────── */
  /* Vendor sub-type from Tax Master matrix
     (Domestic / International / Transportation-Hiring etc.) */
  vendorTaxType: string;
  /* Vendor LoVs 1.2 sub-category — Sole Proprietorship, Partnership, etc. */
  vendorTaxSubCategory: string;
  /* Origin: Bhutanese vs Non-Bhutanese drives 2% / 5% TDS rate */
  vendorOrigin: "" | "Bhutanese" | "Non-Bhutanese";
  /* GST exemption (5 SRS-listed items) */
  gstExemptItem: string;
  /* Auto-derived legal reference recorded on the contract */
  taxLegalReference: string;

  retentionApplicable: boolean;
  retentionRate: string;
  warrantyMonths: string;

  deductionType: string;
  deductionMethod: string;

  liquidatedDamagesLimit: string;
  billDiscountingEligible: boolean;
  discountingRate: string;
  discountingInstitutionId: string;
  creditLimit: string;

  /* SRS DD 14.1.29 — Advance Recovery Amount */
  advanceRecoveryAmount: string;
  /* SRS DD 14.1.37 — Outstanding Discounted Amount (display) */
  outstandingDiscountedAmount: string;
  /* SRS DD 14.1.38 — Net Payable (auto-calculated) */
  netPayable: string;
  /* SRS DD 14.1.39 — Accounts Payable Reference */
  apId: string;
  /* SRS DD 14.1.40 — Payment Order ID (cross-module link) */
  paymentOrderId: string;
  /* SRS DD 14.1.41 — Bank Transaction Reference */
  bankTransactionReference: string;

  milestonePlan: string;
  contractItemRows: ContractItemRow[];
  milestoneRows: MilestoneRow[];
  supportingDocuments: SupportingDocument[];
  supportingDocLabels: string[];

  preconditionResults: PreconditionResult[];
  approvalSteps: ApprovalStep[];
  reviewNote: string;
  submittedAt: string;
  approvedAt: string;

  /* ── Audit trail for system-fed contracts ──────────────────────────────
     `originalImportedValues` snapshots the values that came in from the
     upstream interface (eGP / CMS / File Upload) at the moment the method
     was selected. `fieldChanges` is the live diff list — populated
     automatically every time the admin overrides an imported value.
     Both fields are empty for Manual Data Entry. */
  originalImportedValues: Partial<ContractFormState>;
  fieldChanges: FieldChangeEntry[];
}

export interface FormStep {
  id: number;
  title: string;
  description: string;
  owner: string;
}

export interface MethodMeta {
  label: string;
  tag: string;
  detail: string;
  actor: string;
  tone: string;
  bannerTitle: string;
  bannerDetail: string;
  steps: string[];
  suggestedValues: Partial<ContractFormState>;
  lockedFields: Array<keyof ContractFormState>;
}
