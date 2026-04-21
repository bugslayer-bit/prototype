/* ═══════════════════════════════════════════════════════════════════════════
   useScRoleCapabilities — Subscriptions & Contributions persona matrix
   ─────────────────────────────────────────────────────────────────────
   SRS actor → role mapping (derived from PD rows 107-109):
     • System Administrator       → role-admin
     • Authorised Agency User     → role-agency-staff
                                    (Step 1 entity master + Step 2 create txn)
     • Finance Officer            → role-finance-officer
                                    (Step 2 create payment txn + PO generation)
     • Head of Agency             → role-head-of-agency
                                    (Step 3 final approval + Step 4 lifecycle)
     • Auditor (RAA)              → role-auditor — read-only
     • Procurement                → read-only
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export type ScStep = 1 | 2 | 3 | 4;

export type ScPersonaTone =
  | "indigo"
  | "sky"
  | "blue"
  | "fuchsia"
  | "violet"
  | "emerald"
  | "rose"
  | "amber"
  | "slate";

export interface ScRoleCapabilities {
  activeRoleId: string | null;
  activeRoleName: string;
  personaTagline: string;
  personaTone: ScPersonaTone;

  canCreate: boolean;
  canEditEntity: boolean;
  canDelete: boolean;

  canEditStep: (step: ScStep) => boolean;

  canAttachDocs: boolean;        /* Step 1 */
  canCreateTxn: boolean;         /* Step 2 */
  canValidate: boolean;          /* Step 3 */
  canApprove: boolean;           /* Step 3 final */
  canReleasePayment: boolean;    /* Step 2 release */
  canLifecycle: boolean;         /* Step 4 */
  isReadOnly: boolean;

  homeStep: ScStep;

  capabilityList: string[];
  blockedList: string[];
}

interface PersonaSpec {
  name: string;
  tagline: string;
  tone: ScPersonaTone;
  steps: ScStep[];
  homeStep: ScStep;
  canCreate: boolean;
  canDelete: boolean;
  canAttachDocs: boolean;
  canCreateTxn: boolean;
  canValidate: boolean;
  canApprove: boolean;
  canReleasePayment: boolean;
  canLifecycle: boolean;
  capabilities: string[];
  blocked: string[];
}

