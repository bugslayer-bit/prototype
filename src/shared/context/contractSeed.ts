/* ═══════════════════════════════════════════════════════════════════════════
   contractSeed.ts
   ───────────────────────────────────────────────────────────────────────────
   Default seed contract used when ContractDataContext finds no contracts in
   localStorage and the dev API returns nothing. The seed is a fully-populated
   Works contract suitable for the "Secured Advance" flow on the Advances page,
   so demos and first-run users always have at least one valid contract to
   click through end-to-end.

   All values are sourced from the same UCoA / Master Data groups the live
   form pulls from, so they stay in sync if admins edit those groups.
   ═══════════════════════════════════════════════════════════════════════════ */
import { initialForm } from "../../modules/expenditure/contractCreation/config";
import type { ContractFormState } from "../../modules/expenditure/contractCreation/types";
import type { StoredContract } from "./ContractDataContext";
import { ADDITIONAL_SEED_CONTRACTS } from "./demoSeed";

const SECURED_ADVANCE_WORKS_CONTRACT_ID = "CTR-WRK-2026-9001";

const securedAdvanceFormData: ContractFormState = {
  ...initialForm,
  method: "manual",
  contractId: SECURED_ADVANCE_WORKS_CONTRACT_ID,
  agencyContractId: "AGY-CTR-WRK-9001",
  contractTitle: "Construction of Bumthang District Hospital — Phase 2 Civil Works",
  contractDescription:
    "Civil construction works for the Bumthang District Hospital Phase 2 expansion including foundation, RCC frame, masonry, plastering, plumbing, electrical conduiting, and external site development. Includes provision for material storage on site, bonded warehousing of imported equipment, and a Secured Advance against verified materials brought to site under BR 25.1.6.",
  expenditureType: "Non-Financial Assets",
  contractCategory: ["Works"],
  contractClassification: "Multi-Year",
  contractStatus: "Active",
  workflowStatus: "approved",

  budgetCode: "BUD-MOH-INFRA-2026-091",
  commitmentReference: "COM-MOH-2026-0091",
  commitmentBalance: "150,000,000.00",
  expenditureCategoryId: "EXP-311-INFRA",
  sectorId: "SEC-07-HEALTH",
  subSectorId: "SSEC-07-02-HOSPITAL",
  ucoaLevel: "Sub-Sector",
  contractValue: "120000000",

  fundingSource: "RGOB",
  fundingAgencyName: "Ministry of Health",
  paymentSource: "TSA",
  paymentAccount: "RMA-GOB-MOH-0091-2026",
  programProjectId: "PROG-HEALTH-DH-2025",
  programProjectName: "District Hospital Expansion Programme",

  contractDuration: "24 months",
  startDate: "2026-04-15",
  endDate: "2028-04-14",
  contractClosureDate: "2028-04-14",
  multiYearFlag: true,
  multiYearCommitmentRef: "MYC-MOH-2026-0091",
  agencyId: "AGY-MOH",
  agencyName: "Ministry of Health",
  contractCurrencyId: "BTN",
  grossAmount: "120000000",

  contractorId: "CTR-BIZ-2026-9001",
  contractorName: "Druk Construction & Engineering Pvt. Ltd.",
  contractorStatus: "Verified",
  contractorBankAccount: "BOB-001-2034-9912",
  contractorDebarmentStatus: "Clear",
  officerSalutation: "Mr.",
  officerFirstName: "Tshering",
  officerLastName: "Wangchuk",
  officerEmail: "tshering.w@drukconstruction.bt",
  officerPhoneNumber: "+975-17-654-321",
  paymentStructure: "Milestone-based",

  /* ── Advance configuration — what makes this contract Secured-Advance ready ── */
  advancePayment: true,
  advanceAmount: "18000000",
  advanceRecoverable: true,
  advanceRecoveryMethod: "Proportional Deduction",
  mobilizationAdvance: "12000000",
  mobilizationAdvancePercent: "10",

  taxApplicable: true,
  taxType: ["TDS", "GST"],
  tdsApplicable: true,
  tdsRate: "2",
  gstApplicable: true,
  gstRate: "7",
  vendorTaxType: "Domestic Contractor",
  vendorOrigin: "Bhutanese",
  taxLegalReference: "Income Tax Act 2025",

  retentionApplicable: true,
  retentionRate: "10",
  warrantyMonths: "12",

  liquidatedDamagesLimit: "10",
  billDiscountingEligible: false,

  milestonePlan:
    "M1 Foundation · M2 Frame · M3 Masonry · M4 Finishing · M5 Handover",

  submittedAt: "2026-03-20T09:30:00.000Z",
  approvedAt: "2026-04-02T15:45:00.000Z",
};

export const SEED_CONTRACTS: StoredContract[] = [
  ...ADDITIONAL_SEED_CONTRACTS,
  {
    id: SECURED_ADVANCE_WORKS_CONTRACT_ID,
    contractId: SECURED_ADVANCE_WORKS_CONTRACT_ID,
    contractTitle: securedAdvanceFormData.contractTitle,
    contractValue: securedAdvanceFormData.contractValue,
    contractCategory: securedAdvanceFormData.contractCategory,
    contractClassification: securedAdvanceFormData.contractClassification,
    method: securedAdvanceFormData.method,
    agencyName: securedAdvanceFormData.agencyName,
    contractorName: securedAdvanceFormData.contractorName,
    contractorId: securedAdvanceFormData.contractorId,
    startDate: securedAdvanceFormData.startDate,
    endDate: securedAdvanceFormData.endDate,
    workflowStatus: "approved",
    contractStatus: "Active",
    submittedAt: securedAdvanceFormData.submittedAt,
    approvedAt: securedAdvanceFormData.approvedAt,
    rejectedAt: "",
    approvalRemarks:
      "All preconditions met. Multi-year commitment verified. Routed for Secured Advance against verified materials per BR 25.1.6.",
    currentApprover: "",
    fundingSource: securedAdvanceFormData.fundingSource,
    expenditureType: securedAdvanceFormData.expenditureType,
    formData: securedAdvanceFormData,
  },
];
