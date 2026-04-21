/* Shared types extracted from AdvancesPage.tsx */

export type AdvanceMode = "contractual" | "non-contractual";
export type Step = 1 | 2 | 3 | 4 | 5 | 6;

export interface ContractRecord {
  id: string;
  title: string;
  contractorId: string;
  contractorName: string;
  agencyId: string;
  agencyName: string;
  category: string;
  value: number;
  status: string;
  startDate: string;
  endDate: string;
  /* ── Financial fields from Contract Creation (DD 14.1.x) ── */
  budgetCode: string;
  commitmentRef: string;
  commitmentBalance: number;
  fundingSource: string;
  paymentSource: string;
  advanceApplicable: boolean;
  advanceAmount: number;
  advanceRecoveryMethod: string;
  mobilizationPercent: number;
  contractCurrency: string;
  expenditureType: string;
  sectorId: string;
  subSectorId: string;
}

export interface AdvanceForm {
  contractId: string;
  contractorId: string;
  agencyId: string;
  advanceCategory: string;
  amount: string;
  purpose: string;
  contractStatus: string;
  ucoaLevel: string;
  budgetCode: string;
  commitmentRef: string;
  bankGuaranteeRef: string;
  bankGuaranteeAmount: string;
  bankGuaranteeBank: string;
  bankGuaranteeExpiry: string;
  siteInspectionReport: boolean;
  materialVerification: boolean;
  securityInsurance: boolean;
  remarks: string;
  /* non-contractual */
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  ministryCode: string;
  orgCode: string;
  ministryName: string;
  imprestPurpose: string;
  imprestAmount: string;
  previousSettled: boolean;
}

export interface SanctionValidation {
  id: string;
  check: string;
  pass: boolean;
  source: string;
  ref: string;
}
