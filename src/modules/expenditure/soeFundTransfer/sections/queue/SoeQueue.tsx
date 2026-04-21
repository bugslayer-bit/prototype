/* SoeQueue — list view of every stored SOE & Fund Transfer record.
   Search filters by transfer ID, transfer type, source of fund, receiving
   agency and status. Actions are gated by the active persona. */
import { useMemo, useState } from "react";
import type { StoredSoe } from "../../types";
import { useSoeStore } from "../../state/useSoeStore";
import { StatusPill } from "../../ui/StatusPill";
import { useSoeRoleCapabilities } from "../../state/useSoeRoleCapabilities";
import { filterByQuery } from "../../../../../shared/utils/deepSearch";

interface QueueProps {
  onNewRecord: () => void;
  onEditRecord: (r: StoredSoe) => void;
}

export function SoeQueue({ onNewRecord, onEditRecord }: QueueProps) {
  const { records, removeRecord } = useSoeStore();
  const [search, setSearch] = useState("");
  const caps = useSoeRoleCapabilities();

  /* Deep-search every string/number leaf — any new field added later
     (SoE lines, approvals, reconciliation notes…) is searchable too. */
  const filtered = useMemo(() => filterByQuery(records, search), [records, search]);

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">SOE &amp; Fund Transfer Queue</h2>
          <p className="text-xs text-slate-500">
            {records.length} transfer record{records.length === 1 ? "" : "s"} stored locally
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any field — ID, type, fund, agency, status, amount…"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={onNewRecord}
            disabled={!caps.canCreate}
            title={caps.canCreate ? undefined : `${caps.activeRoleName} cannot create fund transfers`}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
          >
            + New Fund Transfer
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          No SOE / Fund Transfer records yet. Click <strong>New Fund Transfer</strong> to create one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">Transfer ID</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Source Fund</th>
                <th className="px-3 py-2">Originating → Receiving</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{r.header.transferId}</td>
                  <td className="px-3 py-2">{r.header.transferType || "—"}</td>
                  <td className="px-3 py-2">{r.header.sourceOfFund || "—"}</td>
                  <td className="px-3 py-2">
                    {(r.header.originatingAgency || "—") + " → " + (r.header.receivingAgency || "—")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.header.totalAmount || "—"}
                  </td>
                  <td className="px-3 py-2">{r.header.currency || "—"}</td>
                  <td className="px-3 py-2">
                    <StatusPill value={r.header.transferStatus} />
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
  );
}
