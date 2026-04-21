import type { ContractFormState, CreationMethod, MethodMeta, PreconditionResult } from "./types";

export interface BaseContractSectionProps {
  form: ContractFormState;
  inputClass: string;
  lockedInputClass: string;
  labelClass: string;
}

export interface ContractMethodHeaderSectionProps extends BaseContractSectionProps {
  methodMeta: Record<Exclude<CreationMethod, "">, MethodMeta>;
  submitted: boolean;
  methodError?: string;
  isFieldLocked: (field: keyof ContractFormState) => boolean;
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  handleMethodSelect: (method: CreationMethod) => void;
  toggleCategory: (category: string) => void;
  helperFor: (fieldKey: "contractId" | "agencyContractId" | "method" | "contractTitle" | "contractDescription" | "expenditureType" | "contractCategory" | "contractClassification" | "contractStatus") => JSX.Element;
}

export interface ContractBudgetFundingSectionProps extends BaseContractSectionProps {
  isFieldLocked: (field: keyof ContractFormState) => boolean;
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  validateCommitmentReference: () => void;
  commitmentValidated: boolean;
  preconditionResults: PreconditionResult[];
  helperFor: (fieldKey: "commitmentReference" | "budgetCode" | "expenditureCategoryId" | "sectorId" | "subSectorId" | "fundingSource" | "fundingAgencyName" | "paymentSource" | "paymentAccount" | "programProjectId" | "programProjectName" | "contractValue" | "contractCurrencyId" | "grossAmount") => JSX.Element;
}

export interface ContractDurationAgencySectionProps extends BaseContractSectionProps {
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  helperFor: (fieldKey: "contractDuration" | "startDate" | "endDate" | "contractClosureDate" | "agencyId" | "multiYearFlag" | "multiYearCommitmentRef") => JSX.Element;
}

export interface ContractContractorInfoSectionProps extends BaseContractSectionProps {
  isFieldLocked: (field: keyof ContractFormState) => boolean;
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  verifyContractor: () => void;
  helperFor: (fieldKey: "contractorId" | "contractorName" | "officerId" | "officerContractId" | "officerSalutation" | "officerFirstName" | "officerMiddleName" | "officerLastName" | "officerEmail" | "officerPhoneNumber" | "paymentStructure") => JSX.Element;
}

export interface ContractItemDetailsSectionProps extends BaseContractSectionProps {
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  helperFor: (fieldKey: "contractItemId" | "itemCode" | "itemDescription" | "itemCategory" | "itemSubCategory" | "itemQuantity" | "itemUnit" | "itemUnitRate" | "itemTotalAmount" | "quantityBalance" | "amountBalance") => JSX.Element;
}

export interface ContractAdvancesTaxSectionProps extends BaseContractSectionProps {
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  helperFor: (fieldKey: "advancePayment" | "advanceAmount" | "advanceRecoverable" | "taxApplicable" | "taxExemptionReason" | "liquidatedDamagesLimit" | "billDiscountingEligible" | "discountingRate" | "retentionApplicable" | "retentionRate" | "mobilizationAdvance" | "advanceRecoveryMethod" | "deductionType" | "deductionMethod" | "warrantyMonths" | "tdsApplicable" | "gstApplicable" | "incomeTaxApplicable") => JSX.Element;
}

export interface ContractMilestonesSectionProps extends BaseContractSectionProps {
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  updateMilestoneRow: (
    id: string,
    key:
      | "milestoneNumber"
      | "milestoneName"
      | "milestoneDescription"
      | "estimatedPaymentDate"
      | "milestoneAmountGross"
      | "milestoneTaxAmount1"
      | "milestoneTaxAmount2"
      | "milestoneDeduction1"
      | "milestoneDeduction2"
      | "milestoneStatus",
    value: string
  ) => void;
  addMilestoneRow: () => void;
  addSupportingDocument: (label: string) => void;
  helperFor: (
    fieldKey:
      | "milestonePlan"
      | "milestoneId"
      | "milestoneNumber"
      | "milestoneName"
      | "milestoneDescription"
      | "estimatedPaymentDate"
      | "milestoneAmountGross"
      | "milestoneTaxAmount1"
      | "milestoneTaxAmount2"
      | "milestoneDeduction1"
      | "milestoneDeduction2"
      | "netMilestoneAmount"
      | "milestoneStatus"
  ) => JSX.Element;
}

export interface ContractValidateSubmitSectionProps extends BaseContractSectionProps {
  methodMeta: Record<Exclude<CreationMethod, "">, MethodMeta>;
  updateField: <Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) => void;
  preconditionResults: PreconditionResult[];
  onSubmitForApproval: () => void;
  isFormLocked: boolean;
}
