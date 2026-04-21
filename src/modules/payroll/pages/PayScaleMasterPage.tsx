'use client';

/**
 * PayScaleMasterPage — DDi 3.x
 *
 * Dynamic, searchable master view of the Government of Bhutan pay scales:
 *   • Civil Service levels (from CIVIL_SERVICE_PAY_SCALE — SRS v1 / ZESt LoV)
 *   • Other Public Servant categories (OPS_CATEGORIES — SRS v1)
 *
 * All values are pulled live from the shared seed modules so the page stays
 * consistent with Employee Registry, HR Actions, and Payroll Generation.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAgencyUrl } from '../../../shared/hooks/useAgencyUrl';
import { useAuth } from '../../../shared/context/AuthContext';
import { PayrollGroupSiblingNav } from '../shared/navigation/PayrollSubNav';
import { CIVIL_SERVICE_PAY_SCALE, type PayScaleEntry } from '../shared/payScale/civilServicePayScale';
import { OPS_CATEGORIES, type OpsCategory, type OpsPayScaleEntry } from '../ops/data/opsPayScales';
import { usePayrollRoleCapabilities, payrollToneClasses } from '../state/usePayrollRoleCapabilities';
import { PayrollPersonaBanner } from '../shared/components/PayrollPersonaBanner';
import { usePayrollScope, scopeAllows } from '../../../shared/utils/payrollScope';

const nu = (n: number) =>
  n === 0 ? '—' : `Nu ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/* ── OPS pay-scale overrides (admin / HR may edit OPS rows; CS is ZESt-fed) ─ */
const OPS_OVERRIDES_KEY = 'ifmis_ops_payscale_overrides_v1';
type OpsOverride = { minPay: number; increment: number; maxPay: number; notes?: string };
type OpsOverrideMap = Record<string, OpsOverride>; // key = `${categoryId}::${positionTitle}`

