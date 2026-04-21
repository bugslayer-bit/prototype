/* ═══════════════════════════════════════════════════════════════════════════
   OPS Sitting Fee & Honorarium Processing Page
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — OPS Sitting Fee & Honorarium Management
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import { computeTDS } from '../data/opsTdsSlab';

/* ───────────────────────────────────────────────────────────────────────────
   Types & Constants
   ─────────────────────────────────────────────────────────────────────────── */

interface Beneficiary {
  id: string;
  name: string;
  cid: string;
  workPermit?: string; // DDi 32.3
  tpnNo?: string; // DDi 32.4
  nationality: string;
  gender: 'M' | 'F' | 'Other';
  dob: string;
  contact: string;
  bankName: string;
  bankAccountNo: string;
  ratePerDay: number;
}

interface SittingFeeTransaction {
  id: string;
  refNo: string;
  beneficiaryId: string;
  beneficiaryName: string;
  workPermit?: string; // DDi 32.3
  tpnNo?: string; // DDi 32.4
  startDate?: string; // DDi 33.5
  endDate?: string; // DDi 33.6
  durationDays?: number; // DDi 33.7 (days attended)
  ratePerDay?: number; // DDi 33.8 (rate per day)
  dates: string[];
  meetingsAttended: number;
  grossFee: number; // DDi 33.9
  taxDeducted: number; // DDi 33.2 (taxes/deductions)
  netFee: number; // DDi 33.21 (net pay)
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  createdDate: string;
}

interface HonorariumTransaction {
  id: string;
  refNo: string;
  recipientName: string;
  recipientCid: string;
  workPermit?: string; // DDi 32.3
  tpnNo?: string; // DDi 32.4
  startDate?: string; // DDi 34.5
  endDate?: string; // DDi 34.6
  durationDays?: number; // DDi 34.7 (days attended)
  ratePerDay?: number; // DDi 34.8 (rate per day)
  serviceType: 'consultation' | 'training' | 'facilitation' | 'review' | 'other';
  serviceDate: string;
  description: string;
  amount: number; // DDi 34.9 (gross amount)
  justification: string;
  taxDeducted: number; // DDi 34.2 (taxes/deductions)
  netAmount: number; // DDi 34.21 (net pay)
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  createdDate: string;
}

const SAMPLE_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'B001',
    name: 'Dorji Wangchuk',
    cid: '10203001234',
    workPermit: 'WP-2026-001',
    tpnNo: 'TPN-12345678',
    nationality: 'Bhutanese',
    gender: 'M',
    dob: '1965-03-15',
    contact: '17123456',
    bankName: 'RICBL',
    bankAccountNo: '1234567890',
    ratePerDay: 2000,
  },
  {
    id: 'B002',
    name: 'Sonam Tshering',
    cid: '10203001235',
    workPermit: 'WP-2026-002',
    tpnNo: 'TPN-87654321',
    nationality: 'Bhutanese',
    gender: 'M',
    dob: '1970-07-20',
    contact: '17123457',
    bankName: 'BHUTAN BANK',
    bankAccountNo: '0987654321',
    ratePerDay: 1500,
  },
];

const SAMPLE_SITTING_FEES: SittingFeeTransaction[] = [
  {
    id: '1',
    refNo: 'SF-2026-001',
    beneficiaryId: 'B001',
    beneficiaryName: 'Dorji Wangchuk',
    workPermit: 'WP-2026-001', // DDi 32.3
    tpnNo: 'TPN-12345678', // DDi 32.4
    startDate: '2026-03-15', // DDi 33.5
    endDate: '2026-03-25', // DDi 33.6
    durationDays: 3, // DDi 33.7
    ratePerDay: 2000, // DDi 33.8
    dates: ['2026-03-15', '2026-03-20', '2026-03-25'],
    meetingsAttended: 3,
    grossFee: 6000, // DDi 33.9
    taxDeducted: 480, // DDi 33.2
    netFee: 5520, // DDi 33.21
    status: 'approved',
    createdDate: '2026-03-10',
  },
];

