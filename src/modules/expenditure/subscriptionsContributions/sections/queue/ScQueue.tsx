/* ScQueue — list view of every stored Subscription / Contribution entity.
   Uses the shared deep-search walker and keyword-driven KPI counts. */
import { useMemo, useState } from "react";
import type { StoredSc } from "../../types";
import { useScStore } from "../../state/useScStore";
import { StatusPill } from "../../ui/StatusPill";
import { useScRoleCapabilities } from "../../state/useScRoleCapabilities";
import {
  isActiveStatus,
  isSuspendedStatus,
  isClosedStatus,
  isSubscriptionType,
  isContributionType,
  isDomesticScope,
  isInternationalScope,
} from "../../state/useScMasterData";
import { filterByQuery } from "../../../../../shared/utils/deepSearch";

interface QueueProps {
  onNewRecord: () => void;
  onEditRecord: (r: StoredSc) => void;
}

export function ScQueue({ onNewRecord, onEditRecord }: QueueProps) {
  const { records, removeRecord } = useScStore();
  const [search, setSearch] = useState("");
  const caps = useScRoleCapabilities();

  const filtered = useMemo(() => filterByQuery(records, search), [records, search]);

  const kpis = useMemo(() => {
    const total = records.length;
    const subs = records.filter((r) => isSubscriptionType(r.header.txnType)).length;
    const contribs = records.filter((r) => isContributionType(r.header.txnType)).length;
    const domestic = records.filter((r) => isDomesticScope(r.header.scope)).length;
    const international = records.filter((r) => isInternationalScope(r.header.scope)).length;
    const active = records.filter((r) => isActiveStatus(r.header.entityStatus)).length;
    const suspended = records.filter((r) => isSuspendedStatus(r.header.entityStatus)).length;
    const closed = records.filter((r) => isClosedStatus(r.header.entityStatus)).length;
    return { total, subs, contribs, domestic, international, active, suspended, closed };
  }, [records]);

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Entities Total" value={kpis.total} tone="slate" />
        <Kpi label="Subscriptions" value={kpis.subs} tone="violet" />
        <Kpi label="Contributions" value={kpis.contribs} tone="sky" />
        <Kpi label="Domestic" value={kpis.domestic} tone="blue" />
        <Kpi label="International" value={kpis.international} tone="fuchsia" />
        <Kpi label="Active" value={kpis.active} tone="emerald" />
        <Kpi label="Suspended" value={kpis.suspended} tone="amber" />
        <Kpi label="Closed" value={kpis.closed} tone="rose" />
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Subscriptions & Contributions Queue</h2>
            <p className="text-xs text-slate-500">
              {records.length} entity record{records.length === 1 ? "" : "s"} stored locally
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any field — entity, organisation, SWIFT, budget code…"
              className="w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={onNewRecord}
              disabled={!caps.canCreate}
              title={caps.canCreate ? undefined : `${caps.activeRoleName} cannot register entities`}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
            >
              + New Entity
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No Subscription / Contribution records yet. Click <strong>New Entity</strong> to register one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2">Entity ID</th>
                  <th className="px-3 py-2">Entity Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2">Organisation</th>
                  <th className="px-3 py-2">Currency</th>
                  <th className="px-3 py-2">Budget Code</th>
                  <th className="px-3 py-2">Txns</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{r.header.scId}</td>
                    <td className="px-3 py-2">{r.header.entityName || "—"}</td>
                    <td className="px-3 py-2">{r.header.txnType || "—"}</td>
                    <td className="px-3 py-2">{r.header.scope || "—"}</td>
                    <td className="px-3 py-2">{r.header.organisationType || "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.header.currency || "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.header.budgetCode || "—"}</td>
                    <td className="px-3 py-2">{r.transactions.length}</td>
                    <td className="px-3 py-2">
                      <StatusPill value={r.header.entityStatus} />
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
    blue: "from-blue-50 to-white ring-blue-200 text-blue-800",
    amber: "from-amber-50 to-white ring-amber-200 text-amber-800",
    rose: "from-rose-50 to-white ring-rose-200 text-rose-800",
    violet: "from-violet-50 to-white ring-violet-200 text-violet-800",
    fuchsia: "from-fuchsia-50 to-white ring-fuchsia-200 text-fuchsia-800",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 shadow-sm ring-1 ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
