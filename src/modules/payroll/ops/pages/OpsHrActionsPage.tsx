'use client';

import { useState, useMemo, useCallback } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";
import { getRoleTheme } from "../../../../shared/roleTheme";
import { RoleContextBanner } from "../../../../shared/components/RoleContextBanner";
import { useOpsRoleCapabilities } from "../state/useOpsRoleCapabilities";
import { getOpsEmployees } from "../data/opsEmployeeSeed";

/**
 * OpsHrActionsPage — HR Actions & Pay Updates
 * Implements DDi 2.0 (Employee Pay Update / HR Actions) for OPS employees
 *
 * Features:
 * - Summary cards for actions, approvals, increments, promotions, transfers
 * - Tab 1: HR Actions Queue — searchable/filterable table with expandable rows
 * - Tab 2: New HR Action — multi-step form for creating HR actions
 * - Tab 3: Arrears & Pay Fixation — combined panel for DDi 23.0-25.0
 * - Tab 4: Floating Deductions — DDi 27.0 management
 * - Role-aware: read-only for auditor roles
 */

/* ─────────────────────────────────────────────────────────────────────────
   Types & Constants
   ───────────────────────────────────────────────────────────────────────── */

type HrActionStatus = "draft" | "submitted" | "approved" | "rejected" | "processed";
type HrActionCategory = "pay-adjustment" | "movement" | "leave" | "legal" | "audit";
type HrActionType =
  | "salary-increment"
  | "promotion"
  | "transfer"
  | "contract-extension"
  | "secondment"
  | "ltt"
  | "stt"
  | "leave"
  | "hr-audit"
  | "legal-action"
  | "separation";

type LeaveType = "annual" | "sick" | "maternity" | "study" | "other";
type SeparationType = "voluntary" | "involuntary" | "retirement" | "medical";
type AuditType = "compliance" | "payroll" | "deduction" | "allowance";
type LegalActionType = "suspension" | "termination" | "inquiry" | "disciplinary";

interface HrAction {
  id: string;
  actionDate: string;
  employeeId: string;
  employeeName: string;
  eid: string;
  cid: string;
  category: HrActionCategory;
  actionType: HrActionType;
  oldPay: number;
  newPay: number;
  status: HrActionStatus;
  createdBy: string;
  createdAt: string;
  details?: Record<string, any>;
}

interface HrActionDetail {
  salaryIncrement?: number;
  effectiveDate?: string;
  promationType?: string;
  promotionNewTitle?: string;
  promotionNewScale?: string;
  promotionNewAgency?: string;
  promotionNewIncrementDate?: string;
  transferType?: string;
  transferJoinDate?: string;
  newWorkingAgency?: string;
  contractExtendedDate?: string;
  contractNewTitle?: string;
  secondmentFromDate?: string;
  secondmentUntilDate?: string;
  lttFromDate?: string;
  lttUntilDate?: string;
  lttCountry?: string;
  lttPlace?: string;
  sttFromDate?: string;
  sttUntilDate?: string;
  sttCountry?: string;
  sttPlace?: string;
  leaveType?: LeaveType;
  leaveTillDate?: string;
  auditType?: AuditType;
  legalActionType?: LegalActionType;
  separationType?: SeparationType;
  separationDate?: string;
}

interface FloatingDeduction {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  cid: string;
  basicPay: number;
  grossPay: number;
  deductionName: string;
  deductionMethod: string;
  amount?: number;
  percentage?: number;
  applicableFromDate?: string;
  applicableUntilDate?: string;
  reason?: string;
  status?: "active" | "inactive" | "pending";
}

const HR_ACTION_TYPES: { id: HrActionType; label: string; category: HrActionCategory }[] = [
  { id: "salary-increment", label: "Salary Increment", category: "pay-adjustment" },
  { id: "promotion", label: "Promotion", category: "movement" },
  { id: "transfer", label: "Transfer", category: "movement" },
  { id: "contract-extension", label: "Contract Extension", category: "movement" },
  { id: "secondment", label: "Secondment", category: "movement" },
  { id: "ltt", label: "Long Term Training (LTT)", category: "leave" },
  { id: "stt", label: "Short Term Training (STT)", category: "leave" },
  { id: "leave", label: "Leave", category: "leave" },
  { id: "hr-audit", label: "HR Audit", category: "audit" },
  { id: "legal-action", label: "Legal Action", category: "legal" },
  { id: "separation", label: "Separation", category: "legal" },
];

const LEAVE_TYPES: { id: LeaveType; label: string }[] = [
  { id: "annual", label: "Annual Leave" },
  { id: "sick", label: "Sick Leave" },
  { id: "maternity", label: "Maternity Leave" },
  { id: "study", label: "Study Leave" },
  { id: "other", label: "Other" },
];

const SEPARATION_TYPES: { id: SeparationType; label: string }[] = [
  { id: "voluntary", label: "Voluntary Resignation" },
  { id: "involuntary", label: "Involuntary Termination" },
  { id: "retirement", label: "Retirement" },
  { id: "medical", label: "Medical Termination" },
];

const AUDIT_TYPES: { id: AuditType; label: string }[] = [
  { id: "compliance", label: "Compliance Audit" },
  { id: "payroll", label: "Payroll Audit" },
  { id: "deduction", label: "Deduction Audit" },
  { id: "allowance", label: "Allowance Audit" },
];

