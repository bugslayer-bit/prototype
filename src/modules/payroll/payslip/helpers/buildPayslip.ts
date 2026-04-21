/* ═══════════════════════════════════════════════════════════════════════════
   buildPayslip — pure fn: Employee + Period → PayslipDocument
   ───────────────────────────────────────────────────────────────────
   Translates the raw Employee record and the computeEmployeePay() output
   into the row-by-row earnings / deductions structure the payslip UI
   consumes. Keeping this as a pure function (no hooks, no side effects)
   means the same logic is reusable for single-preview, bulk PDF export,
   and unit tests.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Employee } from "../../types";
import { computeEmployeePay } from "../../state/payrollSeed";
import { payslipRefId, periodLabel } from "./payslipFormatters";

export interface PayslipLine {
  label: string;
  amount: number;
}

export interface PayslipDocument {
  refId: string;
  period: { month: number; year: number; label: string };
  employee: {
    id: string;
    cid: string;
    name: string;
    positionTitle: string;
    positionLevel: string;
    departmentName: string;
    agencyName: string;
    bankName: string;
    bankAccountNo: string;
  };
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  totals: {
    grossPay: number;
    totalDeductions: number;
    netPay: number;
  };
}

/** Build the earnings rows from computeEmployeePay output. */
function buildEarningRows(
  basicPay: number,
  pay: ReturnType<typeof computeEmployeePay>,
): PayslipLine[] {
  const rows: PayslipLine[] = [
    { label: "Basic Pay", amount: basicPay },
    { label: "Leave Encashment (LE 8.33%)", amount: pay.le },
    { label: "Leave Travel Concession (LTC 8.33%)", amount: pay.ltc },
    { label: "Lump Sum Revision (50%)", amount: pay.lumpSum },
    { label: "Indexation (5%)", amount: pay.indexation },
  ];
  if (pay.oneOffFixed > 0) {
    rows.push({ label: "One-off Fixed Payment", amount: pay.oneOffFixed });
  }
  return rows;
}

/** Build the deduction rows from computeEmployeePay output. */
function buildDeductionRows(
  pay: ReturnType<typeof computeEmployeePay>,
): PayslipLine[] {
  return [
    { label: "Provident Fund (PF 11%)", amount: pay.pf },
    { label: "Group Insurance Scheme (GIS)", amount: pay.gis },
    { label: "Health Contribution (HC 1%)", amount: pay.hc },
    { label: "TDS (progressive)", amount: pay.tds },
    { label: "CSWS", amount: pay.csws },
  ];
}

/**
 * Produce a full PayslipDocument for an employee in a given period.
 * `period` is the pay period (1-based month + year).
 */
export function buildPayslip(
  employee: Employee,
  period: { month: number; year: number },
): PayslipDocument {
  const pay = computeEmployeePay(employee.basicPay, employee.positionLevel);

  return {
    refId: payslipRefId(employee.id, period.month, period.year),
    period: {
      month: period.month,
      year: period.year,
      label: periodLabel(period.month, period.year),
    },
    employee: {
      id: employee.id,
      cid: employee.cid,
      name: employee.name,
      positionTitle: employee.positionTitle,
      positionLevel: employee.positionLevel,
      departmentName: employee.departmentName,
      agencyName: employee.agencyName,
      bankName: employee.bankName,
      bankAccountNo: employee.bankAccountNo,
    },
    earnings: buildEarningRows(employee.basicPay, pay),
    deductions: buildDeductionRows(pay),
    totals: {
      grossPay: pay.grossPay,
      totalDeductions: pay.totalDeductions,
      netPay: pay.netPay,
    },
  };
}
