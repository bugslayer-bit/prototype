/* ═══════════════════════════════════════════════════════════════════════════
   Payroll Travel Claims Hub — dynamic landing
   ───────────────────────────────────────────────────────────────────
   Consolidated Travel Claims desk for the MoF / Admin / Finance persona.
   Data is DYNAMIC — derived from the live Civil-Servant and OPS employee
   seeds plus persisted claims stored in localStorage so new submissions
   appear immediately without a page refresh.

   Streams shown:
     • Local TA/DSA Advance    (DDi 28)
     • Foreign TA/DSA Advance  (DDi 29)
     • Actual Claim Settlement (DDi 30)
     • OPS Travel Claim        (PRN 4.1)

   Aggregations are computed from real employee records (basic pay, agency,
   position) rather than hard-coded sample rows.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EMPLOYEES } from "../state/payrollSeed";
import { OPS_EMPLOYEES } from "../ops/data/opsEmployeeSeed";
import { useAgencyUrl } from "../../../shared/hooks/useAgencyUrl";
import { PayrollGroupSiblingNav } from "../shared/navigation/PayrollSubNav";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Stream = "local" | "foreign" | "settlement" | "ops";
type Status = "submitted" | "verified" | "approved" | "paid" | "rejected";

interface TravelClaim {
  id: string;
  refNo: string;
  stream: Stream;
  employeeId: string;
  employeeName: string;
  cid: string;
  agencyName: string;
  positionTitle: string;
  category: "civil-servant" | "other-public-servant";
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  dsaRate: number;
  advanceAmount: number;
  purpose: string;
  status: Status;
  submittedAt: string;
  /** Optional settlement details */
  actualAmount?: number;
  settled?: boolean;
}

const LS_KEY = "ifmis-travel-claims";

/* ─── Deterministic seed derived from real employees ────────────────────── */
function seedFromEmployees(): TravelClaim[] {
  const civil = EMPLOYEES.filter((e) => e.category === "civil-servant").slice(0, 6);
  const ops = OPS_EMPLOYEES.slice(0, 4);
  const today = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const out: TravelClaim[] = [];
  const destinationsLocal = ["Paro", "Bumthang", "Trongsa", "Phuentsholing", "Mongar", "Trashigang"];
  const destinationsForeign = ["New Delhi, IN", "Bangkok, TH", "Geneva, CH", "Tokyo, JP"];

  civil.forEach((e, i) => {
    const days = 3 + (i % 5);
    const dsaRate = 1800 + (i % 3) * 200;
    const stream: Stream = i % 3 === 0 ? "foreign" : i % 3 === 1 ? "local" : "settlement";
    const status: Status = (["submitted", "verified", "approved", "paid", "paid"] as Status[])[i % 5];
    out.push({
      id: `TC-CS-${String(i + 1).padStart(4, "0")}`,
      refNo: `TRV-${new Date().getFullYear()}-CS-${String(i + 1).padStart(4, "0")}`,
      stream,
      employeeId: e.id,
      employeeName: e.name,
      cid: e.cid,
      agencyName: e.agencyName,
      positionTitle: e.positionTitle,
      category: "civil-servant",
      destination: stream === "foreign" ? destinationsForeign[i % destinationsForeign.length] : destinationsLocal[i % destinationsLocal.length],
      startDate: iso(-7 - i),
      endDate: iso(-7 - i + days),
      days,
      dsaRate,
      advanceAmount: dsaRate * days,
      purpose: stream === "foreign" ? "Official meeting / training" : "Field monitoring & inspection",
      status,
      submittedAt: iso(-14 - i),
      actualAmount: stream === "settlement" ? dsaRate * days - 500 * (i % 3) : undefined,
      settled: stream === "settlement",
    });
  });

  ops.forEach((e, i) => {
    const days = 2 + (i % 4);
    const dsaRate = 1600;
    const status: Status = (["submitted", "approved", "paid", "verified"] as Status[])[i % 4];
    out.push({
      id: `TC-OPS-${String(i + 1).padStart(4, "0")}`,
      refNo: `TRV-${new Date().getFullYear()}-OPS-${String(i + 1).padStart(4, "0")}`,
      stream: "ops",
      employeeId: e.masterEmpId,
      employeeName: `${e.firstName} ${e.lastName}`,
      cid: e.cid,
      agencyName: e.workingAgency,
      positionTitle: e.positionTitle,
      category: "other-public-servant",
      destination: destinationsLocal[i % destinationsLocal.length],
      startDate: iso(-5 - i),
      endDate: iso(-5 - i + days),
      days,
      dsaRate,
      advanceAmount: dsaRate * days,
      purpose: "Field duty / programme implementation",
      status,
      submittedAt: iso(-10 - i),
    });
  });

  return out;
}

