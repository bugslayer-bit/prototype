/* ═══════════════════════════════════════════════════════════════════════════
   Process 2.0 — Generate Payment Transaction & Payment Order
   SRS R79 — "Auto-generate payment transaction for leased/rented value
   payments". Transaction must include: Asset details, Lessor details,
   Gross amount payable, Applicable deductions, Net amount payable.
   Supports common payment transaction across multiple assets of the same
   lessor within the same agency/ministry.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { RentalFormState, RentalPaymentTransaction, StoredRental } from "../types";
import { useRentalData } from "../context/RentalDataContext";
import { useRentalMasterData } from "../hooks/useRentalMasterData";

interface Props {
  form: RentalFormState;
  onChange: (next: RentalFormState) => void;
}

export function RentalPaymentSection({ form, onChange }: Props) {
  const master = useRentalMasterData();
  const {
    records: allRentals,
    generateNextTransactionId,
    generateNextPaymentOrderId,
  } = useRentalData();

  /* Cross-rental discovery — assets belonging to the SAME lessor found in
     other Rental records. Used to support "common payment transaction". */
  const sameLessorAssets = useMemo(() => {
    if (!form.asset.lessorId) return [] as { rec: StoredRental; assetId: string; title: string }[];
    return allRentals
      .filter((r) => r.asset.lessorId === form.asset.lessorId && r.asset.assetId !== form.asset.assetId)
      .map((r) => ({ rec: r, assetId: r.asset.assetId, title: r.asset.assetTitle || r.asset.assetId }));
  }, [allRentals, form.asset.lessorId, form.asset.assetId]);

  const generate = () => {
    if (!form.asset.lessorId) return;
    const txnId = generateNextTransactionId();
    const gross = parseFloat(form.asset.rentAmount || "0") || 0;
    const txn: RentalPaymentTransaction = {
      id: `RTX-${Date.now()}`,
      transactionId: txnId,
      paymentOrderId: "",
      assetIds: [form.asset.assetId || "(current)"],
      lessorId: form.asset.lessorId,
      lessorName: form.asset.lessorName,
      grossAmountPayable: gross.toFixed(2),
      applicableDeductions: "0.00",
      netAmountPayable: gross.toFixed(2),
      scheduledDate: form.asset.scheduledPaymentDate,
      budgetCode: form.asset.budgetCode,
      status: master.transactionStatus[0] || "Pending",
      approvedBy: "",
      approvedAt: "",
      createdAt: new Date().toISOString(),
    };
    onChange({ ...form, transactions: [txn, ...form.transactions] });
  };

  const updateTxn = (id: string, patch: Partial<RentalPaymentTransaction>) =>
    onChange({
      ...form,
      transactions: form.transactions.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        const g = parseFloat(next.grossAmountPayable || "0") || 0;
        const d = parseFloat(next.applicableDeductions || "0") || 0;
        next.netAmountPayable = (g - d).toFixed(2);
        return next;
      }),
    });

  const removeTxn = (id: string) =>
    onChange({ ...form, transactions: form.transactions.filter((t) => t.id !== id) });

  const approve = (id: string) => {
    const orderId = generateNextPaymentOrderId();
    updateTxn(id, {
      status: "Approved",
      approvedBy: "current-user",
      approvedAt: new Date().toISOString(),
      paymentOrderId: orderId,
    });
  };

  const toggleAsset = (txnId: string, assetId: string) => {
    const txn = form.transactions.find((t) => t.id === txnId);
    if (!txn) return;
    const has = txn.assetIds.includes(assetId);
    updateTxn(txnId, {
      assetIds: has ? txn.assetIds.filter((x) => x !== assetId) : [...txn.assetIds, assetId],
    });
  };

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            Process 2.0
          </span>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Generate Payment Transaction & Payment Order
          </h2>
          <p className="text-sm text-slate-600">
            Auto-generate per schedule. Supports a single common transaction covering
            multiple assets leased by the same lessor (SRS R79).
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={!form.asset.lessorId || !form.asset.rentAmount}
          className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          + Auto-Generate Transaction
        </button>
      </header>

      {/* Cross-module banner — other assets for same lessor (common txn hint) */}
      {sameLessorAssets.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <div className="font-semibold">
            🔗 {sameLessorAssets.length} other asset{sameLessorAssets.length > 1 ? "s" : ""} leased
            by {form.asset.lessorName || "this lessor"}
          </div>
          <p className="mt-0.5">
            You can tick them inside a generated transaction to issue a common Payment Order.
          </p>
        </div>
      )}

      {form.transactions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
          No transactions yet. Fill Process 1.0 and click <b>Auto-Generate Transaction</b>.
        </p>
      ) : (
        <div className="space-y-3">
          {form.transactions.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    {t.transactionId}
                  </span>
                  {t.paymentOrderId && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Order: {t.paymentOrderId}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      t.status === "Paid" || t.status === "Approved"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {t.status === "Pending" && (
                    <button
                      type="button"
                      onClick={() => approve(t.id)}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Approve → Issue Order
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTxn(t.id)}
                    className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Amounts — user can edit after auto-generation per R79 */}
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field label="Gross Amount Payable">
                  <input
                    type="number"
                    value={t.grossAmountPayable}
                    onChange={(e) => updateTxn(t.id, { grossAmountPayable: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Applicable Deductions">
                  <input
                    type="number"
                    value={t.applicableDeductions}
                    onChange={(e) => updateTxn(t.id, { applicableDeductions: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Net Amount Payable (auto)">
                  <input
                    readOnly
                    value={t.netAmountPayable}
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                  />
                </Field>
                <Field label="Scheduled Date">
                  <input
                    type="date"
                    value={t.scheduledDate}
                    onChange={(e) => updateTxn(t.id, { scheduledDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Budget Code">
                  <input
                    value={t.budgetCode}
                    onChange={(e) => updateTxn(t.id, { budgetCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={t.status}
                    onChange={(e) => updateTxn(t.id, { status: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  >
                    {master.transactionStatus.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Common-transaction asset picker (multi-asset, one lessor) */}
              {sameLessorAssets.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Include other assets of {t.lessorName}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {sameLessorAssets.map((s) => (
                      <label
                        key={s.assetId}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]"
                      >
                        <input
                          type="checkbox"
                          checked={t.assetIds.includes(s.assetId)}
                          onChange={() => toggleAsset(t.id, s.assetId)}
                          className="h-3 w-3 accent-sky-600"
                        />
                        <span className="font-mono">{s.assetId}</span> — {s.title}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
