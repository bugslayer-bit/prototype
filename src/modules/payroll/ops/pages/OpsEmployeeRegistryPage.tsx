/* ═══════════════════════════════════════════════════════════════════════════
   OPS Employee Registry Page — Payroll Module
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — Other Public Servants (OPS) Pay Management
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../../shared/data/agencyPersonas";
import { ModuleActorBanner } from "../../../../shared/components/ModuleActorBanner";
import { useOpsRoleCapabilities, opsPayrollToneClasses } from "../state/useOpsRoleCapabilities";
import type { OpsEmployee } from "../data/opsEmployeeSeed";
import { OPS_EMPLOYEES, getOpsEmployeesByCategory } from "../data/opsEmployeeSeed";
import { getOpsCategoriesForAgency } from "../data/opsPayScales";

/* ───────────────────────────────────────────────────────────────────────────
   Detail Panel Component — Shows full employee profile across 5 tabs
   ─────────────────────────────────────────────────────────────────────────── */

interface DetailPanelProps {
  employee: OpsEmployee | null;
  onClose: () => void;
}

function DetailPanel({ employee, onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "personal" | "employment" | "salary" | "bank" | "statutory"
  >("personal");

  if (!employee) return null;

  // Helper to get full name (backward compatible)
  const getFullName = (emp: OpsEmployee = employee) => {
    const parts = [
      emp.firstName,
      emp.middleName,
      emp.lastName
    ].filter(Boolean);
    return parts.join(" ");
  };

  // Helper to compute deduction details from actual deductions array
  const getDeductionDetails = () => {
    const deductions: Array<{ name: string; amount: number; remitTo: string }> = [];

    if ("deductions" in employee && Array.isArray((employee as any).deductions)) {
      (employee as any).deductions.forEach((d: any) => {
        let remitTo = "";
        if (d.name.includes("Provident Fund")) remitTo = "NPPF";
        else if (d.name.includes("Group Insurance")) remitTo = "RICBL";
        else if (d.name.includes("Health")) remitTo = "DRC";
        else if (d.name.includes("Tax")) remitTo = "DRC";
        else remitTo = "Government";

        deductions.push({ name: d.name, amount: d.amount, remitTo });
      });
    }
    return deductions;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {getFullName()}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              EID: {employee.eid} • CID: {employee.cid}
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
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "personal" && (
            <div className="space-y-3">
              <DetailRow label="Master EmpID" value={employee.masterEmpId} />
              <DetailRow label="EID" value={employee.eid} />
              <DetailRow
                label="Full Name"
                value={`${employee.firstName}${employee.middleName ? ' ' + employee.middleName : ''} ${employee.lastName}`}
              />
              <DetailRow label="CID" value={employee.cid} />
              <DetailRow label="TPN" value={employee.tpn} />
              <DetailRow label="Date of Birth" value={employee.dateOfBirth} />
              <DetailRow label="Gender" value={employee.gender} />
              <DetailRow label="Nationality" value={employee.nationality} />
              <DetailRow label="Work Permit" value={employee.workPermit || "N/A"} />
              <DetailRow label="Email" value={employee.emailId} />
              <DetailRow label="Mobile Number" value={employee.mobileNumber} />
            </div>
          )}

          {activeTab === "employment" && (
            <div className="space-y-3">
              <DetailRow label="Employee Category" value={employee.employeeCategory} />
              <DetailRow label="Employee Type" value={employee.employeeType} />
              <DetailRow label="Position Title" value={employee.positionTitle} />
              <DetailRow label="Designation" value={employee.designation} />
              <DetailRow label="Position Level" value={employee.positionLevel} />
              <DetailRow label="Pay Scale ID" value={employee.payScaleId} />
              <DetailRow label="Working Agency" value={employee.workingAgency} />
              <DetailRow label="Organization Segment" value={employee.organizationSegment} />
              <DetailRow label="Appointment Date" value={employee.appointmentDate} />
              {employee.incrementDate && (
                <DetailRow label="Increment Date" value={employee.incrementDate} />
              )}
              <DetailRow label="Joining Date" value={employee.joiningDate} />
              <DetailRow label="Superannuation Date" value={employee.superannuationDate} />
              <DetailRow label="Contract End Date" value={employee.contractEndDate} />
              <DetailRow label="Source" value={employee.source} />
              <DetailRow label="Status" value={employee.status} />
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
                    label="Monthly Basic Pay"
                    value={`Nu.${employee.monthlyBasicPay.toLocaleString()}`}
                  />
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-2">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Allowances
                </p>
                <div className="space-y-1 text-sm">
                  {("allowances" in employee && Array.isArray((employee as any).allowances) && (employee as any).allowances.length > 0) ? (
                    (employee as any).allowances.map((a: any) => (
                      <div
                        key={a.name}
                        className="flex justify-between items-center py-1 px-2 bg-slate-50/50 rounded"
                      >
                        <span className="text-slate-700">{a.name}</span>
                        <span className="font-semibold text-slate-900">
                          Nu.{a.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs">No allowances defined</p>
                  )}
                  {("grossPay" in employee && (employee as any).grossPay) && (
                    <div className="flex justify-between items-center py-1 px-2 font-bold text-slate-900 border-t border-slate-200">
                      <span>Gross Pay</span>
                      <span>Nu.{((employee as any).grossPay as number).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-2">
                <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                  Deductions
                </p>
                <div className="space-y-1 text-sm">
                  {("deductions" in employee && Array.isArray((employee as any).deductions) && (employee as any).deductions.length > 0) ? (
                    (employee as any).deductions.map((d: any) => (
                      <div
                        key={d.name}
                        className="flex justify-between items-center py-1 px-2 bg-red-50/50 rounded"
                      >
                        <span className="text-slate-700">{d.name}</span>
                        <span className="font-semibold text-red-700">
                          Nu.{d.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs">No deductions defined</p>
                  )}
                  {("netPay" in employee && (employee as any).netPay) && (
                    <div className="flex justify-between items-center py-1 px-2 font-bold text-slate-900 border-t border-slate-200">
                      <span>Net Pay</span>
                      <span className="text-green-700">
                        Nu.{((employee as any).netPay as number).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "bank" && (
            <div className="space-y-3">
              <DetailRow label="Bank Name" value={employee.bankName || "N/A"} />
              <DetailRow label="Account Number" value={employee.bankAccountNumber || "N/A"} />
              <DetailRow label="Bank Branch" value={employee.bankBranch || "N/A"} />
              <p className="text-xs font-bold text-slate-600 mb-2 uppercase mt-4">
                Statutory Accounts
              </p>
              <DetailRow label="PF Account No" value={employee.pfAccountNo || "N/A"} />
              <DetailRow label="GIS Account No" value={employee.gisAccountNo || "N/A"} />
            </div>
          )}

          {activeTab === "statutory" && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600 mb-2 uppercase">
                Eligibility & Exemptions
              </p>
              <DetailRow label="PF Eligible" value={employee.pfEligible} />
              <DetailRow label="GIS Eligible" value={employee.gisEligible} />
              <DetailRow label="Tax Exempted" value={employee.isTaxExempted} />
              {employee.taxExemptionReason && (
                <DetailRow label="Tax Exemption Reason" value={employee.taxExemptionReason} />
              )}
              <DetailRow label="Health Contribution Exempted" value={employee.isHealthContributionExempted} />
              <DetailRow label="CSWS Member" value={employee.isCswsMember} />

              <p className="text-xs font-bold text-slate-600 mb-2 uppercase mt-4">
                Deduction Details
              </p>
              <div className="space-y-2">
                {getDeductionDetails().map((d) => (
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
   Main OPS Employee Registry Page Component
   ─────────────────────────────────────────────────────────────────────────── */

export function OpsEmployeeRegistryPage() {
  const auth = useAuth();
  const { activeAgencyCode } = auth;
  const context = resolveAgencyContext(auth.activeRoleId);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OpsEmployee | null>(
    null
  );
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  /* Agency-scoped categories: MoF sees everything, every other agency
     sees only its own OPS bucket. Re-memoised on persona switch. */
  const categories = useMemo(
    () => getOpsCategoriesForAgency(activeAgencyCode),
    [activeAgencyCode, auth.roleSwitchEpoch],
  );

  /* Filter employees by agency and category */
  const filteredEmployees = useMemo(() => {
    let employees = OPS_EMPLOYEES;

    /* Agency filter: canManageEmployees sees all, others see their agency only */
    if (!caps.canManageEmployees) {
      employees = employees.filter(
        (e) => e.workingAgency === activeAgencyCode
      );
    }

    /* Category filter */
    if (selectedCategory) {
      employees = employees.filter(
        (e) => e.employeeCategory === selectedCategory
      );
    }

    /* Search filter: Name, EID, CID */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const getFullName = (e: OpsEmployee) => {
        return `${e.firstName}${e.middleName ? ' ' + e.middleName : ''} ${e.lastName}`;
      };
      employees = employees.filter(
        (e) =>
          getFullName(e).toLowerCase().includes(q) ||
          e.eid.toLowerCase().includes(q) ||
          e.cid.toLowerCase().includes(q)
      );
    }

    return employees;
  }, [activeAgencyCode, caps.canManageEmployees, selectedCategory, searchQuery]);

  /* Summary stats for agency */
  const summary = useMemo(() => {
    const total = filteredEmployees.length;
    const totalGross = filteredEmployees.reduce(
      (sum, e) => sum + ((e as any).grossSalary || e.monthlyBasicPay * 1.15),
      0
    );
    const totalNet = filteredEmployees.reduce((sum, e) => sum + ((e as any).netSalary || e.monthlyBasicPay * 0.85), 0);
    const active = filteredEmployees.filter((e) => e.status === "active").length;
    return { total, totalGross, totalNet, active };
  }, [filteredEmployees]);

  /* OPS Data Import — pulls from the Interfacing systems (RBP HRMS,
     Judiciary HRIS, Parliament HR, RUB HRIS, LG Portals, NA/NC Secretariat).
     OPS has NO relation to ZESt and does NOT depend on CSIS. */
  const handleManualImport = async () => {
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSyncing(false);
    const now = new Date();
    const timeString = now.toLocaleString();
    setLastSyncTime(timeString);
    console.log(`[Toast] Interface sync complete — ${OPS_EMPLOYEES.length} OPS employees updated`);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            OPS Employee Registry
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            Payroll SRS v1.1 — OPS
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Manage Other Public Servants employees and their compensation across{" "}
          {context?.agency.name || activeAgencyCode}
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-employee-master" />

      {/* ── Persona Banner ── */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">{caps.isReadOnly ? "Read-Only User" : "Payroll Officer"}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">OPS Payroll Management Access</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {caps.canManageEmployees && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700">Can Manage</span>
            )}
            {caps.canExport && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">Can Export</span>
            )}
          </div>
        </div>
      </div>

      {/* Data Source Notice — OPS is self-contained, NOT tied to ZESt or CSIS */}
      <div className="rounded-xl border border-purple-200/60 bg-purple-50/50 p-3 flex items-center gap-3">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">i</span>
        <div>
          <p className="text-sm font-semibold text-purple-900">Data Source: Interfacing Systems · Manual Entry · Bulk Upload</p>
          <p className="text-xs text-purple-700/70 mt-0.5">
            OPS employees are managed independently of ZESt. Records pull from OPS source systems
            (RBP HRMS, Judiciary HRIS, Parliament HR, RUB HRIS, LG Portals, NA/NC Secretariat) or
            are entered directly via Manual Entry / Bulk Upload. ZESt synchronisation is
            <span className="font-bold"> not applicable</span> to Other Public Servants.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Employees"
          value={summary.total}
          color="blue"
        />
        <SummaryCard
          label="Active"
          value={summary.active}
          color="green"
        />
        <SummaryCard
          label="Total Gross Pay"
          value={`Nu.${summary.totalGross.toLocaleString()}`}
          color="purple"
        />
        <SummaryCard
          label="Total Net Pay"
          value={`Nu.${summary.totalNet.toLocaleString()}`}
          color="cyan"
        />
      </div>

      {/* Search & Filter Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by Name, EID, or CID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium transition">
            Filter
          </button>
          <button
            onClick={() => console.log('[OPS] Add employee — open modal')}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition whitespace-nowrap"
          >
            + Add Employee
          </button>
          <button
            onClick={() => console.log('[OPS] Bulk upload — open file picker')}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition whitespace-nowrap"
          >
            ⬆ Bulk Upload
          </button>
          <button
            onClick={handleManualImport}
            disabled={syncing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              syncing
                ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {syncing ? 'Syncing...' : 'Sync from Interface'}
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
              selectedCategory === null
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {lastSyncTime && (
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
              ✓ Last interface sync: {lastSyncTime}
            </span>
          </div>
        )}
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3 text-left font-bold text-slate-900">
                  EID
                </th>
                <th className="px-6 py-3 text-left font-bold text-slate-900">
                  Name
                </th>
                <th className="px-6 py-3 text-left font-bold text-slate-900">
                  Category
                </th>
                <th className="px-6 py-3 text-left font-bold text-slate-900">
                  Position
                </th>
                <th className="px-6 py-3 text-left font-bold text-slate-900">
                  Designation
                </th>
                <th className="px-6 py-3 text-left font-bold text-slate-900">
                  Agency
                </th>
                <th className="px-6 py-3 text-right font-bold text-slate-900">
                  Basic Pay
                </th>
                <th className="px-6 py-3 text-center font-bold text-slate-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <p className="text-slate-500">
                      No OPS employees found matching your criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const getFullName = (emp?: any) => {
                    const e = emp || employee;
                    if ("name" in e && e.name) {
                      return String(e.name);
                    }
                    return `${e.firstName || ""}${e.middleName ? " " + e.middleName : ""} ${e.lastName || ""}`.trim();
                  };

                  return (
                    <tr
                      key={employee.masterEmpId}
                      onClick={() => setSelectedEmployee(employee)}
                      className="hover:bg-slate-50/50 cursor-pointer transition"
                    >
                      <td className="px-6 py-4 text-slate-600 font-mono">{employee.eid}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {getFullName(employee)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{employee.employeeCategory}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {employee.positionTitle}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {employee.designation}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {employee.workingAgency}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-900">
                        Nu.{employee.monthlyBasicPay.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={employee.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Data Source */}
        <div className="border-t border-slate-200/80 bg-slate-50/50 px-6 py-3 flex justify-between items-center text-xs text-slate-600">
          <div>
            Showing {filteredEmployees.length} of {OPS_EMPLOYEES.length} OPS employees
          </div>
          <div className="flex items-center gap-2">
            <span>Data Source:</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
              Interface / Manual / Bulk
            </span>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 1.1 — OPS Payroll Management
        </p>
        <p className="mt-1">
          Pay scales and allowances derived from OPS Pay Structure Reform Act 2022, Pay
          Revision 2023
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
  color: "blue" | "green" | "purple" | "cyan";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
    purple: "border-purple-200/50 bg-purple-50/50 text-purple-900",
    cyan: "border-cyan-200/50 bg-cyan-50/50 text-cyan-900",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${colorClasses[color]}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">
        {label}
      </p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    "on-leave": "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
    separated: "bg-slate-100 text-slate-700",
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

function SourceBadge({ source }: { source: string }) {
  /* OPS sources — Interfacing systems, Manual Entry, Bulk Upload.
     ZESt and CSIS are NOT applicable to Other Public Servants. */
  const sourceColorMap: Record<string, string> = {
    interface: "bg-purple-100 text-purple-700",
    csis: "bg-purple-100 text-purple-700",
    manual: "bg-blue-100 text-blue-700",
    "excel-upload": "bg-sky-100 text-sky-700",
    zest: "bg-slate-100 text-slate-500",
  };

  const sourceDisplayMap: Record<string, string> = {
    interface: "Interface",
    csis: "Interface",
    manual: "Manual",
    "excel-upload": "Bulk Upload",
    zest: "N/A",
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
