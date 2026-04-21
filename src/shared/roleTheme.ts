/* ═══════════════════════════════════════════════════════════════════════════
   roleTheme — Central mapping from active RBAC role → UI theme.
   Drives the role-switcher chip, header banner, and any role-aware chrome
   in the admin shell. Everything that needs to *look* different for a
   persona should read from this helper rather than hard-coding colors.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface RoleTheme {
  /** Short label shown in the right-side portal badge (e.g. "Admin Portal"). */
  portalLabel: string;
  /** Human-readable persona name used in the header banner. */
  personaName: string;
  /** One-line description of what this persona is acting as. */
  personaTagline: string;
  /** Tailwind gradient for the role-switcher avatar dot. */
  avatarGradient: string;
  /** Tailwind classes for the right-side portal chip. */
  portalChipClass: string;
  /** Tailwind classes for the top-bar banner background. */
  bannerBgClass: string;
  /** Tailwind classes for the banner title text. */
  bannerTextClass: string;
  /** Single-character badge initial (fallbacks to name[0]). */
  initial: string;
}

const DEFAULT_THEME: RoleTheme = {
  portalLabel: "IFMIS Portal",
  personaName: "Signed in",
  personaTagline: "Pick an active role from the top-bar switcher.",
  avatarGradient: "from-slate-500 to-slate-600",
  portalChipClass: "bg-slate-100 text-slate-700",
  bannerBgClass: "bg-white/90",
  bannerTextClass: "text-slate-900",
  initial: "?",
};

