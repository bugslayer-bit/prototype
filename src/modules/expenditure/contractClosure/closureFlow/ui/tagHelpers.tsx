/* Tiny SRS reference pills reused across the Contract Closure UI. */
import type { JSX } from "react";

const base =
  "ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold";

export const ddTag = (ref: string): JSX.Element => (
  <span className={`${base} bg-violet-100 text-violet-600`}>{ref}</span>
);

export const brTag = (ref: string): JSX.Element => (
  <span className={`${base} bg-amber-100 text-amber-700`}>{ref}</span>
);

export const pdTag = (ref: string): JSX.Element => (
  <span className={`${base} bg-sky-100 text-sky-700`}>{ref}</span>
);

export const lovTag = (ref: string): JSX.Element => (
  <span className={`${base} bg-emerald-100 text-emerald-700`}>{ref}</span>
);
