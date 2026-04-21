/* ═══════════════════════════════════════════════════════════════════════
   STEP 4 — Release / Core-Bank Execution (SRS PRN 6.2 Step 4)
   ═══════════════════════════════════════════════════════════════════════ */
import type { SoeFormState, SoeReleaseEntry } from "../../../types";
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

export function Step4Release({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSoeMasterData();

  const addRelease = () =>
    onChange((cur) => ({
      ...cur,
      releases: [
        ...cur.releases,
        {
          id: crypto.randomUUID(),
          channel: master.releaseChannel[0] ?? "",
          releasedAt: new Date().toISOString().slice(0, 16),
          releasedBy: "",
          bankReference: "",
          amount: cur.header.totalAmount,
          currency: cur.header.currency || (master.currency[0] ?? ""),
          remarks: "",
        },
      ],
    }));

  const updateRelease = (id: string, patch: Partial<SoeReleaseEntry>) =>
    onChange((cur) => ({
      ...cur,
      releases: cur.releases.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

  const removeRelease = (id: string) =>
    onChange((cur) => ({ ...cur, releases: cur.releases.filter((r) => r.id !== id) }));

  const emptyChannel = master.releaseChannel.length === 0;

  return (
    <Card
      title="4. Release / Core-Banking Execution"
      subtitle="PRN 6.2 Step 4 — Release the approved transfer via RMA Core-Banking, SWIFT, Meridian or manual advice."
      className={readOnly ? "pointer-events-none select-none opacity-70" : undefined}
    >
      {emptyChannel && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ Release Channel list is empty</p>
          <p className="mt-0.5">
            Populate in <span className="font-mono">/master-data</span> — key:{" "}
            <span className="font-mono text-[11px]">(soe-release-channel)</span>
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={addRelease}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          + Log Release
        </button>
      </div>

      {form.releases.length === 0 ? (
        <Empty>No releases recorded yet.</Empty>
      ) : (
        <div className="grid gap-3">
          {form.releases.map((r) => (
            <div
              key={r.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr_1.4fr_auto]"
            >
              <Select
                value={r.channel}
                options={master.releaseChannel}
                onChange={(v) => updateRelease(r.id, { channel: v })}
              />
              <input
                className={inputCls}
                type="datetime-local"
                value={r.releasedAt}
                onChange={(e) => updateRelease(r.id, { releasedAt: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Released by"
                value={r.releasedBy}
                onChange={(e) => updateRelease(r.id, { releasedBy: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Bank Ref"
                value={r.bankReference}
                onChange={(e) => updateRelease(r.id, { bankReference: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Amount"
                value={r.amount}
                onChange={(e) => updateRelease(r.id, { amount: e.target.value })}
              />
              <Select
                value={r.currency}
                options={master.currency}
                onChange={(v) => updateRelease(r.id, { currency: v })}
              />
              <input
                className={inputCls}
                placeholder="Remarks"
                value={r.remarks}
                onChange={(e) => updateRelease(r.id, { remarks: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeRelease(r.id)}
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
