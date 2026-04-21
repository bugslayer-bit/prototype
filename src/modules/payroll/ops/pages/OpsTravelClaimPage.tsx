/* ═══════════════════════════════════════════════════════════════════════════
   OPS Travel Claim Processing Page
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — OPS Travel Advance Request & Payment
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import { OPS_EMPLOYEES, getOpsEmployeeById } from '../data/opsEmployeeSeed';
import type {
  OpsTravelAdvanceLocal,
  OpsTravelAdvanceForeign,
  OpsTravelPlan,
} from '../types';

/* ───────────────────────────────────────────────────────────────────────────
   Types & Constants
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * Enhanced TravelClaim interface that combines all DDi 28-30 fields
 * Serves as the working interface for the page, with properties from all three types
 */
interface TravelClaim {
  id: string;
  refNo: string;
  employeeId: string;
  employeeName: string;
  positionTitle: string;
  cid: string;
  agencyName: string;
  agencyCode: string;
  travelType: 'domestic' | 'foreign';
  amount: number;
  approvedAdvanceAmount: number;
  currency: 'BTN' | 'USD' | 'EUR' | 'INR' | 'GBP';
  exchangeRate?: number;
  purpose: string;
  travelPurpose: string;
  startDate: string;
  endDate: string;
  destination: string;
  countryOfTravel?: string;
  status: 'draft' | 'submitted' | 'verified' | 'approved' | 'paid' | 'rejected';
  budgetCode: string;
  createdDate: string;
  approvedDate?: string;
  dateOfApproval?: string;
  approvedTARefNo?: string;
  paymentTransactionRef?: string;
  advanceStatus?: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  planStatus?: 'draft' | 'submitted' | 'approved' | 'completed' | 'cancelled';
}

const CURRENCIES = [
  { code: 'BTN', label: 'Bhutanese Ngultrum', rate: 1 },
  { code: 'USD', label: 'US Dollar', rate: 88.5 },
  { code: 'EUR', label: 'Euro', rate: 96.2 },
  { code: 'INR', label: 'Indian Rupee', rate: 1.06 },
  { code: 'GBP', label: 'British Pound', rate: 111.3 },
];

const SAMPLE_CLAIMS: TravelClaim[] = [
  {
    id: '1',
    refNo: 'TRV-2026-001',
    employeeId: 'MEMP-00000001',
    employeeName: 'Tenzin Dorji',
    positionTitle: 'Director',
    cid: '19800115000101',
    agencyName: 'Ministry of Health',
    agencyCode: '01',
    travelType: 'domestic',
    amount: 25000,
    approvedAdvanceAmount: 25000,
    currency: 'BTN',
    purpose: 'Training Program',
    travelPurpose: 'Training Program - Capacity Building',
    startDate: '2026-04-15',
    endDate: '2026-04-22',
    destination: 'Thimphu',
    status: 'approved',
    budgetCode: 'HE-01-001',
    createdDate: '2026-03-20',
    approvedDate: '2026-04-01',
    dateOfApproval: '2026-04-01',
    approvedTARefNo: 'TA-2026-00001',
    paymentTransactionRef: 'IFMIS-2026-00001',
    advanceStatus: 'approved',
  },
  {
    id: '2',
    refNo: 'TRV-2026-002',
    employeeId: 'MEMP-00000002',
    employeeName: 'Kinley Tshering',
    positionTitle: 'Deputy Director',
    cid: '19850220000202',
    agencyName: 'Ministry of Education',
    agencyCode: '02',
    travelType: 'foreign',
    amount: 2500,
    approvedAdvanceAmount: 2500,
    currency: 'USD',
    exchangeRate: 88.5,
    purpose: 'Conference',
    travelPurpose: 'Conference - International Development',
    startDate: '2026-05-01',
    endDate: '2026-05-07',
    destination: 'New Delhi, India',
    countryOfTravel: 'India',
    status: 'submitted',
    budgetCode: 'HE-01-002',
    createdDate: '2026-04-05',
    dateOfApproval: '2026-04-10',
    approvedTARefNo: 'TA-2026-00002',
    advanceStatus: 'submitted',
  },
  {
    id: '3',
    refNo: 'TRV-2026-003',
    employeeId: 'MEMP-00000003',
    employeeName: 'Dorji Penjor',
    positionTitle: 'Senior Officer',
    cid: '19880325000303',
    agencyName: 'Ministry of Finance',
    agencyCode: '03',
    travelType: 'foreign',
    amount: 3500,
    approvedAdvanceAmount: 3500,
    currency: 'USD',
    exchangeRate: 88.5,
    purpose: 'Training',
    travelPurpose: 'International Training Program',
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    destination: 'Bangkok, Thailand',
    countryOfTravel: 'Thailand',
    status: 'paid',
    budgetCode: 'HE-02-001',
    createdDate: '2026-03-15',
    approvedDate: '2026-03-28',
    dateOfApproval: '2026-03-28',
    approvedTARefNo: 'TA-2026-00003',
    paymentTransactionRef: 'IFMIS-2026-00002',
    advanceStatus: 'paid',
  },
];

