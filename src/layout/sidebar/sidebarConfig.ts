/* ═══════════════════════════════════════════════════════════════════════════
   Sidebar Navigation Configuration
   ─────────────────────────────────
   Single source of truth for every sidebar section, group, and link.
   The Sidebar component renders them automatically and filters by the
   currently active role.

   The role gates below are derived directly from the SRS Expenditure
   Module — Process Descriptions sheet (922 rows). Every actor named in
   that sheet has been mapped to one of our RBAC roles, then the
   sidebar links are gated to those roles. See the actor → role map
   under "Role-gate shortcuts" below.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SidebarLink {
  label: string;
  to: string;
  /** Small right-aligned badge text (e.g. "PRN 1.3", "LoV 9.2") */
  badge?: string;
  /** Optional nested sub-sub navigation (rendered as indented children) */
  children?: SidebarLink[];
  /** Which role-IDs are allowed to see this link. Empty / undefined = visible to all signed-in roles. */
  roleIds?: string[];
  /** Which agency codes are allowed to see this link (e.g. ["16"] for MoF only). Empty / undefined = visible to all agencies. */
  agencyCodes?: string[];
}

export interface SidebarGroup {
  /** Collapsible group heading */
  label: string;
  /** Unique key used for aria + state management */
  key: string;
  /** Whether group is expanded by default */
  defaultOpen?: boolean;
  /** Child links rendered inside the collapsible panel */
  links: SidebarLink[];
  /** Role gate for the entire group */
  roleIds?: string[];
}

export interface SidebarSection {
  /** Section heading label (e.g. "CONTRACTOR", "EXPENDITURE") */
  heading: string;
  /** Collapsible groups within the section */
  groups: SidebarGroup[];
  /** Standalone links that sit outside any group (e.g. Master Data) */
  standaloneLinks?: SidebarLink[];
  /** Role gate for the entire section */
  roleIds?: string[];
}

/* ─── Role-gate shortcuts (SRS-actor → RBAC-role mapping) ──────────────
   SRS actor                     → RBAC role
   ─────────────────────────────────────────────
   "users" / "User"              → role-normal-user, role-agency-staff
   "Agency staff"                → role-agency-staff
   "Contractor / Supplier"       → role-public
   "Approver" (1st step review)  → role-finance-officer
   "Approver" (final, P-Level)   → role-head-of-agency
   "Roles based-P Level …"       → role-head-of-agency
   "Cash Management / Payment"   → role-head-of-agency
   "trigger by CMS / eGP"        → role-agency-staff
   "Auditor / RAA"               → role-auditor
   "Procurement"                 → role-procurement
   "Finance Officer"             → role-finance-officer
   "System Administrator"        → role-admin
─────────────────────────────────────────────────────────────────────── */

const ROLE_ADMIN = "role-admin";
const ROLE_NORMAL = "role-normal-user";
const ROLE_FINANCE = "role-finance-officer";
const ROLE_PROCUREMENT = "role-procurement";
const ROLE_AGENCY_STAFF = "role-agency-staff";
const ROLE_AUDITOR = "role-auditor";
const ROLE_HEAD_OF_AGENCY = "role-head-of-agency";
const ROLE_PUBLIC = "role-public";
const ROLE_MUSTER_ROLL = "role-muster-roll";
const ROLE_FI = "role-fi";
const ROLE_HR = "role-hr-officer";

/** Backward-compat alias — role-payment-release merged into role-finance-officer */
const ROLE_PAYMENT_RELEASE = ROLE_FINANCE;

/** Roles that operate / view contracts day-to-day. */
const CONTRACT_OPERATORS = [
  ROLE_ADMIN, ROLE_HEAD_OF_AGENCY, ROLE_FINANCE, ROLE_NORMAL, ROLE_AGENCY_STAFF, ROLE_PROCUREMENT,
];

/** Roles that originate (create) advances / invoices / bills. */
const ORIGINATORS = [
  ROLE_ADMIN, ROLE_NORMAL, ROLE_AGENCY_STAFF, ROLE_FINANCE,
];

/** Roles that approve advances / invoices / bills (the approval desk). */
const APPROVERS = [
  ROLE_ADMIN, ROLE_HEAD_OF_AGENCY, ROLE_FINANCE,
];

