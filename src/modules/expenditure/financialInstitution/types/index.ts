/* ═══════════════════════════════════════════════════════════════════════════
   Financial Institution Management — SRS PRN 7.1
   ──────────────────────────────────────────────
   Process Descriptions rows 103-112:
     Step 1.0  Register Institution          (Applicant + System)
     Step 2.0  Validation & Approval Chain   (RMA / DTA Reviewer / DTA Approver)
     Step 3.0  Services & Compliance Profile (Agency Finance / DTA)
     Step 4.0  Ongoing Monitoring & Review   (DTA)
     Step 5.0  Lifecycle Actions (Suspend / Revoke / Reactivate)

   All dropdown options come from masterDataMap — no hardcoded fallbacks.
   Admins can modify the LoVs from /master-data without touching code.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Supporting document row (PRN 7.1 Step 1) ──────────────────────── */
export interface FiDocument {
  id: string;
  documentType: string;    /* LoV: fi-document-type */
  documentRef: string;     /* attachment reference number */
  issuedOn: string;        /* DATE */
  expiresOn: string;       /* DATE — blank if not applicable */
  remarks: string;
}

/* ── Service row (PRN 7.1 Step 3) ──────────────────────────────────── */
export interface FiService {
  id: string;
  serviceCategory: string; /* LoV: fi-service-category */
  launchDate: string;      /* DATE */
  targetSegment: string;   /* free text */
  remarks: string;
}

/* ── Registration header (DD — PRN 7.1 Step 1) ─────────────────────── */
export interface FiRegistrationHeader {
  fiId: string;                    /* System generated — FI-YYYY-NNNN */
  institutionName: string;
  legalName: string;
  institutionType: string;         /* LoV: fi-institution-type */
  ownershipType: string;           /* LoV: fi-ownership-type */
  licenceCategory: string;         /* LoV: fi-licence-category (cascades) */
  licenceNumber: string;
  licenceIssuedOn: string;         /* DATE */
  licenceExpiresOn: string;        /* DATE */
  regulatoryBody: string;          /* LoV: fi-regulatory-body */
  operatingRegion: string;         /* LoV: fi-operating-region */
  headOfficeAddress: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  reportingCurrency: string;       /* LoV: fi-currency */
  paidUpCapital: string;           /* DECIMAL */
  declaredTurnover: string;        /* DECIMAL */
  registrationStatus: string;      /* LoV: fi-registration-status */
  riskRating: string;              /* LoV: fi-risk-rating */
  reviewFrequency: string;         /* LoV: fi-review-frequency */
  narrative: string;
}

/* ── Validation check row (PRN 7.1 Step 2) ─────────────────────────── */
export interface FiValidationCheck {
  key: string;
  label: string;           /* from LoV fi-validation-rule */
  passed: boolean;
  message: string;
}

/* ── Approval log entry (PRN 7.1 Step 2) ───────────────────────────── */
export interface FiApprovalEntry {
  id: string;
  level: string;           /* LoV: fi-approval-level */
  actor: string;
  decidedAt: string;
  decision: string;        /* LoV: fi-approval-decision */
  remarks: string;
}

/* ── Monitoring entry (PRN 7.1 Step 4) ─────────────────────────────── */
export interface FiMonitoringEntry {
  id: string;
  reviewDate: string;
  monitoringStatus: string; /* LoV: fi-monitoring-status */
  reviewer: string;
  observations: string;
  rectificationDue: string;
}

/* ── Stored FI record (the whole wizard state) ─────────────────────── */
export interface StoredFi {
  id: string;
  header: FiRegistrationHeader;
  documents: FiDocument[];
  validationChecks: FiValidationCheck[];
  approvals: FiApprovalEntry[];
  services: FiService[];
  monitoring: FiMonitoringEntry[];
  createdAt: string;
  updatedAt: string;
}

/* Wizard form state. */
export interface FiFormState {
  header: FiRegistrationHeader;
  documents: FiDocument[];
  validationChecks: FiValidationCheck[];
  approvals: FiApprovalEntry[];
  services: FiService[];
  monitoring: FiMonitoringEntry[];
}

export const initialFiForm: FiFormState = {
  header: {
    fiId: "",
    institutionName: "",
    legalName: "",
    institutionType: "",
    ownershipType: "",
    licenceCategory: "",
    licenceNumber: "",
    licenceIssuedOn: "",
    licenceExpiresOn: "",
    regulatoryBody: "",
    operatingRegion: "",
    headOfficeAddress: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    reportingCurrency: "",
    paidUpCapital: "",
    declaredTurnover: "",
    registrationStatus: "",
    riskRating: "",
    reviewFrequency: "",
    narrative: "",
  },
  documents: [],
  validationChecks: [],
  approvals: [],
  services: [],
  monitoring: [],
};
