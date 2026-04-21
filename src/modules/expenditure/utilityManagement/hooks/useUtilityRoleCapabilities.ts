/* ═══════════════════════════════════════════════════════════════════════════
   useUtilityRoleCapabilities — SRS PRN 5.1 role-awareness hook.
   ─────────────────────────────────────────────────────────────────────────
   Determines what the active persona can SEE and DO inside the Utility &
   Service Payment Management module. Every button, filter, and stat card
   in the Utility module reads from this hook.

   Role matrix (derived from SRS Process Descriptions rows 74-77):
     System Administrator  → full CRUD + config + dispute resolution
     Finance Officer       → approve bills, initiate/release payments, view all
     Agency Finance        → review bills, verify budget, first-line approval
     Head of Agency        → final approval, dispute escalation
     Procurement Officer   → read-only (utility contracts are service-based)
     Agency Staff          → create accounts, enter bills, map services
     Initiator (eCMS)      → create accounts, enter bills (trigger by CMS)
     Payment Release       → release payment orders, view cleared bills
     Auditor (RAA)         → read-only with export
     Normal User           → create accounts, enter bills, no approvals
     Public User           → no access (filtered at sidebar level)
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export interface UtilityRoleCapabilities {
  /* CRUD */
  canCreateAccount: boolean;
  canEditAccount: boolean;
  canDeleteAccount: boolean;
  /* Bills */
  canEnterBills: boolean;
  canApproveBills: boolean;
  canFinalApproveBills: boolean;
  /* Payments */
  canInitiatePayment: boolean;
  canReleasePayment: boolean;
  /* Config */
  canConfigureCutoff: boolean;
  canManageDisputes: boolean;
  canResolveDisputes: boolean;
  /* View */
  isReadOnly: boolean;
  canExport: boolean;
  /* Persona meta — for RoleContextBanner */
  capabilities: string[];
  blocked: string[];
}

export function useUtilityRoleCapabilities(): UtilityRoleCapabilities {
  const { activeRoleId } = useAuth();

  return useMemo(() => {
    const role = activeRoleId ?? "";

    /* ── Role groups ──────────────────────────────────────────────────── */
    const isAdmin = role === "role-admin";
    const isFinance = role === "role-finance-officer";
    const isHeadOfAgency = role === "role-head-of-agency";
    const isProcurement = role === "role-procurement";
    const isAgencyStaff = role === "role-agency-staff";
    const isAuditor = role === "role-auditor";
    const isNormalUser = role === "role-normal-user";
    /* Utility provider portal — read-only view of their own bills only.
       Scoping to a single provider's records is handled in UtilityQueue
       via providerMatchTokens(); this role just locks down actions. */
    const isUtilityProvider = role === "role-utility-provider";

    const isOperational = isAdmin || isFinance || isAgencyStaff || isNormalUser;
    const isApprover = isAdmin || isFinance || isHeadOfAgency;
    const isReadOnly = isAuditor || isProcurement || isUtilityProvider;

    const canCreateAccount = isOperational && !isReadOnly;
    const canEditAccount = isOperational && !isReadOnly;
    const canDeleteAccount = isAdmin;
    const canEnterBills = isOperational || isAgencyStaff;
    const canApproveBills = isApprover;
    const canFinalApproveBills = isAdmin || isHeadOfAgency;
    const canInitiatePayment = isAdmin || isFinance;
    const canReleasePayment = isAdmin || isFinance;
    const canConfigureCutoff = isAdmin || isFinance;
    const canManageDisputes = isAdmin || isFinance || isHeadOfAgency;
    const canResolveDisputes = isAdmin || isHeadOfAgency;
    const canExport = true; // all roles can export

    /* ── Banner chips ────────────────────────────────────────────────── */
    const capabilities: string[] = [];
    const blocked: string[] = [];

    if (canCreateAccount) capabilities.push("Create Utility Accounts");
    if (canEnterBills) capabilities.push("Enter Bills");
    if (canApproveBills) capabilities.push("Approve Bills");
    if (canFinalApproveBills) capabilities.push("Final Approval");
    if (canInitiatePayment) capabilities.push("Initiate Payment");
    if (canReleasePayment) capabilities.push("Release Payment Orders");
    if (canConfigureCutoff) capabilities.push("Configure Cut-off Dates");
    if (canManageDisputes) capabilities.push("Manage Disputes");
    if (canExport) capabilities.push("Export Data");

    if (!canCreateAccount) blocked.push("Create Accounts");
    if (!canEditAccount) blocked.push("Edit Accounts");
    if (!canDeleteAccount) blocked.push("Delete Accounts");
    if (!canApproveBills) blocked.push("Approve Bills");
    if (!canInitiatePayment) blocked.push("Initiate Payment");
    if (!canManageDisputes) blocked.push("Manage Disputes");

    return {
      canCreateAccount,
      canEditAccount,
      canDeleteAccount,
      canEnterBills,
      canApproveBills,
      canFinalApproveBills,
      canInitiatePayment,
      canReleasePayment,
      canConfigureCutoff,
      canManageDisputes,
      canResolveDisputes,
      isReadOnly,
      canExport,
      capabilities,
      blocked,
    };
  }, [activeRoleId]);
}
