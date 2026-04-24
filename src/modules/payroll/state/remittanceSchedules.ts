/* ═══════════════════════════════════════════════════════════════════════════
   Remittance Schedules
   ────────────────────
   Builds per-body remittance schedule views from the live Civil-Servant and
   OPS employee masters, following the column layouts specified in
   Paybill Formulae.xlsx (and the SRS Remittances POSTING note for Rent NPPF,
   which has no sheet in the Excel workbook).

   One ScheduleView per remittance stream key (see REMITTANCE_DESTINATIONS):
     • tds       — DRC TDS schedule
     • hc        — DRC Health Contribution schedule
     • pf        — NPPF Provident Fund schedule
     • gis       — RICBL GIS schedule
     • rentDrc   — DRC House Rent schedule
     • rentNhdcl — NHDCL House Rent schedule
     • rentNppf  — NPPF House Rent schedule (SRS note only)
     • csws      — RCSC CSWS schedule
     • audit     — RAA Audit Recoveries schedule
     • afws      — RBP AFWS Recoveries schedule (OPS / RBP only)
   ═══════════════════════════════════════════════════════════════════════════ */

import { EMPLOYEES, computeEmployeePay } from "./payrollSeed";
import { OPS_EMPLOYEES } from "../ops/data/opsEmployeeSeed";
import { REMITTANCE_DESTINATIONS, getGisRule, PF_EMPLOYEE_RATE, PF_EMPLOYER_RATE } from "./paybillStandard";
import type { RemittanceStreamKey } from "./paybillStandard";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface ScheduleColumn {
  id: string;
  label: string;
  align?: "left" | "right";
}

export interface ScheduleHeader {
  agencyCode: string;      // xxx_1
  payrollDept: string;     // xxx_2 (UCoA org segment / dept name)
  financialYear: string;   // xxx_3 (derived from period)
  monthId: string;         // xxx_4 (YYYY-MM)
}

export type ScheduleViewKey =
  | RemittanceStreamKey
  | "drcCombined"    // TDS + HC on one table (matches Paybill Formulae "Remittances-DRC(ToS, HC)")
  | "paybillRecoveries"
  | "cmReport";

export interface ScheduleView {
  streamKey: ScheduleViewKey;
  label: string;
  body: string;
  account: string;
  contra: string;
  columns: ScheduleColumn[];
  rows: Record<string, string | number>[];
  totalAmount: number;
  header: ScheduleHeader;
}

export interface ScheduleInput {
  agencyCode?: string;
  payrollDept?: string;
  year: number;           // 4-digit year
  month: number;          // 1-12
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const nu = (n: number) => Math.round(n || 0);

function fyFromPeriod(year: number, month: number): string {
  /* Bhutan fiscal year runs July (07) → June (06). FY25-26 = Jul 2025 → Jun 2026. */
  const startYr = month >= 7 ? year : year - 1;
  return `FY${String(startYr).slice(2)}-${String(startYr + 1).slice(2)}`;
}

function monthIdFromPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Stable hash of a string → [0, 2^31). Used for deterministic mock values. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return h;
}

const RENT_LOCATIONS = ["Thimphu", "Paro", "Phuntsholing", "Trashigang", "Mongar", "Bumthang"];

function buildingFor(empId: string): string { return `BLDG-${(hash(empId) % 9000 + 1000)}`; }
function flatFor(empId: string): string     { return `FLT-${(hash(empId + "f") % 90 + 10)}`; }
function locationFor(empId: string): string { return RENT_LOCATIONS[hash(empId + "l") % RENT_LOCATIONS.length]; }
function ainFor(empId: string, year: number): string { return `AIN-${year}-${String(hash(empId + "a") % 99999).padStart(5, "0")}`; }

/** Heuristic: ~25 % of active employees have house rent deductions. */
function hasHouseRent(empId: string, body: "drc" | "nhdcl" | "nppf"): boolean {
  const shift = body === "drc" ? 0 : body === "nhdcl" ? 1 : 2;
  return (hash(empId + "hr") + shift) % 12 < 3;
}

/** RAA audit recoveries apply to a very small slice of staff. */
function hasAuditRecovery(empId: string): boolean {
  return hash(empId + "audit") % 33 === 0;
}

