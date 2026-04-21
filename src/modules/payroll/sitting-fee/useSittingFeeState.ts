'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  getValidBankNames,
  getBranchOptionsForBank,
  validateBankDetails,
  verifyCbs,
  type BankFieldErrors,
} from '../../../shared/utils/bankValidation';
import type { SittingFeeBeneficiary } from '../types';
import { SITTING_FEE_BENEFICIARIES, computeTDS } from '../state/payrollSeed';
import type {
  SittingFeeState,
  CurrentStep,
  NewBeneficiaryForm,
  TransactionRecord,
  TransactionSummary,
  ValidationChecks,
} from './types';

/**
 * useSittingFeeState — Custom hook managing all state for the Sitting Fee workflow
 * Returns an object containing all state variables, computed values, and handlers
 */
export function useSittingFeeState(ctx: any): SittingFeeState {
  // Compute current fiscal year (FY runs from June to May)
  const currentFY = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }, []);

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* State Management                                                        */
  /* ═══════════════════════════════════════════════════════════════════════ */

  // Current step in 7-step workflow
  const [currentStep, setCurrentStep] = useState<CurrentStep>('onboard');

  // Beneficiary management
  const [beneficiaries, setBeneficiaries] = useState<SittingFeeBeneficiary[]>(
    SITTING_FEE_BENEFICIARIES
  );
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'sitting-fee' | 'honorarium'
  >('all');

  // New beneficiary form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState<NewBeneficiaryForm>({
    name: '',
    cid: '',
    tpn: '',
    category: 'sitting-fee',
    ratePerDay: 0,
    bankName: '',
    bankAccountNo: '',
    bankBranch: '',
  });

  // Bank validation state
  const [bankFieldErrors, setBankFieldErrors] = useState<BankFieldErrors>({});
  const [cbsStatus, setCbsStatus] = useState<
    'idle' | 'verifying' | 'verified' | 'failed'
  >('idle');
  const [cbsMessage, setCbsMessage] = useState('');

  // Transaction entry
  const [transactions, setTransactions] = useState<
    Record<string, TransactionRecord>
  >({});

  // Approval and finance review
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [financeRemarks, setFinanceRemarks] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Success state
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [processedPaymentId, setProcessedPaymentId] = useState('');

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Computed Values                                                         */
  /* ═══════════════════════════════════════════════════════════════════════ */

  /** Dynamic branch options based on selected bank */
  const sfBranchOptions = useMemo(
    () =>
      newBeneficiary.bankName
        ? getBranchOptionsForBank(newBeneficiary.bankName)
        : [],
    [newBeneficiary.bankName]
  );

  const filteredBeneficiaries = useMemo(() => {
    if (categoryFilter === 'all') {
      return beneficiaries;
    }
    return beneficiaries.filter((b) => b.category === categoryFilter);
  }, [beneficiaries, categoryFilter]);

  const activeBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => b.status === 'active');
  }, [beneficiaries]);

  const transactionSummary = useMemo(() => {
    let totalGrossAmount = 0;
    let totalTDS = 0;
    let totalNetPayable = 0;
    const lines: TransactionSummary['lines'] = [];

    activeBeneficiaries.forEach((beneficiary) => {
      const tx = transactions[beneficiary.id];
      if (tx && tx.days > 0) {
        const grossAmount = beneficiary.ratePerDay * tx.days;
        const tds = computeTDS(grossAmount);
        const netPayable = grossAmount - tds;
        const ucoaCode =
          beneficiary.category === 'sitting-fee' ? '2120121' : '2120122';

        totalGrossAmount += grossAmount;
        totalTDS += tds;
        totalNetPayable += netPayable;

        lines.push({
          beneficiary,
          days: tx.days,
          eventName: tx.eventName,
          grossAmount,
          tds,
          netPayable,
          ucoaCode,
        });
      }
    });

    return {
      lines,
      totalGrossAmount,
      totalTDS,
      totalNetPayable,
      count: lines.length,
    };
  }, [transactions, activeBeneficiaries]);

  const validationChecks = useMemo(() => {
    const checks: ValidationChecks = {
      allTPNsValid: true,
      budgetAvailable: true,
      bankAccountsVerified: true,
      noDuplicatePayments: true,
    };

    // TPN validation (should start with TPN-)
    checks.allTPNsValid = transactionSummary.lines.every((line) =>
      line.beneficiary.tpn.startsWith('TPN-')
    );

    // Budget check: use agency's annual budget from fiscal data
    const agencyBudget = ctx?.agency.fiscal?.annualBudgetNuM ?? 500000;
    checks.budgetAvailable =
      transactionSummary.totalNetPayable <= agencyBudget;

    // Bank account verification: validate against bank hierarchy
    checks.bankAccountsVerified = transactionSummary.lines.every((line) => {
      if (!line.beneficiary.bankAccountNo || !line.beneficiary.bankName)
        return false;
      const result = validateBankDetails(
        line.beneficiary.bankName,
        line.beneficiary.bankBranch,
        line.beneficiary.bankAccountNo
      );
      return result.valid;
    });

    // Duplicate check: no same beneficiary twice in one period
    const beneficiaryIds = transactionSummary.lines.map(
      (line) => line.beneficiary.id
    );
    checks.noDuplicatePayments =
      new Set(beneficiaryIds).size === beneficiaryIds.length;

    return checks;
  }, [transactionSummary, ctx]);

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Handlers                                                                */
  /* ═══════════════════════════════════════════════════════════════════════ */

  const handleSfBankChange = useCallback((bankName: string) => {
    setNewBeneficiary((prev) => ({ ...prev, bankName, bankBranch: '' }));
    setBankFieldErrors({});
    setCbsStatus('idle');
    setCbsMessage('');
  }, []);

  const handleSfBranchChange = useCallback((branchName: string) => {
    setNewBeneficiary((prev) => ({ ...prev, bankBranch: branchName }));
    setCbsStatus('idle');
    setCbsMessage('');
  }, []);

  const handleSfVerifyBank = useCallback(async () => {
    const result = validateBankDetails(
      newBeneficiary.bankName,
      newBeneficiary.bankBranch,
      newBeneficiary.bankAccountNo
    );
    if (!result.valid) {
      const fe: BankFieldErrors = {};
      result.errors.forEach((e) => {
        if (
          e.toLowerCase().includes('bank name') ||
          e.toLowerCase().includes('recognised')
        )
          fe.bankName = e;
        else if (e.toLowerCase().includes('branch')) fe.bankBranch = e;
        else if (e.toLowerCase().includes('account')) fe.bankAccountNo = e;
      });
      setBankFieldErrors(fe);
      setCbsStatus('failed');
      setCbsMessage(result.errors.join('; '));
      return false;
    }
    setBankFieldErrors({});
    setCbsStatus('verifying');
    setCbsMessage('Contacting Core Banking System…');
    const cbs = await verifyCbs(
      newBeneficiary.bankName,
      newBeneficiary.bankBranch,
      newBeneficiary.bankAccountNo,
      newBeneficiary.name
    );
    if (cbs.verified) {
      setCbsStatus('verified');
      setCbsMessage(cbs.message);
      return true;
    }
    setCbsStatus('failed');
    setCbsMessage(cbs.message);
    return false;
  }, [
    newBeneficiary.bankName,
    newBeneficiary.bankBranch,
    newBeneficiary.bankAccountNo,
    newBeneficiary.name,
  ]);

  const handleAddBeneficiary = useCallback(
    async () => {
      if (
        !newBeneficiary.name ||
        !newBeneficiary.cid ||
        !newBeneficiary.tpn ||
        newBeneficiary.ratePerDay <= 0
      ) {
        alert('Please fill in all required fields (Name, CID, TPN, Rate)');
        return;
      }

      /* Bank validation gate */
      const bankResult = validateBankDetails(
        newBeneficiary.bankName,
        newBeneficiary.bankBranch,
        newBeneficiary.bankAccountNo
      );
      if (!bankResult.valid) {
        const fe: BankFieldErrors = {};
        bankResult.errors.forEach((e) => {
          if (
            e.toLowerCase().includes('bank name') ||
            e.toLowerCase().includes('recognised')
          )
            fe.bankName = e;
          else if (e.toLowerCase().includes('branch')) fe.bankBranch = e;
          else if (e.toLowerCase().includes('account')) fe.bankAccountNo = e;
        });
        setBankFieldErrors(fe);
        alert(
          'Bank details validation failed:\n' + bankResult.errors.join('\n')
        );
        return;
      }

      /* CBS verification if not already verified */
      if (cbsStatus !== 'verified') {
        const cbsOk = await handleSfVerifyBank();
        if (!cbsOk) {
          alert(
            'CBS bank verification failed. Please check bank details and try again.'
          );
          return;
        }
      }

      const id = `SF-${Date.now()}`;
      setBeneficiaries([
        ...beneficiaries,
        {
          ...newBeneficiary,
          id,
          status: 'active',
        },
      ]);
      setNewBeneficiary({
        name: '',
        cid: '',
        tpn: '',
        category: 'sitting-fee',
        ratePerDay: 0,
        bankName: '',
        bankAccountNo: '',
        bankBranch: '',
      });
      setBankFieldErrors({});
      setCbsStatus('idle');
      setCbsMessage('');
      setShowAddForm(false);
    },
    [newBeneficiary, beneficiaries, cbsStatus, handleSfVerifyBank]
  );

  const handleTransactionChange = useCallback(
    (
      beneficiaryId: string,
      field: 'days' | 'eventName' | 'dateRange',
      value: string | number
    ) => {
      setTransactions((prev) => ({
        ...prev,
        [beneficiaryId]: {
          ...prev[beneficiaryId],
          [field]: field === 'days' ? Number(value) : value,
        },
      }));
    },
    []
  );

  const handleApprove = useCallback(() => {
    if (approvalRemarks.trim()) {
      setCurrentStep('finance');
    }
  }, [approvalRemarks]);

  const handleFinanceClear = useCallback(() => {
    if (financeRemarks.trim()) {
      setCurrentStep('payment');
    }
  }, [financeRemarks]);

  const handleProcessPayment = useCallback(() => {
    // Generate proper journal entry ID with timestamp
    const journalId = `JE-SF-${Date.now().toString().slice(-8)}`;
    const paymentId = `PAY-SF-${journalId}`;

    // Compute journal entry totals (debit: expenditure, credit: bank + TDS)
    const totalDebit = transactionSummary.totalGrossAmount;
    const totalCredit =
      transactionSummary.totalNetPayable + transactionSummary.totalTDS;

    // Verify debit = credit (should always be true)
    if (totalDebit === totalCredit) {
      setProcessedPaymentId(paymentId);
      setPaymentReference(paymentId);
      setPaymentProcessed(true);
    }
  }, [transactionSummary.totalGrossAmount, transactionSummary.totalNetPayable, transactionSummary.totalTDS]);

  return {
    currentStep,
    setCurrentStep,
    beneficiaries,
    setBeneficiaries,
    categoryFilter,
    setCategoryFilter,
    showAddForm,
    setShowAddForm,
    newBeneficiary,
    setNewBeneficiary,
    bankFieldErrors,
    setBankFieldErrors,
    cbsStatus,
    setCbsStatus,
    cbsMessage,
    setCbsMessage,
    sfBranchOptions,
    handleSfBankChange,
    handleSfBranchChange,
    handleSfVerifyBank,
    handleAddBeneficiary,
    transactions,
    setTransactions,
    handleTransactionChange,
    filteredBeneficiaries,
    activeBeneficiaries,
    transactionSummary,
    validationChecks,
    currentFY,
    approvalRemarks,
    setApprovalRemarks,
    financeRemarks,
    setFinanceRemarks,
    paymentReference,
    setPaymentReference,
    paymentProcessed,
    setPaymentProcessed,
    processedPaymentId,
    setProcessedPaymentId,
    handleApprove,
    handleFinanceClear,
    handleProcessPayment,
  };
}
