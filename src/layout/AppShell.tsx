import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar, sidebarSections } from "./sidebar";
import { useContractorData } from "../shared/context/ContractorDataContext";
import { useMusterRollBeneficiaries } from "../shared/context/MusterRollBeneficiaryContext";
import { useAuth } from "../shared/context/AuthContext";
import { getStoredRoles } from "../modules/admin/rbac/rbacData";
import { QuickPersonaSwitcher } from "../shared/components/QuickPersonaSwitcher";
import { RouteBreadcrumb } from "../shared/components/RouteBreadcrumb";
import { getRoleTheme } from "../shared/roleTheme";
import { landingFor } from "../shared/data/roleLandings";
import { agencyCodeToSlug } from "../shared/hooks/useAgencyUrl";
import {
  AGENCIES,
  DEMO_AGENCY_CODES,
  resolveAgencyContext,
  getAgenciesByType,
  getAgencyByCode,
  getDefaultAgencyCode,
  getStaffPosition,
  getStaffPositionForAgency,
  getPositionEmoji,
  getAgencyTypeIcon,
  getAgencyTypeLabel,
  type AgencyType,
} from "../shared/data/agencyPersonas";

const ADMIN_READ_KEY = "ifmis-admin-read-notifications";

function getAdminReadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(ADMIN_READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}
function persistAdminReadIds(ids: Set<string>) {
  try { window.localStorage.setItem(ADMIN_READ_KEY, JSON.stringify([...ids])); } catch {}
}

function usePageTitle(): string {
  const { pathname } = useLocation();

  /* Strip the /:agencySlug/:userId prefix to match against sidebarConfig's bare paths */
  const parts = pathname.split("/").filter(Boolean);
  const rawPath = parts.length >= 2 ? "/" + parts.slice(2).join("/") : pathname;

  for (const section of sidebarSections) {
    for (const link of section.standaloneLinks ?? []) {
      if (rawPath === link.to || (link.to !== "/" && rawPath.startsWith(link.to))) {
        return link.label;
      }
    }

    for (const group of section.groups) {
      for (const link of group.links) {
        if (rawPath === link.to || (link.to !== "/" && rawPath.startsWith(link.to))) {
          return link.label;
        }
      }
    }
  }

  return "IFMIS";
}

