/* ═══════════════════════════════════════════════════════════════════════════
   Invoice and Bill Management — Type Definitions
   Source: SRS Expenditure Module (Bhutan IFMIS) — PRN 3.x, Data Dictionary
           rows 230–305 (Invoice Header, Bill Header, Bill Details Goods/Works/
           Services, Bill Tax Details). Every field below maps 1:1 to a DD entry
           and follows the field number, type, mandatory flag, and format
           specified in the SRS workbook.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 15.x  Invoice Header (DD rows 230–250) ─────────────────────────────── */
/* All status / channel / category strings are typed as plain `string` so the
   admin can extend the values from the Master Data screen without us having
   to update a literal union here. */
export type InvoiceStatus = string;
export type SubmissionChannel = string;

export interface InvoiceDocument {
  id: string;
  /* SRS doc-types checklist 15.15 → 15.20 — also master-data driven */
  type: string;
  fileName: string;
  fileSize: string; /* "2.4 MB" */
  uploadedAt: string;
}

export interface InvoiceHeader {
  invoiceId: string;            /* 15.1  CHAR  System Generated */
  contractId: string;           /* 15.2  CHAR  REF Contract Header */
  milestoneId: string;          /* 15.3  CHAR  REF Contract Milestones */
  invoiceNumber: string;        /* 15.4  VARCHAR */
  invoiceDate: string;          /* 15.5  DATE   DD/MM/YYYY */
  invoiceGrossAmount: string;   /* 15.6  DECIMAL */
  totalTaxAmount: string;       /* 15.7  DECIMAL Calculated */
  retentionAmount: string;      /* 15.8  DECIMAL Calculated */
  totalDeductionAmount: string; /* 15.9  DECIMAL Calculated */
  documentType: string;         /* 15.10 VARCHAR file references */
  netPayableAmount: string;     /* 15.11 DECIMAL Calculated */
  invoiceStatus: InvoiceStatus; /* 15.12 LoV */
  currency: string;             /* 15.13 LoV */
  submissionChannel: SubmissionChannel; /* 15.14 LoV */
  /* 15.15 → 15.20  document checklist */
  documents: InvoiceDocument[];
  /* derived/UI — sourced live from ContractorDataContext */
  contractorId: string;
  contractorName: string;
  /* DD 12.1 — Contact ID of the contractor's representative who submitted/signed
     this invoice. Pulled from the contractor's contacts list (profile.contacts). */
  contactId: string;
  contactName: string;
  agencyName: string;
  remarks: string;
}

/* ── 16.1.x  Bill Header (DD rows 254–265) ──────────────────────────────── */
export type BillStatus = string;
export type BillCategory = string;
export type BillSubCategory = string;

export interface BillHeader {
  billId: string;            /* 16.1.1  System Generated */
  invoiceId: string;         /* 16.1.2  REF Invoice Header */
  contractId: string;        /* 16.1.3  REF Contract Header */
  billDate: string;          /* 16.1.4  DD/MM/YYYY */
  billCategory: BillCategory;/* 16.1.5  LoV */
  billSubCategory: BillSubCategory; /* 16.1.6  LoV */
  ucoaLevel: string;         /* UCoA Hierarchy Level — Fund/Sector/Programme/Activity/Object */
  billAmountGross: string;   /* 16.1.7  DECIMAL */
  taxAmount: string;         /* 16.1.8  DECIMAL */
  deductionAmount: string;   /* 16.1.9  DECIMAL */
  retentionAmount: string;   /* 16.1.10 DECIMAL */
  netPayableAmount: string;  /* 16.1.11 Calculated */
  billStatus: BillStatus;    /* 16.1.12 LoV */
}

/* ── 16.2.x  Bill Details — Goods (DD rows 267–278) ─────────────────────── */
export interface BillDetailGoods {
  id: string;
  billDetailId: string;        /* 16.2.1 */
  billId: string;              /* 16.2.2 */
  grnId: string;               /* 16.2.3 REF Contract Items */
  itemName: string;            /* 16.2.4 */
  itemQuantityContract: string;/* 16.2.5 */
  itemRateContract: string;    /* 16.2.6 */
  itemBalanceContract: string; /* 16.2.7 Calculated */
  itemSuppliedPrevious: string;/* 16.2.8 Calculated */
  itemQuantityInvoice: string; /* 16.2.9 */
  itemRateInvoice: string;     /* 16.2.10 */
  itemAmountInvoice: string;   /* 16.2.11 Calculated */
  acceptanceAuthorityId: string; /* 16.2.12 User ID */
}

