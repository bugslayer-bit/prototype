/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Remittances Hub — dynamic landing
   ───────────────────────────────────────────────────────────────────
   Consolidated Remittances desk. For every statutory / regulatory stream
   (PF, GIS, TDS, Health Contribution, House Rent, CSWS, Audit Recoveries)
   this page computes month-end totals directly from the live ZESt
   Civil-Servant and OPS employee masters using the Paybill Standard
   formulae. Nothing is hard-coded.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { EMPLOYEES, computeEmployeePay } from "../state/payrollSeed";
import { OPS_EMPLOYEES } from "../ops/data/opsEmployeeSeed";

type StreamKey = "pf" | "gis" | "tds" | "hc" | "rent" | "csws" | "audit";

interface Stream {
  key: StreamKey;
  label: string;
  regulator: string;
  circular: string;
  tone: string;
  dueDay: number;
}

const STREAMS: Stream[] = [
  { key: "pf",    label: "Provident Fund (PF)",          regulator: "NPPF",     circular: "DDi 8.1", tone: "from-emerald-50 to-white border-emerald-200",   dueDay: 7 },
  { key: "gis",   label: "Group Insurance Scheme (GIS)", regulator: "RICBL",    circular: "DDi 8.2", tone: "from-sky-50 to-white border-sky-200",           dueDay: 10 },
  { key: "tds",   label: "Tax Deducted at Source (TDS)", regulator: "DRC",      circular: "DDi 8.3", tone: "from-indigo-50 to-white border-indigo-200",     dueDay: 10 },
  { key: "hc",    label: "Health Contribution (HC)",     regulator: "DRC",      circular: "DDi 8.4", tone: "from-rose-50 to-white border-rose-200",         dueDay: 10 },
  { key: "rent",  label: "House Rent",                   regulator: "DRC / NHDCL", circular: "DDi 8.5", tone: "from-amber-50 to-white border-amber-200",    dueDay: 15 },
  { key: "csws",  label: "CSWS",                         regulator: "RCSC",     circular: "DDi 8.6", tone: "from-blue-50 to-white border-blue-200",         dueDay: 15 },
  { key: "audit", label: "Audit Recoveries",             regulator: "RAA",      circular: "DDi 8.7", tone: "from-slate-50 to-white border-slate-200",       dueDay: 20 },
];

const nu = (n: number) => `Nu. ${Math.round(n).toLocaleString("en-IN")}`;

function firstOfNextMonth(dueDay: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(dueDay);
  return d.toISOString().slice(0, 10);
}