/* ─── Row iterators ─────────────────────────────────────────────────────── */

interface NormalizedEmployee {
  kind: "cs" | "ops";
  id: string;
  eid: string;
  cid: string;
  tpn: string;
  name: string;
  dob: string;
  designation: string;
  positionLevel: string;
  agencyCode: string;
  agencyName: string;
  departmentCode: string;
  departmentName: string;
  pfAccountNo: string;
  gisAccountNo: string;
  basicPay: number;
  arrears: number;
  allowances: number;
  grossPay: number;
  pf: number;
  tds: number;
  hc: number;
  gis: number;
  csws: number;
  /** RBP/OPS flag — drives AFWS eligibility. */
  isRbp: boolean;
  status: string;
}

function normalizeCs(): NormalizedEmployee[] {
  return EMPLOYEES.filter((e) => !e.status || e.status === "active").map((e) => {
    const pay = computeEmployeePay(e.basicPay, e.positionLevel);
    return {
      kind: "cs" as const,
      id: e.id,
      eid: e.eid,
      cid: e.cid,
      tpn: e.tpn,
      name: e.name,
      dob: e.dateOfBirth,
      designation: e.positionTitle,
      positionLevel: e.positionLevel,
      agencyCode: e.agencyCode,
      agencyName: e.agencyName,
      departmentCode: e.departmentCode,
      departmentName: e.departmentName,
      pfAccountNo: e.pfAccountNo,
      gisAccountNo: e.gisAccountNo,
      basicPay: e.basicPay,
      arrears: 0,
      allowances: pay.totalAllowances,
      grossPay: pay.grossPay,
      pf: pay.pf,
      tds: pay.tds,
      hc: pay.hc,
      gis: pay.gis,
      csws: pay.csws,
      isRbp: false,
      status: e.status ?? "active",
    };
  });
}

function normalizeOps(): NormalizedEmployee[] {
  return OPS_EMPLOYEES.filter((e) => !e.status || e.status === "active").map((e) => {
    const basic = e.monthlyBasicPay || 0;
    const allowances = Math.round(basic * 0.2);
    const gross = basic + allowances;
    const pf = e.pfEligible !== "no" ? Math.round(basic * PF_EMPLOYEE_RATE) : 0;
    const gis = e.gisEligible === "yes" ? (getGisRule(e.positionLevel)?.subscriptionRate ?? 0) : 0;
    const hc = e.isHealthContributionExempted === "yes" ? 0 : Math.round(gross * 0.01);
    const tds = e.isTaxExempted === "yes" ? 0 : Math.round(Math.max(0, gross - 25000) * 0.10);
    const csws = e.isCswsMember === "yes" ? 150 : 0;
    return {
      kind: "ops" as const,
      id: e.masterEmpId,
      eid: e.eid,
      cid: e.cid,
      tpn: e.tpn,
      name: `${e.firstName}${e.middleName ? " " + e.middleName : ""} ${e.lastName}`.trim(),
      dob: e.dateOfBirth,
      designation: e.designation,
      positionLevel: e.positionLevel,
      agencyCode: e.workingAgency,
      agencyName: e.workingAgency,
      departmentCode: e.workingAgency,
      departmentName: e.workingAgency,
      pfAccountNo: e.pfAccountNo ?? "",
      gisAccountNo: e.gisAccountNo ?? "",
      basicPay: basic,
      arrears: 0,
      allowances,
      grossPay: gross,
      pf,
      tds,
      hc,
      gis,
      csws,
      isRbp: e.employeeCategory === "rbp",
      status: e.status ?? "active",
    };
  });
}

/** All active CS + OPS employees, normalized into one shape for schedule rendering.
 *  Optionally filter by agency code. */
export function getNormalizedEmployees(agencyCode?: string): NormalizedEmployee[] {
  const all = [...normalizeCs(), ...normalizeOps()];
  if (!agencyCode || agencyCode === "all") return all;
  return all.filter((e) => e.agencyCode === agencyCode);
}

/* ─── Schedule builders — one per stream ────────────────────────────────── */

function baseHeader(input: ScheduleInput): ScheduleHeader {
  return {
    agencyCode: input.agencyCode ?? "xxx_1",
    payrollDept: input.payrollDept ?? "xxx_2",
    financialYear: fyFromPeriod(input.year, input.month),
    monthId: monthIdFromPeriod(input.year, input.month),
  };
}

