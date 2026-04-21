/* ═══════════════════════════════════════════════════════════════════════════
   useDebtRoleCapabilities
   ───────────────────────
   Single source of truth for what the current "Acting as" persona is allowed
   to do inside the Debt Payment Management module. Driven entirely by the
   active RBAC role from the top-bar role switcher (AuthContext.activeRoleId).

   Switching the active role re-runs this hook and re-renders every consumer
   instantly — buttons disable, steps lock, badges change colour, and the
   workspace deep-links to the step the persona is responsible for.

   SRS PRN 6.1 actor → role mapping:
     • System Administrator       → role-admin           (god mode)
     • Agency Staff               → role-agency-staff    (Step 1 — initiate)
     • Finance Officer            → role-finance-officer (Step 1-2 — review + release)
     • Head of Agency             → role-head-of-agency  (Step 3 — final approval)
     • Auditor (RAA)              → role-auditor         (read-only)
     • Normal User / Agency Staff → role-normal-user / role-agency-staff
                                                          (Step 1 origination)
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export type DebtStep = 1 | 2 | 3 | 4 | 5;

export interface DebtRoleCapabilities {
  /* Persona meta — drives badges and the role banner */
  activeRoleId: string | null;
  activeRoleName: string;
  personaTagline: string;
  personaTone: PersonaTone;

  /* CRUD on the debt servicing record */
  canCreate: boolean;
  canEditHeader: boolean;
  canDelete: boolean;

  /* Per-step write access */
  canEditStep: (step: DebtStep) => boolean;

  /* Approval / release / read */
  canValidate: boolean;        /* Step 3 */
  canApprove: boolean;         /* Step 4 — Meridian / authorisation */
  canRelease: boolean;         /* Step 5 — payment release */
  canViewAudit: boolean;       /* Step 5 read */
  isReadOnly: boolean;         /* Auditor / unknown role */

  /* Default step the workspace should open on for this persona */
  homeStep: DebtStep;

  /* Convenience labels for the persona banner */
  capabilityList: string[];
  blockedList: string[];
}

export type PersonaTone =
  | "indigo"
  | "sky"
  | "blue"
  | "fuchsia"
  | "violet"
  | "emerald"
  | "rose"
  | "amber"
  | "slate";

/* ── Static persona table ───────────────────────────────────────────────── */
interface PersonaSpec {
  name: string;
  tagline: string;
  tone: PersonaTone;
  steps: DebtStep[];           /* steps this persona can WRITE to */
  homeStep: DebtStep;
  canCreate: boolean;
  canDelete: boolean;
  canValidate: boolean;
  canApprove: boolean;
  canRelease: boolean;
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
    canValidate: true,
    canApprove: true,
    canRelease: true,
    capabilities: [
      "Create / edit / delete debt servicing records",
      "Capture donor master + DD 20.* header data",
      "Generate & edit payment orders",
      "Run validation checks (Step 3)",
      "Push to Meridian / authorise (Step 4)",
      "Release scheduled repayments (Step 5)",
    ],
    blocked: [],
  },
  "role-agency-staff": {
    name: "Agency Staff",
    tagline: "Agency-level operational user — captures debt servicing data.",
    tone: "sky",
    steps: [1],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    capabilities: [
      "Create new Debt Servicing records",
      "Capture donor + DD 20.* header data",
    ],
    blocked: [
      "Generate / release payment orders",
      "Run validation or approve",
    ],
  },
  "role-finance-officer": {
    name: "Finance Officer",
    tagline:
      "Finance desk — manages the debt instrument, generates payment orders and tracks releases.",
    tone: "sky",
    steps: [1, 2, 5],
    homeStep: 2,
    canCreate: true,
    canDelete: false,
    canValidate: false,
    canApprove: false,
    canRelease: true,
    capabilities: [
      "Edit donor + DD 20.* header (Step 1)",
      "Auto / manual payment order creation (Step 2)",
      "Track payment processing & exchange rates (Step 5)",
    ],
    blocked: [
      "First-line validation (Agency Finance only)",
      "Final P-Level authorisation (Head of Agency only)",
    ],
  },
  "role-head-of-agency": {
    name: "Head of Agency",
    tagline:
      "P-Level final approver — authorises the Meridian sync and final POST payment record.",
    tone: "violet",
    steps: [3, 4],
    homeStep: 4,
    canCreate: false,
    canDelete: false,
    canValidate: true,
    canApprove: true,
    canRelease: false,
    capabilities: [
      "Override / re-tick validation checks",
      "Push to Meridian or download MERIDIAN file (Step 4)",
      "Authorise the debt servicing for release",
    ],
    blocked: [
      "Edit donor or header (Step 1)",
      "Manually create new payment orders",
    ],
  },
  "role-normal-user": {
    name: "Normal User",
    tagline: "Operational user — can originate a debt servicing record.",
    tone: "sky",
    steps: [1],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    capabilities: [
      "Create new Debt Servicing records",
      "Capture donor + DD 20.* header data",
    ],
    blocked: [
      "Generate / release payment orders",
      "Run validation or approve",
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
    canValidate: false,
    canApprove: false,
    canRelease: false,
    capabilities: [
      "Read every donor, header, payment order, validation, Meridian log",
      "Export & cross-check data against SRS",
    ],
    blocked: ["All write actions are disabled"],
  },
  "role-procurement": {
    name: "Procurement Officer",
    tagline: "Procurement desk — read-only for debt servicing (handled by Finance).",
    tone: "amber",
    steps: [],
    homeStep: 1,
    canCreate: false,
    canDelete: false,
    canValidate: false,
    canApprove: false,
    canRelease: false,
    capabilities: ["Read every debt servicing record"],
    blocked: ["Debt servicing is owned by the Finance desk"],
  },
};

const DEFAULT_PERSONA: PersonaSpec = {
  name: "No active role",
  tagline:
    "Pick an active role from the top-bar role switcher to enable Debt Payment actions.",
  tone: "slate",
  steps: [],
  homeStep: 1,
  canCreate: false,
  canDelete: false,
  canValidate: false,
  canApprove: false,
  canRelease: false,
  capabilities: [],
  blocked: ["Sign in or pick an active role first"],
};

export function useDebtRoleCapabilities(): DebtRoleCapabilities {
  const { activeRoleId } = useAuth();

  return useMemo(() => {
    const persona = (activeRoleId && PERSONAS[activeRoleId]) || DEFAULT_PERSONA;
    const steps = new Set<DebtStep>(persona.steps);
    const isReadOnly =
      persona.steps.length === 0 &&
      !persona.canCreate &&
      !persona.canValidate &&
      !persona.canApprove &&
      !persona.canRelease;

    return {
      activeRoleId,
      activeRoleName: persona.name,
      personaTagline: persona.tagline,
      personaTone: persona.tone,

      canCreate: persona.canCreate,
      canEditHeader: steps.has(1),
      canDelete: persona.canDelete,
      canEditStep: (s: DebtStep) => steps.has(s),

      canValidate: persona.canValidate,
      canApprove: persona.canApprove,
      canRelease: persona.canRelease,
      canViewAudit: true, /* every signed-in role can read */
      isReadOnly,

      homeStep: persona.homeStep,

      capabilityList: persona.capabilities,
      blockedList: persona.blocked,
    };
  }, [activeRoleId]);
}

/* ── Tone → Tailwind class lookup (used by banners / pills) ────────────── */
export function debtToneClasses(tone: PersonaTone): {
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
