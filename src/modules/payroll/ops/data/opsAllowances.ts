/**
 * OPS Allowances and Deductions
 * Derived from Payroll SRS V1 Allowance Matrix and Allowance-Child_UCOA sheets
 */

export interface OpsAllowance {
  id: string;
  name: string;
  ucoaCode: string;
  type: "recurring" | "one-time" | "conditional";
  frequency: "monthly" | "annual" | "one-time";
  calcMethod: "fixed" | "pct-basic" | "pct-gross" | "slab" | "formula";
  /** Fixed amount or percentage value (0 if slab/formula) */
  value: number;
  /** Slab data if calcMethod is "slab" */
  slabRules?: { label: string; value: number }[];
  /** Which OPS categories this applies to (empty = all) */
  applicableCategories: string[];
  /** Which agencies this applies to (empty = all) */
  applicableAgencies: string[];
  /** Description from SRS */
  description: string;
  /** Business rule text from SRS */
  businessRule: string;
  active: boolean;
}

export interface OpsDeduction {
  id: string;
  name: string;
  ucoaCode: string;
  category: "statutory" | "voluntary" | "other";
  calcMethod: "fixed" | "pct-basic" | "pct-gross" | "slab" | "formula";
  value: number;
  slabRules?: { label: string; value: number }[];
  mandatory: boolean;
  remitTo: string;
}

/**
 * OPS Allowances (48+ entries)
 * All amounts in Bhutanese Ngultrum (Nu)
 */
