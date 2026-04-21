import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { useAgencyUrl } from "../../shared/hooks/useAgencyUrl";
import { getRoleTheme } from "../../shared/roleTheme";
import { useContractorData } from "../../shared/context/ContractorDataContext";
import { useContractData } from "../../shared/context/ContractDataContext";
import {
  resolveAgencyContext,
  getAgencyTypeIcon,
  getPositionEmoji,
  getAgencyTypeLabel,
  type AgencyType,
} from "../../shared/data/agencyPersonas";
import type { ModuleDefinition } from "../../shared/types";

/* ═══════════════════════════════════════════════════════════════════════════
   ROLE + AGENCY AWARE DASHBOARD
   ──────────────────────────────
   Everything on this page reacts to BOTH the active RBAC role AND the
   active agency. Switching agency changes fiscal stats, greeting, and
   budget data. Switching role changes quick-actions and capabilities.
   ═══════════════════════════════════════════════════════════════════════════ */

interface HomePageProps {
  modules: ModuleDefinition[];
}

/* ── Per-persona config ─────────────────────────────────────────────────── */
interface PersonaDashboard {
  greeting: string;
  description: string;
  quickActions: { label: string; to: string; icon: string; color: string }[];
  statCards: { label: string; value: string | number; trend?: string; color: string }[];
}

/* ── Agency type color accents ──────────────────────────────────────────── */
const AGENCY_TYPE_ACCENT: Record<AgencyType, { chip: string; text: string; border: string }> = {
  ministry:      { chip: "bg-indigo-100 text-indigo-700", text: "text-indigo-700", border: "border-indigo-200" },
  constitutional:{ chip: "bg-amber-100 text-amber-700",  text: "text-amber-700",  border: "border-amber-200" },
  thromde:       { chip: "bg-sky-100 text-sky-700",       text: "text-sky-700",    border: "border-sky-200" },
  dzongkhag:     { chip: "bg-emerald-100 text-emerald-700",text: "text-emerald-700",border: "border-emerald-200" },
  autonomous:    { chip: "bg-violet-100 text-violet-700", text: "text-violet-700", border: "border-violet-200" },
  external:      { chip: "bg-slate-100 text-slate-600",   text: "text-slate-600",  border: "border-slate-200" },
};

