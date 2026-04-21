/* ═══════════════════════════════════════════════════════════════════════════
   useRentalRoleCapabilities — SRS PRN 5.1 role-awareness hook.
   ─────────────────────────────────────────────────────────────────────────
   Determines what the active persona can SEE and DO inside the Rental
   Payment Management module. Every button, filter, and stat card reads
   from this hook.

   Role matrix (derived from SRS Process Descriptions rows 78-80):
     System Administrator  → full CRUD + config + approval + PTS admin
     Finance Officer       → approve transactions, initiate/release payments
     Agency Finance        → review transactions, verify budget, first-line approval
     Head of Agency        → final approval, lease termination
     Procurement Officer   → read-only (leases are managed by Finance & Admin)
     Agency Staff          → create assets, enter transactions, map services
     Initiator (eCMS)      → create assets, enter transactions (triggered by CMS)
     Payment Release       → release payment orders, view approved transactions
     Auditor (RAA)         → read-only with export
     Normal User           → create assets, enter transactions, no approvals
     Public User           → no access (filtered at sidebar level)
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export interface RentalRoleCapabilities {
  /* CRUD */
  canCreateAsset: boolean;
  canEditAsset: boolean;
  canDeleteAsset: boolean;
  /* Transactions */
  canCreateTransaction: boolean;
  canApproveTransaction: boolean;
  canFinalApproveTransaction: boolean;
  /* Payments */
  canInitiatePayment: boolean;
  canReleasePayment: boolean;
  /* Config & Admin */
  canConfigureBudget: boolean;
  canManagePTS: boolean;
  canTerminateLease: boolean;
  /* View */
  isReadOnly: boolean;
  canExport: boolean;
  /* Persona meta — for RoleContextBanner */
  capabilities: string[];
  blocked: string[];
}

export function useRentalRoleCapabilities(): RentalRoleCapabilities {
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

    const isOperational = isAdmin || isFinance || isAgencyStaff || isNormalUser;
    const isApprover = isAdmin || isFinance || isHeadOfAgency;
    const isReadOnly = isAuditor || isProcurement;

    const canCreateAsset = isOperational && !isReadOnly;
    const canEditAsset = isOperational && !isReadOnly;
    const canDeleteAsset = isAdmin;
    const canCreateTransaction = isOperational || isAgencyStaff;
    const canApproveTransaction = isApprover;
    const canFinalApproveTransaction = isAdmin || isHeadOfAgency;
    const canInitiatePayment = isAdmin || isFinance;
    const canReleasePayment = isAdmin || isFinance;
    const canConfigureBudget = isAdmin || isFinance;
    const canManagePTS = isAdmin || isFinance;
    const canTerminateLease = isAdmin || isHeadOfAgency;
    const canExport = true; // all roles can export

    /* ── Banner chips ────────────────────────────────────────────────── */
    const capabilities: string[] = [];
    const blocked: string[] = [];

    if (canCreateAsset) capabilities.push("Register Rental Assets");
    if (canCreateTransaction) capabilities.push("Enter Transactions");
    if (canApproveTransaction) capabilities.push("Approve Transactions");
    if (canFinalApproveTransaction) capabilities.push("Final Approval");
    if (canInitiatePayment) capabilities.push("Initiate Payment");
    if (canReleasePayment) capabilities.push("Release Payment Orders");
    if (canConfigureBudget) capabilities.push("Configure Budget Codes");
    if (canManagePTS) capabilities.push("PTS Verification");
    if (canTerminateLease) capabilities.push("Terminate Leases");
    if (canExport) capabilities.push("Export Data");

    if (!canCreateAsset) blocked.push("Create Assets");
    if (!canEditAsset) blocked.push("Edit Assets");
    if (!canDeleteAsset) blocked.push("Delete Assets");
    if (!canApproveTransaction) blocked.push("Approve Transactions");
    if (!canInitiatePayment) blocked.push("Initiate Payment");
    if (!canTerminateLease) blocked.push("Terminate Leases");

    return {
      canCreateAsset,
      canEditAsset,
      canDeleteAsset,
      canCreateTransaction,
      canApproveTransaction,
      canFinalApproveTransaction,
      canInitiatePayment,
      canReleasePayment,
      canConfigureBudget,
      canManagePTS,
      canTerminateLease,
      isReadOnly,
      canExport,
      capabilities,
      blocked,
    };
  }, [activeRoleId]);
}