export function OpsTravelClaimPage() {
  const { activeAgencyCode } = useAuth();
  const context = resolveAgencyContext(useAuth().activeRoleId);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* State Management */
  /* ─────────────────────────────────────────────────────────────────────── */
  const [view, setView] = useState<'list' | 'new'>('list');
  const [claims, setClaims] = useState<TravelClaim[]>(SAMPLE_CLAIMS);
  const [selectedClaim, setSelectedClaim] = useState<TravelClaim | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'local' | 'foreign' | 'plans'>('all');

  /* New Claim Form State */
  const [formData, setFormData] = useState({
    source: 'manual' as 'edats' | 'manual',
    travelType: 'domestic' as 'domestic' | 'foreign',
    employeeId: '',
    positionTitle: '',
    agencyName: '',
    agencyCode: '',
    cid: '',
    purpose: '',
    startDate: '',
    endDate: '',
    destination: '',
    countryOfTravel: '',
    budgetCode: '',
    amount: 0,
    approvedAdvanceAmount: 0,
    currency: 'BTN' as 'BTN' | 'USD' | 'EUR' | 'INR' | 'GBP',
    exchangeRate: 1,
    approvedTARefNo: '',
    paymentTransactionRef: '',
  });

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Computed */
  /* ─────────────────────────────────────────────────────────────────────── */
  const filteredClaims = useMemo(() => {
    let filtered = claims;

    // Apply tab filter
    if (activeTab === 'local') {
      filtered = filtered.filter(c => c.travelType === 'domestic');
    } else if (activeTab === 'foreign') {
      filtered = filtered.filter(c => c.travelType === 'foreign');
    } else if (activeTab === 'plans') {
      // Plans tab shows all claims regardless of type
      filtered = filtered.filter(c => c.planStatus !== undefined);
    }

    if (filterStatus) {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.refNo.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        c.destination.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [claims, filterStatus, searchQuery, activeTab]);

  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter(c => ['submitted', 'verified'].includes(c.status)).length;
    const disbursed = claims.filter(c => c.status === 'paid').reduce((sum, c) => {
      const amt = c.currency === 'BTN' ? c.amount : (c.amount * (c.exchangeRate || 1));
      return sum + amt;
    }, 0);
    return { total, pending, disbursed };
  }, [claims]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Validation */
  /* ─────────────────────────────────────────────────────────────────────── */
  const validateNewClaim = useCallback(() => {
    if (!formData.employeeId) {
      console.log('[Toast] Please select an employee');
      return false;
    }
    if (!formData.budgetCode) {
      console.log('[Toast] Please select a budget code');
      return false;
    }
    if (!formData.purpose || !formData.startDate || !formData.endDate) {
      console.log('[Toast] Please fill all required fields');
      return false;
    }
    // Check for duplicate reference (mock)
    const existingRef = claims.some(c => c.employeeId === formData.employeeId && c.status !== 'rejected');
    if (existingRef) {
      console.log('[Toast] Active claim already exists for this employee');
      return false;
    }
    return true;
  }, [formData, claims]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Handlers */
  /* ─────────────────────────────────────────────────────────────────────── */
  const handleCreateClaim = useCallback(() => {
    if (!validateNewClaim()) return;

    const emp = getOpsEmployeeById(formData.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
    const posTitle = emp?.positionTitle || formData.positionTitle || 'Officer';
    const agencyName = emp?.agencyName || formData.agencyName || 'Unknown Agency';
    const agencyCode = emp?.workingAgency || formData.agencyCode || '';
    const cid = emp?.cid || formData.cid || '';

    const newClaim: TravelClaim = {
      id: String(claims.length + 1),
      refNo: `TRV-${new Date().getFullYear()}-${String(claims.length + 1).padStart(3, '0')}`,
      employeeId: formData.employeeId,
      employeeName: empName,
      positionTitle: posTitle,
      agencyName: agencyName,
      agencyCode: agencyCode,
      cid: cid,
      travelType: formData.travelType,
      amount: formData.amount,
      approvedAdvanceAmount: formData.approvedAdvanceAmount || formData.amount,
      currency: formData.currency,
      exchangeRate: formData.currency !== 'BTN' ? formData.exchangeRate : undefined,
      purpose: formData.purpose,
      travelPurpose: formData.purpose,
      startDate: formData.startDate,
      endDate: formData.endDate,
      destination: formData.destination,
      countryOfTravel: formData.countryOfTravel,
      budgetCode: formData.budgetCode,
      status: 'draft',
      createdDate: new Date().toISOString().split('T')[0],
      dateOfApproval: new Date().toISOString().split('T')[0],
      approvedTARefNo: formData.approvedTARefNo || `TA-${new Date().getFullYear()}-${String(claims.length + 1).padStart(5, '0')}`,
      paymentTransactionRef: formData.paymentTransactionRef,
      advanceStatus: 'draft',
    };

    setClaims([...claims, newClaim]);
    setFormData({
      source: 'manual',
      travelType: 'domestic',
      employeeId: '',
      positionTitle: '',
      agencyName: '',
      agencyCode: '',
      cid: '',
      purpose: '',
      startDate: '',
      endDate: '',
      destination: '',
      countryOfTravel: '',
      budgetCode: '',
      amount: 0,
      approvedAdvanceAmount: 0,
      currency: 'BTN',
      exchangeRate: 1,
      approvedTARefNo: '',
      paymentTransactionRef: '',
    });
    setView('list');
    console.log('[Toast] Travel claim created: ' + newClaim.refNo);
  }, [validateNewClaim, claims]);

  const handleSubmitClaim = useCallback((claimId: string) => {
    setClaims(claims.map(c =>
      c.id === claimId ? { ...c, status: 'submitted' } : c
    ));
    console.log('[Toast] Claim submitted for verification');
  }, [claims]);

  const handleApproveClaim = useCallback((claimId: string) => {
    setClaims(claims.map(c =>
      c.id === claimId ? {
        ...c,
        status: 'approved',
        approvedDate: new Date().toISOString().split('T')[0]
      } : c
    ));
    console.log('[Toast] Claim approved. Payment order generated.');
  }, [claims]);

  const handlePayClaim = useCallback((claimId: string) => {
    setClaims(claims.map(c =>
      c.id === claimId ? { ...c, status: 'paid' } : c
    ));
    console.log('[Toast] Payment processed. Bank transfer initiated.');
  }, [claims]);

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-amber-100 text-amber-700',
      verified: 'bg-sky-100 text-sky-700',
      approved: 'bg-green-100 text-green-700',
      paid: 'bg-teal-100 text-teal-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Render */
  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            Travel Claim Processing
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            SRS PRN 2.0 — Travel
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Manage travel advance requests, approvals, and payments for OPS employees
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-travel-claim" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">
                {caps.isReadOnly ? "Read-Only User" : "Travel Claims Officer"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Travel Claim Processing Access</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Claims" value={stats.total} color="blue" />
        <SummaryCard label="Pending Approval" value={stats.pending} color="amber" />
        <SummaryCard
          label="Disbursed (Current Month)"
          value={`Nu.${Math.round(stats.disbursed).toLocaleString()}`}
          color="green"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Claims List
          </button>
          {!caps.isReadOnly && (
            <button
              onClick={() => setView('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                view === 'new'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              + New Claim
            </button>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
          {/* Tabs for DDi 28-30 */}
          <div className="flex gap-2 border-b border-slate-200/50">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              All Claims
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'local'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Local Advances (DDi 28)
            </button>
            <button
              onClick={() => setActiveTab('foreign')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'foreign'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Foreign Advances (DDi 29)
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'plans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Travel Plans (DDi 30)
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by Ref No, Employee, or Destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus || ''}
              onChange={(e) => setFilterStatus(e.target.value || null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Claims Table */}
          <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Ref No</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Employee</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Position</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Type</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Destination</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-900">Amount</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">TA Ref</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No travel claims found
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map(claim => (
                    <tr key={claim.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        {claim.refNo}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{claim.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{claim.positionTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          claim.travelType === 'domestic'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {claim.travelType === 'domestic' ? 'In-Country' : 'Foreign'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{claim.destination}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">
                        {claim.currency} {claim.amount.toLocaleString()}
                        {claim.currency !== 'BTN' && (
                          <span className="block text-xs text-slate-600">
                            ≈ Nu.{Math.round(claim.amount * (claim.exchangeRate || 1)).toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {claim.approvedTARefNo || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeColor(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW CLAIM VIEW */}
      {view === 'new' && !caps.isReadOnly && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Create New Travel Claim</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Data Source */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Data Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual Entry</option>
                <option value="edats">e-DATS Integration</option>
              </select>
            </div>

            {/* Travel Type */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Travel Type</label>
              <select
                value={formData.travelType}
                onChange={(e) => setFormData({ ...formData, travelType: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="domestic">In-Country</option>
                <option value="foreign">Foreign Country</option>
              </select>
            </div>

            {/* Employee Search */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Employee</label>
              <select
                value={formData.employeeId}
                onChange={(e) => {
                  const empId = e.target.value;
                  const emp = getOpsEmployeeById(empId);
                  setFormData({
                    ...formData,
                    employeeId: empId,
                    positionTitle: emp?.positionTitle || '',
                    agencyName: emp?.agencyName || '',
                    agencyCode: emp?.workingAgency || '',
                    cid: emp?.cid || '',
                  });
                }}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Employee...</option>
                {OPS_EMPLOYEES.slice(0, 10).map(emp => (
                  <option key={emp.masterEmpId} value={emp.masterEmpId}>
                    {emp.firstName} {emp.lastName} ({emp.eid})
                  </option>
                ))}
              </select>
            </div>

            {/* Position Title (auto-filled) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Position Title</label>
              <input
                type="text"
                value={formData.positionTitle}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Agency Name (auto-filled) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Agency Name</label>
              <input
                type="text"
                value={formData.agencyName}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* CID (auto-filled) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">CID</label>
              <input
                type="text"
                value={formData.cid}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Budget Code */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Budget Code</label>
              <input
                type="text"
                value={formData.budgetCode}
                onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
                placeholder="e.g., HE-01-001"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Purpose */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-900 mb-2">Travel Purpose</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Training Program"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Destination</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Bangkok, Thailand"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Country of Travel (for foreign only) */}
            {formData.travelType === 'foreign' && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Country of Travel</label>
                <input
                  type="text"
                  value={formData.countryOfTravel}
                  onChange={(e) => setFormData({ ...formData, countryOfTravel: e.target.value })}
                  placeholder="e.g., Thailand"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => {
                  const curr = e.target.value as any;
                  const rate = CURRENCIES.find(c => c.code === curr)?.rate || 1;
                  setFormData({ ...formData, currency: curr, exchangeRate: rate });
                }}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-900">
                  {formData.currency}
                </span>
              </div>
              {formData.currency !== 'BTN' && (
                <p className="text-xs text-slate-600 mt-1">
                  Exchange Rate: 1 {formData.currency} = Nu. {formData.exchangeRate}
                </p>
              )}
            </div>

            {/* Approved Advance Amount */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Approved Advance Amount</label>
              <input
                type="number"
                value={formData.approvedAdvanceAmount}
                onChange={(e) => setFormData({ ...formData, approvedAdvanceAmount: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* e-DATS TA Reference Number */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">e-DATS TA Reference No.</label>
              <input
                type="text"
                value={formData.approvedTARefNo}
                onChange={(e) => setFormData({ ...formData, approvedTARefNo: e.target.value })}
                placeholder="e.g., TA-2026-00001"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* IFMIS Payment Transaction Ref */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">IFMIS Payment Ref</label>
              <input
                type="text"
                value={formData.paymentTransactionRef}
                onChange={(e) => setFormData({ ...formData, paymentTransactionRef: e.target.value })}
                placeholder="e.g., IFMIS-2026-00001"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Validation Panel */}
          <div className="border border-slate-200/50 rounded-lg p-4 bg-slate-50/50 space-y-2">
            <p className="text-sm font-bold text-slate-900">Validation Checks</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-slate-700">Employee ID & Org ID accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-slate-700">Budget availability check</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-slate-700">No duplicate reference numbers</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setView('list')}
              className="px-6 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateClaim}
              className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
            >
              Create Claim
            </button>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedClaim.refNo}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedClaim.employeeName}
                </p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold transition"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Employee Information Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Name</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Position</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.positionTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">CID</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.cid}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Agency</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.agencyName} ({selectedClaim.agencyCode})</p>
                  </div>
                </div>
              </div>

              {/* Travel Details Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Travel Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Type</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.travelType === 'domestic' ? 'In-Country' : 'Foreign'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Destination</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.destination}</p>
                  </div>
                  {selectedClaim.countryOfTravel && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">Country</p>
                      <p className="text-slate-900 mt-1">{selectedClaim.countryOfTravel}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Purpose</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.travelPurpose}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Start Date</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.startDate}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">End Date</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.endDate}</p>
                  </div>
                </div>
              </div>

              {/* Financial Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Financial Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Budget Code</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.budgetCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Claim Amount</p>
                    <p className="text-slate-900 mt-1 font-mono">
                      {selectedClaim.currency} {selectedClaim.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Approved Advance</p>
                    <p className="text-slate-900 mt-1 font-mono">
                      {selectedClaim.currency} {selectedClaim.approvedAdvanceAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Currency</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.currency}</p>
                  </div>
                  {selectedClaim.exchangeRate && selectedClaim.currency !== 'BTN' && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">Exchange Rate</p>
                      <p className="text-slate-900 mt-1">1 {selectedClaim.currency} = Nu. {selectedClaim.exchangeRate}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* References Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">References & Approval</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">e-DATS TA Ref</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.approvedTARefNo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">IFMIS Payment Ref</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.paymentTransactionRef || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Approval Date</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.dateOfApproval || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Claim Status</p>
                    <p className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeColor(selectedClaim.status)}`}>
                      {selectedClaim.status}
                    </p>
                  </div>
                  {selectedClaim.advanceStatus && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">Advance Status</p>
                      <p className="text-slate-900 mt-1">{selectedClaim.advanceStatus}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {!caps.isReadOnly && (
              <div className="border-t border-slate-200/80 bg-slate-50 px-6 py-4 flex gap-3">
                {selectedClaim.status === 'draft' && (
                  <button
                    onClick={() => {
                      handleSubmitClaim(selectedClaim.id);
                      setSelectedClaim(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition"
                  >
                    Submit for Verification
                  </button>
                )}
                {(selectedClaim.status === 'verified' || selectedClaim.status === 'submitted') && caps.canApprove && (
                  <button
                    onClick={() => {
                      handleApproveClaim(selectedClaim.id);
                      setSelectedClaim(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
                  >
                    Approve & Generate PO
                  </button>
                )}
                {selectedClaim.status === 'approved' && caps.canApprove && (
                  <button
                    onClick={() => {
                      handlePayClaim(selectedClaim.id);
                      setSelectedClaim(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition"
                  >
                    Process Payment
                  </button>
                )}
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-900 text-sm font-medium transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 2.0 — Travel Claim Processing
        </p>
        <p className="mt-1">
          Covers Travel Advance Requests, e-DATS Integration, Foreign Currency Conversion, Payment Order Generation
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
  color: "blue" | "amber" | "green";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    amber: "border-amber-200/50 bg-amber-50/50 text-amber-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
