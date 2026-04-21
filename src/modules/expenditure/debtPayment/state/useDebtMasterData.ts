/* ═══════════════════════════════════════════════════════════════════════════
   useDebtMasterData
   ─────────────────
   Pulls every LoV needed by Debt Payment Management (SRS PRN 6.1) from the
   shared MasterDataContext so admins can add/remove options from /master-data
   without touching code.

   ZERO hardcoded fallbacks.  If a master-data key has no values the UI will
   render an empty dropdown plus an amber banner instructing the admin to
   populate the list — nothing is assumed on the user's behalf.

   The semantic helper functions exported from this module let components
   classify user-renamed labels (e.g. "Cleared", "Settled", "Paid Off") by
   keyword rather than exact-string comparison, so renaming a LoV value does
   not silently break KPI logic or badge colours.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

export interface DebtMasterData {
  creditorType: string[];           /* PRN 6.1 Step 1 */
  dataSource: string[];             /* PRN 6.1 Step 1 */
  debtCategory: string[];           /* DD 20.4 / LoV 17.1 */
  paymentType: string[];            /* LoV 17.1 (Type of Payments) */
  paymentCurrency: string[];        /* DD 20.8 / LoV 17.1 */
  paymentStatus: string[];          /* DD 20.9 / BR 23.9 */
  loanTermUnit: string[];           /* LoV 17.1 (Loan Term) */
  repaymentFrequency: string[];     /* LoV 17.1 (Repayment Frequency) */
  amortizationSchedule: string[];   /* LoV 17.1 (Amortization Schedule) */
  paymentOrderChannel: string[];    /* PRN 6.1 Step 2 */
  sourceOfFund: string[];           /* PRN 6.1 Step 2 */
  applicableDeduction: string[];    /* PRN 6.1 Step 1 */
  meridianAction: string[];         /* PRN 6.1 Step 4 */
  validationRule: string[];         /* PRN 6.1 Step 3 */
  countries: string[];              /* country-of-registration master */
}

/* Pure helper — returns an empty array when the master-data key is absent so
   consumers can show a banner instead of silently falling back. */
function get(map: Map<string, string[]>, id: string): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? [...list] : [];
}

export function useDebtMasterData(): DebtMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(
    () => ({
      creditorType: get(masterDataMap, "debt-creditor-type"),
      dataSource: get(masterDataMap, "debt-data-source"),
      debtCategory: get(masterDataMap, "debt-category"),
      paymentType: get(masterDataMap, "debt-payment-type"),
      paymentCurrency: get(masterDataMap, "currency-type"),
      paymentStatus: get(masterDataMap, "debt-payment-status"),
      loanTermUnit: get(masterDataMap, "debt-loan-term-unit"),
      repaymentFrequency: get(masterDataMap, "payment-frequency"),
      amortizationSchedule: get(masterDataMap, "debt-amortization-schedule"),
      paymentOrderChannel: get(masterDataMap, "debt-payment-order-channel"),
      sourceOfFund: get(masterDataMap, "debt-source-of-fund"),
      applicableDeduction: get(masterDataMap, "debt-applicable-deduction"),
      meridianAction: get(masterDataMap, "debt-meridian-action"),
      validationRule: get(masterDataMap, "debt-validation-rule"),
      countries: get(masterDataMap, "country-registration"),
    }),
    [masterDataMap],
  );
}

/* ─── Semantic label helpers ─────────────────────────────────────────────
   Keyword-based classification so renaming a master-data value in /master-data
   does not break the Debt module. Every helper is case-insensitive regex. */

export function slugifyDebtLabel(label: string): string {
  return (label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* Payment status semantics (DD 20.9) */
export const isPendingStatus = (s: string) => /pend|draft|new|initiat/i.test(s);
export const isApprovedStatus = (s: string) => /approv/i.test(s);
export const isProcessedStatus = (s: string) => /process/i.test(s);
export const isPaidStatus = (s: string) =>
  /paid|settled|cleared|released|completed/i.test(s);
export const isOverdueStatus = (s: string) => /overdue|late|past.?due/i.test(s);
export const isCancelledStatus = (s: string) =>
  /cancel|void|reject|abandon/i.test(s);
export const isHoldStatus = (s: string) => /hold|dispute|suspend/i.test(s);
export const isPaidOrApprovedStatus = (s: string) =>
  isPaidStatus(s) || isApprovedStatus(s) || isProcessedStatus(s);

/* Meridian action semantics (PRN 6.1 Step 4) */
export const isMeridianDownload = (s: string) => /download|export|file/i.test(s);
export const isMeridianPush = (s: string) => /push|api|integrat|sync/i.test(s);

/* Payment order channel semantics (PRN 6.1 Step 2) */
export const isPrintChannel = (s: string) => /print|manual/i.test(s);
export const isApiPushChannel = (s: string) => /push|api|electronic/i.test(s);

/* Data source semantics (PRN 6.1 Step 1) */
export const isManualDataSource = (s: string) => /manual/i.test(s);
export const isUploadDataSource = (s: string) => /upload|excel|csv|import/i.test(s);
export const isMeridianDataSource = (s: string) => /meridian|integrat|api/i.test(s);

/* Creditor type semantics */
export const isDonorCreditor = (s: string) => /donor|grant/i.test(s);
export const isBilateralCreditor = (s: string) => /bilater/i.test(s);
export const isMultilateralCreditor = (s: string) => /multilater/i.test(s);

/* Currency semantics — detect the local/base currency (Bhutan Ngultrum) for
   exchange-rate logic without hardcoding the exact label. */
export const isLocalCurrency = (s: string) =>
  /btn|ngult|bhutan|local/i.test(s);

/* Payment type semantics */
export const isPrincipalPayment = (s: string) => /principal/i.test(s);
export const isInterestPayment = (s: string) => /interest/i.test(s);
export const isCompositePayment = (s: string) => /compos|combin|both/i.test(s);

/* Deduction semantics */
export const isNoDeduction = (s: string) => /none|nil|n\/a|no.deduc/i.test(s);

/* Utility: find the first label in a list matching a predicate. Returns
   empty string if no match, so downstream code can render "—" gracefully. */
export function findLabel(
  list: string[],
  predicate: (label: string) => boolean,
): string {
  return list.find(predicate) ?? "";
}
