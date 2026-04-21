/* ═══════════════════════════════════════════════════════════════════════════
   RBAC — Data Types & Seed Data
   ─────────────────────────────
   EXPENDITURE MODULE — Complete Role-Based Access Control

   Roles are aligned to the 3-step workflow: Initiate → Review → Approve.
   Each agency has staff assigned to these functional roles. Only staff
   holding the right role participate in a given workflow — not all staff.

   Core roles (7 internal + 1 external):
     System Administrator  — full system access, RBAC config
     Head of Agency        — final Approver for all processes
     Finance Officer       — financial review, bill/PO creation, certifications
     Procurement Officer   — contractor/vendor/contract review, technical checks
     Agency Staff          — day-to-day initiator for most processes
     Auditor               — read-only access for audit & compliance
     Normal User           — view + create drafts, no approvals
     Public User           — external (contractors, FIs) self-service portal
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Permission ─────────────────────────────────────────────────────────── */
export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

/* ── Role ────────────────────────────────────────────────────────────────── */
export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean; /* system roles can't be deleted */
  permissionIds: string[];
  createdAt: string;
}

/* ── User ────────────────────────────────────────────────────────────────── */
export type UserStatus = "Active" | "Inactive" | "Suspended";

export interface RbacUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  /** UCoA Organisation Code — which agency this user belongs to */
  agencyCode: string;
  roleIds: string[];
  status: UserStatus;
  lastLogin: string;
  createdAt: string;
}

export const RBAC_ROLES_STORAGE_KEY = "ifmis_rbac_roles";
export const RBAC_USERS_STORAGE_KEY = "ifmis_rbac_users";
export const RBAC_SEED_VERSION = "2026-04-13-fi-role-v4";
export const RBAC_SEED_VERSION_KEY = "ifmis_rbac_seed_version";

/* ═══════════════════════════════════════════════════════════════════════════
   MODULES — Complete Expenditure Module Catalogue
   ─────────────────────────────────────────────────
   Every process in the Expenditure module is listed here. No Payroll.
   Grouped by functional area matching the SRS Process Descriptions.
   ═══════════════════════════════════════════════════════════════════════════ */
export const rbacModules = [
  /* ── 1. Contractor & Vendor ── */
  "Contractor Registration",        /* PRN 1.1 — Individual & Business */
  "Contractor Management",          /* PRN 1.2 — Amendment, Suspension */
  "Vendor Management",              /* Non-contractual vendor registry */

  /* ── 2. Contract Lifecycle ── */
  "Contract Creation",              /* SRS PD Row 27 */
  "Contract Amendment",             /* SRS PD Row 28 — Variation Orders */
  "Contract Extension",             /* SRS PD Row 29 */
  "Contract Closure",               /* SRS PD Row 30 — Settlement */
  "Contract Lifecycle",             /* SRS PD Row 31 — Dashboard / Tracking */

  /* ── 3. Invoice & Bill ── */
  "Invoice Submission",             /* SRS PD Row 32 — Contractor submits */
  "Invoice Approval",               /* SRS PD Row 32 — Agency verifies */
  "Bill Processing",                /* SRS PD Row 33-34 — Bill creation + approval */
  "Bill Discounting",               /* Bill discounting facility */

  /* ── 4. Payment ── */
  "Payment Order",                  /* PO generation + release */
  "Utility Payment",                /* SRS PD Row 38 — Electricity, Water, etc. */
  "Rental Payment",                 /* SRS PD Row 37 — Land, Building, Vehicle */
  "Debt Payment",                   /* SRS PD Row 39 — Loan servicing */
  "SOE Fund Transfer",              /* SRS PD Row 40 — Inter-agency transfers */

  /* ── 5. Financial Institution ── */
  "FI Registration",                /* SRS PD Row 41 — Bank/FI onboarding */

  /* ── 6. Social & Stipend ── */
  "Social Benefits",                /* SRS PD Row 42 — Welfare programs */
  "Stipend Management",             /* SRS PD Row 42 — Student/Trainee */
  "Subscriptions Contributions",    /* SRS PD Row 43 — International orgs */

  /* ── 7. Retention ── */
  "Retention Release",              /* SRS PD Row 44 — DLP release */
  "Retention Forfeiture",           /* SRS PD Row 44 — Default forfeiture */

  /* ── 8. Advances & Sanctions ── */
  "Advances",                       /* SRS PD Row 35 — Mobilization, Material, etc. */
  "Sanction Management",            /* SRS PD Row 36 — Suspension, Debarment */

  /* ── 9. Payroll (Civil Servants — ZESt Integrated) ── */
  "Employee Master",                /* PRN 1.1 — Employee Registry (synced from ZESt) */
  "Allowance Deduction Config",     /* PRN 1.2 — Allowance & Deduction master (UCoA mapped) */
  "Payroll Schedule",               /* PRN 2.0 — Schedule, holidays, data-freeze dates */
  "Payroll Generation",             /* PRN 2.1 — 6-step: Dept → Data → Checks → Draft → Finalize → MCP */
  "Salary Advance",                 /* PRN 3.1 — Advance request, approval, recovery tracking */
  "Muster Roll",                    /* PRN 6.1-7.1 — Muster Roll creation & payment */
  "Sitting Fee Honorarium",         /* PRN 8.1 — Sitting fee & honorarium processing */

  /* ── 10. Administration ── */
  "Master Data",                    /* LoVs, Tax Master, Document Types */
  "RBAC & Administration",          /* Roles, Users, Workflow Config */
  "Reports & Analytics",            /* Cross-module reporting */
  "Document Management",            /* Attachments, templates */
  "Workflow Configuration",         /* Admin: manage step kinds, chains */
] as const;

/* ── Actions ── */
export const rbacActions = [
  "View",
  "Create",
  "Edit",
  "Delete",
  "Approve",
  "Reject",
  "Submit",
  "Export",
] as const;

/* ── Seed permissions (module × action) ── */
function seedPermissions(): Permission[] {
  const perms: Permission[] = [];
  for (const mod of rbacModules) {
    for (const act of rbacActions) {
      const id = `${mod.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${act.toLowerCase()}`;
      perms.push({ id, module: mod, action: act, description: `${act} access for ${mod}` });
    }
  }
  return perms;
}

export const allPermissions: Permission[] = seedPermissions();

/* ── Helper: get permission IDs for a module ── */
export function getPermissionIdsForModule(module: string): string[] {
  return allPermissions.filter(p => p.module === module).map(p => p.id);
}

