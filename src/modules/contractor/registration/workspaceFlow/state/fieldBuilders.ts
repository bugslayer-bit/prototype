/* Field & stage builders for ContractorRegistrationWorkspace */
import type { ContractorKind } from "../../../../../shared/types";
import type { FormState } from "../../stages/sharedTypes";
import { getAllDzongkhags, getDungkhagsForDzongkhag, getGewogsForDzongkhag, getThromdeForDzongkhag } from "../../../../../shared/data/locationData";
import { getAllBanks, getBranchesForBank } from "../../../../../shared/data/bankData";
import type { WorkspaceFieldMeta, WorkspaceStageMeta } from "../types";

export function getMasterOptions(masterDataMap: Map<string, string[]>, id: string) {
  return masterDataMap.get(id) ?? [];
}

export function getIndividualIdentityFields(form: FormState, masterDataMap: Map<string, string[]>): WorkspaceFieldMeta[] {
  const isBhutanese = form.nationality === "Bhutanese";

  return [
    {
      key: "registrationNumber",
      label: isBhutanese ? "Bhutan CID / National ID" : "Passport Number",
      hint: isBhutanese ? "Pulled from BCRS / Census System / DCRC after lookup." : "Used for non-Bhutanese contractor identification."
    },
    { key: "firstName", label: "First Name", hint: isBhutanese ? "Auto-populate from BCRS / CID profile." : "Editable for foreign individual profile." },
    { key: "middleName", label: "Middle Name", hint: isBhutanese ? "Auto-populate from BCRS / CID profile." : "Optional middle name from passport profile." },
    { key: "lastName", label: "Last Name", hint: isBhutanese ? "Auto-populate from BCRS / CID profile." : "Editable for foreign individual profile." },
    { key: "gender", label: "Gender", type: "select", options: getMasterOptions(masterDataMap, "gender") },
    { key: "dateOfBirth", label: "Date of Birth", type: "text", hint: isBhutanese ? "DD 10.7 \u2014 auto-populated from BCRS / Census System." : "DD 10.7 \u2014 captured from passport profile." },
    {
      key: "taxNumber",
      label: isBhutanese ? "Bhutan Taxpayer Number (TPN)" : "Foreign Tax Number",
      hint: isBhutanese ? "Validated through RAMIS / BITS." : "Used for non-Bhutanese taxpayer profile."
    },
    { key: "displayName", label: "Contractor Name", hint: isBhutanese ? "Auto-constructed from BCRS profile." : "Constructed from foreign identity details." }
  ];
}

export function getBusinessRegistrationFields(form: FormState, masterDataMap: Map<string, string[]>): WorkspaceFieldMeta[] {
  const isBhutanese = form.nationality === "Bhutanese";

  return [
    { key: "displayName", label: "Legal Business Name", hint: isBhutanese ? "Pulled from IBLS / CMS when available." : "Editable for foreign business profile." },
    { key: "secondaryName", label: "Trade Name / Alternate Name" },
    {
      key: "registrationNumber",
      label: isBhutanese ? "Bhutan Business Registration Number" : "Foreign Registration Number",
      hint: isBhutanese ? "Validated through Business Registry / IBLS." : "Used for non-Bhutanese business registration."
    },
    ...(isBhutanese
      ? [
          {
            key: "businessRegistrationDate" as keyof FormState,
            label: "Date of Business Registration in Bhutan",
            hint: "Auto-populate based on BRN from interface."
          },
          {
            key: "licenseNumber" as keyof FormState,
            label: "IBLS License Number",
            hint: "DD 10.11 \u2014 IBLS-issued business license, mandatory for Bhutanese business contractors."
          },
          {
            key: "taxNumber" as keyof FormState,
            label: "Bhutan Taxpayer Number (TPN)",
            hint: "Cross-check through RAMIS / BITS."
          },
          {
            key: "gstNumber" as keyof FormState,
            label: "GST Number",
            hint: "DD 10.14 \u2014 GST registration number, mandatory for Bhutanese business contractors."
          },
          {
            key: "countryOfRegistration" as keyof FormState,
            label: "Country of Business Registration",
            type: "select" as const,
            options: getMasterOptions(masterDataMap, "country-registration"),
            hint: "Master-data-driven country list."
          }
        ]
      : [
          {
            key: "countryOfRegistration" as keyof FormState,
            label: "Country of Business Registration",
            type: "select" as const,
            options: getMasterOptions(masterDataMap, "country-registration"),
            hint: "Master-data-driven country list."
          },
          {
            key: "taxNumber" as keyof FormState,
            label: "Foreign Tax Number",
            hint: "Used for foreign business taxpayer details."
          }
        ])
  ];
}

