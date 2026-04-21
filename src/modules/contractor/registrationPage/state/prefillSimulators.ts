/* ═══════════════════════════════════════════════════════════════════
   Prefill simulators — Bulk File Upload, System Integration,
   Bank auto-populate and CBS verification.
   All functions return EVERY field so that downstream UI doesn't
   need to guess defaults.
   ═══════════════════════════════════════════════════════════════════ */
import type { FormState, BankAccountRow, ContactRow } from "../../registration/stages/sharedTypes";
import { generateContactId } from "../../registration/stages/sharedTypes";
import type { ContractorKind } from "../../../../shared/types";

export function simulateBulkPrefill(kind: ContractorKind): Partial<FormState> {
  if (kind === "individual") {
    return {
      contractorType: "Individual",
      contractualType: "",
      category: "Individual",
      nationality: "Bhutan",
      isPrimaryContractor: "No",
      salutation: "Mr.",
      firstName: "Tshering",
      middleName: "",
      lastName: "Wangchuk",
      displayName: "Tshering Wangchuk",
      gender: "Male",
      dateOfBirth: "1988-03-12",
      registrationNumber: "11205001234",
      licenseNumber: "",
      gstNumber: "",
      taxNumber: "TPN-BT-78901",
      countryOfRegistration: "Bhutan",
      businessRegistrationDate: "",
      email: "tshering.wangchuk@gmail.com",
      phone: "+975-17-112-345",
      secondaryPhone: "+975-17-998-877",
      faxNumber: "",
      address: "House 12, Norzin Lam",
      addressLine2: "Near Clock Tower",
      addressLine3: "",
      district: "Thimphu",
      dungkhag: "",
      gewog: "Chang",
      thromde: "Thimphu Thromde",
      cityTown: "",
      stateProvince: "",
      region: "",
      postalCode: "11001",
      bankName: "Bank of Bhutan",
      bankBranchName: "Thimphu Main Branch",
      bankBranchCode: "BOB-001",
      accountType: "Savings Bank Accounts",
      currencyType: "BTN",
      accountStatus: "Active",
      accountCategory: "Domestic",
      ifscCode: "",
      swiftCode: "BHBBBTBT",
      bankAccountNumber: "201000123456",
      bankAccountName: "Tshering Wangchuk",
      contactPerson: "Tshering Wangchuk",
      contactRole: "Self",
      contractorStatusPrimary: "Active",
      contractorStatusSecondary: "Verified",
      statusReason: "",
      sanctionsCheck: "Clear",
      remarks: "Auto-imported via Bulk File Upload",
    };
  }
  return {
    contractorType: "Business",
    contractualType: "Works Contractor",
    category: "Sole Proprietorship",
    nationality: "Bhutan",
    isPrimaryContractor: "Yes",
    salutation: "",
    firstName: "",
    middleName: "",
    lastName: "",
    displayName: "Druk Construction Pvt Ltd",
    secondaryName: "DCPL",
    gender: "",
    dateOfBirth: "",
    registrationNumber: "BRN-2026-00456",
    licenseNumber: "IBLS-2024-DCPL-0091",
    gstNumber: "GST-BT-2024-0091",
    taxNumber: "TPN-BT-55678",
    countryOfRegistration: "Bhutan",
    businessRegistrationDate: "2024-06-15",
    email: "info@drukconstruction.bt",
    phone: "+975-2-334-455",
    secondaryPhone: "+975-17-665-544",
    faxNumber: "+975-2-334-456",
    address: "Plot 24, Industrial Estate",
    addressLine2: "Olakha",
    addressLine3: "Behind RSTA Office",
    district: "Thimphu",
    dungkhag: "",
    gewog: "Mewang",
    thromde: "Thimphu Thromde",
    cityTown: "",
    stateProvince: "",
    region: "",
    postalCode: "11001",
    bankName: "Bank of Bhutan",
    bankBranchName: "Thimphu Main Branch",
    bankBranchCode: "BOB-001",
    accountType: "Current Deposit Account",
    currencyType: "BTN",
    accountStatus: "Active",
    accountCategory: "Domestic",
    ifscCode: "",
    swiftCode: "BHBBBTBT",
    bankAccountNumber: "201000456789",
    bankAccountName: "Druk Construction Pvt Ltd",
    contactPerson: "Sonam Dorji",
    contactRole: "Managing Director",
    contractorStatusPrimary: "Active",
    contractorStatusSecondary: "Verified",
    statusReason: "",
    sanctionsCheck: "Clear",
    remarks: "Auto-imported via Bulk File Upload",
  };
}

