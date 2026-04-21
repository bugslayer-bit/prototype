/* ═══════════════════════════════════════════════════════════════════════════
   SubmittedInvoiceContext — shared store for invoices that completed the
   Invoice Submission Flow and are now waiting in Invoice Processing.

   Used by:
     • InvoiceSubmissionPage  →  pushes a SubmittedInvoice on final submit
     • InvoiceProcessingPage  →  reads + mutates (approve / reject / hold,
                                  ESG tagging, bill discounting flags)

   Persisted to localStorage so the queue survives page refreshes.
   ═══════════════════════════════════════════════════════════════════════════ */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SEED_SUBMITTED_INVOICES } from "./demoSeed";

export type ProcessingStatus =
  | "submitted"            // came in from Invoice Submission, awaiting review
  | "approved"             // technical & financial verification passed (Row 9) → eligible for Invoice Approval (Rows 15–16)
  | "rejected"             // rejected with comment
  | "on-hold"              // waiting for more info
  | "returned-for-bd"      // returned to contractor for Bill Discounting
  | "bd-submitted"         // contractor has submitted bill-discount request
  | "bd-approved"          // FI/agency approved discount transaction
  | "bd-settled"           // discount bill settled with FI
  | "computed"             // Row 15 — semi-auto computation done, awaiting Row 16 approval
  | "approved-for-payment" // Row 16 — approved for payment
  | "payment-rejected"     // Row 16 — payment rejected
  | "payment-on-hold";     // Row 16 — payment on hold

export interface EsgTag {
  /** Selected ESG pillars from the canonical `esg-category` master-data LoV
   *  (default values: Environment, Social, Governance). Stored as plain
   *  strings so admins can edit the LoV in /master-data and every screen
   *  reflects the change automatically — "declare once, use everywhere". */
  categories: string[];
  taggedBy: string;     // user id or name
  taggedAt: string;     // ISO timestamp
}

export interface ProcessingHistoryEntry {
  at: string;           // ISO
  by: string;           // user
  action: string;       // "Approved" | "Rejected" | "Hold" | "Returned for BD" | ...
  comment?: string;
}

/* SRS Row 15 — additional deductions captured manually
   (LD, penalty, audit recovery / AIN, other) */
export interface AdditionalDeduction {
  id: string;
  type: "LD / Penalty" | "Audit Recovery (AIN)" | "Other";
  amount: number;
  reason: string;
  ain?: string; // when type = Audit Recovery
}

/* SRS Row 16 — system checks performed before payment approval */
export interface SystemChecks {
  mcpAllocation: boolean;
  budgetAvailable: boolean;
  commitmentAvailable: boolean;
  vendorActive: boolean;
  vendorBankActive: boolean;
}

export interface SubmittedInvoice {
  /* identifiers */
  id: string;             // internal record id
  ifmisNumber: string;    // INV-2026-#####
  invoiceNumber: string;  // contractor invoice #

  /* contract binding (snapshot at submit time) */
  contractId: string;
  contractTitle: string;
  contractor: string;
  contractorId: string;
  agencyName: string;
  category: string;       // Goods | Works | Services | Consultancy

  /* amounts */
  grossAmount: number;
  taxAmount: number;
  retentionAmount: number;
  deductionAmount: number;
  netPayable: number;
  currency: string;

  /* submission metadata */
  invoiceDate: string;
  submittedAt: string;
  submittedBy: string;
  channel: string;        // manual | egp-interface | cms-interface | supplier-portal
  taxType: string;        // captured at Step 3 of the submission flow

  /* supporting documents pushed from submission (Row 9 input) */
  documents: Array<{ name: string; size: number; ticked: boolean; mandatory: boolean }>;

  /* processing state */
  status: ProcessingStatus;
  esg: EsgTag | null;
  history: ProcessingHistoryEntry[];

  /* SRS Row 15 — semi-automated computation */
  additionalDeductions?: AdditionalDeduction[];
  computedAt?: string;
  computedBy?: string;

  /* SRS Row 16 — approval for payment */
  systemChecks?: SystemChecks;
  paymentDecisionAt?: string;
  paymentDecisionBy?: string;

  /* bill discounting */
  discountReturnedAt?: string;
  bdRequest?: {
    discountedValue: number;
    expectedPaymentDate: string;
    submittedAt: string;
  };
  bdApprovedAt?: string;
  bdSettlement?: {
    method: "direct-fi" | "government-mediated" | "automated";
    settledAt: string;
  };

  /* SRS Rows 60–63 — Payment Order lifecycle (Post-approval §3.4).
   * Populated by PaymentOrderReleasePanel once Row 16 has approved the
   * invoice. Optional because invoices only gain a PO after they reach
   * status = "approved-for-payment". */
  paymentOrder?: SubmittedInvoicePaymentOrder;
}

export type SubmittedPaymentOrderStatus =
  | "not_generated"
  | "queued_fifo"
  | "generated"
  | "pushed_to_cm"
  | "cleared"
  | "held"
  | "rejected"
  | "cancelled";

