/* ═══════════════════════════════════════════════════════════════════════════
   DocumentRequirementListCard — Master Data · Document Requirement List
   ──────────────────────────────────────────────────────────────────────
   Dynamic per-category (Goods / Works / Services) checklist that drives
   document validation at Invoice Submission (BR 15.12 / DD 15.15–15.20).

   Flow
     1. User selects contract category (G / W / S).
     2. User adds document types (Invoice copy, GRN, Completion
        Certificate, Way-Bill, Site Verification, Tax Invoice, etc.).
     3. Per row: mandatory / optional, validity period (days),
        signatory role, conditional rule (free-text).
     4. Save & activate — persisted to localStorage so it survives reloads
        and is referenced by the Invoice Submission validator.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DOC_ITEMS,
  loadDocRequirementList,
  saveDocRequirementList,
  type Category,
  type DocRequirement,
  type CategoryConfig,
  type DocReqStore as Store,
} from "./storage";

const DEFAULT_ITEMS = DEFAULT_DOC_ITEMS;
const loadStore = loadDocRequirementList;
const saveStore = saveDocRequirementList;

const panel =
  "rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_14px_36px_rgba(39,57,64,0.08)]";
const input =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const label = "block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600";

export function DocumentRequirementListCard() {
  const [store, setStore] = useState<Store>(loadStore);
  const [category, setCategory] = useState<Category>("Goods");
  const [savedToast, setSavedToast] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cfg = store[category];
  const mandatoryCount = useMemo(() => cfg.items.filter((i) => i.mandatory).length, [cfg.items]);

  useEffect(() => {
    if (!savedToast) return;
    const id = window.setTimeout(() => setSavedToast(false), 1800);
    return () => window.clearTimeout(id);
  }, [savedToast]);

  const updateCategory = (patch: Partial<CategoryConfig>) =>
    setStore((s) => ({ ...s, [category]: { ...s[category], ...patch } }));

  const updateItem = (id: string, patch: Partial<DocRequirement>) =>
    updateCategory({
      items: cfg.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });

  const addItem = () =>
    updateCategory({
      items: [
        ...cfg.items,
        {
          id: crypto.randomUUID(),
          docType: "",
          mandatory: false,
          validityDays: "",
          signatoryRole: "",
          conditionalRule: "",
        },
      ],
    });

  const removeItem = (id: string) =>
    updateCategory({ items: cfg.items.filter((it) => it.id !== id) });

  const handleSave = () => {
    saveStore(store);
    setSavedToast(true);
  };

  const handleResetCategory = () =>
    updateCategory({
      items: DEFAULT_ITEMS[category].map((d) => ({ ...d, id: crypto.randomUUID() })),
      effectiveDate: new Date().toISOString().slice(0, 10),
      templateVersion: "1.0",
      active: true,
    });

  return (
    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">
            Master Data · Document Requirement List
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Create / Maintain Document Requirement List</h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-600">
            Drives the document checklist validated at Invoice Submission (BR 15.12 · DD 15.15–15.20).
            Configure once per contract category — Goods, Works, Services — and reuse for every invoice.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
            cfg.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {cfg.active ? `Active · v${cfg.templateVersion}` : "Inactive"}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Category</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{category}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Documents</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{cfg.items.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Mandatory</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{mandatoryCount}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["Goods", "Works", "Services"] as Category[]).map((c) => {
              const count = store[c].items.length;
              const isActive = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                    isActive
                      ? "bg-teal-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c} <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/20" : "bg-slate-100"}`}>{count}</span>
                </button>
              );
            })}
          </div>
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
      {/* Category tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(["Goods", "Works", "Services"] as Category[]).map((c) => {
          const count = store[c].items.length;
          const isActive = c === category;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                isActive
                  ? "bg-teal-700 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {c} <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/20" : "bg-slate-100"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Template meta */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label}>Template Version</label>
          <input
            className={`${input} mt-1`}
            value={cfg.templateVersion}
            onChange={(e) => updateCategory({ templateVersion: e.target.value })}
            placeholder="1.0"
          />
        </div>
        <div>
          <label className={label}>Effective Date</label>
          <input
            type="date"
            className={`${input} mt-1`}
            value={cfg.effectiveDate}
            onChange={(e) => updateCategory({ effectiveDate: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              checked={cfg.active}
              onChange={(e) => updateCategory({ active: e.target.checked })}
            />
            <span>Active for {category} contracts</span>
          </label>
        </div>
      </div>

      {/* Items table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Document Type</th>
                <th className="px-3 py-2.5 text-center">Mandatory</th>
                <th className="px-3 py-2.5">Validity (days)</th>
                <th className="px-3 py-2.5">Signatory Role</th>
                <th className="px-3 py-2.5">Conditional Rule</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {cfg.items.map((it, idx) => (
                <tr key={it.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-semibold text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      className={input}
                      value={it.docType}
                      onChange={(e) => updateItem(it.id, { docType: e.target.value })}
                      placeholder="e.g. GRN, Completion Certificate"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={it.mandatory}
                      onChange={(e) => updateItem(it.id, { mandatory: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={input}
                      value={it.validityDays}
                      onChange={(e) => updateItem(it.id, { validityDays: e.target.value.replace(/[^0-9]/g, "") })}
                      placeholder="e.g. 30"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={input}
                      value={it.signatoryRole}
                      onChange={(e) => updateItem(it.id, { signatoryRole: e.target.value })}
                      placeholder="e.g. Site Engineer"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={input}
                      value={it.conditionalRule}
                      onChange={(e) => updateItem(it.id, { conditionalRule: e.target.value })}
                      placeholder='e.g. "goods value > 100K"'
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                      aria-label={`Remove ${it.docType || "document"}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {cfg.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                    No documents defined for {category}. Click "+ Add Document" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addItem}
            className="rounded-xl border border-teal-600 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
          >
            + Add Document
          </button>
          <span className="text-[11px] text-slate-500">
            {cfg.items.length} total · <strong>{mandatoryCount}</strong> mandatory
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetCategory}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset {category}
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
