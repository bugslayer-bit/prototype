/* ═══════════════════════════════════════════════════════════════════════════
   Payroll — SRS Clause Registry
   ────────────────────────────────────────────────────────────────────────
   Formal map of Payroll SRS sections (DDi = Data Dictionary item,
   PRN = Process Requirement Number) to UI surfaces.

   Every screen, badge and ProcessFlow in the Payroll module should read
   its clause references and actor list from here instead of hard-coding
   strings. Editing this file is the single way to keep the UI aligned
   with the latest SRS revision.

   Source: Payroll SRS v1.1  (FY 2026 revision)
   Streams:
     • Civil Servant            → DDi 1 – 27, 28 – 30 (Travel)
     • Other Public Servant     → PRN 1.x – 5.x
   ═══════════════════════════════════════════════════════════════════════════ */

export type PayrollStream = "civil-servant" | "other-public-servant" | "cross-stream";

export interface SrsActor {
  /** Short role id — matches rbacData role ids where applicable. */
  id: string;
  /** Formal actor name as used in the SRS. */
  label: string;
  /** Who this actor represents (agency / external system). */
  org?: string;
}

export interface SrsClause {
  /** Formal SRS reference id (e.g. "DDi 28.1", "PRN 2.1"). */
  ref: string;
  /** Short title as it appears in the SRS ToC. */
  title: string;
  /** One-line formal summary (≤ 140 chars). */
  summary: string;
  /** Which payroll stream this clause belongs to. */
  stream: PayrollStream;
  /** Actors named in the clause, in order of first appearance. */
  actors: SrsActor["id"][];
  /** External systems / integrations referenced by the clause. */
  systems?: string[];
}

export interface SrsProcess {
  /** Stable id used by the UI to look this process up. */
  id: string;
  /** Process title as it appears in the SRS. */
  title: string;
  /** Stream this process is scoped to. */
  stream: PayrollStream;
  /** Roll-up clause ref (e.g. "DDi 28–30"). */
  ref: string;
  /** One-paragraph formal objective straight from the SRS. */
  objective: string;
  /** Steps in order — each step names an actor + clause ref. */
  steps: Array<{
    actorId: SrsActor["id"];
    action: string;
    clauseRef: string;
    inputs?: string[];
    outputs?: string[];
    system?: string;
  }>;
}

/* ─── Actors ─────────────────────────────────────────────────────────────── */
export const PAYROLL_ACTORS: Record<string, SrsActor> = {
  "agency-hr": {
    id: "agency-hr",
    label: "Agency HR Officer",
    org: "Parent agency",
  },
  "agency-ddo": {
    id: "agency-ddo",
    label: "Drawing & Disbursing Officer (DDO)",
    org: "Parent agency",
  },
  "agency-finance": {
    id: "agency-finance",
    label: "Agency Finance Officer",
    org: "Parent agency",
  },
  "agency-head": {
    id: "agency-head",
    label: "Head of Agency",
    org: "Parent agency",
  },
  "mof-treasury": {
    id: "mof-treasury",
    label: "MoF — Treasury & Accounts",
    org: "Ministry of Finance (code 16)",
  },
  "mof-pay-cell": {
    id: "mof-pay-cell",
    label: "MoF — Central Pay Cell",
    org: "Ministry of Finance (code 16)",
  },
  "rcsc": {
    id: "rcsc",
    label: "RCSC HRMIS",
    org: "Royal Civil Service Commission",
  },
  "employee": {
    id: "employee",
    label: "Civil Servant / OPS Employee",
    org: "Parent agency",
  },
  "govtech-integration": {
    id: "govtech-integration",
    label: "GovTech — Integration Owner",
    org: "Government Technology Agency (code 70)",
  },
  "edats": {
    id: "edats",
    label: "e-DATS (external system)",
    org: "Tour Approval Platform",
  },
  "rma": {
    id: "rma",
    label: "RMA — Central Bank Gateway",
    org: "Royal Monetary Authority",
  },
  "zest": {
    id: "zest",
    label: "ZESt Civil-Servant Master",
    org: "RCSC / GovTech",
  },
  "mcp": {
    id: "mcp",
    label: "MCP — Master Cheque/Payment",
    org: "MoF payment processor",
  },
};

