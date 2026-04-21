/* ═══════════════════════════════════════════════════════════════════════════
   SRS Registry — barrel export
   ────────────────────────────────────────────────────────────────────────
   Central entry point for every SRS-driven UI surface. Importing from
   "shared/data/srs" guarantees the UI is reading the current clause list
   rather than a hard-coded string.
   ═══════════════════════════════════════════════════════════════════════════ */
export * from "./payrollSrs";
export * from "./expenditureSrs";
export * from "./govtechCapabilities";