export const OPS_ALLOWANCES: OpsAllowance[] = [
  {
    id: "ALW-001",
    name: "Leave Encashment",
    ucoaCode: "2120101",
    type: "one-time",
    frequency: "annual",
    calcMethod: "formula",
    value: 0,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Encashment of unused annual leave at the end of leave period",
    businessRule:
      "Calculated as (basic salary x days of unused leave) / 30. Paid once per fiscal year at the end of leave period.",
    active: true
  },
  {
    id: "ALW-002",
    name: "Leave Travel Concession",
    ucoaCode: "2120102",
    type: "one-time",
    frequency: "annual",
    calcMethod: "formula",
    value: 0,
    applicableCategories: [],
    applicableAgencies: [],
    description:
      "Travel concession for annual leave in Bhutan or travel leave for abroad",
    businessRule:
      "Reimbursement of actual travel expenses up to prescribed limits based on leave type and destination.",
    active: true
  },
  {
    id: "ALW-004",
    name: "Uniform Allowance",
    ucoaCode: "2120104",
    type: "recurring",
    frequency: "annual",
    calcMethod: "fixed",
    value: 2000,
    applicableCategories: ["rbp", "rbp-civil"],
    applicableAgencies: [],
    description: "Annual allowance for purchase and maintenance of uniforms",
    businessRule: "Fixed amount of Nu 2,000 per annum, paid once per fiscal year to uniformed personnel.",
    active: true
  },
  {
    id: "ALW-005",
    name: "Night Duty Allowance",
    ucoaCode: "2120105",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 10,
    applicableCategories: ["rbp", "rbp-civil"],
    applicableAgencies: [],
    description: "10% of basic salary for duty performed between 2100hrs to 0600hrs",
    businessRule:
      "10% of basic salary payable for night duty performed. Applicable only to those who actually perform night duty.",
    active: true
  },
  {
    id: "ALW-006",
    name: "Difficulty Area Allowance",
    ucoaCode: "2120106",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 2500,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Monthly allowance for personnel posted in difficult/remote areas",
    businessRule:
      "Fixed monthly allowance of Nu 2,500 for personnel posted in designated difficult areas per DoP list.",
    active: true
  },
  {
    id: "ALW-007",
    name: "High Altitude Allowance",
    ucoaCode: "2120107",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 3000,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Monthly allowance for personnel posted above 3,000m altitude",
    businessRule:
      "Fixed monthly allowance of Nu 3,000 for personnel posted in locations above 3,000m elevation.",
    active: true
  },
  {
    id: "ALW-008",
    name: "Overtime Allowance",
    ucoaCode: "2120108",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "formula",
    value: 0,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Compensation for overtime work beyond standard hours",
    businessRule:
      "Calculated as (hourly rate x number of overtime hours). Hourly rate = Basic salary / 20 days / 8 hours.",
    active: true
  },
  {
    id: "ALW-009",
    name: "Foreign Service Allowance",
    ucoaCode: "2120109",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 25,
    applicableCategories: ["foreign-services"],
    applicableAgencies: [],
    description: "25% of basic salary for personnel posted abroad",
    businessRule: "25% of basic salary payable monthly to diplomatic personnel posted at missions abroad.",
    active: true
  },
  {
    id: "ALW-010",
    name: "Contract Allowance",
    ucoaCode: "2120110",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 1500,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Monthly allowance for contract employees",
    businessRule:
      "Fixed monthly allowance of Nu 1,500 for employees engaged on contract basis, subject to contract terms.",
    active: true
  },
  {
    id: "ALW-011",
    name: "Radiation Allowance",
    ucoaCode: "2120111",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 5000,
    applicableCategories: [],
    applicableAgencies: ["20"],
    description: "Monthly allowance for personnel exposed to radiation",
    businessRule:
      "Fixed monthly allowance of Nu 5,000 for medical personnel exposed to X-ray and radiation in NMS facilities.",
    active: true
  },
  {
    id: "ALW-018",
    name: "Foreign Allowance",
    ucoaCode: "2120118",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 10000,
    applicableCategories: ["foreign-local-recruit"],
    applicableAgencies: [],
    description: "Foreign posting allowance for local recruits",
    businessRule: "Fixed monthly allowance for local staff recruited and posted in foreign missions.",
    active: true
  },
  {
    id: "ALW-019",
    name: "Children Education Allowance",
    ucoaCode: "2120119",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 5000,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Education allowance for dependent children",
    businessRule:
      "Fixed monthly allowance of Nu 5,000 per child for education purposes, max 2 children per employee.",
    active: true
  },
  {
    id: "ALW-020",
    name: "RBP Allowance",
    ucoaCode: "2120120",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 0,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Umbrella code for all RBP-specific allowances",
    businessRule: "Parent code for RBP operational allowances (Armed Force Special, Kit Maintenance, etc.)",
    active: true
  },
  {
    id: "ALW-121",
    name: "Sitting Fee",
    ucoaCode: "2120121",
    type: "one-time",
    frequency: "one-time",
    calcMethod: "fixed",
    value: 500,
    applicableCategories: ["parliament"],
    applicableAgencies: [],
    description: "Per-meeting fee for Parliamentary committees and meetings",
    businessRule: "Fixed sitting fee of Nu 500 per meeting for members attending parliamentary committees.",
    active: true
  },
  {
    id: "ALW-122",
    name: "Honorarium",
    ucoaCode: "2120122",
    type: "one-time",
    frequency: "one-time",
    calcMethod: "fixed",
    value: 0,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Discretionary honorarium for special tasks or roles",
    businessRule: "Variable honorarium amount determined on case-by-case basis for special duties.",
    active: true
  },
  {
    id: "ALW-125",
    name: "Professional Allowance",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 5,
    applicableCategories: [],
    applicableAgencies: ["20"],
    description: "Professional allowance for specialized technical staff",
    businessRule: "5% of basic salary for medical and specialized professionals in health sector.",
    active: true
  },
  {
    id: "ALW-126",
    name: "One-off 5% Indexation",
    ucoaCode: "2120126",
    type: "one-time",
    frequency: "one-time",
    calcMethod: "pct-basic",
    value: 5,
    applicableCategories: [],
    applicableAgencies: [],
    description: "One-time 5% salary indexation payment",
    businessRule:
      "Lump sum payment equivalent to 5% of current basic salary, disbursed once on policy effective date.",
    active: true
  },
  {
    id: "ALW-127",
    name: "One-off Fixed Payment",
    ucoaCode: "2120127",
    type: "one-time",
    frequency: "one-time",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "P1-P4", value: 1000 },
      { label: "P5-S4", value: 1500 },
      { label: "S5 and below", value: 2000 }
    ],
    applicableCategories: [],
    applicableAgencies: [],
    description: "Ad-hoc fixed payment as per government directive",
    businessRule: "Slab-based fixed payment: P1-P4=Nu.1000, P5-S4=Nu.1500, S5 and below=Nu.2000, paid once.",
    active: true
  },

  // RBP-specific allowances with unique sub-codes
  {
    id: "ALW-RBP-001",
    name: "Armed Force Special Allowance",
    ucoaCode: "212012001",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 15,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Special allowance for armed forces personnel on operational duty",
    businessRule: "15% of basic salary for personnel on active operations or special postings.",
    active: true
  },
  {
    id: "ALW-RBP-002",
    name: "Kit Maintenance Allowance",
    ucoaCode: "212012002",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 1500,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for maintenance of equipment and kit",
    businessRule: "Fixed monthly allowance of Nu 1,500 for personnel responsible for kit maintenance.",
    active: true
  },
  {
    id: "ALW-RBP-003",
    name: "Hospitality Allowance",
    ucoaCode: "212012003",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 1000,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for hospitality and accommodation while on duty",
    businessRule: "Fixed monthly allowance of Nu 1,000 for hospitality purposes during postings.",
    active: true
  },
  {
    id: "ALW-RBP-004",
    name: "Orderly Allowance",
    ucoaCode: "212012004",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 800,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for orderlies attached to senior officials",
    businessRule: "Fixed monthly allowance of Nu 800 for orderlies serving senior officers.",
    active: true
  },
  {
    id: "ALW-RBP-005",
    name: "DCHU Allowance",
    ucoaCode: "212012005",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 500,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Disaster Contingency Handling Unit allowance",
    businessRule: "Fixed monthly allowance of Nu 500 for DCHU personnel.",
    active: true
  },
  {
    id: "ALW-RBP-006",
    name: "Dog Handling Allowance",
    ucoaCode: "212012006",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 2000,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for dog handler personnel",
    businessRule: "Fixed monthly allowance of Nu 2,000 for police personnel handling service dogs.",
    active: true
  },
  {
    id: "ALW-RBP-007",
    name: "Medal Allowance",
    ucoaCode: "212012007",
    type: "one-time",
    frequency: "one-time",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "Gallantry Medal", value: 15000 },
      { label: "Service Medal", value: 10000 },
      { label: "Long Service Medal", value: 5000 }
    ],
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Honorific allowance for medal recipients",
    businessRule: "One-time award based on medal category: Gallantry=Nu.15,000, Service=Nu.10,000, Long Service=Nu.5,000.",
    active: true
  },
  {
    id: "ALW-RBP-008",
    name: "Band Allowance",
    ucoaCode: "212012008",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 150,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for police band members",
    businessRule: "Fixed monthly allowance of Nu 150 for police band personnel.",
    active: true
  },
  {
    id: "ALW-RBP-009",
    name: "Vegetable Allowance",
    ucoaCode: "212012009",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "Officers", value: 1056 },
      { label: "Other Ranks (ORs)", value: 954 }
    ],
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for purchase of fresh vegetables",
    businessRule: "Fixed monthly allowance: Officers=Nu.1,056, ORs=Nu.954 for personnel in remote postings.",
    active: true
  },
  {
    id: "ALW-RBP-010",
    name: "City Compensatory Allowance",
    ucoaCode: "212012010",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "Officers", value: 600 },
      { label: "Other Ranks (ORs)", value: 400 }
    ],
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Compensatory allowance for high cost of living in cities",
    businessRule: "Fixed monthly allowance for capital city postings: Officers=Nu.600, ORs=Nu.400.",
    active: true
  },
  {
    id: "ALW-RBP-011",
    name: "Occupational Hazard Allowance",
    ucoaCode: "212012011",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 500,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for personnel in hazardous duty positions",
    businessRule: "Fixed monthly allowance of Nu 500 for personnel exposed to occupational hazards.",
    active: true
  },
  {
    id: "ALW-RBP-012",
    name: "Instructor Allowance",
    ucoaCode: "212012012",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 10,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for training instructors",
    businessRule: "10% of basic salary for officers conducting training and instruction.",
    active: true
  },
  {
    id: "ALW-RBP-013",
    name: "Border Allowance",
    ucoaCode: "212012013",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 550,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for personnel on border security operations",
    businessRule: "Fixed monthly allowance of Nu 550 for border patrol and security personnel.",
    active: true
  },
  {
    id: "ALW-RBP-014",
    name: "High Altitude RBA",
    ucoaCode: "212012014",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 3000,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "RBP high altitude allowance for elevated postings",
    businessRule: "Fixed monthly allowance of Nu 3,000 for RBP personnel posted above 3,000m.",
    active: true
  },
  {
    id: "ALW-RBP-015",
    name: "Difficulty Area RBA",
    ucoaCode: "212012015",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 2500,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "RBP difficulty area allowance for remote postings",
    businessRule: "Fixed monthly allowance of Nu 2,500 for RBP personnel in difficult areas.",
    active: true
  },
  {
    id: "ALW-RBP-016",
    name: "Guard Mounting Allowance",
    ucoaCode: "212012016",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 1500,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Allowance for guard and security mounting duties",
    businessRule: "Fixed monthly allowance of Nu 1,500 for personnel on guard mounting duties.",
    active: true
  },
  {
    id: "ALW-RBP-017",
    name: "ADC to His Majesty",
    ucoaCode: "212012017",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 1400,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Aide-de-Camp allowance to His Majesty",
    businessRule: "Fixed monthly allowance of Nu 1,400 for personnel serving as ADC to His Majesty.",
    active: true
  },

  // Additional missing allowances
  {
    id: "ALW-128",
    name: "Professional Allowance (Teaching)",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "S5-ES1 (Teachers/Trainers)", value: 0 }
    ],
    applicableCategories: [],
    applicableAgencies: ["MOESD", "RIM", "RUB", "KGUMSB", "JSWL"],
    description: "Professional allowance for teaching staff",
    businessRule: "Position-level based allowance for Teachers and Trainers in education agencies (S5-ES1).",
    active: true
  },
  {
    id: "ALW-129",
    name: "Professional Allowance (RAA/Internal Audit)",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 20,
    applicableCategories: [],
    applicableAgencies: ["RAA"],
    description: "Professional allowance for RAA and internal auditors",
    businessRule: "20% of minimum basic pay for RAA and internal auditors in positions O4-EX/ES-1.",
    active: true
  },
  {
    id: "ALW-130",
    name: "Professional Allowance (ACC Investigation)",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 45,
    applicableCategories: [],
    applicableAgencies: ["ACC"],
    description: "Professional allowance for ACC investigation officers",
    businessRule: "45% of minimum basic pay for investigation officers in ACC positions O4-EX/ES-1.",
    active: true
  },
  {
    id: "ALW-131",
    name: "Professional Allowance (ACC Others)",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 20,
    applicableCategories: [],
    applicableAgencies: ["ACC"],
    description: "Professional allowance for ACC support staff",
    businessRule: "20% of minimum basic pay for ACC support staff in positions ESP-EX/ES-1.",
    active: true
  },
  {
    id: "ALW-132",
    name: "Professional Allowance (Aviation)",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 0,
    applicableCategories: [],
    applicableAgencies: ["Navigation and aerodrome services"],
    description: "Professional allowance for aviation personnel",
    businessRule: "Fixed lump sum at minimum pay scale for navigation and aerodrome services personnel.",
    active: true
  },
  {
    id: "ALW-133",
    name: "Clinical Allowance",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "20% of min pay", value: 0 },
      { label: "30% of min pay", value: 0 }
    ],
    applicableCategories: [],
    applicableAgencies: ["Health", "KGUMSB"],
    description: "Clinical allowance for health professionals",
    businessRule: "20-30% of minimum pay for health and KGUMSB clinical staff based on position level.",
    active: true
  },
  {
    id: "ALW-134",
    name: "Core Faculty Allowance",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "25% of min pay", value: 0 },
      { label: "35% of min pay", value: 0 }
    ],
    applicableCategories: [],
    applicableAgencies: ["KGUMSB"],
    description: "Core faculty allowance at KGUMSB",
    businessRule: "25-35% of minimum pay for core faculty members at KGUMSB based on position level.",
    active: true
  },
  {
    id: "ALW-135",
    name: "DY Dean Allowance",
    ucoaCode: "2120125",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 5000,
    applicableCategories: [],
    applicableAgencies: ["KGUMSB"],
    description: "Deputy Dean allowance at KGUMSB",
    businessRule: "Fixed monthly allowance of Nu 5,000 for Deputy Dean positions at KGUMSB.",
    active: true
  },
  {
    id: "ALW-136",
    name: "Chief Title Allowance",
    ucoaCode: "212012001",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 15000,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Chief of Police title allowance",
    businessRule: "Fixed monthly allowance of Nu 15,000 for Chief of Police position only in RBP.",
    active: true
  },
  {
    id: "ALW-137",
    name: "Higher Post Benefits",
    ucoaCode: "2120137",
    type: "conditional",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 0,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Benefits when lower rank assumes higher designation",
    businessRule: "Payable when employee assumes higher designation temporarily for more than 6 months continuously.",
    active: true
  },
  {
    id: "ALW-138",
    name: "Technical and Trade Allowance",
    ucoaCode: "2120138",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "pct-basic",
    value: 15,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Technical and Trade allowance at par with RBA/RBG",
    businessRule: "Allowance for personnel with technical and trade skills at par with Armed Force Basic Allowance.",
    active: true
  },
  {
    id: "ALW-139",
    name: "Soelra on Promotion",
    ucoaCode: "2120139",
    type: "one-time",
    frequency: "one-time",
    calcMethod: "pct-basic",
    value: 100,
    applicableCategories: ["rbp"],
    applicableAgencies: [],
    description: "Soelra (gratuity) on promotion",
    businessRule: "One month of basic pay granted as promotion gratuity for personnel promoted to Lieutenant and above ranks.",
    active: true
  },
  {
    id: "ALW-140",
    name: "Patang Allowance",
    ucoaCode: "2120140",
    type: "recurring",
    frequency: "monthly",
    calcMethod: "fixed",
    value: 0,
    applicableCategories: [],
    applicableAgencies: [],
    description: "Patang allowance (discontinued)",
    businessRule: "Discontinued allowance. Kept for historical record and legacy payroll processing.",
    active: false
  }
];

