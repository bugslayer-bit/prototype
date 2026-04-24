/* ═══════════════════════════════════════════════════════════════════════════
   Travel e-DATS Post-Back Queue
   ─────────────────────────────
   SRS §4 (Travel — POST Payment) requires IFMIS to share the following
   after a travel advance payment is released:
     • Approved Travel Allowance Reference Number
     • Payment Transaction Reference Number
     • Transaction Status (paid / rejected-with-reason)
     • Date of Payment
     • Amount Paid
     • Other related data if required in e-DATS

   This is a session-persisted queue mirroring remittanceDispatches.ts:
   Step "Pay" enqueues a dispatch in "pending" state. A mock dispatcher
   flips it to "dispatched" after a short delay (simulating the e-DATS
   handshake). Failures produce "failed" with a reason. UI reads via
   useTravelEdatsDispatches().
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";

const STORAGE_KEY = "ifmis.travel.edatsDispatches.v1";

export type EdatsDispatchStatus = "pending" | "dispatched" | "failed";

export interface TravelEdatsDispatch {
  id: string;
  claimId: string;
  approvedTARefNo: string;
  paymentTransactionRef: string;
  /** "paid" or "rejected:<reason>" */
  transactionStatus: string;
  dateOfPayment: string;
  amountPaid: number;
  currency: string;
  enqueuedAt: string;
  dispatchedAt?: string;
  status: EdatsDispatchStatus;
  failureReason?: string;
}

/* ── Internal state ─────────────────────────────────────────────────────── */
let dispatches: TravelEdatsDispatch[] = load();
const listeners = new Set<() => void>();

function load(): TravelEdatsDispatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dispatches));
  } catch { /* swallow */ }
}

function emit() {
  save();
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

/* ─── Public API ────────────────────────────────────────────────────────── */

export interface EnqueueTravelDispatchInput {
  claimId: string;
  approvedTARefNo: string;
  paymentTransactionRef: string;
  transactionStatus: "paid" | "rejected";
  /** Required when transactionStatus === "rejected". */
  rejectedReason?: string;
  dateOfPayment: string;
  amountPaid: number;
  currency: string;
}

/** Enqueue a dispatch in "pending" state and schedule a simulated e-DATS
 *  handshake to flip it to "dispatched" after ~1.2s. */
export function enqueueTravelEdatsDispatch(
  input: EnqueueTravelDispatchInput,
): TravelEdatsDispatch {
  const now = new Date().toISOString();
  const status =
    input.transactionStatus === "rejected"
      ? `rejected:${input.rejectedReason ?? "unspecified"}`
      : "paid";

  /* Replace any prior dispatch for the same claim + transaction ref —
     re-payment scenario. */
  dispatches = dispatches.filter(
    (d) => !(d.claimId === input.claimId && d.paymentTransactionRef === input.paymentTransactionRef),
  );

  const dispatch: TravelEdatsDispatch = {
    id: `EDATS-${input.paymentTransactionRef}`,
    claimId: input.claimId,
    approvedTARefNo: input.approvedTARefNo,
    paymentTransactionRef: input.paymentTransactionRef,
    transactionStatus: status,
    dateOfPayment: input.dateOfPayment,
    amountPaid: input.amountPaid,
    currency: input.currency,
    enqueuedAt: now,
    status: "pending",
  };
  dispatches = [dispatch, ...dispatches];
  emit();

  /* Simulated e-DATS handshake — in a real build this would be an HTTP
     POST to the e-DATS inbound webhook. */
  if (typeof window !== "undefined") {
    setTimeout(() => markDispatched(dispatch.id), 1200);
  }
  return dispatch;
}

export function markDispatched(id: string): TravelEdatsDispatch | null {
  const idx = dispatches.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  if (dispatches[idx].status !== "pending") return dispatches[idx];
  const updated: TravelEdatsDispatch = {
    ...dispatches[idx],
    status: "dispatched",
    dispatchedAt: new Date().toISOString(),
  };
  dispatches = [...dispatches.slice(0, idx), updated, ...dispatches.slice(idx + 1)];
  emit();
  return updated;
}

export function markDispatchFailed(id: string, reason: string): TravelEdatsDispatch | null {
  const idx = dispatches.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const updated: TravelEdatsDispatch = {
    ...dispatches[idx],
    status: "failed",
    failureReason: reason,
  };
  dispatches = [...dispatches.slice(0, idx), updated, ...dispatches.slice(idx + 1)];
  emit();
  return updated;
}

export function listTravelEdatsDispatches(): TravelEdatsDispatch[] {
  return [...dispatches];
}

export function getDispatchForClaim(claimId: string): TravelEdatsDispatch | null {
  return dispatches.find((d) => d.claimId === claimId) ?? null;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useTravelEdatsDispatches(): TravelEdatsDispatch[] {
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);
  return listTravelEdatsDispatches();
}
