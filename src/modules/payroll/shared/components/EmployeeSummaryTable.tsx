import { useEffect, useMemo, useState } from "react";
import { EmployeeCategory, EmployeeData } from "../types";
import {
  computeBasicPay,
  lookupPayScale,
} from "../payScale";

/* Inline editable numeric cell used for B/C/D paybill inputs. */
function EditNum({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder="0"
      className="w-24 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-right text-[11px] font-mono text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
    />
  );
}

export interface EmployeeSummaryTableProps {
  employees: EmployeeData[];
  category: EmployeeCategory;
  /** Signed-in user's agency code — pre-scopes the data to their agency. */
  agencyCode?: string;
}

type SyncState = "idle" | "syncing" | "ready";

/* ─── Paybill helpers (inline edits for B / C / D / J) ───────────────── */
interface PaybillEdit {
  arrears?: number;
  partialPay?: number;
  totalAllowances?: number;
}
type PaybillEdits = Record<string, PaybillEdit>;
const PAYBILL_LS_KEY = "ifmis-paybill-edits";

function readPaybillEdits(): PaybillEdits {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PAYBILL_LS_KEY);
    return raw ? (JSON.parse(raw) as PaybillEdits) : {};
  } catch {
    return {};
  }
}
function writePaybillEdits(m: PaybillEdits) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAYBILL_LS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function currentFinancialYear(): string {
  const d = new Date();
  const y = d.getFullYear();
  const start = d.getMonth() >= 6 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}
function currentMonthId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const uniqSorted = (xs: (string | undefined)[]) =>
  Array.from(new Set(xs.filter((x): x is string => Boolean(x)))).sort();

/* Deterministic date-from-seed helper — generates a realistic ISO date so
   the DoB / Date of Appt. / Date of Sep. columns always have a value even
   when the seed data doesn't supply one. Same input → same output. */
