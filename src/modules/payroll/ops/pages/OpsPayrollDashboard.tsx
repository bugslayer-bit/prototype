/* ═══════════════════════════════════════════════════════════════════════════
   OPS Payroll Module Dashboard
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — OPS Landing Page
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useMemo } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import { OPS_EMPLOYEES, getOpsEmployeesByCategory } from '../data/opsEmployeeSeed';
import { getOpsCategoriesForAgency, isCentralPayrollAgency } from '../data/opsPayScales';

/* ───────────────────────────────────────────────────────────────────────────
   Types & Constants
   ─────────────────────────────────────────────────────────────────────────── */

interface RecentActivity {
  id: string;
  type: 'payroll' | 'allowance' | 'advance' | 'travel' | 'muster';
  action: string;
  timestamp: string;
  user: string;
  status: 'completed' | 'pending' | 'failed';
}

const SAMPLE_ACTIVITIES: RecentActivity[] = [
  {
    id: '1',
    type: 'payroll',
    action: 'March 2026 OPS Payroll Generated',
    timestamp: '2026-04-01T10:30:00',
    user: 'Admin Officer',
    status: 'completed',
  },
  {
    id: '2',
    type: 'advance',
    action: 'Salary Advance Processed - 5 employees',
    timestamp: '2026-03-28T14:15:00',
    user: 'Finance Officer',
    status: 'completed',
  },
  {
    id: '3',
    type: 'travel',
    action: 'Travel Claim TRV-2026-002 Approved',
    timestamp: '2026-03-25T11:45:00',
    user: 'Approver',
    status: 'completed',
  },
  {
    id: '4',
    type: 'allowance',
    action: 'Dearness Allowance Updated',
    timestamp: '2026-03-20T09:20:00',
    user: 'Config Admin',
    status: 'completed',
  },
  {
    id: '5',
    type: 'muster',
    action: 'Muster Roll Payment Generated - 45 beneficiaries',
    timestamp: '2026-03-15T16:00:00',
    user: 'Muster Officer',
    status: 'completed',
  },
];

const QUICK_ACTIONS = [
  { id: 'registry', label: 'Employee Registry', href: '/payroll/ops/employee-registry', icon: '👤' },
  { id: 'generation', label: 'Payroll Generation', href: '/payroll/ops/payroll-generation', icon: '📊' },
  { id: 'allowance', label: 'Allowance Config', href: '/payroll/ops/allowance-config', icon: '⚙️' },
  { id: 'advance', label: 'Salary Advance', href: '/payroll/ops/salary-advance', icon: '💰' },
  { id: 'travel', label: 'Travel Claims', href: '/payroll/ops/travel-claim', icon: '✈️' },
  { id: 'muster', label: 'Muster Roll', href: '/payroll/ops/muster-roll', icon: '📋' },
  { id: 'sitting', label: 'Sitting Fee & Honorarium', href: '/payroll/ops/sitting-fee-honorarium', icon: '🎖️' },
  { id: 'schedule', label: 'Schedule Config', href: '/payroll/ops/schedule-config', icon: '📅' },
];

