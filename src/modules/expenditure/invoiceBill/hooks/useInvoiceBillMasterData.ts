/* ═══════════════════════════════════════════════════════════════════════════
   useInvoiceBillMasterData
   ────────────────────────
   Single hook that pulls every dropdown the Invoice & Bill module needs from
   the shared MasterDataContext. Components must NEVER hard-code option lists
   — they go through this hook so admins can manage every value from
   /master-data without touching code.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";
import type { BillCategory } from "../types";

export interface InvoiceBillMasterData {
  invoiceStatus: string[];
  billStatus: string[];
  billCategory: string[];
  billSubCategoryByCategory: Record<string, string[]>;
  submissionChannel: string[];
  documentTypes: string[];
  currency: string[];
  taxCodes: string[];
  approvalDecisions: string[];
  discountingStatus: string[];
  /* Approval-matrix rows (raw "max|key:label:role" strings).
     Use resolveApprovalChain() in approvalMatrix.ts to filter by amount. */
  approvalMatrixInvoice: string[];
  approvalMatrixBill: string[];
  /* RMA-licensed financial institutions for bill discounting (PRN 3.3.1) */
  financialInstitutions: string[];
  /* UCoA hierarchy levels — Fund / Sector / Programme / Activity / Object */
  ucoaLevels: string[];
}

const FALLBACK = {
  invoiceStatus: ["Draft", "Submitted", "Approved", "Rejected"],
  billStatus: ["Draft", "Approved", "Paid"],
  billCategory: ["Goods", "Works", "Services"],
  submissionChannel: ["Manual", "Contractor Portal"],
  documentTypes: ["Invoice Copy", "GRN", "Contract Validity"],
  currency: ["BTN"],
  taxCodes: ["TDS", "BIT"],
  approvalDecisions: ["Pending", "Approved", "Rejected"],
  discountingStatus: ["Not Requested", "Requested", "Approved", "Settled", "Rejected"],
} as const;

function get(map: Map<string, string[]>, id: string, fallback: readonly string[]): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? list : [...fallback];
}

export function useInvoiceBillMasterData(): InvoiceBillMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(() => {
    const billCategory = get(masterDataMap, "bill-category", FALLBACK.billCategory);
    const billSubCategoryByCategory: Record<string, string[]> = {
      Goods: get(masterDataMap, "bill-sub-category-goods", ["IT Equipment"]),
      Works: get(masterDataMap, "bill-sub-category-works", ["Civil Works"]),
      Services: get(masterDataMap, "bill-sub-category-services", ["Consultancy"]),
    };

    return {
      invoiceStatus: get(masterDataMap, "invoice-status", FALLBACK.invoiceStatus),
      billStatus: get(masterDataMap, "bill-status", FALLBACK.billStatus),
      billCategory,
      billSubCategoryByCategory,
      submissionChannel: get(masterDataMap, "invoice-submission-channel", FALLBACK.submissionChannel),
      documentTypes: get(masterDataMap, "invoice-document-type", FALLBACK.documentTypes),
      currency: get(masterDataMap, "currency-type", FALLBACK.currency),
      taxCodes: get(masterDataMap, "tax-code", FALLBACK.taxCodes),
      approvalDecisions: get(masterDataMap, "approval-decision", FALLBACK.approvalDecisions),
      discountingStatus: get(masterDataMap, "discounting-status", FALLBACK.discountingStatus),
      approvalMatrixInvoice: get(masterDataMap, "approval-matrix-invoice", []),
      approvalMatrixBill: get(masterDataMap, "approval-matrix-bill", []),
      financialInstitutions: get(masterDataMap, "financial-institution", ["Bank of Bhutan"]),
      ucoaLevels: get(masterDataMap, "ucoa-level", [
        "Fund",
        "Sector",
        "Sub-Sector",
        "Programme",
        "Sub-Programme",
        "Activity",
        "Sub-Activity",
        "Object Code",
      ]),
    };
  }, [masterDataMap]);
}

/* Helper to safely look up a category's sub-categories regardless of casing. */
export function getSubCategoriesFor(
  master: InvoiceBillMasterData,
  category: BillCategory | string,
): string[] {
  return master.billSubCategoryByCategory[category] ?? [];
}