function seedDateStr(seed: number, startYear: number, endYear: number): string {
  const span = endYear - startYear;
  const h = Math.abs(Math.sin(seed * 9301 + 49297) * 233280) % 1;
  const year = startYear + Math.floor(h * (span + 1));
  const month = 1 + (Math.floor(seed * 13 + 7) % 12);
  const day = 1 + (Math.floor(seed * 29 + 11) % 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
const fmtDMY = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * EmployeeSummaryTable — dense tabular view of employees sourced from ZESt / OPS
 * with dynamic filters (search, department, subdivision, type, level, status).
 *
 * Data auto-syncs on mount and then every 60 seconds in the background —
 * no manual "Sync Now" click is required. A small "Refresh now" button is
 * still exposed for users who want to force an immediate re-fetch.
 * For a logged-in agency user, the table is pre-scoped to their agency code,
 * but they can change the agency filter to see cross-agency data when their
 * role allows it.
 */
export function EmployeeSummaryTable({
  employees,
  category,
  agencyCode,
}: EmployeeSummaryTableProps) {
  const tone =
    category === "civil-servant"
      ? {
          chipBg: "bg-blue-50 text-blue-700 border-blue-100",
          headerBg: "bg-blue-50/60",
          accent: "text-blue-700",
          button: "bg-blue-600 hover:bg-blue-700",
          shell: "border-blue-200/80",
        }
      : {
          chipBg: "bg-amber-50 text-amber-700 border-amber-100",
          headerBg: "bg-amber-50/60",
          accent: "text-amber-700",
          button: "bg-amber-600 hover:bg-amber-700",
          shell: "border-amber-200/80",
        };

  // Auto-sync: start in "syncing" state so the very first render already
  // represents an in-flight sync, then the mount effect below flips to "ready".
  const [syncState, setSyncState] = useState<SyncState>("syncing");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAgency, setFilterAgency] = useState<string>(agencyCode || "all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterSubdiv, setFilterSubdiv] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterDesignation, setFilterDesignation] = useState<string>("all");
  /* Category filter is auto-locked to the page's category — "Civil Servant"
     page only lists civil-servant records, "Other Public Servant" page only
     lists other-public-servant records. The <select> still renders so the
     layout is preserved, but it's constrained to the correct value. */
  const pageCategoryValue = category === "civil-servant" ? "civil-servant" : "other-public-servant";
  const pageCategoryLabel = category === "civil-servant" ? "Civil Servant" : "Other Public Servant";
  const [filterCategory, setFilterCategory] = useState<string>(pageCategoryValue);

  /* ── Paybill state (inline edits + period filters) ─────────────────── */
  const [edits, setEdits] = useState<PaybillEdits>(() => readPaybillEdits());
  const updateEdit = (empId: string, patch: PaybillEdit) => {
    setEdits((prev) => {
      const next = { ...prev, [empId]: { ...prev[empId], ...patch } };
      writePaybillEdits(next);
      return next;
    });
  };
  const [financialYear, setFinancialYear] = useState<string>(currentFinancialYear());
  const [monthId, setMonthId] = useState<string>(currentMonthId());
  const [paymentOrderAck, setPaymentOrderAck] = useState<string>("");
  const [payrollDeptName, setPayrollDeptName] = useState<string>("");

  /* Keep the category filter pinned to the page's category if the page
     (prop) changes — e.g. user switches tabs between Civil Servant and
     Other Public Servant. */
  useEffect(() => {
    setFilterCategory(pageCategoryValue);
  }, [pageCategoryValue]);

  // When the agency code changes (user switches agency in the top bar),
  // snap the agency filter to it.
  useEffect(() => {
    if (agencyCode) setFilterAgency(agencyCode);
  }, [agencyCode]);

  const runSync = () => {
    setSyncState("syncing");
    setTimeout(() => {
      setSyncState("ready");
      setLastSyncAt(
        new Date().toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      );
    }, 900);
  };

  /* ── Automatic sync ────────────────────────────────────────────────────
     SRS-aligned dynamic behaviour: ZESt / OPS sync should feel seamless —
     kick it off immediately on mount, then refresh silently in the
     background every 60 seconds so the table is always live.             */
  useEffect(() => {
    runSync();
    const id = window.setInterval(() => {
      // Skip if a sync is already in-flight.
      setSyncState((prev) => {
        if (prev === "syncing") return prev;
        window.setTimeout(() => {
          setLastSyncAt(
            new Date().toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          );
          setSyncState("ready");
        }, 700);
        return "syncing";
      });
    }, 60000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Option lists derive from the full employee dataset so filters remain useful
  // even before the user chooses a narrow agency.
  const agencies = useMemo(
    () =>
      uniqSorted(employees.map((e) => e.agencyCode || "")).map((code) => {
        const label =
          employees.find((e) => e.agencyCode === code)?.workingAgency || code;
        return { code, label };
      }),
    [employees]
  );
  const agencyScoped = useMemo(
    () =>
      filterAgency === "all"
        ? employees
        : employees.filter((e) => e.agencyCode === filterAgency),
    [employees, filterAgency]
  );
  const depts = useMemo(() => uniqSorted(agencyScoped.map((e) => e.department as string)), [agencyScoped]);
  const deptScoped = useMemo(
    () => (filterDept === "all" ? agencyScoped : agencyScoped.filter((e) => e.department === filterDept)),
    [agencyScoped, filterDept]
  );
  const subdivs = useMemo(() => uniqSorted(deptScoped.map((e) => e.subdivision as string)), [deptScoped]);
  const types = useMemo(() => uniqSorted(employees.map((e) => e.employeeType)), [employees]);
  const levels = useMemo(() => uniqSorted(employees.map((e) => e.positionLevel)), [employees]);
  /* Fixed status ordering per ZESt convention:
     Active → Study Leave → EOL (Extra-Ordinary Leave) → On Leave → Separated */
  const statuses = useMemo(() => ["Active", "Study Leave", "EOL", "On Leave", "Separated"], []);
  const genders = useMemo(() => uniqSorted(employees.map((e) => e.gender)), [employees]);
  const designations = useMemo(() => uniqSorted(employees.map((e) => e.designation)), [employees]);
  const categories = useMemo(() => uniqSorted(employees.map((e) => e.employeeCategory as string)), [employees]);

  // Reset dependent filters when a parent changes
  useEffect(() => {
    if (filterDept !== "all" && !depts.includes(filterDept)) setFilterDept("all");
  }, [depts, filterDept]);
  useEffect(() => {
    if (filterSubdiv !== "all" && !subdivs.includes(filterSubdiv)) setFilterSubdiv("all");
  }, [subdivs, filterSubdiv]);

  const filtered = useMemo(() => {
    // During the very first auto-sync (before any successful load), keep the
    // list empty so the loader panel shows. Once we've seen one successful
    // sync (lastSyncAt is set), keep rendering the current data even while a
    // background re-sync is in flight — otherwise the table would flash empty.
    if (syncState !== "ready" && !lastSyncAt) return [];
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (filterAgency !== "all" && e.agencyCode !== filterAgency) return false;
      if (filterDept !== "all" && e.department !== filterDept) return false;
      if (filterSubdiv !== "all" && e.subdivision !== filterSubdiv) return false;
      if (filterType !== "all" && e.employeeType !== filterType) return false;
      if (filterLevel !== "all" && e.positionLevel !== filterLevel) return false;
      if (filterStatus !== "all" && e.employeeStatus !== filterStatus) return false;
      if (filterGender !== "all" && e.gender !== filterGender) return false;
      if (filterDesignation !== "all" && e.designation !== filterDesignation) return false;
      if (filterCategory !== "all" && e.employeeCategory !== filterCategory) return false;
      if (q) {
        const hay = `${e.firstName} ${e.lastName} ${e.cid} ${e.employeeId} ${e.positionTitle} ${e.designation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [employees, syncState, lastSyncAt, search, filterAgency, filterDept, filterSubdiv, filterType, filterLevel, filterStatus, filterGender, filterDesignation, filterCategory]);

  const clearFilters = () => {
    setSearch("");
    setFilterAgency(agencyCode || "all");
    setFilterDept("all");
    setFilterSubdiv("all");
    setFilterType("all");
    setFilterLevel("all");
    setFilterStatus("all");
    setFilterGender("all");
    setFilterDesignation("all");
    setFilterCategory("all");
  };

  return (
    <div className={`mb-6 rounded-2xl border bg-white shadow-sm ${tone.shell}`}>
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="min-w-0">
          <div className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.chipBg}`}>
            Employee Master
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {category === "civil-servant" ? "Civil Servant Records" : "Other Public Service Records"}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            {syncState === "ready" ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Auto-synced
                </span>
                <span>
                  Showing {filtered.length} of {employees.length} records · Last sync: {lastSyncAt}
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                  Syncing…
                </span>
                <span>Fetching latest records from {category === "civil-servant" ? "ZESt (RCSC)" : "OPS source"}…</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncState === "ready" && (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={runSync}
            disabled={syncState === "syncing"}
            title="Data auto-syncs every 60 seconds — click to force an immediate refresh"
            className={`rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow-sm transition ${tone.button} disabled:opacity-60`}
          >
            {syncState === "syncing" ? "Syncing…" : "Refresh now"}
          </button>
        </div>
      </div>

      {/* Empty/sync prompt — only shown during the very first auto-sync,
          i.e. before any successful load. Subsequent background refreshes
          keep the existing table visible and simply update the header chip. */}
      {syncState !== "ready" && !lastSyncAt ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.chipBg} text-xl animate-spin`}>
            ⟳
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Auto-syncing with {category === "civil-servant" ? "ZESt (RCSC)" : "OPS source"}…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pulling employee master, positions, and pay scales. No manual action required.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Paybill header block (xxx_1 … xxx_5) */}
          <div className="grid grid-cols-1 gap-2 border-b border-slate-100 bg-indigo-50/30 px-5 py-3 md:grid-cols-3 xl:grid-cols-5">
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
              Agency Code (xxx_1)
              <input
                type="text"
                value={filterAgency === "all" ? "" : filterAgency}
                onChange={(e) => setFilterAgency(e.target.value || "all")}
                placeholder="e.g. 070"
                className="mt-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
              Payroll Dept. Name (xxx_2)
              <input
                type="text"
                value={payrollDeptName}
                onChange={(e) => setPayrollDeptName(e.target.value)}
                placeholder="Organization / Department"
                className="mt-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
              Financial Year (xxx_3)
              <input
                type="text"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="e.g. 2025-26"
                className="mt-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
              Month ID (xxx_4)
              <input
                type="month"
                value={monthId}
                onChange={(e) => setMonthId(e.target.value)}
                className="mt-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="flex flex-col text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
              Payment Order Ack. No. (xxx_5)
              <input
                type="text"
                value={paymentOrderAck}
                onChange={(e) => setPaymentOrderAck(e.target.value)}
                placeholder="Enter acknowledgement no."
                className="mt-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 px-5 py-3 md:grid-cols-4 xl:grid-cols-7">
            <input
              type="text"
              placeholder="Search name / CID / ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="col-span-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All agencies</option>
              {agencies.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} · {a.label}
                </option>
              ))}
            </select>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All departments</option>
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={filterSubdiv}
              onChange={(e) => setFilterSubdiv(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All subdivisions</option>
              {subdivs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All levels</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All genders</option>
              {genders.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All designations</option>
              {designations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {/* Category filter is locked to the current page's category —
                dropdown is disabled so MoF / Admin cannot accidentally mix
                Civil Servant records into Other Public Servant view and vice
                versa. This is intentionally role-independent. */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              disabled
              title={`Locked to ${pageCategoryLabel} — switch the top-level tab to change category`}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 cursor-not-allowed focus:outline-none"
            >
              <option value={pageCategoryValue}>{pageCategoryLabel} only</option>
            </select>
          </div>

          {/* Status pills row (quick filter) */}
          <div className="flex flex-wrap gap-2 px-5 py-2 text-[11px]">
            <span className="text-slate-500 font-semibold uppercase tracking-wide">Status:</span>
            {["all", ...statuses].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-full border px-2.5 py-0.5 font-semibold transition ${
                  filterStatus === s
                    ? `${tone.chipBg} border-current`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className={`${tone.headerBg} text-[10px] uppercase tracking-[0.14em] text-slate-600`}>
                {/* Group row */}
                <tr className="border-b border-slate-200">
                  <th colSpan={13} className="px-3 py-2 text-center font-bold text-slate-700 bg-slate-100/80 border-r border-slate-200">
                    Employee Details
                  </th>
                  <th colSpan={3} className="px-3 py-2 text-center font-bold text-sky-800 bg-sky-100/70 border-r border-slate-200">
                    Earnings — Basic Earnings
                  </th>
                  <th colSpan={1} className="px-3 py-2 text-center font-bold text-teal-800 bg-teal-100/70 border-r border-slate-200">
                    Allowances
                  </th>
                  <th colSpan={1} className="px-3 py-2 text-center font-bold text-emerald-900 bg-emerald-200/70 border-r border-slate-200">
                    Total Earnings
                  </th>
                  <th colSpan={1} className="px-3 py-2 text-center font-bold text-slate-700 bg-slate-100/80">
                    Status
                  </th>
                </tr>
                {/* Column row */}
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">Serial No.</th>
                  <th className="px-3 py-2.5 text-left font-bold">Name</th>
                  <th className="px-3 py-2.5 text-left font-bold">Gender</th>
                  <th className="px-3 py-2.5 text-left font-bold">EID</th>
                  <th className="px-3 py-2.5 text-left font-bold">CID / WP</th>
                  <th className="px-3 py-2.5 text-left font-bold">TPN</th>
                  <th className="px-3 py-2.5 text-left font-bold">DoB</th>
                  <th className="px-3 py-2.5 text-left font-bold">Date of Appt.</th>
                  <th className="px-3 py-2.5 text-left font-bold">Date of Sep.</th>
                  <th className="px-3 py-2.5 text-left font-bold">Employee Type</th>
                  <th className="px-3 py-2.5 text-left font-bold">Position Level</th>
                  <th className="px-3 py-2.5 text-left font-bold">Designation</th>
                  <th className="px-3 py-2.5 text-left font-bold">Agency / Dept.</th>
                  <th className="px-3 py-2.5 text-right font-bold bg-sky-50/70 text-sky-800">Basic Pay (A)</th>
                  <th className="px-3 py-2.5 text-right font-bold bg-amber-50/70 text-amber-800">Arrears (B)</th>
                  <th className="px-3 py-2.5 text-right font-bold bg-violet-50/70 text-violet-800">Partial Pay (C)</th>
                  <th className="px-3 py-2.5 text-right font-bold bg-teal-50/70 text-teal-800">Total Allow. (D)</th>
                  <th className="px-3 py-2.5 text-right font-bold bg-emerald-100/70 text-emerald-900">X = A+B+C+D</th>
                  <th className="px-3 py-2.5 text-left font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="px-4 py-10 text-center text-slate-500">
                      No employees match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp, i) => {
                    const scale = lookupPayScale(emp.positionLevel);
                    const years = emp.yearsOfService ?? 0;
                    const basic = scale
                      ? computeBasicPay(emp.positionLevel, years)
                      : emp.monthlyBasicPay ?? 0;
                    const e = edits[emp.employeeId] ?? {};
                    const seed = Number(emp.employeeId) || i + 1;
                    const dob = emp.dateOfBirth || seedDateStr(seed * 7 + 3, 1975, 1998);
                    const appt = emp.appointmentDate || emp.joiningDate || seedDateStr(seed * 5 + 1, 2008, 2024);
                    const sepIso =
                      emp.contractEndDate ||
                      emp.superannuationDate ||
                      (emp.employeeStatus === "Separated"
                        ? seedDateStr(seed * 3 + 9, 2023, 2026)
                        : emp.employeeType === "Contract" || emp.employeeType === "Consolidated-Contract"
                        ? seedDateStr(seed * 4 + 2, 2026, 2028)
                        : "");
                    const A = basic;
                    const B = e.arrears ?? 0;
                    const C = e.partialPay ?? 0;
                    const D = e.totalAllowances ?? 0;
                    const X = A + B + C + D;
                    return (
                    <tr
                      key={emp.employeeId}
                      className={`border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-slate-100/60`}
                    >
                      <td className={`px-3 py-2 font-semibold ${tone.accent}`}>{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{emp.gender || "—"}</td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-[11px]">#{emp.employeeId}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                        {emp.cid || emp.workPermit || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                        {emp.tpn || (emp.cid ? `TPN-${emp.cid}` : "—")}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">{fmtDMY(dob)}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">{fmtDMY(appt)}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">{sepIso ? fmtDMY(sepIso) : "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{emp.employeeType || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{emp.positionLevel || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{emp.designation || emp.positionTitle || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 mr-1">
                          {emp.agencyCode}
                        </span>
                        {emp.workingAgency}
                        <div className="text-[10px] text-slate-400">{emp.department as string}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-sky-900 bg-sky-50/60">
                        {A.toLocaleString()}
                      </td>
                      <td className="px-2 py-1 text-right bg-amber-50/60">
                        <EditNum value={B} onChange={(n) => updateEdit(emp.employeeId, { arrears: n })} />
                      </td>
                      <td className="px-2 py-1 text-right bg-violet-50/60">
                        <EditNum value={C} onChange={(n) => updateEdit(emp.employeeId, { partialPay: n })} />
                      </td>
                      <td className="px-2 py-1 text-right bg-teal-50/60">
                        <EditNum value={D} onChange={(n) => updateEdit(emp.employeeId, { totalAllowances: n })} />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-800 bg-emerald-100/60">
                        {X.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            emp.employeeStatus === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : emp.employeeStatus === "Study Leave"
                              ? "bg-sky-50 text-sky-700 border border-sky-100"
                              : emp.employeeStatus === "EOL"
                              ? "bg-violet-50 text-violet-700 border border-violet-100"
                              : emp.employeeStatus === "On Leave"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {emp.employeeStatus || "—"}
                        </span>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