/** Roles allowed to release payment orders to the payee. */
const PAYMENT_RELEASE = [
  ROLE_ADMIN, ROLE_HEAD_OF_AGENCY,
];

/** Roles that maintain contractor / vendor master records. */
const CONTRACTOR_MASTER = [
  ROLE_ADMIN, ROLE_PROCUREMENT, ROLE_FINANCE, ROLE_NORMAL, ROLE_AGENCY_STAFF,
];

/** Roles that can read everything but write nothing. */
const READ_ONLY_AUDIT = [ROLE_AUDITOR];

/** Payroll roles — HR initiates, Finance reviews, HoA approves. */
const PAYROLL_ACTORS = [
  ROLE_ADMIN, ROLE_HR, ROLE_FINANCE, ROLE_HEAD_OF_AGENCY, ROLE_AUDITOR,
];

/** Anyone internal can see operational/expenditure data (read-only at minimum). */
const ANY_INTERNAL = [
  ROLE_ADMIN, ROLE_NORMAL, ROLE_FINANCE, ROLE_PROCUREMENT, ROLE_AGENCY_STAFF,
  ROLE_AUDITOR, ROLE_HEAD_OF_AGENCY, ROLE_HR,
];

/** System Administrator is the only role that can manage RBAC / config. */
const ADMIN_ONLY = [ROLE_ADMIN];

/** Closure step explicitly says "Roles based-P Level or above" — Head of Agency. */
const CLOSURE_AUTHORISERS = [ROLE_ADMIN, ROLE_HEAD_OF_AGENCY, ROLE_FINANCE];

/* ─── Configuration ─────────────────────────────────────────────────────── */

