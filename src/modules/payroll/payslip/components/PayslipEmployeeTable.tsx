/* ═══════════════════════════════════════════════════════════════════════════
   PayslipEmployeeTable — scrollable employee list
   ───────────────────────────────────────────────────────────────────
   One row per in-scope employee. Clicking a row previews that employee's
   payslip in the right-hand card. Columns: Name, EID, Department, Level,
   Net Pay.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import type { Employee } from "../../types";
import { computeEmployeePay } from "../../state/payrollSeed";
import { nu } from "../helpers/payslipFormatters";

export interface PayslipEmployeeTableProps {
  employees: Employee[];
  selectedEmployeeId: string | null;
  onSelect: (employeeId: string) => void;
}

export function PayslipEmployeeTable(props: PayslipEmployeeTableProps) {
  const { employees, selectedEmployeeId, onSelect } = props;

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
        No employees match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Employee</th>
              <th className="px-3 py-2 text-left font-semibold">EID</th>
              <th className="px-3 py-2 text-left font-semibold">Department</th>
              <th className="px-3 py-2 text-left font-semibold">Level</th>
              <th className="px-3 py-2 text-right font-semibold">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const pay = computeEmployeePay(e.basicPay, e.positionLevel);
              const isActive = e.id === selectedEmployeeId;
              return (
                <tr
                  key={e.id}
                  onClick={() => onSelect(e.id)}
                  className={`cursor-pointer border-b border-slate-100 transition ${
                    isActive
                      ? "bg-emerald-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-4 py-2">
                    <div className="font-semibold text-slate-900">{e.name}</div>
                    <div className="text-[11px] text-slate-500">
                      CID {e.cid}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-slate-700">
                    {e.eid}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {e.departmentName}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {e.positionLevel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">
                    {nu(pay.netPay)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
