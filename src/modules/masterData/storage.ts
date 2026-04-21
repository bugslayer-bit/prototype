/* ═══════════════════════════════════════════════════════════════════════════
   Master Data · Shared storage / loaders
   ──────────────────────────────────────
   Single source of truth for the two configurable master-data artefacts that
   downstream Invoice & Bill flows depend on:

     1. Invoice Numbering Format  → drives DD 15.4 Invoice_Number generation
     2. Document Requirement List → drives BR 15.12 / DD 15.15-15.20 validation

   All UIs (MasterDataPage cards) and consumers (InvoiceBillDataContext,
   InvoiceValidationSection, InvoiceSubmissionPage) MUST import from this
   module so the user-configured values flow through every process.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Invoice Numbering Format ───────────────────────────────────────────── */

export interface NumberingConfig {
  pattern: string;
  resetRule: "Annual" | "Continuous" | "Monthly";
  agencyPrefix: string;
  contractTypePrefix: string;
  fundingSourcePrefix: string;
  separateInterfaceManual: boolean;
  active: boolean;
}

export const DEFAULT_NUMBERING_CONFIG: NumberingConfig = {
  pattern: "INV-{FY}-{AGY}-{SEQ}",
  resetRule: "Annual",
  agencyPrefix: "",
  contractTypePrefix: "",
  fundingSourcePrefix: "",
  separateInterfaceManual: false,
  active: true,
};

export const NUMBERING_STORAGE_KEY = "ifmis.masterData.invoiceNumberingFormat";

export function loadInvoiceNumberingFormat(): NumberingConfig {
  if (typeof window === "undefined") return DEFAULT_NUMBERING_CONFIG;
  try {
    const raw = window.localStorage.getItem(NUMBERING_STORAGE_KEY);
    if (!raw) return DEFAULT_NUMBERING_CONFIG;
    return { ...DEFAULT_NUMBERING_CONFIG, ...(JSON.parse(raw) as Partial<NumberingConfig>) };
  } catch {
    return DEFAULT_NUMBERING_CONFIG;
  }
}

export function saveInvoiceNumberingFormat(cfg: NumberingConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NUMBERING_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore quota errors */
  }
}

export interface FormatInvoiceContext {
  /** Numeric sequence (will be padded to 6 digits). */
  seq: number | string;
  /** Channel — used when separateInterfaceManual is enabled. */
  channel?: "manual" | "interface" | "portal" | "api" | string;
  /** Optional override prefixes for this specific call. */
  agencyPrefix?: string;
  contractTypePrefix?: string;
  fundingSourcePrefix?: string;
  /** Reference date — defaults to "now". */
  date?: Date;
}

/** Apply the numbering pattern, replacing every supported token with the
 *  configured prefixes / runtime values. */
export function formatInvoiceNumber(
  cfg: NumberingConfig,
  ctx: FormatInvoiceContext,
): string {
  const now = ctx.date ?? new Date();
  const fy = `FY${String(now.getFullYear()).slice(-2)}`;
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seqStr = typeof ctx.seq === "number"
    ? String(ctx.seq).padStart(6, "0")
    : String(ctx.seq);

  let out = cfg.pattern
    .replace(/\{FY\}/g, fy)
    .replace(/\{YYYY\}/g, String(now.getFullYear()))
    .replace(/\{MM\}/g, month)
    .replace(/\{AGY\}/g, ctx.agencyPrefix || cfg.agencyPrefix || "AGY")
    .replace(/\{CTYPE\}/g, ctx.contractTypePrefix || cfg.contractTypePrefix || "GDS")
    .replace(/\{FUND\}/g, ctx.fundingSourcePrefix || cfg.fundingSourcePrefix || "RGOB")
    .replace(/\{SEQ\}/g, seqStr);

  if (cfg.separateInterfaceManual) {
    const c = (ctx.channel || "manual").toLowerCase();
    const tag = c === "interface" || c === "api" ? "I" : "M";
    out = `${tag}-${out}`;
  }
  return out;
}

/* ── Document Requirement List ──────────────────────────────────────────── */

export type Category = "Goods" | "Works" | "Services";

export interface DocRequirement {
  id: string;
  docType: string;
  mandatory: boolean;
  validityDays: string;
  signatoryRole: string;
  conditionalRule: string;
}

export interface CategoryConfig {
  items: DocRequirement[];
  effectiveDate: string;
  templateVersion: string;
  active: boolean;
}

export type DocReqStore = Record<Category, CategoryConfig>;

export const DOC_REQ_STORAGE_KEY = "ifmis.masterData.docRequirementList";

