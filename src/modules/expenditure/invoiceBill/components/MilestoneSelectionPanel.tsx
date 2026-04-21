/* ═══════════════════════════════════════════════════════════════════════════
   MilestoneSelectionPanel — SRS Row 42 (Process Step 4a)
   For Works contracts: render the contract's milestone schedule, let the user
   tick which milestone(s) are being billed and how much of each is being
   billed in this invoice. Cumulative billing must never exceed the milestone
   total (hard rule from SRS PD Row 42 + BR 16.3 milestone ceiling).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from "react";
import type { ContractMilestone, InvoiceBillFormState } from "../types";
import { useContractData } from "../../../../shared/context/ContractDataContext";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

interface Props {
  form: InvoiceBillFormState;
  onMilestones: (rows: ContractMilestone[]) => void;
}

export function MilestoneSelectionPanel({ form, onMilestones }: Props) {
  const { contracts } = useContractData();
  const linked = useMemo(
    () => contracts.find((c) => c.contractId === form.invoice.contractId) || null,
    [contracts, form.invoice.contractId],
  );

  const isWorks = useMemo(() => {
    const cat = linked?.contractCategory?.[0] || "";
    return /works/i.test(cat) || /works/i.test(form.bill.billCategory || "");
  }, [linked, form.bill.billCategory]);

  /* Auto-seed milestones from the linked contract the first time we see it */
  useEffect(() => {
    if (!linked || !isWorks) return;
    if (form.milestones.length > 0) return;
    const raw = (linked.formData as unknown as Record<string, unknown> | undefined)?.contractMilestoneRows;
    if (!Array.isArray(raw)) return;
    const seeded: ContractMilestone[] = (raw as Array<Record<string, unknown>>).map((m, i) => {
      const total = String(m.milestoneAmount ?? m.amount ?? "0");
      return {
        id: String(m.id ?? `ms-${i}`),
        milestoneCode: String(m.milestoneCode ?? `M${i + 1}`),
        description: String(m.milestoneDescription ?? m.description ?? `Milestone ${i + 1}`),
        totalAmount: total,
        alreadyBilled: "0",
        remaining: total,
        status: "pending",
        completionPercent: "0",
        selected: false,
        billedNow: "",
      };
    });
    if (seeded.length > 0) onMilestones(seeded);
  }, [linked, isWorks, form.milestones.length, onMilestones]);

  if (!isWorks) {
    return (
      <section className={panelClass}>
        <header className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Milestone Selection</h3>
            <p className="text-xs text-slate-500">SRS Row 42 · Step 1.5 · Works contracts only</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Not applicable
          </span>
        </header>
        <p className="text-sm text-slate-500">
          Milestone selection is enabled when the linked contract category is{" "}
          <strong>Works</strong>. Pick a Works contract on Step 1 to see the milestone schedule.
        </p>
      </section>
    );
  }

  if (form.milestones.length === 0) {
    return (
      <section className={panelClass}>
        <header className="mb-2">
          <h3 className="text-lg font-bold text-slate-900">Milestone Selection</h3>
          <p className="text-xs text-slate-500">SRS Row 42 · Step 1.5 — Works milestone schedule</p>
        </header>
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          The linked Works contract has no milestone schedule defined. Add milestones
          on the contract record before raising this invoice, or use the Non-Milestone
          flat-amount path on Step 1.6.
        </div>
      </section>
    );
  }

  const update = (id: string, patch: Partial<ContractMilestone>) =>
    onMilestones(form.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const totalSelected = form.milestones
    .filter((m) => m.selected)
    .reduce((sum, m) => sum + (parseFloat(m.billedNow || "0") || 0), 0);

  return (
    <section className={panelClass}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Milestone Selection</h3>
          <p className="text-xs text-slate-500">
            SRS Row 42 · Step 1.5 — Tick the milestone(s) being billed and enter how much of each
            is included in this invoice. Billing cannot exceed the milestone remaining balance.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
          Selected total: {totalSelected.toLocaleString()}
        </span>
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Sel</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Already Billed</th>
              <th className="px-3 py-2 text-right">Remaining</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Bill Now</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {form.milestones.map((m) => {
              const remaining = parseFloat(m.remaining || "0") || 0;
              const billedNow = parseFloat(m.billedNow || "0") || 0;
              const exceeds = billedNow > remaining;
              return (
                <tr key={m.id} className={m.selected ? "bg-sky-50/40" : ""}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={m.selected}
                      onChange={(e) => update(m.id, { selected: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{m.milestoneCode}</td>
                  <td className="px-3 py-2 text-slate-600">{m.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{m.totalAmount}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{m.alreadyBilled}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">
                    {m.remaining}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={m.status}
                      onChange={(e) =>
                        update(m.id, { status: e.target.value as ContractMilestone["status"] })
                      }
                      className={inputClass}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="fully_paid">Fully Paid</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={m.billedNow}
                      disabled={!m.selected}
                      onChange={(e) => update(m.id, { billedNow: e.target.value })}
                      className={`${inputClass} text-right ${exceeds ? "border-rose-300 ring-2 ring-rose-100" : ""}`}
                      placeholder="0.00"
                    />
                    {exceeds && (
                      <p className="mt-1 text-[10px] font-semibold text-rose-600">
                        Exceeds remaining balance
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
