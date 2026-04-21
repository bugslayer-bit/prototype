export interface FieldSourceDetail {
  fieldKey: string;
  label: string;
  dd?: string;
  prn?: string;
  lovs: string[];
  processDescription: string[];
  brs: string[];
  interfacingSystems: string[];
}

/* ═══════════════════════════════════════════════════════════════════
   SRS Tax Master — section "Tax Master Configurable" of the
   SRS Template Expenditure Module Version_03.xlsx workbook.
   Mirrors the matrix exactly: Contract Type × Vendor Type → TDS BIT/CIT,
   GST applicability + rate, Income Tax rate mode, Excise/Property tax,
   Tax Exemption flag and ground.
   ═══════════════════════════════════════════════════════════════════ */
export type TaxMasterContractType = "Goods" | "Works" | "Consultancy Services";
export type TaxMasterFlag = "YES" | "NO";

export interface TaxMasterRecord {
  contractType: TaxMasterContractType;
  vendorType: string;
  /* TDS sub-flags */
  tdsBit: TaxMasterFlag;
  tdsCit: TaxMasterFlag;
  /* GST */
  gstApplicable: TaxMasterFlag;
  gstRatePercent: number | null; // null when GST not applicable / not rate-quoted
  /* Other taxes */
  exciseTax: TaxMasterFlag;
  incomeTaxRateMode: string; // PIT / BIT / CIT mapping description
  propertyTax: TaxMasterFlag;
  /* Exemption */
  taxExemptionAllowed: TaxMasterFlag;
  exemptionGround: string;
  /* Compatibility fields kept for legacy callers (derived) */
  tds: TaxMasterFlag;
  incomeTax: TaxMasterFlag;
  incomeTaxMode: string;
  gst: TaxMasterFlag;
  taxExemption: string;
  notes?: string;
}

/* TDS rate book — driven by vendor origin (Bhutanese vs Non-Bhutanese)
   and contract sub-type. Source: SRS Tax Master notes (rows 15-17). */
export const tdsRateBook = {
  bhutaneseStandardPercent: 2,
  nonBhutaneseStandardPercent: 5,
  hiringChargesPercent: 5
} as const;

/* GST exempt items — SRS Tax Master row 19. */
export const gstExemptItems = ["Rice", "Oil", "Salt", "Sanitary Pads", "Wheelchairs"] as const;

/* Vendor sub-categories LoV (SRS Tax Master cell F4 / LoVs 1.2). */
export const vendorTaxSubCategories = [
  "Sole Proprietorship",
  "Partnership",
  "Consortium/Joint Venture",
  "Foreign Direct Investments",
  "Joint Alliances",
  "Public Private Partnerships",
  "Franchise",
  "Large Proprietary/Private Entity",
  "Corporations"
] as const;

/* Legal reference for tax configuration. */
export const taxLegalReference = "Income Tax Act 2025";

export const srsWorkbookSource = "SRS Template Expenditure Module Version_03.xlsx";

