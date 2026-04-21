/* ═══════════════════════════════════════════════════════════════════════
   STEP 1 — Register Institution (SRS PRN 7.1 Step 1)
   ═══════════════════════════════════════════════════════════════════════
   Captures the FI header + supporting documents. Every dropdown option is
   sourced from master data. Cascading behaviour:
     • Picking an Institution Type narrows the Licence Category list.
     • Picking an Institution Type narrows the Service Category list on
       Step 3 (derived there).
     • Selecting a licence expiry that has passed auto-suggests "Expired"
       status via the keyword helper.
     • Risk rating narrows the allowed Review Frequency list.
   If a master-data list is empty an amber banner instructs the admin to
   populate it — nothing is assumed. */
import { useEffect, useMemo } from "react";
import type { FiFormState } from "../../../types";
import { useFiStore } from "../../../state/useFiStore";
import {
  useFiMasterData,
  filterLicenceByType,
  filterReviewByRisk,
  isExpiredStatus,
  isActiveStatus,
  isDraftStatus,
} from "../../../state/useFiMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: FiFormState;
  onChange: (next: FiFormState | ((cur: FiFormState) => FiFormState)) => void;
  readOnly?: boolean;
}

export function Step1Header({ form, onChange, readOnly = false }: SectionProps) {
  const master = useFiMasterData();
  const { generateNextDocId } = useFiStore();
  const h = form.header;

  const set = <K extends keyof FiFormState["header"]>(
    key: K,
    value: FiFormState["header"][K],
  ) => onChange((cur) => ({ ...cur, header: { ...cur.header, [key]: value } }));

  /* Cascading: Licence options narrow when Institution Type is set. If the
     currently-selected licence is not in the filtered list, clear it so the
     user has to re-pick a valid value. */
  const filteredLicenceOptions = useMemo(
    () => filterLicenceByType(h.institutionType, master.licenceCategory),
    [h.institutionType, master.licenceCategory],
  );

  useEffect(() => {
    if (!h.licenceCategory) return;
    if (!filteredLicenceOptions.includes(h.licenceCategory)) {
      set("licenceCategory", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLicenceOptions.join("|")]);

  /* Cascading: Review frequency narrows by risk rating. */
  const filteredFrequencyOptions = useMemo(
    () => filterReviewByRisk(h.riskRating, master.reviewFrequency),
    [h.riskRating, master.reviewFrequency],
  );

  useEffect(() => {
    if (!h.reviewFrequency) return;
    if (!filteredFrequencyOptions.includes(h.reviewFrequency)) {
      set("reviewFrequency", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredFrequencyOptions.join("|")]);

  /* Auto-flag expired licence: if the licence expiry date is in the past
     and the current status is Draft/Submitted/Active, push it to the
     keyword-matching "Expired" option from master-data. */
  useEffect(() => {
    if (!h.licenceExpiresOn) return;
    const expiry = new Date(h.licenceExpiresOn).getTime();
    if (isNaN(expiry)) return;
    if (expiry >= Date.now()) return;
    const expiredLov = master.registrationStatus.find((s) => isExpiredStatus(s));
    if (!expiredLov) return;
    if (
      isDraftStatus(h.registrationStatus) ||
      isActiveStatus(h.registrationStatus) ||
      h.registrationStatus === ""
    ) {
      set("registrationStatus", expiredLov);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.licenceExpiresOn]);

  const lovChecks: { key: string; label: string; values: string[] }[] = [
    { key: "fi-institution-type", label: "Institution Type", values: master.institutionType },
    { key: "fi-ownership-type", label: "Ownership Type", values: master.ownershipType },
    { key: "fi-licence-category", label: "Licence Category", values: master.licenceCategory },
    { key: "fi-regulatory-body", label: "Regulatory Body", values: master.regulatoryBody },
    { key: "fi-operating-region", label: "Operating Region", values: master.operatingRegion },
    { key: "currency-type", label: "Reporting Currency", values: master.currency },
    { key: "fi-registration-status", label: "Registration Status", values: master.registrationStatus },
    { key: "fi-risk-rating", label: "Risk Rating", values: master.riskRating },
    { key: "fi-review-frequency", label: "Review Frequency", values: master.reviewFrequency },
    { key: "fi-document-type", label: "Supporting Document Type", values: master.documentType },
  ];
  const emptyLovs = lovChecks.filter((c) => c.values.length === 0);

  /* Document lines */
  const addDoc = () => {
    onChange((cur) => ({
      ...cur,
      documents: [
        ...cur.documents,
        {
          id: generateNextDocId(),
          documentType: "",
          documentRef: "",
          issuedOn: "",
          expiresOn: "",
          remarks: "",
        },
      ],
    }));
  };
  const removeDoc = (id: string) =>
    onChange((cur) => ({ ...cur, documents: cur.documents.filter((d) => d.id !== id) }));
  const updateDoc = <K extends keyof FiFormState["documents"][number]>(
    id: string,
    key: K,
    value: FiFormState["documents"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      documents: cur.documents.map((d) => (d.id === id ? { ...d, [key]: value } : d)),
    }));

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      {emptyLovs.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ {emptyLovs.length} master-data list(s) empty</p>
          <p className="mt-0.5">
            Populate in <span className="font-mono">/master-data</span>:{" "}
            {emptyLovs.map((l) => l.key).join(", ")}
          </p>
        </div>
      )}

      <Card
        title="1. Institution Header"
        subtitle="PRN 7.1 Step 1 — Register the institution. FI ID is system-generated. Every dropdown is driven by master-data; Licence Category and Review Frequency cascade from the selections above."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="FI ID (auto)">
            <input className={inputCls} value={h.fiId} readOnly placeholder="FI-YYYY-NNNN" />
          </Field>
          <Field label="Institution Name">
            <input
              className={inputCls}
              value={h.institutionName}
              onChange={(e) => set("institutionName", e.target.value)}
            />
          </Field>
          <Field label="Legal Name">
            <input
              className={inputCls}
              value={h.legalName}
              onChange={(e) => set("legalName", e.target.value)}
            />
          </Field>

          <Field label="Institution Type">
            <Select
              value={h.institutionType}
              options={master.institutionType}
              onChange={(v) => set("institutionType", v)}
            />
          </Field>
          <Field label="Ownership Type">
            <Select
              value={h.ownershipType}
              options={master.ownershipType}
              onChange={(v) => set("ownershipType", v)}
            />
          </Field>
          <Field
            label="Licence Category"
            hint={
              h.institutionType
                ? `${filteredLicenceOptions.length} of ${master.licenceCategory.length} options apply to ${h.institutionType}`
                : "Pick an Institution Type first to narrow this list"
            }
          >
            <Select
              value={h.licenceCategory}
              options={filteredLicenceOptions}
              onChange={(v) => set("licenceCategory", v)}
              disabled={!h.institutionType}
            />
          </Field>

          <Field label="Licence Number">
            <input
              className={inputCls}
              value={h.licenceNumber}
              onChange={(e) => set("licenceNumber", e.target.value)}
            />
          </Field>
          <Field label="Licence Issued On">
            <input
              type="date"
              className={inputCls}
              value={h.licenceIssuedOn}
              onChange={(e) => set("licenceIssuedOn", e.target.value)}
            />
          </Field>
          <Field
            label="Licence Expires On"
            hint="If the expiry is in the past the status is auto-suggested to the master-data 'Expired' value."
          >
            <input
              type="date"
              className={inputCls}
              value={h.licenceExpiresOn}
              onChange={(e) => set("licenceExpiresOn", e.target.value)}
            />
          </Field>

          <Field label="Regulatory Body">
            <Select
              value={h.regulatoryBody}
              options={master.regulatoryBody}
              onChange={(v) => set("regulatoryBody", v)}
            />
          </Field>
          <Field label="Operating Region">
            <Select
              value={h.operatingRegion}
              options={master.operatingRegion}
              onChange={(v) => set("operatingRegion", v)}
            />
          </Field>
          <Field label="Head Office Address">
            <input
              className={inputCls}
              value={h.headOfficeAddress}
              onChange={(e) => set("headOfficeAddress", e.target.value)}
            />
          </Field>

          <Field label="Contact Person">
            <input
              className={inputCls}
              value={h.contactPerson}
              onChange={(e) => set("contactPerson", e.target.value)}
            />
          </Field>
          <Field label="Contact Email">
            <input
              className={inputCls}
              type="email"
              value={h.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </Field>
          <Field label="Contact Phone">
            <input
              className={inputCls}
              value={h.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </Field>

          <Field label="Reporting Currency">
            <Select
              value={h.reportingCurrency}
              options={master.currency}
              onChange={(v) => set("reportingCurrency", v)}
            />
          </Field>
          <Field label="Paid-Up Capital">
            <input
              className={inputCls}
              value={h.paidUpCapital}
              onChange={(e) => set("paidUpCapital", e.target.value)}
            />
          </Field>
          <Field label="Declared Turnover">
            <input
              className={inputCls}
              value={h.declaredTurnover}
              onChange={(e) => set("declaredTurnover", e.target.value)}
            />
          </Field>

          <Field label="Risk Rating">
            <Select
              value={h.riskRating}
              options={master.riskRating}
              onChange={(v) => set("riskRating", v)}
            />
          </Field>
          <Field
            label="Review Frequency"
            hint={
              h.riskRating
                ? `${filteredFrequencyOptions.length} of ${master.reviewFrequency.length} options apply to ${h.riskRating}`
                : "Pick a Risk Rating first to narrow this list"
            }
          >
            <Select
              value={h.reviewFrequency}
              options={filteredFrequencyOptions}
              onChange={(v) => set("reviewFrequency", v)}
              disabled={!h.riskRating}
            />
          </Field>
          <Field label="Registration Status">
            <Select
              value={h.registrationStatus}
              options={master.registrationStatus}
              onChange={(v) => set("registrationStatus", v)}
            />
          </Field>

          <Field label="Narrative / Notes" className="md:col-span-2 lg:col-span-3">
            <textarea
              className={inputCls + " min-h-[80px]"}
              value={h.narrative}
              onChange={(e) => set("narrative", e.target.value)}
              placeholder="Regulatory remarks, fit-and-proper notes, beneficial-ownership disclosures…"
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Supporting Documents"
        subtitle="PRN 7.1 Step 1 — Attach licence, board resolution, audit, capital-adequacy and compliance evidence. Document Type comes from master-data LoV fi-document-type."
      >
        {form.documents.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No documents attached yet. Click <strong>+ Add Document</strong> below.
          </p>
        ) : (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Document Type</th>
                  <th className="px-2 py-2">Reference No</th>
                  <th className="px-2 py-2">Issued On</th>
                  <th className="px-2 py-2">Expires On</th>
                  <th className="px-2 py-2">Remarks</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <Select
                        value={doc.documentType}
                        options={master.documentType}
                        onChange={(v) => updateDoc(doc.id, "documentType", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={doc.documentRef}
                        onChange={(e) => updateDoc(doc.id, "documentRef", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={inputCls}
                        value={doc.issuedOn}
                        onChange={(e) => updateDoc(doc.id, "issuedOn", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={inputCls}
                        value={doc.expiresOn}
                        onChange={(e) => updateDoc(doc.id, "expiresOn", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={doc.remarks}
                        onChange={(e) => updateDoc(doc.id, "remarks", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeDoc(doc.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={addDoc}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Document
        </button>
      </Card>
    </div>
  );
}
