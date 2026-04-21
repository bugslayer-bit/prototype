/* ═══════════════════════════════════════════════════════════════════════════
   Pay Scale for Employee — Payroll / Civil Servant
   ─────────────────────────────────────────────────────────────────────────
   Lists EVERY civil-servant employee in the user's agency with their
   pay-scale level, current basic pay, current step, and progression
   towards the ceiling. Pulls dynamically from EMPLOYEES + PAY_SCALES masters.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAgencyUrl } from "../../../shared/hooks/useAgencyUrl";
import { PayrollGroupSiblingNav } from "../shared/navigation/PayrollSubNav";
import { AGENCIES } from "../../../shared/data/agencyPersonas";
import { EMPLOYEES, PAY_SCALES, getPayScale, computeEmployeePay } from "../state/payrollSeed";
import { usePayrollRoleCapabilities, payrollToneClasses } from "../state/usePayrollRoleCapabilities";
import { PayrollPersonaBanner } from "../shared/components/PayrollPersonaBanner";

export function EmployeePayScalePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useAgencyUrl();
  const { activeAgencyCode, activeRoleId } = useAuth();
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);

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
  const [progressFilter, setProgressFilter] = useState<"all" | "near-ceiling" | "near-min" | "mid">("all");

  const positionLevels = useMemo(
    () => Array.from(new Set(employees.map((e) => e.positionLevel))).sort(),
    [employees],
  );
  const agencies = useMemo(
    () => Array.from(new Set(employees.map((e) => e.agencyCode))).sort(),
    [employees],
  );

  const rows = useMemo(() => {
    return employees
      .map((e) => {
        const ps = getPayScale(e.positionLevel);
        const pay = computeEmployeePay(e.basicPay, e.positionLevel);
        const stepsAboveMin = ps.increment > 0 ? Math.max(0, Math.round((e.basicPay - ps.minPay) / ps.increment)) : 0;
        const totalSteps = ps.increment > 0 ? Math.round((ps.maxPay - ps.minPay) / ps.increment) : 0;
        const progressPct = totalSteps > 0 ? Math.min(100, Math.round((stepsAboveMin / totalSteps) * 100)) : 0;
        const nextStep = e.basicPay + ps.increment <= ps.maxPay ? e.basicPay + ps.increment : null;
        return { e, ps, pay, stepsAboveMin, totalSteps, progressPct, nextStep };
      })
      .filter(({ e, progressPct }) => {
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!e.name.toLowerCase().includes(q)
            && !e.eid.toLowerCase().includes(q)
            && !e.cid.toLowerCase().includes(q)) return false;
        }
        if (levelFilter !== "all" && e.positionLevel !== levelFilter) return false;
        if (agencyFilter !== "all" && e.agencyCode !== agencyFilter) return false;
        if (progressFilter === "near-ceiling" && progressPct < 80) return false;
        if (progressFilter === "near-min" && progressPct > 20) return false;
        if (progressFilter === "mid" && (progressPct < 21 || progressPct > 79)) return false;
        return true;
      });
  }, [employees, search, levelFilter, agencyFilter, progressFilter]);

  const summary = useMemo(() => {
    const total = rows.length;
    const atCeiling = rows.filter((r) => r.progressPct >= 100).length;
    const totalBasic = rows.reduce((s, r) => s + r.e.basicPay, 0);
    return { total, atCeiling, totalBasic, avgBasic: total ? Math.round(totalBasic / total) : 0 };
  }, [rows]);

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={buildPath("/")} className="hover:text-indigo-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Payroll</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Civil Servant</Link>
          <span>/</span>
          <span className="font-bold text-indigo-700">Pay Scale for Employee</span>
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
          <h1 className="text-3xl font-bold text-slate-900">Pay Scale for Employee</h1>
          <p className="mt-1 text-sm text-slate-600">Per-user pay scale view — every civil-servant employee shown against their assigned pay-scale level, current step, and progression to ceiling.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${tone.pill}`}>Civil Servant</span>
      </div>

      <PayrollPersonaBanner moduleLabel="Pay Scale for Employee" />

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <span className="font-bold">✓ Source.</span>{" "}
        Pay-scale master is sourced from <strong>ZESt (DDi 3.x)</strong> via the Pay Scale Master page. Per-user position level and current basic pay come from the Employee Master. Step / progress are derived live.
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Civil Servants" value={summary.total} sub="in current scope" tone="indigo" />
        <SummaryCard label="At Ceiling" value={summary.atCeiling} sub="basic = max-pay" tone="amber" />
        <SummaryCard label="Total Basic Pay" value={`Nu.${summary.totalBasic.toLocaleString()}`} sub="sum across rows" tone="violet" />
        <SummaryCard label="Avg Basic Pay" value={`Nu.${summary.avgBasic.toLocaleString()}`} sub="per employee" tone="emerald" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, EID, CID..."
            className="rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none"
          />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none">
            <option value="all">All position levels</option>
            {positionLevels.map((l) => (<option key={l} value={l}>{l} — {getPayScale(l).label}</option>))}
          </select>
          <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none">
            <option value="all">All agencies</option>
            {agencies.map((c) => {
              const a = AGENCIES.find((x) => x.code === c);
              return (<option key={c} value={c}>{c} — {a?.name ?? "Unknown"}</option>);
            })}
          </select>
          <select value={progressFilter} onChange={(e) => setProgressFilter(e.target.value as any)} className="rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400 focus:outline-none">
            <option value="all">All progress</option>
            <option value="near-min">Near min (≤20%)</option>
            <option value="mid">Mid (21–79%)</option>
            <option value="near-ceiling">Near ceiling (≥80%)</option>
          </select>
        </div>
      </div>

      {/* Per-user pay scale table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Employee</th>
              <th className="px-2 py-2 text-left">Position</th>
              <th className="px-2 py-2 text-left">Agency</th>
              <th className="px-2 py-2 text-left">Pay Scale</th>
              <th className="px-2 py-2 text-right">Min Pay</th>
              <th className="px-2 py-2 text-right">Increment</th>
              <th className="px-2 py-2 text-right">Max Pay</th>
              <th className="px-2 py-2 text-right">Current Basic</th>
              <th className="px-2 py-2 text-center">Step</th>
              <th className="px-2 py-2 text-left w-44">Progress</th>
              <th className="px-2 py-2 text-right">Next Step</th>
              <th className="px-2 py-2 text-right">Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ e, ps, pay, stepsAboveMin, totalSteps, progressPct, nextStep }) => (
              <tr key={e.eid} className="hover:bg-indigo-50/30">
                <td className="px-3 py-2 font-semibold text-slate-900">
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
                <td className="px-2 py-2 text-slate-700">{ps.label}</td>
                <td className="px-2 py-2 text-right font-mono text-slate-700">Nu.{ps.minPay.toLocaleString()}</td>
                <td className="px-2 py-2 text-right font-mono text-emerald-700">+Nu.{ps.increment.toLocaleString()}</td>
                <td className="px-2 py-2 text-right font-mono text-slate-700">Nu.{ps.maxPay.toLocaleString()}</td>
                <td className="px-2 py-2 text-right font-mono font-bold text-indigo-700">Nu.{e.basicPay.toLocaleString()}</td>
                <td className="px-2 py-2 text-center text-slate-700">
                  <span className="inline-flex items-center justify-center h-5 min-w-[2rem] rounded bg-indigo-50 text-[10px] font-bold text-indigo-700">{stepsAboveMin}/{totalSteps}</span>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${progressPct >= 100 ? "bg-amber-500" : progressPct >= 80 ? "bg-amber-400" : "bg-gradient-to-r from-indigo-400 to-emerald-500"}`} style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{progressPct}%</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  {nextStep ? <span className="text-slate-700">Nu.{nextStep.toLocaleString()}</span> : <span className="rounded bg-amber-100 px-1.5 py-px text-[9px] font-bold text-amber-700">AT CEILING</span>}
                </td>
                <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">Nu.{pay.netPay.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={12} className="px-3 py-8 text-center text-slate-400">No civil-servant employees match the current filters.</td></tr>
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
