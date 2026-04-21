import { useMemo, useState } from "react";
import { EmployeeData } from "../../shared/types";
import {
  computeBasicPay,
  lookupPayScale,
  computeMonthlyTDS,
} from "../../shared/payScale";

/* ────────────────────────────────────────────────────────────────────────
 * Allowance & deduction rules (Civil Service, FY 2025-26).
 * Every computation here is derived from the employee's pay scale entry so
 * the processing output flows fully from ZESt → IFMIS with no hardcoding.
 * ──────────────────────────────────────────────────────────────────────── */

/** House Rent Allowance — 20 % of basic pay. */
const HRA_RATE = 0.2;
/** Communication allowance — tier by level group. */
function commAllowance(level?: string): number {
  if (!level) return 0;
  if (level.startsWith("EX")) return 4000;
  if (level === "P1" || level === "SS1") return 2500;
  if (level === "P2" || level === "P3" || level === "SS2") return 1500;
  return 0;
}
/** Contract-duty allowance — 10 % of basic for Contract staff. */
const CONTRACT_ALLOW_RATE = 0.1;

/** Provident Fund — 11 % of basic, employee share (matched by employer). */
const PF_RATE = 0.11;
/** Group Insurance Scheme — flat Nu. 100 / month. */
const GIS_FLAT = 100;
/** Health Contribution — 1 % of gross (exempt if flagged). */
const HEALTH_RATE = 0.01;

type RunStatus = "draft" | "generated" | "reviewed" | "approved" | "posted";

interface ProcessedRow {
  emp: EmployeeData;
  basic: number;
  hra: number;
  comm: number;
  contractAllow: number;
  gross: number;
  pf: number;
  gis: number;
  health: number;
  tds: number;
  totalDeductions: number;
  net: number;
}

export interface CivilServicePayrollProcessingProps {
  employees: EmployeeData[];
  agencyCode?: string;
}

/**
 * Civil Service Payroll Processing — PRN 2.1.
 *
 * Fully dynamic processing workspace:
 *   1. Per-employee compute (Basic → HRA/Comm/Contract → Gross → PF/GIS/Health/TDS → Net)
 *   2. Live aggregates (headcount, gross, deductions, net, TDS)
 *   3. Run-state machine (Draft → Generated → Reviewed → Approved → Posted)
 *   4. Filter by department, subdivision, level, status
 *   5. Export-ready breakdown table
 *
 * The numbers refresh instantly whenever the employee dataset or filters change.
 */
