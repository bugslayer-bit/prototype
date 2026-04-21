/* ═══════════════════════════════════════════════════════════════════════════
   useSoeRoleCapabilities
   ──────────────────────
   Single source of truth for what the current "Acting as" persona is allowed
   to do inside the SOE & Fund Transfer Management module.
   Driven entirely by AuthContext.activeRoleId — picking a different role from
   the top-bar switcher re-runs this hook and re-renders every consumer.

   SRS PRN 6.2 actor → role mapping:
     • System Administrator       → role-admin          (god mode)
     • Agency Staff / Normal User → role-agency-staff / role-normal-user
                                                         (Step 1 — originate)
     • Finance Officer            → role-finance-officer(Step 1-2 + reconcile)
     • Head of Agency             → role-head-of-agency (Step 3-4 — P-Level approval)
     • Procurement                → read-only
     • Auditor (RAA)              → read-only
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export type SoeStep = 1 | 2 | 3 | 4 | 5;

export type SoePersonaTone =
  | "indigo"
  | "sky"
  | "blue"
  | "fuchsia"
  | "violet"
  | "emerald"
  | "rose"
  | "amber"
  | "slate";

export interface SoeRoleCapabilities {
  activeRoleId: string | null;
  activeRoleName: string;
  personaTagline: string;
  personaTone: SoePersonaTone;

  canCreate: boolean;
  canEditHeader: boolean;
  canDelete: boolean;

  canEditStep: (step: SoeStep) => boolean;

  canAttachSoe: boolean;   /* Step 2 */
  canValidate: boolean;    /* Step 3 */
  canApprove: boolean;     /* Step 3 final / Step 4 release auth */
  canRelease: boolean;     /* Step 4 */
  canReconcile: boolean;   /* Step 5 */
  isReadOnly: boolean;

  homeStep: SoeStep;

  capabilityList: string[];
  blockedList: string[];
}

interface PersonaSpec {
  name: string;
  tagline: string;
  tone: SoePersonaTone;
  steps: SoeStep[];
  homeStep: SoeStep;
  canCreate: boolean;
  canDelete: boolean;
  canAttachSoe: boolean;
  canValidate: boolean;
  canApprove: boolean;
  canRelease: boolean;
  canReconcile: boolean;
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
    canAttachSoe: true,
    canValidate: true,
    canApprove: true,
    canRelease: true,
    canReconcile: true,
    capabilities: [
      "Create / edit / delete Fund Transfer transactions",
      "Attach Statement-of-Expenditure lines & supporting documents",
      "Run validation checks & drive the approval chain",
      "Release funds via any channel (RMA / Meridian / SWIFT / Manual)",
      "Reconcile against bank statements (Step 5)",
    ],
    blocked: [],
  },
  "role-agency-staff": {
    name: "Agency Staff",
    tagline: "Agency-level operational user — captures transfer & SoE data.",
    tone: "sky",
    steps: [1, 2],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canAttachSoe: true,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    canReconcile: false,
    capabilities: [
      "Create new Fund Transfer transactions",
      "Attach SoE lines & supporting documents",
    ],
    blocked: [
      "Run validation or approve",
      "Release funds",
      "Reconcile against bank statements",
    ],
  },
  "role-finance-officer": {
    name: "Finance Officer",
    tagline:
      "Finance desk — manages transfer headers, SoE lines and bank-reconciliation.",
    tone: "sky",
    steps: [1, 2, 5],
    homeStep: 2,
    canCreate: true,
    canDelete: false,
    canAttachSoe: true,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    canReconcile: true,
    capabilities: [
      "Edit transfer header & SoE lines (Step 1-2)",
      "Capture exchange rates, narrative and budget head codes",
      "Reconcile releases against bank statements (Step 5)",
    ],
    blocked: [
      "First-line validation (Agency Finance only)",
      "Parliament / P-Level authorisation (Head of Agency only)",
      "Execute release to core banking",
    ],
  },
  "role-head-of-agency": {
    name: "Head of Agency",
    tagline:
      "P-Level approver — authorises the transfer after Parliament sanction.",
    tone: "violet",
    steps: [3, 4],
    homeStep: 4,
    canCreate: false,
    canDelete: false,
    canAttachSoe: false,
    canValidate: true,
    canApprove: true,
    canRelease: false,
    canReconcile: false,
    capabilities: [
      "Final-level approval of the transfer (Step 3)",
      "Authorise the release against Parliament sanction (Step 4)",
      "Override validation checks where justified",
    ],
    blocked: [
      "Edit header or SoE lines",
      "Execute the release at the bank",
    ],
  },
  "role-normal-user": {
    name: "Normal User",
    tagline: "Operational user — can originate a Fund Transfer transaction.",
    tone: "sky",
    steps: [1, 2],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canAttachSoe: true,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    canReconcile: false,
    capabilities: [
      "Create new Fund Transfer transactions",
      "Attach SoE lines & supporting documents",
    ],
    blocked: [
      "Run validation or approve",
      "Release funds",
      "Reconcile against bank statements",
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
    canAttachSoe: false,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    canReconcile: false,
    capabilities: [
      "Read every transfer header, SoE line, approval, release & reconciliation",
      "Cross-check data against SRS appropriations",
    ],
    blocked: ["All write actions are disabled"],
  },
  "role-procurement": {
    name: "Procurement Officer",
    tagline: "Procurement desk — read-only for SOE & Fund Transfer (owned by Finance).",
    tone: "amber",
    steps: [],
    homeStep: 1,
    canCreate: false,
    canDelete: false,
    canAttachSoe: false,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    canReconcile: false,
    capabilities: ["Read every SOE & Fund Transfer record"],
    blocked: ["SOE & Fund Transfer is owned by the Finance desk"],
  },
};

