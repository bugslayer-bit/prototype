import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EmployeeCategory } from "../types";
import { useAgencyUrl } from "../../../../shared/hooks/useAgencyUrl";

export interface SubNavLink {
  label: string;
  to: string;
  badge?: string;
}

export interface SubNavGroup {
  label: string;
  icon: string;
  links: SubNavLink[];
}

export const CS_SUBNAV: SubNavGroup[] = [
  {
    label: "Employee Master",
    icon: "👥",
    links: [
      { label: "Employee Registry", to: "/payroll/employees", badge: "PRN 1.1" },
      /* "Delegation of Authority" removed from the Employee Master peer nav
         per user request — delegation entries are now surfaced
         dynamically from Master Data (see AppShell top-bar delegation
         indicator and /admin/delegation page) instead of as a static
         pill button here. */
      { label: "Allowance of Employee", to: "/payroll/employee-allowances", badge: "Per-user" },
      { label: "Pay Scale for Employee", to: "/payroll/employee-pay-scales", badge: "Per-user" },
    ],
  },
  {
    label: "HR Actions",
    icon: "📋",
    links: [
      { label: "HR Actions & Pay Updates", to: "/payroll/hr-actions", badge: "DDi 2.0" },
      { label: "Pay Fixation", to: "/payroll/pay-fixation", badge: "DDi 24.x" },
      { label: "Arrears", to: "/payroll/arrears", badge: "DDi 23.x" },
      { label: "Re-join / Re-appointment", to: "/payroll/rejoin", badge: "DDi 25.x" },
    ],
  },
  {
    label: "Payroll Processing",
    icon: "⚙️",
    links: [
      /* Primary landing → full 6-step Payroll Generation workflow (PRN 2.1).
         "Payroll Schedule" and "Paybill Standard" are MoF-only central
         configuration and surfaced from the sidebar (not in this peer nav). */
      { label: "Payroll Generation", to: "/payroll/generation", badge: "PRN 2.1" },
    ],
  },
  {
    label: "Advances & Deductions",
    icon: "💵",
    links: [
      { label: "Salary Advance", to: "/payroll/salary-advance", badge: "PRN 3.1" },
      { label: "Floating Deductions", to: "/payroll/floating-deductions", badge: "DDi 27.x" },
    ],
  },
  {
    label: "Travel Claims",
    icon: "✈️",
    links: [
      { label: "Travel Claims Desk", to: "/payroll/travel-claims", badge: "DDi 28-30.x" },
    ],
  },
  {
    label: "Remittances & Payslip",
    icon: "🏦",
    links: [
      { label: "Paybill Recoveries", to: "/payroll/recoveries" },
      { label: "Report to Cash Mgmt", to: "/payroll/cm-report" },
      { label: "PF (NPPF)", to: "/payroll/remittance/pf" },
      { label: "GIS (RICBL)", to: "/payroll/remittance/gis" },
      { label: "TDS & HC (DRC)", to: "/payroll/remittance/drc" },
      { label: "House Rent (DRC / NHDCL)", to: "/payroll/remittance/rent" },
      { label: "CSWS (RCSC)", to: "/payroll/remittance/csws" },
      { label: "Audit Recoveries (RAA)", to: "/payroll/remittance/audit" },
      { label: "Payslip", to: "/payroll/payslip" },
    ],
  },
  {
    label: "Reports",
    icon: "📊",
    links: [
      { label: "Payroll Register", to: "/payroll/reports/register" },
      { label: "Deduction Register", to: "/payroll/reports/deductions" },
      { label: "Advance Status", to: "/payroll/reports/advances" },
      { label: "Exception Report", to: "/payroll/reports/exceptions" },
      { label: "Pending Approvals", to: "/payroll/reports/pending" },
      { label: "SLA / Processing Time", to: "/payroll/reports/sla" },
    ],
  },
];

