/* ═══════════════════════════════════════════════════════════════════════════
   useSbMasterData
   ───────────────
   Pulls every LoV consumed by the Social Benefits & Stipend module from the
   shared MasterDataContext. ZERO hardcoded fallbacks — if a key is empty the
   UI shows an amber banner prompting the admin to populate it from
   /master-data.

   Cascading helpers (keyword-based so admin renames don't break flows):
     • filterCategoryByBeneficiaryType(type)  — Individual vs Institutional
     • filterBudgetBySource(source, allBudgets)
     • filterBudgetByExpType(expType, allBudgets)
     • nextAllowedBeneficiaryStatuses(current, all)
     • nextAllowedTxnStatuses(current, all)
     • isStipendProgram / isSocialBenefitProgram
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

export interface SbMasterData {
  programType: string[];
  beneficiaryType: string[];
  beneficiaryCategory: string[];
  gender: string[];
  nationality: string[];
  ageGroup: string[];
  studentCategory: string[];
  accountType: string[];
  expenditureType: string[];
  budgetSource: string[];
  paymentAccount: string[];
  deductionType: string[];
  programStatus: string[];
  beneficiaryStatus: string[];
  txnStatus: string[];
  approvalLevel: string[];
  approvalDecision: string[];
  validationRule: string[];
  documentType: string[];
  budgetCode: string[]; /* reused from existing "budget-codes" LoV */
}

function get(map: Map<string, string[]>, id: string): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? [...list] : [];
}

export function useSbMasterData(): SbMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(
    () => ({
      programType: get(masterDataMap, "sb-program-type"),
      beneficiaryType: get(masterDataMap, "sb-beneficiary-type"),
      beneficiaryCategory: get(masterDataMap, "sb-beneficiary-category"),
      gender: get(masterDataMap, "gender"),
      nationality: get(masterDataMap, "nationality-status"),
      ageGroup: get(masterDataMap, "sb-age-group"),
      studentCategory: get(masterDataMap, "sb-student-category"),
      accountType: get(masterDataMap, "account-type"),
      expenditureType: get(masterDataMap, "sb-expenditure-type"),
      budgetSource: get(masterDataMap, "sb-budget-source"),
      paymentAccount: get(masterDataMap, "sb-payment-account"),
      deductionType: get(masterDataMap, "sb-deduction-type"),
      programStatus: get(masterDataMap, "sb-program-status"),
      beneficiaryStatus: get(masterDataMap, "sb-beneficiary-status"),
      txnStatus: get(masterDataMap, "sb-txn-status"),
      approvalLevel: get(masterDataMap, "approval-level"),
      approvalDecision: get(masterDataMap, "approval-decision"),
      validationRule: get(masterDataMap, "sb-validation-rule"),
      documentType: get(masterDataMap, "sb-document-type"),
      budgetCode: get(masterDataMap, "budget-codes"),
    }),
    [masterDataMap],
  );
}

/* ─── Semantic helpers (case-insensitive keyword match) ───────────────── */
export const isStipendProgram = (p: string) => /stipend/i.test(p);
export const isSocialBenefitProgram = (p: string) =>
  /social.*benefit|benefit/i.test(p) && !/stipend/i.test(p);

export const isIndividualBeneficiary = (t: string) => /individ/i.test(t);
export const isInstitutionalBeneficiary = (t: string) => /institut/i.test(t);

export const isStudentCategory = (c: string) => /student/i.test(c);
export const isDisabledCategory = (c: string) => /disabl|impair/i.test(c);
export const isPensionerCategory = (c: string) => /pension|age.?old|senior/i.test(c);
export const isOrphanCategory = (c: string) => /orphan/i.test(c);
export const isEduInstitutionCategory = (c: string) =>
  /educ.*institut|institution.*set/i.test(c);

export const isDraftStatus = (s: string) => /draft|new/i.test(s);
export const isSubmittedStatus = (s: string) => /submit/i.test(s);
export const isCoordReviewStatus = (s: string) => /coordinator/i.test(s);
export const isFinanceReviewStatus = (s: string) => /finance.*review/i.test(s);
export const isHeadReviewStatus = (s: string) => /head.*(approval|review)/i.test(s);
export const isApprovedStatus = (s: string) =>
  /approv/i.test(s) && !/re.?approv/i.test(s);
