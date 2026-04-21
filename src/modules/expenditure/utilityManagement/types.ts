/* ═══════════════════════════════════════════════════════════════════════════
   Utility Management — SRS PRN 5.1 / DD 19.1 → 19.10
   ─────────────────────────────────────────────────
   Process Descriptions (R75-R77):
     1.0 Utility Service Provider Master Management
     2.0 Utility Bill Data Management (API fetch or manual)
     3.0 Utility Bill Validation (Budget, MCP, Connection, Due Date)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── DD 19.x — Utility Header ────────────────────────────────────────────── */
export interface UtilityHeader {
  utilityId: string;                 /* 19.1  System Generated */
  agencyId: string;                  /* 19.2  REF to Agency Master */
  agencyCode: string;                /*       UCoA Organisation Segment (canonical filter key) */
  agencyName: string;                /*       denormalized for display */
  utilityType: string;               /* 19.3  LoV: Electricity/Water/Phone/Internet */
  serviceProviderId: string;         /* 19.4  REF to Contractor */
  serviceProviderName: string;       /*       denormalized for display */
  connectionReference: string;       /* 19.5  VARCHAR */
  monthlyBudgetAllocation: string;   /* 19.6  DECIMAL */
  billingCycle: string;              /* 19.7  LoV: Monthly/Quarterly */
  autoPaymentEnabled: boolean;       /* 19.8  LoV Y/N */
  varianceThresholdPercent: string;  /* 19.9  DECIMAL (%) */
  utilityStatus: string;             /* 19.10 LoV: Active/Inactive/Suspended */
  /* ── SRS LoV 15.1 – 15.2 additions ─────────────────────────────────── */
  paymentMethod: string;             /* LoV 15.1: Individual / Consolidated */
  preferredPaymentMode: string;      /* LoV 15.2: e.g. "Consolidated: Line Departments" */
  cutoffDate: string;                /* LoV 15.2: Configurable cut-off date (DD/MM) */
  /* ── UCoA Integration ──────────────────────────────────────────────── */
  budgetCode: string;                /* UCoA Level-2 budget head reference */
  expenditureHead: string;           /* UCoA object code / expenditure classification */
  fundingSource: string;             /* RGOB / Donor / Loan */
}

/* ── Service → Office mapping (Process 1.0) ──────────────────────────────
   Example from SRS: Provider "TashiCell" → Service "TC Postpaid Mobile" →
   Office "Gov Tech". Each provider can have many services; each service
   can be mapped to many offices. */
export interface ServiceOfficeMap {
  id: string;
  serviceName: string;        /* e.g. "TC Postpaid Mobile" */
  officeId: string;           /* REF to agency office */
  officeName: string;
}

/* ── Utility Bill (Process 2.0 — Bill Data Management) ───────────────────
   Pushed by the provider's API OR entered manually / fetched on demand.
   BillSource is intentionally an open string — the canonical list is
   sourced from the `utility-bill-source` master data, and semantic
   helpers in useUtilityMasterData (isApiPushSource / isApiFetchSource /
   isManualSource) inspect the label's keywords to drive the UI. */
export type BillSource = string;

export interface UtilityBill {
  id: string;
  billId: string;                 /* system generated: UB-YYYY-NNNN */
  utilityId: string;              /* FK → UtilityHeader.utilityId */
  source: BillSource;
  serviceNumber: string;          /* service number or entry reference */
  officeId: string;
  officeName: string;
  billingCycle: string;           /* copied from header */
  billingPeriodFrom: string;
  billingPeriodTo: string;
  billAmount: string;             /* DECIMAL */
  applicableTaxes: string;        /* DECIMAL */
  totalBillAmount: string;        /* DECIMAL — system verified */
  billDueDate: string;            /* DD/MM/YYYY */
  receivedAt: string;             /* ISO when pushed/fetched */
  status: BillStatus;             /* Pending / Cleared / Approved / Paid / Disputed / Overdue */
  /* ── One-click Payment Order auto-generation (SRS R77 tail-end) ──
     Populated the moment the agency clicks "Generate Payment Order &
     Send to Cash Management". The PO id is synthesised locally,
     pushed to SubmittedInvoiceContext as a `pushed_to_cm` invoice,
     and echoed back here so the Utility workspace keeps a live link
     between the validated bill and its Cash Management record. */
  paymentOrderId?: string;
  paymentOrderGeneratedAt?: string;
  paymentOrderAck?: string;       /* CM-ACK-xxxxxx */
  paymentOrderStatus?: "generated" | "pushed_to_cm" | "cleared" | "held" | "rejected";
}

/* BillStatus is an open string sourced from the `utility-bill-status`
   master data. Semantic helpers (isPendingStatus, isPaidStatus, ...)
   drive colour coding and rule logic so admins can rename or extend
   statuses without a code change. */
export type BillStatus = string;

/* ── Validation check (Process 3.0) ──────────────────────────────────────
   The four system checks called out by SRS R77 plus a free-form reason. */
export interface BillValidationCheck {
  key: "budget" | "mcp" | "connection" | "due-date";
  label: string;
  passed: boolean;
  message: string;
}

export interface StoredUtility {
  id: string;                     /* internal record id */
  header: UtilityHeader;
  serviceMaps: ServiceOfficeMap[];
  bills: UtilityBill[];
  createdAt: string;
  updatedAt: string;
}

/* Form state used by the page wizard. */
export interface UtilityFormState {
  header: UtilityHeader;
  serviceMaps: ServiceOfficeMap[];
  bills: UtilityBill[];
}

export const initialUtilityForm: UtilityFormState = {
  header: {
    utilityId: "",
    agencyId: "",
    agencyCode: "",
    agencyName: "",
    utilityType: "",
    serviceProviderId: "",
    serviceProviderName: "",
    connectionReference: "",
    monthlyBudgetAllocation: "",
    billingCycle: "",            /* seeded from master data at runtime */
    autoPaymentEnabled: false,
    varianceThresholdPercent: "",
    utilityStatus: "",           /* seeded from master data at runtime */
    paymentMethod: "",           /* seeded from master data at runtime */
    preferredPaymentMode: "",    /* seeded from master data at runtime */
    cutoffDate: "",              /* configurable cut-off DD/MM */
    budgetCode: "",              /* UCoA budget head */
    expenditureHead: "",         /* UCoA object code */
    fundingSource: "",           /* RGOB / Donor / Loan */
  },
  serviceMaps: [],
  bills: [],
};
