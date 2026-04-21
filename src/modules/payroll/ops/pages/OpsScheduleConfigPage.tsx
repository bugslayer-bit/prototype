/* ═══════════════════════════════════════════════════════════════════════════
   OPS Payroll Schedule Configuration Page
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — OPS Schedule & Holiday Management
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

interface Holiday {
  date: string;
  name: string;
  type: 'government' | 'public' | 'weekend';
}

interface PayrollScheduleEntry {
  month: number;
  monthName: string;
  paymentDate: string;
  cutoffDate: string;
  workingDays: number;
  generationLevel: 'office' | 'agency' | 'position' | 'employment-type';
}

interface OpsPaySchedule {
  payGenerationDay: number;
  payDisbursementDay: number;
  payUpdateDeadline: string;
  holidayCalendar: string;
  freezeDate: string;
  status: 'draft' | 'active' | 'archived';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const GENERATION_LEVELS = [
  { value: 'office', label: 'Office Level' },
  { value: 'agency', label: 'Agency Level' },
  { value: 'position', label: 'Position Level' },
  { value: 'employment-type', label: 'Employment Type Level' },
];

export function OpsScheduleConfigPage() {
  const { activeAgencyCode } = useAuth();
  const context = resolveAgencyContext(useAuth().activeRoleId);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* State Management */
  /* ─────────────────────────────────────────────────────────────────────── */
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([
    { date: '2026-02-21', name: 'National Day', type: 'government' },
    { date: '2026-04-15', name: 'Buddha Jayanti', type: 'government' },
  ]);
  const [payrollSchedule, setPayrollSchedule] = useState<PayrollScheduleEntry[]>(
    MONTHS.map((monthName, idx) => ({
      month: idx + 1,
      monthName,
      paymentDate: `${selectedYear}-${String(idx + 1).padStart(2, '0')}-28`,
      cutoffDate: `${selectedYear}-${String(idx + 1).padStart(2, '0')}-20`,
      workingDays: 22,
      generationLevel: 'agency' as const,
    }))
  );
  const [opsPaySchedule, setOpsPaySchedule] = useState<OpsPaySchedule>({
    payGenerationDay: 20,
    payDisbursementDay: 28,
    payUpdateDeadline: `${selectedYear}-${String(selectedYear % 12 === 0 ? 12 : selectedYear % 12).padStart(2, '0')}-15`,
    holidayCalendar: `HolidayCalendar-${selectedYear}`,
    freezeDate: `${selectedYear}-${String((selectedYear % 12) + 1).padStart(2, '0')}-01`,
    status: 'draft' as const,
  });
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'government' as const });
  const [approvalStatus, setApprovalStatus] = useState<'draft' | 'submitted' | 'approved'>('draft');
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Computed Stats */
  /* ─────────────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalHolidays = holidays.filter(h => h.type !== 'weekend').length;
    const weekends = holidays.filter(h => h.type === 'weekend').length;
    const configuredPaymentDates = payrollSchedule.filter(p => p.paymentDate).length;
    return { totalHolidays, weekends, configuredPaymentDates };
  }, [holidays, payrollSchedule]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Holiday Calendar by Month */
  /* ─────────────────────────────────────────────────────────────────────── */
  const holidaysByMonth = useMemo(() => {
    const map: Record<number, Holiday[]> = {};
    MONTHS.forEach((_, idx) => map[idx + 1] = []);
    holidays.forEach(h => {
      const parts = h.date.split('-');
      if (parts[0] === String(selectedYear)) {
        const month = parseInt(parts[1]);
        if (month in map) map[month].push(h);
      }
    });
    return map;
  }, [holidays, selectedYear]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Handlers */
  /* ─────────────────────────────────────────────────────────────────────── */
  const handleAddHoliday = useCallback(() => {
    if (!newHoliday.date || !newHoliday.name.trim()) return;
    setHolidays([...holidays, { ...newHoliday }]);
    setNewHoliday({ date: '', name: '', type: 'government' });
    setShowHolidayForm(false);
  }, [newHoliday, holidays]);

  const handleDeleteHoliday = useCallback((date: string) => {
    setHolidays(holidays.filter(h => h.date !== date));
  }, [holidays]);

  const handleUpdateScheduleEntry = useCallback(
    (month: number, field: string, value: any) => {
      setPayrollSchedule(
        payrollSchedule.map(entry =>
          entry.month === month ? { ...entry, [field]: value } : entry
        )
      );
    },
    [payrollSchedule]
  );

  const handleSaveConfiguration = useCallback(() => {
    // Persist to localStorage
    const config = { holidays, payrollSchedule, opsPaySchedule, selectedYear, approvalStatus };
    localStorage.setItem('opsScheduleConfig', JSON.stringify(config));
    console.log('[Toast] Schedule configuration saved');
  }, [holidays, payrollSchedule, opsPaySchedule, selectedYear, approvalStatus]);

  const handleSubmitForApproval = useCallback(() => {
    setApprovalStatus('submitted');
    console.log('[Toast] Schedule submitted for DTA approval');
  }, []);

  const handleApprove = useCallback(() => {
    setApprovalStatus('approved');
    console.log('[Toast] Schedule approved by DTA');
    console.log('[Action] Notifying HR, Finance, and agencies...');
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            Payroll Schedule Configuration
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            SRS PRN 1.3 — Schedule
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Configure annual holiday master, payroll schedule, and payment dates for OPS
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-schedule-config" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">
                {caps.isReadOnly ? "Read-Only User" : "Schedule Manager"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Schedule Configuration Access</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            approvalStatus === 'approved'
              ? 'bg-green-100 text-green-700'
              : approvalStatus === 'submitted'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {approvalStatus}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Holidays" value={stats.totalHolidays} color="red" />
        <SummaryCard label="Weekends" value={stats.weekends} color="slate" />
        <SummaryCard label="Payment Dates" value={stats.configuredPaymentDates} color="blue" />
        <SummaryCard label="Year" value={selectedYear} color="purple" />
      </div>

      {/* Year Selector */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
        <label className="block text-sm font-bold text-slate-900 mb-2">
          Financial Year
        </label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          disabled={approvalStatus === 'approved'}
          className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {[currentYear - 1, currentYear, currentYear + 1].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Payroll Schedule Configuration — DDi 4.0-6.0 */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Payroll Schedule Configuration (DDi 4-6.0)</h2>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
            {approvalStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pay Generation Day (DDi 4.1) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Pay Generation Day (DDi 4.1)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={opsPaySchedule.payGenerationDay}
              onChange={(e) =>
                setOpsPaySchedule({
                  ...opsPaySchedule,
                  payGenerationDay: parseInt(e.target.value) || 1,
                })
              }
              disabled={caps.isReadOnly || approvalStatus === 'approved'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">Day of month payroll is generated</p>
          </div>

          {/* Pay Disbursement Day (DDi 4.2) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Pay Disbursement Day (DDi 4.2)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={opsPaySchedule.payDisbursementDay}
              onChange={(e) =>
                setOpsPaySchedule({
                  ...opsPaySchedule,
                  payDisbursementDay: parseInt(e.target.value) || 1,
                })
              }
              disabled={caps.isReadOnly || approvalStatus === 'approved'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">Day of month pay is disbursed</p>
          </div>

          {/* Pay Update Deadline (DDi 4.3) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Pay Update Deadline (DDi 4.3)
            </label>
            <input
              type="date"
              value={opsPaySchedule.payUpdateDeadline}
              onChange={(e) =>
                setOpsPaySchedule({
                  ...opsPaySchedule,
                  payUpdateDeadline: e.target.value,
                })
              }
              disabled={caps.isReadOnly || approvalStatus === 'approved'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">Deadline for payroll data updates</p>
          </div>

          {/* Holiday Calendar Reference (DDi 5.1) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Holiday Calendar (DDi 5.1)
            </label>
            <input
              type="text"
              value={opsPaySchedule.holidayCalendar}
              onChange={(e) =>
                setOpsPaySchedule({
                  ...opsPaySchedule,
                  holidayCalendar: e.target.value,
                })
              }
              disabled={caps.isReadOnly || approvalStatus === 'approved'}
              placeholder="e.g., HolidayCalendar-2026"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">Holiday reference identifier</p>
          </div>

          {/* Data Freeze Date (DDi 6.1) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Data Freeze Date (DDi 6.1)
            </label>
            <input
              type="date"
              value={opsPaySchedule.freezeDate}
              onChange={(e) =>
                setOpsPaySchedule({
                  ...opsPaySchedule,
                  freezeDate: e.target.value,
                })
              }
              disabled={caps.isReadOnly || approvalStatus === 'approved'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
            />
            <p className="text-xs text-slate-500 mt-1">Data freeze effective date</p>
          </div>

          {/* Schedule Status (DDi 6.2) */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Schedule Status (DDi 6.2)
            </label>
            <select
              value={opsPaySchedule.status}
              onChange={(e) =>
                setOpsPaySchedule({
                  ...opsPaySchedule,
                  status: e.target.value as 'draft' | 'active' | 'archived',
                })
              }
              disabled={caps.isReadOnly || approvalStatus === 'approved'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Current schedule status</p>
          </div>
        </div>
      </div>

      {/* Holiday Calendar Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Holiday Master</h2>
          {!caps.isReadOnly && (
            <button
              onClick={() => setShowHolidayForm(!showHolidayForm)}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition"
            >
              {showHolidayForm ? 'Cancel' : '+ Add Holiday'}
            </button>
          )}
        </div>

        {/* Add Holiday Form */}
        {showHolidayForm && !caps.isReadOnly && (
          <div className="border border-slate-200/50 rounded-lg p-4 bg-slate-50/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="e.g., National Day"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Type</label>
                <select
                  value={newHoliday.type}
                  onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="government">Government Holiday</option>
                  <option value="public">Public Holiday</option>
                  <option value="weekend">Weekend</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleAddHoliday}
              className="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
            >
              Add Holiday
            </button>
          </div>
        )}

        {/* Holiday Grid by Month */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MONTHS.map((monthName, idx) => {
            const monthNum = idx + 1;
            const monthHolidays = holidaysByMonth[monthNum] || [];
            return (
              <div
                key={monthName}
                className="rounded-lg border border-slate-200/50 bg-slate-50/50 p-4"
              >
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  {monthName} {selectedYear}
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {monthHolidays.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No holidays</p>
                  ) : (
                    monthHolidays.map(holiday => (
                      <div
                        key={holiday.date}
                        className="flex items-start justify-between p-2 bg-white rounded border border-slate-200/50"
                      >
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-900">
                            {holiday.name}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {new Date(holiday.date).toLocaleDateString()}
                          </p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold mt-1 ${
                            holiday.type === 'government'
                              ? 'bg-blue-100 text-blue-700'
                              : holiday.type === 'public'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {holiday.type}
                          </span>
                        </div>
                        {!caps.isReadOnly && (
                          <button
                            onClick={() => handleDeleteHoliday(holiday.date)}
                            className="text-red-500 hover:text-red-700 font-bold text-lg ml-2"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payroll Schedule Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Monthly Payroll Schedule</h2>

        <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-900">Month</th>
                <th className="px-4 py-3 text-left font-bold text-slate-900">Cutoff Date</th>
                <th className="px-4 py-3 text-left font-bold text-slate-900">Payment Date</th>
                <th className="px-4 py-3 text-center font-bold text-slate-900">Working Days</th>
                <th className="px-4 py-3 text-left font-bold text-slate-900">Generation Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {payrollSchedule.map(entry => (
                <tr key={entry.month} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {entry.monthName}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={entry.cutoffDate}
                      onChange={(e) =>
                        handleUpdateScheduleEntry(entry.month, 'cutoffDate', e.target.value)
                      }
                      disabled={caps.isReadOnly || approvalStatus === 'approved'}
                      className="px-2 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={entry.paymentDate}
                      onChange={(e) =>
                        handleUpdateScheduleEntry(entry.month, 'paymentDate', e.target.value)
                      }
                      disabled={caps.isReadOnly || approvalStatus === 'approved'}
                      className="px-2 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      value={entry.workingDays}
                      onChange={(e) =>
                        handleUpdateScheduleEntry(entry.month, 'workingDays', parseInt(e.target.value))
                      }
                      disabled={caps.isReadOnly || approvalStatus === 'approved'}
                      className="w-16 px-2 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100 text-center"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={entry.generationLevel}
                      onChange={(e) =>
                        handleUpdateScheduleEntry(entry.month, 'generationLevel', e.target.value)
                      }
                      disabled={caps.isReadOnly || approvalStatus === 'approved'}
                      className="px-2 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      {GENERATION_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {!caps.isReadOnly && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleSaveConfiguration}
            disabled={approvalStatus === 'approved'}
            className="px-6 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium transition disabled:opacity-50"
          >
            Save Configuration
          </button>
          {approvalStatus === 'draft' && (
            <button
              onClick={handleSubmitForApproval}
              className="px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition"
            >
              Submit for Approval
            </button>
          )}
          {approvalStatus === 'submitted' && caps.canApprove && (
            <button
              onClick={handleApprove}
              className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
            >
              Approve Schedule
            </button>
          )}
        </div>
      )}

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 1.3 — Payroll Schedule Configuration
        </p>
        <p className="mt-1">
          Annual Holiday Master, Payment Date Configuration, and Generation Level Selection
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
  color: "blue" | "red" | "slate" | "purple";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    red: "border-red-200/50 bg-red-50/50 text-red-900",
    slate: "border-slate-200/50 bg-slate-50/50 text-slate-900",
    purple: "border-purple-200/50 bg-purple-50/50 text-purple-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
