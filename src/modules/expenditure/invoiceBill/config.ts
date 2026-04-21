/* ═══════════════════════════════════════════════════════════════════════════
   Invoice & Bill — Static Configuration
   - Step list (drives the wizard)
   - Document checklist helper text (the *labels* are static, but the *list of
     allowed document types* is master-data driven via useInvoiceBillMasterData)
   - Default approval chains
   - Initial form state
   - Field-label dictionary for audit trails / validation messages

   IMPORTANT: This file no longer ships hard-coded LoV arrays for
   status / category / channel / currency / tax codes. Every dropdown
   in the wizard now pulls its options from the shared MasterDataContext
   via the useInvoiceBillMasterData() hook so admins can add/remove
   values from /master-data without touching code.
   ═══════════════════════════════════════════════════════════════════════════ */
import type { InvoiceBillFormState, ApprovalStep } from "./types";

/* ── Wizard steps mirror SRS process descriptions PRN 3.1.x → 3.3.x ─────── */
export const invoiceBillSteps = [
  { id: 1, label: "Invoice Intake",  prn: "3.1.1", helper: "Capture invoice header & supporting documents" },
  { id: 2, label: "Validation",      prn: "3.1.2", helper: "System & duplication checks" },
  { id: 3, label: "Bill Creation",   prn: "3.2.1", helper: "Auto-create bill from approved invoice" },
  { id: 4, label: "Tax & Deductions",prn: "16.5",  helper: "Compute tax base, retention, deductions" },
  { id: 5, label: "Approval",        prn: "3.2.2", helper: "Multi-stage approval workflow" },
  { id: 6, label: "Discounting",     prn: "3.3.1", helper: "Optional bill discounting facility" },
  { id: 7, label: "Submit",          prn: "3.2.3", helper: "Final verification & submission" },
] as const;

/* ── Hierarchical sub-step map (SRS Process Description Rows 38–64) ───────
   Each main step expands into the SRS sub-process steps it covers.
   Used by the stepper to render a hierarchical breakdown so the user can
   trace exactly which SRS row is in scope. */
export interface SrsSubStep {
  code: string;        /* "1.1", "1.2" — display id */
  srsRow: string;      /* "Row 38" — SRS Process Description row */
  srsNo: string;       /* "1.0", "4a", "4b" — SRS step number */
  label: string;       /* short human label */
  helper: string;      /* one-line description */
  actor: string;       /* who performs the action */
}

