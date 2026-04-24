'use client';

import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useAgencyUrl } from '../../../../shared/hooks/useAgencyUrl';
import { PayrollGroupSiblingNav } from '../../shared/navigation/PayrollSubNav';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import {
  OPS_EMPLOYEES,
  getOpsEmployeeWithPayDetails,
  type OpsEmployee,
} from '../data/opsEmployeeSeed';
import { getOpsCategoriesForAgency, getOpsCategory, isCentralPayrollAgency } from '../data/opsPayScales';
import { postPayroll } from '../../state/payrollPostings';
import { ALLOWANCES, DEDUCTIONS } from '../../state/payrollSeed';

/** Payroll row enriched with computed gross/deductions/net (Step 3→6). */
type EnrichedPayrollRow = OpsEmployee & {
  allowances: { id: string; name: string; amount: number }[];
  deductions: { id: string; name: string; amount: number }[];
  totalAllowances: number;
  grossPay: number;
  statutoryDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
};

type PayrollGenStep = 'select-category' | 'confirm-data' | 'system-checks' | 'draft-paybill' | 'finalize' | 'book-compensation' | 'post-mcp';

/**
 * OpsPayrollGenerationPage — Full 6-step dynamic workflow
 * Payroll SRS PRN 2.1 compliance (OPS variant)
 *
 * Step 1: Select OPS Category
 * Step 2: Confirm Employee Data
 * Step 3: System Checks
 * Step 4: Draft PayBill
 * Step 5: Finalize PayBill
 * Step 6: POST to MCP
 */
