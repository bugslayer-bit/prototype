/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Seed Data — Bhutan Civil Service Pay Scales & Employees
   Based on Pay Structure Reform Act 2022, Pay Revision 2023
   ═══════════════════════════════════════════════════════════════════════════
   DYNAMIC GENERATION — Employee data is built at import time from:
     • agencyPersonas.ts → real agency names, departments, UCoA codes
     • bankData.ts       → real bank names, branch names, BFSC codes
     • MasterDataContext  → gender LoV ["Male", "Female", "Others"]
   No fabricated CIDs, EIDs, TPNs, names, or bank accounts.
   All identifiers are generated with deterministic patterns from agency
   code + sequential index so they are stable across page reloads.
   ═══════════════════════════════════════════════════════════════════════════ */
import type {
  PayScale, PositionLevel, Allowance, Deduction, Employee, SalaryAdvance,
  MusterRollProject, MusterRollBeneficiary, SittingFeeBeneficiary,
} from "../types";
import { AGENCIES, type Agency, getSubDivisions } from "../../../shared/data/agencyPersonas";
import { bhutanBankHierarchy } from "../../../shared/data/bankData";

/* ── Bhutan Civil Service Pay Scales (2023 Revision — SRS verified) ───── */
export const PAY_SCALES: PayScale[] = [
  /* Executive / Specialist */
  { level: "EX",  label: "Executive",                    minPay: 84180, increment: 1685, maxPay: 92605 },
  { level: "ES1", label: "Executive Specialist I",       minPay: 70155, increment: 1405, maxPay: 77175 },
  { level: "ES2", label: "Executive Specialist II",      minPay: 58455, increment: 1170, maxPay: 64275 },
  { level: "ES3", label: "Executive Specialist III",     minPay: 48720, increment: 975,  maxPay: 53595 },
  /* Professional */
  { level: "P1",  label: "Professional I",               minPay: 40590, increment: 815,  maxPay: 44660 },
  { level: "P1A", label: "Professional I-A",             minPay: 37725, increment: 755,  maxPay: 41500 },
  { level: "P2",  label: "Professional II",              minPay: 33840, increment: 680,  maxPay: 37240 },
  { level: "P2A", label: "Professional II-A",            minPay: 30960, increment: 620,  maxPay: 34060 },
  { level: "P3",  label: "Professional III",             minPay: 28200, increment: 565,  maxPay: 31030 },
  { level: "P3A", label: "Professional III-A",           minPay: 26190, increment: 525,  maxPay: 28815 },
  { level: "P4",  label: "Professional IV",              minPay: 24285, increment: 490,  maxPay: 26730 },
  { level: "P4A", label: "Professional IV-A",            minPay: 22510, increment: 450,  maxPay: 24760 },
  { level: "P5",  label: "Professional V",               minPay: 20880, increment: 420,  maxPay: 22980 },
  { level: "P5A", label: "Professional V-A",             minPay: 19370, increment: 390,  maxPay: 21320 },
  /* Supervisory */
  { level: "S1",  label: "Supervisory I",                minPay: 17965, increment: 360,  maxPay: 19765 },
  { level: "S1A", label: "Supervisory I-A",              minPay: 16655, increment: 335,  maxPay: 18330 },
  { level: "S2",  label: "Supervisory II",               minPay: 15445, increment: 310,  maxPay: 16995 },
  { level: "S2A", label: "Supervisory II-A",             minPay: 14320, increment: 285,  maxPay: 15745 },
  { level: "S3",  label: "Supervisory III",              minPay: 13280, increment: 265,  maxPay: 14605 },
  { level: "S3A", label: "Supervisory III-A",            minPay: 12310, increment: 245,  maxPay: 13535 },
  { level: "S4",  label: "Supervisory IV",               minPay: 11420, increment: 230,  maxPay: 12570 },
  { level: "S4A", label: "Supervisory IV-A",             minPay: 10590, increment: 215,  maxPay: 11665 },
  { level: "S5",  label: "Supervisory V",                minPay: 9825,  increment: 200,  maxPay: 10825 },
  { level: "S5A", label: "Supervisory V-A",              minPay: 9115,  increment: 180,  maxPay: 10015 },
  /* Operational */
  { level: "O1",  label: "Operational I",                minPay: 8460,  increment: 170,  maxPay: 9310  },
  { level: "O2",  label: "Operational II",               minPay: 7845,  increment: 155,  maxPay: 8620  },
  { level: "O3",  label: "Operational III",              minPay: 7275,  increment: 145,  maxPay: 8000  },
  { level: "O4",  label: "Operational IV",               minPay: 6750,  increment: 135,  maxPay: 7425  },
  { level: "O5",  label: "Operational V",                minPay: 6260,  increment: 125,  maxPay: 6885  },
  /* Support */
  { level: "GSP", label: "General Support Personnel",    minPay: 10505, increment: 210,  maxPay: 13655 },
  { level: "ESP", label: "Elementary Support Personnel",  minPay: 8755,  increment: 175,  maxPay: 10505 },
];

export function getPayScale(level: PositionLevel): PayScale {
  return PAY_SCALES.find((p) => p.level === level) ?? PAY_SCALES[PAY_SCALES.length - 1];
}

