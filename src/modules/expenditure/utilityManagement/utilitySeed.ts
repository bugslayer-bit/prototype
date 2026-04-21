/* ═══════════════════════════════════════════════════════════════════════════
   Utility Management — Seed Data (SRS PRN 5.1 / UCoA Feb 2026)
   ──────────────────────────────────────────────────────────────────────────
   25 utility provider accounts (5 per provider) seeded from:
     • SRS Process Descriptions rows 74-76 (PRN 5.1)
     • SRS LoV 15.1 (Utility Type, Provider, Payment Method)
     • SRS LoV 15.2 (Preferred Payment Mode, Cut-off Date)
     • UCoA CWT Feb 2026 — Organization Level-2 budget codes
     • DD 19.1 – 19.10 data dictionary fields

   Provider ← → Utility Type Mapping (SRS LoV 15.1):
     Bhutan Power Corporation Ltd    → Electricity
     Bhutan Telecom Ltd              → Telephone, Internet/Leasedline
     Tashi Cell                      → Telephone, Internet/Leasedline
     Bhutan Starlink                 → Internet/Leasedline
     Municipalities & Thromdes       → Water, Sewerage

   Merge-by-id policy: UtilityDataContext merges this seed with localStorage.
   User records ALWAYS win — edits persist across reloads.
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  StoredUtility,
  UtilityHeader,
  ServiceOfficeMap,
  UtilityBill,
} from "./types";

const SEED_ISO = "2026-03-12T09:00:00.000Z";

function makeUtility(init: {
  id: string;
  utilityId: string;
  agencyCode: string;
  agencyName: string;
  utilityType: string;
  serviceProviderId: string;
  serviceProviderName: string;
  connectionReference: string;
  monthlyBudgetAllocation: string;
  billingCycle: string;
  autoPaymentEnabled: boolean;
  varianceThresholdPercent: string;
  utilityStatus: string;
  paymentMethod?: string;
  preferredPaymentMode?: string;
  cutoffDate?: string;
  budgetCode?: string;
  expenditureHead?: string;
  fundingSource?: string;
  serviceMaps: ServiceOfficeMap[];
  bills: UtilityBill[];
  createdAt?: string;
  updatedAt?: string;
}): StoredUtility {
  const header: UtilityHeader = {
    utilityId: init.utilityId,
    agencyId: slug(init.agencyName),
    agencyCode: init.agencyCode,
    agencyName: init.agencyName,
    utilityType: init.utilityType,
    serviceProviderId: init.serviceProviderId,
    serviceProviderName: init.serviceProviderName,
    connectionReference: init.connectionReference,
    monthlyBudgetAllocation: init.monthlyBudgetAllocation,
    billingCycle: init.billingCycle,
    autoPaymentEnabled: init.autoPaymentEnabled,
    varianceThresholdPercent: init.varianceThresholdPercent,
    utilityStatus: init.utilityStatus,
    paymentMethod: init.paymentMethod ?? "Individual",
    preferredPaymentMode: init.preferredPaymentMode ?? "Individual: Based on Service Provider",
    cutoffDate: init.cutoffDate ?? "15",
    budgetCode: init.budgetCode ?? "",
    expenditureHead: init.expenditureHead ?? "Utility Charges",
    fundingSource: init.fundingSource ?? "RGOB",
  };
  return {
    id: init.id,
    header,
    serviceMaps: init.serviceMaps,
    bills: init.bills,
    createdAt: init.createdAt ?? SEED_ISO,
    updatedAt: init.updatedAt ?? SEED_ISO,
  };
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER 1: BHUTAN POWER CORPORATION LTD (BPC)
   Utility Type: Electricity
   Service Type: Consumer Number
   ═══════════════════════════════════════════════════════════════════════════ */

const bpc1 = makeUtility({
  id: "UREC-2026-0001",
  utilityId: "UTL-2026-0001",
  agencyCode: "16",
  agencyName: "Ministry of Finance",
  utilityType: "Electricity",
  serviceProviderId: "UPROV-BPC",
  serviceProviderName: "Bhutan Power Corporation Ltd",
  connectionReference: "BPC-TH-HQ-114455",
  monthlyBudgetAllocation: "85000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Electricity Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BPC-1", serviceName: "Consumer Number", officeId: "MOF-HQ-01", officeName: "MoF Headquarters, Thimphu" },
    { id: "SOM-BPC-2", serviceName: "Consumer Number", officeId: "MOF-ANX-02", officeName: "MoF Annexe, Thimphu" },
  ],
  bills: [
    { id: "UB-REC-0001-01", billId: "UB-2026-0001", utilityId: "UTL-2026-0001", source: "API Push", serviceNumber: "BPC-HQ-114455", officeId: "MOF-HQ-01", officeName: "MoF Headquarters, Thimphu", billingCycle: "Monthly", billingPeriodFrom: "01/01/2026", billingPeriodTo: "31/01/2026", billAmount: "72500", applicableTaxes: "3625", totalBillAmount: "76125", billDueDate: "15/02/2026", receivedAt: "2026-02-01T08:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0001-02", billId: "UB-2026-0002", utilityId: "UTL-2026-0001", source: "API Push", serviceNumber: "BPC-HQ-114455", officeId: "MOF-HQ-01", officeName: "MoF Headquarters, Thimphu", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "78900", applicableTaxes: "3945", totalBillAmount: "82845", billDueDate: "15/03/2026", receivedAt: "2026-03-01T08:00:00.000Z", status: "Approved" },
    { id: "UB-REC-0001-03", billId: "UB-2026-0003", utilityId: "UTL-2026-0001", source: "API Push", serviceNumber: "BPC-ANX-88221", officeId: "MOF-ANX-02", officeName: "MoF Annexe, Thimphu", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "21400", applicableTaxes: "1070", totalBillAmount: "22470", billDueDate: "15/04/2026", receivedAt: "2026-04-01T08:00:00.000Z", status: "Pending" },
  ],
});

const bpc2 = makeUtility({
  id: "UREC-2026-0002",
  utilityId: "UTL-2026-0002",
  agencyCode: "22",
  agencyName: "Ministry of Education & Skills Development",
  utilityType: "Electricity",
  serviceProviderId: "UPROV-BPC",
  serviceProviderName: "Bhutan Power Corporation Ltd",
  connectionReference: "BPC-TH-MoESD-225566",
  monthlyBudgetAllocation: "62000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "10",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "15",
  budgetCode: "BUD-2201-2026",
  expenditureHead: "Electricity Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BPC-3", serviceName: "Consumer Number", officeId: "MoESD-HQ", officeName: "MoESD Headquarters, Thimphu" },
  ],
  bills: [
    { id: "UB-REC-0002-01", billId: "UB-2026-0004", utilityId: "UTL-2026-0002", source: "API Push", serviceNumber: "BPC-MoESD-225566", officeId: "MoESD-HQ", officeName: "MoESD Headquarters", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "55800", applicableTaxes: "2790", totalBillAmount: "58590", billDueDate: "15/03/2026", receivedAt: "2026-03-01T08:30:00.000Z", status: "Paid" },
    { id: "UB-REC-0002-02", billId: "UB-2026-0005", utilityId: "UTL-2026-0002", source: "API Push", serviceNumber: "BPC-MoESD-225566", officeId: "MoESD-HQ", officeName: "MoESD Headquarters", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "59200", applicableTaxes: "2960", totalBillAmount: "62160", billDueDate: "15/04/2026", receivedAt: "2026-04-01T08:30:00.000Z", status: "Pending" },
  ],
});

