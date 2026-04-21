/* ═══════════════════════════════════════════════════════════════════════════
   Role → Landing Route Registry
   ────────────────────────────────────────────────────────────────────────
   Single source of truth for "when role X is activated, where should the
   user be dropped?" — replaces the previous behaviour of keeping the
   user on whatever page they happened to be on.

   Every landing below is grounded in an existing route and an existing
   RBAC permission set (see rbacData.ts). Nothing is invented — each
   role's landing is the module where that role has its primary
   write-capability. If a role has no dominant module (e.g. the Super
   Admin), the landing falls back to "/".

   IMPORTANT: the agency URL prefix (/:agencySlug/:userId/…) is applied
   at the call site via useAgencyUrl().buildPath — this registry only
   stores bare relative paths.

   Add a role here whenever a new roleId is added to rbacData.ts.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface RoleLanding {
  /** rbacData roleId — must match exactly. */
  roleId: string;
  /** Bare relative route (no agency prefix). */
  path: string;
  /** Why this landing was chosen — grounded in SRS / RBAC capability. */
  rationale: string;
}

/* ─── Canonical landings per role ────────────────────────────────────────── */
export const ROLE_LANDINGS: RoleLanding[] = [
  /* System Administrator — has everything; drop at root to let them pick. */
  {
    roleId: "role-admin",
    path: "/",
    rationale:
      "Full access — home dashboard is the right surface to pick any module.",
  },

  /* Head of Agency — primary job is approval across all workflows. */
  {
    roleId: "role-head-of-agency",
    path: "/expenditure/bills/approvals",
    rationale:
      "Primary capability is Bill / PO / Contract approval (Approve+Reject across Invoice Approval, Bill Processing, Payment Order). Lands in the approvals inbox.",
  },

  /* Finance Officer — owns bill creation + payment-order review. */
  {
    roleId: "role-finance-officer",
    path: "/expenditure/bills",
    rationale:
      "Primary write-capability is Bill Processing (Create/Edit/Submit) and Payment Order. Lands on the Invoice & Bill queue.",
  },

  /* Procurement Officer — owns contracts and vendors. */
  {
    roleId: "role-procurement",
    path: "/expenditure/contracts",
    rationale:
      "Full write-capability in Contract Creation/Amendment/Extension/Closure. Lands on Contract Lifecycle.",
  },

  /* Agency Staff — day-to-day initiator for invoices, requisitions. */
  {
    roleId: "role-agency-staff",
    path: "/expenditure/bills",
    rationale:
      "Initiator for Invoice Submission and Bill Processing. Lands on the queue to start a new record.",
  },

  /* HR Officer — employee master + payroll initiation. */
  {
    roleId: "role-hr-officer",
    path: "/payroll/employees",
    rationale:
      "Primary capability is Employee Master + Payroll Generation initiation. Lands on Employee Registry.",
  },

  /* Auditor — read-only across everything; start at reports. */
  {
    roleId: "role-auditor",
    path: "/expenditure/reports",
    rationale:
      "View + Export on Reports & Analytics; no transactional rights. Lands on the reports surface.",
  },

  /* Normal User — view + drafts only. */
  {
    roleId: "role-normal-user",
    path: "/",
    rationale:
      "View + Create-draft access; home dashboard surfaces whatever they have permission to open.",
  },

  /* Public User — external self-service portal. */
  {
    roleId: "role-public",
    path: "/contractor",
    rationale: "External contractor/vendor portal — self-service entry point.",
  },

  /* Muster Roll Worker — external portal for MR workers. */
  {
    roleId: "role-muster-roll",
    path: "/muster-roll",
    rationale: "External Muster Roll portal — worker self-service.",
  },

  /* Financial Institution — external FI portal. */
  {
    roleId: "role-fi",
    path: "/fi",
    rationale: "External Financial Institution portal — bill discounting, payments.",
  },
];

/* ─── Agency-specific overrides ──────────────────────────────────────────── *
 *  GovTech (code 70) is the Integration Owner — its operational landing
 *  is different from a vanilla agency for the same roleId. Agency code
 *  overrides take precedence over the base ROLE_LANDINGS entry.
 *
 *  Shape: key = `${agencyCode}:${roleId}`.
 * ───────────────────────────────────────────────────────────────────────── */
export const AGENCY_ROLE_LANDINGS: Record<string, RoleLanding> = {
  "70:role-hr-officer": {
    roleId: "role-hr-officer",
    path: "/payroll/management?stream=civil-servant",
    rationale:
      "GovTech HR lands on Payroll Management for its own (GovTech) employees only.",
  },
  "70:role-finance-officer": {
    roleId: "role-finance-officer",
    path: "/expenditure/utility",
    rationale:
      "GovTech Finance lands on the Utility queue — GovTech owns the utility provider master.",
  },
};

/* ─── Resolver ───────────────────────────────────────────────────────────── */
export function landingFor(
  roleId: string,
  agencyCode: string | null | undefined,
): RoleLanding {
  if (agencyCode) {
    const override = AGENCY_ROLE_LANDINGS[`${agencyCode}:${roleId}`];
    if (override) return override;
  }
  const base = ROLE_LANDINGS.find((r) => r.roleId === roleId);
  return (
    base ?? {
      roleId,
      path: "/",
      rationale: "No declared landing — fall back to home dashboard.",
    }
  );
}
