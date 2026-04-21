/* ═══════════════════════════════════════════════════════════════════════════
   Invoice & Bill — seed data
   ─────────────────────────
   Intentionally empty. The Invoice & Bill Management module is fully dynamic
   and is populated exclusively from the Contract, Contractor, Master Data and
   Tax Master contexts. No mock or demo records are injected so the queue
   accurately reflects only what admins actually create.
   ═══════════════════════════════════════════════════════════════════════════ */
import type { StoredInvoiceBill } from "../types";

export const seedInvoiceBills: StoredInvoiceBill[] = [];