function usePersonaDashboard(): PersonaDashboard {
  const { activeRoleId, activeAgencyCode } = useAuth();
  const { contractors } = useContractorData();
  const { contracts } = useContractData();
  const ctx = resolveAgencyContext(activeRoleId);

  return useMemo(() => {
    const activeContractors = contractors.filter((c) => c.status?.toLowerCase().includes("active")).length;
    const pendingVerification = contractors.filter((c) => c.verification === "Pending" || c.verification === "Resubmitted").length;
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter((c) => c.contractStatus === "Active" || c.contractStatus === "Draft").length;

    /* Agency-specific fiscal data — changes with every agency switch */
    const f = ctx?.agency.fiscal;
    const agencyName = ctx?.agency.shortCode ?? "IFMIS";
    const agencyFull = ctx?.agency.name ?? "Integrated Financial Management";

    switch (activeRoleId) {
      case "role-admin":
        return {
          greeting: `${agencyName} — System Administration`,
          description: `Full access to RBAC, master data, workflows, and all expenditure modules for ${agencyFull}. Manage users, configure approval chains, and monitor system health.`,
          quickActions: [
            { label: "RBAC & Users", to: "/admin/rbac", icon: "shield", color: "indigo" },
            { label: "Master Data", to: "/master-data", icon: "database", color: "violet" },
            { label: "Public Submissions", to: "/admin/verification", icon: "check", color: "emerald" },
            { label: "Workflow Config", to: "/admin/workflow", icon: "workflow", color: "amber" },
          ],
          statCards: [
            { label: "Registered Contractors", value: contractors.length, color: "sky" },
            { label: "Pending Verification", value: pendingVerification, trend: pendingVerification > 0 ? "action needed" : "all clear", color: pendingVerification > 0 ? "amber" : "emerald" },
            { label: "Total Contracts", value: f?.activeContracts ?? totalContracts, color: "violet" },
            { label: "Active Staff", value: f?.activeStaff ?? 8, color: "indigo" },
          ],
        };

      case "role-finance-officer":
        return {
          greeting: `${agencyName} — Finance Portal`,
          description: `Manage contracts, advances, invoices/bills, payment orders, and financial reporting for ${agencyFull}.`,
          quickActions: [
            { label: "Invoice & Bill", to: "/modules/invoice-bill", icon: "receipt", color: "sky" },
            { label: "Advances", to: "/modules/advances", icon: "banknote", color: "emerald" },
            { label: "Debt Payments", to: "/modules/debt-payment", icon: "trending", color: "amber" },
            { label: "Contract Creation", to: "/modules/contract-creation", icon: "file", color: "violet" },
          ],
          statCards: [
            { label: "Annual Budget", value: f ? `Nu ${f.annualBudgetNuM.toLocaleString()}M` : `Nu ${(totalContracts * 2.5).toFixed(1)}M`, color: "sky" },
            { label: "Expenditure (FY)", value: f ? `Nu ${f.expenditureNuM.toLocaleString()}M` : `Nu ${(totalContracts * 1.5).toFixed(1)}M`, color: "emerald" },
            { label: "Pending Invoices", value: f?.pendingInvoices ?? Math.max(1, Math.floor(totalContracts * 0.3)), trend: "requires review", color: "amber" },
            { label: "Budget Utilisation", value: f ? `${f.budgetUtilPct}%` : "—", trend: f && f.budgetUtilPct < 50 ? "below target" : f && f.budgetUtilPct > 80 ? "on track" : "in progress", color: f && f.budgetUtilPct > 70 ? "emerald" : "amber" },
          ],
        };

      case "role-procurement":
        return {
          greeting: `${agencyName} — Procurement Portal`,
          description: `Handle contractor & vendor registration, contract verification, sanction management, and procurement compliance for ${agencyFull}.`,
          quickActions: [
            { label: "Register Contractor", to: "/contractor/register", icon: "user-plus", color: "amber" },
            { label: "Contractor Mgmt", to: "/contractor-management", icon: "users", color: "orange" },
            { label: "Sanction Mgmt", to: "/modules/sanction-management", icon: "shield", color: "rose" },
            { label: "Vendor Management", to: "/vendor-management", icon: "building", color: "sky" },
          ],
          statCards: [
            { label: "Active Contractors", value: activeContractors, color: "amber" },
            { label: "Pending Registration", value: pendingVerification, trend: pendingVerification > 0 ? "needs review" : "clear", color: pendingVerification > 0 ? "rose" : "emerald" },
            { label: "Active Contracts", value: f?.activeContracts ?? 0, color: "sky" },
            { label: "Active Vendors", value: Math.max(3, Math.floor(contractors.length * 0.4)), color: "violet" },
          ],
        };

      case "role-head-of-agency":
        return {
          greeting: `${agencyName} — Head of Agency Desk`,
          description: `Final approver for advances, bills, contract closures, and payment releases at ${agencyFull}. P-Level authority per SRS.`,
          quickActions: [
            { label: "Invoice & Bill", to: "/modules/invoice-bill", icon: "receipt", color: "violet" },
            { label: "Contract Closure", to: "/modules/contract-closure", icon: "lock", color: "purple" },
            { label: "Advances", to: "/modules/advances", icon: "banknote", color: "emerald" },
            { label: "SOE Transfers", to: "/modules/soe-fund-transfer", icon: "arrow-right", color: "sky" },
          ],
          statCards: [
            { label: "Awaiting Final Approval", value: f ? (f.pendingPOs + f.pendingInvoices) : Math.max(1, Math.floor(totalContracts * 0.15)), trend: "priority items", color: "violet" },
            { label: "Active Contracts", value: f?.activeContracts ?? activeContracts, color: "sky" },
            { label: "Annual Budget", value: f ? `Nu ${f.annualBudgetNuM.toLocaleString()}M` : "—", color: "emerald" },
            { label: "Budget Utilisation", value: f ? `${f.budgetUtilPct}%` : "67%", color: "amber" },
          ],
        };

      case "role-auditor":
        return {
          greeting: `${agencyName} — Audit Portal (RAA)`,
          description: `Read-only access to every module with export rights. Review compliance, trace transactions, and generate audit reports across ${agencyFull}.`,
          quickActions: [
            { label: "Contract Lifecycle", to: "/modules/contract-lifecycle", icon: "refresh", color: "rose" },
            { label: "Invoice & Bill", to: "/modules/invoice-bill", icon: "receipt", color: "red" },
            { label: "Contractor Mgmt", to: "/contractor-management", icon: "users", color: "pink" },
            { label: "Vendor Management", to: "/vendor-management", icon: "building", color: "orange" },
          ],
          statCards: [
            { label: "Active Contracts", value: f?.activeContracts ?? totalContracts, color: "rose" },
            { label: "Agency Budget", value: f ? `Nu ${f.annualBudgetNuM.toLocaleString()}M` : "—", color: "red" },
            { label: "Flagged Transactions", value: 0, trend: "none flagged", color: "emerald" },
            { label: "Budget Utilisation", value: f ? `${f.budgetUtilPct}%` : "—", color: "sky" },
          ],
        };

      case "role-hr-officer":
        return {
          greeting: `${agencyName} — HR & Payroll Portal`,
          description: `Payroll initiator for ${agencyFull} — manage employee master (ZESt sync), generate payroll runs, salary advances, muster rolls, and sitting fees. Integrates with Finance for review and HoA for final approval.`,
          quickActions: [
            { label: "Payroll Generation", to: "/payroll/generation", icon: "banknote", color: "teal" },
            { label: "Employee Master", to: "/payroll/employees", icon: "users", color: "cyan" },
            { label: "Salary Advances", to: "/payroll/salary-advance", icon: "banknote", color: "emerald" },
            { label: "Muster Roll & Wages", to: "/modules/muster-roll-wages", icon: "file", color: "sky" },
          ],
          statCards: [
            { label: "Active Employees", value: f?.activeStaff ?? 0, color: "teal" },
            { label: "Pending Payroll Runs", value: 0, trend: "none pending", color: "cyan" },
            { label: "Salary Advances", value: 0, trend: "no outstanding", color: "emerald" },
            { label: "ZESt Sync Status", value: "Synced", trend: "last sync today", color: "sky" },
          ],
        };

      case "role-agency-staff":
        return {
          greeting: `${agencyName} — Agency Portal`,
          description: `Operational data entry at ${agencyFull} — utility bills, vendor onboarding, advance origination, and contract data entry. No approval authority.`,
          quickActions: [
            { label: "Utility Bills", to: "/modules/utility-management", icon: "zap", color: "cyan" },
            { label: "Rental Payments", to: "/modules/rental-payment", icon: "home", color: "teal" },
            { label: "Register Contractor", to: "/contractor/register", icon: "user-plus", color: "emerald" },
            { label: "Contract Creation", to: "/modules/contract-creation", icon: "file", color: "sky" },
          ],
          statCards: [
            { label: "Active Contracts", value: f?.activeContracts ?? 0, color: "cyan" },
            { label: "Pending Invoices", value: f?.pendingInvoices ?? 0, color: "amber" },
            { label: "Agency Staff", value: f?.activeStaff ?? 0, color: "emerald" },
            { label: "Departments", value: ctx?.agency.departments.length ?? 0, color: "teal" },
          ],
        };

      case "role-public":
        return {
          greeting: "Contractor Portal",
          description: "Welcome to the IFMIS Contractor & Vendor Self-Service Portal. Register, submit invoices, track contracts, and manage your submissions.",
          quickActions: [
            { label: "Register as Contractor", to: "/contractor/register", icon: "user-plus", color: "amber" },
            { label: "Submit Invoice", to: "/modules/invoice-bill", icon: "receipt", color: "sky" },
            { label: "My Contracts", to: "/modules/contract-lifecycle", icon: "file", color: "emerald" },
            { label: "My Documents", to: "/public/documents", icon: "file", color: "violet" },
          ],
          statCards: [
            { label: "My Registrations", value: contractors.filter((c) => c.submittedVia === "public").length || 1, color: "amber" },
            { label: "Invoices Submitted", value: Math.floor(Math.random() * 4) + 1, trend: "in pipeline", color: "sky" },
            { label: "Pending Approval", value: pendingVerification || 1, trend: pendingVerification > 0 ? "awaiting review" : "all clear", color: "emerald" },
            { label: "Active Contracts", value: 3, trend: "2 in progress", color: "violet" },
          ],
        };

      case "role-muster-roll":
        return {
          greeting: "Muster Roll Portal",
          description: "Welcome to the Muster Roll Beneficiary Portal. Register as a beneficiary, track your payments, view wage history, and manage your bank details.",
          quickActions: [
            { label: "Beneficiary Registration", to: "/public/muster-roll-register", icon: "user-plus", color: "emerald" },
            { label: "Payment Status", to: "/muster-roll/payments", icon: "banknote", color: "teal" },
            { label: "Wage History", to: "/muster-roll/wage-history", icon: "receipt", color: "cyan" },
            { label: "My Documents", to: "/public/documents", icon: "file", color: "sky" },
          ],
          statCards: [
            { label: "Registration Status", value: "Active", trend: "verified", color: "emerald" },
            { label: "Total Wages Received", value: "Nu.42K", trend: "this quarter", color: "teal" },
            { label: "Days Worked", value: 24, trend: "this month", color: "cyan" },
            { label: "Next Payment", value: "Apr 15", trend: "3 days", color: "sky" },
          ],
        };

      case "role-fi":
        return {
          greeting: "Financial Institution Portal",
          description: "Welcome to the IFMIS Financial Institution Portal. Manage FI registration, bill discounting, payment channels, and CBS integration.",
          quickActions: [
            { label: "FI Registration", to: "/fi/register", icon: "building", color: "blue" },
            { label: "Bill Discounting", to: "/fi/bill-discounting", icon: "receipt", color: "indigo" },
            { label: "Payment Orders", to: "/fi/payment-orders", icon: "banknote", color: "violet" },
            { label: "CBS Config", to: "/fi/cbs-config", icon: "database", color: "sky" },
          ],
          statCards: [
            { label: "Payment Channels", value: 14, trend: "+2 this month", color: "blue" },
            { label: "Pending Discounting", value: 7, trend: "3 urgent", color: "indigo" },
            { label: "Payment Orders", value: 42, trend: "Nu.12.4M total", color: "violet" },
            { label: "CBS Status", value: "Active", trend: "latency 45ms", color: "emerald" },
          ],
        };

      default: /* role-normal-user or unknown */
        return {
          greeting: `${agencyName} — User Portal`,
          description: `Create contracts, submit invoices, originate advances, and register utility providers at ${agencyFull}. No approval or admin tools.`,
          quickActions: [
            { label: "Contract Creation", to: "/modules/contract-creation", icon: "file", color: "emerald" },
            { label: "Invoice & Bill", to: "/modules/invoice-bill", icon: "receipt", color: "teal" },
            { label: "Advances", to: "/modules/advances", icon: "banknote", color: "sky" },
            { label: "Contractor Reg.", to: "/contractor/register", icon: "user-plus", color: "cyan" },
          ],
          statCards: [
            { label: "Active Contracts", value: f?.activeContracts ?? activeContracts, color: "emerald" },
            { label: "Pending Invoices", value: f?.pendingInvoices ?? 0, color: "amber" },
            { label: "Agency Budget", value: f ? `Nu ${f.annualBudgetNuM.toLocaleString()}M` : "—", color: "sky" },
            { label: "Pending POs", value: f?.pendingPOs ?? 0, color: "violet" },
          ],
        };
    }
  }, [activeRoleId, activeAgencyCode, contractors, contracts, ctx]);
}

