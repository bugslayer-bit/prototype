import type { ContractFormState, ContractItemRow, CreationMethod, FormStep, MethodMeta, MilestoneRow, SupportingDocument } from "./types";
import { getWorkflowConfigForModule, buildWorkflowRuntime, EXPENDITURE_MODULE_KEYS } from "../../../shared/workflow";

/* ── Build dynamic approval steps from workflow engine ── */
function buildInitialApprovalSteps(): ContractFormState["approvalSteps"] {
  const config = getWorkflowConfigForModule(EXPENDITURE_MODULE_KEYS.CONTRACT_CREATION);
  if (!config) return [];
  const runtime = buildWorkflowRuntime(config);
  return runtime.map((step) => ({
    role: step.role,
    status: "pending" as const,
    approverName: "",
    timestamp: "",
    remarks: "",
  }));
}

function createContractItemRow(index: number): ContractItemRow {
  return {
    id: String(index),
    contractItemId: `CI-${String(index).padStart(3, "0")}`,
    contractId: "Auto-linked",
    itemCode: "",
    itemDescription: "",
    itemCategory: "",
    itemSubCategory: "",
    itemQuantity: "",
    itemUnit: "",
    itemUnitRate: "",
    itemTotalAmount: "",
    quantityBalance: "",
    amountBalance: ""
  };
}

function createMilestoneRow(index: number): MilestoneRow {
  return {
    id: String(index),
    milestoneId: `MS-${String(index).padStart(3, "0")}`,
    contractId: "Auto-linked",
    milestoneNumber: String(index),
    milestoneName: "",
    milestoneDescription: "",
    estimatedPaymentDate: "",
    milestoneAmountGross: "",
    milestoneTaxAmount1: "",
    milestoneTaxAmount2: "",
    milestoneDeduction1: "",
    milestoneDeduction2: "",
    netMilestoneAmount: "",
    milestoneStatus: "Pending"
  };
}

/* ── Pre-populated items for system methods ── */

function fileUploadItems(): ContractItemRow[] {
  return [
    { id: "1", contractItemId: "CI-001", contractId: "Auto-linked", itemCode: "GDS-4201", itemDescription: "Desktop Computers — Dell OptiPlex 7090", itemCategory: "Goods", itemSubCategory: "IT Equipment", itemQuantity: "50", itemUnit: "Units", itemUnitRate: "85000", itemTotalAmount: "4250000", quantityBalance: "50", amountBalance: "4250000" },
    { id: "2", contractItemId: "CI-002", contractId: "Auto-linked", itemCode: "GDS-4202", itemDescription: "UPS Battery Backup — 1500VA", itemCategory: "Goods", itemSubCategory: "IT Equipment", itemQuantity: "50", itemUnit: "Units", itemUnitRate: "12000", itemTotalAmount: "600000", quantityBalance: "50", amountBalance: "600000" },
    { id: "3", contractItemId: "CI-003", contractId: "Auto-linked", itemCode: "SVC-5301", itemDescription: "Installation & Configuration Services", itemCategory: "Services", itemSubCategory: "Technical Services", itemQuantity: "1", itemUnit: "Lump Sum", itemUnitRate: "150000", itemTotalAmount: "150000", quantityBalance: "1", amountBalance: "150000" },
  ];
}

function egpItems(): ContractItemRow[] {
  return [
    { id: "1", contractItemId: "CI-001", contractId: "Auto-linked", itemCode: "WRK-3101", itemDescription: "Road base preparation & earthwork", itemCategory: "Works", itemSubCategory: "Civil Works", itemQuantity: "12.5", itemUnit: "KM", itemUnitRate: "2400000", itemTotalAmount: "30000000", quantityBalance: "12.5", amountBalance: "30000000" },
    { id: "2", contractItemId: "CI-002", contractId: "Auto-linked", itemCode: "WRK-3102", itemDescription: "Asphalt paving — 2-layer bituminous", itemCategory: "Works", itemSubCategory: "Civil Works", itemQuantity: "12.5", itemUnit: "KM", itemUnitRate: "3600000", itemTotalAmount: "45000000", quantityBalance: "12.5", amountBalance: "45000000" },
    { id: "3", contractItemId: "CI-003", contractId: "Auto-linked", itemCode: "WRK-3103", itemDescription: "Drainage & culvert construction", itemCategory: "Works", itemSubCategory: "Civil Works", itemQuantity: "25", itemUnit: "Units", itemUnitRate: "400000", itemTotalAmount: "10000000", quantityBalance: "25", amountBalance: "10000000" },
    { id: "4", contractItemId: "CI-004", contractId: "Auto-linked", itemCode: "WRK-3104", itemDescription: "Road marking & signage installation", itemCategory: "Works", itemSubCategory: "Civil Works", itemQuantity: "1", itemUnit: "Lump Sum", itemUnitRate: "5000000", itemTotalAmount: "5000000", quantityBalance: "1", amountBalance: "5000000" },
  ];
}

