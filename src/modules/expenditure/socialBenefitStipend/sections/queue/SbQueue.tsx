/* SbQueue — list view of every stored Social Benefit / Stipend program.
   Uses the shared deep-search walker and keyword-driven KPI counts. */
import { useMemo, useState } from "react";
import type { StoredSb } from "../../types";
import { useSbStore } from "../../state/useSbStore";
import { StatusPill } from "../../ui/StatusPill";
import { useSbRoleCapabilities } from "../../state/useSbRoleCapabilities";
import {
  isActiveStatus,
  isSuspendedStatus,
  isStipendProgram,
  isSocialBenefitProgram,
} from "../../state/useSbMasterData";
import { filterByQuery } from "../../../../../shared/utils/deepSearch";

interface QueueProps {
  onNewRecord: () => void;
  onEditRecord: (r: StoredSb) => void;
}

export function SbQueue({ onNewRecord, onEditRecord }: QueueProps) {
  const { records, removeRecord } = useSbStore();
  const [search, setSearch] = useState("");
  const caps = useSbRoleCapabilities();

  const filtered = useMemo(() => filterByQuery(records, search), [records, search]);

  const kpis = useMemo(() => {
    const total = records.length;
    const stipendProgs = records.filter((r) => isStipendProgram(r.header.programType)).length;
    const benefitProgs = records.filter((r) => isSocialBenefitProgram(r.header.programType)).length;
    const active = records.filter((r) => isActiveStatus(r.header.programStatus)).length;
    const suspended = records.filter((r) => isSuspendedStatus(r.header.programStatus)).length;
    const beneficiaries = records.reduce((a, r) => a + r.beneficiaries.length, 0);
    return { total, stipendProgs, benefitProgs, active, suspended, beneficiaries };
  }, [records]);

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi label="Programs Total" value={kpis.total} tone="slate" />
        <Kpi label="Stipend Programs" value={kpis.stipendProgs} tone="violet" />
        <Kpi label="Social Benefit" value={kpis.benefitProgs} tone="sky" />
        <Kpi label="Active" value={kpis.active} tone="emerald" />
        <Kpi label="Suspended" value={kpis.suspended} tone="amber" />
        <Kpi label="Beneficiaries" value={kpis.beneficiaries} tone="rose" />
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Social Benefits & Stipend Queue</h2>
            <p className="text-xs text-slate-500">
              {records.length} program record{records.length === 1 ? "" : "s"} stored locally
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search any field — program, beneficiary, CID, budget code…"
              className="w-72 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={onNewRecord}
              disabled={!caps.canCreate}
              title={caps.canCreate ? undefined : `${caps.activeRoleName} cannot create programs`}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
            >
              + New Program
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No Social Benefit / Stipend records yet. Click <strong>New Program</strong> to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2">Program ID</th>
                  <th className="px-3 py-2">Program Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Agency</th>
                  <th className="px-3 py-2">Budget Code</th>
                  <th className="px-3 py-2">Beneficiaries</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">{r.header.sbId}</td>
                    <td className="px-3 py-2">{r.header.programName || "—"}</td>
                    <td className="px-3 py-2">{r.header.programType || "—"}</td>
                    <td className="px-3 py-2">{r.header.implementingAgency || "—"}</td>
                    <td className="px-3 py-2 font-mono">{r.header.budgetCode || "—"}</td>
                    <td className="px-3 py-2">{r.beneficiaries.length}</td>
                    <td className="px-3 py-2">
                      <StatusPill value={r.header.programStatus} />
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
