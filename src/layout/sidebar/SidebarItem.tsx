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

  /* For matching, compare the raw route (stripped of prefix) against the link target */
  const rawPathname = stripPrefix(location.pathname);

  /* Auto-open the nested group whenever the user is anywhere inside the parent route */
  const isWithinParent = hasChildren && rawPathname.startsWith(link.to);
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
          className={({ isActive }) =>
            `flex flex-1 items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150 ${
              isActive
                ? "bg-indigo-50 font-semibold text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            } ${standalone ? "font-medium" : ""} ${depth > 0 ? "text-[12px]" : ""}`
          }
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
