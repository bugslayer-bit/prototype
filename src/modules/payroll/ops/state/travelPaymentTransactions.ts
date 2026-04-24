/* ═══════════════════════════════════════════════════════════════════════════
   Travel Payment Transactions + Payment Orders
   ───────────────────────────────────────────────────────────────────
   Persistent (sessionStorage) store that models the two records SRS §3
   requires on approval of a travel advance claim:

     1. TravelPaymentTransaction — auto-generated when a claim is approved.
        Carries the IFMIS transaction ref, the source claim ref, the
        approving role, and financial totals (advance + any foreign
        charges). This is the accounting event.

     2. TravelPaymentOrder — auto-generated alongside the transaction.
        Carries the payee (bank or cash), amount + currency, and status
        tracking for downstream PO actions (sent-to-bank, printed,
        employee-downloaded).

   Both stores are keyed by the parent claim id so a single claim always
   maps 1:1 to one transaction and one order — re-approving a rejected
   claim replaces the prior pair.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";

const TXN_KEY = "ifmis.travel.paymentTransactions.v1";
const PO_KEY  = "ifmis.travel.paymentOrders.v1";
const PA_KEY  = "ifmis.travel.paymentAdvices.v1";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface TravelPaymentTransaction {
  id: string;                       // IFMIS-YYYY-XXXXX
  claimId: string;
  claimRefNo: string;
  approvedTARefNo: string;
  employeeId: string;
  employeeName: string;
  agencyCode: string;
  budgetCode: string;
  travelType: "domestic" | "foreign";
  currency: string;
  advanceAmount: number;
  bankCharges?: number;             // foreign only
  fxConversionCharges?: number;     // foreign only
  totalAmount: number;              // advance + charges
  createdAt: string;
  createdByRoleId?: string | null;
}

export type PaymentOrderMode = "bank" | "cash";
export type PaymentOrderStatus =
  | "ready"          // generated, not yet dispatched
  | "sent-to-bank"   // pushed to bank integration queue
  | "printed"        // user printed for manual transmission
  | "employee-copy"  // employee downloaded their copy (foreign)
  | "settled";       // bank confirmed / cash disbursed

export interface TravelPaymentOrder {
  id: string;                       // PO-YYYY-XXXXX
  claimId: string;
  transactionId: string;
  employeeId: string;
  employeeName: string;
  employeeCid: string;
  mode: PaymentOrderMode;
  /* Bank-mode fields */
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  /* Cash-mode fields */
  cashCollectorName?: string;
  cashCollectorCid?: string;
  cashCollectorRelationship?: string;
  /* Money */
  currency: string;
  advanceAmount: number;
  bankCharges?: number;
  fxConversionCharges?: number;
  totalAmount: number;
  /* Tracking */
  status: PaymentOrderStatus;
  generatedAt: string;
  sentToBankAt?: string;
  printedAt?: string;
  employeeDownloadedAt?: string;
  settledAt?: string;
}

/* ─── Payment Advice (SRS §3b + MCP bridge) ────────────────────────────── */

export type PaymentAdviceStatus =
  | "ready"          // advice generated, not yet posted to MCP
  | "posted-to-mcp"  // submitted to Cash Management queue (journal entry created)
  | "released"       // MCP released payment (claim → paid)
  | "rejected-by-mcp";

export interface TravelPaymentAdvice {
  id: string;                      // PA-YYYY-XXXXX
  claimId: string;
  claimRefNo: string;
  transactionId: string;
  paymentOrderId: string;
  approvedTARefNo: string;
  employeeId: string;
  employeeName: string;
  employeeCid: string;
  agencyCode: string;
  budgetCode: string;
  travelType: "domestic" | "foreign";
  currency: string;
  advanceAmount: number;
  bankCharges?: number;
  fxConversionCharges?: number;
  totalAmount: number;
  /* Bank OR cash details — copied from PO for advice preview. */
  paymentMode: PaymentOrderMode;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  cashCollectorName?: string;
  cashCollectorCid?: string;
  /* Lifecycle */
  status: PaymentAdviceStatus;
  generatedAt: string;
  postedToMcpAt?: string;
  mcpJournalEntryId?: string;
  releasedAt?: string;
  rejectionReason?: string;
}

/* ─── Internal state ────────────────────────────────────────────────────── */

