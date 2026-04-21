/* ═══════════════════════════════════════════════════════════════════════════
   RoleGuard — Route-level role-based access control
   ──────────────────────────────────────────────────
   Wraps route elements to enforce role-based access at the route level.
   Unlike InternalGuard (which only checks agency === "EXT"), RoleGuard
   validates that the user's activeRoleId is in the allowed set.

   Usage:
     <Route path="admin/rbac" element={
       <RoleGuard allowedRoles={["role-admin"]}>
         <RbacPage />
       </RoleGuard>
     } />

   If the user's role doesn't match, renders an AccessDenied panel
   (not a redirect) so they see what happened and can switch roles.
   ═══════════════════════════════════════════════════════════════════════════ */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { landingFor } from "../data/roleLandings";
import { useAgencyUrl } from "../hooks/useAgencyUrl";

interface RoleGuardProps {
  children: React.ReactNode;
  /** Which role IDs are allowed. If empty / omitted, any authenticated user passes. */
  allowedRoles?: string[];
  /** Module name for permission-based check (checks canAccessModule). */
  requiredModule?: string;
  /** Specific permission ID required (checked via hasPermission). */
  requiredPermission?: string;
  /** Custom fallback component. If omitted, renders built-in AccessDenied. */
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  requiredModule,
  requiredPermission,
  fallback,
}) => {
  const { activeRoleId, activeAgencyCode, hasPermission, canAccessModule } = useAuth();

  /* ── Check 1: InternalGuard equivalent (external/public users blocked from internal) ── */
  if (activeAgencyCode === "EXT" || activeAgencyCode === "MR" || activeAgencyCode === "FI") {
    return <>{fallback ?? <AccessDenied reason="external" activeRole={activeRoleId} />}</>;
  }

  /* ── Check 2: Role whitelist ── */
  if (allowedRoles && allowedRoles.length > 0) {
    if (!activeRoleId || !allowedRoles.includes(activeRoleId)) {
      return <>{fallback ?? <AccessDenied reason="role" activeRole={activeRoleId} allowedRoles={allowedRoles} />}</>;
    }
  }

  /* ── Check 3: Module-level access ── */
  if (requiredModule && !canAccessModule(requiredModule)) {
    return <>{fallback ?? <AccessDenied reason="module" activeRole={activeRoleId} requiredModule={requiredModule} />}</>;
  }

  /* ── Check 4: Specific permission ── */
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback ?? <AccessDenied reason="permission" activeRole={activeRoleId} requiredPermission={requiredPermission} />}</>;
  }

  return <>{children}</>;
};

/* ── AccessDenied UI ───────────────────────────────────────────────────── */
interface AccessDeniedProps {
  reason: "external" | "role" | "module" | "permission";
  activeRole: string | null;
  allowedRoles?: string[];
  requiredModule?: string;
  requiredPermission?: string;
}

const ROLE_LABELS: Record<string, string> = {
  "role-admin": "System Administrator",
  "role-hr-officer": "HR Officer",
  "role-finance-officer": "Finance Officer",
  "role-head-of-agency": "Head of Agency",
  "role-procurement": "Procurement Officer",
  "role-agency-staff": "Agency Staff",
  "role-auditor": "Auditor",
  "role-normal-user": "Normal User",
  "role-public": "Contractor / Vendor",
  "role-muster-roll": "Muster Roll Beneficiary",
  "role-fi": "Financial Institution",
};

function roleLabel(id: string): string {
  return ROLE_LABELS[id] ?? id;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  reason,
  activeRole,
  allowedRoles,
  requiredModule,
  requiredPermission,
}) => {
  const navigate = useNavigate();
  const { buildPath, activeAgencyCode } = useAgencyUrl();
  const goHome = () => {
    if (!activeRole) return;
    const landing = landingFor(activeRole, activeAgencyCode);
    navigate(buildPath(landing.path));
  };
  const messages: Record<typeof reason, { title: string; detail: string }> = {
    external: {
      title: "Internal Module",
      detail: "This page is only available to government staff. Switch to an internal user persona using the numbered circles in the header.",
    },
    role: {
      title: "Role Not Authorized",
      detail: `Your current role (${roleLabel(activeRole ?? "none")}) doesn't have access to this page. Authorized roles: ${
        allowedRoles?.map(roleLabel).join(", ") ?? "—"
      }. Use the persona switcher in the header to change roles.`,
    },
    module: {
      title: "Module Access Denied",
      detail: `Your current role (${roleLabel(activeRole ?? "none")}) doesn't have access to the "${requiredModule}" module. Switch roles in the header to gain access.`,
    },
    permission: {
      title: "Permission Required",
      detail: `The permission "${requiredPermission}" is required. Your current role (${roleLabel(activeRole ?? "none")}) doesn't have it. Switch roles or contact your administrator.`,
    },
  };

  const msg = messages[reason];

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md text-center space-y-4">
        {/* Shield icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-900">{msg.title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{msg.detail}</p>

        {/* Current role badge */}
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Current: {roleLabel(activeRole ?? "none")}
          </span>
        </div>

        {/* Allowed roles list */}
        {allowedRoles && allowedRoles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {allowedRoles.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                {roleLabel(r)}
              </span>
            ))}
          </div>
        )}

        {/* Go-home CTA — resolves active role's canonical landing. */}
        {activeRole && reason !== "external" && (
          <div className="pt-3">
            <button
              type="button"
              onClick={goHome}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Take me to my {roleLabel(activeRole)} home →
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-400 pt-4">
          Tip: Click any numbered persona (1-9) in the top header to switch roles dynamically.
        </p>
      </div>
    </div>
  );
};

export default RoleGuard;
