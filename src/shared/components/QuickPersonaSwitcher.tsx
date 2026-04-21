import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { QUICK_PERSONAS, getPersonaByNumber } from "../data/quickPersonas";
import type { QuickPersona } from "../data/quickPersonas";
import { getStoredUsers } from "../../modules/admin/rbac/rbacData";
import { landingFor } from "../data/roleLandings";
import { agencyCodeToSlug } from "../hooks/useAgencyUrl";

/* localStorage key for persisting active persona number */
const PERSONA_KEY = "ifmis_active_persona";

/* ── Group definitions for visual clustering ─────────────────────────────── */
interface PersonaGroup {
  id: string;
  label: string;
  emoji: string;
  personas: QuickPersona[];
  /** Inactive ring/dot color */
  ringColor: string;
  /** Subtle bg tint when inactive */
  inactiveBg: string;
  inactiveText: string;
}

/**
 * Build persona groups filtered by the ACTIVE AGENCY shown in the header.
 * Regardless of whether you are Super Admin or a regular user, the persona
 * list only shows personas belonging to the agency you are currently operating
 * within. The Super Admin persona is always included as an escape hatch to
 * switch back and access all agencies.
 *
 * Example: Header says "GovTech" → only GovTech personas + Super Admin.
 *          Header says "MoF"     → only MoF personas + Super Admin.
 */
function buildGroups(activeAgencyCode: string): PersonaGroup[] {
  /* Always scope to the active agency + admin escape hatch */
  const scoped = QUICK_PERSONAS.filter(
    (p) =>
      p.agencyCode === activeAgencyCode || // same agency as header
      p.roleId === "role-admin"            // always show admin escape hatch
  );

  const mofPersonas = scoped.filter(p => p.agencyCode === "16" && p.roleId !== "role-admin");
  const govtechPersonas = scoped.filter(p => p.agencyCode === "70");
  const mohPersonas = scoped.filter(p => p.agencyCode === "20");
  const adminPersona = scoped.filter(p => p.roleId === "role-admin");
  const contractorPersonas = scoped.filter(p => p.agencyCode === "EXT");
  const mrPersonas = scoped.filter(p => p.agencyCode === "MR");
  const fiPersonas = scoped.filter(p => p.agencyCode === "FI");
  /* Utility-provider personas — any agencyCode starting with "UP-" */
  const utilityProviderPersonas = scoped.filter(p => p.agencyCode.startsWith("UP-"));

  const groups: PersonaGroup[] = [];

  if (mofPersonas.length > 0) groups.push({
    id: "mof", label: "MoF", emoji: "🏛️", personas: mofPersonas,
    ringColor: "ring-indigo-400", inactiveBg: "bg-indigo-50", inactiveText: "text-indigo-600",
  });
  if (govtechPersonas.length > 0) groups.push({
    id: "govtech", label: "GovTech", emoji: "💻", personas: govtechPersonas,
    ringColor: "ring-teal-400", inactiveBg: "bg-teal-50", inactiveText: "text-teal-600",
  });
  if (mohPersonas.length > 0) groups.push({
    id: "moh", label: "MoH", emoji: "🏥", personas: mohPersonas,
    ringColor: "ring-cyan-400", inactiveBg: "bg-cyan-50", inactiveText: "text-cyan-600",
  });
  if (adminPersona.length > 0) groups.push({
    id: "admin", label: "Admin", emoji: "⚙️", personas: adminPersona,
    ringColor: "ring-red-400", inactiveBg: "bg-red-50", inactiveText: "text-red-600",
  });
  if (contractorPersonas.length > 0) groups.push({
    id: "ext", label: "Contractor", emoji: "🔨", personas: contractorPersonas,
    ringColor: "ring-amber-400", inactiveBg: "bg-amber-50", inactiveText: "text-amber-700",
  });
  if (mrPersonas.length > 0) groups.push({
    id: "mr", label: "Muster Roll", emoji: "👷", personas: mrPersonas,
    ringColor: "ring-emerald-400", inactiveBg: "bg-emerald-50", inactiveText: "text-emerald-700",
  });
  if (fiPersonas.length > 0) groups.push({
    id: "fi", label: "FI", emoji: "🏦", personas: fiPersonas,
    ringColor: "ring-blue-400", inactiveBg: "bg-blue-50", inactiveText: "text-blue-700",
  });
  if (utilityProviderPersonas.length > 0) groups.push({
    id: "utility-provider",
    label: "Utility Provider",
    emoji: "💡",
    personas: utilityProviderPersonas,
    ringColor: "ring-sky-400",
    inactiveBg: "bg-sky-50",
    inactiveText: "text-sky-700",
  });

  return groups;
}