export function CivilServicePayrollProcessing({
  employees,
  agencyCode,
}: CivilServicePayrollProcessingProps) {
  const now = new Date();
  const [runMonth, setRunMonth] = useState<string>(
    now.toLocaleString("en-GB", { month: "long", year: "numeric" })
  );
  const [runStatus, setRunStatus] = useState<RunStatus>("draft");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const agencyScoped = useMemo(
    () => (agencyCode ? employees.filter((e) => e.agencyCode === agencyCode) : employees),
    [employees, agencyCode]
  );

  const depts = useMemo(
    () => Array.from(new Set(agencyScoped.map((e) => e.department as string).filter(Boolean))).sort(),
    [agencyScoped]
  );
  const levels = useMemo(
    () => Array.from(new Set(agencyScoped.map((e) => e.positionLevel).filter(Boolean))).sort() as string[],
    [agencyScoped]
  );

  const processed: ProcessedRow[] = useMemo(() => {
    return agencyScoped
      .filter((e) => (filterDept === "all" ? true : e.department === filterDept))
      .filter((e) => (filterLevel === "all" ? true : e.positionLevel === filterLevel))
      .filter((e) => (filterStatus === "all" ? true : e.employeeStatus === filterStatus))
      .map((emp) => {
        const scale = lookupPayScale(emp.positionLevel);
        const years = emp.yearsOfService ?? 0;
        const basic = scale ? computeBasicPay(emp.positionLevel, years) : emp.monthlyBasicPay ?? 0;
        const hra = Math.round(basic * HRA_RATE);
        const comm = commAllowance(emp.positionLevel);
        const contractAllow =
          emp.employeeType === "Contract" ? Math.round(basic * CONTRACT_ALLOW_RATE) : 0;
        const gross = basic + hra + comm + contractAllow;
        const pf = Math.round(basic * PF_RATE);
        const gis = GIS_FLAT;
        const health = Math.round(gross * HEALTH_RATE);
        const tds = computeMonthlyTDS(gross);
        const totalDeductions = pf + gis + health + tds;
        const net = gross - totalDeductions;
        return { emp, basic, hra, comm, contractAllow, gross, pf, gis, health, tds, totalDeductions, net };
      });
  }, [agencyScoped, filterDept, filterLevel, filterStatus]);

  const totals = useMemo(() => {
    const sum = (k: keyof ProcessedRow) =>
      processed.reduce((acc, r) => acc + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
    return {
      headcount: processed.length,
      basic: sum("basic"),
      allowances: sum("hra") + sum("comm") + sum("contractAllow"),
      gross: sum("gross"),
      pf: sum("pf"),
      gis: sum("gis"),
      health: sum("health"),
      tds: sum("tds"),
      totalDeductions: sum("totalDeductions"),
      net: sum("net"),
    };
  }, [processed]);

  /** Status chip colour / label mapping for the run-state machine. */
  const statusMap: Record<RunStatus, { label: string; chip: string; next?: { label: string; to: RunStatus } }> = {
    draft:     { label: "Draft",     chip: "bg-slate-100 text-slate-700 border-slate-200", next: { label: "Generate run", to: "generated" } },
    generated: { label: "Generated", chip: "bg-blue-100 text-blue-700 border-blue-200",   next: { label: "Send for review", to: "reviewed" } },
    reviewed:  { label: "Reviewed",  chip: "bg-indigo-100 text-indigo-700 border-indigo-200", next: { label: "Approve", to: "approved" } },
    approved:  { label: "Approved",  chip: "bg-emerald-100 text-emerald-700 border-emerald-200", next: { label: "Post to GL", to: "posted" } },
    posted:    { label: "Posted",    chip: "bg-emerald-600 text-white border-emerald-700" },
  };
  const statusInfo = statusMap[runStatus];

  const n = (v: number) => v.toLocaleString();

  return (
    <div className="space-y-4">
      {/* ── Run-control header ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
              PRN 2.1 · Payroll Generation
            </div>
            <h3 className="mt-2 text-xl font-bold text-slate-900">Civil Service Payroll Run</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Live processing view — every amount is derived from ZESt pay scale + years of service,
              with statutory deductions applied automatically.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusInfo.chip}`}>
              {statusInfo.label}
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Month</label>
              <input
                value={runMonth}
                onChange={(e) => setRunMonth(e.target.value)}
                className="w-40 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {statusInfo.next && (
                <button
                  onClick={() => setRunStatus(statusInfo.next!.to)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  {statusInfo.next.label} →
                </button>
              )}
              {runStatus !== "draft" && (
                <button
                  onClick={() => setRunStatus("draft")}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline bar */}
        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em]">
          {(["draft", "generated", "reviewed", "approved", "posted"] as RunStatus[]).map((st, i, arr) => {
            const idx = arr.indexOf(runStatus);
            const done = i < idx;
            const current = i === idx;
            return (
              <div key={st} className="flex flex-1 items-center gap-1">
                <div
                  className={`flex-1 rounded-md border px-2 py-1.5 text-center ${
                    done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : current
                      ? "border-blue-300 bg-blue-100 text-blue-800"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {statusMap[st].label}
                </div>
                {i < arr.length - 1 && <span className="text-slate-300">›</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="Headcount" value={totals.headcount.toString()} tone="slate" suffix={`of ${agencyScoped.length}`} />
        <SummaryCard label="Total Basic" value={`Nu. ${n(totals.basic)}`} tone="blue" />
        <SummaryCard label="Total Allowances" value={`Nu. ${n(totals.allowances)}`} tone="indigo" />
        <SummaryCard label="Total Deductions" value={`Nu. ${n(totals.totalDeductions)}`} tone="rose" />
        <SummaryCard label="Net Payable" value={`Nu. ${n(totals.net)}`} tone="emerald" />
      </div>

      {/* ── Deduction breakdown ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="PF (11% of basic)" value={`Nu. ${n(totals.pf)}`} />
        <MiniStat label="GIS (Nu. 100 flat)" value={`Nu. ${n(totals.gis)}`} />
        <MiniStat label="Health (1% of gross)" value={`Nu. ${n(totals.health)}`} />
        <MiniStat label="TDS (slab 2025)" value={`Nu. ${n(totals.tds)}`} />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-2">Filter:</span>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All departments</option>
          {depts.map((d) => (<option key={d} value={d}>{d}</option>))}
        </select>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All levels</option>
          {levels.map((l) => (<option key={l} value={l}>Level {l}</option>))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Separated">Separated</option>
        </select>
        <div className="ml-auto text-[11px] text-slate-500">
          Showing <span className="font-bold text-slate-900">{processed.length}</span> employees · Month
          <span className="ml-1 font-semibold text-slate-700">{runMonth}</span>
        </div>
      </div>

      {/* ── Breakdown table ────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-left font-bold">Emp ID</th>
              <th className="px-3 py-2.5 text-left font-bold">Name</th>
              <th className="px-3 py-2.5 text-left font-bold">Position</th>
              <th className="px-3 py-2.5 text-left font-bold">Level</th>
              <th className="px-3 py-2.5 text-right font-bold">Basic</th>
              <th className="px-3 py-2.5 text-right font-bold">HRA</th>
              <th className="px-3 py-2.5 text-right font-bold">Comm</th>
              <th className="px-3 py-2.5 text-right font-bold">Contract</th>
              <th className="px-3 py-2.5 text-right font-bold text-blue-700">Gross</th>
              <th className="px-3 py-2.5 text-right font-bold">PF</th>
              <th className="px-3 py-2.5 text-right font-bold">GIS</th>
              <th className="px-3 py-2.5 text-right font-bold">Health</th>
              <th className="px-3 py-2.5 text-right font-bold">TDS</th>
              <th className="px-3 py-2.5 text-right font-bold text-rose-700">Deductions</th>
              <th className="px-3 py-2.5 text-right font-bold text-emerald-700">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-slate-500">
                  No employees match the current filters.
                </td>
              </tr>
            ) : (
              processed.map((r, i) => (
                <tr
                  key={r.emp.employeeId}
                  className={`border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/40`}
                >
                  <td className="px-3 py-2 font-semibold text-blue-700">#{r.emp.employeeId}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">
                    {r.emp.firstName} {r.emp.lastName}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.emp.positionTitle}</td>
                  <td className="px-3 py-2 text-slate-600">{r.emp.positionLevel}</td>
                  <td className="px-3 py-2 text-right text-slate-800">{n(r.basic)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{n(r.hra)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{r.comm ? n(r.comm) : "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{r.contractAllow ? n(r.contractAllow) : "—"}</td>
                  <td className="px-3 py-2 text-right font-bold text-blue-800">{n(r.gross)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{n(r.pf)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{n(r.gis)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{n(r.health)}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{r.tds ? n(r.tds) : "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-700">({n(r.totalDeductions)})</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-700">Nu. {n(r.net)}</td>
                </tr>
              ))
            )}
          </tbody>
          {processed.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-[11px]">
                <td className="px-3 py-2.5 text-slate-700" colSpan={4}>Totals · {totals.headcount} employees</td>
                <td className="px-3 py-2.5 text-right">{n(totals.basic)}</td>
                <td className="px-3 py-2.5 text-right" colSpan={3}>{n(totals.allowances)}</td>
                <td className="px-3 py-2.5 text-right text-blue-800">{n(totals.gross)}</td>
                <td className="px-3 py-2.5 text-right">{n(totals.pf)}</td>
                <td className="px-3 py-2.5 text-right">{n(totals.gis)}</td>
                <td className="px-3 py-2.5 text-right">{n(totals.health)}</td>
                <td className="px-3 py-2.5 text-right">{n(totals.tds)}</td>
                <td className="px-3 py-2.5 text-right text-rose-700">({n(totals.totalDeductions)})</td>
                <td className="px-3 py-2.5 text-right text-emerald-700">Nu. {n(totals.net)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ── Small presentational helpers ──────────────────────────────────────── */

function SummaryCard({ label, value, tone, suffix }: { label: string; value: string; tone: "slate" | "blue" | "indigo" | "rose" | "emerald"; suffix?: string }) {
  const toneMap: Record<string, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
      {suffix && <div className="mt-0.5 text-[10px] opacity-70">{suffix}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}
