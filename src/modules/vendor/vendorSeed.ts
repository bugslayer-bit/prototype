/* ═══════════════════════════════════════════════════════════════════════════
   Vendor Management — Seed Data
   ─────────────────────────────
   Derived directly from the SRS Expenditure Process Descriptions, rows
   covering Vendor Management (Process Description 6.0):

     1.0 Contractual Vendor Entry     (System — from Approved contracts)
     2.0 Non-Contractual Vendor Entry (Agency Staff / System)
           Categories: Utility | Contract | Subscription | Contribution | Others
           Integration sources: API-Banks | BITS | RAMIS | IBLS | Manual
     3.0 Online Submission & Approval (Maker/Checker workflow)
     4.0 Vendor Amendment             (Audit trail required)
     5.0 Vehicle Management           (Fleet / GIMS — DD 27.1.1 – 27.1.8,
                                       LoV 13.1 Master Vehicle Data)

   Merge-by-id policy
   ------------------
   ContractorDataContext merges this seed with whatever the user has in
   localStorage. A user record ALWAYS wins over a seed record with the
   same `id`, so editing a seeded vendor, pushing it through the
   approval workflow, requesting an amendment, or wiring up vehicle
   details will persist across reloads without losing the other seeds.

   Every vendor below is wired to a live contractor / utility provider
   id where possible so the Vendor → Contractor → Utility cross-process
   dynamic link is exercised end-to-end on first load:

     • Bhutan Power Corporation   → UPROV-BPC         (Utility)
     • Bhutan Telecom Ltd.        → CTR-BIZ-2026-9008 (Utility, also a
                                                        registered contractor)
     • TashiCell                  → UPROV-TASHICELL   (Utility)
     • Bhutan Postal Corporation  → UPROV-BHUTANPOST  (Others)
     • UN SDG Knowledge Hub       → (no contractor)   (Subscription)
     • WWF Bhutan                 → (no contractor)   (Contribution)
     • Bhutan Oil Distributors    → (no contractor)   (Others + Vehicle)

   The vehicle detail record on "Bhutan Oil Distributors" is populated
   from LoV 13.1 (Master Vehicle Data) to demonstrate the Fleet / GIMS
   sync mandated by SRS Process 5.0.
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  VendorRecord,
  VendorAuditEntry,
  VendorVehicleDetail,
} from "../../shared/types";

const SEED_ISO = "2026-03-18T08:30:00.000Z";

function audit(
  action: string,
  toStatus: VendorRecord["status"],
  fromStatus?: VendorRecord["status"],
  by = "DSD (Finance Officer)",
  remarks?: string,
): VendorAuditEntry {
  return { at: SEED_ISO, by, action, fromStatus, toStatus, remarks };
}

/* DD 27.1.1 – 27.1.8 — Master Vehicle Data (LoV 13.1) pulled from Fleet
   Management / GIMS (DPP MoF). These values mirror a fuel-card payable
   account used by the Ministry of Works & Human Settlement fleet. */
const mowhsFleetVehicle: VendorVehicleDetail = {
  vehicleNumber: "BP-1-A-1287",
  agencyCode: "MOWHS",
  budgetCode: "23.01.01.02 — Fuel & Lubricants",
  expenditureType: "Recurrent",
  vehicleExpensesType: "Fuel",
  vehicleType: "Light Motor Vehicle (LMV)",
  fuelProvidersName: "Bhutan Oil Distributors Pvt. Ltd.",
  payableAmount: "42000",
};