/* ── Icon helper ────────────────────────────────────────────────────────── */
function QuickActionIcon({ name }: { name: string }) {
  const cls = "h-5 w-5";
  switch (name) {
    case "shield": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
    case "database": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>;
    case "check": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case "workflow": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
    case "receipt": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V9.75A2.25 2.25 0 016 7.5h12z" /></svg>;
    case "user-plus": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A5.375 5.375 0 0016 20.25H4a5.375 5.375 0 01.75-1.015z" /></svg>;
    case "building": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.792 7.175A.75.75 0 0017.25 15.75h-3.5a.75.75 0 00-.75.75v2.25m.75-11.25h2.25a.75.75 0 01.75.75v2.25M7.5 11.25h2.25a.75.75 0 01.75.75v2.25M3.75 15.75h2.25a.75.75 0 01.75.75v2.25" /></svg>;
    default: return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
  }
}

/* ── Color map for Tailwind classes ─────────────────────────────────────── */
const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
  sky:     { bg: "bg-sky-500",     text: "text-sky-700",     border: "border-sky-200",     light: "bg-sky-50" },
  emerald: { bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200", light: "bg-emerald-50" },
  amber:   { bg: "bg-amber-500",   text: "text-amber-700",   border: "border-amber-200",   light: "bg-amber-50" },
  violet:  { bg: "bg-violet-500",  text: "text-violet-700",  border: "border-violet-200",  light: "bg-violet-50" },
  indigo:  { bg: "bg-indigo-500",  text: "text-indigo-700",  border: "border-indigo-200",  light: "bg-indigo-50" },
  rose:    { bg: "bg-rose-500",    text: "text-rose-700",    border: "border-rose-200",    light: "bg-rose-50" },
  fuchsia: { bg: "bg-fuchsia-500", text: "text-fuchsia-700", border: "border-fuchsia-200", light: "bg-fuchsia-50" },
  pink:    { bg: "bg-pink-500",    text: "text-pink-700",    border: "border-pink-200",    light: "bg-pink-50" },
  green:   { bg: "bg-green-500",   text: "text-green-700",   border: "border-green-200",   light: "bg-green-50" },
  teal:    { bg: "bg-teal-500",    text: "text-teal-700",    border: "border-teal-200",    light: "bg-teal-50" },
  cyan:    { bg: "bg-cyan-500",    text: "text-cyan-700",    border: "border-cyan-200",    light: "bg-cyan-50" },
  blue:    { bg: "bg-blue-500",    text: "text-blue-700",    border: "border-blue-200",    light: "bg-blue-50" },
  red:     { bg: "bg-red-500",     text: "text-red-700",     border: "border-red-200",     light: "bg-red-50" },
  orange:  { bg: "bg-orange-500",  text: "text-orange-700",  border: "border-orange-200",  light: "bg-orange-50" },
  purple:  { bg: "bg-purple-500",  text: "text-purple-700",  border: "border-purple-200",  light: "bg-purple-50" },
  slate:   { bg: "bg-slate-500",   text: "text-slate-700",   border: "border-slate-200",   light: "bg-slate-50" },
};
function getColor(c: string) { return colorMap[c] ?? colorMap.slate; }