/* ─── Clauses (selected — extend as SRS evolves) ─────────────────────────── */
export const PAYROLL_CLAUSES: Record<string, SrsClause> = {
  "DDi 1.1": {
    ref: "DDi 1.1",
    title: "Employee Registry",
    summary: "Master list of civil servants synced nightly from ZESt; editable fields scoped to agency HR.",
    stream: "civil-servant",
    actors: ["agency-hr", "zest", "govtech-integration"],
    systems: ["ZESt"],
  },
  "DDi 2.0": {
    ref: "DDi 2.0",
    title: "HR Actions & Pay Updates",
    summary: "Promotion, transfer, suspension and other HR actions that mutate the pay record.",
    stream: "civil-servant",
    actors: ["agency-hr", "agency-head", "rcsc"],
  },
  "PRN 2.1": {
    ref: "PRN 2.1",
    title: "Payroll Generation (6-step)",
    summary: "Draft → Validate → Adjust → Approve → Post to MCP → Close. Central pay cell governs the calendar.",
    stream: "cross-stream",
    actors: ["agency-hr", "agency-finance", "agency-head", "mof-pay-cell", "mcp"],
    systems: ["MCP"],
  },
  "DDi 28": {
    ref: "DDi 28",
    title: "Local TA/DSA Advance",
    summary: "Domestic tour advance raised against an e-DATS-approved tour; DSA computed per grade & locality.",
    stream: "civil-servant",
    actors: ["employee", "agency-ddo", "agency-finance", "edats"],
    systems: ["e-DATS"],
  },
  "DDi 29": {
    ref: "DDi 29",
    title: "Foreign TA/DSA Advance",
    summary: "Foreign tour advance — uses foreign DSA rates and routes through RMA for FX.",
    stream: "civil-servant",
    actors: ["employee", "agency-ddo", "agency-head", "edats", "rma"],
    systems: ["e-DATS", "RMA"],
  },
  "DDi 30": {
    ref: "DDi 30",
    title: "Actual Claim Settlement",
    summary: "Post-tour settlement of advance against actuals; recoveries / top-ups posted to the pay record.",
    stream: "civil-servant",
    actors: ["employee", "agency-ddo", "agency-finance"],
  },
  "PRN 3.1": {
    ref: "PRN 3.1",
    title: "Salary Advance",
    summary: "Interest-free advance with recovery schedule auto-loaded into next payroll cycles.",
    stream: "cross-stream",
    actors: ["employee", "agency-hr", "agency-head", "mof-treasury"],
  },
  "PRN 4.1": {
    ref: "PRN 4.1",
    title: "OPS Travel Claim",
    summary: "OPS-stream travel claim workflow — no e-DATS dependency; advance raised directly by DDO.",
    stream: "other-public-servant",
    actors: ["employee", "agency-ddo", "agency-finance", "agency-head"],
  },
  "PRN 5.x": {
    ref: "PRN 5.x",
    title: "Remittances & Recoveries",
    summary: "Statutory remittances to NPPF, RICBL, DRC, NHDCL, RCSC-CSWS and RAA recoveries.",
    stream: "cross-stream",
    actors: ["agency-finance", "mof-treasury"],
  },
};