const bpc3 = makeUtility({
  id: "UREC-2026-0003",
  utilityId: "UTL-2026-0003",
  agencyCode: "22",
  agencyName: "Education",
  utilityType: "Electricity",
  serviceProviderId: "UPROV-BPC",
  serviceProviderName: "Bhutan Power Corporation Ltd",
  connectionReference: "BPC-TH-MOE-337788",
  monthlyBudgetAllocation: "95000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "20",
  budgetCode: "BUD-2201-2026",
  expenditureHead: "Electricity Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BPC-4", serviceName: "Consumer Number", officeId: "MOE-HQ", officeName: "Ministry of Education HQ" },
    { id: "SOM-BPC-5", serviceName: "Consumer Number", officeId: "MOE-EAST", officeName: "MoE Eastern Regional Office" },
  ],
  bills: [
    { id: "UB-REC-0003-01", billId: "UB-2026-0006", utilityId: "UTL-2026-0003", source: "API Push", serviceNumber: "BPC-MOE-337788", officeId: "MOE-HQ", officeName: "Ministry of Education HQ", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "88500", applicableTaxes: "4425", totalBillAmount: "92925", billDueDate: "20/03/2026", receivedAt: "2026-03-02T09:00:00.000Z", status: "Cleared for Payment" },
    { id: "UB-REC-0003-02", billId: "UB-2026-0007", utilityId: "UTL-2026-0003", source: "API Push", serviceNumber: "BPC-MOE-REG-4422", officeId: "MOE-EAST", officeName: "MoE Eastern Regional", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "42100", applicableTaxes: "2105", totalBillAmount: "44205", billDueDate: "20/04/2026", receivedAt: "2026-04-02T09:00:00.000Z", status: "Pending" },
  ],
});

const bpc4 = makeUtility({
  id: "UREC-2026-0004",
  utilityId: "UTL-2026-0004",
  agencyCode: "12",
  agencyName: "Royal Audit Authority",
  utilityType: "Electricity",
  serviceProviderId: "UPROV-BPC",
  serviceProviderName: "Bhutan Power Corporation Ltd",
  connectionReference: "BPC-TH-RAA-112233",
  monthlyBudgetAllocation: "28000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "10",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Electricity Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BPC-6", serviceName: "Consumer Number", officeId: "RAA-HQ", officeName: "Royal Audit Authority, Thimphu" },
  ],
  bills: [
    { id: "UB-REC-0004-01", billId: "UB-2026-0008", utilityId: "UTL-2026-0004", source: "API Push", serviceNumber: "BPC-RAA-112233", officeId: "RAA-HQ", officeName: "RAA Thimphu", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "24800", applicableTaxes: "1240", totalBillAmount: "26040", billDueDate: "15/04/2026", receivedAt: "2026-04-01T10:00:00.000Z", status: "Pending" },
  ],
});

const bpc5 = makeUtility({
  id: "UREC-2026-0005",
  utilityId: "UTL-2026-0005",
  agencyCode: "46",
  agencyName: "Gelephu Thromde",
  utilityType: "Electricity",
  serviceProviderId: "UPROV-BPC",
  serviceProviderName: "Bhutan Power Corporation Ltd",
  connectionReference: "BPC-TH-GELP-998877",
  monthlyBudgetAllocation: "145000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "12",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "15",
  budgetCode: "BUD-4601-2026",
  expenditureHead: "Electricity Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BPC-7", serviceName: "Consumer Number", officeId: "GT-ADMIN", officeName: "Gelephu Thromde Admin Block" },
    { id: "SOM-BPC-8", serviceName: "Consumer Number", officeId: "GT-MAINT", officeName: "Gelephu Thromde Maintenance" },
    { id: "SOM-BPC-9", serviceName: "Consumer Number", officeId: "GT-STREET", officeName: "Gelephu Street Lighting" },
  ],
  bills: [
    { id: "UB-REC-0005-01", billId: "UB-2026-0009", utilityId: "UTL-2026-0005", source: "API Push", serviceNumber: "BPC-GT-ADMIN-998877", officeId: "GT-ADMIN", officeName: "Gelephu Thromde Admin", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "125000", applicableTaxes: "6250", totalBillAmount: "131250", billDueDate: "15/03/2026", receivedAt: "2026-03-01T08:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0005-02", billId: "UB-2026-0010", utilityId: "UTL-2026-0005", source: "API Push", serviceNumber: "BPC-GT-STREET-5544", officeId: "GT-STREET", officeName: "Street Lighting", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "138400", applicableTaxes: "6920", totalBillAmount: "145320", billDueDate: "15/04/2026", receivedAt: "2026-04-01T08:00:00.000Z", status: "Overdue" },
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER 2: BHUTAN TELECOM LTD (BT)
   Utility Types: Telephone, Internet/Leasedline
   Service Types: BT Landline, BT Postpaid Mobile, BT Broadband Postpaid, BT Leasedline
   ═══════════════════════════════════════════════════════════════════════════ */

const bt1 = makeUtility({
  id: "UREC-2026-0006",
  utilityId: "UTL-2026-0006",
  agencyCode: "16",
  agencyName: "PPD",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "CTR-BIZ-2026-9008",
  serviceProviderName: "Bhutan Telecom Ltd",
  connectionReference: "BT-LL-GOVNET-001",
  monthlyBudgetAllocation: "120000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "10",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "15",
  budgetCode: "BUD-1603-2026",
  expenditureHead: "Internet & Telecom Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BTL-1", serviceName: "BT Leasedline", officeId: "PPD-HQ", officeName: "PPD Headquarters" },
    { id: "SOM-BTL-2", serviceName: "BT Broadband Postpaid", officeId: "PPD-HQ", officeName: "PPD Headquarters" },
    { id: "SOM-BTL-3", serviceName: "BT Postpaid Mobile", officeId: "PPD-HQ", officeName: "PPD Headquarters" },
    { id: "SOM-BTL-4", serviceName: "BT Landline", officeId: "PPD-HQ", officeName: "PPD Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0006-01", billId: "UB-2026-0011", utilityId: "UTL-2026-0006", source: "API Fetch", serviceNumber: "BT-LL-001", officeId: "PPD-HQ", officeName: "PPD Headquarters", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "95000", applicableTaxes: "4750", totalBillAmount: "99750", billDueDate: "15/03/2026", receivedAt: "2026-03-03T10:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0006-02", billId: "UB-2026-0012", utilityId: "UTL-2026-0006", source: "API Fetch", serviceNumber: "BT-LL-001", officeId: "PPD-HQ", officeName: "PPD Headquarters", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "98500", applicableTaxes: "4925", totalBillAmount: "103425", billDueDate: "15/04/2026", receivedAt: "2026-04-01T10:00:00.000Z", status: "Cleared for Payment" },
  ],
});

const bt2 = makeUtility({
  id: "UREC-2026-0007",
  utilityId: "UTL-2026-0007",
  agencyCode: "70",
  agencyName: "GovTech Agency",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "CTR-BIZ-2026-9008",
  serviceProviderName: "Bhutan Telecom Ltd",
  connectionReference: "BT-LL-GOVTECH-005",
  monthlyBudgetAllocation: "250000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "8",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "10",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Internet & Data Centre Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BTL-5", serviceName: "BT Leasedline", officeId: "GOVTECH-DC", officeName: "GovTech Data Centre" },
    { id: "SOM-BTL-6", serviceName: "BT Broadband Postpaid", officeId: "GOVTECH-HQ", officeName: "GovTech Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0007-01", billId: "UB-2026-0013", utilityId: "UTL-2026-0007", source: "API Fetch", serviceNumber: "BT-LL-GOVTECH-DC", officeId: "GOVTECH-DC", officeName: "GovTech Data Centre", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "185000", applicableTaxes: "9250", totalBillAmount: "194250", billDueDate: "10/03/2026", receivedAt: "2026-03-02T09:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0007-02", billId: "UB-2026-0014", utilityId: "UTL-2026-0007", source: "API Fetch", serviceNumber: "BT-LL-GOVTECH-DC", officeId: "GOVTECH-DC", officeName: "GovTech Data Centre", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "192000", applicableTaxes: "9600", totalBillAmount: "201600", billDueDate: "10/04/2026", receivedAt: "2026-04-01T09:00:00.000Z", status: "Approved" },
    { id: "UB-REC-0007-03", billId: "UB-2026-0015", utilityId: "UTL-2026-0007", source: "API Fetch", serviceNumber: "BT-BB-GOVTECH-HQ", officeId: "GOVTECH-HQ", officeName: "GovTech HQ Broadband", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "45000", applicableTaxes: "2250", totalBillAmount: "47250", billDueDate: "10/04/2026", receivedAt: "2026-04-01T09:15:00.000Z", status: "Pending" },
  ],
});

