/* ═══════════════════════════════════════════════════════════════════════════
   useFiRoleCapabilities
   ─────────────────────
   Single source of truth for what the current "Acting as" persona is allowed
   to do inside the Financial Institution Management module (SRS PRN 7.1).
   Driven entirely by AuthContext.activeRoleId — picking a different role from
   the top-bar switcher re-runs this hook and re-renders every consumer.

   SRS PRN 7.1 actor → role mapping:
     • System Administrator       → role-admin          (god mode)
     • FI Applicant / Normal User → role-normal-user
                                                         (Step 1 — apply)
     • Agency Staff               → role-agency-staff   (Step 1 — capture)
     • Finance Officer            → role-finance-officer(Step 1 + 3 profile)
     • Head of Agency             → role-head-of-agency (Step 2 — DTA Approver)
     • Procurement                → read-only
     • Auditor (RAA)              → read-only
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export type FiStep = 1 | 2 | 3 | 4 | 5;

export type FiPersonaTone =
  | "indigo"
  | "sky"
  | "blue"
  | "fuchsia"
  | "violet"
  | "emerald"
  | "rose"
  | "amber"
  | "slate";

export interface FiRoleCapabilities {
  activeRoleId: string | null;
  activeRoleName: string;
  personaTagline: string;
  personaTone: FiPersonaTone;

  canCreate: boolean;
  canEditHeader: boolean;
  canDelete: boolean;

  canEditStep: (step: FiStep) => boolean;

  canAttachDocs: boolean;   /* Step 1 */
  canValidate: boolean;     /* Step 2 */
  canApprove: boolean;      /* Step 2 final decision */
  canManageServices: boolean; /* Step 3 */
  canMonitor: boolean;      /* Step 4 */
  canLifecycle: boolean;    /* Step 5 — suspend / revoke / reactivate */
  isReadOnly: boolean;

  homeStep: FiStep;

  capabilityList: string[];
  blockedList: string[];
}

interface PersonaSpec {
  name: string;
  tagline: string;
  tone: FiPersonaTone;
  steps: FiStep[];
  homeStep: FiStep;
  canCreate: boolean;
  canDelete: boolean;
  canAttachDocs: boolean;
  canValidate: boolean;
  canApprove: boolean;
  canManageServices: boolean;
  canMonitor: boolean;
  canLifecycle: boolean;
  capabilities: string[];
  blocked: string[];
}

const PERSONAS: Record<string, PersonaSpec> = {
  "role-admin": {
    name: "System Administrator",
    tagline: "Full access — every step is open and every action is enabled.",
    tone: "indigo",
    steps: [1, 2, 3, 4, 5],
    homeStep: 1,
    canCreate: true,
    canDelete: true,
    canAttachDocs: true,
    canValidate: true,
    canApprove: true,
    canManageServices: true,
    canMonitor: true,
    canLifecycle: true,
    capabilities: [
      "Register / edit / delete Financial Institutions",
      "Attach and manage every supporting document",
      "Run validation checks and drive the RMA / DTA approval chain",
      "Manage service portfolio and risk profile (Step 3)",
      "Schedule and record monitoring reviews (Step 4)",
      "Suspend, revoke or reactivate any institution (Step 5)",
    ],
    blocked: [],
  },
  "role-finance-officer": {
    name: "Finance Officer",
    tagline:
      "Finance desk — captures the registration header and maintains the services profile.",
    tone: "sky",
    steps: [1, 3],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canAttachDocs: true,
    canValidate: false,
    canApprove: false,
    canManageServices: true,
    canMonitor: false,
    canLifecycle: false,
    capabilities: [
      "Edit registration header and attach supporting documents (Step 1)",
      "Manage the FI services portfolio (Step 3)",
      "Capture reporting currency, capital and turnover",
    ],
    blocked: [
      "First-line RMA validation (Agency Finance)",
      "DTA final authorisation (Head of Agency)",
      "Monitoring reviews and lifecycle actions",
    ],
  },
  "role-head-of-agency": {
    name: "Head of Agency / DTA Approver",
    tagline:
      "DTA Approver — authorises activation of the institution after full review.",
    tone: "violet",
    steps: [2, 5],
    homeStep: 2,
    canCreate: false,
    canDelete: false,
    canAttachDocs: false,
    canValidate: true,
    canApprove: true,
    canManageServices: false,
    canMonitor: false,
    canLifecycle: true,
    capabilities: [
      "Final-level approval of the registration (Step 2)",
      "Authorise lifecycle actions — Suspend / Revoke / Reactivate (Step 5)",
      "Override validation checks where justified",
    ],
    blocked: [
      "Edit header or services profile",
      "Record monitoring reviews",
    ],
  },
  "role-agency-staff": {
    name: "Agency Staff",
    tagline: "Agency-level operational user — captures registration and monitoring data.",
    tone: "sky",
    steps: [1, 4],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canAttachDocs: true,
    canValidate: false,
    canApprove: false,
    canManageServices: false,
    canMonitor: true,
    canLifecycle: false,
    capabilities: [
      "Register new Financial Institutions (Step 1)",
      "Attach documents & evidence",
      "Record monitoring review entries (Step 4)",
    ],
    blocked: [
      "Run validation or approve",
      "Manage services profile",
      "Lifecycle actions",
    ],
  },
  "role-normal-user": {
    name: "Normal User",
    tagline: "Operational user — can originate a Financial Institution registration.",
    tone: "sky",
    steps: [1],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canAttachDocs: true,
    canValidate: false,
    canApprove: false,
    canManageServices: false,
    canMonitor: false,
    canLifecycle: false,
    capabilities: [
      "Register a new Financial Institution",
      "Attach supporting documents",
    ],
    blocked: [
      "Run validation or approve",
      "Manage services / monitoring / lifecycle",
    ],
  },
  "role-auditor": {
    name: "Auditor (RAA)",
    tagline: "Read-only — Royal Audit Authority compliance review across every step.",
    tone: "rose",
    steps: [],
    homeStep: 1,
    canCreate: false,
    canDelete: false,
    canAttachDocs: false,
    canValidate: false,
    canApprove: false,
    canManageServices: false,
    canMonitor: false,
    canLifecycle: false,
    capabilities: [
      "Read every FI header, document, approval, service and monitoring log",
      "Cross-check data against SRS PRN 7.1 requirements",
    ],
    blocked: ["All write actions are disabled"],
  },
  "role-procurement": {
    name: "Procurement Officer",
    tagline: "Procurement desk — read-only for FI Management (owned by Finance).",
    tone: "amber",
    steps: [],
    homeStep: 1,
    canCreate: false,
    canDelete: false,
    canAttachDocs: false,
    canValidate: false,
    canApprove: false,
    canManageServices: false,
    canMonitor: false,
    canLifecycle: false,
    capabilities: ["Read every FI registration record"],
    blocked: ["FI Management is owned by the Finance / DTA desk"],
  },
};

