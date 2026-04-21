/* ═══════════════════════════════════════════════════════════════════════════
   Social Benefits & Stipend Management — SRS Process Descriptions rows 97-106
   ─────────────────────────────────────────────────────────────────────────
   Social Benefit Data Management (row 97-101):
     1.0  Beneficiary Category Master Management   (DTA)
     2.0  Onboarding Beneficiary Information       (Agency Staff / Coordinator)
     3.0  Social Benefits Program Master Data      (Agency Staff / Finance)
     4.0  Payment Processing                       (Finance Officer / Head)
     5.0  System Validation Controls

   Stipend Management (row 102-106):
     1.0  Onboarding Student / Trainee Information (Coordinator)
     2.0  Stipend Inside Bhutan — Coordinator update / Finance verify / Head approve
     3.0  Stipend information lifecycle
     4.0  Payment Processing for Student / Trainee Stipend
     5.0  System Validation Controls

   DD sources:
     • Section 25.x — Social Benefits registrations (Name, CID, Nationality,
       Gender, Age Group, Bank Name, Branch, Account, Account Type)
     • Section 28.x — Stipend (CID, Student Code/Name/Category, Phone, Bank,
       Agency ID, Office ID, Gross Stipend, HR Deduction, Mess Deduction,
       Net Payable, Stipend ID, Expenditure Type, Budget Code, Invoice / Bill
       / Payment Order linkage)

   LoV sources:
     • LoVs 12.x (Social Benefits) — Gender, Age Group, Account Type
     • LoVs 14.x (Stipends) — Student Category, Other-than-Students, Expenditure
       Type, Budget Code, Payment Account, Programs

   All dropdowns consume these LoVs from masterDataMap. ZERO hardcoded
   fallbacks — admins can rename any value from /master-data without touching
   code thanks to keyword-based semantic helpers.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Step 1: Program master header (PRN row 99) ────────────────────── */
export interface SbProgramHeader {
  sbId: string;                 /* System-generated — SB-YYYY-NNNN */
  programType: string;          /* LoV: sb-program-type (drives whole flow) */
  programName: string;
  programShortName: string;     /* Acronym */
  programDescription: string;
  implementingAgency: string;   /* free text / links to entity master */
  budgetSource: string;         /* LoV: sb-budget-source */
  budgetCode: string;           /* LoV — cascades from expenditureType */
  expenditureType: string;      /* LoV: sb-expenditure-type */
  paymentAccount: string;       /* LoV: sb-payment-account */
  startDate: string;            /* DATE */
  plannedEndDate: string;       /* DATE */
  allocatedBudget: string;      /* DECIMAL */
  programStatus: string;        /* LoV: sb-program-status */
}

/* ── Step 2: Beneficiary row (PRN row 98 + row 102) ────────────────── */
export interface SbBeneficiary {
  id: string;                   /* BEN-YYYY-NNNN */
  beneficiaryType: string;      /* LoV: sb-beneficiary-type (Individual/Institutional) */
  beneficiaryCategory: string;  /* LoV: sb-beneficiary-category (cascades) */
  cid: string;                  /* DD 25.4 / 28.1 */
  firstName: string;            /* DD 25.3 / 28.3 */
  middleName: string;
  lastName: string;
  nationality: string;          /* LoV: nationality-status */
  gender: string;               /* LoV: gender */
  dob: string;                  /* DATE */
  ageGroup: string;             /* LoV: sb-age-group */
  phoneNumber: string;          /* DD 28.5 */
  /* Stipend-specific — only filled if programType is Stipend */
  studentCode: string;          /* DD 28.2 */
  studentCategory: string;      /* LoV: sb-student-category */
  agencyId: string;             /* DD 28.7 */
  officeId: string;             /* DD 28.8 */
  /* Banking (DD 25.8-25.9 + 28.6) */
  bankName: string;
  bankBranch: string;
  bankAccountNo: string;
  accountType: string;          /* LoV: account-type */
  /* Workflow */
  beneficiaryStatus: string;    /* LoV: sb-beneficiary-status */
  remarks: string;
}

/* ── Step 3: Stipend deductions row (DD 28.10-28.12) ───────────────── */
export interface SbDeduction {
  id: string;
  beneficiaryRefId: string;     /* links to SbBeneficiary.id */
  deductionType: string;        /* LoV: sb-deduction-type */
  amount: string;               /* DECIMAL */
  recipientBankAccount: string; /* DD 28.13 */
  remarks: string;
}

/* ── Step 4: Validation checks (PRN row 101 / row 106) ─────────────── */
export interface SbValidationCheck {
  key: string;
  label: string;                /* from LoV sb-validation-rule */
  passed: boolean;
  message: string;
}

/* ── Step 4: Approval chain (PRN row 103) ──────────────────────────── */
export interface SbApprovalEntry {
  id: string;
  level: string;                /* LoV: sb-approval-level */
  actor: string;
  decidedAt: string;
  decision: string;             /* LoV: sb-approval-decision */
  remarks: string;
}

/* ── Step 5: Payment transaction (PRN row 100 / row 105 + DD 28.14-.29) ── */
export interface SbPaymentTransaction {
  id: string;                   /* TXN-YYYY-NNNN */
  beneficiaryRefId: string;     /* links to SbBeneficiary.id */
  invoiceId: string;            /* DD 28.24 */
  billId: string;               /* DD 28.25 */
  grossAmount: string;          /* DD 28.9 / 28.26 */
  deductionAmount: string;      /* DD 28.27 */
  netPayableAmount: string;     /* DD 28.28 — auto-derived */
  paymentOrderId: string;       /* DD 28.29 — system generated */
  period: string;               /* e.g. 2026-04 */
  txnStatus: string;            /* LoV: sb-txn-status */
  remarks: string;
}

/* ── Stored record (full wizard state) ─────────────────────────────── */
export interface StoredSb {
  id: string;
  header: SbProgramHeader;
  beneficiaries: SbBeneficiary[];
  deductions: SbDeduction[];
  validationChecks: SbValidationCheck[];
  approvals: SbApprovalEntry[];
  transactions: SbPaymentTransaction[];
  createdAt: string;
  updatedAt: string;
}

export interface SbFormState {
  header: SbProgramHeader;
  beneficiaries: SbBeneficiary[];
  deductions: SbDeduction[];
  validationChecks: SbValidationCheck[];
  approvals: SbApprovalEntry[];
  transactions: SbPaymentTransaction[];
}

export const initialSbForm: SbFormState = {
  header: {
    sbId: "",
    programType: "",
    programName: "",
    programShortName: "",
    programDescription: "",
    implementingAgency: "",
    budgetSource: "",
    budgetCode: "",
    expenditureType: "",
    paymentAccount: "",
    startDate: "",
    plannedEndDate: "",
    allocatedBudget: "",
    programStatus: "",
  },
  beneficiaries: [],
  deductions: [],
  validationChecks: [],
  approvals: [],
  transactions: [],
};
