/* ═══════════════════════════════════════════════════════════════════════
   STEP 2 — Payment Transactions (PD row 108, DD 26.x)
   ═══════════════════════════════════════════════════════════════════════
   Finance Officer creates a transaction against the already-registered
   entity, Head approves, Payment Release Officer flips to Released. For
   International scope the BTN equivalent is derived from gross × FX rate;
   for Domestic the gross value is copied through. A Payment Order ID is
   auto-generated when the status advances past Approved.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect } from "react";
import type { ScFormState } from "../../../types";
import { useScStore } from "../../../state/useScStore";
import {
  useScMasterData,
  nextAllowedTxnStatuses,
  isInternationalScope,
  isApprovedStatus,
  isPoGeneratedTxn,
  isReleasedTxn,
} from "../../../state/useScMasterData";
import { useScRoleCapabilities } from "../../../state/useScRoleCapabilities";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: ScFormState;
  onChange: (next: ScFormState | ((cur: ScFormState) => ScFormState)) => void;
  readOnly?: boolean;
}

export function Step2Payments({ form, onChange, readOnly = false }: SectionProps) {
  const master = useScMasterData();
  const { generateNextTxnId } = useScStore();
  const caps = useScRoleCapabilities();

  const intl = isInternationalScope(form.header.scope);

  /* Recompute BTN equivalent + PO generation side-effects whenever gross,
     fxRate or txnStatus change. */
  useEffect(() => {
    onChange((cur) => ({
      ...cur,
      transactions: cur.transactions.map((t) => {
        const gross = parseFloat(t.grossAmount || "0") || 0;
        const fx = parseFloat(t.fxRate || "0") || 0;
        const btn = intl ? (gross && fx ? gross * fx : 0) : gross;
        const poNeeded =
          isPoGeneratedTxn(t.txnStatus) || isReleasedTxn(t.txnStatus);
        return {
          ...t,
          btnEquivalent: gross ? btn.toFixed(2) : t.btnEquivalent || "",
          paymentOrderId:
            poNeeded && !t.paymentOrderId
              ? `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
              : t.paymentOrderId,
        };
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intl, form.transactions.length]);

  /* Budget sanity check: total BTN equivalent vs membership amount (as proxy). */
  const totalBtn = form.transactions.reduce(
    (a, t) => a + (parseFloat(t.btnEquivalent || "0") || 0),
    0,
  );
  const plannedAmount = parseFloat(form.header.membershipAmount || "0") || 0;

  const addTxn = () =>
    onChange((cur) => ({
      ...cur,
      transactions: [
        ...cur.transactions,
        {
          id: generateNextTxnId(),
          invoiceRef: "",
          period: "",
          grossAmount: "",
          fxRate: intl ? "" : "1",
          btnEquivalent: "",
          paymentOrderId: "",
          txnStatus: "",
          remarks: "",
        },
      ],
    }));
  const removeTxn = (id: string) =>
    onChange((cur) => ({
      ...cur,
      transactions: cur.transactions.filter((t) => t.id !== id),
    }));
  const update = <K extends keyof ScFormState["transactions"][number]>(
    id: string,
    key: K,
    value: ScFormState["transactions"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      transactions: cur.transactions.map((t) =>
        t.id === id ? { ...t, [key]: value } : t,
      ),
    }));

  if (!form.header.txnType || !form.header.scope || !form.header.entityName) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Capture the entity master essentials on Step 1 (Type, Scope, Name) before raising payment transactions.
      </div>
    );
  }

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      <Card
        title="2. Payment Transactions"
        subtitle="PD row 108 — create payment transactions. Draft → Submitted → Under Validation → Approved → Payment Order → Released. PO ID auto-generates once status advances past Approved."
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Kpi
            label={`Planned (${form.header.currency || "—"})`}
            value={plannedAmount ? plannedAmount.toFixed(2) : "—"}
            tone="slate"
          />
          <Kpi
            label="Total Requested (BTN equiv)"
            value={totalBtn.toFixed(2)}
            tone="sky"
          />
          <Kpi
            label="Transaction Count"
            value={String(form.transactions.length)}
            tone="violet"
          />
        </div>

        {form.transactions.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No transactions yet. Click <strong>+ Add Transaction</strong> to raise one.
          </p>
        ) : (
          <div className="grid gap-3">
            {form.transactions.map((t) => {
              const allowed = nextAllowedTxnStatuses(t.txnStatus, master.txnStatus);
              const statusOptions =
                allowed.length === 0 ? master.txnStatus : [t.txnStatus, ...allowed].filter(Boolean);
              const approvedLocked =
                isApprovedStatus(t.txnStatus) && !caps.canApprove;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t.id}
                      {t.paymentOrderId && (
                        <span className="ml-2 rounded-lg bg-sky-100 px-2 py-0.5 font-mono text-[10px] text-sky-700">
                          {t.paymentOrderId}
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeTxn(t.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Invoice / Demand Reference">
                      <input
                        className={inputCls}
                        value={t.invoiceRef}
                        onChange={(e) => update(t.id, "invoiceRef", e.target.value)}
                      />
                    </Field>
                    <Field label="Period (YYYY-MM)">
                      <input
                        type="month"
                        className={inputCls}
                        value={t.period}
                        onChange={(e) => update(t.id, "period", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Transaction Status"
                      hint={
                        approvedLocked
                          ? "Approved — only Head of Agency can revise"
                          : `${allowed.length} onward transition(s)`
                      }
                    >
                      <Select
                        value={t.txnStatus}
                        options={statusOptions}
                        onChange={(v) => update(t.id, "txnStatus", v)}
                        disabled={approvedLocked}
                      />
                    </Field>

                    <Field label={`Gross (${form.header.currency || "entity ccy"})`}>
                      <input
                        className={inputCls}
                        value={t.grossAmount}
                        onChange={(e) => update(t.id, "grossAmount", e.target.value)}
                      />
                    </Field>
                    {intl ? (
                      <Field label="FX Rate → BTN" hint="Required for International remittance">
                        <input
                          className={inputCls}
                          value={t.fxRate}
                          onChange={(e) => update(t.id, "fxRate", e.target.value)}
                          placeholder="e.g. 83.25"
                        />
                      </Field>
                    ) : (
                      <Field label="FX Rate" hint="Domestic — fixed at 1">
                        <input className={inputCls + " bg-slate-100"} value="1" readOnly />
                      </Field>
                    )}
                    <Field label="BTN Equivalent (auto)">
                      <input className={inputCls + " bg-slate-100"} value={t.btnEquivalent} readOnly />
                    </Field>

                    <Field label="Payment Order ID (auto on PO)">
                      <input className={inputCls + " bg-slate-100"} value={t.paymentOrderId} readOnly />
                    </Field>
                    <Field label="Remarks" className="md:col-span-2">
                      <input
                        className={inputCls}
                        value={t.remarks}
                        onChange={(e) => update(t.id, "remarks", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={addTxn}
          className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Transaction
        </button>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  const toneMap: Record<string, string> = {
    slate: "from-slate-50 to-white ring-slate-200 text-slate-900",
    sky: "from-sky-50 to-white ring-sky-200 text-sky-800",
    violet: "from-violet-50 to-white ring-violet-200 text-violet-800",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br p-3 shadow-sm ring-1 ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}
