/* ═══════════════════════════════════════════════════════════════════════════
   InvoiceBillDataContext
   ─────────────────────
   Single source of truth for every Invoice & Bill record produced by the
   wizard. Mirrors the pattern used by ContractDataContext but lives next to
   the module that owns the data so the folder stays self-contained.
   ═══════════════════════════════════════════════════════════════════════════ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoredInvoiceBill } from "../types";
import { initialInvoiceBillForm } from "../config";
import {
  formatInvoiceNumber,
  loadInvoiceNumberingFormat,
} from "../../../masterData/storage";

interface InvoiceBillDataContextValue {
  records: StoredInvoiceBill[];
  addRecord: (record: StoredInvoiceBill) => void;
  updateRecord: (id: string, patch: Partial<StoredInvoiceBill>) => void;
  removeRecord: (id: string) => void;
  generateNextInvoiceId: () => string;
  generateNextBillId: () => string;
  generateNextRecordId: () => string;
}

const LS_KEY = "ifmis_invoice_bills_v1";
const InvoiceBillDataContext = createContext<InvoiceBillDataContextValue | null>(null);

/* ── localStorage helpers ───────────────────────────────────────────────── */
/**
 * Back-fills any missing top-level sub-objects (paymentOrder, reversal,
 * discountingEligibility, etc.) on records that were persisted before those
 * fields existed. Prevents runtime crashes like "Cannot read properties of
 * undefined (reading 'paymentOrderId')" on older seed data.
 */
function normaliseRecord(record: StoredInvoiceBill): StoredInvoiceBill {
  const defaults = initialInvoiceBillForm as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...(record as unknown as Record<string, unknown>) };
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    const cur = merged[key];
    if (def && typeof def === "object" && !Array.isArray(def)) {
      merged[key] = { ...(def as object), ...((cur as object) ?? {}) };
    } else if (cur === undefined) {
      merged[key] = def;
    }
  }
  /* Legacy → canonical ESG migration: records persisted before the refactor
   * stored esg as {environment, social, gender}. Rebuild the canonical
   * categories[] array from those flags (gender → Governance) so old
   * records stay valid once the EsgTagging type enforces categories[]. */
  const esg = merged.esg as Record<string, unknown> | undefined;
  if (esg && !Array.isArray((esg as { categories?: unknown }).categories)) {
    const categories: string[] = [];
    if (esg.environment === true) categories.push("Environment");
    if (esg.social === true) categories.push("Social");
    if (esg.gender === true || esg.governance === true) categories.push("Governance");
    merged.esg = {
      budgetEsgLinked: esg.budgetEsgLinked === true,
      categories,
      attributedBy: typeof esg.attributedBy === "string" ? esg.attributedBy : "",
      attributedAt: typeof esg.attributedAt === "string" ? esg.attributedAt : "",
      notes: typeof esg.notes === "string" ? esg.notes : "",
    };
  }
  return merged as unknown as StoredInvoiceBill;
}

function readStorage(): StoredInvoiceBill[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredInvoiceBill[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normaliseRecord);
  } catch {
    return [];
  }
}

/* ── Sequential ID generators (INV-YYYY-NNNN / BILL-YYYY-NNNN) ──────────── */
const YEAR = new Date().getFullYear();

function nextSequential(prefix: string, existing: string[]): string {
  const re = new RegExp(`^${prefix}(\\d+)$`, "i");
  let max = 0;
  for (const id of existing) {
    const m = re.exec(id ?? "");
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function InvoiceBillDataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<StoredInvoiceBill[]>(() => readStorage());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(records));
  }, [records]);

  const addRecord = useCallback((record: StoredInvoiceBill) => {
    setRecords((cur) => {
      const idx = cur.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        const next = [...cur];
        next[idx] = record;
        return next;
      }
      return [record, ...cur];
    });
  }, []);

  const updateRecord = useCallback((id: string, patch: Partial<StoredInvoiceBill>) => {
    setRecords((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((cur) => cur.filter((r) => r.id !== id));
  }, []);

  const generateNextInvoiceId = useCallback(() => {
    /* Pull the live Master Data → Invoice Numbering Format config so the
       generated number reflects whatever the user configured (pattern,
       prefixes, interface/manual split). When the format is inactive we
       fall back to the legacy INV-YYYY-NNNN sequential pattern. */
    const cfg = loadInvoiceNumberingFormat();
    const usedSeqs = records
      .map((r) => {
        const id = r.invoice.invoiceId ?? "";
        const m = id.match(/(\d+)(?!.*\d)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !Number.isNaN(n));
    const nextSeq = (usedSeqs.length ? Math.max(...usedSeqs) : 0) + 1;

    if (!cfg.active) {
      return nextSequential(
        `INV-${YEAR}-`,
        records.map((r) => r.invoice.invoiceId),
      );
    }
    return formatInvoiceNumber(cfg, { seq: nextSeq, channel: "manual" });
  }, [records]);

  const generateNextBillId = useCallback(() => {
    return nextSequential(
      `BILL-${YEAR}-`,
      records.map((r) => r.bill.billId),
    );
  }, [records]);

  const generateNextRecordId = useCallback(() => {
    return nextSequential(
      `IBR-${YEAR}-`,
      records.map((r) => r.recordId),
    );
  }, [records]);

  const value = useMemo<InvoiceBillDataContextValue>(
    () => ({
      records,
      addRecord,
      updateRecord,
      removeRecord,
      generateNextInvoiceId,
      generateNextBillId,
      generateNextRecordId,
    }),
    [
      records,
      addRecord,
      updateRecord,
      removeRecord,
      generateNextInvoiceId,
      generateNextBillId,
      generateNextRecordId,
    ],
  );

  return (
    <InvoiceBillDataContext.Provider value={value}>{children}</InvoiceBillDataContext.Provider>
  );
}

export function useInvoiceBillData() {
  const ctx = useContext(InvoiceBillDataContext);
  if (!ctx) throw new Error("useInvoiceBillData must be used within InvoiceBillDataProvider");
  return ctx;
}