/** DRC TDS schedule (Excel: Remittances-DRC(ToS, HC), without HC amount). */
function buildTdsSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => e.tds > 0);
  const rows = emps.map((e, i) => ({
    serial: i + 1,
    name: e.name,
    cidWp: e.cid,
    eid: e.eid,
    tpn: e.tpn,
    designation: e.designation,
    basicPay: nu(e.basicPay),
    arrears: nu(e.arrears),
    allowances: nu(e.allowances),
    grossPay: nu(e.grossPay),
    tds: nu(e.tds),
  }));
  return {
    streamKey: "tds",
    label: "DRC · Tax on Salary (TDS)",
    ...REMITTANCE_DESTINATIONS.tds,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "tpn", label: "TPN" },
      { id: "designation", label: "Designation" },
      { id: "basicPay", label: "Basic Pay", align: "right" },
      { id: "arrears", label: "Arrears", align: "right" },
      { id: "allowances", label: "Allowances", align: "right" },
      { id: "grossPay", label: "Gross Pay", align: "right" },
      { id: "tds", label: "TDS", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.tds), 0),
    header: baseHeader(input),
  };
}

/** DRC Health Contribution schedule. */
function buildHcSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => e.hc > 0);
  const rows = emps.map((e, i) => ({
    serial: i + 1,
    name: e.name,
    cidWp: e.cid,
    eid: e.eid,
    tpn: e.tpn,
    designation: e.designation,
    basicPay: nu(e.basicPay),
    allowances: nu(e.allowances),
    grossPay: nu(e.grossPay),
    hc: nu(e.hc),
  }));
  return {
    streamKey: "hc",
    label: "DRC · Health Contribution (HC)",
    ...REMITTANCE_DESTINATIONS.hc,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "tpn", label: "TPN" },
      { id: "designation", label: "Designation" },
      { id: "basicPay", label: "Basic Pay", align: "right" },
      { id: "allowances", label: "Allowances", align: "right" },
      { id: "grossPay", label: "Gross Pay", align: "right" },
      { id: "hc", label: "HC (1 % of Gross)", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.hc), 0),
    header: baseHeader(input),
  };
}

/** NPPF Provident Fund & Pension schedule. */
function buildPfSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => e.pf > 0);
  const rows = emps.map((e, i) => {
    const employer = nu(e.basicPay * PF_EMPLOYER_RATE);
    const employee = nu(e.basicPay * PF_EMPLOYEE_RATE);
    return {
      serial: i + 1,
      name: e.name,
      cidWp: e.cid,
      eid: e.eid,
      designation: e.designation,
      pfAccount: e.pfAccountNo,
      basicPay: nu(e.basicPay),
      employer,
      employee,
      total: employer + employee,
    };
  });
  return {
    streamKey: "pf",
    label: "NPPF · Provident Fund & Pension",
    ...REMITTANCE_DESTINATIONS.pf,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "designation", label: "Designation" },
      { id: "pfAccount", label: "PF Account No." },
      { id: "basicPay", label: "Basic Pay", align: "right" },
      { id: "employer", label: "Employer 15 %", align: "right" },
      { id: "employee", label: "Employee 11 %", align: "right" },
      { id: "total", label: "Total Contribution", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.total), 0),
    header: baseHeader(input),
  };
}

/** RICBL Group Insurance Scheme schedule. */
function buildGisSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => e.gis > 0);
  const rows = emps.map((e, i) => {
    const rule = getGisRule(e.positionLevel);
    return {
      serial: i + 1,
      name: e.name,
      cidWp: e.cid,
      dob: e.dob,
      eid: e.eid,
      positionLevel: e.positionLevel,
      designation: e.designation,
      gisAccount: e.gisAccountNo,
      group: rule?.group ? `Group ${rule.group}` : "—",
      amount: nu(e.gis),
    };
  });
  return {
    streamKey: "gis",
    label: "RICBL · Group Insurance Scheme (GIS)",
    ...REMITTANCE_DESTINATIONS.gis,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "dob", label: "DOB" },
      { id: "eid", label: "EID" },
      { id: "positionLevel", label: "Grade / Level" },
      { id: "designation", label: "Designation" },
      { id: "gisAccount", label: "GIS Account No." },
      { id: "group", label: "Group" },
      { id: "amount", label: "Amount", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.amount), 0),
    header: baseHeader(input),
  };
}

