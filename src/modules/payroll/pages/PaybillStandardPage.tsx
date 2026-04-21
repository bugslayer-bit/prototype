/* ═══════════════════════════════════════════════════════════════════════════
   Paybill Standard — Canonical Paybill Formulae (MoF central configuration)
   ─────────────────────────────────────────────────────────────────────────
   Fully-DYNAMIC central config page. MoF (agency code 16) can toggle Edit
   mode and update rates, slabs, GIS groups, allowances, deductions and
   remittance destinations. Changes persist to localStorage under
   `ifmis_paybill_standard` and feed the Live Preview in real-time.
   Non-MoF users see the tables read-only.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAgencyUrl } from "../../../shared/hooks/useAgencyUrl";
import {
  PF_EMPLOYER_RATE,
  PF_EMPLOYEE_RATE,
  HC_RATE,
  CSWS_DEFAULT,
  GIS_GROUPS,
  REMITTANCE_DESTINATIONS,
  PAYBILL_SCHEDULES,
} from "../state/paybillStandard";
import { ALLOWANCES, DEDUCTIONS, PAY_SCALES } from "../state/payrollSeed";

const LS_KEY = "ifmis_paybill_standard";
const nu = (n: number) => `Nu ${n.toLocaleString()}`;

/* ── Editable config shape ─────────────────────────────────────────────── */
interface TdsSlab { id: string; upTo: number | null; ratePct: number; baseNu: number; }
interface GisGroup { group: string; levels: string; subscription: number; coverage: number; }
interface RateConfig {
  pfEmployeePct: number;
  pfEmployerPct: number;
  hcPct: number;
  cswsFixed: number;
  tdsExempt: number;
}
interface AllowanceRow { id: string; ucoaCode: string; name: string; calcMethod: string; value: number; active: boolean; }
interface DeductionRow { id: string; ucoaCode: string; name: string; category: string; calcMethod: string; value: number; applicableTo: string; }
interface RemittanceRow { key: string; body: string; account: string; contra: string; }

interface PaybillConfig {
  rates: RateConfig;
  tds: TdsSlab[];
  gis: GisGroup[];
  allowances: AllowanceRow[];
  deductions: DeductionRow[];
  remittances: RemittanceRow[];
}

const DEFAULT_CONFIG: PaybillConfig = {
  rates: {
    pfEmployeePct: PF_EMPLOYEE_RATE * 100,
    pfEmployerPct: PF_EMPLOYER_RATE * 100,
    hcPct: HC_RATE * 100,
    cswsFixed: CSWS_DEFAULT,
    tdsExempt: 25000,
  },
  tds: [
    { id: "t1", upTo: 25000,  ratePct: 0,  baseNu: 0 },
    { id: "t2", upTo: 33333,  ratePct: 10, baseNu: 0 },
    { id: "t3", upTo: 41667,  ratePct: 15, baseNu: 833 },
    { id: "t4", upTo: 58333,  ratePct: 20, baseNu: 2083 },
    { id: "t5", upTo: null,   ratePct: 25, baseNu: 5416 },
  ],
  gis: GIS_GROUPS.map((g) => ({
    group: g.group,
    levels: g.levels.join(", "),
    subscription: g.subscriptionRate,
    coverage: g.insuranceCoverage,
  })),
  allowances: ALLOWANCES.map((a) => ({
    id: a.id,
    ucoaCode: a.ucoaCode,
    name: a.name,
    calcMethod: a.calcMethod,
    value: a.value,
    active: a.active,
  })),
  deductions: DEDUCTIONS.map((d) => ({
    id: d.id,
    ucoaCode: d.ucoaCode,
    name: d.name,
    category: d.category,
    calcMethod: d.calcMethod,
    value: d.value,
    applicableTo: String(d.applicableTo ?? ""),
  })),
  remittances: Object.entries(REMITTANCE_DESTINATIONS).map(([key, d]) => ({
    key,
    body: d.body,
    account: d.account,
    contra: d.contra,
  })),
};

function loadConfig(): PaybillConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

