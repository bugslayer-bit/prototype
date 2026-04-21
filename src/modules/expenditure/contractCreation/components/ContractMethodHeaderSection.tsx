import type { ContractMethodHeaderSectionProps } from "../sectionProps";
import type { CreationMethod } from "../types";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

const EXPENDITURE_TYPE_FALLBACK = ["Expenses", "Non-Financial Assets"];
const CLASSIFICATION_FALLBACK = ["In-Year", "Multi-Year"];
const CATEGORY_FALLBACK = ["Goods", "Works", "Services", "Goods and Services (Mixed)", "Works and Goods (Mixed)"];

export function ContractMethodHeaderSection({
  form,
  inputClass,
  lockedInputClass,
  labelClass,
  methodMeta,
  submitted,
  methodError,
  isFieldLocked,
  updateField,
  handleMethodSelect,
  toggleCategory,
  helperFor
}: ContractMethodHeaderSectionProps) {
  const creationMethodLabel = form.method ? methodMeta[form.method].label : "IFMIS";

  /* All LoVs pulled from MasterDataContext at runtime — admins manage them
     in /master-data so categories/types/classifications can be updated
     without code changes. */
  const { masterDataMap } = useMasterData();
  const expenditureTypes = masterDataMap.get("contract-expenditure-type") ?? EXPENDITURE_TYPE_FALLBACK;
  const classifications = masterDataMap.get("contract-classification-type") ?? CLASSIFICATION_FALLBACK;
  const contractCategories = masterDataMap.get("vendor-contract-category") ?? CATEGORY_FALLBACK;

  return (
    <div className="mt-5 space-y-6">
      <div>
        <label className={labelClass}>Creation Method</label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {Object.entries(methodMeta).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              className={`relative min-w-0 rounded-[20px] border p-4 text-left transition ${
                form.method === key ? "border-sky-200 bg-[linear-gradient(135deg,#f2f9ff,#eef7ff)] text-sky-900 shadow-[0_14px_28px_rgba(125,166,201,0.16)]" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => handleMethodSelect(key as CreationMethod)}
            >
              <span className={`mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                form.method === key
                  ? "bg-sky-100 text-sky-700"
                  : "border border-slate-200 bg-slate-50 text-slate-600"
              }`}>
                {meta.tag}
              </span>
              <strong className={`block text-base font-semibold ${form.method === key ? "text-sky-950" : "text-slate-900"}`}>{meta.label}</strong>
              <span className={`mt-2 block text-sm leading-6 ${form.method === key ? "text-sky-800/80" : "text-slate-600"}`}>{meta.detail}</span>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${form.method === key ? "bg-white/60 text-sky-700" : "bg-slate-100 text-slate-500"}`}>Actor: {meta.actor}</span>
            </button>
          ))}
        </div>
        {submitted && methodError ? <p className="mt-2 text-sm text-rose-600">{methodError}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Contract ID
          <input className={lockedInputClass} value={form.contractId} readOnly />
        </label>

        <label className={labelClass}>
          Agency Contract ID
          <select className={inputClass} value={form.agencyContractId} onChange={(event) => updateField("agencyContractId", event.target.value)}>
            <option value="">Select Agency Contract ID</option>
            <option value="AGY-CTR-001">AGY-CTR-001</option>
            <option value="AGY-CTR-002">AGY-CTR-002</option>
            <option value="AGY-CTR-003">AGY-CTR-003</option>
          </select>
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          Contract Title
          <input
            className={isFieldLocked("contractTitle") ? lockedInputClass : inputClass}
            value={form.contractTitle}
            onChange={(event) => updateField("contractTitle", event.target.value)}
            placeholder="Road widening package for western corridor"
            readOnly={isFieldLocked("contractTitle")}
          />
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          Contract Description
          <textarea
            className={`${isFieldLocked("contractDescription") ? lockedInputClass : inputClass} min-h-28`}
            value={form.contractDescription}
            onChange={(event) => updateField("contractDescription", event.target.value)}
            placeholder="Describe scope, output, and key approval notes"
            readOnly={isFieldLocked("contractDescription")}
          />
        </label>

        <label className={labelClass}>
          Type of Expenditure
          <select className={isFieldLocked("expenditureType") ? lockedInputClass : inputClass} value={form.expenditureType} onChange={(event) => updateField("expenditureType", event.target.value)} disabled={isFieldLocked("expenditureType")}>
            <option value="">Select type</option>
            {expenditureTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className={labelClass}>
          Contract Classification
          <select className={isFieldLocked("contractClassification") ? lockedInputClass : inputClass} value={form.contractClassification} onChange={(event) => updateField("contractClassification", event.target.value)} disabled={isFieldLocked("contractClassification")}>
            <option value="">Select classification</option>
            {classifications.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className={labelClass}>
          Contract Status
          <input className={lockedInputClass} value={form.contractStatus} readOnly />
        </label>

        <label className={labelClass}>
          Creation Method
          <input className={lockedInputClass} value={creationMethodLabel} readOnly />
        </label>

        <div className="min-w-0 md:col-span-2">
          <label className={labelClass}>Contract Category <span className="text-rose-600">*</span></label>
          <div className="mt-3 rounded-[20px] border border-slate-200 bg-slate-50/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {contractCategories.map((category) => {
                const selected = form.contractCategory.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${
                      selected ? "border-teal-200 bg-[linear-gradient(135deg,#f1fbfa,#ecf8f7)] text-teal-900 shadow-[0_10px_20px_rgba(156,214,205,0.16)]" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                    }`}
                    onClick={() => toggleCategory(category)}
                    disabled={isFieldLocked("contractCategory")}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      selected ? "border-teal-500" : "border-slate-300"
                    }`}>
                      {selected && <span className="h-3 w-3 rounded-full bg-teal-500" />}
                    </span>
                    <span className="min-w-0 break-words text-sm font-medium leading-6">{category}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
