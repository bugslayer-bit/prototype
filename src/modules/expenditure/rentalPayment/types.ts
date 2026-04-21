/* ═══════════════════════════════════════════════════════════════════════════
   Rental Payment Management — SRS PRN 5.1
   ───────────────────────────────────────
   Source: Process Descriptions R78 – R80, DD 19.11 – 19.13, LoV 10.1.
   Covers every field described by the SRS for this process — no extras,
   no exclusions.

   Process 1.0  Asset Master Management (R78) — CRUD on assets rented by govt.
   Process 2.0  Generate Payment Transaction & Payment Order (R79)
   Process 3.0  PTS (Property Tax System) API Integration (R80)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Fixed SRS enums (structural — not LoV dropdowns) ────────────────────── */
export type AssetCategory = "Tangible Assets" | "Intangible Assets";

/* DD 19.11 / 19.12 / 19.13 — Asset Type mapped to Category, per LoV 10.1 */
export type AssetType =
  | "Immovable Properties"
  | "Movable Properties"
  | "Intellectual Property";

/* Sub-classification keys (drives which reference field is shown) */
export type AssetSubClass =
  /* Immovable (DD 19.11) */
  | "Land"
  | "House"
  | "House/Buildings/Structures"
  /* Movable (DD 19.12) */
  | "Vehicles"
  | "Aero Services"
  | "Machineries"
  /* Intellectual Property (DD 19.13) */
  | "Copy Rights"
  | "Patents"
  | "Trademarks"
  | "Industrial Designs"
  | "Trade Secrets"
  | "Geographical Indications";

/* ── Asset Master (Process 1.0 + DD 19.11 → 19.13) ───────────────────────── */
export interface RentalAsset {
  /* System-generated */
  assetId: string;

  /* DD 19.11 — Category (Tangible/Intangible) — MANDATORY */
  assetCategory: AssetCategory | "";
  /* DD 19.11 — Type (mapped to category) — MANDATORY */
  assetType: AssetType | "";
  /* Sub-classification — drives which reference number is captured */
  assetSubClass: AssetSubClass | "";

  /* Reference numbers per DD 19.11 / 19.12 / 19.13.
     Only the field applicable to the chosen sub-class is used — all others
     remain blank. Every SRS-mandated field is represented. */
  thramNo: string;                      /* Land */
  houseNo: string;                      /* House */
  unitBuildingFlatNo: string;           /* House/Buildings/Structures */
  vehicleRegistrationNo: string;        /* Vehicles (format BG-1-A1080) */
  aeroServicesNo: string;               /* Aero Services */
  machineriesNo: string;                /* Machineries */
  machineriesStatus: string;            /* DD 19.12 — "Status of machineries" */
  certifiedOrRegisteredNumber: string;  /* DD 19.13 — IP certified/registered no */

  /* Asset description (display aid, not in DD but needed for lists) */
  assetTitle: string;

  /* Lessor link (Contractor or Vendor from shared master) */
  lessorId: string;
  lessorName: string;

  /* Agency owning the rental (where the rent is debited to) */
  agencyId: string;
  agencyName: string;

  /* UCoA Integration — Budget & expenditure classification */
  budgetCode: string;                   /* UCoA Level-2 budget head */
  expenditureHead: string;              /* UCoA object code / expenditure classification */
  fundingSource: string;                /* RGOB / Donor / Loan / Project Fund */

  /* Rental contract dates */
  leaseStartDate: string;
  leaseEndDate: string;

  /* Rent amount and frequency (LoV 10.1) */
  rentAmount: string;                   /* DECIMAL — gross */
  paymentFrequency: string;             /* Monthly/Quarterly/Yearly/Fiscal Year */

  /* Scheduled next payment date */
  scheduledPaymentDate: string;

  /* PTS integration flag (only immovable — per R80) */
  ptsVerified: boolean;
  ptsReference: string;                 /* Reference returned by PTS */

  /* Active/Inactive — CRUD state */
  status: string;
}

/* ── Payment Transaction (Process 2.0, R79) ──────────────────────────────── */
export interface RentalPaymentTransaction {
  id: string;
  transactionId: string;                /* system generated */
  paymentOrderId: string;               /* system generated on approval */

  /* Covered assets — supports "common payment transaction for multiple
     assets leased by the same lessor" per R79 */
  assetIds: string[];

  /* Lessor details (denormalised) */
  lessorId: string;
  lessorName: string;

  /* Amounts */
  grossAmountPayable: string;           /* DECIMAL */
  applicableDeductions: string;         /* DECIMAL (TDS/BIT/etc) */
  netAmountPayable: string;             /* DECIMAL — gross - deductions */

  /* Scheduled date (copied from asset.scheduledPaymentDate) */
  scheduledDate: string;

  /* Budget code mapped to the transaction */
  budgetCode: string;

  /* Status + workflow */
  status: string;                       /* Pending / Approved / Paid (LoV 10.1) */
  approvedBy: string;
  approvedAt: string;

  createdAt: string;
}

/* ── Validation check (Process 2.0 + 3.0) ────────────────────────────────── */
export interface RentalValidationCheck {
  key: "budget" | "pts" | "duplicate" | "schedule";
  label: string;
  passed: boolean;
  message: string;
}

/* ── Persistence record ──────────────────────────────────────────────────── */
export interface StoredRental {
  id: string;
  asset: RentalAsset;
  transactions: RentalPaymentTransaction[];
  createdAt: string;
  updatedAt: string;
}

/* ── Wizard form state ───────────────────────────────────────────────────── */
export interface RentalFormState {
  asset: RentalAsset;
  transactions: RentalPaymentTransaction[];
}

export const initialAsset: RentalAsset = {
  assetId: "",
  assetCategory: "",
  assetType: "",
  assetSubClass: "",
  thramNo: "",
  houseNo: "",
  unitBuildingFlatNo: "",
  vehicleRegistrationNo: "",
  aeroServicesNo: "",
  machineriesNo: "",
  machineriesStatus: "",
  certifiedOrRegisteredNumber: "",
  assetTitle: "",
  lessorId: "",
  lessorName: "",
  agencyId: "",
  agencyName: "",
  budgetCode: "",
  expenditureHead: "",
  fundingSource: "",
  leaseStartDate: "",
  leaseEndDate: "",
  rentAmount: "",
  paymentFrequency: "",
  scheduledPaymentDate: "",
  ptsVerified: false,
  ptsReference: "",
  status: "",
};

export const initialRentalForm: RentalFormState = {
  asset: { ...initialAsset },
  transactions: [],
};