let txns: TravelPaymentTransaction[] = loadKey<TravelPaymentTransaction>(TXN_KEY);
let orders: TravelPaymentOrder[] = loadKey<TravelPaymentOrder>(PO_KEY);
let advices: TravelPaymentAdvice[] = loadKey<TravelPaymentAdvice>(PA_KEY);
const listeners = new Set<() => void>();

function loadKey<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TXN_KEY, JSON.stringify(txns));
    window.sessionStorage.setItem(PO_KEY, JSON.stringify(orders));
    window.sessionStorage.setItem(PA_KEY, JSON.stringify(advices));
  } catch { /* swallow quota */ }
}

function emit() {
  persist();
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

function nextTxnId(): string {
  const n = txns.length + 1;
  return `IFMIS-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}
function nextPoId(): string {
  const n = orders.length + 1;
  return `PO-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}
function nextAdviceId(): string {
  const n = advices.length + 1;
  return `PA-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}
function nextMcpJournalId(): string {
  const n = advices.filter((a) => a.mcpJournalEntryId).length + 1;
  return `MCP-TRV-${new Date().getFullYear()}-${String(n).padStart(5, "0")}`;
}

/* ─── Public API ────────────────────────────────────────────────────────── */

export interface GenerateTxnInput {
  claimId: string;
  claimRefNo: string;
  approvedTARefNo: string;
  employeeId: string;
  employeeName: string;
  employeeCid: string;
  agencyCode: string;
  budgetCode: string;
  travelType: "domestic" | "foreign";
  currency: string;
  advanceAmount: number;
  bankCharges?: number;
  fxConversionCharges?: number;
  mode: PaymentOrderMode;
  /* Bank */
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  /* Cash */
  cashCollectorName?: string;
  cashCollectorCid?: string;
  cashCollectorRelationship?: string;
  createdByRoleId?: string | null;
}

/** Create (or replace) a transaction + payment order pair for the claim.
 *  Returns both records for callers to attach IDs to the claim. */
export function generateTransactionAndOrder(
  input: GenerateTxnInput,
): { transaction: TravelPaymentTransaction; order: TravelPaymentOrder } {
  const now = new Date().toISOString();
  const totalAmount = input.advanceAmount + (input.bankCharges ?? 0) + (input.fxConversionCharges ?? 0);

  /* Replace any prior txn/PO for this claim — re-approval scenario. */
  txns = txns.filter((t) => t.claimId !== input.claimId);
  orders = orders.filter((o) => o.claimId !== input.claimId);

  const transaction: TravelPaymentTransaction = {
    id: nextTxnId(),
    claimId: input.claimId,
    claimRefNo: input.claimRefNo,
    approvedTARefNo: input.approvedTARefNo,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    agencyCode: input.agencyCode,
    budgetCode: input.budgetCode,
    travelType: input.travelType,
    currency: input.currency,
    advanceAmount: input.advanceAmount,
    bankCharges: input.bankCharges,
    fxConversionCharges: input.fxConversionCharges,
    totalAmount,
    createdAt: now,
    createdByRoleId: input.createdByRoleId,
  };

  const order: TravelPaymentOrder = {
    id: nextPoId(),
    claimId: input.claimId,
    transactionId: transaction.id,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeCid: input.employeeCid,
    mode: input.mode,
    bankName: input.mode === "bank" ? input.bankName : undefined,
    bankAccountNumber: input.mode === "bank" ? input.bankAccountNumber : undefined,
    bankBranch: input.mode === "bank" ? input.bankBranch : undefined,
    cashCollectorName: input.mode === "cash" ? input.cashCollectorName : undefined,
    cashCollectorCid: input.mode === "cash" ? input.cashCollectorCid : undefined,
    cashCollectorRelationship: input.mode === "cash" ? input.cashCollectorRelationship : undefined,
    currency: input.currency,
    advanceAmount: input.advanceAmount,
    bankCharges: input.bankCharges,
    fxConversionCharges: input.fxConversionCharges,
    totalAmount,
    status: "ready",
    generatedAt: now,
  };

  txns = [transaction, ...txns];
  orders = [order, ...orders];
  emit();
  return { transaction, order };
}

/** Mutate a payment order status with a timestamp. */
export function markOrderStatus(
  orderId: string,
  status: PaymentOrderStatus,
): TravelPaymentOrder | null {
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const current = orders[idx];
  const patch: Partial<TravelPaymentOrder> = { status };
  if (status === "sent-to-bank") patch.sentToBankAt = now;
  if (status === "printed") patch.printedAt = now;
  if (status === "employee-copy") patch.employeeDownloadedAt = now;
  if (status === "settled") patch.settledAt = now;
  const updated: TravelPaymentOrder = { ...current, ...patch };
  orders = [...orders.slice(0, idx), updated, ...orders.slice(idx + 1)];
  emit();
  return updated;
}

export function listTransactions(): TravelPaymentTransaction[] { return [...txns]; }
export function listOrders(): TravelPaymentOrder[] { return [...orders]; }
export function listAdvices(): TravelPaymentAdvice[] { return [...advices]; }

export function getTransactionForClaim(claimId: string): TravelPaymentTransaction | null {
  return txns.find((t) => t.claimId === claimId) ?? null;
}
export function getOrderForClaim(claimId: string): TravelPaymentOrder | null {
  return orders.find((o) => o.claimId === claimId) ?? null;
}
export function getAdviceForClaim(claimId: string): TravelPaymentAdvice | null {
  return advices.find((a) => a.claimId === claimId) ?? null;
}

/** SRS §3b — Generate a Payment Advice from an approved claim's PO + Txn.
 *  Idempotent per claim (replaces any prior advice for the same claim). */
export function generatePaymentAdvice(claimId: string): TravelPaymentAdvice | null {
  const txn = getTransactionForClaim(claimId);
  const po = getOrderForClaim(claimId);
  if (!txn || !po) return null;
  advices = advices.filter((a) => a.claimId !== claimId);
  const advice: TravelPaymentAdvice = {
    id: nextAdviceId(),
    claimId,
    claimRefNo: txn.claimRefNo,
    transactionId: txn.id,
    paymentOrderId: po.id,
    approvedTARefNo: txn.approvedTARefNo,
    employeeId: txn.employeeId,
    employeeName: txn.employeeName,
    employeeCid: po.employeeCid,
    agencyCode: txn.agencyCode,
    budgetCode: txn.budgetCode,
    travelType: txn.travelType,
    currency: txn.currency,
    advanceAmount: txn.advanceAmount,
    bankCharges: txn.bankCharges,
    fxConversionCharges: txn.fxConversionCharges,
    totalAmount: txn.totalAmount,
    paymentMode: po.mode,
    bankName: po.bankName,
    bankAccountNumber: po.bankAccountNumber,
    bankBranch: po.bankBranch,
    cashCollectorName: po.cashCollectorName,
    cashCollectorCid: po.cashCollectorCid,
    status: "ready",
    generatedAt: new Date().toISOString(),
  };
  advices = [advice, ...advices];
  emit();
  return advice;
}

/** Post an advice to MCP — creates an MCP Journal Entry and flips status. */
export function postAdviceToMcp(adviceId: string): TravelPaymentAdvice | null {
  const idx = advices.findIndex((a) => a.id === adviceId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const updated: TravelPaymentAdvice = {
    ...advices[idx],
    status: "posted-to-mcp",
    postedToMcpAt: now,
    mcpJournalEntryId: nextMcpJournalId(),
  };
  advices = [...advices.slice(0, idx), updated, ...advices.slice(idx + 1)];
  emit();
  return updated;
}

/** MCP releases the payment — flips advice to "released" and marks PO
 *  settled. Does NOT trigger the e-DATS dispatch on its own; callers
 *  still decide when to mark the parent claim as paid. */
export function markAdviceReleased(adviceId: string): TravelPaymentAdvice | null {
  const idx = advices.findIndex((a) => a.id === adviceId);
  if (idx < 0) return null;
  const updated: TravelPaymentAdvice = {
    ...advices[idx],
    status: "released",
    releasedAt: new Date().toISOString(),
  };
  advices = [...advices.slice(0, idx), updated, ...advices.slice(idx + 1)];
  emit();
  return updated;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** React hook — live list that re-renders whenever the stores change. */
export function useTravelPaymentData(): {
  transactions: TravelPaymentTransaction[];
  orders: TravelPaymentOrder[];
  advices: TravelPaymentAdvice[];
} {
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);
  return { transactions: listTransactions(), orders: listOrders(), advices: listAdvices() };
}
