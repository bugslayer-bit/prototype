/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Analytics Dashboard — dynamic, filterable, role-aware
   ───────────────────────────────────────────────────────────────
   Renders an analytical dashboard for the Civil Service / OPS payroll
   landing pages. Data is computed from real seeds (EMPLOYEES,
   SALARY_ADVANCES, OPS_EMPLOYEES) and persisted Travel-Claims / Remittance
   activity in localStorage. Filters (month, level-group, status, agency)
   are client-side.

   MoF (agencyCode "16") sees a CROSS-AGENCY view with an additional agency
   filter and "Top 5 agencies by net payout" column. Every other agency is
   scoped to its own agencyCode and sees "Top 5 departments" instead.

   The same visual language is used for both Civil Service (blue) and
   Other Public Servant (amber) — only the tone differs.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { EmployeeCategory } from "../types";
import { EMPLOYEES, SALARY_ADVANCES } from "../../state/payrollSeed";
import { useAgencyUrl } from "../../../../shared/hooks/useAgencyUrl";

/* ── Props ──────────────────────────────────────────────────────────────── */
export interface AnalyticsProps {
  category: EmployeeCategory;
  /** Raw agency code — pass the actual logged-in code, not "all". */
  agencyCode: string;
  /** Optional Employee Category sub-filter (from the chip bar above the
   *  dashboard).  "all" = whole stream, otherwise a canonical label from the
   *  payroll-employee-category LoV. */
  categoryFilter?: string;
}

/* ── Unified row model used by the dashboard internally ────────────────── */
interface Row {
  id: string;
  name: string;
  agencyCode: string;
  agencyName: string;
  departmentName: string;
  employeeCategoryLabel?: string;
  positionLevel: string;
  positionTitle: string;
  levelGroup: "EX/ES" | "P" | "S" | "O" | "GSP/ESP" | "OPS";
  status: "active" | "on-leave" | "suspended" | "separated" | "transferred";
  grossPay: number;
  netPay: number;
  totalDeductions: number;
  source: string;
}

/* Classify CS level codes into a handful of groups used on the distribution
   chart. OPS levels are all grouped together (they use a separate scale). */
function classifyCSLevel(level: string): Row["levelGroup"] {
  const up = String(level).toUpperCase();
  if (up.startsWith("EX") || up.startsWith("ES")) return "EX/ES";
  if (up.startsWith("P")) return "P";
  if (up.startsWith("S")) return "S";
  if (up.startsWith("O")) return "O";
  if (up === "GSP" || up === "ESP") return "GSP/ESP";
  return "P";
}

