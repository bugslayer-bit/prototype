/* ═══════════════════════════════════════════════════════════════════════════
   useFiMasterData
   ───────────────
   Pulls every LoV consumed by the Financial Institution Management module
   (SRS PRN 7.1) from the shared MasterDataContext. ZERO hardcoded fallbacks
   — if a key is empty the UI shows an amber banner prompting the admin to
   populate it from /master-data.

   Cascading helpers:
     • filterLicenceByType(type)     — narrows licence-category options based
                                       on the chosen institution-type
     • filterServicesByType(type)    — narrows service-category options
     • filterMonitoringByRisk(risk)  — narrows review-frequency options
   All cascade rules are keyword-based so that admins can rename LoV values
   without breaking the derivations.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

export interface FiMasterData {
  institutionType: string[];       /* fi-institution-type */
  ownershipType: string[];         /* fi-ownership-type */
  licenceCategory: string[];       /* fi-licence-category */
  regulatoryBody: string[];        /* fi-regulatory-body */
  operatingRegion: string[];       /* fi-operating-region */
  registrationStatus: string[];    /* fi-registration-status */
  documentType: string[];          /* fi-document-type */
  validationRule: string[];        /* fi-validation-rule */
  approvalLevel: string[];         /* fi-approval-level */
  approvalDecision: string[];      /* fi-approval-decision */
  serviceCategory: string[];       /* fi-service-category */
  riskRating: string[];            /* fi-risk-rating */
  reviewFrequency: string[];       /* fi-review-frequency */
  currency: string[];              /* fi-currency */
  monitoringStatus: string[];      /* fi-monitoring-status */
}

function get(map: Map<string, string[]>, id: string): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? [...list] : [];
}

export function useFiMasterData(): FiMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(
    () => ({
      institutionType: get(masterDataMap, "fi-institution-type"),
      ownershipType: get(masterDataMap, "fi-ownership-type"),
      licenceCategory: get(masterDataMap, "fi-licence-category"),
      regulatoryBody: get(masterDataMap, "fi-regulatory-body"),
      operatingRegion: get(masterDataMap, "fi-operating-region"),
      registrationStatus: get(masterDataMap, "fi-registration-status"),
      documentType: get(masterDataMap, "fi-document-type"),
      validationRule: get(masterDataMap, "fi-validation-rule"),
      approvalLevel: get(masterDataMap, "approval-level"),
      approvalDecision: get(masterDataMap, "approval-decision"),
      serviceCategory: get(masterDataMap, "fi-service-category"),
      riskRating: get(masterDataMap, "fi-risk-rating"),
      reviewFrequency: get(masterDataMap, "fi-review-frequency"),
      currency: get(masterDataMap, "currency-type"),
      monitoringStatus: get(masterDataMap, "fi-monitoring-status"),
    }),
    [masterDataMap],
  );
}

/* ─── Semantic helpers (keyword-based, case-insensitive) ─────────────── */
export const isDraftStatus = (s: string) => /draft|new/i.test(s);
export const isSubmittedStatus = (s: string) => /submit/i.test(s);
export const isRmaReviewStatus = (s: string) => /rma.*review/i.test(s);
export const isDtaReviewStatus = (s: string) => /dta.*review/i.test(s);
export const isApprovedStatus = (s: string) => /approv/i.test(s) && !/re.?approv/i.test(s);
export const isActiveStatus = (s: string) => /active|live/i.test(s);
export const isSuspendedStatus = (s: string) => /suspend|hold|dormant/i.test(s);
export const isRevokedStatus = (s: string) => /revok|cancel|terminat/i.test(s);
export const isRejectedStatus = (s: string) => /reject|return/i.test(s);
export const isExpiredStatus = (s: string) => /expir|lapse/i.test(s);
export const isDeferredStatus = (s: string) => /defer|pending|clarif/i.test(s);

export const isBankType = (t: string) => /bank/i.test(t);
export const isInsuranceType = (t: string) => /insur/i.test(t);
export const isMicroFinanceType = (t: string) => /micro|mfi/i.test(t);
export const isNbfiType = (t: string) => /nbfi|non.?bank/i.test(t);
export const isPaymentSystemsType = (t: string) => /payment/i.test(t);
export const isCreditBureauType = (t: string) => /credit|bureau/i.test(t);