/* ── 16.3.x  Bill Details — Works (DD rows 280–289) ─────────────────────── */
export interface BillDetailWorks {
  id: string;
  billDetailId: string;        /* 16.3.1 */
  billId: string;              /* 16.3.2 */
  workItemCode: string;        /* 16.3.3 */
  workDescription: string;     /* 16.3.4 */
  workQuantityContract: string;/* 16.3.5 BOQ */
  workRateContract: string;    /* 16.3.6 BOQ rate */
  workCompletedPrevious: string;/* 16.3.7 */
  workCompletedCurrent: string; /* 16.3.8 */
  workAmountCurrent: string;    /* 16.3.9 Calculated */
  workCompletionPercentage: string; /* 16.3.10 Calculated */
}

/* ── 16.4.x  Bill Details — Services (DD rows 291–298) ──────────────────── */
export interface BillDetailServices {
  id: string;
  billDetailId: string;       /* 16.4.1 */
  billId: string;             /* 16.4.2 */
  serviceDescription: string; /* 16.4.3 */
  servicePeriodFrom: string;  /* 16.4.4 */
  servicePeriodTo: string;    /* 16.4.5 */
  serviceRate: string;        /* 16.4.6 */
  serviceDays: string;        /* 16.4.7 Calculated */
  serviceAmount: string;      /* 16.4.8 Calculated */
}

/* ── 16.5.x  Bill Tax Details (DD rows 300–305) ─────────────────────────── */
export interface BillTaxDetail {
  id: string;
  billTaxId: string;     /* 16.5.1 */
  billId: string;        /* 16.5.2 */
  taxId: string;         /* 16.5.3 REF Tax Master */
  taxCode: string;       /* TDS / PIT / BIT */
  taxBaseAmount: string; /* 16.5.4 */
  taxRate: string;       /* 16.5.5 % */
  taxAmount: string;     /* 16.5.6 Calculated */
}

/* ── Validation / Approval audit (PRN 3.1.2 + 3.1.3 + 3.2.2 + 3.2.3) ────── */
export interface InvoiceValidationCheck {
  key: string;
  label: string;
  passed: boolean;
  severity: "blocker" | "warning";
  detail?: string;
}

