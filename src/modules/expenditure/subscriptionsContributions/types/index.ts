/* ═══════════════════════════════════════════════════════════════════════════
   Subscriptions and Contributions — SRS Process Descriptions rows 107-109
   ─────────────────────────────────────────────────────────────────────────
   Process Description rows:
     107  1.0 Subscriptions and Contribution Master Data Management
     108  2.0 Payment Processing (Finance creates → Auto-generate Payment
              Order → Workflow → Cash Management releases)
     109  3.0 System Validation Controls (audit trail, budget / commitment check)

   DD section 26 — Subscriptions and Contributions:
     26.1 Registry as vendor — Domestic / International
     26.2 Bank Accounts
     26.3 IFSC / SWIFT Code

   Full field list (PD row 107):
     Name, Contact No, Email, Address in Bhutan, Address Outside Bhutan,
     Bank Name, Bank Account Number, Bank Branch Name, SWIFT Code &
     Routing Information (for foreign payments), Budget Code Id,
     Status (Active / Inactive), Other relevant information.

   All dropdowns consume sc-* LoVs from masterDataMap. ZERO hardcoded
   fallbacks — admins can rename any value from /master-data without
   touching code thanks to keyword-based semantic helpers.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Step 1: Entity master (PD row 107) ────────────────────────────── */
export interface ScEntityHeader {
  scId: string;                  /* System-generated — SC-YYYY-NNNN */
  txnType: string;               /* LoV: sc-type (Subscription / Contribution) */
  scope: string;                 /* LoV: sc-scope (Domestic / International) */
  beneficiaryType: string;       /* LoV: sc-beneficiary-type */
  organisationType: string;      /* LoV: sc-organisation-type (cascades) */
  entityName: string;            /* PD: Name */
  shortName: string;             /* Acronym / display name */
  registryVendorId: string;      /* DD 26.1 — link to vendor registry */
  contactPerson: string;
  contactNo: string;             /* PD row 107 */
  email: string;                 /* PD row 107 */
  addressBhutan: string;         /* PD row 107 */
  addressOutside: string;        /* PD row 107 (foreign only) */
  bankName: string;              /* DD 26.2 */
  bankBranchName: string;
  bankAccountNo: string;         /* DD 26.2 */
  swiftRoutingCode: string;      /* DD 26.3 */
  currency: string;              /* LoV: sc-currency */
  budgetCode: string;            /* LoV: budget-codes */
  paymentFrequency: string;      /* LoV: sc-payment-frequency */
  membershipAmount: string;      /* DECIMAL — annualised / per-period */
  membershipPeriodFrom: string;  /* DATE */
  membershipPeriodTo: string;    /* DATE */
  entityStatus: string;          /* LoV: sc-entity-status */
  notes: string;                 /* "Other relevant information" */
}

/* ── Step 1 sub: Supporting documents (PD row 107) ─────────────────── */
export interface ScDocument {
  id: string;
  documentType: string;          /* LoV: sc-document-type */
  reference: string;
  receivedDate: string;
  remarks: string;
}

/* ── Step 2: Payment transaction (PD row 108) ──────────────────────── */
export interface ScPaymentTransaction {
  id: string;                    /* TXN-YYYY-NNNN */
  invoiceRef: string;            /* Demand / Invoice reference */
  period: string;                /* YYYY-MM */
  grossAmount: string;           /* DECIMAL in entity.currency */
  fxRate: string;                /* DECIMAL — foreign-to-BTN rate (International) */
  btnEquivalent: string;         /* Auto = gross * fxRate (Domestic = gross) */
  paymentOrderId: string;        /* auto-generated on PO status */
  txnStatus: string;             /* LoV: sc-txn-status */
  remarks: string;
}

/* ── Step 3: Validation check (PD row 109) ─────────────────────────── */
export interface ScValidationCheck {
  key: string;
  label: string;                 /* from LoV sc-validation-rule */
  passed: boolean;
  message: string;
}

/* ── Step 3: Approval chain (PD row 108) ───────────────────────────── */
export interface ScApprovalEntry {
  id: string;
  level: string;                 /* LoV: sc-approval-level */
  actor: string;
  decidedAt: string;
  decision: string;              /* LoV: sc-approval-decision */
  remarks: string;
}

/* ── Step 4: Lifecycle event ───────────────────────────────────────── */
export interface ScLifecycleEvent {
  id: string;
  occurredAt: string;
  fromStatus: string;
  toStatus: string;              /* LoV: sc-entity-status */
  actor: string;
  reason: string;
}

/* ── Stored record (full wizard state) ─────────────────────────────── */
export interface StoredSc {
  id: string;
  header: ScEntityHeader;
  documents: ScDocument[];
  transactions: ScPaymentTransaction[];
  validationChecks: ScValidationCheck[];
  approvals: ScApprovalEntry[];
  lifecycle: ScLifecycleEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ScFormState {
  header: ScEntityHeader;
  documents: ScDocument[];
  transactions: ScPaymentTransaction[];
  validationChecks: ScValidationCheck[];
  approvals: ScApprovalEntry[];
  lifecycle: ScLifecycleEvent[];
}

export const initialScForm: ScFormState = {
  header: {
    scId: "",
    txnType: "",
    scope: "",
    beneficiaryType: "",
    organisationType: "",
    entityName: "",
    shortName: "",
    registryVendorId: "",
    contactPerson: "",
    contactNo: "",
    email: "",
    addressBhutan: "",
    addressOutside: "",
    bankName: "",
    bankBranchName: "",
    bankAccountNo: "",
    swiftRoutingCode: "",
    currency: "",
    budgetCode: "",
    paymentFrequency: "",
    membershipAmount: "",
    membershipPeriodFrom: "",
    membershipPeriodTo: "",
    entityStatus: "",
    notes: "",
  },
  documents: [],
  transactions: [],
  validationChecks: [],
  approvals: [],
  lifecycle: [],
};
