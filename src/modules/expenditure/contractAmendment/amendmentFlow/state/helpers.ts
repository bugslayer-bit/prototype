/* Pure helpers for ContractAmendmentPage */
import type { AmendmentFormState } from "../../types";
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import { INITIAL_STATE } from "../config/initialState";

export function amendmentFromContract(sourceContract?: StoredContract | null): AmendmentFormState {
  if (!sourceContract) return INITIAL_STATE;
  const formData = sourceContract.formData ?? ({} as StoredContract["formData"]);
  if (sourceContract.amendmentDraft) return sourceContract.amendmentDraft;

  return {
    ...INITIAL_STATE,
    contractId: sourceContract.contractId,
    contractTitle: sourceContract.contractTitle,
    currentContractValue: sourceContract.contractValue,
    currentEndDate: sourceContract.endDate,
    commitmentBalance: formData?.commitmentBalance ?? "",
    amountAlreadyPaid: formData?.grossAmount || "0",
    multiYearImplication: !!formData?.multiYearFlag,
    newRetentionPercent: formData?.retentionRate ?? "",
    newAdvanceRecoveryRule: formData?.advanceRecoveryMethod ?? "",
    newTaxApplicability: formData?.taxApplicable ? "yes" : "no",
    newLdRule: formData?.liquidatedDamagesLimit ?? "",
    versionNumber: 1,
  };
}
