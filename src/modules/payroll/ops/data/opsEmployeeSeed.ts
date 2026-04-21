/**
 * OPS Employee Seed Data
 * Generates realistic sample OPS employees across all categories with ALL DDi 1.0 fields
 * Uses deterministic generation for reproducibility
 */

import type {
  OpsEmployeeFull,
  OpsGender,
  OpsNationality,
  OpsEmployeeCategory,
  OpsEmployeeType,
  OpsPositionLevel,
  OpsPFEligibility,
  OpsGISEligibility,
  OpsTaxExemptionStatus,
  OpsHealthContributionExemptionStatus,
  OpsCswsMemberStatus,
  OpsEmployeeStatus
} from "../types";
import { OPS_CATEGORIES, type OpsPayScaleEntry } from "./opsPayScales";
import { OPS_ALLOWANCES, OPS_DEDUCTIONS } from "./opsAllowances";
import { computeTDS } from "./opsTdsSlab";

/**
 * Bhutanese first names (common names)
 */
const BHUTANESE_FIRST_NAMES = [
  "Tenzin",
  "Kinley",
  "Dorji",
  "Pemba",
  "Sonam",
  "Karma",
  "Lhamo",
  "Tshering",
  "Nyima",
  "Passang",
  "Tobgay",
  "Thinley",
  "Jambyang",
  "Bhrikuti",
  "Peldon",
  "Yangchen",
  "Dechen",
  "Tshokey",
  "Phuntsho",
  "Yeshi"
];

/**
 * Bhutanese family names (common surnames)
 */
const BHUTANESE_FAMILY_NAMES = [
  "Dorji",
  "Wangchuk",
  "Tshering",
  "Namgyal",
  "Penjor",
  "Gyeltshen",
  "Dema",
  "Drukpa",
  "Tobgay",
  "Yonten",
  "Khandu",
  "Chhogyel",
  "Rapten",
  "Sherpa",
  "Bhutia",
  "Rampai",
  "Lama",
  "Tamang",
  "Lepcha",
  "Rai"
];

/**
 * Bank names for distribution
 */
const BANK_NAMES = [
  "Bank of Bhutan",
  "Bhutan National Bank",
  "Druk PNB Bank",
  "Bhutan Monetary Authority"
];

/**
 * Bank branches
 */
const BANK_BRANCHES = [
  "Thimphu Main",
  "Paro Branch",
  "Punakha Branch",
  "Wangdue Branch",
  "Tsirang Branch",
  "Chhukha Branch"
];

/**
 * Working agency codes aligned with the canonical OPS_CATEGORIES order:
 *   [0] RUB                            -> 68
 *   [1] Judiciary                      -> 60
 *   [2] Election Commission of Bhutan  -> 61
 *   [3] Royal Bhutan Police            -> 62
 *   [4] Local Government               -> 63
 *   [5] Parliamentary                  -> 64
 *   [6] Constitutional Bodies          -> 65
 *   [7] Local Recruits                 -> 66
 */
const AGENCIES = ["68", "60", "61", "62", "63", "64", "65", "66"];

/**
 * Organization segments (UCoA format)
 */
const ORG_SEGMENTS = [
  "01-001-01",
  "01-001-02",
  "01-002-01",
  "02-001-01",
  "02-002-01",
  "03-001-01",
  "03-001-02"
];

/**
 * Generate deterministic Bhutanese full name from index, returning split names
 */
function generateNameParts(index: number): { firstName: string; lastName: string } {
  const firstName = BHUTANESE_FIRST_NAMES[index % BHUTANESE_FIRST_NAMES.length];
  const lastName = BHUTANESE_FAMILY_NAMES[(index + 1) % BHUTANESE_FAMILY_NAMES.length];
  return { firstName, lastName };
}

/**
 * Generate deterministic CID (Citizenship ID) format: YYYYMMDDNNNNNNNS
 * Using 1960-2000 birth years for working population
 */