export const sidebarSections: SidebarSection[] = [
  /* ─────────────────────────────────────────────────────────────────────
     CONTRACTOR MASTER — SRS PRN 1.x
     Actors: User, Contractor (self-service), Approver, System
     ─────────────────────────────────────────────────────────────────── */
  {
    heading: "",
    roleIds: [...CONTRACTOR_MASTER, ...READ_ONLY_AUDIT],
    standaloneLinks: [
      /* Contractor — single entry; sub-navigation rendered as top-bar tabs inside the content area */
      { label: "Contractor", to: "/modules/contractor", roleIds: [...CONTRACTOR_MASTER, ROLE_AUDITOR] },
    ],
    groups: [],
  },

  /* ─────────────────────────────────────────────────────────────────────
     EXPENDITURE — SRS PRN 2.x – 5.x
     Actors mapped per row in Process Descriptions
     ─────────────────────────────────────────────────────────────────── */
  {
    heading: "Expenditure",
    roleIds: ANY_INTERNAL,
    standaloneLinks: [
      /* Contract Management — single entry; sub-navigation is rendered as top-bar tabs inside the content area */
      { label: "Contract Management", to: "/modules/contract-management", roleIds: [...CONTRACT_OPERATORS, ROLE_AUDITOR, ...APPROVERS, ...ORIGINATORS, ROLE_PAYMENT_RELEASE, ROLE_PROCUREMENT] },
      /* IFMIS Recurring Vendor Payment — single entry; sub-navigation rendered as top-bar tabs inside the content area */
      { label: "Recurring Vendor Payments", to: "/modules/recurring-vendor-payments", roleIds: [...ORIGINATORS, ...APPROVERS, ROLE_PAYMENT_RELEASE, ROLE_AUDITOR, ROLE_FINANCE, ...CONTRACTOR_MASTER, ...PAYROLL_ACTORS, ROLE_PROCUREMENT] },
    ],
    groups: [],
  },

  /* ─────────────────────────────────────────────────────────────────────
     PAYROLL MANAGEMENT — Payroll SRS V1 (Civil Service)
     Actors: System + User, Finance Staff, Manager, HR/Admin
     ─────────────────────────────────────────────────────────────────── */
  {
    heading: "Payroll",
    roleIds: PAYROLL_ACTORS,
    groups: [],
    standaloneLinks: [
      {
        label: "Payroll Management",
        to: "/payroll/management",
        badge: "SRS v1.1",
        roleIds: PAYROLL_ACTORS,
        children: [
          { label: "Allowance Configuration", to: "/payroll/allowance-config", badge: "PRN 1.2", roleIds: PAYROLL_ACTORS },
          { label: "Pay Scale Master", to: "/payroll/pay-scale", badge: "DDi 3.x", roleIds: PAYROLL_ACTORS },
          { label: "Payslip Generation", to: "/payroll/payslip", badge: "PRN 8.x", roleIds: PAYROLL_ACTORS },
          /* MoF-only — central configuration; agencies do not see these */
          { label: "Payroll Calendar Configuration", to: "/payroll/schedule", badge: "PRN 2.0", roleIds: PAYROLL_ACTORS, agencyCodes: ["16"] },
          { label: "Paybill Standard", to: "/payroll/paybill", badge: "Formulae", roleIds: PAYROLL_ACTORS, agencyCodes: ["16"] },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────
     CONTRACTOR PORTAL — External contractors & vendors
     SRS Actors: "Contractor / Supplier"
     ─────────────────────────────────────────────────────────────────── */
  {
    heading: "Contractor Portal",
    roleIds: [ROLE_PUBLIC],
    groups: [
      {
        label: "My Registration",
        key: "public-registration",
        defaultOpen: true,
        roleIds: [ROLE_PUBLIC],
        links: [
          { label: "Contractor Registration", to: "/contractor/register", badge: "PRN 1.1", roleIds: [ROLE_PUBLIC] },
          { label: "Contractor Amendment", to: "/contractor/amendment", badge: "PRN 1.2", roleIds: [ROLE_PUBLIC] },
          { label: "My Profile", to: "/public/contractor-profile", badge: "New", roleIds: [ROLE_PUBLIC] },
        ],
      },
      {
        label: "Invoices & Payments",
        key: "public-invoices",
        defaultOpen: true,
        roleIds: [ROLE_PUBLIC],
        links: [
          { label: "Invoice Submission", to: "/public/invoice-submission", badge: "PRN 3", roleIds: [ROLE_PUBLIC] },
          { label: "My Contracts", to: "/public/my-contracts", badge: "PRN 2", roleIds: [ROLE_PUBLIC] },
          { label: "Payment Status", to: "/public/payment-status", badge: "PRN 3.16", roleIds: [ROLE_PUBLIC] },
        ],
      },
      {
        label: "Documents & Support",
        key: "public-docs",
        defaultOpen: false,
        roleIds: [ROLE_PUBLIC],
        links: [
          { label: "Document Upload", to: "/public/documents", badge: "New", roleIds: [ROLE_PUBLIC] },
          { label: "My Submissions", to: "/public/submissions", roleIds: [ROLE_PUBLIC] },
          { label: "Help & FAQ", to: "/public/help", roleIds: [ROLE_PUBLIC] },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────
     FINANCIAL INSTITUTION PORTAL — Banks, Insurance, Microfinance
     SRS Actors: "Financial Institutions"
     ─────────────────────────────────────────────────────────────────── */
  {
    heading: "Financial Institution Portal",
    roleIds: [ROLE_FI],
    groups: [
      {
        label: "FI Registration & Profile",
        key: "fi-registration",
        defaultOpen: true,
        roleIds: [ROLE_FI],
        links: [
          { label: "FI Registration", to: "/fi/register", badge: "PRN 7.1", roleIds: [ROLE_FI] },
          { label: "Institution Profile", to: "/fi/profile", badge: "New", roleIds: [ROLE_FI] },
          { label: "Branch & CBS Config", to: "/fi/cbs-config", badge: "New", roleIds: [ROLE_FI] },
        ],
      },
      {
        label: "Bill Discounting",
        key: "fi-bill-discounting",
        defaultOpen: true,
        roleIds: [ROLE_FI],
        links: [
          { label: "Discounting Requests", to: "/fi/bill-discounting", badge: "BD", roleIds: [ROLE_FI] },
          { label: "Verification Queue", to: "/fi/verification-queue", badge: "New", roleIds: [ROLE_FI] },
        ],
      },
      {
        label: "Payment Channels",
        key: "fi-payments",
        defaultOpen: true,
        roleIds: [ROLE_FI],
        links: [
          { label: "Payment Orders", to: "/fi/payment-orders", badge: "PRN 5", roleIds: [ROLE_FI] },
          { label: "Settlement Status", to: "/fi/settlements", badge: "New", roleIds: [ROLE_FI] },
          { label: "Reconciliation", to: "/fi/reconciliation", badge: "New", roleIds: [ROLE_FI] },
        ],
      },
      {
        label: "Reports & Support",
        key: "fi-reports",
        defaultOpen: false,
        roleIds: [ROLE_FI],
        links: [
          { label: "Transaction Reports", to: "/fi/reports", badge: "New", roleIds: [ROLE_FI] },
          { label: "Help & FAQ", to: "/public/help", roleIds: [ROLE_FI] },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────
     MUSTER ROLL PORTAL — Muster Roll Beneficiaries
     ─────────────────────────────────────────────────────────────────── */
  {
    heading: "Muster Roll Portal",
    roleIds: [ROLE_MUSTER_ROLL],
    groups: [
      {
        label: "My Registration",
        key: "mr-registration",
        defaultOpen: true,
        roleIds: [ROLE_MUSTER_ROLL],
        links: [
          { label: "Beneficiary Registration", to: "/public/muster-roll-register", badge: "PRN 6.1", roleIds: [ROLE_MUSTER_ROLL] },
          { label: "My Profile", to: "/muster-roll/profile", badge: "New", roleIds: [ROLE_MUSTER_ROLL] },
        ],
      },
      {
        label: "Payments & Wages",
        key: "mr-payments",
        defaultOpen: true,
        roleIds: [ROLE_MUSTER_ROLL],
        links: [
          { label: "Payment Status", to: "/muster-roll/payments", badge: "PRN 7.1", roleIds: [ROLE_MUSTER_ROLL] },
          { label: "Wage History", to: "/muster-roll/wage-history", roleIds: [ROLE_MUSTER_ROLL] },
        ],
      },
      {
        label: "Documents & Support",
        key: "mr-docs",
        defaultOpen: false,
        roleIds: [ROLE_MUSTER_ROLL],
        links: [
          { label: "Document Upload", to: "/public/documents", badge: "New", roleIds: [ROLE_MUSTER_ROLL] },
          { label: "Help & FAQ", to: "/public/help", roleIds: [ROLE_MUSTER_ROLL] },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────
     ADMINISTRATION — System Administrator only
     ─────────────────────────────────────────────────────────────────── */
  {
    heading: "Administration",
    roleIds: ADMIN_ONLY,
    groups: [
      {
        label: "Admin Tools",
        key: "admin-tools",
        defaultOpen: true,
        roleIds: ADMIN_ONLY,
        links: [
          { label: "RBAC — Roles & Permissions", to: "/admin/rbac", roleIds: ADMIN_ONLY },
          { label: "User Management", to: "/admin/rbac", roleIds: ADMIN_ONLY },
          { label: "Delegation of Authority", to: "/admin/delegation", roleIds: ADMIN_ONLY },
          { label: "Master Data", to: "/master-data", roleIds: ADMIN_ONLY },
        ],
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Agency-specific sidebar overrides
   ─────────────────────────────────
   Different agencies have different organisational structures. For instance,
   GovTech's core business is ICT — only HR, Finance (Chief Accounts Officer),
   and Procurement handle expenditure & payroll day-to-day. Generic staff and
   the ICT Officer (admin) don't interact with those modules.

   Key: agencyCode → section heading → allowed roleIds.
   If an agency+section entry exists here, ONLY those roles see the section
   (overriding the default roleIds in the section config).
   If no entry exists, the default config applies.
   ═══════════════════════════════════════════════════════════════════════════ */
export const AGENCY_SECTION_OVERRIDES: Record<string, Record<string, string[]>> = {
  /* ── GovTech (Code 70) ─────────────────────────────────────────────────
     Expenditure: Finance Officer (Accountant), Procurement, DG (final approver), Admin, Auditor
     Payroll:     HR Officer, Finance Officer, DG, Admin, Auditor
     Contractor:  Procurement, Finance, DG, Admin, Auditor
     ────────────────────────────────────────────────────────────────────── */
  "70": {
    "Expenditure": [
      ROLE_ADMIN, ROLE_FINANCE, ROLE_PROCUREMENT,
      ROLE_HEAD_OF_AGENCY, ROLE_AUDITOR,
    ],
    "Payroll Civil Servant": [
      ROLE_ADMIN, ROLE_HR, ROLE_FINANCE,
      ROLE_HEAD_OF_AGENCY, ROLE_AUDITOR,
    ],
    "Payroll-Other Public Servant": [
      ROLE_ADMIN, ROLE_HR, ROLE_FINANCE,
      ROLE_HEAD_OF_AGENCY, ROLE_AUDITOR,
    ],
    /* Contractor stays accessible to Procurement + Finance + DG + Admin */
    "": [
      ROLE_ADMIN, ROLE_FINANCE, ROLE_PROCUREMENT,
      ROLE_HEAD_OF_AGENCY, ROLE_AUDITOR,
    ],
  },
};

/* ── Role-based + agency-aware filtering helpers ──────────────────────── */

/** Resolve the effective roleIds for a section given the active agency.
 *  Returns the agency override if one exists, otherwise the section's own roleIds. */
function resolveEffectiveRoles(
  section: SidebarSection,
  agencyCode: string | null,
): string[] | undefined {
  if (agencyCode) {
    const agencyOverrides = AGENCY_SECTION_OVERRIDES[agencyCode];
    if (agencyOverrides && section.heading in agencyOverrides) {
      return agencyOverrides[section.heading];
    }
  }
  return section.roleIds;
}

function linkAllowed(
  link: SidebarLink,
  activeRoleId: string | null,
  agencyCode: string | null,
): boolean {
  if (link.roleIds && link.roleIds.length > 0) {
    if (!activeRoleId) return false;
    if (!link.roleIds.includes(activeRoleId)) return false;
  }
  if (link.agencyCodes && link.agencyCodes.length > 0) {
    if (!agencyCode) return false;
    if (!link.agencyCodes.includes(agencyCode)) return false;
  }
  return true;
}

function groupAllowed(
  group: SidebarGroup,
  activeRoleId: string | null,
  agencyCode: string | null,
): boolean {
  if (group.roleIds && group.roleIds.length > 0) {
    if (!activeRoleId) return false;
    if (!group.roleIds.includes(activeRoleId)) return false;
  }
  return group.links.some((link) => linkAllowed(link, activeRoleId, agencyCode));
}

function sectionAllowed(
  section: SidebarSection,
  activeRoleId: string | null,
  agencyCode: string | null,
): boolean {
  const effectiveRoles = resolveEffectiveRoles(section, agencyCode);
  if (effectiveRoles && effectiveRoles.length > 0) {
    if (!activeRoleId) return false;
    if (!effectiveRoles.includes(activeRoleId)) return false;
  }
  const hasGroupLink = section.groups.some((g) => groupAllowed(g, activeRoleId, agencyCode));
  const hasStandalone = (section.standaloneLinks ?? []).some((l) => linkAllowed(l, activeRoleId, agencyCode));
  return hasGroupLink || hasStandalone;
}

/**
 * Return a copy of `sidebarSections` filtered down to only items the given
 * active role may see, taking into account agency-specific overrides.
 * Groups with no remaining links are dropped, and sections with no
 * remaining groups/standalones are dropped too.
 */
export function filterSidebarForRole(
  sections: SidebarSection[],
  activeRoleId: string | null,
  agencyCode?: string | null,
): SidebarSection[] {
  const ac = agencyCode ?? null;
  return sections
    .filter((s) => sectionAllowed(s, activeRoleId, ac))
    .map((s) => ({
      ...s,
      groups: s.groups
        .filter((g) => groupAllowed(g, activeRoleId, ac))
        .map((g) => ({
          ...g,
          links: g.links
            .filter((l) => linkAllowed(l, activeRoleId, ac))
            .map((l) => ({
              ...l,
              children: l.children?.filter((c) => linkAllowed(c, activeRoleId, ac)),
            })),
        })),
      standaloneLinks: (s.standaloneLinks ?? [])
        .filter((l) => linkAllowed(l, activeRoleId, ac))
        .map((l) => ({
          ...l,
          children: l.children?.filter((c) => linkAllowed(c, activeRoleId, ac)),
        })),
    }));
}
