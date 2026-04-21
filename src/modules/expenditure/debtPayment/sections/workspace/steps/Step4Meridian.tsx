/* ═══════════════════════════════════════════════════════════════════════
   STEP 4 — POST Payment / Meridian Sync (PRN 6.1 Step 4)
   ═══════════════════════════════════════════════════════════════════════ */
import type { DebtFormState } from "../../../types";
import { useDebtMasterData } from "../../../state/useDebtMasterData";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { Empty } from "../../../ui/Empty";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: DebtFormState;
  onChange: (next: DebtFormState | ((cur: DebtFormState) => DebtFormState)) => void;
  readOnly?: boolean;
}

export function Step4Meridian({ form, onChange, readOnly = false }: SectionProps) {
  const master = useDebtMasterData();

  const addEntry = () =>
    onChange((cur) => ({
      ...cur,
      meridianLog: [
        ...cur.meridianLog,
        {
          id: crypto.randomUUID(),
          action: master.meridianAction[0] ?? "",
          performedAt: new Date().toISOString().slice(0, 16),
          performedBy: "",
          notes: "",
        },
      ],
    }));

  const updateEntry = (id: string, patch: Partial<DebtFormState["meridianLog"][number]>) =>
    onChange((cur) => ({
      ...cur,
      meridianLog: cur.meridianLog.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));

  const removeEntry = (id: string) =>
    onChange((cur) => ({ ...cur, meridianLog: cur.meridianLog.filter((m) => m.id !== id) }));

  const masterEmpty = master.meridianAction.length === 0;

  return (
    <Card
      title="4. POST Payment / Meridian Sync"
      subtitle="PRN 6.1 Step 4 — Download MERIDIAN-format file or push via API; generate the SRS-mandated reports."
      className={readOnly ? "pointer-events-none select-none opacity-70" : undefined}
    >
      {masterEmpty && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ Meridian Action list is empty</p>
          <p className="mt-0.5">
            Populate this list in <span className="font-mono">/master-data</span> — key:{" "}
            <span className="font-mono text-[11px]">(debt-meridian-action)</span>
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={addEntry}
          className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          + Log Meridian Action
        </button>
      </div>
      {form.meridianLog.length === 0 ? (
        <Empty>No POST-payment actions recorded yet.</Empty>
      ) : (
        <div className="grid gap-3">
          {form.meridianLog.map((m) => (
            <div key={m.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[1.5fr_1fr_1fr_2fr_auto]">
              <Select
                value={m.action}
                options={master.meridianAction}
                onChange={(v) => updateEntry(m.id, { action: v })}
              />
              <input
                className={inputCls}
                type="datetime-local"
                value={m.performedAt}
                onChange={(e) => updateEntry(m.id, { performedAt: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Performed by"
                value={m.performedBy}
                onChange={(e) => updateEntry(m.id, { performedBy: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Notes / report parameters"
                value={m.notes}
                onChange={(e) => updateEntry(m.id, { notes: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeEntry(m.id)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
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
