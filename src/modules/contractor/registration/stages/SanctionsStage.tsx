import type { SharedStageProps } from "./sharedTypes";

export function SanctionsStage({
  kind,
  form,
  inputClass,
  labelClass,
  lockedInputClass,
  getMasterOptions,
  updateField
}: SharedStageProps) {
  const yesNoOptions = getMasterOptions("boolean-choice");
  const isBusiness = kind === "business";
  const sanctionRecordReady = Boolean(form.sanctionType || form.sanctionCategory || form.sanctionReason || form.sanctionStatus);

  return (
    <div className="mt-6 grid gap-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Active Profile:</span>
          <span className="rounded-full border border-rose-300 bg-white px-3 py-1 font-semibold text-rose-700">{isBusiness ? "Contractor" : "Individual"}</span>
          <span className="rounded-full border border-sky-300 bg-white px-3 py-1 font-semibold text-sky-700">{form.nationality}</span>
          <span className="rounded-full border border-fuchsia-300 bg-white px-3 py-1 font-semibold text-fuchsia-700">
            {sanctionRecordReady ? "Sanction Draft Active" : "Post-Registration Stage"}
          </span>
        </div>
        <p className="mt-2 leading-6">
          Fields dynamically adjust per BR rules. Sanction records are primarily post-registration controls, but the DD still defines the full sanction object for workflow handling.
        </p>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-rose-700">Contractor Sanctions</h3>
            <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">DD 13.0 - Contractor Sanction (13.1-13.12)</span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border-l-4 border-orange-500 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <strong>Sanctions are applied post-registration.</strong> All fields are kept in the UI because the DD defines the full sanction structure, and sanction records can be auto-generated or completed during sanctioning workflow approval.
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <div className="flex flex-wrap items-center gap-2">
              <span>Sanction ID</span>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Auto-Generated</span>
            </div>
            <input className={lockedInputClass} type="text" value="System Generated" readOnly />
            <span className="mt-2 block text-xs text-slate-500">13.1</span>
          </label>

          <label className={labelClass}>
            <div className="flex flex-wrap items-center gap-2">
              <span>Contractor ID / Supplier ID</span>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Auto-Ref</span>
            </div>
            <input className={lockedInputClass} type="text" value={form.contractorId || "REF to Contractor"} readOnly />
            <span className="mt-2 block text-xs text-slate-500">13.2</span>
          </label>

          <label className={labelClass}>
            Sanction Type
            <select className={inputClass} value={form.sanctionType} onChange={(event) => updateField("sanctionType", event.target.value)}>
              <option value="">--</option>
              {getMasterOptions("sanction-type").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-500">13.3 / LoV 6.4</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Sanction type drives sanction category, validity period, and downstream sanction status handling.</span>
          </label>

          <label className={labelClass}>
            Sanction Start Date
            <input className={inputClass} type="date" value={form.sanctionStartDate} onChange={(event) => updateField("sanctionStartDate", event.target.value)} />
            <span className="mt-2 block text-xs text-slate-500">13.4</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Start date should reflect the approved sanction effective date.</span>
          </label>

          <label className={labelClass}>
            Sanction End Date
            <input className={inputClass} type="date" value={form.sanctionEndDate} onChange={(event) => updateField("sanctionEndDate", event.target.value)} />
            <span className="mt-2 block text-xs text-slate-500">13.5</span>
            <span className="mt-1 block text-xs text-orange-600">BR: End date is required for time-bound sanctions and supports reactivation logic.</span>
          </label>

          <label className={labelClass}>
            Auto Reactivation?
            <div className="mt-3 flex flex-wrap gap-5">
              {yesNoOptions.map((option) => (
                <label key={option} className="inline-flex items-center gap-2">
                  <input type="radio" name="auto-reactivation" value={option} checked={form.autoReactivation === option} onChange={(event) => updateField("autoReactivation", event.target.value)} />
                  {option}
                </label>
              ))}
            </div>
            <span className="mt-2 block text-xs text-slate-500">13.6 / LoV 6.1</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Auto reactivation controls whether the contractor is reinstated automatically after sanction end date.</span>
          </label>

          <label className={`${labelClass} md:col-span-2`}>
            Sanction Reason
            <textarea className={`${inputClass} min-h-24`} value={form.sanctionReason} placeholder="Post-registration only" onChange={(event) => updateField("sanctionReason", event.target.value)} />
            <span className="mt-2 block text-xs text-slate-500">13.7</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Capture the justification, decision basis, or disciplinary reference for the sanction action.</span>
          </label>

          <label className={labelClass}>
            Sanction Category
            <select className={inputClass} value={form.sanctionCategory} onChange={(event) => updateField("sanctionCategory", event.target.value)}>
              <option value="">--</option>
              {getMasterOptions("sanction-category").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-500">13.8 / LoV 6.2</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Category indicates whether the sanction is temporary or permanent.</span>
          </label>

          <label className={labelClass}>
            Affected Agencies
            <select className={inputClass} value={form.affectedAgency} onChange={(event) => updateField("affectedAgency", event.target.value)}>
              <option value="">-- Agency Master --</option>
              {getMasterOptions("affected-agencies").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-500">13.9 / LoV 6.3</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Select the agency scope impacted by the sanction control.</span>
          </label>

          <label className={labelClass}>
            Sanctioning Agency
            <input className={inputClass} type="text" value={form.sanctioningAgency} onChange={(event) => updateField("sanctioningAgency", event.target.value)} />
            <span className="mt-2 block text-xs text-slate-500">13.10</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Capture the authority or agency responsible for sanction issuance.</span>
          </label>

          <label className={labelClass}>
            Supporting Documents
            <input className={inputClass} type="text" value={form.supportingDocuments} placeholder="File upload (post-registration)" onChange={(event) => updateField("supportingDocuments", event.target.value)} />
            <span className="mt-2 block text-xs text-slate-500">13.11</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Attach sanction evidence, approval note, or disciplinary records as supporting references.</span>
          </label>

          <label className={labelClass}>
            Sanction Status
            <select className={inputClass} value={form.sanctionStatus} onChange={(event) => updateField("sanctionStatus", event.target.value)}>
              <option value="">--</option>
              {getMasterOptions("sanction-status").map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-500">13.12</span>
            <span className="mt-1 block text-xs text-orange-600">BR: Status reflects whether the sanction is active, lifted, or expired.</span>
          </label>
        </div>
      </div>
    </div>
  );
}
