/* ═══════════════════════════════════════════════════════════════════════════
   useContractClosureMasterData
   ────────────────────────────
   Single hook that pulls every dropdown the Contract Closure module needs
   from the shared MasterDataContext. Components must NEVER hard-code option
   lists — they go through this hook so admins can manage every value from
   /master-data without touching code.

   ❗ ZERO static data policy
   ------------------------
   Per SRS Contract Closure requirements every drop-down value MUST come
   from master data. There are NO fallback constants in this file. If a
   master-data key is empty, the corresponding list will be empty too and
   the admin is expected to populate it at /master-data.

   Master-data keys used here map 1-to-1 with the SRS LoVs / LoPs:
     closure-type              ← LoV: Contract Closure Types
     closure-workflow-status   ← LoP: Contract Closure Workflow States
     closure-settlement-type   ← LoV: Settlement Line Types
     closure-trigger-category  ← LoV: Contract Category (Goods/Services/Works)
     closure-document-type     ← LoV: Closure / Termination Documents
     tax-code                  ← Tax Master (TDS / BIT / Sales Tax ...)
     currency-type             ← LoV: Currencies
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

export interface ContractClosureMasterData {
  closureTypes: string[];
  closureWorkflowStatuses: string[];
  settlementLineTypes: string[];
  triggerCategories: string[];
  documentTypes: string[];
  taxCodes: string[];
  currencies: string[];
}

function get(map: Map<string, string[]>, id: string): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? [...list] : [];
}

export function useContractClosureMasterData(): ContractClosureMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(
    () => ({
      closureTypes: get(masterDataMap, "closure-type"),
      closureWorkflowStatuses: get(masterDataMap, "closure-workflow-status"),
      settlementLineTypes: get(masterDataMap, "closure-settlement-type"),
      triggerCategories: get(masterDataMap, "closure-trigger-category"),
      documentTypes: get(masterDataMap, "closure-document-type"),
      taxCodes: get(masterDataMap, "tax-code"),
      currencies: get(masterDataMap, "currency-type"),
    }),
    [masterDataMap],
  );
}

/* ── Pure slug-based label ↔ key conversion ─────────────────────────────
   The form's closureType field used to rely on a hardcoded
   LABEL_TO_KEY map. That map was itself a form of static data, so it has
   been removed. Instead we convert labels to stable kebab-case slugs
   and keep display labels exactly as they arrive from master data. */

export function slugifyClosureLabel(label: string): string {
  return (label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function closureLabelToKey(label: string): string {
  return slugifyClosureLabel(label);
}

/* closureKeyToLabel now requires the master-data list to resolve a label,
   because labels themselves come from master data. */
export function closureKeyToLabel(key: string, masterLabels: string[]): string {
  if (!key) return "";
  const match = masterLabels.find((l) => slugifyClosureLabel(l) === key);
  return match ?? "";
}

/* Decide which trigger fires for a given category — eGP for Goods/Services,
   CMS for Works. Returns "egp" / "cms" / "" so it can drive both UI and
   the post-closure system-trigger effects. */
export function triggerForCategory(category: string): "egp" | "cms" | "" {
  const c = (category || "").toLowerCase();
  if (c.includes("works")) return "cms";
  if (c.includes("goods") || c.includes("service")) return "egp";
  return "";
}

/* Semantic closure-type helpers. They inspect the slug for keywords so
   validation logic works with any master-data label the admin configures
   (e.g. "Completion of Work", "Contract Completion", "Normal Completion"
   all resolve to `isCompletionKey: true`). */
export const isCompletionKey = (k: string) => /complet/i.test(k);
export const isCourtVerdictKey = (k: string) =>
  /court/i.test(k) || /arbitrat/i.test(k);
export const isMutualTerminationKey = (k: string) => /mutual/i.test(k);
export const isDefaultBreachKey = (k: string) =>
  /default/i.test(k) || /breach/i.test(k);
export const isForceMajeureKey = (k: string) =>
  /force/i.test(k) || /majeure/i.test(k);
export const isTerminationKey = (k: string) =>
  !isCompletionKey(k) && (
    isCourtVerdictKey(k) ||
    isMutualTerminationKey(k) ||
    isDefaultBreachKey(k) ||
    isForceMajeureKey(k) ||
    /terminat/i.test(k)
  );

/* Settlement line type semantics — again driven by slug keyword matching
   so the closure-settlement-type master data can carry any label the
   admin wants. */
export const isDueToContractorType = (t: string) =>
  /due.*to.*contractor/i.test(t);
export const isDueFromContractorType = (t: string) =>
  /due.*from.*contractor/i.test(t);
export const isRetentionReleaseType = (t: string) => /retention/i.test(t);
export const isAdvanceRecoveryType = (t: string) => /advance/i.test(t);
export const isLiquidatedDamagesType = (t: string) =>
  /\bld\b/i.test(t) || /liquidat/i.test(t) || /damage/i.test(t);

/* A positive line on the settlement (money flowing to the contractor) */
export const isSettlementInflow = (t: string) =>
  isDueToContractorType(t) || isRetentionReleaseType(t);
