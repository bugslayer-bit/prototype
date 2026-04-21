/* ═══════════════════════════════════════════════════════════════════════════
   RBAC — Workflow (Approval Chain) Data Model
   ─────────────────────────────────────────────
   EXPENDITURE MODULE — Complete Workflow Configuration

   Base step kinds: Initiator → Reviewer → Approver
   Admins can create additional step kinds (Certifier, Releaser, Recommender,
   Notifier, etc.) through the Workflow Configuration UI and insert them
   into any process chain. Custom kinds are persisted to localStorage.

   Every expenditure process ships with a 3-step default:
     Initiator  → originates the transaction / request
     Reviewer   → verifies documents, data, and compliance
     Approver   → final authority sign-off
   ═══════════════════════════════════════════════════════════════════════════ */

export const RBAC_WORKFLOWS_STORAGE_KEY = "ifmis_rbac_workflows";
export const RBAC_WORKFLOWS_VERSION_KEY = "ifmis_rbac_workflows_ver";
export const RBAC_CUSTOM_STEP_KINDS_KEY = "ifmis_rbac_custom_step_kinds";
export const RBAC_WORKFLOWS_VERSION = "2026-04-12-expenditure-payroll-v2";

/* ── Step kinds ─────────────────────────────────────────────────────────── */

/** Built-in step kinds that ship with the system (cannot be deleted) */
export type BuiltInStepKind = "Initiator" | "Reviewer" | "Approver";

/** Step kind is a string so admin-created kinds are first-class citizens */
export type WorkflowStepKind = string;

/** The 3 base kinds every installation starts with */
export const BASE_STEP_KINDS: BuiltInStepKind[] = [
  "Initiator",
  "Reviewer",
  "Approver",
];

/** Descriptions for the base kinds (admin-created kinds supply their own) */
export const baseStepKindDescriptions: Record<BuiltInStepKind, string> = {
  Initiator: "Originates the transaction or request",
  Reviewer:  "Verifies documents, data, and compliance",
  Approver:  "Final authority sign-off",
};

/* ── Custom step kind management ────────────────────────────────────────── *
 * Admins can create new step kinds (e.g. Certifier, Releaser, Notifier,
 * Recommender) from the Workflow Configuration tab. These persist in
 * localStorage alongside the base 3. The UI reads ALL_STEP_KINDS via the
 * helper below, which merges base + custom.
 * ──────────────────────────────────────────────────────────────────────── */

export interface CustomStepKind {
  kind: string;           /* e.g. "Certifier", "Releaser" */
  description: string;    /* e.g. "Certifies budget validity" */
  createdAt: string;      /* ISO date */
}

