/* ═══════════════════════════════════════════════════════════════════
   Shared types, constants & step catalogues for Contractor Registration
   Extracted from ContractorRegistrationPage.tsx for maintainability.
   ═══════════════════════════════════════════════════════════════════ */
import type { FormState, BankAccountRow, ContactRow } from "../../registration/stages/sharedTypes";
import type { ContractorKind } from "../../../../shared/types";

export type RegView = "list" | "form" | "edit";
export type EntryMethod = "manual" | "bulk" | "system-integration" | "";
export type EntryRole = "admin" | "agency-staff" | "public";

export interface EntryMethodOption {
  key: EntryMethod;
  label: string;
  owner: string;
  description: string;
  icon: string;
  allowedRoles: EntryRole[];
  lockedFields: (keyof FormState)[];
}

export interface StepDef {
  key: string;
  label: string;
  icon: string;
}

export interface StoredDoc {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface SessionDraft {
  regView: RegView;
  contractorType: ContractorKind | "";
  entryMethod: EntryMethod;
  activeStep: number;
  form: FormState;
  bankRows: BankAccountRow[];
  contactRows: ContactRow[];
  cidVerified: boolean;
  tpnVerified: boolean;
  gstEligible: boolean | null;
  bulkFileUploaded: boolean;
  systemFetched: boolean;
  savedAt: string;
}

export const DOC_STORAGE_PREFIX = "ifmis-contractor-docs:";
export const SESSION_KEY = "ifmis-contractor-draft";

/* ═══════════════════════════════════════════════════════════════════
   ENTRY METHOD CATALOGUE
   ═══════════════════════════════════════════════════════════════════ */
const commonLockedFields: (keyof FormState)[] = [
  "contractorType", "contractualType", "category", "nationality", "isPrimaryContractor",
  "salutation", "firstName", "middleName", "lastName", "displayName", "secondaryName",
  "gender", "dateOfBirth", "registrationNumber", "licenseNumber", "gstNumber", "taxNumber",
  "countryOfRegistration", "businessRegistrationDate", "email", "phone", "secondaryPhone",
  "faxNumber", "address", "addressLine2", "addressLine3", "district", "dungkhag", "gewog",
  "thromde", "postalCode", "bankName", "bankBranchName", "bankBranchCode", "accountType",
  "currencyType", "accountStatus", "accountCategory", "swiftCode", "bankAccountNumber",
  "bankAccountName", "contactPerson", "contactRole", "contractorStatusPrimary",
  "contractorStatusSecondary", "sanctionsCheck",
];

export const entryMethods: EntryMethodOption[] = [
  {
    key: "manual",
    label: "Manual Online Entry",
    owner: "Contractor, Agency staff, e-GP, CMS",
    description: "Enter contractor data directly in IFMIS. All fields are editable.",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    allowedRoles: ["admin", "agency-staff", "public"],
    lockedFields: [],
  },
  {
    key: "bulk",
    label: "Bulk File Upload (CSV/Excel)",
    owner: "Agency",
    description: "Upload contractor records from a CSV or Excel file. Core identity fields are pre-filled from the file.",
    icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    allowedRoles: ["admin", "agency-staff"],
    lockedFields: commonLockedFields,
  },
  {
    key: "system-integration",
    label: "System Integration (API)",
    owner: "e-GP / CMS",
    description: "Pull contractor profile from connected systems (e-GP, CMS, IBLS). Source-owned fields are locked.",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    allowedRoles: ["admin", "agency-staff"],
    lockedFields: commonLockedFields,
  },
];

/* ═══════════════════════════════════════════════════════════════════
   STEP DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */
export const individualSteps: StepDef[] = [
  { key: "personal", label: "Personal Info", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { key: "identity", label: "Identity & Reg.", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" },
  { key: "address", label: "Address", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
  { key: "bank", label: "Bank Account", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { key: "contact", label: "Contact(s)", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  { key: "documents", label: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "review", label: "Review & Submit", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export const businessSteps: StepDef[] = [
  { key: "business-profile", label: "Business Profile", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { key: "business-registration", label: "Business Reg.", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" },
  { key: "address", label: "Address", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
  { key: "bank", label: "Bank Account", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { key: "contact", label: "Contact(s)", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  { key: "documents", label: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "review", label: "Review & Submit", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];
