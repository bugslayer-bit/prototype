/* ═══════════════════════════════════════════════════════════════════════════
   GovTech — Integration Owner Capability Matrix
   ────────────────────────────────────────────────────────────────────────
   GovTech (agency code 70) is NOT a generic operating agency for IFMIS —
   it owns the integration layer that other agencies consume:
     • ZESt (Civil Servant master sync)
     • e-DATS (tour approvals)
     • RMA gateway (FX & interbank)
     • MCP (payment rail)
     • Statutory institutions: NPPF, RICBL, DRC, NHDCL

   In Payroll + Expenditure its UI therefore differs from an operating
   agency. This file declares that scope in a machine-readable form so
   Payroll Management, Bill & Utility and the top-bar persona switcher
   can render a GovTech-aware surface instead of a generic admin one.
   ═══════════════════════════════════════════════════════════════════════════ */

export type CapabilityScope = "config" | "monitor" | "transact";

export interface GovTechCapability {
  /** Module the capability belongs to. */
  module: "payroll" | "expenditure";
  /** Short label rendered on the capability card. */
  label: string;
  /** SRS clause refs that authorise this capability. */
  srsRefs: string[];
  /** What GovTech is allowed to do here. */
  scope: CapabilityScope;
  /** One-line formal description. */
  description: string;
  /** Related external system, if any. */
  system?: string;
}

export const GOVTECH_AGENCY_CODE = "70";

export const GOVTECH_CAPABILITIES: GovTechCapability[] = [
  /* ── Payroll ───────────────────────────────────────────────────────────── */
  {
    module: "payroll",
    label: "ZESt ↔ Employee Registry sync",
    srsRefs: ["DDi 1.1"],
    scope: "config",
    description:
      "Own the nightly ZESt → IFMIS employee master sync; monitor delta counts and resolve mismatch queue.",
    system: "ZESt",
  },
  {
    module: "payroll",
    label: "e-DATS integration",
    srsRefs: ["DDi 28", "DDi 29"],
    scope: "config",
    description:
      "Configure and monitor the e-DATS tour-approval feed consumed by Civil Servant Travel Claim workflows.",
    system: "e-DATS",
  },
  {
    module: "payroll",
    label: "MCP posting monitor",
    srsRefs: ["PRN 2.1"],
    scope: "monitor",
    description:
      "Observe PayBill → MCP posting health across agencies; read-only access to payment release ledger.",
    system: "MCP",
  },
  {
    module: "payroll",
    label: "GovTech own-agency payroll",
    srsRefs: ["PRN 2.1", "DDi 1.1"],
    scope: "transact",
    description:
      "Run the monthly payroll for GovTech employees only — identical workflow to any other operating agency, scoped to agency code 70.",
  },

  /* ── Expenditure ───────────────────────────────────────────────────────── */
  {
    module: "expenditure",
    label: "RMA gateway ops",
    srsRefs: ["PRN 6.1"],
    scope: "config",
    description:
      "Manage RMA FX & interbank gateway keys; monitor settlement status for Foreign TA and debt servicing.",
    system: "RMA",
  },
  {
    module: "expenditure",
    label: "Utility provider directory",
    srsRefs: ["PRN 5.1"],
    scope: "config",
    description:
      "Maintain the registered utility provider master (BPC, Thimphu Thromde, Tashi Cell, TashiCell, etc.) that all agencies consume.",
  },
  {
    module: "expenditure",
    label: "GovTech own-agency bills",
    srsRefs: ["PRN 3", "PRN 5.1", "PRN 5.2"],
    scope: "transact",
    description:
      "Submit and approve GovTech's own contractor invoices, utility bills and rental payments — scoped to agency code 70.",
  },
  {
    module: "expenditure",
    label: "Integration audit trail",
    srsRefs: ["PRN 3", "PRN 5.1"],
    scope: "monitor",
    description:
      "Read-only view of integration events (payload hashes, retry counts, SLA breach) across expenditure modules.",
  },
];

export function govtechCapabilitiesFor(module: "payroll" | "expenditure") {
  return GOVTECH_CAPABILITIES.filter((c) => c.module === module);
}

/** True when the given agency code is the GovTech integration owner. */
export function isGovTechAgency(agencyCode: string | null | undefined) {
  return agencyCode === GOVTECH_AGENCY_CODE;
}
