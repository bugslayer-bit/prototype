/* ═══════════════════════════════════════════════════════════════════════════
   InvoiceNumberingFormatCard — Master Data · Invoice Numbering Format
   ──────────────────────────────────────────────────────────────────────
   One-time configuration that drives `Invoice_Number` (DD 15.4) for every
   invoice created downstream across all channels (portal / manual / API).

     * Numbering format pattern     (e.g. INV-FY-AGY-SEQ)
     * Sequence reset rule          (Annual / Continuous / Monthly)
     * Optional prefixes            (agency, contract type, funding source)
     * Separate numbering for interface invoices vs manual invoices

   Config is persisted to localStorage so it survives reloads — same pattern
   already used by the rest of the master data module.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_NUMBERING_CONFIG,
  formatInvoiceNumber,
  loadInvoiceNumberingFormat,
  saveInvoiceNumberingFormat,
  type NumberingConfig,
} from "./storage";

const DEFAULT_CONFIG = DEFAULT_NUMBERING_CONFIG;
const loadConfig = loadInvoiceNumberingFormat;
const saveConfig = saveInvoiceNumberingFormat;

/** Produce a preview of what the next generated invoice number will look
 *  like, using the current pattern and any optional prefixes. */
function previewNumber(cfg: NumberingConfig): string {
  return formatInvoiceNumber(cfg, { seq: 123 });
}

const panel =
  "rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_14px_36px_rgba(39,57,64,0.08)]";
const input =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100";
const label = "block text-xs font-bold uppercase tracking-[0.14em] text-slate-600";

export function InvoiceNumberingFormatCard() {
  const [cfg, setCfg] = useState<NumberingConfig>(loadConfig);
  const [savedToast, setSavedToast] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const preview = useMemo(() => previewNumber(cfg), [cfg]);

  useEffect(() => {
    if (!savedToast) return;
    const id = window.setTimeout(() => setSavedToast(false), 1800);
    return () => window.clearTimeout(id);
  }, [savedToast]);

  const patch = <K extends keyof NumberingConfig>(k: K, v: NumberingConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const handleSave = () => {
    saveConfig(cfg);
    setSavedToast(true);
  };

  const handleReset = () => setCfg(DEFAULT_CONFIG);

  return (
    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">
            Master Data · Invoice Numbering Format
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Define Invoice Numbering Format</h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-600">
            Drives the auto-generated <strong>Invoice_Number</strong> (DD 15.4) for every invoice
            submitted through the portal, manually, or via interface. Applied once — reused everywhere.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
            cfg.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {cfg.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Pattern</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{cfg.pattern}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Reset Rule</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{cfg.resetRule}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Preview</p>
            <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900">{preview}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Tokens: <code>{"{FY}"}</code> · <code>{"{YYYY}"}</code> · <code>{"{MM}"}</code> · <code>{"{AGY}"}</code> · <code>{"{CTYPE}"}</code> · <code>{"{FUND}"}</code> · <code>{"{SEQ}"}</code>
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {expanded ? "Hide Details" : "Show Details"}
          </button>
        </div>
      </div>

      {expanded ? (
        <>
      {/* Core fields */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Numbering Pattern</label>
          <input
            className={input}
            value={cfg.pattern}
            onChange={(e) => patch("pattern", e.target.value)}
            placeholder="INV-{FY}-{AGY}-{SEQ}"
          />
        </div>

        <div>
          <label className={label}>Sequence Reset Rule</label>
          <select
            className={input}
            value={cfg.resetRule}
            onChange={(e) => patch("resetRule", e.target.value as NumberingConfig["resetRule"])}
          >
            <option value="Annual">Annual (reset every fiscal year)</option>
            <option value="Continuous">Continuous (never reset)</option>
            <option value="Monthly">Monthly (reset every month)</option>
          </select>
        </div>

        <div>
          <label className={label}>Agency Prefix (optional)</label>
          <input
            className={input}
            value={cfg.agencyPrefix}
            onChange={(e) => patch("agencyPrefix", e.target.value.toUpperCase())}
            placeholder="e.g. MOF"
          />
        </div>

        <div>
          <label className={label}>Contract Type Prefix (optional)</label>
          <input
            className={input}
            value={cfg.contractTypePrefix}
            onChange={(e) => patch("contractTypePrefix", e.target.value.toUpperCase())}
            placeholder="e.g. GDS / WRK / SRV"
          />
        </div>

        <div>
          <label className={label}>Funding Source Prefix (optional)</label>
          <input
            className={input}
            value={cfg.fundingSourcePrefix}
            onChange={(e) => patch("fundingSourcePrefix", e.target.value.toUpperCase())}
            placeholder="e.g. RGOB / DONOR"
          />
        </div>

        <div className="flex items-end">
          <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              checked={cfg.separateInterfaceManual}
              onChange={(e) => patch("separateInterfaceManual", e.target.checked)}
            />
            <span>Separate numbering for interface vs manual invoices</span>
          </label>
        </div>
      </div>

      {/* Preview + actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Next Number Preview</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-slate-900">{preview}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={cfg.active}
              onChange={(e) => patch("active", e.target.checked)}
            />
            Active
          </label>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            Save &amp; Activate
          </button>
          {savedToast && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
              ✓ Saved
            </span>
          )}
        </div>
      </div>
        </>
      ) : null}
    </section>
  );
}
