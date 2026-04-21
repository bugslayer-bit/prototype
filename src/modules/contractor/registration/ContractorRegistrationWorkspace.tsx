import { useMemo, useState } from "react";
import type { ContractorFlowMeta, ContractorRegistrationWorkspaceProps, FieldMeta } from "./contractorRegistrationTypes";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import type { ContractorRecord } from "../../../shared/types";
import { BankAccountStage } from "./stages/BankAccountStage";
import { ContactStage } from "./stages/ContactStage";
import type { BankAccountRow, ContactRow, FormState } from "./stages/sharedTypes";
import {
  inputClass,
  labelClass,
  cardClass,
  lockedInputClass,
  primaryAccountOptions,
  entryMethodConfigs,
  initialForm,
  makeContractorId,
  buildIndividualProfileFromCid,
  buildPersonalInfoDisplayName,
  createBankRow,
  createContactRow,
  getMasterOptions,
  getDynamicStages,
  renderField,
} from "./workspaceFlow";
import type { WorkspaceStageMeta } from "./workspaceFlow";


export function ContractorRegistrationWorkspace({ kind, flow: pageFlow }: ContractorRegistrationWorkspaceProps) {
  const { contractors, addContractor } = useContractorData();
  const { masterDataMap } = useMasterData();
  const [activeStage, setActiveStage] = useState(0);
  const [savedRecord, setSavedRecord] = useState<ContractorRecord | null>(null);
  const [form, setForm] = useState<FormState>(() => initialForm(kind));
  const [bankRows, setBankRows] = useState<BankAccountRow[]>([createBankRow(1)]);
  const [contactRows, setContactRows] = useState<ContactRow[]>([createContactRow(kind, 1)]);

  const flow = useMemo(
    () => ({
      ...pageFlow,
      stages: getDynamicStages(kind, form, pageFlow.stages as WorkspaceStageMeta[], masterDataMap)
    }),
    [pageFlow, form, kind, masterDataMap]
  );

  const effectiveStages = flow.stages;
  const effectiveCurrentStage = effectiveStages[activeStage] ?? effectiveStages[0];
  const currentStage = flow.stages[activeStage] ?? flow.stages[0];
  const isIndividualIdentityStage = kind === "individual" && currentStage.title === "Identity & Registration";
  const isBhutaneseIndividual = kind === "individual" && form.nationality === "Bhutanese";
  const isBankAccountStage = effectiveCurrentStage.title === "Bank Account";
  const isContactStage = effectiveCurrentStage.title === "Contact Information";
  const methodConfig = entryMethodConfigs[kind][form.entryMethod] || entryMethodConfigs[kind]["Manual Entry"];

  const summaryRows = useMemo(
    () => [
      ["Full Name", form.displayName || "Not entered"],
      ["Registration ID", form.registrationNumber || "Not entered"],
      ["Taxpayer Number", form.taxNumber || "Not entered"],
      ["Email", form.email || "Not entered"],
      ["Phone", form.phone || "Not entered"],
      ["Address", form.address || "Not entered"],
      ["Bank Account", `${form.bankName || "Not entered"} - ${form.bankAccountNumber || "Not entered"}`],
      ["Account Holder", form.bankAccountName || "Not entered"]
    ],
    [form]
  );

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
      }
      if (key === "district") {
        next.dungkhag = "";
        next.gewog = "";
        next.thromde = "";
      }
      if (key === "dungkhag") {
        next.gewog = "";
      }
      if (key === "bankName") {
        next.bankBranchName = "";
        next.bankBranchCode = "";
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
    setSavedRecord(null);
  }

  function handleCidVerify() {
    if (!isBhutaneseIndividual) {
      return;
    }
    setForm((current) => {
      const profile = buildIndividualProfileFromCid(current.registrationNumber);
      return { ...current, ...profile };
    });
    setSavedRecord(null);
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
    setSavedRecord(null);
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
    setSavedRecord(null);
  }

  function updateContactRow(rowId: string, key: keyof ContactRow, value: string) {
    setContactRows((current) => current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
    setSavedRecord(null);
  }

  function addContactRow() {
    setContactRows((current) => [...current, createContactRow(kind, current.length + 1)]);
  }

  function removeContactRow(rowId: string) {
    setContactRows((current) => {
      const filtered = current.filter((row) => row.id !== rowId);
      return filtered.length > 0 ? filtered : [createContactRow(kind, 1)];
    });
    setSavedRecord(null);
  }

  function isFieldLocked(fieldKey: keyof FormState): boolean {
    return methodConfig.lockedFields.includes(fieldKey);
  }

  function saveAndMove(isSubmitting: boolean) {
    const nextContractorId = makeContractorId(kind, contractors.length);
    const record: ContractorRecord = {
      id: nextContractorId,
      kind,
      submittedVia: "admin",
      displayName: form.displayName || "Not entered",
      contractorType: form.contractorType,
      contractualType: form.contractualType,
      category: form.category,
      nationality: form.nationality,
      registrationNumber: form.registrationNumber,
      taxNumber: form.taxNumber,
      email: form.email,
      phone: form.phone,
      address: form.address,
      bankName: form.bankName,
      bankAccountNumber: form.bankAccountNumber,
      bankAccountName: form.bankAccountName,
      status: "Draft",
      verification: "Pending",
      createdAt: new Date().toISOString(),
      profile: { ...form } as unknown as Record<string, string>
    };

    if (isSubmitting) {
      addContractor(record);
      setSavedRecord(record);
      setActiveStage(0);
    } else {
      setActiveStage((current) => Math.min(current + 1, effectiveStages.length - 1));
    }
  }

  function renderFieldWithLabel(field: FieldMeta, value: string) {
    const isLocked = isFieldLocked(field.key as keyof FormState) || field.locked;

    return (
      <label key={field.key} className={`${labelClass} ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
        <div className="flex items-baseline gap-2">
          <span>{field.label}</span>
          <span className="text-red-500">*</span>
        </div>
        {field.hint && <p className="mt-1 text-xs text-gray-600">{field.hint}</p>}
        {isLocked ? (
          field.type === "textarea" ? (
            <textarea className={`${lockedInputClass} min-h-24`} value={value} readOnly />
          ) : (
            <input className={lockedInputClass} type={field.type === "email" ? "email" : "text"} value={value} readOnly />
          )
        ) : (
          renderField(field, value, (newValue) => updateField(field.key as keyof FormState, newValue))
        )}
      </label>
    );
  }

  if (savedRecord) {
    return (
      <div className="grid gap-6">
        <div className={cardClass}>
          <div className="text-center">
            <div className="inline-block rounded-full bg-emerald-100 p-3 mb-4">
              <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted</h2>
            <p className="text-gray-600 mb-6">Your contractor registration has been submitted successfully.</p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Reference Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contractor ID:</span>
                  <span className="font-semibold text-gray-900">{savedRecord.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Submission Date:</span>
                  <span className="font-semibold text-gray-900">{new Date(savedRecord.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contact Name:</span>
                  <span className="font-semibold text-gray-900">{form.displayName}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 transition"
              onClick={() => {
                setForm(initialForm(kind));
                setBankRows([createBankRow(1)]);
                setContactRows([createContactRow(kind, 1)]);
                setActiveStage(0);
                setSavedRecord(null);
              }}
            >
              Submit Another Registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className={cardClass}>
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {kind === "individual" ? "Individual Contractor Registration" : "Business Contractor Registration"}
          </h2>
          <p className="text-gray-600 text-sm">{currentStage.description || "Please provide the required information to register as a contractor."}</p>
        </div>

        {/* Stage Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {effectiveStages.map((stage, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStage(idx)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                idx === activeStage
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="inline-block w-6 h-6 rounded-full mr-2 text-xs leading-6 text-center" style={{
                backgroundColor: idx === activeStage ? "#818cf8" : "#d1d5db",
                color: "white"
              }}>
                {idx + 1}
              </span>
              {stage.title}
            </button>
          ))}
        </div>

        {/* Content */}
        {effectiveCurrentStage.review ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Registration Summary</h3>
            <div className="grid gap-3">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="flex justify-between py-3 border-b border-gray-200 last:border-0">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                Please review the information above carefully. Once submitted, you will receive a reference number for tracking your registration.
              </p>
            </div>
            <label className={labelClass}>
              <span>Remarks</span>
              <textarea
                className={`${inputClass} min-h-24`}
                value={form.remarks}
                onChange={(event) => updateField("remarks", event.target.value)}
              />
            </label>
          </div>
        ) : isBankAccountStage ? (
          <BankAccountStage
            kind={kind}
            form={form}
            inputClass={inputClass}
            labelClass={labelClass}
            lockedInputClass={lockedInputClass}
            getMasterOptions={(id) => getMasterOptions(masterDataMap, id)}
            updateField={updateField}
            bankRows={bankRows}
            primaryAccountOptions={primaryAccountOptions}
            updateBankRow={updateBankRow}
            addBankRow={addBankRow}
            removeBankRow={removeBankRow}
          />
        ) : isContactStage ? (
          <ContactStage
            kind={kind}
            form={form}
            inputClass={inputClass}
            labelClass={labelClass}
            lockedInputClass={lockedInputClass}
            getMasterOptions={(id) => getMasterOptions(masterDataMap, id)}
            updateField={updateField}
            contactRows={contactRows}
            updateContactRow={updateContactRow}
            removeContactRow={removeContactRow}
            addContactRow={addContactRow}
          />
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {kind === "individual" && currentStage.title === "Personal Information" && (
              <div className="md:col-span-2 space-y-4">
                <label className={labelClass}>
                  <div className="flex items-baseline gap-2">
                    <span>Nationality</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <select className={inputClass} value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)}>
                    {getMasterOptions(masterDataMap, "nationality").map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>

                {form.nationality === "Bhutanese" && (
                  <label className={labelClass}>
                    <div className="flex items-baseline gap-2">
                      <span>Salutation</span>
                      <span className="text-red-500">*</span>
                    </div>
                    <select className={inputClass} value={form.salutation} onChange={(event) => updateField("salutation", event.target.value)}>
                      {getMasterOptions(masterDataMap, "salutation").map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {kind === "business" && currentStage.title === "Business Profile" && (
              <div className="md:col-span-2 space-y-4">
                <label className={labelClass}>
                  <div className="flex items-baseline gap-2">
                    <span>Business Origin</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <select className={inputClass} value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)}>
                    {getMasterOptions(masterDataMap, "nationality").map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {isIndividualIdentityStage && isBhutaneseIndividual && (
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                  <svg className="h-5 w-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 9a1 1 0 100-2 1 1 0 000 2zm5-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-blue-900">Enter your CID to auto-populate your identity details.</p>
                </div>
                <label className={`${labelClass} mb-4`}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span>Bhutan CID</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <div className="flex gap-3">
                    <input
                      className={`${inputClass} mt-0 flex-1`}
                      type="text"
                      placeholder="11-digit CID number"
                      value={form.registrationNumber}
                      onChange={(event) => updateField("registrationNumber", event.target.value)}
                    />
                    <button
                      type="button"
                      className="mt-2 rounded-lg border border-indigo-600 bg-indigo-50 px-5 py-2.5 font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      onClick={handleCidVerify}
                    >
                      Verify
                    </button>
                  </div>
                </label>
              </div>
            )}

            {currentStage.fields?.map((field) => renderFieldWithLabel(field, form[field.key]))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            disabled={activeStage === 0}
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setActiveStage((current) => Math.max(current - 1, 0))}
          >
            Previous
          </button>

          {activeStage < effectiveStages.length - 1 ? (
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 transition"
              onClick={() => saveAndMove(false)}
            >
              Next Step
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 transition"
              onClick={() => saveAndMove(true)}
            >
              Submit Registration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