export const contractCreationFieldSources: Record<string, FieldSourceDetail> = {
  contractId: {
    fieldKey: "contractId",
    label: "Contract ID",
    dd: "14.1.1",
    prn: "2.1",
    lovs: [],
    processDescription: ["System-generated contract identifier in the contract header."],
    brs: ["Unique, sequential, cannot be modified once generated."],
    interfacingSystems: []
  },
  agencyContractId: {
    fieldKey: "agencyContractId",
    label: "Agency Contract ID",
    dd: "14.1.2",
    prn: "2.1",
    lovs: ["LoV 7.1"],
    processDescription: ["Agency-side contract reference captured in the contract header when available."],
    brs: ["Optional and agency-specific."],
    interfacingSystems: []
  },
  method: {
    fieldKey: "method",
    label: "Creation Method",
    prn: "2.1",
    lovs: ["LoV 7.16"],
    processDescription: [
      "Process Descriptions sheet: Contract Management -> Contract Creation process -> Initiate contract creation process.",
      "Methods supported: manual data entry, bulk file upload, and system interfaces."
    ],
    brs: [
      "Method selection drives field locking and auto-population behavior.",
      "If tax applicable is yes, tax type selection must refer to Tax Master."
    ],
    interfacingSystems: ["eGP", "CMS"]
  },
  contractTitle: {
    fieldKey: "contractTitle",
    label: "Contract Title",
    dd: "14.1.3",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captured in the contract header section during initiation."],
    brs: ["Mandatory for submission.", "System modes can auto-populate this field."],
    interfacingSystems: ["eGP", "CMS"]
  },
  contractDescription: {
    fieldKey: "contractDescription",
    label: "Contract Description",
    dd: "14.1.4",
    prn: "2.1",
    lovs: [],
    processDescription: ["Defines scope for the contract and supports downstream review."],
    brs: ["Mandatory in the manual creation flow."],
    interfacingSystems: []
  },
  expenditureType: {
    fieldKey: "expenditureType",
    label: "Type of Expenditure",
    dd: "14.1.5",
    prn: "2.1",
    lovs: ["LoV 7.5"],
    processDescription: ["Classifies the contract under expenditure or non-financial assets."],
    brs: ["Value must come from the controlled list."],
    interfacingSystems: []
  },
  contractCategory: {
    fieldKey: "contractCategory",
    label: "Contract Category",
    dd: "14.1.22",
    prn: "2.1",
    lovs: ["LoV 7.4"],
    processDescription: [
      "Category selection drives supporting document requirements and downstream checks."
    ],
    brs: [
      "At least one category must be selected.",
      "Goods categories can require GIMS-linked document references."
    ],
    interfacingSystems: ["GIMS", "CMS"]
  },
  contractClassification: {
    fieldKey: "contractClassification",
    label: "Contract Classification",
    dd: "14.1.20",
    prn: "2.1",
    lovs: ["LoV 7.11"],
    processDescription: ["Used to distinguish in-year and multi-year contract handling."],
    brs: [
      "Multi-year contracts need year-wise allocation planning.",
      "Budget agency approval may be required across fiscal years."
    ],
    interfacingSystems: ["Budget Module"]
  },
  contractStatus: {
    fieldKey: "contractStatus",
    label: "Contract Status",
    dd: "14.1.37",
    prn: "2.1",
    lovs: ["LoV 7.20"],
    processDescription: ["Tracks lifecycle state of the contract from draft through completion or termination."],
    brs: ["Default draft status during creation. Post-approval changes follow workflow state."],
    interfacingSystems: []
  },
  budgetCode: {
    fieldKey: "budgetCode",
    label: "Budget Code",
    dd: "14.1.7",
    prn: "2.1",
    lovs: ["Reference to Expenditure Category Master"],
    processDescription: ["Budget must exist for the relevant contract before initiation can continue."],
    brs: ["Budget code is mandatory and must be valid and active."],
    interfacingSystems: ["Budget Module"]
  },
  commitmentReference: {
    fieldKey: "commitmentReference",
    label: "Commitment Reference ID",
    dd: "14.1.6",
    prn: "2.1",
    lovs: [],
    processDescription: ["Commitment must exist and value must remain within commitment balance."],
    brs: [
      "Commitment existence is required where applicable.",
      "Contract value cannot exceed commitment balance."
    ],
    interfacingSystems: ["Budget Module"]
  },
  expenditureCategoryId: {
    fieldKey: "expenditureCategoryId",
    label: "Expenditure Category ID",
    dd: "14.1.8",
    prn: "2.1",
    lovs: ["Reference to Expenditure Category Master"],
    processDescription: ["Auto-populated from budget code and expenditure category mapping."],
    brs: ["Derived after valid commitment and budget selection."],
    interfacingSystems: ["Budget Module"]
  },
  sectorId: {
    fieldKey: "sectorId",
    label: "Sector ID",
    dd: "14.1.9",
    prn: "2.1",
    lovs: ["LoV 7.8"],
    processDescription: ["Sector is resolved from UCoA / expenditure mapping."],
    brs: ["Should align to selected budget and expenditure category."],
    interfacingSystems: ["Budget Module", "UCoA"]
  },
  subSectorId: {
    fieldKey: "subSectorId",
    label: "Sub Sector ID",
    dd: "14.1.10",
    prn: "2.1",
    lovs: ["GoB", "Donor", "Loan"],
    processDescription: ["Sub sector classification supports source segmentation."],
    brs: ["Value should follow selected sector and funding structure."],
    interfacingSystems: ["Budget Module"]
  },
  contractValue: {
    fieldKey: "contractValue",
    label: "Total Contract Value",
    dd: "14.1.24",
    prn: "2.1",
    lovs: [],
    processDescription: ["Validated against commitment balance and multi-year allocations."],
    brs: ["Must be greater than zero and within approved budget."],
    interfacingSystems: ["Budget Module"]
  },
  fundingSource: {
    fieldKey: "fundingSource",
    label: "Funding Source",
    dd: "14.1.11",
    prn: "2.1",
    lovs: ["LoV 7.2"],
    processDescription: ["Identifies the contract funding source in the budget section."],
    brs: ["Value must be selected from configured funding sources."],
    interfacingSystems: []
  },
  fundingAgencyName: {
    fieldKey: "fundingAgencyName",
    label: "Funding Agency Name",
    dd: "14.1.12",
    prn: "2.1",
    lovs: ["Configured funding agencies"],
    processDescription: ["Funding agency is captured when the selected source requires an agency reference."],
    brs: ["Relevant mainly for donor or externally funded contracts."],
    interfacingSystems: []
  },
  paymentSource: {
    fieldKey: "paymentSource",
    label: "Payment Source",
    dd: "14.1.13",
    prn: "2.1",
    lovs: ["LoV 7.3"],
    processDescription: ["Defines the source used for payment routing."],
    brs: ["Must align with funding and payment account configuration."],
    interfacingSystems: ["Treasury / Payment setup"]
  },
  paymentAccount: {
    fieldKey: "paymentAccount",
    label: "Payment Account",
    dd: "14.1.14",
    prn: "2.1",
    lovs: [],
    processDescription: ["Stores the payment account reference used during payment processing."],
    brs: ["Should align with selected payment source."],
    interfacingSystems: ["Treasury / Payment setup"]
  },
  programProjectId: {
    fieldKey: "programProjectId",
    label: "Program Project ID",
    dd: "14.1.15",
    prn: "2.1",
    lovs: [],
    processDescription: ["Program/project identifier used for funding traceability."],
    brs: ["Used where program or project linkage is applicable."],
    interfacingSystems: ["Budget Module"]
  },
  programProjectName: {
    fieldKey: "programProjectName",
    label: "Program Project Name",
    dd: "14.1.16",
    prn: "2.1",
    lovs: [],
    processDescription: ["Program/project descriptive name linked to the selected ID."],
    brs: ["Should stay aligned with program/project reference."],
    interfacingSystems: ["Budget Module"]
  },
  contractDuration: {
    fieldKey: "contractDuration",
    label: "Contract Duration",
    dd: "14.1.17",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captured in the duration and agency section to define the overall contract period."],
    brs: ["Manual data input during contract initiation."],
    interfacingSystems: []
  },
  startDate: {
    fieldKey: "startDate",
    label: "Contract Start Date",
    dd: "14.1.18",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captured in the duration and agency section."],
    brs: ["Mandatory for workflow and duration validation."],
    interfacingSystems: []
  },
  endDate: {
    fieldKey: "endDate",
    label: "Contract End Date",
    dd: "14.1.19",
    prn: "2.1",
    lovs: [],
    processDescription: ["Paired with start date to complete duration setup."],
    brs: ["End date must be after start date."],
    interfacingSystems: []
  },
  agencyName: {
    fieldKey: "agencyName",
    label: "Agency ID / Agency Name",
    dd: "14.1.21",
    prn: "2.1",
    lovs: ["LoV 7.10"],
    processDescription: ["Defines the implementing or owning agency."],
    brs: ["Agency ownership is required for routing and approval."],
    interfacingSystems: ["Budget Management"]
  },
  agencyId: {
    fieldKey: "agencyId",
    label: "Agency ID",
    dd: "14.1.21",
    prn: "2.1",
    lovs: ["LoV 7.10"],
    processDescription: ["Defines the implementing or owning agency code for the contract."],
    brs: ["Agency must align with the relevant budget and approval routing."],
    interfacingSystems: ["Budget Management"]
  },
  contractCurrencyId: {
    fieldKey: "contractCurrencyId",
    label: "Contract Currency ID",
    dd: "14.1.23",
    prn: "2.1",
    lovs: ["Reference to Currency Master"],
    processDescription: ["Identifies the currency applicable to the contract value."],
    brs: ["Manual data input during contract creation."],
    interfacingSystems: ["Currency Master"]
  },
  grossAmount: {
    fieldKey: "grossAmount",
    label: "Gross Amount",
    dd: "14.1.25",
    prn: "2.1",
    lovs: [],
    processDescription: ["Stores the gross contract amount in the duration and agency section."],
    brs: ["Manual data input; use monetary amount formatting."],
    interfacingSystems: []
  },
  contractorId: {
    fieldKey: "contractorId",
    label: "Contractor ID",
    dd: "Validation reference around DD 10.20",
    prn: "2.1",
    lovs: ["LoV 1.4", "LoV 1.5"],
    processDescription: ["Contractor must be active and not suspended or debarred."],
    brs: [
      "Contractor validation is mandatory before submit.",
      "TPN, registration, and bank validations may be required."
    ],
    interfacingSystems: ["eGP", "CMS", "IBLS", "RAMIS", "BITS", "Bank CBS"]
  },
  contractorName: {
    fieldKey: "contractorName",
    label: "Contractor Name",
    dd: "Resolved from contractor master",
    prn: "2.1",
    lovs: [],
    processDescription: ["Resolved from contractor profile and verification flow."],
    brs: ["Should match the verified contractor record."],
    interfacingSystems: ["eGP", "CMS"]
  },
  officerId: {
    fieldKey: "officerId",
    label: "Officer ID",
    dd: "14.2.1",
    prn: "2.1",
    lovs: [],
    processDescription: ["Project officer identifier is auto-generated when the contact profile is created."],
    brs: ["System generated and read-only in the form."],
    interfacingSystems: []
  },
  officerContractId: {
    fieldKey: "officerContractId",
    label: "Contract ID (Ref)",
    dd: "14.2.2",
    prn: "2.1",
    lovs: [],
    processDescription: ["Links the project officer details to the current contract record."],
    brs: ["Auto-linked from the current contract."],
    interfacingSystems: []
  },
  officerSalutation: {
    fieldKey: "officerSalutation",
    label: "Salutation",
    dd: "14.2.3",
    prn: "2.1",
    lovs: ["Salutation master"],
    processDescription: ["Captures the salutation for the project officer contact."],
    brs: ["Controlled list where configured."],
    interfacingSystems: []
  },
  officerFirstName: {
    fieldKey: "officerFirstName",
    label: "First Name",
    dd: "14.2.4",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captures the first name of the project officer."],
    brs: ["Mandatory for submission."],
    interfacingSystems: []
  },
  officerMiddleName: {
    fieldKey: "officerMiddleName",
    label: "Middle Name",
    dd: "14.2.5",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captures the middle name of the project officer where applicable."],
    brs: ["Optional."],
    interfacingSystems: []
  },
  officerLastName: {
    fieldKey: "officerLastName",
    label: "Last Name",
    dd: "14.2.6",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captures the last name of the project officer."],
    brs: ["Mandatory for submission."],
    interfacingSystems: []
  },
  officerEmail: {
    fieldKey: "officerEmail",
    label: "Email",
    dd: "14.2.7",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captures the official email for the project officer."],
    brs: ["Mandatory and should be a valid email format."],
    interfacingSystems: []
  },
  officerPhoneNumber: {
    fieldKey: "officerPhoneNumber",
    label: "Phone Number",
    dd: "14.2.8",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captures the mobile or reachable phone number for the project officer."],
    brs: ["Mandatory for submission."],
    interfacingSystems: []
  },
  paymentStructure: {
    fieldKey: "paymentStructure",
    label: "Payment Structure",
    prn: "2.1",
    lovs: [],
    processDescription: ["Precondition for contract creation: milestone or non-milestone structure."],
    brs: ["Milestone-based mode requires milestone planning."],
    interfacingSystems: []
  },
  contractItemId: {
    fieldKey: "contractItemId",
    label: "Contract Item ID",
    dd: "14.3.1",
    prn: "2.1",
    lovs: [],
    processDescription: ["System-generated identifier for each contract item line."],
    brs: ["Auto-generated for the new contract items."],
    interfacingSystems: []
  },
  itemCode: {
    fieldKey: "itemCode",
    label: "Item Code",
    dd: "14.3.3",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captures the line-item code used for the contract item."],
    brs: ["Manual data input."],
    interfacingSystems: []
  },
  itemDescription: {
    fieldKey: "itemDescription",
    label: "Item Description",
    dd: "14.3.4",
    prn: "2.1",
    lovs: [],
    processDescription: ["Describes the contract item being procured or delivered."],
    brs: ["Manual data input."],
    interfacingSystems: []
  },
  itemCategory: {
    fieldKey: "itemCategory",
    label: "Item Category",
    dd: "14.3.5",
    prn: "2.1",
    lovs: ["Item category LoV"],
    processDescription: ["Categorizes the contract item for downstream controls."],
    brs: ["Manual data input from LoV."],
    interfacingSystems: []
  },
  itemSubCategory: {
    fieldKey: "itemSubCategory",
    label: "Item Sub Category",
    dd: "14.3.6",
    prn: "2.1",
    lovs: ["Item sub-category LoV"],
    processDescription: ["Provides a more specific grouping under the item category."],
    brs: ["Manual data input where applicable."],
    interfacingSystems: []
  },
  itemQuantity: {
    fieldKey: "itemQuantity",
    label: "Item Quantity",
    dd: "14.3.7",
    prn: "2.1",
    lovs: [],
    processDescription: ["Stores the planned quantity for the contract item."],
    brs: ["Auto-fetch from e-GP where interfaced, otherwise manual."],
    interfacingSystems: ["eGP"]
  },
  itemUnit: {
    fieldKey: "itemUnit",
    label: "Item Unit",
    dd: "14.3.8",
    prn: "2.1",
    lovs: ["Nos", "Kg", "Mt"],
    processDescription: ["Stores the measurement unit for the contract item quantity."],
    brs: ["Auto-fetch from e-GP where interfaced, otherwise manual."],
    interfacingSystems: ["eGP"]
  },
  itemUnitRate: {
    fieldKey: "itemUnitRate",
    label: "Item Unit Rate",
    dd: "14.3.9",
    prn: "2.1",
    lovs: [],
    processDescription: ["Stores the unit rate for the contract item."],
    brs: ["Auto-fetch from e-GP where interfaced, otherwise manual."],
    interfacingSystems: ["eGP"]
  },
  itemTotalAmount: {
    fieldKey: "itemTotalAmount",
    label: "Item Total Amount",
    dd: "14.3.10",
    prn: "2.1",
    lovs: [],
    processDescription: ["Calculated total amount for the contract item."],
    brs: ["Auto-calculate from quantity and unit rate."],
    interfacingSystems: []
  },
  quantityBalance: {
    fieldKey: "quantityBalance",
    label: "Quantity Balance",
    dd: "14.3.11",
    prn: "2.1",
    lovs: [],
    processDescription: ["Tracks the remaining quantity against the contract item."],
    brs: ["Auto-calculate."],
    interfacingSystems: []
  },
  amountBalance: {
    fieldKey: "amountBalance",
    label: "Amount Balance",
    dd: "14.3.12",
    prn: "2.1",
    lovs: [],
    processDescription: ["Tracks the remaining amount balance against the contract item."],
    brs: ["Auto-calculate."],
    interfacingSystems: []
  },
  advancePayment: {
    fieldKey: "advancePayment",
    label: "Advance Payment Rule",
    prn: "2.1",
    lovs: [],
    processDescription: ["Financial rules must be configured before submission."],
    brs: ["Advance payment configuration is part of readiness validation."],
    interfacingSystems: []
  },
  advanceAmount: {
    fieldKey: "advanceAmount",
    label: "Advance Amount",
    dd: "14.1.27",
    prn: "2.1",
    lovs: [],
    processDescription: ["Captures the advance amount configured for the contract."],
    brs: ["Relevant when advance is applicable."],
    interfacingSystems: []
  },
  advanceRecoverable: {
    fieldKey: "advanceRecoverable",
    label: "Advance Amount Recoverable",
    dd: "14.1.28",
    prn: "2.1",
    lovs: ["Yes/No"],
    processDescription: ["Defines whether the configured advance amount is recoverable."],
    brs: ["Controlled yes/no selection."],
    interfacingSystems: []
  },
  taxApplicable: {
    fieldKey: "taxApplicable",
    label: "Tax Applicable",
    prn: "2.1",
    lovs: ["Tax Master values"],
    processDescription: ["If yes, tax types should be selected from the Tax Master sheet."],
    brs: ["Tax mapping should follow contract type and vendor type rules."],
    interfacingSystems: ["Tax Master", "RAMIS", "BITS"]
  },
  taxExemptionReason: {
    fieldKey: "taxExemptionReason",
    label: "Tax Exemption Reason",
    dd: "14.1.31",
    prn: "2.1",
    lovs: [],
    processDescription: ["Stores the reason when tax exemption is granted."],
    brs: ["Mandatory when tax exemption is selected."],
    interfacingSystems: []
  },
  liquidatedDamagesLimit: {
    fieldKey: "liquidatedDamagesLimit",
    label: "Liquidated Damages Limit",
    dd: "14.1.32",
    prn: "2.1",
    lovs: [],
    processDescription: ["Stores the limit applied to liquidated damages."],
    brs: ["Monetary or percentage value based on contract rule."],
    interfacingSystems: []
  },
  billDiscountingEligible: {
    fieldKey: "billDiscountingEligible",
    label: "Bill Discounting Eligible",
    dd: "14.1.33",
    prn: "2.1",
    lovs: ["Yes/No"],
    processDescription: ["Controls whether bill discounting is allowed for the contract."],
    brs: ["Controlled yes/no selection."],
    interfacingSystems: []
  },
  discountingRate: {
    fieldKey: "discountingRate",
    label: "Discounting Rate",
    dd: "14.1.34",
    prn: "2.1",
    lovs: [],
    processDescription: ["Stores the discounting rate when bill discounting is eligible."],
    brs: ["Applicable only when bill discounting is enabled."],
    interfacingSystems: []
  },
  milestonePlan: {
    fieldKey: "milestonePlan",
    label: "Milestone Plan",
    prn: "2.1",
    lovs: [],
    processDescription: ["Used when payment structure is milestone based or multi-year."],
    brs: ["Year-wise planning must stay within allocation and approval rules."],
    interfacingSystems: []
  },
  milestoneId: {
    fieldKey: "milestoneId",
    label: "Milestone ID",
    dd: "14.4.1",
    prn: "2.1",
    lovs: [],
    processDescription: ["System-generated identifier for each contract milestone."],
    brs: ["Auto-generated."],
    interfacingSystems: []
  },
  milestoneNumber: {
    fieldKey: "milestoneNumber",
    label: "Milestone Number",
    dd: "14.4.3",
    prn: "2.1",
    lovs: [],
    processDescription: ["Sequential milestone number within the contract."],
    brs: ["Manual data input; sequential."],
    interfacingSystems: []
  },
  milestoneName: {
    fieldKey: "milestoneName",
    label: "Milestone Name",
    dd: "14.4.4",
    prn: "2.1",
    lovs: [],
    processDescription: ["Payment milestone name, auto-fetch from e-CMS where applicable."],
    brs: ["Manual data input unless sourced from e-CMS."],
    interfacingSystems: ["eCMS"]
  },
  milestoneDescription: {
    fieldKey: "milestoneDescription",
    label: "Milestone Description",
    dd: "14.4.5",
    prn: "2.1",
    lovs: [],
    processDescription: ["Detailed description of the milestone deliverable or payment event."],
    brs: ["Manual data input."],
    interfacingSystems: []
  },
  estimatedPaymentDate: {
    fieldKey: "estimatedPaymentDate",
    label: "Estimated Payment Date",
    dd: "14.4.6",
    prn: "2.1",
    lovs: [],
    processDescription: ["Estimated payment date for milestone-based payment scheduling."],
    brs: ["Manual data input; used for payment schedule management."],
    interfacingSystems: []
  },
  milestoneAmountGross: {
    fieldKey: "milestoneAmountGross",
    label: "Milestone Amount Gross",
    dd: "14.4.7",
    prn: "2.1",
    lovs: [],
    processDescription: ["Gross payable amount for the milestone."],
    brs: ["Auto-fetch from e-CMS where integrated."],
    interfacingSystems: ["eCMS"]
  },
  milestoneTaxAmount1: {
    fieldKey: "milestoneTaxAmount1",
    label: "Milestone Tax Amount 1",
    dd: "14.4.8",
    prn: "2.1",
    lovs: [],
    processDescription: ["First tax amount component derived for the milestone."],
    brs: ["Auto-fetch based on the Tax Master in IFMIS."],
    interfacingSystems: ["Tax Master"]
  },
  milestoneTaxAmount2: {
    fieldKey: "milestoneTaxAmount2",
    label: "Milestone Tax Amount 2",
    dd: "14.4.9",
    prn: "2.1",
    lovs: [],
    processDescription: ["Second tax amount component derived for the milestone."],
    brs: ["Auto-fetch based on the Tax Master in IFMIS."],
    interfacingSystems: ["Tax Master"]
  },
  milestoneDeduction1: {
    fieldKey: "milestoneDeduction1",
    label: "Milestone Deduction 1",
    dd: "14.4.10",
    prn: "2.1",
    lovs: [],
    processDescription: ["First deduction component applied to the milestone."],
    brs: ["Auto-calculate based on the Tax Master in IFMIS."],
    interfacingSystems: ["Tax Master"]
  },
  milestoneDeduction2: {
    fieldKey: "milestoneDeduction2",
    label: "Milestone Deduction 2",
    dd: "14.4.11",
    prn: "2.1",
    lovs: [],
    processDescription: ["Second deduction component applied to the milestone."],
    brs: ["Auto-calculate based on the Tax Master in IFMIS."],
    interfacingSystems: ["Tax Master"]
  },
  netMilestoneAmount: {
    fieldKey: "netMilestoneAmount",
    label: "Net Milestone Amount",
    dd: "14.4.12",
    prn: "2.1",
    lovs: [],
    processDescription: ["Net payable amount after taxes and deductions for the milestone."],
    brs: ["Auto-calculate."],
    interfacingSystems: []
  },
  milestoneStatus: {
    fieldKey: "milestoneStatus",
    label: "Milestone Status",
    dd: "14.4.13",
    prn: "2.1",
    lovs: ["Pending", "Completed", "Paid"],
    processDescription: ["Tracks the current milestone lifecycle state."],
    brs: ["Manual data input from controlled values."],
    interfacingSystems: []
  },
  retentionApplicable: {
    fieldKey: "retentionApplicable",
    label: "Retention Applicable",
    prn: "2.1",
    lovs: ["Yes/No"],
    processDescription: ["Retention Money Management per PRR — 10% for Works contracts."],
    brs: [
      "Auto-enabled for Works contracts per PRR.",
      "Retention is released after defect liability period / warranty."
    ],
    interfacingSystems: []
  },
  retentionRate: {
    fieldKey: "retentionRate",
    label: "Retention Rate (%)",
    prn: "2.1",
    lovs: [],
    processDescription: ["Rate of retention deducted from each Running Account bill."],
    brs: ["Default 10% for Works contracts per PRR."],
    interfacingSystems: []
  },
  mobilizationAdvance: {
    fieldKey: "mobilizationAdvance",
    label: "Mobilization Advance",
    prn: "2.1",
    lovs: [],
    processDescription: ["Mobilization advance up to 10% of contract value per PRR, secured by Bank Guarantee."],
    brs: [
      "Maximum 10% of total contract value.",
      "Requires Bank Guarantee from a recognized financial institution.",
      "Recovered proportionally from subsequent Running Account bills."
    ],
    interfacingSystems: []
  },
  advanceRecoveryMethod: {
    fieldKey: "advanceRecoveryMethod",
    label: "Advance Recovery Method",
    dd: "14.1.29",
    prn: "2.1",
    lovs: ["Pro-rata from RA bills", "Lump sum", "Custom schedule"],
    processDescription: ["Defines how the advance payment is recovered across subsequent payments."],
    brs: ["Recovery must be completed before final payment."],
    interfacingSystems: []
  },
  deductionType: {
    fieldKey: "deductionType",
    label: "Deduction Type",
    prn: "2.1",
    lovs: ["Tax Deduction at Source", "Retention Money", "Liquidated Damages", "Advance Recovery", "Other"],
    processDescription: ["Defines the type of deduction applied to contract payments."],
    brs: ["Multiple deduction types can be applied to a single contract."],
    interfacingSystems: []
  },
  deductionMethod: {
    fieldKey: "deductionMethod",
    label: "Deduction Method",
    prn: "2.1",
    lovs: ["Percentage", "Fixed Amount", "Sliding Scale"],
    processDescription: ["Defines how the deduction amount is calculated."],
    brs: ["Method must align with the selected deduction type rules."],
    interfacingSystems: []
  },
  warrantyMonths: {
    fieldKey: "warrantyMonths",
    label: "Warranty Period (Months)",
    prn: "2.1",
    lovs: [],
    processDescription: ["Defect liability / warranty period after practical completion."],
    brs: ["Retention money is held until warranty period expires."],
    interfacingSystems: []
  },
  tdsApplicable: {
    fieldKey: "tdsApplicable",
    label: "TDS Applicable",
    prn: "2.1",
    lovs: ["Yes/No"],
    processDescription: ["Tax Deduction at Source per Income Tax Act 2025."],
    brs: [
      "2% for Bhutanese contractors.",
      "5% for Non-Bhutanese contractors.",
      "Applied on gross payment before other deductions."
    ],
    interfacingSystems: ["RAMIS", "BITS"]
  },
  gstApplicable: {
    fieldKey: "gstApplicable",
    label: "GST Applicable",
    prn: "2.1",
    lovs: ["Yes/No"],
    processDescription: ["Goods and Services Tax applicability per Tax Master."],
    brs: [
      "Exempt items: Rice, Oil, Salt, Sanitary Pads, Wheelchairs as per GST Act.",
      "Applied based on contract type and vendor type combination in Tax Master."
    ],
    interfacingSystems: ["RAMIS"]
  },
  incomeTaxApplicable: {
    fieldKey: "incomeTaxApplicable",
    label: "Income Tax Applicable",
    prn: "2.1",
    lovs: ["Yes/No"],
    processDescription: ["Income Tax (BIT/CIT/PIT) applicability per Tax Master."],
    brs: [
      "Business Income Tax for domestic firms.",
      "Corporate Income Tax for corporations.",
      "Personal Income Tax for individuals.",
      "Rate determined by contract type and vendor classification."
    ],
    interfacingSystems: ["RAMIS", "BITS"]
  },
  multiYearFlag: {
    fieldKey: "multiYearFlag",
    label: "Multi-Year Flag",
    dd: "14.1.20",
    prn: "2.1",
    lovs: ["Yes/No"],
    processDescription: ["Indicates whether the contract spans multiple fiscal years."],
    brs: [
      "Multi-year contracts require year-wise allocation planning.",
      "Total value must be ≤ total multi-year commitment."
    ],
    interfacingSystems: ["Budget Module"]
  },
  multiYearCommitmentRef: {
    fieldKey: "multiYearCommitmentRef",
    label: "Multi-Year Commitment Reference",
    prn: "2.1",
    lovs: [],
    processDescription: ["Reference to the multi-year commitment for cross-fiscal-year contracts."],
    brs: [
      "Mandatory when multi-year flag is enabled.",
      "Budget Owning Agency approval required."
    ],
    interfacingSystems: ["Budget Module"]
  }
};

