/* ═══════════════════════════════════════════════════════════════════════════
   useSbRoleCapabilities
   ─────────────────────
   Drives what the current "Acting as" persona can do inside the Social
   Benefits & Stipend module (SRS PRN rows 97-106).

   SRS actor → role mapping:
     • System Administrator                 → role-admin
     • Program Coordinator / Agency Staff   → role-agency-staff
                                              (Step 1 program + Step 2 onboarding)
     • Finance Officer                      → role-finance-officer
                                              (Step 2 finance review + Step 5 txn)
     • Head of Institution / Head of Agency → role-head-of-agency
                                              (Step 4 final approval + lifecycle)
     • Auditor (RAA)                        → role-auditor — read-only
     • Procurement                          → read-only
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";

export type SbStep = 1 | 2 | 3 | 4 | 5;

export type SbPersonaTone =
  | "indigo"
  | "sky"
  | "blue"
  | "fuchsia"
  | "violet"
  | "emerald"
  | "rose"
  | "amber"
  | "slate";

export interface SbRoleCapabilities {
  activeRoleId: string | null;
  activeRoleName: string;
  personaTagline: string;
  personaTone: SbPersonaTone;

  canCreate: boolean;
  canEditProgram: boolean;
  canDelete: boolean;

  canEditStep: (step: SbStep) => boolean;

  canOnboardBeneficiary: boolean; /* Step 2 */
  canManageDeductions: boolean;   /* Step 3 */
  canValidate: boolean;           /* Step 4 */
  canApprove: boolean;            /* Step 4 final */
  canProcessPayment: boolean;     /* Step 5 */
  canReleasePayment: boolean;     /* Step 5 release */
  isReadOnly: boolean;

  homeStep: SbStep;

  capabilityList: string[];
  blockedList: string[];
}

interface PersonaSpec {
  name: string;
  tagline: string;
  tone: SbPersonaTone;
  steps: SbStep[];
  homeStep: SbStep;
  canCreate: boolean;
  canDelete: boolean;
  canOnboardBeneficiary: boolean;
  canManageDeductions: boolean;
  canValidate: boolean;
  canApprove: boolean;
  canProcessPayment: boolean;
  canReleasePayment: boolean;
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
    canOnboardBeneficiary: true,
    canManageDeductions: true,
    canValidate: true,
    canApprove: true,
    canProcessPayment: true,
    canReleasePayment: true,
    capabilities: [
      "Create / edit / delete Social Benefit and Stipend programs",
      "Onboard beneficiaries (Step 2)",
      "Manage stipend deductions (Step 3)",
      "Run SRS validation rules and approval chain (Step 4)",
      "Generate and release payment orders (Step 5)",
    ],
    blocked: [],
  },
  "role-agency-staff": {
    name: "Program Coordinator / Initiator",
    tagline:
      "Coordinator — creates the program, onboards beneficiaries and sets stipend deductions.",
    tone: "blue",
    steps: [1, 2, 3],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canOnboardBeneficiary: true,
    canManageDeductions: true,
    canValidate: false,
    canApprove: false,
    canProcessPayment: false,
    canReleasePayment: false,
    capabilities: [
      "Create a program master (PRN row 99)",
      "Onboard beneficiaries and upload eligibility documents (row 98 / 102)",
      "Maintain stipend deduction rows (DD 28.10-28.12)",
    ],
    blocked: [
      "Run SRS validations",
      "Final approval",
      "Payment processing and release",
    ],
  },
  "role-finance-officer": {
    name: "Finance Officer",
    tagline:
      "Finance desk — reviews beneficiary roster and creates payment transactions.",
    tone: "sky",
    steps: [2, 3, 5],
    homeStep: 5,
    canCreate: false,
    canDelete: false,
    canOnboardBeneficiary: false,
    canManageDeductions: true,
    canValidate: false,
    canApprove: false,
    canProcessPayment: true,
    canReleasePayment: false,
    capabilities: [
      "Verify beneficiary profiles (PRN row 103)",
      "Adjust stipend deductions before payment",
      "Generate payment transactions and forward for approval (row 100 / 105)",
    ],
    blocked: [
      "Create or delete programs",
      "First-line validation and final approval",
      "Release payments (Payment Release role)",
    ],
  },
  "role-head-of-agency": {
    name: "Head of Institution / Head of Agency",
    tagline:
      "Final approver — authorises beneficiary registration and payment orders.",
    tone: "violet",
    steps: [4, 5],
    homeStep: 4,
    canCreate: false,
    canDelete: false,
    canOnboardBeneficiary: false,
    canManageDeductions: false,
    canValidate: true,
    canApprove: true,
    canProcessPayment: false,
    canReleasePayment: false,
    capabilities: [
      "Final approval of beneficiary rosters (PRN row 103)",
      "Approve payment transactions forwarded by Finance (row 100 / 105)",
      "Override validation checks with justification",
    ],
    blocked: [
      "Edit program master or onboard beneficiaries",
      "Release cash (Payment Release Officer)",
    ],
  },
  "role-normal-user": {
    name: "Normal User",
    tagline: "Operational user — can originate a program and onboard beneficiaries.",
    tone: "sky",
    steps: [1, 2],
    homeStep: 1,
    canCreate: true,
    canDelete: false,
    canOnboardBeneficiary: true,
    canManageDeductions: false,
    canValidate: false,
    canApprove: false,
    canProcessPayment: false,
    canReleasePayment: false,
    capabilities: [
      "Create program master records",
      "Onboard beneficiaries with supporting information",
    ],
    blocked: [
      "Manage deductions",
      "Validation, approval, and payment processing",
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
    canOnboardBeneficiary: false,
    canManageDeductions: false,
    canValidate: false,
    canApprove: false,
    canProcessPayment: false,
    canReleasePayment: false,
    capabilities: [
      "Read every program, beneficiary, deduction, validation and txn log",
      "Cross-check against SRS rows 97-106",
    ],
    blocked: ["All write actions are disabled"],
  },
  "role-procurement": {
    name: "Procurement Officer",
    tagline:
      "Procurement desk — read-only for Social Benefits (owned by Finance / Agency).",
    tone: "amber",
    steps: [],
    homeStep: 1,
    canCreate: false,
    canDelete: false,
    canOnboardBeneficiary: false,
    canManageDeductions: false,
    canValidate: false,
    canApprove: false,
    canProcessPayment: false,
    canReleasePayment: false,
    capabilities: ["Read every social benefits record"],
    blocked: ["This module is owned by the Finance / Agency desk"],
  },
};

