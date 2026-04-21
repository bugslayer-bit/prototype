/**
 * PayrollScopeGuard — Route-level gate that ensures the currently acting
 * persona is permitted to view a CS-only or OPS-only page.
 *
 *   • CS-scoped persona requesting an OPS page → redirected to /payroll/management
 *   • OPS-scoped persona requesting a CS page  → redirected to /payroll/ops
 *   • Cross-scope (admin/auditor/MoF) persona   → always passes through
 *
 * This is intentionally separate from RoleGuard: RoleGuard enforces RBAC role
 * membership; PayrollScopeGuard enforces the CS/OPS channel split demanded by
 * the Bhutan IFMIS payroll model.
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { usePayrollScope } from "../utils/payrollScope";
import { useAgencyUrl } from "../hooks/useAgencyUrl";
import type { EmployeeCategory } from "../../modules/payroll/shared/types";

export interface PayrollScopeGuardProps {
  /** The channel this page belongs to. */
  requiredCategory: EmployeeCategory;
  children: React.ReactNode;
}

export function PayrollScopeGuard({
  requiredCategory,
  children,
}: PayrollScopeGuardProps) {
  const scope = usePayrollScope();
  const { buildPath } = useAgencyUrl();

  // Cross-scope personas see everything.
  if (scope === "all") return <>{children}</>;

  // Scope matches → render.
  if (scope === requiredCategory) return <>{children}</>;

  // Scope mismatch → redirect to the persona's own home.
  const redirectTo =
    scope === "other-public-servant"
      ? buildPath("/payroll/ops")
      : buildPath("/payroll/management");

  return <Navigate to={redirectTo} replace />;
}