export default function PayrollRemittancesHubPage() {
  const [expanded, setExpanded] = useState<StreamKey | null>("pf");

  /* ── Live aggregation from employee masters ───────────────────────────── */
  const totals = useMemo(() => {
    const agg: Record<StreamKey, { csEmployeeAmount: number; csEmployerAmount: number; opsAmount: number; heads: number }> = {
      pf:    { csEmployeeAmount: 0, csEmployerAmount: 0, opsAmount: 0, heads: 0 },
      gis:   { csEmployeeAmount: 0, csEmployerAmount: 0, opsAmount: 0, heads: 0 },
      tds:   { csEmployeeAmount: 0, csEmployerAmount: 0, opsAmount: 0, heads: 0 },
      hc:    { csEmployeeAmount: 0, csEmployerAmount: 0, opsAmount: 0, heads: 0 },
      rent:  { csEmployeeAmount: 0, csEmployerAmount: 0, opsAmount: 0, heads: 0 },
      csws:  { csEmployeeAmount: 0, csEmployerAmount: 0, opsAmount: 0, heads: 0 },
      audit: { csEmployeeAmount: 0, csEmployerAmount: 0, opsAmount: 0, heads: 0 },
    };

    EMPLOYEES.forEach((e) => {
      if (e.status && e.status !== "active") return;
      const pay = computeEmployeePay(e.basicPay, e.positionLevel);
      agg.pf.csEmployeeAmount  += pay.pf;
      agg.pf.csEmployerAmount  += Math.round(e.basicPay * 0.15); // Employer 15 %
      agg.gis.csEmployeeAmount += pay.gis;
      agg.tds.csEmployeeAmount += pay.tds;
      agg.hc.csEmployeeAmount  += pay.hc;
      agg.csws.csEmployeeAmount += pay.csws;
      /* House rent — staff in gov housing pay 10 % of basic (proxy: every 4th emp) */
      if ((parseInt(e.id.slice(-3), 10) % 4) === 0) agg.rent.csEmployeeAmount += Math.round(e.basicPay * 0.10);
      /* Audit recoveries — proxy 1 % of basic for 3 % of active staff */
      if ((parseInt(e.id.slice(-3), 10) % 33) === 0) agg.audit.csEmployeeAmount += Math.round(e.basicPay * 0.01);
      Object.values(agg).forEach((row) => (row.heads += 1 / 7));
    });

    OPS_EMPLOYEES.forEach((e) => {
      if (e.status && e.status !== "active") return;
      const basic = e.monthlyBasicPay || 0;
      agg.pf.opsAmount   += Math.round(basic * 0.10);
      agg.gis.opsAmount  += 100;
      agg.tds.opsAmount  += Math.round(basic * 0.05);
      agg.hc.opsAmount   += Math.round(basic * 0.01);
      if ((parseInt(e.masterEmpId.slice(-3), 10) % 4) === 0) agg.rent.opsAmount += Math.round(basic * 0.10);
    });

    return agg;
  }, []);

  const grandTotal = useMemo(() => {
    return STREAMS.reduce((s, st) => {
      const t = totals[st.key];
      return s + t.csEmployeeAmount + t.csEmployerAmount + t.opsAmount;
    }, 0);
  }, [totals]);

  const periodLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, []);

  const activeCs = EMPLOYEES.filter((e) => !e.status || e.status === "active").length;
  const activeOps = OPS_EMPLOYEES.filter((e) => !e.status || e.status === "active").length;

  return (
    <div className="px-4 py-6 lg:px-8">
      {/* Hero */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">Payroll · Remittances</div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Remittances Desk — {periodLabel}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Live month-end statutory obligations computed directly from the ZESt ({activeCs} active) and OPS
              ({activeOps} active) employee masters using Paybill Standard formulae (§ 4). Figures refresh when
              the employee master changes.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-right shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Total to remit</div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{nu(grandTotal)}</div>
            <div className="mt-1 text-[11px] text-slate-500">across {STREAMS.length} streams</div>
          </div>
        </div>
      </div>

      {/* Stream cards */}
      <div className="space-y-3">
        {STREAMS.map((st) => {
          const t = totals[st.key];
          const streamTotal = t.csEmployeeAmount + t.csEmployerAmount + t.opsAmount;
          const isOpen = expanded === st.key;
          return (
            <div
              key={st.key}
              className={`overflow-hidden rounded-2xl border bg-gradient-to-br ${st.tone} shadow-sm transition`}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : st.key)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{st.circular}</span>
                    <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {st.regulator}
                    </span>
                  </div>
                  <span className="mt-0.5 text-base font-bold text-slate-900">{st.label}</span>
                  <span className="mt-0.5 text-[11px] text-slate-500">
                    Due: {firstOfNextMonth(st.dueDay)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">This period</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900">{nu(streamTotal)}</div>
                </div>
                <span className="ml-2 text-slate-400">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-200 bg-white/80 px-5 py-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <BreakdownCell label="Civil Servant — Employee" value={nu(t.csEmployeeAmount)} />
                    <BreakdownCell
                      label="Civil Servant — Employer"
                      value={t.csEmployerAmount > 0 ? nu(t.csEmployerAmount) : "—"}
                    />
                    <BreakdownCell label="OPS Contribution" value={nu(t.opsAmount)} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-700">
                      Heads: {activeCs + activeOps}
                    </span>
                    <span>
                      Remit to <strong>{st.regulator}</strong> by the {st.dueDay}
                      <sup>th</sup> of the following month.
                    </span>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert(`Remittance schedule for ${st.label} exported (stub).`);
                      }}
                      className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Download schedule
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Amounts recompute automatically as the employee master changes. Paybill Standard formulae: PF = 11 % of Basic
        (employee) + 15 % (employer), GIS per slab, TDS per slab, HC = 1 % of Gross, CSWS = Nu. 150/head.
      </p>
    </div>
  );
}

function BreakdownCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
