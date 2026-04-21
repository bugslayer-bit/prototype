/* Types for ContractorManagementPage */

export type Step = 1 | 2 | 3 | 4;
export type PortalAccess = "enabled" | "disabled" | "";
export type AccountStatus = "Active" | "Inactive" | "Locked" | "Blocked" | "";
export type AuthMethod =
  | "Username/Password"
  | "OTP via SMS"
  | "OTP via Email"
  | "Two-Factor Authentication (2FA)"
  | "Digital Certificate (Bhutan NDI)"
  | "";
export type DelegateRole = "Viewer" | "Submitter" | "Manager";
export type DelegateStatus = "Active" | "Inactive";

export interface DelegateUser {
  id: string;
  name: string;
  cid: string;
  email: string;
  mobile: string;
  role: DelegateRole;
  status: DelegateStatus;
}

export interface PermissionModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  granted: boolean;
}

export interface UserAccessConfig {
  portalAccess: PortalAccess;
  accountStatus: AccountStatus;
  username: string;
  email: string;
  mobile: string;
  authMethod: AuthMethod;
  delegates: DelegateUser[];
  permissions: PermissionModule[];
  accessFrom: string;
  accessUntil: string;
  ipRestriction: string;
  maxLoginAttempts: string;
  sessionTimeout: string;
  passwordExpiry: string;
  remarks: string;
}

export interface EditFormState {
  displayName: string;
  contractorType: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  taxNumber: string;
  registrationNumber: string;
  nationality: string;
}

export interface ProcessStep {
  stepNo: number | string;
  title: string;
  description: string;
  actor: string;
  subSteps?: { label: string; detail: string; actor?: string }[];
}

export interface ProcessGroup {
  prn: string;
  title: string;
  workflow: string;
  icon: string;
  color: string;
  steps: ProcessStep[];
}
