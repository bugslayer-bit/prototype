/* ═══════════════════════════════════════════════════════════════════════════
   Expenditure — SRS Clause Registry
   ────────────────────────────────────────────────────────────────────────
   Formal map of Expenditure SRS Process Descriptions (PD) to UI surfaces.
   Covers: Contract lifecycle, Invoice/Bill, Payment, Utility, Rental,
   Debt servicing, SOE transfers, Social Benefits, Subscriptions.

   Source: Expenditure SRS v1.3  (FY 2026 revision)
   ═══════════════════════════════════════════════════════════════════════════ */

import type { SrsActor, SrsClause, SrsProcess } from "./payrollSrs";

export const EXPENDITURE_ACTORS: Record<string, SrsActor> = {
  "agency-staff": { id: "agency-staff", label: "Agency Staff / Initiator", org: "Parent agency" },
  "agency-finance": { id: "agency-finance", label: "Agency Finance Officer", org: "Parent agency" },
  "agency-head": { id: "agency-head", label: "Head of Agency", org: "Parent agency" },
  "agency-procurement": { id: "agency-procurement", label: "Procurement Officer", org: "Parent agency" },
  "mof-treasury": { id: "mof-treasury", label: "MoF — Treasury & Accounts", org: "Ministry of Finance" },
  "mof-budget": { id: "mof-budget", label: "MoF — Budget Division", org: "Ministry of Finance" },
  "contractor": { id: "contractor", label: "Contractor / Vendor", org: "External" },
  "utility-provider": { id: "utility-provider", label: "Utility Provider", org: "BPC / Thimphu Thromde / Tashi Cell / etc." },
  "landlord": { id: "landlord", label: "Landlord / Lessor", org: "External" },
  "rma": { id: "rma", label: "RMA — Central Bank Gateway", org: "Royal Monetary Authority" },
  "mcp": { id: "mcp", label: "MCP — Master Cheque/Payment", org: "MoF payment processor" },
  "govtech-integration": { id: "govtech-integration", label: "GovTech — Integration Owner", org: "Government Technology Agency (code 70)" },
  "drc": { id: "drc", label: "DRC — Tax Authority", org: "Department of Revenue & Customs" },
};

export const EXPENDITURE_CLAUSES: Record<string, SrsClause> = {
  "PRN 1.1": {
    ref: "PRN 1.1",
    title: "Contractor Registration",
    summary: "Onboarding of individual & business contractors; CID/TPN validation via DRC.",
    stream: "cross-stream",
    actors: ["contractor", "agency-procurement", "drc"],
    systems: ["DRC"],
  },
  "PRN 3": {
    ref: "PRN 3",
    title: "Invoice & Bill",
    summary: "Contractor submits invoice → agency verifies → bill generated → approved → MCP release.",
    stream: "cross-stream",
    actors: ["contractor", "agency-staff", "agency-finance", "agency-head", "mcp"],
    systems: ["MCP"],
  },
  "PRN 5.1": {
    ref: "PRN 5.1",
    title: "Utility Payment",
    summary: "Recurring utility bills (electricity, water, telecom); auto-match against utility provider master.",
    stream: "cross-stream",
    actors: ["utility-provider", "agency-staff", "agency-finance", "agency-head", "mcp"],
    systems: ["MCP"],
  },
  "PRN 5.2": {
    ref: "PRN 5.2",
    title: "Rental Payment",
    summary: "Land, building and vehicle rental — lease-tenure aware; TDS auto-computed.",
    stream: "cross-stream",
    actors: ["landlord", "agency-staff", "agency-finance", "drc", "mcp"],
    systems: ["MCP", "DRC"],
  },
  "PRN 6.1": {
    ref: "PRN 6.1",
    title: "Debt Servicing",
    summary: "External / internal loan repayments routed via RMA; schedule managed by MoF Debt Cell.",
    stream: "cross-stream",
    actors: ["mof-treasury", "rma", "mcp"],
    systems: ["RMA", "MCP"],
  },
};

export const EXPENDITURE_PROCESSES: Record<string, SrsProcess> = {
  "invoice-bill": {
    id: "invoice-bill",
    title: "Invoice & Bill — End-to-End",
    stream: "cross-stream",
    ref: "PRN 3",
    objective:
      "Receive a contractor invoice, verify deliverables against the contract, generate a Bill, approve it, and disburse via MCP — with full audit trail and TDS withholding.",
    steps: [
      { actorId: "contractor", action: "Submit invoice against an active contract.", clauseRef: "PRN 3.1" },
      { actorId: "agency-staff", action: "Attach delivery evidence & verify line items.", clauseRef: "PRN 3.2" },
      { actorId: "agency-finance", action: "Compute TDS / withholdings; generate Bill.", clauseRef: "PRN 3.3" },
      { actorId: "agency-head", action: "Approve Bill for payment.", clauseRef: "PRN 3.4" },
      { actorId: "mcp", action: "Release payment to contractor bank account.", clauseRef: "PRN 3.5", system: "MCP" },
    ],
  },
  "utility-payment": {
    id: "utility-payment",
    title: "Utility Payment Lifecycle",
    stream: "cross-stream",
    ref: "PRN 5.1",
    objective:
      "Process a recurring utility bill from a registered provider, match against prior consumption, and release payment within the SLA window.",
    steps: [
      { actorId: "utility-provider", action: "Push bill through provider integration or upload PDF.", clauseRef: "PRN 5.1.1" },
      { actorId: "agency-staff", action: "Auto-match against contract/provider master; flag variance.", clauseRef: "PRN 5.1.2" },
      { actorId: "agency-finance", action: "Verify meter reading & approve consumption.", clauseRef: "PRN 5.1.3" },
      { actorId: "agency-head", action: "Approve for payment.", clauseRef: "PRN 5.1.4" },
      { actorId: "mcp", action: "Disburse to utility provider.", clauseRef: "PRN 5.1.5", system: "MCP" },
    ],
  },
  "rental-payment": {
    id: "rental-payment",
    title: "Rental Payment Lifecycle",
    stream: "cross-stream",
    ref: "PRN 5.2",
    objective:
      "Pay monthly rent on land / building / vehicle leases — apply TDS as per DRC schedule and record the lease tenor.",
    steps: [
      { actorId: "agency-staff", action: "Raise rental bill against an active lease.", clauseRef: "PRN 5.2.1" },
      { actorId: "agency-finance", action: "Compute TDS (5% resident / 10% non-resident).", clauseRef: "PRN 5.2.2" },
      { actorId: "agency-head", action: "Approve payment.", clauseRef: "PRN 5.2.3" },
      { actorId: "mcp", action: "Disburse net rent to landlord.", clauseRef: "PRN 5.2.4", system: "MCP" },
      { actorId: "drc", action: "TDS remitted to DRC as part of monthly roll-up.", clauseRef: "PRN 5.2.5", system: "DRC" },
    ],
  },
};