/* ─── Processes (swimlane-ready) ─────────────────────────────────────────── */
export const PAYROLL_PROCESSES: Record<string, SrsProcess> = {
  "cs-travel-claim": {
    id: "cs-travel-claim",
    title: "Civil Servant Travel Claim Lifecycle",
    stream: "civil-servant",
    ref: "DDi 28 – 30",
    objective:
      "Raise a tour advance against an e-DATS-approved tour order, disburse through MCP, and settle actuals after return — all while keeping the pay-record audit trail in ZESt.",
    steps: [
      {
        actorId: "employee",
        action: "Obtain tour approval on e-DATS; receive Approved TA Ref No.",
        clauseRef: "DDi 28.1",
        system: "e-DATS",
        outputs: ["Approved TA Ref No."],
      },
      {
        actorId: "agency-ddo",
        action: "Raise Travel Advance request in IFMIS (Local DDi 28 or Foreign DDi 29).",
        clauseRef: "DDi 28.2 / 29.2",
        inputs: ["Approved TA Ref No.", "Destination", "Dates"],
      },
      {
        actorId: "agency-finance",
        action: "Verify DSA computation, budget head and grade entitlement.",
        clauseRef: "DDi 28.4",
      },
      {
        actorId: "agency-head",
        action: "Approve advance for payment.",
        clauseRef: "DDi 28.5 / 29.5",
      },
      {
        actorId: "mcp",
        action: "Release advance to employee bank account (RMA FX for foreign).",
        clauseRef: "DDi 28.6 / 29.6",
        system: "MCP / RMA",
      },
      {
        actorId: "employee",
        action: "Submit actual-claim settlement within 15 days of return.",
        clauseRef: "DDi 30.1",
      },
      {
        actorId: "agency-finance",
        action: "Reconcile advance vs actuals; post recovery or top-up to pay record.",
        clauseRef: "DDi 30.3",
      },
    ],
  },
  "ops-travel-claim": {
    id: "ops-travel-claim",
    title: "OPS Travel Claim Lifecycle",
    stream: "other-public-servant",
    ref: "PRN 4.1",
    objective:
      "Domestic tour claim for Other Public Servants — raised directly by the DDO without e-DATS, using the OPS DSA scale.",
    steps: [
      {
        actorId: "agency-ddo",
        action: "Create OPS travel claim with destination, dates and purpose.",
        clauseRef: "PRN 4.1.1",
      },
      {
        actorId: "agency-finance",
        action: "Verify OPS DSA scale and budget allocation.",
        clauseRef: "PRN 4.1.3",
      },
      {
        actorId: "agency-head",
        action: "Approve claim.",
        clauseRef: "PRN 4.1.4",
      },
      {
        actorId: "mcp",
        action: "Disburse via MCP.",
        clauseRef: "PRN 4.1.5",
        system: "MCP",
      },
    ],
  },
  "payroll-generation": {
    id: "payroll-generation",
    title: "Monthly Payroll Generation",
    stream: "cross-stream",
    ref: "PRN 2.1",
    objective:
      "Produce and post the monthly payroll for one agency across both streams, with central MoF oversight on the calendar and PayBill standard.",
    steps: [
      { actorId: "mof-pay-cell", action: "Publish payroll calendar & PayBill standard.", clauseRef: "PRN 2.0" },
      { actorId: "agency-hr", action: "Freeze HR actions & pull pay updates.", clauseRef: "PRN 2.1.1" },
      { actorId: "agency-hr", action: "Draft PayBill — resolve exceptions.", clauseRef: "PRN 2.1.2" },
      { actorId: "agency-finance", action: "Validate totals, remittances & recoveries.", clauseRef: "PRN 2.1.3" },
      { actorId: "agency-head", action: "Approve PayBill.", clauseRef: "PRN 2.1.4" },
      { actorId: "mof-pay-cell", action: "Accept posting; schedule MCP release.", clauseRef: "PRN 2.1.5", system: "MCP" },
      { actorId: "mcp", action: "Disburse net pay + statutory remittances.", clauseRef: "PRN 2.1.6", system: "MCP" },
    ],
  },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
export function getPayrollProcess(id: keyof typeof PAYROLL_PROCESSES) {
  return PAYROLL_PROCESSES[id];
}

export function resolveActors(actorIds: string[]): SrsActor[] {
  return actorIds
    .map((id) => PAYROLL_ACTORS[id])
    .filter((a): a is SrsActor => Boolean(a));
}

export function clausesForStream(stream: PayrollStream): SrsClause[] {
  return Object.values(PAYROLL_CLAUSES).filter(
    (c) => c.stream === stream || c.stream === "cross-stream",
  );
}
