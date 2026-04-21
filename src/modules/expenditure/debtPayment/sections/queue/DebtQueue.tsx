/* DebtQueue — list view of every stored Debt Servicing record.
   Search box filters by ID, loan no, creditor, category, status. */
import { useMemo, useState } from "react";
import type { StoredDebt } from "../../types";
import { useDebtStore } from "../../state/useDebtStore";
import { StatusPill } from "../../ui/StatusPill";
import { useDebtRoleCapabilities } from "../../state/useDebtRoleCapabilities";
import { filterByQuery } from "../../../../../shared/utils/deepSearch";

interface QueueProps {
  onNewRecord: () => void;
  onEditRecord: (r: StoredDebt) => void;
}

export function DebtQueue({ onNewRecord, onEditRecord }: QueueProps) {
  const { debts, removeDebt } = useDebtStore();
  const [search, setSearch] = useState("");
  const caps = useDebtRoleCapabilities();

  /* Deep-search every string/number leaf in each record so search is
     truly dynamic and automatically covers new fields. */
  const filtered = useMemo(() => filterByQuery(debts, search), [debts, search]);

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Debt Servicing Queue</h2>
          <p className="text-xs text-slate-500">
            {debts.length} debt servicing record{debts.length === 1 ? "" : "s"} stored locally
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any field — ID, loan, creditor, status, amount…"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={onNewRecord}
            disabled={!caps.canCreate}
            title={caps.canCreate ? undefined : `${caps.activeRoleName} cannot create debt servicing records`}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
          >
            + New Debt Servicing
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          No debt servicing records yet. Click <strong>New Debt Servicing</strong> to register one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">Debt ID</th>
                <th className="px-3 py-2">Loan No (Gov)</th>
                <th className="px-3 py-2">Creditor</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Principal</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{d.header.debtServicingId}</td>
                  <td className="px-3 py-2">{d.header.loanInstrumentIdGov || "—"}</td>
                  <td className="px-3 py-2">{d.header.creditorName || "—"}</td>
                  <td className="px-3 py-2">{d.header.debtCategory || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {d.header.principalLoanAmount || "—"}
                  </td>
                  <td className="px-3 py-2">{d.header.paymentCurrencyId || "—"}</td>
                  <td className="px-3 py-2">
                    <StatusPill value={d.header.paymentStatus} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onEditRecord(d)}
                      className="mr-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      {caps.isReadOnly ? "View" : "Open"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDebt(d.id)}
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