const ROLE_THEMES: Record<string, RoleTheme> = {
  "role-admin": {
    portalLabel: "Admin Portal",
    personaName: "System Administrator",
    personaTagline: "Full access across RBAC, master data, and every expenditure module mapped in the SRS Process Descriptions sheet.",
    avatarGradient: "from-indigo-500 to-violet-600",
    portalChipClass: "bg-[linear-gradient(135deg,#eff8ff,#f5fbff)] text-sky-800",
    bannerBgClass: "bg-gradient-to-r from-indigo-50 via-white to-violet-50",
    bannerTextClass: "text-indigo-900",
    initial: "S",
  },
  "role-normal-user": {
    portalLabel: "User Portal",
    personaName: "Normal User",
    personaTagline: "SRS actor 'User' — create contracts, submit invoices, originate advances, register utility providers. No approvals or admin tools.",
    avatarGradient: "from-emerald-500 to-teal-600",
    portalChipClass: "bg-emerald-50 text-emerald-800",
    bannerBgClass: "bg-gradient-to-r from-emerald-50 via-white to-teal-50",
    bannerTextClass: "text-emerald-900",
    initial: "U",
  },
  "role-finance-officer": {
    portalLabel: "Finance Portal",
    personaName: "Finance Officer",
    personaTagline: "Manages contracts, advances, invoices/bills, payment orders, utility & rental payments and financial reporting.",
    avatarGradient: "from-sky-500 to-blue-600",
    portalChipClass: "bg-sky-50 text-sky-800",
    bannerBgClass: "bg-gradient-to-r from-sky-50 via-white to-blue-50",
    bannerTextClass: "text-sky-900",
    initial: "F",
  },
  "role-procurement": {
    portalLabel: "Procurement Portal",
    personaName: "Procurement Officer",
    personaTagline: "Handles contractor & vendor registration, contract verification, and sanction management — SRS PRN 1.1, 1.3, 4.x.",
    avatarGradient: "from-amber-500 to-orange-600",
    portalChipClass: "bg-amber-50 text-amber-800",
    bannerBgClass: "bg-gradient-to-r from-amber-50 via-white to-orange-50",
    bannerTextClass: "text-amber-900",
    initial: "P",
  },
  "role-agency-staff": {
    portalLabel: "Agency Portal",
    personaName: "Agency Staff",
    personaTagline: "Agency-level operational user — utility bill data entry, vendor onboarding, advance origination, contract data entry. No approvals.",
    avatarGradient: "from-cyan-500 to-teal-600",
    portalChipClass: "bg-cyan-50 text-cyan-800",
    bannerBgClass: "bg-gradient-to-r from-cyan-50 via-white to-teal-50",
    bannerTextClass: "text-cyan-900",
    initial: "A",
  },
  "role-auditor": {
    portalLabel: "Audit Portal",
    personaName: "Auditor (RAA)",
    personaTagline: "Read-only access to every module with export rights — Royal Audit Authority compliance review.",
    avatarGradient: "from-rose-500 to-red-600",
    portalChipClass: "bg-rose-50 text-rose-800",
    bannerBgClass: "bg-gradient-to-r from-rose-50 via-white to-red-50",
    bannerTextClass: "text-rose-900",
    initial: "R",
  },
  "role-head-of-agency": {
    portalLabel: "Head Desk",
    personaName: "Head of Agency",
    personaTagline: "P-Level final approver — authorises advances, bills, contract closures and payment release per SRS.",
    avatarGradient: "from-violet-600 to-purple-700",
    portalChipClass: "bg-violet-50 text-violet-800",
    bannerBgClass: "bg-gradient-to-r from-violet-50 via-white to-purple-50",
    bannerTextClass: "text-violet-900",
    initial: "H",
  },
  "role-hr-officer": {
    portalLabel: "HR Portal",
    personaName: "HR Officer",
    personaTagline: "Payroll initiator — manages employee master (ZESt sync), payroll generation, salary advances, muster roll and sitting fees.",
    avatarGradient: "from-teal-500 to-cyan-600",
    portalChipClass: "bg-teal-50 text-teal-800",
    bannerBgClass: "bg-gradient-to-r from-teal-50 via-white to-cyan-50",
    bannerTextClass: "text-teal-900",
    initial: "HR",
  },
  "role-public": {
    portalLabel: "Contractor Portal",
    personaName: "Contractor / Vendor",
    personaTagline: "Self-service access for contractors and vendors — registration, invoices, contracts.",
    avatarGradient: "from-amber-500 to-orange-600",
    portalChipClass: "bg-amber-50 text-amber-800",
    bannerBgClass: "bg-gradient-to-r from-amber-50 via-white to-orange-50",
    bannerTextClass: "text-amber-900",
    initial: "C",
  },
  "role-muster-roll": {
    portalLabel: "Muster Roll Portal",
    personaName: "Muster Roll Beneficiary",
    personaTagline: "Daily-wage beneficiary portal — registration, payments, wage tracking.",
    avatarGradient: "from-emerald-500 to-green-700",
    portalChipClass: "bg-emerald-50 text-emerald-800",
    bannerBgClass: "bg-gradient-to-r from-emerald-50 via-white to-green-50",
    bannerTextClass: "text-emerald-900",
    initial: "M",
  },
  "role-fi": {
    portalLabel: "FI Portal",
    personaName: "Financial Institution",
    personaTagline: "Banking portal — FI registration, bill discounting, CBS integration, payment orders.",
    avatarGradient: "from-blue-600 to-indigo-700",
    portalChipClass: "bg-blue-50 text-blue-800",
    bannerBgClass: "bg-gradient-to-r from-blue-50 via-white to-indigo-50",
    bannerTextClass: "text-blue-900",
    initial: "F",
  },
  "role-utility-provider": {
    portalLabel: "Utility Provider Portal",
    personaName: "Utility Service Provider",
    personaTagline: "Read-only provider portal — track bills, invoices and payment status issued by your company.",
    avatarGradient: "from-sky-500 to-cyan-600",
    portalChipClass: "bg-sky-50 text-sky-800",
    bannerBgClass: "bg-gradient-to-r from-sky-50 via-white to-cyan-50",
    bannerTextClass: "text-sky-900",
    initial: "U",
  },
};

export function getRoleTheme(activeRoleId: string | null | undefined): RoleTheme {
  if (!activeRoleId) return DEFAULT_THEME;
  return ROLE_THEMES[activeRoleId] ?? DEFAULT_THEME;
}
