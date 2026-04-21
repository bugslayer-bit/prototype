/* ═══════════════════════════════════════════════════════════════════════════
   usePayrollRoleCapabilities
   ──────────────────────────
   Single source of truth for what the active persona can do inside EVERY
   payroll sub-module. Driven entirely by AuthContext.activeRoleId.

   Payroll workflow: HR Officer → Finance Officer → Head of Agency
     • HR Officer        → Initiator (create, edit, submit payroll runs)
     • Finance Officer   → Reviewer  (verify computations, review paybills)
     • Head of Agency    → Approver  (final approval, authorise MCP posting)
     • System Admin      → God mode  (all actions)
     • Auditor           → Read-only (view + export)
     • Others            → View-only

   ZESt Integration: Employee master sync is HR-initiated, Finance-reviewed.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../shared/context/AuthContext";

export type PersonaTone =
  | "indigo"
  | "teal"
  | "sky"
  | "violet"
  | "rose"
  | "emerald"
  | "amber"
  | "cyan"
  | "slate";

export interface PayrollRoleCapabilities {
  /* Persona meta — drives banners, badges, tone */
  activeRoleId: string | null;
  activeRoleName: string;
  personaTagline: string;
  personaTone: PersonaTone;

  /* Payroll-wide capabilities */
  canInitiate: boolean;       /* Create new payroll runs, salary advances, muster rolls */
  canEditDraft: boolean;      /* Edit draft records before submission */
  canSubmit: boolean;         /* Submit for review */
  canReview: boolean;         /* Finance review step */
  canApprove: boolean;        /* HoA final approval */
  canPostMCP: boolean;        /* POST journal entries to MCP */
  canConfigureRules: boolean; /* Edit allowance/deduction config, pay scales */
  canSyncZESt: boolean;       /* Trigger ZESt HR data sync */
  canManageEmployees: boolean;/* Add/edit employee master records */
  canManageSchedule: boolean; /* Configure payroll schedule/calendar */
  canProcessMuster: boolean;  /* Create/edit muster rolls */
  canProcessSitting: boolean; /* Create/edit sitting fees & honorarium */
  canExport: boolean;         /* Export reports/data */
  isReadOnly: boolean;        /* Auditor / unknown */

  /* Convenience */
  capabilityList: string[];
  blockedList: string[];
}

/* ── Static persona table ───────────────────────────────────────────────── */
interface PersonaSpec {
  name: string;
  tagline: string;
  tone: PersonaTone;
  canInitiate: boolean;
  canEditDraft: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPostMCP: boolean;
  canConfigureRules: boolean;
  canSyncZESt: boolean;
  canManageEmployees: boolean;
  canManageSchedule: boolean;
  canProcessMuster: boolean;
  canProcessSitting: boolean;
  canExport: boolean;
  capabilities: string[];
  blocked: string[];
}

