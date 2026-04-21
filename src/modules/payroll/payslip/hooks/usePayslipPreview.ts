/* ═══════════════════════════════════════════════════════════════════════════
   usePayslipPreview — produce the payslip document for the selected row
   ───────────────────────────────────────────────────────────────────
   Looks up the selected employee and builds a full PayslipDocument for
   the active period. Returns `null` when no employee is selected, so
   the preview component can render an empty state.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import type { Employee } from "../../types";
import { buildPayslip, type PayslipDocument } from "../helpers/buildPayslip";

export interface UsePayslipPreviewArgs {
  employees: Employee[];
  selectedEmployeeId: string | null;
  period: { month: number; year: number };
}

export function usePayslipPreview(
  args: UsePayslipPreviewArgs,
): PayslipDocument | null {
  const { employees, selectedEmployeeId, period } = args;

  return useMemo(() => {
    if (!selectedEmployeeId) return null;
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return null;
    return buildPayslip(employee, period);
  }, [employees, selectedEmployeeId, period]);
}