/** House rent schedule — DRC / NHDCL / NPPF share an identical layout. */
function buildRentSchedule(input: ScheduleInput, body: "drc" | "nhdcl" | "nppf"): ScheduleView {
  const streamKey: RemittanceStreamKey = body === "drc" ? "rentDrc" : body === "nhdcl" ? "rentNhdcl" : "rentNppf";
  const dest = REMITTANCE_DESTINATIONS[streamKey];
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => hasHouseRent(e.id, body));
  const rows = emps.map((e, i) => {
    const amount = Math.round(e.basicPay * (body === "drc" ? 0.10 : body === "nhdcl" ? 0.08 : 0.05));
    return {
      serial: i + 1,
      name: e.name,
      cidWp: e.cid,
      eid: e.eid,
      tpn: e.tpn,
      location: locationFor(e.id),
      buildingNo: buildingFor(e.id),
      flatNo: flatFor(e.id),
      amount,
    };
  });
  return {
    streamKey,
    label: `${dest.body} · House Rent`,
    ...dest,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "tpn", label: "TPN" },
      { id: "location", label: "Location" },
      { id: "buildingNo", label: "Building No." },
      { id: "flatNo", label: "Flat / Unit No." },
      { id: "amount", label: "Amount", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.amount), 0),
    header: baseHeader(input),
  };
}

/** RCSC CSWS schedule. */
function buildCswsSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => e.csws > 0);
  const rows = emps.map((e, i) => ({
    serial: i + 1,
    name: e.name,
    cidWp: e.cid,
    eid: e.eid,
    dob: e.dob,
    positionLevel: e.positionLevel,
    amount: nu(e.csws),
  }));
  return {
    streamKey: "csws",
    label: "RCSC · CSWS",
    ...REMITTANCE_DESTINATIONS.csws,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "dob", label: "DOB" },
      { id: "positionLevel", label: "Position Level" },
      { id: "amount", label: "Amount", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.amount), 0),
    header: baseHeader(input),
  };
}

/** RAA Audit Recoveries schedule. */
function buildAuditSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => hasAuditRecovery(e.id));
  const rows = emps.map((e, i) => ({
    serial: i + 1,
    name: e.name,
    cidWp: e.cid,
    eid: e.eid,
    tpn: e.tpn,
    ainNo: ainFor(e.id, input.year),
    amount: Math.round(e.basicPay * 0.01),
  }));
  return {
    streamKey: "audit",
    label: "RAA · Audit Recoveries",
    ...REMITTANCE_DESTINATIONS.audit,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "tpn", label: "TPN" },
      { id: "ainNo", label: "AIN No." },
      { id: "amount", label: "Amount", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.amount), 0),
    header: baseHeader(input),
  };
}

/** DRC combined TDS+HC schedule — matches Paybill Formulae "Remittances-DRC(ToS, HC)".
 *  Single table, both amounts per row, total = TDS+HC. */
function buildDrcCombinedSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => e.tds > 0 || e.hc > 0);
  const rows = emps.map((e, i) => ({
    serial: i + 1,
    name: e.name,
    cidWp: e.cid,
    eid: e.eid,
    tpn: e.tpn,
    basicPay: nu(e.basicPay),
    arrears: nu(e.arrears),
    allowances: nu(e.allowances),
    grossPay: nu(e.grossPay),
    tds: nu(e.tds),
    hc: nu(e.hc),
    total: nu(e.tds + e.hc),
  }));
  return {
    streamKey: "drcCombined",
    label: "DRC · Tax on Salary + Health Contribution",
    body: "DRC",
    account: "DRC Revenue (TDS + HC)",
    contra: "TSA Contra",
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "tpn", label: "TPN" },
      { id: "basicPay", label: "Basic Pay", align: "right" },
      { id: "arrears", label: "Arrears", align: "right" },
      { id: "allowances", label: "Allowances", align: "right" },
      { id: "grossPay", label: "Gross Pay", align: "right" },
      { id: "tds", label: "TDS", align: "right" },
      { id: "hc", label: "HC", align: "right" },
      { id: "total", label: "Total (TDS + HC)", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.total), 0),
    header: baseHeader(input),
  };
}

