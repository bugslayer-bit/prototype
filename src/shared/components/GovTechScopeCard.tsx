/* ═══════════════════════════════════════════════════════════════════════════
   GovTechScopeCard
   ────────────────────────────────────────────────────────────────────────
   Rendered on Payroll Management and Expenditure landing pages WHEN the
   active agency is GovTech (code 70). Declares what GovTech can and
   cannot do in that module, reading from the SRS-backed capability
   matrix in shared/data/srs/govtechCapabilities.ts.

   This replaces the previous generic admin surface. Operating agencies
   (MoF, MoH, etc.) do NOT see this card.
   ═══════════════════════════════════════════════════════════════════════════ */
import React from "react";
import {
  GOVTECH_CAPABILITIES,
  govtechCapabilitiesFor,
  isGovTechAgency,
  type GovTechCapability,
  type CapabilityScope,
} from "../data/srs/govtechCapabilities";

interface Props {
  module: "payroll" | "expenditure";
  agencyCode: string | null | undefined;
  /** Optional heading override. */
  title?: string;
}

const SCOPE_META: Record<CapabilityScope, { label: string; cls: string; icon: string }> = {
  config: {
    label: "Configure",
    cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: "⚙️",
  },
  monitor: {
    label: "Monitor",
    cls: "bg-sky-50 text-sky-700 border-sky-200",
    icon: "📡",
  },
  transact: {
    label: "Transact (own agency)",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "✍️",
  },
};

export const GovTechScopeCard: React.FC<Props> = ({ module, agencyCode, title }) => {
  if (!isGovTechAgency(agencyCode)) return null;

  const caps = govtechCapabilitiesFor(module);
  if (caps.length === 0) return null;

  const moduleLabel = module === "payroll" ? "Payroll" : "Expenditure";

  return (
    <section className="mb-6 overflow-hidden rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-[0_18px_45px_rgba(15,118,110,0.08)]">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-700">
            GovTech · Integration Owner · {moduleLabel}
          </div>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
            {title ?? `What GovTech can do in ${moduleLabel}`}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            GovTech (agency code 70) owns the integration layer — ZESt, e-DATS, RMA, MCP and statutory
            institutions. It can configure and monitor these interfaces for all agencies, but can only
            <em className="mx-1 font-semibold text-emerald-800">transact</em>
            against its own agency's employees and vendors. Operating-agency data is never shown here.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
          Agency · 70
        </span>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {caps.map((c) => {
          const scope = SCOPE_META[c.scope];
          return (
            <article
              key={`${c.module}-${c.label}`}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-black text-slate-900">
                  <span className="mr-2">{scope.icon}</span>
                  {c.label}
                </h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${scope.cls}`}>
                  {scope.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{c.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.srsRefs.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700"
                  >
                    {r}
                  </span>
                ))}
                {c.system && (
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800">
                    {c.system}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <footer className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        <strong className="text-slate-800">Boundary:</strong> GovTech cannot view MoF, MoH or any operating
        agency payroll rows, invoices or utility bills — only its own (agency 70) plus read-only integration
        telemetry. This is enforced in the data layer, not just the UI.
      </footer>
    </section>
  );
};

export { GOVTECH_CAPABILITIES };
export type { GovTechCapability };
