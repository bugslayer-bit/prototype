'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import { OPS_ALLOWANCES, OPS_DEDUCTIONS, type OpsAllowance, type OpsDeduction } from '../data/opsAllowances';
import { getTdsSlabEntries } from '../data/opsTdsSlab';
import { getOpsCategoriesForAgency } from '../data/opsPayScales';

/**
 * OpsAllowanceConfigPage — Allowance & Deduction Master Configuration
 * Payroll SRS PRN 1.2 compliance (OPS variant)
 *
 * Features:
 * - Tab view: Allowances & Deductions
 * - Summary cards (total counts)
 * - Searchable, expandable tables
 * - TDS Slab viewer
 * - Role-based editing
 */
export function OpsAllowanceConfigPage() {
  const auth = useAuth();
  const agency = resolveAgencyContext(auth.activeAgencyCode);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ───────────────────────────────────────────────────────────────────── */
  /* State Management                                                      */
  /* ───────────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'allowances' | 'deductions' | 'tds'>('allowances');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  /* Scope categories to the acting agency — MoF sees everything, other
     agencies see only their own OPS bucket. Keeps filters, summaries and
     dropdowns consistent when the top-bar persona switches. */
  const categories = useMemo(
    () => getOpsCategoriesForAgency(auth.activeAgencyCode),
    [auth.activeAgencyCode, auth.roleSwitchEpoch],
  );
  const tdsSlabs = getTdsSlabEntries();

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Filter and search                                           */
  /* ───────────────────────────────────────────────────────────────────── */
  const filteredAllowances = useMemo(() => {
    let filtered = OPS_ALLOWANCES;

    if (selectedCategoryFilter) {
      filtered = filtered.filter((a) =>
        a.applicableCategories.length === 0 ||
        a.applicableCategories.includes(selectedCategoryFilter)
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.ucoaCode.includes(q) ||
          a.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategoryFilter]);

  const filteredDeductions = useMemo(() => {
    let filtered = OPS_DEDUCTIONS;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.ucoaCode.includes(q) ||
          d.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [searchQuery]);

  /* ───────────────────────────────────────────────────────────────────── */
  /* Computed: Summary statistics                                          */
  /* ───────────────────────────────────────────────────────────────────── */
  const allowanceSummary = useMemo(() => {
    const active = OPS_ALLOWANCES.filter((a) => a.active).length;
    const total = OPS_ALLOWANCES.length;
    const recurring = OPS_ALLOWANCES.filter((a) => a.type === 'recurring').length;
    return { active, total, recurring };
  }, []);

  const deductionSummary = useMemo(() => {
    const mandatory = OPS_DEDUCTIONS.filter((d) => d.mandatory).length;
    const total = OPS_DEDUCTIONS.length;
    return { mandatory, total };
  }, []);

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

  const startEdit = (allowance: OpsAllowance) => {
    if (!caps.canConfigureRules) return;
    setEditingId(allowance.id);
    setEditValues({ ...allowance });
  };

  const saveEdit = (allowanceId: string) => {
    // In production, would call API
    setEditingId(null);
    setEditValues({});
    console.log(`[Toast] Allowance updated: ${allowanceId}`);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const getCalcMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'fixed': 'Fixed Amount',
      'pct-basic': '% of Basic',
      'pct-gross': '% of Gross',
      'slab': 'Slab-Based',
      'formula': 'Formula',
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
      'voluntary': 'Voluntary',
      'other': 'Other',
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            OPS Allowance & Deduction Configuration
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            Master Config
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Configure allowances, deductions, and tax slabs for OPS payroll processing
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-allowance-config" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">{caps.canConfigureRules ? "Config Admin" : "Read-Only"}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Allowance Configuration Access</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {activeTab === 'allowances' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Allowances"
            value={allowanceSummary.total}
            color="blue"
          />
          <SummaryCard
            label="Active"
            value={allowanceSummary.active}
            color="green"
          />
          <SummaryCard
            label="Recurring"
            value={allowanceSummary.recurring}
            color="purple"
          />
        </div>
      )}

      {activeTab === 'deductions' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SummaryCard
            label="Total Deductions"
            value={deductionSummary.total}
            color="blue"
          />
          <SummaryCard
            label="Mandatory"
            value={deductionSummary.mandatory}
            color="red"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm">
        <div className="flex border-b border-slate-200/80">
          {[
            { id: 'allowances', label: 'Allowances' },
            { id: 'deductions', label: 'Deductions' },
            { id: 'tds', label: 'TDS Slabs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4">
          {/* ALLOWANCES TAB */}
          {activeTab === 'allowances' && (
            <div className="space-y-4">
              {/* Search & Filter */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, UCoA code, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={selectedCategoryFilter || ''}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value || null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allowances Table */}
              <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">S.N</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Allowance Name</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">UCoA Code</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Type</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">Calc Method</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">Value/Rate</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {filteredAllowances.map((allowance, idx) => (
                      <React.Fragment key={allowance.id}>
                        <tr
                          onClick={() => toggleRow(allowance.id)}
                          className="hover:bg-slate-50/50 cursor-pointer transition"
                        >
                          <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {allowance.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {allowance.ucoaCode}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700">
                              {getTypeLabel(allowance.type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {getCalcMethodLabel(allowance.calcMethod)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            {allowance.calcMethod === 'fixed'
                              ? `Nu.${allowance.value.toLocaleString()}`
                              : allowance.calcMethod === 'pct-basic' || allowance.calcMethod === 'pct-gross'
                              ? `${allowance.value}%`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                allowance.active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {allowance.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {caps.canConfigureRules && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(allowance);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Row - Business Rule */}
                        {expandedRows.has(allowance.id) && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs font-bold text-slate-600 uppercase">
                                    Description
                                  </p>
                                  <p className="text-sm text-slate-700 mt-1">
                                    {allowance.description}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-600 uppercase">
                                    Business Rule
                                  </p>
                                  <p className="text-sm text-slate-700 mt-1 italic">
                                    {allowance.businessRule}
                                  </p>
                                </div>
                                {allowance.applicableCategories.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase">
                                      Applicable Categories
                                    </p>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                      {allowance.applicableCategories.map((catId) => {
                                        const cat = categories.find((c) => c.id === catId);
                                        return cat ? (
                                          <span
                                            key={catId}
                                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700"
                                          >
                                            {cat.name}
                                          </span>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                )}
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

          {/* DEDUCTIONS TAB */}
          {activeTab === 'deductions' && (
            <div className="space-y-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search by name, UCoA code, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Deductions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDeductions.map((deduction) => (
                  <div
                    key={deduction.id}
                    className={`rounded-lg border p-4 ${
                      deduction.mandatory
                        ? 'border-red-200/50 bg-red-50/50'
                        : 'border-slate-200/50 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-slate-900">{deduction.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {deduction.ucoaCode}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                          deduction.mandatory
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {deduction.mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Category:</span>
                        <span className="font-semibold text-slate-900">
                          {getCategoryLabel(deduction.category)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Calc Method:</span>
                        <span className="font-semibold text-slate-900">
                          {getCalcMethodLabel(deduction.calcMethod)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Value:</span>
                        <span className="font-semibold text-slate-900 font-mono">
                          {deduction.calcMethod === 'fixed'
                            ? `Nu.${deduction.value.toLocaleString()}`
                            : `${deduction.value}%`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Remit To:</span>
                        <span className="font-semibold text-slate-900 text-sm">
                          {deduction.remitTo}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TDS SLABS TAB */}
          {activeTab === 'tds' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                Tax Deducted at Source (TDS) Slab Configuration for OPS employees
              </p>

              <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-900">
                        Salary Range
                      </th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">
                        From
                      </th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">
                        To
                      </th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">
                        TDS Amount
                      </th>
                      <th className="px-4 py-3 text-right font-bold text-slate-900">
                        Effective Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {tdsSlabs.map((slab, idx) => {
                      const effectiveRate = slab.tds > 0 ? ((slab.tds / ((slab.to + slab.from) / 2)) * 100).toFixed(2) : "0";
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-600">Range {idx + 1}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            Nu.{slab.from.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900">
                            Nu.{slab.to.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-red-700">
                            Nu.{slab.tds.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">
                            {effectiveRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-200/50 rounded-lg p-4">
                <p className="text-sm font-bold text-blue-900">ℹ TDS Computation</p>
                <p className="text-xs text-blue-700 mt-2">
                  TDS is computed based on gross salary falling within each slab range. The calculation follows progressive taxation principles defined in the Payroll SRS.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 1.2 — OPS Allowance & Deduction Configuration
        </p>
        <p className="mt-1">
          All allowances and deductions are configured per OPS Pay Structure Reform Act 2022
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
  color: "blue" | "green" | "purple" | "red";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
    purple: "border-purple-200/50 bg-purple-50/50 text-purple-900",
    red: "border-red-200/50 bg-red-50/50 text-red-900",
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