const SERVICE_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'training', label: 'Training Facilitation' },
  { value: 'facilitation', label: 'Workshop Facilitation' },
  { value: 'review', label: 'Document Review' },
  { value: 'other', label: 'Other' },
];

export function OpsSittingFeeHonorariumPage() {
  const { activeAgencyCode } = useAuth();
  const context = resolveAgencyContext(useAuth().activeRoleId);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* State Management */
  /* ─────────────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'sitting-fee' | 'honorarium'>('sitting-fee');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(SAMPLE_BENEFICIARIES);
  const [sittingFeeTransactions, setSittingFeeTransactions] = useState<SittingFeeTransaction[]>(SAMPLE_SITTING_FEES);
  const [honorariumTransactions, setHonorariumTransactions] = useState<HonorariumTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<SittingFeeTransaction | HonorariumTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  /* Sitting Fee Form */
  const [sittingFeeForm, setShowSittingFeeForm] = useState(false);
  const [sittingFeeData, setSittingFeeData] = useState({
    beneficiaryId: '',
    workPermit: '', // DDi 32.3
    tpnNo: '', // DDi 32.4
    startDate: '', // DDi 33.5
    endDate: '', // DDi 33.6
    durationDays: 0, // DDi 33.7
    ratePerDay: 0, // DDi 33.8
    meetingDates: [''],
  });

  /* Honorarium Form */
  const [honorariumForm, setShowHonorariumForm] = useState(false);
  const [honorariumData, setHonorariumData] = useState({
    entryMethod: 'individual' as 'individual' | 'bulk',
    recipientName: '',
    recipientCid: '',
    workPermit: '', // DDi 32.3
    tpnNo: '', // DDi 32.4
    startDate: '', // DDi 34.5
    endDate: '', // DDi 34.6
    durationDays: 0, // DDi 34.7
    ratePerDay: 0, // DDi 34.8
    serviceType: 'consultation' as any,
    serviceDate: '',
    description: '',
    amount: 0,
    justification: '',
    documents: [] as File[],
  });

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Computed */
  /* ─────────────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalSittingFeesPaid = sittingFeeTransactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.netFee, 0);

    const totalHonorariumPaid = honorariumTransactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.netAmount, 0);

    const pendingApprovals = sittingFeeTransactions.filter(t => t.status === 'submitted').length +
      honorariumTransactions.filter(t => t.status === 'submitted').length;

    return { totalSittingFeesPaid, totalHonorariumPaid, pendingApprovals };
  }, [sittingFeeTransactions, honorariumTransactions]);

  const filteredSittingFees = useMemo(() => {
    let filtered = sittingFeeTransactions;

    if (filterStatus) {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.beneficiaryName.toLowerCase().includes(q) ||
        t.refNo.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [sittingFeeTransactions, filterStatus, searchQuery]);

  const filteredHonorarium = useMemo(() => {
    let filtered = honorariumTransactions;

    if (filterStatus) {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.recipientName.toLowerCase().includes(q) ||
        t.refNo.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [honorariumTransactions, filterStatus, searchQuery]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Handlers */
  /* ─────────────────────────────────────────────────────────────────────── */
  const calculateTax = useCallback((amount: number) => {
    return computeTDS(amount);
  }, []);

  const handleCreateSittingFee = useCallback(() => {
    if (!sittingFeeData.beneficiaryId || sittingFeeData.meetingDates.filter(d => d).length === 0 || !sittingFeeData.startDate || !sittingFeeData.endDate) {
      console.log('[Toast] Please fill all required fields');
      return;
    }

    const beneficiary = beneficiaries.find(b => b.id === sittingFeeData.beneficiaryId);
    if (!beneficiary) return;

    const validDates = sittingFeeData.meetingDates.filter(d => d);
    const rateToUse = sittingFeeData.ratePerDay || beneficiary.ratePerDay;
    const grossFee = rateToUse * validDates.length;
    const taxDeducted = calculateTax(grossFee);
    const netFee = grossFee - taxDeducted;

    const transaction: SittingFeeTransaction = {
      id: String(sittingFeeTransactions.length + 1),
      refNo: `SF-${new Date().getFullYear()}-${String(sittingFeeTransactions.length + 1).padStart(3, '0')}`,
      beneficiaryId: sittingFeeData.beneficiaryId,
      beneficiaryName: beneficiary.name,
      workPermit: sittingFeeData.workPermit || beneficiary.workPermit, // DDi 32.3
      tpnNo: sittingFeeData.tpnNo || beneficiary.tpnNo, // DDi 32.4
      startDate: sittingFeeData.startDate, // DDi 33.5
      endDate: sittingFeeData.endDate, // DDi 33.6
      durationDays: validDates.length, // DDi 33.7
      ratePerDay: rateToUse, // DDi 33.8
      dates: validDates,
      meetingsAttended: validDates.length,
      grossFee, // DDi 33.9
      taxDeducted, // DDi 33.2
      netFee, // DDi 33.21
      status: 'draft',
      createdDate: new Date().toISOString().split('T')[0],
    };

    setSittingFeeTransactions([...sittingFeeTransactions, transaction]);
    setSittingFeeData({ beneficiaryId: '', workPermit: '', tpnNo: '', startDate: '', endDate: '', durationDays: 0, ratePerDay: 0, meetingDates: [''] });
    setShowSittingFeeForm(false);
    console.log('[Toast] Sitting fee transaction created: ' + transaction.refNo);
  }, [sittingFeeData, beneficiaries, sittingFeeTransactions, calculateTax]);

  const handleCreateHonorarium = useCallback(() => {
    if (!honorariumData.recipientName || !honorariumData.serviceDate || honorariumData.amount === 0) {
      console.log('[Toast] Please fill all required fields');
      return;
    }

    const taxDeducted = calculateTax(honorariumData.amount);
    const netAmount = honorariumData.amount - taxDeducted;

    const transaction: HonorariumTransaction = {
      id: String(honorariumTransactions.length + 1),
      refNo: `HN-${new Date().getFullYear()}-${String(honorariumTransactions.length + 1).padStart(3, '0')}`,
      recipientName: honorariumData.recipientName,
      recipientCid: honorariumData.recipientCid,
      workPermit: honorariumData.workPermit, // DDi 32.3
      tpnNo: honorariumData.tpnNo, // DDi 32.4
      startDate: honorariumData.startDate, // DDi 34.5
      endDate: honorariumData.endDate, // DDi 34.6
      durationDays: honorariumData.durationDays, // DDi 34.7
      ratePerDay: honorariumData.ratePerDay, // DDi 34.8
      serviceType: honorariumData.serviceType,
      serviceDate: honorariumData.serviceDate,
      description: honorariumData.description,
      amount: honorariumData.amount, // DDi 34.9
      justification: honorariumData.justification,
      taxDeducted, // DDi 34.2
      netAmount, // DDi 34.21
      status: 'draft',
      createdDate: new Date().toISOString().split('T')[0],
    };

    setHonorariumTransactions([...honorariumTransactions, transaction]);
    setHonorariumData({
      entryMethod: 'individual',
      recipientName: '',
      recipientCid: '',
      workPermit: '',
      tpnNo: '',
      startDate: '',
      endDate: '',
      durationDays: 0,
      ratePerDay: 0,
      serviceType: 'consultation',
      serviceDate: '',
      description: '',
      amount: 0,
      justification: '',
      documents: [],
    });
    setShowHonorariumForm(false);
    console.log('[Toast] Honorarium transaction created: ' + transaction.refNo);
  }, [honorariumData, honorariumTransactions, calculateTax]);

  const handleSubmitTransaction = useCallback((id: string, type: 'sitting' | 'honorarium') => {
    if (type === 'sitting') {
      setSittingFeeTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'submitted' } : t)
      );
    } else {
      setHonorariumTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'submitted' } : t)
      );
    }
    console.log('[Toast] Transaction submitted for approval');
  }, []);

  const handleApproveTransaction = useCallback((id: string, type: 'sitting' | 'honorarium') => {
    if (type === 'sitting') {
      setSittingFeeTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'approved' } : t)
      );
    } else {
      setHonorariumTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'approved' } : t)
      );
    }
    console.log('[Toast] Transaction approved. Payment order generated.');
  }, []);

  const handlePayTransaction = useCallback((id: string, type: 'sitting' | 'honorarium') => {
    if (type === 'sitting') {
      setSittingFeeTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'paid' } : t)
      );
    } else {
      setHonorariumTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'paid' } : t)
      );
    }
    console.log('[Toast] Payment processed and transferred to bank account');
  }, []);

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-amber-100 text-amber-700',
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
            Sitting Fee & Honorarium Management
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            SRS PRN 2.2 — Sitting & Honorarium
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Process sitting fees for committee members and honorariums for services
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-sitting-fee-honorarium" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">
                {caps.isReadOnly ? "Read-Only User" : "Sitting Fee Officer"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Sitting Fee & Honorarium Processing</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Sitting Fees Paid"
          value={`Nu.${Math.round(stats.totalSittingFeesPaid).toLocaleString()}`}
          color="blue"
        />
        <SummaryCard
          label="Honorarium Paid"
          value={`Nu.${Math.round(stats.totalHonorariumPaid).toLocaleString()}`}
          color="purple"
        />
        <SummaryCard label="Pending Approval" value={stats.pendingApprovals} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('sitting-fee')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'sitting-fee'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Sitting Fees
        </button>
        <button
          onClick={() => setActiveTab('honorarium')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'honorarium'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Honorarium
        </button>
      </div>

      {/* SITTING FEE TAB */}
      {activeTab === 'sitting-fee' && (
        <div className="space-y-6">
          {/* Search & Filter */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4 flex gap-3">
            <input
              type="text"
              placeholder="Search by beneficiary name or ref no..."
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
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
            {!caps.isReadOnly && (
              <button
                onClick={() => setShowSittingFeeForm(!sittingFeeForm)}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition whitespace-nowrap"
              >
                {sittingFeeForm ? 'Cancel' : '+ New Entry'}
              </button>
            )}
          </div>

          {/* New Sitting Fee Form */}
          {sittingFeeForm && !caps.isReadOnly && (
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Create Sitting Fee Entry</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Beneficiary</label>
                  <select
                    value={sittingFeeData.beneficiaryId}
                    onChange={(e) => {
                      const beneficiary = beneficiaries.find(b => b.id === e.target.value);
                      setSittingFeeData({
                        ...sittingFeeData,
                        beneficiaryId: e.target.value,
                        workPermit: beneficiary?.workPermit || '',
                        tpnNo: beneficiary?.tpnNo || '',
                        ratePerDay: beneficiary?.ratePerDay || 0,
                      });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Beneficiary...</option>
                    {beneficiaries.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Nu.{b.ratePerDay}/day)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Meetings Attended</label>
                  <input
                    type="number"
                    value={sittingFeeData.meetingDates.filter(d => d).length}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Work Permit (DDi 32.3)</label>
                  <input
                    type="text"
                    value={sittingFeeData.workPermit}
                    onChange={(e) => setSittingFeeData({ ...sittingFeeData, workPermit: e.target.value })}
                    placeholder="Work Permit No."
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">TPN No (DDi 32.4)</label>
                  <input
                    type="text"
                    value={sittingFeeData.tpnNo}
                    onChange={(e) => setSittingFeeData({ ...sittingFeeData, tpnNo: e.target.value })}
                    placeholder="TPN Number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Start Date (DDi 33.5)</label>
                  <input
                    type="date"
                    value={sittingFeeData.startDate}
                    onChange={(e) => setSittingFeeData({ ...sittingFeeData, startDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">End Date (DDi 33.6)</label>
                  <input
                    type="date"
                    value={sittingFeeData.endDate}
                    onChange={(e) => setSittingFeeData({ ...sittingFeeData, endDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Rate per Day (DDi 33.8)</label>
                  <input
                    type="number"
                    value={sittingFeeData.ratePerDay}
                    onChange={(e) => setSittingFeeData({ ...sittingFeeData, ratePerDay: parseFloat(e.target.value) })}
                    placeholder="Rate per day"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Meeting Dates</label>
                <div className="space-y-2">
                  {sittingFeeData.meetingDates.map((date, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const newDates = [...sittingFeeData.meetingDates];
                          newDates[idx] = e.target.value;
                          setSittingFeeData({ ...sittingFeeData, meetingDates: newDates });
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {idx === sittingFeeData.meetingDates.length - 1 && (
                        <button
                          onClick={() => setSittingFeeData({
                            ...sittingFeeData,
                            meetingDates: [...sittingFeeData.meetingDates, '']
                          })}
                          className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium"
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateSittingFee}
                className="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
              >
                Create Entry
              </button>
            </div>
          )}

          {/* Sitting Fees Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Ref No</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Beneficiary</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Work Permit</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">TPN</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Period</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Days</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Rate/Day</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">Gross</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">Tax</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">Net</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {filteredSittingFees.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-8 text-center text-slate-500">
                        No sitting fee transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredSittingFees.map(transaction => (
                      <tr key={transaction.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                          {transaction.refNo}
                        </td>
                        <td className="px-6 py-3 text-slate-900">{transaction.beneficiaryName}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{transaction.workPermit || '-'}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{transaction.tpnNo || '-'}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {transaction.startDate && transaction.endDate ? `${transaction.startDate} to ${transaction.endDate}` : '-'}
                        </td>
                        <td className="px-6 py-3 text-center font-bold text-slate-900">
                          {transaction.durationDays || transaction.meetingsAttended}
                        </td>
                        <td className="px-6 py-3 text-center font-mono text-slate-600">
                          Nu.{(transaction.ratePerDay || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-slate-900">
                          Nu.{transaction.grossFee.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-red-700">
                          Nu.{transaction.taxDeducted.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-green-700">
                          Nu.{transaction.netFee.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
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
        </div>
      )}

      {/* HONORARIUM TAB */}
      {activeTab === 'honorarium' && (
        <div className="space-y-6">
          {/* Search & Filter */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4 flex gap-3">
            <input
              type="text"
              placeholder="Search by recipient name or ref no..."
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
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
            {!caps.isReadOnly && (
              <button
                onClick={() => setShowHonorariumForm(!honorariumForm)}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition whitespace-nowrap"
              >
                {honorariumForm ? 'Cancel' : '+ New Entry'}
              </button>
            )}
          </div>

          {/* New Honorarium Form */}
          {honorariumForm && !caps.isReadOnly && (
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Create Honorarium Entry</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Entry Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="individual"
                        checked={honorariumData.entryMethod === 'individual'}
                        onChange={(e) => setHonorariumData({ ...honorariumData, entryMethod: e.target.value as any })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">Individual Entry</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="bulk"
                        checked={honorariumData.entryMethod === 'bulk'}
                        onChange={(e) => setHonorariumData({ ...honorariumData, entryMethod: e.target.value as any })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">Bulk Upload</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Recipient Name</label>
                  <input
                    type="text"
                    value={honorariumData.recipientName}
                    onChange={(e) => setHonorariumData({ ...honorariumData, recipientName: e.target.value })}
                    placeholder="Full Name"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">CID</label>
                  <input
                    type="text"
                    value={honorariumData.recipientCid}
                    onChange={(e) => setHonorariumData({ ...honorariumData, recipientCid: e.target.value })}
                    placeholder="CID"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Work Permit (DDi 32.3)</label>
                  <input
                    type="text"
                    value={honorariumData.workPermit}
                    onChange={(e) => setHonorariumData({ ...honorariumData, workPermit: e.target.value })}
                    placeholder="Work Permit No."
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">TPN No (DDi 32.4)</label>
                  <input
                    type="text"
                    value={honorariumData.tpnNo}
                    onChange={(e) => setHonorariumData({ ...honorariumData, tpnNo: e.target.value })}
                    placeholder="TPN Number"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Start Date (DDi 34.5)</label>
                  <input
                    type="date"
                    value={honorariumData.startDate}
                    onChange={(e) => setHonorariumData({ ...honorariumData, startDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">End Date (DDi 34.6)</label>
                  <input
                    type="date"
                    value={honorariumData.endDate}
                    onChange={(e) => setHonorariumData({ ...honorariumData, endDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Duration Days (DDi 34.7)</label>
                  <input
                    type="number"
                    value={honorariumData.durationDays}
                    onChange={(e) => setHonorariumData({ ...honorariumData, durationDays: parseInt(e.target.value) })}
                    placeholder="Number of days attended"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Rate per Day (DDi 34.8)</label>
                  <input
                    type="number"
                    value={honorariumData.ratePerDay}
                    onChange={(e) => setHonorariumData({ ...honorariumData, ratePerDay: parseFloat(e.target.value) })}
                    placeholder="Rate per day"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Service Type</label>
                  <select
                    value={honorariumData.serviceType}
                    onChange={(e) => setHonorariumData({ ...honorariumData, serviceType: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SERVICE_TYPES.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Service Date</label>
                  <input
                    type="date"
                    value={honorariumData.serviceDate}
                    onChange={(e) => setHonorariumData({ ...honorariumData, serviceDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Amount (Nu.) (DDi 34.9)</label>
                  <input
                    type="number"
                    value={honorariumData.amount}
                    onChange={(e) => setHonorariumData({ ...honorariumData, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Description</label>
                  <textarea
                    value={honorariumData.description}
                    onChange={(e) => setHonorariumData({ ...honorariumData, description: e.target.value })}
                    placeholder="Service description"
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Justification</label>
                  <textarea
                    value={honorariumData.justification}
                    onChange={(e) => setHonorariumData({ ...honorariumData, justification: e.target.value })}
                    placeholder="Why is this honorarium being paid?"
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Attachments</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-600">Drag files here or click to upload</p>
                    <input type="file" multiple className="hidden" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateHonorarium}
                className="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
              >
                Create Entry
              </button>
            </div>
          )}

          {/* Honorarium Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Ref No</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Recipient</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Work Permit</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">TPN</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Period</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Days</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Rate/Day</th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">Service Type</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">Amount</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">Tax</th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">Net</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-center font-bold text-slate-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {filteredHonorarium.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-8 text-center text-slate-500">
                        No honorarium transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredHonorarium.map(transaction => (
                      <tr key={transaction.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                          {transaction.refNo}
                        </td>
                        <td className="px-6 py-3 text-slate-900">{transaction.recipientName}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{transaction.workPermit || '-'}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{transaction.tpnNo || '-'}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {transaction.startDate && transaction.endDate ? `${transaction.startDate} to ${transaction.endDate}` : '-'}
                        </td>
                        <td className="px-6 py-3 text-center font-bold text-slate-900">
                          {transaction.durationDays || '-'}
                        </td>
                        <td className="px-6 py-3 text-center font-mono text-slate-600">
                          {transaction.ratePerDay ? `Nu.${transaction.ratePerDay.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-3 text-slate-600">{transaction.serviceType}</td>
                        <td className="px-6 py-3 text-right font-mono text-slate-900">
                          Nu.{transaction.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-red-700">
                          Nu.{transaction.taxDeducted.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-green-700">
                          Nu.{transaction.netAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
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
        </div>
      )}

      {/* Detail Panel */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {(selectedTransaction as any).refNo}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold transition"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {selectedTransaction && 'beneficiaryName' in selectedTransaction ? (
                <>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Beneficiary</p>
                        <p className="text-slate-900 mt-1">{selectedTransaction.beneficiaryName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">CID</p>
                        <p className="text-slate-900 mt-1 font-mono">{selectedTransaction.beneficiaryId}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">DDi 32: Beneficiary Info</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Work Permit (32.3)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.workPermit || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">TPN No (32.4)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.tpnNo || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">DDi 33: Sitting Fee Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Start Date (33.5)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.startDate || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">End Date (33.6)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.endDate || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Duration Days (33.7)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.durationDays || selectedTransaction.meetingsAttended}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Rate/Day (33.8)</p>
                          <p className="text-slate-900 mt-1 font-mono">Nu.{(selectedTransaction.ratePerDay || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">DDi 33: Computation</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Gross Amount (33.9)</p>
                          <p className="text-slate-900 mt-1 font-mono">Nu.{selectedTransaction.grossFee.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Taxes/Deductions (33.2)</p>
                          <p className="text-slate-900 mt-1 font-mono text-red-700">Nu.{selectedTransaction.taxDeducted.toLocaleString()}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Net Pay (33.21)</p>
                        <p className="text-2xl font-bold text-green-700 mt-2">Nu.{selectedTransaction.netFee.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : selectedTransaction && 'recipientName' in selectedTransaction ? (
                <>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Recipient</p>
                        <p className="text-slate-900 mt-1">{selectedTransaction.recipientName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">CID</p>
                        <p className="text-slate-900 mt-1 font-mono">{selectedTransaction.recipientCid}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">DDi 32: Beneficiary Info</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Work Permit (32.3)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.workPermit || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">TPN No (32.4)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.tpnNo || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">DDi 34: Honorarium Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Start Date (34.5)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.startDate || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">End Date (34.6)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.endDate || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Duration Days (34.7)</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.durationDays || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Rate/Day (34.8)</p>
                          <p className="text-slate-900 mt-1 font-mono">
                            {selectedTransaction.ratePerDay ? `Nu.${selectedTransaction.ratePerDay.toLocaleString()}` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Service Type</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.serviceType}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Service Date</p>
                          <p className="text-slate-900 mt-1">{selectedTransaction.serviceDate}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">DDi 34: Computation</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Gross Amount (34.9)</p>
                          <p className="text-slate-900 mt-1 font-mono">Nu.{selectedTransaction.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Taxes/Deductions (34.2)</p>
                          <p className="text-slate-900 mt-1 font-mono text-red-700">Nu.{selectedTransaction.taxDeducted.toLocaleString()}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Net Pay (34.21)</p>
                        <p className="text-2xl font-bold text-green-700 mt-2">Nu.{selectedTransaction.netAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <p className="text-xs font-bold text-slate-600 uppercase">Description</p>
                      <p className="text-slate-700 mt-2">{selectedTransaction.description || '-'}</p>
                    </div>

                    <div className="border-t border-slate-200/50 pt-4">
                      <p className="text-xs font-bold text-slate-600 uppercase">Justification</p>
                      <p className="text-slate-700 mt-2">{selectedTransaction.justification || '-'}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Actions */}
            {!caps.isReadOnly && (
              <div className="border-t border-slate-200/80 bg-slate-50 px-6 py-4 flex gap-3">
                {selectedTransaction && selectedTransaction.status === 'draft' && (
                  <button
                    onClick={() => {
                      const type = 'beneficiaryName' in selectedTransaction ? 'sitting' : 'honorarium';
                      handleSubmitTransaction(selectedTransaction.id, type);
                      setSelectedTransaction(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition"
                  >
                    Submit
                  </button>
                )}
                {selectedTransaction && (selectedTransaction.status === 'submitted' || selectedTransaction.status === 'approved') && caps.canApprove && (
                  <button
                    onClick={() => {
                      const type = 'beneficiaryName' in selectedTransaction ? 'sitting' : 'honorarium';
                      handleApproveTransaction(selectedTransaction.id, type);
                      setSelectedTransaction(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
                  >
                    Approve & Process
                  </button>
                )}
                <button
                  onClick={() => setSelectedTransaction(null)}
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
          SRS Reference: Payroll SRS v1.1, PRN 2.2 — Sitting Fee & Honorarium Processing
        </p>
        <p className="mt-1">
          Beneficiary Registration, Transaction Creation, Tax Computation, Approval Workflow, Payment Generation
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
  color: "blue" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    purple: "border-purple-200/50 bg-purple-50/50 text-purple-900",
    amber: "border-amber-200/50 bg-amber-50/50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
