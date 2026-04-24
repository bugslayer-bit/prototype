/* ═══════════════════════════════════════════════════════════════════════════
   OPS Travel Claims — shared store
   ───────────────────────────────────────────────────────────────────
   The OPS Travel Claims workflow spans three sub-pages (Claim List, Payment
   Order, POST Payment) that all read and mutate the same list of claims.
   This module hoists that list to a session-persisted store so the three
   pages stay in sync without a React context provider.

   TravelClaim shape mirrors SRS §1–§4:
     • Initiate (receivedFromEdatsDate / approvedTARefNo / payment mode)
     • Validation snapshot (SRS §2)
     • Payment Transaction + Payment Order (SRS §3)
     • Payment Advice + MCP posting (SRS §3b–§3c)
     • e-DATS post-back metadata (SRS §4)
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import {
  generateTransactionAndOrder,
  generatePaymentAdvice,
  postAdviceToMcp,
  markAdviceReleased,
  markOrderStatus,
  type PaymentOrderMode,
} from "./travelPaymentTransactions";
import { enqueueTravelEdatsDispatch, markDispatched } from "./travelEdatsDispatches";

const STORAGE_KEY = "ifmis.ops.travelClaims.v1";
const BOOTSTRAP_FLAG = "ifmis.ops.travelBootstrap.v2";

export type TravelClaimStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "approved"
  | "advice-generated"
  | "posted-to-mcp"
  | "paid"
  | "rejected";

export interface TravelClaimValidationResult {
  status: "pass" | "fail";
  message: string;
}

export type TravelClaimCategory = "civil-servant" | "other-public-servant";

export interface TravelClaim {
  id: string;
  refNo: string;
  /** Whether the travelling employee is a civil servant or an OPS employee.
   *  Drives which sub-page (CS or OPS) renders the claim. */
  category: TravelClaimCategory;
  employeeId: string;
  employeeName: string;
  positionTitle: string;
  cid: string;
  agencyName: string;
  agencyCode: string;
  travelType: "domestic" | "foreign";
  amount: number;
  approvedAdvanceAmount: number;
  currency: "BTN" | "USD" | "EUR" | "INR" | "GBP";
  exchangeRate?: number;
  purpose: string;
  travelPurpose: string;
  startDate: string;
  endDate: string;
  destination: string;
  countryOfTravel?: string;
  status: TravelClaimStatus;
  budgetCode: string;
  /** SRS §2 — snapshot of the three validation checks taken at create time. */
  validationResults?: {
    employee:  TravelClaimValidationResult;
    budget:    TravelClaimValidationResult;
    duplicate: TravelClaimValidationResult;
  };
  createdDate: string;
  approvedDate?: string;
  dateOfApproval?: string;
  /** SRS §1 — date the record was fetched from e-DATS. */
  receivedFromEdatsDate?: string;
  approvedTARefNo?: string;
  paymentTransactionRef?: string;
  paymentOrderId?: string;
  /** SRS §3b — Payment Advice generated after approval. */
  paymentAdviceId?: string;
  adviceGeneratedAt?: string;
  /** SRS §3c — MCP posting. */
  mcpJournalEntryId?: string;
  mcpPostedAt?: string;
  advanceStatus?: "draft" | "submitted" | "approved" | "paid" | "rejected";
  planStatus?: "draft" | "submitted" | "approved" | "completed" | "cancelled";
  /** SRS §3 — payment mode toggle (bank / cash). */
  paymentMode?: PaymentOrderMode;
  cashCollectorName?: string;
  cashCollectorCid?: string;
  cashCollectorRelationship?: string;
  /** SRS §3 — foreign-travel extras. */
  bankCharges?: number;
  bankChargesBudgetCode?: string;
  fxConversionCharges?: number;
  fxChargesBudgetCode?: string;
  /** Reason when claim is rejected (SRS §4). */
  rejectedReason?: string;
  paidAt?: string;
}

/* ── Seed data — covers both categories + every pipeline stage so the
     Claim List, Payment Order, and POST Payment sub-pages all show
     realistic sample data on a fresh session. ──────────────────────────── */
