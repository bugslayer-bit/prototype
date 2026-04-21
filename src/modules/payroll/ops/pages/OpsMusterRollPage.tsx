/* ═══════════════════════════════════════════════════════════════════════════
   OPS Muster Roll Creation & Payment Page
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — OPS Muster Roll Management
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';

/* ───────────────────────────────────────────────────────────────────────────
   Types & Constants
   ─────────────────────────────────────────────────────────────────────────── */

interface Program {
  id: string;
  name: string;
  shortName: string;
  description: string;
  startDate: string;
  endDate: string;
  agency: string;
  budgetCode: string;
  paymentFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'bi-annually' | 'yearly';
  status: 'active' | 'inactive' | 'completed';
  beneficiaryCount: number;
}

interface Beneficiary {
  id: string;
  name: string;
  cid: string;
  workPermit?: string;
  agencyName: string;
  agencyCode: string;
  positionJob: string;
  nationality?: string;
  gender: 'M' | 'F' | 'Other';
  dob: string;
  contact: string;
  type: 'skilled' | 'semi-skilled' | 'unskilled';
  dailyRate: number;
  lumpsumAmount?: number;
  location?: string;
  tpn?: string;
  bankName: string;
  bankBranch: string;
  bankAccountNo: string;
  status: 'active' | 'inactive';
}

interface MusterRollEntry {
  beneficiaryId: string;
  name: string;
  cid: string;
  workPermit: string;
  agencyName: string;
  agencyCode: string;
  positionJob: string;
  dob: string;
  daysWorked: number;
  dailyRate: number;
  monthlyWage: number;
  otherAllowance: number;
  gross: number;
  deductions: number;
  net: number;
  paymentPeriod: string;
  paymentStatus: 'pending' | 'processed' | 'paid';
}

const SAMPLE_PROGRAMS: Program[] = [
  {
    id: 'P001',
    name: 'Rural Infrastructure Development',
    shortName: 'RID-2026',
    description: 'Community-based rural infrastructure projects',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    agency: 'Ministry of Infrastructure',
    budgetCode: 'MI-02-001',
    paymentFrequency: 'monthly',
    status: 'active',
    beneficiaryCount: 45,
  },
  {
    id: 'P002',
    name: 'Health Campaign 2026',
    shortName: 'HC-2026',
    description: 'Community health awareness and screening',
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    agency: 'Ministry of Health',
    budgetCode: 'MH-01-002',
    paymentFrequency: 'bi-annually',
    status: 'active',
    beneficiaryCount: 23,
  },
];

const SAMPLE_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'B001',
    name: 'Pema Dorji',
    cid: '10203001234',
    workPermit: 'WP-2026-001',
    agencyName: 'Ministry of Infrastructure',
    agencyCode: 'AG-MI-001',
    positionJob: 'Project Supervisor',
    nationality: 'Bhutanese',
    gender: 'M',
    dob: '1995-05-15',
    contact: '17123456',
    type: 'skilled',
    dailyRate: 500,
    lumpsumAmount: 5000,
    location: 'Thimphu',
    tpn: 'TPN-2026-001',
    bankName: 'RICBL',
    bankBranch: 'Thimphu Main',
    bankAccountNo: '1234567890',
    status: 'active',
  },
  {
    id: 'B002',
    name: 'Sonam Tshering',
    cid: '10203001235',
    workPermit: 'WP-2026-002',
    agencyName: 'Ministry of Health',
    agencyCode: 'AG-MH-001',
    positionJob: 'Community Health Worker',
    nationality: 'Indian',
    gender: 'M',
    dob: '1998-08-20',
    contact: '17123457',
    type: 'semi-skilled',
    dailyRate: 350,
    lumpsumAmount: 3500,
    location: 'Paro',
    tpn: 'TPN-2026-002',
    bankName: 'BHUTAN BANK',
    bankBranch: 'Paro Branch',
    bankAccountNo: '0987654321',
    status: 'active',
  },
];