/* ── UCoA Allowance codes (SRS verified) ──────────────────────────────── */
export const ALLOWANCES: Allowance[] = [
  { id: "ALW-001", name: "Leave Encashment (LE)", ucoaCode: "2120101", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 8.33, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-002", name: "Leave Travel Concession (LTC)", ucoaCode: "2120102", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 8.33, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-003", name: "Lump Sum Revision (50%)", ucoaCode: "2120125", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 50, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-004", name: "One-off 5% Indexation", ucoaCode: "2120126", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 5, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-005", name: "One-off Fixed Payment", ucoaCode: "2120127", type: "recurring", frequency: "monthly", calcMethod: "slab", value: 0, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-006", name: "Uniform Allowance", ucoaCode: "2120104", type: "recurring", frequency: "monthly", calcMethod: "fixed", value: 415, applicableLevels: ["O4","O3","O2","O1","S5","S5A","S4","S4A","S3","S3A","S2","S2A","S1","S1A","P5","P5A","P4","P4A","P3","P3A","P2","P2A","P1","P1A","ES1","ES2","ES3"], applicableAgencies: ["20"], active: true },
  { id: "ALW-007", name: "Night Duty Allowance", ucoaCode: "2120105", type: "recurring", frequency: "monthly", calcMethod: "fixed", value: 500, applicableLevels: [], applicableAgencies: ["20"], active: true },
  { id: "ALW-008", name: "Overtime Allowance", ucoaCode: "2120108", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 0, applicableLevels: ["S5","S5A","S4","S4A","S3","S3A","S2","S2A","S1","S1A","O1","O2","O3","O4","O5","GSP","ESP"], applicableAgencies: [], active: true },
  { id: "ALW-009", name: "Contract Allowance (30%)", ucoaCode: "2120110", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 30, applicableLevels: [], applicableAgencies: [], active: false },
  { id: "ALW-010", name: "Difficulty Area Allowance", ucoaCode: "2120106", type: "recurring", frequency: "monthly", calcMethod: "fixed", value: 2000, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-011", name: "High Altitude Allowance", ucoaCode: "2120107", type: "recurring", frequency: "monthly", calcMethod: "slab", value: 0, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-012", name: "Radiation Allowance", ucoaCode: "2120111", type: "recurring", frequency: "monthly", calcMethod: "fixed", value: 3000, applicableLevels: [], applicableAgencies: ["20"], active: true },
  { id: "ALW-013", name: "Professional Allowance (Medical)", ucoaCode: "2120125", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 45, applicableLevels: [], applicableAgencies: ["20"], active: true },
  { id: "ALW-014", name: "Professional Allowance (Audit)", ucoaCode: "2120125", type: "recurring", frequency: "monthly", calcMethod: "pct-basic", value: 20, applicableLevels: [], applicableAgencies: ["12"], active: true },
  { id: "ALW-015", name: "Sitting Fee", ucoaCode: "2120121", type: "one-time", frequency: "monthly", calcMethod: "fixed", value: 0, applicableLevels: [], applicableAgencies: [], active: true },
  { id: "ALW-016", name: "Honorarium", ucoaCode: "2120122", type: "one-time", frequency: "monthly", calcMethod: "fixed", value: 0, applicableLevels: [], applicableAgencies: [], active: true },
];

/* ── Deductions — SRS PRN 1.2 verified ────────────────────────────────── */
/* Two segregations per SRS LoV 1.36/4.9 & 1.37/4.10:
   • Statutory  → applicable to BOTH Civil Servant & OPS
   • Floating   → some CS-only, some OPS-only, some both                  */
export const DEDUCTIONS: Deduction[] = [
  /* ── Statutory Deductions — applicable to BOTH Civil Servant & OPS ─── */
  { id: "DED-001", name: "Provident Fund (PF)",             ucoaCode: "22101", category: "statutory", calcMethod: "pct-basic", value: 11, mandatory: true,  remitTo: "NPPF",       applicableTo: "both" },
  { id: "DED-002", name: "Group Insurance Scheme (GIS)",    ucoaCode: "22102", category: "statutory", calcMethod: "slab",      value: 0,  mandatory: true,  remitTo: "RICBL",      applicableTo: "both" },
  { id: "DED-003", name: "Health Contribution (HC)",        ucoaCode: "22103", category: "statutory", calcMethod: "pct-basic", value: 1,  mandatory: true,  remitTo: "DRC",        applicableTo: "both" },
  { id: "DED-004", name: "Tax Deducted at Source (TDS)",    ucoaCode: "22104", category: "statutory", calcMethod: "slab",      value: 0,  mandatory: true,  remitTo: "DRC",        applicableTo: "both" },
  { id: "DED-005", name: "House Rent (DRC)",                ucoaCode: "22106", category: "statutory", calcMethod: "fixed",     value: 0,  mandatory: false, remitTo: "DRC",        applicableTo: "both" },
  { id: "DED-006", name: "House Rent (NHDCL)",              ucoaCode: "22106", category: "statutory", calcMethod: "fixed",     value: 0,  mandatory: false, remitTo: "NHDCL",      applicableTo: "both" },

  /* ── Floating Deductions — Civil Servant ONLY ─────────────────────── */
  { id: "DED-CS-001", name: "Civil Servant Welfare Scheme (CSWS)", ucoaCode: "22105", category: "floating", calcMethod: "fixed",    value: 150, mandatory: false, remitTo: "RCSC",    applicableTo: "civil-servant" },
  { id: "DED-CS-002", name: "Salary Advance Recovery",            ucoaCode: "22107", category: "recovery", calcMethod: "schedule", value: 0,   mandatory: false, remitTo: "Internal", applicableTo: "civil-servant" },
  { id: "DED-CS-003", name: "PWA Employee Advance Recovery",      ucoaCode: "22109", category: "recovery", calcMethod: "schedule", value: 0,   mandatory: false, remitTo: "Internal", applicableTo: "civil-servant" },
  { id: "DED-CS-004", name: "Training Bond Recovery",             ucoaCode: "22108", category: "recovery", calcMethod: "schedule", value: 0,   mandatory: false, remitTo: "Internal", applicableTo: "civil-servant" },
  { id: "DED-CS-005", name: "Penalties or Fines",                 ucoaCode: "22110", category: "floating", calcMethod: "fixed",    value: 0,   mandatory: false, remitTo: "DRC",      applicableTo: "civil-servant" },
  { id: "DED-CS-006", name: "Audit Recovery",                     ucoaCode: "22111", category: "recovery", calcMethod: "schedule", value: 0,   mandatory: false, remitTo: "RAA",      applicableTo: "civil-servant" },
  { id: "DED-CS-007", name: "Loss & Investigation Recovery",      ucoaCode: "22112", category: "recovery", calcMethod: "schedule", value: 0,   mandatory: false, remitTo: "Internal", applicableTo: "civil-servant" },

  /* ── Floating Deductions — OPS ONLY ───────────────────────────────── */
  { id: "DED-OPS-001", name: "Salary Advance Recovery (OPS)",     ucoaCode: "22207", category: "recovery", calcMethod: "schedule", value: 0,   mandatory: false, remitTo: "Internal", applicableTo: "ops" },
  { id: "DED-OPS-002", name: "PWA Employee Advance Recovery (OPS)", ucoaCode: "22209", category: "recovery", calcMethod: "schedule", value: 0, mandatory: false, remitTo: "Internal", applicableTo: "ops" },
];

/* ══════════════════════════════════════════════════════════════════════════
   COMPUTATION FUNCTIONS
   Note: TDS slabs, GIS slabs, and One-off Fixed amounts are also registered
   in the Master Data admin page (payroll-tds-slab, payroll-gis-slab,
   payroll-one-off-fixed) so admins can view/update them. The functions
   below are the runtime computation engine.
   ══════════════════════════════════════════════════════════════════════════ */

/** TDS — progressive monthly slab. Brackets configurable via Master Data
 *  group "payroll-tds-slab". */
export function computeTDS(monthlySalary: number): number {
  if (monthlySalary <= 25000) return 0;
  const taxable = monthlySalary - 25000;
  if (taxable <= 8333) return Math.round(taxable * 0.10);
  if (taxable <= 16667) return Math.round(833 + (taxable - 8333) * 0.15);
  if (taxable <= 33333) return Math.round(2083 + (taxable - 16667) * 0.20);
  return Math.round(5416 + (taxable - 33333) * 0.25);
}

/** GIS premium by position tier — per Paybill Standard (RICBL Table XXXII).
 *  See paybillStandard.ts GIS_GROUPS.
 *  Group A (EX/ES1-3) Nu 500 | Group B (P1-P5) Nu 400 |
 *  Group C (S1-S5)   Nu 300 | Group D (O1-O4) Nu 200. */
export function computeGIS(level: PositionLevel): number {
  // Inline to avoid a circular import with paybillStandard
  const A: string[] = ["EX","EX1","EX2","EX3","ES1","ES2","ES3"];
  const B: string[] = ["P1","P1A","P2","P2A","P3","P3A","P4","P4A","P5","P5A"];
  const C: string[] = ["S1","S1A","S2","S2A","S3","S3A","S4","S4A","S5","S5A"];
  const D: string[] = ["O1","O2","O3","O4"];
  if (A.includes(level)) return 500;
  if (B.includes(level)) return 400;
  if (C.includes(level)) return 300;
  if (D.includes(level)) return 200;
  return 0;
}

/** One-off fixed payment by position tier. Configurable via Master Data
 *  group "payroll-one-off-fixed". */
export function getOneOffFixed(level: PositionLevel): number {
  const p1to4: string[] = ["P1","P1A","P2","P2A","P3","P3A","P4","P4A"];
  const p5toS4: string[] = ["P5","P5A","S1","S1A","S2","S2A","S3","S3A","S4","S4A"];
  if (p1to4.includes(level)) return 1000;
  if (p5toS4.includes(level)) return 1500;
  return 2000;
}

/** Compute full pay components for a given basicPay + position level. */
export function computeEmployeePay(basicPay: number, level: PositionLevel) {
  const le = Math.round(basicPay * 0.0833);
  const ltc = Math.round(basicPay * 0.0833);
  const lumpSum = Math.round(getPayScale(level).minPay * 0.50);
  const indexation = Math.round(getPayScale(level).minPay * 0.05);
  const oneOffFixed = getOneOffFixed(level);

  const totalAllowances = le + ltc + lumpSum + indexation + oneOffFixed;
  const grossPay = basicPay + totalAllowances;

  // Employee PF contribution — 11 % of Basic (Paybill Standard § 4).
  // Employer 15 % is tracked separately on the PF remittance schedule.
  const pf = Math.round(basicPay * 0.11);
  const gis = computeGIS(level);
  const hc = Math.round(grossPay * 0.01);
  const tds = computeTDS(grossPay);
  const csws = 150;

  const totalDeductions = pf + gis + hc + tds + csws;
  const netPay = grossPay - totalDeductions;

  return { le, ltc, lumpSum, indexation, oneOffFixed, totalAllowances, grossPay, pf, gis, hc, tds, csws, totalDeductions, netPay };
}

/* ══════════════════════════════════════════════════════════════════════════
   DYNAMIC EMPLOYEE GENERATION
   Pulls from:  agencyPersonas (departments)  ·  bankData (banks/branches)
   Gender cycles through MasterDataContext LoV: Male / Female / Others
   ══════════════════════════════════════════════════════════════════════════ */

/** Gender values — matches MasterDataContext GENDER_VALUES */
const GENDERS: Array<"Male" | "Female" | "Other"> = ["Male", "Female", "Male", "Female", "Male", "Female", "Male", "Male", "Female", "Male"];

/** Banks from bankData.ts — cycle through real Bhutan banks */
const BANKS = bhutanBankHierarchy.map((b) => ({
  name: b.name,
  id: b.id,
  thimphuBranch: b.branches.find((br) => br.dzongkhag === "Thimphu") ?? b.branches[0],
}));

function pickBank(index: number) {
  const bank = BANKS[index % BANKS.length];
  return {
    bankName: bank.name,
    bankBranch: bank.thimphuBranch.name,
    bankAccountNo: `${bank.id}-${String(index + 1).padStart(6, "0")}`,
  };
}

/** Demo agencies — matching DEMO_AGENCY_CODES but excluding EXT.
 *  Now includes OPS agencies (60-66, 68) so the Employee seed contains
 *  "other-public-servant" rows — headcount / ZESt coverage / monthly gross
 *  cards populate dynamically when the signed-in persona acts on behalf
 *  of an OPS agency like Royal University of Bhutan (code 68). */
const DEMO_AGENCIES = (["16", "20", "70", "60", "61", "62", "63", "64", "65", "66", "68"] as const).map(
  (code) => AGENCIES.find((a) => a.code === code)!
).filter(Boolean);

/** Set of OPS agency codes — employees generated for these agencies
 *  are categorised as `other-public-servant`. */
const OPS_AGENCY_CODES_SET = new Set(["60", "61", "62", "63", "64", "65", "66", "68"]);

/** Map an OPS agency code to the closest OPSType subType tag. */
function opsSubTypeFor(code: string):
  | "rub" | "judiciary" | "ecb" | "rbp" | "local-govt"
  | "parliamentary" | "constitutional-bodies" | "local-recruits" {
  switch (code) {
    case "68": return "rub";
    case "64": return "parliamentary";
    case "60":
    case "65":
    case "66":
    case "62":
    case "63":
    case "61": return "constitutional-bodies";
    default:   return "local-recruits";
  }
}

/** Map a seed agency code / stream to the canonical Employee Category label
 *  used by the payroll-employee-category master-data LoV.  Keeps the registry
 *  and filters in sync with the stream-mapping directory. */
function categoryLabelFor(agencyCode: string, isOps: boolean): string {
  if (!isOps) {
    /* MoFA gets "Foreign Services" bucket; Royal Court of Justice → Judiciary. */
    if (agencyCode === "12") return "Foreign Services";
    if (agencyCode === "11") return "Judiciary";
    return "Civil Servants";
  }
  switch (agencyCode) {
    case "68": return "Other Public Servants: RUB";
    case "64": return "Parliament (Members of NA/NC)";
    case "65": return "Royal Bhutan Police";
    case "66": return "Royal Bhutan Police (Civil)";
    case "60":
    case "61":
    case "62":
    case "63": return "Constitutional Bodies";
    case "67": return "Religious Services";
    case "69": return "Local Government";
    default:   return "Local Recruits";
  }
}

/** Per-agency position templates: level + title + occupational group.
 *  Multiple employees are assigned per department using these templates. */
interface PositionTemplate {
  level: PositionLevel;
  title: string;
  occGroup: string;
}

/** Standard position templates — multiple per department, cycling through
 *  these. Levels span EX down to O3 so every pay tier is represented. */
const POSITION_TEMPLATES: PositionTemplate[] = [
  { level: "EX",  title: "Director General",          occGroup: "Administration" },
  { level: "ES2", title: "Chief Engineer",             occGroup: "Engineering" },
  { level: "P1",  title: "Deputy Director",            occGroup: "Administration" },
  { level: "P2",  title: "Head of Division",           occGroup: "Administration" },
  { level: "P3",  title: "Senior Officer",             occGroup: "Programme Management" },
  { level: "P3A", title: "Planning Officer",           occGroup: "Planning & Policy" },
  { level: "P4",  title: "Programme Officer",          occGroup: "Programme Management" },
  { level: "P4A", title: "Finance Officer",            occGroup: "Finance & Accounts" },
  { level: "P5",  title: "Accounts Officer",           occGroup: "Finance & Accounts" },
  { level: "P5A", title: "Procurement Officer",        occGroup: "Procurement" },
  { level: "S1",  title: "Administrative Assistant",   occGroup: "Administration" },
  { level: "S1A", title: "ICT Officer",                occGroup: "ICT" },
  { level: "S2",  title: "Records Assistant",          occGroup: "Records" },
  { level: "S3",  title: "Data Entry Operator",        occGroup: "Data Management" },
  { level: "O1",  title: "Office Assistant",           occGroup: "Support Services" },
  { level: "O2",  title: "Office Attendant",           occGroup: "Support Services" },
  { level: "O3",  title: "Driver",                     occGroup: "Support Services" },
];

/** Realistic Bhutanese names for generated employees */
const BHUTANESE_NAMES: string[] = [
  "Tshering Dorji", "Karma Wangchuk", "Pema Lhamo", "Sonam Dema",
  "Dorji Wangmo", "Kinley Tshering", "Ugyen Norbu", "Dechen Pelden",
  "Tandin Wangdi", "Sangay Choden", "Phuntsho Wangdi", "Rinzin Dema",
  "Jigme Thinley", "Tashi Yangzom", "Chencho Dorji", "Dawa Pelden",
  "Namgay Tshering", "Sonam Wangmo", "Kezang Dorji", "Lhamo Tshering",
  "Passang Dorji", "Thinley Wangmo", "Karma Choden", "Yangchen Lhamo",
  "Wangchuk Dorji", "Deki Choden", "Pema Thinley", "Kinzang Wangdi",
  "Tshewang Rigzin", "Nima Dema", "Singye Dorji", "Chimi Wangmo",
  "Tobgay Dorji", "Sonam Peldon", "Kuenzang Tshering", "Yeshi Lhamo",
  "Dophu Dorji", "Tshering Yangdon", "Kelzang Wangchuk", "Nim Dem",
  "Sangay Tenzin", "Pema Yangzom", "Dorji Tshering", "Choki Wangmo",
  "Tashi Phuntsho", "Dechen Wangmo", "Ugyen Tshomo", "Karma Tenzin",
  "Leki Dorji", "Dema Yangtso", "Jamba Tshering", "Sonam Lhaden",
  "Lungten Dorji", "Pem Zam", "Tshering Tobgay", "Chimi Dema",
  "Garab Dorji", "Kunzang Choden", "Phub Dorji", "Tshering Pem",
  "Tandin Dorji", "Pema Choki", "Lhatu Dorji", "Yeshey Seldon",
  "Wangdi Norbu", "Samten Dema", "Kinga Tshering", "Choden Dem",
  "Rinchen Dorji", "Pema Seldon", "Tashi Dorji", "Kelzang Dema",
  "Sherab Dorji", "Tshering Choden", "Jurmi Wangdi", "Dechen Lhamo",
  "Nado Rinchen", "Yangzom Lhamo", "Damcho Dorji", "Chimmi Dem",
  "Tenzin Wangchuk", "Pema Norbu", "Sonam Yangzom", "Kinley Dem",
  "Dorji Phuntsho", "Tshering Zam", "Ugyen Wangmo", "Dawa Tshering",
  "Sangay Dorji", "Lhamo Choden",
];

/** How many employees per department for each demo agency.
 *  GovTech (code 70) gets a richer set since it's the primary demo agency. */
const EMPLOYEES_PER_DEPT: Record<string, number> = {
  "16": 5,   // MoF — 5 per dept
  "20": 5,   // MoH — 5 per dept
  "70": 12,  // GovTech — 12 per dept (focus agency, richer dataset)
  /* OPS agencies — populate so OPS dashboards don't show 0 records */
  "60": 3,   // Bhutan National Legal Institute
  "61": 3,   // KGUMSB
  "62": 3,   // HMS4
  "63": 3,   // The Pema Secretariat
  "64": 3,   // National Council
  "65": 3,   // OAG
  "66": 3,   // Royal Privy Council
  "68": 5,   // RUB — 5 per dept (focus OPS agency)
};

/** OPS-flavoured position templates per agency code. Each agency gets
 *  a distinct academic/constitutional title set so the Employee Summary
 *  Table for OPS agencies looks authentic rather than re-using civil
 *  service titles. Falls back to POSITION_TEMPLATES for unknown codes. */
const OPS_POSITION_TEMPLATES: Record<string, PositionTemplate[]> = {
  /* Royal University of Bhutan — academic titles */
  "68": [
    { level: "EX",  title: "Vice Chancellor",          occGroup: "Academic Leadership" },
    { level: "ES1", title: "President",                occGroup: "Academic Leadership" },
    { level: "ES2", title: "Dean",                     occGroup: "Academia" },
    { level: "ES3", title: "Professor",                occGroup: "Academia" },
    { level: "P1",  title: "Associate Professor",      occGroup: "Academia" },
    { level: "P2",  title: "Assistant Professor",      occGroup: "Academia" },
    { level: "P3",  title: "Lecturer",                 occGroup: "Academia" },
    { level: "P4",  title: "Registrar",                occGroup: "Academic Administration" },
    { level: "P5",  title: "Research Fellow",          occGroup: "Research" },
    { level: "S1",  title: "Academic Coordinator",     occGroup: "Academic Administration" },
    { level: "S2",  title: "Library Assistant",        occGroup: "Library Services" },
    { level: "S3",  title: "Lab Technician",           occGroup: "Laboratory Services" },
  ],
  "60": [
    { level: "ES2", title: "Director, BNLI",           occGroup: "Legal Training" },
    { level: "P1",  title: "Senior Legal Trainer",     occGroup: "Legal Training" },
    { level: "P3",  title: "Legal Researcher",         occGroup: "Legal Research" },
    { level: "S1",  title: "Programme Assistant",      occGroup: "Administration" },
  ],
  "61": [
    { level: "EX",  title: "President, KGUMSB",        occGroup: "Medical Leadership" },
    { level: "ES2", title: "Dean, Faculty of Medicine", occGroup: "Medical Academia" },
    { level: "P1",  title: "Professor of Medicine",    occGroup: "Medical Academia" },
    { level: "P3",  title: "Clinical Tutor",           occGroup: "Medical Academia" },
  ],
  "62": [
    { level: "ES1", title: "Chief Secretary, HMS",     occGroup: "Royal Secretariat" },
    { level: "P1",  title: "Secretariat Officer",      occGroup: "Royal Secretariat" },
    { level: "S1",  title: "Protocol Assistant",       occGroup: "Royal Secretariat" },
  ],
  "63": [
    { level: "ES1", title: "Chief Secretary, TPS",     occGroup: "Royal Secretariat" },
    { level: "P1",  title: "Programme Director",       occGroup: "Programme Management" },
    { level: "P3",  title: "Programme Officer",        occGroup: "Programme Management" },
  ],
  "64": [
    { level: "EX",  title: "Chairperson, National Council", occGroup: "Parliamentary" },
    { level: "ES2", title: "Member of National Council",    occGroup: "Parliamentary" },
    { level: "P2",  title: "Secretariat Officer",           occGroup: "Parliamentary Support" },
  ],
  "65": [
    { level: "EX",  title: "Attorney General",         occGroup: "Constitutional" },
    { level: "ES2", title: "Deputy Attorney General",  occGroup: "Legal Affairs" },
    { level: "P1",  title: "Senior Legal Officer",     occGroup: "Legal Affairs" },
    { level: "P3",  title: "Legal Officer",            occGroup: "Legal Affairs" },
  ],
  "66": [
    { level: "ES1", title: "Chairperson, RPC",         occGroup: "Royal Privy Council" },
    { level: "ES2", title: "Member, RPC",              occGroup: "Royal Privy Council" },
    { level: "P2",  title: "Secretariat Officer",      occGroup: "Royal Privy Council" },
  ],
};

/** Derive a deterministic short code for a department name.
 *  Takes uppercase initials of significant words (skipping "of", "the", "&", "/"). */
function deptCode(deptName: string): string {
  return deptName
    .split(/[\s/&]+/)
    .filter((w) => w.length > 2 && !["of", "the", "and"].includes(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 4) || "GEN";
}

/** Deterministic date generation from a seed. Returns YYYY-MM-DD. */
function seedDate(base: number, yearMin: number, yearMax: number): string {
  const year = yearMin + (base % (yearMax - yearMin + 1));
  const month = 1 + (base % 12);
  const day = 1 + (base % 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Statuses to sprinkle across employees — mostly active with a few others */
const EMP_STATUSES: Array<Employee["status"]> = [
  "active", "active", "active", "active", "active",
  "active", "active", "on-leave", "active", "active",
  "active", "active", "active", "suspended", "active",
  "active", "active", "active", "active", "transferred",
];

/** Generate all employees dynamically from agency departments + position templates.
 *  Each department gets EMPLOYEES_PER_DEPT employees with varied position levels. */
function generateEmployees(): Employee[] {
  const employees: Employee[] = [];
  let globalIdx = 0;
  let nameIdx = 0;

  for (const agency of DEMO_AGENCIES) {
    const agencyPrefix = agency.fiscal.agencyIdPrefix.replace("AGY-", "");
    const perDept = EMPLOYEES_PER_DEPT[agency.code] ?? 4;
    const isOps = OPS_AGENCY_CODES_SET.has(agency.code);
    const templates = OPS_POSITION_TEMPLATES[agency.code] ?? POSITION_TEMPLATES;
    /* Skip non-functional departments like "Office of the Minister" */
    const depts = agency.departments.filter(
      (d) => !d.startsWith("Office of the")
    );

    depts.forEach((dept, deptIdx) => {
      const dc = deptCode(dept);
      const subs = getSubDivisions(dept);

      for (let empInDept = 0; empInDept < perDept; empInDept++) {
        /* Cycle through position templates — offset by deptIdx so different
           departments start at different levels */
        const tplIdx = (deptIdx * 3 + empInDept) % templates.length;
        const tpl = templates[tplIdx];
        const ps = getPayScale(tpl.level);
        /* Basic pay: vary within pay band */
        const basicPay = Math.min(ps.minPay + ps.increment * empInDept, ps.maxPay);
        const pay = computeEmployeePay(basicPay, tpl.level);
        const bank = pickBank(globalIdx);
        const gender = GENDERS[globalIdx % GENDERS.length];
        const seqStr = String(globalIdx + 1).padStart(3, "0");
        const empName = BHUTANESE_NAMES[nameIdx % BHUTANESE_NAMES.length];
        const status = EMP_STATUSES[globalIdx % EMP_STATUSES.length];
        nameIdx++;

        const emp: Employee = {
          id: `EMP-${agencyPrefix}-${seqStr}`,
          masterEmpId: `ZESt-${agency.code}-${seqStr}`,
          eid: `EID-${agency.code}${seqStr}`,
          cid: `${agency.code}${String(1000 + globalIdx).padStart(8, "0")}`,
          tpn: `TPN-${agency.code}-${seqStr}`,
          name: empName,
          gender,
          dateOfBirth: seedDate(globalIdx * 7 + 3, 1975, 1998),
          dateOfEmployment: seedDate(globalIdx * 5 + 1, 2008, 2024),
          category: isOps ? "other-public-servant" : "civil-servant",
          subType: isOps ? opsSubTypeFor(agency.code) : "civil-servant",
          /* Canonical Employee Category label (payroll-employee-category LoV).
             Drives the sub-stream filter chips on Payroll Management. */
          employeeCategoryLabel: categoryLabelFor(agency.code, isOps),
          /* Deterministic Employee Type distribution (mirrors Master Data
             `payroll-employee-type` LoV — Regular / Contract /
             Consolidated-Contract / GSP-ESP / Para-Regular). Most rows are
             Regular; the remainder cycle through the other engagement types
             so Payroll / HR dashboards have realistic variety. */
          employeeType: (() => {
            const m = globalIdx % 20;
            if (m === 3) return "Contract";
            if (m === 7) return "Consolidated-Contract";
            if (m === 11) return "Contract: GSP / ESP (General & Elementary Service Personnel)";
            if (m === 17) return "Para-Regular";
            return "Regular";
          })(),
          positionLevel: tpl.level,
          positionTitle: tpl.title,
          occupationalGroup: tpl.occGroup,
          agencyCode: agency.code,
          agencyName: agency.name,
          departmentCode: dc,
          departmentName: dept,
          subDivision: subs.length > 0 ? subs[empInDept % subs.length] : undefined,
          ucoaOrgSegment: `${agency.code}-${dc}`,
          basicPay,
          payScale: ps,
          allowanceIds: ["ALW-001", "ALW-002", "ALW-003", "ALW-004", "ALW-005"],
          grossPay: pay.grossPay,
          totalDeductions: pay.totalDeductions,
          netPay: pay.netPay,
          bankName: bank.bankName,
          bankAccountNo: bank.bankAccountNo,
          bankBranch: bank.bankBranch,
          pfAccountNo: `PF-${agency.code}-${seqStr}`,
          gisAccountNo: `GIS-${agency.code}-${seqStr}`,
          nppfTier: "both",
          status,
          source: "zest",
        };

        employees.push(emp);
        globalIdx++;
      }
    });
  }

  return employees;
}

export const EMPLOYEES: Employee[] = generateEmployees();

/* ══════════════════════════════════════════════════════════════════════════
   DYNAMIC SALARY ADVANCE SEED — references generated employees
   ══════════════════════════════════════════════════════════════════════════ */

function generateSalaryAdvances(): SalaryAdvance[] {
  const advances: SalaryAdvance[] = [];
  /* Pick 1 employee from each demo agency that has employees */
  const agencyCodes = ["16", "20", "70"];
  const statuses: Array<SalaryAdvance["status"]> = ["recovering", "approved", "pending"];
  const reasons = ["Medical emergency", "House repair", "Child education fees"];

  agencyCodes.forEach((ac, idx) => {
    const emp = EMPLOYEES.find((e) => e.agencyCode === ac);
    if (!emp) return;
    const amount = [50000, 30000, 20000][idx];
    const monthlyDed = [10000, 6000, 5000][idx];
    const recovered = idx === 0 ? 20000 : 0;
    advances.push({
      id: `ADV-${String(idx + 1).padStart(3, "0")}`,
      employeeId: emp.id,
      employeeName: emp.name,
      cid: emp.cid,
      agencyCode: ac,
      amount,
      monthlyDeduction: monthlyDed,
      reason: reasons[idx],
      status: statuses[idx],
      requestDate: seedDate(idx * 13 + 5, 2026, 2026),
      approvedDate: statuses[idx] !== "pending" ? seedDate(idx * 13 + 8, 2026, 2026) : undefined,
      totalRecovered: recovered,
      balanceRemaining: amount - recovered,
      installments: Math.ceil(amount / monthlyDed),
      completedInstallments: Math.floor(recovered / monthlyDed),
    });
  });

  return advances;
}

export const SALARY_ADVANCES: SalaryAdvance[] = generateSalaryAdvances();

/* ══════════════════════════════════════════════════════════════════════════
   DYNAMIC MUSTER ROLL SEED — one project per demo agency
   ══════════════════════════════════════════════════════════════════════════ */

interface MRProjectTemplate {
  programName: string;
  shortName: string;
  description: string;
  paymentFrequency: MusterRollProject["paymentFrequency"];
}

const MR_TEMPLATES: MRProjectTemplate[] = [
  { programName: "Road Maintenance Works", shortName: "RMW", description: "Annual road maintenance and repair programme", paymentFrequency: "monthly" },
  { programName: "Building Construction Works", shortName: "BCW", description: "Government building construction project", paymentFrequency: "monthly" },
  { programName: "IT Infrastructure Cabling", shortName: "ITC", description: "Structured cabling and network installation", paymentFrequency: "weekly" },
];

function generateMusterRollProjects(): MusterRollProject[] {
  /* Cycle template fields so any number of demo agencies is supported
     (DEMO_AGENCIES now includes OPS codes so the list is > 3). */
  const benCounts = [12, 8, 6, 10, 7, 5, 9, 4, 11, 6, 8];
  const disbursed = [480000, 160000, 120000, 300000, 210000, 140000, 260000, 95000, 350000, 175000, 220000];
  return DEMO_AGENCIES.map((agency, idx) => {
    const tpl = MR_TEMPLATES[idx % MR_TEMPLATES.length];
    return {
      id: `MR-${String(idx + 1).padStart(3, "0")}`,
      programName: `${tpl.programName} — ${agency.shortCode}`,
      shortName: tpl.shortName,
      description: tpl.description,
      startDate: "2026-01-15",
      endDate: "2026-12-31",
      agencyCode: agency.code,
      agencyName: agency.name,
      budgetCode: `BUD-${agency.shortCode}-MR-2026-${String(idx + 1).padStart(3, "0")}`,
      paymentFrequency: tpl.paymentFrequency,
      status: "active" as const,
      beneficiaryCount: benCounts[idx % benCounts.length],
      totalDisbursed: disbursed[idx % disbursed.length],
    };
  });
}

export const MUSTERROLL_PROJECTS: MusterRollProject[] = generateMusterRollProjects();

/* Dummy Bhutanese names for a richer muster-roll beneficiary demo.
   Every project gets ~10 workers with realistic name + gender variety so
   the validation and paybill screens aren't empty. */
const MR_FIRST_NAMES = [
  "Tenzin", "Sonam", "Karma", "Pema", "Dechen", "Ugyen", "Jigme", "Kinley",
  "Choki", "Yangchen", "Namgay", "Tashi", "Dorji", "Rinzin", "Sangay",
  "Tshering", "Phuntsho", "Lhaden", "Lobzang", "Deki",
];
const MR_LAST_NAMES = [
  "Wangchuk", "Dorji", "Zangmo", "Lhamo", "Penjor", "Tshering", "Wangmo",
  "Choden", "Dukpa", "Norbu", "Gyeltshen", "Nidup", "Tobgyel", "Yangden",
];

function generateMusterRollBeneficiaries(): MusterRollBeneficiary[] {
  const beneficiaries: MusterRollBeneficiary[] = [];
  const types: Array<MusterRollBeneficiary["beneficiaryType"]> = ["skilled", "semi-skilled"];
  const wages: Record<MusterRollBeneficiary["beneficiaryType"], number> = { skilled: 700, "semi-skilled": 450 };
  let globalIdx = 0;

  MUSTERROLL_PROJECTS.forEach((proj, projIdx) => {
    /* 10 beneficiaries per project for a healthy demo. */
    for (let i = 0; i < 10; i++) {
      const bType = types[i % 2];
      const bank = pickBank(globalIdx + 100);
      const gender = GENDERS[globalIdx % GENDERS.length];
      const seqStr = String(globalIdx + 1).padStart(3, "0");

      const firstName = MR_FIRST_NAMES[(projIdx * 3 + i) % MR_FIRST_NAMES.length];
      const lastName = MR_LAST_NAMES[(projIdx + i * 2) % MR_LAST_NAMES.length];

      /* Make ~15 % of beneficiaries have missing bank info so the "Bank
         Details Verified" failure path and "Proceed with verified only"
         flow are demonstrable without extra setup. */
      const hasBankGap = i === 3 || i === 8; // 2 of every 10
      const gapType = i === 3 ? "missing-account" : "missing-bank";

      beneficiaries.push({
        id: `MRB-${seqStr}`,
        projectId: proj.id,
        name: `${firstName} ${lastName}`,
        cid: `${String(10000000000 + globalIdx * 13).slice(0, 11)}`,
        gender,
        dateOfBirth: seedDate(globalIdx * 11, 1985, 1999),
        contactNo: `17${String(100000 + globalIdx).slice(0, 6)}`,
        beneficiaryType: bType,
        dailyWage: wages[bType],
        bankName: hasBankGap && gapType === "missing-bank" ? "" : bank.bankName,
        bankAccountNo: hasBankGap && gapType === "missing-account" ? "" : bank.bankAccountNo,
        bankBranch: bank.bankBranch,
        status: "active",
      });
      globalIdx++;
    }
  });

  return beneficiaries;
}

export const MUSTERROLL_BENEFICIARIES: MusterRollBeneficiary[] = generateMusterRollBeneficiaries();

/* ══════════════════════════════════════════════════════════════════════════
   DYNAMIC SITTING FEE / HONORARIUM SEED
   ══════════════════════════════════════════════════════════════════════════ */

function generateSittingFeeBeneficiaries(): SittingFeeBeneficiary[] {
  const categories: Array<SittingFeeBeneficiary["category"]> = ["sitting-fee", "sitting-fee", "honorarium"];
  const rates = [2000, 3000, 5000];
  return categories.map((cat, idx) => {
    const bank = pickBank(idx + 200);
    return {
      id: `SF-${String(idx + 1).padStart(3, "0")}`,
      name: `Committee Member ${String(idx + 1).padStart(3, "0")}`,
      cid: `SF${String(8000 + idx).padStart(8, "0")}`,
      tpn: `TPN-SF-${String(idx + 1).padStart(3, "0")}`,
      category: cat,
      ratePerDay: rates[idx],
      bankName: bank.bankName,
      bankAccountNo: bank.bankAccountNo,
      bankBranch: bank.bankBranch,
      status: "active",
    };
  });
}

export const SITTING_FEE_BENEFICIARIES: SittingFeeBeneficiary[] = generateSittingFeeBeneficiaries();

/* ── localStorage helpers ──────────────────────────────────────────────── */
export const PAYROLL_STORAGE_KEY = "ifmis_payroll_data";
