/* ═══════════════════════════════════════════════════════════════════════
   STEP 4 — Entity Lifecycle (PD row 107)
   ═══════════════════════════════════════════════════════════════════════
   Head of Agency moves the entity through its lifecycle states. Status
   transitions are gated by nextAllowedEntityStatuses so an Active entity
   can only go Inactive / Suspended / Closed, a Suspended entity can be
   re-activated or closed, etc. Every transition is logged with a date,
   actor and reason for the audit trail (PD row 109 requirement).
   ═══════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { ScFormState } from "../../../types";
import { useScStore } from "../../../state/useScStore";
import {
  useScMasterData,
  nextAllowedEntityStatuses,
} from "../../../state/useScMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { StatusPill } from "../../../ui/StatusPill";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: ScFormState;
  onChange: (next: ScFormState | ((cur: ScFormState) => ScFormState)) => void;
  readOnly?: boolean;
}

export function Step4Lifecycle({ form, onChange, readOnly = false }: SectionProps) {
  const master = useScMasterData();
  const { generateNextLifecycleId } = useScStore();

  const allowedNext = useMemo(
    () => nextAllowedEntityStatuses(form.header.entityStatus, master.entityStatus),
    [form.header.entityStatus, master.entityStatus],
  );

  const applyTransition = (toStatus: string, actor: string, reason: string) => {
    onChange((cur) => ({
      ...cur,
      header: { ...cur.header, entityStatus: toStatus },
      lifecycle: [
        ...cur.lifecycle,
        {
          id: generateNextLifecycleId(),
          occurredAt: new Date().toISOString(),
          fromStatus: cur.header.entityStatus,
          toStatus,
          actor,
          reason,
        },
      ],
    }));
  };

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      <Card
        title="4. Entity Lifecycle"
        subtitle="PD row 107 — Head of Agency moves the entity through its states. Only valid forward / reversal transitions are offered; every change writes an audit row."
      >
        <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-center">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current status</div>
              <div className="mt-1">
                <StatusPill value={form.header.entityStatus} />
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {allowedNext.length === 0
              ? "No onward transitions available from the current status."
              : `${allowedNext.length} valid transition(s) from here: ${allowedNext.join(", ")}`}
          </div>
        </div>
      </Card>

      <Card
        title="Apply Transition"
        subtitle="Pick the target status, name the actor, and explain the reason. The wizard will log the event and update the entity status."
      >
        <TransitionForm
          allowedNext={allowedNext}
          onApply={applyTransition}
          disabled={allowedNext.length === 0 || readOnly}
        />
      </Card>

      <Card
        title="Lifecycle Audit Trail"
        subtitle="Every transition recorded so far. Append-only — rows cannot be removed once written."
      >
        {form.lifecycle.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No lifecycle events yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-2 py-2">Event ID</th>
                  <th className="px-2 py-2">When</th>
                  <th className="px-2 py-2">From</th>
                  <th className="px-2 py-2">To</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {[...form.lifecycle].reverse().map((e) => (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{e.id}</td>
                    <td className="px-2 py-1.5">{new Date(e.occurredAt).toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      <StatusPill value={e.fromStatus} />
                    </td>
                    <td className="px-2 py-1.5">
                      <StatusPill value={e.toStatus} />
                    </td>
                    <td className="px-2 py-1.5">{e.actor || "—"}</td>
                    <td className="px-2 py-1.5">{e.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function TransitionForm({
  allowedNext,
  onApply,
  disabled,
}: {
  allowedNext: string[];
  onApply: (toStatus: string, actor: string, reason: string) => void;
  disabled: boolean;
}) {
  /* Keep the form uncontrolled via DOM refs — avoids polluting parent state
     with transient draft values. */
  let toVal = "";
  let actorVal = "";
  let reasonVal = "";

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Field label="Target Status">
        <Select
          value=""
          options={allowedNext}
          onChange={(v) => (toVal = v)}
          disabled={disabled}
        />
      </Field>
      <Field label="Actor">
        <input
          className={inputCls}
          disabled={disabled}
          onChange={(e) => (actorVal = e.target.value)}
          placeholder="Name / designation"
        />
      </Field>
      <Field label="Reason" className="md:col-span-2">
        <input
          className={inputCls}
          disabled={disabled}
          onChange={(e) => (reasonVal = e.target.value)}
          placeholder="Audit trail — why the status is changing"
        />
      </Field>
      <div className="md:col-span-4 flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (toVal) onApply(toVal, actorVal, reasonVal);
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Apply transition
        </button>
      </div>
    </div>
  );
}