const today = () => new Date().toISOString().slice(0, 10);
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 11)}`;

export const DEFAULT_DOC_ITEMS: Record<Category, DocRequirement[]> = {
  Goods: [
    { id: uid(), docType: "Invoice Copy", mandatory: true, validityDays: "", signatoryRole: "Contractor", conditionalRule: "" },
    { id: uid(), docType: "Goods Received Note (GRN)", mandatory: true, validityDays: "", signatoryRole: "Stores / Receiving Officer", conditionalRule: "" },
    { id: uid(), docType: "Way-Bill", mandatory: false, validityDays: "", signatoryRole: "Logistics", conditionalRule: "" },
  ],
  Works: [
    { id: uid(), docType: "Invoice Copy", mandatory: true, validityDays: "", signatoryRole: "Contractor", conditionalRule: "" },
    { id: uid(), docType: "Measurement Book Extract", mandatory: true, validityDays: "", signatoryRole: "Site Engineer", conditionalRule: "" },
    { id: uid(), docType: "Completion Certificate", mandatory: true, validityDays: "", signatoryRole: "Engineer-in-Charge", conditionalRule: "Final bill only" },
  ],
  Services: [
    { id: uid(), docType: "Invoice Copy", mandatory: true, validityDays: "", signatoryRole: "Contractor", conditionalRule: "" },
    { id: uid(), docType: "Service Delivery Report", mandatory: true, validityDays: "", signatoryRole: "User Dept. Head", conditionalRule: "" },
    { id: uid(), docType: "Timesheet", mandatory: false, validityDays: "", signatoryRole: "Service Provider", conditionalRule: "Hourly-rated contracts" },
  ],
};

export const DEFAULT_DOC_REQ_STORE: DocReqStore = {
  Goods: { items: DEFAULT_DOC_ITEMS.Goods, effectiveDate: today(), templateVersion: "1.0", active: true },
  Works: { items: DEFAULT_DOC_ITEMS.Works, effectiveDate: today(), templateVersion: "1.0", active: true },
  Services: { items: DEFAULT_DOC_ITEMS.Services, effectiveDate: today(), templateVersion: "1.0", active: true },
};

export function loadDocRequirementList(): DocReqStore {
  if (typeof window === "undefined") return DEFAULT_DOC_REQ_STORE;
  try {
    const raw = window.localStorage.getItem(DOC_REQ_STORAGE_KEY);
    if (!raw) return DEFAULT_DOC_REQ_STORE;
    const parsed = JSON.parse(raw) as Partial<DocReqStore>;
    return { ...DEFAULT_DOC_REQ_STORE, ...parsed } as DocReqStore;
  } catch {
    return DEFAULT_DOC_REQ_STORE;
  }
}

export function saveDocRequirementList(s: DocReqStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOC_REQ_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Resolve a category name to one of the canonical Goods/Works/Services
 *  buckets — falls back to "Goods" so downstream code never breaks. */
export function normaliseCategory(raw: string | null | undefined): Category {
  const s = (raw || "").toLowerCase();
  if (s.includes("work")) return "Works";
  if (s.includes("serv")) return "Services";
  return "Goods";
}

export interface RequiredDocSummary {
  docType: string;
  mandatory: boolean;
  signatoryRole: string;
  conditionalRule: string;
  validityDays: string;
}

/** Returns the *active* mandatory + optional documents configured for the
 *  given contract category. Used by InvoiceValidationSection to drive the
 *  "All mandatory documents attached" check dynamically. */
export function getRequiredDocsForCategory(
  raw: string | null | undefined,
): RequiredDocSummary[] {
  const cat = normaliseCategory(raw);
  const store = loadDocRequirementList();
  const cfg = store[cat];
  if (!cfg?.active) return [];
  return cfg.items.map((it) => ({
    docType: it.docType,
    mandatory: it.mandatory,
    signatoryRole: it.signatoryRole,
    conditionalRule: it.conditionalRule,
    validityDays: it.validityDays,
  }));
}

/** Convenience helper — only the mandatory docTypes for the given category. */
export function getMandatoryDocTypesForCategory(
  raw: string | null | undefined,
): string[] {
  return getRequiredDocsForCategory(raw)
    .filter((d) => d.mandatory)
    .map((d) => d.docType);
}

/* ── Reversal Authorisation reasons ─────────────────────────────────────── */

export const REVERSAL_REASONS_KEY = "ifmis.masterData.reversalReasons";

export const DEFAULT_REVERSAL_REASONS: string[] = [
  "Duplicate payment detected",
  "Wrong payee account",
  "Wrong amount captured",
  "Contract / bill data invalid",
  "Court / arbitration order",
  "Administrative correction",
  "Fraud / suspected fraud",
];

export function loadReversalReasons(): string[] {
  if (typeof window === "undefined") return DEFAULT_REVERSAL_REASONS;
  try {
    const raw = window.localStorage.getItem(REVERSAL_REASONS_KEY);
    if (!raw) return DEFAULT_REVERSAL_REASONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_REVERSAL_REASONS;
  } catch {
    return DEFAULT_REVERSAL_REASONS;
  }
}

export function saveReversalReasons(reasons: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVERSAL_REASONS_KEY, JSON.stringify(reasons));
  } catch {
    /* ignore */
  }
}

/* ── Payment Order Cancellation reasons ─────────────────────────────────── */

export const PO_CANCEL_REASONS_KEY = "ifmis.masterData.poCancellationReasons";

export const DEFAULT_PO_CANCEL_REASONS: string[] = [
  "Generated by mistake (not paid)",
  "Vendor's bank closed / frozen",
  "Any invalid data contained",
  "Administrative decision",
];

export function loadPoCancellationReasons(): string[] {
  if (typeof window === "undefined") return DEFAULT_PO_CANCEL_REASONS;
  try {
    const raw = window.localStorage.getItem(PO_CANCEL_REASONS_KEY);
    if (!raw) return DEFAULT_PO_CANCEL_REASONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_PO_CANCEL_REASONS;
  } catch {
    return DEFAULT_PO_CANCEL_REASONS;
  }
}

export function savePoCancellationReasons(reasons: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PO_CANCEL_REASONS_KEY, JSON.stringify(reasons));
  } catch {
    /* ignore */
  }
}

/* ── Cash Management Acknowledgement statuses (PO Creation row 19) ──────── */

export type PoAckStatus = "cleared" | "hold" | "rejected";

export interface PoAckOption {
  value: PoAckStatus;
  label: string;
  hint: string;
}

export const PO_ACK_OPTIONS: PoAckOption[] = [
  { value: "cleared", label: "Cleared by Cash Management", hint: "Payment Order instruction issued" },
  { value: "hold", label: "Hold with reasons", hint: "Temporarily held — capture justification" },
  { value: "rejected", label: "Rejected with reasons", hint: "PO rejected — capture justification" },
];
