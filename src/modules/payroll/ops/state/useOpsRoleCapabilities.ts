/* ═══════════════════════════════════════════════════════════════════════════
   useOpsRoleCapabilities
   ──────────────────────
   Drives what the current "Acting as" persona can do inside the OPS Payroll
   module. Fixes the bug where user.role was always "admin" or "public"
   (AppMode), by reading activeRoleId from useAuth() instead.

   OPS workflow: HR Officer → Finance Officer → Head of Agency
     • HR Officer        → Initiator (create, edit, submit payroll runs)
     • Finance Officer   → Reviewer  (verify computations, review paybills)
     • Head of Agency    → Approver  (final approval, authorise MCP posting)
     • System Admin      → God mode  (all actions)
     • Auditor           → Read-only (view + export)
     • Procurement       → Read-only (view only)
     • Agency Staff      → Initiator (limited: initiate, edit, submit, export)
     • Normal User       → Read-only (view only)
     • Public User       → Read-only (view only)
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export type OpsPersonaTone =
  | "indigo"
  | "emerald"
  | "sky"
  | "fuchsia"
  | "amber"
  | "blue"
  | "violet"
  | "slate"
  | "rose";

export interface OpsPayrollCapabilities {
  /* Persona meta — drives banners, badges, tone */
  activeRoleId: string | null;
  activeRoleName: string;
  personaTagline: string;
  personaTone: OpsPersonaTone;

  /* OPS-specific capabilities */
  canInitiate: boolean;
  canEditDraft: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPostMCP: boolean;
  canExport: boolean;
  canConfigureRules: boolean;
  canManageEmployees: boolean;
  canManageSchedule: boolean;
  canProcessMuster: boolean;
  canProcessSitting: boolean;
  canProcessTravel: boolean;
  canProcessHonorarium: boolean;
  isReadOnly: boolean;

  /* Convenience */
  capabilityList: string[];
  blockedList: string[];
}

/* ── Static persona table ───────────────────────────────────────────────── */
interface PersonaSpec {
  name: string;
  tagline: string;
  tone: OpsPersonaTone;
  canInitiate: boolean;
  canEditDraft: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPostMCP: boolean;
  canExport: boolean;
  canConfigureRules: boolean;
  canManageEmployees: boolean;
  canManageSchedule: boolean;
  canProcessMuster: boolean;
  canProcessSitting: boolean;
  canProcessTravel: boolean;
  canProcessHonorarium: boolean;
  capabilities: string[];
  blocked: string[];
}