export function simulateSystemPrefill(kind: ContractorKind): Partial<FormState> {
  if (kind === "individual") {
    return {
      contractorType: "Individual",
      contractualType: "",
      category: "Individual",
      nationality: "Bhutan",
      isPrimaryContractor: "No",
      salutation: "Mr.",
      firstName: "Karma",
      middleName: "",
      lastName: "Dorji",
      displayName: "Karma Dorji",
      gender: "Male",
      dateOfBirth: "1990-11-05",
      registrationNumber: "11308007890",
      licenseNumber: "",
      gstNumber: "",
      taxNumber: "TPN-BT-34567",
      countryOfRegistration: "Bhutan",
      businessRegistrationDate: "",
      email: "karma.dorji@egp.gov.bt",
      phone: "+975-17-223-344",
      secondaryPhone: "",
      faxNumber: "",
      address: "Block C, Apartment 4B",
      addressLine2: "Babesa",
      addressLine3: "",
      district: "Thimphu",
      dungkhag: "",
      gewog: "Babesa",
      thromde: "Thimphu Thromde",
      cityTown: "",
      stateProvince: "",
      region: "",
      postalCode: "11002",
      bankName: "Bhutan National Bank",
      bankBranchName: "Paro Branch",
      bankBranchCode: "BNB-012",
      accountType: "Savings Bank Accounts",
      currencyType: "BTN",
      accountStatus: "Active",
      accountCategory: "Domestic",
      ifscCode: "",
      swiftCode: "BNBBBTBT",
      bankAccountNumber: "200100345678",
      bankAccountName: "Karma Dorji",
      contactPerson: "Karma Dorji",
      contactRole: "Self",
      contractorStatusPrimary: "Active",
      contractorStatusSecondary: "Verified",
      statusReason: "",
      sanctionsCheck: "Clear",
      dataSource: "e-GP System",
      remarks: "Synchronised from e-GP via API",
    };
  }
  return {
    contractorType: "Business",
    contractualType: "Goods & Services",
    category: "Private Company",
    nationality: "Bhutan",
    isPrimaryContractor: "Yes",
    salutation: "",
    firstName: "",
    middleName: "",
    lastName: "",
    displayName: "Bhutan InfoTech Solutions",
    secondaryName: "BITS",
    gender: "",
    dateOfBirth: "",
    registrationNumber: "BRN-2025-01234",
    licenseNumber: "IBLS-2023-BITS-0042",
    gstNumber: "GST-BT-2023-0042",
    taxNumber: "TPN-BT-99012",
    countryOfRegistration: "Bhutan",
    businessRegistrationDate: "2023-03-10",
    email: "contracts@bits.bt",
    phone: "+975-2-556-677",
    secondaryPhone: "+975-17-889-900",
    faxNumber: "+975-2-556-678",
    address: "5th Floor, Norzin Plaza",
    addressLine2: "Norzin Lam",
    addressLine3: "Opposite Bhutan Post HQ",
    district: "Thimphu",
    dungkhag: "",
    gewog: "Chang",
    thromde: "Thimphu Thromde",
    cityTown: "",
    stateProvince: "",
    region: "",
    postalCode: "11001",
    bankName: "Bhutan National Bank",
    bankBranchName: "Thimphu Main Branch",
    bankBranchCode: "BNB-001",
    accountType: "Current Deposit Account",
    currencyType: "BTN",
    accountStatus: "Active",
    accountCategory: "Domestic",
    ifscCode: "",
    swiftCode: "BNBBBTBT",
    bankAccountNumber: "200100987654",
    bankAccountName: "Bhutan InfoTech Solutions",
    contactPerson: "Pema Lhamo",
    contactRole: "Chief Operating Officer",
    contractorStatusPrimary: "Active",
    contractorStatusSecondary: "Verified",
    statusReason: "",
    sanctionsCheck: "Clear",
    dataSource: "CMS Integration",
    remarks: "Synchronised from CMS via API",
  };
}