const DEFAULT_PERSONA: PersonaSpec = {
  name: "No active role",
  tagline: "Pick an active role from the top-bar switcher to enable FI actions.",
  tone: "slate",
  steps: [],
  homeStep: 1,
  canCreate: false,
  canDelete: false,
  canAttachDocs: false,
  canValidate: false,
  canApprove: false,
  canManageServices: false,
  canMonitor: false,
  canLifecycle: false,
  capabilities: [],
  blocked: ["Sign in or pick an active role first"],
};

export function useFiRoleCapabilities(): FiRoleCapabilities {
  const { activeRoleId } = useAuth();

  return useMemo(() => {
    const persona = (activeRoleId && PERSONAS[activeRoleId]) || DEFAULT_PERSONA;
    const steps = new Set<FiStep>(persona.steps);
    const isReadOnly =
      persona.steps.length === 0 &&
      !persona.canCreate &&
      !persona.canValidate &&
      !persona.canApprove &&
      !persona.canManageServices &&
      !persona.canMonitor &&
      !persona.canLifecycle;

    return {
      activeRoleId,
      activeRoleName: persona.name,
      personaTagline: persona.tagline,
      personaTone: persona.tone,

      canCreate: persona.canCreate,
      canEditHeader: steps.has(1),
      canDelete: persona.canDelete,
      canEditStep: (s: FiStep) => steps.has(s),

      canAttachDocs: persona.canAttachDocs,
      canValidate: persona.canValidate,
      canApprove: persona.canApprove,
      canManageServices: persona.canManageServices,
      canMonitor: persona.canMonitor,
      canLifecycle: persona.canLifecycle,
      isReadOnly,

      homeStep: persona.homeStep,

      capabilityList: persona.capabilities,
      blockedList: persona.blocked,
    };
  }, [activeRoleId]);
}

/* ── Tone → Tailwind class lookup ───────────────────────────────────── */
export function fiToneClasses(tone: FiPersonaTone): {
  border: string;
  bg: string;
  text: string;
  pill: string;
  dot: string;
} {
  const map: Record<FiPersonaTone, { border: string; bg: string; text: string; pill: string; dot: string }> = {
    indigo: { border: "border-indigo-200", bg: "bg-gradient-to-r from-indigo-50 via-white to-violet-50", text: "text-indigo-900", pill: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
    sky: { border: "border-sky-200", bg: "bg-gradient-to-r from-sky-50 via-white to-blue-50", text: "text-sky-900", pill: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
    blue: { border: "border-blue-200", bg: "bg-gradient-to-r from-blue-50 via-white to-indigo-50", text: "text-blue-900", pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    fuchsia: { border: "border-fuchsia-200", bg: "bg-gradient-to-r from-fuchsia-50 via-white to-pink-50", text: "text-fuchsia-900", pill: "bg-fuchsia-100 text-fuchsia-700", dot: "bg-fuchsia-500" },
    violet: { border: "border-violet-200", bg: "bg-gradient-to-r from-violet-50 via-white to-purple-50", text: "text-violet-900", pill: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
    emerald: { border: "border-emerald-200", bg: "bg-gradient-to-r from-emerald-50 via-white to-green-50", text: "text-emerald-900", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    rose: { border: "border-rose-200", bg: "bg-gradient-to-r from-rose-50 via-white to-red-50", text: "text-rose-900", pill: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
    amber: { border: "border-amber-200", bg: "bg-gradient-to-r from-amber-50 via-white to-orange-50", text: "text-amber-900", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    slate: { border: "border-slate-200", bg: "bg-slate-50", text: "text-slate-700", pill: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  };
  return map[tone];
}