/* ── Helper: get permission IDs for a module filtered by actions ── */
function perms(module: string, actions: string[]): string[] {
  return allPermissions.filter(p => p.module === module && actions.includes(p.action)).map(p => p.id);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEED ROLES — Expenditure Module
   ─────────────────────────────────
   7 internal roles + 1 external (Public User).
   Each role's permissions are mapped to exactly what they need — no more.

   Workflow alignment:
     Initiator step  → Agency Staff (or Public for self-service)
     Reviewer step   → Procurement Officer or Finance Officer
     Approver step   → Head of Agency or Finance Officer
   ═══════════════════════════════════════════════════════════════════════════ */
export const seedRoles: Role[] = [

  /* ── 1. System Administrator ─────────────────────────────────────────── */
  {
    id: "role-admin",
    name: "System Administrator",
    description: "Full access to all Expenditure modules including RBAC management, master data, workflow configuration, and audit logs.",
    isSystem: true,
    permissionIds: allPermissions.map(p => p.id),
    createdAt: "2025-01-15",
  },

  /* ── 2. Head of Agency ───────────────────────────────────────────────── *
   *  Final Approver across all expenditure workflows.
   *  Can view everything, approve/reject at the final step.
   *  Cannot create or edit records (that's Agency Staff / Finance Officer). */
  {
    id: "role-head-of-agency",
    name: "Head of Agency",
    description: "Final Approver for all expenditure workflows. Authorises contracts, payments, advances, sanctions, and closures.",
    isSystem: true,
    permissionIds: [
      /* Contractor & Vendor — view + approve */
      ...perms("Contractor Registration",     ["View", "Approve", "Reject"]),
      ...perms("Contractor Management",        ["View", "Approve", "Reject"]),
      ...perms("Vendor Management",            ["View", "Approve", "Reject"]),
      /* Contract Lifecycle — view + approve */
      ...perms("Contract Creation",            ["View", "Approve", "Reject"]),
      ...perms("Contract Amendment",           ["View", "Approve", "Reject"]),
      ...perms("Contract Extension",           ["View", "Approve", "Reject"]),
      ...perms("Contract Closure",             ["View", "Approve", "Reject"]),
      ...perms("Contract Lifecycle",           ["View"]),
      /* Invoice & Bill — view + approve */
      ...perms("Invoice Submission",           ["View"]),
      ...perms("Invoice Approval",             ["View", "Approve", "Reject"]),
      ...perms("Bill Processing",              ["View", "Approve", "Reject"]),
      ...perms("Bill Discounting",             ["View", "Approve", "Reject"]),
      /* Payment — view + approve */
      ...perms("Payment Order",                ["View", "Approve", "Reject"]),
      ...perms("Utility Payment",              ["View", "Approve", "Reject"]),
      ...perms("Rental Payment",               ["View", "Approve", "Reject"]),
      ...perms("Debt Payment",                 ["View", "Approve", "Reject"]),
      ...perms("SOE Fund Transfer",            ["View", "Approve", "Reject"]),
      /* FI */
      ...perms("FI Registration",              ["View", "Approve", "Reject"]),
      /* Social & Stipend — view + approve */
      ...perms("Social Benefits",              ["View", "Approve", "Reject"]),
      ...perms("Stipend Management",           ["View", "Approve", "Reject"]),
      ...perms("Subscriptions Contributions",  ["View", "Approve", "Reject"]),
      /* Retention — view + approve */
      ...perms("Retention Release",            ["View", "Approve", "Reject"]),
      ...perms("Retention Forfeiture",         ["View", "Approve", "Reject"]),
      /* Advances & Sanctions — view + approve */
      ...perms("Advances",                     ["View", "Approve", "Reject"]),
      ...perms("Sanction Management",          ["View", "Approve", "Reject"]),
      /* Payroll — approve payroll, advances */
      ...perms("Employee Master",              ["View"]),
      ...perms("Allowance Deduction Config",   ["View"]),
      ...perms("Payroll Schedule",             ["View"]),
      ...perms("Payroll Generation",           ["View", "Approve", "Reject"]),
      ...perms("Salary Advance",               ["View", "Approve", "Reject"]),
      ...perms("Muster Roll",                  ["View", "Approve", "Reject"]),
      ...perms("Sitting Fee Honorarium",       ["View", "Approve", "Reject"]),
      /* Admin — view only */
      ...perms("Reports & Analytics",          ["View", "Export"]),
      ...perms("Document Management",          ["View"]),
    ],
    createdAt: "2025-01-15",
  },

  /* ── 3. Finance Officer ──────────────────────────────────────────────── *
   *  Reviewer for financial processes, Approver for contractor/vendor.
   *  Creates bills, payment orders, manages advances, debt, SOE.
   *  Core financial management role. */
  {
    id: "role-finance-officer",
    name: "Finance Officer",
    description: "Manages financial review across all expenditure processes. Creates bills, payment orders, and handles advances, debt servicing, and fund transfers.",
    isSystem: true,
    permissionIds: [
      /* Contractor & Vendor — review + approve */
      ...perms("Contractor Registration",     ["View", "Approve", "Reject"]),
      ...perms("Contractor Management",        ["View", "Edit", "Approve", "Reject"]),
      ...perms("Vendor Management",            ["View", "Edit", "Approve", "Reject"]),
      /* Contract Lifecycle — full financial management */
      ...perms("Contract Creation",            ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Contract Amendment",           ["View", "Create", "Edit", "Submit"]),
      ...perms("Contract Extension",           ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Contract Closure",             ["View", "Create", "Edit", "Submit"]),
      ...perms("Contract Lifecycle",           ["View", "Export"]),
      /* Invoice & Bill — full bill management */
      ...perms("Invoice Submission",           ["View"]),
      ...perms("Invoice Approval",             ["View", "Approve", "Reject"]),
      ...perms("Bill Processing",              ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Bill Discounting",             ["View", "Approve", "Reject"]),
      /* Payment — full PO management */
      ...perms("Payment Order",                ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Utility Payment",              ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Rental Payment",               ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Debt Payment",                 ["View", "Create", "Edit", "Submit"]),
      ...perms("SOE Fund Transfer",            ["View", "Create", "Edit", "Submit"]),
      /* FI */
      ...perms("FI Registration",              ["View", "Approve", "Reject"]),
      /* Social & Stipend — financial review */
      ...perms("Social Benefits",              ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Stipend Management",           ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Subscriptions Contributions",  ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      /* Retention — initiate + review */
      ...perms("Retention Release",            ["View", "Create", "Edit", "Submit"]),
      ...perms("Retention Forfeiture",         ["View", "Create", "Edit", "Submit"]),
      /* Advances & Sanctions — financial review */
      ...perms("Advances",                     ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Sanction Management",          ["View", "Approve", "Reject"]),
      /* Admin — reports + docs */
      ...perms("Reports & Analytics",          ["View", "Export"]),
      ...perms("Document Management",          ["View", "Create"]),
      ...perms("Master Data",                  ["View"]),
      /* Payroll — financial review and certification */
      ...perms("Employee Master",              ["View"]),
      ...perms("Allowance Deduction Config",   ["View", "Edit"]),
      ...perms("Payroll Schedule",             ["View"]),
      ...perms("Payroll Generation",           ["View", "Approve", "Reject"]),
      ...perms("Salary Advance",               ["View", "Approve", "Reject"]),
      ...perms("Muster Roll",                  ["View", "Approve", "Reject"]),
      ...perms("Sitting Fee Honorarium",       ["View", "Approve", "Reject"]),
    ],
    createdAt: "2025-01-15",
  },

  /* ── 4. Procurement Officer ──────────────────────────────────────────── *
   *  Reviewer for contractor, vendor, and contract workflows.
   *  Handles technical verification, document checks, and procurement review.
   *  Initiator for contract creation and sanction proposals. */
  {
    id: "role-procurement",
    name: "Procurement Officer",
    description: "Handles contractor/vendor registration review, contract drafting and verification, invoice technical review, and sanction proposals.",
    isSystem: false,
    permissionIds: [
      /* Contractor & Vendor — full management */
      ...perms("Contractor Registration",     ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Contractor Management",        ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Vendor Management",            ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      /* Contract Lifecycle — drafting + review */
      ...perms("Contract Creation",            ["View", "Create", "Edit", "Submit", "Approve"]),
      ...perms("Contract Amendment",           ["View", "Create", "Edit", "Submit", "Approve", "Reject"]),
      ...perms("Contract Extension",           ["View", "Edit", "Submit"]),
      ...perms("Contract Closure",             ["View", "Edit", "Approve", "Reject"]),
      ...perms("Contract Lifecycle",           ["View"]),
      /* Invoice — technical review */
      ...perms("Invoice Submission",           ["View"]),
      ...perms("Invoice Approval",             ["View", "Approve", "Reject"]),
      ...perms("Bill Processing",              ["View"]),
      ...perms("Bill Discounting",             ["View"]),
      /* Retention — DLP verification */
      ...perms("Retention Release",            ["View", "Approve", "Reject"]),
      ...perms("Retention Forfeiture",         ["View", "Approve", "Reject"]),
      /* Sanctions — proposal */
      ...perms("Sanction Management",          ["View", "Create", "Edit", "Submit"]),
      /* Admin — docs */
      ...perms("Document Management",          ["View", "Create"]),
      ...perms("Reports & Analytics",          ["View"]),
    ],
    createdAt: "2025-02-10",
  },

  /* ── 5. Agency Staff ─────────────────────────────────────────────────── *
   *  Day-to-day Initiator for most workflows.
   *  Can view, create, and submit — cannot approve or delete.
   *  This is the "frontline" user at any procuring agency. */
  {
    id: "role-agency-staff",
    name: "Agency Staff",
    description: "Day-to-day Initiator for expenditure processes. Can view, create, and submit requests across all modules but cannot approve or delete.",
    isSystem: false,
    permissionIds: [
      /* Contractor & Vendor — initiate */
      ...perms("Contractor Registration",     ["View", "Create", "Edit", "Submit"]),
      ...perms("Contractor Management",        ["View", "Create", "Edit", "Submit"]),
      ...perms("Vendor Management",            ["View", "Create", "Edit", "Submit"]),
      /* Contract Lifecycle — initiate amendments, extensions */
      ...perms("Contract Creation",            ["View", "Create", "Submit"]),
      ...perms("Contract Amendment",           ["View", "Create", "Edit", "Submit"]),
      ...perms("Contract Extension",           ["View", "Create", "Edit", "Submit"]),
      ...perms("Contract Closure",             ["View", "Create", "Submit"]),
      ...perms("Contract Lifecycle",           ["View"]),
      /* Invoice — view only (contractors submit via Public role) */
      ...perms("Invoice Submission",           ["View"]),
      ...perms("Invoice Approval",             ["View"]),
      ...perms("Bill Processing",              ["View"]),
      ...perms("Bill Discounting",             ["View"]),
      /* Payment — initiate utility, rental */
      ...perms("Payment Order",                ["View"]),
      ...perms("Utility Payment",              ["View", "Create", "Edit", "Submit"]),
      ...perms("Rental Payment",               ["View", "Create", "Edit", "Submit"]),
      ...perms("Debt Payment",                 ["View"]),
      ...perms("SOE Fund Transfer",            ["View"]),
      /* FI */
      ...perms("FI Registration",              ["View"]),
      /* Social & Stipend — initiate */
      ...perms("Social Benefits",              ["View", "Create", "Edit", "Submit"]),
      ...perms("Stipend Management",           ["View", "Create", "Edit", "Submit"]),
      ...perms("Subscriptions Contributions",  ["View", "Create", "Edit", "Submit"]),
      /* Retention — view */
      ...perms("Retention Release",            ["View"]),
      ...perms("Retention Forfeiture",         ["View"]),
      /* Advances — initiate */
      ...perms("Advances",                     ["View", "Create", "Edit", "Submit"]),
      ...perms("Sanction Management",          ["View"]),
      /* Payroll — view only (HR Officer handles payroll initiation) */
      ...perms("Employee Master",              ["View"]),
      ...perms("Payroll Generation",           ["View"]),
      ...perms("Salary Advance",               ["View"]),
      ...perms("Muster Roll",                  ["View"]),
      ...perms("Sitting Fee Honorarium",       ["View"]),
      /* Admin — view */
      ...perms("Document Management",          ["View", "Create"]),
      ...perms("Master Data",                  ["View"]),
      ...perms("Reports & Analytics",          ["View"]),
    ],
    createdAt: "2025-03-01",
  },

  /* ── 6. HR Officer ───────────────────────────────────────────────────── *
   *  Payroll Initiator — manages employee master (ZESt sync),
   *  initiates payroll generation, salary advances, muster rolls,
   *  and sitting fee processing. Works with ZESt HR system.
   *  HR initiates → Finance reviews → Head of Agency approves. */
  {
    id: "role-hr-officer",
    name: "HR Officer",
    description: "Payroll Initiator — manages employee master data (ZESt sync), initiates payroll generation, salary advances, muster roll, and sitting fee processing.",
    isSystem: false,
    permissionIds: [
      /* Employee Master — full management (ZESt sync point) */
      ...perms("Employee Master",              ["View", "Create", "Edit", "Submit", "Export"]),
      /* Allowance & Deduction — configure (requires DRC/MOF approval) */
      ...perms("Allowance Deduction Config",   ["View", "Create", "Edit", "Submit"]),
      /* Payroll Schedule — manage holidays, data-freeze, ZESt deadlines */
      ...perms("Payroll Schedule",             ["View", "Create", "Edit", "Submit"]),
      /* Payroll Generation — initiate the 6-step process */
      ...perms("Payroll Generation",           ["View", "Create", "Edit", "Submit"]),
      /* Salary Advance — initiate requests */
      ...perms("Salary Advance",               ["View", "Create", "Edit", "Submit"]),
      /* Muster Roll — create projects and beneficiaries */
      ...perms("Muster Roll",                  ["View", "Create", "Edit", "Submit"]),
      /* Sitting Fee & Honorarium — onboard beneficiaries, process */
      ...perms("Sitting Fee Honorarium",       ["View", "Create", "Edit", "Submit"]),
      /* Supporting modules — view */
      ...perms("Document Management",          ["View", "Create"]),
      ...perms("Master Data",                  ["View"]),
      ...perms("Reports & Analytics",          ["View", "Export"]),
      /* Expenditure — view only (no expenditure actions) */
      ...perms("Contract Lifecycle",           ["View"]),
      ...perms("Invoice Submission",           ["View"]),
      ...perms("Payment Order",                ["View"]),
    ],
    createdAt: "2026-04-12",
  },

  /* ── 7. Auditor ──────────────────────────────────────────────────────── *
   *  Read-only access to everything for audit and compliance.
   *  Can export reports but cannot create, edit, approve, or delete. */
  {
    id: "role-auditor",
    name: "Auditor",
    description: "Read-only access to all Expenditure modules for audit and compliance. Can view and export reports.",
    isSystem: false,
    permissionIds: [
      ...allPermissions.filter(p => ["View", "Export"].includes(p.action)).map(p => p.id),
    ],
    createdAt: "2025-03-15",
  },

  /* ── 7. Normal User ──────────────────────────────────────────────────── *
   *  Basic agency user who can view records and create drafts.
   *  Cannot approve, delete, or configure the system.
   *  Lighter than Agency Staff — no submit permission on most modules. */
  {
    id: "role-normal-user",
    name: "Normal User",
    description: "Day-to-day agency user. Can view records, create drafts, and submit basic requests. Cannot approve, delete, or configure the system.",
    isSystem: true,
    permissionIds: [
      /* Contractor & Vendor — view only */
      ...perms("Contractor Registration",     ["View"]),
      ...perms("Contractor Management",        ["View"]),
      ...perms("Vendor Management",            ["View"]),
      /* Contract Lifecycle — view + create drafts */
      ...perms("Contract Creation",            ["View", "Create", "Submit"]),
      ...perms("Contract Amendment",           ["View", "Create", "Submit"]),
      ...perms("Contract Extension",           ["View", "Create", "Submit"]),
      ...perms("Contract Closure",             ["View"]),
      ...perms("Contract Lifecycle",           ["View"]),
      /* Invoice */
      ...perms("Invoice Submission",           ["View", "Create", "Submit"]),
      ...perms("Invoice Approval",             ["View"]),
      ...perms("Bill Processing",              ["View"]),
      ...perms("Bill Discounting",             ["View"]),
      /* Payment — view */
      ...perms("Payment Order",                ["View"]),
      ...perms("Utility Payment",              ["View", "Create", "Edit", "Submit"]),
      ...perms("Rental Payment",               ["View", "Create", "Edit", "Submit"]),
      ...perms("Debt Payment",                 ["View"]),
      ...perms("SOE Fund Transfer",            ["View"]),
      /* FI */
      ...perms("FI Registration",              ["View"]),
      /* Social & Stipend — view */
      ...perms("Social Benefits",              ["View"]),
      ...perms("Stipend Management",           ["View"]),
      ...perms("Subscriptions Contributions",  ["View"]),
      /* Retention — view */
      ...perms("Retention Release",            ["View"]),
      ...perms("Retention Forfeiture",         ["View"]),
      /* Advances */
      ...perms("Advances",                     ["View", "Create", "Submit"]),
      ...perms("Sanction Management",          ["View"]),
      /* Admin — view */
      ...perms("Document Management",          ["View", "Create"]),
      ...perms("Master Data",                  ["View"]),
      ...perms("Reports & Analytics",          ["View"]),
    ],
    createdAt: "2026-04-08",
  },

  /* ── 8. Public User (Contractors / Vendors / FIs) ────────────────────── *
   *  External users: Contractors, Vendors, Financial Institutions.
   *  Self-service portal for registration, invoice submission,
   *  bill discounting, and FI registration. */
  {
    id: "role-public",
    name: "Contractor / Vendor",
    description: "External self-service portal for contractors, vendors, and financial institutions. Can self-register, submit invoices, request bill discounting, and register FIs.",
    isSystem: true,
    permissionIds: [
      /* Contractor self-registration */
      ...perms("Contractor Registration",     ["View", "Create", "Submit"]),
      ...perms("Contractor Management",        ["View", "Submit"]),
      /* Invoice submission */
      ...perms("Invoice Submission",           ["View", "Create", "Submit"]),
      /* Bill Discounting */
      ...perms("Bill Discounting",             ["View", "Create", "Submit"]),
      /* FI Registration */
      ...perms("FI Registration",              ["View", "Create", "Submit"]),
      /* Contract views (own contracts only — enforced at API level) */
      ...perms("Contract Lifecycle",           ["View"]),
      ...perms("Contract Amendment",           ["View", "Submit"]),
      /* Documents */
      ...perms("Document Management",          ["View", "Create"]),
    ],
    createdAt: "2025-01-15",
  },

  /* ── 9. Muster Roll User ────────────────────────────────────────────── *
   *  External users: Daily-wage workers, seasonal workers, project-based
   *  labourers who self-register as muster roll beneficiaries and track
   *  their payment status. Separate from contractors/vendors. */
  {
    id: "role-muster-roll",
    name: "Muster Roll Beneficiary",
    description: "Public muster roll user — can self-register as beneficiary, view payment status, update bank details, and track muster roll wage disbursements.",
    isSystem: true,
    permissionIds: [
      /* Muster Roll self-registration & status tracking */
      ...perms("Muster Roll",                 ["View", "Create", "Submit"]),
      /* Documents */
      ...perms("Document Management",          ["View", "Create"]),
    ],
    createdAt: "2026-04-13",
  },

  /* ── 10. Financial Institution User ────────────────────────────────── *
   *  External users from banks, insurance companies, microfinance
   *  institutions. Can register as FI, manage bill discounting,
   *  verify payment channels, view payment orders directed to them. */
  {
    id: "role-fi",
    name: "Financial Institution",
    description: "Financial institution portal — FI registration, bill discounting verification, payment channel management, CBS integration, and payment order tracking.",
    isSystem: true,
    permissionIds: [
      /* FI Registration & Profile */
      ...perms("FI Registration",              ["View", "Create", "Edit", "Submit"]),
      /* Bill Discounting — FI side */
      ...perms("Bill Discounting",             ["View", "Create", "Edit", "Submit"]),
      /* Payment Order tracking (view-only — FI sees payments routed to them) */
      ...perms("Payment Order",                ["View"]),
      /* CBS integration */
      ...perms("Financial Institution",         ["View", "Edit"]),
      /* Documents */
      ...perms("Document Management",          ["View", "Create"]),
    ],
    createdAt: "2026-04-13",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SEED USERS — Per-Agency Staff
   ─────────────────────────────
   Each agency (identified by UCoA Organisation Code) has its own set of
   functional staff mapped to the roles above. Only these specific people
   participate in expenditure workflows — not all agency employees.

   Role mapping per agency:
     Head of Agency    → Secretary / Thrompon / DG / Dzongdag (Approver)
     Finance Officer   → Finance Division staff (Reviewer for financials)
     Procurement       → Procurement Division staff (Reviewer for contracts)
     Agency Staff      → Department-level staff (Initiator)
     Normal User       → General staff with basic access
     Auditor           → Internal/external audit staff
     System Admin      → IT / Systems staff
   ═══════════════════════════════════════════════════════════════════════════ */
export const seedUsers: RbacUser[] = [

  /* ── DSD Super-User — spans all agencies ─────────────────────────────── */
  {
    id: "user-001", name: "DSD (You)", email: "group1dsd@gmail.com",
    employeeId: "EMP-001", department: "IT & Systems", agencyCode: "16",
    roleIds: ["role-admin", "role-head-of-agency", "role-finance-officer", "role-procurement", "role-agency-staff", "role-hr-officer"],
    status: "Active", lastLogin: "2026-04-12 09:15", createdAt: "2025-01-15",
  },

  /* ══════════════════════════════════════════════════════════════════════
     ROYAL UNIVERSITY OF BHUTAN (RUB) — Code 68 — Other Public Servants
     ──────────────────────────────────────────────────────────────────────
     Dedicated OPS Payroll user. Full HR + Payroll authority scoped to RUB:
     can add/import OPS employees, run HR actions, generate OPS payroll,
     and configure OPS allowances & pay-scale master.
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "rub-ops-01", name: "Sonam Choden", email: "sonam.choden@rub.edu.bt",
    employeeId: "RUB-OPS-001", department: "Office of the Vice Chancellor", agencyCode: "68",
    roleIds: ["role-hr-officer", "role-finance-officer"],
    status: "Active", lastLogin: "2026-04-13 10:20", createdAt: "2025-03-01",
  },

  /* ══════════════════════════════════════════════════════════════════════
     MINISTRY OF FINANCE (MoF) — Code 16 — Central IFMIS Agency
     ──────────────────────────────────────────────────────────────────────
     Roles: HoA, Finance Officer, Procurement, Agency Staff, Normal User,
            Auditor, System Admin
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "mof-hoa-01", name: "Dasho Tenzin Lekphell", email: "secretary@mof.gov.bt",
    employeeId: "MOF-001", department: "Office of the Minister", agencyCode: "16",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-02 08:30", createdAt: "2025-01-10",
  },
  {
    id: "mof-fin-01", name: "Tshering Dorji", email: "tshering.dorji@mof.gov.bt",
    employeeId: "MOF-102", department: "Dept of Treasury & Accounts", agencyCode: "16",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-03-31 14:22", createdAt: "2025-02-20",
  },
  {
    id: "mof-fin-02", name: "Dorji Tenzin", email: "dorji.tenzin@mof.gov.bt",
    employeeId: "MOF-108", department: "Dept of Treasury & Accounts", agencyCode: "16",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-03-27 08:55", createdAt: "2025-06-01",
  },
  {
    id: "mof-proc-01", name: "Karma Yangzom", email: "karma.yangzom@mof.gov.bt",
    employeeId: "MOF-205", department: "Dept of Procurement & Properties", agencyCode: "16",
    roleIds: ["role-procurement"],
    status: "Active", lastLogin: "2026-03-30 11:45", createdAt: "2025-03-05",
  },
  {
    id: "mof-staff-01", name: "Sangay Zam", email: "sangay.zam@mof.gov.bt",
    employeeId: "MOF-310", department: "Dept of Macro-Fiscal & Development Finance", agencyCode: "16",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-29 15:20", createdAt: "2025-05-15",
  },
  {
    id: "mof-staff-02", name: "Phuntsho Namgyal", email: "phuntsho.namgyal@mof.gov.bt",
    employeeId: "MOF-320", department: "Dept of Planning, Budget & Performance", agencyCode: "16",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-04-01 09:00", createdAt: "2025-08-01",
  },
  {
    id: "mof-pay-01", name: "Kinley Penjor", email: "kinley.penjor@mof.gov.bt",
    employeeId: "MOF-112", department: "Dept of Treasury & Accounts", agencyCode: "16",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-01 10:00", createdAt: "2025-04-01",
  },
  {
    id: "mof-usr-01", name: "Dechen Wangmo", email: "dechen.wangmo@mof.gov.bt",
    employeeId: "MOF-315", department: "Dept of Revenue & Customs", agencyCode: "16",
    roleIds: ["role-normal-user"],
    status: "Active", lastLogin: "2026-03-28 11:00", createdAt: "2025-07-01",
  },
  {
    id: "mof-admin-01", name: "Kinley Wangmo", email: "kinley.wangmo@mof.gov.bt",
    employeeId: "MOF-115", department: "Secretariat Services", agencyCode: "16",
    roleIds: ["role-admin"],
    status: "Inactive", lastLogin: "2026-01-10 09:00", createdAt: "2025-02-01",
  },
  {
    id: "mof-hr-01", name: "Pema Yangzom", email: "pema.yangzom@mof.gov.bt",
    employeeId: "MOF-250", department: "Human Resource Division", agencyCode: "16",
    roleIds: ["role-hr-officer"],
    status: "Active", lastLogin: "2026-04-10 09:30", createdAt: "2025-06-01",
  },
  {
    id: "mof-aud-01", name: "Jigme Thinley", email: "jigme.thinley@mof.gov.bt",
    employeeId: "MOF-401", department: "Internal Audit Division", agencyCode: "16",
    roleIds: ["role-auditor"],
    status: "Active", lastLogin: "2026-04-03 11:30", createdAt: "2025-03-15",
  },

  /* ══════════════════════════════════════════════════════════════════════
     MINISTRY OF HEALTH (MoH) — Code 20
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "moh-hoa-01", name: "Dasho Kinley Dorji", email: "secretary@moh.gov.bt",
    employeeId: "MOH-001", department: "Office of the Minister", agencyCode: "20",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-03 08:00", createdAt: "2025-01-08",
  },
  {
    id: "moh-fin-01", name: "Thinley Dorji", email: "thinley.dorji@moh.gov.bt",
    employeeId: "MOH-101", department: "Finance Division", agencyCode: "20",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-02 10:15", createdAt: "2025-02-15",
  },
  {
    id: "moh-fin-02", name: "Pema Lhamo", email: "pema.lhamo@moh.gov.bt",
    employeeId: "MOH-105", department: "Finance Division", agencyCode: "20",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-03-31 09:45", createdAt: "2025-05-01",
  },
  {
    id: "moh-proc-01", name: "Ugyen Lhamo", email: "ugyen.lhamo@moh.gov.bt",
    employeeId: "MOH-202", department: "Dept of Medical Services", agencyCode: "20",
    roleIds: ["role-procurement"],
    status: "Active", lastLogin: "2026-04-01 14:30", createdAt: "2025-03-10",
  },
  {
    id: "moh-staff-01", name: "Chimi Dorji", email: "chimi.dorji@moh.gov.bt",
    employeeId: "MOH-308", department: "Dept of Public Health", agencyCode: "20",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-30 16:00", createdAt: "2025-06-20",
  },
  {
    id: "moh-staff-02", name: "Phuntsho Wangdi", email: "phuntsho.wangdi@moh.gov.bt",
    employeeId: "MOH-318", department: "Dept of Traditional Medicine", agencyCode: "20",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-04-04 11:30", createdAt: "2025-07-01",
  },
  {
    id: "moh-staff-03", name: "Karma Zangmo", email: "karma.zangmo@moh.gov.bt",
    employeeId: "MOH-305", department: "Dept of Medical Services", agencyCode: "20",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-04-07 09:00", createdAt: "2025-05-01",
  },
  {
    id: "moh-pay-01", name: "Wangchuk Tshering", email: "wangchuk.tshering@moh.gov.bt",
    employeeId: "MOH-110", department: "Finance Division", agencyCode: "20",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-08 10:30", createdAt: "2025-04-01",
  },
  {
    id: "moh-usr-01", name: "Sonam Dema", email: "sonam.dema@moh.gov.bt",
    employeeId: "MOH-312", department: "HR Division", agencyCode: "20",
    roleIds: ["role-normal-user"],
    status: "Active", lastLogin: "2026-03-29 13:30", createdAt: "2025-07-15",
  },
  {
    id: "moh-admin-01", name: "Tashi Wangmo", email: "tashi.wangmo@moh.gov.bt",
    employeeId: "MOH-115", department: "ICT Division", agencyCode: "20",
    roleIds: ["role-admin"],
    status: "Active", lastLogin: "2026-04-06 08:45", createdAt: "2025-02-01",
  },
  {
    id: "moh-hr-01", name: "Tshering Lhamo", email: "tshering.lhamo@moh.gov.bt",
    employeeId: "MOH-250", department: "Human Resource Division", agencyCode: "20",
    roleIds: ["role-hr-officer"],
    status: "Active", lastLogin: "2026-04-09 10:00", createdAt: "2025-06-15",
  },
  {
    id: "moh-aud-01", name: "Dorji Wangchuk", email: "dorji.wangchuk@moh.gov.bt",
    employeeId: "MOH-410", department: "Finance Division", agencyCode: "20",
    roleIds: ["role-auditor"],
    status: "Active", lastLogin: "2026-04-05 14:00", createdAt: "2025-06-01",
  },

  /* ══════════════════════════════════════════════════════════════════════
     MINISTRY OF EDUCATION & SKILLS DEVELOPMENT (MoESD) — Code 22
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "moesd-hoa-01", name: "Dasho Chencho Dorji", email: "secretary@moesd.gov.bt",
    employeeId: "MOESD-001", department: "Office of the Minister", agencyCode: "22",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-03 07:30", createdAt: "2025-01-05",
  },
  {
    id: "moesd-fin-01", name: "Dawa Penjor", email: "dawa.penjor@moesd.gov.bt",
    employeeId: "MOESD-101", department: "Finance Division", agencyCode: "22",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-02 11:00", createdAt: "2025-03-01",
  },
  {
    id: "moesd-fin-02", name: "Lhaki Yangzom", email: "lhaki.yangzom@moesd.gov.bt",
    employeeId: "MOESD-106", department: "Finance Division", agencyCode: "22",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-03-30 10:20", createdAt: "2025-05-10",
  },
  {
    id: "moesd-proc-01", name: "Nima Tshering", email: "nima.tshering@moesd.gov.bt",
    employeeId: "MOESD-203", department: "Dept of School Education", agencyCode: "22",
    roleIds: ["role-procurement"],
    status: "Active", lastLogin: "2026-04-01 15:45", createdAt: "2025-04-01",
  },
  {
    id: "moesd-staff-01", name: "Tashi Phuntsho", email: "tashi.phuntsho@moesd.gov.bt",
    employeeId: "MOESD-310", department: "Dept of Adult & Higher Education", agencyCode: "22",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-28 14:00", createdAt: "2025-06-15",
  },
  {
    id: "moesd-hr-01", name: "Sangay Choden", email: "sangay.choden@moesd.gov.bt",
    employeeId: "MOESD-250", department: "Human Resource Division", agencyCode: "22",
    roleIds: ["role-hr-officer"],
    status: "Active", lastLogin: "2026-04-08 11:00", createdAt: "2025-07-01",
  },

  /* ══════════════════════════════════════════════════════════════════════
     MINISTRY OF INFRASTRUCTURE & TRANSPORT (MoIT) — Code 19
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "moit-hoa-01", name: "Dasho Pema Tenzin", email: "secretary@moit.gov.bt",
    employeeId: "MOIT-001", department: "Office of the Minister", agencyCode: "19",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-02 07:45", createdAt: "2025-01-12",
  },
  {
    id: "moit-fin-01", name: "Namgay Tshering", email: "namgay.tshering@moit.gov.bt",
    employeeId: "MOIT-102", department: "Finance Division", agencyCode: "19",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-01 09:30", createdAt: "2025-03-15",
  },
  {
    id: "moit-fin-02", name: "Yeshey Dorji", email: "yeshey.dorji@moit.gov.bt",
    employeeId: "MOIT-107", department: "Finance Division", agencyCode: "19",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-03-29 11:15", createdAt: "2025-05-20",
  },
  {
    id: "moit-proc-01", name: "Jigme Wangdi", email: "jigme.wangdi@moit.gov.bt",
    employeeId: "MOIT-204", department: "Dept of Infrastructure Development", agencyCode: "19",
    roleIds: ["role-procurement"],
    status: "Active", lastLogin: "2026-03-31 16:20", createdAt: "2025-04-10",
  },
  {
    id: "moit-staff-01", name: "Tandin Dorji", email: "tandin.dorji@moit.gov.bt",
    employeeId: "MOIT-312", department: "Bhutan Construction & Transport Authority", agencyCode: "19",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-28 10:45", createdAt: "2025-08-01",
  },
  {
    id: "moit-staff-02", name: "Choden Tshering", email: "choden.tshering@moit.gov.bt",
    employeeId: "MOIT-305", department: "Dept of Surface Transport", agencyCode: "19",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-04-01 13:00", createdAt: "2025-07-01",
  },
  {
    id: "moit-hr-01", name: "Dawa Zangmo", email: "dawa.zangmo@moit.gov.bt",
    employeeId: "MOIT-250", department: "Human Resource Division", agencyCode: "19",
    roleIds: ["role-hr-officer"],
    status: "Active", lastLogin: "2026-04-07 14:00", createdAt: "2025-08-15",
  },

  /* ══════════════════════════════════════════════════════════════════════
     MINISTRY OF AGRICULTURE & LIVESTOCK (MoAL) — Code 17
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "moal-hoa-01", name: "Dasho Sangay Dorji", email: "secretary@moal.gov.bt",
    employeeId: "MOAL-001", department: "Office of the Minister", agencyCode: "17",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-03 08:15", createdAt: "2025-01-15",
  },
  {
    id: "moal-fin-01", name: "Rinzin Wangchuk", email: "rinzin.wangchuk@moal.gov.bt",
    employeeId: "MOAL-103", department: "Finance Division", agencyCode: "17",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-02 09:00", createdAt: "2025-03-20",
  },
  {
    id: "moal-proc-01", name: "Kunzang Choden", email: "kunzang.choden@moal.gov.bt",
    employeeId: "MOAL-206", department: "Dept of Agricultural Marketing & Cooperatives", agencyCode: "17",
    roleIds: ["role-procurement"],
    status: "Active", lastLogin: "2026-03-30 14:10", createdAt: "2025-04-15",
  },
  {
    id: "moal-staff-01", name: "Pema Wangchuk", email: "pema.wangchuk@moal.gov.bt",
    employeeId: "MOAL-310", department: "Dept of Livestock", agencyCode: "17",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-28 16:30", createdAt: "2025-04-12",
  },

  /* ══════════════════════════════════════════════════════════════════════
     ROYAL AUDIT AUTHORITY (RAA) — Code 12
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "raa-hoa-01", name: "Dasho Tshering Kezang", email: "ag@raa.gov.bt",
    employeeId: "RAA-001", department: "Office of the Auditor General", agencyCode: "12",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-02 07:30", createdAt: "2025-01-05",
  },
  {
    id: "raa-fin-01", name: "Deki Choden", email: "deki.choden@raa.gov.bt",
    employeeId: "RAA-110", department: "Policy & Planning Division", agencyCode: "12",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-03-31 11:00", createdAt: "2025-04-01",
  },
  {
    id: "raa-aud-01", name: "Sonam Choden", email: "sonam.choden@raa.gov.bt",
    employeeId: "RAA-401", department: "Performance & Financial Audit", agencyCode: "12",
    roleIds: ["role-auditor"],
    status: "Active", lastLogin: "2026-03-29 10:00", createdAt: "2025-05-20",
  },
  {
    id: "raa-aud-02", name: "Tshewang Rinzin", email: "tshewang.rinzin@raa.gov.bt",
    employeeId: "RAA-405", department: "Compliance & Quality Assurance", agencyCode: "12",
    roleIds: ["role-auditor"],
    status: "Active", lastLogin: "2026-04-01 08:30", createdAt: "2025-06-01",
  },

  /* ══════════════════════════════════════════════════════════════════════
     GELEPHU THROMDE (GT) — Code 46
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "gt-hoa-01", name: "Thrompon Karma Wangdi", email: "thrompon@gelephu.gov.bt",
    employeeId: "GT-001", department: "Thrompon's Office", agencyCode: "46",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-02 07:30", createdAt: "2025-01-15",
  },
  {
    id: "gt-fin-01", name: "Sangay Tenzin", email: "sangay.tenzin@gelephu.gov.bt",
    employeeId: "GT-101", department: "Administration & Finance", agencyCode: "46",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-01 09:00", createdAt: "2025-04-01",
  },
  {
    id: "gt-fin-02", name: "Norbu Zangmo", email: "norbu.zangmo@gelephu.gov.bt",
    employeeId: "GT-102", department: "Administration & Finance", agencyCode: "46",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-01 10:00", createdAt: "2025-03-01",
  },
  {
    id: "gt-proc-01", name: "Wangchuk Dorji", email: "wangchuk.dorji@gelephu.gov.bt",
    employeeId: "GT-205", department: "Engineering Division", agencyCode: "46",
    roleIds: ["role-procurement"],
    status: "Active", lastLogin: "2026-03-30 15:30", createdAt: "2025-04-01",
  },
  {
    id: "gt-staff-01", name: "Tshewang Norbu", email: "tshewang.norbu@gelephu.gov.bt",
    employeeId: "GT-205", department: "Gelephu Mindfulness City Unit", agencyCode: "46",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-30 13:00", createdAt: "2025-05-01",
  },
  {
    id: "gt-staff-02", name: "Dophu Namgyal", email: "dophu.namgyal@gelephu.gov.bt",
    employeeId: "GT-308", department: "Urban Planning Division", agencyCode: "46",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-29 14:15", createdAt: "2025-06-01",
  },
  {
    id: "gt-staff-03", name: "Leki Wangmo", email: "leki.wangmo@gelephu.gov.bt",
    employeeId: "GT-310", department: "Revenue Division", agencyCode: "46",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-28 11:30", createdAt: "2025-07-01",
  },

  /* ══════════════════════════════════════════════════════════════════════
     PARO DZONGKHAG — Code 31
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "paro-hoa-01", name: "Dasho Ugyen Tshering", email: "dzongdag@paro.gov.bt",
    employeeId: "PARO-001", department: "Dzongdag's Office", agencyCode: "31",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-02 08:15", createdAt: "2025-01-08",
  },
  {
    id: "paro-fin-01", name: "Tshering Yangzom", email: "tshering.yangzom@paro.gov.bt",
    employeeId: "PARO-102", department: "Administration & Finance", agencyCode: "31",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-01 10:30", createdAt: "2025-03-15",
  },
  {
    id: "paro-staff-01", name: "Phub Dorji", email: "phub.dorji@paro.gov.bt",
    employeeId: "PARO-305", department: "Engineering Sector", agencyCode: "31",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-03-29 15:00", createdAt: "2025-05-01",
  },

  /* ══════════════════════════════════════════════════════════════════════
     GOVTECH — Code 70 (Autonomous Body)
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "gt70-hoa-01", name: "Dasho Tobgay Wangchuk", email: "dg@govtech.gov.bt",
    employeeId: "GT70-001", department: "Office of the Director General", agencyCode: "70",
    roleIds: ["role-head-of-agency"],
    status: "Active", lastLogin: "2026-04-09 08:00", createdAt: "2025-01-10",
  },
  {
    id: "gt70-fin-01", name: "Ugyen Pema", email: "ugyen.pema@govtech.gov.bt",
    employeeId: "GT70-105", department: "Secretariat Services / Office of Secretary", agencyCode: "70",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-08 10:00", createdAt: "2025-03-01",
  },
  {
    id: "gt70-fin-02", name: "Tandin Zangmo", email: "tandin.zangmo@govtech.gov.bt",
    employeeId: "GT70-112", department: "Secretariat Services / Office of Secretary", agencyCode: "70",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-08 09:15", createdAt: "2025-04-01",
  },
  {
    id: "gt70-fin-03", name: "Phurba Tshering", email: "phurba.tshering@govtech.gov.bt",
    employeeId: "GT70-115", department: "Secretariat Services / Office of Secretary", agencyCode: "70",
    roleIds: ["role-finance-officer"],
    status: "Active", lastLogin: "2026-04-09 10:30", createdAt: "2025-04-01",
  },
  {
    id: "gt70-proc-01", name: "Dechen Tshomo", email: "dechen.tshomo@govtech.gov.bt",
    employeeId: "GT70-210", department: "Secretariat Services / Office of Secretary", agencyCode: "70",
    roleIds: ["role-procurement"],
    status: "Active", lastLogin: "2026-04-07 14:30", createdAt: "2025-03-15",
  },
  {
    id: "gt70-staff-01", name: "Sonam Tobgay", email: "sonam.tobgay@govtech.gov.bt",
    employeeId: "GT70-305", department: "Dept of Digital Transformation", agencyCode: "70",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-04-07 11:45", createdAt: "2025-05-01",
  },
  {
    id: "gt70-staff-02", name: "Rinchen Dorji", email: "rinchen.dorji@govtech.gov.bt",
    employeeId: "GT70-310", department: "Dept of Digital Infrastructure", agencyCode: "70",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-04-06 16:00", createdAt: "2025-05-15",
  },
  {
    id: "gt70-staff-03", name: "Deki Yangzom", email: "deki.yangzom@govtech.gov.bt",
    employeeId: "GT70-320", department: "Data Science & AI Division", agencyCode: "70",
    roleIds: ["role-agency-staff"],
    status: "Active", lastLogin: "2026-04-04 15:00", createdAt: "2025-07-01",
  },
  {
    id: "gt70-usr-01", name: "Pema Choden", email: "pema.choden@govtech.gov.bt",
    employeeId: "GT70-315", department: "Cyber Security Division", agencyCode: "70",
    roleIds: ["role-normal-user"],
    status: "Active", lastLogin: "2026-04-05 13:30", createdAt: "2025-06-01",
  },
  {
    id: "gt70-admin-01", name: "Karma Tshering", email: "karma.tshering@govtech.gov.bt",
    employeeId: "GT70-101", department: "Dept of Digital Infrastructure", agencyCode: "70",
    roleIds: ["role-admin"],
    status: "Active", lastLogin: "2026-04-09 08:00", createdAt: "2025-02-01",
  },
  {
    id: "gt70-hr-01", name: "Namgay Wangmo", email: "namgay.wangmo@govtech.gov.bt",
    employeeId: "GT70-250", department: "Secretariat Services / Office of Secretary", agencyCode: "70",
    roleIds: ["role-hr-officer"],
    status: "Active", lastLogin: "2026-04-10 09:00", createdAt: "2025-09-01",
  },
  {
    id: "gt70-aud-01", name: "Kinley Dem", email: "kinley.dem@govtech.gov.bt",
    employeeId: "GT70-401", department: "Secretariat Services / Office of Secretary", agencyCode: "70",
    roleIds: ["role-auditor"],
    status: "Active", lastLogin: "2026-04-03 09:00", createdAt: "2025-08-01",
  },

  /* ══════════════════════════════════════════════════════════════════════
     EXTERNAL / PUBLIC USERS — Contractors, Vendors, FIs
     ──────────────────────────────────────────────────────────────────────
     Self-service portal users who register, submit invoices, request
     bill discounting, and manage their contractor/FI profiles.
     ══════════════════════════════════════════════════════════════════════ */

  /* ── Individual Contractors ─────────────────────────────────────────── */
  {
    id: "ext-pub-01", name: "Tandin Bidha", email: "tandin.bidha@contractor.bt",
    employeeId: "—", department: "Individual Contractor", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Active", lastLogin: "2026-03-25 13:10", createdAt: "2025-07-15",
  },
  {
    id: "ext-pub-03", name: "Sonam Penjor", email: "sonam.penjor@mail.bt",
    employeeId: "—", department: "Individual Contractor", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Active", lastLogin: "2026-04-02 11:30", createdAt: "2025-09-10",
  },
  {
    id: "ext-pub-04", name: "Kinley Choden", email: "kinley.choden@supplier.bt",
    employeeId: "—", department: "Individual Supplier", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Active", lastLogin: "2026-04-05 09:15", createdAt: "2025-11-20",
  },

  /* ── Business / Company Contractors ─────────────────────────────────── */
  {
    id: "ext-pub-02", name: "Dorji Construction Pvt Ltd", email: "info@dorjiconstruction.bt",
    employeeId: "—", department: "Construction Company", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Active", lastLogin: "2026-03-20 09:00", createdAt: "2025-08-01",
  },
  {
    id: "ext-pub-05", name: "Bhutan Builders & Engineers", email: "accounts@bhutanbuilders.bt",
    employeeId: "—", department: "Construction Company", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Active", lastLogin: "2026-04-08 14:20", createdAt: "2025-06-15",
  },
  {
    id: "ext-pub-06", name: "Druk IT Solutions", email: "procurement@drukitsolutions.bt",
    employeeId: "—", department: "IT Services Provider", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Active", lastLogin: "2026-04-03 16:45", createdAt: "2025-10-01",
  },
  {
    id: "ext-pub-07", name: "Tashi Medical Supplies", email: "sales@tashimedical.bt",
    employeeId: "—", department: "Medical Supplier", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Active", lastLogin: "2026-03-28 10:30", createdAt: "2025-12-05",
  },
  {
    id: "ext-pub-08", name: "Phuentsholing Trading Co.", email: "info@phuentsholingtrading.bt",
    employeeId: "—", department: "Trading Company", agencyCode: "EXT",
    roleIds: ["role-public"],
    status: "Inactive", lastLogin: "2025-12-15 08:00", createdAt: "2025-04-20",
  },

  /* ══════════════════════════════════════════════════════════════════════
     FINANCIAL INSTITUTIONS (role-fi)
     ──────────────────────────────────────────────────────────────────────
     Banks, insurance companies, microfinance institutions that interact
     with IFMIS for payment routing, bill discounting, CBS integration.
     Uses agencyCode "FI" to distinguish from contractors (EXT).
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "fi-bob-01", name: "Bank of Bhutan Ltd", email: "corporate@bob.bt",
    employeeId: "—", department: "Treasury & Payments", agencyCode: "FI",
    roleIds: ["role-fi"],
    status: "Active", lastLogin: "2026-04-09 08:30", createdAt: "2025-03-01",
  },
  {
    id: "fi-bnbl-01", name: "Bhutan National Bank Ltd", email: "ops@bnbl.bt",
    employeeId: "—", department: "Treasury Operations", agencyCode: "FI",
    roleIds: ["role-fi"],
    status: "Active", lastLogin: "2026-04-07 11:00", createdAt: "2025-03-15",
  },
  {
    id: "fi-tbank-01", name: "T-Bank Ltd", email: "treasury@tbank.bt",
    employeeId: "—", department: "Digital Banking", agencyCode: "FI",
    roleIds: ["role-fi"],
    status: "Active", lastLogin: "2026-04-01 14:15", createdAt: "2025-05-10",
  },
  {
    id: "fi-bdbl-01", name: "Bhutan Development Bank Ltd", email: "finance@bdbl.bt",
    employeeId: "—", department: "Microfinance & Lending", agencyCode: "FI",
    roleIds: ["role-fi"],
    status: "Active", lastLogin: "2026-03-30 09:45", createdAt: "2025-04-01",
  },
  {
    id: "fi-dpnb-01", name: "Druk PNB Bank Ltd", email: "operations@dpnb.bt",
    employeeId: "—", department: "Corporate Banking", agencyCode: "FI",
    roleIds: ["role-fi"],
    status: "Active", lastLogin: "2026-04-11 10:00", createdAt: "2025-06-01",
  },
  {
    id: "fi-ricbl-01", name: "Royal Insurance Corp of Bhutan", email: "claims@ricbl.bt",
    employeeId: "—", department: "Insurance & Claims", agencyCode: "FI",
    roleIds: ["role-fi"],
    status: "Active", lastLogin: "2026-03-28 15:30", createdAt: "2025-04-15",
  },

  /* ══════════════════════════════════════════════════════════════════════
     MUSTER ROLL BENEFICIARIES (role-muster-roll)
     ──────────────────────────────────────────────────────────────────────
     Daily-wage, seasonal, and project-based workers who self-register
     as muster roll beneficiaries. Uses agencyCode "MR" (not "EXT")
     to distinguish from contractors/vendors.
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "mr-pub-01", name: "Dorji Wangchuk", email: "dorji.wangchuk@mail.bt",
    employeeId: "—", department: "Daily Wage Worker", agencyCode: "MR",
    roleIds: ["role-muster-roll"],
    status: "Active", lastLogin: "2026-04-10 08:30", createdAt: "2026-03-01",
  },
  {
    id: "mr-pub-02", name: "Pema Lhamo", email: "pema.lhamo@mail.bt",
    employeeId: "—", department: "Seasonal Worker", agencyCode: "MR",
    roleIds: ["role-muster-roll"],
    status: "Active", lastLogin: "2026-04-08 10:15", createdAt: "2026-02-15",
  },
  {
    id: "mr-pub-03", name: "Karma Tshering", email: "karma.tshering@mail.bt",
    employeeId: "—", department: "Project-Based Worker", agencyCode: "MR",
    roleIds: ["role-muster-roll"],
    status: "Active", lastLogin: "2026-04-05 14:00", createdAt: "2026-01-20",
  },
  {
    id: "mr-pub-04", name: "Sangay Dema", email: "sangay.dema@mail.bt",
    employeeId: "—", department: "Daily Wage Worker", agencyCode: "MR",
    roleIds: ["role-muster-roll"],
    status: "Active", lastLogin: "2026-04-12 09:00", createdAt: "2026-03-10",
  },
  {
    id: "mr-pub-05", name: "Tshewang Norbu", email: "tshewang.norbu@mail.bt",
    employeeId: "—", department: "Seasonal Worker", agencyCode: "MR",
    roleIds: ["role-muster-roll"],
    status: "Inactive", lastLogin: "2026-02-20 11:30", createdAt: "2025-12-01",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Storage helpers
   ═══════════════════════════════════════════════════════════════════════════ */

/** If the seed version stored in localStorage doesn't match, drop cached
    roles/users so the new seed takes effect without manual cache clearing. */
function ensureSeedFresh() {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(RBAC_SEED_VERSION_KEY);
  if (stored === RBAC_SEED_VERSION) return;
  window.localStorage.removeItem(RBAC_ROLES_STORAGE_KEY);
  window.localStorage.removeItem(RBAC_USERS_STORAGE_KEY);
  window.localStorage.setItem(RBAC_SEED_VERSION_KEY, RBAC_SEED_VERSION);
}

function readFromStorage<T>(storageKey: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  ensureSeedFresh();

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function getStoredRoles(): Role[] {
  return readFromStorage<Role>(RBAC_ROLES_STORAGE_KEY, seedRoles);
}

export function getStoredUsers(): RbacUser[] {
  return readFromStorage<RbacUser>(RBAC_USERS_STORAGE_KEY, seedUsers);
}

export function writeStoredRoles(roles: Role[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RBAC_ROLES_STORAGE_KEY, JSON.stringify(roles));
}

export function writeStoredUsers(users: RbacUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RBAC_USERS_STORAGE_KEY, JSON.stringify(users));
}

export function resolvePermissionIds(roleIds: string[], roles: Role[] = seedRoles): string[] {
  const permissionIds = new Set<string>();
  for (const roleId of roleIds) {
    const role = roles.find((item) => item.id === roleId);
    role?.permissionIds.forEach((permissionId) => permissionIds.add(permissionId));
  }
  return Array.from(permissionIds);
}
