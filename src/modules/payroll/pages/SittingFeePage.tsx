'use client';

import React, { useMemo } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { resolveAgencyContext } from '../../../shared/data/agencyPersonas';
import { getValidBankNames } from '../../../shared/utils/bankValidation';
import {
  usePayrollRoleCapabilities,
  payrollToneClasses,
} from '../state/usePayrollRoleCapabilities';
import { useSittingFeeState } from '../sitting-fee/useSittingFeeState';
import { StepIndicator } from '../sitting-fee/StepIndicator';
import { BeneficiaryForm } from '../sitting-fee/BeneficiaryForm';
import { SummaryStats } from '../sitting-fee/SummaryStats';
import {
  CARD_CLASSES,
  TABLE_CELL_CLASSES,
  TABLE_HEADER_CLASSES,
  TABLE_ROW_CLASSES,
  INPUT_CLASSES,
  INPUT_SMALL_CLASSES,
  INPUT_MEDIUM_CLASSES,
  BUTTON_PRIMARY_CLASSES,
  BUTTON_SECONDARY_CLASSES,
  BUTTON_DISABLED_CLASSES,
  CATEGORY_BADGE_CLASSES,
  CATEGORY_LABELS,
  STATUS_BADGE_CLASSES,
} from '../sitting-fee/constants';

/**
 * SittingFeePage — Sitting Fee & Honorarium Processing (PRN 8.1)
 *
 * 7-step workflow orchestrator that manages the entire sitting fee process:
 * 1. Onboard Beneficiaries — List existing beneficiaries, add new ones
 * 2. Transaction Entry — Enter days attended, compute amounts
 * 3. Pre-Generation Checks — System validation
 * 4. Draft Pay Bill — Generate payment table with TDS
 * 5. Approve — Approval section with digital signature
 * 6. Finance Review — Finance officer review with budget validation
 * 7. Payment Processing — Final payment posting
 */
