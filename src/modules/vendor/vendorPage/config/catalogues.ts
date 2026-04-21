/* Constants / catalogues for VendorManagementPage */
import type {
  VendorCategory,
  VendorIntegrationSource,
  VendorVehicleDetail,
} from "../../../../shared/types";
import type { VendorFormState } from "../types";

/* SRS row 109-112 — five vendor categories.
   "Contract" branches to Under Contractual flow (auto-pull approved contractors).
   The other four branch to Non-Contractual manual entry. */
export const VENDOR_CATEGORIES: VendorCategory[] = ["Utility", "Contract", "Subscription", "Contribution", "Others"];

/* SRS Process Description — integration sources per row 109 */
export const INTEGRATION_SOURCES: { value: VendorIntegrationSource; label: string; hint: string }[] = [
  { value: "System", label: "System", hint: "Auto from contract module" },
  { value: "API-Banks", label: "API-Banks", hint: "Bank validation API" },
  { value: "BITS", label: "BITS", hint: "Business Information & Tax System" },
  { value: "RAMIS", label: "RAMIS", hint: "Revenue Administration MIS" },
  { value: "IBLS", label: "IBLS", hint: "Integrated Business Licensing System" },
];

/* SRS row 112 — Approval chain (maker-checker) */
export const APPROVAL_CHAIN = ["Finance Officer", "Department Head", "Finance Controller", "Final Approval"];

export const initialVehicle: VendorVehicleDetail = {
  vehicleNumber: "", agencyCode: "", budgetCode: "", expenditureType: "",
  vehicleExpensesType: "", vehicleType: "", fuelProvidersName: "", payableAmount: "",
};

export const initialForm: VendorFormState = {
  contractorId: "", vendorType: "Contractual Vendor", vendorCategory: "Contract",
  vendorName: "", cid: "", tpn: "", registrationNumber: "", address: "",
  phone: "", email: "", contactPerson: "", bankName: "", bankAccountNumber: "",
  bankAccountName: "", swiftCode: "", expenditureCategory: "", contractorType: "",
  fundingSource: "RGOB", paymentFrequency: "As Needed", contractCategories: [],
  remarks: "", integrationSource: "System",
  linkedContractId: "", linkedContractTitle: "",
  hasVehicleDetails: false, vehicle: initialVehicle,
};
