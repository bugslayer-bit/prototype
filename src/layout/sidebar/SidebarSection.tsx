import { SidebarItem } from "./SidebarItem";
import type { SidebarGroup as SidebarGroupType, SidebarSection as SidebarSectionType } from "./sidebarConfig";

function SidebarGroup({
  group,
  onNavigate,
  open,
  onToggle,
}: {
  group: SidebarGroupType;
  onNavigate?: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-all duration-150 ${
          open
            ? "bg-slate-100/80 text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
        }`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`sidebar-${group.key}`}
      >
        <span className="truncate">{group.label}</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {open && (
        <div className="ml-2.5 mt-0.5 space-y-px border-l border-slate-200/60 pl-2.5" id={`sidebar-${group.key}`}>
          {group.links.map((link) => (
            <SidebarItem key={`${link.to}|${link.label}`} link={link} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarSectionProps {
  section: SidebarSectionType;
  withBorder?: boolean;
  onNavigate?: () => void;
  activeGroupKey: string | null;
  onGroupToggle: (key: string) => void;
}

export function SidebarSection({
  section,
  withBorder,
  onNavigate,
  activeGroupKey,
  onGroupToggle,
}: SidebarSectionProps) {
  const hasSingleGroup = section.groups.length === 1;
  const singleGroup = hasSingleGroup ? section.groups[0] : null;
  const shouldFlattenSingleGroup =
    hasSingleGroup && singleGroup && section.heading
      ? singleGroup.label === section.heading
      : false;

  return (
    <div className={withBorder ? "mt-3 border-t border-slate-100 pt-3" : ""}>
      {section.heading && (
        <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {section.heading}
        </p>
      )}

      {/* Standalone links render BEFORE groups */}
      {section.standaloneLinks?.map((link) => (
        <SidebarItem key={link.to} link={link} standalone onNavigate={onNavigate} />
      ))}

      <div className="space-y-0.5">
        {shouldFlattenSingleGroup && singleGroup ? (
          singleGroup.links.map((link) => (
            <SidebarItem key={`${link.to}|${link.label}`} link={link} onNavigate={onNavigate} />
          ))
        ) : (
          section.groups.map((group) => (
            <SidebarGroup
              key={group.key}
              group={group}
              onNavigate={onNavigate}
              open={activeGroupKey === group.key}
              onToggle={() => onGroupToggle(group.key)}
            />
          ))
        )}
      </div>
    </div>
  );
}