export const OPS_SUBNAV: SubNavGroup[] = [
  /* OPS Dashboard (Overview) group removed — the Payroll Management landing
     now renders the same analytics dashboard for OPS as for Civil Servant,
     so a separate "Overview" chip was redundant. */
  {
    label: "Employee Master",
    icon: "👥",
    links: [
      { label: "Employee Registry", to: "/payroll/ops/employees", badge: "PRN 1.1" },
      { label: "Allowance of Employee", to: "/payroll/ops/employee-allowances", badge: "Per-user" },
      { label: "Pay Scale for Employee", to: "/payroll/ops/employee-pay-scales", badge: "Per-user" },
    ],
  },
  {
    label: "HR Actions",
    icon: "📋",
    links: [
      { label: "HR Actions & Pay Updates", to: "/payroll/ops/hr-actions", badge: "DDi 2.0" },
      { label: "Pay Fixation", to: "/payroll/ops/pay-fixation", badge: "DDi 24.x" },
      { label: "Arrears", to: "/payroll/ops/arrears", badge: "DDi 23.x" },
      { label: "Re-join / Re-appointment", to: "/payroll/ops/rejoin", badge: "DDi 25.x" },
    ],
  },
  {
    label: "Payroll Processing",
    icon: "⚙️",
    links: [
      /* Primary landing → full 6-step Payroll Generation workflow (PRN 2.1) */
      { label: "Payroll Generation", to: "/payroll/ops/generation", badge: "PRN 2.1" },
    ],
  },
  {
    label: "Advances & Deductions",
    icon: "💵",
    links: [
      { label: "Salary Advance", to: "/payroll/ops/salary-advance", badge: "PRN 3.1" },
      { label: "Floating Deductions", to: "/payroll/ops/floating-deductions", badge: "DDi 27.x" },
    ],
  },
  {
    label: "Travel Claims",
    icon: "✈️",
    links: [
      { label: "Travel Claims", to: "/payroll/ops/travel-claims", badge: "PRN 4.1" },
    ],
  },
  {
    label: "Muster Roll & Sitting Fee",
    icon: "🧾",
    links: [
      { label: "Muster Roll Creation", to: "/payroll/ops/muster-creation", badge: "DDi 31.x" },
      { label: "Muster Roll Payment", to: "/payroll/ops/muster-payment", badge: "DDi 32.x" },
      { label: "Sitting Fee & Honorarium", to: "/payroll/ops/sitting-fee", badge: "DDi 33-34.x" },
    ],
  },
  {
    label: "Benefits & Separation",
    icon: "🎓",
    links: [
      { label: "Retirement Benefits", to: "/payroll/ops/retirement-benefits", badge: "DDi 35.0" },
    ],
  },
  {
    label: "Remittances & Payslip",
    icon: "🏦",
    links: [
      { label: "Paybill Recoveries", to: "/payroll/ops/recoveries" },
      { label: "Report to Cash Mgmt", to: "/payroll/ops/cm-report" },
      { label: "PF (NPPF)", to: "/payroll/ops/remittance/pf" },
      { label: "GIS (RICBL)", to: "/payroll/ops/remittance/gis" },
      { label: "TDS & HC (DRC)", to: "/payroll/ops/remittance/drc" },
      { label: "House Rent (DRC / NHDCL)", to: "/payroll/ops/remittance/rent" },
      { label: "Audit Recoveries (RAA)", to: "/payroll/ops/remittance/audit" },
      { label: "Payslip", to: "/payroll/ops/payslip" },
    ],
  },
  {
    label: "Reports",
    icon: "📈",
    links: [
      { label: "Payroll Register", to: "/payroll/ops/reports/register" },
      { label: "Deduction Register", to: "/payroll/ops/reports/deductions" },
      { label: "Advance Status", to: "/payroll/ops/reports/advances" },
      { label: "Exception Report", to: "/payroll/ops/reports/exceptions" },
      { label: "Pending Approvals", to: "/payroll/ops/reports/pending" },
    ],
  },
];

export interface PayrollSubNavProps {
  category: EmployeeCategory;
}

export function PayrollSubNav({ category }: PayrollSubNavProps) {
  const groups = category === "civil-servant" ? CS_SUBNAV : OPS_SUBNAV;
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath, stripPrefix } = useAgencyUrl();
  /* Match active state against the raw (prefix-stripped) pathname so it works
     regardless of which agency/user is currently scoped in the URL. */
  const rawPath = stripPrefix(location.pathname);
  const tone =
    category === "civil-servant"
      ? {
          activeBtn: "bg-blue-600 text-white border-blue-600",
          inactiveBtn: "bg-white text-blue-700 border-blue-200 hover:border-blue-400",
          badge: "bg-blue-100 text-blue-700",
        }
      : {
          activeBtn: "bg-amber-600 text-white border-amber-600",
          inactiveBtn: "bg-white text-amber-700 border-amber-200 hover:border-amber-400",
          badge: "bg-amber-100 text-amber-700",
        };

  /* A group is "active" when the current route matches one of its child links. */
  const matchesGroup = (g: SubNavGroup) =>
    g.links.some((l) => rawPath.startsWith(l.to));

  return (
    <div className="mb-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <div className="flex flex-wrap gap-2 bg-slate-50/70 p-4">
        {groups.map((g) => {
          const isActive = matchesGroup(g);
          const primaryLink = g.links[0];
          return (
            <button
              key={g.label}
              onClick={() => primaryLink && navigate(buildPath(primaryLink.to))}
              title={primaryLink ? `Open ${primaryLink.label}` : undefined}
              className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold shadow-sm transition ${
                isActive ? tone.activeBtn : tone.inactiveBtn
              }`}
            >
              <span>{g.icon}</span>
              <span>{g.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/25 text-white" : tone.badge
                }`}
              >
                {g.links.length}
              </span>
              <span className="ml-1 text-xs opacity-80">→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Sibling Nav — peer links for the current payroll group.
   Detail pages render this near the top so users can jump between sibling
   workflows (e.g. Employee Registry ↔ Delegation of Authority ↔ Allowance
   Configuration ↔ Pay Scale Master) inside the routed page.
   ───────────────────────────────────────────────────────────────────────── */
export interface PayrollGroupSiblingNavProps {
  category: EmployeeCategory;
  /** Route path that the currently-rendered page corresponds to. */
  currentPath: string;
}

export function PayrollGroupSiblingNav({ category, currentPath }: PayrollGroupSiblingNavProps) {
  const groups = category === "civil-servant" ? CS_SUBNAV : OPS_SUBNAV;
  const { buildPath, stripPrefix } = useAgencyUrl();
  /* Normalize the incoming path (which may be agency-scoped) back to a bare
     route so we can match against the subnav link `to` values. */
  const rawPath = stripPrefix(currentPath);
  const group = groups.find((g) => g.links.some((l) => rawPath.startsWith(l.to)));
  if (!group) return null;

  const tone =
    category === "civil-servant"
      ? { active: "bg-blue-600 text-white border-blue-600", idle: "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700", badge: "bg-blue-100 text-blue-700" }
      : { active: "bg-amber-600 text-white border-amber-600", idle: "bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:text-amber-700", badge: "bg-amber-100 text-amber-700" };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-base">{group.icon}</span>
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          {group.label}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          {group.links.length} workflows
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.links.map((l) => {
          const active = rawPath.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={buildPath(l.to)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition ${active ? tone.active : tone.idle}`}
            >
              <span>{l.label}</span>
              {l.badge && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/25 text-white" : tone.badge}`}>
                  {l.badge}
                </span>
              )}
              {!active && <span className="text-gray-400">→</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
