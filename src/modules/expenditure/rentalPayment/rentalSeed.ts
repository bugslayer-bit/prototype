/* ═══════════════════════════════════════════════════════════════════════════
   Rental Payment Management — Seed Data (UCoA-integrated, 15 records)
   ─────────────────────────────────────────────────────────────────────────
   Derived from SRS PRN 5.1 R78-R80 + DD 19.11–19.13 + UCoA CWT Feb 2026.
   15 rental asset records pre-seeded across all sub-classes with real UCoA
   budget codes, expenditure heads, and funding sources:

   IMMOVABLE (5):  Land×2, House, Building, Building (donor-funded)
   MOVABLE (5):    Vehicle×2, Aero Services, Machinery×2
   IP (5):         Copyright, Patent, Trademark, Industrial Design, Trade Secret

   Cross-process linkages:
     • Budget Management — budgetCode from UCoA Level-2 (BUD-XXXX-2026)
     • Expenditure Head  — UCoA object codes (2111-2121)
     • Funding Source    — RGOB / Donor / Loan / Project Fund
     • Cash Management   — approved txns carry RPO-YYYY-NNNN payment order IDs
     • PTS               — immovable rows carry ptsReference + ptsVerified
     • Contractor/Vendor — lessorId uses shared Contractor ID format

   Merge-by-id: user records always win. Fresh installs start from 15 seeds.
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  RentalAsset,
  RentalPaymentTransaction,
  StoredRental,
} from "./types";
import { initialAsset } from "./types";

const SEED_ISO = "2026-03-15T08:00:00.000Z";

function makeRental(init: {
  id: string;
  asset: Partial<RentalAsset> & Pick<RentalAsset, "assetId" | "assetTitle" | "assetCategory" | "assetType" | "assetSubClass">;
  transactions: RentalPaymentTransaction[];
  createdAt?: string;
  updatedAt?: string;
}): StoredRental {
  const asset: RentalAsset = { ...initialAsset, ...init.asset };
  return {
    id: init.id,
    asset,
    transactions: init.transactions,
    createdAt: init.createdAt ?? SEED_ISO,
    updatedAt: init.updatedAt ?? SEED_ISO,
  };
}

function txn(init: Partial<RentalPaymentTransaction> & Pick<RentalPaymentTransaction, "id" | "transactionId">): RentalPaymentTransaction {
  return {
    paymentOrderId: "",
    assetIds: [],
    lessorId: "",
    lessorName: "",
    grossAmountPayable: "0",
    applicableDeductions: "0",
    netAmountPayable: "0",
    scheduledDate: "",
    budgetCode: "",
    status: "Pending",
    approvedBy: "",
    approvedAt: "",
    createdAt: SEED_ISO,
    ...init,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMMOVABLE PROPERTIES (5 records)
   ═══════════════════════════════════════════════════════════════════════════ */

/* 1. Land — MoAL agricultural plot in Paro */
const r01 = makeRental({
  id: "RREC-2026-0001",
  asset: {
    assetId: "AST-2026-0001",
    assetTitle: "Paro Agri-Research Plot (1.2 acres)",
    assetCategory: "Tangible Assets",
    assetType: "Immovable Properties",
    assetSubClass: "Land",
    thramNo: "THRAM-PA-00421",
    lessorId: "CNTR-DORJI-001",
    lessorName: "Dorji Wangchuk",
    agencyId: "MOAL",
    agencyName: "Ministry of Agriculture and Livestock",
    budgetCode: "BUD-1701-2026 — Office of the Minister (Ministry of Agriculture and Livestock)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-07-01",
    leaseEndDate: "2028-06-30",
    rentAmount: "25000",
    paymentFrequency: "Monthly",
    scheduledPaymentDate: "2026-04-15",
    ptsVerified: true,
    ptsReference: "PTS-THRAM-PA-00421",
    status: "Active",
  },
  transactions: [
    txn({ id: "t01a", transactionId: "RPT-2026-0001", paymentOrderId: "RPO-2026-0001", assetIds: ["AST-2026-0001"], lessorId: "CNTR-DORJI-001", lessorName: "Dorji Wangchuk", grossAmountPayable: "25000", applicableDeductions: "500", netAmountPayable: "24500", scheduledDate: "2026-03-15", budgetCode: "BUD-1701-2026", status: "Paid", approvedBy: "Finance Officer", approvedAt: "2026-03-14T10:00:00Z" }),
    txn({ id: "t01b", transactionId: "RPT-2026-0002", assetIds: ["AST-2026-0001"], lessorId: "CNTR-DORJI-001", lessorName: "Dorji Wangchuk", grossAmountPayable: "25000", applicableDeductions: "500", netAmountPayable: "24500", scheduledDate: "2026-04-15", budgetCode: "BUD-1701-2026", status: "Pending" }),
  ],
});

/* 2. Land — NEC research site in Bumthang */
const r02 = makeRental({
  id: "RREC-2026-0002",
  asset: {
    assetId: "AST-2026-0002",
    assetTitle: "Bumthang Climate Research Site (0.8 acres)",
    assetCategory: "Tangible Assets",
    assetType: "Immovable Properties",
    assetSubClass: "Land",
    thramNo: "THRAM-BUM-01122",
    lessorId: "CNTR-TENZIN-002",
    lessorName: "Tenzin Dorji",
    agencyId: "NEC",
    agencyName: "National Environment Commission",
    budgetCode: "BUD-4002-2026 — National Environment Commission",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "Donor",
    leaseStartDate: "2025-01-01",
    leaseEndDate: "2027-12-31",
    rentAmount: "18000",
    paymentFrequency: "Monthly",
    scheduledPaymentDate: "2026-04-01",
    ptsVerified: true,
    ptsReference: "PTS-THRAM-BUM-01122",
    status: "Active",
  },
  transactions: [
    txn({ id: "t02a", transactionId: "RPT-2026-0003", paymentOrderId: "RPO-2026-0002", assetIds: ["AST-2026-0002"], lessorId: "CNTR-TENZIN-002", lessorName: "Tenzin Dorji", grossAmountPayable: "18000", applicableDeductions: "360", netAmountPayable: "17640", scheduledDate: "2026-03-01", budgetCode: "BUD-4002-2026", status: "Paid", approvedBy: "Agency Finance", approvedAt: "2026-02-28T14:30:00Z" }),
  ],
});