/**
 * OPS Deductions (Statutory and Voluntary)
 * All amounts in Bhutanese Ngultrum (Nu)
 */
export const OPS_DEDUCTIONS: OpsDeduction[] = [
  {
    id: "DED-001",
    name: "Provident Fund (PF)",
    ucoaCode: "22101",
    category: "statutory",
    calcMethod: "pct-basic",
    value: 10,
    mandatory: true,
    remitTo: "NPPF"
  },
  {
    id: "DED-002",
    name: "Group Insurance Scheme (GIS)",
    ucoaCode: "22102",
    category: "statutory",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "Up to 20,000", value: 50 },
      { label: "20,001 to 40,000", value: 100 },
      { label: "40,001 to 60,000", value: 150 },
      { label: "Above 60,000", value: 200 }
    ],
    mandatory: true,
    remitTo: "RICB"
  },
  {
    id: "DED-003",
    name: "Health Contribution (HC)",
    ucoaCode: "22103",
    category: "statutory",
    calcMethod: "pct-gross",
    value: 1,
    mandatory: true,
    remitTo: "DRC"
  },
  {
    id: "DED-004",
    name: "Tax Deducted at Source (TDS)",
    ucoaCode: "22104",
    category: "statutory",
    calcMethod: "slab",
    value: 0,
    slabRules: [
      { label: "Up to 25,000", value: 0 },
      { label: "25,001 to 32,500", value: 5 },
      { label: "32,501 to 40,000", value: 10 },
      { label: "Above 40,000", value: 15 }
    ],
    mandatory: true,
    remitTo: "DRC"
  },
  {
    id: "DED-005",
    name: "Civil Service Welfare Scheme (CSWS)",
    ucoaCode: "22105",
    category: "voluntary",
    calcMethod: "fixed",
    value: 150,
    mandatory: false,
    remitTo: "CSWS"
  }
];
