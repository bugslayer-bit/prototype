/* ═══════════════════════════════════════════════════════════════════════════
   RouteBreadcrumb — dynamic, route-aware breadcrumb for the app header.

   Builds the breadcrumb trail from the current URL path by consulting:
     1. sidebarSections          (sidebar links & groups — all modules)
     2. CS_SUBNAV / OPS_SUBNAV   (payroll workflow groups)
     3. STATIC_LABEL_MAP         (anything else, keyed by exact path)

   Works with the agency-scoped prefix "/:agencySlug/:userId/...". The agency
   and user ID are stripped before matching so breadcrumb labels stay stable
   across sessions and personas.

   Every crumb (except the last) is a link that navigates to that prefix,
   so users can always jump back up the route tree.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { sidebarSections } from "../../layout/sidebar";
import {
  CS_SUBNAV,
  OPS_SUBNAV,
} from "../../modules/payroll/shared/navigation/PayrollSubNav";

/* ── Static fallback labels for paths not covered by sidebar/subnav ──── */
const STATIC_LABEL_MAP: Record<string, string> = {
  "/": "Home",
  "/payroll": "Payroll",
  "/payroll/management": "Payroll Management",
  "/payroll/pay-scale": "Pay Scale Master",
  "/payroll/ops": "Other Public Service",
  "/admin": "Administration",
  "/admin/delegation": "Delegation of Authority",
  "/admin/rbac": "RBAC — Roles & Permissions",
  "/admin/verification": "Admin Verification",
  "/admin/workflow": "Workflow Config",
  "/masterdata": "Master Data",
  "/modules": "Modules",
  "/contractor": "Contractor Portal",
  "/notifications": "Notifications",
  "/user": "User Management",
  "/public-submissions": "Public Submissions",
};

/* ── Group labels inferred from payroll subnav (for /payroll/... paths) ─ */
function resolvePayrollGroup(strippedPath: string): { label: string; target: string } | null {
  const allGroups = [...CS_SUBNAV, ...OPS_SUBNAV];
  for (const g of allGroups) {
    if (g.links.some((l) => strippedPath === l.to || strippedPath.startsWith(l.to + "/"))) {
      return { label: `${g.icon} ${g.label}`, target: g.links[0]?.to ?? "/payroll/management" };
    }
  }
  return null;
}

/* ── Resolve a single path (e.g. "/payroll/hr-actions") to a label ──── */
function resolvePathLabel(strippedPath: string): string | null {
  /* 1 — sidebar standalone + group links */
  for (const section of sidebarSections) {
    for (const link of section.standaloneLinks ?? []) {
      if (link.to === strippedPath) return link.label;
    }
    for (const group of section.groups) {
      for (const link of group.links) {
        if (link.to === strippedPath) return link.label;
        for (const child of link.children ?? []) {
          if (child.to === strippedPath) return child.label;
        }
      }
    }
  }
  /* 2 — payroll subnav leaf links */
  for (const g of [...CS_SUBNAV, ...OPS_SUBNAV]) {
    for (const l of g.links) {
      if (l.to === strippedPath) return l.label;
    }
  }
  /* 3 — static map */
  if (STATIC_LABEL_MAP[strippedPath]) return STATIC_LABEL_MAP[strippedPath];
  return null;
}

/* ── Prettify a path segment as fallback ("hr-actions" → "HR Actions") ── */
function prettifySegment(seg: string): string {
  return seg
    .split("-")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

interface Crumb {
  label: string;
  to: string | null;
}

/* ═════════════════════════════════════════════════════════════════════════
   Build the trail
   ───────────────────────────────────────────────────────────────────── */
function buildCrumbs(pathname: string): Crumb[] {
  const rawParts = pathname.split("/").filter(Boolean);
  if (rawParts.length === 0) return [{ label: "Home", to: null }];

  /* Strip agency-slug + userId prefix. Heuristic: first 2 segments are prefix
     when URL has ≥ 3 segments and second segment looks like an id (starts with
     a letter+digit, or contains digits). */
  const hasPrefix =
    rawParts.length >= 3 && /^[a-z0-9-]{2,}$/i.test(rawParts[0]) && /^[a-z0-9_.-]+$/i.test(rawParts[1]);
  const prefix = hasPrefix ? `/${rawParts[0]}/${rawParts[1]}` : "";
  const coreParts = hasPrefix ? rawParts.slice(2) : rawParts;

  const crumbs: Crumb[] = [{ label: "Home", to: prefix || "/" }];

  let accum = "";
  coreParts.forEach((seg, idx) => {
    accum += "/" + seg;
    const isLast = idx === coreParts.length - 1;

    /* For payroll workflow pages, insert the group crumb before the leaf */
    if (isLast && accum.startsWith("/payroll/") && accum !== "/payroll/management") {
      const group = resolvePayrollGroup(accum);
      const mgmtLabel = resolvePathLabel("/payroll/management") ?? "Payroll Management";
      /* ensure "Payroll Management" appears before leaf */
      const lastIsMgmt = crumbs[crumbs.length - 1]?.to?.endsWith("/payroll/management");
      if (!lastIsMgmt) {
        crumbs.push({ label: mgmtLabel, to: prefix + "/payroll/management" });
      }
      if (group) {
        /* Link group crumb to the first workflow in that group so clicking it
           navigates somewhere useful instead of being a dead span. */
        crumbs.push({ label: group.label, to: prefix + group.target });
      }
    }

    const resolved = resolvePathLabel(accum);
    crumbs.push({
      label: resolved ?? prettifySegment(seg),
      to: isLast ? null : prefix + accum,
    });
  });

  /* De-duplicate consecutive identical labels (e.g. double "Payroll Management") */
  const dedup: Crumb[] = [];
  for (const c of crumbs) {
    if (dedup.length && dedup[dedup.length - 1].label === c.label) continue;
    dedup.push(c);
  }
  return dedup;
}

/* ═════════════════════════════════════════════════════════════════════════
   Component
   ───────────────────────────────────────────────────────────────────── */
export function RouteBreadcrumb({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);
  if (crumbs.length <= 1) return null;

  return (
    <nav
      className={`flex flex-wrap items-center gap-1 text-[11px] font-medium text-slate-500 ${className ?? ""}`}
      aria-label="Route breadcrumb"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={`${c.label}-${i}`}>
            {i > 0 && <span className="opacity-40">›</span>}
            {c.to && !isLast ? (
              <Link
                to={c.to}
                className="rounded px-1 py-0.5 transition hover:bg-slate-100 hover:text-indigo-600"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "rounded bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700"
                    : "px-1 py-0.5"
                }
              >
                {c.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