/** Paybill Recoveries schedule — matches Paybill Formulae "Paybill Recoveries" sheet.
 *  Columns: Serial | Name | CID/WP | EID | PF | TDS | HC | GIS | CSWS | HouseRent | Audit | Total. */
function buildPaybillRecoveriesSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode);
  const rows = emps.map((e, i) => {
    const houseRent = hasHouseRent(e.id, "drc") ? Math.round(e.basicPay * 0.10)
      : hasHouseRent(e.id, "nhdcl") ? Math.round(e.basicPay * 0.08)
      : hasHouseRent(e.id, "nppf") ? Math.round(e.basicPay * 0.05)
      : 0;
    const audit = hasAuditRecovery(e.id) ? Math.round(e.basicPay * 0.01) : 0;
    const total = e.pf + e.tds + e.hc + e.gis + e.csws + houseRent + audit;
    return {
      serial: i + 1,
      name: e.name,
      cidWp: e.cid,
      eid: e.eid,
      pf: nu(e.pf),
      tds: nu(e.tds),
      hc: nu(e.hc),
      gis: nu(e.gis),
      csws: nu(e.csws),
      houseRent: nu(houseRent),
      audit: nu(audit),
      total: nu(total),
    };
  });
  return {
    streamKey: "paybillRecoveries",
    label: "Paybill Recoveries Report",
    body: "MoF",
    account: "Paybill Recoveries",
    contra: "Internal",
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "eid", label: "EID" },
      { id: "pf", label: "PF (E)", align: "right" },
      { id: "tds", label: "TDS (F)", align: "right" },
      { id: "hc", label: "HC (G)", align: "right" },
      { id: "gis", label: "GIS (H)", align: "right" },
      { id: "csws", label: "CSWS (I)", align: "right" },
      { id: "houseRent", label: "House Rent (J)", align: "right" },
      { id: "audit", label: "Audit Rec. (K)", align: "right" },
      { id: "total", label: "Total (O)", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.total), 0),
    header: baseHeader(input),
  };
}

/** Paybill Report to be sent to CM — matches Paybill Formulae "Paybill report to be sent to CM" sheet.
 *  Columns: Serial | Name | CID/WP | Designation | Bank Account No. | Net Pay. */
function buildCmReportSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode);
  const rows = emps.map((e, i) => {
    const netPay = e.grossPay - (e.pf + e.tds + e.hc + e.gis + e.csws);
    /* Bank account: CS employees have .bankAccountNo on the source row.
       Normalization strips it, so regenerate from id hash deterministically. */
    const bankAcct = `BoB-${String(hash(e.id + "bank") % 99999999).padStart(8, "0")}`;
    return {
      serial: i + 1,
      name: e.name,
      cidWp: e.cid,
      designation: e.designation,
      bankAccount: bankAcct,
      netPay: nu(netPay),
    };
  });
  return {
    streamKey: "cmReport",
    label: "Paybill Report to Cash Management",
    body: "Cash Management",
    account: "Bank Disbursement Queue",
    contra: "TSA Debit (Net Pay)",
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "designation", label: "Designation" },
      { id: "bankAccount", label: "Bank Account No." },
      { id: "netPay", label: "Net Pay", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.netPay), 0),
    header: baseHeader(input),
  };
}

/** RBP AFWS (Armed Forces Welfare Scheme) schedule — OPS/RBP only. */
function buildAfwsSchedule(input: ScheduleInput): ScheduleView {
  const emps = getNormalizedEmployees(input.agencyCode).filter((e) => e.isRbp);
  const rows = emps.map((e, i) => ({
    serial: i + 1,
    name: e.name,
    cidWp: e.cid,
    pin: e.eid,
    tpn: e.tpn,
    ainNo: ainFor(e.id, input.year),
    amount: Math.round(e.basicPay * 0.02),
  }));
  return {
    streamKey: "afws",
    label: "RBP · AFWS Recoveries",
    ...REMITTANCE_DESTINATIONS.afws,
    columns: [
      { id: "serial", label: "Sl. No.", align: "right" },
      { id: "name", label: "Name" },
      { id: "cidWp", label: "CID / WP" },
      { id: "pin", label: "PIN" },
      { id: "tpn", label: "TPN" },
      { id: "ainNo", label: "AIN No." },
      { id: "amount", label: "Amount", align: "right" },
    ],
    rows,
    totalAmount: rows.reduce((s, r) => s + Number(r.amount), 0),
    header: baseHeader(input),
  };
}

