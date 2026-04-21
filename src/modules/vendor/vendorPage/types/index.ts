/* Shared types for VendorManagementPage */
import type {
  VendorRecord,
  VendorCategory,
  VendorIntegrationSource,
  VendorVehicleDetail,
} from "../../../../shared/types";
import type { StoredContract } from "../../../../shared/context/ContractDataContext";

export type PageView = "dashboard" | "register" | "detail";

export interface VendorFormState {
  contractorId: string;
  vendorType: string;
  vendorCategory: VendorCategory;
  vendorName: string;
  cid: string;
  tpn: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  swiftCode: string;
  expenditureCategory: string;
  contractorType: string;
  fundingSource: string;
  paymentFrequency: string;
  contractCategories: string[];
  remarks: string;
  integrationSource: VendorIntegrationSource;
  /* Auto-linked contract info */
  linkedContractId: string;
  linkedContractTitle: string;
  /* Vehicle Management sub-form (DD 27.1.1-27.1.8) */
  hasVehicleDetails: boolean;
  vehicle: VendorVehicleDetail;
}

export interface EnrichedVendor extends VendorRecord {
  contractorName: string;
  contractorPhone: string;
  contractorEmail: string;
  linkedContracts: StoredContract[];
  source: "contractor" | "contract" | "manual";
}
