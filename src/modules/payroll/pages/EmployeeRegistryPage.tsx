/* ═══════════════════════════════════════════════════════════════════════════
   Employee Registry Page — Payroll Module
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — Civil Service Pay Management
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import { useAgencyUrl } from "../../../shared/hooks/useAgencyUrl";
import { PayrollGroupSiblingNav } from "../shared/navigation/PayrollSubNav";
import { resolveAgencyContext, AGENCIES, getSubDivisions } from "../../../shared/data/agencyPersonas";
import { ModuleActorBanner } from "../../../shared/components/ModuleActorBanner";
import { validateBankDetails, findBankByName, findBranchInBank } from "../../../shared/utils/bankValidation";
import type { Employee, PositionLevel, EmployeeStatus } from "../types";
import {
  EMPLOYEES,
  PAY_SCALES,
  computeEmployeePay,
  getPayScale,
  ALLOWANCES,
  DEDUCTIONS,
} from "../state/payrollSeed";
import { usePayrollRoleCapabilities, payrollToneClasses } from "../state/usePayrollRoleCapabilities";
// EmployeeSummaryTable & CS_SAMPLE_EMPLOYEES intentionally NOT imported here —
// Civil Servant Records now live on the Employee Master page
// (PayrollManagementPage) to keep a single source of truth.

/* ───────────────────────────────────────────────────────────────────────────
   Column Configuration — fully dynamic: each column can be toggled,
   sorted, and has its own renderer.
   ─────────────────────────────────────────────────────────────────────────── */

interface ColumnDef {
  key: string;
  label: string;
  shortLabel?: string;
  group: "identity" | "employment" | "compensation" | "deductions" | "bank" | "meta";
  align?: "left" | "right" | "center";
  defaultVisible: boolean;
  sortable?: boolean;
  render: (e: Employee) => React.ReactNode;
  sortValue?: (e: Employee) => string | number;
}