/* ── Live Toast: flashes when new public submissions arrive ───────────── */
function LiveSubmissionToast() {
  const { contractors } = useContractorData();
  const { activeRoleId } = useAuth();
  const [toast, setToast] = useState<{ id: string; name: string; kind: "Pending" | "Resubmitted" } | null>(null);
  const seenRef = useRef<Set<string> | null>(null);

  /* Only admin / system-owner personas should see the live toast. */
  const isAdminish = activeRoleId === "role-admin" || activeRoleId === "role-finance-officer" || activeRoleId === "role-head-of-agency";

  useEffect(() => {
    const current = new Set(
      contractors
        .filter((c) => c.submittedVia === "public" && (c.verification === "Pending" || c.verification === "Resubmitted"))
        .map((c) => `${c.id}:${c.verification}`),
    );

    /* First pass: initialise without showing a toast for the seed data. */
    if (seenRef.current === null) {
      seenRef.current = current;
      return;
    }
    if (!isAdminish) { seenRef.current = current; return; }

    /* Find keys that just appeared. */
    const fresh: string[] = [];
    current.forEach((k) => { if (!seenRef.current!.has(k)) fresh.push(k); });
    seenRef.current = current;

    if (fresh.length === 0) return;
    const latestKey = fresh[fresh.length - 1];
    const [id, kind] = latestKey.split(":");
    const rec = contractors.find((c) => c.id === id);
    if (!rec) return;

    setToast({ id, name: rec.displayName, kind: kind as "Pending" | "Resubmitted" });
    const t = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [contractors, isAdminish]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[9999] w-[340px] animate-[slideInRight_0.3s_ease-out]">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-emerald-300 bg-white shadow-[0_20px_50px_rgba(16,185,129,0.25)]">
        <div className="flex items-start gap-3 border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 to-white p-4">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-emerald-500 text-white animate-pulse">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Live · Contractor Portal
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {toast.kind === "Resubmitted" ? "Amendment resubmitted" : "New submission"}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-600">
              {toast.name} — awaiting your review
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="h-1 w-full bg-emerald-100">
          <div className="h-full bg-emerald-500 animate-[shrink_8s_linear_forwards]" />
        </div>
      </div>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes shrink { from { width: 100%; } to { width: 0; } }
      `}</style>
    </div>
  );
}

/* ── Live toast: Muster-Roll beneficiaries ────────────────────────────────
   Shows a live animated toast whenever a relevant muster-roll event
   happens for the CURRENT persona:
     • Contractor (role-public, EXT) → toast fires when a public user
       registers a new beneficiary against one of their contracts.
     • MoF / Admin / Program Officer → toast fires the moment a contractor
       approves a beneficiary and it flips into "approved-by-contractor"
       (i.e. it's now waiting for their clearance).                      */
function MusterRollLiveToast() {
  const { beneficiaries } = useMusterRollBeneficiaries();
  const { activeRoleId, user } = useAuth();
  const { contractors } = useContractorData();
  const [toast, setToast] = useState<{
    id: string;
    name: string;
    kind: "new-submission" | "approved-for-mof";
  } | null>(null);
  const seenRef = useRef<Set<string> | null>(null);

  const isContractor = activeRoleId === "role-public";
  const isMoFish =
    activeRoleId === "role-admin" ||
    activeRoleId === "role-finance-officer" ||
    activeRoleId === "role-program-officer" ||
    activeRoleId === "role-head-of-agency";

  /* Map logged-in public user → their contractor record so we can scope
     "new submission" toasts to records tagged to THEIR contracts only. */
  const myContractor = useMemo(() => {
    if (!isContractor || !user?.email) return null;
    return contractors.find((c) => c.email?.toLowerCase() === user.email.toLowerCase()) ?? null;
  }, [contractors, user, isContractor]);

  useEffect(() => {
    const interesting = beneficiaries.filter((b) => {
      if (isContractor) {
        if (!myContractor) return false;
        const mine =
          b.contractorId === myContractor.id ||
          (b.contractorName &&
            b.contractorName.toLowerCase() === myContractor.displayName.toLowerCase());
        return mine && b.stage === "submitted-to-contractor";
      }
      if (isMoFish) return b.stage === "approved-by-contractor";
      return false;
    });

    const current = new Set(interesting.map((b) => `${b.id}:${b.stage}`));

    if (seenRef.current === null) {
      seenRef.current = current;
      return;
    }

    const fresh: string[] = [];
    current.forEach((k) => { if (!seenRef.current!.has(k)) fresh.push(k); });
    seenRef.current = current;

    if (fresh.length === 0) return;
    const latestKey = fresh[fresh.length - 1];
    const [id] = latestKey.split(":");
    const rec = beneficiaries.find((b) => b.id === id);
    if (!rec) return;
    setToast({
      id,
      name: `${rec.firstName} ${rec.lastName}`,
      kind: isContractor ? "new-submission" : "approved-for-mof",
    });
    const t = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(t);
  }, [beneficiaries, isContractor, isMoFish, myContractor]);

  if (!toast) return null;
  const contractor = toast.kind === "new-submission";
  return (
    <div className="pointer-events-none fixed right-6 top-[104px] z-[9999] w-[360px] animate-[slideInRight_0.3s_ease-out]">
      <div className={`pointer-events-auto overflow-hidden rounded-2xl border bg-white shadow-[0_20px_50px_rgba(14,165,233,0.25)] ${
        contractor ? "border-amber-300" : "border-sky-300"
      }`}>
        <div className={`flex items-start gap-3 border-l-4 p-4 ${
          contractor
            ? "border-amber-500 bg-gradient-to-r from-amber-50 to-white"
            : "border-sky-500 bg-gradient-to-r from-sky-50 to-white"
        }`}>
          <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-white animate-pulse ${
            contractor ? "bg-amber-500" : "bg-sky-500"
          }`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${contractor ? "text-amber-700" : "text-sky-700"}`}>
              Live · Muster Roll Portal
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {contractor ? "New beneficiary registration" : "Beneficiary approved by contractor"}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-600">
              {toast.name} — {contractor ? "awaiting your approval" : "awaiting MoF clearance"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`h-1 w-full ${contractor ? "bg-amber-100" : "bg-sky-100"}`}>
          <div className={`h-full animate-[shrink_9s_linear_forwards] ${contractor ? "bg-amber-500" : "bg-sky-500"}`} />
        </div>
      </div>
    </div>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const { contractors, updateContractor } = useContractorData();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => getAdminReadIds());

  // Include both Pending and Resubmitted public submissions
  const actionableItems = useMemo(() =>
    contractors
      .filter((c) => c.submittedVia === "public" && (c.verification === "Pending" || c.verification === "Resubmitted"))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [contractors]
  );

  const unreadCount = useMemo(
    () => actionableItems.filter((c) => !readIds.has(`${c.id}:${c.verification}`)).length,
    [actionableItems, readIds]
  );

  const markAsRead = useCallback((noteKey: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(noteKey);
      persistAdminReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      actionableItems.forEach((c) => next.add(`${c.id}:${c.verification}`));
      persistAdminReadIds(next);
      return next;
    });
  }, [actionableItems]);

  function handleDecision(id: string, verification: string, approved: boolean) {
    updateContractor(id, {
      verification: approved ? "Verified" : "Rejected",
      status: approved ? "Active and verified" : "Draft",
      verifiedBy: "DSD (System Admin)",
      verifiedAt: new Date().toISOString(),
      reviewRemarks: approved ? "Approved by administrator" : "Rejected by administrator",
    });
    // Auto-mark as read after action
    markAsRead(`${id}:${verification}`);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 transition hover:bg-white"
        aria-label="Admin notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Notifications</h4>
              <p className="text-[11px] text-gray-400">{actionableItems.length} pending action{actionableItems.length !== 1 ? "s" : ""}</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-[11px] font-medium text-sky-700 hover:text-sky-900">
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {actionableItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">All clear — no pending reviews</div>
            ) : (
              actionableItems.map((c) => {
                const isResub = c.verification === "Resubmitted";
                const noteKey = `${c.id}:${c.verification}`;
                const isRead = readIds.has(noteKey);
                return (
                  <div
                    key={noteKey}
                    className={`px-4 py-3 transition ${isRead ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
                        <p className="truncate text-sm font-medium text-gray-900">{c.displayName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isResub ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {isResub ? "Re-review" : "New"}
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">
                      {isResub ? "Contractor resubmitted after rejection" : "New public registration"}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(c.id, c.verification, true)}
                        className="rounded-md bg-sky-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-sky-800"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(c.id, c.verification, false)}
                        className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => { navigate("/contractor-registration"); setOpen(false); }}
                        className="ml-auto text-[11px] font-medium text-sky-700 hover:text-sky-900"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Color map per agency type for left-border accent ──────────── */
const AGENCY_TYPE_COLORS: Record<AgencyType, { border: string; bg: string; text: string; activeBg: string; dot: string }> = {
  ministry:      { border: "border-l-indigo-500", bg: "bg-indigo-50/40",  text: "text-indigo-700",  activeBg: "bg-indigo-600", dot: "bg-indigo-500" },
  constitutional:{ border: "border-l-amber-500",  bg: "bg-amber-50/40",   text: "text-amber-700",   activeBg: "bg-amber-600",  dot: "bg-amber-500" },
  thromde:       { border: "border-l-sky-500",    bg: "bg-sky-50/40",     text: "text-sky-700",     activeBg: "bg-sky-600",    dot: "bg-sky-500" },
  dzongkhag:     { border: "border-l-emerald-500",bg: "bg-emerald-50/40", text: "text-emerald-700", activeBg: "bg-emerald-600",dot: "bg-emerald-500" },
  autonomous:    { border: "border-l-violet-500", bg: "bg-violet-50/40",  text: "text-violet-700",  activeBg: "bg-violet-600", dot: "bg-violet-500" },
  external:      { border: "border-l-slate-400",  bg: "bg-slate-50/40",   text: "text-slate-600",   activeBg: "bg-slate-500",  dot: "bg-slate-400" },
};

/* ═══════════════════════════════════════════════════════════════════
   AGENCY PICKER — Selects which government agency you're acting for.
   Grouped by type per UCoA CWT Feb 2026 Organisation Segment.
   ═══════════════════════════════════════════════════════════════════ */
function AgencyPicker() {
  const { activeAgencyCode, setActiveAgencyCode, activeRoleId, bumpEpoch, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const ctx = resolveAgencyContext(useAuth().activeRoleId);
  const theme = getRoleTheme(useAuth().activeRoleId);
  const agencyGroups = useMemo(() => getAgenciesByType(), []);
  const groupOrder: AgencyType[] = ["ministry", "constitutional", "thromde", "dzongkhag", "autonomous", "external"];

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return agencyGroups;
    const q = search.toLowerCase();
    const result: Record<AgencyType, typeof AGENCIES> = { ministry: [], constitutional: [], thromde: [], dzongkhag: [], autonomous: [], external: [] };
    for (const type of groupOrder) {
      result[type] = agencyGroups[type].filter(
        (a) => a.name.toLowerCase().includes(q) || a.shortCode.toLowerCase().includes(q) || a.code.includes(q)
      );
    }
    return result;
  }, [agencyGroups, search]);

  const totalFiltered = useMemo(() => groupOrder.reduce((n, t) => n + filteredGroups[t].length, 0), [filteredGroups]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150 ${
          open
            ? "border-indigo-300 bg-indigo-50/60"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
        aria-label="Switch agency"
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${theme.avatarGradient} text-[10px] text-white`}>
          {ctx ? getAgencyTypeIcon(ctx.agency.type) : theme.initial}
        </span>
        <div className="hidden sm:flex flex-col items-start leading-none">
          <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">{ctx?.agency.shortCode ?? "IFMIS"}</span>
          <span className="max-w-[140px] truncate font-semibold text-slate-700 text-[11px]">{ctx?.agency.name ?? "—"}</span>
        </div>
        <span className="sm:hidden max-w-[80px] truncate font-semibold text-slate-700">{ctx?.agency.shortCode ?? "—"}</span>
        <svg className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[400px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.06)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">
            <p className="text-[11px] font-bold text-slate-600">Select Agency / Institution</p>
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">{DEMO_AGENCY_CODES.length || AGENCIES.length}</span>
          </div>

          {/* Search */}
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agencies by name, code..."
                className="w-full bg-transparent text-[11px] text-slate-700 placeholder-slate-400 outline-none"
                autoFocus
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {totalFiltered === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-400">No agencies matching &ldquo;{search}&rdquo;</p>
              </div>
            )}
            {groupOrder.map((type) => {
              const group = filteredGroups[type];
              if (!group.length) return null;
              const colors = AGENCY_TYPE_COLORS[type];
              return (
                <div key={type} className="mb-0.5">
                  <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-4 py-2 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      <p className={`text-[10px] font-extrabold uppercase tracking-[0.16em] ${colors.text}`}>
                        {getAgencyTypeIcon(type)} {getAgencyTypeLabel(type)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">{group.length}</span>
                  </div>
                  {group.map((a) => {
                    const isActive = a.code === activeAgencyCode;
                    return (
                      <button
                        key={a.code}
                        type="button"
                        onClick={() => {
                      setActiveAgencyCode(a.code);
                      bumpEpoch(); /* Force full remount so pages re-read activeAgencyCode */
                      setOpen(false);
                      /* Navigate to the active role's landing under the new agency */
                      if (activeRoleId && user) {
                        const landing = landingFor(activeRoleId, a.code);
                        const slug = agencyCodeToSlug(a.code);
                        const clean = landing.path.startsWith("/") ? landing.path : `/${landing.path}`;
                        navigate(`/${slug}/${user.id}${clean}`);
                      }
                    }}
                        className={`group flex w-full items-center gap-3 border-l-[3px] px-4 py-2.5 text-left transition-all duration-150 ${
                          isActive
                            ? `${colors.border} ${colors.bg}`
                            : "border-l-transparent hover:border-l-slate-200 hover:bg-slate-50/70"
                        }`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                          isActive ? `${colors.activeBg} text-white shadow-md` : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80"
                        }`}>
                          {a.shortCode.substring(0, 3)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-[11px] font-bold ${isActive ? colors.text : "text-slate-700"}`}>{a.name}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-[9px] text-slate-400">
                            <span className="font-medium">{a.departments.length} depts</span>
                            <span>·</span>
                            <span>Code {a.code}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {a.isCentral && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-600">Central</span>
                          )}
                          {isActive && (
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${colors.activeBg}`}>
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-1.5">
            <p className="text-[9px] text-slate-400">{DEMO_AGENCY_CODES.length || AGENCIES.length} agencies · Expenditure Demo</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   USER / POSITION PICKER — Selects which staff role you're acting as.
   Shows capabilities, blocked actions, and primary modules.
   ═══════════════════════════════════════════════════════════════════ */
function UserPositionPicker() {
  const { roleIds, activeRoleId, activeAgencyCode, setActiveRoleId, activeDelegations, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const allRoles = useMemo(() => getStoredRoles(), []);
  const myRoles = useMemo(
    () => allRoles.filter((r) => roleIds.includes(r.id)),
    [allRoles, roleIds]
  );
  const ctx = resolveAgencyContext(activeRoleId);
  const agencyType = ctx?.agency.type ?? "ministry";
  const theme = getRoleTheme(activeRoleId);

  if (myRoles.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150 ${
          open
            ? "border-emerald-300 bg-emerald-50/60"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
        aria-label="Switch staff position"
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${theme.avatarGradient} text-sm text-white`}>
          {ctx ? getPositionEmoji(ctx.position.icon) : theme.initial}
        </span>
        <div className="hidden sm:flex flex-col items-start leading-none">
          <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Acting as</span>
          <div className="flex items-center gap-1">
            <span className="max-w-[130px] truncate font-semibold text-slate-700 text-[11px]">{ctx?.position.title ?? theme.personaName}</span>
            {activeDelegations.length > 0 && (
              <span className="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-violet-500 px-0.5 text-[7px] font-bold text-white" title={`${activeDelegations.length} active delegation(s)`}>
                +{activeDelegations.length}
              </span>
            )}
          </div>
        </div>
        <span className="sm:hidden max-w-[100px] truncate font-semibold text-slate-700">{ctx?.position.title ?? "—"}</span>
        <svg className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[380px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.06)]">
          {/* Header with agency context */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">
            {ctx && <span className="text-sm">{getAgencyTypeIcon(ctx.agency.type)}</span>}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-600">Staff Position</p>
              <p className="truncate text-[9px] text-slate-400">{ctx?.agency.name ?? "Select an agency first"}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{myRoles.length}</span>
          </div>

          <div className="max-h-[400px] overflow-y-auto py-1">
            {myRoles.map((r) => {
              const isActive = r.id === activeRoleId;
              const pos = getStaffPositionForAgency(r.id, agencyType);
              const rTheme = getRoleTheme(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveRoleId(r.id);
                    setOpen(false);
                    /* Navigate to the new role's canonical landing.
                       getDefaultAgencyCode is called inside setActiveRoleId,
                       so we resolve landing with the agency that setActiveRoleId will pick. */
                    if (user) {
                      const newAgency = getDefaultAgencyCode(r.id);
                      const landing = landingFor(r.id, newAgency);
                      const slug = agencyCodeToSlug(newAgency);
                      const clean = landing.path.startsWith("/") ? landing.path : `/${landing.path}`;
                      navigate(`/${slug}/${user.id}${clean}`);
                    }
                  }}
                  className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-150 ${
                    isActive ? "bg-emerald-50/50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition-all ${
                    isActive
                      ? `bg-gradient-to-br ${rTheme.avatarGradient} text-white shadow-lg`
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80"
                  }`}>
                    {pos ? getPositionEmoji(pos.icon) : r.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-xs font-bold ${isActive ? "text-emerald-700" : "text-slate-700"}`}>
                        {pos?.title ?? r.name}
                      </p>
                      {isActive && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600">Active</span>
                      )}
                    </div>
                    {pos && <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{pos.department}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(pos?.capabilities ?? []).slice(0, 3).map((cap) => (
                        <span key={cap} className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-medium text-emerald-700">{cap}</span>
                      ))}
                      {(pos?.blocked ?? []).slice(0, 2).map((bl) => (
                        <span key={bl} className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[8px] font-medium text-rose-600">{bl}</span>
                      ))}
                    </div>
                    {pos && pos.primaryModules.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {pos.primaryModules.slice(0, 4).map((mod) => (
                          <span key={mod} className="rounded bg-slate-100 px-1.5 py-0.5 text-[7px] font-semibold text-slate-500">{mod}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <svg className="mt-1 h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Active Delegations indicator ─────────────────────── */}
          {activeDelegations.length > 0 && (
            <div className="border-t border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs">🔄</span>
                <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                  Active Delegations ({activeDelegations.length})
                </span>
              </div>
              {activeDelegations.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 mb-1 last:mb-0 border border-violet-100">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-[8px] font-bold text-violet-600">
                    {d.delegatorName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-slate-700 truncate">
                      Acting for <span className="text-violet-600">{d.delegatorName}</span>
                    </p>
                    <p className="text-[8px] text-slate-400 truncate">
                      {d.scope === "full-role" ? "Full role" : d.delegatedModules.length + " modules"} · until {d.endDate}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {myRoles.length === 1 && activeDelegations.length === 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] text-slate-400">
              One role assigned. Add more in <span className="font-semibold text-indigo-600">RBAC → Users</span>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR AGENCY CARD — dynamic two-level: Agency → Staff Position
   Shows agency info, position, capabilities, departments, and modules.
   ═══════════════════════════════════════════════════════════════════ */
function SidebarAgencyCard({ activeRoleId, theme }: { activeRoleId: string | null; theme: ReturnType<typeof getRoleTheme> }) {
  const { activeAgencyCode } = useAuth();
  const ctx = resolveAgencyContext(activeRoleId);
  const [expanded, setExpanded] = useState(false);

  if (!ctx) {
    return (
      <div className="mx-2 mt-2 rounded-lg bg-slate-50/80 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${theme.avatarGradient} text-xs font-bold text-white`}>
            {theme.initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-700">{theme.personaName}</p>
            <p className="text-[10px] text-slate-400">{theme.portalLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  const typeColors = AGENCY_TYPE_COLORS[ctx.agency.type];

  return (
    <div className="mx-2 mt-2 overflow-hidden rounded-lg border border-slate-200/50 bg-white">
      {/* Agency header — compact */}
      <div className={`px-3 py-2 ${typeColors.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${theme.avatarGradient} text-xs text-white`}>
            {getAgencyTypeIcon(ctx.agency.type)}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-semibold ${typeColors.text}`}>
              {ctx.agency.name}
            </p>
            <div className="flex items-center gap-1 mt-px">
              <span className="text-[9px] font-medium text-slate-500">{ctx.agency.shortCode}</span>
              <span className="text-[9px] text-slate-300">/</span>
              <span className="text-[9px] text-slate-400">Code {ctx.agency.code}</span>
              {ctx.agency.isCentral && (
                <span className="ml-0.5 rounded bg-amber-100/80 px-1 py-px text-[7px] font-bold text-amber-700">CENTRAL</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Staff position — compact */}
      <div className="border-t border-slate-100/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getPositionEmoji(ctx.position.icon)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-slate-700">{ctx.position.title}</p>
            <p className="truncate text-[9px] text-slate-400">{ctx.position.department}</p>
          </div>
        </div>
      </div>

      {/* Expandable departments — minimal */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between border-t border-slate-100/40 px-3 py-1 text-left transition hover:bg-slate-50/50"
      >
        <span className="text-[9px] text-slate-400">{ctx.agency.departments.length} Departments</span>
        <svg className={`h-2.5 w-2.5 text-slate-300 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-slate-100/40 px-3 py-1.5 space-y-px">
          {ctx.agency.departments.map((dept) => (
            <div key={dept} className="flex items-center gap-1.5">
              <span className={`h-1 w-1 rounded-full ${typeColors.dot}`} />
              <span className="text-[9px] text-slate-500">{dept}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROLE TRANSITION OVERLAY — shows agency + position during switch
   ═══════════════════════════════════════════════════════════════════ */
function RoleTransitionOverlay({ active, activeRoleId }: { active: boolean; activeRoleId: string | null }) {
  const ctx = resolveAgencyContext(activeRoleId);
  const theme = getRoleTheme(activeRoleId);
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-white/85 backdrop-blur-sm animate-[fadeOut_0.7s_ease-in-out_forwards]">
      <div className="flex flex-col items-center gap-4 animate-[scaleIn_0.3s_ease-out]">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatarGradient} shadow-xl`}>
          {ctx ? (
            <span className="text-2xl">{getAgencyTypeIcon(ctx.agency.type)}</span>
          ) : (
            <svg className="h-8 w-8 text-white animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
        {ctx ? (
          <>
            <p className="text-sm font-bold text-slate-800">{ctx.agency.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-base">{getPositionEmoji(ctx.position.icon)}</span>
              <p className="text-xs font-semibold text-indigo-600">{ctx.position.title}</p>
            </div>
          </>
        ) : (
          <p className="text-sm font-bold text-slate-800">Switching to {theme.personaName}</p>
        )}
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: "0.15s" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 animate-pulse" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pageTitle = usePageTitle();
  const { activeRoleId, activeAgencyCode, roleSwitchEpoch, setActiveRoleId, isLoading } = useAuth();

  /* ── ALL hooks MUST be called before any conditional return (Rules of Hooks) ── */
  const isPublicPortal = activeAgencyCode === "EXT" || activeAgencyCode === "MR" || activeAgencyCode === "FI";

  /* Auto-switch to correct public role when external agency is selected */
  useEffect(() => {
    if (isLoading) return;
    if (activeAgencyCode === "EXT" && activeRoleId !== "role-public") {
      setActiveRoleId("role-public");
    } else if (activeAgencyCode === "MR" && activeRoleId !== "role-muster-roll") {
      setActiveRoleId("role-muster-roll");
    } else if (activeAgencyCode === "FI" && activeRoleId !== "role-fi") {
      setActiveRoleId("role-fi");
    }
  }, [isLoading, activeAgencyCode, activeRoleId, setActiveRoleId]);

  const theme = getRoleTheme(activeRoleId);
  const ctx = useMemo(() => resolveAgencyContext(activeRoleId), [activeRoleId, activeAgencyCode]);
  /* Dynamic portal label: agency-specific instead of static role-based */
  const portalLabel = activeAgencyCode === "EXT" ? "Contractor Portal"
    : activeAgencyCode === "MR" ? "Muster Roll Portal"
    : activeAgencyCode === "FI" ? "FI Portal"
    : ctx ? `${ctx.agency.shortCode} Portal` : theme.portalLabel;
  const [transitioning, setTransitioning] = useState(false);
  const [prevEpoch, setPrevEpoch] = useState(roleSwitchEpoch);

  const navigate = useNavigate();
  const location = useLocation();

  /* Detect role / agency switches: transition overlay
     ──────────────────────────────────────────────────────────────────── */
  if (roleSwitchEpoch !== prevEpoch) {
    setPrevEpoch(roleSwitchEpoch);
    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 600);
  }

  /* ── Navigate to home on persona / role switch ──────────────────────
     When a persona switch happens (epoch bumps), the user is effectively
     "logging in" as a different person at a (potentially) different agency.
     The URL must update FULLY: slug, userId, AND page path → home.
     AgencyRouteSync handles slug/userId; we handle the page path here.
     ──────────────────────────────────────────────────────────────────── */
  const prevEpochRef = useRef(roleSwitchEpoch);
  useEffect(() => {
    if (roleSwitchEpoch !== prevEpochRef.current) {
      prevEpochRef.current = roleSwitchEpoch;
      /* Navigate to root → RootRedirect resolves to /:newSlug/:newUserId */
      navigate("/", { replace: true });
    }
  }, [roleSwitchEpoch, navigate]);

  /* Show loading spinner while auth resolves — AFTER all hooks are declared */
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading IFMIS...</p>
        </div>
      </div>
    );
  }

  /* URL prefix updates are handled by AgencyRouteSync in App.tsx.
     RoleGuard handles unauthorized page access for role mismatches. */

  return (
    <div className="relative h-screen overflow-hidden bg-transparent">
      {/* Transition overlay */}
      <RoleTransitionOverlay active={transitioning} activeRoleId={activeRoleId} />

      {/* Inject keyframes */}
      <style>{`
        @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes scaleIn { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
            onClick={() => setMobileNavOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-base font-bold text-gray-900">IFMIS</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300 ${theme.portalChipClass}`}>{portalLabel}</span>
        </div>
        <LiveSubmissionToast />
        <MusterRollLiveToast />
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[260px] flex-col border-r border-slate-200/60 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo area — compact */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${theme.avatarGradient} text-white transition-all duration-500`}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">IFMIS</h1>
            <p className="text-[10px] text-slate-400 transition-all duration-300">{portalLabel}</p>
          </div>
        </div>

        {/* Agency identity card in sidebar */}
        <SidebarAgencyCard activeRoleId={activeRoleId} theme={theme} />

        {/* Navigation — scrollable */}
        <div className="flex-1 overflow-y-auto py-2" key={`sidebar-${roleSwitchEpoch}`}>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </div>

        {/* Footer — minimal */}
        <div className="border-t border-slate-100 px-4 py-2.5">
          <p className="text-[10px] text-slate-400">Royal Government of Bhutan</p>
          <p className="text-[9px] text-slate-300">© 2026 IFMIS</p>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden lg:pl-[260px]">
        {/* Header — clean, single-line */}
        <header className={`sticky top-0 z-30 hidden min-w-0 items-center justify-between gap-3 border-b border-slate-200/60 px-5 py-2 lg:flex transition-all duration-300 ${theme.bannerBgClass}`}>
          {/* Left: page title + context chip + dynamic route breadcrumb */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-sm font-semibold transition-colors duration-300 ${theme.bannerTextClass}`}>{pageTitle}</h2>
              <span className="hidden md:inline text-[11px] text-slate-400">
                {isPublicPortal ? (
                  <>Self-Service · Contractors &amp; Vendors</>
                ) : ctx ? (
                  <>
                    <span className="font-medium text-slate-600">{ctx.agency.shortCode}</span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span>{ctx.position.department}</span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="font-medium text-indigo-600">{ctx.position.title}</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-600">{theme.personaName}</span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span>{theme.personaTagline}</span>
                  </>
                )}
              </span>
            </div>
            {/* Dynamic, route-aware breadcrumb — reflects the current nested route */}
            <RouteBreadcrumb className="mt-0.5" />
          </div>

          {/* Right: controls — tighter spacing */}
          <div className="flex shrink-0 items-center gap-2">
            <span className={`hidden xl:inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium transition-all duration-300 ${theme.portalChipClass}`}>{portalLabel}</span>
            <QuickPersonaSwitcher />
            <AgencyPicker />
            <NotificationBell />
            {!isPublicPortal && <UserPositionPicker />}
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-x-auto overflow-y-auto pt-14 lg:pt-0 bg-slate-50/30" key={`main-${roleSwitchEpoch}`}>
          <div className="min-h-full min-w-0 max-w-full p-4 sm:p-5 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
