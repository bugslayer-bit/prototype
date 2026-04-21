/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Postings Store
   ──────────────────────
   Cross-agency queue of payroll PayBills that have been "Posted to MCP" by
   an originating agency (e.g. RUB, Judiciary, OAG …). MoF consumes this
   queue from the Payroll Management dashboard for payment processing.

   Why a hand-rolled module-level store instead of Context?
     • The pages that originate a posting (OpsPayrollGenerationPage,
       CS PayrollGenerationPage) and the pages that consume it (MoF
       PayrollManagementPage) live in different lazy-loaded route chunks.
     • A Context would need a provider high up in the tree AND every
       consumer to subscribe with useContext — more wiring than warranted
       at this stage.
     • Persisting to sessionStorage so the queue survives full reloads
       during demos but is reset between sessions.

   Shape:
     • postPayroll(posting) — called by Step 6 "Post to MCP" handlers.
     • listPostings() — returns all postings; MoF-central view.
     • listPostingsForAgency(code) — returns postings originated by one
       agency.
     • usePayrollPostings() — React hook that re-renders on every change.
     • markAsPaid(postingId) — MoF flips a posting from "awaiting-payment"
       to "paid" once payment order is issued.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";

const STORAGE_KEY = "ifmis.payrollPostings.v1";

export type PayrollPostingStatus =
  | "awaiting-payment"   // Originating agency posted; MoF has not processed yet
  | "processing"         // MoF is preparing the payment order
  | "paid"               // Payment released
  | "rejected";          // MoF rejected — agency must revise

export type PayrollPostingStream = "civil-servant" | "other-public-servant";

export interface PayrollPosting {
  /** Unique posting id (mirrors Journal Entry id) */
  id: string;
  /** Journal Entry ID from MCP */
  journalEntryId: string;
  /** Agency that originated the payroll run */
  agencyCode: string;
  agencyName: string;
  /** Civil Service or OPS bill */
  stream: PayrollPostingStream;
  /** OPS category id if stream === "other-public-servant" */
  opsCategoryId?: string;
  opsCategoryName?: string;
  /** Department filter used when generating (optional) */
  department?: string;
  /** Period covered */
  month: number;      // 1-12
  year: number;
  frequency: "monthly" | "fortnightly";
  /** Head counts & money */
  employeeCount: number;
  grossAmount: number;
  deductionsAmount: number;
  netAmount: number;
  /** Posted at ISO timestamp */
  postedAt: string;
  /** Who posted */
  postedByRoleId: string | null;
  postedByRoleName: string | null;
  /** Downstream status */
  status: PayrollPostingStatus;
  /** MoF processing fields */
  paidAt?: string;
  paymentOrderNumber?: string;
  rejectedReason?: string;
}

/* ── Internal state ─────────────────────────────────────────────────────── */
let postings: PayrollPosting[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): PayrollPosting[] {
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

function saveToStorage() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(postings));
  } catch {
    /* swallow — storage quota / private mode */
  }
}

function emit() {
  saveToStorage();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  });
}

/* ── Public API ─────────────────────────────────────────────────────────── */

export function postPayroll(
  input: Omit<PayrollPosting, "id" | "postedAt" | "status">,
): PayrollPosting {
  const posting: PayrollPosting = {
    ...input,
    id: input.journalEntryId || `POST-${Date.now()}`,
    postedAt: new Date().toISOString(),
    status: "awaiting-payment",
  };
  postings = [posting, ...postings];
  emit();
  return posting;
}

export function listPostings(): PayrollPosting[] {
  return [...postings];
}

export function listPostingsForAgency(agencyCode: string): PayrollPosting[] {
  return postings.filter((p) => p.agencyCode === agencyCode);
}

export function markAsPaid(
  postingId: string,
  paymentOrderNumber: string,
): PayrollPosting | null {
  const idx = postings.findIndex((p) => p.id === postingId);
  if (idx < 0) return null;
  const updated: PayrollPosting = {
    ...postings[idx],
    status: "paid",
    paidAt: new Date().toISOString(),
    paymentOrderNumber,
  };
  postings = [...postings.slice(0, idx), updated, ...postings.slice(idx + 1)];
  emit();
  return updated;
}

export function markAsProcessing(postingId: string): PayrollPosting | null {
  const idx = postings.findIndex((p) => p.id === postingId);
  if (idx < 0) return null;
  const updated: PayrollPosting = {
    ...postings[idx],
    status: "processing",
  };
  postings = [...postings.slice(0, idx), updated, ...postings.slice(idx + 1)];
  emit();
  return updated;
}

export function rejectPosting(
  postingId: string,
  reason: string,
): PayrollPosting | null {
  const idx = postings.findIndex((p) => p.id === postingId);
  if (idx < 0) return null;
  const updated: PayrollPosting = {
    ...postings[idx],
    status: "rejected",
    rejectedReason: reason,
  };
  postings = [...postings.slice(0, idx), updated, ...postings.slice(idx + 1)];
  emit();
  return updated;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ── React hook — returns a live list that re-renders on every change ── */
export function usePayrollPostings(filterAgencyCode?: string | null): PayrollPosting[] {
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);
  if (!filterAgencyCode || filterAgencyCode === "all" || filterAgencyCode === "16") {
    return listPostings();
  }
  return listPostingsForAgency(filterAgencyCode);
}