const PERSONAS: Record<string, PersonaSpec> = {
  "role-admin": {
    name: "System Administrator",
    tagline:
      "Full access — every step is open and every action is enabled.",
    tone: "indigo",
    steps: [1, 2, 3, 4],
    homeStep: 1,
    canCreate: true,
    canDelete: true,
    canAttachDocs: true,
    canCreateTxn: true,
    canValidate: true,
    canApprove: true,
    canReleasePayment: true,
    canLifecycle: true,
    capabilities: [
      "Create / edit / delete subscription and contribution entities",
      "Attach supporting documents (PD row 107)",
      "Create payment transactions and generate payment orders (row 108)",
      "Run SRS validation rules and approval chain (row 109)",
      "Manage entity lifecycle (Active → Inactive → Suspended → Closed)",
    ],
    blocked: [],
  },
  "role-agency-staff": {
    name: "Authorised Agency User / Initiator",
    tagline:
      "Originator — registers the subscription/contribution entity and attaches supporting documents.",
    tone: "blue",
    steps: [1, 2],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canAttachDocs: true,
    canCreateTxn: true,
    canValidate: false,
    canApprove: false,
    canReleasePayment: false,
    canLifecycle: false,
    capabilities: [
      "Register new subscription / contribution entities (PD row 107)",
      "Upload membership certificates and commitment letters",
      "Raise draft payment transactions (row 108)",
    ],
    blocked: [
      "Run SRS validations",
      "Final approval",
      "Release payments through Cash Management",
      "Suspend / close entities (Head of Agency owns lifecycle)",
    ],
  },
  "role-finance-officer": {
    name: "Finance Officer",
    tagline:
      "Finance desk — creates payment transactions and routes them for approval (PD row 108).",
    tone: "sky",
    steps: [2],
    homeStep: 2,
    canCreate: false,
    canDelete: false,
    canAttachDocs: false,
    canCreateTxn: true,
    canValidate: false,
    canApprove: false,
    canReleasePayment: false,
    canLifecycle: false,
    capabilities: [
      "Create payment transactions against an approved entity",
      "Advance transactions to Under Validation / Approved",
      "Read the full entity master and document set",
    ],
    blocked: [
      "Create / amend entity master",
      "Validation and final approval",
      "Payment release (Payment Release Officer)",
    ],
  },
  "role-head-of-agency": {
    name: "Head of Agency",
    tagline:
      "Final approver — authorises payments and manages the entity lifecycle.",
    tone: "violet",
    steps: [3, 4],
    homeStep: 3,
    canCreate: false,
    canDelete: false,
    canAttachDocs: false,
    canCreateTxn: false,
    canValidate: true,
    canApprove: true,
    canReleasePayment: false,
    canLifecycle: true,
    capabilities: [
      "Final approval of payment transactions (PD row 108)",
      "Override validation checks with justification",
      "Move entity through lifecycle (Active → Inactive → Suspended → Closed)",
    ],
    blocked: [
      "Edit entity master or attach documents",
      "Release cash (Payment Release Officer)",
    ],
  },
  "role-normal-user": {
    name: "Normal User",
    tagline:
      "Operational user — can register entities and attach documents.",
    tone: "sky",
    steps: [1],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canAttachDocs: true,
    canCreateTxn: false,
    canValidate: false,
    canApprove: false,
    canReleasePayment: false,
    canLifecycle: false,
    capabilities: [
      "Register subscription / contribution entities",
      "Attach supporting documents",
    ],
    blocked: [
      "Raise payment transactions",
      "Validation, approval, payment release and lifecycle changes",
    ],
  },
  "role-auditor": {
    name: "Auditor (RAA)",
    tagline:
      "Read-only — Royal Audit Authority compliance review across every step.",
    tone: "rose",
    steps: [],
    homeStep: 1,
    canCreate: false,
    canDelete: false,
    canAttachDocs: false,
    canCreateTxn: false,
    canValidate: false,
    canApprove: false,
    canReleasePayment: false,
    canLifecycle: false,
    capabilities: [
      "Read every entity, document, transaction, validation and lifecycle row",
      "Cross-check against SRS PD rows 107-109 and DD 26.x",
    ],
    blocked: ["All write actions are disabled"],
  },
  "role-procurement": {
    name: "Procurement Officer",
    tagline:
      "Procurement desk — read-only for Subscriptions (owned by Finance / Agency).",
    tone: "amber",
    steps: [],
    homeStep: 1,
    canCreate: false,
    canDelete: false,
    canAttachDocs: false,
    canCreateTxn: false,
    canValidate: false,
    canApprove: false,
    canReleasePayment: false,
    canLifecycle: false,
    capabilities: ["Read every subscription / contribution record"],
    blocked: ["This module is owned by the Finance / Agency desk"],
  },
};

const DEFAULT_PERSONA: PersonaSpec = {
  name: "No active role",
  tagline:
    "Pick an active role from the top-bar switcher to enable Subscription / Contribution actions.",
  tone: "slate",
  steps: [],
  homeStep: 1,
  canCreate: false,
  canDelete: false,
  canAttachDocs: false,
  canCreateTxn: false,
  canValidate: false,
  canApprove: false,
  canReleasePayment: false,
  canLifecycle: false,
  capabilities: [],
  blocked: ["Sign in or pick an active role first"],
};

export function useScRoleCapabilities(): ScRoleCapabilities {
  const { activeRoleId } = useAuth();

  return useMemo(() => {
    const persona = (activeRoleId && PERSONAS[activeRoleId]) || DEFAULT_PERSONA;
    const steps = new Set<ScStep>(persona.steps);
    const isReadOnly =
      persona.steps.length === 0 &&
      !persona.canCreate &&
      !persona.canAttachDocs &&
      !persona.canCreateTxn &&
      !persona.canValidate &&
      !persona.canApprove &&
      !persona.canReleasePayment &&
      !persona.canLifecycle;

    return {
      activeRoleId,
      activeRoleName: persona.name,
      personaTagline: persona.tagline,
      personaTone: persona.tone,

      canCreate: persona.canCreate,
      canEditEntity: steps.has(1),
      canDelete: persona.canDelete,
      canEditStep: (s: ScStep) => steps.has(s),

      canAttachDocs: persona.canAttachDocs,
      canCreateTxn: persona.canCreateTxn,
      canValidate: persona.canValidate,
      canApprove: persona.canApprove,
      canReleasePayment: persona.canReleasePayment,
      canLifecycle: persona.canLifecycle,
      isReadOnly,

      homeStep: persona.homeStep,

      capabilityList: persona.capabilities,
      blockedList: persona.blocked,
    };
  }, [activeRoleId]);
}

export function scToneClasses(tone: ScPersonaTone): {
  border: string;
  bg: string;
  text: string;
  pill: string;
  dot: string;
} {
  const map: Record<
    ScPersonaTone,
    { border: string; bg: string; text: string; pill: string; dot: string }
  > = {
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