/* ── Live computation using CURRENT (possibly edited) config ──────────── */
function computePreview(cfg: PaybillConfig, basic: number, level: string, allowances: number) {
  const X = basic + allowances; // A+B+C+D (B, C = 0 for preview)
  const pfEmployee = Math.round(basic * cfg.rates.pfEmployeePct / 100);
  const pfEmployer = Math.round(basic * cfg.rates.pfEmployerPct / 100);
  const hc = Math.round(X * cfg.rates.hcPct / 100);
  /* TDS: walk slabs in order */
  let tds = 0;
  if (X > cfg.rates.tdsExempt) {
    const taxable = X - cfg.rates.tdsExempt;
    const sorted = [...cfg.tds].filter((s) => s.ratePct > 0).sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
    let prevCap = 0;
    for (const s of sorted) {
      const cap = s.upTo ?? Infinity;
      if (taxable <= cap) {
        tds = Math.round(s.baseNu + (taxable - prevCap) * s.ratePct / 100);
        break;
      }
      prevCap = cap;
    }
  }
  /* GIS: find matching group */
  const gisGroup = cfg.gis.find((g) => g.levels.split(",").map((s) => s.trim()).includes(level));
  const gis = gisGroup?.subscription ?? 0;
  const csws = cfg.rates.cswsFixed;
  const Y = pfEmployee + tds + hc + gis + csws;
  return { X, Y, Z: X - Y, pfEmployee, pfEmployer, hc, tds, gis, csws };
}

