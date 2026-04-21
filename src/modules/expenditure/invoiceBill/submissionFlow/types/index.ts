/* Shared types extracted from InvoiceSubmissionPage.tsx */

export type ContractCategory = "Goods" | "Works" | "Services" | "Goods and Services (Mixed)";
export type ContractStatus = "Active" | "Pending" | "Closed";
export type SubmissionChannel =
  | "Manual entry by the Agency"
  | "e-GP system"
  | "CMS"
  | "Supplier Self Registration";
export type ChannelState = "idle" | "connecting" | "connected";

export interface FlowContract {
  id: string;
  title: string;
  amount: number;
  status: ContractStatus;
  contractor: string;
  contractorId: string;
  category: ContractCategory;
  isMilestone: boolean;
  retentionPct: number;
  taxRate: number;
  taxId: string;
  taxApplicability: string;
  advanceRules: string;
  currency: string;
  docChecklist: { name: string; mandatory: boolean }[];
  milestones: { id: string; name: string; amount: number }[];
  sourceMethod: string;
  fundingSource: string;
  agencyName: string;
}

export interface InvoiceForm {
  channel: SubmissionChannel | "";
  submitterName: string;
  submitterRole: string;
  contractorId: string;
  authTime: string;
  authVerified: boolean;
  contractId: string;
  searchQuery: string;
  filterStatus: ContractStatus | "";
  taxType: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceCategory: ContractCategory | "";
  grossAmount: string;
  notes: string;
  milestoneAllocations: Record<string, string>;
  grnNumber: string;
  documentsUploaded: Record<string, boolean>;
  uploadedFiles: { name: string; sizeKB: number }[];
  submissionRemarks: string;
}

export interface ValidationCheck {
  id: string;
  passed: boolean;
  text: string;
  gotoStep: number;
  hint?: string;
  fix?: { label: string; run: () => void };
}

export interface ChannelMeta {
  id: SubmissionChannel;
  icon: string;
  short: string;
  endpoint: string;
  description: string;
  color: string;
}

export interface InvoiceSubmissionFlowProps {
  embedded?: boolean;
}

export interface PersistedSession {
  step: number;
  form: InvoiceForm;
  ifmisNumber: string;
  submitted: boolean;
  channelState: ChannelState;
}

export const SESSION_KEY = "ifmis_invoice_submission_draft_v1";