/* 3. House — MoF staff quarters in Changjiji */
const r03 = makeRental({
  id: "RREC-2026-0003",
  asset: {
    assetId: "AST-2026-0003",
    assetTitle: "Changjiji Residential Quarters — Block 4/B",
    assetCategory: "Tangible Assets",
    assetType: "Immovable Properties",
    assetSubClass: "House",
    houseNo: "CRQ-BLOCK4-B",
    lessorId: "VND-PEMA-001",
    lessorName: "Pema Lhamo",
    agencyId: "MOF",
    agencyName: "Ministry of Finance",
    budgetCode: "BUD-1601-2026 — Office of the Minister (Ministry of Finance)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-04-01",
    leaseEndDate: "2027-03-31",
    rentAmount: "42000",
    paymentFrequency: "Monthly",
    scheduledPaymentDate: "2026-04-05",
    ptsVerified: true,
    ptsReference: "PTS-HSE-CRQ4B",
    status: "Active",
  },
  transactions: [
    txn({ id: "t03a", transactionId: "RPT-2026-0004", paymentOrderId: "RPO-2026-0003", assetIds: ["AST-2026-0003"], lessorId: "VND-PEMA-001", lessorName: "Pema Lhamo", grossAmountPayable: "42000", applicableDeductions: "840", netAmountPayable: "41160", scheduledDate: "2026-03-05", budgetCode: "BUD-1601-2026", status: "Approved", approvedBy: "Head of Agency", approvedAt: "2026-03-04T09:00:00Z" }),
  ],
});

/* 4. Building — MoH annexe (NRDCL Tower) */
const r04 = makeRental({
  id: "RREC-2026-0004",
  asset: {
    assetId: "AST-2026-0004",
    assetTitle: "NRDCL Tower — Floor 3, Unit 301 (MoH Annexe)",
    assetCategory: "Tangible Assets",
    assetType: "Immovable Properties",
    assetSubClass: "House/Buildings/Structures",
    unitBuildingFlatNo: "NRDCL-F3-U301",
    lessorId: "VND-NRDCL-001",
    lessorName: "Natural Resources Development Corp Ltd",
    agencyId: "MOH",
    agencyName: "Ministry of Health",
    budgetCode: "BUD-2001-2026 — Office of the Minister (Ministry of Health)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-01-01",
    leaseEndDate: "2027-12-31",
    rentAmount: "185000",
    paymentFrequency: "Quarterly",
    scheduledPaymentDate: "2026-04-01",
    ptsVerified: true,
    ptsReference: "PTS-BLDG-NRDCL-301",
    status: "Active",
  },
  transactions: [
    txn({ id: "t04a", transactionId: "RPT-2026-0005", paymentOrderId: "RPO-2026-0004", assetIds: ["AST-2026-0004"], lessorId: "VND-NRDCL-001", lessorName: "Natural Resources Development Corp Ltd", grossAmountPayable: "555000", applicableDeductions: "11100", netAmountPayable: "543900", scheduledDate: "2026-01-01", budgetCode: "BUD-2001-2026", status: "Paid", approvedBy: "Finance Officer", approvedAt: "2025-12-30T11:00:00Z" }),
    txn({ id: "t04b", transactionId: "RPT-2026-0006", assetIds: ["AST-2026-0004"], lessorId: "VND-NRDCL-001", lessorName: "Natural Resources Development Corp Ltd", grossAmountPayable: "555000", applicableDeductions: "11100", netAmountPayable: "543900", scheduledDate: "2026-04-01", budgetCode: "BUD-2001-2026", status: "Pending" }),
  ],
});