export function OpsMusterRollPage() {
  const { activeAgencyCode } = useAuth();
  const context = resolveAgencyContext(useAuth().activeRoleId);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* State Management */
  /* ─────────────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'programs' | 'payment'>('programs');
  const [programs, setPrograms] = useState<Program[]>(SAMPLE_PROGRAMS);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(SAMPLE_BENEFICIARIES);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [paymentStep, setPaymentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBeneficiariesForPayment, setSelectedBeneficiariesForPayment] = useState<Set<string>>(new Set());

  /* New Program Form */
  const [newProgramForm, setNewProgramForm] = useState({
    name: '',
    shortName: '',
    description: '',
    startDate: '',
    endDate: '',
    agency: '',
    budgetCode: '',
    paymentFrequency: 'monthly' as any,
  });

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Computed */
  /* ─────────────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const activePrograms = programs.filter(p => p.status === 'active').length;
    const totalBeneficiaries = beneficiaries.length;
    const selectedBens = Array.from(selectedBeneficiariesForPayment)
      .map(id => beneficiaries.find(b => b.id === id))
      .filter(b => b !== undefined);
    const totalDisbursed = selectedBens.reduce((sum, b) => {
      const monthlyWage = (b?.dailyRate || 0) * 25;
      const otherAllowance = (b?.lumpsumAmount || 0);
      return sum + monthlyWage + otherAllowance;
    }, 0);
    return { activePrograms, totalBeneficiaries, totalDisbursed };
  }, [programs, beneficiaries, selectedBeneficiariesForPayment]);

  const programBeneficiaries = useMemo(() => {
    if (!selectedProgram) return [];
    return beneficiaries.filter(b => b.status === 'active');
  }, [selectedProgram, beneficiaries]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Handlers */
  /* ─────────────────────────────────────────────────────────────────────── */
  const handleCreateProgram = useCallback(() => {
    if (!newProgramForm.name || !newProgramForm.budgetCode) {
      console.log('[Toast] Please fill all required fields');
      return;
    }

    const program: Program = {
      id: `P${programs.length + 1}`,
      ...newProgramForm,
      status: 'active',
      beneficiaryCount: 0,
    };

    setPrograms([...programs, program]);
    setNewProgramForm({
      name: '',
      shortName: '',
      description: '',
      startDate: '',
      endDate: '',
      agency: '',
      budgetCode: '',
      paymentFrequency: 'monthly',
    });
    setShowNewProgram(false);
    console.log('[Toast] Program created: ' + program.name);
  }, [newProgramForm, programs]);

  const toggleBeneficiarySelection = useCallback((beneficiaryId: string) => {
    setSelectedBeneficiariesForPayment(prev => {
      const next = new Set(prev);
      if (next.has(beneficiaryId)) {
        next.delete(beneficiaryId);
      } else {
        next.add(beneficiaryId);
      }
      return next;
    });
  }, []);

  const generatePayBill = useCallback(() => {
    if (selectedBeneficiariesForPayment.size === 0) {
      console.log('[Toast] Please select beneficiaries');
      return;
    }
    setPaymentStep(2);
    console.log('[Toast] PayBill generated for ' + selectedBeneficiariesForPayment.size + ' beneficiaries');
  }, [selectedBeneficiariesForPayment]);

  const handleFinalizePayment = useCallback(() => {
    setPaymentStep(3);
    console.log('[Toast] PayBill finalized with certification');
  }, []);

  const handlePostPayment = useCallback(() => {
    setPaymentStep(4);
    console.log('[Toast] Payment posted to MCP. Bank transfers initiated.');
  }, []);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Render */
  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            Muster Roll & Beneficiary Payment
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            SRS PRN 2.1 — Muster
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Create programs, register beneficiaries, and process muster roll payments
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-muster-roll" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">
                {caps.isReadOnly ? "Read-Only User" : "Muster Roll Officer"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Muster Roll Management Access</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Active Programs" value={stats.activePrograms} color="blue" />
        <SummaryCard label="Total Beneficiaries" value={stats.totalBeneficiaries} color="green" />
        <SummaryCard
          label="Pending Payroll"
          value={`Nu.${Math.round(stats.totalDisbursed).toLocaleString()}`}
          color="amber"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('programs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'programs'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Programs & Beneficiaries
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'payment'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Payment Generation
        </button>
      </div>

      {/* PROGRAMS & BENEFICIARIES TAB */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          {/* Programs Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Programs</h2>
              {!caps.isReadOnly && (
                <button
                  onClick={() => setShowNewProgram(!showNewProgram)}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
                >
                  {showNewProgram ? 'Cancel' : '+ New Program'}
                </button>
              )}
            </div>

            {/* New Program Form */}
            {showNewProgram && !caps.isReadOnly && (
              <div className="border border-slate-200/50 rounded-lg p-4 bg-slate-50/50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Program Name"
                    value={newProgramForm.name}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, name: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Short Name"
                    value={newProgramForm.shortName}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, shortName: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={newProgramForm.startDate}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, startDate: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={newProgramForm.endDate}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, endDate: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Agency"
                    value={newProgramForm.agency}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, agency: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Budget Code"
                    value={newProgramForm.budgetCode}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, budgetCode: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newProgramForm.paymentFrequency}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, paymentFrequency: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="bi-annually">Bi-annually</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <textarea
                    placeholder="Description"
                    value={newProgramForm.description}
                    onChange={(e) => setNewProgramForm({ ...newProgramForm, description: e.target.value })}
                    className="md:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                <button
                  onClick={handleCreateProgram}
                  className="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
                >
                  Create Program
                </button>
              </div>
            )}

            {/* Programs Table */}
            <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">Program Name</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">Agency</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">Budget Code</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">Frequency</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-900">Beneficiaries</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {programs.map(program => (
                    <tr key={program.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {program.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{program.agency}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{program.budgetCode}</td>
                      <td className="px-4 py-3 text-slate-600">{program.paymentFrequency}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        {program.beneficiaryCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          program.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {program.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedProgram(program)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Program Details - Beneficiaries */}
          {selectedProgram && (
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Beneficiaries - {selectedProgram.name}
                </h2>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ×
                </button>
              </div>

              {/* Beneficiaries Table */}
              <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Name</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">CID</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Work Permit</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Agency</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Position</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Type</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Location</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">Daily Rate</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Bank / Branch</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {programBeneficiaries.map(beneficiary => (
                      <tr key={beneficiary.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {beneficiary.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{beneficiary.cid}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {beneficiary.workPermit || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {beneficiary.agencyName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {beneficiary.positionJob}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{beneficiary.type}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {beneficiary.location || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          Nu.{beneficiary.dailyRate.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {beneficiary.bankName} • {beneficiary.bankBranch}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700">
                            active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENT GENERATION TAB */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          {/* Payment Wizard */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
            {/* Progress */}
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    paymentStep >= step
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      paymentStep > step ? 'bg-blue-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6 text-sm">
              <p className="text-xs font-bold text-slate-600 uppercase">
                Step {paymentStep} of 4
              </p>
              <h3 className="text-lg font-bold text-slate-900">
                {paymentStep === 1 && 'Select Beneficiaries & System Checks'}
                {paymentStep === 2 && 'Draft PayBill Generation'}
                {paymentStep === 3 && 'Finalize with Certification'}
                {paymentStep === 4 && 'Payment Posted to MCP'}
              </h3>
            </div>

            {/* Step 1: Select Beneficiaries */}
            {paymentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 mb-4">
                  Select beneficiaries and confirm system checks
                </p>

                {/* Beneficiaries Checklist */}
                <div className="border border-slate-200/50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                  {beneficiaries.map(beneficiary => (
                    <label key={beneficiary.id} className="flex items-center gap-3 p-3 hover:bg-slate-50/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBeneficiariesForPayment.has(beneficiary.id)}
                        onChange={() => toggleBeneficiarySelection(beneficiary.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{beneficiary.name}</p>
                        <p className="text-xs text-slate-600">
                          {beneficiary.cid} • Nu.{beneficiary.dailyRate}/day • {beneficiary.type}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* System Checks */}
                <div className="border border-green-200/50 rounded-lg p-4 bg-green-50/50 space-y-2">
                  <p className="text-sm font-bold text-slate-900">System Checks</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-slate-700">Compute wages rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-slate-700">Overtime calculations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-slate-700">Tax computations</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={generatePayBill}
                  disabled={selectedBeneficiariesForPayment.size === 0}
                  className="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  Continue to PayBill ({selectedBeneficiariesForPayment.size} selected)
                </button>
              </div>
            )}

            {/* Step 2: Draft PayBill */}
            {paymentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 mb-4">
                  Review and finalize the payroll paybill
                </p>

                <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-900">Name / Agency / Position</th>
                        <th className="px-4 py-3 text-center font-bold text-slate-900">Work Permit</th>
                        <th className="px-4 py-3 text-center font-bold text-slate-900">Days</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-900">Daily Rate</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-900">Monthly Wage</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-900">Other Allow.</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-900">Deduction</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-900">Net Pay</th>
                        <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50">
                      {Array.from(selectedBeneficiariesForPayment).map(benId => {
                        const ben = beneficiaries.find(b => b.id === benId);
                        if (!ben) return null;
                        const daysWorked = 25;
                        const dailyWage = ben.dailyRate;
                        const monthlyWage = dailyWage * daysWorked;
                        const otherAllowance = ben.lumpsumAmount ? Math.round(ben.lumpsumAmount / 25) : 0;
                        const grossPay = monthlyWage + otherAllowance;
                        const deduction = grossPay * 0.08;
                        const netPay = grossPay - deduction;
                        return (
                          <tr key={ben.id}>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              <div>{ben.name}</div>
                              <div className="text-xs text-slate-600">{ben.agencyName}</div>
                              <div className="text-xs text-slate-500">{ben.positionJob}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">{ben.workPermit || '—'}</td>
                            <td className="px-4 py-3 text-center">{daysWorked}</td>
                            <td className="px-4 py-3 text-right font-mono">Nu.{dailyWage}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold">Nu.{monthlyWage.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono">Nu.{otherAllowance.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-red-700">Nu.{Math.round(deduction).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-green-700">Nu.{Math.round(netPay).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700">
                                processed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleFinalizePayment}
                  className="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
                >
                  Proceed to Finalization
                </button>
              </div>
            )}

            {/* Step 3: Certification */}
            {paymentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 mb-4">
                  Certify the muster roll paybill
                </p>

                <div className="border border-slate-200/50 rounded-lg p-6 bg-slate-50/50 space-y-4">
                  <p className="text-base font-semibold text-slate-900 italic">
                    "I, hereby, certify the muster roll paybill prepared for payment to the beneficiaries is accurate and complete, and all statutory deductions and compliance checks have been performed."
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                      <span className="text-sm text-slate-700">I certify the accuracy of this payroll</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                      <span className="text-sm text-slate-700">I confirm budget availability</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                      <span className="text-sm text-slate-700">Bank details verified</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handlePostPayment}
                  className="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
                >
                  Post to MCP & Process
                </button>
              </div>
            )}

            {/* Step 4: Completed */}
            {paymentStep === 4 && (
              <div className="space-y-4">
                <div className="border border-green-200/50 rounded-lg p-6 bg-green-50/50 text-center space-y-3">
                  <p className="text-2xl font-bold text-green-700">✓ Payment Processed</p>
                  <p className="text-sm text-slate-700">
                    {selectedBeneficiariesForPayment.size} beneficiaries registered for payment
                  </p>
                  <p className="text-xs text-slate-600">
                    Bank transfers initiated. Confirmation emails sent.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setPaymentStep(1);
                    setSelectedBeneficiariesForPayment(new Set());
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium transition"
                >
                  Start New Batch
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 2.1 — Muster Roll Creation & Payment
        </p>
        <p className="mt-1">
          Program Master, Beneficiary Registry, PayBill Generation, MCP Integration
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
  color: "blue" | "green" | "amber";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
    amber: "border-amber-200/50 bg-amber-50/50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
