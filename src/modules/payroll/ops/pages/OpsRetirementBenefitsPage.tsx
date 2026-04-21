'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { getRoleTheme } from '../../../../shared/roleTheme';
import { RoleContextBanner } from '../../../../shared/components/RoleContextBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import { getOpsEmployees } from '../data/opsEmployeeSeed';

/* ═══════════════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════════════ */

type RetirementType = 'superannuation' | 'compulsory' | 'termination' | 'early-retirement' | 'resignation' | 'disability';

interface Nominee {
  id: string;
  name: string;
  relationship: string;
  bankAccount: string;
  bankName: string;
  bankBranch: string;
  amount: number;
}

interface RetirementBenefitCase {
  id: string;
  employeeId: string;
  employeeName: string;
  cid: string;
  eid: string;
  workPermit: string;
  tpn: string;
  lastWorkingAgency: string;
  payrollDepartment: string;
  retirementType: RetirementType;
  yearsOfService: number;
  gratuity: number;
  transferGrant: number;
  travellingAllowance: number;
  transportCharges: number;
  leaveEncashment: number;
  mileage: number;
  grossBenefit: number;
  taxesDeductions: number;
  netBenefit: number;
  nominees: Nominee[];
  agencyCode: string;
  agencyName?: string;
  budgetCode: string;
  paymentAgencyCode?: string;
  paymentBudgetCode?: string;
  commitmentCheckPassed: boolean;
  commitmentCheckStatus?: 'passed' | 'failed' | 'pending' | 'not-applicable';
  fundBalanceCheckPassed: boolean;
  mcpCheckStatus?: 'posted' | 'pending' | 'error' | 'not-applicable';
  paymentOrderId: string;
  createdDate: string;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
}

type NewRetirementStep = 'select-employee' | 'compute-benefits' | 'nominees' | 'budget-validation' | 'confirm';

