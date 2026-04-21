/* ═══════════════════════════════════════════════════════════════════════════
   Allowance of Employee — Payroll / Civil Servant
   ─────────────────────────────────────────────────────────────────────────
   Lists EVERY civil-servant employee in the user's agency with the
   allowances they're assigned and the live computed amount per allowance.
   Pulls dynamically from EMPLOYEES + ALLOWANCES masters (PRN 1.2 / ZESt).
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAgencyUrl } from "../../../shared/hooks/useAgencyUrl";
import { PayrollGroupSiblingNav } from "../shared/navigation/PayrollSubNav";
import { AGENCIES } from "../../../shared/data/agencyPersonas";
import { EMPLOYEES, ALLOWANCES, computeEmployeePay } from "../state/payrollSeed";
import { usePayrollRoleCapabilities, payrollToneClasses } from "../state/usePayrollRoleCapabilities";
import { PayrollPersonaBanner } from "../shared/components/PayrollPersonaBanner";
import type { Employee, PositionLevel } from "../types";

const nu = (n: number) => (n === 0 ? "—" : `Nu.${n.toLocaleString()}`);

function computeAllowanceAmount(employee: Employee, allowanceId: string): number {
  const pay = computeEmployeePay(employee.basicPay, employee.positionLevel);
  switch (allowanceId) {
    case "ALW-001": return pay.le;
    case "ALW-002": return pay.ltc;
    case "ALW-003": return pay.lumpSum;
    case "ALW-004": return pay.indexation;
    case "ALW-005": return pay.oneOffFixed;
    default: {
      const a = ALLOWANCES.find((x) => x.id === allowanceId);
      if (!a) return 0;
      if (a.calcMethod === "pct-basic") return Math.round(employee.basicPay * (a.value / 100));
      if (a.calcMethod === "fixed") return a.value;
      return 0;
    }
  }
}

export function EmployeeAllowancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useAgencyUrl();
  const { activeAgencyCode, activeRoleId } = useAuth();
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);

  /* ── Agency-scoped employee pool (only civil servants) ──────────────── */
  const isCentralAdmin = activeAgencyCode === "16" && activeRoleId === "role-admin";
  const employees = useMemo(() => {
    const pool = isCentralAdmin
      ? EMPLOYEES
      : EMPLOYEES.filter((e) => e.agencyCode === activeAgencyCode);
    return pool.filter((e) => e.category === "civil-servant");
  }, [activeAgencyCode, isCentralAdmin]);

  /* ── Filters ────────────────────────────────────────────────────────── */
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [allowanceFilter, setAllowanceFilter] = useState<string>("all");
  const [showOnlyEligible, setShowOnlyEligible] = useState(false);

  const positionLevels = useMemo(
    () => Array.from(new Set(employees.map((e) => e.positionLevel))).sort(),
    [employees],
  );
  const agencies = useMemo(
    () => Array.from(new Set(employees.map((e) => e.agencyCode))).sort(),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!e.name.toLowerCase().includes(q)
          && !e.eid.toLowerCase().includes(q)
          && !e.cid.toLowerCase().includes(q)) return false;
      }
      if (levelFilter !== "all" && e.positionLevel !== levelFilter) return false;
      if (agencyFilter !== "all" && e.agencyCode !== agencyFilter) return false;
      if (allowanceFilter !== "all" && !e.allowanceIds.includes(allowanceFilter)) return false;
      return true;
    });
  }, [employees, search, levelFilter, agencyFilter, allowanceFilter]);

  const visibleAllowances = useMemo(() => {
    /* Filter by selected allowance first */
    let list = allowanceFilter !== "all"
      ? ALLOWANCES.filter((a) => a.id === allowanceFilter)
      : ALLOWANCES;
    /* Then scope to allowances applicable to the active agency.
       Allowances with empty applicableAgencies apply to ALL agencies. */
    if (activeAgencyCode) {
      list = list.filter(
        (a) => !a.applicableAgencies?.length || a.applicableAgencies.includes(activeAgencyCode),
      );
    }
    return list;
  }, [allowanceFilter, activeAgencyCode]);

  /* ── Summary ────────────────────────────────────────────────────────── */
  const totalAllowanceSum = useMemo(() => {
    return filteredEmployees.reduce((sum, e) => {
      return sum + e.allowanceIds.reduce((s, id) => s + computeAllowanceAmount(e, id), 0);
    }, 0);
  }, [filteredEmployees]);

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb + back/forward */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={buildPath("/")} className="hover:text-indigo-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Payroll</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Civil Servant</Link>
          <span>/</span>
          <span className="font-bold text-indigo-700">Allowance of Employee</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700">← Back</button>
          <button type="button" onClick={() => navigate(1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700">Forward →</button>
          <button type="button" onClick={() => navigate(buildPath("/payroll/management"))} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100">⬆ Payroll Management</button>
        </div>
      </nav>

      <PayrollGroupSiblingNav category="civil-servant" currentPath={location.pathname} />

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Allowance of Employee</h1>
          <p className="mt-1 text-sm text-slate-600">Per-user allowance view — every civil-servant employee with their assigned allowances and live computed amounts.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${tone.pill}`}>Civil Servant</span>
      </div>

      <PayrollPersonaBanner moduleLabel="Allowance of Employee" />

      {/* Source note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <span className="font-bold">⚠ Source.</span>{" "}
        Allowance master is sourced from <strong>ZESt (PRN 1.2)</strong> via the Allowance Configuration master page. Per-user allowance assignments and basic pay come from the Employee Master. Amounts here are computed live per employee.
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Civil Servants" value={filteredEmployees.length} sub={`of ${employees.length} in scope`} tone="indigo" />
        <SummaryCard label="Active Allowances" value={ALLOWANCES.filter((a) => a.active).length} sub={`of ${ALLOWANCES.length} in master`} tone="emerald" />
        <SummaryCard label="Total Allowance Outlay" value={nu(totalAllowanceSum)} sub="for filtered employees" tone="violet" />
        <SummaryCard label="Avg / Employee" value={filteredEmployees.length ? nu(Math.round(totalAllowanceSum / filteredEmployees.length)) : "—"} sub="across assignments" tone="amber" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, EID, CID..."
            className="rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none"
          />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none">
            <option value="all">All position levels</option>
            {positionLevels.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
          <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none">
            <option value="all">All agencies</option>
            {agencies.map((c) => {
              const a = AGENCIES.find((x) => x.code === c);
              return (<option key={c} value={c}>{c} — {a?.name ?? "Unknown"}</option>);
            })}
          </select>
          <select value={allowanceFilter} onChange={(e) => setAllowanceFilter(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none">
            <option value="all">All allowances</option>
            {ALLOWANCES.map((a) => (<option key={a.id} value={a.id}>{a.ucoaCode} — {a.name}</option>))}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={showOnlyEligible} onChange={(e) => setShowOnlyEligible(e.target.checked)} />
            Show eligibility (level/agency rules)
          </label>
        </div>
      </div>

      {/* Per-user allowance matrix */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Employee</th>
              <th className="px-2 py-2 text-left">Position</th>
              <th className="px-2 py-2 text-left">Agency</th>
              <th className="px-2 py-2 text-right">Basic Pay</th>
              {visibleAllowances.map((a) => (
                <th key={a.id} className="px-2 py-2 text-right" title={a.name}>
                  <div className="font-mono text-[10px] text-slate-500">{a.ucoaCode}</div>
                  <div className="font-semibold">{a.name.length > 18 ? a.name.slice(0, 18) + "…" : a.name}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-right bg-emerald-50 text-emerald-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.map((e) => {
              const rowTotal = e.allowanceIds.reduce((s, id) => s + computeAllowanceAmount(e, id), 0);
              return (
                <tr key={e.eid} className="hover:bg-indigo-50/30">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold text-slate-900 hover:bg-indigo-50/30">
                    <div>{e.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{e.eid} · {e.cid}</div>
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">{e.positionLevel}</span>
                    <div className="text-[10px] text-slate-500 mt-0.5">{e.positionTitle}</div>
                  </td>
                  <td className="px-2 py-2 text-slate-600">
                    <span className="font-mono">{e.agencyCode}</span>
                    <div className="text-[10px] text-slate-500">{e.agencyName}</div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-900">Nu.{e.basicPay.toLocaleString()}</td>
                  {visibleAllowances.map((a) => {
                    const assigned = e.allowanceIds.includes(a.id);
                    const levelOk = !a.applicableLevels?.length || a.applicableLevels.includes(e.positionLevel as PositionLevel);
                    const agencyOk = !a.applicableAgencies?.length || a.applicableAgencies.includes(e.agencyCode);
                    const eligible = levelOk && agencyOk;
                    const amount = assigned ? computeAllowanceAmount(e, a.id) : 0;
                    return (
                      <td key={a.id} className={`px-2 py-2 text-right font-mono ${assigned ? "text-slate-900 font-semibold" : showOnlyEligible && eligible ? "text-blue-600" : "text-slate-300"}`}>
                        {assigned ? amount.toLocaleString() : showOnlyEligible ? (eligible ? "elig." : "—") : "—"}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">Nu.{rowTotal.toLocaleString()}</td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr><td colSpan={5 + visibleAllowances.length} className="px-3 py-8 text-center text-slate-400">No civil-servant employees match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string | number; sub: string; tone: "indigo" | "emerald" | "violet" | "amber" }) {
  const cls: Record<string, string> = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${cls[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}