const DEFAULT_PERSONA: PersonaSpec = {
  name: "No active role",
  tagline: "Pick an active role from the top-bar switcher to enable SOE actions.",
  tone: "slate",
  steps: [],
  homeStep: 1,
  canCreate: false,
  canDelete: false,
  canAttachSoe: false,
  canValidate: false,
  canApprove: false,
  canRelease: false,
  canReconcile: false,
  capabilities: [],
  blocked: ["Sign in or pick an active role first"],
};

export function useSoeRoleCapabilities(): SoeRoleCapabilities {
  const { activeRoleId } = useAuth();

  return useMemo(() => {
    const persona = (activeRoleId && PERSONAS[activeRoleId]) || DEFAULT_PERSONA;
    const steps = new Set<SoeStep>(persona.steps);
    const isReadOnly =
      persona.steps.length === 0 &&
      !persona.canCreate &&
      !persona.canValidate &&
      !persona.canApprove &&
      !persona.canRelease &&
      !persona.canReconcile;

    return {
      activeRoleId,
      activeRoleName: persona.name,
      personaTagline: persona.tagline,
      personaTone: persona.tone,

      canCreate: persona.canCreate,
      canEditHeader: steps.has(1),
      canDelete: persona.canDelete,
      canEditStep: (s: SoeStep) => steps.has(s),

      canAttachSoe: persona.canAttachSoe,
      canValidate: persona.canValidate,
      canApprove: persona.canApprove,
      canRelease: persona.canRelease,
      canReconcile: persona.canReconcile,
      isReadOnly,

      homeStep: persona.homeStep,

      capabilityList: persona.capabilities,
      blockedList: persona.blocked,
    };
  }, [activeRoleId]);
}

/* ── Tone → Tailwind class lookup ───────────────────────────────────── */
export function soeToneClasses(tone: SoePersonaTone): {
  border: string;
  bg: string;
  text: string;
  pill: string;
  dot: string;
} {
  const map: Record<SoePersonaTone, {
    border: string; bg: string; text: string; pill: string; dot: string;
  }> = {
    indigo: {
      border: "border-indigo-200",
      bg: "bg-gradient-to-r from-indigo-50 via-white to-violet-50",
      text: "text-indigo-900",
      pill: "bg-indigo-100 text-indigo-700",
      dot: "bg-indigo-500",
    },
    sky: {
      border: "border-sky-200",
      bg: "bg-gradient-to-r from-sky-50 via-white to-blue-50",
      text: "text-sky-900",
      pill: "bg-sky-100 text-sky-700",
      dot: "bg-sky-500",
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-gradient-to-r from-blue-50 via-white to-indigo-50",
      text: "text-blue-900",
      pill: "bg-blue-100 text-blue-700",
      dot: "bg-blue-500",
    },
    fuchsia: {
      border: "border-fuchsia-200",
      bg: "bg-gradient-to-r from-fuchsia-50 via-white to-pink-50",
      text: "text-fuchsia-900",
      pill: "bg-fuchsia-100 text-fuchsia-700",
      dot: "bg-fuchsia-500",
    },
    violet: {
      border: "border-violet-200",
      bg: "bg-gradient-to-r from-violet-50 via-white to-purple-50",
      text: "text-violet-900",
      pill: "bg-violet-100 text-violet-700",
      dot: "bg-violet-500",
    },
    emerald: {
      border: "border-emerald-200",
      bg: "bg-gradient-to-r from-emerald-50 via-white to-green-50",
      text: "text-emerald-900",
      pill: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    },
    rose: {
      border: "border-rose-200",
      bg: "bg-gradient-to-r from-rose-50 via-white to-red-50",
      text: "text-rose-900",
      pill: "bg-rose-100 text-rose-700",
      dot: "bg-rose-500",
    },
    amber: {
      border: "border-amber-200",
      bg: "bg-gradient-to-r from-amber-50 via-white to-orange-50",
      text: "text-amber-900",
      pill: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
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