const RETIREMENT_TYPES = [
  { value: 'superannuation', label: 'Superannuation (DDi 35.1)' },
  { value: 'compulsory', label: 'Compulsory Retirement (DDi 35.2)' },
  { value: 'termination', label: 'Termination with Benefits (DDi 35.3)' },
  { value: 'early-retirement', label: 'Early Retirement (DDi 35.4)' },
  { value: 'resignation', label: 'Voluntary Resignation (DDi 35.5)' },
  { value: 'disability', label: 'Disability/Medical (DDi 35.6)' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Utility Functions
   ═══════════════════════════════════════════════════════════════════════════ */

function generateSampleRetirementCases(): RetirementBenefitCase[] {
  const employees = getOpsEmployees();
  const cases: RetirementBenefitCase[] = [];
  const retirementTypes: RetirementType[] = ['superannuation', 'compulsory', 'termination'];

  employees.slice(0, 4).forEach((emp, index) => {
    const yearsOfService = 25 + (index * 3);
    const basicPay = emp.monthlyBasicPay || 15000;
    const gratuity = Math.round(basicPay * (yearsOfService / 12) * 1.5);
    const transferGrant = 25000;
    const travellingAllowance = 15000;
    const transportCharges = 5000;
    const leaveEncashment = basicPay * 2.5;
    const mileage = 3000;

    const grossBenefit = gratuity + transferGrant + travellingAllowance + transportCharges + leaveEncashment + mileage;
    const taxesDeductions = Math.round(grossBenefit * 0.08);
    const netBenefit = grossBenefit - taxesDeductions;

    const nominees: Nominee[] = [
      {
        id: `NOM-${emp.masterEmpId}-1`,
        name: `${emp.firstName} Jr.`,
        relationship: 'Son',
        bankAccount: `9876${String(index).padStart(9, '0')}`,
        bankName: 'Bank of Bhutan',
        bankBranch: 'Thimphu Main',
        amount: netBenefit * 0.6,
      },
      {
        id: `NOM-${emp.masterEmpId}-2`,
        name: `${emp.lastName} Spouse`,
        relationship: 'Spouse',
        bankAccount: `9877${String(index).padStart(9, '0')}`,
        bankName: 'Bhutan National Bank',
        bankBranch: 'Paro Branch',
        amount: netBenefit * 0.4,
      },
    ];

    const caseData: RetirementBenefitCase = {
      id: `RET-${emp.masterEmpId}`,
      employeeId: emp.masterEmpId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      cid: emp.cid,
      eid: emp.eid,
      workPermit: emp.workPermit || 'N/A',
      tpn: emp.tpn,
      lastWorkingAgency: emp.workingAgency,
      payrollDepartment: emp.organizationSegment,
      retirementType: retirementTypes[index % retirementTypes.length],
      yearsOfService,
      gratuity,
      transferGrant,
      travellingAllowance,
      transportCharges,
      leaveEncashment,
      mileage,
      grossBenefit,
      taxesDeductions,
      netBenefit,
      nominees,
      agencyCode: emp.workingAgency,
      agencyName: `Agency ${emp.workingAgency}`,
      budgetCode: `BC-${emp.workingAgency}-001`,
      paymentAgencyCode: `PA-${emp.workingAgency}`,
      paymentBudgetCode: `PB-${emp.workingAgency}-RB`,
      commitmentCheckPassed: index !== 2,
      commitmentCheckStatus: index === 0 ? 'passed' : index === 1 ? 'pending' : 'failed',
      fundBalanceCheckPassed: true,
      mcpCheckStatus: index === 0 ? 'posted' : 'pending',
      paymentOrderId: `PO-${emp.masterEmpId}-2026`,
      createdDate: new Date(2026, 0, 15 + index).toISOString().split('T')[0],
      status: index === 0 ? 'paid' : index === 1 ? 'approved' : 'submitted',
    };

    cases.push(caseData);
  });

  return cases;
}

function getRetirementTypeLabel(type: RetirementType): string {
  return RETIREMENT_TYPES.find((rt) => rt.value === type)?.label || type;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-cyan-100 text-cyan-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-slate-100 text-slate-700';
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function OpsRetirementBenefitsPage() {
  const auth = useAuth();
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */

  const [activeTab, setActiveTab] = useState<'cases' | 'new-case'>('cases');
  const [retirementCases, setRetirementCases] = useState<RetirementBenefitCase[]>(generateSampleRetirementCases());
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  // New Retirement Case Form State
  const [currentStep, setCurrentStep] = useState<NewRetirementStep>('select-employee');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedRetirementType, setSelectedRetirementType] = useState<RetirementType | null>(null);
  const [yearsOfService, setYearsOfService] = useState<number>(25);
  const [benefitAmounts, setBenefitAmounts] = useState({
    gratuity: 0,
    transferGrant: 25000,
    travellingAllowance: 15000,
    transportCharges: 5000,
    leaveEncashment: 0,
    mileage: 3000,
  });
  const [caseNominees, setCaseNominees] = useState<Nominee[]>([
    {
      id: 'new-nom-1',
      name: '',
      relationship: 'Son',
      bankAccount: '',
      bankName: 'Bank of Bhutan',
      bankBranch: 'Thimphu Main',
      amount: 0,
    },
  ]);
  const [agencyCode, setAgencyCode] = useState<string>('01');
  const [budgetCode, setBudgetCode] = useState<string>('');
  const [commitmentCheckPassed, setCommitmentCheckPassed] = useState<boolean | null>(null);
  const [fundBalanceCheckPassed, setFundBalanceCheckPassed] = useState<boolean | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRetirementType, setFilterRetirementType] = useState<RetirementType | null>(null);
  const [filterAgency, setFilterAgency] = useState<string | null>(null);

  const allEmployees = useMemo(() => getOpsEmployees(), []);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Statistics                                                  */
  /* ───────────────────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const totalGrossBenefits = retirementCases.reduce((sum, c) => sum + c.grossBenefit, 0);
    const totalNetBenefits = retirementCases.reduce((sum, c) => sum + c.netBenefit, 0);
    const paidCases = retirementCases.filter((c) => c.status === 'paid').length;
    const pendingApproval = retirementCases.filter((c) => c.status === 'submitted').length;

    return {
      totalGrossBenefits,
      totalNetBenefits,
      paidCases,
      pendingApproval,
      totalCases: retirementCases.length,
    };
  }, [retirementCases]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filtered Cases                                              */
  /* ───────────────────────────────────────────────────────────────────── */

  const filteredCases = useMemo(() => {
    let cases = retirementCases;

    if (filterRetirementType) {
      cases = cases.filter((c) => c.retirementType === filterRetirementType);
    }

    if (filterAgency) {
      cases = cases.filter((c) => c.agencyCode === filterAgency);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.employeeName.toLowerCase().includes(q) ||
          c.cid.includes(q) ||
          c.eid.includes(q) ||
          c.id.includes(q)
      );
    }

    return cases;
  }, [retirementCases, filterRetirementType, filterAgency, searchQuery]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Selected Employee Details                                   */
  /* ───────────────────────────────────────────────────────────────────── */

  const currentEmployee = useMemo(
    () => allEmployees.find((e) => e.masterEmpId === selectedEmployee),
    [selectedEmployee, allEmployees]
  );

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Benefit Calculations                                        */
  /* ───────────────────────────────────────────────────────────────────── */

  const computedBenefits = useMemo(() => {
    if (!currentEmployee) return null;

    const basicPay = currentEmployee.monthlyBasicPay || 15000;
    const gratuity = Math.round(basicPay * (yearsOfService / 12) * 1.5);
    const leaveEncashment = basicPay * 2.5;

    const amounts = {
      gratuity,
      transferGrant: benefitAmounts.transferGrant,
      travellingAllowance: benefitAmounts.travellingAllowance,
      transportCharges: benefitAmounts.transportCharges,
      leaveEncashment,
      mileage: benefitAmounts.mileage,
    };

    const grossBenefit = Object.values(amounts).reduce((sum, v) => sum + v, 0);
    const taxesDeductions = Math.round(grossBenefit * 0.08);
    const netBenefit = grossBenefit - taxesDeductions;

    return { ...amounts, grossBenefit, taxesDeductions, netBenefit };
  }, [currentEmployee, yearsOfService, benefitAmounts]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handlers: Form Navigation                                             */
  /* ───────────────────────────────────────────────────────────────────── */

  const goToNextStep = useCallback(() => {
    const steps: NewRetirementStep[] = ['select-employee', 'compute-benefits', 'nominees', 'budget-validation', 'confirm'];
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1]);
    }
  }, [currentStep]);

  const goToPrevStep = useCallback(() => {
    const steps: NewRetirementStep[] = ['select-employee', 'compute-benefits', 'nominees', 'budget-validation', 'confirm'];
    const idx = steps.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(steps[idx - 1]);
    }
  }, [currentStep]);

  const resetForm = useCallback(() => {
    setSelectedEmployee(null);
    setSelectedRetirementType(null);
    setYearsOfService(25);
    setBenefitAmounts({
      gratuity: 0,
      transferGrant: 25000,
      travellingAllowance: 15000,
      transportCharges: 5000,
      leaveEncashment: 0,
      mileage: 3000,
    });
    setCaseNominees([
      {
        id: 'new-nom-1',
        name: '',
        relationship: 'Son',
        bankAccount: '',
        bankName: 'Bank of Bhutan',
        bankBranch: 'Thimphu Main',
        amount: 0,
      },
    ]);
    setAgencyCode('01');
    setBudgetCode('');
    setCommitmentCheckPassed(null);
    setFundBalanceCheckPassed(null);
    setCurrentStep('select-employee');
  }, []);

  const submitRetirementCase = useCallback(() => {
    if (!currentEmployee || !selectedRetirementType || !computedBenefits) return;

    const newCase: RetirementBenefitCase = {
      id: `RET-${currentEmployee.masterEmpId}-${Date.now()}`,
      employeeId: currentEmployee.masterEmpId,
      employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
      cid: currentEmployee.cid,
      eid: currentEmployee.eid,
      workPermit: currentEmployee.workPermit || 'N/A',
      tpn: currentEmployee.tpn,
      lastWorkingAgency: currentEmployee.workingAgency,
      payrollDepartment: currentEmployee.organizationSegment,
      retirementType: selectedRetirementType,
      yearsOfService,
      gratuity: computedBenefits.gratuity,
      transferGrant: computedBenefits.transferGrant,
      travellingAllowance: computedBenefits.travellingAllowance,
      transportCharges: computedBenefits.transportCharges,
      leaveEncashment: computedBenefits.leaveEncashment,
      mileage: computedBenefits.mileage,
      grossBenefit: computedBenefits.grossBenefit,
      taxesDeductions: computedBenefits.taxesDeductions,
      netBenefit: computedBenefits.netBenefit,
      nominees: caseNominees,
      agencyCode,
      agencyName: `Agency ${agencyCode}`,
      budgetCode,
      paymentAgencyCode: `PA-${agencyCode}`,
      paymentBudgetCode: `PB-${agencyCode}-RB`,
      commitmentCheckPassed: commitmentCheckPassed !== null ? commitmentCheckPassed : true,
      commitmentCheckStatus: commitmentCheckPassed === true ? 'passed' : commitmentCheckPassed === false ? 'failed' : 'pending',
      fundBalanceCheckPassed: fundBalanceCheckPassed !== null ? fundBalanceCheckPassed : true,
      mcpCheckStatus: 'pending',
      paymentOrderId: `PO-${currentEmployee.masterEmpId}-2026`,
      createdDate: new Date().toISOString().split('T')[0],
      status: 'draft',
    };

    setRetirementCases((prev) => [newCase, ...prev]);
    setActiveTab('cases');
    resetForm();
  }, [currentEmployee, selectedRetirementType, computedBenefits, yearsOfService, caseNominees, agencyCode, budgetCode, commitmentCheckPassed, fundBalanceCheckPassed, resetForm]);

  const handleAddNominee = useCallback(() => {
    setCaseNominees((prev) => [
      ...prev,
      {
        id: `new-nom-${Date.now()}`,
        name: '',
        relationship: 'Dependent',
        bankAccount: '',
        bankName: 'Bank of Bhutan',
        bankBranch: 'Thimphu Main',
        amount: 0,
      },
    ]);
  }, []);

  const handleRemoveNominee = useCallback((nomId: string) => {
    setCaseNominees((prev) => prev.filter((nom) => nom.id !== nomId));
  }, []);

  const handleUpdateNominee = useCallback(
    (nomId: string, field: keyof Nominee, value: any) => {
      setCaseNominees((prev) =>
        prev.map((nom) => (nom.id === nomId ? { ...nom, [field]: value } : nom))
      );
    },
    []
  );

  /* ═══════════════════════════════════════════════════════════════════════════
     Render: Page Header
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Retirement Benefits Processing</h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-violet-100 text-violet-700">
            Payroll • OPS • Retirement Benefits • DDi 35.0
          </span>
        </div>
        <p className="text-sm text-slate-600">Manage retirement benefit cases for OPS employees (superannuation, termination, early retirement, etc.)</p>
      </div>

      {/* Role Context Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">{caps.isReadOnly ? 'Read-Only User' : 'Retirement Benefits Officer'}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Retirement Benefits Processing & Payment Authorization</p>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Cases</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalCases}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Paid Cases</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.paidCases}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase">Pending Approval</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{stats.pendingApproval}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold text-sky-600 uppercase">Total Net Benefits</p>
          <p className="mt-2 text-xl font-bold text-sky-900">Nu.{Math.round(stats.totalNetBenefits).toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'cases' ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Retirement Cases
        </button>
        <button
          onClick={() => {
            setActiveTab('new-case');
            resetForm();
          }}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'new-case' ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          New Retirement Case
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* Tab 1: Retirement Cases                                               */}
      {/* ═════════════════════════════════════════════════════════════════════ */}

      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-64">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Search by Name, CID, EID</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Retirement Type</label>
              <select
                value={filterRetirementType || ''}
                onChange={(e) => setFilterRetirementType((e.target.value as RetirementType) || null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">All Types</option>
                {RETIREMENT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Agency</label>
              <select
                value={filterAgency || ''}
                onChange={(e) => setFilterAgency(e.target.value || null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">All Agencies</option>
                {['01', '02', '03', '04', '05', '06'].map((agency) => (
                  <option key={agency} value={agency}>
                    Agency {agency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cases Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">YOS</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Net Benefit</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No retirement cases found
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((caseData) => (
                    <React.Fragment key={caseData.id}>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{caseData.employeeName}</p>
                            <p className="text-xs text-slate-500">CID: {caseData.cid} | EID: {caseData.eid}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-700">{caseData.retirementType.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{caseData.yearsOfService}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">Nu.{Math.round(caseData.netBenefit).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(caseData.status)}`}>
                            {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedCaseId(expandedCaseId === caseData.id ? null : caseData.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition"
                          >
                            <svg className={`w-4 h-4 transition ${expandedCaseId === caseData.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row: Benefit Details */}
                      {expandedCaseId === caseData.id && (
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-6">
                              {/* Benefit Components */}
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-3">Benefit Components (DDi 35.17-35.22)</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Gratuity (35.17)</p>
                                    <p className="text-lg font-bold text-slate-900">Nu.{Math.round(caseData.gratuity).toLocaleString()}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Transfer Grant (35.18)</p>
                                    <p className="text-lg font-bold text-slate-900">Nu.{Math.round(caseData.transferGrant).toLocaleString()}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Travelling Allow. (35.19)</p>
                                    <p className="text-lg font-bold text-slate-900">Nu.{Math.round(caseData.travellingAllowance).toLocaleString()}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Transport Charges (35.20)</p>
                                    <p className="text-lg font-bold text-slate-900">Nu.{Math.round(caseData.transportCharges).toLocaleString()}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Leave Encashment (35.21)</p>
                                    <p className="text-lg font-bold text-slate-900">Nu.{Math.round(caseData.leaveEncashment).toLocaleString()}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Mileage (35.22)</p>
                                    <p className="text-lg font-bold text-slate-900">Nu.{Math.round(caseData.mileage).toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Benefit Summary */}
                              <div className="rounded-lg bg-white border border-slate-200 p-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-700">Gross Benefit (35.23):</span>
                                    <span className="font-semibold text-slate-900">Nu.{Math.round(caseData.grossBenefit).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                                    <span className="text-slate-700">Taxes/Deductions (35.24):</span>
                                    <span className="font-semibold text-red-600">-Nu.{Math.round(caseData.taxesDeductions).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                                    <span className="font-semibold text-slate-900">Net Benefit (35.25):</span>
                                    <span className="text-lg font-bold text-emerald-700">Nu.{Math.round(caseData.netBenefit).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Nominees */}
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-3">Nominees (DDi 35.26-35.30)</h4>
                                <div className="space-y-2">
                                  {caseData.nominees.map((nom) => (
                                    <div key={nom.id} className="rounded-lg bg-white border border-slate-200 p-3 text-sm">
                                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                        <div>
                                          <p className="text-slate-500">Name (35.26)</p>
                                          <p className="font-medium text-slate-900">{nom.name}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500">Relationship (35.27)</p>
                                          <p className="font-medium text-slate-900">{nom.relationship}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500">Bank (35.28)</p>
                                          <p className="font-medium text-slate-900">{nom.bankName}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500">Branch (35.30)</p>
                                          <p className="font-medium text-slate-900">{nom.bankBranch}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500">Amount (35.29)</p>
                                          <p className="font-bold text-emerald-700">Nu.{Math.round(nom.amount).toLocaleString()}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Payment Details */}
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-3">Payment & Budget Details (DDi 35.7, 35.31-35.34)</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Agency Code (35.7)</p>
                                    <p className="font-semibold text-slate-900">{caseData.agencyCode}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Agency Name (35.7)</p>
                                    <p className="font-semibold text-slate-900">{caseData.agencyName || 'N/A'}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Budget Code (35.32)</p>
                                    <p className="font-semibold text-slate-900">{caseData.budgetCode}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Payment Agency (35.31)</p>
                                    <p className="font-semibold text-slate-900">{caseData.paymentAgencyCode || 'N/A'}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Payment Budget (35.32)</p>
                                    <p className="font-semibold text-slate-900">{caseData.paymentBudgetCode || 'N/A'}</p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">Commitment Check (35.33)</p>
                                    <p className={`font-semibold ${caseData.commitmentCheckStatus === 'passed' ? 'text-emerald-700' : caseData.commitmentCheckStatus === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>
                                      {(caseData.commitmentCheckStatus || (caseData.commitmentCheckPassed ? 'passed' : 'failed')).toUpperCase()}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                                    <p className="text-xs text-slate-500 mb-1">MCP Check (35.34)</p>
                                    <p className={`font-semibold ${caseData.mcpCheckStatus === 'posted' ? 'text-emerald-700' : caseData.mcpCheckStatus === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                                      {(caseData.mcpCheckStatus || 'pending').toUpperCase()}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-white border border-slate-200 p-3 col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Payment Order (35.35)</p>
                                    <p className="font-semibold text-slate-900">{caseData.paymentOrderId}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* Tab 2: New Retirement Case — Multi-Step Form                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}

      {activeTab === 'new-case' && (
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {(['select-employee', 'compute-benefits', 'nominees', 'budget-validation', 'confirm'] as const).map((step, idx, steps) => (
              <React.Fragment key={step}>
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition ${
                    step === currentStep
                      ? 'bg-violet-500 text-white'
                      : steps.indexOf(currentStep) > idx
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {steps.indexOf(currentStep) > idx ? '✓' : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 rounded-full mx-2 ${steps.indexOf(currentStep) > idx ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Select Employee & Retirement Type */}
          {currentStep === 'select-employee' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900">Step 1: Select Employee & Retirement Type</h3>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employee (Search)</label>
                <input
                  type="text"
                  placeholder="Search employee by name, CID, or EID..."
                  list="employee-list"
                  value={
                    selectedEmployee
                      ? allEmployees.find((e) => e.masterEmpId === selectedEmployee)
                        ? `${allEmployees.find((e) => e.masterEmpId === selectedEmployee)?.firstName} ${allEmployees.find((e) => e.masterEmpId === selectedEmployee)?.lastName}`
                        : ''
                      : ''
                  }
                  onChange={(e) => {
                    const emp = allEmployees.find(
                      (ae) =>
                        `${ae.firstName} ${ae.lastName}`.toLowerCase().includes(e.target.value.toLowerCase()) ||
                        ae.cid.includes(e.target.value) ||
                        ae.eid.includes(e.target.value)
                    );
                    if (emp) setSelectedEmployee(emp.masterEmpId);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <datalist id="employee-list">
                  {allEmployees.map((emp) => (
                    <option key={emp.masterEmpId} value={`${emp.firstName} ${emp.lastName} (${emp.eid})`} />
                  ))}
                </datalist>
              </div>

              {currentEmployee && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Name:</span>
                    <span className="font-semibold text-slate-900">{currentEmployee.firstName} {currentEmployee.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">CID (DDi 35.10):</span>
                    <span className="font-semibold text-slate-900">{currentEmployee.cid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">EID (DDi 35.11):</span>
                    <span className="font-semibold text-slate-900">{currentEmployee.eid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Work Permit (DDi 35.12):</span>
                    <span className="font-semibold text-slate-900">{currentEmployee.workPermit || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">TPN (DDi 35.13):</span>
                    <span className="font-semibold text-slate-900">{currentEmployee.tpn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Last Working Agency (35.14):</span>
                    <span className="font-semibold text-slate-900">{currentEmployee.workingAgency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payroll Dept (35.15):</span>
                    <span className="font-semibold text-slate-900">{currentEmployee.organizationSegment}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Retirement Type (DDi 35.1-35.6)</label>
                <select
                  value={selectedRetirementType || ''}
                  onChange={(e) => setSelectedRetirementType((e.target.value as RetirementType) || null)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="">Select a retirement type...</option>
                  {RETIREMENT_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setActiveTab('cases')} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button
                  onClick={goToNextStep}
                  disabled={!selectedEmployee || !selectedRetirementType}
                  className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Compute Benefits */}
          {currentStep === 'compute-benefits' && computedBenefits && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900">Step 2: Compute Benefits (DDi 35.16-35.25)</h3>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Years of Service (DDi 35.16)</label>
                <input
                  type="number"
                  value={yearsOfService}
                  onChange={(e) => setYearsOfService(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 text-sm">Benefit Components</h4>
                {[
                  { key: 'gratuity', label: 'Gratuity (35.17)', value: computedBenefits.gratuity, editable: false },
                  { key: 'transferGrant', label: 'Transfer Grant (35.18)', value: computedBenefits.transferGrant, editable: true },
                  { key: 'travellingAllowance', label: 'Travelling Allowance (35.19)', value: computedBenefits.travellingAllowance, editable: true },
                  { key: 'transportCharges', label: 'Transport Charges (35.20)', value: computedBenefits.transportCharges, editable: true },
                  { key: 'leaveEncashment', label: 'Leave Balance Encashment (35.21)', value: computedBenefits.leaveEncashment, editable: false },
                  { key: 'mileage', label: 'Mileage (35.22)', value: computedBenefits.mileage, editable: true },
                ].map(({ key, label, value, editable }) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <label className="text-sm font-medium text-slate-700">{label}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Nu.</span>
                      {editable ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) =>
                            setBenefitAmounts((prev) => ({
                              ...prev,
                              [key]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      ) : (
                        <span className="w-32 text-right font-semibold text-slate-900">{Math.round(value).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-700">Gross Benefit (35.23):</span>
                  <span className="font-bold text-slate-900">Nu.{Math.round(computedBenefits.grossBenefit).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Taxes/Deductions (35.24):</span>
                  <span className="font-bold text-red-600">-Nu.{Math.round(computedBenefits.taxesDeductions).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-violet-200 pt-2">
                  <span className="font-bold text-slate-900">Net Benefit (35.25):</span>
                  <span className="text-lg font-bold text-emerald-700">Nu.{Math.round(computedBenefits.netBenefit).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={goToPrevStep} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">
                  Back
                </button>
                <button onClick={goToNextStep} className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-600 transition">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Nominees/Dependents */}
          {currentStep === 'nominees' && computedBenefits && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900">Step 3: Nominees/Dependents (DDi 35.26-35.31)</h3>

              <div className="space-y-4">
                {caseNominees.map((nom, idx) => (
                  <div key={nom.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-slate-900">Nominee {idx + 1}</h4>
                      {caseNominees.length > 1 && (
                        <button
                          onClick={() => handleRemoveNominee(nom.id)}
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nominee Name (35.26)"
                        value={nom.name}
                        onChange={(e) => handleUpdateNominee(nom.id, 'name', e.target.value)}
                        className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <select
                        value={nom.relationship}
                        onChange={(e) => handleUpdateNominee(nom.id, 'relationship', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Dependent">Dependent</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Bank Account No (35.27)"
                        value={nom.bankAccount}
                        onChange={(e) => handleUpdateNominee(nom.id, 'bankAccount', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <select
                        value={nom.bankName}
                        onChange={(e) => handleUpdateNominee(nom.id, 'bankName', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="Bank of Bhutan">Bank of Bhutan</option>
                        <option value="Bhutan National Bank">Bhutan National Bank</option>
                        <option value="Druk PNB Bank">Druk PNB Bank</option>
                      </select>
                      <select
                        value={nom.bankBranch}
                        onChange={(e) => handleUpdateNominee(nom.id, 'bankBranch', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="Thimphu Main">Thimphu Main</option>
                        <option value="Paro Branch">Paro Branch</option>
                        <option value="Punakha Branch">Punakha Branch</option>
                        <option value="Wangdue Branch">Wangdue Branch</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Amount (35.31)"
                        value={nom.amount}
                        onChange={(e) => handleUpdateNominee(nom.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddNominee}
                className="w-full py-2 rounded-lg border border-violet-300 text-violet-600 font-medium hover:bg-violet-50 transition"
              >
                + Add Another Nominee
              </button>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={goToPrevStep} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">
                  Back
                </button>
                <button onClick={goToNextStep} className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-600 transition">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Budget Validation & Payment */}
          {currentStep === 'budget-validation' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900">Step 4: Budget Validation & Payment (DDi 35.7, 35.31-35.34)</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Agency Code (DDi 35.7)</label>
                    <input
                      type="text"
                      value={agencyCode}
                      onChange={(e) => setAgencyCode(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Agency Name (DDi 35.7) — Optional</label>
                    <input
                      type="text"
                      placeholder="Agency name"
                      defaultValue={`Agency ${agencyCode}`}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Budget Code (DDi 35.32)</label>
                    <input
                      type="text"
                      value={budgetCode}
                      onChange={(e) => setBudgetCode(e.target.value)}
                      placeholder="BC-XX-XXX"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Budget Code (DDi 35.32) — Optional</label>
                    <input
                      type="text"
                      placeholder="PB-XX-RB"
                      defaultValue={`PB-${agencyCode}-RB`}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 text-sm">Validation Checks</h4>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-900">Commitment Check (DDi 35.33)</label>
                      <select
                        value={commitmentCheckPassed === true ? 'passed' : commitmentCheckPassed === false ? 'failed' : 'pending'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCommitmentCheckPassed(val === 'passed' ? true : val === 'failed' ? false : null);
                        }}
                        className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="pending">Pending</option>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-900">MCP Check Status (DDi 35.34)</label>
                      <select
                        defaultValue="pending"
                        className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="pending">Pending</option>
                        <option value="posted">Posted</option>
                        <option value="error">Error</option>
                        <option value="not-applicable">Not Applicable</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
                  <p className="text-slate-600 mb-1">Payment Order (DDi 35.35)</p>
                  <p className="font-semibold text-slate-900">Auto-generated on submission: PO-{currentEmployee?.masterEmpId}-2026</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={goToPrevStep} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">
                  Back
                </button>
                <button onClick={goToNextStep} className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-600 transition">
                  Review & Confirm
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Confirm & Submit */}
          {currentStep === 'confirm' && computedBenefits && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900">Step 5: Review & Submit</h3>

              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Case Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Employee:</span>
                      <span className="font-semibold text-slate-900">
                        {currentEmployee?.firstName} {currentEmployee?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Retirement Type:</span>
                      <span className="font-semibold text-slate-900">{getRetirementTypeLabel(selectedRetirementType!)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Years of Service:</span>
                      <span className="font-semibold text-slate-900">{yearsOfService}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="text-slate-600">Gross Benefit:</span>
                      <span className="font-bold text-slate-900">Nu.{Math.round(computedBenefits.grossBenefit).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Deductions:</span>
                      <span className="font-bold text-red-600">-Nu.{Math.round(computedBenefits.taxesDeductions).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="font-bold text-slate-900">Net Benefit:</span>
                      <span className="text-lg font-bold text-emerald-700">Nu.{Math.round(computedBenefits.netBenefit).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
                  <p className="text-emerald-900 font-semibold">✓ All validations completed. Ready to submit.</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={goToPrevStep} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">
                  Back
                </button>
                <button onClick={submitRetirementCase} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition">
                  Submit Case
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from 'react';