/* Bank rows / contact rows that match the prefilled FormState */
export function buildPrefilledBankRow(form: Partial<FormState>): BankAccountRow {
  return {
    id: crypto.randomUUID(),
    holderName: form.bankAccountName || "",
    accountNumber: form.bankAccountNumber || "",
    type: form.accountType || "Savings Bank Accounts",
    category: form.accountCategory || "Domestic",
    bank: form.bankName || "",
    branch: form.bankBranchName || "",
    branchCode: form.bankBranchCode || "",
    currency: form.currencyType || "BTN",
    status: form.accountStatus || "Active",
    primary: "Yes",
    cbsVerified: true,
  };
}

export function buildPrefilledContactRow(kind: ContractorKind, form: Partial<FormState>): ContactRow {
  const isBiz = kind === "business";
  return {
    id: crypto.randomUUID(),
    contactId: generateContactId(kind),
    salutation: form.salutation || (isBiz ? "" : "Mr."),
    firstName: isBiz ? (form.contactPerson?.split(" ")[0] || "Sonam") : (form.firstName || ""),
    middleName: form.middleName || "",
    lastName: isBiz ? (form.contactPerson?.split(" ").slice(1).join(" ") || "Dorji") : (form.lastName || ""),
    nationalId: form.registrationNumber || "",
    gender: form.gender || (isBiz ? "Male" : ""),
    email: form.email || "",
    mobileNumber: form.phone || "",
    landlineNumber: form.secondaryPhone || "",
    jobTitle: form.contactRole || (isBiz ? "Managing Director" : "Self"),
    isPrimaryContact: "Yes",
    isIfmisDesignated: "Yes",
    isActive: "Yes",
  };
}

export function simulateBankAutoPopulate(bankName: string, accountNumber: string) {
  if (!bankName || !accountNumber || accountNumber.length < 6) return null;
  const last4 = accountNumber.slice(-4);
  return {
    holderName: `Account Holder (${last4})`,
    type: "Savings",
    branch: bankName.includes("Bhutan")
      ? "Thimphu Main Branch"
      : bankName.includes("BDBL")
      ? "Phuentsholing Branch"
      : "Head Office",
  };
}

/* Simulate CBS (Core Banking System) verification — returns bank details from account number */
export function simulateCbsVerify(
  accountNumber: string,
): { bankName: string; branchName: string; branchCode: string; holderName: string; accountType: string; currency: string; status: string } | null {
  if (!accountNumber || accountNumber.trim().length < 1) return null;
  const n = accountNumber.trim();
  const cbsRecords: Record<string, { bankName: string; branchName: string; branchCode: string; holderName: string; accountType: string; currency: string; status: string }> = {
    "1234": { bankName: "Bank of Bhutan", branchName: "Thimphu Main Branch", branchCode: "BOB-001", holderName: "Nar Bdr Kharka", accountType: "Savings Bank Accounts", currency: "BTN", status: "Active" },
    "200100345678": { bankName: "Bhutan National Bank", branchName: "Paro Branch", branchCode: "BNB-012", holderName: "Karma Dorji", accountType: "Current Deposit Account", currency: "BTN", status: "Active" },
    "300200456789": { bankName: "BDBL", branchName: "Phuentsholing Branch", branchCode: "BDBL-005", holderName: "Dechen Wangmo", accountType: "Savings Bank Accounts", currency: "BTN", status: "Active" },
    "400300567890": { bankName: "T-Bank", branchName: "Thimphu Branch", branchCode: "TBNK-003", holderName: "Pema Tenzin Sherpa", accountType: "Current Deposit Account", currency: "BTN", status: "Active" },
  };
  const last4 = n.slice(-4).padStart(4, "0");
  return (
    cbsRecords[n] ?? {
      bankName: "Bank of Bhutan",
      branchName: "Thimphu Main Branch",
      branchCode: `BOB-${last4}`,
      holderName: "Nar Bdr Kharka",
      accountType: "Savings Bank Accounts",
      currency: "BTN",
      status: "Active",
    }
  );
}
