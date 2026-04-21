/* ═══════════════════════════════════════════════════════════════════════════
   agencyPersonas — UCoA CWT (Feb 2026) Organisation Segment driven.
   ───────────────────────────────────────────────────────────────────
   TWO-LEVEL HIERARCHY:
     Level 1 → AGENCY  (Ministry / Dzongkhag / Thromde / Constitutional /
                         Autonomous body)
     Level 2 → STAFF POSITION within that agency (Finance Officer,
                         Procurement, HR, Head of Agency, etc.)

   Every government agency has the SAME set of functional staff positions.
   When the DSD super-user switches roles, they pick an AGENCY first, then
   the system shows which staff position they're acting as within that
   agency. This mimics how real government IFMIS works — each agency has
   its own Finance Division, Procurement Unit, HR Division, etc.

   UCoA Organisation Segment mapping (verified from actual Excel):
     Code 11-14 → Constitutional Bodies  (4 bodies)
     Code 16-23 → Ministries             (8 ministries; NO code 15)
     Code 25-43 → Dzongkhags             (19 dzongkhags; NO code 24)
     Code 45-47 → Thromdes               (3 thromdes; NO code 44)
     Code 48-72 → Autonomous Bodies      (25 bodies)

   MoF (Code 16) is the CENTRAL agency that administers IFMIS and has
   oversight of all other agencies.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Agency type classification ─────────────────────────────────────────── */
export type AgencyType =
  | "ministry"
  | "dzongkhag"
  | "thromde"
  | "constitutional"
  | "autonomous"
  | "external";

/* ── Agency (top-level institution) ─────────────────────────────────────── */
export interface Agency {
  /** UCoA Organisation Level-1 code */
  code: string;
  /** Full name */
  name: string;
  /** Short code */
  shortCode: string;
  /** Type classification */
  type: AgencyType;
  /** Key departments (UCoA Level-2) for display */
  departments: string[];
  /** Is this the central IFMIS-administering agency? */
  isCentral: boolean;
  /** Fiscal data for dashboard display */
  fiscal: AgencyFiscalData;
}

/** Per-agency fiscal / operational snapshot for dynamic dashboard display */
export interface AgencyFiscalData {
  /** Annual budget allocation in Nu millions */
  annualBudgetNuM: number;
  /** Budget utilisation percentage (0–100) */
  budgetUtilPct: number;
  /** Number of active contracts */
  activeContracts: number;
  /** Number of active staff in IFMIS */
  activeStaff: number;
  /** Number of pending payment orders */
  pendingPOs: number;
  /** Number of pending invoices */
  pendingInvoices: number;
  /** Total expenditure this FY in Nu millions */
  expenditureNuM: number;
  /** Agency-specific agencyId prefix used in contract/seed data (e.g. "AGY-MOF") */
  agencyIdPrefix: string;
}

/* ── Staff position (role within an agency) ─────────────────────────────── */
export interface StaffPosition {
  /** Maps to RBAC role id */
  roleId: string;
  /** Title shown in UI */
  title: string;
  /** Department / division this position belongs to */
  department: string;
  /** What this position can do — capability chips */
  capabilities: string[];
  /** What this position CANNOT do — blocked chips */
  blocked: string[];
  /** Modules this position works with */
  primaryModules: string[];
  /** Icon for the position */
  icon: string;
}