/* 5. Building — MoESD training centre (Donor-funded) */
const r05 = makeRental({
  id: "RREC-2026-0005",
  asset: {
    assetId: "AST-2026-0005",
    assetTitle: "Thimphu Training Centre — Wing B (MoESD)",
    assetCategory: "Tangible Assets",
    assetType: "Immovable Properties",
    assetSubClass: "House/Buildings/Structures",
    unitBuildingFlatNo: "TTC-WING-B",
    lessorId: "VND-BHCL-001",
    lessorName: "Bhutan Housing Corp Ltd",
    agencyId: "MOESD",
    agencyName: "Ministry of Education and Skills Development",
    budgetCode: "BUD-2201-2026 — Office of the Minister (Ministry of Education and Skills Development)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "Donor",
    leaseStartDate: "2025-06-01",
    leaseEndDate: "2028-05-31",
    rentAmount: "95000",
    paymentFrequency: "Quarterly",
    scheduledPaymentDate: "2026-06-01",
    ptsVerified: true,
    ptsReference: "PTS-BLDG-TTC-WB",
    status: "Active",
  },
  transactions: [
    txn({ id: "t05a", transactionId: "RPT-2026-0007", paymentOrderId: "RPO-2026-0005", assetIds: ["AST-2026-0005"], lessorId: "VND-BHCL-001", lessorName: "Bhutan Housing Corp Ltd", grossAmountPayable: "285000", applicableDeductions: "5700", netAmountPayable: "279300", scheduledDate: "2026-03-01", budgetCode: "BUD-2201-2026", status: "Paid", approvedBy: "Head of Agency", approvedAt: "2026-02-27T15:00:00Z" }),
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   MOVABLE PROPERTIES (5 records)
   ═══════════════════════════════════════════════════════════════════════════ */

/* 6. Vehicle — RBP Toyota Hilux field fleet */
const r06 = makeRental({
  id: "RREC-2026-0006",
  asset: {
    assetId: "AST-2026-0006",
    assetTitle: "Toyota Hilux 4WD — Field Fleet Unit 1",
    assetCategory: "Tangible Assets",
    assetType: "Movable Properties",
    assetSubClass: "Vehicles",
    vehicleRegistrationNo: "BG-1-A1080",
    lessorId: "VND-DRUK-CAR-001",
    lessorName: "Druk Car Rentals Pvt Ltd",
    agencyId: "MoESD",
    agencyName: "Ministry of Education & Skills Development",
    budgetCode: "BUD-2201-2026 — Office of the Minister (Ministry of Education & Skills Development)",
    expenditureHead: "2115 — Fuel & Oil Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-03-01",
    leaseEndDate: "2027-02-28",
    rentAmount: "65000",
    paymentFrequency: "Monthly",
    scheduledPaymentDate: "2026-04-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t06a", transactionId: "RPT-2026-0008", assetIds: ["AST-2026-0006"], lessorId: "VND-DRUK-CAR-001", lessorName: "Druk Car Rentals Pvt Ltd", grossAmountPayable: "65000", applicableDeductions: "1300", netAmountPayable: "63700", scheduledDate: "2026-04-01", budgetCode: "BUD-2201-2026", status: "Pending" }),
  ],
});

/* 7. Vehicle — GovTech mobile office van */
const r07 = makeRental({
  id: "RREC-2026-0007",
  asset: {
    assetId: "AST-2026-0007",
    assetTitle: "Hyundai H350 — GovTech Mobile Office Unit",
    assetCategory: "Tangible Assets",
    assetType: "Movable Properties",
    assetSubClass: "Vehicles",
    vehicleRegistrationNo: "BG-2-B3050",
    lessorId: "VND-TASHI-RENT-001",
    lessorName: "Tashi Vehicle Leasing",
    agencyId: "GOVTECH",
    agencyName: "Government Technology Agency (GovTech)",
    budgetCode: "BUD-4003-2026 — Government Technology Agency (GovTech)",
    expenditureHead: "2115 — Fuel & Oil Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-09-01",
    leaseEndDate: "2027-08-31",
    rentAmount: "48000",
    paymentFrequency: "Monthly",
    scheduledPaymentDate: "2026-04-10",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t07a", transactionId: "RPT-2026-0009", paymentOrderId: "RPO-2026-0006", assetIds: ["AST-2026-0007"], lessorId: "VND-TASHI-RENT-001", lessorName: "Tashi Vehicle Leasing", grossAmountPayable: "48000", applicableDeductions: "960", netAmountPayable: "47040", scheduledDate: "2026-03-10", budgetCode: "BUD-4003-2026", status: "Paid", approvedBy: "Finance Officer", approvedAt: "2026-03-08T09:30:00Z" }),
    txn({ id: "t07b", transactionId: "RPT-2026-0010", assetIds: ["AST-2026-0007"], lessorId: "VND-TASHI-RENT-001", lessorName: "Tashi Vehicle Leasing", grossAmountPayable: "48000", applicableDeductions: "960", netAmountPayable: "47040", scheduledDate: "2026-04-10", budgetCode: "BUD-4003-2026", status: "Approved", approvedBy: "Agency Finance", approvedAt: "2026-04-08T10:00:00Z" }),
  ],
});

/* 8. Aero Services — MoHCA helicopter charter */
const r08 = makeRental({
  id: "RREC-2026-0008",
  asset: {
    assetId: "AST-2026-0008",
    assetTitle: "Airbus H125 — Emergency Medevac Charter",
    assetCategory: "Tangible Assets",
    assetType: "Movable Properties",
    assetSubClass: "Aero Services",
    aeroServicesNo: "AS-DRUK-H125-001",
    lessorId: "VND-DRUKAIR-001",
    lessorName: "Drukair Corporation Ltd",
    agencyId: "MOIT",
    agencyName: "Ministry of Infrastructure and Transport",
    budgetCode: "BUD-1901-2026 — Office of the Minister (Ministry of Infrastructure and Transport)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-04-01",
    leaseEndDate: "2027-03-31",
    rentAmount: "3750000",
    paymentFrequency: "Quarterly",
    scheduledPaymentDate: "2026-04-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t08a", transactionId: "RPT-2026-0011", paymentOrderId: "RPO-2026-0007", assetIds: ["AST-2026-0008"], lessorId: "VND-DRUKAIR-001", lessorName: "Drukair Corporation Ltd", grossAmountPayable: "3750000", applicableDeductions: "75000", netAmountPayable: "3675000", scheduledDate: "2026-01-01", budgetCode: "BUD-1901-2026", status: "Paid", approvedBy: "Head of Agency", approvedAt: "2025-12-28T16:00:00Z" }),
    txn({ id: "t08b", transactionId: "RPT-2026-0012", assetIds: ["AST-2026-0008"], lessorId: "VND-DRUKAIR-001", lessorName: "Drukair Corporation Ltd", grossAmountPayable: "3750000", applicableDeductions: "75000", netAmountPayable: "3675000", scheduledDate: "2026-04-01", budgetCode: "BUD-1901-2026", status: "Approved", approvedBy: "Finance Officer", approvedAt: "2026-03-29T08:00:00Z" }),
  ],
});

/* 9. Machinery — DOR Komatsu excavator */
const r09 = makeRental({
  id: "RREC-2026-0009",
  asset: {
    assetId: "AST-2026-0009",
    assetTitle: "Komatsu PC210 Excavator — Road Project Zone 4",
    assetCategory: "Tangible Assets",
    assetType: "Movable Properties",
    assetSubClass: "Machineries",
    machineriesNo: "MACH-KOM-PC210-004",
    machineriesStatus: "Operational",
    lessorId: "VND-BHUTAN-EQUIP-001",
    lessorName: "Bhutan Equipment Leasing Co",
    agencyId: "MOIT",
    agencyName: "Ministry of Infrastructure and Transport",
    budgetCode: "BUD-1904-2026 — Department of Infrastructure Development (Ministry of Infrastructure and Transport)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "Loan",
    leaseStartDate: "2025-06-01",
    leaseEndDate: "2027-05-31",
    rentAmount: "320000",
    paymentFrequency: "Monthly",
    scheduledPaymentDate: "2026-04-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t09a", transactionId: "RPT-2026-0013", assetIds: ["AST-2026-0009"], lessorId: "VND-BHUTAN-EQUIP-001", lessorName: "Bhutan Equipment Leasing Co", grossAmountPayable: "320000", applicableDeductions: "6400", netAmountPayable: "313600", scheduledDate: "2026-04-01", budgetCode: "BUD-1904-2026", status: "Pending" }),
  ],
});