export function OpsPayrollDashboard() {
  const auth = useAuth();
  const { activeAgencyCode, roleSwitchEpoch } = auth;
  const context = resolveAgencyContext(auth.activeRoleId);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);
  const isCentral = isCentralPayrollAgency(activeAgencyCode);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Computed Stats — scoped to the acting agency.
     MoF (central) sees the full OPS picture; every other agency sees
     only the employees/categories that belong to them. Recomputes on
     every persona switch via roleSwitchEpoch so the cards stay dynamic. */
  /* ─────────────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const categories = getOpsCategoriesForAgency(activeAgencyCode);
    const allowedCategoryIds = new Set(categories.map((c) => c.id));

    const scopedEmployees = isCentral
      ? OPS_EMPLOYEES
      : OPS_EMPLOYEES.filter(
          (e) =>
            /* Either the row's working agency matches, or — for rows that
               never carried an agency code — fall back to category match. */
            e.workingAgency === activeAgencyCode ||
            (!!e.employeeCategory && allowedCategoryIds.has(e.employeeCategory)),
        );

    const totalEmployees = scopedEmployees.length;
    const monthlyPayrollTotal = scopedEmployees.reduce(
      (sum, e) => sum + e.monthlyBasicPay,
      0,
    );
    const categoryBreakdown = categories.map((cat) => ({
      name: cat.name,
      count: scopedEmployees.filter((e) => e.employeeCategory === cat.id).length,
    }));

    // Sample metrics — real wiring follows in a later iteration.
    const pendingAdvances = isCentral ? 8 : Math.max(1, Math.floor(totalEmployees / 6));
    const activeMusterPrograms = isCentral ? 2 : 1;

    return {
      totalEmployees,
      monthlyPayrollTotal,
      categoryBreakdown,
      pendingAdvances,
      activeMusterPrograms,
    };
  }, [activeAgencyCode, isCentral, roleSwitchEpoch]);

  /* Payment Calendar - Next 3 months */
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const payments = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 28);
      payments.push({
        month: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        date: date.toLocaleDateString(),
      });
    }
    return payments;
  }, []);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Render */
  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur shadow-sm p-6 border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome to OPS Payroll Management
            </h1>
            <p className="text-slate-600 mt-2">
              {context?.agency.name || activeAgencyCode} — Manage payroll, advances, and allowances for Other Public Servants
            </p>
          </div>
          <div className="hidden md:block text-5xl opacity-20">📊</div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
            Payroll SRS v1.1
          </span>
          <span className="text-sm text-slate-600">
            {caps.isReadOnly ? '👁️ Read-Only Access' : '✏️ Full Edit Access'}
          </span>
        </div>
      </div>

      <ModuleActorBanner moduleKey="ops-payroll-dashboard" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">
                {caps.isReadOnly ? "View-Only User" : "Payroll Administrator"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">OPS Payroll Module Access</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {caps.canManageEmployees && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700">
                Manage Employees
              </span>
            )}
            {caps.canInitiate && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">
                Process Payroll
              </span>
            )}
            {caps.canApprove && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700">
                Approve
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total OPS Employees"
          value={stats.totalEmployees}
          color="blue"
          icon="👥"
        />
        <SummaryCard
          label="Monthly Payroll"
          value={`Nu.${Math.round(stats.monthlyPayrollTotal / 1000)}K`}
          color="green"
          icon="💵"
        />
        <SummaryCard
          label="Pending Advances"
          value={stats.pendingAdvances}
          color="amber"
          icon="⏳"
        />
        <SummaryCard
          label="Active Muster Programs"
          value={stats.activeMusterPrograms}
          color="purple"
          icon="📦"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(action => (
            <a
              key={action.id}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/50 hover:border-blue-300 hover:bg-blue-50/50 transition group cursor-pointer"
            >
              <span className="text-2xl group-hover:scale-110 transition">{action.icon}</span>
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                {action.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Employee Distribution by Category</h2>

          <div className="space-y-3">
            {stats.categoryBreakdown.map((cat, idx) => {
              const percentage = (cat.count / stats.totalEmployees) * 100;
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500'];
              const color = colors[idx % colors.length];

              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    <span className="text-sm font-bold text-slate-900">
                      {cat.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/50 overflow-hidden">
                    <div
                      className={`h-full ${color} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Summary */}
          <div className="border-t border-slate-200/50 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Total Employees</span>
              <span className="text-2xl font-bold text-slate-900">{stats.totalEmployees}</span>
            </div>
          </div>
        </div>

        {/* Payment Calendar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Upcoming Paydays</h2>

          <div className="space-y-3">
            {upcomingPayments.map((payment, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/50 bg-slate-50/50 hover:bg-blue-50/50 transition"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{payment.month}</p>
                  <p className="text-xs text-slate-600">Payment Date: {payment.date}</p>
                </div>
                <div className="text-2xl">📅</div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200/50 pt-4 mt-4">
            <a
              href="/payroll/ops/schedule-config"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Full Schedule →
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
          <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All →
          </a>
        </div>

        <div className="space-y-3">
          {SAMPLE_ACTIVITIES.map(activity => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 rounded-lg border border-slate-200/50 hover:bg-slate-50/50 transition"
            >
              {/* Type Icon */}
              <div className="flex-shrink-0 text-xl">
                {activity.type === 'payroll' && '📊'}
                {activity.type === 'allowance' && '⚙️'}
                {activity.type === 'advance' && '💰'}
                {activity.type === 'travel' && '✈️'}
                {activity.type === 'muster' && '📋'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-600">{activity.user}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">
                    {new Date(activity.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activity.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : activity.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Status */}
        <div className="rounded-2xl border border-green-200/50 bg-green-50/50 p-6">
          <p className="text-sm font-bold text-green-900 mb-2">✓ System Status</p>
          <p className="text-sm text-green-800">
            All OPS payroll systems operational. Interface sync (RBP HRMS · Judiciary HRIS · Parliament HR · RUB HRIS · LG Portals) and MCP posting active. OPS runs independently of ZESt.
          </p>
          <a href="#" className="text-sm text-green-700 hover:text-green-800 font-medium mt-3 inline-block">
            System Health Dashboard →
          </a>
        </div>

        {/* Helpful Resources */}
        <div className="rounded-2xl border border-blue-200/50 bg-blue-50/50 p-6">
          <p className="text-sm font-bold text-blue-900 mb-2">ℹ️ Help & Resources</p>
          <p className="text-sm text-blue-800">
            Need help? Check the SRS documentation or contact the payroll support team.
          </p>
          <a href="#" className="text-sm text-blue-700 hover:text-blue-800 font-medium mt-3 inline-block">
            SRS Documentation →
          </a>
        </div>
      </div>

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500 space-y-1">
        <p>
          SRS Reference: Payroll SRS v1.1 — OPS Payroll Module Dashboard
        </p>
        <p>
          All OPS payroll processes managed through this integrated platform: Employee Management, Payroll Generation,
          Allowances & Deductions, Salary Advances, Travel Claims, Muster Rolls, Sitting Fees & Honorariums, Schedule Configuration
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
  icon,
}: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "amber" | "purple";
  icon: string;
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
    amber: "border-amber-200/50 bg-amber-50/50 text-amber-900",
    purple: "border-purple-200/50 bg-purple-50/50 text-purple-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