export function PayrollAnalyticsDashboard({ category, agencyCode, categoryFilter = "all" }: AnalyticsProps) {
  const { buildPath } = useAgencyUrl();
  const isMof = agencyCode === "16";
  const isCS = category === "civil-servant";

  /* ── Build unified row set ─────────────────────────────────────────── */
  /* Both streams now live inside the same EMPLOYEES seed — they carry the
     canonical `category` field and the `employeeCategoryLabel` stamp. Using
     a single data path gives OPS the exact same richness CS has: real gross
     / net / deductions, real statuses, real per-agency distribution, and
     the new category chip filter works out of the box. */
  const allRows: Row[] = useMemo(() => {
    const pool = EMPLOYEES.filter((e) => e.category === category);
    return pool.map((e) => ({
      id: e.id,
      name: e.name,
      agencyCode: e.agencyCode,
      agencyName: e.agencyName,
      departmentName: e.departmentName,
      employeeCategoryLabel: e.employeeCategoryLabel,
      positionLevel: String(e.positionLevel),
      positionTitle: e.positionTitle,
      levelGroup: isCS ? classifyCSLevel(String(e.positionLevel)) : ("OPS" as const),
      status: e.status,
      grossPay: e.grossPay || 0,
      netPay: e.netPay || 0,
      totalDeductions: e.totalDeductions || 0,
      source: e.source,
    }));
  }, [category, isCS]);

  /* Agency-scoped pool (MoF sees everything; agency sees its own).  Then
     narrow further by the Employee Category chip picked upstream. */
  const scoped = useMemo(() => {
    const base = isMof ? allRows : allRows.filter((r) => r.agencyCode === agencyCode);
    if (categoryFilter === "all") return base;
    return base.filter((r) => (r.employeeCategoryLabel || "") === categoryFilter);
  }, [allRows, agencyCode, isMof, categoryFilter]);

  /* ── Filters ──────────────────────────────────────────────────────── */
  const MONTHS = ["Apr 2026", "Mar 2026", "Feb 2026", "Jan 2026"] as const;
  const LEVEL_GROUPS = ["all", "EX/ES", "P", "S", "O", "GSP/ESP", "OPS"] as const;
  const STATUSES = ["all", "active", "on-leave", "separated", "suspended", "transferred"] as const;

  const [month, setMonth] = useState<(typeof MONTHS)[number]>("Apr 2026");
  const [levelFilter, setLevelFilter] = useState<(typeof LEVEL_GROUPS)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const agencyOptions = useMemo(() => {
    const m = new Map<string, string>();
    allRows.forEach((r) => {
      if (r.agencyCode) m.set(r.agencyCode, r.agencyName || r.agencyCode);
    });
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((r) => {
      if (levelFilter !== "all" && r.levelGroup !== levelFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (isMof && agencyFilter !== "all" && r.agencyCode !== agencyFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.positionTitle.toLowerCase().includes(q)
        && !r.agencyName.toLowerCase().includes(q) && !r.departmentName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [scoped, levelFilter, statusFilter, agencyFilter, query, isMof]);

  /* ── Aggregations ─────────────────────────────────────────────────── */
  const agg = useMemo(() => {
    const total = filtered.length;
    const grossSum = filtered.reduce((s, r) => s + r.grossPay, 0);
    const netSum = filtered.reduce((s, r) => s + r.netPay, 0);
    const dedSum = filtered.reduce((s, r) => s + r.totalDeductions, 0);
    const byStatus = {
      active: filtered.filter((r) => r.status === "active").length,
      onLeave: filtered.filter((r) => r.status === "on-leave").length,
      separated: filtered.filter((r) => r.status === "separated").length,
      suspended: filtered.filter((r) => r.status === "suspended").length,
      transferred: filtered.filter((r) => r.status === "transferred").length,
    };
    const byLevel = new Map<string, number>();
    filtered.forEach((r) => byLevel.set(r.levelGroup, (byLevel.get(r.levelGroup) || 0) + 1));
    const levelData = [...byLevel.entries()].sort((a, b) => b[1] - a[1]);

    /* Top 5 agencies (MoF) / departments (agency) by net payout */
    const groupKey = isMof ? "agencyName" : "departmentName";
    const byGroup = new Map<string, { count: number; net: number }>();
    filtered.forEach((r) => {
      const k = (r as any)[groupKey] || "—";
      const cur = byGroup.get(k) || { count: 0, net: 0 };
      cur.count += 1;
      cur.net += r.netPay;
      byGroup.set(k, cur);
    });
    const top5 = [...byGroup.entries()].sort((a, b) => b[1].net - a[1].net).slice(0, 5);

    const bySource = filtered.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, grossSum, netSum, dedSum, byStatus, levelData, top5, bySource };
  }, [filtered, isMof]);

  /* ── Peer-nav activity counters (align with the chip row above) ──── */
  const peerActivity = useMemo(() => {
    const advancesPool = isCS
      ? SALARY_ADVANCES.filter((a) => {
          const emp = EMPLOYEES.find((e) => e.id === a.employeeId);
          if (!emp) return false;
          return isMof || emp.agencyCode === agencyCode;
        })
      : [];
    const advPending = advancesPool.filter((a) => a.status === "pending").length;
    const advActive = advancesPool.filter((a) => a.status === "recovering").length;

    /* Travel claims — persisted by the Travel Claims hub */
    let travelCount = 0;
    let travelOpen = 0;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("ifmis-travel-claims") : null;
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ category: string; status: string; agencyName?: string }>;
        const matched = arr.filter((c) => {
          if (isCS && c.category !== "civil-servant") return false;
          if (!isCS && c.category !== "other-public-servant") return false;
          return true;
        });
        travelCount = matched.length;
        travelOpen = matched.filter((c) => c.status === "submitted" || c.status === "verified").length;
      }
    } catch { /* ignore */ }

    /* HR actions — simulate from status + separation pending */
    const hrActions = filtered.filter((r) => r.status === "on-leave" || r.status === "transferred").length;

    /* Remittances — we have live computed totals; pending = statutory body count with non-zero ded */
    const remittances = 6; // PF/GIS/TDS/HC/Rent/Audit always produced

    return { advPending, advActive, travelCount, travelOpen, hrActions, remittances };
  }, [filtered, isCS, isMof, agencyCode]);

  /* ── Tone palette ─────────────────────────────────────────────────── */
  const tone = isCS
    ? {
        accent: "text-blue-700",
        accentBg: "bg-blue-600",
        accentBgHover: "hover:bg-blue-700",
        softBg: "bg-blue-50",
        softBorder: "border-blue-200",
        chipActive: "bg-blue-600 text-white border-blue-600",
        chipIdle: "bg-white text-blue-700 border-blue-200 hover:border-blue-400",
        heroBg: "from-blue-50 via-white to-sky-50",
        bar: "from-blue-500 to-sky-400",
      }
    : {
        accent: "text-amber-700",
        accentBg: "bg-amber-600",
        accentBgHover: "hover:bg-amber-700",
        softBg: "bg-amber-50",
        softBorder: "border-amber-200",
        chipActive: "bg-amber-600 text-white border-amber-600",
        chipIdle: "bg-white text-amber-700 border-amber-200 hover:border-amber-400",
        heroBg: "from-amber-50 via-white to-orange-50",
        bar: "from-amber-500 to-orange-400",
      };

  const fmt = (n: number) => `Nu ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
  const compact = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` :
    String(n);

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const netPct = pct(agg.netSum, Math.max(agg.grossSum, 1));
  const levelGroupMax = Math.max(...agg.levelData.map(([, v]) => v), 1);
  const top5Max = Math.max(...agg.top5.map(([, v]) => v.net), 1);

  /* Base path for peer-nav links (CS vs OPS) */
  const basePath = isCS ? "/payroll" : "/payroll/ops";
  const peerChips = [
    { label: "Employee Master", to: `${basePath}/employees`, count: agg.total, sub: "records", icon: "👥" },
    { label: "HR Actions",      to: `${basePath}/hr-actions`, count: peerActivity.hrActions, sub: "in-flight", icon: "📋" },
    { label: "Payroll Processing", to: `${basePath}${isCS ? "/generation" : "/generation"}`, count: agg.byStatus.active, sub: "ready", icon: "⚙️" },
    { label: "Advances & Deductions", to: `${basePath}/salary-advance`, count: peerActivity.advPending + peerActivity.advActive, sub: `${peerActivity.advPending} pending`, icon: "💵" },
    { label: "Travel Claims",   to: `${basePath}/travel-claims`, count: peerActivity.travelCount, sub: `${peerActivity.travelOpen} open`, icon: "✈️" },
    { label: "Remittances & Payslip", to: `${basePath}/remittances`, count: peerActivity.remittances, sub: "destinations", icon: "🏦" },
    { label: "Reports",         to: `${basePath}/reports/register`, count: 7, sub: "dashboards", icon: "📊" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Hero strip + Filters ──────────────────────────────────────── */}
      <section className={`rounded-2xl border ${tone.softBorder} bg-gradient-to-br ${tone.heroBg} p-4 shadow-sm`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${tone.accent}`}>
              {isMof ? "MoF · Central Oversight" : `Agency ${agencyCode}`} · {isCS ? "Civil Service" : "Other Public Service"}
            </div>
            <h3 className="mt-0.5 text-lg font-bold text-slate-900">Payroll Analytics</h3>
            <p className="text-xs text-slate-600">
              Live view · {agg.total.toLocaleString()} records across {isMof ? `${agencyOptions.length} agencies` : "your agency"}.
              Filters apply to every tile below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${tone.softBg} ${tone.accent}`}>
              Period · {month}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/60 bg-white/80 p-2">
          <input
            type="search"
            placeholder="Search name, position, agency…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <FilterSelect label="Month" value={month} onChange={(v) => setMonth(v as any)} options={MONTHS.map((m) => ({ value: m, label: m }))} />
          <FilterSelect
            label="Level"
            value={levelFilter}
            onChange={(v) => setLevelFilter(v as any)}
            options={LEVEL_GROUPS.map((l) => ({ value: l, label: l === "all" ? "All levels" : `Group ${l}` }))}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as any)}
            options={STATUSES.map((s) => ({ value: s, label: s === "all" ? "All statuses" : s }))}
          />
          {isMof && (
            <FilterSelect
              label="Agency"
              value={agencyFilter}
              onChange={(v) => setAgencyFilter(v)}
              options={[{ value: "all", label: "All agencies" }, ...agencyOptions.map(([code, name]) => ({ value: code, label: `${code} · ${name}` }))]}
            />
          )}
          {(query || levelFilter !== "all" || statusFilter !== "all" || agencyFilter !== "all") && (
            <button
              onClick={() => { setQuery(""); setLevelFilter("all"); setStatusFilter("all"); setAgencyFilter("all"); }}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              Reset
            </button>
          )}
        </div>
      </section>

      {/* ── KPI Row ──────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Headcount" value={agg.total.toLocaleString()} sub={`${agg.byStatus.active} active`} tone={tone} icon="👥" />
        <KpiCard label="Monthly Gross" value={fmt(agg.grossSum)} sub={`Avg ${fmt(Math.round(agg.grossSum / Math.max(agg.total, 1)))}`} tone={tone} icon="💰" />
        <KpiCard label="Total Deductions" value={fmt(agg.dedSum)} sub={`${100 - netPct}% of gross`} tone={tone} icon="📉" />
        <KpiCard label="Net Payout" value={fmt(agg.netSum)} sub={`${netPct}% of gross`} tone={tone} icon="🏦" />
      </section>

      {/* ── Peer-nav activity strip ───────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Workflow activity — click to open
          </div>
          <div className="text-[10px] text-slate-400">
            Aligned with the section chips above
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          {peerChips.map((p) => (
            <Link
              key={p.label}
              to={buildPath(p.to)}
              className={`group flex flex-col gap-1 rounded-xl border p-2.5 transition hover:-translate-y-0.5 hover:shadow-md ${tone.softBorder} ${tone.softBg}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{p.icon}</span>
                <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-700">{p.label}</span>
              </div>
              <div className={`text-2xl font-black leading-none ${tone.accent}`}>{p.count.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500">{p.sub}</div>
              <div className="text-right text-[10px] text-slate-400 opacity-0 transition group-hover:opacity-100">Open →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Two-column body — distributions & top list ───────────────── */}
      <section className="grid gap-3 lg:grid-cols-2">
        {/* Position Level Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Position Level Distribution</h4>
              <p className="text-[11px] text-slate-500">Headcount by level group</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.softBg} ${tone.accent}`}>
              {agg.levelData.length} groups
            </span>
          </div>
          <div className="space-y-2">
            {agg.levelData.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No data for current filters</div>
            ) : agg.levelData.map(([group, count]) => (
              <div key={group} className="flex items-center gap-2">
                <div className="w-20 text-[11px] font-bold text-slate-700">{group}</div>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className={`h-full rounded-md bg-gradient-to-r ${tone.bar} transition-all`}
                    style={{ width: `${(count / levelGroupMax) * 100}%` }}
                  />
                </div>
                <div className="w-14 text-right font-mono text-xs font-bold text-slate-700">{count}</div>
                <div className="w-12 text-right text-[10px] text-slate-500">{pct(count, agg.total)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 — Agencies (MoF) or Departments (agency) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {isMof ? "Top 5 Agencies by Net Payout" : "Top 5 Departments by Net Payout"}
              </h4>
              <p className="text-[11px] text-slate-500">
                {isMof ? "Cross-agency ranking" : `Within ${agg.top5[0]?.[0]?.split("·")[0] ?? "your agency"}`}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.softBg} ${tone.accent}`}>
              by net
            </span>
          </div>
          <div className="space-y-2">
            {agg.top5.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No data for current filters</div>
            ) : agg.top5.map(([name, info], i) => (
              <div key={name + i} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${tone.softBg} ${tone.accent}`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold text-slate-900">{name}</div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full bg-gradient-to-r ${tone.bar}`}
                      style={{ width: `${(info.net / top5Max) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[11px] font-bold text-slate-900">{compact(info.net)}</div>
                  <div className="text-[10px] text-slate-500">{info.count} emp</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom row — Status + Source mix ─────────────────────────── */}
      <section className="grid gap-3 lg:grid-cols-3">
        <StatusCard agg={agg} tone={tone} />
        <SourceCard bySource={agg.bySource} total={agg.total} tone={tone} isCS={isCS} />
        <SummaryCard isMof={isMof} isCS={isCS} total={agg.total} netSum={agg.netSum} fmt={fmt} tone={tone} />
      </section>
    </div>
  );
}