export const invoiceBillSubSteps: Record<number, SrsSubStep[]> = {
  1: [
    { code: "1.1", srsRow: "Row 38", srsNo: "1.0",  label: "Submission Setup",        helper: "Initiate invoice — choose channel (Portal / Manual / Interface) and authenticate submitter", actor: "User / System" },
    { code: "1.2", srsRow: "Row 39", srsNo: "2.0",  label: "Bind to Contract",        helper: "Mandatory contract link; verify Active + contractor match",                                  actor: "User / System" },
    { code: "1.3", srsRow: "Row 40", srsNo: "3.0",  label: "Auto-populate Context",   helper: "Pull currency, category, milestone flag, retention, advance, tax rules from contract",      actor: "System" },
    { code: "1.4", srsRow: "Row 41", srsNo: "4.0",  label: "Header & Amounts",        helper: "Capture contractor invoice number, date, gross amount and notes",                          actor: "User / System" },
    { code: "1.5", srsRow: "Row 42", srsNo: "4a",   label: "Milestone Selection",     helper: "(Works) Select milestone(s), auto-populate payable amounts, allow split",                   actor: "User / System" },
    { code: "1.6", srsRow: "Row 43", srsNo: "4b",   label: "Non-Milestone Details",   helper: "(Non-milestone contracts) Currency must match contract, amount stored as flat invoice",     actor: "User / System" },
    { code: "1.7", srsRow: "Row 44", srsNo: "5.0",  label: "Supporting Documents",    helper: "Render category checklist; user uploads invoice PDF, certificates, GRN/acceptance",        actor: "User / System" },
    { code: "1.8", srsRow: "Row 45", srsNo: "5a",   label: "GRN / GIMS Lookup",       helper: "(Goods) Capture GRN code → GIMS retrieves items, qty, price, dates, validates uniqueness", actor: "User / System" },
  ],
  2: [
    { code: "2.1", srsRow: "Row 46", srsNo: "6.0",  label: "Data Validation",         helper: "Run all hard checks: contract active, contractor match, currency, mandatory docs, ceilings, dup", actor: "System" },
    { code: "2.2", srsRow: "Row 47", srsNo: "7.0",  label: "Register & Allocate ID",  helper: "Generate IFMIS Invoice ID, lock key fields, set status SUBMITTED / IMPORTED",               actor: "System" },
    { code: "2.3", srsRow: "Row 48", srsNo: "8.0",  label: "Submit & Notify",         helper: "Send agency worklist alert + email + contractor SMS/email with invoice number",             actor: "User / System" },
  ],
  3: [
    { code: "3.1", srsRow: "Row 49", srsNo: "9.0",  label: "Technical Verification",  helper: "Configured workflow: reviewer + approver, verify completion / acceptance documents",       actor: "User" },
    { code: "3.2", srsRow: "Row 50", srsNo: "9.0",  label: "ESG Tagging",             helper: "Environment / Social / Gender attribution; mandatory if budget is ESG-linked, audit trail",  actor: "User / System" },
    { code: "3.3", srsRow: "Row 49", srsNo: "9.0",  label: "Bill Header & Lines",     helper: "Auto-create bill header, render Goods / Works / Services lines from contract items",        actor: "System" },
  ],
  4: [
    { code: "4.1", srsRow: "Row 56", srsNo: "15.0", label: "Compute Taxes (Auto)",    helper: "Apply tax rules from contract (TDS / PIT / BIT / GST), tag revenue heads",                  actor: "System" },
    { code: "4.2", srsRow: "Row 56", srsNo: "15.0", label: "Compute Retention",       helper: "If retention % configured → calculate and tag retention payable",                            actor: "System" },
    { code: "4.3", srsRow: "Row 56", srsNo: "15.0", label: "Apply Advance Recovery",  helper: "If advance outstanding → deduct per configured recovery rule, update advance balance",      actor: "System" },
    { code: "4.4", srsRow: "Row 56", srsNo: "15.0", label: "Audit Recovery (ARMS)",  helper: "Capture AIN from ARMS or manual input — Audit Recoveries deductions",                       actor: "User" },
    { code: "4.5", srsRow: "Row 56", srsNo: "15.0", label: "Net Payable Computation", helper: "Net = Gross − taxes − retention − advance recovery − other deductions",                     actor: "System" },
  ],
  5: [
    { code: "5.1", srsRow: "Row 55", srsNo: "14.0", label: "Checker Mechanism",       helper: "Hard gates: invoice ≤ contract remaining, milestone remaining, funds sufficiency",          actor: "User / System" },
    { code: "5.2", srsRow: "Row 57", srsNo: "16.0", label: "Approval for Payment",    helper: "MCP allocation, budget+commitment, vendor active, vendor bank active checks",                actor: "User / System" },
    { code: "5.3", srsRow: "Row 57", srsNo: "16.0", label: "KPI & Escalation",        helper: "Compute processing duration; flag breaches; send escalation notifications",                  actor: "System" },
    { code: "5.4", srsRow: "Row 58", srsNo: "17.0", label: "Reversal Authorisation",  helper: "If approved-in-error: initiate reversal request (only if not yet released to retailer)",   actor: "User" },
    { code: "5.5", srsRow: "Row 59", srsNo: "18.0", label: "Execute Reversal",        helper: "System reverses approval status, adjusts liabilities & commitments, ledger entries",        actor: "System" },
  ],
  6: [
    { code: "6.1", srsRow: "Row 51", srsNo: "10.0", label: "Discounting Eligibility", helper: "30-day rule + last-invoice rule; only enabled when authorised user returns for discount",   actor: "User / System" },
    { code: "6.2", srsRow: "Row 52", srsNo: "11.0", label: "Discounting Submission",  helper: "Contractor submits with discounted bill value + expected payment dates",                    actor: "User" },
    { code: "6.3", srsRow: "Row 53", srsNo: "12.0", label: "FI Transaction Mgmt",     helper: "Government user accepts/returns; apply taxes & duty deductions; payment advice to bank",   actor: "User / System" },
    { code: "6.4", srsRow: "Row 54", srsNo: "13.0", label: "Settlement & Reconcile",  helper: "Settle net + agreed rate to FI (not contractor); maturity tracking, default & recovery",    actor: "User / System" },
  ],
  7: [
    { code: "7.1", srsRow: "Row 60", srsNo: "19.0", label: "Generate Payment Order",  helper: "Auto-generate from approved bills using FIFO; push to Cash Management",                      actor: "System" },
    { code: "7.2", srsRow: "Row 61", srsNo: "20.0", label: "Voucher Receipt",         helper: "Printable voucher with official format and agency / RGOB letterhead",                       actor: "System" },
    { code: "7.3", srsRow: "Row 62", srsNo: "21.0", label: "PO Cancellation",         helper: "Optional: cancel PO with reason; only allowed if not yet paid; capture audit trail",        actor: "User" },
    { code: "7.4", srsRow: "Row 63", srsNo: "21.0", label: "Post-Cancel Reversal",    helper: "Post reversal entries to ledger / cash control; reset invoice status; PO ID not reused",    actor: "System" },
    { code: "7.5", srsRow: "Row 64", srsNo: "22.0", label: "Release Payment",         helper: "Listed under Cash Management; released payment visible to agency staff",                    actor: "System" },
  ],
};

