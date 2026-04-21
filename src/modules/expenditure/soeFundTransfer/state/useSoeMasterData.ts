/* ═══════════════════════════════════════════════════════════════════════════
   useSoeMasterData
   ────────────────
   Pulls every LoV consumed by the SOE & Fund Transfer Management module
   (SRS PRN 6.2) from the shared MasterDataContext. ZERO hardcoded fallbacks —
   if a key is empty the UI shows an amber banner prompting the admin to
   populate it from /master-data.

   Keyword-based semantic helpers mean admins can rename a LoV value and the
   module's status colours / KPI logic continues to work.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

export interface SoeMasterData {
  transferType: string[];            /* soe-transfer-type */
  direction: string[];               /* soe-direction */
  sourceOfFund: string[];            /* soe-source-of-fund */
  destinationAccountType: string[];  /* soe-destination-account-type */
  transferStatus: string[];          /* soe-transfer-status */
  expenditureCategory: string[];     /* soe-expenditure-category */
  supportingDocumentType: string[];  /* soe-supporting-document-type */
  validationRule: string[];          /* soe-validation-rule */
  approvalLevel: string[];           /* soe-approval-level */
  releaseChannel: string[];          /* soe-release-channel */
  reconciliationStatus: string[];    /* soe-reconciliation-status */
  currency: string[];                /* soe-currency */
  reportingFrequency: string[];      /* soe-frequency */
  ucoaLevel: string[];               /* ucoa-level */
  approvalDecision: string[];        /* approval-decision */
}

function get(map: Map<string, string[]>, id: string): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? [...list] : [];
}

export function useSoeMasterData(): SoeMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(
    () => ({
      transferType: get(masterDataMap, "soe-transfer-type"),
      direction: get(masterDataMap, "soe-direction"),
      sourceOfFund: get(masterDataMap, "soe-source-of-fund"),
      destinationAccountType: get(masterDataMap, "soe-destination-account-type"),
      transferStatus: get(masterDataMap, "soe-transfer-status"),
      expenditureCategory: get(masterDataMap, "soe-expenditure-category"),
      supportingDocumentType: get(masterDataMap, "soe-supporting-document-type"),
      validationRule: get(masterDataMap, "soe-validation-rule"),
      approvalLevel: get(masterDataMap, "approval-level"),
      releaseChannel: get(masterDataMap, "soe-release-channel"),
      reconciliationStatus: get(masterDataMap, "soe-reconciliation-status"),
      currency: get(masterDataMap, "currency-type"),
      reportingFrequency: get(masterDataMap, "payment-frequency"),
      ucoaLevel: get(masterDataMap, "ucoa-level"),
      approvalDecision: get(masterDataMap, "approval-decision"),
    }),
    [masterDataMap],
  );
}

/* ─── Semantic helpers (keyword-based, case-insensitive) ─────────────── */
export const isDraftStatus = (s: string) => /draft|new/i.test(s);
export const isSubmittedStatus = (s: string) => /submit/i.test(s);
export const isValidatedStatus = (s: string) => /valid/i.test(s);
export const isApprovedStatus = (s: string) => /approv/i.test(s) && !/re.?approv/i.test(s);
export const isParliamentSanctionedStatus = (s: string) => /parliament|sanction/i.test(s);
export const isReleasedStatus = (s: string) => /releas|paid|completed/i.test(s);
export const isReconciledStatus = (s: string) => /reconcil/i.test(s);
export const isRejectedStatus = (s: string) => /reject|returned/i.test(s);
export const isCancelledStatus = (s: string) => /cancel|void/i.test(s);

export const isIncomingDirection = (s: string) => /incom/i.test(s);
export const isOutgoingDirection = (s: string) => /outgo/i.test(s);

export const isLocalCurrency = (s: string) => /btn|ngult|bhutan|local/i.test(s);
export const isForeignCurrency = (s: string) => !isLocalCurrency(s);

export const isReconciled = (s: string) => /matched|reconcil/i.test(s) && !/unmatch/i.test(s);
export const isUnreconciled = (s: string) => /unmatch|dispute|not.?started/i.test(s);
