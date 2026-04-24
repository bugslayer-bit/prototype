/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Remittances — Per-Stream Schedule Page
   ─────────────────────────────────────────────
   A single routed page used by all ten remittance sidebar entries. It picks
   which schedule to render from the URL (via scheduleKeyForPath) and exposes
   month / year / agency selectors so the user can pull historical data.
   Column layouts follow the Paybill Formulae.xlsx sheets for each stream.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { REMITTANCE_DESTINATIONS, type RemittanceStreamKey } from "../state/paybillStandard";
import {
  buildSchedule,
  downloadScheduleCsv,
  scheduleKeyForPath,
  type ScheduleView,
  type ScheduleViewKey,
} from "../state/remittanceSchedules";
import { useRemittanceDispatches } from "../state/remittanceDispatches";
import { AGENCIES, DEMO_AGENCY_CODES } from "../../../shared/data/agencyPersonas";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const nu = (n: number) => `Nu. ${Math.round(n).toLocaleString("en-IN")}`;

export default function PayrollRemittancesHubPage() {
  const location = useLocation();
  const streamKey: ScheduleViewKey = scheduleKeyForPath(location.pathname);

  /* ── Pickers — default to current period + "All Agencies". ────────────── */
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [agencyCode, setAgencyCode] = useState<string>("all");

  const agencyOptions = useMemo(() => {
    const filter = DEMO_AGENCY_CODES.length > 0 ? new Set(DEMO_AGENCY_CODES) : null;
    return AGENCIES.filter((a) => !filter || filter.has(a.code))
      .filter((a) => a.code !== "EXT" && a.code !== "FI" && a.code !== "MR" && !a.code.startsWith("UP-"))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const view: ScheduleView = useMemo(
    () => buildSchedule(streamKey, { year, month, agencyCode }),
    [streamKey, year, month, agencyCode],
  );

  /* ── Dispatch status (auto-post tracking) — only relevant for true
       remittance streams (not paybillRecoveries / cmReport). */
  const dispatches = useRemittanceDispatches();
  const disp = useMemo(() => {
    if (!isRemittanceStream(streamKey)) return null;
    const rel = dispatches.filter((d) => d.streamKey === streamKey);
    return rel.reduce(
      (acc, d) => {
        acc[d.status] = (acc[d.status] ?? 0) + 1;
        acc.total += 1;
        return acc;
      },
      { pending: 0, dispatched: 0, failed: 0, total: 0 } as Record<string, number>,
    );
  }, [dispatches, streamKey]);

  const years = useMemo(() => {
    const y: number[] = [];
    for (let i = now.getFullYear() - 2; i <= now.getFullYear() + 1; i++) y.push(i);
    return y;
  }, [now]);

  const pageTitle = titleForStream(streamKey);

  return (
    <div className="px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Payroll · Remittances POSTING
          </div>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {subtitleForStream(streamKey)}
          </p>
        </div>
        {disp && disp.total > 0 && <DispatchBadge disp={disp} />}
      </div>

      {/* Selectors */}
      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[180px_140px_1fr_auto] md:items-end">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          <span>Agency</span>
          <select
            value={agencyCode}
            onChange={(e) => setAgencyCode(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          >
            <option value="all">All Agencies</option>
            {agencyOptions.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          <span>Year</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          <span>Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => downloadScheduleCsv(view)}
          disabled={view.rows.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
        >
          Download CSV
        </button>
      </div>

      {/* Header pills + remit instruction */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
        <HeaderPill label="Agency Code" value={view.header.agencyCode} />
        <HeaderPill label="Payroll Dept" value={view.header.payrollDept} />
        <HeaderPill label="Financial Year" value={view.header.financialYear} />
        <HeaderPill label="Month ID" value={view.header.monthId} />
        <HeaderPill label="Remit To" value={view.body} />
        <HeaderPill label="Account" value={view.account} />
        <HeaderPill label="Contra" value={view.contra} />
      </div>

      {/* Totals strip */}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SummaryTile label="Heads" value={String(view.rows.length)} />
        <SummaryTile label="Total Amount" value={nu(view.totalAmount)} />
        <SummaryTile
          label="Dispatch"
          value={
            disp && disp.total > 0
              ? `${disp.dispatched}/${disp.total} dispatched${disp.pending ? ` · ${disp.pending} pending` : ""}`
              : streamKey === "cmReport" || streamKey === "paybillRecoveries"
                ? "Internal report"
                : "Queue empty"
          }
        />
      </div>

      {/* Full schedule table (no collapse) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-[12px]">
          <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              {view.columns.map((c) => (
                <th
                  key={c.id}
                  className={`whitespace-nowrap px-3 py-2.5 ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {view.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={view.columns.length}
                  className="px-3 py-8 text-center text-sm text-slate-500"
                >
                  No eligible employees for this stream / agency / period.
                </td>
              </tr>
            ) : (
              view.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  {view.columns.map((c) => (
                    <td
                      key={c.id}
                      className={`whitespace-nowrap px-3 py-1.5 ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                    >
                      {typeof row[c.id] === "number"
                        ? Number(row[c.id]).toLocaleString("en-IN")
                        : String(row[c.id] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {view.rows.length > 0 && (
            <tfoot className="bg-slate-50 text-xs font-bold text-slate-700">
              <tr>
                <td colSpan={view.columns.length - 1} className="px-3 py-2.5 text-right">
                  Total for this Payroll Department
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {nu(view.totalAmount)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* SRS footer note */}
      {isRemittanceStream(streamKey) && (
        <p className="mt-4 text-[11px] text-slate-500">
          <strong>SRS:</strong> this remittance is auto-posted to {view.body} by IFMIS once MCP releases the
          salary payment — a TSA {view.contra.includes("Contra") ? "contra entry" : "debit"} is generated against{" "}
          {view.account}. Column schema sourced from Paybill Formulae.xlsx
          {streamKey === "rentNppf" && " (Rent NPPF follows the SRS Remittances POSTING note; no dedicated sheet)"}.
        </p>
      )}
    </div>
  );
}

/* ─── helpers ───────────────────────────────────────────────────────────── */

function isRemittanceStream(key: ScheduleViewKey): key is RemittanceStreamKey {
  return key in REMITTANCE_DESTINATIONS;
}

function titleForStream(key: ScheduleViewKey): string {
  switch (key) {
    case "tds":               return "DRC — Tax on Salary (TDS) Schedule";
    case "hc":                return "DRC — Health Contribution Schedule";
    case "pf":                return "NPPF — Provident Fund & Pension Schedule";
    case "gis":               return "RICBL — Group Insurance Scheme Schedule";
    case "rentDrc":           return "DRC — House Rent Schedule";
    case "rentNhdcl":         return "NHDCL — House Rent Schedule";
    case "rentNppf":          return "NPPF — House Rent Schedule";
    case "csws":              return "RCSC — CSWS Schedule";
    case "audit":             return "RAA — Audit Recoveries Schedule";
    case "afws":              return "RBP — AFWS Recoveries Schedule";
    case "drcCombined":       return "DRC — TDS + Health Contribution Schedule";
    case "paybillRecoveries": return "Paybill Recoveries Report";
    case "cmReport":          return "Paybill Report to Cash Management";
  }
}

function subtitleForStream(key: ScheduleViewKey): string {
  switch (key) {
    case "paybillRecoveries":
      return "All statutory + floating deductions per employee (columns E–K). Total O = E+F+G+H+I+J+K.";
    case "cmReport":
      return "Payment file sent to Cash Management after bank validations complete.";
    case "afws":
      return "Armed Forces Welfare Scheme recoveries for Royal Bhutan Police (OPS).";
    default:
      return "Auto-posted by IFMIS to the destination system once MCP releases the salary payment.";
  }
}

/* ─── small presentational components ───────────────────────────────────── */

function DispatchBadge({ disp }: { disp: Record<string, number> }) {
  const tone =
    disp.failed > 0
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : disp.pending > 0
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";
  const label =
    disp.failed > 0
      ? `${disp.failed} failed`
      : disp.pending > 0
        ? `${disp.pending} pending`
        : `${disp.dispatched}/${disp.total} dispatched`;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Auto-post</span>
      {label}
    </span>
  );
}

function HeaderPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="font-mono text-slate-700">{value}</span>
    </span>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}