function generateCID(categoryIndex: number, employeeIndex: number): string {
  const categoryCode = String(categoryIndex).padStart(2, "0");
  const empCode = String(employeeIndex).padStart(4, "0");
  // Birth year 1960-2000, month 01-12, day 01-28
  const year = 1960 + ((categoryIndex * 5 + employeeIndex * 3) % 40);
  const month = ((categoryIndex * 3 + employeeIndex * 2) % 12) + 1;
  const day = ((categoryIndex + employeeIndex) % 28) + 1;
  const seq = String((categoryIndex * 100 + employeeIndex) % 100).padStart(2, "0");
  const checkDigit = ((categoryIndex + employeeIndex) % 10).toString();
  return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}${empCode}${checkDigit}`;
}

/**
 * Generate deterministic Employee ID
 */
function generateEID(categoryId: string, index: number): string {
  const categoryCode = categoryId.substring(0, 3).toUpperCase();
  const seq = String(index + 1).padStart(4, "0");
  return `${categoryCode}-${seq}`;
}

/**
 * Generate deterministic TPN (Tax Payer Number)
 */
function generateTPN(categoryIndex: number, employeeIndex: number): string {
  const base = 100000 + categoryIndex * 1000 + employeeIndex * 10;
  return base.toString();
}

/**
 * Generate deterministic Work Permit (empty for Bhutanese, WP format for others)
 */
function generateWorkPermit(index: number, nationality: OpsNationality): string {
  if (nationality === "Bhutanese") {
    return "";
  }
  const permitNum = String(100000 + index).slice(-5);
  return `WP-${permitNum}`;
}

/**
 * Generate deterministic Master Employee ID
 */
function generateMasterEmpId(globalIndex: number): string {
  return `MEMP-${String(globalIndex + 1).padStart(8, "0")}`;
}

/**
 * Generate PF Account Number
 */
function generatePFAccountNo(index: number): string {
  return `PF-${String(100000 + index).slice(-8)}`;
}

/**
 * Generate GIS Account Number
 */
function generateGISAccountNo(index: number): string {
  return `GIS-${String(100000 + index).slice(-6)}`;
}

/**
 * Map position title to designation
 */
function generateDesignation(positionTitle: string): string {
  const designationMap: Record<string, string> = {
    "Chief Justice": "Chief Justice of Bhutan",
    "Justice": "Judge, High Court",
    "Senior Judge": "Senior Judge, District Court",
    "Judge": "Judge, District Court",
    "Senior Magistrate": "Senior Magistrate",
    "Magistrate": "Magistrate",
    "Principal Secretary": "Principal Secretary, Government of Bhutan",
    "Secretary": "Secretary, Ministry",
    "Joint Secretary": "Joint Secretary, Ministry",
    "Additional Secretary": "Additional Secretary, Ministry",
    "Director": "Director, Department",
    "Deputy Director": "Deputy Director, Department",
    "Senior Officer": "Senior Officer, Department",
    "Officer": "Officer, Department"
  };
  return designationMap[positionTitle] || positionTitle;
}

/**
 * Determine position level from notes
 */
function determinePositionLevel(notes?: string): OpsPositionLevel {
  if (!notes) return "S3";
  const notesLower = notes.toLowerCase();
  if (notesLower.includes("p3")) return "P3";
  if (notesLower.includes("p2")) return "P2";
  if (notesLower.includes("p1")) return "P1";
  if (notesLower.includes("s1")) return "S1";
  if (notesLower.includes("s2")) return "S2";
  if (notesLower.includes("s3")) return "S3";
  if (notesLower.includes("o2")) return "O2";
  if (notesLower.includes("ss1")) return "SS1";
  if (notesLower.includes("ex")) return "EX";
  if (notesLower.includes("es")) return "ES3";
  return "S3";
}

/**
 * Compute GIS (Group Insurance Scheme) deduction based on slab rules
 * Slabs from OPS_DEDUCTIONS:
 * - Up to 20,000: GIS = 50
 * - 20,001 to 40,000: GIS = 100
 * - 40,001 to 60,000: GIS = 150
 * - Above 60,000: GIS = 200
 */
function computeGIS(basicPay: number): number {
  if (basicPay <= 20000) {
    return 50;
  } else if (basicPay <= 40000) {
    return 100;
  } else if (basicPay <= 60000) {
    return 150;
  } else {
    return 200;
  }
}

/**
 * Get default civil service pay scale for a position based on notes
 * Maps position notes to standard civil service scales
 */
function getDefaultPayForPosition(position: OpsPayScaleEntry): { minPay: number; increment: number; maxPay: number } {
  if (!position.notes) {
    return { minPay: 13280, increment: 265, maxPay: 14605 }; // Default to S3
  }

  const notes = position.notes.toLowerCase();

  // P3 level positions
  if (notes.includes("p3")) {
    return { minPay: 28200, increment: 565, maxPay: 31030 };
  }

  // P2 level positions
  if (notes.includes("p2")) {
    return { minPay: 20790, increment: 415, maxPay: 22915 };
  }

  // S1 level positions
  if (notes.includes("s1")) {
    return { minPay: 9905, increment: 200, maxPay: 10905 };
  }

  // S2 level positions
  if (notes.includes("s2")) {
    return { minPay: 11615, increment: 230, maxPay: 12735 };
  }

  // S3 level positions
  if (notes.includes("s3")) {
    return { minPay: 13280, increment: 265, maxPay: 14605 };
  }

  // O2 level positions
  if (notes.includes("o2")) {
    return { minPay: 7845, increment: 155, maxPay: 8620 };
  }

  // SS1 level positions (Senior Supervisory)
  if (notes.includes("ss1")) {
    return { minPay: 17200, increment: 345, maxPay: 18890 };
  }

  // Default to S3 if unclear
  return { minPay: 13280, increment: 265, maxPay: 14605 };
}

/**
 * Format date as DD/MM/YYYY (required by DDi 1.0)
 */
function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Determine gender based on index (alternate Male/Female)
 */
function determineGender(index: number): OpsGender {
  return index % 2 === 0 ? "Male" : "Female";
}

/**
 * Determine nationality (mostly Bhutanese with some variations)
 */
function determineNationality(index: number): OpsNationality {
  const nationalitiesWithWeights: OpsNationality[] = [
    "Bhutanese",
    "Bhutanese",
    "Bhutanese",
    "Bhutanese",
    "Bhutanese", // 80%
    "Indian",
    "Nepalese",
    "Bangladeshi",
    "Other" // 20%
  ];
  return nationalitiesWithWeights[index % nationalitiesWithWeights.length];
}

/**
 * Determine employee type based on category
 */
function determineEmployeeType(categoryId: string): OpsEmployeeType {
  if (categoryId.includes("contract")) return "contractual";
  if (categoryId.includes("temp")) return "temporary";
  if (categoryId.includes("adhoc")) return "adhoc";
  return "permanent";
}

/**
 * Determine PF eligibility based on employee type
 */
function determinePFEligibility(employeeType: OpsEmployeeType): OpsPFEligibility {
  if (employeeType === "permanent") return "yes";
  if (employeeType === "contractual") return "partial";
  return "no";
}

/**
 * Determine GIS eligibility
 */
function determineGISEligibility(employeeType: OpsEmployeeType): OpsGISEligibility {
  return employeeType === "temporary" || employeeType === "adhoc" ? "no" : "yes";
}

/**
 * Determine if CSWS member (alternate yes/no)
 */
function determineCswsMember(index: number): OpsCswsMemberStatus {
  return index % 2 === 0 ? "yes" : "no";
}

/**
 * Generate sample OPS employees with ALL DDi 1.0 fields
 * 3-5 employees per category
 */
function generateOpsEmployees(): OpsEmployeeFull[] {
  const employees: OpsEmployeeFull[] = [];
  let globalIndex = 0;

  OPS_CATEGORIES.forEach((category, categoryIndex) => {
    // Generate 3-5 employees per category
    const employeeCount = 3 + (categoryIndex % 3);

    for (let empIndex = 0; empIndex < employeeCount; empIndex++) {
      const positionCount = category.positions.length;
      const position = category.positions[empIndex % positionCount];

      // Handle positions with 0/0/0 scales (map to civil service)
      let scalePay = position;
      if (position.minPay === 0 && position.increment === 0 && position.maxPay === 0) {
        const defaultScale = getDefaultPayForPosition(position);
        scalePay = {
          positionTitle: position.positionTitle,
          minPay: defaultScale.minPay,
          increment: defaultScale.increment,
          maxPay: defaultScale.maxPay,
          notes: position.notes
        };
      }

      // Calculate salary (use min + (index * increment) for variation)
      const yearsService = 2 + (empIndex % 5);
      const basicSalary = scalePay.minPay + yearsService * scalePay.increment;
      const monthlyBasicPay = Math.min(basicSalary, scalePay.maxPay);

      // Calculate allowances (based on category)
      const applicableAllowances: { id: string; name: string; amount: number }[] = [];
      OPS_ALLOWANCES.forEach((allowance) => {
        // Check if allowance applies to this category
        const isApplicable =
          allowance.applicableCategories.length === 0 ||
          allowance.applicableCategories.includes(category.id);

        if (isApplicable && allowance.active) {
          let amount = 0;

          if (allowance.calcMethod === "fixed") {
            amount = allowance.value;
          } else if (allowance.calcMethod === "pct-basic") {
            amount = Math.round(monthlyBasicPay * (allowance.value / 100));
          } else if (allowance.calcMethod === "pct-gross") {
            // For gross-based, use salary as approximation
            amount = Math.round(monthlyBasicPay * (allowance.value / 100));
          }

          if (amount > 0 && allowance.frequency === "monthly") {
            applicableAllowances.push({
              id: allowance.id,
              name: allowance.name,
              amount
            });
          }
        }
      });

      // Total allowances
      const totalAllowances = applicableAllowances.reduce((sum, a) => sum + a.amount, 0);
      const grossSalary = monthlyBasicPay + totalAllowances;

      // Calculate deductions
      const applicableDeductions: { id: string; name: string; amount: number }[] = [];

      // PF: 10% of basic
      applicableDeductions.push({
        id: "DED-001",
        name: "Provident Fund (PF)",
        amount: Math.round(monthlyBasicPay * 0.1)
      });

      // GIS: Slab-based calculation
      applicableDeductions.push({
        id: "DED-002",
        name: "Group Insurance Scheme (GIS)",
        amount: computeGIS(monthlyBasicPay)
      });

      // HC: 1% of gross
      applicableDeductions.push({
        id: "DED-003",
        name: "Health Contribution (HC)",
        amount: Math.round(grossSalary * 0.01)
      });

      // TDS: Based on progressive slab
      const tds = computeTDS(grossSalary);
      applicableDeductions.push({
        id: "DED-004",
        name: "Tax Deducted at Source (TDS)",
        amount: tds
      });

      // Total deductions
      const totalDeductions = applicableDeductions.reduce((sum, d) => sum + d.amount, 0);
      const netSalary = grossSalary - totalDeductions;

      // Generate name parts
      const nameData = generateNameParts(globalIndex);

      // Generate date of birth (based on CID)
      const cid = generateCID(categoryIndex, empIndex);
      const dobYear = parseInt(cid.substring(0, 4));
      const dobMonth = parseInt(cid.substring(4, 6)) - 1; // JS months are 0-based
      const dobDay = parseInt(cid.substring(6, 8));
      const dobDate = new Date(dobYear, dobMonth, dobDay);
      const dateOfBirth = formatDateDDMMYYYY(dobDate);

      // Generate appointment date (based on joinDate logic)
      const joinYear = 2015;
      const joinMonth = (categoryIndex % 12);
      const joinDay = (empIndex % 28) + 1;
      const appointmentDate = formatDateDDMMYYYY(new Date(joinYear, joinMonth, joinDay));

      // Generate increment date (1 year after appointment)
      const incrementDate = formatDateDDMMYYYY(new Date(joinYear + 1, joinMonth, joinDay));

      // Generate superannuation date (DOB + 60 years)
      const superannuationDate = formatDateDDMMYYYY(
        new Date(dobYear + 60, dobMonth, dobDay)
      );

      // Generate contract end date (for contractual employees, 3 years from appointment)
      const contractEndDate = formatDateDDMMYYYY(
        new Date(joinYear + 3, joinMonth, joinDay)
      );

      // Generate joining date (same format as appointment for compatibility)
      const joiningDate = appointmentDate;

      // Determine employee properties
      const gender = determineGender(globalIndex);
      const nationality = determineNationality(globalIndex);
      const employeeType = determineEmployeeType(category.id);
      const pfEligible = determinePFEligibility(employeeType);
      const gisEligible = determineGISEligibility(employeeType);
      const positionLevel = determinePositionLevel(position.notes);

      // Generate employee data with ALL DDi 1.0 fields
      const employee: OpsEmployeeFull = {
        // DDi 1.1 - Master Employee ID
        masterEmpId: generateMasterEmpId(globalIndex),

        // DDi 1.2 - Employee ID
        eid: generateEID(category.id, empIndex),

        // DDi 1.3 - Names (split from single name)
        firstName: nameData.firstName,
        lastName: nameData.lastName,

        // DDi 1.4 - Gender
        gender,

        // DDi 1.5 - Nationality
        nationality,

        // DDi 1.6 - CID
        cid: generateCID(categoryIndex, empIndex),

        // DDi 1.7 - Work Permit
        workPermit: generateWorkPermit(globalIndex, nationality),

        // DDi 1.8 - TPN
        tpn: generateTPN(categoryIndex, empIndex),

        // DDi 1.9 - Employee Category
        employeeCategory: category.id as OpsEmployeeCategory,

        // DDi 1.10 - Employee Type
        employeeType,

        // DDi 1.11 - Date of Birth (DD/MM/YYYY format)
        dateOfBirth,

        // DDi 1.12 - Position Title
        positionTitle: position.positionTitle,

        // DDi 1.13 - Designation
        designation: generateDesignation(position.positionTitle),

        // DDi 1.14 - Position Level
        positionLevel,

        // DDi 1.15 - Pay Scale ID
        payScaleId: `SCALE-${String(categoryIndex).padStart(2, "0")}-${String(empIndex).padStart(2, "0")}`,

        // DDi 1.16 - Monthly Basic Pay
        monthlyBasicPay: Math.round(monthlyBasicPay),

        // DDi 1.17 - Working Agency
        workingAgency: AGENCIES[categoryIndex % AGENCIES.length],

        // DDi 1.18 - Organization Segment (UCoA)
        organizationSegment: ORG_SEGMENTS[categoryIndex % ORG_SEGMENTS.length],

        // DDi 1.19 - Appointment Date
        appointmentDate,

        // DDi 1.20 - Increment Date (conditional)
        incrementDate: employeeType === "permanent" ? incrementDate : undefined,

        // DDi 1.21 - Superannuation Date
        superannuationDate,

        // DDi 1.22 - Contract End Date
        contractEndDate: employeeType === "contractual" ? contractEndDate : superannuationDate,

        // DDi 1.23 - PF Eligible
        pfEligible,

        // DDi 1.24 - PF Account Number (conditional)
        pfAccountNo: pfEligible !== "no" ? generatePFAccountNo(globalIndex) : undefined,

        // DDi 1.25 - GIS Eligible
        gisEligible,

        // DDi 1.26 - GIS Account Number (conditional)
        gisAccountNo: gisEligible === "yes" ? generateGISAccountNo(globalIndex) : undefined,

        // DDi 1.27 - Is Tax Exempted
        isTaxExempted: "no" as OpsTaxExemptionStatus,

        // DDi 1.28 - Tax Exemption Reason (conditional)
        taxExemptionReason: undefined,

        // DDi 1.29 - Is Health Contribution Exempted
        isHealthContributionExempted: "no" as OpsHealthContributionExemptionStatus,

        // DDi 1.30 - Is CSWS Member
        isCswsMember: determineCswsMember(globalIndex),

        // DDi 1.31 - Email ID
        emailId: `${nameData.firstName.toLowerCase()}.${nameData.lastName.toLowerCase()}@ops.gov.bt`,

        // DDi 1.32 - Mobile Number
        mobileNumber: `+975-17${String(100000 + globalIndex).slice(-6)}`,

        // DDi 1.33 - Bank Name
        bankName: BANK_NAMES[empIndex % BANK_NAMES.length],

        // DDi 1.34 - Bank Account Number
        bankAccountNumber: `10${String(globalIndex).padStart(10, "0")}`,

        // DDi 1.35 - Bank Branch
        bankBranch: BANK_BRANCHES[categoryIndex % BANK_BRANCHES.length],

        // DDi 1.36 - Joining Date
        joiningDate,

        // Additional metadata
        source: "manual",
        status: (empIndex === 0 ? "active" : empIndex === 1 ? "on-leave" : "active") as OpsEmployeeStatus,

        // System metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      employees.push(employee);
      globalIndex++;
    }
  });

  return employees;
}

/**
 * Type alias for backward compatibility
 */
export type OpsEmployee = OpsEmployeeFull;

/**
 * Lazy-load employee data
 */
let cachedEmployees: OpsEmployeeFull[] | null = null;

export function getOpsEmployees(): OpsEmployeeFull[] {
  if (!cachedEmployees) {
    cachedEmployees = generateOpsEmployees();
  }
  return cachedEmployees;
}

/**
 * Get OPS employees by category
 */
export function getOpsEmployeesByCategory(categoryId: string): OpsEmployeeFull[] {
  return getOpsEmployees().filter((emp) => emp.employeeCategory === categoryId);
}

/**
 * Get OPS employee by ID
 */
export function getOpsEmployeeById(id: string): OpsEmployeeFull | undefined {
  return getOpsEmployees().find((emp) => emp.masterEmpId === id);
}

/**
 * Get OPS employee by EID
 */
export function getOpsEmployeeByEID(eid: string): OpsEmployeeFull | undefined {
  return getOpsEmployees().find((emp) => emp.eid === eid);
}

/**
 * Get OPS employee by CID
 */
export function getOpsEmployeeByCID(cid: string): OpsEmployeeFull | undefined {
  return getOpsEmployees().find((emp) => emp.cid === cid);
}

/**
 * Get employees by agency
 */
export function getOpsEmployeesByAgency(agency: string): OpsEmployeeFull[] {
  return getOpsEmployees().filter((emp) => emp.workingAgency === agency);
}

/**
 * Get employees by status
 */
export function getOpsEmployeesByStatus(status: OpsEmployeeStatus): OpsEmployeeFull[] {
  return getOpsEmployees().filter((emp) => emp.status === status);
}

/**
 * Count employees by category
 */
export function countOpsEmployeesByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  getOpsEmployees().forEach((emp) => {
    counts[emp.employeeCategory] = (counts[emp.employeeCategory] || 0) + 1;
  });
  return counts;
}

/**
 * Get employee with computed allowances and deductions
 */
export function getOpsEmployeeWithPayDetails(eid: string): (OpsEmployeeFull & {
  allowances: { id: string; name: string; amount: number }[];
  deductions: { id: string; name: string; amount: number }[];
  grossSalary: number;
  netSalary: number;
}) | undefined {
  const employee = getOpsEmployeeByEID(eid);
  if (!employee) return undefined;

  // Calculate allowances
  const allowances: { id: string; name: string; amount: number }[] = [];
  OPS_ALLOWANCES.forEach((allowance) => {
    const isApplicable =
      allowance.applicableCategories.length === 0 ||
      allowance.applicableCategories.includes(employee.employeeCategory);

    if (isApplicable && allowance.active) {
      let amount = 0;
      if (allowance.calcMethod === "fixed") {
        amount = allowance.value;
      } else if (allowance.calcMethod === "pct-basic") {
        amount = Math.round(employee.monthlyBasicPay * (allowance.value / 100));
      }

      if (amount > 0 && allowance.frequency === "monthly") {
        allowances.push({
          id: allowance.id,
          name: allowance.name,
          amount
        });
      }
    }
  });

  const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
  const grossSalary = employee.monthlyBasicPay + totalAllowances;

  // Calculate deductions
  const deductions: { id: string; name: string; amount: number }[] = [];

  deductions.push({
    id: "DED-001",
    name: "Provident Fund (PF)",
    amount: Math.round(employee.monthlyBasicPay * 0.1)
  });

  deductions.push({
    id: "DED-002",
    name: "Group Insurance Scheme (GIS)",
    amount: computeGIS(employee.monthlyBasicPay)
  });

  deductions.push({
    id: "DED-003",
    name: "Health Contribution (HC)",
    amount: Math.round(grossSalary * 0.01)
  });

  deductions.push({
    id: "DED-004",
    name: "Tax Deducted at Source (TDS)",
    amount: computeTDS(grossSalary)
  });

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const netSalary = grossSalary - totalDeductions;

  return {
    ...employee,
    allowances,
    deductions,
    grossSalary: Math.round(grossSalary),
    netSalary: Math.round(netSalary)
  };
}

/**
 * Export all employees as constant
 */
export const OPS_EMPLOYEES = getOpsEmployees();