/* ═══════════════════════════════════════════════════════════════════════════ */

export function HomePage({ modules: _modules }: HomePageProps) {
  const { activeRoleId, activeAgencyCode, user } = useAuth();
  const { buildPath } = useAgencyUrl();
  const theme = getRoleTheme(activeRoleId);
  const dashboard = usePersonaDashboard();
  const ctx = resolveAgencyContext(activeRoleId);
  const agencyAccent = ctx ? AGENCY_TYPE_ACCENT[ctx.agency.type] : null;

  return (
    <div className="grid gap-6 animate-[fadeIn_0.3s_ease-out]" key={`home-${activeRoleId}-${activeAgencyCode}`}>
      <style>{`@keyframes fadeIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── Agency context banner — shows WHICH agency dashboard you're on ── */}
      {ctx && (
        <div className={`flex items-center gap-3 rounded-xl border ${agencyAccent!.border} bg-white/70 px-4 py-2.5`}>
          <span className="text-lg">{getAgencyTypeIcon(ctx.agency.type)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${agencyAccent!.text}`}>{ctx.agency.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${agencyAccent!.chip}`}>
                {getAgencyTypeLabel(ctx.agency.type)} — Code {ctx.agency.code}
              </span>
              {ctx.agency.isCentral && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">Central IFMIS</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                {getPositionEmoji(ctx.position.icon)} <span className="font-medium">{ctx.position.title}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span>{ctx.position.department}</span>
              <span className="text-slate-300">|</span>
              <span>{ctx.agency.departments.length} departments</span>
              <span className="text-slate-300">|</span>
              <span>{ctx.agency.fiscal.activeStaff} staff on IFMIS</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome banner ──────────────────────────────────────────── */}
      <section className={`rounded-2xl border p-6 shadow-sm transition-all duration-500 ${theme.bannerBgClass} border-slate-200/60`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatarGradient} text-xl font-bold text-white shadow-lg`}>
              {ctx ? getAgencyTypeIcon(ctx.agency.type) : theme.initial}
            </span>
            <div>
              <h1 className={`text-xl font-bold ${theme.bannerTextClass}`}>{dashboard.greeting}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Welcome back, <span className="font-semibold">{user?.name ?? "User"}</span>. {dashboard.description}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 self-start">
            <span className={`rounded-full px-4 py-1.5 text-xs font-bold ${theme.portalChipClass}`}>
              {ctx ? `${ctx.agency.shortCode} Portal` : theme.portalLabel}
            </span>
            {ctx && ctx.agency.fiscal.annualBudgetNuM > 0 && (
              <span className="text-[10px] text-slate-400">
                FY 2025-26 Budget: <span className="font-bold text-slate-600">Nu {ctx.agency.fiscal.annualBudgetNuM.toLocaleString()}M</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Fiscal summary bar (for non-external agencies) ────────── */}
      {ctx && ctx.agency.fiscal.annualBudgetNuM > 0 && (
        <section className={`rounded-xl border ${agencyAccent!.border} bg-white/60 p-4`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Budget Utilisation — FY 2025-26</span>
            <span className={`text-sm font-bold ${ctx.agency.fiscal.budgetUtilPct >= 70 ? "text-emerald-600" : ctx.agency.fiscal.budgetUtilPct >= 50 ? "text-amber-600" : "text-rose-600"}`}>
              {ctx.agency.fiscal.budgetUtilPct}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                ctx.agency.fiscal.budgetUtilPct >= 70 ? "bg-emerald-500" : ctx.agency.fiscal.budgetUtilPct >= 50 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, ctx.agency.fiscal.budgetUtilPct)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>Expenditure: <span className="font-bold text-slate-700">Nu {ctx.agency.fiscal.expenditureNuM.toLocaleString()}M</span></span>
            <span>Budget: <span className="font-bold text-slate-700">Nu {ctx.agency.fiscal.annualBudgetNuM.toLocaleString()}M</span></span>
          </div>
        </section>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.statCards.map((stat) => {
          const c = getColor(stat.color);
          return (
            <div key={stat.label} className={`rounded-xl border ${c.border} ${c.light} p-5 transition-all duration-300`}>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className={`mt-2 text-2xl font-bold ${c.text}`}>{stat.value}</p>
              {stat.trend && (
                <p className="mt-1 text-[11px] text-slate-400">{stat.trend}</p>
              )}
            </div>
          );
        })}
      </section>

      {/* ── Quick actions ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.quickActions.map((action) => {
            const c = getColor(action.color);
            return (
              <Link
                key={action.label}
                to={buildPath(action.to)}
                className={`group flex items-center gap-3 rounded-xl border ${c.border} bg-white/80 p-4 transition-all hover:shadow-md hover:${c.light}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.light} ${c.text} transition-colors group-hover:${c.bg} group-hover:text-white`}>
                  <QuickActionIcon name={action.icon} />
                </span>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{action.label}</span>
                <svg className="ml-auto h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Agency info + Role capabilities ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Agency departments */}
        {ctx && (
          <section className={`rounded-xl border ${agencyAccent!.border} bg-white/60 p-5`}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
              {ctx.agency.shortCode} Departments
            </h2>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ctx.agency.departments.map((dept) => (
                <div key={dept} className="flex items-center gap-2 rounded-lg bg-slate-50/80 px-3 py-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    ctx.agency.type === "ministry" ? "bg-indigo-400" :
                    ctx.agency.type === "constitutional" ? "bg-amber-400" :
                    ctx.agency.type === "thromde" ? "bg-sky-400" :
                    ctx.agency.type === "dzongkhag" ? "bg-emerald-400" :
                    "bg-violet-400"
                  }`} />
                  <span className="text-[11px] text-slate-600">{dept}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Role capabilities */}
        <section className="rounded-xl border border-slate-200/60 bg-white/60 p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Your Role Capabilities</h2>
          <p className="text-sm text-slate-600">{theme.personaTagline}</p>
          {ctx && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ctx.position.capabilities.map((cap) => (
                <span key={cap} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">{cap}</span>
              ))}
              {ctx.position.blocked.map((bl) => (
                <span key={bl} className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-600">{bl}</span>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {dashboard.quickActions.map((a) => (
              <span key={a.label} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {a.label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
