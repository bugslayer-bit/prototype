/**
 * Type definitions for Sitting Fee & Honorarium module
 */

import type { SittingFeeBeneficiary } from '../types';
import type { BankFieldErrors } from '../../../shared/utils/bankValidation';
export type { BankFieldErrors };

export type CurrentStep = 'onboard' | 'transaction' | 'checks' | 'draft' | 'approve' | 'finance' | 'payment';

export interface TransactionRecord {
  days: number;
  eventName: string;
  dateRange: string;
}

export interface TransactionSummaryLine {
  beneficiary: SittingFeeBeneficiary;
  days: number;
  eventName: string;
  grossAmount: number;
  tds: number;
  netPayable: number;
  ucoaCode: string;
}

export interface TransactionSummary {
  lines: TransactionSummaryLine[];
  totalGrossAmount: number;
  totalTDS: number;
  totalNetPayable: number;
  count: number;
}

export interface ValidationChecks {
  allTPNsValid: boolean;
  budgetAvailable: boolean;
  bankAccountsVerified: boolean;
  noDuplicatePayments: boolean;
}

export interface NewBeneficiaryForm {
  name: string;
  cid: string;
  tpn: string;
  category: 'sitting-fee' | 'honorarium';
  ratePerDay: number;
  bankName: string;
  bankAccountNo: string;
  bankBranch: string;
}

export interface SittingFeeState {
  currentStep: CurrentStep;
  setCurrentStep: (step: CurrentStep) => void;

  // Beneficiary management
  beneficiaries: SittingFeeBeneficiary[];
  setBeneficiaries: (beneficiaries: SittingFeeBeneficiary[]) => void;
  categoryFilter: 'all' | 'sitting-fee' | 'honorarium';
  setCategoryFilter: (filter: 'all' | 'sitting-fee' | 'honorarium') => void;

  // Add form
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  newBeneficiary: NewBeneficiaryForm;
  setNewBeneficiary: (beneficiary: NewBeneficiaryForm) => void;

  // Bank validation
  bankFieldErrors: BankFieldErrors;
  setBankFieldErrors: (errors: BankFieldErrors) => void;
  cbsStatus: 'idle' | 'verifying' | 'verified' | 'failed';
  setCbsStatus: (status: 'idle' | 'verifying' | 'verified' | 'failed') => void;
  cbsMessage: string;
  setCbsMessage: (message: string) => void;
  sfBranchOptions: Array<{ value: string; label: string; bfsc: string }>;

  // Handlers
  handleSfBankChange: (bankName: string) => void;
  handleSfBranchChange: (branchName: string) => void;
  handleSfVerifyBank: () => Promise<boolean>;
  handleAddBeneficiary: () => Promise<void>;

  // Transactions
  transactions: Record<string, TransactionRecord>;
  setTransactions: (transactions: Record<string, TransactionRecord>) => void;
  handleTransactionChange: (
    beneficiaryId: string,
    field: 'days' | 'eventName' | 'dateRange',
    value: string | number
  ) => void;

  // Computed
  filteredBeneficiaries: SittingFeeBeneficiary[];
  activeBeneficiaries: SittingFeeBeneficiary[];
  transactionSummary: TransactionSummary;
  validationChecks: ValidationChecks;
  currentFY: string;

  // Approval & Finance
  approvalRemarks: string;
  setApprovalRemarks: (remarks: string) => void;
  financeRemarks: string;
  setFinanceRemarks: (remarks: string) => void;
  paymentReference: string;
  setPaymentReference: (reference: string) => void;
  paymentProcessed: boolean;
  setPaymentProcessed: (processed: boolean) => void;
  processedPaymentId: string;
  setProcessedPaymentId: (id: string) => void;

  // Handlers
  handleApprove: () => void;
  handleFinanceClear: () => void;
  handleProcessPayment: () => void;
}