export const taxMasterRecords: TaxMasterRecord[] = [
  /* ─── GOODS ─────────────────────────────────────────────── */
  {
    contractType: "Goods",
    vendorType: "Domestic/National Firms",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "YES", gstRatePercent: 5,
    exciseTax: "NO",
    incomeTaxRateMode: "Ceiling not exceeding, PIT filing",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "Ceiling not exceeding, PIT filing",
    gst: "YES", taxExemption: "Yes/No"
  },
  {
    contractType: "Goods",
    vendorType: "International Firms",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "YES", gstRatePercent: 5,
    exciseTax: "NO",
    incomeTaxRateMode: "Non-Bhutanese rule (5% TDS)",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "Non-Bhutanese rule (5% TDS)",
    gst: "YES", taxExemption: "Yes/No"
  },
  {
    contractType: "Goods",
    vendorType: "Transportation/Hiring Charges",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "NO", gstRatePercent: null,
    exciseTax: "NO",
    incomeTaxRateMode: "5% TDS for hiring charges",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "5% TDS for hiring charges",
    gst: "NO", taxExemption: "Yes/No",
    notes: "GST not applicable on transportation / hiring charges."
  },

  /* ─── WORKS ─────────────────────────────────────────────── */
  {
    contractType: "Works",
    vendorType: "Domestic",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "YES", gstRatePercent: 5,
    exciseTax: "NO",
    incomeTaxRateMode: "Ceiling not exceeding, PIT filing",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "Ceiling not exceeding, PIT filing",
    gst: "YES", taxExemption: "Yes/No",
    notes: "Works contracts trigger 10% retention per PRR."
  },
  {
    contractType: "Works",
    vendorType: "International",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "YES", gstRatePercent: 5,
    exciseTax: "NO",
    incomeTaxRateMode: "Non-Bhutanese rule (5% TDS)",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "Non-Bhutanese rule (5% TDS)",
    gst: "YES", taxExemption: "Yes/No"
  },
  {
    contractType: "Works",
    vendorType: "Transportation/Hiring",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "YES", gstRatePercent: 5,
    exciseTax: "NO",
    incomeTaxRateMode: "5% TDS for hiring charges",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "5% TDS for hiring charges",
    gst: "YES", taxExemption: "Yes/No"
  },

  /* ─── CONSULTANCY SERVICES ─────────────────────────────── */
  {
    contractType: "Consultancy Services",
    vendorType: "Domestic/National Firms",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "YES", gstRatePercent: 5,
    exciseTax: "NO",
    incomeTaxRateMode: "2% TDS for Bhutanese contracts",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "2% TDS for Bhutanese contracts",
    gst: "YES", taxExemption: "Yes/No"
  },
  {
    contractType: "Consultancy Services",
    vendorType: "International Firms",
    tdsBit: "YES", tdsCit: "YES",
    gstApplicable: "YES", gstRatePercent: 5,
    exciseTax: "NO",
    incomeTaxRateMode: "Non-Bhutanese rule (5% TDS)",
    propertyTax: "NO",
    taxExemptionAllowed: "YES",
    exemptionGround: "Reason based on the Income Tax Act 2025, DRC",
    tds: "YES", incomeTax: "YES", incomeTaxMode: "Non-Bhutanese rule (5% TDS)",
    gst: "YES", taxExemption: "Yes/No"
  }
];

