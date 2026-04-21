/* ═══════════════════════════════════════════════════════════════════════════
   useAgencyUrl — dynamic agency-scoped URL helper
   ─────────────────────────────────────────────────
   Every internal IFMIS route is prefixed with:
     /:agencySlug/:userId/…
   Example: /govtech/gt70-hr-01/payroll/employees

   This hook provides:
     • agencySlug  — lowercase short code from the active agency (e.g. "govtech")
     • userId      — current user's id from AuthContext (e.g. "gt70-hr-01")
     • buildPath(relative) — converts "/payroll/employees" to "/govtech/gt70-hr-01/payroll/employees"
     • stripPrefix(pathname) — removes the agency prefix to get the raw route

   The slugs are derived from agencyPersonas shortCode:
     "16" → "mof", "20" → "moh", "70" → "govtech", etc.
   External portals: "EXT" → "contractor", "MR" → "muster-roll", "FI" → "fi"
   ═══════════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { AGENCIES } from "../data/agencyPersonas";

/* ── Slug resolver ─────────────────────────────────────────────────────── */

/** Special-case slugs for non-agency codes */
const SPECIAL_SLUGS: Record<string, string> = {
  EXT: "contractor",
  MR: "muster-roll",
  FI: "fi",
};

/** Convert agency code to a URL-friendly slug (lowercase). */
export function agencyCodeToSlug(code: string): string {
  if (SPECIAL_SLUGS[code]) return SPECIAL_SLUGS[code];
  const agency = AGENCIES.find((a) => a.code === code);
  if (agency) return agency.shortCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `agency-${code}`;
}

/** Reverse lookup — slug back to agency code. */
export function slugToAgencyCode(slug: string): string | null {
  /* Check special slugs first */
  for (const [code, s] of Object.entries(SPECIAL_SLUGS)) {
    if (s === slug) return code;
  }
  /* Match against agency shortCodes */
  const normalizedSlug = slug.toLowerCase();
  const agency = AGENCIES.find(
    (a) => a.shortCode.toLowerCase().replace(/[^a-z0-9]+/g, "-") === normalizedSlug
  );
  return agency?.code ?? null;
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export function useAgencyUrl() {
  const { activeAgencyCode, user } = useAuth();

  const agencySlug = useMemo(
    () => agencyCodeToSlug(activeAgencyCode),
    [activeAgencyCode]
  );

  const userId = user?.id ?? "anonymous";

  /** Build a full agency-scoped path from a bare route.
   *  Input:  "/payroll/employees"
   *  Output: "/govtech/gt70-hr-01/payroll/employees" */
  const buildPath = useMemo(
    () => (relativePath: string) => {
      const clean = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
      return `/${agencySlug}/${userId}${clean}`;
    },
    [agencySlug, userId]
  );

  /** Strip the agency prefix from a pathname.
   *  Input:  "/govtech/gt70-hr-01/payroll/employees"
   *  Output: "/payroll/employees" */
  const stripPrefix = useMemo(
    () => (pathname: string) => {
      const prefix = `/${agencySlug}/${userId}`;
      if (pathname.startsWith(prefix)) {
        const rest = pathname.slice(prefix.length);
        return rest.startsWith("/") ? rest : `/${rest}`;
      }
      /* Try to strip any /:slug/:userId prefix pattern */
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const possibleAgency = slugToAgencyCode(parts[0]);
        if (possibleAgency) {
          return "/" + parts.slice(2).join("/");
        }
      }
      return pathname;
    },
    [agencySlug, userId]
  );

  return { agencySlug, userId, buildPath, stripPrefix, activeAgencyCode };
}
