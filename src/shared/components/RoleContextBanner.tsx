/* ═══════════════════════════════════════════════════════════════════════════
   RoleContextBanner — Shared persona + agency awareness banner for every
   module page.
   ─────────────────────────────────────────────────────────────────────────
   Renders a persistent strip at the top of any page showing:
     • Current active agency (name, type, UCoA code)
     • Current staff position within that agency
     • Portal label badge (agency-specific)
     • Optional capability / blocked-action chips
   Updates instantly when the user switches roles OR agencies in the top-bar.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useAuth } from "../context/AuthContext";
import { getRoleTheme } from "../roleTheme";
import {
  resolveAgencyContext,
  getAgencyTypeIcon,
  getPositionEmoji,
  getAgencyTypeLabel,
  type AgencyType,
} from "../data/agencyPersonas";

const TYPE_COLORS: Record<AgencyType, { accent: string; dot: string; chip: string }> = {
  ministry:       { accent: "text-indigo-700",  dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  constitutional: { accent: "text-amber-700",   dot: "bg-amber-500",  chip: "bg-amber-50 text-amber-700 border-amber-200" },
  thromde:        { accent: "text-sky-700",      dot: "bg-sky-500",    chip: "bg-sky-50 text-sky-700 border-sky-200" },
  dzongkhag:      { accent: "text-emerald-700",  dot: "bg-emerald-500",chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  autonomous:     { accent: "text-violet-700",   dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 border-violet-200" },
  external:       { accent: "text-slate-600",    dot: "bg-slate-400",  chip: "bg-slate-50 text-slate-600 border-slate-200" },
};

interface RoleContextBannerProps {
  /** What this persona can do on this page (shown as green chips). */
  capabilities?: string[];
  /** What is locked for this persona (shown as muted chips). */
  blocked?: string[];
  /** Optional compact mode — hides chips. */
  compact?: boolean;
}

export function RoleContextBanner({ capabilities, blocked, compact }: RoleContextBannerProps) {
  const { activeRoleId, activeAgencyCode } = useAuth();
  const theme = getRoleTheme(activeRoleId);
  const ctx = resolveAgencyContext(activeRoleId);
  const tc = ctx ? TYPE_COLORS[ctx.agency.type] : null;

  return (
    <div className={`mb-4 rounded-xl border p-4 transition-all duration-500 ${theme.bannerBgClass} border-slate-200/50`} key={`rcb-${activeRoleId}-${activeAgencyCode}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Avatar — show agency type icon if we have agency context */}
        <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${theme.avatarGradient} text-xs font-bold text-white`}>
          {ctx ? <span className="text-sm">{getAgencyTypeIcon(ctx.agency.type)}</span> : theme.initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {ctx ? (
              <>
                <p className={`text-sm font-bold ${tc!.accent}`}>{ctx.agency.name}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${tc!.chip}`}>
                  {getAgencyTypeLabel(ctx.agency.type)} — Code {ctx.agency.code}
                </span>
                {ctx.agency.isCentral && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">Central</span>
                )}
              </>
            ) : (
              <>
                <p className={`text-sm font-bold ${theme.bannerTextClass}`}>{theme.personaName}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${theme.portalChipClass}`}>
                  {theme.portalLabel}
                </span>
              </>
            )}
          </div>
          {!compact && ctx && (
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                {getPositionEmoji(ctx.position.icon)} <span className="font-medium">{ctx.position.title}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span>{ctx.position.department}</span>
            </div>
          )}
          {!compact && !ctx && <p className="mt-0.5 text-xs text-slate-500">{theme.personaTagline}</p>}
        </div>

        {/* Fiscal badge for non-external agencies */}
        {ctx && ctx.agency.fiscal.annualBudgetNuM > 0 && (
          <div className="hidden sm:flex flex-col items-end text-[10px]">
            <span className="text-slate-400">Budget: <span className="font-bold text-slate-600">Nu {ctx.agency.fiscal.annualBudgetNuM.toLocaleString()}M</span></span>
            <span className={`font-bold ${ctx.agency.fiscal.budgetUtilPct >= 70 ? "text-emerald-600" : "text-amber-600"}`}>
              {ctx.agency.fiscal.budgetUtilPct}% utilised
            </span>
          </div>
        )}
      </div>

      {!compact && (capabilities?.length || blocked?.length) ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {capabilities?.map((cap) => (
            <span key={cap} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700">
              {cap}
            </span>
          ))}
          {blocked?.map((b) => (
            <span key={b} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 line-through">
              {b}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