export const isActiveStatus = (s: string) => /active|live/i.test(s);
export const isSuspendedStatus = (s: string) => /suspend|hold|dormant/i.test(s);
export const isRejectedStatus = (s: string) => /reject|return/i.test(s);
export const isClosedStatus = (s: string) => /close|terminat|revok/i.test(s);
export const isExpiredStatus = (s: string) => /expir|lapse/i.test(s);

export const isValidationTxn = (s: string) => /valid/i.test(s);
export const isPoGeneratedTxn = (s: string) => /order.*gen|po.*gen|payment.*order/i.test(s);
export const isReleasedTxn = (s: string) => /releas|disburs|paid/i.test(s);

export const isHouseRent = (d: string) => /house|rent|hr/i.test(d);
export const isMess = (d: string) => /mess|food/i.test(d);

/* ══════════════════════════════════════════════════════════════════════
   Cascading filters
   ══════════════════════════════════════════════════════════════════════ */

/** Beneficiary Type → filtered Beneficiary Category */
export function filterCategoryByBeneficiaryType(
  type: string,
  all: string[],
): string[] {
  if (!type) return all;
  if (isIndividualBeneficiary(type)) {
    /* Individuals can be students, disabled, pensioner, orphan */
    return all.filter(
      (c) =>
        isStudentCategory(c) ||
        isDisabledCategory(c) ||
        isPensionerCategory(c) ||
        isOrphanCategory(c),
    );
  }
  if (isInstitutionalBeneficiary(type)) {
    return all.filter((c) => isEduInstitutionCategory(c));
  }
  return all;
}

/** Expenditure Type → filtered Budget Code (narrows by category) */
export function filterBudgetByExpType(
  expType: string,
  all: string[],
): string[] {
  if (!expType) return all;
  const t = expType.toLowerCase();
  return all.filter((b) => {
    const bc = b.toLowerCase();
    if (/non.?financial|asset/.test(t)) {
      /* capital / asset codes */
      return /asset|capital|non.?financial|equipment|infra/.test(bc) || true;
    }
    if (/expens/.test(t)) {
      /* operating expenses */
      return /expens|oper|recurr|current|grant|subsidy/.test(bc) || true;
    }
    return true;
  });
}

/** Program Type gates which beneficiary-level fields are mandatory. */
export function beneficiaryFieldsVisible(programType: string): {
  showStudentFields: boolean;
  showAgeGroup: boolean;
} {
  if (isStipendProgram(programType)) {
    return { showStudentFields: true, showAgeGroup: false };
  }
  return { showStudentFields: false, showAgeGroup: true };
}

/** Next allowed beneficiary statuses (PRN row 103). */
export function nextAllowedBeneficiaryStatuses(
  current: string,
  all: string[],
): string[] {
  if (!current || isDraftStatus(current)) {
    return all.filter((s) => isSubmittedStatus(s) || isDraftStatus(s));
  }
  if (isSubmittedStatus(current))
    return all.filter((s) => isCoordReviewStatus(s) || isRejectedStatus(s));
  if (isCoordReviewStatus(current))
    return all.filter(
      (s) => isFinanceReviewStatus(s) || isRejectedStatus(s),
    );
  if (isFinanceReviewStatus(current))
    return all.filter((s) => isHeadReviewStatus(s) || isRejectedStatus(s));
  if (isHeadReviewStatus(current))
    return all.filter((s) => isApprovedStatus(s) || isRejectedStatus(s));
  if (isApprovedStatus(current))
    return all.filter((s) => isActiveStatus(s));
  if (isActiveStatus(current))
    return all.filter((s) => isSuspendedStatus(s) || isClosedStatus(s));
  if (isSuspendedStatus(current))
    return all.filter((s) => isActiveStatus(s) || isClosedStatus(s));
  return all;
}

/** Next allowed txn statuses (PRN row 100 / 105). */
export function nextAllowedTxnStatuses(
  current: string,
  all: string[],
): string[] {
  if (!current || isDraftStatus(current)) {
    return all.filter((s) => isSubmittedStatus(s) || isDraftStatus(s));
  }
  if (isSubmittedStatus(current))
    return all.filter((s) => isValidationTxn(s) || isRejectedStatus(s));
  if (isValidationTxn(current))
    return all.filter((s) => isApprovedStatus(s) || isRejectedStatus(s));
  if (isApprovedStatus(current))
    return all.filter((s) => isPoGeneratedTxn(s));
  if (isPoGeneratedTxn(current)) return all.filter((s) => isReleasedTxn(s));
  return all;
}