const LEGAL_ACTION_TYPES: { id: LegalActionType; label: string }[] = [
  { id: "suspension", label: "Suspension" },
  { id: "termination", label: "Termination" },
  { id: "inquiry", label: "Inquiry" },
  { id: "disciplinary", label: "Disciplinary" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Seed Data Generator
   ───────────────────────────────────────────────────────────────────────── */

function generateSampleHrActions(): HrAction[] {
  const employees = getOpsEmployees().slice(0, 8);
  const today = new Date();

  return [
    {
      id: "HR-001",
      actionDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[0].masterEmpId,
      employeeName: `${employees[0].firstName} ${employees[0].lastName}`,
      eid: employees[0].eid,
      cid: employees[0].cid || "110001",
      category: "pay-adjustment",
      actionType: "salary-increment",
      oldPay: 45000,
      newPay: 48500,
      status: "approved",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        salaryIncrement: 3500,
        effectiveDate: "2026-04-01"
      }
    },
    {
      id: "HR-002",
      actionDate: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[1].masterEmpId,
      employeeName: `${employees[1].firstName} ${employees[1].lastName}`,
      eid: employees[1].eid,
      cid: employees[1].cid || "110002",
      category: "movement",
      actionType: "promotion",
      oldPay: 52000,
      newPay: 62000,
      status: "submitted",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        promationType: "regular",
        promotionNewTitle: "Senior Officer",
        promotionNewScale: "Scale-5",
        promotionNewAgency: "MOE",
        promotionNewIncrementDate: "2026-04-01"
      }
    },
    {
      id: "HR-003",
      actionDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[2].masterEmpId,
      employeeName: `${employees[2].firstName} ${employees[2].lastName}`,
      eid: employees[2].eid,
      cid: employees[2].cid || "110003",
      category: "movement",
      actionType: "transfer",
      oldPay: 48000,
      newPay: 48000,
      status: "draft",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        transferType: "inter-agency",
        transferJoinDate: "2026-05-15",
        newWorkingAgency: "Ministry of Labor"
      }
    },
    {
      id: "HR-004",
      actionDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[3].masterEmpId,
      employeeName: `${employees[3].firstName} ${employees[3].lastName}`,
      eid: employees[3].eid,
      cid: employees[3].cid || "110004",
      category: "leave",
      actionType: "ltt",
      oldPay: 55000,
      newPay: 55000,
      status: "approved",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        lttFromDate: "2026-06-01",
        lttUntilDate: "2026-12-31",
        lttCountry: "Australia",
        lttPlace: "Sydney University"
      }
    },
    {
      id: "HR-005",
      actionDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[4].masterEmpId,
      employeeName: `${employees[4].firstName} ${employees[4].lastName}`,
      eid: employees[4].eid,
      cid: employees[4].cid || "110005",
      category: "leave",
      actionType: "leave",
      oldPay: 43000,
      newPay: 43000,
      status: "submitted",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        leaveType: "annual",
        leaveTillDate: "2026-04-30"
      }
    },
    {
      id: "HR-006",
      actionDate: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[5].masterEmpId,
      employeeName: `${employees[5].firstName} ${employees[5].lastName}`,
      eid: employees[5].eid,
      cid: employees[5].cid || "110006",
      category: "movement",
      actionType: "contract-extension",
      oldPay: 50000,
      newPay: 50000,
      status: "processed",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 26 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        contractExtendedDate: "2027-12-31",
        contractNewTitle: "Contract Officer"
      }
    },
    {
      id: "HR-007",
      actionDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[6].masterEmpId,
      employeeName: `${employees[6].firstName} ${employees[6].lastName}`,
      eid: employees[6].eid,
      cid: employees[6].cid || "110007",
      category: "audit",
      actionType: "hr-audit",
      oldPay: 47000,
      newPay: 47000,
      status: "submitted",
      createdBy: "AUDITOR01",
      createdAt: new Date(today.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        auditType: "payroll"
      }
    },
    {
      id: "HR-008",
      actionDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[7].masterEmpId,
      employeeName: `${employees[7].firstName} ${employees[7].lastName}`,
      eid: employees[7].eid,
      cid: employees[7].cid || "110008",
      category: "legal",
      actionType: "separation",
      oldPay: 44000,
      newPay: 0,
      status: "processed",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        separationType: "retirement",
        separationDate: "2026-03-31"
      }
    },
    {
      id: "HR-009",
      actionDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[0].masterEmpId,
      employeeName: `${employees[0].firstName} ${employees[0].lastName}`,
      eid: employees[0].eid,
      cid: employees[0].cid || "110001",
      category: "movement",
      actionType: "secondment",
      oldPay: 45000,
      newPay: 45000,
      status: "approved",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        secondmentFromDate: "2026-05-01",
        secondmentUntilDate: "2026-11-30"
      }
    },
    {
      id: "HR-010",
      actionDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[1].masterEmpId,
      employeeName: `${employees[1].firstName} ${employees[1].lastName}`,
      eid: employees[1].eid,
      cid: employees[1].cid || "110002",
      category: "leave",
      actionType: "stt",
      oldPay: 52000,
      newPay: 52000,
      status: "submitted",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        sttFromDate: "2026-06-15",
        sttUntilDate: "2026-07-15",
        sttCountry: "Singapore",
        sttPlace: "NUS Business School"
      }
    },
    {
      id: "HR-011",
      actionDate: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      employeeId: employees[3].masterEmpId,
      employeeName: `${employees[3].firstName} ${employees[3].lastName}`,
      eid: employees[3].eid,
      cid: employees[3].cid || "110004",
      category: "legal",
      actionType: "legal-action",
      oldPay: 55000,
      newPay: 55000,
      status: "draft",
      createdBy: "HR001",
      createdAt: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        legalActionType: "disciplinary"
      }
    },
  ];
}