const PERSONAS: Record<string, PersonaSpec> = {
  "role-admin": {
    name: "System Administrator",
    tagline: "Full payroll access — every module, every action, every step.",
    tone: "indigo",
    canInitiate: true,
    canEditDraft: true,
    canSubmit: true,
    canReview: true,
    canApprove: true,
    canPostMCP: true,
    canConfigureRules: true,
    canSyncZESt: true,
    canManageEmployees: true,
    canManageSchedule: true,
    canProcessMuster: true,
    canProcessSitting: true,
    canExport: true,
    capabilities: [
      "Full payroll administration",
      "Configure pay scales, allowances & deductions",
      "Trigger ZESt sync & manage employee master",
      "Generate, review & approve payroll runs",
      "POST journal entries to MCP",
      "Process muster rolls & sitting fees",
    ],
    blocked: [],
  },
  "role-hr-officer": {
    name: "HR Officer",
    tagline: "Payroll initiator — manage employees (ZESt), generate payroll runs, salary advances, muster rolls & sitting fees. Submits to Finance for review.",
    tone: "teal",
    canInitiate: true,
    canEditDraft: true,
    canSubmit: true,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canConfigureRules: true,
    canSyncZESt: true,
    canManageEmployees: true,
    canManageSchedule: true,
    canProcessMuster: true,
    canProcessSitting: true,
    canExport: true,
    capabilities: [
      "Initiate & edit payroll runs",
      "Sync employee master from ZESt HR",
      "Configure allowances & deductions",
      "Set payroll schedule & calendar",
      "Create salary advance requests",
      "Process muster rolls & sitting fees",
      "Submit to Finance for review",
    ],
    blocked: [
      "Cannot review own submissions",
      "Cannot give final approval (HoA only)",
      "Cannot POST to MCP (requires approval)",
    ],
  },
  "role-finance-officer": {
    name: "Finance Officer",
    tagline: "Payroll reviewer — verify computations, review paybills, validate UCoA mappings. Forwards to HoA for final approval.",
    tone: "sky",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: true,
    canApprove: false,
    canPostMCP: false,
    canConfigureRules: false,
    canSyncZESt: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canExport: true,
    capabilities: [
      "Review & verify payroll computations",
      "Validate UCoA budget-head mappings",
      "Review salary advance requests",
      "Check muster roll & sitting fee payouts",
      "Forward to HoA for final approval",
      "Export payroll reports",
    ],
    blocked: [
      "Cannot initiate payroll runs (HR only)",
      "Cannot edit draft payroll data",
      "Cannot give final approval (HoA only)",
      "Cannot configure pay rules",
    ],
  },
  "role-head-of-agency": {
    name: "Head of Agency",
    tagline: "Final approver — authorise payroll runs, salary advances, muster roll payments. P-Level authority for MCP posting.",
    tone: "violet",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: true,
    canPostMCP: true,
    canConfigureRules: false,
    canSyncZESt: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canExport: true,
    capabilities: [
      "Final approval of payroll runs",
      "Approve salary advances",
      "Authorise muster roll & sitting fee payments",
      "Authorise MCP journal posting",
      "Export payroll reports",
    ],
    blocked: [
      "Cannot initiate or edit payroll data",
      "Cannot configure pay rules or schedule",
      "Cannot sync ZESt data",
    ],
  },
  "role-agency-staff": {
    name: "Agency Staff",
    tagline: "View-only access to payroll data. Operational data entry is handled by the HR Officer.",
    tone: "cyan",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canConfigureRules: false,
    canSyncZESt: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canExport: false,
    capabilities: ["View payroll summary & own payslip"],
    blocked: ["All payroll write actions (HR Officer role required)"],
  },
  "role-auditor": {
    name: "Auditor (RAA)",
    tagline: "Read-only — Royal Audit Authority compliance review across all payroll modules.",
    tone: "rose",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canConfigureRules: false,
    canSyncZESt: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canExport: true,
    capabilities: [
      "View all payroll data across every module",
      "Export payroll reports & audit trails",
      "Cross-check against SRS compliance",
    ],
    blocked: ["All write actions are disabled"],
  },
  "role-procurement": {
    name: "Procurement Officer",
    tagline: "Payroll is outside procurement scope — read-only access.",
    tone: "amber",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canConfigureRules: false,
    canSyncZESt: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canExport: false,
    capabilities: ["View payroll summary"],
    blocked: ["Payroll is managed by HR & Finance desks"],
  },
  "role-normal-user": {
    name: "Normal User",
    tagline: "View own payslip and salary advance status.",
    tone: "emerald",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canConfigureRules: false,
    canSyncZESt: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canExport: false,
    capabilities: ["View own payslip", "View salary advance status"],
    blocked: ["All payroll administration actions"],
  },
  "role-public": {
    name: "Public User",
    tagline: "No payroll access for external users.",
    tone: "slate",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canConfigureRules: false,
    canSyncZESt: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canExport: false,
    capabilities: [],
    blocked: ["Payroll access requires an internal role"],
  },
};

const DEFAULT_PERSONA: PersonaSpec = {
  name: "No active role",
  tagline: "Pick an active role from the top-bar role switcher to enable payroll actions.",
  tone: "slate",
  canInitiate: false,
  canEditDraft: false,
  canSubmit: false,
  canReview: false,
  canApprove: false,
  canPostMCP: false,
  canConfigureRules: false,
  canSyncZESt: false,
  canManageEmployees: false,
  canManageSchedule: false,
  canProcessMuster: false,
  canProcessSitting: false,
  canExport: false,
  capabilities: [],
  blocked: ["Sign in or pick an active role first"],
};

