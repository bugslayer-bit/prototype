/* ═══════════════════════════════════════════════════════════════════════
   STEP 4 — Ongoing Monitoring & Review (SRS PRN 7.1 Step 4)
   ═══════════════════════════════════════════════════════════════════════
   DTA records of periodic reviews. Monitoring Status is master-data driven
   (fi-monitoring-status). */
import type { FiFormState } from "../../../types";
import { useFiMasterData } from "../../../state/useFiMasterData";
import { useFiStore } from "../../../state/useFiStore";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: FiFormState;
  onChange: (next: FiFormState | ((cur: FiFormState) => FiFormState)) => void;
  readOnly?: boolean;
}

export function Step4Monitoring({ form, onChange, readOnly = false }: SectionProps) {
  const master = useFiMasterData();
  const { generateNextRecordId } = useFiStore();

  const addEntry = () =>
    onChange((cur) => ({
      ...cur,
      monitoring: [
        ...cur.monitoring,
        {
          id: generateNextRecordId(),
          reviewDate: "",
          monitoringStatus: "",
          reviewer: "",
          observations: "",
          rectificationDue: "",
        },
      ],
    }));
  const removeEntry = (id: string) =>
    onChange((cur) => ({
      ...cur,
      monitoring: cur.monitoring.filter((m) => m.id !== id),
    }));
  const updateEntry = <K extends keyof FiFormState["monitoring"][number]>(
    id: string,
    key: K,
    value: FiFormState["monitoring"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      monitoring: cur.monitoring.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
    }));

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      {master.monitoringStatus.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ master-data list empty</p>
          <p className="mt-0.5">
            Populate <span className="font-mono">fi-monitoring-status</span> in{" "}
            <span className="font-mono">/master-data</span>.
          </p>
        </div>
      )}

      <Card
        title="4. Monitoring Reviews"
        subtitle={`PRN 7.1 Step 4 — Scheduled cadence: ${
          form.header.reviewFrequency || "(pick a Review Frequency in Step 1)"
        }.`}
      >
        {form.monitoring.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No monitoring entries yet.
          </p>
        ) : (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Review Date</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Reviewer</th>
                  <th className="px-2 py-2">Observations</th>
                  <th className="px-2 py-2">Rectification Due</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {form.monitoring.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={inputCls}
                        value={m.reviewDate}
                        onChange={(e) => updateEntry(m.id, "reviewDate", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={m.monitoringStatus}
                        options={master.monitoringStatus}
                        onChange={(v) => updateEntry(m.id, "monitoringStatus", v)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={m.reviewer}
                        onChange={(e) => updateEntry(m.id, "reviewer", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputCls}
                        value={m.observations}
                        onChange={(e) => updateEntry(m.id, "observations", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={inputCls}
                        value={m.rectificationDue}
                        onChange={(e) => updateEntry(m.id, "rectificationDue", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeEntry(m.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={addEntry}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Monitoring Entry
        </button>
      </Card>
    </div>
  );
}