/* ─── Public API ────────────────────────────────────────────────────────── */

export function buildAllSchedules(input: ScheduleInput): Record<RemittanceStreamKey, ScheduleView> {
  return {
    tds:       buildTdsSchedule(input),
    hc:        buildHcSchedule(input),
    pf:        buildPfSchedule(input),
    gis:       buildGisSchedule(input),
    rentDrc:   buildRentSchedule(input, "drc"),
    rentNhdcl: buildRentSchedule(input, "nhdcl"),
    rentNppf:  buildRentSchedule(input, "nppf"),
    csws:      buildCswsSchedule(input),
    audit:     buildAuditSchedule(input),
    afws:      buildAfwsSchedule(input),
  };
}

export function buildSchedule(streamKey: ScheduleViewKey, input: ScheduleInput): ScheduleView {
  switch (streamKey) {
    case "tds":               return buildTdsSchedule(input);
    case "hc":                return buildHcSchedule(input);
    case "pf":                return buildPfSchedule(input);
    case "gis":               return buildGisSchedule(input);
    case "rentDrc":           return buildRentSchedule(input, "drc");
    case "rentNhdcl":         return buildRentSchedule(input, "nhdcl");
    case "rentNppf":          return buildRentSchedule(input, "nppf");
    case "csws":              return buildCswsSchedule(input);
    case "audit":             return buildAuditSchedule(input);
    case "afws":              return buildAfwsSchedule(input);
    case "drcCombined":       return buildDrcCombinedSchedule(input);
    case "paybillRecoveries": return buildPaybillRecoveriesSchedule(input);
    case "cmReport":          return buildCmReportSchedule(input);
  }
}

/** Map a sidebar route path to the schedule key to render. Handles both
 *  CS (/payroll/…) and OPS (/payroll/ops/…) routes. */
export function scheduleKeyForPath(pathname: string): ScheduleViewKey {
  const p = pathname.toLowerCase();
  if (p.endsWith("/cm-report")) return "cmReport";
  if (p.endsWith("/recoveries")) return "paybillRecoveries";
  if (p.endsWith("/remittance/pf")) return "pf";
  if (p.endsWith("/remittance/gis")) return "gis";
  if (p.endsWith("/remittance/drc")) return "drcCombined";
  if (p.endsWith("/remittance/rent/drc")) return "rentDrc";
  if (p.endsWith("/remittance/rent/nhdcl")) return "rentNhdcl";
  if (p.endsWith("/remittance/rent/nppf")) return "rentNppf";
  if (p.endsWith("/remittance/rent")) return "rentDrc";
  if (p.endsWith("/remittance/csws")) return "csws";
  if (p.endsWith("/remittance/audit")) return "audit";
  if (p.endsWith("/remittance/afws")) return "afws";
  /* Default landing — Paybill Recoveries overview. */
  return "paybillRecoveries";
}

/** Convert a schedule view to CSV text. */
export function scheduleToCsv(view: ScheduleView): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    `# ${view.label} — ${view.header.monthId} (${view.header.financialYear})`,
    `# Agency Code: ${view.header.agencyCode} | Payroll Dept: ${view.header.payrollDept}`,
    `# Remit to ${view.body} · ${view.account} · Contra: ${view.contra}`,
    "",
  ].join("\n");
  const head = view.columns.map((c) => esc(c.label)).join(",");
  const body = view.rows.map((r) => view.columns.map((c) => esc(r[c.id] ?? "")).join(",")).join("\n");
  const footer = `\n,,,,,,Total,${view.totalAmount}`;
  return `${header}${head}\n${body}${footer}\n`;
}

export function downloadScheduleCsv(view: ScheduleView) {
  const blob = new Blob([scheduleToCsv(view)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${view.streamKey}-${view.header.monthId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
