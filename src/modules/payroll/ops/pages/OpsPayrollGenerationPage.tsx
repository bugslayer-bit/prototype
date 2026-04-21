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

type PayrollGenStep = 'select-category' | 'confirm-data' | 'system-checks' | 'draft-paybill' | 'finalize' | 'post-mcp';

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
            6-Step Wizard
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

      {/* Progress Indicator */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur p-6">
        <div className="flex items-center justify-between">
          {(() => {
            const steps: PayrollGenStep[] = [
              'select-category',
              'confirm-data',
              'system-checks',
              'draft-paybill',
              'finalize',
              'post-mcp',
            ];
            const currentIdx = steps.indexOf(currentStep);
            return [
              { step: 'select-category', label: 'Category' },
              { step: 'confirm-data', label: 'Confirm Data' },
              { step: 'system-checks', label: 'System Checks' },
              { step: 'draft-paybill', label: 'Draft PayBill' },
              { step: 'finalize', label: 'Finalize' },
              { step: 'post-mcp', label: 'Post to MCP' },
            ].map((item, index) => (
              <React.Fragment key={item.step}>
                <div
                  className={`flex flex-col items-center gap-2 cursor-pointer transition ${
                    currentStep === item.step ? 'opacity-100' : 'opacity-60 hover:opacity-80'
                  }`}
                  onClick={() => {
                    const targetIdx = steps.indexOf(item.step as PayrollGenStep);
                    if (targetIdx <= currentIdx) {
                      setCurrentStep(item.step as PayrollGenStep);
                    }
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      currentStep === item.step
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                </div>
                {index < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded ${
                      currentIdx > index ? 'bg-blue-500' : 'bg-slate-200'
                    }`}
                    style={{ maxWidth: '60px' }}
                  />
                )}
              </React.Fragment>
            ));
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

        {/* STEP 2: CONFIRM DATA */}
        {currentStep === 'confirm-data' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Step 2: Confirm Employee Data
              </h2>
              <p className="text-sm text-slate-600">
                Review the {draftEmployees.length} employees selected for payroll processing.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold text-slate-900">Name</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-900">EID</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-900">Position</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-900">Basic Pay</th>
                    <th className="px-4 py-2 text-right font-bold text-slate-900">Gross</th>
                    <th className="px-4 py-2 text-center font-bold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {draftEmployees.map((emp) => (
                    <tr key={emp.masterEmpId}>
                      <td className="px-4 py-2 text-slate-900">{emp.firstName} {emp.lastName}</td>
                      <td className="px-4 py-2 text-slate-600">{emp.eid}</td>
                      <td className="px-4 py-2 text-slate-600">{emp.positionTitle}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-900">
                        Nu.{emp.monthlyBasicPay.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-900">
                        Nu.{(emp.monthlyBasicPay * 1.15).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-green-100 text-green-700">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                onClick={handleConfirmDataNext}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

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

        {/* STEP 6: POST TO MCP */}
        {currentStep === 'post-mcp' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Step 6: POST to MCP
              </h2>
              <p className="text-sm text-slate-600">
                Submit payroll to Master Chart of Accounts for financial recording.
              </p>
            </div>

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
