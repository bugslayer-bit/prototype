/* ═══════════════════════════════════════════════════════════════════════════
   OPS Travel Claim Processing Page
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — OPS Travel Advance Request & Payment
   ═══════════════════════════════════════════════════════════════════════════ */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../../shared/data/agencyPersonas';
import { ModuleActorBanner } from '../../../../shared/components/ModuleActorBanner';
import { useOpsRoleCapabilities, opsPayrollToneClasses } from '../state/useOpsRoleCapabilities';
import { OPS_EMPLOYEES, getOpsEmployeeById } from '../data/opsEmployeeSeed';
import { EDATS_APPROVED_REQUESTS, findEdatsRequestByRef } from '../data/edatsApprovedRequests';
import {
  generateTransactionAndOrder,
  markOrderStatus,
  getOrderForClaim,
  generatePaymentAdvice,
  postAdviceToMcp,
  markAdviceReleased,
  useTravelPaymentData,
  type PaymentOrderMode,
  type TravelPaymentOrder,
  type TravelPaymentAdvice,
} from '../state/travelPaymentTransactions';
import {
  enqueueTravelEdatsDispatch,
  useTravelEdatsDispatches,
  type TravelEdatsDispatch,
} from '../state/travelEdatsDispatches';
import {
  useTravelClaims,
  setClaims,
  type TravelClaim,
} from '../state/travelClaims';
import type {
  OpsTravelAdvanceLocal,
  OpsTravelAdvanceForeign,
  OpsTravelPlan,
} from '../types';

/* ───────────────────────────────────────────────────────────────────────────
   Types & Constants
   ─────────────────────────────────────────────────────────────────────────── */

/* TravelClaim type lives in state/travelClaims.ts so all three sub-pages
   (Claim List / Payment Order / POST Payment) share a single shape. */

const CURRENCIES = [
  { code: 'BTN', label: 'Bhutanese Ngultrum', rate: 1 },
  { code: 'USD', label: 'US Dollar', rate: 88.5 },
  { code: 'EUR', label: 'Euro', rate: 96.2 },
  { code: 'INR', label: 'Indian Rupee', rate: 1.06 },
  { code: 'GBP', label: 'British Pound', rate: 111.3 },
];

