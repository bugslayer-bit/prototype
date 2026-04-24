/* ═══════════════════════════════════════════════════════════════════════════
   Remittance Dispatches Store
   ───────────────────────────
   Per-stream tracker for the auto-post-on-MCP-success flow described in the
   SRS Remittances POSTING note:

     "Once the MCP releases the Salary payment, following remittances needs
      to be done by the system ... This remittances shall be auto-posted to
      respective systems by the IFMIS system once salary gets successful."

   Lifecycle:
     1. Step 6 "Post to MCP" completes → postPayroll() in payrollPostings.ts
        creates a PayrollPosting AND calls enqueueDispatchesFor(posting),
        which inserts one RemittanceDispatch per non-empty stream in status
        "pending".
     2. MoF flips the posting from "awaiting-payment" → "paid" via
        markAsPaid() → dispatchRemittancesFor(journalEntryId) flips every
        pending dispatch to "dispatched" and stamps dispatchedAt.
     3. The Remittances hub reads via useRemittanceDispatches() and surfaces
        "X/Y dispatched" badges per stream.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import type { RemittanceStreamKey } from "./paybillStandard";
import { REMITTANCE_DESTINATIONS } from "./paybillStandard";
import { buildSchedule } from "./remittanceSchedules";

const STORAGE_KEY = "ifmis.remittanceDispatches.v1";

export type RemittanceDispatchStatus = "pending" | "dispatched" | "failed";

export interface RemittanceDispatch {
  id: string;
  /** PayrollPosting this dispatch belongs to — ties to journalEntryId. */
  journalEntryId: string;
  streamKey: RemittanceStreamKey;
  body: string;
  account: string;
  /** Destination head-count & total amount snapshot at enqueue time. */
  headCount: number;
  totalAmount: number;
  /** ISO timestamps. */
  enqueuedAt: string;
  dispatchedAt?: string;
  status: RemittanceDispatchStatus;
  failureReason?: string;
}

/* ── Internal state ─────────────────────────────────────────────────────── */
let dispatches: RemittanceDispatch[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): RemittanceDispatch[] {
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
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dispatches));
  } catch {
    /* swallow */
  }
}

function emit() {
  saveToStorage();
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/** Called by Step 6 via postPayroll — enqueues one pending dispatch per stream
 *  that has at least one employee + non-zero amount. */
export function enqueueDispatchesFor(input: {
  journalEntryId: string;
  year: number;
  month: number;
  agencyCode?: string;
  payrollDept?: string;
}): RemittanceDispatch[] {
  const now = new Date().toISOString();
  const streamKeys = Object.keys(REMITTANCE_DESTINATIONS) as RemittanceStreamKey[];
  const created: RemittanceDispatch[] = [];
  streamKeys.forEach((key) => {
    const view = buildSchedule(key, {
      year: input.year,
      month: input.month,
      agencyCode: input.agencyCode,
      payrollDept: input.payrollDept,
    });
    if (view.rows.length === 0 || view.totalAmount <= 0) return;
    created.push({
      id: `${input.journalEntryId}-${key}`,
      journalEntryId: input.journalEntryId,
      streamKey: key,
      body: view.body,
      account: view.account,
      headCount: view.rows.length,
      totalAmount: view.totalAmount,
      enqueuedAt: now,
      status: "pending",
    });
  });
  /* De-dup: if the same journal already enqueued dispatches, replace them. */
  dispatches = [
    ...dispatches.filter((d) => d.journalEntryId !== input.journalEntryId),
    ...created,
  ];
  emit();
  return created;
}

/** Called by MoF markAsPaid — flips every pending dispatch of the given
 *  journal to "dispatched". Returns the updated rows. */
export function dispatchRemittancesFor(journalEntryId: string): RemittanceDispatch[] {
  const now = new Date().toISOString();
  let updated: RemittanceDispatch[] = [];
  dispatches = dispatches.map((d) => {
    if (d.journalEntryId !== journalEntryId || d.status !== "pending") return d;
    const next: RemittanceDispatch = { ...d, status: "dispatched", dispatchedAt: now };
    updated.push(next);
    return next;
  });
  if (updated.length > 0) emit();
  return updated;
}

/** Mark a single dispatch failed (e.g. validation/integration error). */
export function markDispatchFailed(id: string, reason: string): RemittanceDispatch | null {
  const idx = dispatches.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const updated: RemittanceDispatch = { ...dispatches[idx], status: "failed", failureReason: reason };
  dispatches = [...dispatches.slice(0, idx), updated, ...dispatches.slice(idx + 1)];
  emit();
  return updated;
}

export function listDispatches(): RemittanceDispatch[] {
  return [...dispatches];
}

export function listDispatchesFor(journalEntryId: string): RemittanceDispatch[] {
  return dispatches.filter((d) => d.journalEntryId === journalEntryId);
}

export function listDispatchesByStream(streamKey: RemittanceStreamKey): RemittanceDispatch[] {
  return dispatches.filter((d) => d.streamKey === streamKey);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** React hook — re-renders on every dispatch change. */
export function useRemittanceDispatches(): RemittanceDispatch[] {
  const [, bump] = useState(0);
  useEffect(() => subscribe(() => bump((n) => n + 1)), []);
  return listDispatches();
}