const PERSONAS: Record<string, PersonaSpec> = {
  "role-admin": {
    name: "System Administrator",
    tagline: "Full OPS payroll access — every module, every action, every step.",
    tone: "indigo",
    canInitiate: true,
    canEditDraft: true,
    canSubmit: true,
    canReview: true,
    canApprove: true,
    canPostMCP: true,
    canExport: true,
    canConfigureRules: true,
    canManageEmployees: true,
    canManageSchedule: true,
    canProcessMuster: true,
    canProcessSitting: true,
    canProcessTravel: true,
    canProcessHonorarium: true,
    capabilities: [
      "Full OPS payroll administration",
      "Configure pay scales, allowances & deductions",
      "Manage employee records & payroll schedules",
      "Generate, review & approve payroll runs",
      "POST journal entries to MCP",
      "Process muster rolls, sitting fees, travel claims & honorarium",
    ],
    blocked: [],
  },
  "role-hr-officer": {
    name: "HR Officer",
    tagline: "OPS payroll initiator — manage employees, generate payroll runs, salary advances, muster rolls, sitting fees, travel claims & honorarium. Submits to Finance for review.",
    tone: "emerald",
    canInitiate: true,
    canEditDraft: true,
    canSubmit: true,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canExport: true,
    canConfigureRules: true,
    canManageEmployees: true,
    canManageSchedule: true,
    canProcessMuster: true,
    canProcessSitting: true,
    canProcessTravel: true,
    canProcessHonorarium: true,
    capabilities: [
      "Initiate & edit OPS payroll runs",
      "Configure allowances & deductions",
      "Set payroll schedule & calendar",
      "Manage employee master records",
      "Process muster rolls",
      "Process sitting fees & honorarium",
      "Process travel claims",
      "Submit to Finance for review",
      "Export payroll reports",
    ],
    blocked: [
      "Cannot review own submissions",
      "Cannot give final approval (HoA only)",
      "Cannot POST to MCP (requires approval)",
    ],
  },
  "role-finance-officer": {
    name: "Finance Officer",
    tagline: "OPS payroll reviewer — verify computations, review paybills, validate mappings. Forwards to HoA for final approval.",
    tone: "sky",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: true,
    canApprove: false,
    canPostMCP: false,
    canExport: true,
    canConfigureRules: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canProcessTravel: true,
    canProcessHonorarium: false,
    capabilities: [
      "Review & verify OPS payroll computations",
      "Validate budget-head mappings",
      "Review travel claims",
      "Forward to HoA for final approval",
      "Export payroll reports",
    ],
    blocked: [
      "Cannot initiate payroll runs (HR only)",
      "Cannot edit draft payroll data",
      "Cannot give final approval (HoA only)",
      "Cannot configure pay rules",
      "Cannot manage employees or schedules",
    ],
  },
  "role-head-of-agency": {
    name: "Head of Agency",
    tagline: "Final approver — authorise OPS payroll runs, salary advances, muster roll payments. P-Level authority for MCP posting.",
    tone: "fuchsia",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: true,
    canApprove: true,
    canPostMCP: true,
    canExport: true,
    canConfigureRules: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canProcessTravel: false,
    canProcessHonorarium: false,
    capabilities: [
      "Final approval of OPS payroll runs",
      "Approve salary advances",
      "Authorise muster roll & sitting fee payments",
      "Authorise MCP journal posting",
      "Export payroll reports",
    ],
    blocked: [
      "Cannot initiate or edit payroll data",
      "Cannot configure pay rules or schedule",
      "Cannot manage employees",
    ],
  },
  "role-procurement": {
    name: "Procurement Officer",
    tagline: "OPS payroll is outside procurement scope — read-only access.",
    tone: "amber",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canExport: true,
    canConfigureRules: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canProcessTravel: false,
    canProcessHonorarium: false,
    capabilities: ["View OPS payroll summary"],
    blocked: ["OPS payroll is managed by HR & Finance desks"],
  },
  "role-agency-staff": {
    name: "Agency Staff",
    tagline: "OPS initiator — can initiate, edit, and submit payroll records. Limited to creation and submission tasks.",
    tone: "blue",
    canInitiate: true,
    canEditDraft: true,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canExport: true,
    canConfigureRules: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canProcessTravel: false,
    canProcessHonorarium: false,
    capabilities: [
      "Initiate & edit OPS payroll records",
      "Create salary advance requests",
      "Export payroll summaries",
    ],
    blocked: [
      "Cannot submit for review",
      "Cannot approve records",
      "Cannot configure rules",
      "Cannot manage schedules",
    ],
  },
  "role-auditor": {
    name: "Auditor (RAA)",
    tagline: "Read-only — Royal Audit Authority compliance review across all OPS payroll modules.",
    tone: "violet",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canExport: true,
    canConfigureRules: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canProcessTravel: false,
    canProcessHonorarium: false,
    capabilities: [
      "View all OPS payroll data across every module",
      "Export payroll reports & audit trails",
      "Cross-check against SRS compliance",
    ],
    blocked: ["All write actions are disabled"],
  },
  "role-normal-user": {
    name: "Normal User",
    tagline: "View-only access to OPS payroll data.",
    tone: "slate",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canExport: false,
    canConfigureRules: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canProcessTravel: false,
    canProcessHonorarium: false,
    capabilities: ["View OPS payroll summary"],
    blocked: ["All payroll write actions (HR Officer role required)"],
  },
  "role-public": {
    name: "Public User",
    tagline: "No OPS payroll access for external users.",
    tone: "rose",
    canInitiate: false,
    canEditDraft: false,
    canSubmit: false,
    canReview: false,
    canApprove: false,
    canPostMCP: false,
    canExport: false,
    canConfigureRules: false,
    canManageEmployees: false,
    canManageSchedule: false,
    canProcessMuster: false,
    canProcessSitting: false,
    canProcessTravel: false,
    canProcessHonorarium: false,
    capabilities: [],
    blocked: ["OPS payroll access requires an internal role"],
  },
};

const DEFAULT_PERSONA: PersonaSpec = {
  name: "No active role",
  tagline: "Pick an active role from the top-bar role switcher to enable OPS payroll actions.",
  tone: "slate",
  canInitiate: false,
  canEditDraft: false,
  canSubmit: false,
  canReview: false,
  canApprove: false,
  canPostMCP: false,
  canExport: false,
  canConfigureRules: false,
  canManageEmployees: false,
  canManageSchedule: false,
  canProcessMuster: false,
  canProcessSitting: false,
  canProcessTravel: false,
  canProcessHonorarium: false,
  capabilities: [],
  blocked: ["Sign in or pick an active role first"],
};

