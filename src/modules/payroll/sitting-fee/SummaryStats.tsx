'use client';

import React from 'react';
import { CARD_CLASSES } from './constants';
import type { TransactionSummary } from './types';

interface SummaryStatsProps {
  summary: TransactionSummary;
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mt-6">
      <div className={CARD_CLASSES}>
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Total Beneficiaries
        </div>
        <div className="text-2xl font-bold text-blue-600">{summary.count}</div>
      </div>

      <div className={CARD_CLASSES}>
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Total Gross Amount
        </div>
        <div className="text-2xl font-bold text-emerald-600">
          Nu.{summary.totalGrossAmount.toLocaleString()}
        </div>
      </div>

      <div className={CARD_CLASSES}>
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Total TDS (10%)
        </div>
        <div className="text-2xl font-bold text-amber-600">
          Nu.{summary.totalTDS.toLocaleString()}
        </div>
      </div>

      <div className={CARD_CLASSES}>
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Total Net Payable
        </div>
        <div className="text-2xl font-bold text-violet-600">
          Nu.{summary.totalNetPayable.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
