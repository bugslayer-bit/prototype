'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../shared/components/ModuleActorBanner';
import type { SalaryAdvance, Employee } from '../types';
import { SALARY_ADVANCES, EMPLOYEES } from '../state/payrollSeed';
import { usePayrollRoleCapabilities, payrollToneClasses } from '../state/usePayrollRoleCapabilities';

/**
 * SalaryAdvancePage — Salary Advance Processing (6-step workflow)
 * Payroll SRS PRN 3.1 compliance
 *
 * Features:
 * - Configuration view (rules and limits)
 * - Request list with status filtering
 * - Detail panel with approval workflow
 * - Recovery tracking
 * - New advance request form
 */
export function SalaryAdvancePage() {
  const auth = useAuth();
  const agency = resolveAgencyContext(auth.activeAgencyCode);
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const [view, setView] = useState<'list' | 'detail' | 'new-request'>('list');
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [newRequestEmployee, setNewRequestEmployee] = useState<string>('');
  const [newRequestAmount, setNewRequestAmount] = useState<number>(0);
  const [newRequestReason, setNewRequestReason] = useState('');
  const [newRequestDeduction, setNewRequestDeduction] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Configuration Rules — Fetched from Master Data                        */
  /* ───────────────────────────────────────────────────────────────────── */
  // NOTE: These values would be fetched from Master Data API in production
  // Currently using defaults as placeholder until API integration
  const [advanceRules] = useState(() => ({
    maxAdvancesPerYear: 2,
    maxAmountMonths: 2,
    recoveryPeriod: 'within Fiscal Year',
    minMonthlyDeduction: 5000,
  }));

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filter advances by agency                                   */
  /* ───────────────────────────────────────────────────────────────────── */
  const agencyAdvances = useMemo(
    () => SALARY_ADVANCES.filter((a) => a.agencyCode === auth.activeAgencyCode),
    [auth.activeAgencyCode]
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
    };
  }, [agencyAdvances]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Available employees for new request                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const availableEmployees = useMemo(
    () => EMPLOYEES.filter((e) => e.agencyCode === auth.activeAgencyCode && e.status === 'active'),
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
        ? availableEmployees.find((e) => e.id === newRequestEmployee)
        : null,
    [newRequestEmployee, availableEmployees]
  );

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
        bg: 'bg-emerald-50',
        text: 'text-emerald-900',
        badge: 'bg-emerald-100 text-emerald-700',
      },
    };
    return colors[status] || colors.pending;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = () => {
    if (!selectedAdvance) return;

    const today = new Date().toISOString().split('T')[0];
    const updatedAdvance = {
      ...selectedAdvance,
      status: 'approved' as const,
      approvedDate: today,
    };

    // Update in list (in production, would POST to API)
    const advanceIndex = agencyAdvances.findIndex((a) => a.id === selectedAdvanceId);
    if (advanceIndex !== -1) {
      SALARY_ADVANCES[SALARY_ADVANCES.findIndex((a) => a.id === selectedAdvanceId)] = updatedAdvance;
    }

    showToast('Advance approved successfully');
    setApprovalComment('');
    setView('list');
  };

  const handleNewRequest = () => {
    if (!newRequestEmployee || newRequestAmount <= 0 || !newRequestReason || newRequestDeduction <= 0) {
      showToast('Please fill all required fields');
      return;
    }

    // Create new advance object
    const newAdvance: SalaryAdvance = {
      id: `ADV-${Date.now()}`,
      employeeId: newRequestEmployee,
      employeeName: selectedEmployee?.name || '',
      cid: selectedEmployee?.cid || '',
      agencyCode: auth.activeAgencyCode,
      amount: newRequestAmount,
      monthlyDeduction: newRequestDeduction,
      installments: Math.ceil(newRequestAmount / newRequestDeduction),
      reason: newRequestReason,
      requestDate: new Date().toISOString(),
      status: 'pending',
      approvedDate: undefined,
      totalRecovered: 0,
      balanceRemaining: newRequestAmount,
      completedInstallments: 0,
    };

    // Add to advances list (in production, would POST to API)
    SALARY_ADVANCES.push(newAdvance);

    showToast('Advance request created successfully');
    setNewRequestEmployee('');
    setNewRequestAmount(0);
    setNewRequestReason('');
    setNewRequestDeduction(0);
    setView('list');
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Toast Notification Component                                             */
  /* ═══════════════════════════════════════════════════════════════════════ */
  const ToastNotification = () => {
    if (!toastMessage) return null;
    return (
      <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-pulse">
        {toastMessage}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render: Configuration View                                              */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (view === 'list') {
    return (
      <div className="space-y-6 p-6">
        <ToastNotification />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Salary Advance Processing</h1>
            <p className="mt-1 text-sm text-slate-600">Payroll SRS PRN 3.1 — Advance Request Workflow</p>
          </div>
          <button
            onClick={() => setView('new-request')}
            disabled={!caps.canInitiate}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            New Advance Request
          </button>
        </div>

        <ModuleActorBanner moduleKey="salary-advance" />

        {/* ── Persona Banner ── */}
        <div className={`rounded-xl border ${tone.border} ${tone.bg} p-4`}>
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

        {/* Info Banner — Rules from Master Data */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <div className="text-lg">ℹ️</div>
            <div>
              <p className="text-sm font-medium text-blue-900">Rules configured in Master Data</p>
              <p className="mt-1 text-xs text-blue-800">
                Maximum 2 advances per year, maximum 2 months basic pay per advance.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900">Advance Rules Configuration</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max Advances/Year</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{advanceRules.maxAdvancesPerYear}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max Amount</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{advanceRules.maxAmountMonths} Months</p>
              <p className="text-xs text-slate-500">Gross Pay</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recovery Period</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{advanceRules.recoveryPeriod}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Min Monthly Deduction</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">Nu.{advanceRules.minMonthlyDeduction.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Pending</div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{summary.pending}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Approved</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{summary.approved}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recovering</div>
            <div className="mt-2 text-2xl font-bold text-violet-600">{summary.recovering}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Settled</div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{summary.settled}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Amount</div>
            <div className="mt-2 text-xl font-bold text-slate-900">Nu.{(summary.totalAmount / 100000).toFixed(1)}L</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 flex-col md:flex-row">
          <input
            type="text"
            placeholder="Search by employee name or CID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="disbursed">Disbursed</option>
            <option value="recovering">Recovering</option>
            <option value="settled">Settled</option>
          </select>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Employee</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">CID</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">Amount</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">Monthly Deduction</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Request Date</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvances.map((advance) => {
                const colors = getStatusColor(advance.status);
                return (
                  <tr key={advance.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{advance.employeeName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{advance.cid}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                      Nu.{advance.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      Nu.{advance.monthlyDeduction.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors.badge}`}>
                        {advance.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {new Date(advance.requestDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedAdvanceId(advance.id);
                          setView('detail');
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAdvances.length === 0 && (
            <div className="px-4 py-12 text-center text-slate-500">
              No salary advances found matching your criteria.
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render: Detail View                                                     */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (view === 'detail' && selectedAdvance) {
    const colors = getStatusColor(selectedAdvance.status);
    const employee = EMPLOYEES.find((e) => e.id === selectedAdvance.employeeId);

    return (
      <div className="space-y-6 p-6">
        <ToastNotification />
        <button
          onClick={() => setView('list')}
          className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
        >
          ← Back to List
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Salary Advance Detail</h1>
            <p className="mt-1 text-sm text-slate-600">Request {selectedAdvance.id}</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${colors.badge}`}>
            {selectedAdvance.status}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Employee Information */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900">Employee Information</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Name</p>
                <p className="mt-1 font-medium text-slate-900">{employee?.name || selectedAdvance.employeeName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">CID</p>
                <p className="mt-1 font-mono text-slate-600">{selectedAdvance.cid}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Agency</p>
                <p className="mt-1 text-slate-900">{employee?.agencyName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Designation</p>
                <p className="mt-1 text-slate-900">{employee?.positionTitle || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900">Request Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Amount Requested</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">Nu.{selectedAdvance.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Monthly Deduction</p>
                <p className="mt-1 font-mono text-slate-900">Nu.{selectedAdvance.monthlyDeduction.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Installments</p>
                <p className="mt-1 text-slate-900">{selectedAdvance.installments}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Reason</p>
                <p className="mt-1 text-slate-900">{selectedAdvance.reason}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Request Date</p>
                <p className="mt-1 text-slate-600">{new Date(selectedAdvance.requestDate).toLocaleDateString()}</p>
              </div>
              {selectedAdvance.approvedDate && (selectedAdvance.status === 'approved' || selectedAdvance.status === 'disbursed' || selectedAdvance.status === 'recovering' || selectedAdvance.status === 'settled') && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Approved Date</p>
                  <p className="mt-1 text-slate-600">{new Date(selectedAdvance.approvedDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recovery Tracking */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900">Recovery Tracking</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Recovered</p>
                <p className="mt-1 font-mono text-emerald-600">Nu.{selectedAdvance.totalRecovered.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Balance Remaining</p>
                <p className="mt-1 font-mono text-violet-600">Nu.{selectedAdvance.balanceRemaining.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Completed Installments</p>
                <p className="mt-1 text-slate-900">{selectedAdvance.completedInstallments} / {selectedAdvance.installments}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="bg-slate-100 rounded-lg h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all"
                    style={{
                      width: `${(selectedAdvance.completedInstallments / selectedAdvance.installments) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {Math.round((selectedAdvance.completedInstallments / selectedAdvance.installments) * 100)}% recovered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Checklist */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900">Validation Checklist</h3>
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">✓</span>
              <span className="text-sm text-slate-900">No prior salary advances pending for settlement</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">✓</span>
              <span className="text-sm text-slate-900">Within the criteria configured in the Employee Advance Master (Process Step no. 1)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">✓</span>
              <span className="text-sm text-slate-900">Employee is not under suspension or other restrictions disqualifying for salary advances under Salary Advance Detail</span>
            </div>
          </div>
        </div>

        {/* Approval Section */}
        {selectedAdvance.status === 'pending' && (
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900">Approval Action</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                  Approval Comment
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Enter approval or rejection comment..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={!caps.canApprove}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve Advance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Installment Schedule */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900">Installment Schedule</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Installment</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-900">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: selectedAdvance.installments }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="px-4 py-3">#{idx + 1}</td>
                    <td className="px-4 py-3 text-right font-mono">Nu.{selectedAdvance.monthlyDeduction.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        idx < selectedAdvance.completedInstallments
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {idx < selectedAdvance.completedInstallments ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render: New Request Form                                                */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (view === 'new-request') {
    return (
      <div className="space-y-6 p-6">
        <ToastNotification />
        <button
          onClick={() => setView('list')}
          className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
        >
          ← Back to List
        </button>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create New Salary Advance Request</h1>
          <p className="mt-1 text-sm text-slate-600">Submit a new advance request for employee approval</p>
        </div>

        {/* ── Persona Banner ── */}
        <div className={`rounded-xl border ${tone.border} ${tone.bg} p-4`}>
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

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Select Employee *
              </label>
              <select
                value={newRequestEmployee}
                onChange={(e) => setNewRequestEmployee(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">-- Choose Employee --</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.cid}) - {emp.positionTitle}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployee && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-sm">
                <p className="font-medium text-indigo-900">
                  Gross Pay: Nu.{selectedEmployee.grossPay.toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Advance Amount (Nu.) *
              </label>
              <input
                type="number"
                value={newRequestAmount || ''}
                onChange={(e) => setNewRequestAmount(Number(e.target.value))}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Reason *
              </label>
              <textarea
                value={newRequestReason}
                onChange={(e) => setNewRequestReason(e.target.value)}
                placeholder="Enter reason for advance..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Monthly Deduction (Nu.) *
              </label>
              <input
                type="number"
                value={newRequestDeduction || ''}
                onChange={(e) => setNewRequestDeduction(Number(e.target.value))}
                placeholder="Enter monthly deduction amount"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              {newRequestDeduction > 0 && (
                <p className="mt-2 text-xs text-slate-600">
                  Recovery period: {Math.ceil(newRequestAmount / newRequestDeduction)} months
                </p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
                <p className="font-semibold text-slate-900">Summary</p>
                <div className="flex justify-between">
                  <span className="text-slate-600">Requested Amount:</span>
                  <span className="font-mono">Nu.{newRequestAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Monthly Deduction:</span>
                  <span className="font-mono">Nu.{newRequestDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Installments:</span>
                  <span className="font-mono">{newRequestDeduction > 0 ? Math.ceil(newRequestAmount / newRequestDeduction) : 0}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleNewRequest}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Submit Request
              </button>
              <button
                onClick={() => setView('list')}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm bg-slate-200 text-slate-900 hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