/* ── Document checklist helper text ────────────────────────────────────────
   Only the helper labels and "required" flags live here — the actual list of
   allowed document types is master-data driven (group `invoice-document-type`).
   This map is consulted by the intake screen to render the right helper text
   for whatever doc-type strings the master data currently exposes. */
export const documentHelperByType: Record<string, { required: boolean; helper: string }> = {
  "Invoice Copy":           { required: true,  helper: "Original invoice (PDF / image)" },
  "GRN":                    { required: true,  helper: "Goods Received Note from Stores" },
  "Way-Bill":               { required: false, helper: "Required for cross-border supply" },
  "Contract Validity":      { required: true,  helper: "Proof contract is currently active" },
  "Completion Certificate": { required: false, helper: "Required for Works milestones" },
  "Site Verification":      { required: false, helper: "Authorised signatory site sign-off" },
  "Tax Clearance":          { required: false, helper: "Tax clearance certificate from RRCO" },
  "Bank Guarantee":         { required: false, helper: "Performance / advance bank guarantee" },
};

/* Suggested default rates for known tax codes — used to pre-fill the rate
   when a user picks a code in the tax row editor. Codes themselves come
   from the `tax-code` master data group; this map is purely a convenience. */
export const taxCodeDefaultRate: Record<string, string> = {
  TDS: "5",
  PIT: "10",
  BIT: "30",
  GST: "7",
  VAT: "10",
  CIT: "25",
};

/* ── Dynamic approval chain builder (reads from master-data matrices) ──────
   Falls back to SRS PRN 3.1.3 / 3.2.2 defaults ONLY when no matrix is
   configured in /master-data.  The primary source is the threshold-encoded
   rows in approval-matrix-invoice / approval-matrix-bill groups.
   ────────────────────────────────────────────────────────────────────────── */
import { resolveApprovalChain } from "./approvalMatrix";

/** Static fallback — used only when master-data has no approval-matrix rows */
const FALLBACK_INVOICE_STEPS: ApprovalStep[] = [
  { key: "verifier", label: "Verification",      role: "Procurement Officer", status: "pending" },
  { key: "finance",  label: "Finance Review",    role: "Finance Officer",     status: "pending" },
  { key: "approver", label: "Approving Officer", role: "Head of Agency",      status: "pending" },
];
const FALLBACK_BILL_STEPS: ApprovalStep[] = [
  { key: "tech",     label: "Technical Verify",  role: "Technical Officer",  status: "pending" },
  { key: "audit",    label: "Internal Audit",    role: "Internal Auditor",   status: "pending" },
  { key: "finance",  label: "Finance Approval",  role: "Finance Controller", status: "pending" },
  { key: "release",  label: "Payment Release",   role: "Treasury",           status: "pending" },
];

/**
 * Build the invoice approval chain dynamically from master-data matrices.
 * @param matrixRows — raw strings from masterDataMap.get("approval-matrix-invoice")
 * @param netAmount  — net payable amount to pick the correct threshold tier
 */
export function buildInvoiceApprovalSteps(
  matrixRows: string[] | undefined,
  netAmount: number = 0,
): ApprovalStep[] {
  if (matrixRows && matrixRows.length > 0) {
    const dynamic = resolveApprovalChain(matrixRows, netAmount);
    if (dynamic.length > 0) return dynamic;
  }
  return FALLBACK_INVOICE_STEPS.map((s) => ({ ...s }));
}

/**
 * Build the bill approval chain dynamically from master-data matrices.
 * @param matrixRows — raw strings from masterDataMap.get("approval-matrix-bill")
 * @param netAmount  — net payable amount to pick the correct threshold tier
 */
