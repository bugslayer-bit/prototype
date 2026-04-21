import type { ContractorKind } from "../../../../shared/types";

export type FormState = {
  contractorId: string;
  contractorType: string;
  contractualType: string;
  category: string;
  nationality: string;             /* DD 10.10 — LoV 1.11: Bhutanese / Non-Bhutanese */
  entryMethod: string;
  dataSource: string;
  registrationDate: string;
  contractorStatusPrimary: string;
  contractorStatusSecondary: string;
  statusReason: string;
  isPrimaryContractor: string;
  salutation: string;
  displayName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;             /* DD 10.7 — individual only, mandatory for National */
  businessRegistrationDate: string;
  countryOfRegistration: string;   /* DD 10.3 / LoV 1.3 — separate from nationality */
  secondaryName: string;
  registrationNumber: string;
  licenseNumber: string;           /* DD 10.11 — IBLS license, mandatory for National */
  gstNumber: string;               /* DD 10.14 — GST number, mandatory for National */
  taxNumber: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  faxNumber: string;
  address: string;
  addressLine2: string;
  addressLine3: string;
  gewog: string;
  dungkhag: string;
  thromde: string;
  district: string;
  cityTown: string;
  stateProvince: string;
  region: string;
  postalCode: string;
  bankName: string;
  bankBranchCode: string;
  bankBranchName: string;
  accountType: string;
  currencyType: string;
  accountStatus: string;
  accountCategory: string;            /* DD 11.7 Domestic/International */
  ifscCode: string;
  swiftCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  contactPerson: string;
  contactRole: string;
  sanctionsCheck: string;
  sanctionCategory: string;
  sanctionType: string;
  sanctionStartDate: string;
  sanctionEndDate: string;
  autoReactivation: string;
  sanctionReason: string;
  affectedAgency: string;
  sanctioningAgency: string;
  supportingDocuments: string;
  sanctionStatus: string;
  remarks: string;
  workflowNote: string;
};

export interface BankAccountRow {
  id: string;
  holderName: string;
  accountNumber: string;
  type: string;
  category: string;
  bank: string;
  branch: string;
  branchCode: string;
  currency: string;
  status: string;
  primary: "Yes" | "No";
  cbsVerified: boolean;
}

export interface ContactRow {
  id: string;
  contactId: string;         /* DD 12.1 — System-generated: CI (Individual) / CB (Business) + seq */
  salutation: string;        /* DD 12.3 */
  firstName: string;         /* DD 12.4 */
  middleName: string;        /* DD 12.5 */
  lastName: string;          /* DD 12.6 */
  nationalId: string;        /* DD 12.7 */
  gender: string;            /* DD 12.8 */
  email: string;             /* DD 12.9 */
  mobileNumber: string;      /* DD 12.10 */
  landlineNumber: string;    /* DD 12.11 */
  jobTitle: string;          /* DD 12.12 */
  isPrimaryContact: string;  /* DD 12.13 */
  isIfmisDesignated: string; /* DD 12.14 */
  isActive: string;          /* DD 12.15 */
}

/**
 * Generate a unique Contact ID linked to a parent contractor.
 * CI = Contact Individual, CB = Contact Business
 * Format: CI-{contractorId}-NNN  e.g. CI-CTR-IND-2026-0001-001
 * Falls back to CI-2026-XXXXX if contractorId is empty (pre-registration)
 */
let _contactSeq = 0;
export function generateContactId(kind: "individual" | "business", contractorId?: string): string {
  const prefix = kind === "individual" ? "CI" : "CB";
  _contactSeq += 1;
  const seq = String(_contactSeq).padStart(3, "0");
  if (contractorId) {
    return `${prefix}-${contractorId}-${seq}`;
  }
  const year = new Date().getFullYear();
  const ts = String(Date.now()).slice(-5);
  return `${prefix}-${year}-${ts}`;
}

export interface SharedStageProps {
  kind: ContractorKind;
  form: FormState;
  inputClass: string;
  labelClass: string;
  lockedInputClass: string;
  getMasterOptions: (id: string) => string[];
  updateField: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
}
