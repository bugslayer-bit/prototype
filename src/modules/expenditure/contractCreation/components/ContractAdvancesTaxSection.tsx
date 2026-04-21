import { useState, useEffect } from "react";
import type { ContractAdvancesTaxSectionProps } from "../sectionProps";
import { resolveTaxMasterRecord, deriveTdsRate, taxLegalReference } from "../../../../shared/data/expenditureSrsData";

type TabKey = "tax" | "retention" | "advances-payment";

function BooleanChoice({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      <button
        type="button"
        className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition sm:flex-none sm:px-6 sm:text-base ${value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-300"}`}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
      <button
        type="button"
        className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition sm:flex-none sm:px-6 sm:text-base ${!value ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-300"}`}
        onClick={() => onChange(false)}
      >
        No
      </button>
    </div>
  );
}

export function ContractAdvancesTaxSection({
  form,
  labelClass,
  updateField
}: ContractAdvancesTaxSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("tax");

  /* Even though the user only sees Yes/No toggles, we still resolve the
     SRS Tax Master record behind the scenes when Tax Applicable = Yes
     so that downstream modules (Bill, Payment, GL) get the right rates,
     income-tax mode, and the "Income Tax Act 2025" legal reference. */
  useEffect(() => {
    if (!form.taxApplicable) return;
    const record = resolveTaxMasterRecord(form.contractCategory);
    if (!record) return;
    const gstYes = record.gstApplicable === "YES";
    if (form.gstApplicable !== gstYes) updateField("gstApplicable", gstYes);
    const masterGstRate = record.gstRatePercent != null ? String(record.gstRatePercent) : "";
    if (gstYes && form.gstRate !== masterGstRate) updateField("gstRate", masterGstRate);
    const tds = deriveTdsRate({ origin: form.vendorOrigin || "Bhutanese", vendorType: record.vendorType });
    if (tds != null && form.tdsRate !== String(tds)) updateField("tdsRate", String(tds));
    if (!form.tdsApplicable) updateField("tdsApplicable", true);
    if (form.incomeTaxRate !== record.incomeTaxRateMode) updateField("incomeTaxRate", record.incomeTaxRateMode);
    if (form.taxLegalReference !== taxLegalReference) updateField("taxLegalReference", taxLegalReference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.taxApplicable, form.contractCategory.join(",")]);

  const isWorksContract = form.contractCategory.includes("Works");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "tax", label: "Taxes" },
    { key: "retention", label: "Retention Money" },
    { key: "advances-payment", label: "Advances" },
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(183,28,28,0.12)]">
      <div className="border-b border-rose-100 bg-gradient-to-r from-[#fff8f8] to-white px-6 py-4 sm:px-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#d32f2f] bg-[#fff1f0] text-[#8f1111] shadow-[0_8px_20px_rgba(211,47,47,0.12)]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive ? "bg-[#d32f2f] text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {index + 1}
                </span>
                <span className="min-w-0 break-words">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "tax" && (
        <>
          <div className="border-b border-rose-100 bg-gradient-to-r from-[#fff7f7] via-[#fff3f5] to-[#fffaf7] px-6 py-7 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">6</div>
              <div>
                <h3 className="text-xl font-extrabold text-[#8f1111] sm:text-2xl">Taxes</h3>
                <p className="mt-1 text-sm text-slate-600 sm:text-base">
                  Toggle each rule on or off. All rates and references come from the SRS Tax Master automatically — you never need to type them.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-10 px-6 py-7 sm:px-8 md:grid-cols-2">
            <label className={labelClass}>
              <span>
                Tax Applicable <span className="text-[#d32f2f]">*</span>
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Auto from Tax Master</span>
              </span>
              <BooleanChoice value={form.taxApplicable} onChange={(next) => updateField("taxApplicable", next)} />
            </label>

            <label className={labelClass}>
              <span>GST Applicable</span>
              <BooleanChoice value={form.gstApplicable} onChange={(next) => updateField("gstApplicable", next)} />
            </label>

            <label className={labelClass}>
              <span>Bill Discounting Eligible</span>
              <BooleanChoice value={form.billDiscountingEligible} onChange={(next) => updateField("billDiscountingEligible", next)} />
            </label>
          </div>
        </>
      )}

      {activeTab === "retention" && (
        <>
          <div className="border-b border-rose-100 bg-gradient-to-r from-[#fff7f7] via-[#fff3f5] to-[#fffaf7] px-6 py-7 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">R</div>
              <div>
                <h3 className="text-xl font-extrabold text-[#8f1111] sm:text-2xl">Retention Money Management</h3>
                <p className="mt-1 text-sm text-slate-600 sm:text-base">For Works contracts, 10% retention is deducted from every payment per PRR.</p>
              </div>
            </div>
          </div>

          {isWorksContract && (
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4 sm:px-8">
              <p className="text-sm font-semibold text-emerald-800">Works Contract Detected — Retention auto-enabled at 10%</p>
            </div>
          )}

          <div className="grid gap-x-8 gap-y-10 px-6 py-7 sm:px-8 md:grid-cols-2">
            <label className={labelClass}>
              <span>Retention Applicable <span className="text-[#d32f2f]">*</span></span>
              <BooleanChoice value={form.retentionApplicable} onChange={(next) => updateField("retentionApplicable", next)} />
            </label>
          </div>
        </>
      )}

      {activeTab === "advances-payment" && (
        <>
          <div className="border-b border-rose-100 bg-gradient-to-r from-[#fff7f7] via-[#fff3f5] to-[#fffaf7] px-6 py-7 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">P</div>
              <div>
                <h3 className="text-xl font-extrabold text-[#8f1111] sm:text-2xl">Advances & Payment Settlement</h3>
                <p className="mt-1 text-sm text-slate-600 sm:text-base">
                  Configure whether this contract allows advances. Downstream recovery and settlement values will flow from this setting.
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-rose-100 px-6 py-7 sm:px-8">
            <label className={`${labelClass} max-w-xl`}>
              <span>
                Advances Applicable <span className="text-[#d32f2f]">*</span>
                <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.26</span>
              </span>
              <BooleanChoice
                value={form.advancePayment}
                onChange={(next) => updateField("advancePayment", next)}
              />
            </label>
          </div>

          {form.advancePayment ? (
            <div className="px-6 py-12 sm:px-8">
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-8 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white border border-emerald-200">
                  <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="mt-4 text-base font-bold text-emerald-800">Advances Applicable = Yes</p>
                <p className="mt-1 text-sm text-emerald-700">
                  Advance payment is enabled for this contract. Recovery rates and references will be set automatically by the IFMIS Payment module per the SRS rules.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 sm:px-8">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-8 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white border border-slate-200">
                  <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0h-2m9-7a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="mt-4 text-base font-bold text-slate-700">Advances not applicable</p>
                <p className="mt-1 text-sm text-slate-500">
                  This contract has no advance payment configured. Switch
                  <span className="mx-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">Advances Applicable = Yes</span>
                  above if you want this contract to feed the Advances module.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