function cmsItems(): ContractItemRow[] {
  return [
    { id: "1", contractItemId: "CI-001", contractId: "Auto-linked", itemCode: "SVC-6101", itemDescription: "Annual IT Support & Maintenance", itemCategory: "Services", itemSubCategory: "Consulting", itemQuantity: "12", itemUnit: "Months", itemUnitRate: "250000", itemTotalAmount: "3000000", quantityBalance: "12", amountBalance: "3000000" },
    { id: "2", contractItemId: "CI-002", contractId: "Auto-linked", itemCode: "SVC-6102", itemDescription: "Network Infrastructure Monitoring", itemCategory: "Services", itemSubCategory: "Technical Services", itemQuantity: "12", itemUnit: "Months", itemUnitRate: "125000", itemTotalAmount: "1500000", quantityBalance: "12", amountBalance: "1500000" },
  ];
}

/* ── Pre-populated milestones for system methods ── */

function fileUploadMilestones(): MilestoneRow[] {
  return [
    { id: "1", milestoneId: "MS-001", contractId: "Auto-linked", milestoneNumber: "1", milestoneName: "Delivery & Inspection", milestoneDescription: "Delivery of all goods and on-site inspection", estimatedPaymentDate: "2026-06-15", milestoneAmountGross: "4850000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "0", milestoneDeduction2: "0", netMilestoneAmount: "4850000", milestoneStatus: "Pending" },
    { id: "2", milestoneId: "MS-002", contractId: "Auto-linked", milestoneNumber: "2", milestoneName: "Installation Complete", milestoneDescription: "Installation, configuration, and acceptance testing", estimatedPaymentDate: "2026-07-30", milestoneAmountGross: "150000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "0", milestoneDeduction2: "0", netMilestoneAmount: "150000", milestoneStatus: "Pending" },
  ];
}

function egpMilestones(): MilestoneRow[] {
  return [
    { id: "1", milestoneId: "MS-001", contractId: "Auto-linked", milestoneNumber: "1", milestoneName: "Mobilization", milestoneDescription: "Site mobilization and base camp setup", estimatedPaymentDate: "2026-05-30", milestoneAmountGross: "9000000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "900000", milestoneDeduction2: "0", netMilestoneAmount: "8100000", milestoneStatus: "Pending" },
    { id: "2", milestoneId: "MS-002", contractId: "Auto-linked", milestoneNumber: "2", milestoneName: "Earthwork Complete", milestoneDescription: "Road base preparation and earthwork — KM 0-12.5", estimatedPaymentDate: "2026-09-30", milestoneAmountGross: "30000000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "3000000", milestoneDeduction2: "0", netMilestoneAmount: "27000000", milestoneStatus: "Pending" },
    { id: "3", milestoneId: "MS-003", contractId: "Auto-linked", milestoneNumber: "3", milestoneName: "Paving Complete", milestoneDescription: "Asphalt paving and drainage complete", estimatedPaymentDate: "2027-03-31", milestoneAmountGross: "41000000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "4100000", milestoneDeduction2: "0", netMilestoneAmount: "36900000", milestoneStatus: "Pending" },
    { id: "4", milestoneId: "MS-004", contractId: "Auto-linked", milestoneNumber: "4", milestoneName: "Final Completion", milestoneDescription: "Signage, markings, defect liability handover", estimatedPaymentDate: "2027-06-30", milestoneAmountGross: "10000000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "1000000", milestoneDeduction2: "0", netMilestoneAmount: "9000000", milestoneStatus: "Pending" },
  ];
}

function cmsMilestones(): MilestoneRow[] {
  return [
    { id: "1", milestoneId: "MS-001", contractId: "Auto-linked", milestoneNumber: "1", milestoneName: "Q1 Service Delivery", milestoneDescription: "IT support and network monitoring — Q1", estimatedPaymentDate: "2026-06-30", milestoneAmountGross: "1125000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "0", milestoneDeduction2: "0", netMilestoneAmount: "1125000", milestoneStatus: "Pending" },
    { id: "2", milestoneId: "MS-002", contractId: "Auto-linked", milestoneNumber: "2", milestoneName: "Q2 Service Delivery", milestoneDescription: "IT support and network monitoring — Q2", estimatedPaymentDate: "2026-09-30", milestoneAmountGross: "1125000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "0", milestoneDeduction2: "0", netMilestoneAmount: "1125000", milestoneStatus: "Pending" },
    { id: "3", milestoneId: "MS-003", contractId: "Auto-linked", milestoneNumber: "3", milestoneName: "Q3 Service Delivery", milestoneDescription: "IT support and network monitoring — Q3", estimatedPaymentDate: "2026-12-31", milestoneAmountGross: "1125000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "0", milestoneDeduction2: "0", netMilestoneAmount: "1125000", milestoneStatus: "Pending" },
    { id: "4", milestoneId: "MS-004", contractId: "Auto-linked", milestoneNumber: "4", milestoneName: "Q4 Service Delivery", milestoneDescription: "IT support and network monitoring — Q4", estimatedPaymentDate: "2027-03-31", milestoneAmountGross: "1125000", milestoneTaxAmount1: "0", milestoneTaxAmount2: "0", milestoneDeduction1: "0", milestoneDeduction2: "0", netMilestoneAmount: "1125000", milestoneStatus: "Pending" },
  ];
}

/* ── Pre-populated supporting docs ── */

function systemDocs(source: string): SupportingDocument[] {
  return [
    { id: "doc-1", label: "Award Letter", fileName: `award_letter_${source}.pdf`, fileSize: "245 KB", uploadedAt: new Date().toISOString().slice(0, 10), status: "uploaded" },
    { id: "doc-2", label: "Contract Agreement", fileName: `contract_agreement_${source}.pdf`, fileSize: "1.2 MB", uploadedAt: new Date().toISOString().slice(0, 10), status: "uploaded" },
    { id: "doc-3", label: "Performance Security", fileName: `performance_security_${source}.pdf`, fileSize: "180 KB", uploadedAt: new Date().toISOString().slice(0, 10), status: "uploaded" },
  ];
}

export const creationSteps: FormStep[] = [
  { id: 1, title: "Method & Header", description: "Select creation channel and initialize the contract header.", owner: "User / System" },
  { id: 2, title: "Budget & Funding", description: "Validate commitment, budget code, and funding source alignment.", owner: "Budget Module" },
  { id: 3, title: "Contract Duration", description: "Capture duration, multi-year flag, ownership, and implementation context.", owner: "Agency" },
  { id: 4, title: "Contractor Info", description: "Resolve contractor master, verify active status, and validate bank account.", owner: "Contractor Master" },
  { id: 5, title: "Item Details", description: "Shape the contract category and downstream obligation profile.", owner: "User" },
  { id: 6, title: "Advances, Retention and Taxes", description: "Configure advances, retention, tax rules, liquidated damages, and bill discounting.", owner: "System / Tax Master" },
  { id: 7, title: "Milestones & Documents", description: "Configure milestone-based execution plan and upload supporting documents.", owner: "User" },
  { id: 8, title: "Validate & Submit", description: "Run all precondition and integrity checks. Submit locks editing and routes to approval.", owner: "Approver Workflow" }
];

export const initialForm: ContractFormState = {
  method: "",
  contractId: "System Generated (CHAR)",
  agencyContractId: "",
  contractTitle: "",
  contractDescription: "",
  expenditureType: "",
  contractCategory: [],
  contractClassification: "",
  contractStatus: "Draft",
  workflowStatus: "draft",

  budgetCode: "",
  commitmentReference: "",
  commitmentBalance: "",
  expenditureCategoryId: "",
  sectorId: "",
  subSectorId: "",
  ucoaLevel: "",
  contractValue: "",
  fundingSource: "",
  fundingAgencyName: "",
  paymentSource: "",
  paymentAccount: "",
  programProjectId: "",
  programProjectName: "",

  contractDuration: "",
  startDate: "",
  endDate: "",
  contractClosureDate: "",
  closureType: "",
  closureReason: "",
  multiYearFlag: false,
  multiYearCommitmentRef: "",
  agencyId: "",
  agencyName: "",
  contractCurrencyId: "BTN",
  bftnIdNumber: "",
  grossAmount: "",

  /* Audit trail defaults — empty for Manual; populated by handleMethodSelect for system-fed methods */
  originalImportedValues: {},
  fieldChanges: [],

  contractorId: "",
  contractorName: "",
  contractorStatus: "Pending verification",
  contractorBankAccount: "",
  contractorDebarmentStatus: "",
  officerId: "Auto-generated",
  officerContractId: "Auto-linked",
  officerSalutation: "",
  officerFirstName: "",
  officerMiddleName: "",
  officerLastName: "",
  officerEmail: "",
  officerPhoneNumber: "",
  paymentStructure: "",

  advancePayment: false,
  advanceAmount: "",
  advanceRecoverable: false,
  advanceRecoveryMethod: "",
  mobilizationAdvance: "",
  mobilizationAdvancePercent: "10",

  taxApplicable: false,
  taxType: [],
  taxExemptionReason: "",
  tdsApplicable: false,
  tdsRate: "",
  gstApplicable: false,
  gstRate: "",
  incomeTaxApplicable: false,
  incomeTaxRate: "",

  /* SRS Tax Master driven defaults */
  vendorTaxType: "",
  vendorTaxSubCategory: "",
  vendorOrigin: "",
  gstExemptItem: "",
  taxLegalReference: "Income Tax Act 2025",

  retentionApplicable: false,
  retentionRate: "10",
  warrantyMonths: "",

  deductionType: "",
  deductionMethod: "",

  liquidatedDamagesLimit: "",
  billDiscountingEligible: false,
  discountingRate: "",
  discountingInstitutionId: "",
  creditLimit: "",

  advanceRecoveryAmount: "",
  outstandingDiscountedAmount: "",
  netPayable: "",
  apId: "",
  paymentOrderId: "",
  bankTransactionReference: "",

  milestonePlan: "",
  contractItemRows: [createContractItemRow(1)],
  milestoneRows: [createMilestoneRow(1)],
  supportingDocuments: [],
  supportingDocLabels: [],

  preconditionResults: [],
  approvalSteps: buildInitialApprovalSteps(),
  reviewNote: "",
  submittedAt: "",
  approvedAt: ""
};

/* ════════════════════════════════════════════════════════════════════════
   FIELD LABEL DICTIONARY — used by the audit-trail panel to render
   human-readable field names instead of camelCase keys.
   ════════════════════════════════════════════════════════════════════════ */
export const fieldLabels: Partial<Record<keyof ContractFormState, string>> = {
  contractTitle: "Contract Title",
  contractDescription: "Contract Description",
  expenditureType: "Expenditure Type",
  contractCategory: "Contract Category",
  contractClassification: "Contract Classification",
  budgetCode: "Budget Code",
  commitmentReference: "Commitment Reference",
  commitmentBalance: "Commitment Balance",
  expenditureCategoryId: "Expenditure Category",
  sectorId: "Sector",
  subSectorId: "Sub-Sector",
  contractValue: "Total Contract Value",
  fundingSource: "Funding Source",
  fundingAgencyName: "Funding Agency",
  paymentSource: "Payment Source",
  paymentAccount: "Payment Account",
  programProjectId: "Program / Project ID",
  programProjectName: "Program / Project Name",
  contractDuration: "Contract Duration",
  startDate: "Start Date",
  endDate: "End Date",
  multiYearFlag: "Multi-Year Flag",
  agencyId: "Agency ID",
  agencyName: "Agency Name",
  contractCurrencyId: "Contract Currency",
  bftnIdNumber: "BFTN ID Number",
  grossAmount: "Initial / Gross Amount",
  contractorId: "Contractor ID",
  contractorName: "Contractor Name",
  contractorStatus: "Contractor Status",
  contractorBankAccount: "Contractor Bank Account",
  contractorDebarmentStatus: "Contractor Debarment Status",
  officerSalutation: "Officer Salutation",
  officerFirstName: "Officer First Name",
  officerLastName: "Officer Last Name",
  officerEmail: "Officer Email",
  officerPhoneNumber: "Officer Phone",
  paymentStructure: "Payment Structure",
  advancePayment: "Advance Payment Applicable",
  advanceAmount: "Advance Amount",
  advanceRecoverable: "Advance Recoverable",
  taxApplicable: "Tax Applicable",
  tdsApplicable: "TDS Applicable",
  tdsRate: "TDS Rate",
  incomeTaxApplicable: "Income Tax Applicable",
  incomeTaxRate: "Income Tax Rate",
  retentionApplicable: "Retention Applicable",
  retentionRate: "Retention Rate",
  warrantyMonths: "Warranty Months",
  liquidatedDamagesLimit: "Liquidated Damages Limit",
  billDiscountingEligible: "Bill Discounting Eligible",
};

/* ════════════════════════════════════════════════════════════════════════
   METHOD CONFIGURATIONS
   ════════════════════════════════════════════════════════════════════════ */

export const methodMeta: Record<Exclude<CreationMethod, "">, MethodMeta> = {

  /* ── A: Manual ── */
  manual: {
    label: "Manual Data Entry",
    tag: "a",
    detail: "User fills up the Form 5 and requires all validations to be passed for submission.",
    actor: "User",
    tone: "emerald",
    bannerTitle: "Manual Data Entry Mode Active",
    bannerDetail: "All form sections stay editable. The user progresses stage by stage and the system validates before submission.",
    steps: [
      "Enter contract header, category, and budget references.",
      "Validate preconditions: budget exists, commitment exists, contractor is active.",
      "Define payment structure and configure financial rules.",
      "Upload supporting documents and submit for workflow approval."
    ],
    suggestedValues: {},
    lockedFields: []
  },

  /* ── B: File Upload — full pre-population ── */
  "file-upload": {
    label: "File Upload",
    tag: "b",
    detail: "User uploads a pre-defined template and IFMIS imports the contract for review.",
    actor: "User",
    tone: "sky",
    bannerTitle: "File Upload Mode Active",
    bannerDetail: "All values imported from the uploaded template. Review and validate before submitting.",
    steps: [
      "Download and complete the contract upload template (CSV/Excel).",
      "Upload file — IFMIS parses and validates all rows.",
      "Review imported data across all sections.",
      "Submit for approval."
    ],
    suggestedValues: {
      contractId: "System Generated (CHAR)",
      agencyContractId: "AGY-CTR-002",
      contractTitle: "IT Equipment Supply & Installation — FY2026",
      contractDescription: "Procurement of desktop computers, UPS units, and installation services for the Ministry of Finance ICT modernization project. Imported from agency upload template.",
      expenditureType: "Expenses",
      contractCategory: ["Goods"],
      contractClassification: "In-Year",
      contractStatus: "Draft",

      budgetCode: "BUD-MOF-ICT-2026-045",
      commitmentReference: "COM-MOF-2026-0312",
      commitmentBalance: "6,500,000.00",
      expenditureCategoryId: "EXP-211-ICT",
      sectorId: "SEC-09-ICT",
      subSectorId: "SSEC-09-03-EQUIP",
      contractValue: "5,000,000.00",
      fundingSource: "RGOB",
      fundingAgencyName: "Ministry of Finance",
      paymentSource: "TSA",
      paymentAccount: "RMA-GOB-0045-2026",
      programProjectId: "PROG-ICT-MOD-2026",
      programProjectName: "ICT Modernization Programme",

      contractDuration: "90 days",
      startDate: "2026-05-01",
      endDate: "2026-07-30",
      multiYearFlag: false,
      agencyId: "AGY-MOF-001",
      agencyName: "Ministry of Finance",
      contractCurrencyId: "BTN",
      bftnIdNumber: "",
      grossAmount: "5,000,000.00",

      contractorId: "CTR-BIZ-2026-0015",
      contractorName: "Druk InfoTech Solutions Pvt. Ltd.",
      contractorStatus: "Active and verified",
      contractorBankAccount: "BNBL-1045-0023-7891",
      contractorDebarmentStatus: "Clear — No sanctions",
      officerSalutation: "Mr.",
      officerFirstName: "Tshering",
      officerMiddleName: "",
      officerLastName: "Dorji",
      officerEmail: "tshering.dorji@mof.gov.bt",
      officerPhoneNumber: "+975-17-234567",
      paymentStructure: "Milestone Based",

      advancePayment: true,
      advanceAmount: "500,000.00",
      advanceRecoverable: true,
      advanceRecoveryMethod: "Auto-populated from CMS",
      mobilizationAdvance: "500,000.00",
      mobilizationAdvancePercent: "10",

      taxApplicable: true,
      taxType: ["Business Income Tax"],
      tdsApplicable: true,
      tdsRate: "2",
      gstApplicable: false,
      gstRate: "",
      incomeTaxApplicable: false,
      incomeTaxRate: "",
      taxExemptionReason: "",

      retentionApplicable: false,
      retentionRate: "0",
      warrantyMonths: "12",

      liquidatedDamagesLimit: "10",
      billDiscountingEligible: false,

      milestonePlan: "As per delivery schedule",
      contractItemRows: fileUploadItems(),
      milestoneRows: fileUploadMilestones(),
      supportingDocuments: systemDocs("file-upload"),
      supportingDocLabels: ["Award Letter", "Contract Agreement", "Performance Security"],
    },
    lockedFields: [
      "contractTitle", "contractDescription", "expenditureType", "contractCategory",
      "contractClassification", "budgetCode", "commitmentReference", "commitmentBalance",
      "expenditureCategoryId", "sectorId", "subSectorId", "contractValue",
      "fundingSource", "fundingAgencyName", "programProjectId", "programProjectName",
      "contractDuration", "startDate", "endDate", "agencyId", "agencyName", "grossAmount",
      "contractCurrencyId", "bftnIdNumber",
      "contractorId", "contractorName", "contractorStatus", "contractorBankAccount",
      "contractorDebarmentStatus",
      "officerSalutation", "officerFirstName", "officerLastName", "officerEmail", "officerPhoneNumber",
    ]
  },

  /* ── C: eGP Interface — full pre-population ── */
  "egp-interface": {
    label: "System Interface with eGP",
    tag: "c",
    detail: "Requires all validation rules to be met — if validation fails, reject. Contract values come from eGP.",
    actor: "System",
    tone: "amber",
    bannerTitle: "eGP Interface Mode Active",
    bannerDetail: "All fields populated from eGP. IFMIS validates and routes the record for approval.",
    steps: [
      "Receive contract package from eGP.",
      "Lock all eGP-owned fields.",
      "Validate commitment, contractor, and tax rules — reject if any fail.",
      "Submit to approval workflow."
    ],
    suggestedValues: {
      contractId: "System Generated (CHAR)",
      agencyContractId: "AGY-CTR-003",
      contractTitle: "Phuentsholing–Thimphu Highway Widening — Package B",
      contractDescription: "Widening of 12.5 KM stretch from Chukha Bypass to Chhuzom junction including road base preparation, 2-layer asphalt paving, drainage, culverts, road markings, and signage. eGP Tender Ref: eGP-NCB-2026-0087.",
      expenditureType: "Non-Financial Assets",
      contractCategory: ["Works"],
      contractClassification: "Multi-Year",
      contractStatus: "Draft",

      budgetCode: "BUD-MOWHS-RD-2026-112",
      commitmentReference: "COM-MOWHS-2026-0087",
      commitmentBalance: "120,000,000.00",
      expenditureCategoryId: "EXP-311-INFRA",
      sectorId: "SEC-04-TRANSPORT",
      subSectorId: "SSEC-04-01-ROADS",
      contractValue: "90,000,000.00",
      fundingSource: "Donor Agency",
      fundingAgencyName: "Ministry of Works & Human Settlement",
      paymentSource: "TSA",
      paymentAccount: "RMA-ADB-ROAD-0087-2026",
      programProjectId: "PROG-ROAD-SARP-2025",
      programProjectName: "South Asia Regional Transport Project",

      contractDuration: "18 months",
      startDate: "2026-04-15",
      endDate: "2027-10-14",
      multiYearFlag: true,
      multiYearCommitmentRef: "MYC-MOWHS-2026-0087",
      agencyId: "AGY-MOWHS-001",
      agencyName: "Ministry of Works & Human Settlement",
      contractCurrencyId: "USD",
      bftnIdNumber: "BFTN-MOWHS-2026-0087-USD",
      grossAmount: "90,000,000.00",

      contractorId: "CTR-BIZ-2025-0042",
      contractorName: "Bhutan Construction Corporation Ltd.",
      contractorStatus: "Active and verified",
      contractorBankAccount: "BOB-2042-0015-3456",
      contractorDebarmentStatus: "Clear — No sanctions",
      officerSalutation: "Dasho",
      officerFirstName: "Kinley",
      officerMiddleName: "",
      officerLastName: "Wangchuk",
      officerEmail: "kinley.wangchuk@mowhs.gov.bt",
      officerPhoneNumber: "+975-17-345678",
      paymentStructure: "Milestone Based",

      advancePayment: true,
      advanceAmount: "9,000,000.00",
      advanceRecoverable: true,
      advanceRecoveryMethod: "Auto-populated from CMS",
      mobilizationAdvance: "9,000,000.00",
      mobilizationAdvancePercent: "10",

      taxApplicable: true,
      taxType: ["Corporate Income Tax", "Business Income Tax"],
      tdsApplicable: true,
      tdsRate: "2",
      gstApplicable: false,
      gstRate: "",
      incomeTaxApplicable: true,
      incomeTaxRate: "30",
      taxExemptionReason: "",

      retentionApplicable: true,
      retentionRate: "10",
      warrantyMonths: "24",

      deductionType: "Retention",
      deductionMethod: "Based on the PRR and bill raising",

      liquidatedDamagesLimit: "10",
      billDiscountingEligible: true,
      discountingRate: "8",
      discountingInstitutionId: "BNBL",
      creditLimit: "45,000,000.00",

      milestonePlan: "Per eGP tender schedule — 4 milestone payments",
      contractItemRows: egpItems(),
      milestoneRows: egpMilestones(),
      supportingDocuments: systemDocs("egp"),
      supportingDocLabels: ["Award Letter", "Contract Agreement", "Performance Security"],
    },
    lockedFields: [
      "contractTitle", "contractDescription", "expenditureType", "contractCategory",
      "contractClassification", "budgetCode", "commitmentReference", "commitmentBalance",
      "expenditureCategoryId", "sectorId", "subSectorId", "contractValue",
      "fundingSource", "fundingAgencyName", "programProjectId", "programProjectName",
      "contractDuration", "startDate", "endDate", "multiYearFlag", "agencyId", "agencyName", "grossAmount",
      "contractCurrencyId", "bftnIdNumber",
      "contractorId", "contractorName", "contractorStatus", "contractorBankAccount",
      "contractorDebarmentStatus",
      "officerSalutation", "officerFirstName", "officerLastName", "officerEmail", "officerPhoneNumber",
      "paymentStructure",
      "advancePayment", "advanceAmount", "advanceRecoverable",
      "taxApplicable", "tdsApplicable", "tdsRate", "incomeTaxApplicable", "incomeTaxRate",
      "retentionApplicable", "retentionRate",
    ]
  },

  /* ── D: CMS Interface — full pre-population ── */
  "cms-interface": {
    label: "System Interface with CMS",
    tag: "d",
    detail: "If contract is created from eGP, CMS only caters to invoicing — not required here as a touchpoint.",
    actor: "System",
    tone: "violet",
    bannerTitle: "CMS Interface Mode Active",
    bannerDetail: "CMS-originated values are system-fed. IFMIS enriches metadata before approval.",
    steps: [
      "Receive approved contract shell from CMS.",
      "Preserve CMS-owned values.",
      "Validate funding, contractor, and tax rules.",
      "Route to approval."
    ],
    suggestedValues: {
      contractId: "System Generated (CHAR)",
      agencyContractId: "AGY-CTR-001",
      contractTitle: "Annual IT Support & Network Monitoring — FY2026-27",
      contractDescription: "Comprehensive IT support services including helpdesk, hardware maintenance, and 24/7 network infrastructure monitoring for the Department of Revenue & Customs. CMS Contract Ref: CMS-SVC-2026-0034.",
      expenditureType: "Expenses",
      contractCategory: ["Services"],
      contractClassification: "In-Year",
      contractStatus: "Draft",

      budgetCode: "BUD-DRC-SVC-2026-034",
      commitmentReference: "COM-DRC-2026-0034",
      commitmentBalance: "5,500,000.00",
      expenditureCategoryId: "EXP-221-SVC",
      sectorId: "SEC-09-ICT",
      subSectorId: "SSEC-09-02-SERVICES",
      contractValue: "4,500,000.00",
      fundingSource: "RGOB",
      fundingAgencyName: "Department of Revenue & Customs",
      paymentSource: "TSA",
      paymentAccount: "RMA-GOB-DRC-0034-2026",
      programProjectId: "PROG-DRC-OPS-2026",
      programProjectName: "DRC Operations & Maintenance",

      contractDuration: "12 months",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
      multiYearFlag: false,
      agencyId: "AGY-DRC-001",
      agencyName: "Department of Revenue & Customs",
      contractCurrencyId: "BTN",
      bftnIdNumber: "",
      grossAmount: "4,500,000.00",

      contractorId: "CTR-BIZ-2025-0078",
      contractorName: "Himalayan Digital Services Pvt. Ltd.",
      contractorStatus: "Active and verified",
      contractorBankAccount: "BNBL-3078-0045-1234",
      contractorDebarmentStatus: "Clear — No sanctions",
      officerSalutation: "Ms.",
      officerFirstName: "Dechen",
      officerMiddleName: "",
      officerLastName: "Pelden",
      officerEmail: "dechen.pelden@drc.gov.bt",
      officerPhoneNumber: "+975-17-456789",
      paymentStructure: "Milestone Based",

      advancePayment: false,
      advanceAmount: "",
      advanceRecoverable: false,
      advanceRecoveryMethod: "",
      mobilizationAdvance: "",
      mobilizationAdvancePercent: "0",

      taxApplicable: true,
      taxType: ["Business Income Tax"],
      tdsApplicable: true,
      tdsRate: "2",
      gstApplicable: false,
      gstRate: "",
      incomeTaxApplicable: false,
      incomeTaxRate: "",
      taxExemptionReason: "",

      retentionApplicable: false,
      retentionRate: "0",
      warrantyMonths: "6",

      liquidatedDamagesLimit: "5",
      billDiscountingEligible: false,

      milestonePlan: "Quarterly service delivery milestones",
      contractItemRows: cmsItems(),
      milestoneRows: cmsMilestones(),
      supportingDocuments: systemDocs("cms"),
      supportingDocLabels: ["Award Letter", "Contract Agreement", "Performance Security"],
    },
    lockedFields: [
      "contractTitle", "contractDescription", "expenditureType", "contractCategory",
      "contractClassification", "budgetCode", "commitmentReference", "commitmentBalance",
      "expenditureCategoryId", "sectorId", "subSectorId", "contractValue",
      "fundingSource", "fundingAgencyName", "programProjectId", "programProjectName",
      "contractDuration", "startDate", "endDate", "agencyId", "agencyName", "grossAmount",
      "contractCurrencyId", "bftnIdNumber",
      "contractorId", "contractorName", "contractorStatus", "contractorBankAccount",
      "contractorDebarmentStatus",
      "officerSalutation", "officerFirstName", "officerLastName", "officerEmail", "officerPhoneNumber",
      "paymentStructure",
      "taxApplicable", "tdsApplicable", "tdsRate",
    ]
  }
};

export const panelClass =
  "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6";
export const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
export const lockedInputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 outline-none";
export const labelClass = "block text-sm font-semibold text-slate-800";