export const isHighRisk = (r: string) => /high|critical|elevat/i.test(r);
export const isLowRisk = (r: string) => /low|moderate/i.test(r);

export const isLocalCurrency = (c: string) => /btn|ngult|bhutan|local/i.test(c);
export const isForeignCurrency = (c: string) => c.length > 0 && !isLocalCurrency(c);

/* ══════════════════════════════════════════════════════════════════════
   Cascading filters
   ──────────────────
   Keyword-driven derivations so "Insurance Company" only offers Insurance
   licences, Banks only offer Banking licences, etc. When admins rename
   values in master-data the rules keep working.
   ══════════════════════════════════════════════════════════════════════ */

export function filterLicenceByType(type: string, all: string[]): string[] {
  if (!type) return all;
  const t = type.toLowerCase();
  return all.filter((l) => {
    const lc = l.toLowerCase();
    if (/insur/i.test(t)) return /insur/i.test(lc);
    if (/bank/i.test(t) && !/non/.test(t)) return /bank/i.test(lc) && !/nbfi/i.test(lc);
    if (/micro|mfi/i.test(t)) return /mfi|micro/i.test(lc);
    if (/nbfi|non.?bank/i.test(t)) return /nbfi|non.?bank/i.test(lc);
    if (/payment/i.test(t)) return /payment/i.test(lc);
    if (/credit|bureau/i.test(t)) return /credit|bureau|restricted/i.test(lc);
    return true; /* fall-through keeps the field usable */
  });
}

export function filterServicesByType(type: string, all: string[]): string[] {
  if (!type) return all;
  return all.filter((svc) => {
    const sc = svc.toLowerCase();
    if (isBankType(type) && !isNbfiType(type)) {
      return /bank|loan|bill|treasury|trade|remit|digital|custod/i.test(sc);
    }
    if (isInsuranceType(type)) return /insur|claim|underwrit|custod/i.test(sc);
    if (isMicroFinanceType(type)) return /loan|remit|digital|micro/i.test(sc);
    if (isNbfiType(type)) return /loan|bill|treasury|trade|remit|custod/i.test(sc);
    if (isPaymentSystemsType(type)) return /digital|remit|payment/i.test(sc);
    if (isCreditBureauType(type)) return /custod|credit|digital/i.test(sc);
    return true;
  });
}

export function filterReviewByRisk(risk: string, all: string[]): string[] {
  if (!risk) return all;
  if (isHighRisk(risk)) return all.filter((f) => /month|quarter|demand/i.test(f));
  if (isLowRisk(risk)) return all.filter((f) => /half|annual|bienn|quarter|demand/i.test(f));
  return all;
}

/* Suggest the next allowed registration status given the current one —
   drives the wizard's "Advance status" action so values stay inside the
   admin-defined LoV rather than being hardcoded. */
export function nextAllowedStatuses(current: string, all: string[]): string[] {
  if (!current || isDraftStatus(current)) {
    return all.filter((s) => isSubmittedStatus(s) || isDraftStatus(s));
  }
  if (isSubmittedStatus(current)) return all.filter((s) => isRmaReviewStatus(s) || isRejectedStatus(s));
  if (isRmaReviewStatus(current)) return all.filter((s) => isDtaReviewStatus(s) || isDeferredStatus(s) || isRejectedStatus(s));
  if (isDtaReviewStatus(current)) return all.filter((s) => isApprovedStatus(s) || isDeferredStatus(s) || isRejectedStatus(s));
  if (isApprovedStatus(current)) return all.filter((s) => isActiveStatus(s) || isSuspendedStatus(s));
  if (isActiveStatus(current)) return all.filter((s) => isSuspendedStatus(s) || isRevokedStatus(s) || isExpiredStatus(s));
  if (isSuspendedStatus(current)) return all.filter((s) => isActiveStatus(s) || isRevokedStatus(s));
  return all;
}