const DEFAULT_PERSONA: PersonaSpec = {
  name: "No active role",
  tagline: "Pick an active role from the top-bar switcher to enable Social Benefit actions.",
  tone: "slate",
  steps: [],
  homeStep: 1,
  canCreate: false,
  canDelete: false,
  canOnboardBeneficiary: false,
  canManageDeductions: false,
  canValidate: false,
  canApprove: false,
  canProcessPayment: false,
  canReleasePayment: false,
  capabilities: [],
  blocked: ["Sign in or pick an active role first"],
};

export function useSbRoleCapabilities(): SbRoleCapabilities {
  const { activeRoleId } = useAuth();

  return useMemo(() => {
    const persona = (activeRoleId && PERSONAS[activeRoleId]) || DEFAULT_PERSONA;
    const steps = new Set<SbStep>(persona.steps);
    const isReadOnly =
      persona.steps.length === 0 &&
      !persona.canCreate &&
      !persona.canOnboardBeneficiary &&
      !persona.canManageDeductions &&
      !persona.canValidate &&
      !persona.canApprove &&
      !persona.canProcessPayment &&
      !persona.canReleasePayment;

    return {
      activeRoleId,
      activeRoleName: persona.name,
      personaTagline: persona.tagline,
      personaTone: persona.tone,

      canCreate: persona.canCreate,
      canEditProgram: steps.has(1),
      canDelete: persona.canDelete,
      canEditStep: (s: SbStep) => steps.has(s),

      canOnboardBeneficiary: persona.canOnboardBeneficiary,
      canManageDeductions: persona.canManageDeductions,
      canValidate: persona.canValidate,
      canApprove: persona.canApprove,
      canProcessPayment: persona.canProcessPayment,
      canReleasePayment: persona.canReleasePayment,
      isReadOnly,

      homeStep: persona.homeStep,

      capabilityList: persona.capabilities,
      blockedList: persona.blocked,
    };
  }, [activeRoleId]);
}

export function sbToneClasses(tone: SbPersonaTone): {
  border: string;
  bg: string;
  text: string;
  pill: string;
  dot: string;
} {
  const map: Record<SbPersonaTone, { border: string; bg: string; text: string; pill: string; dot: string }> = {
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
