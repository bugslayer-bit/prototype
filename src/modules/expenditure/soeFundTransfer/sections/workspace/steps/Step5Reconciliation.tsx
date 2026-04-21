/* ═══════════════════════════════════════════════════════════════════════
   STEP 5 — Reconciliation & Audit Trail (SRS PRN 6.2 Step 5)
   ═══════════════════════════════════════════════════════════════════════ */
import type { SoeFormState, SoeReconciliationEntry } from "../../../types";
import { useSoeMasterData } from "../../../state/useSoeMasterData";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { Empty } from "../../../ui/Empty";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SoeFormState;
  onChange: (next: SoeFormState | ((cur: SoeFormState) => SoeFormState)) => void;
  readOnly?: boolean;
}

export function Step5Reconciliation({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSoeMasterData();

  const addEntry = () =>
    onChange((cur) => ({
      ...cur,
      reconciliation: [
        ...cur.reconciliation,
        {
          id: crypto.randomUUID(),
          status: master.reconciliationStatus[0] ?? "",
          reconciledAt: new Date().toISOString().slice(0, 16),
          reconciledBy: "",
          bankStatementRef: "",
          variance: "",
          notes: "",
        },
      ],
    }));

  const updateEntry = (id: string, patch: Partial<SoeReconciliationEntry>) =>
    onChange((cur) => ({
      ...cur,
      reconciliation: cur.reconciliation.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

  const removeEntry = (id: string) =>
    onChange((cur) => ({ ...cur, reconciliation: cur.reconciliation.filter((r) => r.id !== id) }));

  const emptyStatus = master.reconciliationStatus.length === 0;

  return (
    <Card
      title="5. Reconciliation & Audit Trail"
      subtitle="PRN 6.2 Step 5 — Match released funds against bank statements and capture variances."
      className={readOnly ? "pointer-events-none select-none opacity-70" : undefined}
    >
      {emptyStatus && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ Reconciliation Status list is empty</p>
          <p className="mt-0.5">
            Populate in <span className="font-mono">/master-data</span> — key:{" "}
            <span className="font-mono text-[11px]">(soe-reconciliation-status)</span>
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={addEntry}
          className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          + Log Reconciliation
        </button>
      </div>

      {form.reconciliation.length === 0 ? (
        <Empty>No reconciliation entries yet.</Empty>
      ) : (
        <div className="grid gap-3">
          {form.reconciliation.map((r) => (
            <div
              key={r.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.6fr_auto]"
            >
              <Select
                value={r.status}
                options={master.reconciliationStatus}
                onChange={(v) => updateEntry(r.id, { status: v })}
              />
              <input
                className={inputCls}
                type="datetime-local"
                value={r.reconciledAt}
                onChange={(e) => updateEntry(r.id, { reconciledAt: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Reconciled by"
                value={r.reconciledBy}
                onChange={(e) => updateEntry(r.id, { reconciledBy: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Bank statement ref"
                value={r.bankStatementRef}
                onChange={(e) => updateEntry(r.id, { bankStatementRef: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Variance"
                value={r.variance}
                onChange={(e) => updateEntry(r.id, { variance: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Notes"
                value={r.notes}
                onChange={(e) => updateEntry(r.id, { notes: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeEntry(r.id)}
                className="self-start rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