/* ═══════════════════════════════════════════════════════════════════
   Helper — pick the matching Tax Master record for a given contract
   category and vendor type. Falls back gracefully when only the
   contract category is known.
   ═══════════════════════════════════════════════════════════════════ */
export function resolveTaxMasterRecord(
  contractCategory: string | string[] | undefined,
  vendorType?: string
): TaxMasterRecord | undefined {
  const cats = Array.isArray(contractCategory) ? contractCategory : contractCategory ? [contractCategory] : [];
  const wantedType: TaxMasterContractType | undefined = cats.some((c) => c.includes("Works"))
    ? "Works"
    : cats.some((c) => c.includes("Consultancy"))
      ? "Consultancy Services"
      : cats.some((c) => c.includes("Goods"))
        ? "Goods"
        : undefined;
  if (!wantedType) return undefined;
  const ofType = taxMasterRecords.filter((r) => r.contractType === wantedType);
  if (vendorType) {
    const exact = ofType.find((r) => r.vendorType.toLowerCase() === vendorType.toLowerCase());
    if (exact) return exact;
    const partial = ofType.find((r) => r.vendorType.toLowerCase().includes(vendorType.toLowerCase()));
    if (partial) return partial;
  }
  return ofType[0];
}

/* Helper — derive the TDS rate from origin + sub-type. */
export function deriveTdsRate(args: {
  origin: "Bhutanese" | "Non-Bhutanese" | "";
  vendorType?: string;
}): number | null {
  if (args.vendorType && /transport|hiring/i.test(args.vendorType)) return tdsRateBook.hiringChargesPercent;
  if (args.origin === "Bhutanese") return tdsRateBook.bhutaneseStandardPercent;
  if (args.origin === "Non-Bhutanese") return tdsRateBook.nonBhutaneseStandardPercent;
  return null;
}
