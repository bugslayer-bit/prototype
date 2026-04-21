/* Contract mapping — derive ContractRecord from shared ContractDataContext */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import type { ContractRecord } from "../types";

export function mapStoredToAdvanceContract(s: StoredContract): ContractRecord {
  const fd = s.formData;
  const val = parseFloat(s.contractValue) || 0;
  return {
    id: s.contractId,
    title: s.contractTitle,
    contractorId: s.contractorId,
    contractorName: s.contractorName,
    agencyId: s.agencyName,
    agencyName: s.agencyName,
    category: s.contractCategory[0] || "",
    value: val,
    status: s.workflowStatus === "approved" ? "Active" : s.contractStatus,
    startDate: s.startDate,
    endDate: s.endDate,
    budgetCode: fd.budgetCode || "",
    commitmentRef: fd.commitmentReference || "",
    commitmentBalance: parseFloat(fd.commitmentBalance) || val,
    fundingSource: s.fundingSource || fd.fundingSource || "",
    paymentSource: fd.paymentSource || "",
    advanceApplicable: fd.advancePayment ?? false,
    advanceAmount: parseFloat(fd.advanceAmount) || 0,
    advanceRecoveryMethod: fd.advanceRecoveryMethod || "",
    mobilizationPercent: parseFloat(fd.mobilizationAdvancePercent) || 0,
    contractCurrency: fd.contractCurrencyId || "BTN",
    expenditureType: s.expenditureType || fd.expenditureType || "",
    sectorId: fd.sectorId || "",
    subSectorId: fd.subSectorId || "",
  };
}
