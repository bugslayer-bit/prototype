/* Form defaults + row factories + profile helpers for ContractorRegistrationWorkspace */
import type { ContractorKind } from "../../../../../shared/types";
import type { BankAccountRow, ContactRow, FormState } from "../../stages/sharedTypes";
import { generateContactId } from "../../stages/sharedTypes";

export const initialForm = (kind: ContractorKind): FormState => ({
  contractorId: kind === "individual" ? "Auto-generated on successful validation" : "Auto-generated on successful validation",
  contractorType: kind === "individual" ? "Individual Contractor" : "Contractor",
  contractualType: kind === "business" ? "Works Contractor" : "",
  category: kind === "individual" ? "Individual" : "Business",
  nationality: "Bhutanese",
  entryMethod: "Manual Entry",
  dataSource: "Manual entry by the Agency",
  registrationDate: new Date().toLocaleString("en-GB"),
  contractorStatusPrimary: "Active",
  contractorStatusSecondary: "-- Select --",
  statusReason: "",
  isPrimaryContractor: kind === "individual" ? "No" : "Yes",
  salutation: kind === "individual" ? "Mrs." : "",
  displayName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  gender: kind === "individual" ? "Female" : "",
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
  accountCategory: "",
  ifscCode: "",
  swiftCode: "",
  bankAccountNumber: "",
  bankAccountName: "",
  contactPerson: "",
  contactRole: "",
  sanctionsCheck: "Pending verification",
  sanctionCategory: "Temporary Suspension",
  sanctionType: "",
  sanctionStartDate: "",
  sanctionEndDate: "",
  autoReactivation: "Yes",
  sanctionReason: "",
  affectedAgency: "",
  sanctioningAgency: "",
  supportingDocuments: "",
  sanctionStatus: "Active",
  remarks: "",
  workflowNote: ""
});

export function makeContractorId(kind: ContractorKind, total: number) {
  const prefix = kind === "individual" ? "IND" : "BUS";
  return `${prefix}-${String(total + 1).padStart(4, "0")}`;
}

export function buildIndividualProfileFromCid(cid: string) {
  const cleanCid = cid.trim();
  const suffix = cleanCid.slice(-4) || "1234";
  const firstName = "Sonam";
  const middleName = "(Sample)";
  const lastName = "Dorji";
  const displayName = `${firstName} ${lastName} ${middleName}`.trim();

  return {
    firstName,
    middleName,
    lastName,
    gender: "Female",
    taxNumber: `TPN-${suffix.padStart(8, "0")}`,
    displayName
  };
}

export function buildPersonalInfoDisplayName(firstName: string, lastName: string, middleName: string) {
  return [firstName, lastName, middleName].filter(Boolean).join(" ").trim();
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
    cbsVerified: false
  };
}

export function createContactRow(kind: "individual" | "business", index: number, contractorId?: string): ContactRow {
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
    isActive: "Yes"
  };
}