const bt3 = makeUtility({
  id: "UREC-2026-0008",
  utilityId: "UTL-2026-0008",
  agencyCode: "23",
  agencyName: "Ministry of Foreign Affairs & External Trade",
  utilityType: "Telephone",
  serviceProviderId: "CTR-BIZ-2026-9008",
  serviceProviderName: "Bhutan Telecom Ltd",
  connectionReference: "BT-PH-MOFA-009",
  monthlyBudgetAllocation: "75000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Region",
  cutoffDate: "15",
  budgetCode: "BUD-2301-2026",
  expenditureHead: "Telephone Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BTL-7", serviceName: "BT Landline", officeId: "MOFA-HQ", officeName: "MoFA Headquarters" },
    { id: "SOM-BTL-8", serviceName: "BT Postpaid Mobile", officeId: "MOFA-HQ", officeName: "MoFA Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0008-01", billId: "UB-2026-0016", utilityId: "UTL-2026-0008", source: "API Push", serviceNumber: "BT-LD-MOFA-1100", officeId: "MOFA-HQ", officeName: "MoFA HQ", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "68500", applicableTaxes: "3425", totalBillAmount: "71925", billDueDate: "15/04/2026", receivedAt: "2026-04-02T11:00:00.000Z", status: "Pending" },
  ],
});

const bt4 = makeUtility({
  id: "UREC-2026-0009",
  utilityId: "UTL-2026-0009",
  agencyCode: "52",
  agencyName: "National Assembly",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "CTR-BIZ-2026-9008",
  serviceProviderName: "Bhutan Telecom Ltd",
  connectionReference: "BT-LL-NA-112",
  monthlyBudgetAllocation: "55000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "12",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Internet & Telecom Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BTL-9", serviceName: "BT Leasedline", officeId: "NA-HQ", officeName: "National Assembly Chamber" },
    { id: "SOM-BTL-10", serviceName: "BT Landline", officeId: "NA-HQ", officeName: "National Assembly Chamber" },
  ],
  bills: [
    { id: "UB-REC-0009-01", billId: "UB-2026-0017", utilityId: "UTL-2026-0009", source: "API Fetch", serviceNumber: "BT-LL-NA-112", officeId: "NA-HQ", officeName: "National Assembly", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "48200", applicableTaxes: "2410", totalBillAmount: "50610", billDueDate: "15/03/2026", receivedAt: "2026-03-02T10:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0009-02", billId: "UB-2026-0018", utilityId: "UTL-2026-0009", source: "API Fetch", serviceNumber: "BT-LL-NA-112", officeId: "NA-HQ", officeName: "National Assembly", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "51500", applicableTaxes: "2575", totalBillAmount: "54075", billDueDate: "15/04/2026", receivedAt: "2026-04-01T10:00:00.000Z", status: "Cleared for Payment" },
  ],
});

const bt5 = makeUtility({
  id: "UREC-2026-0010",
  utilityId: "UTL-2026-0010",
  agencyCode: "59",
  agencyName: "Royal Court of Justice",
  utilityType: "Telephone",
  serviceProviderId: "CTR-BIZ-2026-9008",
  serviceProviderName: "Bhutan Telecom Ltd",
  connectionReference: "BT-PH-RCJ-332",
  monthlyBudgetAllocation: "32000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Telephone Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BTL-11", serviceName: "BT Landline", officeId: "RCJ-HQ", officeName: "Royal Court of Justice" },
    { id: "SOM-BTL-12", serviceName: "BT Postpaid Mobile", officeId: "RCJ-HQ", officeName: "Royal Court of Justice" },
  ],
  bills: [
    { id: "UB-REC-0010-01", billId: "UB-2026-0019", utilityId: "UTL-2026-0010", source: "API Push", serviceNumber: "BT-LD-RCJ-332", officeId: "RCJ-HQ", officeName: "Royal Court of Justice", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "28700", applicableTaxes: "1435", totalBillAmount: "30135", billDueDate: "15/04/2026", receivedAt: "2026-04-02T08:00:00.000Z", status: "Disputed" },
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER 3: TASHI CELL
   Utility Types: Telephone, Internet/Leasedline
   Service Types: TC Postpaid Mobile, TC Leasedline
   ═══════════════════════════════════════════════════════════════════════════ */

const tc1 = makeUtility({
  id: "UREC-2026-0011",
  utilityId: "UTL-2026-0011",
  agencyCode: "22",
  agencyName: "Education",
  utilityType: "Telephone",
  serviceProviderId: "UPROV-TASHICELL",
  serviceProviderName: "Tashi Cell",
  connectionReference: "TC-CORP-EDU-4471",
  monthlyBudgetAllocation: "35000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "25",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Region",
  cutoffDate: "10",
  budgetCode: "BUD-2201-2026",
  expenditureHead: "Mobile Phone Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-TC-1", serviceName: "TC Postpaid Mobile", officeId: "MOE-HQ", officeName: "Ministry of Education HQ" },
    { id: "SOM-TC-2", serviceName: "TC Leasedline", officeId: "MOE-HQ", officeName: "Ministry of Education HQ" },
  ],
  bills: [
    { id: "UB-REC-0011-01", billId: "UB-2026-0020", utilityId: "UTL-2026-0011", source: "API Push", serviceNumber: "TC-EDU-4471", officeId: "MOE-HQ", officeName: "MoE HQ", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "28600", applicableTaxes: "1430", totalBillAmount: "30030", billDueDate: "10/03/2026", receivedAt: "2026-03-01T11:00:00.000Z", status: "Overdue" },
  ],
});

const tc2 = makeUtility({
  id: "UREC-2026-0012",
  utilityId: "UTL-2026-0012",
  agencyCode: "21",
  agencyName: "Ministry of Industry, Commerce and Employment",
  utilityType: "Telephone",
  serviceProviderId: "UPROV-TASHICELL",
  serviceProviderName: "Tashi Cell",
  connectionReference: "TC-CORP-MICE-8822",
  monthlyBudgetAllocation: "42000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "10",
  budgetCode: "BUD-2101-2026",
  expenditureHead: "Mobile Phone Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-TC-3", serviceName: "TC Postpaid Mobile", officeId: "MICE-HQ", officeName: "MICE Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0012-01", billId: "UB-2026-0021", utilityId: "UTL-2026-0012", source: "API Push", serviceNumber: "TC-MICE-8822", officeId: "MICE-HQ", officeName: "MICE HQ", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "38200", applicableTaxes: "1910", totalBillAmount: "40110", billDueDate: "10/04/2026", receivedAt: "2026-04-01T11:00:00.000Z", status: "Pending" },
  ],
});

const tc3 = makeUtility({
  id: "UREC-2026-0013",
  utilityId: "UTL-2026-0013",
  agencyCode: "13",
  agencyName: "Anti-Corruption Commission",
  utilityType: "Telephone",
  serviceProviderId: "UPROV-TASHICELL",
  serviceProviderName: "Tashi Cell",
  connectionReference: "TC-CORP-ACC-5500",
  monthlyBudgetAllocation: "18000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "10",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Mobile Phone Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-TC-4", serviceName: "TC Postpaid Mobile", officeId: "ACC-HQ", officeName: "ACC Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0013-01", billId: "UB-2026-0022", utilityId: "UTL-2026-0013", source: "API Push", serviceNumber: "TC-ACC-5500", officeId: "ACC-HQ", officeName: "ACC HQ", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "15800", applicableTaxes: "790", totalBillAmount: "16590", billDueDate: "10/04/2026", receivedAt: "2026-04-02T10:00:00.000Z", status: "Approved" },
  ],
});

