'use client';

import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../shared/data/agencyPersonas';
import type { PayrollGenStep, Employee, PayrollStatus } from '../types';
import { EMPLOYEES, computeEmployeePay, PAY_SCALES, getPayScale, ALLOWANCES, DEDUCTIONS } from '../state/payrollSeed';
import { usePayrollRoleCapabilities, payrollToneClasses } from '../state/usePayrollRoleCapabilities';
import { postPayroll } from '../state/payrollPostings';
import { ModuleActorBanner } from '../../../shared/components/ModuleActorBanner';
import { bhutanBankHierarchy } from '../../../shared/data/bankData';
import { PayrollGroupSiblingNav } from '../shared/navigation/PayrollSubNav';
import { useAgencyUrl } from '../../../shared/hooks/useAgencyUrl';

/**
 * PayrollGenerationPage — Full 6-step dynamic workflow
 * Payroll SRS PRN 2.1 compliance
 *
 * Step 1: Select Department
 * Step 2: Confirm Employee Data
 * Step 3: System Checks
 * Step 4: Draft PayBill
 * Step 5: Finalize PayBill
 * Step 6: POST to MCP
 */
export function PayrollGenerationPage() {
  const auth = useAuth();
  const agency = resolveAgencyContext(auth.activeAgencyCode);
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const [currentStep, setCurrentStep] = useState<PayrollGenStep>('select-department');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [draftEmployees, setDraftEmployees] = useState<Employee[]>([]);
  const [breakdownPopup, setBreakdownPopup] = useState<{
    emp: Employee;
    pay: ReturnType<typeof computeEmployeePay>;
    houseRent: number;
    type: 'allowances' | 'deductions';
  } | null>(null);
  const [systemChecksComplete, setSystemChecksComplete] = useState(false);
  const [draftPayBillData, setDraftPayBillData] = useState<any[]>([]);
  const [certificationChecked, setCertificationChecked] = useState(false);
  const [selectedBank, setSelectedBank] = useState('Bank of Bhutan');
  const [selectedBudgetHead, setSelectedBudgetHead] = useState('2110201');
  const [mcpPostingComplete, setMcpPostingComplete] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(3); // April = index 3
  const [selectedYear, setSelectedYear] = useState(2026);
  const [mcpProgress, setMcpProgress] = useState<'idle' | 'validating' | 'posting' | 'confirming' | 'complete'>('idle');
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);
  const [postingDate, setPostingDate] = useState<string | null>(null);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filter employees by agency                                 */
  /* ───────────────────────────────────────────────────────────────────── */
  const agencyEmployees = useMemo(
    () => EMPLOYEES.filter((e) => e.agencyCode === auth.activeAgencyCode),
    [auth.activeAgencyCode]
  );

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Get unique departments in agency                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const departments = useMemo(() => {
    const depts = new Map<string, { name: string; count: number }>();
    agencyEmployees.forEach((emp) => {
      if (depts.has(emp.departmentCode)) {
        const d = depts.get(emp.departmentCode)!;
        d.count += 1;
      } else {
        depts.set(emp.departmentCode, { name: emp.departmentName, count: 1 });
      }
    });
    return Array.from(depts.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
    }));
  }, [agencyEmployees]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Employees for selected department                          */
  /* ───────────────────────────────────────────────────────────────────── */
  const selectedEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    if (selectedDepartment === 'ALL') return agencyEmployees;
    return agencyEmployees.filter((e) => e.departmentCode === selectedDepartment);
  }, [selectedDepartment, agencyEmployees]);

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
      'select-department',
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
      'select-department',
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
  /* Handler: Step 1 — Select Department → Step 2                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const handleSelectDepartmentNext = () => {
    if (!selectedDepartment) return;
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
    /* Compute pay for all employees */
    const payData = draftEmployees.map((emp) => {
      const pay = computeEmployeePay(emp.basicPay, emp.positionLevel);
      return {
        ...emp,
        ...pay,
      };
    });
    setDraftPayBillData(payData);
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
  /* Render: Stepper Navigation                                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const StepperNav = () => {
    const steps: { key: PayrollGenStep; label: string }[] = [
      { key: 'select-department', label: 'Department Selection' },
      { key: 'confirm-data', label: 'Payroll Computation' },
      { key: 'system-checks', label: 'System Checks' },
      { key: 'draft-paybill', label: 'Draft PayBill' },
      { key: 'finalize', label: 'Finalize Paybill' },
      { key: 'book-compensation', label: 'Booking Employee Compensation' },
      { key: 'post-mcp', label: 'Post to MCP' },
    ];

    return (
      <div className="mb-8 flex items-start justify-between px-4">
        {steps.map((step, idx) => {
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
        })}
      </div>
    );
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Render: Step 1 — Select Department                                   */
  /* ───────────────────────────────────────────────────────────────────── */
  const Step1SelectDepartment = () => (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Select Department</h2>
        <p className="text-slate-600">
          Choose a department to generate payroll for {agency?.agency.name}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <div className="grid gap-3">
          {/* All Departments Option */}
          <button
            onClick={() => setSelectedDepartment('ALL')}
            className={`rounded-lg border-2 p-4 text-left transition-all ${
              selectedDepartment === 'ALL'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-semibold text-slate-900">All Departments</div>
            <div className="text-sm text-slate-500">
              {agencyEmployees.length} employees
            </div>
          </button>

          {/* Department Options */}
          {departments.map((dept) => (
            <button
              key={dept.code}
              onClick={() => setSelectedDepartment(dept.code)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                selectedDepartment === dept.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-slate-900">{dept.name}</div>
              <div className="text-sm text-slate-500">{dept.count} employees</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleSelectDepartmentNext}
          disabled={!selectedDepartment || !caps.canInitiate}
          className="rounded-lg bg-blue-500 text-white px-6 py-2 font-semibold disabled:opacity-50 hover:bg-blue-600"
        >
          Next
        </button>
      </div>
    </div>
  );

  /* ───────────────────────────────────────────────────────────────────── */
  /* Render: Step 2 — Confirm Employee Data                               */
  /* ───────────────────────────────────────────────────────────────────── */
  const Step2ConfirmData = () => {
    const currentMonthYear = `${months[selectedMonth]} ${selectedYear}`;

    return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Payroll Computation for Employee</h2>
        <p className="text-slate-600">
          Live per-employee earnings, deductions and net pay computed from ZESt master data, pay scales and allowance / deduction configuration. Basic Pay is sourced from ZESt and cannot be edited here.
        </p>
      </div>

      {/* ZESt Sync Banner */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 flex items-center gap-3">
        <span className="inline-block h-2 w-2 rounded-full bg-teal-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-teal-900">Data synced from ZESt HR</p>
          <p className="text-xs text-teal-700">Last sync: 12 Apr 2026, 09:15 AM</p>
        </div>
      </div>

      {/* Payroll Period Selector */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Payroll Period</h3>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              {months.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-slate-900">{currentMonthYear}</p>
          </div>
        </div>
      </div>

      {/* ── Per-employee Payroll Computation Matrix ────────────────────── */}
      {(() => {
        /* Build a wide computation row for every employee in the draft. */
        const rows = draftEmployees.map((emp, idx) => {
          const pay = computeEmployeePay(emp.basicPay, emp.positionLevel);
          const A = emp.basicPay;                  // Basic Pay
          const B = 0;                             // Arrears (none by default)
          const C = 0;                             // Partial Pay (none by default)
          const D = pay.totalAllowances;           // Total Allowances
          const X = A + B + C + D;                 // Total Earnings
          const E = pay.pf;
          const F = pay.tds;
          const G = pay.hc;
          const H = pay.gis;
          const I = pay.csws;
          const J = 0;                             // House Rent (floating)
          const Y = E + F + G + H + I + J;
          const Z = X - Y;
          return { emp, pay, idx, A, B, C, D, X, E, F, G, H, I, J, Y, Z };
        });
        const totals = rows.reduce(
          (acc, r) => {
            acc.A += r.A; acc.B += r.B; acc.C += r.C; acc.D += r.D; acc.X += r.X;
            acc.E += r.E; acc.F += r.F; acc.G += r.G; acc.H += r.H; acc.I += r.I; acc.J += r.J;
            acc.Y += r.Y; acc.Z += r.Z;
            return acc;
          },
          { A: 0, B: 0, C: 0, D: 0, X: 0, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, Y: 0, Z: 0 },
        );
        const fmt = (n: number) => n === 0 ? "—" : n.toLocaleString();
        return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
        {/* Legend */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="rounded bg-slate-100 px-2 py-0.5">Employee Details</span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">Earnings · Basic + Allowances</span>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Statutory Deductions</span>
          <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-700">Floating Deductions</span>
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">Net Pay</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              {/* Top group row */}
              <tr className="bg-slate-50 text-slate-700">
                <th colSpan={11} className="border border-slate-200 px-2 py-1.5 text-center text-xs font-bold">Employee Details</th>
                <th colSpan={4} className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-center text-xs font-bold text-blue-800">Earnings</th>
                <th rowSpan={2} className="border border-slate-200 bg-blue-100 px-2 py-1.5 text-center text-xs font-bold text-blue-900 align-middle">Total Earnings<br/><span className="text-[9px] font-mono">X=A+B+C+D</span></th>
                <th colSpan={4} className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-center text-xs font-bold text-amber-800">Statutory Deductions</th>
                <th colSpan={2} className="border border-slate-200 bg-rose-50 px-2 py-1.5 text-center text-xs font-bold text-rose-800">Floating Deductions</th>
                <th rowSpan={2} className="border border-slate-200 bg-amber-100 px-2 py-1.5 text-center text-xs font-bold text-amber-900 align-middle">Total Deductions<br/><span className="text-[9px] font-mono">Y=E+F+G+H+I+J</span></th>
                <th rowSpan={2} className="border border-slate-200 bg-emerald-100 px-2 py-1.5 text-center text-xs font-bold text-emerald-900 align-middle">Net Pay<br/><span className="text-[9px] font-mono">Z=X-Y</span></th>
              </tr>
              {/* Sub-header row */}
              <tr className="bg-slate-50 text-slate-700">
                <th className="border border-slate-200 px-2 py-1.5 text-left">Sl. No</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">Name</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">Gender</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">EID</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">CID/WP</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">TPN</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">DoB</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">Date of Appointment</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">Date of Separation</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">Employee Type</th>
                <th className="border border-slate-200 px-2 py-1.5 text-left">Position Level</th>
                {/* Earnings sub-headers */}
                <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Basic Pay<br/><span className="text-[9px] font-mono text-blue-700">A</span></th>
                <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Arrears<br/><span className="text-[9px] font-mono text-blue-700">B</span></th>
                <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Partial Pay<br/><span className="text-[9px] font-mono text-blue-700">C</span></th>
                <th className="border border-slate-200 bg-blue-50 px-2 py-1.5 text-right">Total Allowances<br/><span className="text-[9px] font-mono text-blue-700">D</span></th>
                {/* Statutory */}
                <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">PF<br/><span className="text-[9px] font-mono text-amber-700">E</span></th>
                <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">TDS<br/><span className="text-[9px] font-mono text-amber-700">F</span></th>
                <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">HC<br/><span className="text-[9px] font-mono text-amber-700">G</span></th>
                <th className="border border-slate-200 bg-amber-50 px-2 py-1.5 text-right">GIS<br/><span className="text-[9px] font-mono text-amber-700">H</span></th>
                {/* Floating */}
                <th className="border border-slate-200 bg-rose-50 px-2 py-1.5 text-right">CSWS<br/><span className="text-[9px] font-mono text-rose-700">I</span></th>
                <th className="border border-slate-200 bg-rose-50 px-2 py-1.5 text-right">House Rent<br/><span className="text-[9px] font-mono text-rose-700">J</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ emp, pay, idx, A, B, C, D, X, E, F, G, H, I, J, Y, Z }) => (
                <tr key={emp.id} className="hover:bg-indigo-50/30">
                  <td className="border border-slate-200 px-2 py-1.5 font-mono text-slate-500">{idx + 1}</td>
                  <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-900 whitespace-nowrap">{emp.name}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-600">{emp.gender}</td>
                  <td className="border border-slate-200 px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">{emp.eid}</td>
                  <td className="border border-slate-200 px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">{emp.cid}</td>
                  <td className="border border-slate-200 px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">{emp.tpn}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-600 whitespace-nowrap">{emp.dateOfBirth}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-600 whitespace-nowrap">{emp.dateOfEmployment}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-600 whitespace-nowrap">{emp.dateOfSeparation || "—"}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-700">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{emp.subType}</span>
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-700">
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">{emp.positionLevel}</span>
                  </td>
                  {/* Earnings */}
                  <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono">
                    <span className="font-bold text-blue-900">{fmt(A)}</span>
                  </td>
                  <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono text-slate-500">{fmt(B)}</td>
                  <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono text-slate-500">{fmt(C)}</td>
                  <td className="border border-slate-200 bg-blue-50/40 px-2 py-1.5 text-right font-mono text-slate-700">
                    {D === 0 ? (
                      fmt(D)
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBreakdownPopup({ emp, pay, houseRent: J, type: 'allowances' })}
                        className="font-semibold text-blue-700 underline decoration-dotted underline-offset-2 hover:text-blue-900"
                        title="View allowance breakdown"
                      >
                        {fmt(D)}
                      </button>
                    )}
                  </td>
                  <td className="border border-slate-200 bg-blue-100/60 px-2 py-1.5 text-right font-mono font-bold text-blue-900">{fmt(X)}</td>
                  {/* Statutory */}
                  <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(E)}</td>
                  <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(F)}</td>
                  <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(G)}</td>
                  <td className="border border-slate-200 bg-amber-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(H)}</td>
                  {/* Floating */}
                  <td className="border border-slate-200 bg-rose-50/40 px-2 py-1.5 text-right font-mono text-slate-700">{fmt(I)}</td>
                  <td className="border border-slate-200 bg-rose-50/40 px-2 py-1.5 text-right font-mono text-slate-500">{fmt(J)}</td>
                  <td className="border border-slate-200 bg-amber-100/60 px-2 py-1.5 text-right font-mono font-bold text-amber-900">
                    {Y === 0 ? (
                      fmt(Y)
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBreakdownPopup({ emp, pay, houseRent: J, type: 'deductions' })}
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
              {/* Totals row */}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={11} className="border border-slate-300 px-2 py-2 text-right text-slate-800">Total Employees with Entitlements for this Payroll Department: {rows.length}</td>
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
                <td className="border border-slate-300 bg-rose-100 px-2 py-2 text-right font-mono text-rose-900">{fmt(totals.J)}</td>
                <td className="border border-slate-300 bg-amber-200 px-2 py-2 text-right font-mono text-amber-900">{fmt(totals.Y)}</td>
                <td className="border border-slate-300 bg-emerald-200 px-2 py-2 text-right font-mono text-emerald-900">{fmt(totals.Z)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg bg-slate-50 p-4">
          <div>
            <div className="text-xs text-slate-600">Total Headcount</div>
            <div className="text-2xl font-bold text-slate-900">{rows.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Total Earnings (X)</div>
            <div className="text-2xl font-bold text-blue-700">Nu. {totals.X.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Total Deductions (Y)</div>
            <div className="text-2xl font-bold text-amber-700">Nu. {totals.Y.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-slate-600">Total Net Pay (Z)</div>
            <div className="text-2xl font-bold text-emerald-700">Nu. {totals.Z.toLocaleString()}</div>
          </div>
        </div>
      </div>
        );
      })()}

      <div className="flex justify-between gap-3">
        <button
          onClick={goPrev}
          className="rounded-lg border border-slate-300 text-slate-900 px-6 py-2 font-semibold hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={handleConfirmDataNext}
          disabled={!caps.canEditDraft && !caps.canInitiate}
          className="rounded-lg bg-blue-500 text-white px-6 py-2 font-semibold disabled:opacity-50 hover:bg-blue-600"
        >
          Next
        </button>
      </div>

      {breakdownPopup && <PayrollBreakdownModal data={breakdownPopup} onClose={() => setBreakdownPopup(null)} />}
    </div>
  );
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Render: Step 3 — System Checks                                       */
  /* ───────────────────────────────────────────────────────────────────── */
  const Step3SystemChecks = () => {
    const [checks, setChecks] = React.useState({
      payrollSchedule: false,
      zestSync: false,
      hrActions: false,
      budgetAvailability: false,
      commitment: false,
      mcpAllocation: false,
    });

    React.useEffect(() => {
      /* Simulate animated checklist */
      const delays = [500, 1000, 1500, 2000, 2500, 3000];
      const timers = Object.keys(checks).map((key, idx) =>
        setTimeout(() => {
          setChecks((prev) => ({ ...prev, [key]: true }));
          if (idx === Object.keys(checks).length - 1) {
            setSystemChecksComplete(true);
          }
        }, delays[idx])
      );
      return () => timers.forEach(clearTimeout);
    }, []);

    const checkList = [
      { key: 'payrollSchedule', label: 'Payroll Schedule check' },
      { key: 'zestSync', label: 'ZESt sync status' },
      { key: 'hrActions', label: 'HR Actions for this month' },
      { key: 'budgetAvailability', label: 'Budget availability' },
      { key: 'commitment', label: 'Commitment check' },
      { key: 'mcpAllocation', label: 'MCP allocation' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-4 text-2xl font-bold text-slate-900">System Checks</h2>
          <p className="text-slate-600">
            Running automated validations before payroll computation
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
          <div className="space-y-4">
            {checkList.map((check) => (
              <div
                key={check.key}
                className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  {checks[check.key as keyof typeof checks] ? (
                    <span className="text-lg text-green-600">✓</span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
                  )}
                </div>
                <span className="text-slate-900 font-medium flex-1">{check.label}</span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    checks[check.key as keyof typeof checks]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {checks[check.key as keyof typeof checks] ? 'PASS' : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={goPrev}
            className="rounded-lg border border-slate-300 text-slate-900 px-6 py-2 font-semibold hover:bg-slate-50"
          >
            Back
          </button>
          <button
            onClick={handleSystemChecksNext}
            disabled={!systemChecksComplete || !caps.canInitiate}
            className="rounded-lg bg-blue-500 text-white px-6 py-2 font-semibold disabled:opacity-50 hover:bg-blue-600"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Render: Step 4 — Booking Employee Compensation                       */
  /*                                                                       */
  /* Preview of the General Ledger journal voucher that will post once the */
  /* paybill is finalised. Debits = personnel emoluments (expense budget  */
  /* lines); credits = statutory liabilities + net salary payable.        */
  /* Totals must balance before the user can proceed.                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const Step4BookCompensation = () => {
    const aggregate = draftEmployees.reduce(
      (acc, emp) => {
        const pay = computeEmployeePay(emp.basicPay, emp.positionLevel);
        acc.basic += emp.basicPay;
        acc.le += pay.le;
        acc.ltc += pay.ltc;
        acc.lumpSum += pay.lumpSum;
        acc.indexation += pay.indexation;
        acc.oneOffFixed += pay.oneOffFixed;
        acc.pf += pay.pf;
        acc.gis += pay.gis;
        acc.hc += pay.hc;
        acc.tds += pay.tds;
        acc.csws += pay.csws;
        acc.net += pay.netPay;
        return acc;
      },
      { basic: 0, le: 0, ltc: 0, lumpSum: 0, indexation: 0, oneOffFixed: 0,
        pf: 0, gis: 0, hc: 0, tds: 0, csws: 0, net: 0 },
    );

    const debitLines = [
      { code: '2110201', name: 'Basic Salary — Civil Service',           amount: aggregate.basic },
      { code: '2120101', name: 'Leave Encashment (LE)',                  amount: aggregate.le },
      { code: '2120102', name: 'Leave Travel Concession (LTC)',          amount: aggregate.ltc },
      { code: '2120125', name: 'Lump Sum Revision (50%)',                amount: aggregate.lumpSum },
      { code: '2120126', name: 'One-off 5% Indexation',                  amount: aggregate.indexation },
      { code: '2120127', name: 'One-off Fixed Payment',                  amount: aggregate.oneOffFixed },
    ];
    const creditLines = [
      { code: '22101', name: 'PF Payable — NPPF',                        amount: aggregate.pf },
      { code: '22102', name: 'GIS Payable — RICBL',                      amount: aggregate.gis },
      { code: '22103', name: 'HC Payable — DRC',                         amount: aggregate.hc },
      { code: '22104', name: 'TDS Payable — DRC',                        amount: aggregate.tds },
      { code: '22105', name: 'CSWS Payable — RCSC',                      amount: aggregate.csws },
      { code: '22001', name: 'Net Salary Payable — Bank Disbursement',   amount: aggregate.net },
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
            Draft journal entry preview for this payroll run. Each budget line below records the debit
            (personnel-emolument expense) and credit (statutory liability or net salary payable) that
            will post to the General Ledger when the paybill is finalised.
          </p>
        </div>

        {/* Balance banner */}
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          balanced ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
        }`}>
          <span className={`inline-block h-2 w-2 rounded-full ${
            balanced ? 'bg-emerald-600' : 'bg-rose-600'
          }`} />
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

        {/* Journal voucher */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Journal Voucher — Preview
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-800">
                {months[selectedMonth]} {selectedYear} · {draftEmployees.length} employees
                {selectedDepartment && selectedDepartment !== 'ALL' && ` · ${selectedDepartment}`}
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
                  <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                    Debit · Personnel Emoluments (Expense)
                  </td>
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
                  <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                    Credit · Statutory Liabilities & Salary Payable
                  </td>
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

        <div className="flex justify-between gap-3">
          <button
            onClick={goPrev}
            className="rounded-lg border border-slate-300 text-slate-900 px-6 py-2 font-semibold hover:bg-slate-50"
          >
            Back
          </button>
          <button
            onClick={goNext}
            disabled={!balanced}
            title={balanced ? '' : 'Journal must balance before booking'}
            className="rounded-lg bg-blue-500 text-white px-6 py-2 font-semibold disabled:opacity-50 hover:bg-blue-600"
          >
            Book & Continue
          </button>
        </div>
      </div>
    );
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Render: Step 5 — Draft PayBill                                       */
  /* ───────────────────────────────────────────────────────────────────── */
  const Step4DraftPayBill = () => {
    const ucoaMapping = {
      'Basic Pay': '2110201',
      'LE': '2120101',
      'LTC': '2120102',
      'Lump Sum 50%': '2120125',
      'Indexation 5%': '2120126',
      'One-off Fixed': '2120127',
      'PF': '22101',
      'GIS': '22102',
      'HC': '22103',
      'TDS': '22104',
      'CSWS': '22105',
    };

    return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Draft PayBill</h2>
        <p className="text-slate-600">
          Salary computation table per employee. SRS Note: UCoA mapping verified.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">EID</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>Basic</div><div className="text-xs text-slate-500 font-normal">(UCoA: 2110201)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>LE</div><div className="text-xs text-slate-500 font-normal">(UCoA: 2120101)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>LTC</div><div className="text-xs text-slate-500 font-normal">(UCoA: 2120102)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>Lump 50%</div><div className="text-xs text-slate-500 font-normal">(UCoA: 2120125)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>5% Index</div><div className="text-xs text-slate-500 font-normal">(UCoA: 2120126)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>Fixed</div><div className="text-xs text-slate-500 font-normal">(UCoA: 2120127)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Allow</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Gross</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>PF (10%)</div><div className="text-xs text-slate-500 font-normal">(UCoA: 22101)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>GIS</div><div className="text-xs text-slate-500 font-normal">(UCoA: 22102)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>HC (1%)</div><div className="text-xs text-slate-500 font-normal">(UCoA: 22103)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>TDS</div><div className="text-xs text-slate-500 font-normal">(UCoA: 22104)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700"><div>CSWS</div><div className="text-xs text-slate-500 font-normal">(UCoA: 22105)</div></th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Ded</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {draftPayBillData.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.eid}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.basicPay.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.le.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.ltc.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.lumpSum.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.indexation.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.oneOffFixed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.totalAllowances.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 bg-blue-50">
                    {row.grossPay.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.pf.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.gis.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.hc.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.tds.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.csws.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.totalDeductions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 bg-green-50">
                    {row.netPay.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td colSpan={2} className="px-4 py-3">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.basicPay, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.le, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.ltc, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.lumpSum, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.indexation, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.oneOffFixed, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData
                    .reduce((sum, r) => sum + r.totalAllowances, 0)
                    .toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right bg-blue-100">
                  {payrollSummary.totalGross.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.pf, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.gis, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.hc, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.tds, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {draftPayBillData.reduce((sum, r) => sum + r.csws, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {payrollSummary.totalDeductions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right bg-green-100">
                  {payrollSummary.totalNet.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="flex gap-3">
        <button className="rounded-lg border border-slate-300 text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Download CSV
        </button>
        <button className="rounded-lg border border-slate-300 text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Download Excel
        </button>
      </div>

      <div className="flex justify-between gap-3">
        <button
          onClick={goPrev}
          className="rounded-lg border border-slate-300 text-slate-900 px-6 py-2 font-semibold hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={handleDraftPayBillNext}
          disabled={!caps.canInitiate}
          className="rounded-lg bg-blue-500 text-white px-6 py-2 font-semibold disabled:opacity-50 hover:bg-blue-600"
        >
          Next
        </button>
      </div>
    </div>
  );
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Render: Step 5 — Finalize PayBill                                    */
  /* ───────────────────────────────────────────────────────────────────── */
  const Step5Finalize = () => (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Finalize PayBill</h2>
        <p className="text-slate-600">
          Review summary, certify, and select bank for net payment deposit
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Payroll Summary</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Department</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {selectedDepartment === 'ALL'
                ? 'All Departments'
                : departments.find((d) => d.code === selectedDepartment)?.name}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Period</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{months[selectedMonth]} {selectedYear}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Employee Count</div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {payrollSummary.employeeCount}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Total Gross</div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              Nu. {payrollSummary.totalGross.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <div className="text-sm text-slate-600">Total Deductions</div>
            <div className="mt-1 text-lg font-bold text-red-600">
              Nu. {payrollSummary.totalDeductions.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <div className="text-sm text-slate-600">Total Net</div>
            <div className="mt-1 text-lg font-bold text-green-600">
              Nu. {payrollSummary.totalNet.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Certification Checkbox */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <label className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={certificationChecked}
            onChange={(e) => setCertificationChecked(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-500"
          />
          <span className="text-slate-900">
            I, hereby, certify the payroll for{' '}
            <strong>
              {selectedDepartment === 'ALL'
                ? 'All Departments'
                : departments.find((d) => d.code === selectedDepartment)?.name}
            </strong>{' '}
            for <strong>{months[selectedMonth]} {selectedYear}</strong>
          </span>
        </label>
      </div>

      {/* Bank Selection */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <label className="block">
          <span className="block text-sm font-semibold text-slate-700 mb-2">
            Select Bank for Net Payment Deposit
          </span>
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2"
          >
            {bhutanBankHierarchy.map((bank) => (
              <option key={bank.id} value={bank.name}>{bank.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex justify-between gap-3">
        <button
          onClick={goPrev}
          className="rounded-lg border border-slate-300 text-slate-900 px-6 py-2 font-semibold hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={handleFinalizeNext}
          disabled={!certificationChecked || !caps.canSubmit}
          className="rounded-lg bg-blue-500 text-white px-6 py-2 font-semibold disabled:opacity-50 hover:bg-blue-600"
        >
          Forward to Approval Authority
        </button>
      </div>
    </div>
  );

  /* ───────────────────────────────────────────────────────────────────── */
  /* Render: Step 6 — POST to MCP                                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const Step6PostMCP = () => {
    const handlePostToMCP = () => {
      setMcpProgress('validating');
      const journalId = `JNL-MCP-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
      const today = new Date();
      const postDate = `${String(today.getDate()).padStart(2, '0')} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][today.getMonth()]} ${today.getFullYear()}`;

      setTimeout(() => setMcpProgress('posting'), 1200);
      setTimeout(() => setMcpProgress('confirming'), 2400);
      setTimeout(() => {
        setJournalEntryId(journalId);
        setPostingDate(postDate);
        setMcpProgress('complete');
        setMcpPostingComplete(true);

        /* Publish to cross-agency posting queue so MoF can pick it up
           for payment processing. Errors here are non-fatal. */
        try {
          const totals = draftPayBillData.reduce(
            (acc, r) => ({
              gross: acc.gross + (r.grossPay || 0),
              deductions: acc.deductions + (r.totalDeductions || 0),
              net: acc.net + (r.netPay || 0),
            }),
            { gross: 0, deductions: 0, net: 0 },
          );
          postPayroll({
            journalEntryId: journalId,
            agencyCode: auth.activeAgencyCode || agency?.code || 'unknown',
            agencyName: agency?.name || auth.activeAgencyCode || 'Unknown Agency',
            stream: 'civil-servant',
            department: selectedDepartment || undefined,
            month: selectedMonth + 1,
            year: selectedYear,
            frequency: 'monthly',
            employeeCount: draftPayBillData.length,
            grossAmount: totals.gross,
            deductionsAmount: totals.deductions,
            netAmount: totals.net,
            postedByRoleId: auth.activeRoleId ?? null,
            postedByRoleName: caps.activeRoleName ?? null,
          });
        } catch (err) {
          console.warn('[payrollPostings] failed to record CS posting', err);
        }
      }, 3600);
    };

    return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">POST to MCP</h2>
        <p className="text-slate-600">Budget integration and MCP posting status</p>
      </div>

      {/* SRS Note */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <strong>SRS Note:</strong> MCP report will include Name, CID, Designation, Bank Account,
          and Net Pay for each employee.
        </p>
      </div>

      {/* Budget Head Selection */}
      {(() => {
        /* Map each UCoA code onto a higher-level Budget Head so the dropdown
           surfaces the Budget Head structure — users pick a named head, not a
           raw Economic Segment code. */
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
              <span className="block text-sm font-semibold text-slate-700 mb-2">
                Budget Code
              </span>
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

      {/* Bank Validation */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Bank Validation Status</h3>
        <div className="space-y-3">
          {[
            { bank: 'Bank of Bhutan', status: 'pass' },
            { bank: 'BNB', status: 'pass' },
            { bank: 'BDBL', status: 'pass' },
          ].map((item) => (
            <div key={item.bank} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <span className={`text-lg ${item.status === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                {item.status === 'pass' ? '✓' : '✗'}
              </span>
              <span className="flex-1 font-medium text-slate-900">{item.bank}</span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  item.status === 'pass'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {item.status === 'pass' ? 'VALIDATED' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MCP Posting Status */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">MCP Posting Status</h3>
        {mcpProgress !== 'idle' && mcpProgress !== 'complete' && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${mcpProgress === 'validating' || mcpProgress === 'posting' || mcpProgress === 'confirming' ? 'bg-blue-100' : 'bg-green-100'}`}>
                {mcpProgress === 'validating' || mcpProgress === 'posting' || mcpProgress === 'confirming' ? (
                  <div className="animate-spin text-blue-600">⟳</div>
                ) : (
                  <span className="text-green-600">✓</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Validating journal entries...</p>
                <p className="text-xs text-slate-500">Checking transaction integrity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${mcpProgress === 'posting' || mcpProgress === 'confirming' ? 'bg-blue-100' : (mcpProgress as string) === 'complete' ? 'bg-green-100' : 'bg-slate-100'}`}>
                {mcpProgress === 'posting' || mcpProgress === 'confirming' ? (
                  <div className="animate-spin text-blue-600">⟳</div>
                ) : (mcpProgress as string) === 'complete' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-slate-400">○</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Posting to MCP...</p>
                <p className="text-xs text-slate-500">Recording GL transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${mcpProgress === 'confirming' ? 'bg-blue-100' : (mcpProgress as string) === 'complete' ? 'bg-green-100' : 'bg-slate-100'}`}>
                {mcpProgress === 'confirming' ? (
                  <div className="animate-spin text-blue-600">⟳</div>
                ) : (mcpProgress as string) === 'complete' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-slate-400">○</span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Confirming GL posting...</p>
                <p className="text-xs text-slate-500">Verifying balance sheet impact</p>
              </div>
            </div>
          </div>
        )}
        <div
          className={`rounded-lg border-2 p-6 text-center transition-all ${
            mcpPostingComplete
              ? 'border-green-300 bg-green-50'
              : 'border-blue-300 bg-blue-50'
          }`}
        >
          {mcpPostingComplete ? (
            <>
              <div className="text-4xl text-green-600 mb-2">✓</div>
              <div className="text-lg font-bold text-green-900">MCP Posting Successful</div>
              {journalEntryId && (
                <>
                  <div className="mt-3 text-sm text-green-700">
                    <p className="font-semibold">Journal Entry ID: {journalEntryId}</p>
                    <p className="text-xs mt-1">Posted on: {postingDate}</p>
                  </div>
                  <div className="mt-4 text-sm text-green-700">
                    <p className="font-semibold">Total Debits = Total Credits ✓</p>
                    <p className="text-xs mt-1">GL posting status: RECONCILED</p>
                  </div>
                </>
              )}
            </>
          ) : mcpProgress !== 'idle' ? (
            <>
              <div className="text-4xl text-blue-600 mb-2 animate-spin">◐</div>
              <div className="text-lg font-bold text-blue-900">Processing...</div>
              <div className="mt-2 text-sm text-blue-700">
                {mcpProgress === 'validating' && 'Validating journal entries...'}
                {mcpProgress === 'posting' && 'Posting to MCP...'}
                {mcpProgress === 'confirming' && 'Confirming GL posting...'}
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl text-slate-400 mb-2">◯</div>
              <div className="text-lg font-bold text-slate-900">Ready to post</div>
            </>
          )}
        </div>
      </div>

      {/* Remittance Summary */}
      {mcpPostingComplete && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Remittance Summary</h3>
          <p className="mb-4 text-xs text-slate-500">
            Queued as <strong>pending</strong>. Each body will be auto-posted by IFMIS once MCP releases the
            salary payment (see Remittances Desk for dispatch status).
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">DRC — TDS</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                Nu. {draftPayBillData.reduce((sum, r) => sum + r.tds, 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">DRC — HC</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                Nu. {draftPayBillData.reduce((sum, r) => sum + r.hc, 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">NPPF (PF)</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                Nu. {draftPayBillData.reduce((sum, r) => sum + r.pf, 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">RICBL (GIS)</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                Nu. {draftPayBillData.reduce((sum, r) => sum + r.gis, 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">RCSC (CSWS)</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                Nu. {draftPayBillData.reduce((sum, r) => sum + r.csws, 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">House Rent (DRC / NHDCL / NPPF)</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                Nu. {draftPayBillData.reduce((sum, r) => sum + (r.houseRent || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-between gap-3">
        <button
          onClick={goPrev}
          className="rounded-lg border border-slate-300 text-slate-900 px-6 py-2 font-semibold hover:bg-slate-50"
        >
          Back
        </button>
        {!mcpPostingComplete && mcpProgress === 'idle' && (
          <button
            onClick={handlePostToMCP}
            disabled={!caps.canPostMCP}
            className="rounded-lg bg-green-600 text-white px-6 py-2 font-semibold disabled:opacity-50 hover:bg-green-700"
          >
            Post to MCP
          </button>
        )}
        {mcpPostingComplete && (
          <button className="rounded-lg bg-slate-600 text-white px-6 py-2 font-semibold hover:bg-slate-700">
            Complete & Download Payslips
          </button>
        )}
      </div>
    </div>
  );
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Main Render                                                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const location = useLocation();
  const { buildPath } = useAgencyUrl();
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Link to={buildPath("/")} className="hover:text-indigo-600 hover:underline">Home</Link>
          <span className="opacity-50">›</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 hover:underline">Payroll</Link>
          <span className="opacity-50">›</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 hover:underline">Payroll Management</Link>
          <span className="opacity-50">›</span>
          <span className="font-semibold text-slate-700">⚙️ Payroll Processing</span>
          <span className="opacity-50">›</span>
          <span className="font-bold text-indigo-700">Payroll Generation</span>
        </nav>

        {/* Sibling nav — peer links for Payroll Processing */}
        <div className="mb-4">
          <PayrollGroupSiblingNav category="civil-servant" currentPath={location.pathname} />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Payroll Generation</h1>
          <p className="mt-2 text-slate-600">
            IFMIS Civil Service Payroll — SRS PRN 2.1
          </p>
        </div>

        <ModuleActorBanner moduleKey="payroll-generation" />

        {/* ── Persona Banner ── */}
        <div className={`rounded-xl border ${tone.border} ${tone.bg} p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                <span className={`text-sm font-bold ${tone.text}`}>{caps.activeRoleName}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{caps.personaTagline}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {caps.capabilityList.slice(0, 3).map((c) => (
                <span key={c} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.pill}`}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Stepper */}
        <StepperNav />

        {/* Content */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-8">
          {currentStep === 'select-department' && <Step1SelectDepartment />}
          {currentStep === 'confirm-data' && <Step2ConfirmData />}
          {currentStep === 'system-checks' && <Step3SystemChecks />}
          {currentStep === 'book-compensation' && <Step4BookCompensation />}
          {currentStep === 'draft-paybill' && <Step4DraftPayBill />}
          {currentStep === 'finalize' && <Step5Finalize />}
          {currentStep === 'post-mcp' && <Step6PostMCP />}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Breakdown popup — shown when a user clicks a Total Allowances (D) or
   Total Deductions (Y) cell in the Payroll Computation table. Lists each
   component name, its UCoA code, and the amount that makes up the total.
   ────────────────────────────────────────────────────────────────────────── */
interface PayrollBreakdownModalProps {
  data: {
    emp: Employee;
    pay: ReturnType<typeof computeEmployeePay>;
    houseRent: number;
    type: 'allowances' | 'deductions';
  };
  onClose: () => void;
}

function PayrollBreakdownModal({ data, onClose }: PayrollBreakdownModalProps) {
  const { emp, pay, houseRent, type } = data;
  const isAllowance = type === 'allowances';

  const items: { code: string; name: string; amount: number }[] = isAllowance
    ? [
        { code: '2120101', name: 'Leave Encashment (LE)',       amount: pay.le },
        { code: '2120102', name: 'Leave Travel Concession (LTC)', amount: pay.ltc },
        { code: '2120125', name: 'Lump Sum Revision (50%)',     amount: pay.lumpSum },
        { code: '2120126', name: 'One-off 5% Indexation',        amount: pay.indexation },
        { code: '2120127', name: 'One-off Fixed Payment',        amount: pay.oneOffFixed },
      ]
    : [
        { code: '22101', name: 'Provident Fund (PF)',          amount: pay.pf },
        { code: '22104', name: 'Tax Deducted at Source (TDS)', amount: pay.tds },
        { code: '22103', name: 'Health Contribution (HC)',      amount: pay.hc },
        { code: '22102', name: 'Group Insurance Scheme (GIS)',  amount: pay.gis },
        { code: '22105', name: 'Civil Servant Welfare Scheme (CSWS)', amount: pay.csws },
        { code: '22106', name: 'House Rent',                    amount: houseRent },
      ];

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
            <h3 className={`mt-1 text-lg font-bold ${tone.text}`}>{emp.name}</h3>
            <p className="text-xs text-slate-600">
              {emp.eid} · {emp.positionLevel} · {emp.subType}
            </p>
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
              {items.map((it) => (
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
