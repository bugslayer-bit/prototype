import type { ContractBudgetFundingSectionProps } from "../sectionProps";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

const selectClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50";

export function ContractBudgetFundingSection({
  form,
  inputClass,
  lockedInputClass,
  labelClass,
  isFieldLocked,
  updateField,
  validateCommitmentReference,
  commitmentValidated,
  preconditionResults: _preconditionResults,
  helperFor
}: ContractBudgetFundingSectionProps) {
  const { masterDataMap } = useMasterData();
  const budgetCodeOptions = masterDataMap.get("contract-budget-code") ?? [];
  const subSectorOptions = masterDataMap.get("contract-sub-sector-id") ?? [];
  /* SRS — UCoA hierarchy levels (Fund / Sector / Sub-Sector / Programme / Activity / Object) */
  const ucoaLevelOptions = masterDataMap.get("ucoa-level") ?? [
    "Fund",
    "Sector",
    "Sub-Sector",
    "Programme",
    "Sub-Programme",
    "Activity",
    "Sub-Activity",
    "Object Code",
  ];
  const fundingSourceOptions = masterDataMap.get("contract-funding-source") ?? [];
  const paymentSourceOptions = masterDataMap.get("contract-payment-source") ?? [];
  /* SRS LoV 3.6 — Currency Type pulled from Master Data */
  const currencyOptions = masterDataMap.get("currency-type") ?? ["BTN", "INR", "USD"];
  const isForeignCurrency = !!form.contractCurrencyId && form.contractCurrencyId !== "BTN";

  /* Detect system (non-manual) methods — these auto-validate */
  const isAutoMethod = form.method === "egp-interface" || form.method === "cms-interface" || form.method === "file-upload";

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-7">
      <div className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)_minmax(0,1fr)]">
            <label className={`${labelClass} min-w-0`}>
              <span>Commitment Reference <span className="text-rose-600">*</span></span>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  className={`${isFieldLocked("commitmentReference") ? lockedInputClass : inputClass} mt-0 min-w-0 flex-1`}
                  value={form.commitmentReference}
                  onChange={(e) => updateField("commitmentReference", e.target.value)}
                  placeholder="Enter commitment reference"
                  readOnly={isFieldLocked("commitmentReference")}
                />
                {/* Show Validate button only for manual entry; auto-validated for system methods */}
                {!commitmentValidated ? (
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-[#b71c1c] bg-[#d32f2f] px-5 py-3 font-semibold text-white transition hover:bg-[#b71c1c] sm:w-auto"
                    onClick={validateCommitmentReference}
                  >
                    Validate
                  </button>
                ) : (
                  <div className="flex w-full items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 sm:w-auto">
                    <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">Validated</span>
                  </div>
                )}
              </div>
              {isAutoMethod && commitmentValidated && (
                <p className="mt-2 text-xs text-emerald-600 font-medium">Auto-validated from system import</p>
              )}
            </label>

            {commitmentValidated ? (
              <div className="min-w-0 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-5 text-emerald-900">
                <p className="text-lg leading-9">
                  <span className="mr-2">✓</span>
                  Commitment <strong>{form.commitmentReference}</strong> verified — Balance: <strong>Nu. {form.commitmentBalance || "5,000,000"}</strong>
                </p>
                <div className="mt-2 space-y-1 text-xs text-emerald-800">
                  <p>Contract value within commitment balance</p>
                  <p>Budget code valid and active</p>
                  <p>Commitment exists for required object code</p>
                  {form.multiYearFlag ? <p>Multi-year commitment exists</p> : null}
                  {isAutoMethod && <p>System-validated via {form.method === "egp-interface" ? "eGP" : form.method === "cms-interface" ? "CMS" : "File Upload"} interface</p>}
                </div>
              </div>
            ) : (
              <div className="min-w-0 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-5 text-center text-[#c2410c]">
                <div className="text-2xl">!</div>
                <p className="mt-2 text-base leading-7">Enter and validate a commitment reference to proceed.</p>
              </div>
            )}

            <label className={`${labelClass} min-w-0`}>
              <span>Budget Code <span className="text-rose-600">*</span></span>
              {isFieldLocked("budgetCode") || (isAutoMethod && form.budgetCode) ? (
                <input className={lockedInputClass} value={form.budgetCode} readOnly />
              ) : (
                <select
                  className={selectClass}
                  value={form.budgetCode}
                  onChange={(e) => updateField("budgetCode", e.target.value)}
                >
                  <option value="">Select Budget Code</option>
                  {/* Ensure the current value always appears even if outside master data */}
                  {form.budgetCode && !budgetCodeOptions.includes(form.budgetCode) && (
                    <option value={form.budgetCode}>{form.budgetCode}</option>
                  )}
                  {budgetCodeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <label className={`${labelClass} min-w-0`}>
              <span>Expenditure Category</span>
              <input className={lockedInputClass} value={form.expenditureCategoryId || "Auto-populated"} readOnly />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>
                UCoA Level <span className="text-rose-600">*</span>
                <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">UCoA · Master Data</span>
              </span>
              <select
                className={selectClass}
                value={form.ucoaLevel || ""}
                onChange={(e) => updateField("ucoaLevel", e.target.value)}
              >
                <option value="">Select UCoA Level</option>
                {form.ucoaLevel && !ucoaLevelOptions.includes(form.ucoaLevel) && (
                  <option value={form.ucoaLevel}>{form.ucoaLevel}</option>
                )}
                {ucoaLevelOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Sector</span>
              <input className={lockedInputClass} value={form.sectorId || "Auto from UCoA"} readOnly />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Sub-Sector</span>
              {isAutoMethod && form.subSectorId ? (
                <input className={lockedInputClass} value={form.subSectorId} readOnly />
              ) : (
                <select className={selectClass} value={form.subSectorId} onChange={(e) => updateField("subSectorId", e.target.value)}>
                  <option value="">Select</option>
                  {form.subSectorId && !subSectorOptions.includes(form.subSectorId) && (
                    <option value={form.subSectorId}>{form.subSectorId}</option>
                  )}
                  {subSectorOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <label className={`${labelClass} min-w-0`}>
              <span>Funding Source</span>
              {isAutoMethod && form.fundingSource ? (
                <input className={lockedInputClass} value={form.fundingSource} readOnly />
              ) : (
                <select className={selectClass} value={form.fundingSource} onChange={(e) => updateField("fundingSource", e.target.value)}>
                  <option value="">Select</option>
                  {form.fundingSource && !fundingSourceOptions.includes(form.fundingSource) && (
                    <option value={form.fundingSource}>{form.fundingSource}</option>
                  )}
                  {fundingSourceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Funding Agency</span>
              <input className={inputClass} value={form.fundingAgencyName} onChange={(e) => updateField("fundingAgencyName", e.target.value)} placeholder="Funding agency name" />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Payment Source</span>
              {isAutoMethod && form.paymentSource ? (
                <input className={lockedInputClass} value={form.paymentSource} readOnly />
              ) : (
                <select className={selectClass} value={form.paymentSource} onChange={(e) => updateField("paymentSource", e.target.value)}>
                  <option value="">Select</option>
                  {form.paymentSource && !paymentSourceOptions.includes(form.paymentSource) && (
                    <option value={form.paymentSource}>{form.paymentSource}</option>
                  )}
                  {paymentSourceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <label className={`${labelClass} min-w-0`}>
              <span>Payment Account</span>
              <input className={inputClass} value={form.paymentAccount} onChange={(e) => updateField("paymentAccount", e.target.value)} placeholder="Payment account" />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Program / Project ID</span>
              <input className={inputClass} value={form.programProjectId} onChange={(e) => updateField("programProjectId", e.target.value)} placeholder="Project ID" />
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Program / Project Name</span>
              <input className={inputClass} value={form.programProjectName} onChange={(e) => updateField("programProjectName", e.target.value)} placeholder="Auto-fetch using Project ID" />
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <label className={`${labelClass} min-w-0`}>
              <span>Total Contract Value <span className="text-rose-600">*</span></span>
              <input className={inputClass} value={form.contractValue} onChange={(e) => updateField("contractValue", e.target.value)} placeholder="27500000" />
              {form.commitmentBalance && form.contractValue && Number(form.contractValue) > Number(form.commitmentBalance.replace(/,/g, "")) ? (
                <p className="mt-1 text-xs font-semibold text-red-600">Contract value exceeds commitment balance — blocked per validation rule</p>
              ) : null}
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>
                Contract Currency <span className="text-rose-600">*</span>
                <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">LoV 3.6 · Master Data</span>
              </span>
              <select
                className={`${selectClass} ${isFieldLocked("contractCurrencyId") ? "bg-slate-50 text-slate-500" : ""}`}
                value={form.contractCurrencyId}
                onChange={(e) => updateField("contractCurrencyId", e.target.value)}
                disabled={isFieldLocked("contractCurrencyId")}
              >
                <option value="">-- Select Currency --</option>
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {isFieldLocked("contractCurrencyId") && (
                <p className="mt-1 text-[11px] font-medium text-slate-500">System-fed from upstream interface</p>
              )}
              {isForeignCurrency && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-3">
                  <span className="block text-xs font-semibold text-slate-700">
                    BFTN_ID_Number..Integration <span className="text-rose-600">*</span>
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Foreign Currency</span>
                  </span>
                  <input
                    className={`${isFieldLocked("bftnIdNumber") ? lockedInputClass : inputClass} mt-2`}
                    value={form.bftnIdNumber}
                    onChange={(e) => updateField("bftnIdNumber", e.target.value)}
                    placeholder="Enter BFTN ID for foreign currency routing"
                    readOnly={isFieldLocked("bftnIdNumber")}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Required when currency ≠ BTN. Routes payment via Bhutan Financial Transaction Network integration.
                  </p>
                </div>
              )}
            </label>

            <label className={`${labelClass} min-w-0`}>
              <span>Initial Amount <span className="text-rose-600">*</span></span>
              <input
                className={inputClass}
                type="text"
                inputMode="decimal"
                value={form.grossAmount || form.contractValue}
                onChange={(e) => updateField("grossAmount", e.target.value)}
                placeholder="0.00"
              />
              {(form.grossAmount || form.contractValue) ? (
                <span className="mt-1 text-[11px] font-medium text-emerald-700">
                  Initial Amount: {form.contractCurrencyId || "Nu."} {form.grossAmount || form.contractValue}
                </span>
              ) : null}
            </label>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-600 md:col-span-2 xl:col-span-1">
              <p className="font-semibold text-slate-800">Budget Flow State</p>
              <div className="mt-2 space-y-1 text-xs leading-6">
                <p>Budget availability: {commitmentValidated ? <span className="font-bold text-emerald-700">Verified</span> : <span className="text-amber-600">Pending</span>}</p>
                <p>Commitment balance: {commitmentValidated ? <span className="font-bold text-emerald-700">Verified</span> : <span className="text-amber-600">Pending</span>}</p>
                <p>Currency: {form.contractCurrencyId ? <span className="font-bold text-emerald-700">{form.contractCurrencyId}</span> : <span className="text-amber-600">Not set</span>}</p>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