export interface SubmittedInvoicePaymentOrder {
  paymentOrderId: string;
  generatedAt: string;
  fifoSequence: number;
  amount: string;
  status: SubmittedPaymentOrderStatus;
  cmAcknowledgement: string;
  holdReason: string;
  rejectReason: string;
  cancellationReason: string;
  cancelledAt: string;
  cancelledBy: string;
  reversalLedgerPosted: boolean;
}

interface Ctx {
  invoices: SubmittedInvoice[];
  addSubmittedInvoice: (inv: SubmittedInvoice) => void;
  updateSubmittedInvoice: (id: string, patch: Partial<SubmittedInvoice>) => void;
  removeSubmittedInvoice: (id: string) => void;
  appendHistory: (id: string, entry: ProcessingHistoryEntry) => void;
}

const LS_KEY = "ifmis_submitted_invoices_v1";
const SubmittedInvoiceCtx = createContext<Ctx | null>(null);

/**
 * Migrates legacy ESG tag shape {environment, social, gender} into the new
 * canonical {categories: string[]} shape so historical invoices stay valid
 * after the master-data-driven refactor. "gender" is mapped to "Governance"
 * per the updated ESG pillar taxonomy (RGoB gender-responsive budgeting is
 * rolled into the Governance pillar).
 */
function normaliseEsg(esg: unknown): EsgTag | null {
  if (!esg || typeof esg !== "object") return null;
  const e = esg as Record<string, unknown>;
  if (Array.isArray(e.categories)) {
    return {
      categories: (e.categories as unknown[]).filter((c) => typeof c === "string") as string[],
      taggedBy: typeof e.taggedBy === "string" ? e.taggedBy : "",
      taggedAt: typeof e.taggedAt === "string" ? e.taggedAt : "",
    };
  }
  const categories: string[] = [];
  if (e.environment === true) categories.push("Environment");
  if (e.social === true) categories.push("Social");
  if (e.gender === true || e.governance === true) categories.push("Governance");
  return {
    categories,
    taggedBy: typeof e.taggedBy === "string" ? e.taggedBy : "",
    taggedAt: typeof e.taggedAt === "string" ? e.taggedAt : "",
  };
}

function normaliseInvoice(inv: SubmittedInvoice): SubmittedInvoice {
  return { ...inv, esg: normaliseEsg(inv.esg) };
}

function readStorage(): SubmittedInvoice[] {
  if (typeof window === "undefined") return SEED_SUBMITTED_INVOICES;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    /* First-ever load → seed so the Invoice Processing queue has data */
    if (!raw) return SEED_SUBMITTED_INVOICES.map(normaliseInvoice);
    const parsed = JSON.parse(raw) as SubmittedInvoice[];
    if (!Array.isArray(parsed)) return SEED_SUBMITTED_INVOICES.map(normaliseInvoice);
    if (parsed.length === 0) return SEED_SUBMITTED_INVOICES.map(normaliseInvoice);
    /* Merge seed + stored by ifmisNumber so the seed queue is always present
       alongside any invoices the user has since produced. Stored invoices win
       over the seed when both share an ifmisNumber. */
    const byKey = new Map<string, SubmittedInvoice>();
    for (const s of SEED_SUBMITTED_INVOICES) byKey.set(s.ifmisNumber, normaliseInvoice(s));
    for (const p of parsed) byKey.set(p.ifmisNumber, normaliseInvoice(p));
    return Array.from(byKey.values());
  } catch {
    return SEED_SUBMITTED_INVOICES.map(normaliseInvoice);
  }
}

export function SubmittedInvoiceProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<SubmittedInvoice[]>(() => readStorage());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(invoices));
  }, [invoices]);

  const addSubmittedInvoice = useCallback((inv: SubmittedInvoice) => {
    setInvoices((cur) => {
      // de-dupe by ifmisNumber so re-clicks don't create copies
      const without = cur.filter((i) => i.ifmisNumber !== inv.ifmisNumber);
      return [inv, ...without];
    });
  }, []);

  const updateSubmittedInvoice = useCallback((id: string, patch: Partial<SubmittedInvoice>) => {
    setInvoices((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const removeSubmittedInvoice = useCallback((id: string) => {
    setInvoices((cur) => cur.filter((i) => i.id !== id));
  }, []);

  const appendHistory = useCallback((id: string, entry: ProcessingHistoryEntry) => {
    setInvoices((cur) =>
      cur.map((i) => (i.id === id ? { ...i, history: [...i.history, entry] } : i)),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({ invoices, addSubmittedInvoice, updateSubmittedInvoice, removeSubmittedInvoice, appendHistory }),
    [invoices, addSubmittedInvoice, updateSubmittedInvoice, removeSubmittedInvoice, appendHistory],
  );

  return <SubmittedInvoiceCtx.Provider value={value}>{children}</SubmittedInvoiceCtx.Provider>;
}

export function useSubmittedInvoices(): Ctx {
  const ctx = useContext(SubmittedInvoiceCtx);
  if (!ctx) throw new Error("useSubmittedInvoices must be used within SubmittedInvoiceProvider");
  return ctx;
}