/**
 * QuickPersonaSwitcher — Dynamic, grouped persona switcher.
 * Government staff (1-9), Admin, and external portals (C, M, F)
 * are visually grouped with color-coded badges and hover cards.
 */
export const QuickPersonaSwitcher: React.FC = () => {
  const { switchPersona, activeAgencyCode, user } = useAuth();
  const navigate = useNavigate();
  const [activePersona, setActivePersona] = useState<number>(() => {
    try { return Number(localStorage.getItem(PERSONA_KEY)) || 9; }
    catch { return 9; }
  });
  const [hoveredNumber, setHoveredNumber] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Rebuild groups whenever the active agency in the header changes */
  const groups = React.useMemo(
    () => buildGroups(activeAgencyCode),
    [activeAgencyCode]
  );

  /* Sync role/agency on mount from persisted persona — but ONLY if the
     current auth user doesn't already match.  This avoids bumping
     roleSwitchEpoch (which triggers transition overlay + URL rewrite)
     when the stored auth already reflects the active persona.  On first
     ever load, auth may not match → switchPersona fires once. After that,
     switchPersona updates ifmis_auth to match, so next load skips this. */
  useEffect(() => {
    const p = getPersonaByNumber(activePersona);
    if (p) {
      const matchedUser = getStoredUsers().find(u => u.id === p.userId);
      if (matchedUser && matchedUser.id !== user?.id) {
        switchPersona({
          userId: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
          roleId: p.roleId,
          agencyCode: p.agencyCode,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isExpanded]);

  const handlePersonaClick = useCallback((number: number) => {
    const persona = getPersonaByNumber(number);
    if (!persona) return;
    setActivePersona(number);
    localStorage.setItem(PERSONA_KEY, String(number));
    try {
      const matchedUser = getStoredUsers().find(u => u.id === persona.userId);
      if (matchedUser) {
        switchPersona({
          userId: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
          roleId: persona.roleId,
          agencyCode: persona.agencyCode,
        });
        /* Resolve role landing and navigate — build URL manually since
           useAgencyUrl reflects pre-switch auth state. */
        const landing = landingFor(persona.roleId, persona.agencyCode);
        const slug = agencyCodeToSlug(persona.agencyCode);
        const clean = landing.path.startsWith("/") ? landing.path : `/${landing.path}`;
        navigate(`/${slug}/${matchedUser.id}${clean}`);
      }
    } catch (error) {
      console.error("Failed to switch persona:", error);
    }
    setIsExpanded(false);
  }, [switchPersona, navigate]);

  const handleMouseEnter = useCallback((number: number, event: React.MouseEvent) => {
    setHoveredNumber(number);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNumber(null);
    setTooltipPos(null);
  }, []);

  const hoveredPersona = hoveredNumber ? getPersonaByNumber(hoveredNumber) : null;
  const activeP = getPersonaByNumber(activePersona);

  /* Find which group the active persona belongs to */
  const activeGroup = groups.find(g => g.personas.some(p => p.number === activePersona));

  return (
    <div className="relative" ref={containerRef}>
      {/* ── Compact active persona chip (always visible) ─────────── */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all duration-200 hover:shadow-md ${
          isExpanded
            ? "border-indigo-300 bg-indigo-50 shadow-md"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        {/* Active avatar */}
        {activeP && (
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${activeP.avatarColor} text-[11px] font-bold text-white shadow-sm`}>
            {activeP.initial}
          </div>
        )}
        {/* Label */}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-[11px] font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
            {activeP?.name ?? "Select Persona"}
          </span>
          <span className="text-[9px] text-slate-500 leading-tight">
            {activeP?.role}
          </span>
        </div>
        {/* Chevron */}
        <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* ── Expanded dropdown panel ──────────────────────────────── */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[420px] rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Switch Persona</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Click to switch role, agency, and permissions instantly</p>
              </div>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 rounded-full px-2 py-0.5">
                {groups.reduce((sum, g) => sum + g.personas.length, 0)} personas
              </span>
            </div>
          </div>

          {/* Groups */}
          <div className="max-h-[480px] overflow-y-auto p-2 space-y-1">
            {groups.map((group, gIdx) => {
              const isExternalGroup = ["ext", "mr", "fi"].includes(group.id);
              return (
                <React.Fragment key={group.id}>
                  {/* Separator before external groups */}
                  {isExternalGroup && gIdx > 0 && groups[gIdx - 1] && !["ext", "mr", "fi"].includes(groups[gIdx - 1].id) && (
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">External Portals</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  )}

                  {/* Group header */}
                  <div className="px-2 pt-1.5 pb-1 flex items-center gap-1.5">
                    <span className="text-xs">{group.emoji}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</span>
                    <span className="text-[9px] text-slate-400">({group.personas.length})</span>
                  </div>

                  {/* Persona cards in this group */}
                  <div className="space-y-0.5">
                    {group.personas.map((persona) => {
                      const isActive = persona.number === activePersona;
                      return (
                        <button
                          key={persona.number}
                          type="button"
                          onClick={() => handlePersonaClick(persona.number)}
                          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                            isActive
                              ? `bg-gradient-to-r from-slate-50 to-slate-100 ring-1 ring-inset ring-slate-200 shadow-sm`
                              : "hover:bg-slate-50"
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? `bg-gradient-to-br ${persona.avatarColor} text-white shadow-md`
                              : `${group.inactiveBg} ${group.inactiveText}`
                          }`}>
                            {persona.initial}
                            {isActive && (
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-semibold truncate ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                                {persona.name}
                              </span>
                              {isActive && (
                                <span className="flex-shrink-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0 text-[8px] font-bold text-emerald-700 uppercase">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500 truncate">{persona.role}</span>
                              <span className="text-[10px] text-slate-300">·</span>
                              <span className="text-[10px] text-slate-400 truncate">{persona.department}</span>
                            </div>
                          </div>

                          {/* Agency badge */}
                          <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                            isActive
                              ? "bg-slate-200 text-slate-700"
                              : `${group.inactiveBg} ${group.inactiveText}`
                          }`}>
                            {persona.agencyCode === "16" ? "MoF"
                              : persona.agencyCode === "20" ? "MoH"
                              : persona.agencyCode === "70" ? "GT"
                              : persona.agencyCode === "EXT" ? "EXT"
                              : persona.agencyCode === "MR" ? "MR"
                              : persona.agencyCode === "FI" ? "FI"
                              : persona.agencyCode}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Active: <span className="font-medium text-slate-600">{activeP?.name}</span>
              {activeGroup && <span> · {activeGroup.emoji} {activeGroup.label}</span>}
            </span>
            <span className="text-[10px] text-slate-400">
              Keyboard: press <kbd className="px-1 py-0.5 rounded bg-slate-200 text-[9px] font-mono">1</kbd>-<kbd className="px-1 py-0.5 rounded bg-slate-200 text-[9px] font-mono">9</kbd>
            </span>
          </div>
        </div>
      )}

      {/* ── Hover tooltip (only shows when dropdown is closed) ──── */}
      {!isExpanded && hoveredPersona && tooltipPos && (
        <div
          className="fixed z-50 w-56 rounded-xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.15)] pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white border-r border-b border-slate-200/80" />
          <div className="p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${hoveredPersona.avatarColor} text-xs font-bold text-white`}>
                {hoveredPersona.initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{hoveredPersona.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{hoveredPersona.role}</p>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100">
              <p className="text-[10px] text-slate-600 italic">{hoveredPersona.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
