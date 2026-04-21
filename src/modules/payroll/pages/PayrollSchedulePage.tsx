'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../shared/data/agencyPersonas';
import { usePayrollRoleCapabilities, payrollToneClasses } from '../state/usePayrollRoleCapabilities';
import { PayrollGroupSiblingNav } from '../shared/navigation/PayrollSubNav';
import { useAgencyUrl } from '../../../shared/hooks/useAgencyUrl';

/**
 * PayrollSchedulePage — Payroll Schedule Configuration (PRN 2.0)
 *
 * Features:
 * - Holiday Master (Bhutan 2026 holidays)
 * - Working days calculation
 * - Schedule Configuration form
 * - Annual payroll calendar with auto-computed dates
 * - SRS note about last 3 working days logic
 * - Notification preferences
 */
export function PayrollSchedulePage() {
  const auth = useAuth();
  const agency = resolveAgencyContext(auth.activeAgencyCode);
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const [payrollGenDay, setPayrollGenDay] = useState(25);
  const [payDisbursementDay, setPayDisbursementDay] = useState(27);
  const [zestUpdateDeadline, setZestUpdateDeadline] = useState(24);
  const [cycleType, setCycleType] = useState<'monthly' | 'fortnightly'>('monthly');
  const [notifyHR, setNotifyHR] = useState(true);
  const [notifyFinance, setNotifyFinance] = useState(true);
  const [notifyAgencies, setNotifyAgencies] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Load saved schedule from localStorage on mount                        */
  /* ───────────────────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const savedSchedule = localStorage.getItem('ifmis_payroll_schedule');
    if (savedSchedule) {
      try {
        const config = JSON.parse(savedSchedule);
        if (config.payrollGenDay) setPayrollGenDay(config.payrollGenDay);
        if (config.payDisbursementDay) setPayDisbursementDay(config.payDisbursementDay);
        if (config.zestUpdateDeadline) setZestUpdateDeadline(config.zestUpdateDeadline);
        if (config.cycleType) setCycleType(config.cycleType);
        if (config.notifyHR !== undefined) setNotifyHR(config.notifyHR);
        if (config.notifyFinance !== undefined) setNotifyFinance(config.notifyFinance);
        if (config.notifyAgencies !== undefined) setNotifyAgencies(config.notifyAgencies);
      } catch (error) {
        console.error('Failed to load saved schedule:', error);
      }
    }
  }, []);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handlers: Save, Reset, Toast                                          */
  /* ───────────────────────────────────────────────────────────────────── */
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = () => {
    const scheduleConfig = {
      payrollGenDay,
      payDisbursementDay,
      zestUpdateDeadline,
      cycleType,
      notifyHR,
      notifyFinance,
      notifyAgencies,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('ifmis_payroll_schedule', JSON.stringify(scheduleConfig));
    showToast('Schedule saved successfully');
  };

  const handleReset = () => {
    setPayrollGenDay(25);
    setPayDisbursementDay(27);
    setZestUpdateDeadline(24);
    setCycleType('monthly');
    setNotifyHR(true);
    setNotifyFinance(true);
    setNotifyAgencies(true);
    localStorage.removeItem('ifmis_payroll_schedule');
    showToast('Schedule reset to defaults');
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Holiday Master Data (Bhutan 2026)                                    */
  /* ───────────────────────────────────────────────────────────────────── */
  const holidays = [
    { date: '2026-02-18', name: 'Losar', type: 'Religious', status: 'active' },
    { date: '2026-02-19', name: 'Losar', type: 'Religious', status: 'active' },
    { date: '2026-02-21', name: "Birthday of His Majesty", type: 'Government', status: 'active' },
    { date: '2026-02-22', name: "Birthday of His Majesty", type: 'Government', status: 'active' },
    { date: '2026-04-11', name: 'Zhabdrung Kuchoe', type: 'Religious', status: 'active' },
    { date: '2026-09-22', name: 'Blessed Rainy Day', type: 'Religious', status: 'active' },
    { date: '2026-11-01', name: 'Coronation Day', type: 'Government', status: 'active' },
    { date: '2026-12-17', name: 'National Day', type: 'Government', status: 'active' },
  ];

  /* ───────────────────────────────────────────────────────────────────── */
  /* Helper: Calculate working days in a month                             */
  /* ───────────────────────────────────────────────────────────────────── */
  const getWorkingDaysInMonth = (year: number, month: number): number => {
    let count = 0;
    const monthStr = String(month).padStart(2, '0');
    const holidaySet = new Set(
      holidays
        .filter((h) => h.status === 'active')
        .map((h) => h.date)
    );

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        count++;
      }
    }
    return count;
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Helper: Get last 3 working days of month                             */
  /* ───────────────────────────────────────────────────────────────────── */
  const getLastWorkingDays = (year: number, month: number): string[] => {
    const dates: string[] = [];
    const monthStr = String(month).padStart(2, '0');
    const holidaySet = new Set(
      holidays
        .filter((h) => h.status === 'active')
        .map((h) => h.date)
    );

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = daysInMonth; day >= 1; day--) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        dates.unshift(dateStr);
        if (dates.length === 3) break;
      }
    }
    return dates;
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Annual payroll schedule                                    */
  /* ───────────────────────────────────────────────────────────────────── */
  const annualSchedule = useMemo(() => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return months.map((monthName, idx) => {
      const month = idx + 1;
      const lastWorkingDays = getLastWorkingDays(2026, month);
      const zestDeadlineDate = new Date(2026, month - 1, zestUpdateDeadline);
      const genDate = new Date(2026, month - 1, payrollGenDay);
      const disbDate = new Date(2026, month - 1, payDisbursementDay);

      return {
        month: monthName,
        monthNum: month,
        workingDays: getWorkingDaysInMonth(2026, month),
        zestUpdateDeadline: `2026-${String(month).padStart(2, '0')}-${String(zestUpdateDeadline).padStart(2, '0')}`,
        generationDate: `2026-${String(month).padStart(2, '0')}-${String(payrollGenDay).padStart(2, '0')}`,
        disbursementDate: `2026-${String(month).padStart(2, '0')}-${String(payDisbursementDay).padStart(2, '0')}`,
        lastWorkingDays,
      };
    });
  }, [payrollGenDay, payDisbursementDay, zestUpdateDeadline]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Summary: Holiday and working day stats                               */
  /* ───────────────────────────────────────────────────────────────────── */
  const summary = useMemo(() => {
    const totalWorkingDays = annualSchedule.reduce((sum, m) => sum + m.workingDays, 0);
    const activeHolidays = holidays.filter((h) => h.status === 'active').length;
    return {
      totalWorkingDays,
      activeHolidays,
      totalHolidays: holidays.length,
    };
  }, [annualSchedule]);

  const getHolidayColor = (type: string) => {
    return type === 'Government' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render                                                                  */
  /* ═══════════════════════════════════════════════════════════════════════ */
  const location = useLocation();
  const { buildPath } = useAgencyUrl();
  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <Link to={buildPath("/")} className="hover:text-indigo-600 hover:underline">Home</Link>
        <span className="opacity-50">›</span>
        <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 hover:underline">Payroll</Link>
        <span className="opacity-50">›</span>
        <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 hover:underline">Payroll Management</Link>
        <span className="opacity-50">›</span>
        <span className="font-semibold text-slate-700">⚙️ Payroll Processing</span>
        <span className="opacity-50">›</span>
        <span className="font-bold text-indigo-700">Payroll Schedule</span>
      </nav>

      {/* Sibling nav — peer links for Payroll Processing */}
      <PayrollGroupSiblingNav category="civil-servant" currentPath={location.pathname} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll Schedule Configuration</h1>
          <p className="mt-1 text-sm text-slate-600">Payroll SRS PRN 2.0 — Annual Calendar & Holiday Master</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
          PRN 2.0
        </span>
      </div>

      {/* ── Persona Banner ── */}
      <div className={`rounded-xl border ${tone.border} ${tone.bg} p-4 mb-4`}>
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

      {/* SRS Note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex gap-3">
          <div className="mt-1 text-lg">⚠️</div>
          <div>
            <p className="text-sm font-medium text-amber-900">SRS Note — Data Freeze & ZESt Sync</p>
            <p className="mt-1 text-xs text-amber-800">
              System should not accept employee or salary detail updates after the last 3 working days of the month. This ensures data integrity before ZESt sync and MCP posting. The ZESt Update Deadline is automatically calculated as the first day of the deadlines range.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Working Days (2026)</div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">{summary.totalWorkingDays}</div>
          <div className="mt-1 text-xs text-slate-500">excluding weekends and holidays</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Active Holidays</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{summary.activeHolidays}</div>
          <div className="mt-1 text-xs text-slate-500">of {summary.totalHolidays} total</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Payroll Frequency</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 capitalize">{cycleType}</div>
          <div className="mt-1 text-xs text-slate-500">cycle type</div>
        </div>
      </div>

      {/* Holiday Master */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900">Holiday Master (Bhutan 2026)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Holiday Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Type</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.date} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {new Date(holiday.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{holiday.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getHolidayColor(holiday.type)}`}>
                      {holiday.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-5 w-9 items-center rounded-full bg-emerald-600">
                      <span className="inline-block h-4 w-4 rounded-full bg-white ml-4" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Configuration Form */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900">Schedule Configuration</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
              Payroll Generation Day (1-28)
            </label>
            <input
              type="number"
              min="1"
              max="28"
              value={payrollGenDay}
              onChange={(e) => setPayrollGenDay(Math.min(28, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">Day of month to generate payroll data</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
              Pay Disbursement Day (1-28)
            </label>
            <input
              type="number"
              min="1"
              max="28"
              value={payDisbursementDay}
              onChange={(e) => setPayDisbursementDay(Math.min(28, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">Day of month for salary disbursement</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
              ZESt Update Deadline (1-28)
            </label>
            <input
              type="number"
              min="1"
              max="28"
              value={zestUpdateDeadline}
              onChange={(e) => setZestUpdateDeadline(Math.min(28, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">Last day to update ZESt before sync</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
              Payroll Cycle Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cycle"
                  value="monthly"
                  checked={cycleType === 'monthly'}
                  onChange={(e) => setCycleType(e.target.value as 'monthly' | 'fortnightly')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-900">Monthly</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cycle"
                  value="fortnightly"
                  checked={cycleType === 'fortnightly'}
                  onChange={(e) => setCycleType(e.target.value as 'monthly' | 'fortnightly')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-900">Fortnightly</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={notifyHR}
              onChange={(e) => setNotifyHR(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Notify HR Team</p>
              <p className="text-xs text-slate-500">Send notifications to HR personnel on payroll events</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={notifyFinance}
              onChange={(e) => setNotifyFinance(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Notify Finance Team</p>
              <p className="text-xs text-slate-500">Send notifications to finance/accounts personnel</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={notifyAgencies}
              onChange={(e) => setNotifyAgencies(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">Notify Agencies</p>
              <p className="text-xs text-slate-500">Send schedule updates to all government agencies</p>
            </div>
          </label>
        </div>
      </div>

      {/* Annual Payroll Calendar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900">Annual Payroll Calendar 2026</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Month</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">Working Days</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">ZESt Update Deadline</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Payroll Generation</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Disbursement</th>
              </tr>
            </thead>
            <tbody>
              {annualSchedule.map((schedule) => (
                <tr key={schedule.month} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{schedule.month}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600">{schedule.workingDays}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 rounded-lg bg-amber-50 text-amber-900 font-mono text-xs">
                      {new Date(schedule.zestUpdateDeadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 rounded-lg bg-blue-50 text-blue-900 font-mono text-xs">
                      {new Date(schedule.generationDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-mono text-xs">
                      {new Date(schedule.disbursementDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Last Working Days Note */}
        <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">Last 3 Working Days (Data Freeze)</p>
          <div className="grid gap-4 md:grid-cols-6">
            {annualSchedule.slice(0, 6).map((schedule) => (
              <div key={`${schedule.month}-last`} className="text-xs">
                <p className="font-semibold text-slate-900 mb-2">{schedule.month}</p>
                <div className="space-y-1">
                  {schedule.lastWorkingDays.map((date) => (
                    <div key={date} className="text-slate-600 font-mono">
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-6 mt-4">
            {annualSchedule.slice(6, 12).map((schedule) => (
              <div key={`${schedule.month}-last`} className="text-xs">
                <p className="font-semibold text-slate-900 mb-2">{schedule.month}</p>
                <div className="space-y-1">
                  {schedule.lastWorkingDays.map((date) => (
                    <div key={date} className="text-slate-600 font-mono">
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!caps.canManageSchedule}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
            caps.canManageSchedule
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          Save Configuration
        </button>
        <button
          onClick={handleReset}
          disabled={!caps.canManageSchedule}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
            caps.canManageSchedule
              ? 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          Reset to Default
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-pulse">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