export function getAddressFields(kind: ContractorKind, form: FormState, masterDataMap: Map<string, string[]>): WorkspaceFieldMeta[] {
  const isBhutanese = form.nationality === "Bhutanese";
  const firstLabel = kind === "individual" ? "Physical Address Line 1" : "Registered Business Address Line 1";

  if (!isBhutanese) {
    return [
      { key: "address", label: firstLabel },
      { key: "addressLine2", label: "Address Line 2" },
      { key: "addressLine3", label: "Address Line 3" },
      { key: "cityTown" as keyof FormState, label: "City / Town" },
      { key: "stateProvince" as keyof FormState, label: "State / Province" },
      { key: "region" as keyof FormState, label: "Region" },
      { key: "postalCode" as keyof FormState, label: "Postal Code" },
      { key: "countryOfRegistration" as keyof FormState, label: "Country", type: "select" as const, options: getMasterOptions(masterDataMap, "country-registration") }
    ];
  }

  const selectedDzongkhag = form.district;
  const dzongkhagOptions = getAllDzongkhags();
  const dungkhagOptions = selectedDzongkhag ? getDungkhagsForDzongkhag(selectedDzongkhag) : [];
  const hasDungkhags = dungkhagOptions.length > 0;
  const selectedDungkhag = form.dungkhag;
  const gewogOptions = selectedDzongkhag
    ? (selectedDungkhag ? getGewogsForDzongkhag(selectedDzongkhag, selectedDungkhag) : getGewogsForDzongkhag(selectedDzongkhag))
    : [];
  const thromdeOptions = selectedDzongkhag ? getThromdeForDzongkhag(selectedDzongkhag) : [];

  return [
    { key: "address", label: firstLabel },
    { key: "addressLine2", label: "Address Line 2" },
    { key: "addressLine3", label: "Address Line 3" },
    { key: "district" as keyof FormState, label: "Dzongkhag", type: "select" as const, options: ["", ...dzongkhagOptions] },
    {
      key: "dungkhag" as keyof FormState,
      label: hasDungkhags ? "Dungkhag" : "Dungkhag (Not applicable)",
      type: "select" as const,
      options: hasDungkhags ? ["", ...dungkhagOptions] : ["Not applicable"]
    },
    { key: "gewog" as keyof FormState, label: "Gewog", type: "select" as const, options: gewogOptions.length > 0 ? ["", ...gewogOptions] : ["-- Select Dzongkhag first --"] },
    ...(thromdeOptions.length > 0
      ? [{ key: "thromde" as keyof FormState, label: "Thromde", type: "select" as const, options: ["", ...thromdeOptions] }]
      : [])
  ];
}

export function getBankFields(kind: ContractorKind, form: FormState, masterDataMap: Map<string, string[]>): WorkspaceFieldMeta[] {
  const selectedBank = form.bankName;
  const bankOptions = getAllBanks();
  const branchOptions = selectedBank ? getBranchesForBank(selectedBank) : [];
  const hasBranches = branchOptions.length > 0;

  return [
    { key: "bankName", label: "Bank Name", type: "select", options: ["", ...bankOptions] },
    {
      key: "bankBranchName",
      label: "Bank Branch",
      type: "select",
      options: hasBranches ? ["", ...branchOptions] : ["-- Select Bank first --"]
    },
    { key: "accountType", label: "Account Type", type: "select", options: getMasterOptions(masterDataMap, "account-type") },
    { key: "currencyType", label: "Currency Type", type: "select", options: getMasterOptions(masterDataMap, "currency-type") },
    { key: "accountStatus", label: "Account Status", type: "select", options: getMasterOptions(masterDataMap, "account-status") },
    {
      key: "bankAccountNumber",
      label: kind === "individual" ? "Bank Account Number" : "Contractor Bank Account Number",
      hint: "System allows multiple banks but only one account per bank."
    },
    { key: "bankAccountName", label: "Account Holder Name" }
  ];
}

export function getDynamicStages(kind: ContractorKind, form: FormState, baseStages: WorkspaceStageMeta[], masterDataMap: Map<string, string[]>) {
  return baseStages.map((stage) => {
    if (stage.fields) {
      stage = {
        ...stage,
        fields: stage.fields.map((field) => {
          if (field.key === "contractorType") {
            return { ...field, options: getMasterOptions(masterDataMap, "contractor-type") };
          }
          if (field.key === "entryMethod") {
            return { ...field, options: getMasterOptions(masterDataMap, "entry-method") };
          }
          if (field.key === "category") {
            return { ...field, options: getMasterOptions(masterDataMap, "contractor-category") };
          }
          if (field.key === "nationality") {
            return { ...field, options: getMasterOptions(masterDataMap, "nationality") };
          }
          if (field.key === "salutation") {
            return { ...field, options: getMasterOptions(masterDataMap, "salutation") };
          }
          if (field.key === "contractorStatusPrimary") {
            return { ...field, options: getMasterOptions(masterDataMap, "contractor-status-primary") };
          }
          if (field.key === "contractorStatusSecondary") {
            return { ...field, options: ["-- Select --", ...getMasterOptions(masterDataMap, "contractor-status-secondary")] };
          }
          if (field.key === "dataSource") {
            return { ...field, options: getMasterOptions(masterDataMap, "contractor-source") };
          }
          return field;
        })
      };
    }

    if (kind === "individual" && stage.title === "Identity & Registration") {
      return { ...stage, fields: getIndividualIdentityFields(form, masterDataMap) };
    }
    if (kind === "business" && stage.title === "Business Registration") {
      return { ...stage, fields: getBusinessRegistrationFields(form, masterDataMap) };
    }
    if (stage.title === "Address") {
      return { ...stage, fields: getAddressFields(kind, form, masterDataMap) };
    }
    if (stage.title === "Bank Account") {
      return { ...stage, fields: getBankFields(kind, form, masterDataMap) };
    }

    return stage;
  });
}
