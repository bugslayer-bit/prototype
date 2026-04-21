/* ═══════════════════════════════════════════════════════════════════════════
   PayslipGenerationPage — PRN 8.x Payslip desk
   ───────────────────────────────────────────────────────────────────
   Entry point for payroll officers (Civil Servant stream) and OPS officers
   (Other Public Servant stream) to generate, preview and distribute
   payslips for any employee whose payroll has been processed.

   The page itself is a thin orchestrator — every piece of state is owned
   by `usePayslipFilters`, every data derivation lives in
   `usePayslipEmployees` / `usePayslipPreview`, and every UI block is a
   small focused component. This keeps the file readable and every
   function single-purpose, matching the project's refactor goals.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { EMPLOYEES } from "../state/payrollSeed";
import {
  usePayrollPostings,
  type PayrollPostingStream,
} from "../state/payrollPostings";
import type { EmployeeCategory } from "../types";
import { PayrollGroupSiblingNav } from "../shared/navigation/PayrollSubNav";
import { usePayslipFilters } from "./hooks/usePayslipFilters";
import { usePayslipEmployees } from "./hooks/usePayslipEmployees";
import { usePayslipPreview } from "./hooks/usePayslipPreview";
import { PayslipHero } from "./components/PayslipHero";
import { PayslipPostingSelector } from "./components/PayslipPostingSelector";
import { PayslipFiltersBar } from "./components/PayslipFiltersBar";
import { PayslipEmployeeTable } from "./components/PayslipEmployeeTable";
import { PayslipCard } from "./components/PayslipCard";
import { PayslipActions } from "./components/PayslipActions";

export interface PayslipGenerationPageProps {
  /** Which payroll stream this instance of the page is scoped to. */
  category: EmployeeCategory;
}

/* Category → PayrollPostingStream bridge. */
function streamFor(category: EmployeeCategory): PayrollPostingStream {
  return category === "civil-servant" ? "civil-servant" : "other-public-servant";
}

/** Small headcount for the hero bar — total active employees in this stream. */
function useCategoryHeadcounts(category: EmployeeCategory) {
  return useMemo(() => {
    const pool = EMPLOYEES.filter((e) => e.category === category);
    const active = pool.filter((e) => !e.status || e.status === "active");
    return { activeCount: active.length, totalCount: pool.length };
  }, [category]);
}

export function PayslipGenerationPage(props: PayslipGenerationPageProps) {
  const { category } = props;
  const location = useLocation();

  /* ── State ───────────────────────────────────────────────────────────── */
  const filters = usePayslipFilters();
  const postings = usePayrollPostings();

  /* ── Derived data ────────────────────────────────────────────────────── */
  const selectedPosting = useMemo(
    () =>
      filters.selectedPostingId
        ? postings.find((p) => p.id === filters.selectedPostingId) ?? null
        : null,
    [filters.selectedPostingId, postings],
  );

  const { employees, departments } = usePayslipEmployees({
    category,
    search: filters.search,
    department: filters.department,
    selectedPosting,
  });

  const previewDoc = usePayslipPreview({
    employees,
    selectedEmployeeId: filters.selectedEmployeeId,
    period: filters.period,
  });

  const { activeCount, totalCount } = useCategoryHeadcounts(category);

  /* ── Action handlers ─────────────────────────────────────────────────── */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (!previewDoc) return;
    window.alert(
      `PDF export for ${previewDoc.employee.name} — ${previewDoc.period.label} is queued. ` +
        `(Real PDF generation will wire in once the document service endpoint is live.)`,
    );
  }, [previewDoc]);

  const handleBulkGenerate = useCallback(() => {
    window.alert(
      `Bulk generation of ${employees.length} payslips for ` +
        `${filters.period.month}/${filters.period.year} queued. ` +
        `(Progress will appear in a download centre tray in a future iteration.)`,
    );
  }, [employees.length, filters.period]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-4">
        <PayrollGroupSiblingNav category={category} currentPath={location.pathname} />
      </div>

      <PayslipHero
        category={category}
        period={filters.period}
        onChangePeriod={filters.setPeriod}
        activeCount={activeCount}
        totalCount={totalCount}
      />

      <PayslipPostingSelector
        postings={postings}
        stream={streamFor(category)}
        selectedPostingId={filters.selectedPostingId}
        onSelect={filters.selectPosting}
      />

      <PayslipFiltersBar
        search={filters.search}
        onSearchChange={filters.setSearch}
        department={filters.department}
        departments={departments}
        onDepartmentChange={filters.setDepartment}
        matchedCount={employees.length}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PayslipEmployeeTable
            employees={employees}
            selectedEmployeeId={filters.selectedEmployeeId}
            onSelect={filters.selectEmployee}
          />
        </div>
        <div className="lg:col-span-2">
          <PayslipCard doc={previewDoc} />
          <PayslipActions
            disabled={!previewDoc}
            inScopeCount={employees.length}
            onPrint={handlePrint}
            onDownloadPdf={handleDownloadPdf}
            onBulkGenerate={handleBulkGenerate}
          />
        </div>
      </div>
    </div>
  );
}
