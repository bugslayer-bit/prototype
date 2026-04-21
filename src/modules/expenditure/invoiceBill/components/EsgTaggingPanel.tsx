/* ═══════════════════════════════════════════════════════════════════════════
   EsgTaggingPanel — SRS Row 50 (Process Step 3.2)
   Dynamic ESG attribution panel. Categories are sourced from the canonical
   `esg-category` master-data LoV (admin-editable in /master-data). Default
   values: Environment, Social, Governance — but the panel will honour
   whatever the admin configures ("declare once, use everywhere").
   Required when the linked budget head is flagged ESG-linked. Captures
   attributor + timestamp for the audit trail.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { EsgTagging, InvoiceBillFormState } from "../types";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";
const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

/* Visual hints per canonical pillar — unknown/custom values fall back to a
 * neutral chip so admin-added pillars still render cleanly. */
const CATEGORY_STYLE: Record<
  string,
  { border: string; bg: string; helper: string }
> = {
  Environment: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/60",
    helper: "Climate, energy, biodiversity, waste & pollution outcomes.",
  },
  Social: {
    border: "border-sky-200",
    bg: "bg-sky-50/60",
    helper: "Health, education, livelihoods, community welfare outcomes.",
  },
  Governance: {
    border: "border-indigo-200",
    bg: "bg-indigo-50/60",
    helper:
      "Transparency, accountability, anti-corruption and gender-responsive budgeting (GRB) outcomes.",
  },
};

interface Props {
  form: InvoiceBillFormState;
  onEsg: (esg: EsgTagging) => void;
}

export function EsgTaggingPanel({ form, onEsg }: Props) {
  const { masterDataMap } = useMasterData();
  const categoryOptions = useMemo(
    () =>
      masterDataMap.get("esg-category") ?? [
        "Environment",
        "Social",
        "Governance",
      ],
    [masterDataMap],
  );

  const e = form.esg;
  const required = e.budgetEsgLinked;
  const incomplete = required && e.categories.length === 0;

  const set = <K extends keyof EsgTagging>(k: K, v: EsgTagging[K]) =>
    onEsg({ ...e, [k]: v });

  const toggleCategory = (value: string) => {
    const next = e.categories.includes(value)
      ? e.categories.filter((c) => c !== value)
      : [...e.categories, value];
    onEsg({
      ...e,
      categories: next,
      attributedAt: new Date().toISOString(),
    });
  };

  return (
    <section className={panelClass}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">ESG Attribution</h3>
          <p className="text-xs text-slate-500">
            SRS Row 50 · Step 3.2 — Tag this bill against ESG pillars sourced
            from master data. Mandatory if the budget head is ESG-linked.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600">
          <input
            type="checkbox"
            checked={e.budgetEsgLinked}
            onChange={(ev) => set("budgetEsgLinked", ev.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Budget Head ESG-Linked
        </label>
      </header>

      {categoryOptions.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          ⚠ No ESG categories configured in master data. Ask an admin to
          populate <span className="font-mono">esg-category</span> in
          /master-data.
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            categoryOptions.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {categoryOptions.map((cat) => {
            const style = CATEGORY_STYLE[cat] ?? {
              border: "border-slate-200",
              bg: "bg-slate-50/60",
              helper: "ESG pillar defined in master data.",
            };
            const checked = e.categories.includes(cat);
            return (
              <label
                key={cat}
                className={`flex items-start gap-3 rounded-2xl border p-3 ${
                  checked ? `${style.border} ${style.bg}` : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategory(cat)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">{cat}</p>
                  <p className="text-[11px] text-slate-500">{style.helper}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Attributed By
          </label>
          <input
            value={e.attributedBy}
            onChange={(ev) => set("attributedBy", ev.target.value)}
            placeholder="Officer name / user ID"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Attributed At
          </label>
          <input value={e.attributedAt || "—"} disabled className={`${inputClass} bg-slate-50`} />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes</label>
        <textarea
          value={e.notes}
          onChange={(ev) => set("notes", ev.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Brief justification (audit trail)"
        />
      </div>

      {incomplete && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          ⚠ Budget head is ESG-linked — at least one ESG category must be ticked.
        </div>
      )}
    </section>
  );
}
