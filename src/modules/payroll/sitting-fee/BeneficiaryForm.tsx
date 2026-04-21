'use client';

import React from 'react';
import {
  INPUT_CLASSES,
  BUTTON_PRIMARY_CLASSES,
  BUTTON_DISABLED_CLASSES,
} from './constants';
import type { SittingFeeState } from './types';

interface BeneficiaryFormProps {
  state: SittingFeeState;
  canProcessSitting: boolean;
  bankNames: string[];
}

export function BeneficiaryForm({
  state,
  canProcessSitting,
  bankNames,
}: BeneficiaryFormProps) {
  if (!state.showAddForm) {
    return null;
  }

  const hasValidBank = state.newBeneficiary.bankName && state.newBeneficiary.bankBranch && state.newBeneficiary.bankAccountNo;

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          Name
        </label>
        <input
          type="text"
          value={state.newBeneficiary.name}
          onChange={(e) =>
            state.setNewBeneficiary({
              ...state.newBeneficiary,
              name: e.target.value,
            })
          }
          placeholder="Full name"
          className={INPUT_CLASSES}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          CID
        </label>
        <input
          type="text"
          value={state.newBeneficiary.cid}
          onChange={(e) =>
            state.setNewBeneficiary({
              ...state.newBeneficiary,
              cid: e.target.value,
            })
          }
          placeholder="CID number"
          className={INPUT_CLASSES}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          TPN
        </label>
        <input
          type="text"
          value={state.newBeneficiary.tpn}
          onChange={(e) =>
            state.setNewBeneficiary({
              ...state.newBeneficiary,
              tpn: e.target.value,
            })
          }
          placeholder="TPN number"
          className={INPUT_CLASSES}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          Category
        </label>
        <select
          value={state.newBeneficiary.category}
          onChange={(e) =>
            state.setNewBeneficiary({
              ...state.newBeneficiary,
              category: e.target.value as 'sitting-fee' | 'honorarium',
            })
          }
          className={INPUT_CLASSES}
        >
          <option value="sitting-fee">Sitting Fee</option>
          <option value="honorarium">Honorarium</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          Rate per Day (Nu.)
        </label>
        <input
          type="number"
          value={state.newBeneficiary.ratePerDay}
          onChange={(e) =>
            state.setNewBeneficiary({
              ...state.newBeneficiary,
              ratePerDay: Number(e.target.value),
            })
          }
          placeholder="0"
          className={INPUT_CLASSES}
        />
      </div>

      {/* Bank Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          Bank Name *
        </label>
        <select
          value={state.newBeneficiary.bankName}
          onChange={(e) => state.handleSfBankChange(e.target.value)}
          className={`${INPUT_CLASSES} ${
            state.bankFieldErrors.bankName ? 'border-red-400 bg-red-50' : ''
          }`}
        >
          <option value="">— Select Bank —</option>
          {bankNames.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {state.bankFieldErrors.bankName && (
          <p className="mt-1 text-xs text-red-600">
            {state.bankFieldErrors.bankName}
          </p>
        )}
      </div>

      {/* Bank Branch */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          Branch *
        </label>
        <select
          value={state.newBeneficiary.bankBranch}
          onChange={(e) => state.handleSfBranchChange(e.target.value)}
          disabled={!state.newBeneficiary.bankName}
          className={`${INPUT_CLASSES} ${
            state.bankFieldErrors.bankBranch ? 'border-red-400 bg-red-50' : ''
          } ${
            !state.newBeneficiary.bankName ? 'bg-slate-100 cursor-not-allowed' : ''
          }`}
        >
          <option value="">
            {state.newBeneficiary.bankName
              ? '— Select Branch —'
              : '— Select bank first —'}
          </option>
          {state.sfBranchOptions.map((br: any) => (
            <option key={br.bfsc} value={br.value}>
              {br.label}
            </option>
          ))}
        </select>
        {state.bankFieldErrors.bankBranch && (
          <p className="mt-1 text-xs text-red-600">
            {state.bankFieldErrors.bankBranch}
          </p>
        )}
        {state.newBeneficiary.bankBranch && !state.bankFieldErrors.bankBranch && (
          <p className="mt-1 text-xs text-emerald-600">
            BFSC:{' '}
            {state.sfBranchOptions.find(
              (b: any) => b.value === state.newBeneficiary.bankBranch
            )?.bfsc ?? '—'}
          </p>
        )}
      </div>

      {/* Account Number */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          Account Number *
        </label>
        <input
          type="text"
          value={state.newBeneficiary.bankAccountNo}
          onChange={(e) => {
            state.setNewBeneficiary({
              ...state.newBeneficiary,
              bankAccountNo: e.target.value,
            });
            state.setCbsStatus('idle');
            state.setCbsMessage('');
          }}
          placeholder="9-16 digit account number"
          className={`${INPUT_CLASSES} ${
            state.bankFieldErrors.bankAccountNo ? 'border-red-400 bg-red-50' : ''
          }`}
        />
        {state.bankFieldErrors.bankAccountNo && (
          <p className="mt-1 text-xs text-red-600">
            {state.bankFieldErrors.bankAccountNo}
          </p>
        )}
      </div>

      {/* CBS Verification Button */}
      <div className="flex items-end">
        <button
          type="button"
          onClick={state.handleSfVerifyBank}
          disabled={!hasValidBank || state.cbsStatus === 'verifying'}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all w-full ${
            state.cbsStatus === 'verified'
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : state.cbsStatus === 'failed'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : state.cbsStatus === 'verifying'
              ? 'bg-blue-100 text-blue-600 border border-blue-300 cursor-wait'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          } ${!hasValidBank ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {state.cbsStatus === 'verifying'
            ? 'Verifying…'
            : state.cbsStatus === 'verified'
            ? 'CBS Verified'
            : state.cbsStatus === 'failed'
            ? 'Retry CBS'
            : 'Verify Bank'}
        </button>
      </div>

      {state.cbsMessage && (
        <div className="col-span-2">
          <p
            className={`text-xs ${
              state.cbsStatus === 'verified'
                ? 'text-emerald-600'
                : state.cbsStatus === 'failed'
                ? 'text-red-600'
                : 'text-blue-600'
            }`}
          >
            {state.cbsMessage}
          </p>
        </div>
      )}

      <div className="col-span-2">
        <button
          onClick={state.handleAddBeneficiary}
          disabled={!canProcessSitting}
          className={
            canProcessSitting
              ? BUTTON_PRIMARY_CLASSES + ' w-full'
              : BUTTON_DISABLED_CLASSES + ' w-full'
          }
        >
          Add Beneficiary
        </button>
      </div>
    </div>
  );
}