/** Read custom step kinds from localStorage */
export function getCustomStepKinds(): CustomStepKind[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RBAC_CUSTOM_STEP_KINDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomStepKind[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save custom step kinds to localStorage */
export function writeCustomStepKinds(kinds: CustomStepKind[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RBAC_CUSTOM_STEP_KINDS_KEY, JSON.stringify(kinds));
}

/** Get ALL step kinds (base + admin-created) — used by dropdown menus */
export function getAllStepKinds(): string[] {
  const custom = getCustomStepKinds().map(k => k.kind);
  return [...BASE_STEP_KINDS, ...custom];
}

/** Get description for any step kind (base or custom) */
export function getStepKindDescription(kind: string): string {
  if (kind in baseStepKindDescriptions) {
    return baseStepKindDescriptions[kind as BuiltInStepKind];
  }
  const custom = getCustomStepKinds().find(k => k.kind === kind);
  return custom?.description ?? "Custom workflow step";
}

/* ── Data model ─────────────────────────────────────────────────────────── */

export interface WorkflowStep {
  id: string;
  order: number;
  kind: WorkflowStepKind;
  label: string;          /* e.g. "Initial Capture", "Document Verification" */
  roleId: string;         /* references rbacData.Role.id */
  slaHours?: number;      /* optional SLA */
}

export interface WorkflowProcess {
  id: string;             /* e.g. "contractor-registration" */
  module: string;         /* matches rbacData rbacModules entry */
  name: string;           /* display name */
  description: string;
  steps: WorkflowStep[];
}

/* ─────────────────────────────────────────────────────────────────────────
   Helper: build a 3-step chain (Initiator → Reviewer → Approver)
   ───────────────────────────────────────────────────────────────────────── */
function chain3(
  prefix: string,
  initiator: { label: string; roleId: string; slaHours?: number },
  reviewer:  { label: string; roleId: string; slaHours?: number },
  approver:  { label: string; roleId: string; slaHours?: number },
): WorkflowStep[] {
  return [
    { id: `${prefix}-step-1`, order: 1, kind: "Initiator", label: initiator.label, roleId: initiator.roleId, slaHours: initiator.slaHours },
    { id: `${prefix}-step-2`, order: 2, kind: "Reviewer",  label: reviewer.label,  roleId: reviewer.roleId,  slaHours: reviewer.slaHours },
    { id: `${prefix}-step-3`, order: 3, kind: "Approver",  label: approver.label,  roleId: approver.roleId,  slaHours: approver.slaHours },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEED WORKFLOWS — Complete Expenditure Module
   ─────────────────────────────────────────────
   22 processes × 3 steps each = 66 workflow steps
   Grouped by functional area matching the SRS Process Descriptions.
   ═══════════════════════════════════════════════════════════════════════════ */
export const seedWorkflows: WorkflowProcess[] = [

  /* ══════════════════════════════════════════════════════════════════════
     1. CONTRACTOR & VENDOR MANAGEMENT
     ══════════════════════════════════════════════════════════════════════ */

  /* 1.1 Contractor Registration (Individual & Business) */
  {
    id: "contractor-registration",
    module: "Contractor Registration",
    name: "Contractor Registration",
    description: "New contractor onboarding — self-registration by contractor (Public) or data entry by Agency Staff, reviewed by Procurement, approved by Finance Officer.",
    steps: chain3("cr",
      { label: "Registration Entry",     roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Document Verification",  roleId: "role-procurement",     slaHours: 48 },
      { label: "Registration Approval",  roleId: "role-finance-officer", slaHours: 24 },
    ),
  },

  /* 1.2 Contractor Amendment */
  {
    id: "contractor-amendment",
    module: "Contractor Management",
    name: "Contractor Amendment",
    description: "Profile changes to an existing contractor — initiated by Agency Staff, verified by Procurement, approved by Finance Officer.",
    steps: chain3("ca",
      { label: "Amendment Request",      roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Change Verification",    roleId: "role-procurement",     slaHours: 48 },
      { label: "Amendment Approval",     roleId: "role-finance-officer", slaHours: 24 },
    ),
  },

  /* 1.3 Vendor Management (Non-Contractual Vendor Entry) */
  {
    id: "vendor-management",
    module: "Vendor Management",
    name: "Vendor Registration & Amendment",
    description: "Non-contractual vendor entry (utilities, subscriptions, contributions) — initiated by Agency Staff, verified by Procurement, approved by Finance Officer.",
    steps: chain3("vm",
      { label: "Vendor Data Entry",      roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Vendor Verification",    roleId: "role-procurement",     slaHours: 48 },
      { label: "Vendor Approval",        roleId: "role-finance-officer", slaHours: 24 },
    ),
  },

  /* ══════════════════════════════════════════════════════════════════════
     2. CONTRACT LIFECYCLE
     ══════════════════════════════════════════════════════════════════════ */

  /* 2.1 Contract Creation (SRS PD Row 27) */
  {
    id: "contract-creation",
    module: "Contract Creation",
    name: "Contract Creation",
    description: "New contract issuance (Manual, File Upload, eGP, CMS) — drafted by Procurement, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("cc",
      { label: "Draft Contract",         roleId: "role-procurement",     slaHours: 48 },
      { label: "Financial Review",       roleId: "role-finance-officer", slaHours: 48 },
      { label: "Contract Sign-off",      roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* 2.2 Contract Amendment / Variation Order (SRS PD Row 28) */
  {
    id: "contract-amendment",
    module: "Contract Amendment",
    name: "Contract Amendment",
    description: "Variation order for active contracts — value, milestone, time, or financial rule changes. Initiated by Agency Staff, reviewed by Procurement, approved by Head of Agency.",
    steps: chain3("cam",
      { label: "Variation Request",      roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Procurement Review",     roleId: "role-procurement",     slaHours: 48 },
      { label: "Amendment Approval",     roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* 2.3 Contract Extension (SRS PD Row 29) */
  {
    id: "contract-extension",
    module: "Contract Extension",
    name: "Contract Extension",
    description: "Extend contract duration — initiated by Agency Staff, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("cex",
      { label: "Extension Request",      roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Financial Review",       roleId: "role-finance-officer", slaHours: 48 },
      { label: "Extension Approval",     roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* 2.4 Contract Closure (SRS PD Row 30) */
  {
    id: "contract-closure",
    module: "Contract Closure",
    name: "Contract Closure",
    description: "Close contract with final settlement (Normal, Early, Terminated) — initiated by Finance Officer, reviewed by Procurement, approved by Head of Agency.",
    steps: chain3("ccl",
      { label: "Closure Initiation",     roleId: "role-finance-officer", slaHours: 48 },
      { label: "Settlement Review",      roleId: "role-procurement",     slaHours: 48 },
      { label: "Closure Approval",       roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* Note: Contract Lifecycle (SRS PD Row 31) is a dashboard — no workflow needed */

  /* ══════════════════════════════════════════════════════════════════════
     3. INVOICE & BILL PROCESSING
     ══════════════════════════════════════════════════════════════════════ */

  /* 3.1 Invoice Submission (SRS PD Row 32) */
  {
    id: "invoice-submission",
    module: "Invoice Submission",
    name: "Invoice Submission",
    description: "Contractor submits invoice against contract milestones/GRN — submitted by Contractor (Public), reviewed by Procurement, approved by Finance Officer.",
    steps: chain3("inv",
      { label: "Invoice Submission",     roleId: "role-public",          slaHours: 24 },
      { label: "Technical Verification", roleId: "role-procurement",     slaHours: 48 },
      { label: "Invoice Approval",       roleId: "role-finance-officer", slaHours: 48 },
    ),
  },

  /* 3.2 Bill Processing (SRS PD Row 33-34) */
  {
    id: "bill-processing",
    module: "Bill Processing",
    name: "Bill Processing",
    description: "Finance Officer creates bill from approved invoice — bill creation by Finance Officer, reviewed by Finance Officer (senior), approved by Head of Agency.",
    steps: chain3("bill",
      { label: "Bill Creation",          roleId: "role-finance-officer", slaHours: 24 },
      { label: "Bill Verification",      roleId: "role-finance-officer", slaHours: 48 },
      { label: "Bill Approval",          roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 3.3 Bill Discounting */
  {
    id: "bill-discounting",
    module: "Bill Discounting",
    name: "Bill Discounting",
    description: "Contractor requests bill discounting through Financial Institution — submitted by Contractor (Public), reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("bd",
      { label: "Discounting Request",    roleId: "role-public",          slaHours: 24 },
      { label: "Eligibility Review",     roleId: "role-finance-officer", slaHours: 48 },
      { label: "Discounting Approval",   roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* ══════════════════════════════════════════════════════════════════════
     4. PAYMENT PROCESSING
     ══════════════════════════════════════════════════════════════════════ */

  /* 4.1 Payment Order */
  {
    id: "payment-order",
    module: "Payment Order",
    name: "Payment Order",
    description: "Auto-generated from approved bills — created by Finance Officer, reviewed by Finance Officer (senior), approved by Head of Agency for cash disbursement.",
    steps: chain3("po",
      { label: "PO Generation",          roleId: "role-finance-officer", slaHours: 4  },
      { label: "PO Verification",        roleId: "role-finance-officer", slaHours: 24 },
      { label: "Release Authorisation",   roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 4.2 Utility Payment (SRS PD Row 38) */
  {
    id: "utility-payment",
    module: "Utility Payment",
    name: "Utility Bill Processing",
    description: "Utility bills (Electricity, Water, Phone, Internet) — data entry by Agency Staff, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("util",
      { label: "Bill Data Entry",        roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Bill Validation",        roleId: "role-finance-officer", slaHours: 24 },
      { label: "Payment Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 4.3 Rental Payment (SRS PD Row 37) */
  {
    id: "rental-payment",
    module: "Rental Payment",
    name: "Rental Payment",
    description: "Rental payments for government assets (Land, Buildings, Vehicles, IP) — initiated by Agency Staff, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("rent",
      { label: "Rental Entry",           roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Rental Validation",      roleId: "role-finance-officer", slaHours: 24 },
      { label: "Payment Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 4.4 Debt Payment (SRS PD Row 39) */
  {
    id: "debt-payment",
    module: "Debt Payment",
    name: "Debt Servicing",
    description: "Government loan repayment (Principal + Interest) — initiated by Finance Officer, reviewed by Finance Officer (senior), approved by Head of Agency.",
    steps: chain3("debt",
      { label: "Repayment Trigger",      roleId: "role-finance-officer", slaHours: 4  },
      { label: "Schedule Verification",  roleId: "role-finance-officer", slaHours: 24 },
      { label: "Disbursement Approval",  roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* 4.5 SOE & Fund Transfer (SRS PD Row 40) */
  {
    id: "soe-fund-transfer",
    module: "SOE Fund Transfer",
    name: "SOE & Fund Transfer",
    description: "Inter-agency fund transfers and SOE reporting (Loan, Grant, Appropriation) — initiated by Finance Officer, reviewed by Finance Officer (senior), approved by Head of Agency.",
    steps: chain3("soe",
      { label: "Transfer Request",       roleId: "role-finance-officer", slaHours: 24 },
      { label: "Policy Review",          roleId: "role-finance-officer", slaHours: 48 },
      { label: "Transfer Approval",      roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* ══════════════════════════════════════════════════════════════════════
     5. ADVANCES & SANCTIONS
     ══════════════════════════════════════════════════════════════════════ */

  /* 5.1 Advances (SRS PD Row 35) */
  {
    id: "advances",
    module: "Advances",
    name: "Advance Request",
    description: "Advance payments (Mobilization, Material, Secured, Imprest) — initiated by Agency Staff, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("adv",
      { label: "Advance Initiation",     roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Financial Review",       roleId: "role-finance-officer", slaHours: 24 },
      { label: "Advance Approval",       roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* 5.2 Sanction Management (SRS PD Row 36) */
  {
    id: "sanction-management",
    module: "Sanction Management",
    name: "Contractor Sanction",
    description: "Suspension, Debarment, or Warning against contractors — proposed by Procurement, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("san",
      { label: "Sanction Proposal",      roleId: "role-procurement",     slaHours: 48 },
      { label: "Compliance Review",      roleId: "role-finance-officer", slaHours: 48 },
      { label: "Sanction Approval",      roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* ══════════════════════════════════════════════════════════════════════
     6. FINANCIAL INSTITUTION
     ══════════════════════════════════════════════════════════════════════ */

  /* 6.1 FI Registration (SRS PD Row 41) */
  {
    id: "fi-registration",
    module: "FI Registration",
    name: "Financial Institution Registration",
    description: "Banks and FIs register for bill discounting services — submitted by FI (Public), reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("fi",
      { label: "FI Application",         roleId: "role-public",          slaHours: 24 },
      { label: "Regulatory Review",      roleId: "role-finance-officer", slaHours: 72 },
      { label: "FI Approval",            roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* ══════════════════════════════════════════════════════════════════════
     7. SOCIAL BENEFITS & STIPENDS
     ══════════════════════════════════════════════════════════════════════ */

  /* 7.1 Social Benefits (SRS PD Row 42) */
  {
    id: "social-benefits",
    module: "Social Benefits",
    name: "Social Benefits Payment",
    description: "Social welfare program payments (subsidies, grants, allowances) — initiated by Agency Staff, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("sb",
      { label: "Beneficiary Entry",      roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Eligibility Review",     roleId: "role-finance-officer", slaHours: 48 },
      { label: "Payment Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 7.2 Stipend Management (SRS PD Row 42) */
  {
    id: "stipend-management",
    module: "Stipend Management",
    name: "Stipend Processing",
    description: "Student/Trainee stipend onboarding and payment — initiated by Agency Staff, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("stip",
      { label: "Stipend Onboarding",     roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Financial Review",       roleId: "role-finance-officer", slaHours: 48 },
      { label: "Stipend Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 7.3 Subscriptions & Contributions (SRS PD Row 43) */
  {
    id: "subscriptions-contributions",
    module: "Subscriptions Contributions",
    name: "Subscriptions & Contributions",
    description: "Membership fees to international organisations and contribution payments — initiated by Agency Staff, reviewed by Finance Officer, approved by Head of Agency.",
    steps: chain3("sc",
      { label: "Subscription Entry",     roleId: "role-agency-staff",    slaHours: 24 },
      { label: "Financial Review",       roleId: "role-finance-officer", slaHours: 48 },
      { label: "Payment Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* ══════════════════════════════════════════════════════════════════════
     8. RETENTION MONEY
     ══════════════════════════════════════════════════════════════════════ */

  /* 8.1 Retention Release (SRS PD Row 44) */
  {
    id: "retention-release",
    module: "Retention Release",
    name: "Retention Release",
    description: "Release retained money after Defect Liability Period — initiated by Finance Officer, reviewed by Procurement, approved by Head of Agency.",
    steps: chain3("rr",
      { label: "Release Request",        roleId: "role-finance-officer", slaHours: 24 },
      { label: "DLP Verification",       roleId: "role-procurement",     slaHours: 48 },
      { label: "Release Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 8.2 Retention Forfeiture (SRS PD Row 44) */
  {
    id: "retention-forfeiture",
    module: "Retention Forfeiture",
    name: "Retention Forfeiture",
    description: "Forfeit retained money due to contractor default — initiated by Finance Officer, reviewed by Procurement, approved by Head of Agency.",
    steps: chain3("rf",
      { label: "Forfeiture Request",     roleId: "role-finance-officer", slaHours: 24 },
      { label: "Default Verification",   roleId: "role-procurement",     slaHours: 48 },
      { label: "Forfeiture Approval",    roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* ══════════════════════════════════════════════════════════════════════
     9. PAYROLL — CIVIL SERVANTS (ZESt Integrated)
     ──────────────────────────────────────────────────────────────────────
     HR Officer initiates → Finance Officer reviews → Head of Agency approves
     All processes sync with ZESt HR system and post to MCP accounting.
     ══════════════════════════════════════════════════════════════════════ */

  /* 9.1 Employee Master (PRN 1.1) — ZESt sync, employee registry */
  {
    id: "employee-master",
    module: "Employee Master",
    name: "Employee Master Management",
    description: "Employee registry management synced from ZESt HR. HR Officer maintains data (CID, EID, TPN, bank details, pay scale, NPPF tier), Finance reviews for compliance, HoA approves changes.",
    steps: chain3("emp",
      { label: "Employee Data Entry",    roleId: "role-hr-officer",      slaHours: 24 },
      { label: "Data Verification",      roleId: "role-finance-officer", slaHours: 24 },
      { label: "Master Approval",        roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 9.2 Allowance & Deduction Configuration (PRN 1.2) — UCoA mapped */
  {
    id: "allowance-deduction-config",
    module: "Allowance Deduction Config",
    name: "Allowance & Deduction Configuration",
    description: "Manage allowance master (LE, LTC, Lump Sum, Indexation, Fixed, Uniform, Professional, etc.) and deduction master (PF, GIS, HC, TDS, CSWS). Changes require DRC/MOF approval and ZESt sync.",
    steps: chain3("alw",
      { label: "Config Change Request",  roleId: "role-hr-officer",      slaHours: 24 },
      { label: "Financial Review",       roleId: "role-finance-officer", slaHours: 48 },
      { label: "Config Approval",        roleId: "role-head-of-agency",  slaHours: 48 },
    ),
  },

  /* 9.3 Payroll Schedule (PRN 2.0) — holidays, data-freeze, ZESt deadlines */
  {
    id: "payroll-schedule",
    module: "Payroll Schedule",
    name: "Payroll Calendar Settings Configuration",
    description: "Manage payroll calendar — holidays, working days, payroll generation day, pay disbursement day, ZESt update deadline, and data-freeze period (last 3 working days).",
    steps: chain3("psched",
      { label: "Schedule Setup",         roleId: "role-hr-officer",      slaHours: 24 },
      { label: "Schedule Review",        roleId: "role-finance-officer", slaHours: 24 },
      { label: "Schedule Approval",      roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 9.4 Payroll Generation (PRN 2.1) — The core 6-step process:
         Dept Select → Data Confirm → System Checks → Draft PayBill → Finalize → Post MCP
         Workflow maps to: HR initiates (steps 1-3) → Finance reviews (step 4-5) → HoA posts (step 6) */
  {
    id: "payroll-generation",
    module: "Payroll Generation",
    name: "Payroll Generation (Civil Servants)",
    description: "Monthly payroll computation for civil servants: select department → confirm ZESt employee data → run system checks (bank, TPN, UCoA) → draft paybill (compute basic + allowances − deductions = net) → finalize → post to MCP with GL entries.",
    steps: chain3("pgen",
      { label: "Payroll Initiation",     roleId: "role-hr-officer",      slaHours: 24 },
      { label: "PayBill Review",         roleId: "role-finance-officer", slaHours: 48 },
      { label: "MCP Posting Approval",   roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 9.5 Salary Advance (PRN 3.1) — request, approval, disbursement, recovery */
  {
    id: "salary-advance",
    module: "Salary Advance",
    name: "Salary Advance Processing",
    description: "Civil servant salary advance — HR initiates request with amount, reason, and recovery schedule. Finance reviews eligibility and deduction plan. HoA approves for disbursement. Recovery auto-deducted via DED-007.",
    steps: chain3("sadv",
      { label: "Advance Request",        roleId: "role-hr-officer",      slaHours: 24 },
      { label: "Financial Review",       roleId: "role-finance-officer", slaHours: 24 },
      { label: "Advance Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 9.6 Muster Roll Creation & Payment (PRN 6.1 + 7.1) */
  {
    id: "muster-roll",
    module: "Muster Roll",
    name: "Muster Roll Creation & Payment",
    description: "Muster roll for wage workers (skilled/semi-skilled) — HR creates project master, registers beneficiaries (CID, bank, daily wage), Finance reviews attendance and computes payment (daily wage × days, 10% TDS if >20K), HoA approves.",
    steps: chain3("mr",
      { label: "Roll Creation",          roleId: "role-hr-officer",      slaHours: 24 },
      { label: "Payment Review",         roleId: "role-finance-officer", slaHours: 48 },
      { label: "Payment Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },

  /* 9.7 Sitting Fee & Honorarium (PRN 8.1) */
  {
    id: "sitting-fee-honorarium",
    module: "Sitting Fee Honorarium",
    name: "Sitting Fee & Honorarium",
    description: "Process sitting fees (UCoA 2120121) and honorarium (UCoA 2120122) for non-employees — HR onboards beneficiaries, Finance reviews rates and TDS (10% if >20K), HoA approves payment.",
    steps: chain3("sfh",
      { label: "Beneficiary Onboarding", roleId: "role-hr-officer",      slaHours: 24 },
      { label: "Rate & TDS Review",      roleId: "role-finance-officer", slaHours: 48 },
      { label: "Payment Approval",       roleId: "role-head-of-agency",  slaHours: 24 },
    ),
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Storage helpers
   ───────────────────────────────────────────────────────────────────────── */
export function getStoredWorkflows(): WorkflowProcess[] {
  if (typeof window === "undefined") return seedWorkflows;
  try {
    const ver = window.localStorage.getItem(RBAC_WORKFLOWS_VERSION_KEY);
    if (ver !== RBAC_WORKFLOWS_VERSION) {
      /* Version mismatch — reset to new seed */
      window.localStorage.removeItem(RBAC_WORKFLOWS_STORAGE_KEY);
      window.localStorage.setItem(RBAC_WORKFLOWS_VERSION_KEY, RBAC_WORKFLOWS_VERSION);
      return seedWorkflows;
    }
    const raw = window.localStorage.getItem(RBAC_WORKFLOWS_STORAGE_KEY);
    if (!raw) return seedWorkflows;
    const parsed = JSON.parse(raw) as WorkflowProcess[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedWorkflows;
  } catch {
    return seedWorkflows;
  }
}

export function writeStoredWorkflows(workflows: WorkflowProcess[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RBAC_WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows));
}

/* ─────────────────────────────────────────────────────────────────────────
   Step kind → colour token (used for chips / badges in the UI)
   Base kinds have fixed colours. Admin-created kinds get a neutral style
   until the admin customises them.
   ───────────────────────────────────────────────────────────────────────── */
export interface StepKindStyle {
  ring: string;
  bg: string;
  text: string;
  dot: string;
}

const BASE_STYLES: Record<BuiltInStepKind, StepKindStyle> = {
  Initiator: { ring: "ring-sky-200",     bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500" },
  Reviewer:  { ring: "ring-violet-200",  bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500" },
  Approver:  { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

/** Fallback style for admin-created step kinds */
const CUSTOM_STYLE: StepKindStyle = {
  ring: "ring-slate-200", bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-500",
};

/** Get the style for any step kind (base or custom) */
export function getStepKindStyle(kind: string): StepKindStyle {
  if (kind in BASE_STYLES) return BASE_STYLES[kind as BuiltInStepKind];
  return CUSTOM_STYLE;
}

/* ── Legacy export for backward compatibility ────────────────────────────
   Some UI components may still reference stepKindStyles directly.
   This maps to the new getStepKindStyle() function. */
export const stepKindStyles: Record<string, StepKindStyle> = new Proxy(
  {} as Record<string, StepKindStyle>,
  { get: (_target, prop: string) => getStepKindStyle(prop) },
);

/* ── Legacy export: ALL_STEP_KINDS for dropdowns ─────────────────────────
   Components that read ALL_STEP_KINDS will now get the dynamic list. */
export const ALL_STEP_KINDS: string[] = BASE_STEP_KINDS;

/* ── Legacy: stepKindDescriptions ────────────────────────────────────────
   Proxy so existing code like stepKindDescriptions["Initiator"] still works */
export const stepKindDescriptions: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  { get: (_target, prop: string) => getStepKindDescription(prop) },
);
