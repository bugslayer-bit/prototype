import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { SidebarLink } from "./sidebarConfig";
import { useAgencyUrl } from "../../shared/hooks/useAgencyUrl";

interface SidebarItemProps {
  link: SidebarLink;
  standalone?: boolean;
  onNavigate?: () => void;
  /** Visual nesting level for sub-sub items (0 = top, 1 = nested) */
  depth?: number;
}

export function SidebarItem({ link, standalone, onNavigate, depth = 0 }: SidebarItemProps) {
  const location = useLocation();
  const { buildPath, stripPrefix } = useAgencyUrl();
  const hasChildren = Array.isArray(link.children) && link.children.length > 0;

  /* Build the agency-scoped path for this link */
  const scopedTo = buildPath(link.to);

  /* Split the configured target into path + query. Children can be
     disambiguated by query-string (e.g. ?stream=civil-servant vs ?stream=ops)
     so we need custom active matching — NavLink ignores query strings. */
  const [linkPath, linkQueryStr = ""] = link.to.split("?");
  const linkParams = new URLSearchParams(linkQueryStr);
  const urlParams = new URLSearchParams(location.search);

  /* For matching, compare the raw route (stripped of prefix) against the link target */
  const rawPathname = stripPrefix(location.pathname);

  /* True if every query param declared on the link matches the current URL. */
  const allLinkParamsMatch = Array.from(linkParams.entries()).every(
    ([k, v]) => urlParams.get(k) === v,
  );

  /* Does the base path match same-page siblings (to decide whether a plain
     link without a query should yield to a sibling that carries one)? */
  const siblingHasQueryMatch =
    !linkQueryStr && urlParams.toString().length > 0 && rawPathname === linkPath;

  /* Manual active override for query-string links and their plain sibling. */
  const overrideActive =
    linkQueryStr.length > 0
      ? rawPathname === linkPath && allLinkParamsMatch
      : siblingHasQueryMatch
        ? false
        : null;

  /* Auto-open the nested group whenever the user is anywhere inside the parent route */
  const isWithinParent = hasChildren && rawPathname.startsWith(linkPath);
  const [open, setOpen] = useState<boolean>(isWithinParent);

  useEffect(() => {
    if (isWithinParent) setOpen(true);
  }, [isWithinParent]);

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <NavLink
          to={scopedTo}
          end={!hasChildren && !standalone}
          className={({ isActive }) => {
            const active = overrideActive ?? isActive;
            return `flex flex-1 items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150 ${
              active
                ? "bg-indigo-50 font-semibold text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            } ${standalone ? "font-medium" : ""} ${depth > 0 ? "text-[12px]" : ""}`;
          }}
          onClick={onNavigate}
        >
          <span className="truncate">{link.label}</span>
          {link.badge && (
            <span className="ml-1.5 shrink-0 rounded bg-slate-100 px-1.5 py-px text-[9px] font-semibold text-slate-400">
              {link.badge}
            </span>
          )}
        </NavLink>
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setOpen((c) => !c);
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-expanded={open}
            aria-label={open ? `Collapse ${link.label}` : `Expand ${link.label}`}
          >
            <svg
              className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {hasChildren && open && (
        <div className="ml-2.5 mt-0.5 space-y-px border-l border-slate-200/60 pl-2.5">
          {link.children!.map((child) => (
            <SidebarItem
              key={`${child.to}|${child.label}`}
              link={child}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
