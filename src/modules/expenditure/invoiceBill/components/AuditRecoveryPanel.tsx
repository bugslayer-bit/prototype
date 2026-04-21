/* ═══════════════════════════════════════════════════════════════════════════
   AuditRecoveryPanel — SRS Row 56 (Process Step 4.4)
   Captures audit recoveries from ARMS via AIN (Audit Identification Number)
   or as a manual entry. Each row is added to the bill's deduction stack and
   the total flows into the Net Payable computation.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import type { AuditRecoveryEntry, InvoiceBillFormState } from "../types";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";
const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

interface Props {
  form: InvoiceBillFormState;
  onAuditRecoveries: (rows: AuditRecoveryEntry[]) => void;
}

export function AuditRecoveryPanel({ form, onAuditRecoveries }: Props) {
  const [draft, setDraft] = useState<AuditRecoveryEntry>({
    id: "",
    ainNumber: "",
    source: "ARMS",
    amount: "",
    reason: "",
    recordedAt: "",
  });
  const [error, setError] = useState("");

  const total = form.auditRecoveries.reduce(
    (s, r) => s + (parseFloat(r.amount || "0") || 0),
    0,
  );

  const add = () => {
    setError("");
    if (!draft.ainNumber.trim()) {
      setError("AIN is required");
      return;
    }
    if (!draft.amount.trim() || isNaN(Number(draft.amount))) {
      setError("Valid amount is required");
      return;
    }
    const dup = form.auditRecoveries.find((r) => r.ainNumber === draft.ainNumber.trim());
    if (dup) {
      setError("This AIN is already recorded");
      return;
    }
    const newRow: AuditRecoveryEntry = {
      ...draft,
      id: `ar-${Date.now()}`,
      ainNumber: draft.ainNumber.trim(),
      recordedAt: new Date().toISOString(),
    };
    onAuditRecoveries([...form.auditRecoveries, newRow]);
    setDraft({ id: "", ainNumber: "", source: "ARMS", amount: "", reason: "", recordedAt: "" });
  };

  const remove = (id: string) =>
    onAuditRecoveries(form.auditRecoveries.filter((r) => r.id !== id));

  return (
    <section className={panelClass}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Audit Recoveries (ARMS / AIN)</h3>
          <p className="text-xs text-slate-500">
            SRS Row 56 · Step 4.4 — Capture AIN from ARMS or record a manual recovery.
            Recoveries are added to the deduction stack before computing Net Payable.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
          Total recoveries: {total.toLocaleString()}
        </span>
      </header>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-5">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AIN</label>
          <input
            value={draft.ainNumber}
            onChange={(e) => setDraft({ ...draft, ainNumber: e.target.value })}
            placeholder="AIN-2026-0001"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Source</label>
          <select
            value={draft.source}
            onChange={(e) =>
              setDraft({ ...draft, source: e.target.value as AuditRecoveryEntry["source"] })
            }
            className={inputClass}
          >
            <option value="ARMS">ARMS</option>
            <option value="Manual">Manual</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</label>
          <input
            type="number"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            placeholder="0.00"
            className={`${inputClass} text-right`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reason</label>
          <input
            value={draft.reason}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            placeholder="Brief description"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-5 flex items-center justify-between">
          {error ? (
            <span className="text-xs font-semibold text-rose-600">{error}</span>
          ) : (
            <span className="text-[11px] text-slate-400">
              ARMS rows are pulled from the audit subsystem; Manual rows require justification.
            </span>
          )}
          <button
            type="button"
            onClick={add}
            className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            + Add Recovery
          </button>
        </div>
      </div>

      {form.auditRecoveries.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">AIN</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Reason</th>
                <th className="px-3 py-2 text-left">Recorded</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {form.auditRecoveries.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-slate-700">{r.ainNumber}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.source === "ARMS"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{r.amount}</td>
                  <td className="px-3 py-2 text-slate-600">{r.reason || "—"}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-400">
                    {r.recordedAt ? r.recordedAt.slice(0, 10) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
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
    </section>
  );
}
