import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { SidebarSection } from "./SidebarSection";
import { sidebarSections, filterSidebarForRole } from "./sidebarConfig";
import { useAuth } from "../../shared/context/AuthContext";
import { useAgencyUrl } from "../../shared/hooks/useAgencyUrl";

interface SidebarProps {
  onNavigate?: () => void;
}

/**
 * Main application sidebar.
 * Renders sections defined in sidebarConfig.ts, filtered by the currently
 * active role (top-bar role switcher). Switching the role automatically
 * rewrites the menu.
 *
 * Accordion behavior: only ONE group can be expanded at a time across
 * the entire sidebar. Opening "Contract Management" will automatically
 * collapse "IFMIS Recurring Vendor Payments", "Admin Tools", etc.
 */
export function Sidebar({ onNavigate }: SidebarProps) {
  const { activeRoleId, activeAgencyCode } = useAuth();
  const location = useLocation();
  const { stripPrefix } = useAgencyUrl();

  const visibleSections = useMemo(
    () => filterSidebarForRole(sidebarSections, activeRoleId, activeAgencyCode),
    [activeRoleId, activeAgencyCode],
  );

  // Figure out which group contains the current active route so we can
  // auto-expand it on first render / navigation.
  // Strip the /:agencySlug/:userId prefix before matching against sidebarConfig paths.
  const findGroupForPath = (pathname: string): string | null => {
    const rawPath = stripPrefix(pathname);
    for (const section of visibleSections) {
      for (const group of section.groups) {
        if (group.links.some((l) => rawPath === l.to || rawPath.startsWith(`${l.to}/`))) {
          return group.key;
        }
      }
      /* Also check standalone links — they don't belong to a group but
         we return a synthetic key so the sidebar doesn't force-open another group */
      if (section.standaloneLinks?.some((l) => rawPath === l.to || rawPath.startsWith(`${l.to}/`))) {
        return `__standalone__${rawPath}`;
      }
    }
    // fall back to any group flagged defaultOpen
    for (const section of visibleSections) {
      const def = section.groups.find((g) => g.defaultOpen);
      if (def) return def.key;
    }
    return null;
  };

  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(() =>
    findGroupForPath(location.pathname),
  );

  // When the route changes (e.g. user clicks a link inside a group), keep the
  // containing group open and auto-collapse any other.
  useEffect(() => {
    const match = findGroupForPath(location.pathname);
    if (match) setActiveGroupKey(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, activeRoleId]);

  const handleGroupToggle = (key: string) => {
    setActiveGroupKey((current) => (current === key ? null : key));
  };

  return (
    <nav className="space-y-1 px-2" aria-label="Module navigation">
      {visibleSections.length === 0 ? (
        <div className="mx-1 mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-[11px] leading-5 text-slate-500">
          No modules visible for this role. Switch roles in the header to access other modules.
        </div>
      ) : (
        visibleSections.map((section, idx) => (
          <SidebarSection
            key={section.heading || `section-${idx}`}
            section={section}
            withBorder={idx > 0}
            onNavigate={onNavigate}
            activeGroupKey={activeGroupKey}
            onGroupToggle={handleGroupToggle}
          />
        ))
      )}
    </nav>
  );
}