const SEED_CLAIMS: TravelClaim[] = [
  /* ── OPS ─────────────────────────────────────────────────────────── */
  {
    id: "ops-1", refNo: "TRV-2026-OPS-001", category: "other-public-servant",
    employeeId: "MEMP-00000001", employeeName: "Tenzin Dorji", positionTitle: "Director",
    cid: "19800115000101", agencyName: "Ministry of Health", agencyCode: "01",
    travelType: "domestic", amount: 25000, approvedAdvanceAmount: 25000, currency: "BTN",
    purpose: "Training Program", travelPurpose: "Training Program - Capacity Building",
    startDate: "2026-04-15", endDate: "2026-04-22", destination: "Thimphu",
    status: "approved", budgetCode: "HE-01-001", paymentMode: "bank",
    createdDate: "2026-03-20", approvedDate: "2026-04-01", dateOfApproval: "2026-04-01",
    approvedTARefNo: "TA-2026-00001",
  },
  {
    id: "ops-2", refNo: "TRV-2026-OPS-002", category: "other-public-servant",
    employeeId: "MEMP-00000002", employeeName: "Kinley Tshering", positionTitle: "Deputy Director",
    cid: "19850220000202", agencyName: "Ministry of Education", agencyCode: "02",
    travelType: "foreign", amount: 2500, approvedAdvanceAmount: 2500, currency: "USD", exchangeRate: 88.5,
    purpose: "Conference", travelPurpose: "Conference - International Development",
    startDate: "2026-05-01", endDate: "2026-05-07", destination: "New Delhi, India", countryOfTravel: "India",
    status: "submitted", budgetCode: "HE-01-002", paymentMode: "bank",
    createdDate: "2026-04-05", dateOfApproval: "2026-04-10", approvedTARefNo: "TA-2026-00002",
  },
  {
    id: "ops-3", refNo: "TRV-2026-OPS-003", category: "other-public-servant",
    employeeId: "MEMP-00000003", employeeName: "Dorji Penjor", positionTitle: "Senior Officer",
    cid: "19880325000303", agencyName: "Ministry of Finance", agencyCode: "03",
    travelType: "foreign", amount: 3500, approvedAdvanceAmount: 3500, currency: "USD", exchangeRate: 88.5,
    purpose: "Training", travelPurpose: "International Training Program",
    startDate: "2026-06-01", endDate: "2026-06-14", destination: "Bangkok, Thailand", countryOfTravel: "Thailand",
    status: "paid", budgetCode: "HE-02-001", paymentMode: "bank",
    bankCharges: 450, bankChargesBudgetCode: "HE-BC-001",
    fxConversionCharges: 680, fxChargesBudgetCode: "HE-FX-001",
    createdDate: "2026-03-15", approvedDate: "2026-03-28", dateOfApproval: "2026-03-28",
    approvedTARefNo: "TA-2026-00003", paidAt: "2026-05-10",
  },
  {
    id: "ops-4", refNo: "TRV-2026-OPS-004", category: "other-public-servant",
    employeeId: "MEMP-00000004", employeeName: "Sonam Choden", positionTitle: "Program Officer",
    cid: "19900401000404", agencyName: "Royal Bhutan Police", agencyCode: "09",
    travelType: "domestic", amount: 18000, approvedAdvanceAmount: 18000, currency: "BTN",
    purpose: "Field Inspection", travelPurpose: "Border Post Inspection",
    startDate: "2026-04-25", endDate: "2026-04-30", destination: "Phuentsholing",
    status: "advice-generated", budgetCode: "HE-03-001", paymentMode: "bank",
    createdDate: "2026-03-28", approvedDate: "2026-04-05", dateOfApproval: "2026-04-05",
    approvedTARefNo: "TA-2026-00004",
  },
  {
    id: "ops-5", refNo: "TRV-2026-OPS-005", category: "other-public-servant",
    employeeId: "MEMP-00000005", employeeName: "Karma Wangdi", positionTitle: "Finance Officer",
    cid: "19851015000505", agencyName: "Ministry of Finance", agencyCode: "03",
    travelType: "foreign", amount: 1800, approvedAdvanceAmount: 1800, currency: "USD", exchangeRate: 88.5,
    purpose: "Workshop", travelPurpose: "Regional Finance Workshop",
    startDate: "2026-05-20", endDate: "2026-05-26", destination: "Kathmandu, Nepal", countryOfTravel: "Nepal",
    status: "posted-to-mcp", budgetCode: "HE-FT-002", paymentMode: "bank",
    bankCharges: 350, bankChargesBudgetCode: "HE-BC-001",
    fxConversionCharges: 500, fxChargesBudgetCode: "HE-FX-001",
    createdDate: "2026-04-02", approvedDate: "2026-04-12", dateOfApproval: "2026-04-12",
    approvedTARefNo: "TA-2026-00005",
  },
  {
    id: "ops-6", refNo: "TRV-2026-OPS-006", category: "other-public-servant",
    employeeId: "MEMP-00000006", employeeName: "Dechen Yangzom", positionTitle: "HR Officer",
    cid: "19920712000606", agencyName: "Ministry of Health", agencyCode: "01",
    travelType: "domestic", amount: 12000, approvedAdvanceAmount: 12000, currency: "BTN",
    purpose: "Recruitment", travelPurpose: "Dzongkhag Recruitment Drive",
    startDate: "2026-05-10", endDate: "2026-05-14", destination: "Mongar",
    status: "paid", budgetCode: "HE-04-001", paymentMode: "cash",
    cashCollectorName: "Dechen Yangzom", cashCollectorCid: "19920712000606", cashCollectorRelationship: "Self",
    createdDate: "2026-04-08", approvedDate: "2026-04-18", dateOfApproval: "2026-04-18",
    approvedTARefNo: "TA-2026-00006", paidAt: "2026-04-25",
  },
  /* ── Civil Service ───────────────────────────────────────────────── */
  {
    id: "cs-1", refNo: "TRV-2026-CS-001", category: "civil-servant",
    employeeId: "EMP-CS-10001", employeeName: "Pema Wangchuk", positionTitle: "Joint Secretary",
    cid: "10245678901", agencyName: "Ministry of Finance", agencyCode: "16",
    travelType: "domestic", amount: 22000, approvedAdvanceAmount: 22000, currency: "BTN",
    purpose: "Site Review", travelPurpose: "FY Budget Implementation Review",
    startDate: "2026-04-18", endDate: "2026-04-24", destination: "Gelephu",
    status: "approved", budgetCode: "MF-01-001", paymentMode: "bank",
    createdDate: "2026-03-22", approvedDate: "2026-04-02", dateOfApproval: "2026-04-02",
    approvedTARefNo: "TA-2026-10001",
  },
  {
    id: "cs-2", refNo: "TRV-2026-CS-002", category: "civil-servant",
    employeeId: "EMP-CS-10002", employeeName: "Choki Dorji", positionTitle: "Chief Engineer",
    cid: "10345678902", agencyName: "Ministry of Infrastructure & Transport", agencyCode: "22",
    travelType: "foreign", amount: 4200, approvedAdvanceAmount: 4200, currency: "USD", exchangeRate: 88.5,
    purpose: "Study Tour", travelPurpose: "Road Infrastructure Study Tour",
    startDate: "2026-05-10", endDate: "2026-05-18", destination: "Singapore", countryOfTravel: "Singapore",
    status: "advice-generated", budgetCode: "MIT-FT-001", paymentMode: "bank",
    bankCharges: 500, bankChargesBudgetCode: "MIT-BC-001",
    fxConversionCharges: 800, fxChargesBudgetCode: "MIT-FX-001",
    createdDate: "2026-03-30", approvedDate: "2026-04-12", dateOfApproval: "2026-04-12",
    approvedTARefNo: "TA-2026-10002",
  },
  {
    id: "cs-3", refNo: "TRV-2026-CS-003", category: "civil-servant",
    employeeId: "EMP-CS-10003", employeeName: "Jigme Tenzin", positionTitle: "Director",
    cid: "10445678903", agencyName: "Ministry of Education", agencyCode: "19",
    travelType: "foreign", amount: 3200, approvedAdvanceAmount: 3200, currency: "EUR", exchangeRate: 96.2,
    purpose: "Conference", travelPurpose: "Education Policy Conference",
    startDate: "2026-04-08", endDate: "2026-04-14", destination: "Geneva, Switzerland", countryOfTravel: "Switzerland",
    status: "posted-to-mcp", budgetCode: "MOE-FT-001", paymentMode: "bank",
    bankCharges: 600, bankChargesBudgetCode: "MOE-BC-001",
    fxConversionCharges: 950, fxChargesBudgetCode: "MOE-FX-001",
    createdDate: "2026-03-01", approvedDate: "2026-03-12", dateOfApproval: "2026-03-12",
    approvedTARefNo: "TA-2026-10003",
  },
  {
    id: "cs-4", refNo: "TRV-2026-CS-004", category: "civil-servant",
    employeeId: "EMP-CS-10004", employeeName: "Yangchen Lhamo", positionTitle: "Senior HR Officer",
    cid: "10545678904", agencyName: "Royal Civil Service Commission", agencyCode: "45",
    travelType: "domestic", amount: 14500, approvedAdvanceAmount: 14500, currency: "BTN",
    purpose: "Recruitment", travelPurpose: "RCSC Dzongkhag Hiring Visit",
    startDate: "2026-04-20", endDate: "2026-04-23", destination: "Trashigang",
    status: "paid", budgetCode: "RCSC-01-001", paymentMode: "bank",
    createdDate: "2026-03-25", approvedDate: "2026-04-04", dateOfApproval: "2026-04-04",
    approvedTARefNo: "TA-2026-10004", paidAt: "2026-04-15",
  },
  {
    id: "cs-5", refNo: "TRV-2026-CS-005", category: "civil-servant",
    employeeId: "EMP-CS-10005", employeeName: "Ugyen Dorji", positionTitle: "Program Manager",
    cid: "10645678905", agencyName: "Ministry of Agriculture & Livestock", agencyCode: "18",
    travelType: "domestic", amount: 9500, approvedAdvanceAmount: 9500, currency: "BTN",
    purpose: "Farmer Training", travelPurpose: "Organic Farming Workshop",
    startDate: "2026-05-05", endDate: "2026-05-08", destination: "Bumthang",
    status: "submitted", budgetCode: "MOAL-01-001", paymentMode: "cash",
    cashCollectorName: "Ugyen Dorji", cashCollectorCid: "10645678905", cashCollectorRelationship: "Self",
    createdDate: "2026-04-10", dateOfApproval: "2026-04-14", approvedTARefNo: "TA-2026-10005",
  },
];