/* ── Combined: Agency + active staff position ──────────────────────────── */
export interface AgencyPersonaContext {
  agency: Agency;
  position: StaffPosition;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGENCIES — from UCoA CWT Feb 2026 Organisation Segment
   ═══════════════════════════════════════════════════════════════════════════ */
export const AGENCIES: Agency[] = [
  /* ── Ministries (Code 16-23) — UCoA verified, NO Code 15 ────────────── */
  {
    code: "16",
    name: "Ministry of Finance",
    shortCode: "MoF",
    type: "ministry",
    isCentral: true,
    departments: [
      "Office of the Minister",
      "Secretariat Services",
      "Dept of Planning, Budget & Performance",
      "Dept of Procurement & Properties",
      "Dept of Macro-Fiscal & Development Finance",
      "Dept of Treasury & Accounts",
      "Dept of Revenue & Customs",
      "Internal Audit Division",
    ],
    fiscal: { annualBudgetNuM: 4250, budgetUtilPct: 72, activeContracts: 34, activeStaff: 11, pendingPOs: 8, pendingInvoices: 12, expenditureNuM: 3060, agencyIdPrefix: "AGY-MOF" },
  },
  {
    code: "17",
    name: "Ministry of Agriculture & Livestock",
    shortCode: "MoAL",
    type: "ministry",
    isCentral: false,
    departments: [
      "Office of the Minister",
      "Secretariat Services",
      "National Biodiversity Centre",
      "Dept of Agricultural Marketing & Cooperatives",
      "Dept of Livestock",
      "Dept of Agriculture",
    ],
    fiscal: { annualBudgetNuM: 2180, budgetUtilPct: 61, activeContracts: 12, activeStaff: 4, pendingPOs: 3, pendingInvoices: 5, expenditureNuM: 1330, agencyIdPrefix: "AGY-MOAL" },
  },
  {
    code: "18",
    name: "Ministry of Energy & Natural Resources",
    shortCode: "MoENR",
    type: "ministry",
    isCentral: false,
    departments: [
      "Office of the Minister",
      "Secretariat",
      "Dept of Geology & Mines",
      "Dept of Energy",
      "Dept of Forest & Park Services",
      "Dept of Water",
      "Dept of Environment & Climate Change",
      "Electricity Regulatory Authority",
    ],
    fiscal: { annualBudgetNuM: 3700, budgetUtilPct: 65, activeContracts: 28, activeStaff: 4, pendingPOs: 6, pendingInvoices: 10, expenditureNuM: 2405, agencyIdPrefix: "AGY-MOENR" },
  },
  {
    code: "19",
    name: "Ministry of Infrastructure & Transport",
    shortCode: "MoIT",
    type: "ministry",
    isCentral: false,
    departments: [
      "Office of the Minister",
      "Secretariat Services",
      "Dept of Human Settlement",
      "Dept of Infrastructure Development",
      "Dept of Surface Transport",
      "Dept of Air Transport",
      "Bhutan Construction & Transport Authority",
      "Bhutan Civil Aviation Authority",
    ],
    fiscal: { annualBudgetNuM: 6400, budgetUtilPct: 78, activeContracts: 42, activeStaff: 6, pendingPOs: 11, pendingInvoices: 16, expenditureNuM: 4992, agencyIdPrefix: "AGY-MOIT" },
  },
  {
    code: "20",
    name: "Ministry of Health",
    shortCode: "MoH",
    type: "ministry",
    isCentral: false,
    departments: [
      "Office of the Minister",
      "Secretariat Services",
      "Dept of Health Services",
      "Royal Center for Disease Control",
      "Dept of Public Health",
      "Dept of Traditional Medicine",
      "Bhutan Food & Drug Authority",
    ],
    fiscal: { annualBudgetNuM: 3820, budgetUtilPct: 68, activeContracts: 21, activeStaff: 11, pendingPOs: 5, pendingInvoices: 9, expenditureNuM: 2597, agencyIdPrefix: "AGY-MOH" },
  },
  {
    code: "21",
    name: "Ministry of Industry, Commerce & Employment",
    shortCode: "MoICE",
    type: "ministry",
    isCentral: false,
    departments: [
      "Office of the Minister",
      "Secretariat Services",
      "Dept of Labour",
      "Dept of Employment & Entrepreneurship",
      "Dept of Tourism",
      "Dept of Media, Creative Industry & IP",
      "Dept of Trade",
      "Dept of Industry",
      "BICMA",
      "Bhutan Standard Bureau",
      "Consumer Competition Affairs Authority",
    ],
    fiscal: { annualBudgetNuM: 1950, budgetUtilPct: 55, activeContracts: 9, activeStaff: 4, pendingPOs: 2, pendingInvoices: 4, expenditureNuM: 1072, agencyIdPrefix: "AGY-MOICE" },
  },
  {
    code: "22",
    name: "Ministry of Education & Skills Development",
    shortCode: "MoESD",
    type: "ministry",
    isCentral: false,
    departments: [
      "Office of the Minister",
      "Secretariat Services",
      "Dept of School Education",
      "Dept of Education Programmes",
      "Dept of Workforce Planning & Skills Development",
      "Bhutan Qualifications & Professionals Certification Authority",
      "Bhutan Council for School Examinations & Assessment",
    ],
    fiscal: { annualBudgetNuM: 5100, budgetUtilPct: 74, activeContracts: 18, activeStaff: 5, pendingPOs: 4, pendingInvoices: 7, expenditureNuM: 3774, agencyIdPrefix: "AGY-MOESD" },
  },
  {
    code: "23",
    name: "Ministry of Foreign Affairs & External Trade",
    shortCode: "MoFAET",
    type: "ministry",
    isCentral: false,
    departments: [
      "Office of the Minister",
      "Secretariat Services",
      "Royal Bhutanese Embassies, Missions & Consulates",
      "Dept of Bilateral Affairs",
      "Dept of Multilateral Affairs",
      "Dept of Protocol & Consular Affairs",
      "Dept of Economic & Tech Diplomacy",
    ],
    fiscal: { annualBudgetNuM: 1200, budgetUtilPct: 58, activeContracts: 6, activeStaff: 3, pendingPOs: 1, pendingInvoices: 3, expenditureNuM: 696, agencyIdPrefix: "AGY-MOFAET" },
  },

  /* ── Constitutional Bodies (Code 11-14) ──────────────────────────────── */
  {
    code: "11",
    name: "Royal Civil Service Commission",
    shortCode: "RCSC",
    type: "constitutional",
    isCentral: false,
    departments: [
      "Office of the Chairperson",
      "Office of Commissioners",
      "Secretariat Services",
    ],
    fiscal: { annualBudgetNuM: 420, budgetUtilPct: 76, activeContracts: 2, activeStaff: 3, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 319, agencyIdPrefix: "AGY-RCSC" },
  },
  {
    code: "12",
    name: "Royal Audit Authority",
    shortCode: "RAA",
    type: "constitutional",
    isCentral: false,
    departments: [
      "Office of the Auditor General",
      "Secretariat Services",
      "Dept of Sectorial Audit",
      "Dept of Performance & Compliance Audit",
      "Dept of Follow-up & Regions",
    ],
    fiscal: { annualBudgetNuM: 580, budgetUtilPct: 82, activeContracts: 3, activeStaff: 4, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 476, agencyIdPrefix: "AGY-RAA" },
  },
  {
    code: "13",
    name: "Anti-Corruption Commission",
    shortCode: "ACC",
    type: "constitutional",
    isCentral: false,
    departments: [
      "Office of the Chairperson",
      "Office of Commissioner",
      "Secretariat Services",
      "Dept of Investigation",
      "Dept of Prevention & Education",
      "Dept of Professional Support",
    ],
    fiscal: { annualBudgetNuM: 310, budgetUtilPct: 69, activeContracts: 1, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 214, agencyIdPrefix: "AGY-ACC" },
  },
  {
    code: "14",
    name: "Election Commission of Bhutan",
    shortCode: "ECB",
    type: "constitutional",
    isCentral: false,
    departments: [
      "Office of Commissioner",
      "Secretariat Services",
      "Dept of Election & Civic Education",
      "Dept of Electoral Registration & IT",
    ],
    fiscal: { annualBudgetNuM: 280, budgetUtilPct: 52, activeContracts: 1, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 146, agencyIdPrefix: "AGY-ECB" },
  },

  /* ── Thromdes (Code 45-47) — UCoA verified, NO Code 44 ──────────────── */
  {
    code: "45",
    name: "Phuentsholing Thromde",
    shortCode: "PT",
    type: "thromde",
    isCentral: false,
    departments: [
      "Office of Thrompon",
      "Secretariat Services",
    ],
    fiscal: { annualBudgetNuM: 980, budgetUtilPct: 64, activeContracts: 11, activeStaff: 3, pendingPOs: 2, pendingInvoices: 4, expenditureNuM: 627, agencyIdPrefix: "AGY-PT" },
  },
  {
    code: "46",
    name: "Gelephu Thromde",
    shortCode: "GT",
    type: "thromde",
    isCentral: false,
    departments: [
      "Office of Thrompon",
      "Secretariat Services",
    ],
    fiscal: { annualBudgetNuM: 2400, budgetUtilPct: 45, activeContracts: 16, activeStaff: 3, pendingPOs: 7, pendingInvoices: 11, expenditureNuM: 1080, agencyIdPrefix: "AGY-GT" },
  },
  {
    code: "47",
    name: "Samdrupjongkhar Thromde",
    shortCode: "SJT",
    type: "thromde",
    isCentral: false,
    departments: [
      "Office of Thrompon",
      "Secretariat Services",
    ],
    fiscal: { annualBudgetNuM: 520, budgetUtilPct: 58, activeContracts: 5, activeStaff: 2, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 302, agencyIdPrefix: "AGY-SJT" },
  },

  /* ── Dzongkhags (Code 25-43) — all 19 from UCoA ─────────────────────── */
  {
    code: "25",
    name: "Chhukha Dzongkhag",
    shortCode: "Chhukha",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 810, budgetUtilPct: 70, activeContracts: 9, activeStaff: 3, pendingPOs: 2, pendingInvoices: 4, expenditureNuM: 567, agencyIdPrefix: "AGY-CHK" },
  },
  {
    code: "26",
    name: "Dagana Dzongkhag",
    shortCode: "Dagana",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 480, budgetUtilPct: 63, activeContracts: 4, activeStaff: 2, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 302, agencyIdPrefix: "AGY-DAG" },
  },
  {
    code: "27",
    name: "Gasa Dzongkhag",
    shortCode: "Gasa",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 320, budgetUtilPct: 54, activeContracts: 2, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 173, agencyIdPrefix: "AGY-GAS" },
  },
  {
    code: "28",
    name: "Haa Dzongkhag",
    shortCode: "Haa",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 410, budgetUtilPct: 60, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 246, agencyIdPrefix: "AGY-HAA" },
  },
  {
    code: "29",
    name: "Lhuentse Dzongkhag",
    shortCode: "Lhuentse",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 390, budgetUtilPct: 59, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 230, agencyIdPrefix: "AGY-LHU" },
  },
  {
    code: "30",
    name: "Mongar Dzongkhag",
    shortCode: "Mongar",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 680, budgetUtilPct: 66, activeContracts: 7, activeStaff: 2, pendingPOs: 2, pendingInvoices: 3, expenditureNuM: 449, agencyIdPrefix: "AGY-MON" },
  },
  {
    code: "31",
    name: "Paro Dzongkhag",
    shortCode: "Paro",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 740, budgetUtilPct: 73, activeContracts: 8, activeStaff: 3, pendingPOs: 2, pendingInvoices: 3, expenditureNuM: 540, agencyIdPrefix: "AGY-PARO" },
  },
  {
    code: "32",
    name: "Pema Gatshel Dzongkhag",
    shortCode: "PemaG",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 440, budgetUtilPct: 61, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 268, agencyIdPrefix: "AGY-PEG" },
  },
  {
    code: "33",
    name: "Punakha Dzongkhag",
    shortCode: "Punakha",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 560, budgetUtilPct: 67, activeContracts: 5, activeStaff: 2, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 375, agencyIdPrefix: "AGY-PUN" },
  },
  {
    code: "34",
    name: "Samdrup Jongkhar Dzongkhag",
    shortCode: "SamJo",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 590, budgetUtilPct: 64, activeContracts: 5, activeStaff: 2, pendingPOs: 2, pendingInvoices: 2, expenditureNuM: 378, agencyIdPrefix: "AGY-SJD" },
  },
  {
    code: "35",
    name: "Samtse Dzongkhag",
    shortCode: "Samtse",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 750, budgetUtilPct: 68, activeContracts: 7, activeStaff: 3, pendingPOs: 2, pendingInvoices: 3, expenditureNuM: 510, agencyIdPrefix: "AGY-SAM" },
  },
  {
    code: "36",
    name: "Sarpang Dzongkhag",
    shortCode: "Sarpang",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 530, budgetUtilPct: 62, activeContracts: 4, activeStaff: 2, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 329, agencyIdPrefix: "AGY-SAR" },
  },
  {
    code: "37",
    name: "Trashigang Dzongkhag",
    shortCode: "TrGang",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 650, budgetUtilPct: 62, activeContracts: 6, activeStaff: 2, pendingPOs: 1, pendingInvoices: 3, expenditureNuM: 403, agencyIdPrefix: "AGY-TRG" },
  },
  {
    code: "38",
    name: "Trashiyangtse Dzongkhag",
    shortCode: "TrYang",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 420, budgetUtilPct: 58, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 244, agencyIdPrefix: "AGY-TRY" },
  },
  {
    code: "39",
    name: "Thimphu Dzongkhag",
    shortCode: "ThDz",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 920, budgetUtilPct: 69, activeContracts: 10, activeStaff: 3, pendingPOs: 3, pendingInvoices: 4, expenditureNuM: 635, agencyIdPrefix: "AGY-THDZ" },
  },
  {
    code: "40",
    name: "Trongsa Dzongkhag",
    shortCode: "Trongsa",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 430, budgetUtilPct: 60, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 258, agencyIdPrefix: "AGY-TRO" },
  },
  {
    code: "41",
    name: "Tsirang Dzongkhag",
    shortCode: "Tsirang",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 410, budgetUtilPct: 57, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 234, agencyIdPrefix: "AGY-TSI" },
  },
  {
    code: "42",
    name: "Wangduephodrang Dzongkhag",
    shortCode: "WangDz",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 620, budgetUtilPct: 65, activeContracts: 5, activeStaff: 2, pendingPOs: 2, pendingInvoices: 2, expenditureNuM: 403, agencyIdPrefix: "AGY-WAN" },
  },
  {
    code: "43",
    name: "Zhemgang Dzongkhag",
    shortCode: "Zhemg",
    type: "dzongkhag",
    isCentral: false,
    departments: ["Dzongkhag Administration", "Gewog Administrations"],
    fiscal: { annualBudgetNuM: 400, budgetUtilPct: 56, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 224, agencyIdPrefix: "AGY-ZHE" },
  },

  /* ── Autonomous Bodies (Code 48-72) — all 25 from UCoA ──────────────── */
  {
    code: "48",
    name: "Dratshang Lhentshong",
    shortCode: "DL",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 450, budgetUtilPct: 71, activeContracts: 2, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 320, agencyIdPrefix: "AGY-DL" },
  },
  {
    code: "49",
    name: "National Statistics Bureau",
    shortCode: "NSB",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 180, budgetUtilPct: 65, activeContracts: 1, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 117, agencyIdPrefix: "AGY-NSB" },
  },
  {
    code: "50",
    name: "Bhutan Olympic Committee",
    shortCode: "BOC",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 120, budgetUtilPct: 58, activeContracts: 1, activeStaff: 1, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 70, agencyIdPrefix: "AGY-BOC" },
  },
  {
    code: "51",
    name: "Royal Institute of Management",
    shortCode: "RIM",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 250, budgetUtilPct: 72, activeContracts: 2, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 180, agencyIdPrefix: "AGY-RIM" },
  },
  {
    code: "52",
    name: "National Assembly of Bhutan",
    shortCode: "NAB",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 350, budgetUtilPct: 60, activeContracts: 1, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 210, agencyIdPrefix: "AGY-NAB" },
  },
  {
    code: "53",
    name: "Cabinet Secretariat",
    shortCode: "CabSec",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 290, budgetUtilPct: 68, activeContracts: 1, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 197, agencyIdPrefix: "AGY-CABSEC" },
  },
  {
    code: "54",
    name: "National Land Commission Secretariat",
    shortCode: "NLCS",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 320, budgetUtilPct: 66, activeContracts: 2, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 211, agencyIdPrefix: "AGY-NLCS" },
  },
  {
    code: "55",
    name: "Jigme Singye Wangchuck School of Law",
    shortCode: "JSW",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 190, budgetUtilPct: 74, activeContracts: 1, activeStaff: 1, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 141, agencyIdPrefix: "AGY-JSW" },
  },
  {
    code: "56",
    name: "His Majesty's Secretariat",
    shortCode: "HMS",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 480, budgetUtilPct: 80, activeContracts: 2, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 384, agencyIdPrefix: "AGY-HMS" },
  },
  {
    code: "57",
    name: "Centre for Bhutan Studies & GNH Research",
    shortCode: "CBS",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 140, budgetUtilPct: 62, activeContracts: 1, activeStaff: 1, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 87, agencyIdPrefix: "AGY-CBS" },
  },
  {
    code: "58",
    name: "Civil Society Organizations Authority",
    shortCode: "CSOA",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 80, budgetUtilPct: 55, activeContracts: 0, activeStaff: 1, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 44, agencyIdPrefix: "AGY-CSOA" },
  },
  {
    code: "59",
    name: "Judiciary of Bhutan",
    shortCode: "JoB",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 620, budgetUtilPct: 75, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 465, agencyIdPrefix: "AGY-JOB" },
  },
  {
    code: "60",
    name: "Bhutan National Legal Institute",
    shortCode: "BNLI",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 100, budgetUtilPct: 60, activeContracts: 0, activeStaff: 1, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 60, agencyIdPrefix: "AGY-BNLI" },
  },
  {
    code: "61",
    name: "Khesar Gyalpo University of Medical Sciences of Bhutan",
    shortCode: "KGUMSB",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 540, budgetUtilPct: 73, activeContracts: 3, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 394, agencyIdPrefix: "AGY-KGUMSB" },
  },
  {
    code: "62",
    name: "His Majesty's Secretariat (4th King)",
    shortCode: "HMS4",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 150, budgetUtilPct: 70, activeContracts: 0, activeStaff: 1, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 105, agencyIdPrefix: "AGY-HMS4" },
  },
  {
    code: "63",
    name: "The Pema Secretariat",
    shortCode: "TPS",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 130, budgetUtilPct: 65, activeContracts: 0, activeStaff: 1, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 85, agencyIdPrefix: "AGY-TPS" },
  },
  {
    code: "64",
    name: "National Council",
    shortCode: "NC",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 260, budgetUtilPct: 62, activeContracts: 1, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 161, agencyIdPrefix: "AGY-NC" },
  },
  {
    code: "65",
    name: "Office of the Attorney General",
    shortCode: "OAG",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 240, budgetUtilPct: 70, activeContracts: 1, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 168, agencyIdPrefix: "AGY-OAG" },
  },
  {
    code: "66",
    name: "Royal Privy Council",
    shortCode: "RPC",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 110, budgetUtilPct: 68, activeContracts: 0, activeStaff: 1, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 75, agencyIdPrefix: "AGY-RPC" },
  },
  {
    code: "67",
    name: "National Centre for Hydrology & Metrology",
    shortCode: "NCHM",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 220, budgetUtilPct: 67, activeContracts: 2, activeStaff: 2, pendingPOs: 0, pendingInvoices: 1, expenditureNuM: 147, agencyIdPrefix: "AGY-NCHM" },
  },
  {
    code: "68",
    name: "Royal University of Bhutan",
    shortCode: "RUB",
    type: "autonomous",
    isCentral: false,
    departments: [
      "Office of the Vice Chancellor",
      "Secretariat",
      "Dept of Academic Affairs",
      "Dept of Research & External Relations",
      "Dept of Planning & Resources",
      "Office of President",
    ],
    fiscal: { annualBudgetNuM: 1100, budgetUtilPct: 77, activeContracts: 5, activeStaff: 3, pendingPOs: 1, pendingInvoices: 2, expenditureNuM: 847, agencyIdPrefix: "AGY-RUB" },
  },
  {
    code: "69",
    name: "Royal Bhutan Police",
    shortCode: "RBP",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 1450, budgetUtilPct: 78, activeContracts: 8, activeStaff: 3, pendingPOs: 2, pendingInvoices: 4, expenditureNuM: 1131, agencyIdPrefix: "AGY-RBP" },
  },
  {
    code: "70",
    name: "Government Technology Agency",
    shortCode: "GovTech",
    type: "autonomous",
    isCentral: false,
    departments: [
      "Dept of Digital Transformation",
      "Dept of Digital Infrastructure",
    ],
    fiscal: { annualBudgetNuM: 890, budgetUtilPct: 81, activeContracts: 3, activeStaff: 24, pendingPOs: 2, pendingInvoices: 3, expenditureNuM: 721, agencyIdPrefix: "AGY-GT" },
  },
  {
    code: "71",
    name: "Gyalsung",
    shortCode: "GS",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 680, budgetUtilPct: 42, activeContracts: 4, activeStaff: 2, pendingPOs: 2, pendingInvoices: 2, expenditureNuM: 286, agencyIdPrefix: "AGY-GS" },
  },
  {
    code: "72",
    name: "National Medical Service",
    shortCode: "NMS",
    type: "autonomous",
    isCentral: false,
    departments: ["Secretariat Services"],
    fiscal: { annualBudgetNuM: 380, budgetUtilPct: 69, activeContracts: 2, activeStaff: 2, pendingPOs: 1, pendingInvoices: 1, expenditureNuM: 262, agencyIdPrefix: "AGY-NMS" },
  },

  /* ── Public / Self-Service — Contractors & Vendors ────────────────────── */
  {
    code: "EXT",
    name: "Contractors & Vendors",
    shortCode: "Contractor",
    type: "external",
    isCentral: false,
    departments: ["Individual Contractors", "Construction Companies", "IT Service Providers", "Medical Suppliers", "Trading Companies"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 8, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "AGY-EXT" },
  },

  /* ── Financial Institutions ──────────────────────────────────────────── */
  {
    code: "FI",
    name: "Financial Institutions",
    shortCode: "FI",
    type: "external",
    isCentral: false,
    departments: ["Commercial Banks", "Development Banks", "Insurance Companies", "Microfinance Institutions"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 6, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "AGY-FI" },
  },

  /* ── Muster Roll Beneficiaries ──────────────────────────────────────── */
  {
    code: "MR",
    name: "Muster Roll Workers",
    shortCode: "MR",
    type: "external",
    isCentral: false,
    departments: ["Daily Wage Workers", "Seasonal Workers", "Project-Based Labourers"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 5, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "AGY-MR" },
  },

  /* ── Utility Service Providers (Public / Self-Service) ────────────────
     Each provider gets its own agency entry so the persona switcher can
     scope them, and the Utility & Service Payment module can filter bill
     records to only the acting provider's rows. */
  {
    code: "UP-BT",
    name: "Bhutan Telecom Ltd",
    shortCode: "BT",
    type: "external",
    isCentral: false,
    departments: ["Telephone Services", "Internet & Leasedline", "Billing & Collections"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 4, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "UP-BT" },
  },
  {
    code: "UP-TC",
    name: "Tashi Cell",
    shortCode: "TC",
    type: "external",
    isCentral: false,
    departments: ["Telephone Services", "Internet & Leasedline", "Billing & Collections"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 3, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "UP-TC" },
  },
  {
    code: "UP-BPC",
    name: "Bhutan Power Corporation Ltd",
    shortCode: "BPC",
    type: "external",
    isCentral: false,
    departments: ["Electricity Supply", "Metering & Billing", "Customer Service"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 4, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "UP-BPC" },
  },
  {
    code: "UP-STL",
    name: "Bhutan Starlink",
    shortCode: "Starlink",
    type: "external",
    isCentral: false,
    departments: ["Internet & Leasedline", "Billing & Collections"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 2, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "UP-STL" },
  },
  {
    code: "UP-MUN",
    name: "Municipalities & Thromdes",
    shortCode: "Mun",
    type: "external",
    isCentral: false,
    departments: ["Water Supply", "Sewerage", "Billing & Collections"],
    fiscal: { annualBudgetNuM: 0, budgetUtilPct: 0, activeContracts: 0, activeStaff: 3, pendingPOs: 0, pendingInvoices: 0, expenditureNuM: 0, agencyIdPrefix: "UP-MUN" },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DEPARTMENT → SUB-DIVISIONS mapping
   Used for cascading filters in Payroll, HR, and Budget modules.
   Key = exact department name (must match Agency.departments entries).
   ═══════════════════════════════════════════════════════════════════════════ */
export const DEPARTMENT_SUBDIVISIONS: Record<string, string[]> = {
  /* ── Ministry of Finance (Code 16) ─────────────────────────────────── */
  "Dept of Planning, Budget & Performance": [
    "Budget Division",
    "Planning & Policy Division",
    "Performance Management Division",
    "Aid Coordination Division",
  ],
  "Dept of Procurement & Properties": [
    "Procurement Division",
    "Government Properties Division",
    "e-Procurement Unit",
    "Contract Administration Division",
  ],
  "Dept of Macro-Fiscal & Development Finance": [
    "Macro-Economic Division",
    "Fiscal Policy Division",
    "Development Finance Division",
    "Debt Management Division",
  ],
  "Dept of Treasury & Accounts": [
    "Treasury Division",
    "General Accounts Division",
    "Pension & Provident Fund Division",
    "Financial Reporting Division",
  ],
  "Dept of Revenue & Customs": [
    "Tax Administration Division",
    "Customs Division",
    "Revenue Intelligence Division",
    "Taxpayer Services Division",
  ],
  "Internal Audit Division": [
    "Performance Audit Unit",
    "Financial Compliance Unit",
    "IT Audit Unit",
  ],
  "Secretariat Services": [
    "Administration & HR",
    "Finance & Accounts",
    "ICT Unit",
    "Legal Unit",
  ],

  /* ── Ministry of Health (Code 20) ──────────────────────────────────── */
  "Dept of Health Services": [
    "Hospital Services Division",
    "Primary Health Care Division",
    "Nursing Services Division",
    "Emergency & Referral Services",
  ],
  "Royal Center for Disease Control": [
    "Epidemiology & Disease Surveillance",
    "Laboratory Services Division",
    "Vector-Borne Disease Unit",
    "Immunization & Cold Chain Unit",
  ],
  "Dept of Public Health": [
    "Health Promotion Division",
    "Environmental Health Division",
    "Nutrition Programme Division",
    "Reproductive Health Division",
  ],
  "Dept of Traditional Medicine": [
    "Clinical Services Division",
    "Research & Development Division",
    "Pharmaceutical Division",
  ],
  "Bhutan Food & Drug Authority": [
    "Food Safety Division",
    "Drug Regulatory Division",
    "Quality Assurance Division",
    "Import & Export Control Unit",
  ],

  /* ── Government Technology Agency (Code 70) ────────────────────────── */
  "Dept of Digital Transformation": [
    "e-Services Division",
    "Digital Literacy Division",
    "Innovation Lab",
    "System Integration Division",
  ],
  "Dept of Digital Infrastructure": [
    "Network Operations Division",
    "Data Centre Division",
    "Cloud Services Division",
    "Cybersecurity Division",
  ],

  /* ── Ministry of Agriculture & Livestock (Code 17) ─────────────────── */
  "National Biodiversity Centre": [
    "Genetic Resources Division",
    "Biodiversity Research Division",
  ],
  "Dept of Agricultural Marketing & Cooperatives": [
    "Marketing & Trade Division",
    "Cooperatives Development Division",
    "Post-Harvest Management Division",
  ],
  "Dept of Livestock": [
    "Animal Health Division",
    "Animal Production Division",
    "Dairy Development Division",
  ],
  "Dept of Agriculture": [
    "Crop Production Division",
    "Horticulture Division",
    "Plant Protection Division",
    "Soil & Water Management Division",
  ],

  /* ── Ministry of Energy & Natural Resources (Code 18) ──────────────── */
  "Dept of Geology & Mines": [
    "Geology Division",
    "Mining Division",
    "Mineral Exploration Division",
  ],
  "Dept of Energy": [
    "Hydropower Division",
    "Renewable Energy Division",
    "Energy Efficiency Division",
  ],
  "Dept of Forest & Park Services": [
    "Forest Management Division",
    "Parks & Protected Areas Division",
    "Social Forestry Division",
    "Wildlife Conservation Division",
  ],
  "Dept of Water": [
    "Water Resources Division",
    "Watershed Management Division",
    "Water Quality Division",
  ],
  "Dept of Environment & Climate Change": [
    "Environment Assessment Division",
    "Climate Change Division",
    "Waste Management Division",
  ],

  /* ── Ministry of Infrastructure & Transport (Code 19) ──────────────── */
  "Dept of Human Settlement": [
    "Urban Planning Division",
    "Housing Division",
    "Building Standards Division",
  ],
  "Dept of Infrastructure Development": [
    "Road Engineering Division",
    "Bridge Division",
    "Construction Monitoring Division",
  ],
  "Dept of Surface Transport": [
    "Vehicle Regulation Division",
    "Road Safety Division",
    "Public Transport Division",
  ],
  "Dept of Air Transport": [
    "Aviation Safety Division",
    "Airport Operations Division",
  ],

  /* ── Ministry of Industry, Commerce & Employment (Code 21) ─────────── */
  "Dept of Labour": [
    "Labour Administration Division",
    "Occupational Safety Division",
    "Labour Market Information Division",
  ],
  "Dept of Employment & Entrepreneurship": [
    "Employment Services Division",
    "Entrepreneurship Division",
    "Skills Development Division",
  ],
  "Dept of Tourism": [
    "Tourism Promotion Division",
    "Tourism Regulation Division",
    "Sustainable Tourism Division",
  ],
  "Dept of Media, Creative Industry & IP": [
    "Media Development Division",
    "Creative Industries Division",
    "Intellectual Property Division",
  ],
  "Dept of Trade": [
    "Trade Facilitation Division",
    "Trade Policy Division",
    "Export Promotion Division",
  ],
  "Dept of Industry": [
    "Industrial Development Division",
    "Cottage & Small Industry Division",
    "Industrial Estate Division",
  ],

  /* ── Ministry of Education & Skills Development (Code 22) ──────────── */
  "Dept of School Education": [
    "Curriculum Division",
    "Teacher Management Division",
    "School Management Division",
    "Special Education Division",
  ],
  "Dept of Education Programmes": [
    "Tertiary Education Division",
    "Scholarship Division",
    "Research & Policy Division",
  ],
  "Dept of Workforce Planning & Skills Development": [
    "TVET Division",
    "Workforce Planning Division",
    "Recognition of Prior Learning Division",
  ],

  /* ── Ministry of Foreign Affairs & External Trade (Code 23) ────────── */
  "Royal Bhutanese Embassies, Missions & Consulates": [
    "Embassy Administration Division",
    "Consular Services Division",
  ],
  "Dept of Bilateral Affairs": [
    "South Asia Division",
    "East Asia & Pacific Division",
    "Europe & Americas Division",
  ],
  "Dept of Multilateral Affairs": [
    "UN & International Organizations Division",
    "Regional Cooperation Division",
  ],
  "Dept of Protocol & Consular Affairs": [
    "Protocol Division",
    "Consular Affairs Division",
  ],
  "Dept of Economic & Tech Diplomacy": [
    "Economic Diplomacy Division",
    "Technology Cooperation Division",
  ],

  /* ── Constitutional Bodies ─────────────────────────────────────────── */
  "Dept of Sectorial Audit": [
    "Financial Audit Division",
    "IT Audit Division",
    "Environmental Audit Division",
  ],
  "Dept of Performance & Compliance Audit": [
    "Performance Audit Division",
    "Compliance Audit Division",
  ],
  "Dept of Follow-up & Regions": [
    "Follow-up Division",
    "Regional Offices Division",
  ],
  "Dept of Investigation": [
    "Investigations Division",
    "Forensic Accounting Division",
  ],
  "Dept of Prevention & Education": [
    "Prevention Division",
    "Public Education Division",
  ],
  "Dept of Professional Support": [
    "Legal Division",
    "Research & Policy Division",
  ],
  "Dept of Election & Civic Education": [
    "Election Management Division",
    "Civic Education Division",
  ],
  "Dept of Electoral Registration & IT": [
    "Voter Registration Division",
    "IT & Systems Division",
  ],

  /* ── Dzongkhag generic ─────────────────────────────────────────────── */
  "Dzongkhag Administration": [
    "Finance & Accounts Section",
    "Planning & Monitoring Section",
    "HR & Admin Section",
    "Legal Section",
  ],
  "Gewog Administrations": [
    "Gewog Administrative Officers",
    "Extension Services",
    "Community Development",
  ],
};

/** Helper: get sub-divisions for a given department name. Returns empty array if none. */
export function getSubDivisions(departmentName: string): string[] {
  return DEPARTMENT_SUBDIVISIONS[departmentName] ?? [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAFF POSITIONS — base definitions (same functional roles across agencies)
   Each maps 1:1 to an RBAC role. The BASE title/department is the fallback;
   getStaffPositionForAgency() overrides them per agency TYPE so the UI
   shows "Dzongdag" instead of "Secretary", "Thrompon" instead of "Head",
   and so on — giving each agency a realistic feel.
   ═══════════════════════════════════════════════════════════════════════════ */
const BASE_STAFF_POSITIONS: StaffPosition[] = [
  {
    roleId: "role-admin",
    title: "System Administrator",
    department: "IT & IFMIS Unit",
    capabilities: ["Full system access", "RBAC configuration", "Master data management", "Workflow configuration"],
    blocked: [],
    primaryModules: ["All Modules"],
    icon: "gear",
  },
  {
    roleId: "role-normal-user",
    title: "Administrative Officer",
    department: "Administration Division",
    capabilities: ["Create contracts", "Submit invoices", "Originate advances", "Register utility providers", "Rental payment entry"],
    blocked: ["Cannot approve", "Cannot delete", "No admin access"],
    primaryModules: ["Contract Creation", "Invoice Submission", "Utility Payment", "Rental Payment", "Advances"],
    icon: "user",
  },
  {
    roleId: "role-finance-officer",
    title: "Finance Officer",
    department: "Finance Division",
    capabilities: ["Process invoices & bills", "Approve payment orders", "Debt servicing", "SOE & fund transfers", "Financial reporting", "Budget management"],
    blocked: ["Cannot configure RBAC"],
    primaryModules: ["Invoice Approval", "Bill Processing", "Payment Order", "Debt Payment", "SOE Fund Transfer"],
    icon: "banknotes",
  },
  {
    roleId: "role-procurement",
    title: "Procurement Officer",
    department: "Procurement Unit",
    capabilities: ["Contractor registration", "Vendor management", "Contract verification", "Sanction management", "Technical review"],
    blocked: ["Cannot release payments", "Cannot approve financials"],
    primaryModules: ["Contractor Registration", "Vendor Management", "Contract Creation", "Sanction Management"],
    icon: "clipboard",
  },
  {
    roleId: "role-agency-staff",
    title: "Agency Staff (Operations)",
    department: "Operations Section",
    capabilities: ["Utility bill entry", "Vendor onboarding", "Advance origination", "Contract data entry", "Social benefit entry"],
    blocked: ["Cannot approve", "Cannot delete", "No admin access"],
    primaryModules: ["Utility Payment", "Rental Payment", "Vendor Management", "Advances", "Social Benefits"],
    icon: "briefcase",
  },
  {
    roleId: "role-auditor",
    title: "Auditor (Compliance)",
    department: "Audit & Compliance",
    capabilities: ["View all modules", "Export reports", "Audit trail access", "Cross-agency review"],
    blocked: ["Read-only access", "Cannot create records", "Cannot approve"],
    primaryModules: ["All Modules (Read-Only)"],
    icon: "magnifier",
  },
  {
    roleId: "role-head-of-agency",
    title: "Head of Agency",
    department: "Office of the Head",
    capabilities: ["Final approve advances", "Final approve bills", "Authorise contract closures", "Authorise payment release"],
    blocked: ["Cannot do data entry"],
    primaryModules: ["Advances", "Invoice Approval", "Bill Processing", "Payment Order", "Contract Closure"],
    icon: "crown",
  },
  {
    roleId: "role-hr-officer",
    title: "HR Officer",
    department: "Human Resource Division",
    capabilities: ["Employee master management (ZESt sync)", "Payroll generation (6-step)", "Salary advance initiation", "Muster roll creation", "Sitting fee & honorarium processing", "Allowance & deduction configuration"],
    blocked: ["Cannot approve payroll (Finance/HoA only)", "No expenditure module access"],
    primaryModules: ["Employee Master", "Payroll Generation", "Salary Advance", "Muster Roll", "Sitting Fee Honorarium"],
    icon: "users",
  },
  {
    roleId: "role-public",
    title: "External User (Contractor / Vendor)",
    department: "Contractor Self-Service Portal",
    capabilities: ["Self-registration", "Invoice submission", "Contract tracking", "Document upload"],
    blocked: ["No internal access", "Cannot view admin modules"],
    primaryModules: ["Contractor Registration", "Invoice Submission", "My Contracts"],
    icon: "globe",
  },
  {
    roleId: "role-muster-roll",
    title: "Muster Roll Beneficiary",
    department: "Muster Roll Self-Service",
    capabilities: ["Beneficiary registration", "Payment status tracking", "Bank detail updates", "Wage history"],
    blocked: ["No internal access", "Cannot view admin modules"],
    primaryModules: ["Muster Roll Registration", "Payment Status", "Wage History"],
    icon: "user",
  },
  {
    roleId: "role-fi",
    title: "Financial Institution User",
    department: "Financial Institution Portal",
    capabilities: ["FI registration & profile", "Bill discounting verification", "Payment channel management", "CBS integration", "Payment order tracking"],
    blocked: ["No internal access", "Cannot view admin modules", "Cannot approve payments"],
    primaryModules: ["FI Registration", "Bill Discounting", "Payment Orders", "CBS Integration"],
    icon: "bank",
  },
];

/* ── Keep backward-compatible export ──────────────────────────────────── */
export const STAFF_POSITIONS = BASE_STAFF_POSITIONS;

/* ═══════════════════════════════════════════════════════════════════════════
   AGENCY-TYPE OVERRIDES — dynamic titles & departments per agency type.
   Each agency type in Bhutan has its own governance terminology:
     Ministry:      Secretary / Dept of X        (SRS: "Head of Agency")
     Dzongkhag:     Dzongdag / Sector offices     (local government)
     Thromde:       Thrompon / Municipal services  (city/municipal)
     Constitutional: Chairperson / Commission depts
     Autonomous:    Director General / Directorate
     External:      no overrides (public users)
   ═══════════════════════════════════════════════════════════════════════════ */
interface PositionOverride {
  title?: string;
  department?: string;
}

type AgencyTypeOverrides = Partial<Record<string, PositionOverride>>;

const POSITION_OVERRIDES: Record<AgencyType, AgencyTypeOverrides> = {
  ministry: {
    "role-head-of-agency":  { title: "Secretary",                         department: "Office of the Secretary" },
    "role-finance-officer": { title: "Chief Finance Officer",             department: "Finance & Accounts Division" },
    "role-procurement":     { title: "Chief Procurement Officer",         department: "Procurement & Properties Division" },
    "role-agency-staff":    { title: "Planning Officer",                  department: "Policy & Planning Division" },
    "role-hr-officer":      { title: "Chief HR Officer",                  department: "Human Resource Division" },
    "role-normal-user":     { title: "Administrative Officer",            department: "Administration Division" },
    "role-admin":           { title: "IFMIS System Administrator",        department: "IT & IFMIS Unit" },
    "role-auditor":         { title: "Internal Auditor",                  department: "Internal Audit Unit" },
  },
  dzongkhag: {
    "role-head-of-agency":  { title: "Dzongdag",                          department: "Dzongdag's Office" },
    "role-finance-officer": { title: "Dzongkhag Finance Officer",         department: "Dzongkhag Accounts Section" },
    "role-procurement":     { title: "Dzongkhag Procurement Officer",     department: "Dzongkhag Administration" },
    "role-agency-staff":    { title: "Dzongkhag Planning Officer",        department: "Planning & Monitoring Unit" },
    "role-hr-officer":      { title: "Dzongkhag HR Officer",              department: "Dzongkhag HR Section" },
    "role-normal-user":     { title: "Dzongkhag Administrative Assistant", department: "Dzongkhag Administration" },
    "role-admin":           { title: "Dzongkhag IT Officer",              department: "Dzongkhag ICT Unit" },
    "role-auditor":         { title: "Dzongkhag Auditor",                 department: "Audit Section" },
  },
  thromde: {
    "role-head-of-agency":  { title: "Thrompon",                          department: "Office of Thrompon" },
    "role-finance-officer": { title: "Municipal Finance Officer",         department: "Revenue & Finance Division" },
    "role-procurement":     { title: "Municipal Procurement Officer",     department: "Administration & Procurement" },
    "role-agency-staff":    { title: "Municipal Planning Officer",        department: "Urban Planning Division" },
    "role-hr-officer":      { title: "Municipal HR Officer",              department: "Administration & HR Division" },
    "role-normal-user":     { title: "Municipal Administrative Officer",  department: "Secretariat Services" },
    "role-admin":           { title: "Thromde IT Officer",                department: "Thromde ICT Unit" },
    "role-auditor":         { title: "Municipal Auditor",                 department: "Audit Section" },
  },
  constitutional: {
    "role-head-of-agency":  { title: "Chairperson / Auditor General",     department: "Office of the Chairperson" },
    "role-finance-officer": { title: "Chief Finance Officer",             department: "Finance & Accounts Section" },
    "role-procurement":     { title: "Procurement Officer",               department: "Secretariat — Procurement" },
    "role-agency-staff":    { title: "Commission Staff",                  department: "Secretariat Services" },
    "role-hr-officer":      { title: "HR & Admin Officer",                department: "Human Resource Section" },
    "role-normal-user":     { title: "Administrative Officer",            department: "Secretariat Services" },
    "role-admin":           { title: "ICT Officer",                       department: "ICT Unit" },
    "role-auditor":         { title: "Compliance Officer",                department: "Quality Assurance Division" },
  },
  autonomous: {
    "role-head-of-agency":  { title: "Director General / Executive Head", department: "Director General's Office" },
    "role-finance-officer": { title: "Chief Accounts Officer",            department: "Finance & Accounts Division" },
    "role-procurement":     { title: "Procurement Officer",               department: "Administration & Procurement" },
    "role-agency-staff":    { title: "Programme Officer",                 department: "Programme / Operations Unit" },
    "role-hr-officer":      { title: "HR & Admin Officer",                department: "Secretariat / HR Division" },
    "role-normal-user":     { title: "Administrative Officer",            department: "Administration Division" },
    "role-admin":           { title: "ICT Officer",                       department: "ICT & Systems Unit" },
    "role-auditor":         { title: "Internal Auditor",                  department: "Audit Unit" },
  },
  external: {},
};

/**
 * Get a staff position with agency-type-specific title & department.
 * Falls back to the base position if no override exists for the agency type.
 */
export function getStaffPositionForAgency(
  roleId: string,
  agencyType: AgencyType,
): StaffPosition | undefined {
  const base = BASE_STAFF_POSITIONS.find((p) => p.roleId === roleId);
  if (!base) return undefined;
  const override = POSITION_OVERRIDES[agencyType]?.[roleId];
  if (!override) return base;
  return {
    ...base,
    title: override.title ?? base.title,
    department: override.department ?? base.department,
  };
}

/**
 * Get ALL staff positions overridden for a specific agency type.
 */
export function getAllPositionsForAgencyType(agencyType: AgencyType): StaffPosition[] {
  return BASE_STAFF_POSITIONS.map((base) => {
    const override = POSITION_OVERRIDES[agencyType]?.[base.roleId];
    if (!override) return base;
    return {
      ...base,
      title: override.title ?? base.title,
      department: override.department ?? base.department,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVE AGENCY CONTEXT — persisted to localStorage.
   When a user switches their ACTIVE ROLE via the role switcher, we also
   let them pick which AGENCY they're acting on behalf of. For the DSD
   super-user, this means they can simulate being the Finance Officer at
   MoH, or the Procurement Officer at MoIT, etc.

   Default agency assignments per role (for initial load):
   ═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_AGENCY_FOR_ROLE: Record<string, string> = {
  "role-admin": "16",           /* MoF — Central IFMIS agency (project owner) */
  "role-finance-officer": "16", /* MoF — Dept of Treasury & Accounts */
  "role-procurement": "20",     /* MoH Procurement */
  "role-normal-user": "70",     /* GovTech Normal User */
  "role-agency-staff": "70",    /* GovTech Staff */
  "role-auditor": "16",         /* MoF — Audit perspective */
  "role-head-of-agency": "70",  /* GovTech DG */
  "role-public": "EXT",         /* External — Contractors & Vendors */
  "role-muster-roll": "MR",    /* Muster Roll Workers */
  "role-fi": "FI",             /* Financial Institutions */
};

const AGENCY_KEY = "ifmis_active_agency_code";

/* ── Getters / Setters ─────────────────────────────────────────────────── */

export function getAgencyByCode(code: string): Agency | undefined {
  return AGENCIES.find((a) => a.code === code);
}

export function getStaffPosition(roleId: string): StaffPosition | undefined {
  return STAFF_POSITIONS.find((p) => p.roleId === roleId);
}

export function getDefaultAgencyCode(roleId: string): string {
  return DEFAULT_AGENCY_FOR_ROLE[roleId] ?? "16";
}

export function getActiveAgencyCode(roleId: string | null): string {
  if (!roleId) return "16";
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(AGENCY_KEY);
    if (stored) return stored;
  }
  return getDefaultAgencyCode(roleId);
}

export function setActiveAgencyCode(code: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AGENCY_KEY, code);
  }
}

/**
 * Resolve the full agency + position context for the current active role.
 * Position title/department is DYNAMICALLY overridden based on the
 * active agency's type (ministry → Secretary, dzongkhag → Dzongdag, etc.)
 */
export function resolveAgencyContext(
  roleId: string | null,
): AgencyPersonaContext | null {
  if (!roleId) return null;
  const agencyCode = getActiveAgencyCode(roleId);
  const agency = getAgencyByCode(agencyCode) ?? AGENCIES[0];
  /* Use agency-type-aware position instead of static base */
  const position = getStaffPositionForAgency(roleId, agency.type);
  if (!position) return null;
  return { agency, position };
}

/* ── Demo-mode filter ──────────────────────────────────────────────────
   Only these agencies are shown in the agency picker for the focused
   expenditure demo. The full 60-agency UCoA dataset stays in AGENCIES
   for reference and data integrity but the UI narrows to these four so
   every agency has deep, realistic seed data (users, contracts,
   invoices, workflows). Add more codes here to expand the demo.
     • 16  = MoF (Central IFMIS agency — the project owner)
     • 20  = MoH (Ministry — large health expenditure portfolio)
     • 70  = GovTech (Autonomous Body — digital infrastructure)
     • EXT = External (Public users — contractors, vendors, FIs) */
export const DEMO_AGENCY_CODES: readonly string[] = [
  "16", "20", "68", "70",
  "EXT", "FI", "MR",
  /* Utility service providers — public self-service personas */
  "UP-BT", "UP-TC", "UP-BPC", "UP-STL", "UP-MUN",
];

/**
 * Get all agencies grouped by type for the agency picker.
 * In demo mode, only agencies in DEMO_AGENCY_CODES are shown.
 */
export function getAgenciesByType(): Record<AgencyType, Agency[]> {
  const groups: Record<AgencyType, Agency[]> = {
    ministry: [],
    constitutional: [],
    thromde: [],
    dzongkhag: [],
    autonomous: [],
    external: [],
  };
  for (const a of AGENCIES) {
    if (DEMO_AGENCY_CODES.length > 0 && !DEMO_AGENCY_CODES.includes(a.code)) continue;
    groups[a.type].push(a);
  }
  return groups;
}

/**
 * Get all agencies (unfiltered) grouped by type — used when admin
 * needs the complete UCoA list (e.g. RBAC user agency assignment).
 */
export function getAllAgenciesByType(): Record<AgencyType, Agency[]> {
  const groups: Record<AgencyType, Agency[]> = {
    ministry: [],
    constitutional: [],
    thromde: [],
    dzongkhag: [],
    autonomous: [],
    external: [],
  };
  for (const a of AGENCIES) {
    groups[a.type].push(a);
  }
  return groups;
}

/**
 * Get display icon for a staff position.
 */
export function getPositionEmoji(icon: string): string {
  const map: Record<string, string> = {
    gear: "⚙️",
    user: "👤",
    banknotes: "💰",
    clipboard: "📋",
    briefcase: "💼",
    magnifier: "🔍",
    stamp: "📝",
    crown: "👔",
    bank: "🏦",
    rocket: "🚀",
    globe: "🌐",
  };
  return map[icon] ?? "📌";
}

/**
 * Get display icon for an agency type.
 */
export function getAgencyTypeIcon(type: AgencyType): string {
  const map: Record<AgencyType, string> = {
    ministry: "🏛️",
    constitutional: "⚖️",
    thromde: "🏙️",
    dzongkhag: "🏔️",
    autonomous: "🎓",
    external: "🌐",
  };
  return map[type];
}

/**
 * Get display label for agency type.
 */
export function getAgencyTypeLabel(type: AgencyType): string {
  const map: Record<AgencyType, string> = {
    ministry: "Ministries",
    constitutional: "Constitutional Bodies",
    thromde: "Thromdes",
    dzongkhag: "Dzongkhags",
    autonomous: "Autonomous Bodies",
    external: "Public / Self-Service Portals",
  };
  return map[type];
}