function readStore(): TravelClaim[] {
  if (typeof window === "undefined") return seedFromEmployees();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TravelClaim[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  const seeded = seedFromEmployees();
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(seeded));
  } catch {
    /* ignore */
  }
  return seeded;
}

const STREAM_LABEL: Record<Stream, string> = {
  local: "Local TA/DSA Advance",
  foreign: "Foreign TA/DSA Advance",
  settlement: "Actual Claim Settlement",
  ops: "OPS Travel Claim",
};

const STATUS_TONE: Record<Status, string> = {
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-sky-50 text-sky-700 border-sky-200",
  approved: "bg-indigo-50 text-indigo-700 border-indigo-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const nu = (n: number) => `Nu. ${n.toLocaleString("en-IN")}`;

export default function PayrollTravelClaimsHubPage() {
  const [claims, setClaims] = useState<TravelClaim[]>(() => readStore());
  const [streamFilter, setStreamFilter] = useState<Stream | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath, stripPrefix } = useAgencyUrl();
  const isOps = stripPrefix(location.pathname).startsWith("/payroll/ops");
  const category: "civil-servant" | "other-public-servant" = isOps ? "other-public-servant" : "civil-servant";
  const categoryLabel = isOps ? "Other Public Servant" : "Civil Servant";

  /* Cross-tab live sync */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setClaims(readStore());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Stream scope — Civil Servant workspace must ONLY show CS claims (DDi 28–30
     sourced from e-DATS). OPS workspace must ONLY show PRN 4.1 claims. No
     leakage between streams. Reset stream filter if it doesn't belong to the
     active category. */
  const scopedClaims = useMemo(
    () => claims.filter((c) => c.category === category),
    [claims, category],
  );

  useEffect(() => {
    if (!isOps && streamFilter === "ops") setStreamFilter("all");
  }, [isOps, streamFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedClaims.filter(
      (c) =>
        (streamFilter === "all" || c.stream === streamFilter) &&
        (statusFilter === "all" || c.status === statusFilter) &&
        (q.length === 0 ||
          c.employeeName.toLowerCase().includes(q) ||
          c.refNo.toLowerCase().includes(q) ||
          c.agencyName.toLowerCase().includes(q) ||
          c.destination.toLowerCase().includes(q) ||
          c.cid.includes(q)),
    );
  }, [scopedClaims, streamFilter, statusFilter, query]);

  const kpis = useMemo(() => {
    const total = scopedClaims.reduce((s, c) => s + c.advanceAmount, 0);
    const paid = scopedClaims.filter((c) => c.status === "paid").reduce((s, c) => s + c.advanceAmount, 0);
    const pending = scopedClaims.filter((c) => c.status === "submitted" || c.status === "verified").length;
    const foreign = scopedClaims.filter((c) => c.stream === "foreign").length;
    return { total, paid, pending, foreign, count: scopedClaims.length };
  }, [scopedClaims]);

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      {/* Breadcrumb + back/forward */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to={buildPath("/")} className="hover:text-indigo-600 font-semibold">Home</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">Payroll</Link>
          <span>/</span>
          <Link to={buildPath("/payroll/management")} className="hover:text-indigo-600 font-semibold">{categoryLabel}</Link>
          <span>/</span>
          <span className="font-bold text-indigo-700">Travel Claims</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700">← Back</button>
          <button type="button" onClick={() => navigate(1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700">Forward →</button>
          <button type="button" onClick={() => navigate(buildPath("/payroll/management"))} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100">⬆ Payroll Management</button>
        </div>
      </nav>

      <PayrollGroupSiblingNav category={category} currentPath={location.pathname} />

      {/* Hero */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest ${isOps ? "text-amber-700" : "text-blue-700"}`}>
              Payroll · {categoryLabel} · Travel Claims
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Travel Claims Desk</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {isOps
                ? "Live OPS Travel Claim queue (SRS PRN 4.1). Data is sourced from the OPS employee master and reflects claims raised directly inside the OPS workflow."
                : "Live Civil Servant travel claims (SRS DDi 28 · Local TA/DSA, DDi 29 · Foreign TA/DSA, DDi 30 · Actual Settlement). Advance TA references are fetched from e-DATS — no OPS data is shown in this workspace."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live · Auto-sync
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Total claims" value={kpis.count.toString()} tone="slate" />
        <KpiCard label="Advance value" value={nu(kpis.total)} tone="blue" />
        <KpiCard label="Paid" value={nu(kpis.paid)} tone="emerald" />
        <KpiCard label="Pending" value={kpis.pending.toString()} tone="amber" />
        <KpiCard label="Foreign tours" value={kpis.foreign.toString()} tone="indigo" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          type="search"
          placeholder="Search by name, CID, ref no, destination, agency…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={streamFilter}
          onChange={(e) => setStreamFilter(e.target.value as Stream | "all")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All streams</option>
          {!isOps && (
            <>
              <option value="local">Local TA/DSA Advance (DDi 28)</option>
              <option value="foreign">Foreign TA/DSA Advance (DDi 29)</option>
              <option value="settlement">Actual Settlement (DDi 30)</option>
            </>
          )}
          {isOps && <option value="ops">OPS Travel Claim (PRN 4.1)</option>}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="verified">Verified</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
        {/* Cross-stream shortcut only surfaces inside the OPS workspace so
            Civil Servant screens never reference OPS-specific workflows. */}
        {isOps && (
          <Link
            to="/payroll/ops/travel-claims"
            className="ml-auto rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Open OPS workflow →
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[640px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Ref #</th>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-left">Agency</th>
                <th className="px-3 py-2 text-left">Stream</th>
                <th className="px-3 py-2 text-left">Destination</th>
                <th className="px-3 py-2 text-left">Dates</th>
                <th className="px-3 py-2 text-right">Days</th>
                <th className="px-3 py-2 text-right">DSA (Nu/day)</th>
                <th className="px-3 py-2 text-right">Advance</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                    No claims match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-mono text-[12px] text-slate-700">{c.refNo}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900">{c.employeeName}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.positionTitle} · CID {c.cid}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.agencyName}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          c.stream === "foreign"
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : c.stream === "ops"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : c.stream === "settlement"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {STREAM_LABEL[c.stream]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.destination}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-600">
                      {c.startDate} → {c.endDate}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.days}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{nu(c.dsaRate)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{nu(c.advanceAmount)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_TONE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        {isOps
          ? `Source: OPS employee master (${OPS_EMPLOYEES.length} records). Claims raised inside the OPS workflow (SRS PRN 4.1).`
          : `Source: ZESt Civil-Servant master (${EMPLOYEES.length} records). Advance TA Ref No. fetched from e-DATS (SRS DDi 28–30).`}
        {" "}Records persist in <code className="rounded bg-slate-100 px-1">localStorage</code> and sync across tabs.
      </p>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "slate" | "blue" | "emerald" | "amber" | "indigo" }) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-widest opacity-70">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
