'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import { OPS_EMPLOYEES, type OpsEmployee } from '../data/opsEmployeeSeed';
import { getOpsCategoriesForAgency } from '../data/opsPayScales';

interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  cid: string;
  agencyCode: string;
  positionTitle: string;
  basicPay: number;
  grossPay: number;
  advanceRequested: number;
  amount: number;
  monthlyDeduction: number;
  payrollDepartmentName: string;
  agencyName: string;
  budgetCode: string;
  budgetBalanceCheck: boolean;
  commitmentAmountCheck: boolean;
  deductionMethod: 'equal-installment' | 'percentage' | 'lump-sum';
  paymentOrderStatus: 'pending' | 'issued' | 'processed';
  paymentOrderNumber?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'recovering' | 'settled';
  requestDate: string;
  approvalDate?: string;
  disbursementDate?: string;
  recoveryProgress: number; // 0-100%
  reason?: string;
}

/**
 * OpsSalaryAdvancePage — Salary Advance Processing for OPS
 * Payroll SRS PRN 3.1 compliance
 *
 * Features:
 * - Configuration view (rules and limits per OPS category)
 * - Request list with status filtering
 * - Detail panel with approval workflow
 * - Recovery tracking and timeline
 * - New advance request form
 */
export function OpsSalaryAdvancePage() {
  const auth = useAuth();
  const agency = resolveAgencyContext(auth.activeAgencyCode);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const [view, setView] = useState<'list' | 'detail' | 'new-request' | 'config'>('list');
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [newRequestEmployee, setNewRequestEmployee] = useState<string>('');
  const [newRequestAmount, setNewRequestAmount] = useState<number>(0);
  const [newRequestReason, setNewRequestReason] = useState('');
  const [newRequestDeduction, setNewRequestDeduction] = useState<number>(0);
  const [newRequestDeductionMethod, setNewRequestDeductionMethod] = useState<'equal-installment' | 'percentage' | 'lump-sum'>('equal-installment');

  /* Agency-scoped categories — MoF sees every OPS bucket, every other
     agency sees only its own. Recomputed on persona switch. */
  const categories = useMemo(
    () => getOpsCategoriesForAgency(auth.activeAgencyCode),
    [auth.activeAgencyCode, auth.roleSwitchEpoch],
  );

  /* ───────────────────────────────────────────────────────────────────── */
  /* Configuration Rules — Per OPS Category                                */
  /* ───────────────────────────────────────────────────────────────────── */
  const [advanceRules] = useState(() => ({
    maxAdvancesPerYear: 2,
    maxAmountAbsolute: 500000,
    maxAmountAsPercentGross: 50,
    maxAmountAsMonths: 3,
    recoveryPeriod: 'within Fiscal Year',
    minMonthlyDeduction: 5000,
  }));

  /* ───────────────────────────────────────────────────────────────────── */
  /* Mock Data: Salary Advances                                            */
  /* ───────────────────────────────────────────────────────────────────── */
  const [advances] = useState<SalaryAdvance[]>([
    {
      id: "SA-001",
      employeeId: "OPS-0001",
      employeeName: "Tenzin Dorji",
      cid: "19850615000101",
      agencyCode: "AG-001",
      positionTitle: "Senior Health Inspector",
      basicPay: 45000,
      grossPay: 51750,
      advanceRequested: 100000,
      amount: 100000,
      monthlyDeduction: 10000,
      payrollDepartmentName: "Health Payroll Division",
      agencyName: "Ministry of Health",
      budgetCode: "MH-01-001",
      budgetBalanceCheck: true,
      commitmentAmountCheck: true,
      deductionMethod: "equal-installment",
      paymentOrderStatus: "processed",
      paymentOrderNumber: "PO-2026-001",
      status: "recovering",
      requestDate: "2026-02-15",
      approvalDate: "2026-02-20",
      disbursementDate: "2026-02-25",
      recoveryProgress: 30,
      reason: "Medical emergency"
    },
    {
      id: "SA-002",
      employeeId: "OPS-0002",
      employeeName: "Kinley Wangchuk",
      cid: "19880322000202",
      agencyCode: "AG-001",
      positionTitle: "Education Officer",
      basicPay: 38000,
      grossPay: 43700,
      advanceRequested: 75000,
      amount: 75000,
      monthlyDeduction: 7500,
      payrollDepartmentName: "Education Payroll Division",
      agencyName: "Ministry of Education",
      budgetCode: "ME-02-005",
      budgetBalanceCheck: true,
      commitmentAmountCheck: false,
      deductionMethod: "percentage",
      paymentOrderStatus: "pending",
      paymentOrderNumber: "PO-2026-002",
      status: "pending",
      requestDate: "2026-03-10",
      recoveryProgress: 0,
      reason: "House repair"
    },
    {
      id: "SA-003",
      employeeId: "OPS-0003",
      employeeName: "Dorji Penjor",
      cid: "19900108000303",
      agencyCode: "AG-001",
      positionTitle: "Rural Development Officer",
      basicPay: 42000,
      grossPay: 48300,
      advanceRequested: 150000,
      amount: 150000,
      monthlyDeduction: 15000,
      payrollDepartmentName: "Community Development Payroll",
      agencyName: "Ministry of Agriculture",
      budgetCode: "MA-03-010",
      budgetBalanceCheck: true,
      commitmentAmountCheck: true,
      deductionMethod: "lump-sum",
      paymentOrderStatus: "processed",
      paymentOrderNumber: "PO-2026-003",
      status: "settled",
      requestDate: "2026-01-05",
      approvalDate: "2026-01-10",
      disbursementDate: "2026-01-15",
      recoveryProgress: 100,
      reason: "Education"
    },
  ]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filter advances by agency                                   */
  /* ───────────────────────────────────────────────────────────────────── */
  const agencyAdvances = useMemo(
    () => advances.filter((a) => a.agencyCode === auth.activeAgencyCode),
    [auth.activeAgencyCode, advances]
  );

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filter and search                                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const filteredAdvances = useMemo(() => {
    let filtered = agencyAdvances;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(q) ||
          a.cid.includes(q) ||
          a.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [agencyAdvances, statusFilter, searchQuery]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Summary statistics                                          */
  /* ───────────────────────────────────────────────────────────────────── */
  const summary = useMemo(() => {
    return {
      pending: agencyAdvances.filter((a) => a.status === 'pending').length,
      approved: agencyAdvances.filter((a) => a.status === 'approved').length,
      recovering: agencyAdvances.filter((a) => a.status === 'recovering').length,
      settled: agencyAdvances.filter((a) => a.status === 'settled').length,
      total: agencyAdvances.length,
      totalAmount: agencyAdvances.reduce((sum, a) => sum + a.amount, 0),
      totalOutstanding: agencyAdvances
        .filter((a) => a.status === 'recovering' || a.status === 'approved' || a.status === 'pending')
        .reduce((sum, a) => sum + (a.amount * (100 - a.recoveryProgress) / 100), 0),
    };
  }, [agencyAdvances]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Available employees for new request                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const availableEmployees = useMemo(
    () => OPS_EMPLOYEES.filter(
      (e) => e.workingAgency === auth.activeAgencyCode && e.status === 'active'
    ),
    [auth.activeAgencyCode]
  );

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handlers                                                              */
  /* ───────────────────────────────────────────────────────────────────── */
  const selectedAdvance = useMemo(
    () => agencyAdvances.find((a) => a.id === selectedAdvanceId),
    [agencyAdvances, selectedAdvanceId]
  );

  const selectedEmployee = useMemo(
    () =>
      newRequestEmployee
        ? availableEmployees.find((e) => e.eid === newRequestEmployee)
        : null,
    [newRequestEmployee, availableEmployees]
  );

  const handleApprove = () => {
    if (!selectedAdvance || !caps.canApprove) return;
    console.log(`[Toast] Advance approved: ${selectedAdvance.id}`);
    setView('list');
  };

  const handleReject = () => {
    if (!selectedAdvance || !caps.canApprove) return;
    console.log(`[Toast] Advance rejected: ${selectedAdvance.id}`);
    setView('list');
  };

  const handleSubmitRequest = () => {
    if (!selectedEmployee || !newRequestAmount) return;
    const empName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`;
    console.log(`[Toast] Advance request submitted for ${empName}: Nu.${newRequestAmount}`);
    setNewRequestEmployee('');
    setNewRequestAmount(0);
    setNewRequestReason('');
    setNewRequestDeduction(0);
    setNewRequestDeductionMethod('equal-installment');
    setView('list');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; badge: string }> = {
      pending: {
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        badge: 'bg-amber-100 text-amber-700',
      },
      approved: {
        bg: 'bg-blue-50',
        text: 'text-blue-900',
        badge: 'bg-blue-100 text-blue-700',
      },
      rejected: {
        bg: 'bg-red-50',
        text: 'text-red-900',
        badge: 'bg-red-100 text-red-700',
      },
      disbursed: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-900',
        badge: 'bg-indigo-100 text-indigo-700',
      },
      recovering: {
        bg: 'bg-violet-50',
        text: 'text-violet-900',
        badge: 'bg-violet-100 text-violet-700',
      },
      settled: {
        bg: 'bg-green-50',
        text: 'text-green-900',
        badge: 'bg-green-100 text-green-700',
      },
    };
    return colors[status] || colors.pending;
  };

  const getMaxAdvanceForEmployee = (emp: OpsEmployee): number => {
    const maxByAbsolute = advanceRules.maxAmountAbsolute;
    const maxByPercentGross = (emp.monthlyBasicPay * advanceRules.maxAmountAsPercentGross) / 100;
    const maxByMonths = emp.monthlyBasicPay * advanceRules.maxAmountAsMonths;
    return Math.min(maxByAbsolute, maxByPercentGross, maxByMonths);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            OPS Salary Advance
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            Advance Management
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Manage salary advances and recovery schedules for OPS employees in{" "}
          {agency?.agency.name || auth.activeAgencyCode}
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-salary-advance" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">{caps.canApprove ? "Approver" : caps.canInitiate ? "Initiator" : "Viewer"}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Salary Advance Processing</p>
          </div>
        </div>
      </div>

      {/* View Selection Buttons */}
      {view === 'list' && (
        <div className="flex gap-3">
          <button
            onClick={() => setView('list')}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium"
          >
            Advances List
          </button>
          <button
            onClick={() => setView('config')}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition"
          >
            Configuration
          </button>
          {caps.canInitiate && (
            <button
              onClick={() => setView('new-request')}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition"
            >
              New Request
            </button>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {view === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Outstanding"
            value={`Nu.${summary.totalOutstanding.toLocaleString()}`}
            color="red"
          />
          <SummaryCard
            label="Pending Requests"
            value={summary.pending}
            color="amber"
          />
          <SummaryCard
            label="Recovering"
            value={summary.recovering}
            color="indigo"
          />
        </div>
      )}

      {/* Main Content Sections */}
      {view === 'list' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by employee name, CID, or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="recovering">Recovering</option>
              <option value="settled">Settled</option>
            </select>
          </div>

          {/* Advances Table */}
          <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Employee</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Request ID</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-900">Amount</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-900">Deduction</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">Recovery</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {filteredAdvances.map((advance) => {
                  const colors = getStatusColor(advance.status);
                  return (
                    <tr
                      key={advance.id}
                      className={`hover:bg-slate-50/50 cursor-pointer transition ${colors.bg}`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {advance.employeeName}
                        <div className="text-xs text-slate-500 mt-0.5">{advance.cid}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {advance.id}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        Nu.{advance.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        Nu.{advance.monthlyDeduction.toLocaleString()}/mo
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${advance.recoveryProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-8">
                            {advance.recoveryProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}
                        >
                          {advance.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedAdvanceId(advance.id);
                            setView('detail');
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail View */}
      {view === 'detail' && selectedAdvance && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {selectedAdvance.employeeName}
            </h2>
            <button
              onClick={() => setView('list')}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Position</p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {selectedAdvance.positionTitle}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Agency</p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {selectedAdvance.agencyName}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Basic Pay</p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                Nu.{selectedAdvance.basicPay.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Gross Pay</p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                Nu.{selectedAdvance.grossPay.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Amount Requested</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                Nu.{selectedAdvance.advanceRequested.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Amount Approved</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                Nu.{selectedAdvance.amount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Monthly Deduction</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                Nu.{selectedAdvance.monthlyDeduction.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Deduction Method</p>
              <p className="text-sm font-bold text-slate-900 mt-1 capitalize">
                {selectedAdvance.deductionMethod}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Budget Code</p>
              <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                {selectedAdvance.budgetCode}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Budget Available</p>
              <p className={`text-sm font-bold mt-1 ${selectedAdvance.budgetBalanceCheck ? 'text-green-700' : 'text-red-700'}`}>
                {selectedAdvance.budgetBalanceCheck ? '✓ Yes' : '✗ No'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Commitment Available</p>
              <p className={`text-sm font-bold mt-1 ${selectedAdvance.commitmentAmountCheck ? 'text-green-700' : 'text-red-700'}`}>
                {selectedAdvance.commitmentAmountCheck ? '✓ Yes' : '✗ No'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">PO Status</p>
              <p className="text-sm font-bold text-slate-900 mt-1 capitalize">
                {selectedAdvance.paymentOrderStatus}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">PO Number</p>
              <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                {selectedAdvance.paymentOrderNumber || '—'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Recovery</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {selectedAdvance.recoveryProgress}%
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-600 font-bold uppercase">Status</p>
              <p className="text-sm font-bold text-slate-900 mt-1 capitalize">
                {selectedAdvance.status}
              </p>
            </div>
          </div>

          {/* Recovery Timeline */}
          {selectedAdvance.status === 'recovering' && (
            <div className="border border-slate-200/50 rounded-lg p-4 bg-blue-50/50">
              <p className="text-sm font-bold text-slate-900 mb-3">Recovery Schedule</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Request Date:</span>
                  <span className="font-semibold">{selectedAdvance.requestDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Approval Date:</span>
                  <span className="font-semibold">{selectedAdvance.approvalDate || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Disbursement Date:</span>
                  <span className="font-semibold">{selectedAdvance.disbursementDate || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Outstanding Balance:</span>
                  <span className="font-bold text-red-700">
                    Nu.{(selectedAdvance.amount * (100 - selectedAdvance.recoveryProgress) / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Approval Section (if pending) */}
          {selectedAdvance.status === 'pending' && caps.canApprove && (
            <div className="border border-amber-200/50 rounded-lg p-4 bg-amber-50/50 space-y-3">
              <p className="text-sm font-bold text-slate-900">Approval Action</p>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Add approval comment..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="pt-4 border-t border-slate-200/50">
            <button
              onClick={() => setView('list')}
              className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition"
            >
              ← Back to List
            </button>
          </div>
        </div>
      )}

      {/* New Request View */}
      {view === 'new-request' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">New Salary Advance Request</h2>

          <div className="space-y-4">
            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Select Employee
              </label>
              <select
                value={newRequestEmployee}
                onChange={(e) => setNewRequestEmployee(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an employee...</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.masterEmpId} value={emp.masterEmpId}>
                    {emp.firstName} {emp.lastName} ({emp.eid})
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Info */}
            {selectedEmployee && (
              <div className="border border-slate-200/50 rounded-lg p-4 bg-slate-50/50">
                <p className="text-sm font-bold text-slate-900 mb-2">Employee Details</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Position:</p>
                    <p className="font-bold">{(selectedEmployee as any).designation || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Department:</p>
                    <p className="font-bold">{(selectedEmployee as any).department || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Basic Pay:</p>
                    <p className="font-bold">Nu.{selectedEmployee.monthlyBasicPay.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Gross Pay:</p>
                    <p className="font-bold">Nu.{(((selectedEmployee as any).grossSalary || selectedEmployee.monthlyBasicPay * 1.15).toLocaleString())}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Max Advance:</p>
                    <p className="font-bold text-green-700">
                      Nu.{getMaxAdvanceForEmployee(selectedEmployee).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Status:</p>
                    <p className="font-bold">{selectedEmployee.status}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Work Agency:</p>
                    <p className="font-bold">{agency?.agency.name || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Employee ID:</p>
                    <p className="font-mono text-xs">{selectedEmployee.eid}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Advance Amount (Nu.)
              </label>
              <input
                type="number"
                value={newRequestAmount}
                onChange={(e) => setNewRequestAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max={selectedEmployee ? getMaxAdvanceForEmployee(selectedEmployee) : 0}
              />
              {selectedEmployee && newRequestAmount > getMaxAdvanceForEmployee(selectedEmployee) && (
                <p className="text-red-600 text-xs mt-1">
                  Exceeds maximum allowed: Nu.{getMaxAdvanceForEmployee(selectedEmployee).toLocaleString()}
                </p>
              )}
            </div>

            {/* Deduction Method */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Deduction Method
              </label>
              <select
                value={newRequestDeductionMethod}
                onChange={(e) => setNewRequestDeductionMethod(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="equal-installment">Equal Installment</option>
                <option value="percentage">Percentage of Salary</option>
                <option value="lump-sum">Lump Sum at End</option>
              </select>
            </div>

            {/* Monthly Deduction */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Monthly Deduction (Nu.)
              </label>
              <input
                type="number"
                value={newRequestDeduction}
                onChange={(e) => setNewRequestDeduction(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="5000"
              />
              {newRequestAmount > 0 && newRequestDeduction > 0 && (
                <p className="text-slate-600 text-xs mt-1">
                  Recovery period: {Math.ceil(newRequestAmount / newRequestDeduction)} months
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Reason for Advance
              </label>
              <textarea
                value={newRequestReason}
                onChange={(e) => setNewRequestReason(e.target.value)}
                placeholder="Describe the reason for requesting salary advance..."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200/50">
            <button
              onClick={() => setView('list')}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRequest}
              disabled={!selectedEmployee || newRequestAmount === 0 || newRequestDeduction === 0}
              className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* Configuration View */}
      {view === 'config' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Advance Configuration</h2>

          {!caps.canConfigureRules && (
            <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-4">
              <p className="text-sm font-bold text-amber-900">
                ℹ Read-Only Access: You can view configuration but cannot edit.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConfigCard
              label="Max Advances Per Year"
              value={advanceRules.maxAdvancesPerYear}
              editable={caps.canConfigureRules}
            />
            <ConfigCard
              label="Max Amount (Absolute)"
              value={`Nu.${advanceRules.maxAmountAbsolute.toLocaleString()}`}
              editable={caps.canConfigureRules}
            />
            <ConfigCard
              label="Max Amount (% of Gross)"
              value={`${advanceRules.maxAmountAsPercentGross}%`}
              editable={caps.canConfigureRules}
            />
            <ConfigCard
              label="Max Amount (Months of Pay)"
              value={`${advanceRules.maxAmountAsMonths} months`}
              editable={caps.canConfigureRules}
            />
            <ConfigCard
              label="Recovery Period"
              value={advanceRules.recoveryPeriod}
              editable={caps.canConfigureRules}
            />
            <ConfigCard
              label="Min Monthly Deduction"
              value={`Nu.${advanceRules.minMonthlyDeduction.toLocaleString()}`}
              editable={caps.canConfigureRules}
            />
          </div>

          <div className="pt-4 border-t border-slate-200/50">
            <button
              onClick={() => setView('list')}
              className="px-6 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 3.1 — OPS Salary Advance Management
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Helper Components
   ─────────────────────────────────────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "red" | "amber" | "indigo" | "green";
}) {
  const colorClasses = {
    red: "border-red-200/50 bg-red-50/50 text-red-900",
    amber: "border-amber-200/50 bg-amber-50/50 text-amber-900",
    indigo: "border-indigo-200/50 bg-indigo-50/50 text-indigo-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">
        {label}
      </p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function ConfigCard({
  label,
  value,
  editable,
}: {
  label: string;
  value: string | number;
  editable: boolean;
}) {
  return (
    <div className="border border-slate-200/50 rounded-lg p-4 bg-slate-50/50">
      <p className="text-xs font-bold text-slate-600 uppercase mb-2">{label}</p>
      {editable ? (
        <input
          type="text"
          defaultValue={value}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <p className="text-lg font-bold text-slate-900">{value}</p>
      )}
    </div>
  );
}
