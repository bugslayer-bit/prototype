/* ═══════════════════════════════════════════════════════════════════════════
   ContractManagementLayout — Top-bar sub-navigation + breadcrumb wrapper
   ─────────────────────────────────────────────────────────────────────────
   Renders:
   1. Title ("Contract Management")
   2. Dynamic breadcrumb (Home > Contract Management > [active page])
   3. Horizontal tab bar with all contract sub-modules
   4. <Outlet /> for the active child route

   This replaces the old sidebar sub-items pattern — the sidebar now shows
   a single "Contract Management" entry, and all sub-navigation happens here.
   ═══════════════════════════════════════════════════════════════════════════ */
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAgencyUrl } from "../../../shared/hooks/useAgencyUrl";
import { useAuth } from "../../../shared/context/AuthContext";

/* ── Tab definitions — order matches the SRS process flow ──────────────── */
interface ContractTab {
  label: string;
  /** Relative path segment under /modules/contract-management/ */
  segment: string;
  badge?: string;
  /** Which roles can see this tab (empty = all internal roles) */
  roleIds?: string[];
}

const CONTRACT_TABS: ContractTab[] = [
  { label: "Contract Creation",   segment: "creation",       badge: "PRN 2.1" },
  { label: "Contract Amendment",  segment: "amendment",      badge: "PRN 2.2" },
  { label: "Advances",            segment: "advances"                          },
  { label: "Invoice & Bill",      segment: "invoice-bill",   badge: "PRN 3"   },
  { label: "Contract Lifecycle",  segment: "lifecycle"                         },
  { label: "Contract Extension",  segment: "extension"                         },
  { label: "Contract Closure",    segment: "closure"                           },
  { label: "Sanction Management", segment: "sanction",       badge: "PRN 4"   },
];

/* ── Breadcrumb helper — resolves segment → human label ────────────────── */
function resolveTabLabel(segment: string): string {
  const tab = CONTRACT_TABS.find((t) => t.segment === segment);
  return tab?.label ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function ContractManagementLayout() {
  const { buildPath, stripPrefix } = useAgencyUrl();
  const { activeRoleId } = useAuth();
  const location = useLocation();

  /* Figure out which tab is active from the URL */
  const rawPath = stripPrefix(location.pathname);
  const basePath = "/modules/contract-management";
  const afterBase = rawPath.startsWith(basePath)
    ? rawPath.slice(basePath.length).replace(/^\/+/, "")
    : "";
  const activeSegment = afterBase.split("/")[0] || "creation";
  const activeLabel = resolveTabLabel(activeSegment);

  /* Filter tabs by role if needed (future-proof; currently all visible) */
  const visibleTabs = CONTRACT_TABS.filter((tab) => {
    if (!tab.roleIds || tab.roleIds.length === 0) return true;
    return tab.roleIds.includes(activeRoleId ?? "");
  });

  return (
    <div className="space-y-0">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-1">
        <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
          <NavLink
            to={buildPath("/")}
            className="text-slate-400 hover:text-indigo-600 transition font-medium"
          >
            Home
          </NavLink>
          <svg className="h-3.5 w-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <NavLink
            to={buildPath(basePath)}
            className={`transition font-medium ${
              activeSegment === "creation" && !afterBase.includes("/")
                ? "text-slate-700"
                : "text-slate-400 hover:text-indigo-600"
            }`}
          >
            Contract Management
          </NavLink>
          {activeSegment && (
            <>
              <svg className="h-3.5 w-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-700 font-semibold">{activeLabel}</span>
            </>
          )}
        </nav>
      </div>

      {/* ── Top-bar tabs ──────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 px-6">
        <div className="flex items-center gap-0.5 overflow-x-auto -mb-px scrollbar-thin">
          {visibleTabs.map((tab) => {
            const isActive = activeSegment === tab.segment;
            const to = buildPath(`${basePath}/${tab.segment}`);
            return (
              <NavLink
                key={tab.segment}
                to={to}
                className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition border-b-2 ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    isActive
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* ── Page content (child route) ────────────────────────────────── */}
      <div className="pt-1">
        <Outlet />
      </div>
    </div>
  );
}
