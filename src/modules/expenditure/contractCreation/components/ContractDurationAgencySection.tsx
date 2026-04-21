import { useEffect } from "react";
import type { ContractDurationAgencySectionProps } from "../sectionProps";
import type { CreationMethod } from "../types";
import { useAuth } from "../../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../../shared/data/agencyPersonas";

/* ── Sequential MYC reference generator ───────────────────────────────────
   Mirrors what the IFMIS multi-year commitment service would return.
   The prefix changes with the originating interface so the audit trail
   makes the source obvious. Manual contracts get an empty string — the
   admin is expected to enter the reference themselves. */
const mycCounters: Record<string, number> = {};
function generateMycRef(method: CreationMethod | ""): { ref: string; source: string } {
  if (!method || method === "manual") {
    return { ref: "", source: "Manual entry required" };
  }
  const year = new Date().getFullYear();
  const prefixMap: Record<Exclude<CreationMethod, "manual">, { code: string; source: string }> = {
    "egp-interface": { code: "EGP", source: "IFMIS ⇦ eGP Multi-Year Commitment Service" },
    "cms-interface": { code: "CMS", source: "IFMIS ⇦ CMS Multi-Year Commitment Service" },
    "file-upload":   { code: "FU",  source: "IFMIS ⇦ Bulk File Upload Commitment Register" },
  };
  const meta = prefixMap[method as Exclude<CreationMethod, "manual">];
  const key = `${meta.code}-${year}`;
  mycCounters[key] = (mycCounters[key] ?? 0) + 1;
  const seq = String(mycCounters[key]).padStart(4, "0");
  return { ref: `MYC-${meta.code}-${year}-${seq}`, source: meta.source };
}

export function ContractDurationAgencySection({
  form,
  inputClass,
  labelClass,
  updateField,
  helperFor
}: ContractDurationAgencySectionProps) {
  const { activeRoleId, activeAgencyCode } = useAuth();
  const agencyCtx = resolveAgencyContext(activeRoleId);

  /* Auto-populate agency fields from the active agency context */
  useEffect(() => {
    if (agencyCtx && !form.agencyId) {
      updateField("agencyId", agencyCtx.agency.fiscal.agencyIdPrefix);
      updateField("agencyName", agencyCtx.agency.name);
    }
  }, [activeAgencyCode]);

  const isSystemSourced = form.method && form.method !== "manual";
  const mycSourceLabel = isSystemSourced
    ? form.method === "egp-interface"
      ? "IFMIS ⇦ eGP Multi-Year Commitment Service"
      : form.method === "cms-interface"
        ? "IFMIS ⇦ CMS Multi-Year Commitment Service"
        : "IFMIS ⇦ Bulk File Upload Commitment Register"
    : "Manual entry by admin required";

  const handleMultiYearToggle = (checked: boolean) => {
    updateField("multiYearFlag", checked);
    if (checked) {
      if (isSystemSourced && !form.multiYearCommitmentRef) {
        const { ref } = generateMycRef(form.method);
        if (ref) updateField("multiYearCommitmentRef", ref);
      }
    } else {
      /* Clear so re-enabling regenerates a fresh sequential ID. */
      updateField("multiYearCommitmentRef", "");
    }
  };

  return (
    <section className="overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(183,28,28,0.12)]">
      <div className="border-b border-rose-100 bg-gradient-to-r from-[#fff7f7] via-[#fff1f3] to-[#fffaf7] px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">3</div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#8f1111]">Contract Duration</h2>
            <p className="mt-1 text-sm text-slate-600">Contract dates, closure timing, and agency ownership.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-4 py-6 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
        <label className={`${labelClass} min-w-0`}>
          <span>Contract Duration <span className="text-[#d32f2f]">*</span></span>
          <input className={inputClass} value={form.contractDuration} onChange={(event) => updateField("contractDuration", event.target.value)} placeholder="e.g., 12 months" />
        </label>

        <label className={`${labelClass} min-w-0`}>
          <span>Start Date <span className="text-[#d32f2f]">*</span></span>
          <input className={inputClass} type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
        </label>

        <label className={`${labelClass} min-w-0`}>
          <span>End Date <span className="text-[#d32f2f]">*</span></span>
          <input className={inputClass} type="date" value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} />
        </label>

        <label className={`${labelClass} min-w-0`}>
          <span>Contract Closure Date <span className="text-[#d32f2f]">*</span></span>
          <input className={inputClass} type="date" value={form.contractClosureDate} onChange={(event) => updateField("contractClosureDate", event.target.value)} />
          {form.endDate ? <span className="mt-1 text-[11px] font-medium text-emerald-700">Auto-aligned from end date. You can adjust if closure happens later.</span> : null}
        </label>

        <label className={`${labelClass} min-w-0`}>
          <span>Agency ID <span className="text-[#d32f2f]">*</span></span>
          <input className={inputClass} value={form.agencyId} onChange={(event) => { updateField("agencyId", event.target.value); updateField("agencyName", event.target.value); }} placeholder="Fetch from budget management" />
        </label>
      </div>

      <div className="border-t border-rose-100 px-4 py-6 sm:px-6">
        <h3 className="text-lg font-bold text-[#8f1111]">Multi-Year Configuration</h3>
        <p className="mt-1 text-xs text-slate-500">Enable for contracts spanning multiple fiscal years</p>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="flex min-w-0 items-center gap-4">
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={form.multiYearFlag} onChange={(e) => handleMultiYearToggle(e.target.checked)} />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
            <div>
              <p className="text-sm font-semibold text-slate-800">Multi-Year Contract</p>
              <p className="text-xs text-slate-500">Requires multi-year commitment reference</p>
            </div>
          </div>

          {form.multiYearFlag ? (
            <label className={`${labelClass} min-w-0`}>
              <span>Multi-Year Commitment Reference <span className="text-[#d32f2f]">*</span></span>
              <input
                className={inputClass}
                value={form.multiYearCommitmentRef}
                onChange={(e) => updateField("multiYearCommitmentRef", e.target.value)}
                placeholder={isSystemSourced ? "Auto-fetching from IFMIS…" : "Enter multi-year commitment reference"}
                readOnly={!!isSystemSourced}
              />
              <span className={`mt-1 text-[11px] font-medium ${isSystemSourced ? "text-emerald-700" : "text-amber-700"}`}>
                {isSystemSourced
                  ? `Auto-fetched • ${mycSourceLabel}`
                  : "Manual entry — admin must input the multi-year commitment reference"}
              </span>
              {isSystemSourced && !form.multiYearCommitmentRef ? (
                <button
                  type="button"
                  className="mt-1 self-start rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  onClick={() => {
                    const { ref } = generateMycRef(form.method);
                    if (ref) updateField("multiYearCommitmentRef", ref);
                  }}
                >
                  Fetch from IFMIS
                </button>
              ) : null}
            </label>
          ) : (
            <div className="flex min-w-0 items-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm text-slate-600">In-year contract — standard single-year commitment applies.</p>
            </div>
          )}
        </div>

        {form.multiYearFlag && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-900">Multi-Year Budget Rules</p>
            <div className="mt-2 space-y-1 text-xs text-amber-800">
              <p>Total contract value must not exceed total multi-year commitment value</p>
              <p>Year-wise milestone planning must align with annual budget allocations</p>
              <p>Budget Owning Agency approval is required for cross-fiscal-year commitments</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
