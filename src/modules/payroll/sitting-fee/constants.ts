/**
 * Constants and Tailwind classes for Sitting Fee module
 */

export const STEP_NAMES = [
  'Onboard',
  'Transaction',
  'Checks',
  'Draft',
  'Approve',
  'Finance',
  'Payment',
] as const;

export const CATEGORY_OPTIONS = ['sitting-fee', 'honorarium'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  'sitting-fee': 'Sitting Fee',
  honorarium: 'Honorarium',
};

export const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  'sitting-fee': 'bg-blue-100 text-blue-700',
  honorarium: 'bg-purple-100 text-purple-700',
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-900',
};

/* ═══════════════════════════════════════════════════════════════════════ */
/* Tailwind Class Definitions                                              */
/* ═══════════════════════════════════════════════════════════════════════ */

export const CARD_CLASSES =
  'rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl p-8';

export const HEADER_CLASSES = 'text-lg font-bold text-slate-900';

export const SUBHEADER_CLASSES = 'text-sm text-slate-500';

export const TABLE_CELL_CLASSES = 'px-3 py-2 text-sm';

export const TABLE_HEADER_CLASSES =
  'bg-slate-50 text-left font-bold text-slate-900 border-b border-slate-200';

export const TABLE_ROW_CLASSES =
  'border-b border-slate-200 even:bg-slate-50/50 hover:bg-blue-50/50 transition';

export const INPUT_CLASSES =
  'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

export const INPUT_SMALL_CLASSES =
  'w-20 px-2 py-1 rounded border border-slate-300 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

export const INPUT_MEDIUM_CLASSES =
  'w-36 px-2 py-1 rounded border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';

export const BUTTON_PRIMARY_CLASSES =
  'px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition';

export const BUTTON_SECONDARY_CLASSES =
  'px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition';

export const BUTTON_DISABLED_CLASSES =
  'px-4 py-2 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed font-medium';

export const STEP_ACTIVE_CLASSES =
  'px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition bg-blue-600 text-white border-2 border-blue-700';

export const STEP_COMPLETED_CLASSES =
  'px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition bg-blue-100 text-blue-700 border border-blue-300';

export const STEP_PENDING_CLASSES =
  'px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition bg-slate-200 text-slate-600 border border-slate-300';

/* ═══════════════════════════════════════════════════════════════════════ */
/* Step Index Utilities                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

export const STEP_INDEX: Record<string, number> = {
  onboard: 0,
  transaction: 1,
  checks: 2,
  draft: 3,
  approve: 4,
  finance: 5,
  payment: 6,
};

export function getStepIndicatorClass(
  stepIndex: number,
  currentStepIndex: number
): string {
  if (stepIndex === currentStepIndex) {
    return STEP_ACTIVE_CLASSES;
  }
  if (stepIndex < currentStepIndex) {
    return STEP_COMPLETED_CLASSES;
  }
  return STEP_PENDING_CLASSES;
}
