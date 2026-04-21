/* ═══════════════════════════════════════════════════════════════════════════
   SOE & Fund Transfer Management — SRS PRN 6.2
   ─────────────────────────────────────────────
   Process Descriptions rows 91-102:
     Step 1.0  Create Transfer Transaction (User + System)
     Step 2.0  Attach Statement of Expenditure (User)
     Step 3.0  Validation Rules & Approval    (System + Approver chain)
     Step 4.0  Release / Core-Bank Execution  (System + Payment Release)
     Step 5.0  Reconciliation & Audit Trail   (System + Finance)

   All dropdown options come from masterDataMap — no hardcoded fallbacks.
   Admins can modify the LoVs from /master-data without touching code.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Statement of Expenditure line (PRN 6.2 Step 2) ─────────────────── */
export interface SoeLine {
  id: string;
  expenditureCategory: string;   /* LoV: soe-expenditure-category */
  ucoaCode: string;              /* free text — captured from UCoA master */
  description: string;
  amount: string;                /* DECIMAL */
  currency: string;              /* LoV: soe-currency */
  documentType: string;          /* LoV: soe-supporting-document-type */
  documentRef: string;           /* attachment reference no. */
  remarks: string;
}

/* ── Transfer header (DD — PRN 6.2 Step 1) ─────────────────────────── */
export interface SoeTransferHeader {
  transferId: string;                /* System generated — SOE-YYYY-NNNN */
  transferType: string;              /* LoV: soe-transfer-type */
  direction: string;                 /* LoV: soe-direction */
  sourceOfFund: string;              /* LoV: soe-source-of-fund */
  destinationAccountType: string;    /* LoV: soe-destination-account-type */
  originatingAgency: string;         /* initiating agency */
  receivingAgency: string;           /* receiving agency */
  parliamentSanctionRef: string;     /* PRN 6.2.1 — Parliament appropriation ref */
  budgetHeadCode: string;            /* UCoA ref */
  currency: string;                  /* LoV: soe-currency */
  exchangeRate: string;              /* for foreign currency */
  totalAmount: string;               /* header aggregate */
  valueDate: string;                 /* DATE */
  reportingFrequency: string;        /* LoV: soe-frequency */
  expenditureCategory: string;       /* LoV: soe-expenditure-category */
  transferStatus: string;            /* LoV: soe-transfer-status */
  narrative: string;                 /* purpose / memo */
}

/* ── Validation check row (PRN 6.2 Step 3) ─────────────────────────── */
export interface SoeValidationCheck {
  key: string;
  label: string;           /* from LoV soe-validation-rule */
  passed: boolean;
  message: string;
}

/* ── Approval log entry (PRN 6.2 Step 3) ───────────────────────────── */
export interface SoeApprovalEntry {
  id: string;
  level: string;           /* LoV: soe-approval-level */
  actor: string;           /* user display name */
  decidedAt: string;       /* datetime */
  decision: string;        /* Approved / Returned / Rejected */
  remarks: string;
}

/* ── Release entry (PRN 6.2 Step 4) ────────────────────────────────── */
export interface SoeReleaseEntry {
  id: string;
  channel: string;         /* LoV: soe-release-channel */
  releasedAt: string;
  releasedBy: string;
  bankReference: string;
  amount: string;
  currency: string;        /* LoV: soe-currency */
  remarks: string;
}

/* ── Reconciliation entry (PRN 6.2 Step 5) ─────────────────────────── */
export interface SoeReconciliationEntry {
  id: string;
  status: string;          /* LoV: soe-reconciliation-status */
  reconciledAt: string;
  reconciledBy: string;
  bankStatementRef: string;
  variance: string;
  notes: string;
}

/* ── Stored SOE record (the whole wizard state) ────────────────────── */
export interface StoredSoe {
  id: string;
  header: SoeTransferHeader;
  soeLines: SoeLine[];
  validationChecks: SoeValidationCheck[];
  approvals: SoeApprovalEntry[];
  releases: SoeReleaseEntry[];
  reconciliation: SoeReconciliationEntry[];
  createdAt: string;
  updatedAt: string;
}

/* Wizard form state. */
export interface SoeFormState {
  header: SoeTransferHeader;
  soeLines: SoeLine[];
  validationChecks: SoeValidationCheck[];
  approvals: SoeApprovalEntry[];
  releases: SoeReleaseEntry[];
  reconciliation: SoeReconciliationEntry[];
}

export const initialSoeForm: SoeFormState = {
  header: {
    transferId: "",
    transferType: "",
    direction: "",
    sourceOfFund: "",
    destinationAccountType: "",
    originatingAgency: "",
    receivingAgency: "",
    parliamentSanctionRef: "",
    budgetHeadCode: "",
    currency: "",
    exchangeRate: "",
    totalAmount: "",
    valueDate: "",
    reportingFrequency: "",
    expenditureCategory: "",
    transferStatus: "",
    narrative: "",
  },
  soeLines: [],
  validationChecks: [],
  approvals: [],
  releases: [],
  reconciliation: [],
};