const tc4 = makeUtility({
  id: "UREC-2026-0014",
  utilityId: "UTL-2026-0014",
  agencyCode: "45",
  agencyName: "Phuentsholing Thromde",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "UPROV-TASHICELL",
  serviceProviderName: "Tashi Cell",
  connectionReference: "TC-LL-PTH-7701",
  monthlyBudgetAllocation: "28000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Region",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Internet Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-TC-5", serviceName: "TC Leasedline", officeId: "PTH-ADMIN", officeName: "Phuentsholing Thromde Admin" },
  ],
  bills: [
    { id: "UB-REC-0014-01", billId: "UB-2026-0023", utilityId: "UTL-2026-0014", source: "API Push", serviceNumber: "TC-LL-PTH-7701", officeId: "PTH-ADMIN", officeName: "Phuentsholing Thromde", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "24500", applicableTaxes: "1225", totalBillAmount: "25725", billDueDate: "15/03/2026", receivedAt: "2026-03-01T10:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0014-02", billId: "UB-2026-0024", utilityId: "UTL-2026-0014", source: "API Push", serviceNumber: "TC-LL-PTH-7701", officeId: "PTH-ADMIN", officeName: "Phuentsholing Thromde", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "25800", applicableTaxes: "1290", totalBillAmount: "27090", billDueDate: "15/04/2026", receivedAt: "2026-04-01T10:00:00.000Z", status: "Pending" },
  ],
});

const tc5 = makeUtility({
  id: "UREC-2026-0015",
  utilityId: "UTL-2026-0015",
  agencyCode: "11",
  agencyName: "Royal Civil Service Commission",
  utilityType: "Telephone",
  serviceProviderId: "UPROV-TASHICELL",
  serviceProviderName: "Tashi Cell",
  connectionReference: "TC-CORP-RCSC-9934",
  monthlyBudgetAllocation: "22000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Suspended",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "10",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Mobile Phone Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-TC-6", serviceName: "TC Postpaid Mobile", officeId: "RCSC-HQ", officeName: "RCSC Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0015-01", billId: "UB-2026-0025", utilityId: "UTL-2026-0015", source: "API Push", serviceNumber: "TC-RCSC-9934", officeId: "RCSC-HQ", officeName: "RCSC HQ", billingCycle: "Monthly", billingPeriodFrom: "01/01/2026", billingPeriodTo: "31/01/2026", billAmount: "19500", applicableTaxes: "975", totalBillAmount: "20475", billDueDate: "10/02/2026", receivedAt: "2026-02-01T10:00:00.000Z", status: "Disputed" },
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER 4: BHUTAN STARLINK
   Utility Type: Internet/Leasedline
   Service Type: Consumer Number / Service Number
   ═══════════════════════════════════════════════════════════════════════════ */

const bsl1 = makeUtility({
  id: "UREC-2026-0016",
  utilityId: "UTL-2026-0016",
  agencyCode: "31",
  agencyName: "Local Government",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "UPROV-STARLINK",
  serviceProviderName: "Bhutan Starlink",
  connectionReference: "BSL-LG-PARO-2210",
  monthlyBudgetAllocation: "48000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Region",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Satellite Internet Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BSL-1", serviceName: "Consumer Number / Service Number", officeId: "LG-DZONG-1", officeName: "Paro Dzongkhag Administration" },
  ],
  bills: [
    { id: "UB-REC-0016-01", billId: "UB-2026-0026", utilityId: "UTL-2026-0016", source: "API Fetch", serviceNumber: "BSL-LG-2210", officeId: "LG-DZONG-1", officeName: "Paro Dzongkhag", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "45000", applicableTaxes: "2250", totalBillAmount: "47250", billDueDate: "15/04/2026", receivedAt: "2026-04-05T09:30:00.000Z", status: "Pending" },
  ],
});

const bsl2 = makeUtility({
  id: "UREC-2026-0017",
  utilityId: "UTL-2026-0017",
  agencyCode: "40",
  agencyName: "Bumthang Dzongkhag Administration",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "UPROV-STARLINK",
  serviceProviderName: "Bhutan Starlink",
  connectionReference: "BSL-BUM-ADM-3301",
  monthlyBudgetAllocation: "38000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Region",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Satellite Internet Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BSL-2", serviceName: "Consumer Number / Service Number", officeId: "BUM-ADM", officeName: "Bumthang Dzongkhag Office" },
  ],
  bills: [
    { id: "UB-REC-0017-01", billId: "UB-2026-0027", utilityId: "UTL-2026-0017", source: "API Fetch", serviceNumber: "BSL-BUM-3301", officeId: "BUM-ADM", officeName: "Bumthang Dzongkhag", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "35000", applicableTaxes: "1750", totalBillAmount: "36750", billDueDate: "15/03/2026", receivedAt: "2026-03-01T09:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0017-02", billId: "UB-2026-0028", utilityId: "UTL-2026-0017", source: "API Fetch", serviceNumber: "BSL-BUM-3301", officeId: "BUM-ADM", officeName: "Bumthang Dzongkhag", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "36200", applicableTaxes: "1810", totalBillAmount: "38010", billDueDate: "15/04/2026", receivedAt: "2026-04-01T09:00:00.000Z", status: "Pending" },
  ],
});

const bsl3 = makeUtility({
  id: "UREC-2026-0018",
  utilityId: "UTL-2026-0018",
  agencyCode: "17",
  agencyName: "Ministry of Agriculture and Livestock",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "UPROV-STARLINK",
  serviceProviderName: "Bhutan Starlink",
  connectionReference: "BSL-MOAL-REC-4410",
  monthlyBudgetAllocation: "52000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "18",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "15",
  budgetCode: "BUD-1701-2026",
  expenditureHead: "Satellite Internet Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BSL-3", serviceName: "Consumer Number / Service Number", officeId: "MOAL-REC", officeName: "MoAL Regional Extension Centre" },
    { id: "SOM-BSL-4", serviceName: "Consumer Number / Service Number", officeId: "MOAL-HQ", officeName: "MoAL Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0018-01", billId: "UB-2026-0029", utilityId: "UTL-2026-0018", source: "API Fetch", serviceNumber: "BSL-MOAL-4410", officeId: "MOAL-REC", officeName: "MoAL Regional", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "48500", applicableTaxes: "2425", totalBillAmount: "50925", billDueDate: "15/04/2026", receivedAt: "2026-04-02T09:00:00.000Z", status: "Cleared for Payment" },
  ],
});

const bsl4 = makeUtility({
  id: "UREC-2026-0019",
  utilityId: "UTL-2026-0019",
  agencyCode: "33",
  agencyName: "Punakha Dzongkhag Administration",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "UPROV-STARLINK",
  serviceProviderName: "Bhutan Starlink",
  connectionReference: "BSL-PUN-ADM-5521",
  monthlyBudgetAllocation: "35000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Region",
  cutoffDate: "15",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Satellite Internet Charges",
  fundingSource: "Donor Agency",
  serviceMaps: [
    { id: "SOM-BSL-5", serviceName: "Consumer Number / Service Number", officeId: "PUN-ADM", officeName: "Punakha Dzongkhag Office" },
  ],
  bills: [
    { id: "UB-REC-0019-01", billId: "UB-2026-0030", utilityId: "UTL-2026-0019", source: "API Fetch", serviceNumber: "BSL-PUN-5521", officeId: "PUN-ADM", officeName: "Punakha Dzongkhag", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "32000", applicableTaxes: "1600", totalBillAmount: "33600", billDueDate: "15/04/2026", receivedAt: "2026-04-01T08:00:00.000Z", status: "Pending" },
  ],
});

