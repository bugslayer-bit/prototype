/* ═══════════════════════════════════════════════════════════════════════════
   demoSeed.ts
   ───────────────────────────────────────────────────────────────────────────
   Centralised demo data used to hydrate every Expenditure module on first
   boot so the full contractor → contract → advance → invoice → payment
   flow can be walked end-to-end without any manual data entry.

   Everything exported here follows the exact shapes of the shared types
   (ContractorRecord, StoredContract, SubmittedInvoice) so the seeds round-trip
   cleanly through localStorage and the dev API.

   Companion helpers:
     • COUNTRY_CURRENCY_MAP        — relational lookup Country → ISO currency
     • deriveCurrencyFromCountry() — used by contract creation / invoice forms
                                     to auto-populate currency when the user
                                     picks a country (fixes the "Bhutan → USD"
                                     static-default complaint).
     • CHANNEL_DEFAULTS            — what data each channel auto-provides so
                                     e-CMS / e-GP flows don't require manual
                                     re-entry of known values.
   ═══════════════════════════════════════════════════════════════════════════ */
import { initialForm } from "../../modules/expenditure/contractCreation/config";
import type { ContractFormState } from "../../modules/expenditure/contractCreation/types";
import type { StoredContract } from "./ContractDataContext";
import type { SubmittedInvoice } from "./SubmittedInvoiceContext";
import type { ContractorRecord } from "../types";

/* ══════════════════════════════════════════════════════════════════════════
   COUNTRY → CURRENCY RELATIONAL LOOKUP
   ══════════════════════════════════════════════════════════════════════════ */

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  Bhutan: "BTN",
  Bhutanese: "BTN",
  India: "INR",
  Indian: "INR",
  Bangladesh: "BDT",
  Nepal: "NPR",
  Thailand: "THB",
  Singapore: "SGD",
  Japan: "JPY",
  "United States": "USD",
  USA: "USD",
  "United Kingdom": "GBP",
  UK: "GBP",
  Australia: "AUD",
  China: "CNY",
  "European Union": "EUR",
  Germany: "EUR",
  France: "EUR",
};

/** Return the ISO currency code that corresponds to a country / nationality
 *  string. Case-insensitive and whitespace-tolerant. Falls back to BTN (the
 *  domestic default) when the country is unknown or empty. */
export function deriveCurrencyFromCountry(country: string | undefined | null): string {
  if (!country) return "BTN";
  const key = country.trim();
  if (!key) return "BTN";
  if (COUNTRY_CURRENCY_MAP[key]) return COUNTRY_CURRENCY_MAP[key];
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (k.toLowerCase() === lower) return v;
  }
  return "BTN";
}

/* ══════════════════════════════════════════════════════════════════════════
   CHANNEL → DATA-FLOW DEFAULTS
   Each submission channel is wired to a provenance and the set of fields
   it auto-populates downstream so forms don't demand re-entry of values
   the channel has already provided.
   ══════════════════════════════════════════════════════════════════════════ */

export interface ChannelDefaults {
  label: string;
  provenance: "system" | "interface" | "manual";
  autoFields: Array<
    "contractId" | "contractor" | "agencyName" | "grossAmount" | "currency" | "taxType" | "documents"
  >;
  description: string;
}