export function buildBillApprovalSteps(
  matrixRows: string[] | undefined,
  netAmount: number = 0,
): ApprovalStep[] {
  if (matrixRows && matrixRows.length > 0) {
    const dynamic = resolveApprovalChain(matrixRows, netAmount);
    if (dynamic.length > 0) return dynamic;
  }
  return FALLBACK_BILL_STEPS.map((s) => ({ ...s }));
}

/* Legacy aliases — still used by initialInvoiceBillForm below */
const defaultInvoiceApprovalSteps = FALLBACK_INVOICE_STEPS;
const defaultBillApprovalSteps = FALLBACK_BILL_STEPS;

/* ── Initial form state (a blank wizard run) ────────────────────────────── */
export const initialInvoiceBillForm: InvoiceBillFormState = {
  recordId: "",
  workflowStatus: "draft",
  createdAt: "",
  updatedAt: "",
  invoice: {
    invoiceId: "",
    contractId: "",
    milestoneId: "",
    invoiceNumber: "",
    invoiceDate: "",
    invoiceGrossAmount: "",
    totalTaxAmount: "0",
    retentionAmount: "0",
    totalDeductionAmount: "0",
    documentType: "Invoice + Supporting",
    netPayableAmount: "0",
    invoiceStatus: "Submitted",
    currency: "BTN",
    submissionChannel: "Manual",
    documents: [],
    contractorId: "",
    contractorName: "",
    contactId: "",
    contactName: "",
    agencyName: "",
    remarks: "",
  },
  bill: {
    billId: "",
    invoiceId: "",
    contractId: "",
    billDate: "",
    billCategory: "Goods",
    billSubCategory: "IT Equipment",
    ucoaLevel: "",
    billAmountGross: "0",
    taxAmount: "0",
    deductionAmount: "0",
    retentionAmount: "0",
    netPayableAmount: "0",
    billStatus: "Draft",
  },
  goodsRows: [],
  worksRows: [],
  servicesRows: [],
  taxRows: [],
  validationChecks: [],
  invoiceApprovalSteps: defaultInvoiceApprovalSteps.map((s) => ({ ...s })),
  billApprovalSteps: defaultBillApprovalSteps.map((s) => ({ ...s })),
  discountingEligible: false,
  discountingRequested: false,
  discountingFiId: "",
  discountingRate: "0",
  discountingFee: "0",
  netAmountReceived: "0",
  discountingStatus: "Not Requested",
  /* ── NEW SRS-driven defaults ─────────────────────────────────────────── */
  milestones: [],
  grnRecords: [],
  esg: {
    budgetEsgLinked: false,
    categories: [],
    attributedBy: "",
    attributedAt: "",
    notes: "",
  },
  auditRecoveries: [],
  reversal: {
    id: "",
    requestedAt: "",
    requestedBy: "",
    reason: "",
    status: "draft",
    paymentAlreadyReleased: false,
    remarks: "",
  },
  paymentOrder: {
    paymentOrderId: "",
    generatedAt: "",
    fifoSequence: 0,
    amount: "0",
    status: "not_generated",
    cmAcknowledgement: "",
    holdReason: "",
    rejectReason: "",
    cancellationReason: "",
    cancelledAt: "",
    cancelledBy: "",
    reversalLedgerPosted: false,
  },
  discountingEligibility: {
    daysSinceSubmission: 0,
    isLastInvoice: false,
    thirtyDayRulePassed: false,
    eligible: false,
    evaluatedAt: "",
  },
};

/* ── Human-readable labels for audit-trail / validation ─────────────────── */
export const invoiceBillFieldLabels: Record<string, string> = {
  invoiceId: "Invoice ID",
  contractId: "Contract ID",
  milestoneId: "Milestone ID",
  invoiceNumber: "Invoice Number",
  invoiceDate: "Invoice Date",
  invoiceGrossAmount: "Invoice Gross Amount",
  totalTaxAmount: "Total Tax Amount",
  retentionAmount: "Retention Amount",
  totalDeductionAmount: "Total Deduction Amount",
  documentType: "Document Type",
  netPayableAmount: "Net Payable Amount",
  invoiceStatus: "Invoice Status",
  currency: "Currency",
  submissionChannel: "Submission Channel",
  billId: "Bill ID",
  billDate: "Bill Date",
  billCategory: "Bill Category",
  billSubCategory: "Bill Sub-Category",
  billAmountGross: "Bill Gross Amount",
  taxAmount: "Tax Amount",
  deductionAmount: "Deduction Amount",
  billStatus: "Bill Status",
};