function loadOpsOverrides(): OpsOverrideMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(OPS_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as OpsOverrideMap) : {};
  } catch {
    return {};
  }
}
function saveOpsOverrides(m: OpsOverrideMap) {
  try { window.localStorage.setItem(OPS_OVERRIDES_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}
function opsKey(categoryId: string, positionTitle: string) {
  return `${categoryId}::${positionTitle}`;
}

export function PayScaleMasterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useAgencyUrl();
  const { roleSwitchEpoch } = useAuth();
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);

  /* Recompute derived state when the active persona changes. */
  void roleSwitchEpoch;

  /* ── Persona-driven scope: CS-only, OPS-only, or both ────────────────── */
  const scope = usePayrollScope();
  const showCivil = scopeAllows(scope, 'civil-servant');
  const showOps = scopeAllows(scope, 'other-public-servant');

  const [tab, setTab] = useState<'civil' | 'ops'>(showCivil ? 'civil' : 'ops');
  const [q, setQ] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  /* ── OPS edit state — admin/HR can edit OPS pay-scale rows ─────────────── */
  const canEditOps = caps.canConfigureRules;
  const [opsOverrides, setOpsOverrides] = useState<OpsOverrideMap>(() => loadOpsOverrides());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<OpsOverride>({ minPay: 0, increment: 0, maxPay: 0, notes: '' });
  useEffect(() => { saveOpsOverrides(opsOverrides); }, [opsOverrides]);

  const applyOverride = (categoryId: string, p: OpsPayScaleEntry): OpsPayScaleEntry => {
    const o = opsOverrides[opsKey(categoryId, p.positionTitle)];
    return o ? { ...p, ...o } : p;
  };
  const startEdit = (categoryId: string, p: OpsPayScaleEntry) => {
    const merged = applyOverride(categoryId, p);
    setEditingKey(opsKey(categoryId, p.positionTitle));
    setEditDraft({ minPay: merged.minPay, increment: merged.increment, maxPay: merged.maxPay, notes: merged.notes ?? '' });
  };
  const cancelEdit = () => { setEditingKey(null); };
  const saveEdit = (categoryId: string, p: OpsPayScaleEntry) => {
    const k = opsKey(categoryId, p.positionTitle);
    setOpsOverrides((prev) => ({ ...prev, [k]: { ...editDraft } }));
    setEditingKey(null);
  };
  const resetRow = (categoryId: string, p: OpsPayScaleEntry) => {
    const k = opsKey(categoryId, p.positionTitle);
    setOpsOverrides((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
    setEditingKey(null);
  };

  /* Keep the active tab aligned with the current scope when the persona
     switches (e.g., CS Officer → OPS Officer from the top bar). */
  React.useEffect(() => {
    if (tab === 'civil' && !showCivil) setTab('ops');
    else if (tab === 'ops' && !showOps) setTab('civil');
  }, [showCivil, showOps, tab]);

  /* ── Civil service rows ─────────────────────────────────────────────── */
  const civilRows: PayScaleEntry[] = useMemo(() => {
    const rows = Object.values(CIVIL_SERVICE_PAY_SCALE);
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.level.toLowerCase().includes(t));
  }, [q]);

  /* ── OPS categories (filtered) ──────────────────────────────────────── */
  const opsCategories: OpsCategory[] = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return OPS_CATEGORIES;
    return OPS_CATEGORIES.map((c) => ({
      ...c,
      positions: c.positions.filter(
        (p) =>
          p.positionTitle.toLowerCase().includes(t) ||
          c.name.toLowerCase().includes(t),
      ),
    })).filter((c) => c.positions.length > 0);
  }, [q]);

  const civilSummary = useMemo(() => {
    const rows = Object.values(CIVIL_SERVICE_PAY_SCALE);
    const min = Math.min(...rows.map((r) => r.basePay));
    const max = Math.max(...rows.map((r) => r.maxPay));
    return { count: rows.length, min, max };
  }, []);

  const opsSummary = useMemo(() => {
    const posCount = OPS_CATEGORIES.reduce((a, c) => a + c.positions.length, 0);
    return { categories: OPS_CATEGORIES.length, positions: posCount };
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb + Back / Forward */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={buildPath('/')} className="hover:text-indigo-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to={buildPath('/payroll/management')} className="hover:text-indigo-600 font-semibold">Payroll</Link>
          <span>/</span>
          <Link to={buildPath('/payroll/management')} className="hover:text-indigo-600 font-semibold">Payroll Management</Link>
          <span>/</span>
          <Link to={buildPath('/payroll/employee-registry')} className="hover:text-indigo-600 font-semibold">👥 Employee Master</Link>
          <span>/</span>
          <span className="font-bold text-indigo-700">Pay Scale Master</span>
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
            onClick={() => navigate(buildPath('/payroll/management'))}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100"
          >
            ⬆ Payroll Management
          </button>
        </div>
      </nav>

      {/* Sibling navigation — Employee Master group peers. Category follows
          the persona's payroll scope so OPS personas see OPS peers only. */}
      <PayrollGroupSiblingNav
        category={showCivil ? 'civil-servant' : 'other-public-servant'}
        currentPath={location.pathname}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pay Scale Master</h1>
          <p className="mt-1 text-sm text-slate-600">
            DDi 3.x — Government of Bhutan pay scales (Civil Service + Other Public Servants)
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${tone.pill}`}>
          DDi 3.x
        </span>
      </div>

      {/* ── Persona banner (reacts to top-bar role switch) ── */}
      <PayrollPersonaBanner moduleLabel="Pay Scale Master" />

      {/* ── Role-specific context line ── */}
      <div className={`rounded-xl border ${tone.border} ${tone.bg} px-4 py-3 text-xs ${tone.text}`}>
        {caps.canConfigureRules ? (
          <>
            <strong>Edit access enabled</strong> — {caps.activeRoleName} may edit <strong>OPS</strong> pay-scale rows inline.
            <strong> Civil Service</strong> rows are sourced from ZESt and remain read-only here; revisions flow back via the ZESt sync pipeline.
          </>
        ) : caps.isReadOnly ? (
          <>
            <strong>Read-only view</strong> — {caps.activeRoleName} may search and export pay scales
            but cannot modify any slab, increment, or ceiling.
          </>
        ) : (
          <>
            <strong>View access</strong> — {caps.activeRoleName} may review the published scales
            but editing is restricted to HR Officer / System Administrator.
          </>
        )}
      </div>

      {/* Summary cards — only show cards for the scopes visible to this persona */}
      <div className={`grid gap-4 ${showCivil && showOps ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {showCivil && (
          <>
            <SummaryCard label="Civil Service Levels" value={civilSummary.count} sub="pay-scale rows" tone="indigo" />
            <SummaryCard label="Civil Service Min Base" value={nu(civilSummary.min)} sub="entry point" tone="emerald" />
            <SummaryCard label="Civil Service Max Ceiling" value={nu(civilSummary.max)} sub="at maximum increment" tone="violet" />
          </>
        )}
        {showOps && (
          <SummaryCard label="OPS Categories" value={opsSummary.categories} sub={`${opsSummary.positions} positions`} tone="amber" />
        )}
      </div>

      {/* SRS note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <span className="font-bold">⚠ SRS Note — Source of Truth.</span>{' '}
        Civil service pay scales are sourced from ZESt via RCSC LoV sheet <code className="rounded bg-white/60 px-1">LoVBasedOnCategory</code>. OPS scales are
        published by RCSC / Constitutional Bodies and refreshed on RCSC revision cycles. All edits flow back to ZESt before re-publishing.
      </div>

      {/* Tabs — only render tabs the persona's scope permits */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {showCivil && (
          <TabButton active={tab === 'civil'} onClick={() => setTab('civil')}>
            Civil Service ({civilSummary.count})
          </TabButton>
        )}
        {showOps && (
          <TabButton active={tab === 'ops'} onClick={() => setTab('ops')}>
            OPS Categories ({opsSummary.categories})
          </TabButton>
        )}
        <div className="ml-auto">
          <input
            type="text"
            placeholder="Search level or position…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Content */}
      {tab === 'civil' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-800">
            <span><strong>Source: ZESt</strong> — Civil Service pay scales are pulled from RCSC via the ZESt API and are read-only here.</span>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">ZESt · Read-only</span>
          </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Level</th>
                <th className="px-4 py-3 text-right">Base Pay</th>
                <th className="px-4 py-3 text-right">Annual Increment</th>
                <th className="px-4 py-3 text-right">Max Pay</th>
                <th className="px-4 py-3 text-right">Span</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {civilRows.map((r) => (
                <tr key={r.level} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{r.level}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{nu(r.basePay)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">+{nu(r.annualIncrement)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{nu(r.maxPay)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{nu(r.maxPay - r.basePay)}</td>
                </tr>
              ))}
              {civilRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No pay-scale levels match "{q}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-800">
            <span>
              <strong>Source: RCSC / Constitutional Bodies</strong> — OPS scales can be {canEditOps ? 'edited inline by HR / System Administrator. Edits persist locally and queue for RCSC sign-off.' : 'viewed only with the current role.'}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${canEditOps ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              {canEditOps ? 'OPS · Editable' : 'OPS · Read-only'}
            </span>
          </div>
          {opsCategories.map((c) => {
            const isOpen = expandedCategory === c.id;
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isOpen ? null : c.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {c.positions.length} positions
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          c.dataSource === 'zest'
                            ? 'bg-emerald-100 text-emerald-700'
                            : c.dataSource === 'both'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {/* OPS has no ZESt link — label legacy "zest" values as "interface" */}
                        {c.dataSource === 'zest' ? 'interface' : c.dataSource}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{c.description}</div>
                  </div>
                  <span className={`text-xl text-slate-400 transition ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>
                {isOpen && (
                  <table className="w-full border-t border-slate-100 text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Position</th>
                        <th className="px-4 py-2 text-right">Min Pay</th>
                        <th className="px-4 py-2 text-right">Increment</th>
                        <th className="px-4 py-2 text-right">Max Pay</th>
                        <th className="px-4 py-2 text-left">Notes</th>
                        {canEditOps && <th className="px-4 py-2 text-right w-40">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {c.positions.map((rawP: OpsPayScaleEntry, idx: number) => {
                        const k = opsKey(c.id, rawP.positionTitle);
                        const p = applyOverride(c.id, rawP);
                        const isEditing = editingKey === k;
                        const isOverridden = !!opsOverrides[k];
                        return (
                          <tr key={`${c.id}-${idx}`} className={`hover:bg-slate-50 ${isOverridden ? 'bg-amber-50/40' : ''}`}>
                            <td className="px-4 py-2 font-medium text-slate-900">
                              {p.positionTitle}
                              {isOverridden && <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-bold text-amber-700">EDITED</span>}
                            </td>
                            {isEditing ? (
                              <>
                                <td className="px-2 py-1 text-right">
                                  <input type="number" value={editDraft.minPay} onChange={(e) => setEditDraft((d) => ({ ...d, minPay: Number(e.target.value) || 0 }))} className="w-24 rounded border border-indigo-300 px-2 py-1 text-right text-xs focus:border-indigo-500 focus:outline-none" />
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <input type="number" value={editDraft.increment} onChange={(e) => setEditDraft((d) => ({ ...d, increment: Number(e.target.value) || 0 }))} className="w-24 rounded border border-indigo-300 px-2 py-1 text-right text-xs focus:border-indigo-500 focus:outline-none" />
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <input type="number" value={editDraft.maxPay} onChange={(e) => setEditDraft((d) => ({ ...d, maxPay: Number(e.target.value) || 0 }))} className="w-24 rounded border border-indigo-300 px-2 py-1 text-right text-xs focus:border-indigo-500 focus:outline-none" />
                                </td>
                                <td className="px-2 py-1">
                                  <input type="text" value={editDraft.notes ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))} className="w-full rounded border border-indigo-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none" />
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button type="button" onClick={() => saveEdit(c.id, rawP)} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Save</button>
                                    <button type="button" onClick={cancelEdit} className="rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2 text-right tabular-nums">{nu(p.minPay)}</td>
                                <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{p.increment ? `+${nu(p.increment)}` : '—'}</td>
                                <td className="px-4 py-2 text-right tabular-nums font-semibold">{nu(p.maxPay)}</td>
                                <td className="px-4 py-2 text-xs text-slate-500">{p.notes ?? '—'}</td>
                                {canEditOps && (
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button type="button" onClick={() => startEdit(c.id, rawP)} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100">Edit</button>
                                      {isOverridden && (
                                        <button type="button" onClick={() => resetRow(c.id, rawP)} className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100" title="Revert to RCSC published value">Reset</button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {opsCategories.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-8 text-center text-slate-400">
              No OPS positions match "{q}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */
function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: 'indigo' | 'emerald' | 'violet' | 'amber';
}) {
  const toneCls: Record<string, string> = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${toneCls[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px px-4 py-2 text-sm font-semibold transition ${
        active ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}