export interface ApprovalStep {
  key: string;
  label: string;
  role: string;
  status: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
  approverName?: string;
  decidedAt?: string;
  remarks?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEW SRS-DRIVEN STRUCTURES — added to fully cover SRS Rows 38–64
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── SRS Row 42 — Milestone selection & auto-population ──────────────────── */
export interface ContractMilestone {
  id: string;
  milestoneCode: string;
  description: string;
  totalAmount: string;
  alreadyBilled: string;
  remaining: string;
  status: "pending" | "in_progress" | "completed" | "fully_paid";
  completionPercent: string;
  selected: boolean;
  /* user enters how much of this milestone is being billed in this invoice */
  billedNow: string;
}

/* ── SRS Row 45 — GRN (Goods Received Note) lookup from GIMS ────────────── */
export interface GrnLineItem {
  itemCode: string;
  description: string;
  quantityReceived: string;
  unitPrice: string;
  lineValue: string;
}

export interface GrnRecord {
  grnCode: string;
  contractRef: string;
  receivedDate: string;
  acceptanceDate: string;
  acceptanceAuthority: string;
  totalValue: string;
  alreadyInvoicedValue: string;
  remainingValue: string;
  items: GrnLineItem[];
  /* set true once user has linked it to current invoice */
  linkedToInvoice: boolean;
}

/* ── SRS Row 50 — ESG attribution tagging ──────────────────────────────────
   `categories` holds one or more values from the canonical `esg-category`
   master-data LoV (default: Environment, Social, Governance). Admins can
   edit the LoV in /master-data and the UI will render the updated options
   automatically — "declare once, use everywhere". */
export interface EsgTagging {
  budgetEsgLinked: boolean; /* if true → mandatory; else optional */
  categories: string[];
  attributedBy: string;
  attributedAt: string;
  notes: string;
}

/* ── SRS Row 56 — Audit Recoveries (ARMS / AIN) ──────────────────────────── */
export interface AuditRecoveryEntry {
  id: string;
  ainNumber: string;       /* Audit Identification Number from ARMS */
  source: "ARMS" | "Manual";
  amount: string;
  reason: string;
  recordedAt: string;
}

/* ── SRS Rows 58–59 — Reversal Authorisation ─────────────────────────────── */
export interface ReversalRequest {
  id: string;
  requestedAt: string;
  requestedBy: string;
  reason: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "executed";
  paymentAlreadyReleased: boolean;
  remarks: string;
}

/* ── SRS Rows 60, 62, 63 — FIFO Payment Order + Cancellation ─────────────── */
export type PaymentOrderStatus =
  | "not_generated"
  | "queued_fifo"
  | "generated"
  | "pushed_to_cm"
  | "cleared"
  | "held"
  | "rejected"
  | "cancelled";

export interface PaymentOrderRecord {
  paymentOrderId: string;
  generatedAt: string;
  fifoSequence: number;
  amount: string;
  status: PaymentOrderStatus;
  cmAcknowledgement: string;
  holdReason: string;
  rejectReason: string;
  /* cancellation */
  cancellationReason: string;
  cancelledAt: string;
  cancelledBy: string;
  reversalLedgerPosted: boolean;
}

/* ── SRS Row 51 — Bill Discounting Eligibility (30-day rule + last-invoice) ─ */
export interface DiscountingEligibility {
  daysSinceSubmission: number;
  isLastInvoice: boolean;
  thirtyDayRulePassed: boolean;
  eligible: boolean;
  evaluatedAt: string;
}

/* ── Composite working form / stored record ─────────────────────────────── */
export type WorkflowStatus =
  | "draft"
  | "invoice-submitted"
  | "invoice-verified"
  | "invoice-approved"
  | "bill-created"
  | "bill-submitted"
  | "bill-verified"
  | "bill-approved"
  | "discounted"
  | "paid"
  | "rejected";

export interface InvoiceBillFormState {
  /* identification */
  recordId: string;
  workflowStatus: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  /* nested SRS objects */
  invoice: InvoiceHeader;
  bill: BillHeader;
  goodsRows: BillDetailGoods[];
  worksRows: BillDetailWorks[];
  servicesRows: BillDetailServices[];
  taxRows: BillTaxDetail[];
  /* validation results */
  validationChecks: InvoiceValidationCheck[];
  /* approval chain (PRN 3.1.3 / 3.2.2) */
  invoiceApprovalSteps: ApprovalStep[];
  billApprovalSteps: ApprovalStep[];
  /* discounting (PRN 3.3.1 / 3.3.2) */
  discountingEligible: boolean;
  discountingRequested: boolean;
  discountingFiId: string;
  discountingRate: string;
  discountingFee: string;
  netAmountReceived: string;
  discountingStatus: string;
  /* ── NEW SRS-driven extensions ───────────────────────────────────────── */
  /* SRS Row 42 — Milestones (Works) */
  milestones: ContractMilestone[];
  /* SRS Row 45 — GRN/GIMS (Goods) */
  grnRecords: GrnRecord[];
  /* SRS Row 50 — ESG tagging */
  esg: EsgTagging;
  /* SRS Row 56 — Audit Recoveries (ARMS/AIN) */
  auditRecoveries: AuditRecoveryEntry[];
  /* SRS Rows 58–59 — Reversal Authorisation */
  reversal: ReversalRequest;
  /* SRS Rows 60–63 — Payment Order (FIFO + Cancellation) */
  paymentOrder: PaymentOrderRecord;
  /* SRS Row 51 — Discounting eligibility */
  discountingEligibility: DiscountingEligibility;
}

export interface StoredInvoiceBill extends InvoiceBillFormState {
  id: string; /* unique row id for list view */
}
