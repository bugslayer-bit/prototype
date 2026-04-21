/* ═══════════════════════════════════════════════════════════════════════════
   usePayslipEmployees — derive the employee list for the payslip page
   ───────────────────────────────────────────────────────────────────
   Takes the filter state + the active payroll category (civil-servant or
   other-public-servant) and returns:
     • employees   — filtered Employee[] to render in the table
     • departments — unique department names for the department filter LoV

   Keeping this in a dedicated hook means the table component doesn't have
   to know anything about the Employee seed or the filter shape.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { EMPLOYEES } from "../../state/payrollSeed";
import type { Employee, EmployeeCategory } from "../../types";
import type { PayrollPosting } from "../../state/payrollPostings";

export interface UsePayslipEmployeesArgs {
  category: EmployeeCategory;
  search: string;
  department: string;
  selectedPosting: PayrollPosting | null;
}

export interface UsePayslipEmployeesResult {
  employees: Employee[];
  departments: string[];
}

function matchesSearch(e: Employee, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return (
    e.name.toLowerCase().includes(needle) ||
    e.cid.toLowerCase().includes(needle) ||
    e.eid.toLowerCase().includes(needle) ||
    e.id.toLowerCase().includes(needle)
  );
}

function matchesDepartment(e: Employee, dept: string): boolean {
  if (!dept || dept === "all") return true;
  return e.departmentName === dept;
}

function matchesPosting(e: Employee, posting: PayrollPosting | null): boolean {
  if (!posting) return true;
  if (posting.agencyCode && posting.agencyCode !== e.agencyCode) return false;
  if (posting.department && posting.department !== e.departmentName) return false;
  return true;
}

export function usePayslipEmployees(
  args: UsePayslipEmployeesArgs,
): UsePayslipEmployeesResult {
  const { category, search, department, selectedPosting } = args;

  const pool = useMemo(
    () =>
      EMPLOYEES.filter(
        (e) =>
          e.category === category &&
          (!e.status || e.status === "active"),
      ),
    [category],
  );

  const employees = useMemo(
    () =>
      pool.filter(
        (e) =>
          matchesSearch(e, search) &&
          matchesDepartment(e, department) &&
          matchesPosting(e, selectedPosting),
      ),
    [pool, search, department, selectedPosting],
  );

  const departments = useMemo(() => {
    const set = new Set<string>();
    pool.forEach((e) => set.add(e.departmentName));
    return Array.from(set).sort();
  }, [pool]);

  return { employees, departments };
}
