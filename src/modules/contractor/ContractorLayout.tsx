/* ═══════════════════════════════════════════════════════════════════════════
   ContractorLayout — Top-bar sub-navigation + breadcrumb wrapper
   ─────────────────────────────────────────────────────────────────────────
   Same pattern as ContractManagementLayout / RecurringVendorPaymentLayout:
   1. Dynamic breadcrumb (Home > Contractor > [active page])
   2. Horizontal tab bar with all contractor sub-modules
   3. <Outlet /> for the active child route
   ═══════════════════════════════════════════════════════════════════════════ */
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAgencyUrl } from "../../shared/hooks/useAgencyUrl";
import { useAuth } from "../../shared/context/AuthContext";

/* ── Tab definitions ───────────────────────────────────────────────────── */
interface ContractorTab {
  label: string;
  segment: string;
  badge?: string;
  roleIds?: string[];
}

const CONTRACTOR_TABS: ContractorTab[] = [
  { label: "Contractor Registration", segment: "register",  badge: "PRN 1.1" },
  { label: "Contractor Management",   segment: "management", badge: "PRN 1.3" },
  { label: "Contractor Amendment",    segment: "amendment",  badge: "PRN 1.2" },
  { label: "Contact Management",      segment: "contacts"                      },
];

/* ── Breadcrumb helper ─────────────────────────────────────────────────── */
function resolveTabLabel(segment: string): string {
  const tab = CONTRACTOR_TABS.find((t) => t.segment === segment);
  return tab?.label ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function ContractorLayout() {
  const { buildPath, stripPrefix } = useAgencyUrl();
  const { activeRoleId } = useAuth();
  const location = useLocation();

  /* Determine which tab is active from the URL path */
  const rawPath = stripPrefix(location.pathname);
  const basePath = "/modules/contractor";
  const afterBase = rawPath.startsWith(basePath)
    ? rawPath.slice(basePath.length).replace(/^\/+/, "")
    : "";
  const activeSegment = afterBase.split("/")[0] || "register";
  const activeLabel = resolveTabLabel(activeSegment);

  const visibleTabs = CONTRACTOR_TABS.filter((tab) => {
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
              activeSegment === "register" && !afterBase.includes("/")
                ? "text-slate-700"
                : "text-slate-400 hover:text-indigo-600"
            }`}
          >
            Contractor
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