export function SittingFeePage() {
  const auth = useAuth();
  const ctx = resolveAgencyContext(auth.activeAgencyCode);
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);

  const state = useSittingFeeState(ctx);
  const bankNames = useMemo(() => getValidBankNames(), []);

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Step 1: Onboard Beneficiaries                                           */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (state.currentStep === 'onboard') {
    return (
      <div className="p-6">
        <StepIndicator currentStep={state.currentStep} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Sitting Fee & Honorarium — Beneficiary Onboarding
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            PRN 8.1 — Manage sitting fee and honorarium beneficiaries
          </p>
        </div>

        {/* Persona Banner */}
        <div className={`rounded-xl border ${tone.border} ${tone.bg} p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                <span className={`text-sm font-bold ${tone.text}`}>
                  {caps.activeRoleName}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {caps.personaTagline}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {caps.capabilityList.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.pill}`}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card: Existing Beneficiaries */}
        <div className={CARD_CLASSES}>
          {/* Category Tabs */}
          <div className="flex gap-2 mb-6">
            {['all', 'sitting-fee', 'honorarium'].map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  state.setCategoryFilter(
                    cat as 'all' | 'sitting-fee' | 'honorarium'
                  )
                }
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  state.categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Beneficiaries Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEADER_CLASSES}>
                <th className={TABLE_CELL_CLASSES}>Name</th>
                <th className={TABLE_CELL_CLASSES}>CID</th>
                <th className={TABLE_CELL_CLASSES}>TPN</th>
                <th className={TABLE_CELL_CLASSES}>Category</th>
                <th className={TABLE_CELL_CLASSES}>Rate/Day</th>
                <th className={TABLE_CELL_CLASSES}>Bank</th>
                <th className={TABLE_CELL_CLASSES}>Account No.</th>
                <th className={TABLE_CELL_CLASSES}>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.filteredBeneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id} className={TABLE_ROW_CLASSES}>
                  <td className={TABLE_CELL_CLASSES}>{beneficiary.name}</td>
                  <td className={`${TABLE_CELL_CLASSES} font-mono`}>
                    {beneficiary.cid}
                  </td>
                  <td className={`${TABLE_CELL_CLASSES} font-mono`}>
                    {beneficiary.tpn}
                  </td>
                  <td className={TABLE_CELL_CLASSES}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        CATEGORY_BADGE_CLASSES[beneficiary.category]
                      }`}
                    >
                      {CATEGORY_LABELS[beneficiary.category]}
                    </span>
                  </td>
                  <td className={TABLE_CELL_CLASSES}>
                    Nu.{beneficiary.ratePerDay.toLocaleString()}
                  </td>
                  <td className={TABLE_CELL_CLASSES}>
                    {beneficiary.bankName}
                  </td>
                  <td className={`${TABLE_CELL_CLASSES} font-mono text-xs`}>
                    {beneficiary.bankAccountNo}
                  </td>
                  <td className={TABLE_CELL_CLASSES}>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        STATUS_BADGE_CLASSES[
                          beneficiary.status as keyof typeof STATUS_BADGE_CLASSES
                        ]
                      }`}
                    >
                      {beneficiary.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {state.filteredBeneficiaries.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">
              No beneficiaries found in this category.
            </div>
          )}
        </div>

        {/* Card: Add Beneficiary Form */}
        <div className={`${CARD_CLASSES} mt-6`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">
              Add New Beneficiary
            </h3>
            <button
              onClick={() => state.setShowAddForm(!state.showAddForm)}
              disabled={!caps.canProcessSitting}
              className={
                state.showAddForm
                  ? BUTTON_SECONDARY_CLASSES
                  : caps.canProcessSitting
                  ? BUTTON_PRIMARY_CLASSES
                  : BUTTON_DISABLED_CLASSES
              }
            >
              {state.showAddForm ? 'Cancel' : '+ Add Beneficiary'}
            </button>
          </div>

          <BeneficiaryForm
            state={state}
            canProcessSitting={caps.canProcessSitting}
            bankNames={bankNames}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button className={BUTTON_SECONDARY_CLASSES} disabled>
            Back
          </button>
          <button
            onClick={() => state.setCurrentStep('transaction')}
            disabled={!caps.canProcessSitting}
            className={
              caps.canProcessSitting
                ? BUTTON_PRIMARY_CLASSES
                : BUTTON_DISABLED_CLASSES
            }
          >
            Next: Transaction Entry →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Step 2: Transaction Entry                                               */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (state.currentStep === 'transaction') {
    return (
      <div className="p-6">
        <StepIndicator currentStep={state.currentStep} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Transaction Entry — Days & Events Attended
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Enter number of days/sessions attended per beneficiary. Amounts will
            be computed in real-time.
          </p>
        </div>

        {/* Card: Transaction Entry */}
        <div className={CARD_CLASSES}>
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEADER_CLASSES}>
                <th className={TABLE_CELL_CLASSES}>Beneficiary</th>
                <th className={TABLE_CELL_CLASSES}>Category</th>
                <th className={TABLE_CELL_CLASSES}>Days/Sessions</th>
                <th className={TABLE_CELL_CLASSES}>Event/Meeting Name</th>
                <th className={TABLE_CELL_CLASSES}>Date Range</th>
                <th className={TABLE_CELL_CLASSES}>Rate/Day</th>
                <th className={TABLE_CELL_CLASSES}>Gross Amount</th>
              </tr>
            </thead>
            <tbody>
              {state.activeBeneficiaries.map((beneficiary) => {
                const tx = state.transactions[beneficiary.id] || {
                  days: 0,
                  eventName: '',
                  dateRange: '',
                };
                const grossAmount = beneficiary.ratePerDay * tx.days;

                return (
                  <tr key={beneficiary.id} className={TABLE_ROW_CLASSES}>
                    <td className={TABLE_CELL_CLASSES}>
                      <div className="font-semibold">{beneficiary.name}</div>
                      <div className="text-xs text-slate-400">
                        {beneficiary.cid}
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASSES}>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          CATEGORY_BADGE_CLASSES[beneficiary.category]
                        }`}
                      >
                        {CATEGORY_LABELS[beneficiary.category]}
                      </span>
                    </td>
                    <td className={TABLE_CELL_CLASSES}>
                      <input
                        type="number"
                        value={tx.days}
                        onChange={(e) =>
                          state.handleTransactionChange(
                            beneficiary.id,
                            'days',
                            e.target.value
                          )
                        }
                        min="0"
                        className={INPUT_SMALL_CLASSES}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASSES}>
                      <input
                        type="text"
                        value={tx.eventName}
                        onChange={(e) =>
                          state.handleTransactionChange(
                            beneficiary.id,
                            'eventName',
                            e.target.value
                          )
                        }
                        placeholder="Meeting/Event name"
                        className={INPUT_MEDIUM_CLASSES}
                      />
                    </td>
                    <td className={TABLE_CELL_CLASSES}>
                      <input
                        type="text"
                        value={tx.dateRange}
                        onChange={(e) =>
                          state.handleTransactionChange(
                            beneficiary.id,
                            'dateRange',
                            e.target.value
                          )
                        }
                        placeholder="01-04-2026 to 30-04-2026"
                        className={INPUT_MEDIUM_CLASSES}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      Nu.{beneficiary.ratePerDay.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-semibold text-blue-600">
                      Nu.{grossAmount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <SummaryStats summary={state.transactionSummary} />

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => state.setCurrentStep('onboard')}
            className={BUTTON_SECONDARY_CLASSES}
          >
            ← Back
          </button>
          <button
            onClick={() => state.setCurrentStep('checks')}
            disabled={!caps.canProcessSitting}
            className={
              caps.canProcessSitting
                ? BUTTON_PRIMARY_CLASSES
                : BUTTON_DISABLED_CLASSES
            }
          >
            Next: Pre-Generation Checks →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Step 3: Pre-Generation Checks                                           */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (state.currentStep === 'checks') {
    return (
      <div className="p-6">
        <StepIndicator currentStep={state.currentStep} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Pre-Generation Checks — System Validation
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Verify all prerequisites before payment generation
          </p>
        </div>

        {/* Card: Validation Checklist */}
        <div className={CARD_CLASSES}>
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Validation Checklist
          </h3>

          <div className="space-y-3">
            {/* TPN Validity */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg ${
                state.validationChecks.allTPNsValid
                  ? 'bg-green-50'
                  : 'bg-red-50'
              }`}
            >
              <span className="text-xl">
                {state.validationChecks.allTPNsValid ? '✓' : '✗'}
              </span>
              <div>
                <div className="font-semibold text-slate-900">
                  TPN Validity
                </div>
                <div className="text-xs text-slate-500">
                  {state.validationChecks.allTPNsValid
                    ? 'All TPNs are valid (TPN-xxxx format)'
                    : 'Some TPNs are invalid'}
                </div>
              </div>
            </div>

            {/* Budget Availability */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg ${
                state.validationChecks.budgetAvailable
                  ? 'bg-green-50'
                  : 'bg-red-50'
              }`}
            >
              <span className="text-xl">
                {state.validationChecks.budgetAvailable ? '✓' : '✗'}
              </span>
              <div>
                <div className="font-semibold text-slate-900">
                  Budget Availability
                </div>
                <div className="text-xs text-slate-500">
                  {state.validationChecks.budgetAvailable
                    ? 'Sufficient budget available'
                    : 'Insufficient budget'}
                </div>
              </div>
            </div>

            {/* Bank Account Verification */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg ${
                state.validationChecks.bankAccountsVerified
                  ? 'bg-green-50'
                  : 'bg-red-50'
              }`}
            >
              <span className="text-xl">
                {state.validationChecks.bankAccountsVerified ? '✓' : '✗'}
              </span>
              <div>
                <div className="font-semibold text-slate-900">
                  Bank Account Verification
                </div>
                <div className="text-xs text-slate-500">
                  {state.validationChecks.bankAccountsVerified
                    ? 'All bank accounts verified'
                    : 'Some bank accounts not verified'}
                </div>
              </div>
            </div>

            {/* Duplicate Payment Check */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg ${
                state.validationChecks.noDuplicatePayments
                  ? 'bg-green-50'
                  : 'bg-red-50'
              }`}
            >
              <span className="text-xl">
                {state.validationChecks.noDuplicatePayments ? '✓' : '✗'}
              </span>
              <div>
                <div className="font-semibold text-slate-900">
                  Duplicate Payment Check
                </div>
                <div className="text-xs text-slate-500">
                  {state.validationChecks.noDuplicatePayments
                    ? 'No duplicate payments detected'
                    : 'Duplicate payments found'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => state.setCurrentStep('transaction')}
            className={BUTTON_SECONDARY_CLASSES}
          >
            ← Back
          </button>
          <button
            onClick={() => state.setCurrentStep('draft')}
            disabled={
              !Object.values(state.validationChecks).every((v) => v) ||
              !caps.canProcessSitting
            }
            className={
              Object.values(state.validationChecks).every((v) => v) &&
              caps.canProcessSitting
                ? BUTTON_PRIMARY_CLASSES
                : BUTTON_DISABLED_CLASSES
            }
          >
            Next: Draft Pay Bill →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Step 4: Draft Pay Bill                                                  */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (state.currentStep === 'draft') {
    return (
      <div className="p-6">
        <StepIndicator currentStep={state.currentStep} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Draft Pay Bill — Payment Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Generated payment table with TDS calculations and UCoA code mappings
          </p>
        </div>

        {/* Card: Pay Bill */}
        <div className={CARD_CLASSES}>
          <table className="w-full text-sm">
            <thead>
              <tr className={TABLE_HEADER_CLASSES}>
                <th className={TABLE_CELL_CLASSES}>Beneficiary</th>
                <th className={TABLE_CELL_CLASSES}>CID</th>
                <th className={TABLE_CELL_CLASSES}>TPN</th>
                <th className={TABLE_CELL_CLASSES}>Category</th>
                <th className={TABLE_CELL_CLASSES}>Days</th>
                <th className={TABLE_CELL_CLASSES}>Rate/Day</th>
                <th className={TABLE_CELL_CLASSES}>Gross Amount</th>
                <th className={TABLE_CELL_CLASSES}>TDS (10%)</th>
                <th className={TABLE_CELL_CLASSES}>Net Payable</th>
                <th className={TABLE_CELL_CLASSES}>UCoA Code</th>
              </tr>
            </thead>
            <tbody>
              {state.transactionSummary.lines.map((line) => (
                <tr key={line.beneficiary.id} className={TABLE_ROW_CLASSES}>
                  <td className={TABLE_CELL_CLASSES}>
                    {line.beneficiary.name}
                  </td>
                  <td className={`${TABLE_CELL_CLASSES} font-mono`}>
                    {line.beneficiary.cid}
                  </td>
                  <td className={`${TABLE_CELL_CLASSES} font-mono`}>
                    {line.beneficiary.tpn}
                  </td>
                  <td className={TABLE_CELL_CLASSES}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        CATEGORY_BADGE_CLASSES[line.beneficiary.category]
                      }`}
                    >
                      {CATEGORY_LABELS[line.beneficiary.category]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-center">{line.days}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    Nu.{line.beneficiary.ratePerDay.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-semibold">
                    Nu.{line.grossAmount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-amber-600">
                    Nu.{line.tds.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-semibold text-emerald-600">
                    Nu.{line.netPayable.toLocaleString()}
                  </td>
                  <td className={`${TABLE_CELL_CLASSES} font-mono`}>
                    {line.ucoaCode}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Row */}
          <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Total Gross Amount
              </div>
              <div className="text-xl font-bold text-emerald-600">
                Nu.{state.transactionSummary.totalGrossAmount.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Total TDS (10%)
              </div>
              <div className="text-xl font-bold text-amber-600">
                Nu.{state.transactionSummary.totalTDS.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Total Net Payable
              </div>
              <div className="text-xl font-bold text-violet-600">
                Nu.{state.transactionSummary.totalNetPayable.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => state.setCurrentStep('checks')}
            className={BUTTON_SECONDARY_CLASSES}
          >
            ← Back
          </button>
          <button
            onClick={() => state.setCurrentStep('approve')}
            disabled={!caps.canApprove}
            className={
              caps.canApprove ? BUTTON_PRIMARY_CLASSES : BUTTON_DISABLED_CLASSES
            }
          >
            Next: Approval →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Step 5: Approval                                                        */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (state.currentStep === 'approve') {
    return (
      <div className="p-6">
        <StepIndicator currentStep={state.currentStep} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Approval — Authorized Signatory
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Review and approve the sitting fee payment bill
          </p>
        </div>

        {/* Card: Pay Bill Summary */}
        <div className={CARD_CLASSES}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Payment Summary
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Number of Beneficiaries
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {state.transactionSummary.count}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Total Net Payable
              </div>
              <div className="text-2xl font-bold text-violet-600">
                Nu.{state.transactionSummary.totalNetPayable.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Gross Amount
              </div>
              <div className="text-lg font-bold text-emerald-600">
                Nu.{state.transactionSummary.totalGrossAmount.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Total TDS
              </div>
              <div className="text-lg font-bold text-amber-600">
                Nu.{state.transactionSummary.totalTDS.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Card: Authorized Signatory */}
        <div className={`${CARD_CLASSES} mt-6`}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Authorized Signatory Details
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Name
              </div>
              <div className="text-sm text-slate-900">{ctx?.position.title}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Designation
              </div>
              <div className="text-sm text-slate-900">{ctx?.position.title}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Agency
              </div>
              <div className="text-sm text-slate-900">{ctx?.agency.name}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Date of Approval
              </div>
              <div className="text-sm text-slate-900">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Digital Signature Placeholder */}
          <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg text-center bg-slate-50">
            <div className="text-4xl font-cursive text-slate-300">
              Digital Signature
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Signature will be applied upon approval confirmation
            </div>
          </div>
        </div>

        {/* Card: Approval Remarks */}
        <div className={`${CARD_CLASSES} mt-6`}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Approval Remarks
          </h3>
          <textarea
            value={state.approvalRemarks}
            onChange={(e) => state.setApprovalRemarks(e.target.value)}
            placeholder="Enter approval remarks or conditions..."
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => state.setCurrentStep('draft')}
            className={BUTTON_SECONDARY_CLASSES}
          >
            ← Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                state.setApprovalRemarks('');
                state.setCurrentStep('draft');
              }}
              className={BUTTON_SECONDARY_CLASSES}
            >
              Send Back
            </button>
            <button
              onClick={state.handleApprove}
              disabled={!state.approvalRemarks.trim() || !caps.canApprove}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                state.approvalRemarks.trim() && caps.canApprove
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-blue-300 text-white cursor-not-allowed opacity-50'
              }`}
            >
              Approve & Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Step 6: Finance Review                                                  */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (state.currentStep === 'finance') {
    return (
      <div className="p-6">
        <StepIndicator currentStep={state.currentStep} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Finance Review — Budget Validation
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Finance officer review with budget validation and fiscal year check
          </p>
        </div>

        {/* Card: Budget Validation */}
        <div className={CARD_CLASSES}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Budget Validation
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Budget Head
              </div>
              <div className="text-sm text-slate-900">
                Sitting Fee & Honorarium
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Expenditure Head
              </div>
              <div className="text-sm text-slate-900">2120121 / 2120122</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Available Budget
              </div>
              <div className="text-lg font-bold text-emerald-600">
                Nu.
                {(
                  ctx?.agency.fiscal?.annualBudgetNuM ?? 500000
                ).toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Current Payment
              </div>
              <div className="text-lg font-bold text-violet-600">
                Nu.{state.transactionSummary.totalNetPayable.toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Remaining Budget
              </div>
              <div className="text-lg font-bold text-blue-600">
                Nu.
                {(
                  500000 - state.transactionSummary.totalNetPayable
                ).toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Fiscal Year
              </div>
              <div className="text-sm text-slate-900">{state.currentFY}</div>
            </div>
          </div>
        </div>

        {/* Card: Finance Officer Review */}
        <div className={`${CARD_CLASSES} mt-6`}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            Finance Officer Review
          </h3>

          <div className="p-4 rounded-lg bg-blue-50 border-l-4 border-blue-600 mb-4">
            <div className="text-sm text-blue-600">✓ Budget available</div>
            <div className="text-sm text-blue-600">
              ✓ All expenditure codes valid
            </div>
            <div className="text-sm text-blue-600">
              ✓ Fiscal year active ({state.currentFY})
            </div>
          </div>

          <label className="block text-xs font-semibold text-slate-500 mb-2">
            Finance Review Remarks
          </label>
          <textarea
            value={state.financeRemarks}
            onChange={(e) => state.setFinanceRemarks(e.target.value)}
            placeholder="Enter finance review remarks..."
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => state.setCurrentStep('approve')}
            className={BUTTON_SECONDARY_CLASSES}
          >
            ← Back
          </button>
          <button
            onClick={state.handleFinanceClear}
            disabled={!state.financeRemarks.trim() || !caps.canApprove}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              state.financeRemarks.trim() && caps.canApprove
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-blue-300 text-white cursor-not-allowed opacity-50'
            }`}
          >
            Clear & Next →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* Step 7: Payment Processing                                              */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (state.currentStep === 'payment') {
    return (
      <div className="p-6">
        <StepIndicator currentStep={state.currentStep} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Payment Processing — Final Posting
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Finalize payment posting and generate payment reference
          </p>
        </div>

        {!state.paymentProcessed ? (
          <>
            {/* Card: Payment Summary */}
            <div className={CARD_CLASSES}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Payment Summary for Processing
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    Number of Beneficiaries
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {state.transactionSummary.count}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    Total Net Payable
                  </div>
                  <div className="text-2xl font-bold text-violet-600">
                    Nu.{state.transactionSummary.totalNetPayable.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    Total Gross Amount
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    Nu.{state.transactionSummary.totalGrossAmount.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    Total TDS Deduction
                  </div>
                  <div className="text-lg font-bold text-amber-600">
                    Nu.{state.transactionSummary.totalTDS.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Bank-wise Remittance Summary */}
            <div className={`${CARD_CLASSES} mt-6`}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Bank-wise Remittance Summary
              </h3>

              <table className="w-full text-sm">
                <thead>
                  <tr className={TABLE_HEADER_CLASSES}>
                    <th className={TABLE_CELL_CLASSES}>Bank Name</th>
                    <th className={TABLE_CELL_CLASSES}>No. of Accounts</th>
                    <th className={TABLE_CELL_CLASSES}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    new Map(
                      state.transactionSummary.lines
                        .filter((line) => line.beneficiary.bankName)
                        .map((line) => [
                          line.beneficiary.bankName,
                          line.beneficiary.bankName,
                        ])
                    ).values()
                  ).map((bank) => {
                    const bankLines = state.transactionSummary.lines.filter(
                      (line) => line.beneficiary.bankName === bank
                    );
                    const bankTotal = bankLines.reduce(
                      (sum, line) => sum + line.netPayable,
                      0
                    );
                    return (
                      <tr key={bank} className={TABLE_ROW_CLASSES}>
                        <td className={TABLE_CELL_CLASSES}>{bank}</td>
                        <td className="px-3 py-2 text-sm text-center">
                          {bankLines.length}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-semibold">
                          Nu.{bankTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card: UCoA Journal Entries */}
            <div className={`${CARD_CLASSES} mt-6`}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                UCoA Journal Entries
              </h3>

              <table className="w-full text-sm">
                <thead>
                  <tr className={TABLE_HEADER_CLASSES}>
                    <th className={TABLE_CELL_CLASSES}>Account</th>
                    <th className={TABLE_CELL_CLASSES}>Code</th>
                    <th className={TABLE_CELL_CLASSES}>Description</th>
                    <th className={TABLE_CELL_CLASSES}>Debit</th>
                    <th className={TABLE_CELL_CLASSES}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={TABLE_ROW_CLASSES}>
                    <td className={TABLE_CELL_CLASSES}>
                      Sitting Fee & Honorarium
                    </td>
                    <td className={`${TABLE_CELL_CLASSES} font-mono`}>
                      2120121/2120122
                    </td>
                    <td className={TABLE_CELL_CLASSES}>
                      Payment for sitting fees and honorarium
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-semibold">
                      Nu.
                      {state.transactionSummary.totalNetPayable.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">—</td>
                  </tr>

                  <tr className={TABLE_ROW_CLASSES}>
                    <td className={TABLE_CELL_CLASSES}>Bank Account</td>
                    <td className={`${TABLE_CELL_CLASSES} font-mono`}>1001</td>
                    <td className={TABLE_CELL_CLASSES}>
                      Remittance to beneficiary banks
                    </td>
                    <td className="px-3 py-2 text-sm text-right">—</td>
                    <td className="px-3 py-2 text-sm text-right font-semibold">
                      Nu.
                      {state.transactionSummary.totalNetPayable.toLocaleString()}
                    </td>
                  </tr>

                  {state.transactionSummary.totalTDS > 0 && (
                    <tr className={TABLE_ROW_CLASSES}>
                      <td className={TABLE_CELL_CLASSES}>
                        TDS Payable (DRC)
                      </td>
                      <td className={`${TABLE_CELL_CLASSES} font-mono`}>
                        2210402
                      </td>
                      <td className={TABLE_CELL_CLASSES}>
                        Tax deducted at source
                      </td>
                      <td className="px-3 py-2 text-sm text-right font-semibold">
                        Nu.{state.transactionSummary.totalTDS.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Process Payment Button */}
            <div className="flex justify-end mt-8">
              <button
                onClick={state.handleProcessPayment}
                disabled={!caps.canExport}
                className={`px-6 py-3 rounded-lg font-medium transition text-base ${
                  caps.canExport
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Process Payment
              </button>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="p-12 rounded-2xl bg-green-50 border-2 border-green-600 text-center">
            <div className="text-6xl mb-4">✓</div>

            <h2 className="text-3xl font-bold text-emerald-600 mb-4">
              Payment Successfully Processed
            </h2>

            <p className="text-base text-emerald-700 mb-8">
              Sitting fee and honorarium payments have been posted to the
              system.
            </p>

            <div className="p-6 bg-white rounded-lg mb-6 text-left">
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  Payment Reference Number
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {state.processedPaymentId}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 mt-4">
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  Processing Details
                </div>
                <div className="text-sm text-slate-900">
                  {state.transactionSummary.count} beneficiaries | Nu.
                  {state.transactionSummary.totalNetPayable.toLocaleString()}{' '}
                  payable | Processed on{' '}
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  state.setCurrentStep('onboard');
                  state.setPaymentProcessed(false);
                  state.setTransactions({});
                  state.setApprovalRemarks('');
                  state.setFinanceRemarks('');
                }}
                className={BUTTON_PRIMARY_CLASSES}
              >
                Start New Payment Cycle
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