const bsl5 = makeUtility({
  id: "UREC-2026-0020",
  utilityId: "UTL-2026-0020",
  agencyCode: "99",
  agencyName: "National Environment Commission",
  utilityType: "Internet/Leasedline",
  serviceProviderId: "UPROV-STARLINK",
  serviceProviderName: "Bhutan Starlink",
  connectionReference: "BSL-NEC-FIELD-6632",
  monthlyBudgetAllocation: "42000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "20",
  budgetCode: "BUD-1807-2026",
  expenditureHead: "Satellite Internet Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-BSL-6", serviceName: "Consumer Number / Service Number", officeId: "NEC-FIELD", officeName: "NEC Field Monitoring Station" },
  ],
  bills: [
    { id: "UB-REC-0020-01", billId: "UB-2026-0031", utilityId: "UTL-2026-0020", source: "API Fetch", serviceNumber: "BSL-NEC-6632", officeId: "NEC-FIELD", officeName: "NEC Field Station", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "39800", applicableTaxes: "1990", totalBillAmount: "41790", billDueDate: "20/04/2026", receivedAt: "2026-04-03T09:00:00.000Z", status: "Pending" },
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER 5: MUNICIPALITIES & THROMDES
   Utility Types: Water, Sewerage
   Service Type: Water & Sewerage: Meter Number
   ═══════════════════════════════════════════════════════════════════════════ */

const mun1 = makeUtility({
  id: "UREC-2026-0021",
  utilityId: "UTL-2026-0021",
  agencyCode: "20",
  agencyName: "Health",
  utilityType: "Water",
  serviceProviderId: "UPROV-MUN-THROMDE",
  serviceProviderName: "Municipalities & Thromdes",
  connectionReference: "TT-WTR-JDW-0087",
  monthlyBudgetAllocation: "45000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "20",
  budgetCode: "BUD-2001-2026",
  expenditureHead: "Water & Sewerage Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-MUN-1", serviceName: "Water & Sewerage: Meter Number", officeId: "JDW-HOSP", officeName: "JDWNRH Hospital, Thimphu" },
  ],
  bills: [
    { id: "UB-REC-0021-01", billId: "UB-2026-0032", utilityId: "UTL-2026-0021", source: "Manual", serviceNumber: "TT-WTR-JDW-0087", officeId: "JDW-HOSP", officeName: "JDWNRH, Thimphu", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "38200", applicableTaxes: "0", totalBillAmount: "38200", billDueDate: "20/03/2026", receivedAt: "2026-03-02T09:00:00.000Z", status: "Cleared for Payment" },
    { id: "UB-REC-0021-02", billId: "UB-2026-0033", utilityId: "UTL-2026-0021", source: "Manual", serviceNumber: "TT-WTR-JDW-0087", officeId: "JDW-HOSP", officeName: "JDWNRH, Thimphu", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "41100", applicableTaxes: "0", totalBillAmount: "41100", billDueDate: "20/04/2026", receivedAt: "2026-04-02T09:00:00.000Z", status: "Pending" },
  ],
});

const mun2 = makeUtility({
  id: "UREC-2026-0022",
  utilityId: "UTL-2026-0022",
  agencyCode: "19",
  agencyName: "Works and Human Settlement",
  utilityType: "Sewerage",
  serviceProviderId: "UPROV-MUN-THROMDE-2",
  serviceProviderName: "Municipalities & Thromdes",
  connectionReference: "TT-SWR-MOWHS-55",
  monthlyBudgetAllocation: "18500",
  billingCycle: "Quarterly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "20",
  budgetCode: "BUD-1901-2026",
  expenditureHead: "Water & Sewerage Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-MUN-2", serviceName: "Water & Sewerage: Meter Number", officeId: "MOWHS-HQ", officeName: "MoWHS Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0022-01", billId: "UB-2026-0034", utilityId: "UTL-2026-0022", source: "Manual", serviceNumber: "TT-SWR-MOWHS-55", officeId: "MOWHS-HQ", officeName: "MoWHS HQ", billingCycle: "Quarterly", billingPeriodFrom: "01/01/2026", billingPeriodTo: "31/03/2026", billAmount: "18400", applicableTaxes: "0", totalBillAmount: "18400", billDueDate: "20/04/2026", receivedAt: "2026-04-02T09:45:00.000Z", status: "Cleared for Payment" },
  ],
});

const mun3 = makeUtility({
  id: "UREC-2026-0023",
  utilityId: "UTL-2026-0023",
  agencyCode: "19",
  agencyName: "Ministry of Infrastructure and Transport",
  utilityType: "Water",
  serviceProviderId: "UPROV-MUN-THROMDE-3",
  serviceProviderName: "Municipalities & Thromdes",
  connectionReference: "TT-WTR-MOIT-1100",
  monthlyBudgetAllocation: "32000",
  billingCycle: "Monthly",
  autoPaymentEnabled: true,
  varianceThresholdPercent: "15",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "20",
  budgetCode: "BUD-1901-2026",
  expenditureHead: "Water Supply Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-MUN-3", serviceName: "Water & Sewerage: Meter Number", officeId: "MOIT-HQ", officeName: "MoIT Headquarters" },
    { id: "SOM-MUN-4", serviceName: "Water & Sewerage: Meter Number", officeId: "MOIT-WRK", officeName: "MoIT Workshop Complex" },
  ],
  bills: [
    { id: "UB-REC-0023-01", billId: "UB-2026-0035", utilityId: "UTL-2026-0023", source: "Manual", serviceNumber: "TT-WTR-MOIT-1100", officeId: "MOIT-HQ", officeName: "MoIT HQ", billingCycle: "Monthly", billingPeriodFrom: "01/02/2026", billingPeriodTo: "28/02/2026", billAmount: "28500", applicableTaxes: "0", totalBillAmount: "28500", billDueDate: "20/03/2026", receivedAt: "2026-03-02T10:00:00.000Z", status: "Paid" },
    { id: "UB-REC-0023-02", billId: "UB-2026-0036", utilityId: "UTL-2026-0023", source: "Manual", serviceNumber: "TT-WTR-MOIT-1100", officeId: "MOIT-HQ", officeName: "MoIT HQ", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "30200", applicableTaxes: "0", totalBillAmount: "30200", billDueDate: "20/04/2026", receivedAt: "2026-04-02T10:00:00.000Z", status: "Pending" },
  ],
});

const mun4 = makeUtility({
  id: "UREC-2026-0024",
  utilityId: "UTL-2026-0024",
  agencyCode: "46",
  agencyName: "Gelephu Thromde",
  utilityType: "Water",
  serviceProviderId: "UPROV-MUN-THROMDE-4",
  serviceProviderName: "Municipalities & Thromdes",
  connectionReference: "GT-WTR-ADMIN-2200",
  monthlyBudgetAllocation: "55000",
  billingCycle: "Monthly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "25",
  utilityStatus: "Active",
  paymentMethod: "Consolidated",
  preferredPaymentMode: "Consolidated: Line Departments",
  cutoffDate: "25",
  budgetCode: "BUD-1601-2026",
  expenditureHead: "Water Supply Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-MUN-5", serviceName: "Water & Sewerage: Meter Number", officeId: "GT-ADMIN", officeName: "Gelephu Thromde Admin" },
    { id: "SOM-MUN-6", serviceName: "Water & Sewerage: Meter Number", officeId: "GT-HOSP", officeName: "Gelephu General Hospital" },
  ],
  bills: [
    { id: "UB-REC-0024-01", billId: "UB-2026-0037", utilityId: "UTL-2026-0024", source: "Manual", serviceNumber: "GT-WTR-ADMIN-2200", officeId: "GT-ADMIN", officeName: "Gelephu Thromde Admin", billingCycle: "Monthly", billingPeriodFrom: "01/03/2026", billingPeriodTo: "31/03/2026", billAmount: "48500", applicableTaxes: "0", totalBillAmount: "48500", billDueDate: "25/04/2026", receivedAt: "2026-04-03T08:00:00.000Z", status: "Pending" },
  ],
});