const ALL_COLUMNS: ColumnDef[] = [
  /* ── Identity ── */
  { key: "name", label: "Full Name", group: "identity", defaultVisible: true, sortable: true, render: (e) => <span className="font-semibold text-slate-900">{e.name}</span>, sortValue: (e) => e.name },
  { key: "eid", label: "EID", group: "identity", defaultVisible: true, sortable: true, render: (e) => <span className="text-slate-600 font-mono text-xs">{e.eid}</span>, sortValue: (e) => e.eid },
  { key: "masterEmpId", label: "Master EID", group: "identity", defaultVisible: false, sortable: true, render: (e) => <span className="text-slate-500 font-mono text-xs">{e.masterEmpId}</span>, sortValue: (e) => e.masterEmpId },
  { key: "cid", label: "CID", group: "identity", defaultVisible: true, sortable: true, render: (e) => <span className="text-slate-600 font-mono text-xs">{e.cid}</span>, sortValue: (e) => e.cid },
  { key: "tpn", label: "TPN", group: "identity", defaultVisible: false, sortable: true, render: (e) => <span className="text-slate-500 font-mono text-xs">{e.tpn}</span>, sortValue: (e) => e.tpn },
  { key: "gender", label: "Gender", group: "identity", defaultVisible: false, align: "center", render: (e) => <span className="text-slate-500">{e.gender}</span> },
  { key: "dob", label: "Date of Birth", group: "identity", defaultVisible: false, render: (e) => <span className="text-slate-500 text-xs">{e.dateOfBirth}</span> },
  { key: "doe", label: "Employment Date", group: "identity", defaultVisible: false, render: (e) => <span className="text-slate-500 text-xs">{e.dateOfEmployment}</span> },

  /* ── Employment ── */
  { key: "positionLevel", label: "Position Level", shortLabel: "Level", group: "employment", defaultVisible: true, align: "center", sortable: true,
    render: (e) => {
      const ps = getPayScale(e.positionLevel);
      return <span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] rounded bg-slate-100 text-xs font-bold text-slate-700 cursor-help" title={`${ps.label} — Nu.${ps.minPay.toLocaleString()}–${ps.maxPay.toLocaleString()}`}>{e.positionLevel}</span>;
    }, sortValue: (e) => e.positionLevel },
  { key: "positionTitle", label: "Position Title", group: "employment", defaultVisible: true, sortable: true, render: (e) => <span className="text-slate-700">{e.positionTitle}</span>, sortValue: (e) => e.positionTitle },
  { key: "occupationalGroup", label: "Occupational Group", shortLabel: "Occ. Group", group: "employment", defaultVisible: false, render: (e) => <span className="text-slate-500 text-xs">{e.occupationalGroup}</span> },
  { key: "agencyCode", label: "Agency Code", shortLabel: "Ag. Code", group: "employment", defaultVisible: true, align: "center", sortable: true,
    render: (e) => <span className="inline-flex items-center justify-center h-6 min-w-[2.5rem] rounded bg-indigo-50 text-xs font-bold text-indigo-700 font-mono">{e.agencyCode}</span>,
    sortValue: (e) => e.agencyCode },
  { key: "agency", label: "Agency Name", shortLabel: "Agency", group: "employment", defaultVisible: true, sortable: true, render: (e) => <span className="text-slate-600 text-xs">{e.agencyName}</span>, sortValue: (e) => e.agencyName },
  { key: "department", label: "Department", group: "employment", defaultVisible: true, sortable: true, render: (e) => <span className="text-slate-500 text-xs">{e.departmentName}</span>, sortValue: (e) => e.departmentName },
  { key: "subDivision", label: "Sub-Division", shortLabel: "Sub-Div.", group: "employment", defaultVisible: true, sortable: true, render: (e) => <span className="text-slate-500 text-xs">{e.subDivision || "—"}</span>, sortValue: (e) => e.subDivision || "" },
  { key: "ucoaOrg", label: "UCoA Org Segment", shortLabel: "UCoA", group: "employment", defaultVisible: false, render: (e) => <span className="text-slate-500 font-mono text-xs">{e.ucoaOrgSegment}</span> },
  { key: "category", label: "Employee Category", shortLabel: "Category", group: "employment", defaultVisible: true, sortable: true,
    render: (e) => {
      const isCivil = e.category === "civil-servant";
      return <span className={`text-[10px] rounded-full px-2 py-0.5 font-bold uppercase tracking-wide ${isCivil ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
        {isCivil ? "Civil Servant" : "OPS"}
      </span>;
    },
    sortValue: (e) => e.category },

  /* ── Compensation ── */
  { key: "basicPay", label: "Basic Pay", group: "compensation", align: "right", defaultVisible: true, sortable: true, render: (e) => <span className="font-mono text-slate-900">Nu.{e.basicPay.toLocaleString()}</span>, sortValue: (e) => e.basicPay },
  { key: "grossPay", label: "Gross Pay", group: "compensation", align: "right", defaultVisible: true, sortable: true, render: (e) => <span className="font-mono text-slate-900">Nu.{e.grossPay.toLocaleString()}</span>, sortValue: (e) => e.grossPay },
  { key: "deductions", label: "Total Deductions", shortLabel: "Deductions", group: "compensation", align: "right", defaultVisible: true, sortable: true, render: (e) => <span className="font-mono text-red-600">Nu.{e.totalDeductions.toLocaleString()}</span>, sortValue: (e) => e.totalDeductions },

  /* ── Individual Deductions ── */
  { key: "pf", label: "Provident Fund (PF)", shortLabel: "PF", group: "deductions", align: "right", defaultVisible: true, sortable: true,
    render: (e) => { const p = computeEmployeePay(e.basicPay, e.positionLevel); return <span className="font-mono text-red-600 text-xs">Nu.{p.pf.toLocaleString()}</span>; },
    sortValue: (e) => computeEmployeePay(e.basicPay, e.positionLevel).pf },
  { key: "gis", label: "Group Insurance (GIS)", shortLabel: "GIS", group: "deductions", align: "right", defaultVisible: true, sortable: true,
    render: (e) => { const p = computeEmployeePay(e.basicPay, e.positionLevel); return <span className="font-mono text-red-600 text-xs">Nu.{p.gis.toLocaleString()}</span>; },
    sortValue: (e) => computeEmployeePay(e.basicPay, e.positionLevel).gis },
  { key: "hc", label: "Health Contribution (HC)", shortLabel: "HC", group: "deductions", align: "right", defaultVisible: true, sortable: true,
    render: (e) => { const p = computeEmployeePay(e.basicPay, e.positionLevel); return <span className="font-mono text-red-600 text-xs">Nu.{p.hc.toLocaleString()}</span>; },
    sortValue: (e) => computeEmployeePay(e.basicPay, e.positionLevel).hc },
  { key: "tds", label: "Tax Deducted (TDS)", shortLabel: "TDS", group: "deductions", align: "right", defaultVisible: true, sortable: true,
    render: (e) => { const p = computeEmployeePay(e.basicPay, e.positionLevel); return <span className="font-mono text-red-600 text-xs">Nu.{p.tds.toLocaleString()}</span>; },
    sortValue: (e) => computeEmployeePay(e.basicPay, e.positionLevel).tds },
  { key: "csws", label: "CSWS", shortLabel: "CSWS", group: "deductions", align: "right", defaultVisible: true, sortable: true,
    render: (e) => { const p = computeEmployeePay(e.basicPay, e.positionLevel); return <span className="font-mono text-red-600 text-xs">Nu.{p.csws.toLocaleString()}</span>; },
    sortValue: (e) => computeEmployeePay(e.basicPay, e.positionLevel).csws },

  { key: "netPay", label: "Net Pay", group: "compensation", align: "right", defaultVisible: true, sortable: true, render: (e) => <span className="font-mono font-bold text-emerald-700">Nu.{e.netPay.toLocaleString()}</span>, sortValue: (e) => e.netPay },

  /* ── Bank ── */
  { key: "bankName", label: "Bank", group: "bank", defaultVisible: false, sortable: true, render: (e) => {
    const bank = findBankByName(e.bankName);
    return <span className={`text-xs ${bank ? 'text-slate-600' : 'text-red-500'}`}>{bank ? bank.name : e.bankName + ' ⚠'}</span>;
  }, sortValue: (e) => e.bankName },
  { key: "bankAccountNo", label: "Account No", group: "bank", defaultVisible: false, render: (e) => <span className="text-xs font-mono text-slate-600">{e.bankAccountNo}</span> },
  { key: "bankBranch", label: "Branch", group: "bank", defaultVisible: false, render: (e) => <span className="text-xs text-slate-500">{e.bankBranch}</span> },
  { key: "bankValid", label: "Bank Status", shortLabel: "Bank", group: "bank", align: "center", defaultVisible: false, render: (e) => {
    const r = validateBankDetails(e.bankName, e.bankBranch, e.bankAccountNo);
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.valid ? 'Verified' : 'Invalid'}</span>;
  }},

  /* ── Meta ── */
  { key: "source", label: "Source", group: "meta", align: "center", defaultVisible: true, render: (e) => <SourceBadge source={e.source || 'zest'} /> },
  { key: "status", label: "Status", group: "meta", align: "center", defaultVisible: true, sortable: true, render: (e) => <StatusBadge status={e.status} />, sortValue: (e) => e.status },
  { key: "nppfTier", label: "NPPF Tier", group: "meta", align: "center", defaultVisible: false, render: (e) => <span className="text-xs text-slate-500">{e.nppfTier}</span> },
  { key: "lastHRAction", label: "Last HR Action", group: "meta", defaultVisible: false, render: (e) => <span className="text-xs text-slate-500">{e.lastHRAction || '—'}</span> },
];

const COLUMN_GROUPS = [
  { key: "identity", label: "Identity" },
  { key: "employment", label: "Employment" },
  { key: "compensation", label: "Compensation" },
  { key: "deductions", label: "Deductions" },
  { key: "bank", label: "Bank Details" },
  { key: "meta", label: "Meta" },
] as const;

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

/* ───────────────────────────────────────────────────────────────────────────
   Detail Panel Component — Shows full employee profile across 5 tabs
   ─────────────────────────────────────────────────────────────────────────── */

interface DetailPanelProps {
  employee: Employee | null;
  onClose: () => void;
}

function DetailPanel({ employee, onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "personal" | "employment" | "salary" | "allowances" | "payscale" | "bank" | "statutory"
  >("personal");

  /* Allowance tab filters (per-employee Allowance Configuration view) */
  const [alwSearch, setAlwSearch] = useState("");
  const [alwStatusFilter, setAlwStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [alwTypeFilter, setAlwTypeFilter] = useState<"all" | "recurring" | "one-time">("all");
  const [alwCalcFilter, setAlwCalcFilter] = useState<"all" | "pct-basic" | "fixed" | "slab">("all");

  if (!employee) return null;

  const pay = computeEmployeePay(employee.basicPay, employee.positionLevel);

  const allowanceDetails = ALLOWANCES.filter((a) =>
    employee.allowanceIds.includes(a.id)
  ).map((a) => {
    let amount = 0;
    switch (a.id) {
      case "ALW-001": // LE
        amount = pay.le;
        break;
      case "ALW-002": // LTC
        amount = pay.ltc;
        break;
      case "ALW-003": // Lump Sum 50%
        amount = pay.lumpSum;
        break;
      case "ALW-004": // 5% Indexation
        amount = pay.indexation;
        break;
      case "ALW-005": // One-off Fixed
        amount = pay.oneOffFixed;
        break;
      default:
        amount = 0;
    }
    return { ...a, amount };
  });

  /* Compute amount for an arbitrary allowance against this employee */
  const computeAllowanceAmount = (id: string): number => {
    switch (id) {
      case "ALW-001": return pay.le;
      case "ALW-002": return pay.ltc;
      case "ALW-003": return pay.lumpSum;
      case "ALW-004": return pay.indexation;
      case "ALW-005": return pay.oneOffFixed;
      default: {
        const a = ALLOWANCES.find((x) => x.id === id);
        if (!a) return 0;
        if (a.calcMethod === "pct-basic") return Math.round(employee.basicPay * (a.value / 100));
        if (a.calcMethod === "fixed") return a.value;
        return 0;
      }
    }
  };

  /* Determine eligibility for an allowance for THIS employee */
  const isAllowanceEligible = (a: typeof ALLOWANCES[number]): boolean => {
    const levelOk = !a.applicableLevels?.length || a.applicableLevels.includes(employee.positionLevel);
    const agencyOk = !a.applicableAgencies?.length || a.applicableAgencies.includes(employee.agencyCode);
    return levelOk && agencyOk;
  };

  /* Filtered allowance list for the per-employee Allowance Configuration tab */
  const filteredAllowances = ALLOWANCES.filter((a) => {
    if (alwStatusFilter === "active" && !a.active) return false;
    if (alwStatusFilter === "inactive" && a.active) return false;
    if (alwTypeFilter !== "all" && a.type !== alwTypeFilter) return false;
    if (alwCalcFilter !== "all" && a.calcMethod !== alwCalcFilter) return false;
    if (alwSearch.trim()) {
      const q = alwSearch.trim().toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.ucoaCode.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* Pay scale insight for this employee */
  const ps = getPayScale(employee.positionLevel);
  const stepsAboveMin = ps.increment > 0 ? Math.max(0, Math.round((employee.basicPay - ps.minPay) / ps.increment)) : 0;
  const totalSteps = ps.increment > 0 ? Math.round((ps.maxPay - ps.minPay) / ps.increment) : 0;
  const progressPct = totalSteps > 0 ? Math.min(100, Math.round((stepsAboveMin / totalSteps) * 100)) : 0;

  const deductionDetails = [
    { name: "Provident Fund (PF)", amount: pay.pf, remitTo: "NPPF" },
    { name: "Group Insurance Scheme (GIS)", amount: pay.gis, remitTo: "RICBL" },
    {
      name: "Health Contribution (HC)",
      amount: pay.hc,
      remitTo: "DRC",
    },
    { name: "Tax Deducted at Source (TDS)", amount: pay.tds, remitTo: "DRC" },
    {
      name: "Civil Servant Welfare Scheme (CSWS)",
      amount: pay.csws,
      remitTo: "RCSC",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {employee.name}
              </h2>
              <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">
                Civil Servant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              EID: {employee.eid} • CID: {employee.cid} • <span className="font-mono text-indigo-600">Agency: {employee.agencyCode}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold transition"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200/80 flex overflow-x-auto">
          {(
            [
              "personal",
              "employment",
              "salary",
              "allowances",
              "payscale",
              "bank",
              "statutory",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "payscale" ? "Pay Scale" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "personal" && (
            <div className="space-y-3">
              <DetailRow label="Name" value={employee.name} />
              <DetailRow label="EID" value={employee.eid} />
              <DetailRow label="Master EID" value={(employee as any).masterEmpId || '—'} />
              <DetailRow label="CID" value={employee.cid} />
              <DetailRow label="TPN" value={employee.tpn} />
              <DetailRow label="Date of Birth" value={employee.dateOfBirth} />
              <DetailRow label="Gender" value={employee.gender} />
              <DetailRow
                label="Date of Employment"
                value={employee.dateOfEmployment}
              />
              <DetailRow label="Source" value={(employee as any).source || 'zest'} />
              <DetailRow label="Employee Category" value={employee.category === 'civil-servant' ? 'Civil Servant' : 'Other Public Servant'} />
              <DetailRow label="Agency Code" value={employee.agencyCode} />
              <DetailRow
                label="Last HR Action"
                value={(employee as any).lastHRAction || '—'}
              />
              {(employee as any).lastHRActionDate && (
                <DetailRow
                  label="Last HR Action Date"
                  value={(employee as any).lastHRActionDate}
                />
              )}
            </div>
          )}

          {activeTab === "employment" && (
            <div className="space-y-3">
              <DetailRow
                label="Position Level"
                value={employee.positionLevel}
              />
              <DetailRow label="Position Title" value={employee.positionTitle} />
              <DetailRow
                label="Occupational Group"
                value={employee.occupationalGroup}
              />
              <DetailRow label="Agency Code" value={employee.agencyCode} />
              <DetailRow label="Agency Name" value={employee.agencyName} />
              <DetailRow label="Department" value={employee.departmentName} />
              {employee.subDivision && <DetailRow label="Sub-Division" value={employee.subDivision} />}
              <DetailRow label="Employee Category" value={employee.category === 'civil-servant' ? 'Civil Servant' : 'OPS'} />
              <DetailRow
                label="UCoA Org Segment"
                value={employee.ucoaOrgSegment}
              />
              <div className="pt-2 border-t border-slate-200/50">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Pay Scale
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Min</p>
                    <p className="font-semibold text-slate-900">
                      Nu.{employee.payScale.minPay.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Increment</p>
                    <p className="font-semibold text-slate-900">
                      Nu.{employee.payScale.increment.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Max</p>
                    <p className="font-semibold text-slate-900">
                      Nu.{employee.payScale.maxPay.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "salary" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Pay Components
                </p>
                <div className="space-y-2">
                  <DetailRow
                    label="Basic Pay"
                    value={`Nu.${employee.basicPay.toLocaleString()}`}
                  />
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-2">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Allowances
                </p>
                <div className="space-y-1 text-sm">
                  {allowanceDetails.map((a) => (
                    <div
                      key={a.id}
                      className="flex justify-between items-center py-1 px-2 bg-slate-50/50 rounded"
                    >
                      <span className="text-slate-700">{a.name}</span>
                      <span className="font-semibold text-slate-900">
                        Nu.{a.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-1 px-2 font-bold text-slate-900 border-t border-slate-200">
                    <span>Gross Pay</span>
                    <span>Nu.{pay.grossPay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-2">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Deductions
                </p>
                <div className="space-y-1 text-sm">
                  {deductionDetails.map((d) => (
                    <div
                      key={d.name}
                      className="flex justify-between items-center py-1 px-2 bg-red-50/50 rounded"
                    >
                      <span className="text-slate-700">{d.name}</span>
                      <span className="font-semibold text-red-700">
                        Nu.{d.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-1 px-2 font-bold text-slate-900 border-t border-slate-200">
                    <span>Net Pay</span>
                    <span className="text-green-700">
                      Nu.{pay.netPay.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "allowances" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Allowance Configuration</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Per-employee view of every allowance, with eligibility and the computed amount for {employee.name}.</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${employee.category === 'civil-servant' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                  {employee.category === 'civil-servant' ? 'ZESt · Read-only' : 'RCSC OPS'}
                </span>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={alwSearch}
                  onChange={(e) => setAlwSearch(e.target.value)}
                  placeholder="Search by name, UCoA code, or ID..."
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={alwStatusFilter}
                    onChange={(e) => setAlwStatusFilter(e.target.value as any)}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={alwTypeFilter}
                    onChange={(e) => setAlwTypeFilter(e.target.value as any)}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="all">All types</option>
                    <option value="recurring">Recurring</option>
                    <option value="one-time">One-time</option>
                  </select>
                  <select
                    value={alwCalcFilter}
                    onChange={(e) => setAlwCalcFilter(e.target.value as any)}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="all">All calc</option>
                    <option value="pct-basic">% of Basic</option>
                    <option value="fixed">Fixed</option>
                    <option value="slab">Slab</option>
                  </select>
                </div>
              </div>

              {/* Summary chips */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                  Assigned: {employee.allowanceIds.length}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                  Eligible: {ALLOWANCES.filter(isAllowanceEligible).length}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                  Total in master: {ALLOWANCES.length}
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                  Showing: {filteredAllowances.length}
                </span>
              </div>

              {/* Allowance list */}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">UCoA</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                      <th className="px-2 py-1.5 text-center font-semibold">Type</th>
                      <th className="px-2 py-1.5 text-center font-semibold">Calc</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Value</th>
                      <th className="px-2 py-1.5 text-center font-semibold">Status</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Amount (Nu.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAllowances.map((a) => {
                      const assigned = employee.allowanceIds.includes(a.id);
                      const eligible = isAllowanceEligible(a);
                      const amount = assigned ? computeAllowanceAmount(a.id) : 0;
                      return (
                        <tr key={a.id} className={assigned ? "bg-emerald-50/30" : eligible ? "" : "bg-slate-50/50 text-slate-400"}>
                          <td className="px-2 py-1.5 font-mono text-slate-600">{a.ucoaCode}</td>
                          <td className="px-2 py-1.5">
                            <div className="font-semibold text-slate-800">{a.name}</div>
                            <div className="flex gap-1 mt-0.5">
                              {assigned && <span className="rounded bg-emerald-100 px-1 py-px text-[9px] font-bold text-emerald-700">ASSIGNED</span>}
                              {!assigned && eligible && <span className="rounded bg-blue-100 px-1 py-px text-[9px] font-bold text-blue-700">ELIGIBLE</span>}
                              {!eligible && <span className="rounded bg-slate-200 px-1 py-px text-[9px] font-bold text-slate-500">NOT ELIGIBLE</span>}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center uppercase">{a.type}</td>
                          <td className="px-2 py-1.5 text-center">{a.calcMethod === "pct-basic" ? "% of Basic" : a.calcMethod}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{a.calcMethod === "pct-basic" ? `${a.value}%` : a.calcMethod === "slab" ? "—" : a.value.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-center">
                            <span className={`inline-block h-2 w-2 rounded-full ${a.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-900">
                            {assigned ? amount.toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAllowances.length === 0 && (
                      <tr><td colSpan={7} className="px-2 py-6 text-center text-slate-400">No allowances match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "payscale" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Pay Scale — {ps.label} ({ps.level})</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {employee.category === 'civil-servant'
                      ? `Sourced from ZESt (RCSC LoVBasedOnCategory). Read-only here for ${employee.name}.`
                      : `RCSC / Constitutional Bodies — editable on the Pay Scale Master page (HR / Admin).`}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${employee.category === 'civil-servant' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                  {employee.category === 'civil-servant' ? 'ZESt · Read-only' : 'OPS · Editable'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Min Pay</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">Nu.{ps.minPay.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-indigo-700">Current Basic</p>
                  <p className="mt-1 text-lg font-bold text-indigo-900">Nu.{employee.basicPay.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Max Pay</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">Nu.{ps.maxPay.toLocaleString()}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Step {stepsAboveMin} of {totalSteps}</span>
                  <span>{progressPct}% through scale</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Annual Increment</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900">Nu.{ps.increment.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Next Step Basic</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900">
                    {employee.basicPay + ps.increment <= ps.maxPay
                      ? `Nu.${(employee.basicPay + ps.increment).toLocaleString()}`
                      : "At ceiling"}
                  </p>
                </div>
              </div>

              {/* Step ladder (sample of nearest steps) */}
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Step Ladder (nearest steps)</p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold">Step</th>
                        <th className="px-2 py-1 text-right font-semibold">Basic Pay (Nu.)</th>
                        <th className="px-2 py-1 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.from({ length: Math.min(8, totalSteps + 1) }, (_, i) => {
                        const stepIdx = Math.max(0, stepsAboveMin - 2) + i;
                        if (stepIdx > totalSteps) return null;
                        const basic = ps.minPay + stepIdx * ps.increment;
                        const isCurrent = stepIdx === stepsAboveMin;
                        return (
                          <tr key={stepIdx} className={isCurrent ? "bg-indigo-50/60 font-semibold text-indigo-900" : ""}>
                            <td className="px-2 py-1">Step {stepIdx}</td>
                            <td className="px-2 py-1 text-right font-mono">{basic.toLocaleString()}</td>
                            <td className="px-2 py-1 text-center">
                              {isCurrent ? <span className="rounded bg-indigo-600 px-1.5 py-px text-[9px] font-bold text-white">CURRENT</span> : <span className="text-slate-400">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deductions applicable to this employee — pulled live from DEDUCTIONS master */}
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">Statutory & Floating Deductions (live)</p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold">UCoA</th>
                        <th className="px-2 py-1 text-left font-semibold">Deduction</th>
                        <th className="px-2 py-1 text-center font-semibold">Category</th>
                        <th className="px-2 py-1 text-center font-semibold">Mandatory</th>
                        <th className="px-2 py-1 text-left font-semibold">Remit To</th>
                        <th className="px-2 py-1 text-right font-semibold">Amount (Nu.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {DEDUCTIONS.filter((d) => d.applicableTo === 'both' || d.applicableTo === employee.category).map((d) => {
                        let amount = 0;
                        if (d.id === 'DED-001') amount = pay.pf;
                        else if (d.id === 'DED-002') amount = pay.gis;
                        else if (d.id === 'DED-003') amount = pay.hc;
                        else if (d.id === 'DED-004') amount = pay.tds;
                        else if (d.id === 'DED-CS-001') amount = pay.csws;
                        else if (d.calcMethod === 'pct-basic') amount = Math.round(employee.basicPay * (d.value / 100));
                        else if (d.calcMethod === 'fixed') amount = d.value;
                        return (
                          <tr key={d.id} className={d.mandatory ? '' : 'text-slate-500'}>
                            <td className="px-2 py-1 font-mono text-slate-600">{d.ucoaCode}</td>
                            <td className="px-2 py-1 font-semibold text-slate-800">{d.name}</td>
                            <td className="px-2 py-1 text-center uppercase">
                              <span className={`rounded px-1.5 py-px text-[9px] font-bold ${d.category === 'statutory' ? 'bg-red-100 text-red-700' : d.category === 'recovery' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>{d.category}</span>
                            </td>
                            <td className="px-2 py-1 text-center">{d.mandatory ? '✓' : '—'}</td>
                            <td className="px-2 py-1 text-slate-600">{d.remitTo}</td>
                            <td className="px-2 py-1 text-right font-mono font-semibold text-red-700">{amount > 0 ? amount.toLocaleString() : '—'}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-red-50/50 font-bold">
                        <td colSpan={5} className="px-2 py-1.5 text-right text-slate-700">Total Deductions</td>
                        <td className="px-2 py-1.5 text-right font-mono text-red-700">Nu.{employee.totalDeductions.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-emerald-50/50 font-bold">
                        <td colSpan={5} className="px-2 py-1.5 text-right text-slate-700">Net Pay</td>
                        <td className="px-2 py-1.5 text-right font-mono text-emerald-700">Nu.{employee.netPay.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Source: <code>DEDUCTIONS</code> master (SRS PRN 1.2). Statutory rows are mandatory for both Civil Service and OPS; floating rows shown only when applicable to this employee's category.</p>
              </div>
            </div>
          )}

          {activeTab === "bank" && (() => {
            const bankValid = validateBankDetails(employee.bankName, employee.bankBranch, employee.bankAccountNo);
            const resolvedBank = findBankByName(employee.bankName);
            const resolvedBranch = employee.bankName ? findBranchInBank(employee.bankName, employee.bankBranch) : null;
            return (
              <div className="space-y-3">
                {/* Bank validation status banner */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  bankValid.valid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span>{bankValid.valid ? '✓' : '⚠'}</span>
                  <span>{bankValid.valid ? 'Bank details validated against RMA registry' : `Bank validation: ${bankValid.errors.join('; ')}`}</span>
                </div>
                <DetailRow label="Bank Name" value={employee.bankName} />
                {resolvedBank && (
                  <div className="pl-3 text-xs text-slate-400">
                    SWIFT: {resolvedBank.swift || '—'} | Code: {resolvedBank.code} | BFSC Prefix: {resolvedBank.bfscPrefix}
                  </div>
                )}
                <DetailRow label="Account No" value={employee.bankAccountNo} />
                <DetailRow label="Branch" value={employee.bankBranch} />
                {resolvedBranch && (
                  <div className="pl-3 text-xs text-slate-400">
                    BFSC: {resolvedBranch.bfscCode} | Dzongkhag: {resolvedBranch.dzongkhag}
                  </div>
                )}
                <DetailRow label="PF Account" value={employee.pfAccountNo} />
                <DetailRow label="GIS Account" value={employee.gisAccountNo} />
                <DetailRow label="NPPF Tier" value={employee.nppfTier} />
              </div>
            );
          })()}

          {activeTab === "statutory" && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                Statutory Deductions
              </p>
              <div className="space-y-2">
                {deductionDetails.map((d) => (
                  <div
                    key={d.name}
                    className="border border-slate-200/50 rounded-lg p-3 bg-slate-50/50"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-slate-900">{d.name}</p>
                      <p className="text-sm font-bold text-slate-900">
                        Nu.{d.amount.toLocaleString()}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Remit to: {d.remitTo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between items-center py-2 px-2 bg-slate-50/50 rounded">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Main Employee Registry Page Component
   ─────────────────────────────────────────────────────────────────────────── */

/* ───────────────────────────────────────────────────────────────────────────
   ZESt Integration Process — derived from Payroll SRS v1 (Civil Service
   "Process Description Civil Serva" sheet → Employee Master Data Mgmt).
   5-step pipeline:
     1. Initiate Connection
     2. Authenticate (NDI / Secure Channel)
     3. Fetch Employee Records
     4. Validate & Deduplicate
     5. Sync into IFMIS Master
   ─────────────────────────────────────────────────────────────────────── */
type ZestStep = "idle" | "running" | "done";
const ZEST_STEPS = [
  { key: "connect", label: "Initiate Connection", hint: "Establish secure channel with ZESt" },
  { key: "auth", label: "Authenticate", hint: "NDI / Government PKI handshake" },
  { key: "fetch", label: "Fetch Records", hint: "Pull civil-servant employee master delta" },
  { key: "validate", label: "Validate", hint: "Check CID, TPN, Position Level against LoVs" },
  { key: "sync", label: "Sync to IFMIS", hint: "Upsert into payroll.employee_master" },
] as const;

export function EmployeeRegistryPage() {
  const { activeAgencyCode, activeRoleId } = useAuth();
  const context = resolveAgencyContext(activeRoleId);
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useAgencyUrl();
  const [zestStepStatus, setZestStepStatus] = useState<Record<string, ZestStep>>(
    () => Object.fromEntries(ZEST_STEPS.map((s) => [s.key, "idle" as ZestStep]))
  );

  /* ── Agency isolation logic ─────────────────────────────────────────────
     Central agency (MoF, code 16) with admin role can view ALL agencies.
     Every other agency — regardless of role (HR, Finance, HoA) — sees
     ONLY their own agency's employees. This mirrors the real IFMIS where
     GovTech HR sees GovTech employees only, MoH HR sees MoH only, etc.
     ──────────────────────────────────────────────────────────────────── */
  const currentAgency = useMemo(
    () => AGENCIES.find((a) => a.code === activeAgencyCode),
    [activeAgencyCode]
  );
  const isCentralAdmin = activeAgencyCode === "16" && activeRoleId === "role-admin";

  /** The base pool of employees this user is allowed to see at all */
  const agencyEmployeePool = useMemo(() => {
    if (isCentralAdmin) return EMPLOYEES; /* MoF admin sees everything */
    return EMPLOYEES.filter((e) => e.agencyCode === activeAgencyCode);
  }, [isCentralAdmin, activeAgencyCode]);

  /* ── Search, filter & sorting state ──────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [subDivisionFilter, setSubDivisionFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  /* ── Column visibility state ─────────────────────────────────────────── */
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [showColPicker, setShowColPicker] = useState(false);

  /* ── Pagination state ────────────────────────────────────────────────── */
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(20);

  /* ── Other UI state ──────────────────────────────────────────────────── */
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  /* ── Toggle column visibility ────────────────────────────────────────── */
  const toggleCol = useCallback((key: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  /* Toggle entire group */
  const toggleGroup = useCallback((group: string, on: boolean) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      ALL_COLUMNS.filter((c) => c.group === group).forEach((c) => {
        on ? next.add(c.key) : next.delete(c.key);
      });
      return next;
    });
  }, []);

  /* ── Derived: unique agencies and levels for filter dropdowns ────────── */
  /** Agencies available in the pool — only meaningful for MoF admin */
  const uniqueAgencies = useMemo(() => {
    const set = new Set(agencyEmployeePool.map((e) => e.agencyName));
    return Array.from(set).sort();
  }, [agencyEmployeePool]);

  /** Dynamic departments based on agency scope */
  const uniqueDepartments = useMemo(() => {
    /* For single-agency users or when no agency filter is set, show departments from pool */
    const effectiveAgency = !isCentralAdmin
      ? currentAgency?.name
      : agencyFilter !== "all" ? agencyFilter : null;

    if (!effectiveAgency) {
      const set = new Set(agencyEmployeePool.map((e) => e.departmentName).filter(Boolean));
      return Array.from(set).sort();
    }
    /* Look up agency in master data for its official department list */
    const agency = AGENCIES.find((a) => a.name === effectiveAgency);
    if (agency && agency.departments.length > 0) {
      return [...agency.departments].sort();
    }
    /* Fallback: departments from employee data */
    const set = new Set(
      agencyEmployeePool.filter((e) => e.agencyName === effectiveAgency)
        .map((e) => e.departmentName)
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [agencyFilter, agencyEmployeePool, isCentralAdmin, currentAgency]);

  /** Sub-divisions available for the currently selected department (cascading filter). */
  const availableSubDivisions = useMemo(() => {
    if (departmentFilter === "all") return [];
    /* Primary source: official sub-division data */
    const official = getSubDivisions(departmentFilter);
    if (official.length > 0) return official;
    /* Fallback: unique sub-divisions from employee data */
    const set = new Set(
      agencyEmployeePool
        .filter((e) => e.departmentName === departmentFilter && e.subDivision)
        .map((e) => e.subDivision!)
    );
    return Array.from(set).sort();
  }, [departmentFilter, agencyEmployeePool]);

  /** ALL pay-scale levels from the official civil service PAY_SCALES master.
   *  The pay scale is system-wide (32 levels, EX → ESP) and not agency-specific.
   *  Every agency can have employees at any level, so the filter always shows
   *  the full catalogue. Employee count per level shown for context. */
  const allLevels = useMemo(() => {
    let pool = agencyEmployeePool;
    if (agencyFilter !== "all") {
      pool = pool.filter((e) => e.agencyName === agencyFilter);
    }
    const levelCounts = new Map<string, number>();
    pool.forEach((e) => {
      const lv = e.positionLevel as string;
      levelCounts.set(lv, (levelCounts.get(lv) || 0) + 1);
    });
    return PAY_SCALES.map((ps) => {
      const count = levelCounts.get(ps.level) || 0;
      return {
        level: ps.level,
        label: `${ps.level} — ${ps.label}`,
        count,
        hasEmployees: count > 0,
      };
    });
  }, [agencyFilter, agencyEmployeePool]);

  const activeLevelCount = allLevels.filter((l) => l.hasEmployees).length;

  /* ── Filtering logic ─────────────────────────────────────────────────
     Starts from agencyEmployeePool (already agency-scoped) and applies
     user-selected filters on top. No need for a separate agency security
     check — the pool itself IS the security boundary.
     ──────────────────────────────────────────────────────────────────── */
  const filteredEmployees = useMemo(() => {
    let employees = agencyEmployeePool;

    /* Text search: name, EID, CID, TPN, position title, agency code */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      employees = employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.eid.toLowerCase().includes(q) ||
          e.cid.toLowerCase().includes(q) ||
          e.tpn.toLowerCase().includes(q) ||
          e.positionTitle.toLowerCase().includes(q) ||
          e.bankAccountNo.toLowerCase().includes(q) ||
          e.agencyCode.toLowerCase().includes(q) ||
          e.agencyName.toLowerCase().includes(q) ||
          e.departmentName.toLowerCase().includes(q)
      );
    }

    /* Status filter */
    if (statusFilter !== "all") {
      employees = employees.filter((e) => e.status === statusFilter);
    }

    /* Level filter */
    if (levelFilter !== "all") {
      employees = employees.filter((e) => e.positionLevel === levelFilter);
    }

    /* Agency filter (only meaningful for MoF admin cross-agency view) */
    if (agencyFilter !== "all") {
      employees = employees.filter((e) => e.agencyName === agencyFilter);
    }

    /* Department filter */
    if (departmentFilter !== "all") {
      employees = employees.filter((e) => e.departmentName === departmentFilter);
    }

    /* Sub-division filter (cascading — only active when department is selected) */
    if (subDivisionFilter !== "all") {
      employees = employees.filter((e) => e.subDivision === subDivisionFilter);
    }

    return employees;
  }, [agencyEmployeePool, searchQuery, statusFilter, levelFilter, agencyFilter, departmentFilter, subDivisionFilter]);

  /* ── Sorting logic ───────────────────────────────────────────────────── */
  const sortedEmployees = useMemo(() => {
    const colDef = ALL_COLUMNS.find((c) => c.key === sortKey);
    if (!colDef?.sortValue) return filteredEmployees;
    const sorted = [...filteredEmployees].sort((a, b) => {
      const va = colDef.sortValue!(a);
      const vb = colDef.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb));
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [filteredEmployees, sortKey, sortDir]);

  /* ── Pagination logic ────────────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / perPage));
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * perPage;
    return sortedEmployees.slice(start, start + perPage);
  }, [sortedEmployees, page, perPage]);

  /* Reset page when filters change */
  useMemo(() => { setPage(1); }, [searchQuery, statusFilter, levelFilter, agencyFilter, departmentFilter, subDivisionFilter, perPage]);

  /* ── Summary stats ───────────────────────────────────────────────────── */
  const summary = useMemo(() => {
    const total = filteredEmployees.length;
    const totalBasic = filteredEmployees.reduce((s, e) => s + e.basicPay, 0);
    const totalGross = filteredEmployees.reduce((s, e) => s + e.grossPay, 0);
    const totalDeductions = filteredEmployees.reduce((s, e) => s + e.totalDeductions, 0);
    const totalNet = filteredEmployees.reduce((s, e) => s + e.netPay, 0);
    const active = filteredEmployees.filter((e) => e.status === "active").length;
    return { total, totalBasic, totalGross, totalDeductions, totalNet, active };
  }, [filteredEmployees]);

  /* ── Sort handler ────────────────────────────────────────────────────── */
  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return key; }
      setSortDir("asc");
      return key;
    });
  }, []);

  /* ── ZESt Sync — steps through the SRS-defined pipeline ──────────────── */
  const handleZestSync = async () => {
    setSyncing(true);
    // reset
    setZestStepStatus(Object.fromEntries(ZEST_STEPS.map((s) => [s.key, "idle"])) as any);
    for (const step of ZEST_STEPS) {
      setZestStepStatus((prev) => ({ ...prev, [step.key]: "running" }));
      // each stage ≈ 450ms to give users a visible progression
      await new Promise((resolve) => setTimeout(resolve, 450));
      setZestStepStatus((prev) => ({ ...prev, [step.key]: "done" }));
    }
    setSyncing(false);
    setLastSyncTime(new Date().toLocaleString());
  };

  /** Label for ZESt sync button — shows agency scope */
  const syncLabel = isCentralAdmin
    ? "Sync All from ZESt"
    : `Sync ${currentAgency?.shortCode || activeAgencyCode} from ZESt`;

  /* Visible columns for rendering */
  const activeCols = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleCols.has(c.key)),
    [visibleCols]
  );

  /* Dynamic KPIs from the current agency-scoped pool */
  const zestKpis = useMemo(() => {
    const pool = agencyEmployeePool;
    const activeCount = pool.filter((e) => e.status === "active").length;
    const onLeave = pool.filter((e) => e.status === "on-leave").length;
    const separated = pool.filter((e) => e.status === "separated").length;
    const fromZest = pool.filter((e) => (e.source || "zest") === "zest").length;
    const syncCoverage = pool.length === 0 ? 0 : Math.round((fromZest / pool.length) * 100);
    return { total: pool.length, activeCount, onLeave, separated, fromZest, syncCoverage };
  }, [agencyEmployeePool]);

  return (
    <div className="space-y-5 p-6 max-w-full mx-auto">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link to={buildPath("/")} className="hover:text-blue-600 hover:underline">Home</Link>
        <span className="opacity-50">›</span>
        <button onClick={() => navigate(buildPath("/payroll/management"))} className="hover:text-blue-600 hover:underline">Payroll</button>
        <span className="opacity-50">›</span>
        <button onClick={() => navigate(buildPath("/payroll/management"))} className="hover:text-blue-600 hover:underline">Payroll Management</button>
        <span className="opacity-50">›</span>
        <span className="text-blue-700 font-semibold">Civil Service</span>
        <span className="opacity-50">›</span>
        <span className="text-slate-700 font-semibold">👥 Employee Master</span>
        <span className="opacity-50">›</span>
        <span className="text-slate-900 font-bold">Employee Registry</span>
      </nav>

      {/* ── Peer workflows inside the "Employee Master" group ───────────── */}
      <PayrollGroupSiblingNav category="civil-servant" currentPath={location.pathname} />

      {/* ZESt → IFMIS Employee Master pipeline card removed per user
          request. Civil Service records are still ZESt-sourced (auto-sync
          banner lives above the Paybill Generation table); the explicit
          5-step pipeline + KPI strip are no longer needed here. */}

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Employee Registry</h1>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
              Employee_Category: Civil Servant
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isCentralAdmin
              ? <>Central Administration — All Agencies <span className="font-mono text-xs text-indigo-500">[MoF Code: 16]</span></>
              : <>{currentAgency?.name || activeAgencyCode} <span className="font-mono text-xs text-indigo-500">[Agency Code: {activeAgencyCode}]</span></>
            }
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
              Payroll SRS v1.1
            </span>
            {isCentralAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700">
                Cross-Agency View
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                {currentAgency?.shortCode || activeAgencyCode} Only
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600">
              {agencyEmployeePool.length} employees
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {allLevels.length} position levels | {isCentralAdmin ? `${uniqueAgencies.length} agencies` : `${uniqueDepartments.length} departments`}
          </span>
        </div>
      </div>

      <ModuleActorBanner moduleKey="employee-master" />

      {/* ── Agency Scope Banner — shows data isolation context ─────────── */}
      {!isCentralAdmin && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 flex items-center gap-3">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-amber-100 text-amber-700 font-mono text-sm font-bold">{activeAgencyCode}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Agency Scope: {currentAgency?.name || activeAgencyCode}
            </p>
            <p className="text-xs text-amber-700/70 mt-0.5">
              You can only view and manage employees within your agency.
              {currentAgency && ` Departments: ${currentAgency.departments.join(", ")}.`}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-amber-200/70 px-2.5 py-1 text-[10px] font-bold text-amber-800 uppercase tracking-wide">
            {agencyEmployeePool.length} employees
          </span>
        </div>
      )}

      {isCentralAdmin && (
        <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/50 p-3 flex items-center gap-3">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100 text-indigo-700 text-lg font-bold">*</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-900">
              Central Admin — Cross-Agency View
            </p>
            <p className="text-xs text-indigo-700/70 mt-0.5">
              As MoF System Administrator, you have access to all agency employee data.
              Use the Agency filter to narrow by specific agency.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-200/70 px-2.5 py-1 text-[10px] font-bold text-indigo-800 uppercase tracking-wide">
            {agencyEmployeePool.length} total across {uniqueAgencies.length} agencies
          </span>
        </div>
      )}

      {/* ── Summary Cards (6 cards) ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total Employees" value={summary.total} color="blue" />
        <SummaryCard label="Active" value={summary.active} color="green" />
        <SummaryCard label="Total Basic" value={`Nu.${(summary.totalBasic / 1000).toFixed(0)}K`} color="purple" />
        <SummaryCard label="Total Gross" value={`Nu.${(summary.totalGross / 1000).toFixed(0)}K`} color="green" />
        <SummaryCard label="Deductions" value={`Nu.${(summary.totalDeductions / 1000).toFixed(0)}K`} color="purple" />
        <SummaryCard label="Total Net" value={`Nu.${(summary.totalNet / 1000).toFixed(0)}K`} color="blue" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAYBILL GENERATION — Civil Servant Records
          ─────────────────────────────────────────────────────────────
          Structured exactly as the SRS paybill layout:
            • Header meta (xxx_1..xxx_5): Agency Code, Payroll Dept,
              Financial Year, Month ID, Payment Order Ack.
            • Employee Details: SN, Name, Gender, EID, CID/WP, TPN, DoB,
              Date of Appointment, Date of Separation, Employee Type,
              Position Level.
            • Earnings: Basic Pay (A), Arrears (B), Partial Pay (C),
              Total Allowances (D), Total Earnings X=A+B+C+D.
            • Total Deductions (Y)  ·  Net Pay Z = X - Y.
          The Statutory Deductions and Floating Deductions breakdown
          sections were intentionally removed — the paybill now shows
          only the rolled-up Total Deductions figure.
          Master data is ZESt-auto-synced because this is the Civil
          Servant channel.
          ═══════════════════════════════════════════════════════════════ */}
      <PaybillGenerationTable
        employees={filteredEmployees.filter((e) => e.category === "civil-servant")}
        agencyCode={isCentralAdmin ? "ALL" : (currentAgency?.code || activeAgencyCode || "—")}
        departmentName={currentAgency?.name || "—"}
        lastSyncTime={lastSyncTime}
      />

      {/* Legacy dynamic table — suppressed in favour of EmployeeSummaryTable.
          Wrapped in a never-true flag so the code stays compiled but unused. */}
      {false && (
      <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search name, EID, CID, TPN, position, account no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick status filter pills */}
          <div className="flex items-center gap-1">
            {(["all", "active", "on-leave", "suspended", "separated", "transferred"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {s === "all" ? "All" : s.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${showAdvancedFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            Filters {showAdvancedFilters ? '▲' : '▼'}
          </button>

          <button onClick={() => setShowColPicker(!showColPicker)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${showColPicker ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            Columns ({activeCols.length}/{ALL_COLUMNS.length})
          </button>

          <button onClick={handleZestSync} disabled={syncing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${syncing ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>
            {syncing ? 'Syncing...' : syncLabel}
          </button>
        </div>

        {/* Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="px-4 pb-4 pt-0 flex flex-wrap items-center gap-3 border-t border-slate-100 mt-0 pt-3">
            {/* Agency filter — only available to MoF central admin */}
            {isCentralAdmin && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Agency:</label>
                <select value={agencyFilter} onChange={(e) => { setAgencyFilter(e.target.value); setDepartmentFilter("all"); setSubDivisionFilter("all"); setLevelFilter("all"); }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500">
                  <option value="all">All Agencies ({uniqueAgencies.length})</option>
                  {uniqueAgencies.map((a) => {
                    const ag = AGENCIES.find((x) => x.name === a);
                    return <option key={a} value={a}>{ag ? `[${ag.code}] ` : ''}{a}</option>;
                  })}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Level:</label>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 max-w-[260px]">
                <option value="all">All Levels ({allLevels.length})</option>
                {allLevels.map((l) => <option key={l.level} value={l.level}>{l.label}</option>)}
              </select>
              {agencyFilter !== "all" && (
                <span className="text-[10px] text-slate-400">{allLevels.length} levels in agency</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Department:</label>
              <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setSubDivisionFilter("all"); }}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 max-w-[220px]">
                <option value="all">All Departments</option>
                {uniqueDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* Sub-Division filter — cascading, visible only when a specific department is selected */}
            {departmentFilter !== "all" && availableSubDivisions.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Sub-Division:</label>
                <select value={subDivisionFilter} onChange={(e) => setSubDivisionFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-blue-500 max-w-[240px]">
                  <option value="all">All Sub-Divisions ({availableSubDivisions.length})</option>
                  {availableSubDivisions.map((sd) => <option key={sd} value={sd}>{sd}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => { setStatusFilter("all"); setLevelFilter("all"); setAgencyFilter("all"); setDepartmentFilter("all"); setSubDivisionFilter("all"); setSearchQuery(""); }}
              className="text-xs text-red-600 hover:text-red-700 font-medium">
              Clear All Filters
            </button>
          </div>
        )}

        {/* Column Picker */}
        {showColPicker && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap gap-4">
              {COLUMN_GROUPS.map((g) => {
                const groupCols = ALL_COLUMNS.filter((c) => c.group === g.key);
                const allOn = groupCols.every((c) => visibleCols.has(c.key));
                return (
                  <div key={g.key}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <button onClick={() => toggleGroup(g.key, !allOn)}
                        className={`h-3.5 w-3.5 rounded border flex items-center justify-center text-[8px] transition ${allOn ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {allOn && '✓'}
                      </button>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{g.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {groupCols.map((c) => (
                        <button key={c.key} onClick={() => toggleCol(c.key)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                            visibleCols.has(c.key) ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                          {c.shortLabel || c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lastSyncTime && (
          <div className="px-4 pb-3 text-xs text-slate-600 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
              ✓ Last synced: {lastSyncTime}
            </span>
          </div>
        )}
      </div>

      {/* ── Dynamic Employees Table ────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center font-bold text-slate-400 text-xs w-10">#</th>
                {activeCols.map((col) => (
                  <th key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-4 py-3 font-bold text-slate-700 text-xs whitespace-nowrap ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    } ${col.sortable ? "cursor-pointer hover:text-blue-600 select-none" : ""}`}>
                    <span className="inline-flex items-center gap-1">
                      {col.shortLabel || col.label}
                      {col.sortable && sortKey === col.key && (
                        <span className="text-blue-500">{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={activeCols.length + 1} className="px-6 py-12 text-center">
                    <p className="text-slate-400 text-sm">No employees match your filters.</p>
                    <button onClick={() => { setStatusFilter("all"); setLevelFilter("all"); setAgencyFilter("all"); setDepartmentFilter("all"); setSubDivisionFilter("all"); setSearchQuery(""); }}
                      className="mt-2 text-xs text-blue-600 hover:underline">Clear all filters</button>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((employee, idx) => (
                  <tr key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className="hover:bg-blue-50/40 cursor-pointer transition group">
                    <td className="px-3 py-3 text-center text-xs text-slate-400 font-mono">
                      {(page - 1) * perPage + idx + 1}
                    </td>
                    {activeCols.map((col) => (
                      <td key={col.key}
                        className={`px-4 py-3 text-sm ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}>
                        {col.render(employee)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer: Pagination ─────────────────────────────────── */}
        <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Showing <strong>{(page - 1) * perPage + 1}</strong>–<strong>{Math.min(page * perPage, sortedEmployees.length)}</strong> of <strong>{sortedEmployees.length}</strong>
              {sortedEmployees.length !== agencyEmployeePool.length && <span className="text-slate-400"> (filtered from {agencyEmployeePool.length})</span>}
            </span>
            <div className="flex items-center gap-1">
              <label className="text-slate-500">Per page:</label>
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
                className="border border-slate-200 rounded px-1.5 py-0.5 text-xs">
                {ITEMS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">First</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
                    page === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-white text-slate-600'}`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Last</button>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">Civil Servant</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Source:</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">ZESt</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">{activeCols.length} cols</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">{allLevels.length} levels</span>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Detail Panel */}
      <DetailPanel employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />

      {/* SRS Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-400">
        <p>SRS: Payroll SRS v1.1, PRN 1.1 — Civil Service Pay Management | Pay Structure Reform Act 2022, Pay Revision 2023</p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Helper Components
   ─────────────────────────────────────────────────────────────────────────── */

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "green" | "amber" | "slate" | "indigo" | "teal";
}) {
  const toneMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneMap[tone]}`}>
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-70">{label}</div>
      <div className="mt-0.5 text-base font-black">{value}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
    purple: "border-purple-200/50 bg-purple-50/50 text-purple-900",
  };

  return (
    <div className={`rounded-xl border p-3 ${colorClasses[color]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    "on-leave": "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
    separated: "bg-slate-100 text-slate-700",
    transferred: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        statusColorMap[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PaybillGenerationTable — dynamic, SRS-shaped paybill for Civil Servants
   ----------------------------------------------------------------------
   Columns: Employee Details · Earnings (A/B/C/D → X) · Total Deductions
   (Y) · Net Pay (Z = X - Y).  The Statutory Deductions and Floating
   Deductions sub-sections were intentionally dropped.
   Data is sourced from ZESt (auto-synced) because this is the CS
   channel; the banner at the top reflects that.
   ══════════════════════════════════════════════════════════════════════ */
function PaybillGenerationTable({
  employees,
  agencyCode,
  departmentName,
  lastSyncTime,
}: {
  employees: Employee[];
  agencyCode: string;
  departmentName: string;
  lastSyncTime: string | null;
}) {
  const now = new Date();
  const fiscalYearStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const financialYear = `${fiscalYearStart}-${(fiscalYearStart + 1).toString().slice(-2)}`;
  const monthId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  /* ── Dynamic filters ─────────────────────────────────────────────── */
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [empTypeFilter, setEmpTypeFilter] = useState<string>("all");

  /* Employee Type options come from Master Data
     (payroll-employee-type) so new LoV values added in /master-data
     appear in the registry filter automatically. */
  const { masterDataMap } = useMasterData();
  const empTypeOptions = useMemo(
    () => masterDataMap.get("payroll-employee-type") || [],
    [masterDataMap],
  );

  const levels = useMemo(
    () => Array.from(new Set(employees.map((e) => e.positionLevel))).sort(),
    [employees],
  );
  /* Agency options are only meaningful on a cross-agency view (MoF admin).
     When the roster is already scoped to a single agency upstream, the
     distinct set will be length ≤ 1 and the select will hide itself. */
  const agencies = useMemo(() => {
    const byCode = new Map<string, string>();
    employees.forEach((e) => {
      if (e.agencyCode) byCode.set(e.agencyCode, e.agencyName || e.agencyCode);
    });
    return Array.from(byCode.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);
  /* Department list narrows to the picked agency so the two stay in sync. */
  const depts = useMemo(() => {
    const pool = agencyFilter === "all"
      ? employees
      : employees.filter((e) => e.agencyCode === agencyFilter);
    return Array.from(new Set(pool.map((e) => e.departmentName).filter(Boolean))).sort();
  }, [employees, agencyFilter]);

  /* If the active department no longer belongs to the selected agency,
     reset it so we never show an empty/invalid combination. */
  React.useEffect(() => {
    if (deptFilter !== "all" && !depts.includes(deptFilter)) setDeptFilter("all");
  }, [depts, deptFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (agencyFilter !== "all" && e.agencyCode !== agencyFilter) return false;
      if (levelFilter !== "all" && e.positionLevel !== levelFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (genderFilter !== "all" && e.gender !== genderFilter) return false;
      if (deptFilter !== "all" && e.departmentName !== deptFilter) return false;
      if (empTypeFilter !== "all" && (e.employeeType || "Regular") !== empTypeFilter) return false;
      if (q && !(
        e.name.toLowerCase().includes(q) ||
        e.eid.toLowerCase().includes(q) ||
        e.cid.toLowerCase().includes(q) ||
        e.tpn.toLowerCase().includes(q) ||
        e.positionTitle.toLowerCase().includes(q) ||
        (e.agencyName || "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [employees, search, agencyFilter, levelFilter, statusFilter, genderFilter, deptFilter, empTypeFilter]);

  /* Deterministic pseudo-arrears/partial-pay helpers (seed by employee id)
     so the numbers are stable between renders without needing persistence. */
  const seed = (s: string) =>
    Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

  const rows = filtered.map((e, idx) => {
    const pay = computeEmployeePay(e.basicPay, e.positionLevel);
    const s = seed(e.id);
    // Occasional arrears / partial-pay — deterministic but varied
    const arrears = s % 6 === 0 ? Math.round(e.basicPay * 0.08) : 0;
    const partialPay = s % 9 === 0 ? Math.round(e.basicPay * 0.04) : 0;
    const A = e.basicPay;
    const B = arrears;
    const C = partialPay;
    const D = pay.totalAllowances;
    const X = A + B + C + D;
    const Y = pay.totalDeductions;
    const Z = X - Y;
    return { e, idx: idx + 1, A, B, C, D, X, Y, Z };
  });

  const tot = rows.reduce(
    (acc, r) => ({
      A: acc.A + r.A,
      B: acc.B + r.B,
      C: acc.C + r.C,
      D: acc.D + r.D,
      X: acc.X + r.X,
      Y: acc.Y + r.Y,
      Z: acc.Z + r.Z,
    }),
    { A: 0, B: 0, C: 0, D: 0, X: 0, Y: 0, Z: 0 },
  );

  const money = (n: number) => (n === 0 ? "—" : `Nu.${n.toLocaleString()}`);

  return (
    <div className="space-y-3">
      {/* ZESt auto-sync banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
          </span>
          <span className="font-bold uppercase tracking-wide">
            ZESt Auto-Sync · Civil Servant Master
          </span>
          <span className="text-teal-700/80">
            Data is fetched automatically from ZESt (RCSC) for all Civil
            Servants — no manual import required.
          </span>
        </div>
        <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-bold text-teal-800">
          Last sync · {lastSyncTime || "Live"}
        </span>
      </div>

      {/* True-value KPI strip — computed live from the (filtered) roster */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <KpiTile label="Total Records" value={filtered.length} tone="blue" />
        <KpiTile label="Active" value={filtered.filter((e) => e.status === "active").length} tone="green" />
        <KpiTile label="On-Leave" value={filtered.filter((e) => e.status === "on-leave").length} tone="amber" />
        <KpiTile label="Separated" value={filtered.filter((e) => e.status === "separated").length} tone="slate" />
        <KpiTile label="Sourced from ZESt" value={filtered.filter((e) => (e.source || "zest") === "zest").length} tone="indigo" />
        <KpiTile
          label="ZESt Coverage"
          value={
            filtered.length === 0
              ? "0%"
              : `${Math.round((filtered.filter((e) => (e.source || "zest") === "zest").length / filtered.length) * 100)}%`
          }
          tone="teal"
        />
      </div>

      {/* Dynamic filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, EID, CID, TPN, position…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {agencies.length > 1 && (
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            title="Filter by agency"
          >
            <option value="all">All Agencies ({agencies.length})</option>
            {agencies.map((a) => (
              <option key={a.code} value={a.code}>
                [{a.code}] {a.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="all">All Levels</option>
          {levels.map((l) => (
            <option key={l} value={l}>Level {l}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on-leave">On-Leave</option>
          <option value="suspended">Suspended</option>
          <option value="separated">Separated</option>
          <option value="transferred">Transferred</option>
        </select>
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="all">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="all">All Departments</option>
          {depts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={empTypeFilter}
          onChange={(e) => setEmpTypeFilter(e.target.value)}
          title="Employee Type (from Master Data → payroll-employee-type)"
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
        >
          <option value="all">All Employee Types</option>
          {empTypeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {(search || agencyFilter !== "all" || levelFilter !== "all" || statusFilter !== "all" || genderFilter !== "all" || deptFilter !== "all" || empTypeFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAgencyFilter("all");
              setLevelFilter("all");
              setStatusFilter("all");
              setGenderFilter("all");
              setDeptFilter("all");
              setEmpTypeFilter("all");
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-500">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {employees.length} records
        </span>
      </div>

      {/* Paybill header card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
            Paybill Generation
          </h3>
          <span className="text-[11px] text-slate-500">
            Financial Year <span className="font-semibold text-slate-700">{financialYear}</span>
            {"  ·  "}Month ID <span className="font-semibold text-slate-700">{monthId}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-y-1 border-b border-slate-200 bg-white px-4 py-3 text-xs md:grid-cols-2">
          {(() => {
            const effectiveAgencyCode =
              agencyFilter !== "all"
                ? agencyFilter
                : agencyCode;
            const effectiveAgencyName =
              agencyFilter !== "all"
                ? (agencies.find((a) => a.code === agencyFilter)?.name || departmentName)
                : departmentName;
            const paymentOrderAck = `PO-${monthId}-${effectiveAgencyCode}-AUTO`;
            return (
              <>
                <MetaRow label="Agency Code" value={effectiveAgencyCode} />
                <MetaRow label="Financial Year" value={financialYear} />
                <MetaRow label="Payroll Department Name / Organisation" value={effectiveAgencyName} />
                <MetaRow label="Month ID" value={monthId} />
                <MetaRow label="Payment Order — Acknowledgement" value={paymentOrderAck} />
              </>
            );
          })()}
        </div>

        {/* Paybill table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[11px]">
            <thead>
              {/* Section headers */}
              <tr className="bg-slate-100 text-center text-[10px] font-bold uppercase tracking-wide text-slate-700">
                <th rowSpan={3} className="border border-slate-300 px-2 py-1 align-bottom">SN</th>
                <th colSpan={10} className="border border-slate-300 px-2 py-1">Employee Details</th>
                <th colSpan={5} className="border border-slate-300 bg-emerald-50 px-2 py-1">Earnings</th>
                <th rowSpan={3} className="border border-slate-300 bg-rose-50 px-2 py-1 align-bottom">Total Deductions<br/><span className="font-mono text-[9px] text-slate-500">Y</span></th>
                <th rowSpan={3} className="border border-slate-300 bg-indigo-50 px-2 py-1 align-bottom">Net Pay<br/><span className="font-mono text-[9px] text-slate-500">Z = X − Y</span></th>
              </tr>
              <tr className="bg-slate-50 text-center text-[10px] font-semibold text-slate-700">
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">Name</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">Gender</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">EID</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">CID/WP</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">TPN</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">DoB</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">Date of Appointment</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">Date of Separation</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">Employee Type</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1">Position Level</th>
                <th colSpan={3} className="border border-slate-300 bg-emerald-100/60 px-2 py-1">Basic Earnings</th>
                <th className="border border-slate-300 bg-emerald-100/60 px-2 py-1">Allowances</th>
                <th className="border border-slate-300 bg-emerald-100/60 px-2 py-1">Total Earnings</th>
              </tr>
              <tr className="bg-slate-50 text-center text-[10px] font-mono text-slate-600">
                <th className="border border-slate-300 px-2 py-1">Basic Pay<br/><span className="text-slate-400">A</span></th>
                <th className="border border-slate-300 px-2 py-1">Arrears<br/><span className="text-slate-400">B</span></th>
                <th className="border border-slate-300 px-2 py-1">Partial Pay<br/><span className="text-slate-400">C</span></th>
                <th className="border border-slate-300 px-2 py-1">Total Allowances<br/><span className="text-slate-400">D</span></th>
                <th className="border border-slate-300 px-2 py-1">X = A+B+C+D</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="border border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                    No Civil Servant records in the current agency scope.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.e.id} className="hover:bg-slate-50/60">
                    <td className="border border-slate-200 px-2 py-1 text-center text-slate-600">{r.idx}</td>
                    <td className="border border-slate-200 px-2 py-1 font-semibold text-slate-900">{r.e.name}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center text-slate-600">{r.e.gender}</td>
                    <td className="border border-slate-200 px-2 py-1 font-mono text-slate-600">{r.e.eid}</td>
                    <td className="border border-slate-200 px-2 py-1 font-mono text-slate-600">{r.e.cid}</td>
                    <td className="border border-slate-200 px-2 py-1 font-mono text-slate-600">{r.e.tpn}</td>
                    <td className="border border-slate-200 px-2 py-1 text-slate-600">{r.e.dateOfBirth}</td>
                    <td className="border border-slate-200 px-2 py-1 text-slate-600">{r.e.dateOfEmployment}</td>
                    <td className="border border-slate-200 px-2 py-1 text-slate-500">{r.e.dateOfSeparation || "—"}</td>
                    <td className="border border-slate-200 px-2 py-1 text-center">
                      {(() => {
                        /* Dynamic Employee Type pill — value is sourced from
                           Master Data (payroll-employee-type) and stamped on
                           each seeded employee record.  Palette keys off the
                           stored string so new Master Data values render with
                           the fallback slate tone automatically. */
                        const t = (r.e.employeeType || "Regular").trim();
                        const shortLabel = /gsp/i.test(t)
                          ? "GSP / ESP"
                          : t.replace(/\s*\(.*\)\s*/g, "").trim();
                        const palette = /gsp|esp/i.test(t)
                          ? "bg-fuchsia-50 text-fuchsia-700"
                          : /consolidated/i.test(t)
                            ? "bg-indigo-50 text-indigo-700"
                            : /para-regular/i.test(t)
                              ? "bg-teal-50 text-teal-700"
                              : /contract/i.test(t)
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700";
                        return (
                          <span
                            title={t}
                            className={`inline-flex max-w-[150px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold ${palette}`}
                          >
                            {shortLabel}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="border border-slate-200 px-2 py-1 text-center font-bold text-slate-700">{r.e.positionLevel}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-800">{money(r.A)}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-500">{money(r.B)}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-500">{money(r.C)}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-800">{money(r.D)}</td>
                    <td className="border border-slate-200 bg-emerald-50/60 px-2 py-1 text-right font-mono font-bold text-emerald-800">{money(r.X)}</td>
                    <td className="border border-slate-200 bg-rose-50/60 px-2 py-1 text-right font-mono font-bold text-rose-700">{money(r.Y)}</td>
                    <td className="border border-slate-200 bg-indigo-50/60 px-2 py-1 text-right font-mono font-bold text-indigo-800">{money(r.Z)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                  <td colSpan={11} className="border border-slate-300 px-2 py-1 text-right">
                    Total Employees with Entitlements for this Payroll Department · {rows.length}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{money(tot.A)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{money(tot.B)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{money(tot.C)}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">{money(tot.D)}</td>
                  <td className="border border-slate-300 bg-emerald-100 px-2 py-1 text-right font-mono text-emerald-900">{money(tot.X)}</td>
                  <td className="border border-slate-300 bg-rose-100 px-2 py-1 text-right font-mono text-rose-800">{money(tot.Y)}</td>
                  <td className="border border-slate-300 bg-indigo-100 px-2 py-1 text-right font-mono text-indigo-900">{money(tot.Z)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="min-w-[14rem] font-semibold text-slate-600">{label}:</span>
      <span className="font-mono text-slate-900">{value}</span>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const sourceColorMap: Record<string, string> = {
    zest: "bg-teal-100 text-teal-700",
    manual: "bg-amber-100 text-amber-700",
    "excel-upload": "bg-sky-100 text-sky-700",
  };

  const sourceDisplayMap: Record<string, string> = {
    zest: "ZESt",
    manual: "Manual",
    "excel-upload": "Excel",
  };

  const displayName = sourceDisplayMap[source] || source;
  const colorClass = sourceColorMap[source] || "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colorClass}`}
    >
      {displayName}
    </span>
  );
}
