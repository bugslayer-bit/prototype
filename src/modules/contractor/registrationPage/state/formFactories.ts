/* ═══════════════════════════════════════════════════════════════════
   Form factory helpers — blank form, ID generator, blank bank / contact
   rows used when starting a fresh Contractor Registration wizard.
   ═══════════════════════════════════════════════════════════════════ */
import type { FormState, BankAccountRow, ContactRow } from "../../registration/stages/sharedTypes";
import { generateContactId } from "../../registration/stages/sharedTypes";
import type { ContractorKind } from "../../../../shared/types";

export function initialForm(kind: ContractorKind): FormState {
  return {
    contractorId: "",
    contractorType: kind === "individual" ? "Individual" : "Business",
    contractualType: kind === "business" ? "Works Contractor" : "",
    category: kind === "individual" ? "Individual" : "",
    nationality: "",
    entryMethod: "Manual Entry",
    dataSource: "Manual entry by the Agency",
    registrationDate: new Date().toLocaleString("en-GB"),
    contractorStatusPrimary: "Active",
    contractorStatusSecondary: "",
    statusReason: "",
    isPrimaryContractor: kind === "individual" ? "No" : "Yes",
    salutation: "",
    displayName: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    businessRegistrationDate: "",
    countryOfRegistration: "",
    secondaryName: "",
    registrationNumber: "",
    licenseNumber: "",
    gstNumber: "",
    taxNumber: "",
    email: "",
    phone: "",
    secondaryPhone: "",
    faxNumber: "",
    address: "",
    addressLine2: "",
    addressLine3: "",
    gewog: "",
    dungkhag: "",
    thromde: "",
    district: "",
    cityTown: "",
    stateProvince: "",
    region: "",
    postalCode: "",
    bankName: "",
    bankBranchCode: "",
    bankBranchName: "",
    accountType: "",
    currencyType: "BTN",
    accountStatus: "Active",
    accountCategory: kind === "individual" ? "" : "",
    ifscCode: "",
    swiftCode: "",
    bankAccountNumber: "",
    bankAccountName: "",
    contactPerson: "",
    contactRole: "",
    sanctionsCheck: "Pending verification",
    sanctionCategory: "",
    sanctionType: "",
    sanctionStartDate: "",
    sanctionEndDate: "",
    autoReactivation: "Yes",
    sanctionReason: "",
    affectedAgency: "",
    sanctioningAgency: "",
    supportingDocuments: "",
    sanctionStatus: "",
    remarks: "",
    workflowNote: "",
  };
}

export function makeContractorId(kind: ContractorKind, total: number) {
  const prefix = kind === "individual" ? "CTR-IND" : "CTR-BIZ";
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(total + 1).padStart(4, "0")}`;
}

export function createBankRow(index: number): BankAccountRow {
  return {
    id: `bank-row-${index}`,
    holderName: "",
    accountNumber: "",
    type: "",
    category: "",
    bank: "",
    branch: "",
    branchCode: "",
    currency: "BTN",
    status: "Active",
    primary: index === 1 ? "Yes" : "No",
    cbsVerified: false,
  };
}

export function createContactRow(
  kind: "individual" | "business",
  index: number,
  contractorId?: string,
): ContactRow {
  return {
    id: `contact-row-${index}`,
    contactId: generateContactId(kind, contractorId),
    salutation: "",
    firstName: "",
    middleName: "",
    lastName: "",
    nationalId: "",
    gender: "",
    email: "",
    mobileNumber: "",
    landlineNumber: "",
    jobTitle: "",
    isPrimaryContact: index === 1 ? "Yes" : "No",
    isIfmisDesignated: "No",
    isActive: "Yes",
  };
}