/* ── Internal state ─────────────────────────────────────────────────────── */
let claims: TravelClaim[] = [];
const listeners = new Set<() => void>();

function loadFromStorage(): TravelClaim[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

/** On a fresh session, materialise companion records (TravelPaymentTransaction,
 *  TravelPaymentOrder, TravelPaymentAdvice, MCP journal entry, and TravelEdats
 *  post-back dispatch) for every seed claim whose stage requires them. This
 *  keeps the Payment Order + POST Payment sub-pages populated from the start.
 *
 *  Returns the seed claims decorated with the IDs of the companion records
 *  that were just created. */
function bootstrapCompanionStoresAndAttachIds(seed: TravelClaim[]): TravelClaim[] {
  return seed.map((claim) => {
    const needsTxnPo =
      claim.status === "approved" ||
      claim.status === "advice-generated" ||
      claim.status === "posted-to-mcp" ||
      claim.status === "paid";

    if (!needsTxnPo) return claim;

    const { transaction, order } = generateTransactionAndOrder({
      claimId: claim.id,
      claimRefNo: claim.refNo,
      approvedTARefNo: claim.approvedTARefNo ?? "",
      employeeId: claim.employeeId,
      employeeName: claim.employeeName,
      employeeCid: claim.cid,
      agencyCode: claim.agencyCode,
      budgetCode: claim.budgetCode,
      travelType: claim.travelType,
      currency: claim.currency,
      advanceAmount: claim.approvedAdvanceAmount || claim.amount,
      bankCharges: claim.bankCharges,
      fxConversionCharges: claim.fxConversionCharges,
      mode: claim.paymentMode ?? "bank",
      bankName: claim.paymentMode === "cash" ? undefined : "Bank of Bhutan",
      bankAccountNumber: claim.paymentMode === "cash" ? undefined : `BoB-${claim.cid.slice(-8)}`,
      bankBranch: claim.paymentMode === "cash" ? undefined : "Thimphu Main",
      cashCollectorName: claim.cashCollectorName,
      cashCollectorCid: claim.cashCollectorCid,
      cashCollectorRelationship: claim.cashCollectorRelationship,
    });

    let paymentAdviceId: string | undefined;
    let adviceGeneratedAt: string | undefined;
    let mcpJournalEntryId: string | undefined;
    let mcpPostedAt: string | undefined;

    const needsAdvice =
      claim.status === "advice-generated" ||
      claim.status === "posted-to-mcp" ||
      claim.status === "paid";

    if (needsAdvice) {
      const advice = generatePaymentAdvice(claim.id);
      if (advice) {
        paymentAdviceId = advice.id;
        adviceGeneratedAt = advice.generatedAt;
      }
    }

    const needsMcpPost =
      claim.status === "posted-to-mcp" || claim.status === "paid";

    if (needsMcpPost && paymentAdviceId) {
      const posted = postAdviceToMcp(paymentAdviceId);
      if (posted) {
        mcpJournalEntryId = posted.mcpJournalEntryId;
        mcpPostedAt = posted.postedToMcpAt;
      }
    }

    if (claim.status === "paid") {
      if (paymentAdviceId) markAdviceReleased(paymentAdviceId);
      markOrderStatus(order.id, "settled");
      if (claim.approvedTARefNo) {
        /* Enqueue a dispatch and immediately mark it dispatched so the POST
           Payment page shows the record as already handed off. */
        const dispatch = enqueueTravelEdatsDispatch({
          claimId: claim.id,
          approvedTARefNo: claim.approvedTARefNo,
          paymentTransactionRef: transaction.id,
          transactionStatus: "paid",
          dateOfPayment: claim.paidAt ?? new Date().toISOString().split("T")[0],
          amountPaid: claim.approvedAdvanceAmount || claim.amount,
          currency: claim.currency,
        });
        markDispatched(dispatch.id);
      }
    }

    return {
      ...claim,
      paymentTransactionRef: transaction.id,
      paymentOrderId: order.id,
      paymentAdviceId,
      adviceGeneratedAt,
      mcpJournalEntryId,
      mcpPostedAt,
    };
  });
}

function runBootstrap(): TravelClaim[] {
  const cached = loadFromStorage();
  if (cached && cached.length > 0) return cached;
  if (typeof window === "undefined") return SEED_CLAIMS;
  const alreadyBootstrapped = !!window.sessionStorage.getItem(BOOTSTRAP_FLAG);
  if (alreadyBootstrapped) return SEED_CLAIMS;
  const enriched = bootstrapCompanionStoresAndAttachIds(SEED_CLAIMS);
  try {
    window.sessionStorage.setItem(BOOTSTRAP_FLAG, "1");
  } catch { /* ignore */ }
  return enriched;
}

claims = runBootstrap();
/* Persist initial claim state after bootstrap so reloads find it in storage
   and don't re-run the companion bootstrap. */
if (typeof window !== "undefined") {
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(claims)); } catch { /* ignore */ }
}

function save() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  } catch { /* swallow quota */ }
}

function emit() {
  save();
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

/* ─── Public API ────────────────────────────────────────────────────────── */

export function listClaims(): TravelClaim[] {
  return [...claims];
}

export function getClaimById(id: string): TravelClaim | undefined {
  return claims.find((c) => c.id === id);
}

/** Same signature as React's setState — accepts a value or updater fn. */
export function setClaims(
  next: TravelClaim[] | ((prev: TravelClaim[]) => TravelClaim[]),
): void {
  claims = typeof next === "function"
    ? (next as (prev: TravelClaim[]) => TravelClaim[])([...claims])
    : [...next];
  emit();
}

export function addClaim(claim: TravelClaim): void {
  claims = [...claims, claim];
  emit();
}

export function updateClaim(id: string, patch: Partial<TravelClaim>): void {
  claims = claims.map((c) => (c.id === id ? { ...c, ...patch } : c));
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Live claims list — re-renders on every store change. */
export function useTravelClaims(): TravelClaim[] {
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);
  return listClaims();
}