/* ── Hook ───────────────────────────────────────────────────────────────── */
export function useOpsRoleCapabilities(): OpsPayrollCapabilities {
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
      canExport: p.canExport,
      canConfigureRules: p.canConfigureRules,
      canManageEmployees: p.canManageEmployees,
      canManageSchedule: p.canManageSchedule,
      canProcessMuster: p.canProcessMuster,
      canProcessSitting: p.canProcessSitting,
      canProcessTravel: p.canProcessTravel,
      canProcessHonorarium: p.canProcessHonorarium,
      isReadOnly,

      capabilityList: p.capabilities,
      blockedList: p.blocked,
    };
  }, [activeRoleId]);
}

/* ── Tone → Tailwind class lookup ───────────────────────────────────────── */
export function opsPayrollToneClasses(tone: OpsPersonaTone): {
  border: string;
  bg: string;
  text: string;
  pill: string;
  dot: string;
} {
  const map: Record<OpsPersonaTone, {
    border: string; bg: string; text: string; pill: string; dot: string;
  }> = {
    indigo: {
      border: "border-indigo-200",
      bg: "bg-gradient-to-r from-indigo-50 via-white to-violet-50",
      text: "text-indigo-900",
      pill: "bg-indigo-100 text-indigo-700",
      dot: "bg-indigo-500",
    },
    emerald: {
      border: "border-emerald-200",
      bg: "bg-gradient-to-r from-emerald-50 via-white to-green-50",
      text: "text-emerald-900",
      pill: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    },
    sky: {
      border: "border-sky-200",
      bg: "bg-gradient-to-r from-sky-50 via-white to-blue-50",
      text: "text-sky-900",
      pill: "bg-sky-100 text-sky-700",
      dot: "bg-sky-500",
    },
    fuchsia: {
      border: "border-fuchsia-200",
      bg: "bg-gradient-to-r from-fuchsia-50 via-white to-pink-50",
      text: "text-fuchsia-900",
      pill: "bg-fuchsia-100 text-fuchsia-700",
      dot: "bg-fuchsia-500",
    },
    amber: {
      border: "border-amber-200",
      bg: "bg-gradient-to-r from-amber-50 via-white to-orange-50",
      text: "text-amber-900",
      pill: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-gradient-to-r from-blue-50 via-white to-indigo-50",
      text: "text-blue-900",
      pill: "bg-blue-100 text-blue-700",
      dot: "bg-blue-500",
    },
    violet: {
      border: "border-violet-200",
      bg: "bg-gradient-to-r from-violet-50 via-white to-purple-50",
      text: "text-violet-900",
      pill: "bg-violet-100 text-violet-700",
      dot: "bg-violet-500",
    },
    slate: {
      border: "border-slate-200",
      bg: "bg-slate-50",
      text: "text-slate-700",
      pill: "bg-slate-100 text-slate-700",
      dot: "bg-slate-400",
    },
    rose: {
      border: "border-rose-200",
      bg: "bg-gradient-to-r from-rose-50 via-white to-red-50",
      text: "text-rose-900",
      pill: "bg-rose-100 text-rose-700",
      dot: "bg-rose-500",
    },
  };
  return map[tone];
}

/**
 * Check if user can perform a specific action
 */
export function canPerformOpsAction(
  capabilities: OpsPayrollCapabilities,
  action:
    | "initiate"
    | "edit"
    | "submit"
    | "review"
    | "approve"
    | "post"
    | "export"
    | "configure"
    | "manage-employees"
    | "manage-schedule"
    | "process-muster"
    | "process-sitting"
    | "process-travel"
    | "process-honorarium"
): boolean {
  if (capabilities.isReadOnly && action !== "export") {
    return false;
  }

  switch (action) {
    case "initiate":
      return capabilities.canInitiate;
    case "edit":
      return capabilities.canEditDraft;
    case "submit":
      return capabilities.canSubmit;
    case "review":
      return capabilities.canReview;
    case "approve":
      return capabilities.canApprove;
    case "post":
      return capabilities.canPostMCP;
    case "export":
      return capabilities.canExport;
    case "configure":
      return capabilities.canConfigureRules;
    case "manage-employees":
      return capabilities.canManageEmployees;
    case "manage-schedule":
      return capabilities.canManageSchedule;
    case "process-muster":
      return capabilities.canProcessMuster;
    case "process-sitting":
      return capabilities.canProcessSitting;
    case "process-travel":
      return capabilities.canProcessTravel;
    case "process-honorarium":
      return capabilities.canProcessHonorarium;
    default:
      return false;
  }
}

/**
 * Get user-friendly role label
 */
export function getOpsRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    "role-admin": "Administrator",
    "role-hr-officer": "HR Officer",
    "role-finance-officer": "Finance Officer",
    "role-head-of-agency": "Head of Agency",
    "role-procurement": "Procurement Officer",
    "role-agency-staff": "Agency Staff",
    "role-auditor": "Auditor",
    "role-normal-user": "Normal User",
    "role-public": "Public User",
  };

  return labels[role?.toLowerCase()] || "Unknown Role";
}