export const CHANNEL_DEFAULTS: Record<string, ChannelDefaults> = {
  "egp-interface": {
    label: "e-GP Interface",
    provenance: "interface",
    autoFields: ["contractId", "contractor", "agencyName", "grossAmount", "currency", "taxType", "documents"],
    description: "Invoice pulled from e-GP. Header, contract binding, tax and documents flow automatically.",
  },
  "cms-interface": {
    label: "e-CMS Interface",
    provenance: "interface",
    autoFields: ["contractId", "contractor", "agencyName", "grossAmount", "currency", "taxType", "documents"],
    description: "Invoice pulled from e-CMS. Contract and deliverable line-items flow automatically — no re-entry.",
  },
  "supplier-portal": {
    label: "Supplier Portal",
    provenance: "system",
    autoFields: ["contractor", "agencyName", "grossAmount", "currency"],
    description: "Self-service submission by the contractor. Bank and vendor details pre-filled from the vendor master.",
  },
  manual: {
    label: "Manual Entry",
    provenance: "manual",
    autoFields: [],
    description: "Finance officer keys the invoice in by hand — used as a fallback when upstream systems are unavailable.",
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   SEED CONTRACTORS (10)
   One Bhutanese CID + nine mixed business / individual / foreign entries so
   downstream contracts can reference a believable variety of suppliers.
   ══════════════════════════════════════════════════════════════════════════ */

function makeContractor(partial: Partial<ContractorRecord> & { id: string; displayName: string }): ContractorRecord {
  return {
    id: partial.id,
    kind: partial.kind ?? "business",
    submittedVia: partial.submittedVia ?? "admin",
    submitterEmail: partial.submitterEmail ?? "",
    displayName: partial.displayName,
    contractorType: partial.contractorType ?? "Construction",
    contractualType: partial.contractualType ?? "Contract",
    category: partial.category ?? "Works",
    nationality: partial.nationality ?? "Bhutanese",
    registrationNumber: partial.registrationNumber ?? "",
    taxNumber: partial.taxNumber ?? "",
    email: partial.email ?? "",
    phone: partial.phone ?? "",
    address: partial.address ?? "",
    bankName: partial.bankName ?? "Bank of Bhutan",
    bankAccountNumber: partial.bankAccountNumber ?? "",
    bankAccountName: partial.bankAccountName ?? partial.displayName,
    status: partial.status ?? "Active and verified",
    verification: partial.verification ?? "Verified",
    verifiedBy: partial.verifiedBy ?? "agency.finance@mof.gov.bt",
    verifiedAt: partial.verifiedAt ?? "2026-02-15T10:00:00.000Z",
    reviewRemarks: partial.reviewRemarks ?? "All verification checks passed.",
    createdAt: partial.createdAt ?? "2026-02-10T09:00:00.000Z",
    profile: partial.profile ?? {},
  };
}

export const SEED_CONTRACTORS: ContractorRecord[] = [
  makeContractor({
    id: "CTR-BIZ-2026-9001",
    displayName: "Druk Construction & Engineering Pvt. Ltd.",
    contractorType: "Construction",
    category: "Works",
    nationality: "Bhutanese",
    registrationNumber: "RC-11001-2020",
    taxNumber: "TPN-10011",
    email: "info@drukconstruction.bt",
    phone: "+975-2-334455",
    address: "Thimphu Industrial Estate, Thimphu",
    bankAccountNumber: "BOB-001-2034-9912",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9002",
    displayName: "Tashi Infotech Solutions",
    contractorType: "IT Services",
    category: "Services",
    nationality: "Bhutanese",
    registrationNumber: "RC-11002-2021",
    taxNumber: "TPN-10012",
    email: "contact@tashi-infotech.bt",
    phone: "+975-2-321100",
    address: "Norzin Lam, Thimphu",
    bankName: "Bhutan National Bank",
    bankAccountNumber: "BNB-201-4455-2010",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9003",
    displayName: "Yangphel Supplies & Trading",
    contractorType: "Goods Supplier",
    category: "Goods",
    nationality: "Bhutanese",
    registrationNumber: "RC-11003-2019",
    taxNumber: "TPN-10013",
    email: "sales@yangphel.bt",
    phone: "+975-2-445566",
    address: "Phuentsholing, Chukha",
    bankAccountNumber: "BOB-101-3045-7781",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9004",
    displayName: "Himalayan Power Systems Pvt. Ltd.",
    contractorType: "Electrical Works",
    category: "Works",
    nationality: "Bhutanese",
    registrationNumber: "RC-11004-2018",
    taxNumber: "TPN-10014",
    email: "projects@himalayanpower.bt",
    phone: "+975-17-889900",
    address: "Babesa, Thimphu",
    bankAccountNumber: "BOB-099-1122-3344",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9005",
    displayName: "Phuensum Consultancy & Advisory",
    contractorType: "Consultancy",
    category: "Consultancy",
    nationality: "Bhutanese",
    registrationNumber: "RC-11005-2022",
    taxNumber: "TPN-10015",
    email: "admin@phuensum-consult.bt",
    phone: "+975-2-112233",
    address: "Changlimithang, Thimphu",
    bankName: "Druk PNB Bank",
    bankAccountNumber: "DPNB-500-8899-1001",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9006",
    displayName: "L&T Construction (India) Ltd. — Bhutan Branch",
    contractorType: "Construction",
    category: "Works",
    nationality: "Indian",
    registrationNumber: "FRC-IN-22001",
    taxNumber: "TPN-FOR-10016",
    email: "bhutan.office@lntecc.com",
    phone: "+91-22-67525656",
    address: "Mumbai, India (Local: Thimphu Liaison)",
    bankName: "State Bank of India",
    bankAccountNumber: "SBI-0011-2233-0044",
  }),
  makeContractor({
    id: "CTR-IND-2026-9007",
    displayName: "Karma Dorji (Individual Consultant)",
    kind: "individual",
    contractorType: "Individual Consultant",
    category: "Consultancy",
    nationality: "Bhutanese",
    registrationNumber: "CID-10709001023",
    taxNumber: "TPN-IND-10017",
    email: "karma.dorji@consult.bt",
    phone: "+975-17-667788",
    address: "Motithang, Thimphu",
    bankAccountNumber: "BOB-555-0099-1122",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9008",
    displayName: "Bhutan Telecom Ltd.",
    contractorType: "Telecom / Utility",
    category: "Services",
    nationality: "Bhutanese",
    registrationNumber: "RC-11008-2000",
    taxNumber: "TPN-10018",
    email: "corporate@bt.bt",
    phone: "+975-2-333333",
    address: "Chubachu, Thimphu",
    bankAccountNumber: "BOB-400-1000-0001",
    contractualType: "Utility",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9009",
    displayName: "Kuensel Corporation Ltd.",
    contractorType: "Printing & Media",
    category: "Services",
    nationality: "Bhutanese",
    registrationNumber: "RC-11009-1986",
    taxNumber: "TPN-10019",
    email: "ads@kuensel.bt",
    phone: "+975-2-322483",
    address: "Chang Lam, Thimphu",
    bankAccountNumber: "BOB-303-7788-4455",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9010",
    displayName: "Siemens Healthineers AG",
    contractorType: "Medical Equipment",
    category: "Goods",
    nationality: "Germany",
    registrationNumber: "FRC-DE-31004",
    taxNumber: "TPN-FOR-10020",
    email: "bhutan.projects@siemens-healthineers.com",
    phone: "+49-9131-840",
    address: "Erlangen, Germany",
    bankName: "Deutsche Bank",
    bankAccountNumber: "DB-DE-8899-4433-0011",
  }),
  /* ── GovTech-relevant contractors ─────────────────────────────────── */
  makeContractor({
    id: "CTR-BIZ-2026-9011",
    displayName: "Druk IT Solutions Pvt. Ltd.",
    contractorType: "IT Services",
    category: "Services",
    nationality: "Bhutanese",
    registrationNumber: "RC-11011-2023",
    taxNumber: "TPN-10021",
    email: "procurement@drukitsolutions.bt",
    phone: "+975-2-338899",
    address: "IT Park, Babesa, Thimphu",
    bankName: "Bhutan National Bank",
    bankAccountNumber: "BNB-701-5566-3300",
  }),
  makeContractor({
    id: "CTR-BIZ-2026-9012",
    displayName: "Cisco Systems (Singapore) Pte Ltd",
    contractorType: "Network Equipment",
    category: "Goods",
    nationality: "Singapore",
    registrationNumber: "FRC-SG-40012",
    taxNumber: "TPN-FOR-10022",
    email: "bhutan.partner@cisco.com",
    phone: "+65-6317-7777",
    address: "Singapore (Local: Thimphu Liaison)",
    bankName: "DBS Bank",
    bankAccountNumber: "DBS-SG-1122-3344-5566",
  }),
];

/* ══════════════════════════════════════════════════════════════════════════
   SEED CONTRACTS (additional 11)
   Appended to the single SECURED_ADVANCE_WORKS_CONTRACT_ID that already
   lives in contractSeed.ts, for a total of 12 demo contracts spanning
   Goods / Works / Services / Consultancy, single- and multi-year, BTN / INR
   / EUR currencies, domestic and foreign vendors.
   ══════════════════════════════════════════════════════════════════════════ */

interface SeedContractInit {
  id: string;
  title: string;
  description: string;
  category: "Goods" | "Works" | "Services" | "Consultancy";
  classification: "Single-Year" | "Multi-Year";
  contractor: ContractorRecord;
  value: string;
  currency: string;
  startDate: string;
  endDate: string;
  agencyId: string;
  agencyName: string;
  budgetCode: string;
  commitmentRef: string;
  expenditureCategoryId: string;
  sectorId: string;
  subSectorId: string;
  fundingSource: string;
  expenditureType: string;
  paymentSource: string;
  paymentAccount: string;
  programProjectId: string;
  programProjectName: string;
  advance?: { amount: string; recoveryMethod: string; mobilization?: string };
  taxType?: string[];
  retentionRate?: string;
  paymentStructure: string;
  milestonePlan?: string;
  contractDuration: string;
  submittedAt: string;
  approvedAt: string;
  approvalRemarks: string;
}

function buildContract(init: SeedContractInit): StoredContract {
  const domestic = init.contractor.nationality === "Bhutanese";
  const form: ContractFormState = {
    ...initialForm,
    method: "manual",
    contractId: init.id,
    agencyContractId: `AGY-${init.id}`,
    contractTitle: init.title,
    contractDescription: init.description,
    expenditureType: init.expenditureType,
    contractCategory: [init.category],
    contractClassification: init.classification,
    contractStatus: "Active",
    workflowStatus: "approved",

    budgetCode: init.budgetCode,
    commitmentReference: init.commitmentRef,
    commitmentBalance: init.value,
    expenditureCategoryId: init.expenditureCategoryId,
    sectorId: init.sectorId,
    subSectorId: init.subSectorId,
    ucoaLevel: "Sub-Sector",
    contractValue: init.value,

    fundingSource: init.fundingSource,
    fundingAgencyName: init.agencyName,
    paymentSource: init.paymentSource,
    paymentAccount: init.paymentAccount,
    programProjectId: init.programProjectId,
    programProjectName: init.programProjectName,

    contractDuration: init.contractDuration,
    startDate: init.startDate,
    endDate: init.endDate,
    contractClosureDate: init.endDate,
    multiYearFlag: init.classification === "Multi-Year",
    multiYearCommitmentRef: init.classification === "Multi-Year" ? `MYC-${init.id}` : "",
    agencyId: init.agencyId,
    agencyName: init.agencyName,
    contractCurrencyId: init.currency,
    grossAmount: init.value,

    contractorId: init.contractor.id,
    contractorName: init.contractor.displayName,
    contractorStatus: "Verified",
    contractorBankAccount: init.contractor.bankAccountNumber,
    contractorDebarmentStatus: "Clear",
    officerSalutation: init.contractor.kind === "individual" ? "Mr." : "Mr.",
    officerFirstName: init.contractor.displayName.split(" ")[0] ?? "",
    officerLastName: "Representative",
    officerEmail: init.contractor.email,
    officerPhoneNumber: init.contractor.phone,
    paymentStructure: init.paymentStructure,

    advancePayment: !!init.advance,
    advanceAmount: init.advance?.amount ?? "",
    advanceRecoverable: !!init.advance,
    advanceRecoveryMethod: init.advance?.recoveryMethod ?? "",
    mobilizationAdvance: init.advance?.mobilization ?? "",
    mobilizationAdvancePercent: init.advance ? "10" : "",

    taxApplicable: (init.taxType?.length ?? 0) > 0,
    taxType: init.taxType ?? [],
    tdsApplicable: init.taxType?.includes("TDS") ?? false,
    tdsRate: init.taxType?.includes("TDS") ? "2" : "",
    gstApplicable: init.taxType?.includes("GST") ?? false,
    gstRate: init.taxType?.includes("GST") ? "7" : "",
    vendorTaxType: domestic ? "Domestic Contractor" : "Foreign Contractor",
    vendorOrigin: domestic ? "Bhutanese" : "Non-Bhutanese",
    taxLegalReference: "Income Tax Act 2025",

    retentionApplicable: !!init.retentionRate,
    retentionRate: init.retentionRate ?? "10",
    warrantyMonths: init.category === "Works" || init.category === "Goods" ? "12" : "",

    milestonePlan: init.milestonePlan ?? "",
    submittedAt: init.submittedAt,
    approvedAt: init.approvedAt,
  };

  return {
    id: init.id,
    contractId: init.id,
    contractTitle: init.title,
    contractValue: init.value,
    contractCategory: [init.category],
    contractClassification: init.classification,
    method: "manual",
    agencyName: init.agencyName,
    contractorName: init.contractor.displayName,
    contractorId: init.contractor.id,
    startDate: init.startDate,
    endDate: init.endDate,
    workflowStatus: "approved",
    contractStatus: "Active",
    submittedAt: init.submittedAt,
    approvedAt: init.approvedAt,
    rejectedAt: "",
    approvalRemarks: init.approvalRemarks,
    currentApprover: "",
    fundingSource: init.fundingSource,
    expenditureType: init.expenditureType,
    formData: form,
  };
}

const C = Object.fromEntries(SEED_CONTRACTORS.map((c) => [c.id, c])) as Record<string, ContractorRecord>;

export const ADDITIONAL_SEED_CONTRACTS: StoredContract[] = [
  buildContract({
    id: "CTR-SRV-2026-9002",
    title: "IFMIS Module Customisation & Support Services — Year 1",
    description: "Custom module development, L3 support and quarterly releases for the IFMIS Expenditure platform.",
    category: "Services",
    classification: "Single-Year",
    contractor: C["CTR-BIZ-2026-9002"],
    value: "8500000",
    currency: "BTN",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    agencyId: "AGY-MOF",
    agencyName: "Ministry of Finance",
    budgetCode: "BUD-MOF-IT-2026-010",
    commitmentRef: "COM-MOF-2026-0010",
    expenditureCategoryId: "EXP-220-ICT",
    sectorId: "SEC-12-PUBFIN",
    subSectorId: "SSEC-12-01-IT",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-MOF-0010-2026",
    programProjectId: "PROG-MOF-IFMIS",
    programProjectName: "IFMIS Implementation Programme",
    taxType: ["TDS", "GST"],
    retentionRate: "5",
    paymentStructure: "Quarterly",
    contractDuration: "12 months",
    submittedAt: "2026-03-15T09:00:00.000Z",
    approvedAt: "2026-03-28T11:30:00.000Z",
    approvalRemarks: "Approved under SRS PRN 2.1. e-GP reference attached.",
  }),
  buildContract({
    id: "CTR-GDS-2026-9003",
    title: "Supply of Office Stationery & Consumables — Frame Agreement",
    description: "Annual frame agreement for stationery, toner and office consumables across all MoF directorates.",
    category: "Goods",
    classification: "Single-Year",
    contractor: C["CTR-BIZ-2026-9003"],
    value: "2400000",
    currency: "BTN",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    agencyId: "AGY-MOF",
    agencyName: "Ministry of Finance",
    budgetCode: "BUD-MOF-GEN-2026-041",
    commitmentRef: "COM-MOF-2026-0041",
    expenditureCategoryId: "EXP-210-GEN",
    sectorId: "SEC-12-PUBFIN",
    subSectorId: "SSEC-12-02-ADMIN",
    fundingSource: "RGOB",
    expenditureType: "Goods",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-MOF-0041-2026",
    programProjectId: "PROG-MOF-OPS",
    programProjectName: "MoF Operating Expenses",
    taxType: ["GST"],
    paymentStructure: "On-Delivery",
    contractDuration: "12 months",
    submittedAt: "2026-03-10T08:45:00.000Z",
    approvedAt: "2026-03-20T14:10:00.000Z",
    approvalRemarks: "Frame agreement — call-offs processed against remaining commitment.",
  }),
  buildContract({
    id: "CTR-WRK-2026-9004",
    title: "Rural Electrification — Zhemgang East Feeder Upgrade",
    description: "33 kV feeder upgrade, 12 km line works and 4 new distribution substations for Zhemgang East.",
    category: "Works",
    classification: "Multi-Year",
    contractor: C["CTR-BIZ-2026-9004"],
    value: "45000000",
    currency: "BTN",
    startDate: "2026-05-01",
    endDate: "2028-04-30",
    agencyId: "AGY-MOE",
    agencyName: "Ministry of Energy & Natural Resources",
    budgetCode: "BUD-MOE-ELEC-2026-015",
    commitmentRef: "COM-MOE-2026-0015",
    expenditureCategoryId: "EXP-311-INFRA",
    sectorId: "SEC-04-ENERGY",
    subSectorId: "SSEC-04-02-DIST",
    fundingSource: "ADB Loan",
    expenditureType: "Non-Financial Assets",
    paymentSource: "Donor Account",
    paymentAccount: "RMA-ADB-MOE-0015-2026",
    programProjectId: "PROG-MOE-RE",
    programProjectName: "Rural Electrification Phase IV",
    advance: { amount: "4500000", recoveryMethod: "Proportional Deduction", mobilization: "4500000" },
    taxType: ["TDS", "GST"],
    retentionRate: "10",
    paymentStructure: "Milestone-based",
    milestonePlan: "M1 Survey · M2 Pole · M3 Stringing · M4 Substation · M5 Commissioning",
    contractDuration: "24 months",
    submittedAt: "2026-03-25T10:00:00.000Z",
    approvedAt: "2026-04-05T09:15:00.000Z",
    approvalRemarks: "ADB Loan category C — multi-year commitment approved.",
  }),
  buildContract({
    id: "CTR-CON-2026-9005",
    title: "Public Financial Management Reform — Advisory Services",
    description: "Advisory on PFM reforms, treasury single account deepening and fiscal rules design.",
    category: "Consultancy",
    classification: "Single-Year",
    contractor: C["CTR-BIZ-2026-9005"],
    value: "3600000",
    currency: "BTN",
    startDate: "2026-04-10",
    endDate: "2027-01-31",
    agencyId: "AGY-MOF",
    agencyName: "Ministry of Finance",
    budgetCode: "BUD-MOF-CONS-2026-022",
    commitmentRef: "COM-MOF-2026-0022",
    expenditureCategoryId: "EXP-240-CONS",
    sectorId: "SEC-12-PUBFIN",
    subSectorId: "SSEC-12-03-ADVIS",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-MOF-0022-2026",
    programProjectId: "PROG-MOF-PFMR",
    programProjectName: "PFM Reform Programme",
    taxType: ["TDS"],
    paymentStructure: "Deliverable-based",
    contractDuration: "10 months",
    submittedAt: "2026-03-18T11:00:00.000Z",
    approvedAt: "2026-04-01T16:20:00.000Z",
    approvalRemarks: "Approved — deliverables tied to quarterly PFM steering committee.",
  }),
  buildContract({
    id: "CTR-WRK-2026-9006",
    title: "Paro International Airport Apron Expansion — Civil Package",
    description: "Civil package for the southern apron extension including earthworks, drainage and pavement.",
    category: "Works",
    classification: "Multi-Year",
    contractor: C["CTR-BIZ-2026-9006"],
    value: "320000000",
    currency: "INR",
    startDate: "2026-06-01",
    endDate: "2028-11-30",
    agencyId: "AGY-MOIT",
    agencyName: "Ministry of Infrastructure & Transport",
    budgetCode: "BUD-MOIT-AIR-2026-001",
    commitmentRef: "COM-MOIT-2026-0001",
    expenditureCategoryId: "EXP-311-INFRA",
    sectorId: "SEC-06-TRANSPORT",
    subSectorId: "SSEC-06-03-AVIATION",
    fundingSource: "GoI Grant",
    expenditureType: "Non-Financial Assets",
    paymentSource: "Donor Account",
    paymentAccount: "RMA-GOI-MOIT-0001-2026",
    programProjectId: "PROG-MOIT-PARO",
    programProjectName: "Paro Airport Modernisation",
    advance: { amount: "32000000", recoveryMethod: "Proportional Deduction", mobilization: "32000000" },
    taxType: ["TDS"],
    retentionRate: "10",
    paymentStructure: "Milestone-based",
    milestonePlan: "M1 Mob · M2 Earthworks · M3 Drainage · M4 Base · M5 Pavement · M6 Handover",
    contractDuration: "30 months",
    submittedAt: "2026-03-20T08:00:00.000Z",
    approvedAt: "2026-04-03T10:00:00.000Z",
    approvalRemarks: "GoI Grant line confirmed. Cross-border tax ruling attached.",
  }),
  buildContract({
    id: "CTR-CON-2026-9007",
    title: "Independent Cost Engineering — Bumthang Hospital Phase 2",
    description: "Independent cost engineer services for verification of measurements and bill certification.",
    category: "Consultancy",
    classification: "Multi-Year",
    contractor: C["CTR-IND-2026-9007"],
    value: "1800000",
    currency: "BTN",
    startDate: "2026-04-15",
    endDate: "2028-04-14",
    agencyId: "AGY-MOH",
    agencyName: "Ministry of Health",
    budgetCode: "BUD-MOH-CONS-2026-012",
    commitmentRef: "COM-MOH-2026-0012",
    expenditureCategoryId: "EXP-240-CONS",
    sectorId: "SEC-07-HEALTH",
    subSectorId: "SSEC-07-02-HOSPITAL",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-MOH-0012-2026",
    programProjectId: "PROG-HEALTH-DH-2025",
    programProjectName: "District Hospital Expansion Programme",
    taxType: ["TDS"],
    paymentStructure: "Monthly",
    contractDuration: "24 months",
    submittedAt: "2026-03-22T09:30:00.000Z",
    approvedAt: "2026-04-04T15:00:00.000Z",
    approvalRemarks: "Individual consultant — appointed alongside main civil contract.",
  }),
  buildContract({
    id: "CTR-SRV-2026-9008",
    title: "Telephony, Internet & Leased Line Services — MoF HQ",
    description: "Annual recurring utility services for the Ministry of Finance headquarters including 500 Mbps leased line.",
    category: "Services",
    classification: "Single-Year",
    contractor: C["CTR-BIZ-2026-9008"],
    value: "1200000",
    currency: "BTN",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    agencyId: "AGY-MOF",
    agencyName: "Ministry of Finance",
    budgetCode: "BUD-MOF-UTIL-2026-055",
    commitmentRef: "COM-MOF-2026-0055",
    expenditureCategoryId: "EXP-220-UTIL",
    sectorId: "SEC-12-PUBFIN",
    subSectorId: "SSEC-12-02-ADMIN",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-MOF-0055-2026",
    programProjectId: "PROG-MOF-OPS",
    programProjectName: "MoF Operating Expenses",
    taxType: ["GST"],
    paymentStructure: "Monthly",
    contractDuration: "12 months",
    submittedAt: "2026-03-05T09:00:00.000Z",
    approvedAt: "2026-03-18T12:00:00.000Z",
    approvalRemarks: "Utility contract — auto-billed monthly via recurring vendor flow.",
  }),
  buildContract({
    id: "CTR-SRV-2026-9009",
    title: "Gazette Notifications & Public Advertisements — Annual",
    description: "Newspaper ad space for public notifications, tender notices and policy announcements.",
    category: "Services",
    classification: "Single-Year",
    contractor: C["CTR-BIZ-2026-9009"],
    value: "950000",
    currency: "BTN",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    agencyId: "AGY-PMO",
    agencyName: "Prime Minister's Office",
    budgetCode: "BUD-PMO-MEDIA-2026-017",
    commitmentRef: "COM-PMO-2026-0017",
    expenditureCategoryId: "EXP-220-COMM",
    sectorId: "SEC-11-GOV",
    subSectorId: "SSEC-11-01-COMMS",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-PMO-0017-2026",
    programProjectId: "PROG-PMO-COMMS",
    programProjectName: "Government Communications",
    taxType: ["GST"],
    paymentStructure: "On-Delivery",
    contractDuration: "12 months",
    submittedAt: "2026-03-06T11:00:00.000Z",
    approvedAt: "2026-03-19T10:30:00.000Z",
    approvalRemarks: "Rate card attached. Ad volume tracked in milestone plan.",
  }),
  buildContract({
    id: "CTR-GDS-2026-9010",
    title: "Supply & Installation of CT Scanner — JDWNRH",
    description: "Turnkey supply, installation, commissioning and 2-year warranty for 128-slice CT scanner.",
    category: "Goods",
    classification: "Multi-Year",
    contractor: C["CTR-BIZ-2026-9010"],
    value: "1250000",
    currency: "EUR",
    startDate: "2026-05-01",
    endDate: "2027-10-31",
    agencyId: "AGY-MOH",
    agencyName: "Ministry of Health",
    budgetCode: "BUD-MOH-EQUIP-2026-003",
    commitmentRef: "COM-MOH-2026-0003",
    expenditureCategoryId: "EXP-320-EQUIP",
    sectorId: "SEC-07-HEALTH",
    subSectorId: "SSEC-07-01-EQUIP",
    fundingSource: "WHO Grant",
    expenditureType: "Non-Financial Assets",
    paymentSource: "Donor Account",
    paymentAccount: "RMA-WHO-MOH-0003-2026",
    programProjectId: "PROG-MOH-EQUIP",
    programProjectName: "Tertiary Care Equipment Upgrade",
    advance: { amount: "125000", recoveryMethod: "Lump Sum Recovery" },
    taxType: ["TDS"],
    retentionRate: "5",
    paymentStructure: "Milestone-based",
    milestonePlan: "M1 Advance · M2 Shipment · M3 Installation · M4 Commissioning · M5 Final",
    contractDuration: "18 months",
    submittedAt: "2026-03-28T10:15:00.000Z",
    approvedAt: "2026-04-06T13:45:00.000Z",
    approvalRemarks: "Foreign currency commitment — hedged at central bank indicative rate.",
  }),
  buildContract({
    id: "CTR-SRV-2026-9011",
    title: "Facility Management & Security — MoF HQ",
    description: "Integrated facility management: cleaning, security, pest control and waste for MoF headquarters.",
    category: "Services",
    classification: "Multi-Year",
    contractor: C["CTR-BIZ-2026-9001"],
    value: "6000000",
    currency: "BTN",
    startDate: "2026-04-01",
    endDate: "2028-03-31",
    agencyId: "AGY-MOF",
    agencyName: "Ministry of Finance",
    budgetCode: "BUD-MOF-FM-2026-028",
    commitmentRef: "COM-MOF-2026-0028",
    expenditureCategoryId: "EXP-220-FM",
    sectorId: "SEC-12-PUBFIN",
    subSectorId: "SSEC-12-02-ADMIN",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-MOF-0028-2026",
    programProjectId: "PROG-MOF-OPS",
    programProjectName: "MoF Operating Expenses",
    taxType: ["TDS", "GST"],
    retentionRate: "5",
    paymentStructure: "Monthly",
    contractDuration: "24 months",
    submittedAt: "2026-03-12T09:00:00.000Z",
    approvedAt: "2026-03-26T16:00:00.000Z",
    approvalRemarks: "2-year multi-year commitment validated.",
  }),
  /* ── GovTech (Code 70) Contracts ─────────────────────────────────── */
  buildContract({
    id: "CTR-SRV-2026-GT01",
    title: "Whole-of-Government Cloud Hosting & Managed Services — FY 2026-27",
    description: "AWS GovCloud managed hosting, 24×7 NOC monitoring, monthly DR drills and quarterly security assessments for all WoG applications.",
    category: "Services",
    classification: "Single-Year",
    contractor: C["CTR-BIZ-2026-9011"],
    value: "12500000",
    currency: "BTN",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    agencyId: "AGY-GT",
    agencyName: "GovTech Agency",
    budgetCode: "BUD-GT-CLOUD-2026-001",
    commitmentRef: "COM-GT-2026-0001",
    expenditureCategoryId: "EXP-220-ICT",
    sectorId: "SEC-13-ICT",
    subSectorId: "SSEC-13-01-CLOUD",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-GT-0001-2026",
    programProjectId: "PROG-GT-INFRA",
    programProjectName: "Digital Infrastructure Programme",
    taxType: ["TDS", "GST"],
    paymentStructure: "Monthly",
    contractDuration: "12 months",
    submittedAt: "2026-03-08T09:00:00.000Z",
    approvedAt: "2026-03-22T14:30:00.000Z",
    approvalRemarks: "Approved — SLA-bound managed services for WoG platform.",
  }),
  buildContract({
    id: "CTR-GDS-2026-GT02",
    title: "Supply of Core Network Switches & Routers — Data Centre Refresh",
    description: "Procurement of Cisco Catalyst 9000 series switches, Nexus 9500 spine routers and 5-year SmartNet for the National Data Centre.",
    category: "Goods",
    classification: "Multi-Year",
    contractor: C["CTR-BIZ-2026-9012"],
    value: "850000",
    currency: "USD",
    startDate: "2026-05-01",
    endDate: "2028-04-30",
    agencyId: "AGY-GT",
    agencyName: "GovTech Agency",
    budgetCode: "BUD-GT-NDC-2026-003",
    commitmentRef: "COM-GT-2026-0003",
    expenditureCategoryId: "EXP-320-EQUIP",
    sectorId: "SEC-13-ICT",
    subSectorId: "SSEC-13-02-NETWORK",
    fundingSource: "World Bank Grant",
    expenditureType: "Non-Financial Assets",
    paymentSource: "Donor Account",
    paymentAccount: "RMA-WB-GT-0003-2026",
    programProjectId: "PROG-GT-NDC",
    programProjectName: "National Data Centre Modernisation",
    advance: { amount: "85000", recoveryMethod: "Proportional Deduction" },
    taxType: ["TDS"],
    retentionRate: "5",
    paymentStructure: "Milestone-based",
    milestonePlan: "M1 Advance · M2 Shipment · M3 Installation · M4 Commissioning · M5 Warranty",
    contractDuration: "24 months",
    submittedAt: "2026-03-15T10:00:00.000Z",
    approvedAt: "2026-04-02T11:00:00.000Z",
    approvalRemarks: "World Bank No-Objection received. Foreign currency at indicative rate.",
  }),
  buildContract({
    id: "CTR-CON-2026-GT03",
    title: "Cybersecurity Maturity Assessment & SOC Blueprint",
    description: "Independent cybersecurity maturity assessment (NIST CSF) of government networks plus SOC-as-a-Service design and implementation roadmap.",
    category: "Consultancy",
    classification: "Single-Year",
    contractor: C["CTR-BIZ-2026-9005"],
    value: "4200000",
    currency: "BTN",
    startDate: "2026-04-15",
    endDate: "2027-01-31",
    agencyId: "AGY-GT",
    agencyName: "GovTech Agency",
    budgetCode: "BUD-GT-CYBER-2026-005",
    commitmentRef: "COM-GT-2026-0005",
    expenditureCategoryId: "EXP-240-CONS",
    sectorId: "SEC-13-ICT",
    subSectorId: "SSEC-13-03-CYBER",
    fundingSource: "RGOB",
    expenditureType: "Services",
    paymentSource: "TSA",
    paymentAccount: "RMA-GOB-GT-0005-2026",
    programProjectId: "PROG-GT-CYBER",
    programProjectName: "National Cybersecurity Programme",
    taxType: ["TDS"],
    paymentStructure: "Deliverable-based",
    contractDuration: "10 months",
    submittedAt: "2026-03-20T08:30:00.000Z",
    approvedAt: "2026-04-05T15:00:00.000Z",
    approvalRemarks: "Approved — NIST CSF gap analysis to inform National Cyber Strategy.",
  }),
];

/* ══════════════════════════════════════════════════════════════════════════
   SEED SUBMITTED INVOICES (pre-linked to the seed contracts)
   Mixed statuses so the Invoice Processing queue, Payment Order release
   panel and dashboards all have realistic in-flight data.
   ══════════════════════════════════════════════════════════════════════════ */

function buildInvoice(init: {
  id: string;
  ifmisNumber: string;
  invoiceNumber: string;
  contract: StoredContract;
  gross: number;
  taxPct: number;
  retentionPct: number;
  invoiceDate: string;
  submittedAt: string;
  submittedBy: string;
  channel: "manual" | "egp-interface" | "cms-interface" | "supplier-portal";
  status: SubmittedInvoice["status"];
  taxType: string;
}): SubmittedInvoice {
  const tax = Math.round(init.gross * (init.taxPct / 100));
  const retention = Math.round(init.gross * (init.retentionPct / 100));
  const net = init.gross - tax - retention;
  return {
    id: init.id,
    ifmisNumber: init.ifmisNumber,
    invoiceNumber: init.invoiceNumber,
    contractId: init.contract.id,
    contractTitle: init.contract.contractTitle,
    contractor: init.contract.contractorName,
    contractorId: init.contract.contractorId,
    agencyName: init.contract.agencyName,
    category: init.contract.contractCategory[0] ?? "Services",
    grossAmount: init.gross,
    taxAmount: tax,
    retentionAmount: retention,
    deductionAmount: 0,
    netPayable: net,
    currency: init.contract.formData.contractCurrencyId || "BTN",
    invoiceDate: init.invoiceDate,
    submittedAt: init.submittedAt,
    submittedBy: init.submittedBy,
    channel: init.channel,
    taxType: init.taxType,
    documents: [
      { name: "Invoice.pdf", size: 182000, ticked: true, mandatory: true },
      { name: "MeasurementSheet.pdf", size: 245000, ticked: true, mandatory: true },
    ],
    status: init.status,
    esg: null,
    history: [
      {
        at: init.submittedAt,
        by: init.submittedBy,
        action: "Submitted",
        comment: `Channel: ${CHANNEL_DEFAULTS[init.channel]?.label ?? init.channel}`,
      },
    ],
  };
}

/** Invoices indexed by contract — populated after ADDITIONAL_SEED_CONTRACTS
 *  is built so we can reference real contract metadata. */
export const SEED_SUBMITTED_INVOICES: SubmittedInvoice[] = [
  buildInvoice({
    id: "INV-REC-9001",
    ifmisNumber: "INV-2026-10001",
    invoiceNumber: "TIS/MOF/2026/04/001",
    contract: ADDITIONAL_SEED_CONTRACTS[0], // Tashi Infotech
    gross: 720000,
    taxPct: 9,
    retentionPct: 5,
    invoiceDate: "2026-04-01",
    submittedAt: "2026-04-02T09:10:00.000Z",
    submittedBy: "tashi.infotech@supplier.portal",
    channel: "supplier-portal",
    status: "submitted",
    taxType: "TDS+GST",
  }),
  buildInvoice({
    id: "INV-REC-9002",
    ifmisNumber: "INV-2026-10002",
    invoiceNumber: "YPL/MOF/2026/Q1/017",
    contract: ADDITIONAL_SEED_CONTRACTS[1], // Yangphel Goods
    gross: 185000,
    taxPct: 7,
    retentionPct: 0,
    invoiceDate: "2026-04-02",
    submittedAt: "2026-04-03T11:25:00.000Z",
    submittedBy: "egp.interface@system",
    channel: "egp-interface",
    status: "approved",
    taxType: "GST",
  }),
  buildInvoice({
    id: "INV-REC-9003",
    ifmisNumber: "INV-2026-10003",
    invoiceNumber: "HPS/MOE/2026/M1-ADV",
    contract: ADDITIONAL_SEED_CONTRACTS[2], // Himalayan Power
    gross: 4500000,
    taxPct: 9,
    retentionPct: 10,
    invoiceDate: "2026-04-05",
    submittedAt: "2026-04-06T08:30:00.000Z",
    submittedBy: "projects@himalayanpower.bt",
    channel: "cms-interface",
    status: "computed",
    taxType: "TDS+GST",
  }),
  buildInvoice({
    id: "INV-REC-9004",
    ifmisNumber: "INV-2026-10004",
    invoiceNumber: "PHC/MOF/PFMR/2026/Q1",
    contract: ADDITIONAL_SEED_CONTRACTS[3], // Phuensum Consultancy
    gross: 900000,
    taxPct: 2,
    retentionPct: 0,
    invoiceDate: "2026-04-05",
    submittedAt: "2026-04-07T15:45:00.000Z",
    submittedBy: "phuensum.admin",
    channel: "manual",
    status: "approved-for-payment",
    taxType: "TDS",
  }),
  buildInvoice({
    id: "INV-REC-9005",
    ifmisNumber: "INV-2026-10005",
    invoiceNumber: "LNT/MOIT/PARO/M1-MOB",
    contract: ADDITIONAL_SEED_CONTRACTS[4], // L&T Paro Airport
    gross: 32000000,
    taxPct: 2,
    retentionPct: 10,
    invoiceDate: "2026-04-06",
    submittedAt: "2026-04-07T10:00:00.000Z",
    submittedBy: "cms.interface@system",
    channel: "cms-interface",
    status: "submitted",
    taxType: "TDS",
  }),
  buildInvoice({
    id: "INV-REC-9006",
    ifmisNumber: "INV-2026-10006",
    invoiceNumber: "BT/MOF/UTIL/2026/04",
    contract: ADDITIONAL_SEED_CONTRACTS[6], // Bhutan Telecom
    gross: 100000,
    taxPct: 7,
    retentionPct: 0,
    invoiceDate: "2026-04-04",
    submittedAt: "2026-04-05T09:00:00.000Z",
    submittedBy: "utility.bt@vendor",
    channel: "supplier-portal",
    status: "approved",
    taxType: "GST",
  }),
  buildInvoice({
    id: "INV-REC-9007",
    ifmisNumber: "INV-2026-10007",
    invoiceNumber: "KUENSEL/PMO/04/012",
    contract: ADDITIONAL_SEED_CONTRACTS[7], // Kuensel
    gross: 85000,
    taxPct: 7,
    retentionPct: 0,
    invoiceDate: "2026-04-03",
    submittedAt: "2026-04-04T10:15:00.000Z",
    submittedBy: "kuensel.ads",
    channel: "egp-interface",
    status: "approved",
    taxType: "GST",
  }),
  buildInvoice({
    id: "INV-REC-9008",
    ifmisNumber: "INV-2026-10008",
    invoiceNumber: "SIE/MOH/CT/M1-ADV",
    contract: ADDITIONAL_SEED_CONTRACTS[8], // Siemens CT
    gross: 125000,
    taxPct: 2,
    retentionPct: 5,
    invoiceDate: "2026-04-05",
    submittedAt: "2026-04-07T14:00:00.000Z",
    submittedBy: "siemens.liaison",
    channel: "manual",
    status: "submitted",
    taxType: "TDS",
  }),
  buildInvoice({
    id: "INV-REC-9009",
    ifmisNumber: "INV-2026-10009",
    invoiceNumber: "DCE/MOF/FM/2026/04",
    contract: ADDITIONAL_SEED_CONTRACTS[9], // Druk FM
    gross: 250000,
    taxPct: 9,
    retentionPct: 5,
    invoiceDate: "2026-04-04",
    submittedAt: "2026-04-05T13:00:00.000Z",
    submittedBy: "druk.fm.ops",
    channel: "supplier-portal",
    status: "approved-for-payment",
    taxType: "TDS+GST",
  }),
  /* ── GovTech Invoices ─────────────────────────────────────────────── */
  buildInvoice({
    id: "INV-REC-GT01",
    ifmisNumber: "INV-2026-GT-10001",
    invoiceNumber: "DIS/GT/CLOUD/2026/04",
    contract: ADDITIONAL_SEED_CONTRACTS[10], // GovTech Cloud Hosting
    gross: 1040000,
    taxPct: 9,
    retentionPct: 0,
    invoiceDate: "2026-04-01",
    submittedAt: "2026-04-03T09:30:00.000Z",
    submittedBy: "accounts@drukitsolutions.bt",
    channel: "supplier-portal",
    status: "submitted",
    taxType: "TDS+GST",
  }),
  buildInvoice({
    id: "INV-REC-GT02",
    ifmisNumber: "INV-2026-GT-10002",
    invoiceNumber: "CISCO/GT/NDC/M1-ADV",
    contract: ADDITIONAL_SEED_CONTRACTS[11], // GovTech Network Equipment
    gross: 85000,
    taxPct: 2,
    retentionPct: 5,
    invoiceDate: "2026-04-06",
    submittedAt: "2026-04-07T10:30:00.000Z",
    submittedBy: "cisco.bhutan.liaison",
    channel: "manual",
    status: "computed",
    taxType: "TDS",
  }),
  buildInvoice({
    id: "INV-REC-GT03",
    ifmisNumber: "INV-2026-GT-10003",
    invoiceNumber: "PHC/GT/CYBER/D1",
    contract: ADDITIONAL_SEED_CONTRACTS[12], // GovTech Cybersecurity
    gross: 1050000,
    taxPct: 2,
    retentionPct: 0,
    invoiceDate: "2026-04-08",
    submittedAt: "2026-04-09T14:00:00.000Z",
    submittedBy: "phuensum.admin",
    channel: "manual",
    status: "approved",
    taxType: "TDS",
  }),
];