const mun5 = makeUtility({
  id: "UREC-2026-0025",
  utilityId: "UTL-2026-0025",
  agencyCode: "18",
  agencyName: "Ministry of Energy and Natural Resources",
  utilityType: "Sewerage",
  serviceProviderId: "UPROV-MUN-THROMDE-5",
  serviceProviderName: "Municipalities & Thromdes",
  connectionReference: "TT-SWR-MENR-3300",
  monthlyBudgetAllocation: "22000",
  billingCycle: "Quarterly",
  autoPaymentEnabled: false,
  varianceThresholdPercent: "20",
  utilityStatus: "Active",
  paymentMethod: "Individual",
  preferredPaymentMode: "Individual: Based on Service Provider",
  cutoffDate: "20",
  budgetCode: "BUD-1801-2026",
  expenditureHead: "Sewerage Charges",
  fundingSource: "RGOB",
  serviceMaps: [
    { id: "SOM-MUN-7", serviceName: "Water & Sewerage: Meter Number", officeId: "MENR-HQ", officeName: "MoENR Headquarters" },
  ],
  bills: [
    { id: "UB-REC-0025-01", billId: "UB-2026-0038", utilityId: "UTL-2026-0025", source: "Manual", serviceNumber: "TT-SWR-MENR-3300", officeId: "MENR-HQ", officeName: "MoENR HQ", billingCycle: "Quarterly", billingPeriodFrom: "01/01/2026", billingPeriodTo: "31/03/2026", billAmount: "20800", applicableTaxes: "0", totalBillAmount: "20800", billDueDate: "20/04/2026", receivedAt: "2026-04-03T09:00:00.000Z", status: "Approved" },
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   BULK EXPANSION — 15 additional records per provider (SRS PRN 5.1, DD 19.1–19.10)
   ──────────────────────────────────────────────────────────────────────────
   Brings each utility provider to ~20 records, spanning many consuming
   agencies so that MoF sees all, each agency sees its own, and each utility
   provider persona (BT / TashiCell / BPC / Starlink) sees only its own bills
   across every agency that consumes its service.

   Each row references SRS LoV 15.1 (utility type & provider) and LoV 15.2
   (payment mode & cut-off). Mutations via UtilityDataContext.addUtility /
   updateUtility / mergeBills will propagate live to every view because the
   context merges this seed with localStorage on boot and notifies subscribers.
   ═══════════════════════════════════════════════════════════════════════════ */

type ProviderKey = "BPC" | "BT" | "TC" | "BSL";
type BulkRow = {
  seq: number;           // drives UREC / UTL id
  prov: ProviderKey;
  agencyCode: string;    // UCoA Organization code
  agency: string;        // SRS consuming agency (DD 19.2)
  conn: string;          // connection reference (DD 19.4)
  officeId: string;
  officeName: string;
  amount: number;        // pre-tax bill (DD 19.7)
  status: string;        // DD 19.9
  cycle?: "Monthly" | "Quarterly"; // LoV 15.2
  utilityType?: string;  // override — LoV 15.1
  service?: string;      // service-name override
  period?: [string, string]; // billing period
  due?: string;
};

const PROVIDER_META: Record<ProviderKey, {
  id: string;
  name: string;
  utilityType: string;
  service: string;
  expHead: string;
  budgetCode: string;
}> = {
  BPC: { id: "UPROV-BPC", name: "Bhutan Power Corporation Ltd", utilityType: "Electricity", service: "Consumer Number", expHead: "Electricity Charges", budgetCode: "BUD-1601-2026" },
  BT:  { id: "CTR-BIZ-2026-9008", name: "Bhutan Telecom Ltd", utilityType: "Internet/Leasedline", service: "BT Leasedline", expHead: "Internet & Telecom Charges", budgetCode: "BUD-1603-2026" },
  TC:  { id: "UPROV-TC", name: "Tashi Cell", utilityType: "Telephone", service: "TC Postpaid Mobile", expHead: "Telephone Charges", budgetCode: "BUD-1603-2026" },
  BSL: { id: "UPROV-STARLINK", name: "Bhutan Starlink", utilityType: "Internet/Leasedline", service: "Consumer Number / Service Number", expHead: "Satellite Internet Charges", budgetCode: "BUD-1601-2026" },
};

function mkBulk(row: BulkRow): StoredUtility {
  const meta = PROVIDER_META[row.prov];
  const seqPad = String(row.seq).padStart(4, "0");
  const billSeq = String(row.seq + 100).padStart(4, "0");
  const tax = Math.round(row.amount * 0.05);
  const total = row.amount + tax;
  const cycle = row.cycle ?? "Monthly";
  const [pFrom, pTo] = row.period ?? ["01/03/2026", "31/03/2026"];
  const due = row.due ?? "15/04/2026";
  const utilityType = row.utilityType ?? meta.utilityType;
  const serviceName = row.service ?? meta.service;

  return makeUtility({
    id: `UREC-2026-${seqPad}`,
    utilityId: `UTL-2026-${seqPad}`,
    agencyCode: row.agencyCode,
    agencyName: row.agency,
    utilityType,
    serviceProviderId: meta.id,
    serviceProviderName: meta.name,
    connectionReference: row.conn,
    monthlyBudgetAllocation: String(Math.round(row.amount * 1.2)),
    billingCycle: cycle,
    autoPaymentEnabled: row.seq % 2 === 0,
    varianceThresholdPercent: "15",
    utilityStatus: "Active",
    paymentMethod: "Individual",
    preferredPaymentMode: "Individual: Based on Service Provider",
    cutoffDate: "15",
    budgetCode: meta.budgetCode,
    expenditureHead: meta.expHead,
    fundingSource: "RGOB",
    serviceMaps: [
      { id: `SOM-${row.prov}-B${row.seq}`, serviceName, officeId: row.officeId, officeName: row.officeName },
    ],
    bills: [
      {
        id: `UB-REC-${seqPad}-01`,
        billId: `UB-2026-${billSeq}`,
        utilityId: `UTL-2026-${seqPad}`,
        source: "API Fetch",
        serviceNumber: row.conn,
        officeId: row.officeId,
        officeName: row.officeName,
        billingCycle: cycle,
        billingPeriodFrom: pFrom,
        billingPeriodTo: pTo,
        billAmount: String(row.amount),
        applicableTaxes: String(tax),
        totalBillAmount: String(total),
        billDueDate: due,
        receivedAt: "2026-04-02T09:00:00.000Z",
        status: row.status,
      },
    ],
  });
}

/* ── BPC bulk (15 more → ~20 total) — Electricity across many agencies ─── */
const bpcBulk: StoredUtility[] = [
  { seq: 26, prov: "BPC", agencyCode: "20", agency: "Ministry of Health",                               conn: "BPC-MoH-HQ-44110", officeId: "MoH-HQ",   officeName: "MoH Headquarters, Thimphu",          amount: 68500, status: "Pending" },
  { seq: 27, prov: "BPC", agencyCode: "16", agency: "Ministry of Home Affairs",                          conn: "BPC-MoHA-55221", officeId: "MoHA-HQ",  officeName: "MoHA Headquarters",                    amount: 54200, status: "Approved" },
  { seq: 28, prov: "BPC", agencyCode: "23", agency: "Ministry of Foreign Affairs & External Trade",      conn: "BPC-MoFAET-66112", officeId: "MoFA-HQ", officeName: "MoFAET HQ, Thimphu",                    amount: 73900, status: "Paid" },
  { seq: 29, prov: "BPC", agencyCode: "17", agency: "Ministry of Agriculture and Livestock",             conn: "BPC-MoAL-77331", officeId: "MoAL-HQ",  officeName: "MoAL HQ",                               amount: 48200, status: "Cleared for Payment" },
  { seq: 30, prov: "BPC", agencyCode: "21", agency: "Ministry of Industry, Commerce & Employment",       conn: "BPC-MoICE-22114", officeId: "MoICE-HQ", officeName: "MoICE HQ",                             amount: 61400, status: "Pending" },
  { seq: 31, prov: "BPC", agencyCode: "70", agency: "GovTech Agency",                                    conn: "BPC-DC-DRUKTEL-10099", officeId: "DC-THIM", officeName: "GovTech Thimphu Data Centre",     amount: 285000, status: "Approved" },
  { seq: 32, prov: "BPC", agencyCode: "11", agency: "Royal Civil Service Commission",                    conn: "BPC-RCSC-80021", officeId: "RCSC-HQ",  officeName: "RCSC HQ",                               amount: 29800, status: "Paid" },
  { seq: 33, prov: "BPC", agencyCode: "52", agency: "National Assembly of Bhutan",                       conn: "BPC-NA-90014", officeId: "NA-HQ",     officeName: "National Assembly Secretariat",          amount: 38500, status: "Pending" },
  { seq: 34, prov: "BPC", agencyCode: "59", agency: "Judiciary of Bhutan",                               conn: "BPC-JUD-30055", officeId: "JUD-HQ",   officeName: "Supreme Court Complex",                  amount: 45600, status: "Overdue" },
  { seq: 35, prov: "BPC", agencyCode: "14", agency: "Election Commission of Bhutan",                     conn: "BPC-ECB-40077", officeId: "ECB-HQ",   officeName: "ECB HQ",                                amount: 22100, status: "Paid" },
  { seq: 36, prov: "BPC", agencyCode: "13", agency: "Anti-Corruption Commission",                        conn: "BPC-ACC-50088", officeId: "ACC-HQ",   officeName: "ACC HQ",                                amount: 19800, status: "Approved" },
  { seq: 37, prov: "BPC", agencyCode: "39", agency: "Thimphu Thromde",                                   conn: "BPC-TT-STREET-70011", officeId: "TT-STREET", officeName: "Thimphu Street Lighting",         amount: 168400, status: "Cleared for Payment" },
  { seq: 38, prov: "BPC", agencyCode: "45", agency: "Phuentsholing Thromde",                             conn: "BPC-PT-ADM-60033", officeId: "PT-ADM", officeName: "Phuentsholing Thromde Admin",           amount: 88200, status: "Pending" },
  { seq: 39, prov: "BPC", agencyCode: "31", agency: "Paro Dzongkhag Administration",                     conn: "BPC-PARO-DZ-11009", officeId: "PARO-DZ", officeName: "Paro Dzongkhag",                      amount: 42500, status: "Approved" },
  { seq: 40, prov: "BPC", agencyCode: "68", agency: "Royal University of Bhutan",                        conn: "BPC-RUB-CAMPUS-24411", officeId: "RUB-CST", officeName: "RUB College of Science & Tech.",   amount: 125400, status: "Disputed" },
].map(mkBulk);

/* ── BT bulk (15 more → ~20 total) — Telephone / Internet / Leasedline ── */
const btBulk: StoredUtility[] = [
  { seq: 41, prov: "BT", agencyCode: "20", agency: "Ministry of Health",                            conn: "BT-LL-MoH-8802", officeId: "MoH-HQ",  officeName: "MoH Headquarters, Thimphu", amount: 82500, status: "Paid",      service: "BT Leasedline" },
  { seq: 42, prov: "BT", agencyCode: "20", agency: "Ministry of Health",                            conn: "BT-BB-MoH-JDW-8803", officeId: "MoH-JDWNRH", officeName: "JDW National Referral Hospital", amount: 68000, status: "Approved", service: "BT Broadband Postpaid" },
  { seq: 43, prov: "BT", agencyCode: "70", agency: "GovTech Agency",                                 conn: "BT-LL-GOVTECH-DC-9901", officeId: "GOVTECH-DC", officeName: "GovTech DC — Thimphu", amount: 245000, status: "Paid",      service: "BT Leasedline" },
  { seq: 44, prov: "BT", agencyCode: "70", agency: "GovTech Agency",                                 conn: "BT-MOB-GOVTECH-9902", officeId: "GOVTECH-HQ", officeName: "GovTech Headquarters", amount: 38500, status: "Cleared for Payment", utilityType: "Telephone", service: "BT Postpaid Mobile" },
  { seq: 45, prov: "BT", agencyCode: "16", agency: "Ministry of Finance",                            conn: "BT-LL-MoF-RRCO-5502", officeId: "RRCO-TH", officeName: "RRCO Thimphu",         amount: 72000, status: "Pending",  service: "BT Leasedline" },
  { seq: 46, prov: "BT", agencyCode: "16", agency: "Ministry of Home Affairs",                       conn: "BT-LND-MoHA-4412", officeId: "MoHA-HQ", officeName: "MoHA HQ",               amount: 14800, status: "Paid",     utilityType: "Telephone", service: "BT Landline" },
  { seq: 47, prov: "BT", agencyCode: "12", agency: "Royal Audit Authority",                          conn: "BT-LL-RAA-7707", officeId: "RAA-HQ",  officeName: "RAA HQ",                   amount: 52400, status: "Approved", service: "BT Leasedline" },
  { seq: 48, prov: "BT", agencyCode: "11", agency: "Royal Civil Service Commission",                 conn: "BT-BB-RCSC-3355", officeId: "RCSC-HQ", officeName: "RCSC HQ",                amount: 28000, status: "Paid",     service: "BT Broadband Postpaid" },
  { seq: 49, prov: "BT", agencyCode: "52", agency: "National Assembly of Bhutan",                    conn: "BT-LND-NA-9988", officeId: "NA-HQ",  officeName: "National Assembly",          amount: 19600, status: "Pending",  utilityType: "Telephone", service: "BT Landline" },
  { seq: 50, prov: "BT", agencyCode: "59", agency: "Judiciary of Bhutan",                            conn: "BT-LL-JUD-2244", officeId: "JUD-HQ", officeName: "Supreme Court Complex",     amount: 48800, status: "Cleared for Payment", service: "BT Leasedline" },
  { seq: 51, prov: "BT", agencyCode: "21", agency: "Bhutan InfoComm & Media Authority",              conn: "BT-LL-BICMA-5511", officeId: "BICMA-HQ", officeName: "BICMA HQ",             amount: 33500, status: "Paid",     service: "BT Leasedline" },
  { seq: 52, prov: "BT", agencyCode: "39", agency: "Thimphu Thromde",                                 conn: "BT-BB-TT-ADM-6622", officeId: "TT-ADM", officeName: "Thimphu Thromde Admin", amount: 22500, status: "Approved", service: "BT Broadband Postpaid" },
  { seq: 53, prov: "BT", agencyCode: "17", agency: "Ministry of Agriculture and Livestock",          conn: "BT-LL-MoAL-1119", officeId: "MoAL-HQ", officeName: "MoAL HQ",                amount: 58000, status: "Pending",  service: "BT Leasedline" },
  { seq: 54, prov: "BT", agencyCode: "68", agency: "Royal University of Bhutan",                     conn: "BT-LL-RUB-2288", officeId: "RUB-HQ", officeName: "RUB Vice-Chancellor Office", amount: 98500, status: "Overdue",  service: "BT Leasedline" },
  { seq: 55, prov: "BT", agencyCode: "21", agency: "Ministry of Industry, Commerce & Employment",    conn: "BT-MOB-MoICE-7721", officeId: "MoICE-HQ", officeName: "MoICE HQ",            amount: 24200, status: "Paid",     utilityType: "Telephone", service: "BT Postpaid Mobile" },
].map(mkBulk);

/* ── Tashi Cell bulk (15 more → ~20 total) — Telephone / Internet ─────── */
const tcBulk: StoredUtility[] = [
  { seq: 56, prov: "TC", agencyCode: "16", agency: "Ministry of Finance",                          conn: "TC-MOB-MoF-7702", officeId: "MoF-HQ",   officeName: "MoF HQ, Thimphu",           amount: 32500, status: "Paid",      service: "TC Postpaid Mobile" },
  { seq: 57, prov: "TC", agencyCode: "16", agency: "Ministry of Finance",                          conn: "TC-LL-MoF-RRCO-7803", officeId: "RRCO-PHT", officeName: "RRCO Phuentsholing",    amount: 52000, status: "Approved", utilityType: "Internet/Leasedline", service: "TC Leasedline" },
  { seq: 58, prov: "TC", agencyCode: "20", agency: "Ministry of Health",                           conn: "TC-MOB-MoH-8820", officeId: "MoH-HQ",   officeName: "MoH HQ, Thimphu",            amount: 45200, status: "Cleared for Payment", service: "TC Postpaid Mobile" },
  { seq: 59, prov: "TC", agencyCode: "70", agency: "GovTech Agency",                               conn: "TC-MOB-GOVTECH-9910", officeId: "GOVTECH-HQ", officeName: "GovTech HQ",          amount: 28500, status: "Paid",     service: "TC Postpaid Mobile" },
  { seq: 60, prov: "TC", agencyCode: "70", agency: "GovTech Agency",                               conn: "TC-LL-GOVTECH-PHT-9911", officeId: "GOVTECH-PHT", officeName: "GovTech Phuentsholing Regional", amount: 118000, status: "Pending", utilityType: "Internet/Leasedline", service: "TC Leasedline" },
  { seq: 61, prov: "TC", agencyCode: "16", agency: "Ministry of Home Affairs",                     conn: "TC-MOB-MoHA-5544", officeId: "MoHA-HQ",  officeName: "MoHA HQ",                    amount: 22400, status: "Approved", service: "TC Postpaid Mobile" },
  { seq: 62, prov: "TC", agencyCode: "23", agency: "Ministry of Foreign Affairs & External Trade", conn: "TC-MOB-MoFAET-6677", officeId: "MoFA-HQ", officeName: "MoFAET HQ",                 amount: 18500, status: "Paid",     service: "TC Postpaid Mobile" },
  { seq: 63, prov: "TC", agencyCode: "12", agency: "Royal Audit Authority",                        conn: "TC-MOB-RAA-4411", officeId: "RAA-HQ",   officeName: "RAA HQ",                      amount: 14200, status: "Pending",  service: "TC Postpaid Mobile" },
  { seq: 64, prov: "TC", agencyCode: "11", agency: "Royal Civil Service Commission",               conn: "TC-MOB-RCSC-8833", officeId: "RCSC-HQ", officeName: "RCSC HQ",                    amount: 16800, status: "Paid",     service: "TC Postpaid Mobile" },
  { seq: 65, prov: "TC", agencyCode: "52", agency: "National Assembly of Bhutan",                  conn: "TC-MOB-NA-2290", officeId: "NA-HQ",    officeName: "National Assembly",            amount: 11500, status: "Approved", service: "TC Postpaid Mobile" },
  { seq: 66, prov: "TC", agencyCode: "59", agency: "Judiciary of Bhutan",                          conn: "TC-MOB-JUD-5520", officeId: "JUD-HQ",  officeName: "Supreme Court",                amount: 12400, status: "Paid",     service: "TC Postpaid Mobile" },
  { seq: 67, prov: "TC", agencyCode: "13", agency: "Anti-Corruption Commission",                   conn: "TC-MOB-ACC-8801", officeId: "ACC-HQ",   officeName: "ACC HQ",                     amount: 9800, status: "Paid",      service: "TC Postpaid Mobile" },
  { seq: 68, prov: "TC", agencyCode: "14", agency: "Election Commission of Bhutan",                conn: "TC-MOB-ECB-7702", officeId: "ECB-HQ",   officeName: "ECB HQ",                     amount: 10200, status: "Pending",  service: "TC Postpaid Mobile" },
  { seq: 69, prov: "TC", agencyCode: "21", agency: "Ministry of Industry, Commerce & Employment",  conn: "TC-LL-MoICE-DCI-5512", officeId: "MoICE-DCI", officeName: "Dept. of Cottage & SI", amount: 68500, status: "Cleared for Payment", utilityType: "Internet/Leasedline", service: "TC Leasedline" },
  { seq: 70, prov: "TC", agencyCode: "39", agency: "Thimphu Thromde",                              conn: "TC-MOB-TT-3320", officeId: "TT-ADM",    officeName: "Thimphu Thromde Admin",      amount: 15600, status: "Overdue",  service: "TC Postpaid Mobile" },
].map(mkBulk);

/* ── Starlink bulk (15 more → ~20 total) — Satellite Internet ─────────── */
const bslBulk: StoredUtility[] = [
  { seq: 71, prov: "BSL", agencyCode: "20", agency: "Ministry of Health",                        conn: "BSL-MoH-BHU-1101", officeId: "MoH-BHU-MERAK", officeName: "BHU Merak (Remote)",       amount: 42500, status: "Paid" },
  { seq: 72, prov: "BSL", agencyCode: "20", agency: "Ministry of Health",                        conn: "BSL-MoH-BHU-1102", officeId: "MoH-BHU-SAKTENG", officeName: "BHU Sakteng (Remote)", amount: 44200, status: "Approved" },
  { seq: 73, prov: "BSL", agencyCode: "22", agency: "Ministry of Education & Skills Development", conn: "BSL-MoESD-SCH-2201", officeId: "MoESD-LAYA", officeName: "Laya Central School",      amount: 38800, status: "Cleared for Payment" },
  { seq: 74, prov: "BSL", agencyCode: "22", agency: "Ministry of Education & Skills Development", conn: "BSL-MoESD-SCH-2202", officeId: "MoESD-LUNANA", officeName: "Lunana Primary School", amount: 39500, status: "Pending" },
  { seq: 75, prov: "BSL", agencyCode: "17", agency: "Ministry of Agriculture and Livestock",     conn: "BSL-MoAL-RNR-3301", officeId: "MoAL-RNR-LHUEN", officeName: "RNR Centre — Lhuentse", amount: 32500, status: "Paid" },
  { seq: 76, prov: "BSL", agencyCode: "70", agency: "GovTech Agency",                             conn: "BSL-GOVTECH-POP-4401", officeId: "GOVTECH-POP-TRASH", officeName: "GovTech PoP — Trashiyangtse", amount: 58000, status: "Approved" },
  { seq: 77, prov: "BSL", agencyCode: "99", agency: "Royal Bhutan Army",                          conn: "BSL-RBA-REMOTE-5501", officeId: "RBA-FWD-LINGZHI", officeName: "RBA Forward Base — Lingzhi", amount: 48500, status: "Paid" },
  { seq: 78, prov: "BSL", agencyCode: "69", agency: "Royal Bhutan Police",                        conn: "BSL-RBP-OUTPOST-6601", officeId: "RBP-GASA-NE", officeName: "RBP Outpost — Gasa NE",    amount: 34000, status: "Pending" },
  { seq: 79, prov: "BSL", agencyCode: "31", agency: "Paro Dzongkhag Administration",              conn: "BSL-PARO-GEWOG-7701", officeId: "PARO-DOPSHARI", officeName: "Dopshari Gewog Office",   amount: 28500, status: "Paid" },
  { seq: 80, prov: "BSL", agencyCode: "37", agency: "Trashigang Dzongkhag Administration",        conn: "BSL-TRASH-GEWOG-8801", officeId: "TRASH-RADHI", officeName: "Radhi Gewog Office",       amount: 29800, status: "Approved" },
  { seq: 81, prov: "BSL", agencyCode: "29", agency: "Lhuentse Dzongkhag Administration",          conn: "BSL-LHUEN-GEWOG-9901", officeId: "LHUEN-KHOMA", officeName: "Khoma Gewog Office",       amount: 31200, status: "Cleared for Payment" },
  { seq: 82, prov: "BSL", agencyCode: "27", agency: "Gasa Dzongkhag Administration",              conn: "BSL-GASA-GEWOG-1102", officeId: "GASA-LAYA", officeName: "Laya Gewog Office",           amount: 35500, status: "Paid" },
  { seq: 83, prov: "BSL", agencyCode: "68", agency: "Royal University of Bhutan",                 conn: "BSL-RUB-RPC-3320", officeId: "RUB-SHERUBTSE", officeName: "Sherubtse College (East)", amount: 62500, status: "Pending" },
  { seq: 84, prov: "BSL", agencyCode: "99", agency: "Department of Disaster Management",          conn: "BSL-DDM-EOC-4410", officeId: "DDM-EOC", officeName: "National Emergency Ops Centre",    amount: 52000, status: "Approved" },
  { seq: 85, prov: "BSL", agencyCode: "18", agency: "Ministry of Energy and Natural Resources",   conn: "BSL-MENR-HS-5510", officeId: "MENR-HYDROMET", officeName: "Hydromet Station — Bumdeling", amount: 41800, status: "Overdue" },
].map(mkBulk);

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT — 85 records total (original 25 + 60 bulk)
   BPC ≈20 · BT ≈20 · Tashi Cell ≈20 · Starlink ≈20 · Municipalities 5
   ═══════════════════════════════════════════════════════════════════════════ */
export const SEED_UTILITIES: StoredUtility[] = [
  /* BPC — Electricity */
  bpc1, bpc2, bpc3, bpc4, bpc5, ...bpcBulk,
  /* Bhutan Telecom — Telephone / Internet */
  bt1, bt2, bt3, bt4, bt5, ...btBulk,
  /* Tashi Cell — Telephone / Internet */
  tc1, tc2, tc3, tc4, tc5, ...tcBulk,
  /* Bhutan Starlink — Internet/Leasedline */
  bsl1, bsl2, bsl3, bsl4, bsl5, ...bslBulk,
  /* Municipalities & Thromdes — Water / Sewerage */
  mun1, mun2, mun3, mun4, mun5,
];