/* 10. Machinery — MoENR drilling rig (Project Fund) */
const r10 = makeRental({
  id: "RREC-2026-0010",
  asset: {
    assetId: "AST-2026-0010",
    assetTitle: "Atlas Copco CT20 Drilling Rig — Geology Survey",
    assetCategory: "Tangible Assets",
    assetType: "Movable Properties",
    assetSubClass: "Machineries",
    machineriesNo: "MACH-AC-CT20-002",
    machineriesStatus: "Operational",
    lessorId: "VND-MINING-SERV-001",
    lessorName: "Mining Services International",
    agencyId: "MOENR",
    agencyName: "Ministry of Energy and Natural Resources",
    budgetCode: "BUD-1803-2026 — Department of Geology and Mines (Ministry of Energy and Natural Resources)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "Project Fund",
    leaseStartDate: "2025-10-01",
    leaseEndDate: "2026-09-30",
    rentAmount: "450000",
    paymentFrequency: "Monthly",
    scheduledPaymentDate: "2026-04-15",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t10a", transactionId: "RPT-2026-0014", paymentOrderId: "RPO-2026-0008", assetIds: ["AST-2026-0010"], lessorId: "VND-MINING-SERV-001", lessorName: "Mining Services International", grossAmountPayable: "450000", applicableDeductions: "9000", netAmountPayable: "441000", scheduledDate: "2026-03-15", budgetCode: "BUD-1803-2026", status: "Paid", approvedBy: "Finance Officer", approvedAt: "2026-03-13T10:00:00Z" }),
    txn({ id: "t10b", transactionId: "RPT-2026-0015", assetIds: ["AST-2026-0010"], lessorId: "VND-MINING-SERV-001", lessorName: "Mining Services International", grossAmountPayable: "450000", applicableDeductions: "9000", netAmountPayable: "441000", scheduledDate: "2026-04-15", budgetCode: "BUD-1803-2026", status: "Pending" }),
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   INTELLECTUAL PROPERTY (5 records)
   ═══════════════════════════════════════════════════════════════════════════ */

/* 11. Copyright — Tourism Brand licence */
const r11 = makeRental({
  id: "RREC-2026-0011",
  asset: {
    assetId: "AST-2026-0011",
    assetTitle: "\"Happiness is a Place\" Tourism Brand — Copyright Licence",
    assetCategory: "Intangible Assets",
    assetType: "Intellectual Property",
    assetSubClass: "Copy Rights",
    certifiedOrRegisteredNumber: "CR-BTN-2024-00187",
    lessorId: "VND-TCB-IP-001",
    lessorName: "Tourism Council of Bhutan — IP Division",
    agencyId: "MICE",
    agencyName: "Ministry of Industry, Commerce and Employment",
    budgetCode: "BUD-2105-2026 — Department of Tourism (Ministry of Industry, Commerce and Employment)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-01-01",
    leaseEndDate: "2029-12-31",
    rentAmount: "480000",
    paymentFrequency: "Yearly",
    scheduledPaymentDate: "2026-01-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t11a", transactionId: "RPT-2026-0016", paymentOrderId: "RPO-2026-0009", assetIds: ["AST-2026-0011"], lessorId: "VND-TCB-IP-001", lessorName: "Tourism Council of Bhutan — IP Division", grossAmountPayable: "480000", applicableDeductions: "9600", netAmountPayable: "470400", scheduledDate: "2026-01-01", budgetCode: "BUD-2105-2026", status: "Paid", approvedBy: "Head of Agency", approvedAt: "2025-12-29T11:00:00Z" }),
  ],
});

/* 12. Patent — GovTech biometric auth patent licence */
const r12 = makeRental({
  id: "RREC-2026-0012",
  asset: {
    assetId: "AST-2026-0012",
    assetTitle: "Biometric Authentication Patent — NDI Licence",
    assetCategory: "Intangible Assets",
    assetType: "Intellectual Property",
    assetSubClass: "Patents",
    certifiedOrRegisteredNumber: "PAT-BTN-2023-00045",
    lessorId: "VND-NDI-TECH-001",
    lessorName: "NDI Technologies Pvt Ltd",
    agencyId: "GOVTECH",
    agencyName: "Government Technology Agency (GovTech)",
    budgetCode: "BUD-4003-2026 — Government Technology Agency (GovTech)",
    expenditureHead: "2121 — Leased Line & Connectivity Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-04-01",
    leaseEndDate: "2028-03-31",
    rentAmount: "750000",
    paymentFrequency: "Yearly",
    scheduledPaymentDate: "2026-04-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t12a", transactionId: "RPT-2026-0017", assetIds: ["AST-2026-0012"], lessorId: "VND-NDI-TECH-001", lessorName: "NDI Technologies Pvt Ltd", grossAmountPayable: "750000", applicableDeductions: "15000", netAmountPayable: "735000", scheduledDate: "2026-04-01", budgetCode: "BUD-4003-2026", status: "Approved", approvedBy: "Finance Officer", approvedAt: "2026-03-28T14:00:00Z" }),
  ],
});

/* 13. Trademark — "Made in Bhutan" certification mark */
const r13 = makeRental({
  id: "RREC-2026-0013",
  asset: {
    assetId: "AST-2026-0013",
    assetTitle: "\"Made in Bhutan\" Certification Mark — Trademark Licence",
    assetCategory: "Intangible Assets",
    assetType: "Intellectual Property",
    assetSubClass: "Trademarks",
    certifiedOrRegisteredNumber: "TM-BTN-2022-00312",
    lessorId: "VND-BSB-001",
    lessorName: "Bhutan Standard Bureau",
    agencyId: "MICE",
    agencyName: "Ministry of Industry, Commerce and Employment",
    budgetCode: "BUD-2107-2026 — Department of Trade (Ministry of Industry, Commerce and Employment)",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-07-01",
    leaseEndDate: "2030-06-30",
    rentAmount: "120000",
    paymentFrequency: "Yearly",
    scheduledPaymentDate: "2026-07-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [],
});

/* 14. Industrial Design — Thromde urban furniture design licence */
const r14 = makeRental({
  id: "RREC-2026-0014",
  asset: {
    assetId: "AST-2026-0014",
    assetTitle: "Bhutanese Urban Furniture Design — Industrial Design Licence",
    assetCategory: "Intangible Assets",
    assetType: "Intellectual Property",
    assetSubClass: "Industrial Designs",
    certifiedOrRegisteredNumber: "ID-BTN-2024-00089",
    lessorId: "VND-DESIGN-HUB-001",
    lessorName: "Bhutan Design Hub",
    agencyId: "GELEPHU-THROMDE",
    agencyName: "Gelephu Thromde",
    budgetCode: "BUD-4601-2026 — Gelephu Thromde",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "RGOB",
    leaseStartDate: "2025-09-01",
    leaseEndDate: "2028-08-31",
    rentAmount: "85000",
    paymentFrequency: "Yearly",
    scheduledPaymentDate: "2026-09-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t14a", transactionId: "RPT-2026-0018", assetIds: ["AST-2026-0014"], lessorId: "VND-DESIGN-HUB-001", lessorName: "Bhutan Design Hub", grossAmountPayable: "85000", applicableDeductions: "1700", netAmountPayable: "83300", scheduledDate: "2025-09-01", budgetCode: "BUD-4601-2026", status: "Paid", approvedBy: "Finance Officer", approvedAt: "2025-08-28T09:00:00Z", paymentOrderId: "RPO-2026-0010" }),
  ],
});

