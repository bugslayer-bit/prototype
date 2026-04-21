/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Employee Category → Stream Mapping
   ---------------------------------------------------------------------------
   Source of LoV values: Master Data group `payroll-employee-category`
   (editable from /master-data). Each category belongs to exactly ONE payroll
   stream — Civil Servant or Other Public Servant — because the paybill
   formulae, remittance routing and reporting paths differ per stream.

   This file is the single source of truth for the mapping. Pages import
   `streamFor(category)`, `categoriesFor(stream)` or the whole
   PAYROLL_CATEGORY_DIRECTORY instead of hard-coding lists, so a rename or
   re-classification is a one-file edit.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { EmployeeCategory } from "../types";

export interface PayrollCategoryMeta {
  /** Canonical LoV label (must match payroll-employee-category master data). */
  label: string;
  /** Payroll stream this category is paid under. */
  stream: EmployeeCategory;
  /** Optional short chip label used on dense UIs. */
  short?: string;
  /** Icon shown on category chips. */
  icon: string;
  /** Short one-liner used in tooltips / detail cards. */
  description: string;
}

/** Canonical directory — ORDER MATTERS for UI rendering. */
export const PAYROLL_CATEGORY_DIRECTORY: PayrollCategoryMeta[] = [
  {
    label: "Civil Servants",
    short: "Civil Servants",
    stream: "civil-servant",
    icon: "🏛️",
    description: "Regular civil service positions appointed by RCSC.",
  },
  {
    label: "Constitutional Bodies",
    short: "Constitutional",
    stream: "civil-servant",
    icon: "⚖️",
    description: "Staff of ACC, RAA, ECB and similar constitutional offices.",
  },
  {
    label: "Foreign Services",
    short: "Foreign Svc",
    stream: "civil-servant",
    icon: "🌐",
    description: "Diplomats and officers posted to missions abroad.",
  },
  {
    label: "Foreign Services (Local Recruit)",
    short: "Foreign (Local)",
    stream: "civil-servant",
    icon: "🛂",
    description: "Locally hired staff at overseas missions.",
  },
  {
    label: "Judiciary",
    short: "Judiciary",
    stream: "civil-servant",
    icon: "⚖️",
    description: "Judges and judicial staff under the Royal Court.",
  },
  {
    label: "Local Government",
    short: "Local Govt",
    stream: "other-public-servant",
    icon: "🏘️",
    description: "Dzongkhag / Gewog / Thromde elected and appointed staff.",
  },
  {
    label: "Parliament (Members of NA/NC)",
    short: "Parliament",
    stream: "other-public-servant",
    icon: "🏛️",
    description: "Sitting Members of the National Assembly / National Council.",
  },
  {
    label: "Religious Services",
    short: "Religious",
    stream: "other-public-servant",
    icon: "🕊️",
    description: "Monastic Body and Central Monastic personnel on payroll.",
  },
  {
    label: "Other Public Servants: RUB",
    short: "RUB",
    stream: "other-public-servant",
    icon: "🎓",
    description: "Royal University of Bhutan faculty and administration.",
  },
  {
    label: "Royal Bhutan Police",
    short: "RBP",
    stream: "other-public-servant",
    icon: "🚔",
    description: "Uniformed Royal Bhutan Police personnel.",
  },
  {
    label: "Royal Bhutan Police (Civil)",
    short: "RBP Civil",
    stream: "other-public-servant",
    icon: "👮",
    description: "Civilian support staff of the Royal Bhutan Police.",
  },
  {
    label: "Local Recruits",
    short: "Local Recruits",
    stream: "other-public-servant",
    icon: "🧰",
    description: "Ad-hoc/contract recruits paid through agency payroll.",
  },
];

/* ── Lookup helpers ─────────────────────────────────────────────────────── */

const META_BY_LABEL: Record<string, PayrollCategoryMeta> = Object.fromEntries(
  PAYROLL_CATEGORY_DIRECTORY.map((c) => [c.label.toLowerCase(), c]),
);

/** Returns the stream for a given category label.  Fallback = civil-servant. */
export function streamFor(category: string | undefined | null): EmployeeCategory {
  if (!category) return "civil-servant";
  return META_BY_LABEL[category.toLowerCase()]?.stream ?? "civil-servant";
}

/** Returns category metadata or undefined if unknown. */
export function metaFor(category: string | undefined | null): PayrollCategoryMeta | undefined {
  if (!category) return undefined;
  return META_BY_LABEL[category.toLowerCase()];
}

/** Returns all categories attached to a given stream. */
export function categoriesFor(stream: EmployeeCategory): PayrollCategoryMeta[] {
  return PAYROLL_CATEGORY_DIRECTORY.filter((c) => c.stream === stream);
}

/** Intersect a master-data LoV (user may have edited) with the typed
 *  directory to produce a rendering-safe list for the given stream. Unknown
 *  master-data entries fall through as civil-servant with the 🧾 icon so the
 *  UI never breaks when a new category is added from /master-data. */
export function mergeLovWithDirectory(
  lov: readonly string[],
  stream: EmployeeCategory,
): PayrollCategoryMeta[] {
  const known = new Set(PAYROLL_CATEGORY_DIRECTORY.map((c) => c.label.toLowerCase()));
  const extras: PayrollCategoryMeta[] = lov
    .filter((v) => !known.has(v.toLowerCase()))
    .map((v) => ({
      label: v,
      stream,
      icon: "🧾",
      description: "Custom category added from Master Data.",
    }));
  return [...categoriesFor(stream), ...extras];
}
