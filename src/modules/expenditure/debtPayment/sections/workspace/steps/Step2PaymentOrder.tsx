/* ═══════════════════════════════════════════════════════════════════════
   STEP 2 — Generate Payment Order
   ───────────────────────────────
   Auto-generate (system) + manual creation. PRN 6.1 Step 2.
   ═══════════════════════════════════════════════════════════════════════ */
import type { DebtFormState, DebtRepayment } from "../../../types";
import { useDebtStore } from "../../../state/useDebtStore";
import {
  useDebtMasterData,
  findLabel,
  isPendingStatus,
} from "../../../state/useDebtMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { Empty } from "../../../ui/Empty";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: DebtFormState;
  onChange: (next: DebtFormState | ((cur: DebtFormState) => DebtFormState)) => void;
  readOnly?: boolean;
}

export function Step2PaymentOrder({ form, onChange, readOnly = false }: SectionProps) {
  const master = useDebtMasterData();
  const { generateNextPaymentOrderId } = useDebtStore();

  /* Default status is the first "pending-like" entry in the master data —
     if the admin renames "Pending" to "Draft", new rows still start correctly. */
  const defaultPendingStatus = findLabel(master.paymentStatus, isPendingStatus);

  const addRow = (createdManually: boolean) => {
    const row: DebtRepayment = {
      id: crypto.randomUUID(),
      paymentOrderId: generateNextPaymentOrderId(),
      debtServicingId: form.header.debtServicingId,
      dueDate: "",
      amountToPay: "",
      currency: form.header.paymentCurrencyId,
      payeeName: form.header.creditorName,
      payeeBankAccount: form.donor?.bankAccountNumber ?? "",
      payeeRoutingDetails: form.donor?.routingInformation ?? "",
      sourceOfFund: "",
      paymentType: form.header.paymentType,
      transmissionChannel: "",
      createdManually,
      status: defaultPendingStatus,
      remarks: "",
    };
    onChange((cur) => ({ ...cur, repayments: [...cur.repayments, row] }));
  };

  const updateRow = (id: string, patch: Partial<DebtRepayment>) =>
    onChange((cur) => ({
      ...cur,
      repayments: cur.repayments.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

  const removeRow = (id: string) =>
    onChange((cur) => ({ ...cur, repayments: cur.repayments.filter((r) => r.id !== id) }));

  const missing = [
    { title: "Payment Currency list is empty", id: "currency-type", list: master.paymentCurrency },
    { title: "Source of Fund list is empty", id: "debt-source-of-fund", list: master.sourceOfFund },
    { title: "Payment Type list is empty", id: "debt-payment-type", list: master.paymentType },
    { title: "Transmission Channel list is empty", id: "debt-payment-order-channel", list: master.paymentOrderChannel },
    { title: "Payment Status list is empty", id: "debt-payment-status", list: master.paymentStatus },
  ].filter((l) => l.list.length === 0);

  return (
    <Card
      title="2. Payment Order Management"
      subtitle="PRN 6.1 Step 2 — System auto-generates due transactions for review/approval; users may also create manual payment orders."
      className={readOnly ? "pointer-events-none select-none opacity-70" : undefined}
    >
      {missing.length > 0 && (
        <div className="mb-4 space-y-2">
          {missing.map((m) => (
            <div key={m.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <p className="font-bold">⚠️ {m.title}</p>
              <p className="mt-0.5">
                Populate this list in <span className="font-mono">/master-data</span> — key:{" "}
                <span className="font-mono text-[11px]">({m.id})</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => addRow(false)}
          className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          + Auto-Generate Payment Order
        </button>
        <button
          type="button"
          onClick={() => addRow(true)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Manual Payment Order
        </button>
      </div>

      {form.repayments.length === 0 ? (
        <Empty>No payment orders yet.</Empty>
      ) : (
        <div className="grid gap-3">
          {form.repayments.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                    {r.paymentOrderId}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      r.createdManually ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {r.createdManually ? "Manual" : "Auto-Generated"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Repayment Due Date (20.7)">
                  <input
                    className={inputCls}
                    type="date"
                    value={r.dueDate}
                    onChange={(e) => updateRow(r.id, { dueDate: e.target.value })}
                  />
                </Field>
                <Field label="Amount to Pay">
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    value={r.amountToPay}
                    onChange={(e) => updateRow(r.id, { amountToPay: e.target.value })}
                  />
                </Field>
                <Field label="Currency (LoV)">
                  <Select
                    value={r.currency}
                    options={master.paymentCurrency}
                    onChange={(v) => updateRow(r.id, { currency: v })}
                  />
                </Field>
                <Field label="Payee Name">
                  <input
                    className={inputCls}
                    value={r.payeeName}
                    onChange={(e) => updateRow(r.id, { payeeName: e.target.value })}
                  />
                </Field>
                <Field label="Payee Bank Account">
                  <input
                    className={inputCls}
                    value={r.payeeBankAccount}
                    onChange={(e) => updateRow(r.id, { payeeBankAccount: e.target.value })}
                  />
                </Field>
                <Field label="Routing Details">
                  <input
                    className={inputCls}
                    value={r.payeeRoutingDetails}
                    onChange={(e) => updateRow(r.id, { payeeRoutingDetails: e.target.value })}
                  />
                </Field>
                <Field label="Source of Fund (LoV)">
                  <Select
                    value={r.sourceOfFund}
                    options={master.sourceOfFund}
                    onChange={(v) => updateRow(r.id, { sourceOfFund: v })}
                  />
                </Field>
                <Field label="Type of Payment (LoV)">
                  <Select
                    value={r.paymentType}
                    options={master.paymentType}
                    onChange={(v) => updateRow(r.id, { paymentType: v })}
                  />
                </Field>
                <Field label="Transmission Channel (LoV)">
                  <Select
                    value={r.transmissionChannel}
                    options={master.paymentOrderChannel}
                    onChange={(v) => updateRow(r.id, { transmissionChannel: v })}
                  />
                </Field>
                <Field label="Status (LoV)">
                  <Select
                    value={r.status}
                    options={master.paymentStatus}
                    onChange={(v) => updateRow(r.id, { status: v })}
                  />
                </Field>
                <Field label="Remarks" className="md:col-span-2">
                  <input
                    className={inputCls}
                    value={r.remarks}
                    onChange={(e) => updateRow(r.id, { remarks: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