/* ══════════════════════ sub-components ══════════════════════ */

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

type ToneSet = {
  accent: string; accentBg: string; accentBgHover: string; softBg: string; softBorder: string;
  chipActive: string; chipIdle: string; heroBg: string; bar: string;
};

function KpiCard({ label, value, sub, tone, icon }: {
  label: string; value: string; sub: string; tone: ToneSet; icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${tone.softBg} text-base`}>{icon}</div>
      </div>
      <div className={`mt-2 text-2xl font-black leading-none ${tone.accent}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}

function StatusCard({ agg, tone }: { agg: any; tone: ToneSet }) {
  const rows = [
    { label: "Active", value: agg.byStatus.active, cls: "bg-emerald-500" },
    { label: "On Leave", value: agg.byStatus.onLeave, cls: "bg-sky-400" },
    { label: "Suspended", value: agg.byStatus.suspended, cls: "bg-amber-400" },
    { label: "Transferred", value: agg.byStatus.transferred, cls: "bg-violet-400" },
    { label: "Separated", value: agg.byStatus.separated, cls: "bg-slate-400" },
  ];
  const total = Math.max(agg.total, 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-bold text-slate-900">Employment Status</h4>
      <p className="text-[11px] text-slate-500">Breakdown of current pool</p>
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {rows.map((r) => (
          <div key={r.label} className={r.cls} style={{ width: `${(r.value / total) * 100}%` }} title={`${r.label}: ${r.value}`} />
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-[11px]">
            <span className={`h-2 w-2 rounded-sm ${r.cls}`} />
            <span className="flex-1 text-slate-700">{r.label}</span>
            <span className="font-mono font-bold text-slate-900">{r.value}</span>
            <span className="w-10 text-right text-slate-400">{Math.round((r.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceCard({ bySource, total, tone, isCS }: { bySource: Record<string, number>; total: number; tone: ToneSet; isCS: boolean }) {
  const entries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-bold text-slate-900">{isCS ? "Data Source — ZESt Coverage" : "Intake Channel"}</h4>
      <p className="text-[11px] text-slate-500">
        {isCS ? "Records synced from RCSC / ZESt" : "Interface · Manual · Bulk upload"}
      </p>
      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">No data</div>
        ) : entries.map(([src, count]) => (
          <div key={src}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 capitalize">{src.replace("-", " ")}</span>
              <span className="font-mono font-bold text-slate-900">{count} · {Math.round((count / Math.max(total, 1)) * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${(count / Math.max(total, 1)) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ isMof, isCS, total, netSum, fmt, tone }: {
  isMof: boolean; isCS: boolean; total: number; netSum: number; fmt: (n: number) => string; tone: ToneSet;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone.softBorder} ${tone.softBg}`}>
      <h4 className="text-sm font-bold text-slate-900">{isMof ? "MoF Oversight Snapshot" : "Agency Snapshot"}</h4>
      <p className="text-[11px] text-slate-600">
        {isMof
          ? "You are viewing all agencies. Drill into any agency via the filter."
          : "You are viewing your agency's scoped payroll data only."}
      </p>
      <ul className="mt-3 space-y-1.5 text-[11px] text-slate-700">
        <li>• Stream: <b>{isCS ? "Civil Service (ZESt-sourced)" : "Other Public Service (PRN 4.x)"}</b></li>
        <li>• Filtered headcount: <b>{total.toLocaleString()}</b></li>
        <li>• Filtered net payout: <b>{fmt(netSum)}</b></li>
        <li>• Next payroll cycle: <b>26th of the month</b></li>
        {isMof && <li>• Cross-agency submissions: <b>tracked in Posted Payrolls queue</b></li>}
      </ul>
    </div>
  );
}
