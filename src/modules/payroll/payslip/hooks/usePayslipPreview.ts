/* ═══════════════════════════════════════════════════════════════════════════
   usePayslipPreview — produce the payslip document for the selected row
   ───────────────────────────────────────────────────────────────────
   Looks up the selected employee and builds a full PayslipDocument for
   the active period. Returns `null` when no employee is selected, so
   the preview component can render an empty state.

   Accepts an optional variant override + separation type so the UI can
   flip between Regular and Last payslip formats without changing the
   underlying employee record.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import type { Employee } from "../../types";
import {
  buildPayslip,
  type PayslipDocument,
  type PayslipVariant,
} from "../helpers/buildPayslip";

export interface UsePayslipPreviewArgs {
  employees: Employee[];
  selectedEmployeeId: string | null;
  period: { month: number; year: number };
  /** Optional override — "auto" lets buildPayslip decide from the
   *  employee's separation date. */
  variant?: PayslipVariant | "auto";
  /** Optional separation type (e.g. "Transfer") when known from HR actions. */
  separationType?: string;
}

export function usePayslipPreview(
  args: UsePayslipPreviewArgs,
): PayslipDocument | null {
  const { employees, selectedEmployeeId, period, variant, separationType } = args;

  return useMemo(() => {
    if (!selectedEmployeeId) return null;
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return null;
    return buildPayslip(employee, period, {
      variantOverride: variant && variant !== "auto" ? variant : undefined,
      separationType,
    });
  }, [employees, selectedEmployeeId, period, variant, separationType]);
}
