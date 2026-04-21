'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../shared/data/agencyPersonas';
import type { Allowance, AllowanceFrequency, Deduction } from '../types';
import { ALLOWANCES, DEDUCTIONS } from '../state/payrollSeed';
import { usePayrollRoleCapabilities, payrollToneClasses } from '../state/usePayrollRoleCapabilities';
import { PayrollGroupSiblingNav } from '../shared/navigation/PayrollSubNav';
import { useAgencyUrl } from '../../../shared/hooks/useAgencyUrl';
import { usePayrollScope, scopeAllows } from '../../../shared/utils/payrollScope';

/**
 * AllowanceConfigPage — Allowance & Deduction Master Configuration
 * Payroll SRS PRN 1.2 compliance
 *
 * Features:
 * - Tab view: Allowances & Deductions
 * - Summary cards (total counts)
 * - Searchable, expandable tables
 * - SRS note about ZESt system fetch and UCoA mapping
 */
export function AllowanceConfigPage() {
  const auth = useAuth();
  const agency = resolveAgencyContext(auth.activeAgencyCode);
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useAgencyUrl();

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  /* ── Persona-driven scope: CS-only, OPS-only, or both ──────────────── */
  const scope = usePayrollScope();
  const showCivil = scopeAllows(scope, 'civil-servant');
  const showOps = scopeAllows(scope, 'other-public-servant');

  const [activeTab, setActiveTab] = useState<'allowances' | 'deductions'>('allowances');
  /* Default sub-tab: when the persona can only see one stream we pre-select
     that stream so OPS deductions never leak into a CS-only view (and vice
     versa). When both are allowed we show the "All" roll-up. */
  const [deductionSubTab, setDeductionSubTab] = useState<'all' | 'civil-servant' | 'ops'>(
    showCivil && showOps ? 'all' : showCivil ? 'civil-servant' : 'ops',
  );

  /* Keep sub-tab aligned with the active persona when the user swaps roles
     from the top bar (e.g., CS Finance → OPS Finance). */
  React.useEffect(() => {
    if (deductionSubTab === 'ops' && !showOps) setDeductionSubTab(showCivil ? 'civil-servant' : 'all');
    else if (deductionSubTab === 'civil-servant' && !showCivil) setDeductionSubTab(showOps ? 'ops' : 'all');
    else if (deductionSubTab === 'all' && !(showCivil && showOps)) {
      setDeductionSubTab(showCivil ? 'civil-servant' : 'ops');
    }
  }, [showCivil, showOps, deductionSubTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [localAllowances, setLocalAllowances] = useState(ALLOWANCES);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAllowance, setNewAllowance] = useState({
    name: '',
    ucoaCode: '',
    type: 'recurring' as const,
    frequency: 'monthly',
    calcMethod: 'fixed' as const,
    value: 0,
    active: true,
  });

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filter and search                                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const filteredAllowances = useMemo(() => {
    return localAllowances.filter((a) => {
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.ucoaCode.includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, localAllowances]);

  const filteredDeductions = useMemo(() => {
    return DEDUCTIONS.filter((d) => {
      /* Persona scope guard — never leak OPS deductions into a CS-only
         view, and never leak CS deductions into an OPS-only view. */
      if (!showOps && d.applicableTo === 'ops') return false;
      if (!showCivil && d.applicableTo === 'civil-servant') return false;
      /* Sub-tab filter: "all" shows everything; "civil-servant" shows statutory+CS; "ops" shows statutory+OPS */
      if (deductionSubTab === 'civil-servant' && d.applicableTo === 'ops') return false;
      if (deductionSubTab === 'ops' && d.applicableTo === 'civil-servant') return false;
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ucoaCode.includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, deductionSubTab, showCivil, showOps]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Summary statistics                                          */
  /* ───────────────────────────────────────────────────────────────────── */
  const allowanceSummary = useMemo(() => {
    const active = ALLOWANCES.filter((a) => a.active).length;
    const total = ALLOWANCES.length;
    return { active, total };
  }, []);

  const deductionSummary = useMemo(() => {
    /* Respect persona scope — if the user is inside the CS channel, the
       summary must not count OPS-only deductions (and vice versa). */
    const visible = DEDUCTIONS.filter((d) => {
      if (!showOps && d.applicableTo === 'ops') return false;
      if (!showCivil && d.applicableTo === 'civil-servant') return false;
      return true;
    });
    const mandatory = visible.filter((d) => d.mandatory).length;
    const total = visible.length;
    return { mandatory, total };
  }, [showCivil, showOps]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Toast notification (local)                                            */
  /* ───────────────────────────────────────────────────────────────────── */
  const showToast = (message: string) => {
    console.log(`[Toast] ${message}`);
    // In a real implementation, integrate with toast library
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Handlers                                                              */
  /* ───────────────────────────────────────────────────────────────────── */
  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const getCalcMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'fixed': 'Fixed Amount',
      'pct-basic': '% of Basic',
      'pct-gross': '% of Gross',
      'slab': 'Slab-Based',
      'schedule': 'Schedule',
    };
    return labels[method] || method;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'recurring': 'Recurring',
      'one-time': 'One-time',
      'conditional': 'Conditional',
    };
    return labels[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'statutory': 'Statutory',
      'floating': 'Floating',
      'recovery': 'Recovery',
    };
    return labels[category] || category;
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Edit Handlers                                                         */
  /* ───────────────────────────────────────────────────────────────────── */
  const startEdit = (allowance: Allowance) => {
    setEditingId(allowance.id);
    setEditValues({ ...allowance });
  };

  const saveEdit = (allowanceId: string) => {
    const updated = localAllowances.map((a) =>
      a.id === allowanceId ? { ...a, ...editValues } : a
    );
    setLocalAllowances(updated);
    setEditingId(null);
    setEditValues({});
    showToast('Changes saved (local only — API integration pending)');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  /* ───────────────────────────────────────────────────────────────────── */
  /* Add New Allowance Handler                                             */
  /* ───────────────────────────────────────────────────────────────────── */
  const handleAddAllowance = () => {
    const newId = `ALW-${String(localAllowances.length + 1).padStart(3, '0')}`;
    const allowance: Allowance = {
      id: newId,
      ...newAllowance,
      frequency: newAllowance.frequency as AllowanceFrequency,
      applicableLevels: [],
      applicableAgencies: [],
    };
    setLocalAllowances([...localAllowances, allowance]);
    setShowAddForm(false);
    setNewAllowance({
      name: '',
      ucoaCode: '',
      type: 'recurring',
      frequency: 'monthly',
      calcMethod: 'fixed',
      value: 0,
      active: true,
    });
    showToast('New allowance added successfully');
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Render                                                                  */
  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb + Back/Forward controls */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={buildPath("/")} className="hover:text-indigo-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Payroll</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Payroll Management</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/employee-registry")} className="hover:text-indigo-600 font-semibold">👥 Employee Master</Link>
          <span>/</span>
          <span className="font-bold text-indigo-700">Allowance Configuration</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
          >
            Forward →
          </button>
          <button
            type="button"
            onClick={() => navigate(buildPath("/payroll/management"))}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100"
          >
            ⬆ Payroll Management
          </button>
        </div>
      </nav>

      {/* Sibling navigation — Employee Master group peers */}
      <PayrollGroupSiblingNav
        category={showCivil ? 'civil-servant' : 'other-public-servant'}
        currentPath={location.pathname}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Allowance & Deduction Configuration</h1>
          <p className="mt-1 text-sm text-slate-600">Payroll SRS PRN 1.2 — Master UCoA Mapping</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
          PRN 1.2
        </span>
      </div>

      {/* ── Persona Banner ── */}
      <div className={`rounded-xl border ${tone.border} ${tone.bg} p-4`}>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Active Allowances</div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">{allowanceSummary.active}</div>
          <div className="mt-1 text-xs text-slate-500">of {allowanceSummary.total} total</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Allowances</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{allowanceSummary.total}</div>
          <div className="mt-1 text-xs text-slate-500">configured in system</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Mandatory Deductions</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{deductionSummary.mandatory}</div>
          <div className="mt-1 text-xs text-slate-500">of {deductionSummary.total} total</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total Deductions</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{deductionSummary.total}</div>
          <div className="mt-1 text-xs text-slate-500">configured in system</div>
        </div>
      </div>

      {/* SRS Note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex gap-3">
          <div className="mt-1 text-lg">⚠️</div>
          <div>
            <p className="text-sm font-medium text-amber-900">SRS Note — ZESt Integration</p>
            <p className="mt-1 text-xs text-amber-800">
              System fetches allowance and deduction master from ZESt through MCP API. UCoA code mapping is maintained in the Accounting Integration layer. Changes to active status, calculation method, or applicable levels require DRC/MOF approval and ZESt sync.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input & Add Button */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by name, UCoA code, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        {caps.canConfigureRules && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
          >
            + Add Allowance
          </button>
        )}
      </div>

      {/* Add New Allowance Form Modal */}
      {showAddForm && caps.canConfigureRules && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Allowance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={newAllowance.name}
              onChange={(e) => setNewAllowance({ ...newAllowance, name: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <input
              type="text"
              placeholder="UCoA Code"
              value={newAllowance.ucoaCode}
              onChange={(e) => setNewAllowance({ ...newAllowance, ucoaCode: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <select
              value={newAllowance.type}
              onChange={(e) => setNewAllowance({ ...newAllowance, type: e.target.value as any })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="recurring">Recurring</option>
              <option value="one-time">One-time</option>
              <option value="conditional">Conditional</option>
            </select>
            <input
              type="text"
              placeholder="Frequency"
              value={newAllowance.frequency}
              onChange={(e) => setNewAllowance({ ...newAllowance, frequency: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <select
              value={newAllowance.calcMethod}
              onChange={(e) => setNewAllowance({ ...newAllowance, calcMethod: e.target.value as any })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="fixed">Fixed</option>
              <option value="pct-basic">% of Basic</option>
              <option value="slab">Slab-Based</option>
            </select>
            <input
              type="number"
              placeholder="Value"
              value={newAllowance.value}
              onChange={(e) => setNewAllowance({ ...newAllowance, value: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newAllowance.active}
                onChange={(e) => setNewAllowance({ ...newAllowance, active: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddAllowance}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
            >
              Save
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('allowances')}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'allowances'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Allowances ({filteredAllowances.length})
        </button>
        <button
          onClick={() => setActiveTab('deductions')}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'deductions'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Deductions ({filteredDeductions.length})
        </button>
      </div>

      {/* Allowances Table */}
      {activeTab === 'allowances' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-900"></th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">UCoA Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Calc Method</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Value</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Frequency</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Active</th>
                {caps.canConfigureRules && <th className="px-4 py-3 text-center font-semibold text-slate-900">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAllowances.map((allowance) => (
                <React.Fragment key={allowance.id}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                    <td
                      className="px-4 py-3 text-center"
                      onClick={() => toggleRow(allowance.id)}
                    >
                      <span className="text-slate-400">
                        {expandedRows.has(allowance.id) ? '▼' : '▶'}
                      </span>
                    </td>
                    {editingId === allowance.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editValues.ucoaCode || allowance.ucoaCode}
                            onChange={(e) => setEditValues({ ...editValues, ucoaCode: e.target.value })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editValues.name || allowance.name}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editValues.type || allowance.type}
                            onChange={(e) => setEditValues({ ...editValues, type: e.target.value })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="recurring">Recurring</option>
                            <option value="one-time">One-time</option>
                            <option value="conditional">Conditional</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editValues.calcMethod || allowance.calcMethod}
                            onChange={(e) => setEditValues({ ...editValues, calcMethod: e.target.value })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="fixed">Fixed</option>
                            <option value="pct-basic">% of Basic</option>
                            <option value="pct-gross">% of Gross</option>
                            <option value="slab">Slab</option>
                            <option value="schedule">Schedule</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editValues.value !== undefined ? editValues.value : allowance.value}
                            onChange={(e) => setEditValues({ ...editValues, value: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editValues.frequency || allowance.frequency}
                            onChange={(e) => setEditValues({ ...editValues, frequency: e.target.value })}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={editValues.active !== undefined ? editValues.active : allowance.active}
                              onChange={(e) => setEditValues({ ...editValues, active: e.target.checked })}
                            />
                          </label>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600">{allowance.ucoaCode}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{allowance.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
                            {getTypeLabel(allowance.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{getCalcMethodLabel(allowance.calcMethod)}</td>
                        <td className="px-4 py-3 font-mono text-slate-900">
                          {allowance.value}
                          {allowance.calcMethod === 'pct-basic' || (allowance.calcMethod as string) === 'pct-gross' ? '%' : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{allowance.frequency}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex h-5 w-9 items-center rounded-full transition ${
                              allowance.active ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                          >
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition" style={{
                              marginLeft: allowance.active ? '16px' : '2px',
                            }} />
                          </span>
                        </td>
                      </>
                    )}
                    {caps.canConfigureRules && (
                      <td className="px-4 py-3 text-center">
                        {editingId === allowance.id ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => saveEdit(allowance.id)}
                              className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-2 py-1 rounded bg-slate-400 hover:bg-slate-500 text-white text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(allowance)}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  {expandedRows.has(allowance.id) && (
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td colSpan={caps.canConfigureRules ? 9 : 8} className="px-4 py-3">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Applicable Levels</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {allowance.applicableLevels.length === 0 ? (
                                <span className="text-xs text-slate-500">All levels</span>
                              ) : (
                                allowance.applicableLevels.map((level) => (
                                  <span key={level} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                    {level}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Applicable Agencies</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {allowance.applicableAgencies.length === 0 ? (
                                <span className="text-xs text-slate-500">All agencies</span>
                              ) : (
                                allowance.applicableAgencies.map((agency) => (
                                  <span key={agency} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                                    Agency {agency}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deductions Table */}
      {activeTab === 'deductions' && (
        <div className="space-y-4">
          {/* Sub-tabs: All / Civil Servant / OPS — only the tabs the
              active persona's scope permits are rendered. An OPS persona
              will never see the Civil Servant or All-deductions tabs (and
              vice versa). */}
          <div className="flex items-center gap-2">
            {(([
              { key: 'all', label: 'All Deductions', count: DEDUCTIONS.length, show: showCivil && showOps },
              { key: 'civil-servant', label: 'Civil Servant', count: DEDUCTIONS.filter(d => d.applicableTo === 'both' || d.applicableTo === 'civil-servant').length, show: showCivil },
              { key: 'ops', label: 'Other Public Servant (OPS)', count: DEDUCTIONS.filter(d => d.applicableTo === 'both' || d.applicableTo === 'ops').length, show: showOps },
            ] as const).filter((t) => t.show)).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDeductionSubTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  deductionSubTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">UCoA Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Applies To</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Calc Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Value</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Mandatory</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Remit To</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeductions.map((deduction) => (
                  <tr key={deduction.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{deduction.ucoaCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{deduction.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          backgroundColor: deduction.category === 'statutory' ? '#ef2f2f20' : deduction.category === 'floating' ? '#f59e0b20' : '#8b5cf620',
                          color: deduction.category === 'statutory' ? '#dc2626' : deduction.category === 'floating' ? '#d97706' : '#7c3aed',
                        }}
                      >
                        {getCategoryLabel(deduction.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        deduction.applicableTo === 'both' ? 'bg-emerald-100 text-emerald-700'
                          : deduction.applicableTo === 'civil-servant' ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {deduction.applicableTo === 'both' ? 'CS & OPS' : deduction.applicableTo === 'civil-servant' ? 'Civil Servant' : 'OPS'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{getCalcMethodLabel(deduction.calcMethod)}</td>
                    <td className="px-4 py-3 font-mono text-slate-900">
                      {deduction.value}
                      {deduction.calcMethod.includes('pct') ? '%' : ''}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex h-5 w-9 items-center rounded-full transition ${
                          deduction.mandatory ? 'bg-rose-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition" style={{
                          marginLeft: deduction.mandatory ? '16px' : '2px',
                        }} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{deduction.remitTo}</td>
                  </tr>
                ))}
                {filteredDeductions.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No deductions match the current filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
