/**
 * payrollScope — Derives which employee category (CS / OPS / both) the
 * currently-acting persona is permitted to operate on, independent of RBAC
 * role permissions.
 *
 * Rules:
 *   • role-admin, role-auditor, role-super-admin        → "all"
 *   • MoF finance (agency 16) Finance Officer           → "all"
 *   • Anyone on an OPS-flagged agency (60..66, 68 etc.) → "other-public-servant"
 *   • Everyone else                                     → "civil-servant"
 *
 * These rules intentionally mirror the dual channel set by Bhutan IFMIS: CS
 * payroll is mastered in ZESt (RCSC) and OPS payroll runs on independent
 * interfaces (RBP HRMS, Judiciary HRIS, RUB HRIS, Parliament HR, LG Portals…)
 */

import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import type { EmployeeCategory } from "../../modules/payroll/shared/types";

export type PayrollScope = EmployeeCategory | "all";

/**
 * Agency codes that belong to the Other Public Servant (OPS) channel. Aligned
 * with opsEmployeeSeed.AGENCIES which uses this exact mapping:
 *   RUB=68 · Judiciary=60 · ECB=61 · RBP=62 · LG=63 · Parliamentary=64 ·
 *   Constitutional Bodies=65 · Local Recruits=66
 */
export const OPS_AGENCY_CODES = new Set<string>([
  "60", "61", "62", "63", "64", "65", "66", "68",
]);

/** Roles that transcend the CS/OPS split and always see both channels. */
const CROSS_SCOPE_ROLES = new Set<string>([
  "role-admin",
  "role-super-admin",
  "role-auditor",
]);

/** MoF is the central finance ministry and therefore always cross-scope. */
const MOF_AGENCY_CODE = "16";

export function getPayrollScope(
  activeAgencyCode: string | null | undefined,
  activeRoleId: string | null | undefined,
): PayrollScope {
  if (activeRoleId && CROSS_SCOPE_ROLES.has(activeRoleId)) return "all";
  // MoF Finance / HR / Head of Agency need both channels.
  if (activeAgencyCode === MOF_AGENCY_CODE) return "all";
  if (activeAgencyCode && OPS_AGENCY_CODES.has(activeAgencyCode)) {
    return "other-public-servant";
  }
  return "civil-servant";
}

/** React hook version: recomputes whenever the acting persona changes. */
export function usePayrollScope(): PayrollScope {
  const { activeAgencyCode, activeRoleId, roleSwitchEpoch } = useAuth();
  return useMemo(
    () => getPayrollScope(activeAgencyCode, activeRoleId),
    // Intentional: roleSwitchEpoch forces re-eval on persona swap even when
    // activeAgencyCode/roleId references are string-equal by coincidence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAgencyCode, activeRoleId, roleSwitchEpoch],
  );
}

/**
 * Convenience: is the requested category visible to the active persona?
 * Used by sub-nav / tab components to hide disallowed tabs.
 */
export function scopeAllows(
  scope: PayrollScope,
  category: EmployeeCategory,
): boolean {
  return scope === "all" || scope === category;
}