export function OpsTravelClaimPage() {
  const { activeAgencyCode } = useAuth();
  const context = resolveAgencyContext(useAuth().activeRoleId);
  const caps = useOpsRoleCapabilities();
  const tone = opsPayrollToneClasses(caps.personaTone);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* State Management */
  /* ─────────────────────────────────────────────────────────────────────── */
  const [view, setView] = useState<'list' | 'new'>('list');
  const claims = useTravelClaims();
  const [selectedClaim, setSelectedClaim] = useState<TravelClaim | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'local' | 'foreign' | 'plans'>('all');

  /* New Claim Form State */
  const [formData, setFormData] = useState({
    source: 'manual' as 'edats' | 'manual',
    travelType: 'domestic' as 'domestic' | 'foreign',
    employeeId: '',
    positionTitle: '',
    agencyName: '',
    agencyCode: '',
    cid: '',
    purpose: '',
    startDate: '',
    endDate: '',
    destination: '',
    countryOfTravel: '',
    budgetCode: '',
    amount: 0,
    approvedAdvanceAmount: 0,
    currency: 'BTN' as 'BTN' | 'USD' | 'EUR' | 'INR' | 'GBP',
    exchangeRate: 1,
    approvedTARefNo: '',
    receivedFromEdatsDate: '',
    paymentMode: 'bank' as PaymentOrderMode,
    cashCollectorName: '',
    cashCollectorCid: '',
    cashCollectorRelationship: '',
    bankCharges: 0,
    bankChargesBudgetCode: '',
    fxConversionCharges: 0,
    fxChargesBudgetCode: '',
  });

  /* PO preview / advice preview / reject modal state */
  const [poPreview, setPoPreview] = useState<TravelPaymentOrder | null>(null);
  const [advicePreview, setAdvicePreview] = useState<TravelPaymentAdvice | null>(null);
  const [rejectClaimId, setRejectClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  /* Subscribe to txn + PO + advice + e-DATS stores */
  const { orders, advices } = useTravelPaymentData();
  const edatsDispatches = useTravelEdatsDispatches();

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Computed */
  /* ─────────────────────────────────────────────────────────────────────── */
  /* OPS-only claim view — CS claims live in a separate sub-menu. */
  const opsClaims = useMemo(
    () => claims.filter((c) => c.category === 'other-public-servant'),
    [claims],
  );

  const filteredClaims = useMemo(() => {
    let filtered = opsClaims;

    // Apply tab filter
    if (activeTab === 'local') {
      filtered = filtered.filter(c => c.travelType === 'domestic');
    } else if (activeTab === 'foreign') {
      filtered = filtered.filter(c => c.travelType === 'foreign');
    } else if (activeTab === 'plans') {
      // Plans tab shows all claims regardless of type
      filtered = filtered.filter(c => c.planStatus !== undefined);
    }

    if (filterStatus) {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.refNo.toLowerCase().includes(q) ||
        c.employeeName.toLowerCase().includes(q) ||
        c.destination.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [opsClaims, filterStatus, searchQuery, activeTab]);

  const stats = useMemo(() => {
    const total = opsClaims.length;
    const pending = opsClaims.filter(c => ['submitted', 'verified'].includes(c.status)).length;
    const disbursed = opsClaims.filter(c => c.status === 'paid').reduce((sum, c) => {
      const amt = c.currency === 'BTN' ? c.amount : (c.amount * (c.exchangeRate || 1));
      return sum + amt;
    }, 0);
    return { total, pending, disbursed };
  }, [opsClaims]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Validation */
  /* ─────────────────────────────────────────────────────────────────────── */
  /* SRS §2 — live validation matrix. Each check returns:
       "pass" — green / allowed
       "fail" — red / blocks create
       "idle" — grey / not-yet-decidable (e.g. empty field)
     Reasons are surfaced in the validation panel so the user knows what
     to fix before "Create Claim" re-enables. */
  type CheckStatus = 'pass' | 'fail' | 'idle';
  interface CheckResult { status: CheckStatus; message: string; }

  const validationChecks: Record<string, CheckResult> = useMemo(() => {
    const emp = formData.employeeId ? getOpsEmployeeById(formData.employeeId) : null;
    const refTrim = (formData.approvedTARefNo ?? '').trim();

    /* 1. Employee ID & Organization ID accuracy.
       The employee must resolve AND their workingAgency must match the
       agency attached to the form (auto-filled from the same record, so
       this becomes a fail only if the form is edited by hand). */
    let empCheck: CheckResult;
    if (!formData.employeeId) {
      empCheck = { status: 'idle', message: 'Select an employee.' };
    } else if (!emp) {
      empCheck = { status: 'fail', message: 'Employee not found in master.' };
    } else if (!formData.agencyCode) {
      empCheck = { status: 'fail', message: 'Organization ID missing.' };
    } else if (emp.workingAgency !== formData.agencyCode) {
      empCheck = { status: 'fail', message: `Agency mismatch: employee is registered under ${emp.workingAgency}.` };
    } else {
      empCheck = { status: 'pass', message: 'Employee ID & Organization ID match.' };
    }

    /* 2. Budget code + availability.
       Format: at least one alpha + one digit; mock availability by
       blocking budget codes ending in "000" (treated as "exhausted"). */
    let budgetCheck: CheckResult;
    const bc = (formData.budgetCode ?? '').trim();
    if (!bc) {
      budgetCheck = { status: 'idle', message: 'Enter a budget code.' };
    } else if (!/^[A-Za-z]+[-_\d]*\d$/.test(bc)) {
      budgetCheck = { status: 'fail', message: 'Budget code format invalid (expected e.g. HE-01-001).' };
    } else if (bc.endsWith('000') && bc !== 'HE-01-000') {
      budgetCheck = { status: 'fail', message: 'Budget code has no funds remaining for this agency.' };
    } else {
      budgetCheck = { status: 'pass', message: 'Budget available for this Organization ID.' };
    }

    /* 3. Duplicate Approved TA Ref No.
       Reject if the SAME ref already exists on any non-rejected claim. */
    let dupeCheck: CheckResult;
    if (!refTrim) {
      dupeCheck = { status: 'idle', message: 'Enter the Approved TA Reference No.' };
    } else {
      const dupe = claims.some((c) =>
        c.approvedTARefNo === refTrim && c.status !== 'rejected',
      );
      dupeCheck = dupe
        ? { status: 'fail', message: `Ref ${refTrim} already recorded on another claim.` }
        : { status: 'pass', message: 'Approved TA Ref is unique.' };
    }

    return { employee: empCheck, budget: budgetCheck, duplicate: dupeCheck };
  }, [formData, claims]);

  const allValidationsPass = Object.values(validationChecks).every((c) => c.status === 'pass');

  const validateNewClaim = useCallback(() => {
    if (!allValidationsPass) {
      console.log('[Toast] Fix validation errors before creating the claim.');
      return false;
    }
    if (!formData.purpose || !formData.startDate || !formData.endDate) {
      console.log('[Toast] Please fill purpose and travel dates.');
      return false;
    }
    if (formData.paymentMode === 'cash' && !formData.cashCollectorName) {
      console.log('[Toast] Cash payment requires an authorized collector.');
      return false;
    }
    return true;
  }, [allValidationsPass, formData]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Handlers */
  /* ─────────────────────────────────────────────────────────────────────── */
  const handleCreateClaim = useCallback(() => {
    if (!validateNewClaim()) return;
    // snapshot the validation results for persistence on the claim

    const emp = getOpsEmployeeById(formData.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
    const posTitle = emp?.positionTitle || formData.positionTitle || 'Officer';
    const agencyName = formData.agencyName || emp?.workingAgency || 'Unknown Agency';
    const agencyCode = emp?.workingAgency || formData.agencyCode || '';
    const cid = emp?.cid || formData.cid || '';

    const today = new Date().toISOString().split('T')[0];
    const newClaim: TravelClaim = {
      id: `ops-${Date.now()}`,
      refNo: `TRV-${new Date().getFullYear()}-OPS-${String(claims.length + 1).padStart(3, '0')}`,
      category: 'other-public-servant',
      employeeId: formData.employeeId,
      employeeName: empName,
      positionTitle: posTitle,
      agencyName: agencyName,
      agencyCode: agencyCode,
      cid: cid,
      travelType: formData.travelType,
      amount: formData.amount,
      approvedAdvanceAmount: formData.approvedAdvanceAmount || formData.amount,
      currency: formData.currency,
      exchangeRate: formData.currency !== 'BTN' ? formData.exchangeRate : undefined,
      purpose: formData.purpose,
      travelPurpose: formData.purpose,
      startDate: formData.startDate,
      endDate: formData.endDate,
      destination: formData.destination,
      countryOfTravel: formData.countryOfTravel,
      budgetCode: formData.budgetCode,
      status: 'draft',
      createdDate: today,
      dateOfApproval: today,
      receivedFromEdatsDate: formData.source === 'edats' ? (formData.receivedFromEdatsDate || today) : undefined,
      approvedTARefNo: (formData.approvedTARefNo || '').trim(),
      advanceStatus: 'draft',
      paymentMode: formData.paymentMode,
      cashCollectorName: formData.paymentMode === 'cash' ? formData.cashCollectorName : undefined,
      cashCollectorCid: formData.paymentMode === 'cash' ? formData.cashCollectorCid : undefined,
      cashCollectorRelationship: formData.paymentMode === 'cash' ? formData.cashCollectorRelationship : undefined,
      bankCharges: formData.travelType === 'foreign' ? formData.bankCharges : undefined,
      bankChargesBudgetCode: formData.travelType === 'foreign' ? formData.bankChargesBudgetCode : undefined,
      fxConversionCharges: formData.travelType === 'foreign' ? formData.fxConversionCharges : undefined,
      fxChargesBudgetCode: formData.travelType === 'foreign' ? formData.fxChargesBudgetCode : undefined,
      /* SRS §2 — freeze validation snapshot; Create only fires when all three pass. */
      validationResults: {
        employee:  { status: 'pass', message: validationChecks.employee.message },
        budget:    { status: 'pass', message: validationChecks.budget.message },
        duplicate: { status: 'pass', message: validationChecks.duplicate.message },
      },
    };

    setClaims([...claims, newClaim]);
    setFormData({
      source: 'manual',
      travelType: 'domestic',
      employeeId: '',
      positionTitle: '',
      agencyName: '',
      agencyCode: '',
      cid: '',
      purpose: '',
      startDate: '',
      endDate: '',
      destination: '',
      countryOfTravel: '',
      budgetCode: '',
      amount: 0,
      approvedAdvanceAmount: 0,
      currency: 'BTN',
      exchangeRate: 1,
      approvedTARefNo: '',
      receivedFromEdatsDate: '',
      paymentMode: 'bank',
      cashCollectorName: '',
      cashCollectorCid: '',
      cashCollectorRelationship: '',
      bankCharges: 0,
      bankChargesBudgetCode: '',
      fxConversionCharges: 0,
      fxChargesBudgetCode: '',
    });
    setView('list');
    console.log('[Toast] Travel claim created: ' + newClaim.refNo);
  }, [validateNewClaim, claims, formData, validationChecks]);

  const handleSubmitClaim = useCallback((claimId: string) => {
    setClaims(claims.map(c =>
      c.id === claimId ? { ...c, status: 'submitted' } : c
    ));
    console.log('[Toast] Claim submitted for verification');
  }, [claims]);

  const handleApproveClaim = useCallback((claimId: string) => {
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;
    const emp = getOpsEmployeeById(claim.employeeId);

    /* SRS §3 — auto-generate Payment Transaction + Payment Order on approval. */
    const { transaction, order } = generateTransactionAndOrder({
      claimId: claim.id,
      claimRefNo: claim.refNo,
      approvedTARefNo: claim.approvedTARefNo ?? '',
      employeeId: claim.employeeId,
      employeeName: claim.employeeName,
      employeeCid: claim.cid,
      agencyCode: claim.agencyCode,
      budgetCode: claim.budgetCode,
      travelType: claim.travelType,
      currency: claim.currency,
      advanceAmount: claim.approvedAdvanceAmount || claim.amount,
      bankCharges: claim.bankCharges,
      fxConversionCharges: claim.fxConversionCharges,
      mode: claim.paymentMode ?? 'bank',
      bankName: emp?.bankName,
      bankAccountNumber: emp?.bankAccountNumber,
      bankBranch: emp?.bankBranch,
      cashCollectorName: claim.cashCollectorName,
      cashCollectorCid: claim.cashCollectorCid,
      cashCollectorRelationship: claim.cashCollectorRelationship,
      createdByRoleId: null,
    });

    setClaims((prev) => prev.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: 'approved',
            approvedDate: new Date().toISOString().split('T')[0],
            paymentTransactionRef: transaction.id,
            paymentOrderId: order.id,
          }
        : c,
    ));
    console.log(`[Toast] Claim approved. Txn ${transaction.id} + PO ${order.id} generated.`);
  }, [claims]);

  const handlePayClaim = useCallback((claimId: string) => {
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;
    const paidAt = new Date().toISOString().split('T')[0];
    const order = getOrderForClaim(claimId);
    if (order) markOrderStatus(order.id, 'settled');
    if (claim.paymentAdviceId) markAdviceReleased(claim.paymentAdviceId);

    /* SRS §4 — post-back to e-DATS after the payment is released. */
    if (claim.approvedTARefNo && claim.paymentTransactionRef) {
      enqueueTravelEdatsDispatch({
        claimId: claim.id,
        approvedTARefNo: claim.approvedTARefNo,
        paymentTransactionRef: claim.paymentTransactionRef,
        transactionStatus: 'paid',
        dateOfPayment: paidAt,
        amountPaid: claim.approvedAdvanceAmount || claim.amount,
        currency: claim.currency,
      });
    }

    setClaims((prev) => prev.map((c) =>
      c.id === claimId ? { ...c, status: 'paid', paidAt } : c,
    ));
    console.log('[Toast] MCP released payment. e-DATS post-back queued.');
  }, [claims]);

  const handleRejectClaim = useCallback(() => {
    if (!rejectClaimId || !rejectReason.trim()) return;
    const claim = claims.find((c) => c.id === rejectClaimId);
    if (!claim) return;
    const rejectedAt = new Date().toISOString().split('T')[0];

    /* SRS §4 — post-back rejection to e-DATS when a payment is refused. */
    if (claim.approvedTARefNo && claim.paymentTransactionRef) {
      enqueueTravelEdatsDispatch({
        claimId: claim.id,
        approvedTARefNo: claim.approvedTARefNo,
        paymentTransactionRef: claim.paymentTransactionRef,
        transactionStatus: 'rejected',
        rejectedReason: rejectReason.trim(),
        dateOfPayment: rejectedAt,
        amountPaid: 0,
        currency: claim.currency,
      });
    }

    setClaims((prev) => prev.map((c) =>
      c.id === rejectClaimId
        ? { ...c, status: 'rejected', rejectedReason: rejectReason.trim() }
        : c,
    ));
    setRejectClaimId(null);
    setRejectReason('');
    console.log('[Toast] Claim rejected. e-DATS post-back queued.');
  }, [rejectClaimId, rejectReason, claims]);

  /* SRS §1 — e-DATS fetch-and-populate.
     Picks an approved request from the mock e-DATS pool and fills the form
     with the payload IFMIS would have received from e-DATS. Fields remain
     editable so the user can review before creating the claim. */
  const handleFetchFromEdats = useCallback((refNo: string) => {
    const req = findEdatsRequestByRef(refNo);
    if (!req) return;
    const today = new Date().toISOString().split('T')[0];
    setFormData((prev) => ({
      ...prev,
      source: 'edats',
      travelType: req.travelType,
      employeeId: req.employeeId,
      positionTitle: req.positionTitle,
      agencyName: req.agencyCode,
      agencyCode: req.agencyCode,
      cid: req.cid,
      purpose: req.purpose,
      startDate: req.startDate,
      endDate: req.endDate,
      destination: req.destination,
      countryOfTravel: req.countryOfTravel ?? '',
      budgetCode: req.budgetCode,
      amount: req.approvedAmount,
      approvedAdvanceAmount: req.approvedAmount,
      currency: req.currency,
      exchangeRate: req.exchangeRate ?? 1,
      approvedTARefNo: req.refNo,
      receivedFromEdatsDate: today,
    }));
    console.log(`[Toast] Fetched ${req.refNo} from e-DATS.`);
  }, []);

  /* Only offer e-DATS refs that are NOT already recorded on non-rejected
     claims, so the duplicate-ref validation check can never fail due to
     auto-fill. */
  const availableEdatsRequests = useMemo(() => {
    const recorded = new Set(
      claims
        .filter((c) => c.status !== 'rejected')
        .map((c) => c.approvedTARefNo)
        .filter(Boolean),
    );
    return EDATS_APPROVED_REQUESTS.filter((r) => !recorded.has(r.refNo));
  }, [claims]);

  /* PO action handlers */
  const handlePrintPo = useCallback((order: TravelPaymentOrder) => {
    markOrderStatus(order.id, 'printed');
    window.print();
  }, []);

  const handleSendPoToBank = useCallback((order: TravelPaymentOrder) => {
    markOrderStatus(order.id, 'sent-to-bank');
    console.log(`[Toast] PO ${order.id} dispatched to bank integration queue.`);
  }, []);

  const handleEmployeeCopyPo = useCallback((order: TravelPaymentOrder) => {
    markOrderStatus(order.id, 'employee-copy');
    console.log(`[Toast] Employee copy of PO ${order.id} prepared for download.`);
  }, []);

  /* SRS §3b — Generate Payment Advice from an approved claim. */
  const handleGenerateAdvice = useCallback((claimId: string) => {
    const advice = generatePaymentAdvice(claimId);
    if (!advice) {
      console.log('[Toast] Cannot generate advice — missing transaction/PO.');
      return;
    }
    setClaims((prev) => prev.map((c) =>
      c.id === claimId
        ? { ...c, status: 'advice-generated', paymentAdviceId: advice.id, adviceGeneratedAt: advice.generatedAt }
        : c,
    ));
    console.log(`[Toast] Payment Advice ${advice.id} generated.`);
  }, []);

  /* SRS §3b — Bulk: Generate Payment Advice for every currently-approved claim
     in one run. Each advice is still a distinct record per employee (not a
     consolidated advice), so downstream tracking stays per-claim. */
  const handleBulkGenerateAdvice = useCallback(() => {
    const approvedIds = opsClaims.filter((c) => c.status === 'approved').map((c) => c.id);
    if (approvedIds.length === 0) {
      console.log('[Toast] No approved claims to generate advice for.');
      return;
    }
    const generated: Array<{ claimId: string; adviceId: string; generatedAt: string }> = [];
    approvedIds.forEach((id) => {
      const advice = generatePaymentAdvice(id);
      if (advice) generated.push({ claimId: id, adviceId: advice.id, generatedAt: advice.generatedAt });
    });
    if (generated.length === 0) {
      console.log('[Toast] Nothing generated — missing Txn/PO on all approved claims.');
      return;
    }
    setClaims((prev) => prev.map((c) => {
      const match = generated.find((g) => g.claimId === c.id);
      if (!match) return c;
      return {
        ...c,
        status: 'advice-generated' as const,
        paymentAdviceId: match.adviceId,
        adviceGeneratedAt: match.generatedAt,
      };
    }));
    console.log(
      `[Toast] Generated ${generated.length} Payment Advice${generated.length > 1 ? 's' : ''} ` +
      `(skipped ${approvedIds.length - generated.length}).`,
    );
  }, [opsClaims]);

  /* SRS §3c — Post the Payment Advice to MCP (Cash Management queue). */
  const handlePostToMcp = useCallback((claimId: string) => {
    const claim = claims.find((c) => c.id === claimId);
    if (!claim?.paymentAdviceId) return;
    const updated = postAdviceToMcp(claim.paymentAdviceId);
    if (!updated) return;
    setClaims((prev) => prev.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: 'posted-to-mcp',
            mcpJournalEntryId: updated.mcpJournalEntryId,
            mcpPostedAt: updated.postedToMcpAt,
          }
        : c,
    ));
    console.log(`[Toast] Advice ${claim.paymentAdviceId} posted to MCP. Journal ${updated.mcpJournalEntryId}.`);
  }, [claims]);

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-amber-100 text-amber-700',
      verified: 'bg-sky-100 text-sky-700',
      approved: 'bg-green-100 text-green-700',
      'advice-generated': 'bg-indigo-100 text-indigo-700',
      'posted-to-mcp': 'bg-emerald-100 text-emerald-700',
      paid: 'bg-teal-100 text-teal-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  /* ─────────────────────────────────────────────────────────────────────── */
  /* Render */
  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            Travel Claim Processing
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
            SRS PRN 2.0 — Travel
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Manage travel advance requests, approvals, and payments for OPS employees
        </p>
      </div>

      <ModuleActorBanner moduleKey="ops-travel-claim" />

      {/* Persona Banner */}
      <div className={`rounded-xl border ${tone.bg} ${tone.border} ${tone.text} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="text-sm font-bold">
                {caps.isReadOnly ? "Read-Only User" : "Travel Claims Officer"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Travel Claim Processing Access</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Claims" value={stats.total} color="blue" />
        <SummaryCard label="Pending Approval" value={stats.pending} color="amber" />
        <SummaryCard
          label="Disbursed (Current Month)"
          value={`Nu.${Math.round(stats.disbursed).toLocaleString()}`}
          color="green"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Claims List
          </button>
          {!caps.isReadOnly && (
            <button
              onClick={() => setView('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                view === 'new'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              + New Claim
            </button>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-4">
          {/* Tabs for DDi 28-30 */}
          <div className="flex gap-2 border-b border-slate-200/50">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              All Claims
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'local'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Local Advances (DDi 28)
            </button>
            <button
              onClick={() => setActiveTab('foreign')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'foreign'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Foreign Advances (DDi 29)
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition ${
                activeTab === 'plans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Travel Plans (DDi 30)
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by Ref No, Employee, or Destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus || ''}
              onChange={(e) => setFilterStatus(e.target.value || null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="advice-generated">Advice Generated</option>
              <option value="posted-to-mcp">Posted to MCP</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Bulk actions — Generate Payment Advice for every approved claim */}
          {(() => {
            const approvedCount = opsClaims.filter((c) => c.status === 'approved').length;
            if (approvedCount === 0 || caps.isReadOnly) return null;
            return (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3">
                <div className="flex-1 text-sm">
                  <div className="font-bold text-indigo-900">
                    {approvedCount} approved claim{approvedCount > 1 ? 's' : ''} awaiting Payment Advice
                  </div>
                  <div className="text-xs text-indigo-700">
                    SRS §3b — generate a Payment Advice per employee in a single batch. Each claim keeps its
                    own advice record for audit.
                  </div>
                </div>
                <button
                  onClick={handleBulkGenerateAdvice}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Generate Advice for all {approvedCount} approved
                </button>
              </div>
            );
          })()}

          {/* Claims Table */}
          <div className="overflow-x-auto border border-slate-200/50 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Ref No</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Employee</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Position</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Type</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-900">Destination</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-900">Amount</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">TA Ref</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No travel claims found
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map(claim => (
                    <tr key={claim.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        {claim.refNo}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{claim.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{claim.positionTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          claim.travelType === 'domestic'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {claim.travelType === 'domestic' ? 'In-Country' : 'Foreign'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{claim.destination}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">
                        {claim.currency} {claim.amount.toLocaleString()}
                        {claim.currency !== 'BTN' && (
                          <span className="block text-xs text-slate-600">
                            ≈ Nu.{Math.round(claim.amount * (claim.exchangeRate || 1)).toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {claim.approvedTARefNo || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeColor(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                          >
                            View
                          </button>
                          {claim.status === 'approved' && caps.canApprove && (
                            <button
                              onClick={() => handleGenerateAdvice(claim.id)}
                              className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-200"
                            >
                              Gen. Advice
                            </button>
                          )}
                          {claim.status === 'advice-generated' && caps.canApprove && (
                            <button
                              onClick={() => handlePostToMcp(claim.id)}
                              className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-200"
                            >
                              Post to MCP
                            </button>
                          )}
                          {claim.status === 'posted-to-mcp' && caps.canApprove && (
                            <button
                              onClick={() => handlePayClaim(claim.id)}
                              className="rounded bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700 hover:bg-teal-200"
                            >
                              MCP Release
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW CLAIM VIEW */}
      {view === 'new' && !caps.isReadOnly && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Create New Travel Claim</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Data Source */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Data Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual Entry</option>
                <option value="edats">e-DATS Integration</option>
              </select>
            </div>

            {/* Fetch-from-e-DATS selector — populates the form with the
                approved request payload received from e-DATS (SRS §1). */}
            {formData.source === 'edats' && (
              <div className="md:col-span-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Approved Request from e-DATS
                </label>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <select
                    value={formData.approvedTARefNo}
                    onChange={(e) => {
                      if (e.target.value) handleFetchFromEdats(e.target.value);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-sky-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select an approved TA request…</option>
                    {availableEdatsRequests.length === 0 ? (
                      <option value="" disabled>
                        No pending approved requests available
                      </option>
                    ) : (
                      availableEdatsRequests.map((r) => (
                        <option key={r.refNo} value={r.refNo}>
                          {r.refNo} · {r.employeeName} · {r.travelType === 'foreign' ? 'Foreign' : 'In-Country'} · {r.destination} · {r.currency} {r.approvedAmount.toLocaleString()}
                        </option>
                      ))
                    )}
                  </select>
                  {formData.approvedTARefNo && formData.receivedFromEdatsDate && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      ✓ Fetched · {formData.receivedFromEdatsDate}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-600">
                  Selecting a request auto-populates employee, agency, budget code, purpose, dates, destination, amount, and currency — exactly as received from e-DATS. All fields remain editable for review before creating the claim.
                </p>
              </div>
            )}

            {/* Travel Type */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Travel Type</label>
              <select
                value={formData.travelType}
                onChange={(e) => setFormData({ ...formData, travelType: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="domestic">In-Country</option>
                <option value="foreign">Foreign Country</option>
              </select>
            </div>

            {/* Employee Search */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Employee</label>
              <select
                value={formData.employeeId}
                onChange={(e) => {
                  const empId = e.target.value;
                  const emp = getOpsEmployeeById(empId);
                  setFormData({
                    ...formData,
                    employeeId: empId,
                    positionTitle: emp?.positionTitle || '',
                    agencyName: emp?.workingAgency || '',
                    agencyCode: emp?.workingAgency || '',
                    cid: emp?.cid || '',
                  });
                }}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Employee...</option>
                {OPS_EMPLOYEES.slice(0, 10).map(emp => (
                  <option key={emp.masterEmpId} value={emp.masterEmpId}>
                    {emp.firstName} {emp.lastName} ({emp.eid})
                  </option>
                ))}
              </select>
            </div>

            {/* Position Title (auto-filled) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Position Title</label>
              <input
                type="text"
                value={formData.positionTitle}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Agency Name (auto-filled) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Agency Name</label>
              <input
                type="text"
                value={formData.agencyName}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* CID (auto-filled) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">CID</label>
              <input
                type="text"
                value={formData.cid}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Budget Code */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Budget Code</label>
              <input
                type="text"
                value={formData.budgetCode}
                onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
                placeholder="e.g., HE-01-001"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Purpose */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-900 mb-2">Travel Purpose</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Training Program"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Destination</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Bangkok, Thailand"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Country of Travel (for foreign only) */}
            {formData.travelType === 'foreign' && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Country of Travel</label>
                <input
                  type="text"
                  value={formData.countryOfTravel}
                  onChange={(e) => setFormData({ ...formData, countryOfTravel: e.target.value })}
                  placeholder="e.g., Thailand"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => {
                  const curr = e.target.value as any;
                  const rate = CURRENCIES.find(c => c.code === curr)?.rate || 1;
                  setFormData({ ...formData, currency: curr, exchangeRate: rate });
                }}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-900">
                  {formData.currency}
                </span>
              </div>
              {formData.currency !== 'BTN' && (
                <p className="text-xs text-slate-600 mt-1">
                  Exchange Rate: 1 {formData.currency} = Nu. {formData.exchangeRate}
                </p>
              )}
            </div>

            {/* Approved Advance Amount */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Approved Advance Amount</label>
              <input
                type="number"
                value={formData.approvedAdvanceAmount}
                onChange={(e) => setFormData({ ...formData, approvedAdvanceAmount: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* e-DATS TA Reference Number */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Approved TA Reference No. <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={formData.approvedTARefNo}
                onChange={(e) => setFormData({ ...formData, approvedTARefNo: e.target.value })}
                placeholder="e.g., TA-2026-00001"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date received from e-DATS (only relevant for e-DATS source) */}
            {formData.source === 'edats' && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Date Received from e-DATS</label>
                <input
                  type="date"
                  value={formData.receivedFromEdatsDate}
                  onChange={(e) => setFormData({ ...formData, receivedFromEdatsDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Payment Mode (bank / cash) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentOrderMode })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash Collection</option>
              </select>
            </div>

            {/* Cash collector fields (only for cash) */}
            {formData.paymentMode === 'cash' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Authorized Collector Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cashCollectorName}
                    onChange={(e) => setFormData({ ...formData, cashCollectorName: e.target.value })}
                    placeholder="Full name of authorized collector"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Collector CID</label>
                  <input
                    type="text"
                    value={formData.cashCollectorCid}
                    onChange={(e) => setFormData({ ...formData, cashCollectorCid: e.target.value })}
                    placeholder="11-digit CID"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Relationship to Employee</label>
                  <input
                    type="text"
                    value={formData.cashCollectorRelationship}
                    onChange={(e) => setFormData({ ...formData, cashCollectorRelationship: e.target.value })}
                    placeholder="e.g., Self, Spouse, Colleague"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Foreign travel — bank charges + FX conversion charges */}
            {formData.travelType === 'foreign' && (
              <>
                <div className="md:col-span-2 mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Foreign travel — additional charges (SRS §3)
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Bank Charges (Nu.)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.bankCharges}
                    onChange={(e) => setFormData({ ...formData, bankCharges: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Bank Charges Budget Code</label>
                  <input
                    type="text"
                    value={formData.bankChargesBudgetCode}
                    onChange={(e) => setFormData({ ...formData, bankChargesBudgetCode: e.target.value })}
                    placeholder="e.g., HE-BC-001"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Currency Conversion Charges (Nu.)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.fxConversionCharges}
                    onChange={(e) => setFormData({ ...formData, fxConversionCharges: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">FX Charges Budget Code</label>
                  <input
                    type="text"
                    value={formData.fxChargesBudgetCode}
                    onChange={(e) => setFormData({ ...formData, fxChargesBudgetCode: e.target.value })}
                    placeholder="e.g., HE-FX-001"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Validation Panel — live SRS §2 matrix */}
          <div className="border border-slate-200/50 rounded-lg p-4 bg-slate-50/50 space-y-2">
            <p className="text-sm font-bold text-slate-900">Validation Checks (SRS §2)</p>
            <div className="space-y-1 text-sm">
              {([
                ['employee', 'Employee ID & Organization ID accuracy'],
                ['budget', 'Available budget for applicable budget code'],
                ['duplicate', 'No duplicate Approved TA reference number'],
              ] as const).map(([key, label]) => {
                const result = validationChecks[key];
                const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✕' : '○';
                const cls =
                  result.status === 'pass' ? 'text-green-600'
                  : result.status === 'fail' ? 'text-rose-600'
                  : 'text-slate-400';
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span className={`${cls} font-bold`}>{icon}</span>
                    <div>
                      <div className="text-slate-800 font-medium">{label}</div>
                      <div className="text-xs text-slate-500">{result.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setView('list')}
              className="px-6 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateClaim}
              disabled={!allValidationsPass}
              className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Create Claim
            </button>
          </div>
        </div>
      )}

      {/* DETAIL PANEL */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedClaim.refNo}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedClaim.employeeName}
                </p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold transition"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Employee Information Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Name</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Position</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.positionTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">CID</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.cid}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Agency</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.agencyName} ({selectedClaim.agencyCode})</p>
                  </div>
                </div>
              </div>

              {/* Travel Details Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Travel Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Type</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.travelType === 'domestic' ? 'In-Country' : 'Foreign'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Destination</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.destination}</p>
                  </div>
                  {selectedClaim.countryOfTravel && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">Country</p>
                      <p className="text-slate-900 mt-1">{selectedClaim.countryOfTravel}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Purpose</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.travelPurpose}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Start Date</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.startDate}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">End Date</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.endDate}</p>
                  </div>
                </div>
              </div>

              {/* Financial Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Financial Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Budget Code</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.budgetCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Claim Amount</p>
                    <p className="text-slate-900 mt-1 font-mono">
                      {selectedClaim.currency} {selectedClaim.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Approved Advance</p>
                    <p className="text-slate-900 mt-1 font-mono">
                      {selectedClaim.currency} {selectedClaim.approvedAdvanceAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Currency</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.currency}</p>
                  </div>
                  {selectedClaim.exchangeRate && selectedClaim.currency !== 'BTN' && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">Exchange Rate</p>
                      <p className="text-slate-900 mt-1">1 {selectedClaim.currency} = Nu. {selectedClaim.exchangeRate}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* References Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">References & Approval</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">e-DATS TA Ref</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.approvedTARefNo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">IFMIS Payment Ref</p>
                    <p className="text-slate-900 mt-1 font-mono">{selectedClaim.paymentTransactionRef || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Approval Date</p>
                    <p className="text-slate-900 mt-1">{selectedClaim.dateOfApproval || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Validation Control snapshot (SRS §2) */}
              {selectedClaim.validationResults && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Validation Control (SRS §2)
                  </h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1.5 text-sm">
                    {([
                      ['employee', 'Employee ID & Organization ID accuracy'],
                      ['budget', 'Available budget for applicable budget code'],
                      ['duplicate', 'No duplicate Approved TA reference number'],
                    ] as const).map(([key, label]) => {
                      const r = selectedClaim.validationResults![key];
                      const cls = r.status === 'pass' ? 'text-green-600' : 'text-rose-600';
                      const icon = r.status === 'pass' ? '✓' : '✕';
                      return (
                        <div key={key} className="flex items-start gap-2">
                          <span className={`${cls} font-bold`}>{icon}</span>
                          <div>
                            <div className="text-slate-800 font-medium">{label}</div>
                            <div className="text-xs text-slate-500">{r.message}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Advice (SRS §3b) — once generated */}
              {selectedClaim.paymentAdviceId && (() => {
                const advice = advices.find((a) => a.id === selectedClaim.paymentAdviceId);
                if (!advice) return null;
                return (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Payment Advice (SRS §3b)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Advice ID</p>
                        <p className="text-slate-900 mt-1 font-mono">{advice.id}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Status</p>
                        <p className="text-slate-900 mt-1 capitalize">{advice.status.replace(/-/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Generated</p>
                        <p className="text-slate-900 mt-1">{new Date(advice.generatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Total Advice Amount</p>
                        <p className="text-slate-900 mt-1 font-mono font-bold">
                          {advice.currency === 'BTN' ? 'Nu.' : advice.currency} {advice.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAdvicePreview(advice)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        📄 Preview Advice
                      </button>
                      {selectedClaim.status === 'advice-generated' && caps.canApprove && (
                        <button
                          onClick={() => handlePostToMcp(selectedClaim.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                        >
                          Post to MCP
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* MCP Posting (SRS §3c) — once posted */}
              {selectedClaim.mcpJournalEntryId && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    MCP Posting (SRS §3c)
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">MCP Journal Entry</p>
                      <p className="text-slate-900 mt-1 font-mono">{selectedClaim.mcpJournalEntryId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">Posted At</p>
                      <p className="text-slate-900 mt-1">
                        {selectedClaim.mcpPostedAt
                          ? new Date(selectedClaim.mcpPostedAt).toLocaleString()
                          : '—'}
                      </p>
                    </div>
                    <div className="col-span-2 text-xs text-slate-600">
                      Claim queued in the Cash Management release pipeline. Use "MCP Release" to simulate the
                      payment release and trigger the e-DATS post-back (SRS §4).
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Order (only once approved) */}
              {selectedClaim.paymentOrderId && (() => {
                const order = orders.find((o) => o.id === selectedClaim.paymentOrderId);
                if (!order) return null;
                return (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Payment Order (SRS §3)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-emerald-50/50 border border-emerald-200 rounded-lg p-4">
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">PO ID</p>
                        <p className="text-slate-900 mt-1 font-mono">{order.id}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">PO Status</p>
                        <p className="text-slate-900 mt-1 capitalize">{order.status.replace(/-/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Mode</p>
                        <p className="text-slate-900 mt-1 capitalize">{order.mode}</p>
                      </div>
                      {order.mode === 'bank' && (
                        <>
                          <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">Bank</p>
                            <p className="text-slate-900 mt-1">{order.bankName ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">Account No.</p>
                            <p className="text-slate-900 mt-1 font-mono">{order.bankAccountNumber ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">Branch</p>
                            <p className="text-slate-900 mt-1">{order.bankBranch ?? '—'}</p>
                          </div>
                        </>
                      )}
                      {order.mode === 'cash' && (
                        <>
                          <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">Collector</p>
                            <p className="text-slate-900 mt-1">{order.cashCollectorName ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">Collector CID</p>
                            <p className="text-slate-900 mt-1 font-mono">{order.cashCollectorCid ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">Relationship</p>
                            <p className="text-slate-900 mt-1">{order.cashCollectorRelationship ?? '—'}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-600 uppercase">Advance</p>
                        <p className="text-slate-900 mt-1 font-mono">{order.currency} {order.advanceAmount.toLocaleString()}</p>
                      </div>
                      {order.bankCharges != null && order.bankCharges > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">Bank Charges</p>
                          <p className="text-slate-900 mt-1 font-mono">Nu. {order.bankCharges.toLocaleString()}</p>
                        </div>
                      )}
                      {order.fxConversionCharges != null && order.fxConversionCharges > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 uppercase">FX Conversion</p>
                          <p className="text-slate-900 mt-1 font-mono">Nu. {order.fxConversionCharges.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="col-span-2 border-t border-emerald-200 pt-2">
                        <p className="text-xs font-bold text-slate-600 uppercase">Total</p>
                        <p className="text-slate-900 mt-1 font-mono text-base font-bold">
                          {order.currency === 'BTN' ? 'Nu.' : order.currency} {order.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPoPreview(order)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        📄 Preview PO
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintPo(order)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        🖨️ Print
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendPoToBank(order)}
                        disabled={order.mode !== 'bank' || order.status === 'sent-to-bank' || order.status === 'settled'}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        🏦 Send to Bank
                      </button>
                      {selectedClaim.travelType === 'foreign' && (
                        <button
                          type="button"
                          onClick={() => handleEmployeeCopyPo(order)}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
                        >
                          🌐 Employee Copy (Foreign)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* e-DATS Post-Back (SRS §4) — visible once payment processed / rejected */}
              {(() => {
                const dispatch = edatsDispatches.find((d) => d.claimId === selectedClaim.id);
                if (!dispatch) return null;
                const tone =
                  dispatch.status === 'dispatched' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : dispatch.status === 'failed'    ? 'bg-rose-50 border-rose-200 text-rose-800'
                                                    : 'bg-amber-50 border-amber-200 text-amber-800';
                return (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      e-DATS Post-Back (SRS §4)
                    </h3>
                    <div className={`rounded-lg border px-4 py-3 text-sm ${tone}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold uppercase tracking-widest text-[10px]">{dispatch.status}</span>
                          <span className="ml-2 font-mono text-xs">{dispatch.paymentTransactionRef}</span>
                        </div>
                        <div className="text-xs">
                          {dispatch.dispatchedAt
                            ? `sent ${new Date(dispatch.dispatchedAt).toLocaleTimeString()}`
                            : `queued ${new Date(dispatch.enqueuedAt).toLocaleTimeString()}`}
                        </div>
                      </div>
                      <div className="mt-1 text-xs">
                        Status sent: <span className="font-semibold">{dispatch.transactionStatus}</span> ·
                        Date: {dispatch.dateOfPayment} ·
                        Amount: {dispatch.currency} {dispatch.amountPaid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Status Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50/50 rounded-lg p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Claim Status</p>
                    <p className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeColor(selectedClaim.status)}`}>
                      {selectedClaim.status}
                    </p>
                  </div>
                  {selectedClaim.advanceStatus && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase">Advance Status</p>
                      <p className="text-slate-900 mt-1">{selectedClaim.advanceStatus}</p>
                    </div>
                  )}
                  {selectedClaim.rejectedReason && (
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-rose-700 uppercase">Rejection Reason</p>
                      <p className="text-rose-900 mt-1">{selectedClaim.rejectedReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {!caps.isReadOnly && (
              <div className="border-t border-slate-200/80 bg-slate-50 px-6 py-4 flex gap-3 flex-wrap">
                {selectedClaim.status === 'draft' && (
                  <button
                    onClick={() => {
                      handleSubmitClaim(selectedClaim.id);
                      setSelectedClaim(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition"
                  >
                    Submit for Verification
                  </button>
                )}
                {(selectedClaim.status === 'verified' || selectedClaim.status === 'submitted') && caps.canApprove && (
                  <button
                    onClick={() => {
                      handleApproveClaim(selectedClaim.id);
                      setSelectedClaim(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
                  >
                    Approve & Generate PO
                  </button>
                )}
                {selectedClaim.status === 'approved' && caps.canApprove && (
                  <>
                    <button
                      onClick={() => {
                        handleGenerateAdvice(selectedClaim.id);
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition"
                    >
                      Generate Payment Advice
                    </button>
                    <button
                      onClick={() => {
                        setRejectClaimId(selectedClaim.id);
                        setSelectedClaim(null);
                      }}
                      className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedClaim.status === 'advice-generated' && caps.canApprove && (
                  <button
                    onClick={() => { handlePostToMcp(selectedClaim.id); }}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition"
                  >
                    Post to MCP
                  </button>
                )}
                {selectedClaim.status === 'posted-to-mcp' && caps.canApprove && (
                  <button
                    onClick={() => { handlePayClaim(selectedClaim.id); setSelectedClaim(null); }}
                    className="flex-1 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition"
                  >
                    MCP Release & Pay
                  </button>
                )}
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-900 text-sm font-medium transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PO Preview Modal (SRS §3 — printable payment order) */}
      {poPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:backdrop-blur-none print:p-0">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl print:max-h-none print:shadow-none print:border-0">
            {/* PO document */}
            <div className="p-8 print:p-12">
              <div className="border-b-2 border-slate-900 pb-4 mb-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                      Royal Government of Bhutan · IFMIS
                    </div>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Payment Order</h2>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                      Travel Advance — {selectedClaim?.travelType === 'foreign' ? 'Foreign' : 'In-Country'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <p><span className="font-bold">PO ID:</span> <span className="font-mono">{poPreview.id}</span></p>
                    <p><span className="font-bold">Txn Ref:</span> <span className="font-mono">{poPreview.transactionId}</span></p>
                    <p><span className="font-bold">Generated:</span> {new Date(poPreview.generatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payee</div>
                  <div className="mt-1 font-semibold text-slate-900">{poPreview.employeeName}</div>
                  <div className="text-xs text-slate-600 font-mono">CID: {poPreview.employeeCid}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment Mode</div>
                  <div className="mt-1 font-semibold text-slate-900 capitalize">{poPreview.mode === 'bank' ? 'Bank Transfer' : 'Cash Collection'}</div>
                </div>
                {poPreview.mode === 'bank' && (
                  <>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bank</div>
                      <div className="mt-1 font-semibold text-slate-900">{poPreview.bankName ?? '—'}</div>
                      <div className="text-xs text-slate-600">{poPreview.bankBranch ?? ''}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Account No.</div>
                      <div className="mt-1 font-mono text-slate-900">{poPreview.bankAccountNumber ?? '—'}</div>
                    </div>
                  </>
                )}
                {poPreview.mode === 'cash' && (
                  <>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Authorized Collector</div>
                      <div className="mt-1 font-semibold text-slate-900">{poPreview.cashCollectorName ?? '—'}</div>
                      <div className="text-xs text-slate-600">CID: {poPreview.cashCollectorCid ?? '—'} · {poPreview.cashCollectorRelationship ?? ''}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Collection Point</div>
                      <div className="mt-1 text-slate-900">Agency Cashier Window</div>
                    </div>
                  </>
                )}
              </div>

              <table className="w-full border border-slate-300 text-sm mb-6">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border border-slate-300 px-3 py-2 font-bold text-slate-700">Particular</th>
                    <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700">Amount ({poPreview.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2">Approved Travel Advance</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono">{poPreview.advanceAmount.toLocaleString()}</td>
                  </tr>
                  {poPreview.bankCharges != null && poPreview.bankCharges > 0 && (
                    <tr>
                      <td className="border border-slate-300 px-3 py-2">Bank Charges</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono">{poPreview.bankCharges.toLocaleString()}</td>
                    </tr>
                  )}
                  {poPreview.fxConversionCharges != null && poPreview.fxConversionCharges > 0 && (
                    <tr>
                      <td className="border border-slate-300 px-3 py-2">Currency Conversion Charges</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono">{poPreview.fxConversionCharges.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 px-3 py-2">Total</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono">{poPreview.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-10 pt-10 text-xs text-slate-700">
                <div>
                  <div className="border-t border-slate-400 pt-1 text-center">
                    Prepared By
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 text-center">
                    Authorized Signatory
                  </div>
                </div>
              </div>

              <p className="mt-8 text-[10px] text-slate-500 italic print:hidden">
                Electronically generated payment order. Carry a printed copy with valid ID when collecting foreign currency from the bank.
              </p>
            </div>

            {/* PO modal actions (hidden on print) */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap gap-2 print:hidden">
              <button
                onClick={() => handlePrintPo(poPreview)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => {
                  markOrderStatus(poPreview.id, 'employee-copy');
                  window.alert(`Download queued for ${poPreview.id}. (Real PDF export wires in with the document service.)`);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              >
                📄 Download PDF
              </button>
              {poPreview.mode === 'bank' && poPreview.status !== 'sent-to-bank' && poPreview.status !== 'settled' && (
                <button
                  onClick={() => handleSendPoToBank(poPreview)}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700"
                >
                  🏦 Send to Bank
                </button>
              )}
              <button
                onClick={() => setPoPreview(null)}
                className="ml-auto px-3 py-1.5 rounded-lg bg-slate-200 text-slate-900 text-xs font-semibold hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Advice Preview Modal (SRS §3b) */}
      {advicePreview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:backdrop-blur-none print:p-0">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl print:max-h-none print:shadow-none print:border-0">
            <div className="p-8 print:p-12">
              <div className="border-b-2 border-indigo-700 pb-4 mb-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                      Royal Government of Bhutan · IFMIS
                    </div>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Payment Advice</h2>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                      Travel Advance — {advicePreview.travelType === 'foreign' ? 'Foreign' : 'In-Country'}
                      {' · To Cash Management (MCP)'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <p><span className="font-bold">Advice ID:</span> <span className="font-mono">{advicePreview.id}</span></p>
                    <p><span className="font-bold">Txn:</span> <span className="font-mono">{advicePreview.transactionId}</span></p>
                    <p><span className="font-bold">PO:</span> <span className="font-mono">{advicePreview.paymentOrderId}</span></p>
                    <p><span className="font-bold">TA Ref:</span> <span className="font-mono">{advicePreview.approvedTARefNo}</span></p>
                    {advicePreview.mcpJournalEntryId && (
                      <p><span className="font-bold">MCP Journal:</span> <span className="font-mono">{advicePreview.mcpJournalEntryId}</span></p>
                    )}
                    <p><span className="font-bold">Generated:</span> {new Date(advicePreview.generatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payee</div>
                  <div className="mt-1 font-semibold text-slate-900">{advicePreview.employeeName}</div>
                  <div className="text-xs text-slate-600 font-mono">CID: {advicePreview.employeeCid}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agency / Budget</div>
                  <div className="mt-1 text-slate-900 font-mono">{advicePreview.agencyCode}</div>
                  <div className="text-xs text-slate-600 font-mono">{advicePreview.budgetCode}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment Mode</div>
                  <div className="mt-1 text-slate-900 capitalize">{advicePreview.paymentMode}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Destination Account</div>
                  {advicePreview.paymentMode === 'bank' ? (
                    <>
                      <div className="mt-1 text-slate-900">{advicePreview.bankName ?? '—'}</div>
                      <div className="text-xs text-slate-600 font-mono">{advicePreview.bankAccountNumber ?? '—'}</div>
                    </>
                  ) : (
                    <>
                      <div className="mt-1 text-slate-900">Cash · {advicePreview.cashCollectorName ?? '—'}</div>
                      <div className="text-xs text-slate-600 font-mono">CID: {advicePreview.cashCollectorCid ?? '—'}</div>
                    </>
                  )}
                </div>
              </div>

              <table className="w-full border border-slate-300 text-sm mb-6">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border border-slate-300 px-3 py-2 font-bold text-slate-700">Particular</th>
                    <th className="border border-slate-300 px-3 py-2 text-right font-bold text-slate-700">Amount ({advicePreview.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2">Approved Travel Advance</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advicePreview.advanceAmount.toLocaleString()}</td>
                  </tr>
                  {advicePreview.bankCharges != null && advicePreview.bankCharges > 0 && (
                    <tr>
                      <td className="border border-slate-300 px-3 py-2">Bank Charges</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advicePreview.bankCharges.toLocaleString()}</td>
                    </tr>
                  )}
                  {advicePreview.fxConversionCharges != null && advicePreview.fxConversionCharges > 0 && (
                    <tr>
                      <td className="border border-slate-300 px-3 py-2">Currency Conversion Charges</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advicePreview.fxConversionCharges.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 px-3 py-2">Total Advice</td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-mono">{advicePreview.totalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-10 pt-8 text-xs text-slate-700">
                <div>
                  <div className="border-t border-slate-400 pt-1 text-center">Prepared By</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 text-center">Cash Management Authoriser (MCP)</div>
                </div>
              </div>

              <p className="mt-6 text-[10px] text-slate-500 italic print:hidden">
                Payment Advice sent to Cash Management (MCP) for release authorisation.
              </p>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => window.alert(`Download queued for ${advicePreview.id}. (Real PDF export wires in with the document service.)`)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              >
                📄 Download PDF
              </button>
              {advicePreview.status === 'ready' && (
                <button
                  onClick={() => { handlePostToMcp(advicePreview.claimId); setAdvicePreview(null); }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                >
                  Post to MCP
                </button>
              )}
              <button
                onClick={() => setAdvicePreview(null)}
                className="ml-auto px-3 py-1.5 rounded-lg bg-slate-200 text-slate-900 text-xs font-semibold hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal — feeds SRS §4 post-back with reason */}
      {rejectClaimId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Reject Travel Claim</h3>
            <p className="mt-1 text-sm text-slate-600">
              Provide a reason. This will be posted back to e-DATS along with the rejection status.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Budget exhausted for FY; ref to resubmit next quarter."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectClaimId(null); setRejectReason(''); }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-900 text-sm font-semibold hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectClaim}
                disabled={!rejectReason.trim()}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reject & Post to e-DATS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SRS Reference Footer */}
      <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
        <p>
          SRS Reference: Payroll SRS v1.1, PRN 2.0 — Travel Claim Processing
        </p>
        <p className="mt-1">
          Covers Travel Advance Requests, e-DATS Integration, Foreign Currency Conversion, Payment Order Generation
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Helper Components
   ─────────────────────────────────────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "blue" | "amber" | "green";
}) {
  const colorClasses = {
    blue: "border-blue-200/50 bg-blue-50/50 text-blue-900",
    amber: "border-amber-200/50 bg-amber-50/50 text-amber-900",
    green: "border-green-200/50 bg-green-50/50 text-green-900",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
