import { useMemo, useState } from "react";
import { ContractWorkspaceLayout } from "../../../shared/components/ContractWorkspaceLayout";
import type { ContractorFlowMeta, ContractorRegistrationWorkspaceProps } from "./contractorRegistrationTypes";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import type { ContractorKind, ContractorRecord } from "../../../shared/types";
import { BankAccountStage } from "./stages/BankAccountStage";
import { ContactStage } from "./stages/ContactStage";
import type { BankAccountRow, ContactRow, FormState } from "./stages/sharedTypes";
import {
  type WorkspaceFieldMeta,
  type WorkspaceStageMeta,
  type FieldEditability,
  inputClass,
  editableAmendmentInputClass,
  labelClass,
  cardClass,
  lockedInputClass,
  primaryAccountOptions,
  initialForm,
  getMasterOptions,
  getAmendmentEditability,
  buildPersonalInfoDisplayName,
  createBankRow,
  createContactRow,
  getSimulatedContractorData,
} from "./amendmentWorkspace";

export function ContractorAmendmentWorkspace({ kind, flow: pageFlow }: ContractorRegistrationWorkspaceProps) {
  const { masterDataMap } = useMasterData();
  const [activeStage, setActiveStage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [searchSecondary, setSearchSecondary] = useState("");
  const [amendmentSource, setAmendmentSource] = useState("Government Agency");
  const [amendmentJustification, setAmendmentJustification] = useState("");
  const [form, setForm] = useState<FormState>(() => initialForm(kind));
  const [originalForm, setOriginalForm] = useState<FormState>(() => initialForm(kind));
  const [bankRows, setBankRows] = useState<BankAccountRow[]>([createBankRow(1)]);
  const [contactRows, setContactRows] = useState<ContactRow[]>([createContactRow(kind, 1)]);

  const amendmentStages = useMemo(
    () => [
      {
        title: "Lookup & Amendment",
        description: "Search for an existing contractor and initiate amendment request",
        refs: ["Search", "Verification"]
      },
      {
        title: kind === "individual" ? "Personal Information" : "Business Profile",
        description: kind === "individual" ? "Update personal details with editable fields" : "Update business profile details",
        refs: ["DD 10.0"]
      },
      {
        title: kind === "individual" ? "Identity & Reg." : "Identity & Registration Numbers",
        description: "Modify identity and registration information",
        refs: ["DD 10.0"]
      },
      {
        title: "Address",
        description: "Update address information",
        refs: ["DD 10.25-10.34"]
      },
      {
        title: "Bank Account",
        description: "Modify bank account details",
        refs: ["DD 11.0"]
      },
      {
        title: "Contact(s)",
        description: "Update contact information",
        refs: ["DD 12.0"]
      },
      {
        title: "Review & Submit",
        description: "Review changes and submit amendment for approval",
        refs: ["Amendment Request"]
      }
    ],
    [kind]
  );

  const currentStage = amendmentStages[activeStage];
  const readiness = Math.round(((activeStage + 1) / amendmentStages.length) * 100);
  const changedFieldsCount = useMemo(() => {
    let count = 0;
    Object.keys(originalForm).forEach((key) => {
      const k = key as keyof FormState;
      if (originalForm[k] !== form[k]) {
        count++;
      }
    });
    return count;
  }, [form, originalForm]);

  const isBankAccountStage = currentStage.title === "Bank Account";
  const isContactStage = currentStage.title === "Contact(s)";

  const isReviewStage = currentStage.title === "Review & Submit";
  const isLookupStage = currentStage.title === "Lookup & Amendment";
  const isBhutaneseIndividual = kind === "individual" && form.nationality === "Bhutanese";

  const changedFields = useMemo(() => {
    const changes: Array<{ field: string; current: string; new: string }> = [];
    Object.keys(originalForm).forEach((key) => {
      const k = key as keyof FormState;
      if (originalForm[k] !== form[k]) {
        changes.push({
          field: key,
          current: String(originalForm[k] || ""),
          new: String(form[k] || "")
        });
      }
    });
    return changes;
  }, [form, originalForm]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "nationality") {
        const isBhutanese = value === "Bhutanese";

        if (kind === "individual") {
          next.registrationNumber = "";
          next.taxNumber = "";
          next.firstName = "";
          next.middleName = "";
          next.lastName = "";
          next.displayName = "";
          next.countryOfRegistration = isBhutanese ? "Bhutan" : "";
        }

        if (kind === "business") {
          next.registrationNumber = "";
          next.taxNumber = "";
          next.businessRegistrationDate = "";
          next.countryOfRegistration = isBhutanese ? "Bhutan" : "";
        }

        next.address = "";
        next.addressLine2 = "";
        next.addressLine3 = "";
        next.gewog = "";
        next.dungkhag = "";
        next.thromde = "";
        next.district = "";
        next.cityTown = "";
        next.stateProvince = "";
        next.region = "";
        next.postalCode = "";
        next.ifscCode = "";
        next.swiftCode = "";
      }

      if (kind === "individual" && ["firstName", "middleName", "lastName"].includes(key)) {
        next.displayName = buildPersonalInfoDisplayName(
          key === "firstName" ? String(value) : next.firstName,
          key === "lastName" ? String(value) : next.lastName,
          key === "middleName" ? String(value) : next.middleName
        );
      }

      return next;
    });
  }

  function handleLookup(isSecondarySearch: boolean) {
    if (!searchId && !isSecondarySearch) return;
    if ((searchSecondary && isSecondarySearch) || (searchId && !isSecondarySearch)) {
      const data = getSimulatedContractorData(kind);
      setForm(data);
      setOriginalForm(data);
      setIsLoaded(true);
    }
  }

  function updateBankRow(rowId: string, key: keyof BankAccountRow, value: string) {
    setBankRows((current) =>
      current.map((row) => {
        if (key === "primary" && value === "Yes") {
          return row.id === rowId ? { ...row, primary: "Yes" } : { ...row, primary: "No" };
        }
        return row.id === rowId ? { ...row, [key]: value } : row;
      })
    );
  }

  function addBankRow() {
    setBankRows((current) => [...current, createBankRow(current.length + 1)]);
  }

  function removeBankRow(rowId: string) {
    setBankRows((current) => {
      const filtered = current.filter((row) => row.id !== rowId);
      if (filtered.length === 0) {
        return [createBankRow(1)];
      }
      if (!filtered.some((row) => row.primary === "Yes")) {
        filtered[0] = { ...filtered[0], primary: "Yes" };
      }
      return filtered;
    });
  }

  function updateContactRow(rowId: string, key: keyof ContactRow, value: string) {
    setContactRows((current) => current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  }

  function addContactRow() {
    setContactRows((current) => [...current, createContactRow(kind, current.length + 1)]);
  }

  function removeContactRow(rowId: string) {
    setContactRows((current) => {
      const filtered = current.filter((row) => row.id !== rowId);
      return filtered.length > 0 ? filtered : [createContactRow(kind, 1)];
    });
  }

  function renderEditableField(
    label: string,
    value: string,
    originalValue: string,
    fieldKey: keyof FormState,
    fieldType: "text" | "email" | "textarea" | "select" = "text",
    options: string[] = [],
    ref?: string
  ) {
    const { locked } = getAmendmentEditability(fieldKey, kind, originalValue);

    // Determine SRS tag based on ref
    type SrsTag = { type: "LoV" | "DD" | "BR"; label: string };
    const getSrsTag = (refStr?: string): SrsTag[] | null => {
      if (!refStr) return null;

      if (refStr.startsWith("DD")) {
        // Parse which tag to show - prefer multiple tags if available
        const parts = refStr.split(/,\s*/);
        const tags: SrsTag[] = [];
        for (const raw of parts) {
          const part = raw.trim();
          if (part.includes("LoV")) {
            const match = part.match(/LoV[\s\d.]+/);
            if (match) tags.push({ type: "LoV", label: match[0] });
          } else if (part.startsWith("DD")) {
            const match = part.match(/DD[\s\d.]+/);
            if (match) tags.push({ type: "DD", label: match[0] });
          } else if (part.startsWith("BR")) {
            const match = part.match(/BR[\s\d.:]*/);
            if (match) tags.push({ type: "BR", label: match[0] });
          }
        }
        return tags;
      }
      return null;
    };

    const srsTag = getSrsTag(ref);

    return (
      <label className={labelClass}>
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {srsTag && srsTag.map((tag, idx) => {
            let bgClass = "bg-violet-100";
            let textClass = "text-violet-600";

            if (tag.type === "LoV") {
              bgClass = "bg-teal-100";
              textClass = "text-teal-600";
            } else if (tag.type === "BR") {
              bgClass = "bg-orange-100";
              textClass = "text-orange-600";
            }

            return (
              <span key={idx} className={`ml-1.5 rounded ${bgClass} px-1.5 py-0.5 text-[9px] font-bold ${textClass}`}>
                {tag.label}
              </span>
            );
          })}
          {locked ? (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
              Non-Editable
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">
              Editable
            </span>
          )}
        </div>
        {locked ? (
          <>
            <input
              className={lockedInputClass}
              type="text"
              value={value}
              readOnly
            />
            <div className="mt-2 text-xs text-slate-500">
              Current: <span className="font-semibold text-slate-700">{originalValue || "—"}</span>
            </div>
          </>
        ) : (
          <>
            {fieldType === "textarea" ? (
              <textarea
                className={editableAmendmentInputClass}
                value={value}
                onChange={(e) => updateField(fieldKey, e.target.value)}
              />
            ) : fieldType === "select" && options.length > 0 ? (
              <select
                className={editableAmendmentInputClass}
                value={value}
                onChange={(e) => updateField(fieldKey, e.target.value)}
              >
                {options.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                className={editableAmendmentInputClass}
                type={fieldType}
                value={value}
                onChange={(e) => updateField(fieldKey, e.target.value)}
              />
            )}
            {originalValue && (
              <div className="mt-2 text-xs text-slate-600">
                Current: <span className="font-semibold text-slate-700">{originalValue}</span>
              </div>
            )}
          </>
        )}
        {ref && <span className="mt-2 block text-xs text-slate-500">{ref}</span>}
      </label>
    );
  }

  function renderLookupStage() {
    return (
      <div className="mt-6 grid gap-5">
        <div className="rounded-[24px] border border-dashed border-orange-300 bg-orange-50/50 p-5">
          <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-orange-700">Contractor Lookup</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Contractor ID
              <input
                className={inputClass}
                type="text"
                value={searchId}
                placeholder="Enter contractor ID"
                onChange={(event) => setSearchId(event.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-2xl bg-orange-700 px-5 py-2.5 font-semibold text-white transition hover:bg-orange-800"
                  onClick={() => handleLookup(false)}
                >
                  Search
                </button>
              </div>
            </label>

            <label className={labelClass}>
              {kind === "individual" ? "CID / National ID" : "BRN"}
              <input
                className={inputClass}
                type="text"
                value={searchSecondary}
                placeholder={kind === "individual" ? "Enter CID" : "Enter BRN"}
                onChange={(event) => setSearchSecondary(event.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-2xl bg-orange-700 px-5 py-2.5 font-semibold text-white transition hover:bg-orange-800"
                  onClick={() => handleLookup(true)}
                >
                  Verify
                </button>
              </div>
            </label>
          </div>
        </div>

        {isLoaded && (
          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-orange-700">Amendment Request Details</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Amendment Request ID
                <input
                  className={lockedInputClass}
                  type="text"
                  value="AMN-2024-00456"
                  readOnly
                />
                <span className="mt-2 block text-xs text-slate-500">Auto-Generated</span>
              </label>

              <label className={labelClass}>
                Amendment Date
                <input className={lockedInputClass} type="date" value="2026-03-27" readOnly />
                <span className="mt-2 block text-xs text-slate-500">System Date</span>
              </label>

              <label className={labelClass}>
                Amendment Source
                <select
                  className={inputClass}
                  value={amendmentSource}
                  onChange={(event) => setAmendmentSource(event.target.value)}
                >
                  <option>Government Agency</option>
                  <option>Contractor Self-Amendment</option>
                  <option>System Validation</option>
                </select>
              </label>

              <label className={labelClass}>
                Requesting Officer
                <input className={lockedInputClass} type="text" value="Ms. Tenzin Choden" readOnly />
                <span className="mt-2 block text-xs text-slate-500">Current User</span>
              </label>

              <label className={`${labelClass} md:col-span-2`}>
                Justification
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={amendmentJustification}
                  placeholder="Explain the reason for this amendment request"
                  onChange={(event) => setAmendmentJustification(event.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <div className={cardClass}>
          <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-orange-700">Workflow Output</h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            On approval, the amendment updates the contractor master record, maintains a complete audit trail of changes, and triggers notifications to relevant systems.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">Master Record Update</span>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">Audit Trail</span>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">System Notifications</span>
          </div>
        </div>
      </div>
    );
  }

  function renderPersonalInformationStage() {
    const isBhutanese = form.nationality === "Bhutanese";

    return (
      <div className="mt-6 grid gap-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Active Profile:</span>
            <span className="rounded-full border border-fuchsia-300 bg-white px-3 py-1 font-semibold text-fuchsia-700">
              {kind === "individual" ? "Individual" : "Business"}
            </span>
            <span className="rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold text-amber-700">
              {isBhutanese ? "Bhutanese" : "Non-Bhutanese"}
            </span>
            <span className="rounded-full border border-sky-300 bg-white px-3 py-1 font-semibold text-sky-700">Amendment</span>
          </div>
        </div>

        {isBhutanese ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
            <strong>Bhutanese {kind === "individual" ? "Individual" : "Business"}:</strong> Identity and registration details are protected from Census/DCRC/IBLS systems and are non-editable in amendments.
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <strong>Non-Bhutanese {kind === "individual" ? "Individual" : "Business"}:</strong> Foreign identity details and registration information may be updated within compliance rules.
          </div>
        )}

        <div className={cardClass}>
          <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-orange-700">
            Selected {kind === "individual" ? "Personal" : "Business"} Profile
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Contractor Name</p>
              <p className="mt-1 font-semibold text-slate-900">{form.displayName || "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Contractor ID</p>
              <p className="mt-1 font-semibold text-slate-900">{form.contractorId || "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 font-semibold text-slate-900">{form.contractorStatusPrimary || "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{isBhutanese ? "TPN" : "Tax ID"}</p>
              <p className="mt-1 font-semibold text-slate-900">{form.taxNumber || "—"}</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-orange-700">
            {kind === "individual" ? "Personal Information" : "Business Details"}
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {kind === "individual" ? (
              <>
                {renderEditableField("Salutation", form.salutation, originalForm.salutation, "salutation", "select", getMasterOptions(masterDataMap, "salutation"), "DD 10.5, LoV 1.9")}
                {renderEditableField("First Name", form.firstName, originalForm.firstName, "firstName", "text", [], "DD 10.6")}
                {renderEditableField("Middle Name", form.middleName, originalForm.middleName, "middleName", "text", [], "DD 10.7")}
                {renderEditableField("Last Name", form.lastName, originalForm.lastName, "lastName", "text", [], "DD 10.8")}
                {renderEditableField("Gender", form.gender, originalForm.gender, "gender", "select", getMasterOptions(masterDataMap, "gender"), "DD 10.9, LoV 1.10")}
                {renderEditableField("Nationality", form.nationality, originalForm.nationality, "nationality", "select", getMasterOptions(masterDataMap, "nationality"), "DD 10.10, LoV 1.11")}
              </>
            ) : (
              <>
                {renderEditableField("Business Name", form.displayName, originalForm.displayName, "displayName", "text", [], "DD 10.4")}
                {renderEditableField("Trade Name", form.secondaryName, originalForm.secondaryName, "secondaryName", "text", [], "DD 10.4")}
                {renderEditableField("Status", form.contractorStatusPrimary, originalForm.contractorStatusPrimary, "contractorStatusPrimary", "select", getMasterOptions(masterDataMap, "contractor-status-primary"), "DD 10.20, LoV 1.4")}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderIdentityRegistrationStage() {
    const isBhutanese = form.nationality === "Bhutanese";

    return (
      <div className="mt-6 grid gap-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Amendment Controls:</span>
            <span className="rounded-full border border-fuchsia-300 bg-white px-3 py-1 font-semibold text-fuchsia-700">
              {kind === "individual" ? "Individual" : "Business"}
            </span>
            <span className="rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold text-amber-700">
              {isBhutanese ? "Bhutanese" : "Non-Bhutanese"}
            </span>
            <span className="rounded-full border border-sky-300 bg-white px-3 py-1 font-semibold text-sky-700">Amendment Mode</span>
          </div>
        </div>

        {isBhutanese ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
            <strong>Bhutanese {kind === "individual" ? "Individual" : "Business"}:</strong> CID/BRN identity records are source-protected and locked. TPN may be updated through system verification.
            <div className="mt-3 flex flex-wrap gap-2">
              {kind === "individual" ? (
                <>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">Census System</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">DCRC</span>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">IBLS</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">MoICE</span>
                </>
              )}
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700">RAMIS/BITS</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <strong>Non-Bhutanese {kind === "individual" ? "Individual" : "Business"}:</strong> Foreign identity and registration details are editable. Bhutanese-only fields are disabled.
          </div>
        )}

        <div className={cardClass}>
          <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-orange-700">
            {kind === "individual" ? "Identity & Registration" : "Business Registration"}
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {kind === "individual" ? (
              <>
                {renderEditableField(
                  isBhutanese ? "Bhutan CID" : "Passport Number",
                  form.registrationNumber,
                  originalForm.registrationNumber,
                  "registrationNumber",
                  "text",
                  [],
                  isBhutanese ? "DD 10.14" : "DD 10.15"
                )}
                {/* Individual-only — Date of Birth (DD 10.7) */}
                {renderEditableField(
                  "Date of Birth",
                  form.dateOfBirth,
                  originalForm.dateOfBirth,
                  "dateOfBirth",
                  "text",
                  [],
                  "DD 10.7"
                )}
                {renderEditableField(
                  isBhutanese ? "Taxpayer Number (TPN)" : "Foreign Tax ID",
                  form.taxNumber,
                  originalForm.taxNumber,
                  "taxNumber",
                  "text",
                  [],
                  isBhutanese ? "DD 10.13" : "DD 10.17"
                )}
              </>
            ) : (
              <>
                {renderEditableField(
                  isBhutanese ? "Business Registration Number (BRN)" : "Foreign Reg. Number",
                  form.registrationNumber,
                  originalForm.registrationNumber,
                  "registrationNumber",
                  "text",
                  [],
                  isBhutanese ? "DD 10.1" : "DD 10.16"
                )}
                {/* Business-only — IBLS License (DD 10.11), Bhutanese only */}
                {isBhutanese && renderEditableField(
                  "IBLS License Number",
                  form.licenseNumber,
                  originalForm.licenseNumber,
                  "licenseNumber",
                  "text",
                  [],
                  "DD 10.11"
                )}
                {renderEditableField(
                  isBhutanese ? "Taxpayer Number (TPN)" : "Foreign Tax ID",
                  form.taxNumber,
                  originalForm.taxNumber,
                  "taxNumber",
                  "text",
                  [],
                  isBhutanese ? "DD 10.13" : "DD 10.17"
                )}
                {/* Business-only — GST Number (DD 10.14), Bhutanese only */}
                {isBhutanese && renderEditableField(
                  "GST Number",
                  form.gstNumber,
                  originalForm.gstNumber,
                  "gstNumber",
                  "text",
                  [],
                  "DD 10.14"
                )}
                {isBhutanese && renderEditableField("Business Registration Date", form.businessRegistrationDate, originalForm.businessRegistrationDate, "businessRegistrationDate", "text", [], "DD 10.12")}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderAddressStage() {
    const isBhutanese = form.nationality === "Bhutanese";

    return (
      <div className="mt-6 grid gap-5">
        {isBhutanese ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
            <strong>Bhutanese Address:</strong> Geographic divisions follow Gewog, Dungkhag, Thromde, and Dzongkhag hierarchy.
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <strong>International Address:</strong> City, State, Region, Postal Code, and Country fields apply for non-Bhutanese locations.
          </div>
        )}

        <div className={cardClass}>
          <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-orange-700">Address Information</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {renderEditableField("Address Line 1", form.address, originalForm.address, "address", "text", [], "DD 10.25")}
            {renderEditableField("Address Line 2", form.addressLine2, originalForm.addressLine2, "addressLine2", "text", [], "DD 10.26")}
            {renderEditableField("Address Line 3", form.addressLine3, originalForm.addressLine3, "addressLine3", "text", [], "DD 10.27")}

            {isBhutanese ? (
              <>
                {renderEditableField("Gewog", form.gewog, originalForm.gewog, "gewog", "select", getMasterOptions(masterDataMap, "gewog"), "DD 10.28, LoV 2.3")}
                {renderEditableField("Dungkhag", form.dungkhag, originalForm.dungkhag, "dungkhag", "select", getMasterOptions(masterDataMap, "dungkhag"), "DD 10.29, LoV 2.2")}
                {renderEditableField("Thromde", form.thromde, originalForm.thromde, "thromde", "select", getMasterOptions(masterDataMap, "thromde"), "DD 10.28, LoV 2.3")}
                {renderEditableField("Dzongkhag", form.district, originalForm.district, "district", "select", getMasterOptions(masterDataMap, "dzongkhag"), "DD 10.30, LoV 2.1")}
              </>
            ) : (
              <>
                {renderEditableField("City / Town", form.cityTown, originalForm.cityTown, "cityTown", "text", [], "DD 10.31")}
                {renderEditableField("State / Province", form.stateProvince, originalForm.stateProvince, "stateProvince", "text", [], "DD 10.32")}
                {renderEditableField("Region", form.region, originalForm.region, "region", "text", [], "DD 10.33")}
                {renderEditableField("Postal Code", form.postalCode, originalForm.postalCode, "postalCode", "text", [], "DD 10.34")}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderReviewStage() {
    return (
      <div className="mt-6 grid gap-5">
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-sm text-orange-900">
          <strong>Amendment Summary:</strong> Review all proposed changes below. Once submitted, the amendment enters the approval workflow.
          <div className="mt-3 font-semibold">
            Total Changes: <span className="text-orange-700">{changedFieldsCount}</span>
          </div>
        </div>

        {amendmentJustification && (
          <div className={cardClass}>
            <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-orange-700">Amendment Justification</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{amendmentJustification}</p>
          </div>
        )}

        {changedFields.length > 0 && (
          <div className={cardClass}>
            <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-orange-700">Change Summary</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Field</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Current Value</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {changedFields.map((change) => (
                    <tr key={change.field} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{change.field}</td>
                      <td className="px-3 py-2 text-slate-600">{change.current || "—"}</td>
                      <td className="px-3 py-2 text-orange-700 font-semibold">{change.new || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={cardClass}>
          <label className={labelClass}>
            Amendment Remarks
            <textarea
              className={`${inputClass} min-h-28`}
              value={form.remarks}
              placeholder="Add any additional remarks or notes for the amendment"
              onChange={(e) => updateField("remarks", e.target.value)}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <ContractWorkspaceLayout
      eyebrow="CONTRACTOR AMENDMENT"
      title={`${kind === "individual" ? "Individual" : "Business"} Contractor Amendment`}
      stats={[
        { label: "Amendment Stages", value: String(amendmentStages.length) },
        { label: "Progress", value: `${readiness}%`, tone: readiness === 100 ? "good" : "warn" },
        { label: "Changes Pending", value: String(changedFieldsCount), tone: changedFieldsCount > 0 ? "warn" : "default" }
      ]}
      process={[]}
      minimalHero
    >
      <section className={`${cardClass} min-w-0 overflow-hidden`}>
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-orange-700">Stage Navigator</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-8">
          {amendmentStages.map((stage, idx) => (
            <button
              key={stage.title}
              type="button"
              onClick={() => setActiveStage(idx)}
              className={`min-w-0 rounded-2xl border px-3 py-2.5 text-left transition ${
                idx === activeStage ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:border-orange-200"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-800">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-[11px] font-semibold leading-4 text-slate-900 xl:text-xs">{stage.title}</h3>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Workflow output</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            On approval, the amendment updates the contractor master record, maintains a complete audit trail of all changes, and triggers notifications to relevant interfacing systems (e-GP, CMS).
          </p>
        </div>
      </section>

      <section className="grid min-w-0 items-start gap-4">
        <article className={`${cardClass} min-w-0 overflow-hidden`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-orange-700">Active stage</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">{currentStage.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{currentStage.description}</p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {currentStage.refs.map((ref) => (
                <span key={ref} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {ref}
                </span>
              ))}
            </div>
          </div>

          {isLookupStage && renderLookupStage()}
          {!isLookupStage && isLoaded && kind === "individual" && currentStage.title === "Personal Information" && renderPersonalInformationStage()}
          {!isLookupStage && isLoaded && kind === "business" && currentStage.title === "Business Profile" && renderPersonalInformationStage()}
          {!isLookupStage && isLoaded && (currentStage.title === "Identity & Reg." || currentStage.title === "Identity & Registration Numbers") && renderIdentityRegistrationStage()}
          {!isLookupStage && isLoaded && currentStage.title === "Address" && renderAddressStage()}
          {isBankAccountStage && isLoaded && (
            <BankAccountStage
              kind={kind}
              form={form}
              bankRows={bankRows}
              updateBankRow={updateBankRow}
              addBankRow={addBankRow}
              removeBankRow={removeBankRow}
              inputClass={inputClass}
              labelClass={labelClass}
              lockedInputClass={lockedInputClass}
              getMasterOptions={(id) => getMasterOptions(masterDataMap, id)}
              updateField={updateField}
              primaryAccountOptions={primaryAccountOptions}
            />
          )}
          {isContactStage && isLoaded && (
            <ContactStage
              kind={kind}
              form={form}
              contactRows={contactRows}
              updateContactRow={updateContactRow}
              addContactRow={addContactRow}
              removeContactRow={removeContactRow}
              inputClass={inputClass}
              labelClass={labelClass}
              lockedInputClass={lockedInputClass}
              getMasterOptions={(id) => getMasterOptions(masterDataMap, id)}
              updateField={updateField}
            />
          )}
          {isReviewStage && isLoaded && renderReviewStage()}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveStage(Math.max(0, activeStage - 1))}
              disabled={activeStage === 0}
              className="rounded-full bg-orange-50 px-5 py-3 font-semibold text-orange-800 transition hover:bg-orange-100 disabled:opacity-50"
            >
              Previous
            </button>
            {!isReviewStage ? (
              <button
                type="button"
                onClick={() => setActiveStage(Math.min(amendmentStages.length - 1, activeStage + 1))}
                className="rounded-full bg-orange-700 px-5 py-3 font-semibold text-white transition hover:bg-orange-800"
              >
                Save and Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  alert("Amendment submitted for approval. Request ID: AMN-2024-00456");
                }}
                className="rounded-full bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
              >
                Submit Amendment for Approval
              </button>
            )}
          </div>
        </article>
      </section>
    </ContractWorkspaceLayout>
  );
}
