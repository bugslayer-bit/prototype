/* ═══════════════════════════════════════════════════════════════════════════
   useScMasterData — Subscriptions & Contributions master data
   ─────────────────────────────────────────────────────────────
   Pulls every LoV consumed by the SC module from the shared
   MasterDataContext. ZERO hardcoded fallbacks — if a key is empty the UI
   shows an amber banner prompting admin to populate it from /master-data.

   Cascading helpers (keyword-based so admin renames don't break flows):
     • filterCurrencyByScope(scope, all)      — International → foreign only
                                                 Domestic → BTN only
     • filterOrgByBeneficiaryType(type, all)   — Individual → only "Other"
                                                 Institutional → full list
     • nextAllowedEntityStatuses(current, all)
     • nextAllowedTxnStatuses(current, all)
     • isSubscriptionType / isContributionType
     • isDomesticScope / isInternationalScope
     • isBtnCurrency
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

export interface ScMasterData {
  txnType: string[];
  scope: string[];
  beneficiaryType: string[];
  organisationType: string[];
  paymentFrequency: string[];
  currency: string[];
  entityStatus: string[];
  txnStatus: string[];
  approvalLevel: string[];
  approvalDecision: string[];
  validationRule: string[];
  documentType: string[];
  budgetCode: string[]; /* reused from canonical "budget-codes" LoV */
  bankName: string[];   /* reused from canonical "bank-name" LoV (RMA registry) */
  bankBranch: string[]; /* reused from canonical "bank-branch-name" LoV */
}

function get(map: Map<string, string[]>, id: string): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? [...list] : [];
}

export function useScMasterData(): ScMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(
    () => ({
      txnType: get(masterDataMap, "sc-type"),
      scope: get(masterDataMap, "sc-scope"),
      beneficiaryType: get(masterDataMap, "sc-beneficiary-type"),
      organisationType: get(masterDataMap, "sc-organisation-type"),
      paymentFrequency: get(masterDataMap, "payment-frequency"),
      currency: get(masterDataMap, "currency-type"),
      entityStatus: get(masterDataMap, "sc-entity-status"),
      txnStatus: get(masterDataMap, "sc-txn-status"),
      approvalLevel: get(masterDataMap, "approval-level"),
      approvalDecision: get(masterDataMap, "approval-decision"),
      bankName: get(masterDataMap, "bank-name"),
      bankBranch: get(masterDataMap, "bank-branch-name"),
      validationRule: get(masterDataMap, "sc-validation-rule"),
      documentType: get(masterDataMap, "sc-document-type"),
      budgetCode: get(masterDataMap, "budget-codes"),
    }),
    [masterDataMap],
  );
}

/* ─── Semantic helpers (case-insensitive keyword match) ───────────────── */
export const isSubscriptionType = (t: string) => /subscript/i.test(t);
export const isContributionType = (t: string) => /contribut/i.test(t);

export const isDomesticScope = (s: string) => /domestic|local|inland/i.test(s);
export const isInternationalScope = (s: string) =>
  /inter|foreign|external|abroad/i.test(s);

export const isIndividualBeneficiary = (t: string) => /individ/i.test(t);
export const isInstitutionalBeneficiary = (t: string) => /institut|organ/i.test(t);

export const isBtnCurrency = (c: string) => /btn|ngult/i.test(c);

export const isDraftStatus = (s: string) => /draft|new/i.test(s);
export const isSubmittedStatus = (s: string) => /submit/i.test(s);
export const isUnderValidationStatus = (s: string) =>
  /valid|verif/i.test(s);
export const isApprovedStatus = (s: string) =>
  /approv/i.test(s) && !/re.?approv/i.test(s);
export const isActiveStatus = (s: string) => /active|live/i.test(s);
export const isInactiveStatus = (s: string) => /inactive|dormant/i.test(s);
export const isSuspendedStatus = (s: string) => /suspend|hold/i.test(s);
export const isClosedStatus = (s: string) => /close|terminat|revok/i.test(s);
export const isRejectedStatus = (s: string) => /reject|return/i.test(s);

export const isPoGeneratedTxn = (s: string) =>
  /order.*gen|po.*gen|payment.*order/i.test(s);
export const isReleasedTxn = (s: string) =>
  /releas|disburs|paid/i.test(s);

/* ══════════════════════════════════════════════════════════════════════
   Cascading filters
   ══════════════════════════════════════════════════════════════════════ */

/** Scope → allowed currency list. Domestic = BTN only; International = every
 *  non-BTN currency the admin has maintained. */
export function filterCurrencyByScope(
  scope: string,
  all: string[],
): string[] {
  if (!scope) return all;
  if (isDomesticScope(scope)) return all.filter((c) => isBtnCurrency(c));
  if (isInternationalScope(scope)) return all.filter((c) => !isBtnCurrency(c));
  return all;
}

/** Beneficiary Type → filtered Organisation Type. Individuals usually only
 *  need "Other"; Institutional can pick any org category. */
export function filterOrgByBeneficiaryType(
  type: string,
  all: string[],
): string[] {
  if (!type) return all;
  if (isIndividualBeneficiary(type))
    return all.filter((o) => /other/i.test(o));
  return all;
}

/** Frequency implicitly drives whether membershipPeriodTo is required. */
export function isRecurringFrequency(freq: string): boolean {
  return /month|quarter|half|annual|bienn|recur/i.test(freq);
}

/** Entity lifecycle transitions (PD row 107 + row 109 audit trail). */
export function nextAllowedEntityStatuses(
  current: string,
  all: string[],
): string[] {
  if (!current || isDraftStatus(current))
    return all.filter((s) => isDraftStatus(s) || isSubmittedStatus(s));
  if (isSubmittedStatus(current))
    return all.filter(
      (s) => isUnderValidationStatus(s) || isRejectedStatus(s),
    );
  if (isUnderValidationStatus(current))
    return all.filter((s) => isApprovedStatus(s) || isRejectedStatus(s));
  if (isApprovedStatus(current))
    return all.filter((s) => isActiveStatus(s));
  if (isActiveStatus(current))
    return all.filter(
      (s) => isInactiveStatus(s) || isSuspendedStatus(s) || isClosedStatus(s),
    );
  if (isSuspendedStatus(current))
    return all.filter((s) => isActiveStatus(s) || isClosedStatus(s));
  if (isInactiveStatus(current))
    return all.filter((s) => isActiveStatus(s) || isClosedStatus(s));
  return all;
}

/** Payment transaction transitions (PD row 108 — Draft → Submitted →
 *  Under Validation → Approved → PO Generated → Released). */
export function nextAllowedTxnStatuses(
  current: string,
  all: string[],
): string[] {
  if (!current || isDraftStatus(current))
    return all.filter((s) => isDraftStatus(s) || isSubmittedStatus(s));
  if (isSubmittedStatus(current))
    return all.filter(
      (s) => isUnderValidationStatus(s) || isRejectedStatus(s),
    );
  if (isUnderValidationStatus(current))
    return all.filter((s) => isApprovedStatus(s) || isRejectedStatus(s));
  if (isApprovedStatus(current)) return all.filter((s) => isPoGeneratedTxn(s));
  if (isPoGeneratedTxn(current)) return all.filter((s) => isReleasedTxn(s));
  return all;
}
