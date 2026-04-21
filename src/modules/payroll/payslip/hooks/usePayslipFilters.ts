/* ═══════════════════════════════════════════════════════════════════════════
   usePayslipFilters — filter state for the PayslipGenerationPage
   ───────────────────────────────────────────────────────────────────
   Owns every piece of filter/selector state on the page so the top-level
   component stays a thin orchestrator and the individual UI blocks can be
   wired up with a single context-free prop set.

     • period           — { month (1-12), year }
     • search           — free-text across name / CID / EID
     • department       — "all" | <departmentName>
     • selectedPostingId — which posted-payroll run to restrict to
     • selectedEmployeeId — employee currently previewed
   ═══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useState } from "react";

export interface PayslipFiltersState {
  period: { month: number; year: number };
  search: string;
  department: string;
  selectedPostingId: string | null;
  selectedEmployeeId: string | null;
}

export interface PayslipFiltersApi extends PayslipFiltersState {
  setPeriod: (next: { month: number; year: number }) => void;
  setSearch: (next: string) => void;
  setDepartment: (next: string) => void;
  selectPosting: (postingId: string | null) => void;
  selectEmployee: (employeeId: string | null) => void;
  reset: () => void;
}

function currentPeriod(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function usePayslipFilters(): PayslipFiltersApi {
  const [period, setPeriod] = useState(currentPeriod);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("all");
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const selectPosting = useCallback((id: string | null) => {
    setSelectedPostingId(id);
    /* Reset the previewed employee whenever the scope changes so the
       preview card doesn't show an employee that no longer matches. */
    setSelectedEmployeeId(null);
  }, []);

  const selectEmployee = useCallback((id: string | null) => {
    setSelectedEmployeeId(id);
  }, []);

  const reset = useCallback(() => {
    setPeriod(currentPeriod());
    setSearch("");
    setDepartment("all");
    setSelectedPostingId(null);
    setSelectedEmployeeId(null);
  }, []);

  return {
    period,
    search,
    department,
    selectedPostingId,
    selectedEmployeeId,
    setPeriod,
    setSearch,
    setDepartment,
    selectPosting,
    selectEmployee,
    reset,
  };
}