/* 15. Trade Secret — RAA forensic audit methodology licence */
const r15 = makeRental({
  id: "RREC-2026-0015",
  asset: {
    assetId: "AST-2026-0015",
    assetTitle: "Forensic Audit Methodology — Trade Secret Licence",
    assetCategory: "Intangible Assets",
    assetType: "Intellectual Property",
    assetSubClass: "Trade Secrets",
    certifiedOrRegisteredNumber: "TS-BTN-2024-00021",
    lessorId: "VND-AUDIT-INTL-001",
    lessorName: "International Audit Standards Board",
    agencyId: "RAA",
    agencyName: "Royal Audit Authority",
    budgetCode: "BUD-0301-2026 — Royal Audit Authority",
    expenditureHead: "2119 — Other Utility Charges",
    fundingSource: "Donor",
    leaseStartDate: "2025-07-01",
    leaseEndDate: "2027-06-30",
    rentAmount: "350000",
    paymentFrequency: "Yearly",
    scheduledPaymentDate: "2026-07-01",
    ptsVerified: false,
    ptsReference: "",
    status: "Active",
  },
  transactions: [
    txn({ id: "t15a", transactionId: "RPT-2026-0019", assetIds: ["AST-2026-0015"], lessorId: "VND-AUDIT-INTL-001", lessorName: "International Audit Standards Board", grossAmountPayable: "350000", applicableDeductions: "7000", netAmountPayable: "343000", scheduledDate: "2025-07-01", budgetCode: "BUD-0301-2026", status: "Paid", approvedBy: "Head of Agency", approvedAt: "2025-06-28T10:00:00Z", paymentOrderId: "RPO-2026-0011" }),
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   BULK EXPANSION — 25 additional rental records (SRS PRN 5.1 R78–R80 / DD 19.11–13)
   ─────────────────────────────────────────────────────────────────────────
   Spread across every major consuming agency so that each persona sees
   live-scoped data (MoF central → all · agency persona → own rows).
   Records flow through RentalDataContext (localStorage key ifmis_rentals_v1)
   so any addRental / updateRental / removeRental call propagates instantly.
   ═══════════════════════════════════════════════════════════════════════════ */

type RentalBulkRow = {
  seq: number;
  title: string;
  subClass: RentalAsset["assetSubClass"];
  category: RentalAsset["assetCategory"];
  type: RentalAsset["assetType"];
  /** One of the sub-class id fields — populate the correct slot. */
  idField: "thramNo" | "houseNo" | "unitBuildingFlatNo" | "vehicleRegistrationNo" | "aeroServicesNo" | "machineriesNo" | "certifiedOrRegisteredNumber";
  idValue: string;
  lessorId: string;
  lessorName: string;
  agencyId: string;
  agencyName: string;
  budgetCode: string;
  expenditureHead: string;
  fundingSource: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentAmount: string;
  paymentFrequency: string;        // Monthly / Quarterly / Yearly
  scheduledPaymentDate: string;
  ptsVerified?: boolean;
  ptsReference?: string;
  status?: string;                  // Active / Inactive
  machineriesStatus?: string;
  /** Optional inline transaction. */
  txStatus?: string;                // Pending / Approved / Paid
  txScheduledDate?: string;
  txGross?: string;
  txDed?: string;
  txNet?: string;
  paymentOrderId?: string;
};

function mkBulkRental(row: RentalBulkRow): StoredRental {
  const seqPad = String(row.seq).padStart(4, "0");
  const assetId = `AST-2026-${seqPad}`;
  const rrecId = `RREC-2026-${seqPad}`;
  const assetPatch: Partial<RentalAsset> & Pick<RentalAsset, "assetId" | "assetTitle" | "assetCategory" | "assetType" | "assetSubClass"> = {
    assetId,
    assetTitle: row.title,
    assetCategory: row.category,
    assetType: row.type,
    assetSubClass: row.subClass,
    lessorId: row.lessorId,
    lessorName: row.lessorName,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    budgetCode: row.budgetCode,
    expenditureHead: row.expenditureHead,
    fundingSource: row.fundingSource,
    leaseStartDate: row.leaseStartDate,
    leaseEndDate: row.leaseEndDate,
    rentAmount: row.rentAmount,
    paymentFrequency: row.paymentFrequency,
    scheduledPaymentDate: row.scheduledPaymentDate,
    ptsVerified: row.ptsVerified ?? false,
    ptsReference: row.ptsReference ?? "",
    status: row.status ?? "Active",
    machineriesStatus: row.machineriesStatus ?? "",
  };
  // populate the sub-class-specific id field
  (assetPatch as any)[row.idField] = row.idValue;

  const transactions: RentalPaymentTransaction[] = [];
  if (row.txStatus) {
    transactions.push(
      txn({
        id: `tb${row.seq}a`,
        transactionId: `RPT-2026-${String(row.seq + 100).padStart(4, "0")}`,
        paymentOrderId: row.paymentOrderId ?? "",
        assetIds: [assetId],
        lessorId: row.lessorId,
        lessorName: row.lessorName,
        grossAmountPayable: row.txGross ?? row.rentAmount,
        applicableDeductions: row.txDed ?? String(Math.round(Number(row.rentAmount) * 0.02)),
        netAmountPayable: row.txNet ?? String(Number(row.rentAmount) - Math.round(Number(row.rentAmount) * 0.02)),
        scheduledDate: row.txScheduledDate ?? row.scheduledPaymentDate,
        budgetCode: row.budgetCode,
        status: row.txStatus,
        approvedBy: row.txStatus === "Pending" ? "" : "Finance Officer",
        approvedAt: row.txStatus === "Pending" ? "" : "2026-03-25T09:00:00Z",
      }),
    );
  }

  return makeRental({ id: rrecId, asset: assetPatch, transactions });
}

const bulkRentals: StoredRental[] = [
  /* ── GovTech (Agency Code 70) — 4 records so GovTech persona has data ── */
  { seq: 16, title: "GovTech Data-Centre Hall A — Floor 2", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "GTDC-A-F2", lessorId: "VND-DHI-INFRA-001", lessorName: "DHI Infra Ltd", agencyId: "GOVTECH", agencyName: "Government Technology Agency (GovTech)", budgetCode: "BUD-4003-2026 — Government Technology Agency (GovTech)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-04-01", leaseEndDate: "2028-03-31", rentAmount: "280000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-15", ptsVerified: true, ptsReference: "PTS-BLDG-GTDC-A", txStatus: "Pending", txScheduledDate: "2026-04-15" },
  { seq: 17, title: "GovTech Regional Office — Phuentsholing", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "GT-PHT-B1", lessorId: "VND-PHT-PROP-001", lessorName: "Phuentsholing Properties Pvt Ltd", agencyId: "GOVTECH", agencyName: "Government Technology Agency (GovTech)", budgetCode: "BUD-4003-2026 — Government Technology Agency (GovTech)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-07-01", leaseEndDate: "2027-06-30", rentAmount: "85000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-10", ptsVerified: true, ptsReference: "PTS-BLDG-GT-PHT", txStatus: "Paid", txScheduledDate: "2026-03-10", paymentOrderId: "RPO-2026-0021" },
  { seq: 18, title: "Toyota Fortuner — GovTech Thimphu Ops", subClass: "Vehicles", category: "Tangible Assets", type: "Movable Properties", idField: "vehicleRegistrationNo", idValue: "BG-1-C7712", lessorId: "VND-TASHI-RENT-001", lessorName: "Tashi Vehicle Leasing", agencyId: "GOVTECH", agencyName: "Government Technology Agency (GovTech)", budgetCode: "BUD-4003-2026 — Government Technology Agency (GovTech)", expenditureHead: "2115 — Fuel & Oil Charges", fundingSource: "RGOB", leaseStartDate: "2025-11-01", leaseEndDate: "2027-10-31", rentAmount: "58000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-05", txStatus: "Approved", txScheduledDate: "2026-04-05" },
  { seq: 19, title: "AI/ML Compute Cluster — NDI Project Licence", subClass: "Trade Secrets", category: "Intangible Assets", type: "Intellectual Property", idField: "certifiedOrRegisteredNumber", idValue: "TS-BTN-2025-00112", lessorId: "VND-NDI-TECH-001", lessorName: "NDI Technologies Pvt Ltd", agencyId: "GOVTECH", agencyName: "Government Technology Agency (GovTech)", budgetCode: "BUD-4003-2026 — Government Technology Agency (GovTech)", expenditureHead: "2121 — Leased Line & Connectivity Charges", fundingSource: "Donor", leaseStartDate: "2025-10-01", leaseEndDate: "2028-09-30", rentAmount: "1250000", paymentFrequency: "Yearly", scheduledPaymentDate: "2026-10-01", txStatus: "Paid", txScheduledDate: "2025-10-01", paymentOrderId: "RPO-2026-0022" },

  /* ── Ministry of Finance (Code 16 — Central) — 2 ─────────────────────── */
  { seq: 20, title: "MoF Annexe — Thimphu Block 2", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "MOF-ANX-B2", lessorId: "VND-NRDCL-001", lessorName: "Natural Resources Development Corp Ltd", agencyId: "MOF", agencyName: "Ministry of Finance", budgetCode: "BUD-1601-2026 — Office of the Minister (Ministry of Finance)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-04-01", leaseEndDate: "2028-03-31", rentAmount: "120000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-15", ptsVerified: true, ptsReference: "PTS-BLDG-MOF-B2", txStatus: "Approved", txScheduledDate: "2026-04-15" },
  { seq: 21, title: "RRCO Phuentsholing Staff Quarters", subClass: "House", category: "Tangible Assets", type: "Immovable Properties", idField: "houseNo", idValue: "RRCO-PHT-SQ-03", lessorId: "VND-PHT-PROP-001", lessorName: "Phuentsholing Properties Pvt Ltd", agencyId: "MOF", agencyName: "Ministry of Finance", budgetCode: "BUD-1605-2026 — RRCO Phuentsholing", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-01-01", leaseEndDate: "2027-12-31", rentAmount: "32000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", ptsVerified: true, ptsReference: "PTS-HSE-RRCO-SQ3", txStatus: "Paid", txScheduledDate: "2026-03-01", paymentOrderId: "RPO-2026-0023" },

  /* ── Ministry of Health — 2 ──────────────────────────────────────────── */
  { seq: 22, title: "MoH Regional Office — Mongar", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "MOH-MONG-RO", lessorId: "VND-MONG-PROP-001", lessorName: "Mongar Property Holdings", agencyId: "MOH", agencyName: "Ministry of Health", budgetCode: "BUD-2001-2026 — Office of the Minister (Ministry of Health)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-06-01", leaseEndDate: "2027-05-31", rentAmount: "65000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-05", txStatus: "Pending" },
  { seq: 23, title: "Ambulance Fleet — 4 units (ERS)", subClass: "Vehicles", category: "Tangible Assets", type: "Movable Properties", idField: "vehicleRegistrationNo", idValue: "BG-1-AMB-FLEET", lessorId: "VND-DRUK-CAR-001", lessorName: "Druk Car Rentals Pvt Ltd", agencyId: "MOH", agencyName: "Ministry of Health", budgetCode: "BUD-2003-2026 — Emergency Response (Ministry of Health)", expenditureHead: "2115 — Fuel & Oil Charges", fundingSource: "Donor", leaseStartDate: "2025-03-01", leaseEndDate: "2028-02-28", rentAmount: "240000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", txStatus: "Paid", txScheduledDate: "2026-03-01", paymentOrderId: "RPO-2026-0024" },

  /* ── Ministry of Home Affairs — 2 ────────────────────────────────────── */
  { seq: 24, title: "MoHA Emergency Ops Centre Floor 1", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "MOHA-EOC-F1", lessorId: "VND-BHCL-001", lessorName: "Bhutan Housing Corp Ltd", agencyId: "MOHA", agencyName: "Ministry of Home Affairs", budgetCode: "BUD-1501-2026 — Office of the Minister (Ministry of Home Affairs)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-02-01", leaseEndDate: "2028-01-31", rentAmount: "95000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-10", ptsVerified: true, ptsReference: "PTS-BLDG-MOHA-EOC", txStatus: "Approved" },
  { seq: 25, title: "RBP Patrol Vehicles — 6 unit fleet", subClass: "Vehicles", category: "Tangible Assets", type: "Movable Properties", idField: "vehicleRegistrationNo", idValue: "BG-2-RBP-FLEET", lessorId: "VND-TASHI-RENT-001", lessorName: "Tashi Vehicle Leasing", agencyId: "MOHA", agencyName: "Ministry of Home Affairs", budgetCode: "BUD-1503-2026 — Royal Bhutan Police (Ministry of Home Affairs)", expenditureHead: "2115 — Fuel & Oil Charges", fundingSource: "RGOB", leaseStartDate: "2025-05-01", leaseEndDate: "2027-04-30", rentAmount: "320000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", txStatus: "Paid", paymentOrderId: "RPO-2026-0025" },

  /* ── Ministry of Foreign Affairs & External Trade — 1 ────────────────── */
  { seq: 26, title: "MoFAET Consular Annexe — Floor 3", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "MOFA-CON-F3", lessorId: "VND-NRDCL-001", lessorName: "Natural Resources Development Corp Ltd", agencyId: "MOFAET", agencyName: "Ministry of Foreign Affairs & External Trade", budgetCode: "BUD-1401-2026 — Office of the Minister (MoFAET)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-01-01", leaseEndDate: "2027-12-31", rentAmount: "72000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", ptsVerified: true, ptsReference: "PTS-BLDG-MOFA-F3", txStatus: "Pending" },

  /* ── Ministry of Education & Skills Development — 2 ──────────────────── */
  { seq: 27, title: "Paro College of Education Hostel Block C", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "PCE-HB-C", lessorId: "VND-PARO-PROP-001", lessorName: "Paro Valley Properties", agencyId: "MOESD", agencyName: "Ministry of Education & Skills Development", budgetCode: "BUD-2201-2026 — Office of the Minister (Ministry of Education & Skills Development)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-08-01", leaseEndDate: "2028-07-31", rentAmount: "78000", paymentFrequency: "Quarterly", scheduledPaymentDate: "2026-05-01", txStatus: "Approved" },
  { seq: 28, title: "Digital Learning Content Library — Copyright", subClass: "Copy Rights", category: "Intangible Assets", type: "Intellectual Property", idField: "certifiedOrRegisteredNumber", idValue: "CR-BTN-2025-00245", lessorId: "VND-PEARSON-001", lessorName: "Pearson Education South Asia", agencyId: "MOESD", agencyName: "Ministry of Education & Skills Development", budgetCode: "BUD-2205-2026 — Department of School Education (Ministry of Education & Skills Development)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "Donor", leaseStartDate: "2025-06-01", leaseEndDate: "2028-05-31", rentAmount: "1850000", paymentFrequency: "Yearly", scheduledPaymentDate: "2026-06-01", txStatus: "Paid", paymentOrderId: "RPO-2026-0026" },

  /* ── Royal Civil Service Commission — 1 ──────────────────────────────── */
  { seq: 29, title: "RCSC HRIS Platform — Software Licence", subClass: "Patents", category: "Intangible Assets", type: "Intellectual Property", idField: "certifiedOrRegisteredNumber", idValue: "PAT-BTN-2024-00077", lessorId: "VND-HRIS-SYS-001", lessorName: "HRIS Systems International", agencyId: "RCSC", agencyName: "Royal Civil Service Commission", budgetCode: "BUD-0201-2026 — Royal Civil Service Commission", expenditureHead: "2121 — Leased Line & Connectivity Charges", fundingSource: "RGOB", leaseStartDate: "2025-03-01", leaseEndDate: "2028-02-28", rentAmount: "680000", paymentFrequency: "Yearly", scheduledPaymentDate: "2026-03-01", txStatus: "Paid", paymentOrderId: "RPO-2026-0027" },

  /* ── National Assembly — 1 ───────────────────────────────────────────── */
  { seq: 30, title: "NA Media & Webcasting Equipment Lease", subClass: "Machineries", category: "Tangible Assets", type: "Movable Properties", idField: "machineriesNo", idValue: "MACH-NA-MEDIA-01", lessorId: "VND-BMF-TECH-001", lessorName: "Bhutan Media Tech Ltd", agencyId: "NA", agencyName: "National Assembly of Bhutan", budgetCode: "BUD-0101-2026 — National Assembly Secretariat", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-09-01", leaseEndDate: "2027-08-31", rentAmount: "145000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", machineriesStatus: "Operational", txStatus: "Approved" },

  /* ── Judiciary — 1 ───────────────────────────────────────────────────── */
  { seq: 31, title: "High Court Annexe — Thimphu", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "HC-ANX-TH", lessorId: "VND-BHCL-001", lessorName: "Bhutan Housing Corp Ltd", agencyId: "JUD", agencyName: "Judiciary of Bhutan", budgetCode: "BUD-0401-2026 — Judiciary of Bhutan", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-04-01", leaseEndDate: "2028-03-31", rentAmount: "88000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-10", ptsVerified: true, ptsReference: "PTS-BLDG-HC-ANX", txStatus: "Paid", paymentOrderId: "RPO-2026-0028" },

  /* ── Royal Audit Authority — 1 ───────────────────────────────────────── */
  { seq: 32, title: "RAA Eastern Regional Office — Mongar", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "RAA-MONG-RO", lessorId: "VND-MONG-PROP-001", lessorName: "Mongar Property Holdings", agencyId: "RAA", agencyName: "Royal Audit Authority", budgetCode: "BUD-0301-2026 — Royal Audit Authority", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-02-01", leaseEndDate: "2028-01-31", rentAmount: "48000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", txStatus: "Pending" },

  /* ── Ministry of Industry, Commerce & Employment — 1 ─────────────────── */
  { seq: 33, title: "MoICE SME Incubation Space — Pasakha", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "MOICE-SME-PSK", lessorId: "VND-PASAKHA-IE-001", lessorName: "Pasakha Industrial Estate Ltd", agencyId: "MOICE", agencyName: "Ministry of Industry, Commerce and Employment", budgetCode: "BUD-2101-2026 — Office of the Minister (Ministry of Industry, Commerce and Employment)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "Loan", leaseStartDate: "2025-05-01", leaseEndDate: "2028-04-30", rentAmount: "135000", paymentFrequency: "Quarterly", scheduledPaymentDate: "2026-05-01", txStatus: "Approved" },

  /* ── Ministry of Energy & Natural Resources — 1 ──────────────────────── */
  { seq: 34, title: "MoENR Hydrology Research Station — Punakha", subClass: "Land", category: "Tangible Assets", type: "Immovable Properties", idField: "thramNo", idValue: "THRAM-PU-04455", lessorId: "VND-PUNA-PROP-001", lessorName: "Punakha Valley Holdings", agencyId: "MOENR", agencyName: "Ministry of Energy and Natural Resources", budgetCode: "BUD-1801-2026 — Office of the Minister (Ministry of Energy and Natural Resources)", expenditureHead: "2119 — Other Utility Charges", fundingSource: "Project Fund", leaseStartDate: "2025-07-01", leaseEndDate: "2028-06-30", rentAmount: "38000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-15", ptsVerified: true, ptsReference: "PTS-THRAM-PU-04455", txStatus: "Paid", paymentOrderId: "RPO-2026-0029" },

  /* ── Thimphu Thromde — 1 ─────────────────────────────────────────────── */
  { seq: 35, title: "Sanitation Truck Fleet — 3 units", subClass: "Vehicles", category: "Tangible Assets", type: "Movable Properties", idField: "vehicleRegistrationNo", idValue: "BG-2-TT-SANI", lessorId: "VND-BHUTAN-EQUIP-001", lessorName: "Bhutan Equipment Leasing Co", agencyId: "TT", agencyName: "Thimphu Thromde", budgetCode: "BUD-4501-2026 — Thimphu Thromde", expenditureHead: "2115 — Fuel & Oil Charges", fundingSource: "RGOB", leaseStartDate: "2025-10-01", leaseEndDate: "2027-09-30", rentAmount: "180000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-05", txStatus: "Pending" },

  /* ── Phuentsholing Thromde — 1 ───────────────────────────────────────── */
  { seq: 36, title: "Market Complex Parking Block — Pgling", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "PT-MKT-PARK", lessorId: "VND-PHT-PROP-001", lessorName: "Phuentsholing Properties Pvt Ltd", agencyId: "PT", agencyName: "Phuentsholing Thromde", budgetCode: "BUD-4502-2026 — Phuentsholing Thromde", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-06-01", leaseEndDate: "2028-05-31", rentAmount: "56000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-10", ptsVerified: true, ptsReference: "PTS-BLDG-PT-MKT", txStatus: "Approved" },

  /* ── Royal University of Bhutan — 1 ──────────────────────────────────── */
  { seq: 37, title: "Sherubtse College — Visiting Faculty Quarters", subClass: "House", category: "Tangible Assets", type: "Immovable Properties", idField: "houseNo", idValue: "SHC-VFQ-07", lessorId: "VND-EAST-PROP-001", lessorName: "Eastern Region Properties", agencyId: "RUB", agencyName: "Royal University of Bhutan", budgetCode: "BUD-6801-2026 — Royal University of Bhutan", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-08-01", leaseEndDate: "2027-07-31", rentAmount: "24000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", ptsVerified: true, ptsReference: "PTS-HSE-SHC-VFQ7", txStatus: "Paid", paymentOrderId: "RPO-2026-0030" },

  /* ── Election Commission — 1 (IP licence) ────────────────────────────── */
  { seq: 38, title: "Electoral Roll Management System — Patent Licence", subClass: "Patents", category: "Intangible Assets", type: "Intellectual Property", idField: "certifiedOrRegisteredNumber", idValue: "PAT-BTN-2024-00101", lessorId: "VND-ELEC-SYS-001", lessorName: "Electoral Systems International", agencyId: "ECB", agencyName: "Election Commission of Bhutan", budgetCode: "BUD-0501-2026 — Election Commission of Bhutan", expenditureHead: "2121 — Leased Line & Connectivity Charges", fundingSource: "Donor", leaseStartDate: "2025-04-01", leaseEndDate: "2028-03-31", rentAmount: "420000", paymentFrequency: "Yearly", scheduledPaymentDate: "2026-04-01", txStatus: "Approved" },

  /* ── Anti-Corruption Commission — 1 ──────────────────────────────────── */
  { seq: 39, title: "ACC Forensic Lab Equipment — 2-year Lease", subClass: "Machineries", category: "Tangible Assets", type: "Movable Properties", idField: "machineriesNo", idValue: "MACH-ACC-FOR-01", lessorId: "VND-FORENSIC-EQ-001", lessorName: "Forensic Equipment Asia Pvt Ltd", agencyId: "ACC", agencyName: "Anti-Corruption Commission", budgetCode: "BUD-0601-2026 — Anti-Corruption Commission", expenditureHead: "2119 — Other Utility Charges", fundingSource: "Donor", leaseStartDate: "2025-09-01", leaseEndDate: "2027-08-31", rentAmount: "285000", paymentFrequency: "Quarterly", scheduledPaymentDate: "2026-06-01", machineriesStatus: "Operational", txStatus: "Paid", paymentOrderId: "RPO-2026-0031" },

  /* ── Paro Dzongkhag — 1 ──────────────────────────────────────────────── */
  { seq: 40, title: "Paro Dzongkhag Field Office — Lamgong", subClass: "House/Buildings/Structures", category: "Tangible Assets", type: "Immovable Properties", idField: "unitBuildingFlatNo", idValue: "PARO-LAM-FO", lessorId: "VND-PARO-PROP-001", lessorName: "Paro Valley Properties", agencyId: "PARO-DZ", agencyName: "Paro Dzongkhag Administration", budgetCode: "BUD-5001-2026 — Paro Dzongkhag Administration", expenditureHead: "2119 — Other Utility Charges", fundingSource: "RGOB", leaseStartDate: "2025-03-01", leaseEndDate: "2028-02-28", rentAmount: "28000", paymentFrequency: "Monthly", scheduledPaymentDate: "2026-04-01", ptsVerified: true, ptsReference: "PTS-BLDG-PARO-LAM", txStatus: "Pending" },
].map(mkBulkRental);

/* ── Exports ─────────────────────────────────────────────────────────────── */
export const SEED_RENTALS: StoredRental[] = [
  r01, r02, r03, r04, r05,
  r06, r07, r08, r09, r10,
  r11, r12, r13, r14, r15,
  ...bulkRentals,
];