export const SEED_VENDORS: VendorRecord[] = [
  /* ── 1. Bhutan Power Corporation — Utility (approved) ────────────── */
  {
    id: "VND-00001",
    contractorId: "UPROV-BPC",
    vendorName: "Bhutan Power Corporation Ltd.",
    cid: "",
    bankName: "Bank of Bhutan",
    bankAccountNumber: "201234560011",
    bankAccountName: "Bhutan Power Corporation Ltd.",
    address: "Corporate HQ, Thimphu, Bhutan",
    phone: "+975-2-325751",
    email: "billing@bpc.bt",
    tpn: "TPN-BPC-0001",
    vendorCategory: "Utility",
    serviceCategory: "Electricity",
    contractCategories: ["Electricity"],
    contactStatus: "Active",
    contactCategory: "Billing Contact",
    paymentFrequency: "Monthly",
    fundingSource: "RGOB",
    integrationSource: "System",
    status: "Approved",
    createdAt: SEED_ISO,
    submittedAt: SEED_ISO,
    approvedAt: SEED_ISO,
    approvedBy: "Finance Controller",
    auditTrail: [
      audit("Created from Utility account UPROV-BPC", "Draft"),
      audit("Submitted for approval", "Pending approval", "Draft"),
      audit("Approved", "Approved", "Pending approval", "Finance Controller"),
    ],
  },

  /* ── 2. Bhutan Telecom Ltd. — Utility (approved, linked to Contractor) ── */
  {
    id: "VND-00002",
    contractorId: "CTR-BIZ-2026-9008",
    vendorName: "Bhutan Telecom Ltd.",
    cid: "",
    bankName: "Bhutan National Bank",
    bankAccountNumber: "100099887761",
    bankAccountName: "Bhutan Telecom Ltd.",
    address: "BT Centre, Thimphu, Bhutan",
    phone: "+975-2-321100",
    email: "corporate@bt.bt",
    tpn: "TPN-BTL-0002",
    vendorCategory: "Utility",
    serviceCategory: "Internet & Data Services",
    contractCategories: ["Internet", "Data Services"],
    contactStatus: "Active",
    contactCategory: "Account Manager",
    paymentFrequency: "Monthly",
    fundingSource: "RGOB",
    integrationSource: "System",
    status: "Approved",
    createdAt: SEED_ISO,
    submittedAt: SEED_ISO,
    approvedAt: SEED_ISO,
    approvedBy: "Finance Controller",
    auditTrail: [
      audit("Created from Utility account UPROV-BTL-2026", "Draft"),
      audit("Submitted for approval", "Pending approval", "Draft"),
      audit("Approved", "Approved", "Pending approval", "Finance Controller"),
    ],
  },

  /* ── 3. TashiCell — Utility (pending approval) ───────────────────── */
  {
    id: "VND-00003",
    contractorId: "UPROV-TASHICELL",
    vendorName: "TashiCell (Tashi InfoComm Ltd.)",
    bankName: "Druk PNB Bank",
    bankAccountNumber: "500112233445",
    bankAccountName: "Tashi InfoComm Ltd.",
    address: "Norzin Lam, Thimphu",
    phone: "+975-2-350000",
    email: "accounts@tashicell.com",
    tpn: "TPN-TCL-0003",
    vendorCategory: "Utility",
    serviceCategory: "Phone & Mobile",
    contractCategories: ["Mobile"],
    contactStatus: "Active",
    contactCategory: "Billing Contact",
    paymentFrequency: "Monthly",
    fundingSource: "RGOB",
    integrationSource: "API-Banks",
    status: "Pending approval",
    createdAt: SEED_ISO,
    submittedAt: SEED_ISO,
    currentApprover: "Department Head",
    auditTrail: [
      audit("Created from Utility account UPROV-TASHICELL", "Draft"),
      audit("Submitted for approval", "Pending approval", "Draft"),
    ],
  },

  /* ── 4. Bhutan Postal Corporation — Others (approved) ────────────── */
  {
    id: "VND-00004",
    contractorId: "UPROV-BHUTANPOST",
    vendorName: "Bhutan Postal Corporation Ltd.",
    bankName: "Bank of Bhutan",
    bankAccountNumber: "201999000112",
    bankAccountName: "Bhutan Postal Corporation Ltd.",
    address: "GPO, Thimphu",
    phone: "+975-2-322296",
    email: "billing@bhutanpost.bt",
    tpn: "TPN-BPL-0004",
    vendorCategory: "Others",
    serviceCategory: "Postal & Courier",
    contractCategories: ["Postal"],
    contactStatus: "Active",
    contactCategory: "Billing Contact",
    paymentFrequency: "Monthly",
    fundingSource: "RGOB",
    integrationSource: "BITS",
    status: "Approved",
    createdAt: SEED_ISO,
    submittedAt: SEED_ISO,
    approvedAt: SEED_ISO,
    approvedBy: "Finance Controller",
    auditTrail: [
      audit("Manual registration — non-contractual", "Draft"),
      audit("Submitted for approval", "Pending approval", "Draft"),
      audit("Approved", "Approved", "Pending approval", "Finance Controller"),
    ],
  },

  /* ── 5. UN SDG Knowledge Hub — Subscription (approved) ───────────── */
  {
    id: "VND-00005",
    contractorId: "",
    vendorName: "UN SDG Knowledge Hub",
    bankName: "—",
    bankAccountNumber: "IBAN-UN-0000-SDG",
    bankAccountName: "United Nations — SDG Hub",
    address: "UN Plaza, New York, USA",
    phone: "—",
    email: "subs@sdg.un.org",
    tpn: "TPN-UNSDG-0005",
    vendorCategory: "Subscription",
    serviceCategory: "Knowledge / Research Subscription",
    contractCategories: ["Subscription"],
    contactStatus: "Active",
    contactCategory: "Subscription Manager",
    paymentFrequency: "Annual",
    fundingSource: "Donor Agency",
    integrationSource: "IBLS",
    status: "Approved",
    createdAt: SEED_ISO,
    submittedAt: SEED_ISO,
    approvedAt: SEED_ISO,
    approvedBy: "Finance Controller",
    auditTrail: [
      audit("Manual registration — subscription", "Draft"),
      audit("Submitted for approval", "Pending approval", "Draft"),
      audit("Approved", "Approved", "Pending approval", "Finance Controller"),
    ],
  },

  /* ── 6. WWF Bhutan — Contribution (pending approval) ─────────────── */
  {
    id: "VND-00006",
    contractorId: "",
    vendorName: "WWF Bhutan",
    bankName: "Bhutan National Bank",
    bankAccountNumber: "100077665544",
    bankAccountName: "WWF Bhutan",
    address: "Kawajangsa, Thimphu",
    phone: "+975-2-323528",
    email: "contrib@wwfbhutan.org.bt",
    tpn: "TPN-WWF-0006",
    vendorCategory: "Contribution",
    serviceCategory: "NGO Contribution",
    contractCategories: ["Contribution"],
    contactStatus: "Active",
    contactCategory: "Programme Officer",
    paymentFrequency: "Quarterly",
    fundingSource: "RGOB",
    integrationSource: "Manual",
    status: "Pending approval",
    createdAt: SEED_ISO,
    submittedAt: SEED_ISO,
    currentApprover: "Finance Officer",
    auditTrail: [
      audit("Manual registration — contribution", "Draft"),
      audit("Submitted for approval", "Pending approval", "Draft"),
    ],
  },

  /* ── 7. Bhutan Oil Distributors — Others + Vehicle (approved) ────── */
  {
    id: "VND-00007",
    contractorId: "",
    vendorName: "Bhutan Oil Distributors Pvt. Ltd.",
    bankName: "Bank of Bhutan",
    bankAccountNumber: "201345600099",
    bankAccountName: "Bhutan Oil Distributors Pvt. Ltd.",
    address: "Phuentsholing, Chukha",
    phone: "+975-5-252112",
    email: "fleet@bodpl.bt",
    tpn: "TPN-BOD-0007",
    vendorCategory: "Others",
    serviceCategory: "Fuel & Lubricants",
    contractCategories: ["Fuel"],
    contactStatus: "Active",
    contactCategory: "Fleet Account Manager",
    paymentFrequency: "Monthly",
    fundingSource: "RGOB",
    integrationSource: "RAMIS",
    status: "Approved",
    createdAt: SEED_ISO,
    submittedAt: SEED_ISO,
    approvedAt: SEED_ISO,
    approvedBy: "Finance Controller",
    vehicleDetail: mowhsFleetVehicle, // DD 27.1.1 – 27.1.8 / LoV 13.1
    auditTrail: [
      audit("Manual registration — fuel provider", "Draft"),
      audit("Vehicle details synced from Fleet Management / GIMS", "Draft"),
      audit("Submitted for approval", "Pending approval", "Draft"),
      audit("Approved", "Approved", "Pending approval", "Finance Controller"),
    ],
  },
];