export function OpsPayrollGenerationPage() {
  const auth = useAuth();
  const agency = resolveAgencyContext(auth.activeAgencyCode);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useAgencyUrl();

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const [currentStep, setCurrentStep] = useState<PayrollGenStep>('select-category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [draftEmployees, setDraftEmployees] = useState<OpsEmployee[]>([]);
  const [systemChecksComplete, setSystemChecksComplete] = useState(false);
  const [draftPayBillData, setDraftPayBillData] = useState<EnrichedPayrollRow[]>([]);
  const [certificationChecked, setCertificationChecked] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(3); // April = index 3
  const [selectedYear, setSelectedYear] = useState(2026);
  const [frequency, setFrequency] = useState<'monthly' | 'fortnightly'>('monthly');
  const [mcpProgress, setMcpProgress] = useState<'idle' | 'validating' | 'posting' | 'confirming' | 'complete'>('idle');
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);
  const [selectedBudgetHead, setSelectedBudgetHead] = useState('2110201');
  const [breakdownPopup, setBreakdownPopup] = useState<{
    emp: OpsEmployee;
    allowances: { id: string; name: string; amount: number }[];
    deductions: { id: string; name: string; amount: number }[];
    type: 'allowances' | 'deductions';
  } | null>(null);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* Categories are scoped to the acting agency. MoF (code 16) sees every
     OPS category — every other agency sees only its own. When the agency
     has exactly ONE category the dropdown auto-selects it so the wizard
     stays on the right path without extra clicks. */
  const categories = useMemo(
    () => getOpsCategoriesForAgency(auth.activeAgencyCode),
    [auth.activeAgencyCode, auth.roleSwitchEpoch],
  );
  const isCentralAgency = isCentralPayrollAgency(auth.activeAgencyCode);

  React.useEffect(() => {
    if (categories.length === 1 && selectedCategory !== categories[0].id) {
      setSelectedCategory(categories[0].id);
    }
    // If the previously selected category is no longer visible after a
    // persona switch, clear it so the user re-selects inside their scope.
    if (selectedCategory && !categories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory(null);
      setSelectedDepartment(null);
    }
  }, [categories, selectedCategory]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filter employees by agency                                 */
  /* ───────────────────────────────────────────────────────────────────── */
  const agencyEmployees = useMemo(() => {
    // Admin / super roles (canManageEmployees) see every agency; others see only
    // their own active agency. Matches OpsEmployeeRegistryPage semantics.
    if (caps.canManageEmployees) return OPS_EMPLOYEES;
    return OPS_EMPLOYEES.filter((e) => e.workingAgency === auth.activeAgencyCode);
  }, [auth.activeAgencyCode, caps.canManageEmployees]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Get unique departments in agency                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const departments = useMemo(() => {
    const depts = new Map<string, { name: string; count: number }>();
    agencyEmployees.forEach((emp) => {
      if (depts.has(emp.organizationSegment)) {
        const d = depts.get(emp.organizationSegment)!;
        d.count += 1;
      } else {
        depts.set(emp.organizationSegment, { name: emp.designation, count: 1 });
      }
    });
    return Array.from(depts.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
    }));
  }, [agencyEmployees]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Employees for selected category and department              */
  /* ───────────────────────────────────────────────────────────────────── */
  const selectedEmployees = useMemo(() => {
    let emps = agencyEmployees;

    if (selectedCategory) {
      emps = emps.filter((e) => e.employeeCategory === selectedCategory);
    }

    if (selectedDepartment && selectedDepartment !== 'ALL') {
      emps = emps.filter((e) => e.organizationSegment === selectedDepartment);
    }

    return emps;
  }, [selectedCategory, selectedDepartment, agencyEmployees]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Draft payroll summary (Step 4 & 5)                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const payrollSummary = useMemo(() => {
    if (draftPayBillData.length === 0) {
      return {
        employeeCount: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
      };
    }
    return {
      employeeCount: draftPayBillData.length,
      totalGross: draftPayBillData.reduce((sum, row) => sum + (row.grossPay || 0), 0),
      totalDeductions: draftPayBillData.reduce((sum, row) => sum + (row.totalDeductions || 0), 0),
      totalNet: draftPayBillData.reduce((sum, row) => sum + (row.netPay || 0), 0),
    };
  }, [draftPayBillData]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handler: Move to next step                                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const goNext = () => {
    const steps: PayrollGenStep[] = [
      'select-category',
      'confirm-data',
      'system-checks',
      'draft-paybill',
      'finalize',
      'book-compensation',
      'post-mcp',
    ];
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1]);
    }
  };

  const goPrev = () => {
    const steps: PayrollGenStep[] = [
      'select-category',
      'confirm-data',
      'system-checks',
      'draft-paybill',
      'finalize',
      'book-compensation',
      'post-mcp',
    ];
    const idx = steps.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(steps[idx - 1]);
    }
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handler: Step 1 — Select Category → Step 2                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const handleSelectCategoryNext = () => {
    if (!selectedCategory) return;
    const emps = selectedEmployees;
    setDraftEmployees(emps);
    goNext();
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handler: Step 2 — Confirm Data → Step 3                              */
  /* ───────────────────────────────────────────────────────────────────── */
  const handleConfirmDataNext = () => {
    goNext();
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handler: Step 3 — System Checks → Step 4                             */
  /* ───────────────────────────────────────────────────────────────────── */
  const handleSystemChecksNext = () => {
    if (!systemChecksComplete) return;
    /*
     * Build the fully computed payroll row for every draft employee.
     * getOpsEmployeeWithPayDetails returns { allowances, deductions, grossSalary, netSalary }
     * — we re-shape it into EnrichedPayrollRow so downstream steps always see
     * non-zero gross/deductions/net figures.
     */
    const enriched: EnrichedPayrollRow[] = draftEmployees.map((emp) => {
      const computed = getOpsEmployeeWithPayDetails(emp.eid);
      if (!computed) {
        // Fallback: approximate if helper misses (defensive only).
        const basicPay = emp.monthlyBasicPay ?? 0;
        const grossPay = Math.round(basicPay * 1.15);
        const totalDeductions = Math.round(basicPay * 0.2);
        return {
          ...emp,
          allowances: [],
          deductions: [],
          totalAllowances: Math.round(grossPay - basicPay),
          grossPay,
          statutoryDeductions: totalDeductions,
          otherDeductions: 0,
          totalDeductions,
          netPay: grossPay - totalDeductions,
        };
      }

      const statutoryIds = new Set(['DED-001', 'DED-002', 'DED-003', 'DED-004']);
      const statutory = computed.deductions
        .filter((d) => statutoryIds.has(d.id))
        .reduce((s, d) => s + d.amount, 0);
      const other = computed.deductions
        .filter((d) => !statutoryIds.has(d.id))
        .reduce((s, d) => s + d.amount, 0);
      const totalDed = computed.deductions.reduce((s, d) => s + d.amount, 0);

      return {
        ...emp,
        allowances: computed.allowances,
        deductions: computed.deductions,
        totalAllowances: computed.grossSalary - emp.monthlyBasicPay,
        grossPay: computed.grossSalary,
        statutoryDeductions: statutory,
        otherDeductions: other,
        totalDeductions: totalDed,
        netPay: computed.netSalary,
      };
    });
    setDraftPayBillData(enriched);
    goNext();
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handler: Step 4 — Draft PayBill → Step 5                             */
  /* ───────────────────────────────────────────────────────────────────── */
  const handleDraftPayBillNext = () => {
    goNext();
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handler: Step 5 — Finalize → Step 6                                  */
  /* ───────────────────────────────────────────────────────────────────── */
  const handleFinalizeNext = () => {
    if (!certificationChecked) return;
    goNext();
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handler: Step 6 — POST to MCP                                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const handlePostToMCP = async () => {
    if (!caps.canPostMCP) return;
    setMcpProgress('validating');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setMcpProgress('posting');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setMcpProgress('confirming');
    const journalId = `JE-OPS-${Date.now()}`;
    setJournalEntryId(journalId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setMcpProgress('complete');

    /* ── Publish the posting to the cross-agency queue so MoF can pick
          it up for payment processing on their Payroll Management
          dashboard. Totals are derived from the enriched Draft PayBill
          produced in Step 4. ─────────────────────────────────────── */
    const totals = draftPayBillData.reduce(
      (acc, r) => ({
        gross: acc.gross + (r.grossPay || 0),
        deductions: acc.deductions + (r.totalDeductions || 0),
        net: acc.net + (r.netPay || 0),
      }),
      { gross: 0, deductions: 0, net: 0 },
    );
    const cat = selectedCategory ? getOpsCategory(selectedCategory) : undefined;
    try {
      postPayroll({
        journalEntryId: journalId,
        agencyCode: auth.activeAgencyCode || agency?.code || 'unknown',
        agencyName: agency?.name || auth.activeAgencyCode || 'Unknown Agency',
        stream: 'other-public-servant',
        opsCategoryId: selectedCategory || undefined,
        opsCategoryName: cat?.name,
        department: selectedDepartment || undefined,
        month: selectedMonth + 1,
        year: selectedYear,
        frequency,
        employeeCount: draftPayBillData.length,
        grossAmount: totals.gross,
        deductionsAmount: totals.deductions,
        netAmount: totals.net,
        postedByRoleId: auth.activeRoleId ?? null,
        postedByRoleName: caps.activeRoleName ?? null,
      });
    } catch (err) {
      console.warn('[payrollPostings] failed to record posting', err);
    }
    console.log(`[Toast] Payroll posted to MCP: ${journalId}`);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Breadcrumb + Back / Forward */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={buildPath('/')} className="hover:text-indigo-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to={buildPath('/payroll/management')} className="hover:text-indigo-600 font-semibold">Payroll</Link>
          <span>/</span>
          <Link to={buildPath('/payroll/ops')} className="hover:text-indigo-600 font-semibold">OPS Payroll</Link>
          <span>/</span>
          <span className="font-bold text-indigo-700">Payroll Generation</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
          >
            Forward →
          </button>
          <button
            type="button"
            onClick={() => navigate(buildPath('/payroll/ops'))}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100"
          >
            ⬆ OPS Payroll
          </button>
        </div>
      </nav>

      {/* Sibling navigation — OPS group peers */}
      <PayrollGroupSiblingNav category="other-public-servant" currentPath={location.pathname} />

      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            OPS Payroll Generation
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            7-Step Wizard
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Generate and finalize OPS payroll for {agency?.agency.name || auth.activeAgencyCode}
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-payroll-generation" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">{caps.isReadOnly ? "Read-Only Access" : "Full Access"}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">OPS Payroll Generation</p>
          </div>
        </div>
      </div>

      {/* Progress Indicator — mirrors CS Payroll Generation stepper */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur p-6">
        <div className="mb-2 flex items-start justify-between px-4">
          {(() => {
            const steps: { key: PayrollGenStep; label: string }[] = [
              { key: 'select-category', label: 'OPS Category Selection' },
              { key: 'confirm-data', label: 'Payroll Computation' },
              { key: 'system-checks', label: 'System Checks' },
              { key: 'draft-paybill', label: 'Draft PayBill' },
              { key: 'finalize', label: 'Finalize Paybill' },
              { key: 'book-compensation', label: 'Booking Employee Compensation' },
              { key: 'post-mcp', label: 'Post to MCP' },
            ];
            return steps.map((step, idx) => {
              const isActive = currentStep === step.key;
              const isPassed = steps.findIndex((s) => s.key === currentStep) > idx;
              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && (
                    <div className={`mt-5 h-1 flex-1 ${isPassed ? 'bg-green-500' : 'bg-slate-200'}`} />
                  )}
                  <div
                    onClick={() => setCurrentStep(step.key)}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : isPassed
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <div
                      className={`w-24 text-center text-[11px] font-semibold leading-tight transition-colors ${
                        isActive
                          ? 'text-blue-700'
                          : isPassed
                          ? 'text-green-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        {/* STEP 1: SELECT CATEGORY */}
        {currentStep === 'select-category' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Step 1: Select OPS Category
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Choose the OPS category and department to generate payroll for.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  OPS Category
                </label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment || ''}
                  onChange={(e) => setSelectedDepartment(e.target.value || null)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedCategory}
                >
                  <option value="">Select a department...</option>
                  <option value="ALL">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name} ({dept.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Period */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Frequency
              </label>
              <div className="flex gap-4">
                {(['monthly', 'fortnightly'] as const).map((freq) => (
                  <label key={freq} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={freq}
                      checked={frequency === freq}
                      onChange={() => setFrequency(freq)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">
                      {freq === 'monthly' ? 'Monthly' : 'Fortnightly'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary Card */}
            {selectedCategory && (
              <div className="border-t border-slate-200/50 pt-4">
                <div className="bg-blue-50 border border-blue-200/50 rounded-lg p-4">
                  <p className="text-sm font-bold text-blue-900">
                    Selected: {selectedEmployees.length} employee(s)
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Total Monthly Payroll: Nu.{selectedEmployees.reduce((sum, e) => sum + ((e as any).grossSalary || e.monthlyBasicPay * 1.15), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200/50">
              <button
                onClick={handleSelectCategoryNext}
                disabled={!selectedCategory}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PAYROLL COMPUTATION — wide per-employee matrix (mirrors CS) */}
        {currentStep === 'confirm-data' && (() => {
          const fmt = (n: number) => (n === 0 ? '—' : n.toLocaleString());
          const rows = draftEmployees.map((emp, idx) => {
            const computed = getOpsEmployeeWithPayDetails(emp.eid);
            const allowances = computed?.allowances ?? [];
            const deductions = computed?.deductions ?? [];
            const A = emp.monthlyBasicPay;
            const B = 0;
            const C = 0;
            const D = allowances.reduce((s, a) => s + a.amount, 0);
            const X = A + B + C + D;
            const byName = (n: string) => deductions.find((d) => d.name.startsWith(n))?.amount ?? 0;
            const E = byName('Provident Fund');
            const F = byName('Tax Deducted');
            const G = byName('Health Contribution');
            const H = byName('Group Insurance');
            const otherDed = deductions
              .filter((d) => !/Provident Fund|Tax Deducted|Health Contribution|Group Insurance/.test(d.name))
              .reduce((s, d) => s + d.amount, 0);
            const I = otherDed;
            const Y = E + F + G + H + I;
            const Z = X - Y;
            return { emp, idx, allowances, deductions, A, B, C, D, X, E, F, G, H, I, Y, Z };
          });
          const totals = rows.reduce(
            (acc, r) => {
              acc.A += r.A; acc.B += r.B; acc.C += r.C; acc.D += r.D; acc.X += r.X;
              acc.E += r.E; acc.F += r.F; acc.G += r.G; acc.H += r.H; acc.I += r.I;
              acc.Y += r.Y; acc.Z += r.Z;
              return acc;
            },
            { A: 0, B: 0, C: 0, D: 0, X: 0, E: 0, F: 0, G: 0, H: 0, I: 0, Y: 0, Z: 0 },
          );

          return (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 text-2xl font-bold text-slate-900">Payroll Computation for Employee</h2>
                <p className="text-slate-600">
                  Live per-employee earnings, deductions and net pay computed from OPS master data, pay scales and allowance /
                  deduction configuration. Basic Pay is sourced from the OPS registry and cannot be edited here.
                </p>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 flex items-center gap-3">
                <span className="inline-block h-2 w-2 rounded-full bg-teal-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-teal-900">OPS roster synced</p>
                  <p className="text-xs text-teal-700">Period: {months[selectedMonth]} {selectedYear} · {frequency}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="rounded bg-slate-100 px-2 py-0.5">Employee Details</span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">Earnings · Basic + Allowances</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Statutory Deductions</span>
                  <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-700">Other Deductions</span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">Net Pay</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700">
                        <th colSpan={5} className="border border-slate-200 px-2 py-1.5 text-center text-xs font-bold">Employee Details</th>
                        <th colSpan={4} className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-center text-xs font-bold text-blue-800">Earnings</th>
                        <th rowSpan={2} className="border border-slate-200 bg-blue-100 px-2 py-1.5 text-center text-xs font-bold text-blue-900 align-middle">Total Earnings<br/><span className="text-[9px] font-mono">X=A+B+C+D</span></th>
                        <th colSpan={4} className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-center text-xs font-bold text-amber-800">Statutory Deductions</th>
                        <th rowSpan={2} className="border border-slate-200 bg-rose-50 px-2 py-1.5 text-center text-xs font-bold text-rose-800 align-middle">Other Deductions<br/><span className="text-[9px] font-mono">I</span></th>
                        <th rowSpan={2} className="border border-slate-200 bg-amber-100 px-2 py-1.5 text-center text-xs font-bold text-amber-900 align-middle">Total Deductions<br/><span className="text-[9px] font-mono">Y=E+F+G+H+I</span></th>
                        <th rowSpan={2} className="border border-slate-200 bg-emerald-100 px-2 py-1.5 text-center text-xs font-bold text-emerald-900 align-middle">Net Pay<br/><span className="text-[9px] font-mono">Z=X-Y</span></th>
                      </tr>
                      <tr className="bg-slate-50 text-slate-700">
                        <th className="border border-slate-200 px-2 py-1.5 text-left">Sl. No</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-left">Name</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-left">EID</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-left">Position</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-left">Status</th>
                        <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Basic Pay<br/><span className="text-[9px] font-mono text-blue-700">A</span></th>
                        <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Arrears<br/><span className="text-[9px] font-mono text-blue-700">B</span></th>
                        <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Partial Pay<br/><span className="text-[9px] font-mono text-blue-700">C</span></th>
                        <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Total Allowances<br/><span className="text-[9px] font-mono text-blue-700">D</span></th>
                        <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">PF<br/><span className="text-[9px] font-mono text-amber-700">E</span></th>
                        <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">TDS<br/><span className="text-[9px] font-mono text-amber-700">F</span></th>
                        <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">HC<br/><span className="text-[9px] font-mono text-amber-700">G</span></th>
                        <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">GIS<br/><span className="text-[9px] font-mono text-amber-700">H</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ emp, allowances, deductions, A, B, C, D, X, E, F, G, H, I, Y, Z }, i) => (
                        <tr key={emp.eid} className="hover:bg-indigo-50/30">
                          <td className="border border-slate-200 px-2 py-1.5 font-mono text-slate-500">{i + 1}</td>
                          <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-900 whitespace-nowrap">{emp.firstName} {emp.lastName}</td>
                          <td className="border border-slate-200 px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">{emp.eid}</td>
                          <td className="border border-slate-200 px-2 py-1.5 text-slate-600 whitespace-nowrap">{emp.positionTitle}</td>
                          <td className="border border-slate-200 px-2 py-1.5 text-slate-700">
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">{emp.status}</span>
                          </td>
                          <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono">
                            <span className="font-bold text-blue-900">{fmt(A)}</span>
                          </td>
                          <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono text-slate-500">{fmt(B)}</td>
                          <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono text-slate-500">{fmt(C)}</td>
                          <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono text-slate-700">
                            {D === 0 ? fmt(D) : (
                              <button
                                type="button"
                                onClick={() => setBreakdownPopup({ emp, allowances, deductions, type: 'allowances' })}
                                className="font-semibold text-blue-700 underline decoration-dotted underline-offset-2 hover:text-blue-900"
                                title="View allowance breakdown"
                              >
                                {fmt(D)}
                              </button>
                            )}
                          </td>
                          <td className="border border-slate-200 bg-blue-100/60 px-2 py-1.5 text-right font-mono font-bold text-blue-900">{fmt(X)}</td>
                          <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(E)}</td>
                          <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(F)}</td>
                          <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(G)}</td>
                          <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(H)}</td>
                          <td className="border border-slate-200 bg-rose-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(I)}</td>
                          <td className="border border-slate-200 bg-amber-100/60 px-2 py-1.5 text-right font-mono font-bold text-amber-900">
                            {Y === 0 ? fmt(Y) : (
                              <button
                                type="button"
                                onClick={() => setBreakdownPopup({ emp, allowances, deductions, type: 'deductions' })}
                                className="font-bold text-amber-900 underline decoration-dotted underline-offset-2 hover:text-amber-700"
                                title="View deduction breakdown"
                              >
                                {fmt(Y)}
                              </button>
                            )}
                          </td>
                          <td className="border border-slate-200 bg-emerald-100/60 px-2 py-1.5 text-right font-mono font-bold text-emerald-900">{fmt(Z)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={5} className="border border-slate-300 px-2 py-2 text-right text-slate-800">Total Employees: {rows.length}</td>
                        <td className="border border-slate-300 bg-blue-100 px-2 py-2 text-right font-mono text-blue-900">{fmt(totals.A)}</td>
                        <td className="border border-slate-300 bg-blue-100 px-2 py-2 text-right font-mono text-blue-900">{fmt(totals.B)}</td>
                        <td className="border border-slate-300 bg-blue-100 px-2 py-2 text-right font-mono text-blue-900">{fmt(totals.C)}</td>
                        <td className="border border-slate-300 bg-blue-100 px-2 py-2 text-right font-mono text-blue-900">{fmt(totals.D)}</td>
                        <td className="border border-slate-300 bg-blue-200 px-2 py-2 text-right font-mono text-blue-900">{fmt(totals.X)}</td>
                        <td className="border border-slate-300 bg-amber-100 px-2 py-2 text-right font-mono text-amber-900">{fmt(totals.E)}</td>
                        <td className="border border-slate-300 bg-amber-100 px-2 py-2 text-right font-mono text-amber-900">{fmt(totals.F)}</td>
                        <td className="border border-slate-300 bg-amber-100 px-2 py-2 text-right font-mono text-amber-900">{fmt(totals.G)}</td>
                        <td className="border border-slate-300 bg-amber-100 px-2 py-2 text-right font-mono text-amber-900">{fmt(totals.H)}</td>
                        <td className="border border-slate-300 bg-rose-100 px-2 py-2 text-right font-mono text-rose-900">{fmt(totals.I)}</td>
                        <td className="border border-slate-300 bg-amber-200 px-2 py-2 text-right font-mono text-amber-900">{fmt(totals.Y)}</td>
                        <td className="border border-slate-300 bg-emerald-200 px-2 py-2 text-right font-mono text-emerald-900">{fmt(totals.Z)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg bg-slate-50 p-4">
                  <div><div className="text-xs text-slate-600">Total Headcount</div><div className="text-2xl font-bold text-slate-900">{rows.length}</div></div>
                  <div><div className="text-xs text-slate-600">Total Earnings (X)</div><div className="text-2xl font-bold text-blue-700">Nu. {totals.X.toLocaleString()}</div></div>
                  <div><div className="text-xs text-slate-600">Total Deductions (Y)</div><div className="text-2xl font-bold text-amber-700">Nu. {totals.Y.toLocaleString()}</div></div>
                  <div><div className="text-xs text-slate-600">Total Net Pay (Z)</div><div className="text-2xl font-bold text-emerald-700">Nu. {totals.Z.toLocaleString()}</div></div>
                </div>
              </div>

              <div className="flex gap-3 justify-between pt-4 border-t border-slate-200/50">
                <button onClick={goPrev} className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition">← Previous</button>
                <button onClick={handleConfirmDataNext} className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition">Next Step →</button>
              </div>

              {breakdownPopup && <OpsPayrollBreakdownModal data={breakdownPopup} onClose={() => setBreakdownPopup(null)} />}
            </div>
          );
        })()}

        {/* STEP 3: SYSTEM CHECKS */}
        {currentStep === 'system-checks' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Step 3: System Checks
              </h2>
              <p className="text-sm text-slate-600">
                Verify all system validations before proceeding.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Payroll Schedule Check', status: 'pass' as const },
                { label: 'HR Actions Applied', status: 'pass' as const },
                { label: 'Salary Computation Verified', status: 'pass' as const },
                { label: 'Tax/Deduction Calculations', status: 'pass' as const },
                { label: 'Unusual Entries', status: 'warn' as const },
              ].map((check, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    check.status === 'pass'
                      ? 'border-green-200/50 bg-green-50/50'
                      : 'border-amber-200/50 bg-amber-50/50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${
                      check.status === 'pass'
                        ? 'bg-green-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {check.status === 'pass' ? '✓' : '⚠'}
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {check.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-200/50">
              <input
                type="checkbox"
                id="checks-complete"
                checked={systemChecksComplete}
                onChange={(e) => setSystemChecksComplete(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="checks-complete" className="text-sm text-slate-700">
                All checks verified — proceed to draft
              </label>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 justify-between pt-4 border-t border-slate-200/50">
              <button
                onClick={goPrev}
                className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition"
              >
                ← Previous
              </button>
              <button
                onClick={handleSystemChecksNext}
                disabled={!systemChecksComplete}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DRAFT PAYBILL */}
        {currentStep === 'draft-paybill' && (
          <DraftPayBillStep
            rows={draftPayBillData}
            payrollSummary={payrollSummary}
            onPrev={goPrev}
            onNext={handleDraftPayBillNext}
          />
        )}

        {/* STEP 5: FINALIZE */}
        {currentStep === 'finalize' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Step 5: Finalize Payroll
              </h2>
              <p className="text-sm text-slate-600">
                Certify and lock the payroll for posting.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-blue-200/50 bg-blue-50/50 p-3">
                <p className="text-xs text-blue-600 font-bold uppercase">Employees</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {payrollSummary.employeeCount}
                </p>
              </div>
              <div className="rounded-lg border border-green-200/50 bg-green-50/50 p-3">
                <p className="text-xs text-green-600 font-bold uppercase">Gross Pay</p>
                <p className="text-lg font-bold text-green-900 mt-1">
                  Nu.{(payrollSummary.totalGross / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="rounded-lg border border-red-200/50 bg-red-50/50 p-3">
                <p className="text-xs text-red-600 font-bold uppercase">Deductions</p>
                <p className="text-lg font-bold text-red-900 mt-1">
                  Nu.{(payrollSummary.totalDeductions / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="rounded-lg border border-purple-200/50 bg-purple-50/50 p-3">
                <p className="text-xs text-purple-600 font-bold uppercase">Net Pay</p>
                <p className="text-lg font-bold text-purple-900 mt-1">
                  Nu.{(payrollSummary.totalNet / 100000).toFixed(1)}L
                </p>
              </div>
            </div>

            {/* Certification */}
            <div className="border border-amber-200/50 bg-amber-50/50 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={certificationChecked}
                  onChange={(e) => setCertificationChecked(e.target.checked)}
                  className="w-4 h-4 mt-1 flex-shrink-0"
                />
                <span className="text-sm text-slate-700">
                  <span className="font-bold">I, hereby, certify</span> that the payroll of OPS employees for this period is accurate, complete, and in accordance with all applicable rules and regulations. The computation has been verified and all statutory obligations have been met.
                </span>
              </label>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 justify-between pt-4 border-t border-slate-200/50">
              <button
                onClick={goPrev}
                className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition"
              >
                ← Previous
              </button>
              <button
                onClick={handleFinalizeNext}
                disabled={!certificationChecked}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: BOOKING EMPLOYEE COMPENSATION — journal voucher preview */}
        {currentStep === 'book-compensation' && (() => {
          const aggregate = draftPayBillData.reduce(
            (acc, row) => {
              acc.basic += row.monthlyBasicPay;
              row.allowances.forEach((a) => {
                acc.allowTotals[a.name] = (acc.allowTotals[a.name] ?? 0) + a.amount;
              });
              row.deductions.forEach((d) => {
                acc.dedTotals[d.name] = (acc.dedTotals[d.name] ?? 0) + d.amount;
              });
              acc.net += row.netPay;
              return acc;
            },
            {
              basic: 0,
              net: 0,
              allowTotals: {} as Record<string, number>,
              dedTotals: {} as Record<string, number>,
            },
          );

          const debitLines = [
            { code: '2110201', name: 'Basic Salary — OPS', amount: aggregate.basic },
            ...Object.entries(aggregate.allowTotals).map(([name, amount]) => {
              const code = ALLOWANCES.find((a) => a.name === name)?.ucoaCode ?? '2120199';
              return { code, name, amount };
            }),
          ];
          const creditLines = [
            ...Object.entries(aggregate.dedTotals).map(([name, amount]) => {
              const code = DEDUCTIONS.find((d) => d.name === name)?.ucoaCode ?? '22199';
              return { code, name: `${name} Payable`, amount };
            }),
            { code: '22001', name: 'Net Salary Payable — Bank Disbursement', amount: aggregate.net },
          ];

          const totalDebit = debitLines.reduce((s, l) => s + l.amount, 0);
          const totalCredit = creditLines.reduce((s, l) => s + l.amount, 0);
          const balanced = totalDebit === totalCredit;
          const fmt = (n: number) => (n === 0 ? '—' : n.toLocaleString());

          return (
            <div className="space-y-6">
              <div>
                <h2 className="mb-4 text-2xl font-bold text-slate-900">Booking Employee Compensation</h2>
                <p className="text-slate-600">
                  Draft journal entry preview for this OPS payroll run. Each budget line below records the debit (personnel-emolument expense) and credit (statutory liability or net salary payable) that will post to the General Ledger when the paybill is finalised.
                </p>
              </div>

              <div className={`rounded-2xl border p-4 flex items-center gap-3 ${balanced ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${balanced ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${balanced ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {balanced ? 'Journal entry is balanced' : 'Journal entry is NOT balanced'}
                  </p>
                  <p className={`text-xs ${balanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Total Debit Nu. {totalDebit.toLocaleString()} · Total Credit Nu. {totalCredit.toLocaleString()}
                    {balanced ? '' : ` · Difference Nu. ${Math.abs(totalDebit - totalCredit).toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Journal Voucher — Preview</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-800">
                      {months[selectedMonth]} {selectedYear} · {draftPayBillData.length} employees · OPS
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">PRN 2.1 · Booking</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700">
                        <th className="border-b border-slate-200 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide">Budget Line</th>
                        <th className="border-b border-slate-200 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide">UCoA Code</th>
                        <th className="border-b border-slate-200 px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-blue-700">Debit (Nu.)</th>
                        <th className="border-b border-slate-200 px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-rose-700">Credit (Nu.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-blue-50">
                        <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-800">Debit · Personnel Emoluments (Expense)</td>
                      </tr>
                      {debitLines.map((l) => (
                        <tr key={`d-${l.code}-${l.name}`} className="border-t border-slate-100 hover:bg-blue-50/30">
                          <td className="px-4 py-2 font-semibold text-slate-800">{l.name}</td>
                          <td className="px-4 py-2 font-mono text-slate-500">{l.code}</td>
                          <td className="px-4 py-2 text-right font-mono text-blue-900">{fmt(l.amount)}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-300">—</td>
                        </tr>
                      ))}
                      <tr className="bg-rose-50">
                        <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">Credit · Statutory Liabilities & Salary Payable</td>
                      </tr>
                      {creditLines.map((l) => (
                        <tr key={`c-${l.code}-${l.name}`} className="border-t border-slate-100 hover:bg-rose-50/30">
                          <td className="px-4 py-2 font-semibold text-slate-800">{l.name}</td>
                          <td className="px-4 py-2 font-mono text-slate-500">{l.code}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-300">—</td>
                          <td className="px-4 py-2 text-right font-mono text-rose-900">{fmt(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                        <td className="px-4 py-3 text-slate-800" colSpan={2}>TOTAL</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-900">{totalDebit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-900">{totalCredit.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 justify-between pt-4 border-t border-slate-200/50">
                <button onClick={goPrev} className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition">← Previous</button>
                <button
                  onClick={goNext}
                  disabled={!balanced}
                  title={balanced ? '' : 'Journal must balance before booking'}
                  className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Book & Continue →
                </button>
              </div>
            </div>
          );
        })()}

        {/* STEP 7: POST TO MCP */}
        {currentStep === 'post-mcp' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                POST to MCP
              </h2>
              <p className="text-sm text-slate-600">
                Budget integration and MCP posting status.
              </p>
            </div>

            {/* SRS Note */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                <strong>SRS Note:</strong> MCP report will include Name, CID, Designation, Bank Account,
                and Net Pay for each employee.
              </p>
            </div>

            {/* Budget Head Selection — grouped by Budget Head (mirrors CS) */}
            {(() => {
              const budgetHeadOf = (code: string): string => {
                if (code.startsWith('2110')) return 'Salaries & Wages';
                if (code.startsWith('2120')) return 'Allowances';
                if (code.startsWith('221')) return 'Statutory Deductions Payable';
                if (code.startsWith('222')) return 'OPS Deductions Payable';
                return 'Other Budget Heads';
              };

              const itemFor = (code: string) =>
                ALLOWANCES.find((a) => a.ucoaCode === code) ??
                DEDUCTIONS.find((d) => d.ucoaCode === code);

              const allCodes = Array.from(
                new Set(['2110201', ...[...ALLOWANCES, ...DEDUCTIONS].map((i) => i.ucoaCode)]),
              ).sort();

              const grouped = allCodes.reduce<Record<string, { code: string; label: string }[]>>(
                (acc, code) => {
                  const head = budgetHeadOf(code);
                  const label = code === '2110201' ? 'Salaries (Basic)' : (itemFor(code)?.name ?? '');
                  (acc[head] ??= []).push({ code, label });
                  return acc;
                },
                {},
              );

              const headOrder = [
                'Salaries & Wages',
                'Allowances',
                'Statutory Deductions Payable',
                'OPS Deductions Payable',
                'Other Budget Heads',
              ];

              return (
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Budget Head Selection</h3>
                  <label className="block">
                    <span className="block text-sm font-semibold text-slate-700 mb-2">Budget Code</span>
                    <select
                      value={selectedBudgetHead}
                      onChange={(e) => setSelectedBudgetHead(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2"
                    >
                      {headOrder
                        .filter((h) => grouped[h]?.length)
                        .map((head) => (
                          <optgroup key={head} label={head}>
                            {grouped[head].map(({ code, label }) => (
                              <option key={code} value={code}>
                                {label} — {code}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                    </select>
                  </label>
                </div>
              );
            })()}

            {/* Progress Indicator */}
            <div className="space-y-3">
              {[
                { label: 'Budget Validation', status: mcpProgress !== 'idle' ? 'pass' : 'idle' },
                { label: 'Payroll Posting', status: ['posting', 'confirming', 'complete'].includes(mcpProgress) ? 'pass' : 'idle' },
                { label: 'Bank Validation', status: mcpProgress === 'complete' ? 'pass' : 'idle' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                    step.status === 'pass'
                      ? 'border-green-200/50 bg-green-50/50'
                      : 'border-slate-200/50 bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      step.status === 'pass'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-300 text-slate-600'
                    }`}
                  >
                    {step.status === 'pass' ? '✓' : step.status === 'idle' ? '—' : '◌'}
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Journal Entry */}
            {journalEntryId && (
              <div className="border border-green-200/50 bg-green-50/50 rounded-lg p-4">
                <p className="text-sm font-bold text-green-900">
                  ✓ Posted Successfully
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Journal Entry ID: <span className="font-mono font-bold">{journalEntryId}</span>
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 justify-between pt-4 border-t border-slate-200/50">
              <button
                onClick={goPrev}
                disabled={mcpProgress !== 'idle' && mcpProgress !== 'complete'}
                className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ← Previous
              </button>
              <button
                onClick={handlePostToMCP}
                disabled={!caps.canPostMCP || mcpProgress !== 'idle'}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {mcpProgress === 'idle' ? 'Post to MCP' : mcpProgress === 'complete' ? '✓ Complete' : 'Processing...'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 2.1 — OPS Payroll Generation
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Step 4 — Draft PayBill: uses the *computed* values produced in Step 3 so
 * the table and totals are genuinely dynamic (no hardcoded 0.15 / 0.13 etc.).
 * ═══════════════════════════════════════════════════════════════════════════ */
interface DraftPayBillStepProps {
  rows: EnrichedPayrollRow[];
  payrollSummary: {
    employeeCount: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
  };
  onPrev: () => void;
  onNext: () => void;
}

function DraftPayBillStep({ rows, payrollSummary, onPrev, onNext }: DraftPayBillStepProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const totalBasic = rows.reduce((s, r) => s + r.monthlyBasicPay, 0);
  const totalAllow = rows.reduce((s, r) => s + r.totalAllowances, 0);
  const totalStat = rows.reduce((s, r) => s + r.statutoryDeductions, 0);
  const totalOther = rows.reduce((s, r) => s + r.otherDeductions, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Step 4: Draft PayBill</h2>
        <p className="text-sm text-slate-600">
          Full payroll breakdown for {rows.length} employee(s). Values are computed from Pay Scale Master ×
          OPS allowances × statutory & other deductions.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-900">
            No employees selected — return to Step 1 to pick a category with roster data.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/50">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-slate-900">Employee</th>
                <th className="px-3 py-2 text-left font-bold text-slate-900">EID</th>
                <th className="px-3 py-2 text-right font-bold text-slate-900">Basic</th>
                <th className="px-3 py-2 text-right font-bold text-slate-900">Allowances</th>
                <th className="px-3 py-2 text-right font-bold text-slate-900">Gross</th>
                <th className="px-3 py-2 text-right font-bold text-slate-900">Stat. Ded</th>
                <th className="px-3 py-2 text-right font-bold text-slate-900">Other Ded</th>
                <th className="px-3 py-2 text-right font-bold text-slate-900">Total Ded</th>
                <th className="px-3 py-2 text-right font-bold text-slate-900">Net</th>
                <th className="px-3 py-2 text-center font-bold text-slate-900">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {rows.map((row) => {
                const key = row.eid;
                const isOpen = expandedRow === key;
                return (
                  <React.Fragment key={key}>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-900 font-medium">
                        {`${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-xs">{row.eid}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900">
                        Nu.{row.monthlyBasicPay.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">
                        Nu.{row.totalAllowances.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900 font-semibold">
                        Nu.{row.grossPay.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">
                        Nu.{row.statutoryDeductions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">
                        Nu.{row.otherDeductions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-red-600 font-semibold">
                        Nu.{row.totalDeductions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-green-700">
                        Nu.{row.netPay.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setExpandedRow(isOpen ? null : key)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-slate-200/50 transition text-xs"
                          title="View allowance / deduction breakdown"
                        >
                          {isOpen ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-blue-50/30 border-l-4 border-l-blue-400">
                        <td colSpan={10} className="px-6 py-3">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-bold uppercase text-emerald-700 mb-1">
                                Allowances ({row.allowances.length})
                              </p>
                              <ul className="space-y-0.5 text-xs">
                                {row.allowances.length === 0 && (
                                  <li className="text-slate-400">No monthly allowances applicable.</li>
                                )}
                                {row.allowances.map((a) => (
                                  <li key={a.id} className="flex justify-between">
                                    <span className="text-slate-700">{a.name}</span>
                                    <span className="font-mono text-slate-900">
                                      Nu.{a.amount.toLocaleString()}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase text-red-700 mb-1">
                                Deductions ({row.deductions.length})
                              </p>
                              <ul className="space-y-0.5 text-xs">
                                {row.deductions.length === 0 && (
                                  <li className="text-slate-400">No deductions applied.</li>
                                )}
                                {row.deductions.map((d) => (
                                  <li key={d.id} className="flex justify-between">
                                    <span className="text-slate-700">{d.name}</span>
                                    <span className="font-mono text-slate-900">
                                      Nu.{d.amount.toLocaleString()}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr className="bg-blue-50 border-t-2 border-blue-200/50 font-bold">
                <td className="px-3 py-2 text-slate-900" colSpan={2}>TOTAL ({rows.length})</td>
                <td className="px-3 py-2 text-right font-mono">Nu.{totalBasic.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">Nu.{totalAllow.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">Nu.{payrollSummary.totalGross.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">Nu.{totalStat.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">Nu.{totalOther.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">Nu.{payrollSummary.totalDeductions.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">Nu.{payrollSummary.totalNet.toLocaleString()}</td>
                <td className="px-3 py-2 text-center">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-3 justify-between pt-4 border-t border-slate-200/50">
        <button
          onClick={onPrev}
          className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition"
        >
          ← Previous
        </button>
        <button
          onClick={onNext}
          disabled={rows.length === 0}
          className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next Step →
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Breakdown popup — shown when a user clicks a Total Allowances (D) or
   Total Deductions (Y) cell in the OPS Payroll Computation table. Lists
   each component name, its UCoA code, and the amount.
   ────────────────────────────────────────────────────────────────────────── */
interface OpsPayrollBreakdownModalProps {
  data: {
    emp: OpsEmployee;
    allowances: { id: string; name: string; amount: number }[];
    deductions: { id: string; name: string; amount: number }[];
    type: 'allowances' | 'deductions';
  };
  onClose: () => void;
}

function OpsPayrollBreakdownModal({ data, onClose }: OpsPayrollBreakdownModalProps) {
  const { emp, allowances, deductions, type } = data;
  const isAllowance = type === 'allowances';

  const items = (isAllowance ? allowances : deductions).map((item) => {
    const allowance = ALLOWANCES.find((a) => a.name === item.name);
    const deduction = DEDUCTIONS.find((d) => d.name === item.name);
    const code = allowance?.ucoaCode ?? deduction?.ucoaCode ?? '—';
    return { code, name: item.name, amount: item.amount };
  });

  const total = items.reduce((s, i) => s + i.amount, 0);
  const tone = isAllowance
    ? { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', pill: 'bg-blue-100 text-blue-800' }
    : { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', pill: 'bg-amber-100 text-amber-800' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-start justify-between gap-3 border-b ${tone.border} ${tone.bg} px-6 py-4`}>
          <div>
            <div className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${tone.pill}`}>
              {isAllowance ? 'Allowance Breakdown' : 'Deduction Breakdown'}
            </div>
            <h3 className={`mt-1 text-lg font-bold ${tone.text}`}>{emp.firstName} {emp.lastName}</h3>
            <p className="text-xs text-slate-600">{emp.eid} · {emp.positionTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left font-bold">Component</th>
                <th className="px-4 py-2 text-left font-bold">UCoA</th>
                <th className="px-4 py-2 text-right font-bold">Amount (Nu.)</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No {isAllowance ? 'allowances' : 'deductions'} applicable.
                  </td>
                </tr>
              ) : items.map((it) => (
                <tr key={it.code + it.name} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-semibold text-slate-800">{it.name}</td>
                  <td className="px-4 py-2 font-mono text-slate-500">{it.code}</td>
                  <td className={`px-4 py-2 text-right font-mono ${it.amount === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                    {it.amount === 0 ? '—' : it.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 ${tone.border} ${tone.bg} font-bold`}>
                <td className={`px-4 py-2.5 ${tone.text}`} colSpan={2}>
                  {isAllowance ? 'Total Allowances (D)' : 'Total Deductions (Y)'}
                </td>
                <td className={`px-4 py-2.5 text-right font-mono ${tone.text}`}>{total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
