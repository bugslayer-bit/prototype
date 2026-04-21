/* ═══════════════════════════════════════════════════════════════════════════
   useUtilityMasterData
   ────────────────────
   Pulls every LoV needed by Utility Management (SRS PRN 5.1) from the shared
   MasterDataContext. Admins manage every option from /master-data; components
   must never hard-code these lists.

   ❗ ZERO static data policy
   ------------------------
   Per SRS Utility Management requirements every drop-down value MUST come
   from master data. There are NO fallback constants here. If a key is
   empty, the list is empty, and the page nudges the admin to populate
   it at /master-data.

   Master-data keys map 1-to-1 with the SRS LoVs / LoPs / DD references:
     utility-type              ← DD 19.3  LoV (Electricity/Water/Phone/...)
     utility-billing-cycle     ← DD 19.7  LoV (Monthly / Quarterly / ...)
     utility-status            ← DD 19.10 LoV (Active / Inactive / Suspended)
     utility-bill-status       ← LoP: Utility Bill workflow states
     utility-bill-source       ← LoV: API Push / API Fetch / Manual
     utility-variance-action   ← LoV: Variance handling actions
     affected-agencies         ← DD 19.2  Agency master
     utility-payment-method    ← LoV 15.1: Individual / Consolidated
     utility-preferred-payment-mode ← LoV 15.2: Payment mode preferences
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

export interface UtilityMasterData {
  utilityType: string[];
  billingCycle: string[];
  utilityStatus: string[];
  billStatus: string[];
  billSource: string[];
  varianceActions: string[];
  agencies: string[];
  /* SRS LoV 15.1 – 15.2 */
  paymentMethod: string[];
  preferredPaymentMode: string[];
  /* UCoA Integration — budget code, expenditure head, funding source */
  budgetCodes: string[];
  expenditureHeads: string[];
  fundingSources: string[];
  /* SRS PRN 5.1 — service provider catalogue + per-provider service types */
  serviceProviders: string[];
  /** Resolve the service-type LoV for a given provider name. Returns
   *  an empty array when the provider has no catalogue. */
  getServiceTypesForProvider: (providerName: string) => string[];
  /** Resolve the utility types a given provider serves (SRS LoV 15.1).
   *  E.g. "Bhutan Power Corporation Ltd" → ["Electricity"]. */
  getUtilityTypesForProvider: (providerName: string) => string[];
}

function get(map: Map<string, string[]>, id: string): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? [...list] : [];
}

/** Deterministic slug used to construct the per-provider service-type
 *  master data group id (`utility-service-type-<slug>`). Matches the
 *  slugs declared in /shared/data/masterData.ts. */
export function providerSlug(providerName: string): string {
  return (providerName || "")
    .trim()
    .toLowerCase()
    .replace(/[&/]+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function useUtilityMasterData(): UtilityMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(
    () => ({
      utilityType: get(masterDataMap, "utility-type"),
      billingCycle: get(masterDataMap, "utility-billing-cycle"),
      utilityStatus: get(masterDataMap, "utility-status"),
      billStatus: get(masterDataMap, "utility-bill-status"),
      billSource: get(masterDataMap, "utility-bill-source"),
      varianceActions: get(masterDataMap, "utility-variance-action"),
      agencies: get(masterDataMap, "affected-agencies"),
      paymentMethod: get(masterDataMap, "utility-payment-method"),
      preferredPaymentMode: get(masterDataMap, "utility-preferred-payment-mode"),
      budgetCodes: get(masterDataMap, "utility-budget-code"),
      expenditureHeads: get(masterDataMap, "utility-expenditure-head"),
      fundingSources: get(masterDataMap, "utility-funding-source"),
      serviceProviders: get(masterDataMap, "utility-service-provider"),
      getServiceTypesForProvider: (providerName: string) => {
        const slug = providerSlug(providerName);
        if (!slug) return [];
        return get(masterDataMap, `utility-service-type-${slug}`);
      },
      getUtilityTypesForProvider: (providerName: string) => {
        const slug = providerSlug(providerName);
        if (!slug) return [];
        return get(masterDataMap, `utility-provider-types-${slug}`);
      },
    }),
    [masterDataMap],
  );
}

/* ── Pure slug + semantic helpers ────────────────────────────────────────
   These keep the closed-union behaviour of the old hardcoded strings
   ("api-push", "manual", "Paid", "Active") working without carrying any
   data themselves — they only inspect the label's keywords.            */

export function slugifyUtilityLabel(label: string): string {
  return (label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* Bill source semantics */
export const isApiPushSource = (s: string) => /push/i.test(s);
export const isApiFetchSource = (s: string) => /fetch|pull|api(?!.*push)/i.test(s);
export const isManualSource = (s: string) => /manual|user|entry/i.test(s);

/* Bill status semantics */
export const isPendingStatus = (s: string) => /pend|draft|new/i.test(s);
export const isClearedStatus = (s: string) => /clear/i.test(s);
export const isApprovedStatus = (s: string) => /approv/i.test(s);
export const isPaidStatus = (s: string) => /paid|settled|released/i.test(s);
export const isOverdueStatus = (s: string) => /overdue|late/i.test(s);
export const isDisputedStatus = (s: string) => /dispute|rejected|hold/i.test(s);
export const isPaidOrApprovedStatus = (s: string) =>
  isPaidStatus(s) || isApprovedStatus(s) || isClearedStatus(s);

/* Utility status semantics */
export const isActiveUtilityStatus = (s: string) => /active/i.test(s);
export const isSuspendedUtilityStatus = (s: string) =>
  /suspend|hold/i.test(s);
export const isInactiveUtilityStatus = (s: string) =>
  /inactive|closed|terminated/i.test(s);

/* Resolve helpers — pick the first matching master-data label by
   predicate, empty string if none match. */
export function findLabel(list: string[], predicate: (label: string) => boolean): string {
  return list.find(predicate) ?? "";
}
