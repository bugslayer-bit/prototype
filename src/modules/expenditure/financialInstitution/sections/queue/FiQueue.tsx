/* FiQueue — list view of every stored Financial Institution record.
   Search uses the shared deep-search utility so it matches any string/number
   leaf of a record. KPI tiles count records via keyword-based semantic
   helpers so master-data renames do not break the logic. */
import { useMemo, useState } from "react";
import type { StoredFi } from "../../types";
import { useFiStore } from "../../state/useFiStore";
import { StatusPill } from "../../ui/StatusPill";
import { useFiRoleCapabilities } from "../../state/useFiRoleCapabilities";
import {
  isActiveStatus,
  isSubmittedStatus,
  isRmaReviewStatus,
  isDtaReviewStatus,
  isSuspendedStatus,
  isHighRisk,
} from "../../state/useFiMasterData";
import { filterByQuery } from "../../../../../shared/utils/deepSearch";

interface QueueProps {
  onNewRecord: () => void;
  onEditRecord: (r: StoredFi) => void;
}

export function FiQueue({ onNewRecord, onEditRecord }: QueueProps) {
  const { records, removeRecord } = useFiStore();
  const [search, setSearch] = useState("");
  const caps = useFiRoleCapabilities();

  /* Deep-search every string/number leaf — no hardcoded field list. */
  const filtered = useMemo(() => filterByQuery(records, search), [records, search]);

  const kpis = useMemo(() => {
    const total = records.length;
    const active = records.filter((r) => isActiveStatus(r.header.registrationStatus)).length;
    const inReview = records.filter(
      (r) =>
        isSubmittedStatus(r.header.registrationStatus) ||
        isRmaReviewStatus(r.header.registrationStatus) ||
        isDtaReviewStatus(r.header.registrationStatus),
    ).length;
    const suspended = records.filter((r) => isSuspendedStatus(r.header.registrationStatus)).length;
    const highRisk = records.filter((r) => isHighRisk(r.header.riskRating)).length;
    return { total, active, inReview, suspended, highRisk };
  }, [records]);

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Institutions Registered" value={kpis.total} tone="slate" />
        <Kpi label="Active" value={kpis.active} tone="emerald" />
        <Kpi label="In Review" value={kpis.inReview} tone="sky" />
        <Kpi label="Suspended" value={kpis.suspended} tone="amber" />
        <Kpi label="High / Critical Risk" value={kpis.highRisk} tone="rose" />
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Financial Institution Queue</h2>
            <p className="text-xs text-slate-500">
              {records.length} institution record{records.length === 1 ? "" : "s"} stored locally
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any field — name, licence, type, status, rating…"
              className="w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={onNewRecord}
              disabled={!caps.canCreate}
              title={caps.canCreate ? undefined : `${caps.activeRoleName} cannot register institutions`}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
            >
              + Register Financial Institution
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No Financial Institution records yet. Click{" "}
            <strong>Register Financial Institution</strong> to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2">FI ID</th>
                  <th className="px-3 py-2">Institution</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Licence No</th>
                  <th className="px-3 py-2">Regulator</th>
                  <th className="px-3 py-2">Region</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{r.header.fiId}</td>
                    <td className="px-3 py-2">{r.header.institutionName || "—"}</td>
                    <td className="px-3 py-2">{r.header.institutionType || "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.header.licenceNumber || "—"}</td>
                    <td className="px-3 py-2">{r.header.regulatoryBody || "—"}</td>
                    <td className="px-3 py-2">{r.header.operatingRegion || "—"}</td>
                    <td className="px-3 py-2">{r.header.riskRating || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusPill value={r.header.registrationStatus} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onEditRecord(r)}
                        className="mr-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                      >
                        {caps.isReadOnly ? "View" : "Open"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecord(r.id)}
                        disabled={!caps.canDelete}
                        title={caps.canDelete ? undefined : `${caps.activeRoleName} cannot delete records`}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  const toneMap: Record<string, string> = {
    slate: "from-slate-50 to-white ring-slate-200 text-slate-900",
    emerald: "from-emerald-50 to-white ring-emerald-200 text-emerald-800",
    sky: "from-sky-50 to-white ring-sky-200 text-sky-800",
    amber: "from-amber-50 to-white ring-amber-200 text-amber-800",
    rose: "from-rose-50 to-white ring-rose-200 text-rose-800",
    violet: "from-violet-50 to-white ring-violet-200 text-violet-800",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 shadow-sm ring-1 ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