export function PaybillStandardPage() {
  const navigate = useNavigate();
  const { buildPath } = useAgencyUrl();
  const { activeAgencyCode } = useAuth();
  const isMof = activeAgencyCode === "16";

  const [config, setConfig] = useState<PaybillConfig>(() => loadConfig());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PaybillConfig>(config);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /* Live preview inputs */
  const [previewBasic, setPreviewBasic] = useState(45000);
  const [previewLevel, setPreviewLevel] = useState("P3");
  const [previewAllowances, setPreviewAllowances] = useState(15000);
  const preview = useMemo(
    () => computePreview(editing ? draft : config, previewBasic, previewLevel, previewAllowances),
    [editing, draft, config, previewBasic, previewLevel, previewAllowances],
  );

  useEffect(() => {
    if (!editing) setDraft(config);
  }, [editing, config]);

  function startEdit() { setDraft(config); setEditing(true); }
  function cancelEdit() { setDraft(config); setEditing(false); }
  function saveEdit() {
    setConfig(draft);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
    setSavedAt(new Date().toLocaleTimeString());
    setEditing(false);
  }
  function resetDefaults() {
    if (!window.confirm("Reset all paybill standard values to their defaults?")) return;
    setConfig(DEFAULT_CONFIG);
    setDraft(DEFAULT_CONFIG);
    try { window.localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setSavedAt(null);
    setEditing(false);
  }

  const active = editing ? draft : config;
  const readOnly = !editing;

  /* Helpers for typed updates */
  const patchRates = (k: keyof RateConfig, v: number) => setDraft((d) => ({ ...d, rates: { ...d.rates, [k]: v } }));
  const patchTds = (i: number, k: keyof TdsSlab, v: any) => setDraft((d) => ({ ...d, tds: d.tds.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  const patchGis = (i: number, k: keyof GisGroup, v: any) => setDraft((d) => ({ ...d, gis: d.gis.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  const patchAlw = (i: number, k: keyof AllowanceRow, v: any) => setDraft((d) => ({ ...d, allowances: d.allowances.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  const patchDed = (i: number, k: keyof DeductionRow, v: any) => setDraft((d) => ({ ...d, deductions: d.deductions.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  const patchRem = (i: number, k: keyof RemittanceRow, v: any) => setDraft((d) => ({ ...d, remittances: d.remittances.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));

  const addTdsRow = () => setDraft((d) => ({ ...d, tds: [...d.tds, { id: `t${Date.now()}`, upTo: null, ratePct: 0, baseNu: 0 }] }));
  const delTdsRow = (i: number) => setDraft((d) => ({ ...d, tds: d.tds.filter((_, idx) => idx !== i) }));
  const addGisRow = () => setDraft((d) => ({ ...d, gis: [...d.gis, { group: "X", levels: "", subscription: 0, coverage: 0 }] }));
  const delGisRow = (i: number) => setDraft((d) => ({ ...d, gis: d.gis.filter((_, idx) => idx !== i) }));
  const addAlwRow = () => setDraft((d) => ({ ...d, allowances: [...d.allowances, { id: `ALW-NEW-${Date.now()}`, ucoaCode: "", name: "New Allowance", calcMethod: "fixed", value: 0, active: true }] }));
  const delAlwRow = (i: number) => setDraft((d) => ({ ...d, allowances: d.allowances.filter((_, idx) => idx !== i) }));
  const addDedRow = () => setDraft((d) => ({ ...d, deductions: [...d.deductions, { id: `DED-NEW-${Date.now()}`, ucoaCode: "", name: "New Deduction", category: "statutory", calcMethod: "fixed", value: 0, applicableTo: "all" }] }));
  const delDedRow = (i: number) => setDraft((d) => ({ ...d, deductions: d.deductions.filter((_, idx) => idx !== i) }));
  const addRemRow = () => setDraft((d) => ({ ...d, remittances: [...d.remittances, { key: "new", body: "", account: "", contra: "TSA Debit" }] }));
  const delRemRow = (i: number) => setDraft((d) => ({ ...d, remittances: d.remittances.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={buildPath("/")} className="hover:text-indigo-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Payroll</Link>
          <span>/</span>
          <span className="font-bold text-indigo-700">Paybill Standard</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700">← Back</button>
          <button onClick={() => navigate(buildPath("/payroll/management"))} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100">⬆ Payroll Management</button>
        </div>
      </nav>

      {/* Title + Edit toolbar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Paybill Standard</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Canonical formulae for paybill generation, recoveries, CM reports and remittance schedules.
            Every payroll computation in IFMIS pulls from this configuration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-700">
            MoF · Central Config
          </span>
          {savedAt && !editing && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">✓ Saved {savedAt}</span>
          )}
          {isMof && !editing && (
            <>
              <button onClick={startEdit} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700">✎ Edit Configuration</button>
              <button onClick={resetDefaults} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100">↺ Reset Defaults</button>
            </>
          )}
          {isMof && editing && (
            <>
              <button onClick={saveEdit} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">💾 Save Changes</button>
              <button onClick={cancelEdit} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            </>
          )}
        </div>
      </div>

      {!isMof && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-bold">⚠ Read-only.</span> Paybill Standard is configured centrally by MoF. Agencies can view but not edit.
        </div>
      )}
      {editing && (
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-3 text-xs text-indigo-900">
          <span className="font-bold">✎ Edit mode.</span> Changes are shown live in the preview above. Click <strong>Save</strong> to persist, or <strong>Cancel</strong> to discard.
        </div>
      )}

      {/* ── Live Computation Preview ─────────────────────────────────── */}
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-indigo-900">Live Computation Preview</h2>
        <p className="mt-1 text-xs text-indigo-700">
          Uses the {editing ? "DRAFT (unsaved)" : "current saved"} configuration. Adjust inputs to verify formulae.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <LabelInput label="Basic Pay (A)" type="number" value={previewBasic} onChange={(v) => setPreviewBasic(Number(v))} />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Position Level</span>
            <select value={previewLevel} onChange={(e) => setPreviewLevel(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {PAY_SCALES.map((p) => <option key={p.level} value={p.level}>{p.level} — {p.label}</option>)}
            </select>
          </label>
          <LabelInput label="Total Allowances (D)" type="number" value={previewAllowances} onChange={(v) => setPreviewAllowances(Number(v))} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewCard label="Total Earnings (X)" value={nu(preview.X)} formula="A+B+C+D" tone="blue" />
          <PreviewCard label="Total Deductions (Y)" value={nu(preview.Y)} formula="E+F+G+H+I" tone="amber" />
          <PreviewCard label="Net Pay (Z)" value={nu(preview.Z)} formula="X − Y" tone="emerald" />
          <PreviewCard label="Employer PF" value={nu(preview.pfEmployer)} formula={`${active.rates.pfEmployerPct}% × Basic`} tone="violet" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Pill label={`PF Employee (${active.rates.pfEmployeePct}%)`} value={nu(preview.pfEmployee)} />
          <Pill label="TDS" value={nu(preview.tds)} />
          <Pill label={`HC (${active.rates.hcPct}%)`} value={nu(preview.hc)} />
          <Pill label="GIS" value={nu(preview.gis)} />
          <Pill label={`CSWS (fixed)`} value={nu(preview.csws)} />
        </div>
      </section>

      {/* ── Table 1 — Core Statutory Rates ───────────────────────────── */}
      <TableCard title="Table 1 · Core Statutory Rates" subtitle="Base rates applied to every paybill line.">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <Th>Code</Th><Th>Parameter</Th><Th>Unit</Th><Th>Value</Th><Th>Applied to</Th><Th>Remit to</Th>
            </tr>
          </thead>
          <tbody>
            <Tr>
              <Td mono>E</Td><Td bold>PF — Employee Contribution</Td><Td>%</Td>
              <Td right><NumInput readOnly={readOnly} value={active.rates.pfEmployeePct} onChange={(v) => patchRates("pfEmployeePct", v)} suffix="%" /></Td>
              <Td>Basic Pay (A)</Td><Td>NPPF</Td>
            </Tr>
            <Tr>
              <Td mono>—</Td><Td bold>PF — Employer Contribution</Td><Td>%</Td>
              <Td right><NumInput readOnly={readOnly} value={active.rates.pfEmployerPct} onChange={(v) => patchRates("pfEmployerPct", v)} suffix="%" /></Td>
              <Td>Basic Pay (A)</Td><Td>NPPF</Td>
            </Tr>
            <Tr>
              <Td mono>G</Td><Td bold>Health Contribution</Td><Td>%</Td>
              <Td right><NumInput readOnly={readOnly} value={active.rates.hcPct} onChange={(v) => patchRates("hcPct", v)} suffix="%" /></Td>
              <Td>Total Earnings (X)</Td><Td>DRC</Td>
            </Tr>
            <Tr>
              <Td mono>I</Td><Td bold>CSWS — Welfare Scheme</Td><Td>Nu (fixed)</Td>
              <Td right><NumInput readOnly={readOnly} value={active.rates.cswsFixed} onChange={(v) => patchRates("cswsFixed", v)} prefix="Nu" /></Td>
              <Td>—</Td><Td>RCSC / RICBL</Td>
            </Tr>
            <Tr>
              <Td mono>F</Td><Td bold>TDS — Exemption Threshold</Td><Td>Nu / month</Td>
              <Td right><NumInput readOnly={readOnly} value={active.rates.tdsExempt} onChange={(v) => patchRates("tdsExempt", v)} prefix="Nu" /></Td>
              <Td>Total Earnings (X)</Td><Td>DRC</Td>
            </Tr>
          </tbody>
        </table>
      </TableCard>

      {/* ── Table 2 — TDS Slabs ──────────────────────────────────────── */}
      <TableCard title="Table 2 · TDS Slabs (DRC · FY2025-26)"
        subtitle={`Slabs evaluated above the exemption of ${nu(active.rates.tdsExempt)}.`}
        right={editing && <button onClick={addTdsRow} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">+ Add Slab</button>}>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <Th>#</Th><Th>Taxable Up To (Nu)</Th><Th>Rate (%)</Th><Th>Base (Nu)</Th><Th>Formula</Th>
              {editing && <Th>Action</Th>}
            </tr>
          </thead>
          <tbody>
            {active.tds.map((s, i) => (
              <Tr key={s.id}>
                <Td mono>{i + 1}</Td>
                <Td right>
                  {editing ? (
                    <input type="number" value={s.upTo ?? ""} placeholder="∞" onChange={(e) => patchTds(i, "upTo", e.target.value === "" ? null : Number(e.target.value))} className="w-28 rounded border border-slate-300 px-2 py-1 text-right text-sm" />
                  ) : (s.upTo === null ? "∞ (no cap)" : nu(s.upTo))}
                </Td>
                <Td right><NumInput readOnly={readOnly} value={s.ratePct} onChange={(v) => patchTds(i, "ratePct", v)} suffix="%" /></Td>
                <Td right><NumInput readOnly={readOnly} value={s.baseNu} onChange={(v) => patchTds(i, "baseNu", v)} prefix="Nu" /></Td>
                <Td small>{s.ratePct === 0 ? "Exempt" : `${s.baseNu} + ${s.ratePct}% × (Taxable − previous cap)`}</Td>
                {editing && (
                  <Td><button onClick={() => delTdsRow(i)} className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-200">✕</button></Td>
                )}
              </Tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* ── Table 3 — GIS Groups ─────────────────────────────────────── */}
      <TableCard title="Table 3 · GIS — Group Insurance Scheme (RICBL Table XXXII)"
        subtitle="Monthly subscription and sum-insured keyed by Position Level group."
        right={editing && <button onClick={addGisRow} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">+ Add Group</button>}>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <Th>Group</Th><Th>Position Levels (comma-separated)</Th><Th>Subscription / month</Th><Th>Insurance Coverage</Th>
              {editing && <Th>Action</Th>}
            </tr>
          </thead>
          <tbody>
            {active.gis.map((g, i) => (
              <Tr key={g.group + i}>
                <Td>
                  {editing ? (
                    <input value={g.group} onChange={(e) => patchGis(i, "group", e.target.value)} className="w-16 rounded border border-slate-300 px-2 py-1 text-sm font-bold" />
                  ) : <span className="font-bold text-indigo-700">Group {g.group}</span>}
                </Td>
                <Td>
                  {editing ? (
                    <input value={g.levels} onChange={(e) => patchGis(i, "levels", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono" />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {g.levels.split(",").map((l) => l.trim()).filter(Boolean).map((l) => (
                        <span key={l} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold">{l}</span>
                      ))}
                    </div>
                  )}
                </Td>
                <Td right><NumInput readOnly={readOnly} value={g.subscription} onChange={(v) => patchGis(i, "subscription", v)} prefix="Nu" /></Td>
                <Td right><NumInput readOnly={readOnly} value={g.coverage} onChange={(v) => patchGis(i, "coverage", v)} prefix="Nu" /></Td>
                {editing && <Td><button onClick={() => delGisRow(i)} className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-200">✕</button></Td>}
              </Tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* ── Table 4 — Allowance Configuration ────────────────────────── */}
      <TableCard title="Table 4 · Allowance Configuration (UCoA-mapped)"
        subtitle={`${active.allowances.length} configured · ${active.allowances.filter((a) => a.active).length} active.`}
        right={editing && <button onClick={addAlwRow} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">+ Add Allowance</button>}>
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
            <tr>
              <Th>UCoA</Th><Th>Allowance</Th><Th>Calc Method</Th><Th>Value</Th><Th>Status</Th>
              {editing && <Th>Action</Th>}
            </tr>
          </thead>
          <tbody>
            {active.allowances.map((a, i) => (
              <Tr key={a.id + i}>
                <Td mono>{editing ? <input value={a.ucoaCode} onChange={(e) => patchAlw(i, "ucoaCode", e.target.value)} className="w-24 rounded border border-slate-300 px-1.5 py-0.5" /> : a.ucoaCode}</Td>
                <Td bold>{editing ? <input value={a.name} onChange={(e) => patchAlw(i, "name", e.target.value)} className="w-full rounded border border-slate-300 px-1.5 py-0.5" /> : a.name}</Td>
                <Td>
                  {editing ? (
                    <select value={a.calcMethod} onChange={(e) => patchAlw(i, "calcMethod", e.target.value)} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs">
                      <option value="fixed">fixed</option>
                      <option value="pct-basic">pct-basic</option>
                      <option value="one-off">one-off</option>
                      <option value="indexation">indexation</option>
                    </select>
                  ) : <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">{a.calcMethod}</span>}
                </Td>
                <Td right><NumInput readOnly={readOnly} value={a.value} onChange={(v) => patchAlw(i, "value", v)} suffix={a.calcMethod === "pct-basic" ? "%" : ""} prefix={a.calcMethod === "pct-basic" ? "" : "Nu"} /></Td>
                <Td>
                  {editing ? (
                    <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={a.active} onChange={(e) => patchAlw(i, "active", e.target.checked)} /> {a.active ? "Active" : "Inactive"}</label>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{a.active ? "ACTIVE" : "INACTIVE"}</span>
                  )}
                </Td>
                {editing && <Td><button onClick={() => delAlwRow(i)} className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-200">✕</button></Td>}
              </Tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* ── Table 5 — Deduction Configuration ────────────────────────── */}
      <TableCard title="Table 5 · Deduction Configuration"
        subtitle={`${active.deductions.length} configured deductions.`}
        right={editing && <button onClick={addDedRow} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">+ Add Deduction</button>}>
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
            <tr>
              <Th>UCoA</Th><Th>Deduction</Th><Th>Category</Th><Th>Calc</Th><Th>Value</Th><Th>Applies To</Th>
              {editing && <Th>Action</Th>}
            </tr>
          </thead>
          <tbody>
            {active.deductions.map((d, i) => (
              <Tr key={d.id + i}>
                <Td mono>{editing ? <input value={d.ucoaCode} onChange={(e) => patchDed(i, "ucoaCode", e.target.value)} className="w-24 rounded border border-slate-300 px-1.5 py-0.5" /> : d.ucoaCode}</Td>
                <Td bold>{editing ? <input value={d.name} onChange={(e) => patchDed(i, "name", e.target.value)} className="w-full rounded border border-slate-300 px-1.5 py-0.5" /> : d.name}</Td>
                <Td>
                  {editing ? <input value={d.category} onChange={(e) => patchDed(i, "category", e.target.value)} className="w-28 rounded border border-slate-300 px-1.5 py-0.5" /> : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{d.category}</span>
                  )}
                </Td>
                <Td>{editing ? (
                  <select value={d.calcMethod} onChange={(e) => patchDed(i, "calcMethod", e.target.value)} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs">
                    <option value="fixed">fixed</option>
                    <option value="pct-basic">pct-basic</option>
                    <option value="pct-gross">pct-gross</option>
                    <option value="slab">slab</option>
                  </select>
                ) : d.calcMethod}</Td>
                <Td right><NumInput readOnly={readOnly} value={d.value} onChange={(v) => patchDed(i, "value", v)} suffix={(d.calcMethod === "pct-basic" || d.calcMethod === "pct-gross") ? "%" : ""} prefix={(d.calcMethod === "pct-basic" || d.calcMethod === "pct-gross") ? "" : "Nu"} /></Td>
                <Td small>{editing ? <input value={d.applicableTo} onChange={(e) => patchDed(i, "applicableTo", e.target.value)} className="w-full rounded border border-slate-300 px-1.5 py-0.5" /> : d.applicableTo}</Td>
                {editing && <Td><button onClick={() => delDedRow(i)} className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-200">✕</button></Td>}
              </Tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* ── Table 6 — Remittance Destinations ────────────────────────── */}
      <TableCard title="Table 6 · Remittance Destinations"
        subtitle="Auto-posted by IFMIS once salary disbursement succeeds."
        right={editing && <button onClick={addRemRow} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700">+ Add Destination</button>}>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <Th>Key</Th><Th>Body</Th><Th>Account</Th><Th>Contra</Th>
              {editing && <Th>Action</Th>}
            </tr>
          </thead>
          <tbody>
            {active.remittances.map((r, i) => (
              <Tr key={r.key + i}>
                <Td mono>{editing ? <input value={r.key} onChange={(e) => patchRem(i, "key", e.target.value)} className="w-24 rounded border border-slate-300 px-1.5 py-0.5" /> : r.key}</Td>
                <Td>{editing ? <input value={r.body} onChange={(e) => patchRem(i, "body", e.target.value)} className="w-32 rounded border border-slate-300 px-1.5 py-0.5" /> : (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">{r.body}</span>
                )}</Td>
                <Td bold>{editing ? <input value={r.account} onChange={(e) => patchRem(i, "account", e.target.value)} className="w-full rounded border border-slate-300 px-1.5 py-0.5" /> : r.account}</Td>
                <Td small>{editing ? <input value={r.contra} onChange={(e) => patchRem(i, "contra", e.target.value)} className="w-32 rounded border border-slate-300 px-1.5 py-0.5" /> : r.contra}</Td>
                {editing && <Td><button onClick={() => delRemRow(i)} className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-200">✕</button></Td>}
              </Tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* ── Table 7 — Paybill Line Schema (reference) ────────────────── */}
      <TableCard title="Table 7 · Paybill Line Schema (A–Z — read-only reference)"
        subtitle="Column model applied to every paybill row. Letters A–K appear directly on the Paybill sheet.">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr><Th>Code</Th><Th>Section</Th><Th>Label</Th><Th>Formula / Basis</Th></tr>
          </thead>
          <tbody>
            {[
              { c: "A", sec: "Earnings", l: "Basic Pay", f: "From Pay Scale × step" },
              { c: "B", sec: "Earnings", l: "Arrears", f: "HR Actions / Pay Fixation backdated" },
              { c: "C", sec: "Earnings", l: "Partial Pay", f: "Mid-month join / separation proration" },
              { c: "D", sec: "Earnings", l: "Total Allowances", f: "Sum of eligible allowances (Table 4)" },
              { c: "X", sec: "Earnings", l: "Total Earnings", f: "A + B + C + D" },
              { c: "E", sec: "Deductions", l: "PF (Employee)", f: `${active.rates.pfEmployeePct}% × A` },
              { c: "F", sec: "Deductions", l: "TDS", f: `Slab on X above ${nu(active.rates.tdsExempt)} (Table 2)` },
              { c: "G", sec: "Deductions", l: "Health Contribution", f: `${active.rates.hcPct}% × X` },
              { c: "H", sec: "Deductions", l: "GIS", f: "Group subscription by Position Level (Table 3)" },
              { c: "I", sec: "Deductions", l: "CSWS", f: `Fixed ${nu(active.rates.cswsFixed)}` },
              { c: "J", sec: "Deductions", l: "House Rent", f: "DRC / NHDCL / NPPF schedule" },
              { c: "K", sec: "Deductions", l: "Audit Recoveries", f: "RAA AIN schedule" },
              { c: "Y", sec: "Deductions", l: "Total Deductions", f: "E + F + G + H + I + J + K + Floating" },
              { c: "Z", sec: "Net", l: "Net Pay", f: "X − Y" },
            ].map((r) => (
              <Tr key={r.c}>
                <Td><span className={`inline-flex h-5 w-5 items-center justify-center rounded font-mono font-bold ${r.sec === "Earnings" ? "bg-blue-200 text-blue-900" : r.sec === "Net" ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"}`}>{r.c}</span></Td>
                <Td><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.sec === "Earnings" ? "bg-blue-100 text-blue-700" : r.sec === "Net" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.sec}</span></Td>
                <Td bold>{r.l}</Td>
                <Td small>{r.f}</Td>
              </Tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* ── Table 8 — Paybill Schedules Generated ────────────────────── */}
      <TableCard title="Table 8 · Paybill Schedules Generated"
        subtitle="Reports IFMIS produces each payroll cycle; destinations in Table 6.">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr><Th>Schedule ID</Th><Th>Label</Th><Th>Body / Consumer</Th></tr>
          </thead>
          <tbody>
            {PAYBILL_SCHEDULES.map((s) => (
              <Tr key={s.id}>
                <Td mono>{s.id}</Td>
                <Td bold>{s.label}</Td>
                <Td><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{s.body}</span></Td>
              </Tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Presentation helpers
   ═════════════════════════════════════════════════════════════════════════ */

function TableCard({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold">{children}</th>
);
const Tr = ({ children }: { children: React.ReactNode }) => (
  <tr className="hover:bg-indigo-50/30">{children}</tr>
);
function Td({ children, right, mono, bold, small }: { children: React.ReactNode; right?: boolean; mono?: boolean; bold?: boolean; small?: boolean; }) {
  const cls = [
    "border border-slate-200 px-3 py-1.5",
    right ? "text-right" : "",
    mono ? "font-mono text-slate-600" : "",
    bold ? "font-semibold text-slate-900" : "text-slate-700",
    small ? "text-[11px] text-slate-600" : "",
  ].filter(Boolean).join(" ");
  return <td className={cls}>{children}</td>;
}

function NumInput({ value, onChange, readOnly, prefix, suffix }: { value: number; onChange: (v: number) => void; readOnly?: boolean; prefix?: string; suffix?: string; }) {
  if (readOnly) {
    return <span className="font-mono font-semibold text-slate-900">{prefix ? `${prefix} ` : ""}{value.toLocaleString()}{suffix ?? ""}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      {prefix && <span className="text-[10px] text-slate-500">{prefix}</span>}
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-24 rounded border border-slate-300 px-2 py-1 text-right font-mono text-sm" />
      {suffix && <span className="text-[10px] text-slate-500">{suffix}</span>}
    </span>
  );
}

function LabelInput({ label, value, onChange, type = "text" }: { label: string; value: number | string; onChange: (v: string) => void; type?: string; }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
    </label>
  );
}

function PreviewCard({ label, value, formula, tone }: { label: string; value: string; formula: string; tone: "blue" | "amber" | "emerald" | "violet"; }) {
  const cls: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  };
  return (
    <div className={`rounded-xl border p-3 ${cls[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold">{value}</div>
      <div className="mt-1 font-mono text-[10px] opacity-70">{formula}</div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