function generateSampleFloatingDeductions(): FloatingDeduction[] {
  const employees = getOpsEmployees().slice(0, 3);
  return [
    {
      id: "FD-001",
      employeeId: employees[0].masterEmpId,
      employeeName: `${employees[0].firstName} ${employees[0].lastName}`,
      position: employees[0].positionTitle,
      cid: employees[0].cid || "110001",
      basicPay: employees[0].monthlyBasicPay,
      grossPay: employees[0].monthlyBasicPay + 7500,
      deductionName: "Loan Repayment",
      deductionMethod: "fixed",
      amount: 2000,
      applicableFromDate: "2026-01-01",
      applicableUntilDate: "2026-12-31",
      reason: "Staff Loan",
      status: "active"
    },
    {
      id: "FD-002",
      employeeId: employees[1].masterEmpId,
      employeeName: `${employees[1].firstName} ${employees[1].lastName}`,
      position: employees[1].positionTitle,
      cid: employees[1].cid || "110002",
      basicPay: employees[1].monthlyBasicPay,
      grossPay: employees[1].monthlyBasicPay + 9000,
      deductionName: "Advance Adjustment",
      deductionMethod: "percentage",
      percentage: 5,
      applicableFromDate: "2026-02-01",
      applicableUntilDate: "2026-06-30",
      reason: "Salary Advance Settlement",
      status: "active"
    },
    {
      id: "FD-003",
      employeeId: employees[2].masterEmpId,
      employeeName: `${employees[2].firstName} ${employees[2].lastName}`,
      position: employees[2].positionTitle,
      cid: employees[2].cid || "110003",
      basicPay: employees[2].monthlyBasicPay,
      grossPay: employees[2].monthlyBasicPay + 8000,
      deductionName: "Utility Bill",
      deductionMethod: "fixed",
      amount: 500,
      applicableFromDate: "2026-03-01",
      applicableUntilDate: "2026-09-30",
      reason: "Housing Utility Reimbursement",
      status: "active"
    },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────────────────── */

export function OpsHrActionsPage() {
  const auth = useAuth();
  const caps = useOpsRoleCapabilities();
  const theme = getRoleTheme(auth.activeRoleId);

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'queue' | 'new' | 'arrears' | 'deductions'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterActionType, setFilterActionType] = useState<HrActionType | null>(null);
  const [filterStatus, setFilterStatus] = useState<HrActionStatus | null>(null);
  const [filterCategory, setFilterCategory] = useState<HrActionCategory | null>(null);

  // New HR Action form state
  const [newActionStep, setNewActionStep] = useState<1 | 2 | 3>(1);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<HrActionType | null>(null);
  const [actionDetails, setActionDetails] = useState<HrActionDetail>({});

  // Arrears & Pay Fixation state
  const [arrearsTab, setArrearsTab] = useState<'arrears' | 'pay-fixation' | 'rejoin'>('arrears');
  const [arrearsEmployee, setArrearsEmployee] = useState<string | null>(null);
  const [arrearsReason, setArrearsReason] = useState('');
  const [salaryArrears, setSalaryArrears] = useState(0);
  const [allowanceArrears, setAllowanceArrears] = useState(0);

  const hrActions = useMemo(() => generateSampleHrActions(), []);
  const floatingDeductions = useMemo(() => generateSampleFloatingDeductions(), []);
  const employees = useMemo(() => getOpsEmployees(), []);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Summary statistics                                          */
  /* ───────────────────────────────────────────────────────────────────── */
  const summary = useMemo(() => {
    const thisMonth = hrActions.filter(a => {
      const actionDate = new Date(a.actionDate);
      const now = new Date();
      return actionDate.getMonth() === now.getMonth() && actionDate.getFullYear() === now.getFullYear();
    });

    const pending = hrActions.filter(a => a.status === 'submitted').length;
    const increments = hrActions.filter(a => a.actionType === 'salary-increment').length;
    const promotions = hrActions.filter(a => a.actionType === 'promotion').length;
    const transfers = hrActions.filter(a => a.actionType === 'transfer').length;

    return { thisMonth: thisMonth.length, pending, increments, promotions, transfers };
  }, [hrActions]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filtered HR Actions                                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const filteredActions = useMemo(() => {
    let filtered = hrActions;

    if (filterActionType) {
      filtered = filtered.filter(a => a.actionType === filterActionType);
    }
    if (filterStatus) {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    if (filterCategory) {
      filtered = filtered.filter(a => a.category === filterCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.employeeName.toLowerCase().includes(q) ||
        a.eid.toLowerCase().includes(q) ||
        a.cid.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [hrActions, filterActionType, filterStatus, filterCategory, searchQuery]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handlers                                                              */
  /* ───────────────────────────────────────────────────────────────────── */
  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const getStatusColor = (status: HrActionStatus) => {
    const colors: Record<HrActionStatus, string> = {
      draft: "bg-slate-100 text-slate-700",
      submitted: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      processed: "bg-blue-100 text-blue-700",
    };
    return colors[status];
  };

  const getActionTypeLabel = (type: HrActionType) => {
    return HR_ACTION_TYPES.find(t => t.id === type)?.label || type;
  };

  const renderExpandedDetails = (action: HrAction) => {
    const details = action.details;
    if (!details) return null;

    return (
      <div className="space-y-4 mt-4">
        <div className="border-t pt-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Action Details (DDi 2.0)</h4>
          <div className="space-y-3">
            {action.actionType === 'salary-increment' && (
              <>
                <DetailRow label="Salary Increment (2.4)" value={details.salaryIncrement ? `Nu. ${details.salaryIncrement.toLocaleString()}` : '—'} />
                <DetailRow label="Effective Date (2.5)" value={details.effectiveDate} />
              </>
            )}
            {action.actionType === 'promotion' && (
              <>
                <DetailRow label="Promotion Type (2.5)" value={details.promationType} />
                <DetailRow label="New Position Title (2.6)" value={details.promotionNewTitle} />
                <DetailRow label="New Pay Scale (2.7)" value={details.promotionNewScale} />
                <DetailRow label="New Agency (2.8)" value={details.promotionNewAgency} />
                <DetailRow label="New Increment Date (2.9)" value={details.promotionNewIncrementDate} />
              </>
            )}
            {action.actionType === 'transfer' && (
              <>
                <DetailRow label="Transfer Type (2.10)" value={details.transferType} />
                <DetailRow label="Date of Joining (2.11)" value={details.transferJoinDate} />
                <DetailRow label="New Working Agency (2.12)" value={details.newWorkingAgency} />
              </>
            )}
            {action.actionType === 'contract-extension' && (
              <>
                <DetailRow label="Contract Extended Date (2.12)" value={details.contractExtendedDate} />
                <DetailRow label="New Position Title (2.13)" value={details.contractNewTitle} />
              </>
            )}
            {action.actionType === 'secondment' && (
              <>
                <DetailRow label="From Date (2.14)" value={details.secondmentFromDate} />
                <DetailRow label="Until Date (2.15)" value={details.secondmentUntilDate} />
              </>
            )}
            {action.actionType === 'ltt' && (
              <>
                <DetailRow label="From Date (2.16)" value={details.lttFromDate} />
                <DetailRow label="Until Date (2.17)" value={details.lttUntilDate} />
                <DetailRow label="Country (2.18)" value={details.lttCountry} />
                <DetailRow label="Place (2.19)" value={details.lttPlace} />
              </>
            )}
            {action.actionType === 'stt' && (
              <>
                <DetailRow label="From Date (2.20)" value={details.sttFromDate} />
                <DetailRow label="Until Date (2.21)" value={details.sttUntilDate} />
                <DetailRow label="Country (2.22)" value={details.sttCountry} />
                <DetailRow label="Place (2.23)" value={details.sttPlace} />
              </>
            )}
            {action.actionType === 'leave' && (
              <>
                <DetailRow label="Leave Type (2.24)" value={details.leaveType} />
                <DetailRow label="Leave Till Date (2.25)" value={details.leaveTillDate} />
              </>
            )}
            {action.actionType === 'hr-audit' && (
              <DetailRow label="Audit Type (2.28)" value={details.auditType} />
            )}
            {action.actionType === 'legal-action' && (
              <DetailRow label="Legal Action Type (2.29)" value={details.legalActionType} />
            )}
            {action.actionType === 'separation' && (
              <>
                <DetailRow label="Separation Type (2.26)" value={details.separationType} />
                <DetailRow label="Separation Date (2.27)" value={details.separationDate} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            HR Actions & Pay Updates
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide bg-violet-100 text-violet-700">
            Payroll • OPS • HR Actions • DDi 2.0
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Manage employee pay updates, HR actions, and personnel movements
        </p>
      </div>

      <RoleContextBanner
        capabilities={!caps.isReadOnly ? ["Initiate Actions", "Submit", "Review"] : undefined}
        blocked={caps.isReadOnly ? ["Edit", "Submit", "Approve"] : undefined}
      />

      {/* Summary Cards */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <SummaryCard label="Actions This Month" value={summary.thisMonth} color="blue" />
          <SummaryCard label="Pending Approvals" value={summary.pending} color="amber" />
          <SummaryCard label="Salary Increments" value={summary.increments} color="green" />
          <SummaryCard label="Promotions" value={summary.promotions} color="purple" />
          <SummaryCard label="Transfers" value={summary.transfers} color="sky" />
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm">
        <div className="flex border-b border-slate-200/80">
          {[
            { id: 'queue', label: 'HR Actions Queue' },
            { id: 'new', label: 'New HR Action' },
            { id: 'arrears', label: 'Arrears & Pay Fixation' },
            { id: 'deductions', label: 'Floating Deductions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: HR ACTIONS QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Search by name, EID, or CID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <select
                  value={filterActionType || ''}
                  onChange={(e) => setFilterActionType((e.target.value as HrActionType) || null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">All Action Types</option>
                  {HR_ACTION_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={filterStatus || ''}
                  onChange={(e) => setFilterStatus((e.target.value as HrActionStatus) || null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="processed">Processed</option>
                </select>
              </div>

              {/* HR Actions Table */}
              <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Action Date</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Employee Name</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">EID</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Category</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Action Type</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">Old Pay → New Pay</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {filteredActions.map((action) => (
                      <React.Fragment key={action.id}>
                        <tr
                          onClick={() => toggleRow(action.id)}
                          className="hover:bg-slate-50/50 cursor-pointer transition"
                        >
                          <td className="px-4 py-3 text-slate-600 text-sm">{action.actionDate}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{action.employeeName}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{action.eid}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700">
                              {action.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {getActionTypeLabel(action.actionType)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            Nu.{action.oldPay.toLocaleString()} → Nu.{action.newPay.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusColor(action.status)}`}>
                              {action.status.charAt(0).toUpperCase() + action.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {!caps.isReadOnly && (
                              <button className="text-violet-600 hover:text-violet-700 font-medium text-sm">
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {expandedRows.has(action.id) && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase">CID</p>
                                    <p className="text-slate-900 mt-1">{action.cid}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase">Created By</p>
                                    <p className="text-slate-900 mt-1">{action.createdBy}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase">Created At</p>
                                    <p className="text-slate-900 mt-1">{new Date(action.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                {renderExpandedDetails(action)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: NEW HR ACTION */}
          {activeTab === 'new' && (
            <div className="space-y-6">
              {caps.isReadOnly ? (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700 font-medium">You do not have permission to create HR actions. Contact your administrator.</p>
                </div>
              ) : (
                <>
                  {/* Step Indicator */}
                  <div className="flex justify-between items-center mb-6">
                    {[1, 2, 3].map(step => (
                      <div key={step} className="flex items-center">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                            step === newActionStep
                              ? 'bg-violet-600 text-white'
                              : step < newActionStep
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {step < newActionStep ? '✓' : step}
                        </div>
                        <span className={`ml-2 text-sm font-medium ${step <= newActionStep ? 'text-slate-900' : 'text-slate-500'}`}>
                          {step === 1 ? 'Select Employee' : step === 2 ? 'Select Action Type' : 'Review & Submit'}
                        </span>
                        {step < 3 && <div className="w-12 h-0.5 ml-4 bg-slate-200" />}
                      </div>
                    ))}
                  </div>

                  {/* Step 1: Select Employee */}
                  {newActionStep === 1 && (
                    <div className="space-y-4 p-4 rounded-lg border border-slate-200/50 bg-slate-50/30">
                      <div>
                        <label className="text-sm font-bold text-slate-900">Search Employee</label>
                        <select
                          value={selectedEmployee || ''}
                          onChange={(e) => setSelectedEmployee(e.target.value || null)}
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="">Select an employee...</option>
                          {employees.map(emp => (
                            <option key={emp.masterEmpId} value={emp.masterEmpId}>
                              {emp.firstName} {emp.lastName} (EID: {emp.eid})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedEmployee && (
                        <div className="space-y-3 mt-4 p-4 bg-white rounded-lg border border-slate-200">
                          {(() => {
                            const emp = employees.find(e => e.masterEmpId === selectedEmployee);
                            if (!emp) return null;
                            return (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <DetailRow label="Name" value={`${emp.firstName} ${emp.lastName}`} />
                                  <DetailRow label="EID" value={emp.eid} />
                                  <DetailRow label="CID" value={emp.cid || 'N/A'} />
                                  <DetailRow label="Position" value={emp.positionTitle || 'Officer'} />
                                  <DetailRow label="Current Basic Pay" value={`Nu. ${emp.monthlyBasicPay?.toLocaleString() || '0'}`} />
                                  <DetailRow label="Agency" value={emp.workingAgency || 'OPS'} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 mt-6">
                        <button
                          disabled={!selectedEmployee}
                          onClick={() => setNewActionStep(2)}
                          className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Select Action Type */}
                  {newActionStep === 2 && (
                    <div className="space-y-4 p-4 rounded-lg border border-slate-200/50 bg-slate-50/30">
                      <div>
                        <label className="text-sm font-bold text-slate-900">HR Action Type (DDi 2.1)</label>
                        <select
                          value={selectedActionType || ''}
                          onChange={(e) => {
                            setSelectedActionType((e.target.value as HrActionType) || null);
                            setActionDetails({});
                          }}
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="">Select an action type...</option>
                          {HR_ACTION_TYPES.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Action-specific fields */}
                      {selectedActionType === 'salary-increment' && (
                        <ActionTypeFields
                          type="salary-increment"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'promotion' && (
                        <ActionTypeFields
                          type="promotion"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'transfer' && (
                        <ActionTypeFields
                          type="transfer"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'contract-extension' && (
                        <ActionTypeFields
                          type="contract-extension"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'secondment' && (
                        <ActionTypeFields
                          type="secondment"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'ltt' && (
                        <ActionTypeFields
                          type="ltt"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'stt' && (
                        <ActionTypeFields
                          type="stt"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'leave' && (
                        <ActionTypeFields
                          type="leave"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'hr-audit' && (
                        <ActionTypeFields
                          type="hr-audit"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'legal-action' && (
                        <ActionTypeFields
                          type="legal-action"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}
                      {selectedActionType === 'separation' && (
                        <ActionTypeFields
                          type="separation"
                          details={actionDetails}
                          onChange={setActionDetails}
                          selectedEmployee={selectedEmployee}
                          employees={employees}
                        />
                      )}

                      <div className="flex justify-between gap-2 mt-6">
                        <button
                          onClick={() => setNewActionStep(1)}
                          className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition"
                        >
                          Back
                        </button>
                        <button
                          disabled={!selectedActionType}
                          onClick={() => setNewActionStep(3)}
                          className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review & Submit */}
                  {newActionStep === 3 && (
                    <div className="space-y-4 p-4 rounded-lg border border-slate-200/50 bg-slate-50/30">
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <p className="font-bold text-slate-900 mb-4">Review HR Action Details</p>
                        {selectedEmployee && (
                          (() => {
                            const emp = employees.find(e => e.masterEmpId === selectedEmployee);
                            return emp ? (
                              <div className="space-y-3 text-sm">
                                <DetailRow label="Employee" value={`${emp.firstName} ${emp.lastName}`} />
                                <DetailRow label="Action Type" value={getActionTypeLabel(selectedActionType!)} />
                                <DetailRow label="Category" value={HR_ACTION_TYPES.find(t => t.id === selectedActionType)?.category || ''} />
                              </div>
                            ) : null;
                          })()
                        )}
                      </div>

                      <div className="flex justify-between gap-2 mt-6">
                        <button
                          onClick={() => setNewActionStep(2)}
                          className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => {
                            alert('HR Action submitted successfully (Demo)');
                            setNewActionStep(1);
                            setSelectedEmployee(null);
                            setSelectedActionType(null);
                            setActionDetails({});
                          }}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: ARREARS & PAY FIXATION */}
          {activeTab === 'arrears' && (
            <div className="space-y-4">
              {/* Sub-tabs */}
              <div className="flex border-b border-slate-200/80 gap-6">
                {[
                  { id: 'arrears', label: 'Arrears (DDi 23.0)' },
                  { id: 'pay-fixation', label: 'Pay Fixation (DDi 24.0)' },
                  { id: 'rejoin', label: 'Re-joining (DDi 25.0)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setArrearsTab(tab.id as any)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition -mb-[2px] ${
                      arrearsTab === tab.id
                        ? 'border-violet-500 text-violet-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Arrears Sub-tab */}
              {arrearsTab === 'arrears' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-slate-200/50 bg-slate-50/30 space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900">Select Employee</label>
                      <select
                        value={arrearsEmployee || ''}
                        onChange={(e) => setArrearsEmployee(e.target.value || null)}
                        className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">Select an employee...</option>
                        {employees.map(emp => (
                          <option key={emp.masterEmpId} value={emp.masterEmpId}>{emp.firstName} {emp.lastName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-900">Arrears Reason (DDi 23.1)</label>
                        <select
                          value={arrearsReason}
                          onChange={(e) => setArrearsReason(e.target.value)}
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="">Select reason...</option>
                          <option value="late-joining">Late Joining</option>
                          <option value="suspension">Suspension Period</option>
                          <option value="leave-without-pay">Leave Without Pay</option>
                          <option value="back-pay">Back Pay</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900">Arrears Period From (DDi 23.2)</label>
                        <input
                          type="date"
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900">Arrears Period To (DDi 23.3)</label>
                        <input
                          type="date"
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900">Salary Arrears Amount (DDi 23.4)</label>
                        <input
                          type="number"
                          value={salaryArrears}
                          onChange={(e) => setSalaryArrears(Number(e.target.value))}
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900">Allowance Arrears (DDi 23.5)</label>
                        <input
                          type="number"
                          value={allowanceArrears}
                          onChange={(e) => setAllowanceArrears(Number(e.target.value))}
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900">Total Arrears Amount (DDi 23.6)</label>
                        <input
                          type="number"
                          disabled
                          value={salaryArrears + allowanceArrears}
                          className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-100"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => alert('Arrears submitted (Demo)')}
                      className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium text-sm hover:bg-violet-700 transition"
                    >
                      Submit Arrears
                    </button>
                  </div>
                </div>
              )}

              {/* Pay Fixation Sub-tab */}
              {arrearsTab === 'pay-fixation' && (
                <div className="p-4 rounded-lg border border-slate-200/50 bg-slate-50/30 space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-900">Select Employee</label>
                    <select className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                      <option value="">Select an employee...</option>
                      {employees.map(emp => (
                        <option key={emp.masterEmpId} value={emp.masterEmpId}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900">Pay Fixation Type (DDi 24.1)</label>
                      <select className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="">Select...</option>
                        <option value="initial">Initial Fixation</option>
                        <option value="revision">Revision</option>
                        <option value="correction">Correction</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">New Basic Pay (DDi 24.2)</label>
                      <input type="number" placeholder="0" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Effective From Date (DDi 24.3)</label>
                      <input type="date" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Pay Fixation Date (DDi 24.4)</label>
                      <input type="date" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-900">Allowances & Arrears (DDi 24.5)</label>
                    <input type="text" placeholder="Details..." className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <button className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium text-sm hover:bg-violet-700 transition">
                    Add Pay Fixation
                  </button>
                </div>
              )}

              {/* Re-joining Sub-tab */}
              {arrearsTab === 'rejoin' && (
                <div className="p-4 rounded-lg border border-slate-200/50 bg-slate-50/30 space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-900">Select Employee</label>
                    <select className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                      <option value="">Select an employee...</option>
                      {employees.map(emp => (
                        <option key={emp.masterEmpId} value={emp.masterEmpId}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900">Re-joining Date (DDi 25.1)</label>
                      <input type="date" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Previous Separation Date (DDi 25.2)</label>
                      <input type="date" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-900">Re-joining Reason (DDi 25.3)</label>
                    <select className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                      <option value="">Select reason...</option>
                      <option value="reinstatement">Reinstatement</option>
                      <option value="recall">Recall</option>
                      <option value="reemployment">Re-employment</option>
                      <option value="rehire">Re-hire</option>
                    </select>
                  </div>
                  <button className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium text-sm hover:bg-violet-700 transition">
                    Add Re-joining
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FLOATING DEDUCTIONS */}
          {activeTab === 'deductions' && (
            <div className="space-y-4">
              {/* Floating Deductions Table */}
              <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Employee Name</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Position</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">CID</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Deduction Name</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Method</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">From Date (27.7)</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Until Date (27.8)</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Reason (27.9)</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-900">Status (27.10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {floatingDeductions.map((ded) => (
                      <tr key={ded.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{ded.employeeName}</td>
                        <td className="px-4 py-3 text-slate-600">{ded.position}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{ded.cid}</td>
                        <td className="px-4 py-3 text-slate-900">{ded.deductionName}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {ded.deductionMethod === 'fixed' ? `Nu. ${ded.amount?.toLocaleString()}` : `${ded.percentage}%`}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{ded.applicableFromDate || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{ded.applicableUntilDate || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{ded.reason || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            ded.status === 'active' ? 'bg-green-100 text-green-700' :
                            ded.status === 'inactive' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {ded.status || 'active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!caps.isReadOnly && (
                <div className="mt-6 p-4 rounded-lg border border-slate-200/50 bg-slate-50/30 space-y-4">
                  <p className="font-bold text-slate-900">Add New Floating Deduction (DDi 27.0)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-900">Employee</label>
                      <select className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option>Select employee...</option>
                        {employees.map(emp => (
                          <option key={emp.masterEmpId} value={emp.masterEmpId}>{emp.firstName} {emp.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Deduction Name (27.1)</label>
                      <input type="text" placeholder="e.g., Loan Repayment" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Deduction Method (27.2)</label>
                      <select className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="">Select method...</option>
                        <option value="fixed">Fixed Amount</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Amount / Percentage (27.3)</label>
                      <input type="number" placeholder="0" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Applicable From Date (27.7)</label>
                      <input type="date" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Applicable Until Date (27.8)</label>
                      <input type="date" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-bold text-slate-900">Reason (27.9)</label>
                      <input type="text" placeholder="e.g., Staff Loan, Salary Advance" className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900">Status (27.10)</label>
                      <select className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium text-sm hover:bg-violet-700 transition">
                    Add Deduction
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>SRS Reference: Payroll SRS v1.1, DDi 2.0 (Employee Pay Update / HR Actions)</p>
        <p className="mt-1">All HR actions follow OPS Pay Structure Reform Act 2022 and IFMIS DDi specifications</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Helper Components
   ───────────────────────────────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "blue" | "amber" | "green" | "purple" | "sky";
}) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    amber: "border-amber-200/50 bg-amber-50/50 text-amber-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
    purple: "border-purple-200/50 bg-purple-50/50 text-purple-900",
    sky: "border-sky-200/50 bg-sky-50/50 text-sky-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs font-bold text-slate-600 uppercase">{label}</span>
      <span className="text-sm text-slate-900 font-semibold">{value || '—'}</span>
    </div>
  );
}

interface ActionTypeFieldsProps {
  type: HrActionType;
  details: HrActionDetail;
  onChange: (details: HrActionDetail) => void;
  selectedEmployee: string | null;
  employees: any[];
}

function ActionTypeFields({
  type,
  details,
  onChange,
  selectedEmployee,
  employees,
}: ActionTypeFieldsProps) {
  const emp = employees.find(e => e.id === selectedEmployee);

  return (
    <div className="space-y-3 mt-4 p-4 bg-white rounded-lg border border-slate-200">
      {type === 'salary-increment' && (
        <>
          <DetailRow label="Old Pay (2.3)" value={`Nu. ${emp?.basicPay?.toLocaleString() || 0}`} />
          <div>
            <label className="text-sm font-bold text-slate-900">Increment Amount (2.4)</label>
            <input
              type="number"
              value={details.salaryIncrement || ''}
              onChange={(e) => onChange({ ...details, salaryIncrement: Number(e.target.value) })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="0"
            />
          </div>
          <DetailRow
            label="New Pay (2.5)"
            value={emp ? `Nu. ${(emp.basicPay + (details.salaryIncrement || 0)).toLocaleString()}` : '—'}
          />
        </>
      )}

      {type === 'promotion' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">Promotion Type (2.6)</label>
            <select
              value={details.promationType || ''}
              onChange={(e) => onChange({ ...details, promationType: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select...</option>
              <option value="regular">Regular</option>
              <option value="special">Special</option>
              <option value="accelerated">Accelerated</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">New Position Title (2.7)</label>
            <input
              type="text"
              value={details.promotionNewTitle || ''}
              onChange={(e) => onChange({ ...details, promotionNewTitle: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., Senior Officer"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">New Pay Scale (2.8)</label>
            <input
              type="text"
              value={details.promotionNewScale || ''}
              onChange={(e) => onChange({ ...details, promotionNewScale: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., Scale-5"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">New Agency (2.9)</label>
            <input
              type="text"
              value={details.promotionNewAgency || ''}
              onChange={(e) => onChange({ ...details, promotionNewAgency: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., MOE"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">New Increment Date (2.10)</label>
            <input
              type="date"
              value={details.promotionNewIncrementDate || ''}
              onChange={(e) => onChange({ ...details, promotionNewIncrementDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}

      {type === 'transfer' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">Transfer Type (2.11)</label>
            <select
              value={details.transferType || ''}
              onChange={(e) => onChange({ ...details, transferType: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select...</option>
              <option value="inter-agency">Inter-Agency</option>
              <option value="intra-agency">Intra-Agency</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Date of Joining (2.12)</label>
            <input
              type="date"
              value={details.transferJoinDate || ''}
              onChange={(e) => onChange({ ...details, transferJoinDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}

      {type === 'contract-extension' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">Contract Extended Date (2.13)</label>
            <input
              type="date"
              value={details.contractExtendedDate || ''}
              onChange={(e) => onChange({ ...details, contractExtendedDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">New Position Title (2.14)</label>
            <input
              type="text"
              value={details.contractNewTitle || ''}
              onChange={(e) => onChange({ ...details, contractNewTitle: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}

      {type === 'secondment' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">From Date (2.15)</label>
            <input
              type="date"
              value={details.secondmentFromDate || ''}
              onChange={(e) => onChange({ ...details, secondmentFromDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Until Date (2.16)</label>
            <input
              type="date"
              value={details.secondmentUntilDate || ''}
              onChange={(e) => onChange({ ...details, secondmentUntilDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}

      {type === 'ltt' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">From Date (2.17)</label>
            <input
              type="date"
              value={details.lttFromDate || ''}
              onChange={(e) => onChange({ ...details, lttFromDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Until Date (2.18)</label>
            <input
              type="date"
              value={details.lttUntilDate || ''}
              onChange={(e) => onChange({ ...details, lttUntilDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Country (2.19)</label>
            <input
              type="text"
              value={details.lttCountry || ''}
              onChange={(e) => onChange({ ...details, lttCountry: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Place (2.20)</label>
            <input
              type="text"
              value={details.lttPlace || ''}
              onChange={(e) => onChange({ ...details, lttPlace: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}

      {type === 'stt' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">From Date (2.21)</label>
            <input
              type="date"
              value={details.sttFromDate || ''}
              onChange={(e) => onChange({ ...details, sttFromDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Until Date (2.22)</label>
            <input
              type="date"
              value={details.sttUntilDate || ''}
              onChange={(e) => onChange({ ...details, sttUntilDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Country (2.23)</label>
            <input
              type="text"
              value={details.sttCountry || ''}
              onChange={(e) => onChange({ ...details, sttCountry: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Place (2.24)</label>
            <input
              type="text"
              value={details.sttPlace || ''}
              onChange={(e) => onChange({ ...details, sttPlace: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}

      {type === 'leave' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">Leave Type (2.25)</label>
            <select
              value={details.leaveType || ''}
              onChange={(e) => onChange({ ...details, leaveType: e.target.value as LeaveType })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select...</option>
              {LEAVE_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Leave Till Date (2.26)</label>
            <input
              type="date"
              value={details.leaveTillDate || ''}
              onChange={(e) => onChange({ ...details, leaveTillDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}

      {type === 'hr-audit' && (
        <div>
          <label className="text-sm font-bold text-slate-900">Audit Type (2.27)</label>
          <select
            value={details.auditType || ''}
            onChange={(e) => onChange({ ...details, auditType: e.target.value as AuditType })}
            className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Select...</option>
            {AUDIT_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {type === 'legal-action' && (
        <div>
          <label className="text-sm font-bold text-slate-900">Legal Action Type (2.28)</label>
          <select
            value={details.legalActionType || ''}
            onChange={(e) => onChange({ ...details, legalActionType: e.target.value as LegalActionType })}
            className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Select...</option>
            {LEGAL_ACTION_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {type === 'separation' && (
        <>
          <div>
            <label className="text-sm font-bold text-slate-900">Separation Type (2.29)</label>
            <select
              value={details.separationType || ''}
              onChange={(e) => onChange({ ...details, separationType: e.target.value as SeparationType })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select...</option>
              {SEPARATION_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-900">Separation Date (2.30)</label>
            <input
              type="date"
              value={details.separationDate || ''}
              onChange={(e) => onChange({ ...details, separationDate: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </>
      )}
    </div>
  );
}

// Import React for Fragment
import React from 'react';