/* ── Hook ───────────────────────────────────────────────────────────────── */
export function usePayrollRoleCapabilities(): PayrollRoleCapabilities {
  const { activeRoleId } = useAuth();

  return useMemo(() => {
    const p = (activeRoleId && PERSONAS[activeRoleId]) || DEFAULT_PERSONA;
    const isReadOnly =
      !p.canInitiate && !p.canEditDraft && !p.canSubmit &&
      !p.canReview && !p.canApprove && !p.canPostMCP;

    return {
      activeRoleId,
      activeRoleName: p.name,
      personaTagline: p.tagline,
      personaTone: p.tone,

      canInitiate: p.canInitiate,
      canEditDraft: p.canEditDraft,
      canSubmit: p.canSubmit,
      canReview: p.canReview,
      canApprove: p.canApprove,
      canPostMCP: p.canPostMCP,
      canConfigureRules: p.canConfigureRules,
      canSyncZESt: p.canSyncZESt,
      canManageEmployees: p.canManageEmployees,
      canManageSchedule: p.canManageSchedule,
      canProcessMuster: p.canProcessMuster,
      canProcessSitting: p.canProcessSitting,
      canExport: p.canExport,
      isReadOnly,

      capabilityList: p.capabilities,
      blockedList: p.blocked,
    };
  }, [activeRoleId]);
}

/* ── Tone → Tailwind class lookup ───────────────────────────────────────── */
export function payrollToneClasses(tone: PersonaTone): {
  border: string;
  bg: string;
  text: string;
  pill: string;
  dot: string;
} {
  const map: Record<PersonaTone, {
    border: string; bg: string; text: string; pill: string; dot: string;
  }> = {
    indigo: {
      border: "border-indigo-200",
      bg: "bg-gradient-to-r from-indigo-50 via-white to-violet-50",
      text: "text-indigo-900",
      pill: "bg-indigo-100 text-indigo-700",
      dot: "bg-indigo-500",
    },
    teal: {
      border: "border-teal-200",
      bg: "bg-gradient-to-r from-teal-50 via-white to-cyan-50",
      text: "text-teal-900",
      pill: "bg-teal-100 text-teal-700",
      dot: "bg-teal-500",
    },
    sky: {
      border: "border-sky-200",
      bg: "bg-gradient-to-r from-sky-50 via-white to-blue-50",
      text: "text-sky-900",
      pill: "bg-sky-100 text-sky-700",
      dot: "bg-sky-500",
    },
    violet: {
      border: "border-violet-200",
      bg: "bg-gradient-to-r from-violet-50 via-white to-purple-50",
      text: "text-violet-900",
      pill: "bg-violet-100 text-violet-700",
      dot: "bg-violet-500",
    },
    rose: {
      border: "border-rose-200",
      bg: "bg-gradient-to-r from-rose-50 via-white to-red-50",
      text: "text-rose-900",
      pill: "bg-rose-100 text-rose-700",
      dot: "bg-rose-500",
    },
    emerald: {
      border: "border-emerald-200",
      bg: "bg-gradient-to-r from-emerald-50 via-white to-green-50",
      text: "text-emerald-900",
      pill: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    },
    amber: {
      border: "border-amber-200",
      bg: "bg-gradient-to-r from-amber-50 via-white to-orange-50",
      text: "text-amber-900",
      pill: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    cyan: {
      border: "border-cyan-200",
      bg: "bg-gradient-to-r from-cyan-50 via-white to-teal-50",
      text: "text-cyan-900",
      pill: "bg-cyan-100 text-cyan-700",
      dot: "bg-cyan-500",
    },
    slate: {
      border: "border-slate-200",
      bg: "bg-slate-50",
      text: "text-slate-700",
      pill: "bg-slate-100 text-slate-700",
      dot: "bg-slate-400",
    },
  };
  return map[tone];
}
