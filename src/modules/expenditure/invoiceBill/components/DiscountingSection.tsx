/* ═══════════════════════════════════════════════════════════════════════════
   Step 6 — Bill Discounting (PRN 3.3.1 + 3.3.2)
   Optional. Allows the contractor to request early payment from a bank
   against an approved bill, accepting a discounting fee in return.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from "react";
import type { InvoiceBillFormState } from "../types";
import { useInvoiceBillMasterData } from "../hooks/useInvoiceBillMasterData";
import { useContractData } from "../../../../shared/context/ContractDataContext";

const panelClass =
  "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6";
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
const labelClass = "block text-sm font-semibold text-slate-800";

interface Props {
  form: InvoiceBillFormState;
  onPatch: (patch: Partial<InvoiceBillFormState>) => void;
}

export function DiscountingSection({ form, onPatch }: Props) {
  const master = useInvoiceBillMasterData();
  const { contracts } = useContractData();

  /* Live link to the originating contract — drives auto-eligibility, default
     discounting rate and the FI suggestion (PRN 3.3.1). */
  const linkedContract = useMemo(
    () => contracts.find((c) => c.contractId === form.invoice.contractId) || null,
    [contracts, form.invoice.contractId],
  );

  /* Auto-derive eligibility + default rate from contract.billDiscountingEligible
     the first time we see a linked contract that flags it. */
  useEffect(() => {
    if (!linkedContract) return;
    const contractFlag = !!linkedContract.formData?.billDiscountingEligible;
    const contractRate = linkedContract.formData?.discountingRate || "";
    const patch: Partial<InvoiceBillFormState> = {};
    if (contractFlag && !form.discountingEligible) patch.discountingEligible = true;
    if (contractRate && (!form.discountingRate || form.discountingRate === "0")) {
      patch.discountingRate = contractRate;
    }
    if (Object.keys(patch).length > 0) onPatch(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedContract?.contractId]);

  const net = useMemo(() => {
    const gross = parseFloat(form.bill.netPayableAmount || form.invoice.netPayableAmount || "0") || 0;
    const fee = parseFloat(form.discountingFee || "0") || 0;
    return Math.max(0, gross - fee);
  }, [form.bill.netPayableAmount, form.invoice.netPayableAmount, form.discountingFee]);

  /* SRS Row 51 — 30-day rule + last-invoice rule eligibility evaluation.
     Discounting is only allowed for invoices that are more than 30 days
     old AND are NOT the very last invoice on the contract (because the
     last invoice would lock retention release). */
  useEffect(() => {
    if (!form.invoice.invoiceDate) return;
    const submitted = new Date(form.invoice.invoiceDate);
    if (Number.isNaN(submitted.getTime())) return;
    const days = Math.floor(
      (Date.now() - submitted.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isLast = !!(linkedContract?.formData as unknown as Record<string, unknown> | undefined)?.lastInvoiceFlag;
    const thirtyDayRulePassed = days >= 30;
    const eligible = thirtyDayRulePassed && !isLast;
    const next = {
      daysSinceSubmission: days,
      isLastInvoice: isLast,
      thirtyDayRulePassed,
      eligible,
      evaluatedAt: new Date().toISOString(),
    };
    if (
      next.daysSinceSubmission !== form.discountingEligibility.daysSinceSubmission ||
      next.thirtyDayRulePassed !== form.discountingEligibility.thirtyDayRulePassed ||
      next.eligible !== form.discountingEligibility.eligible ||
      next.isLastInvoice !== form.discountingEligibility.isLastInvoice
    ) {
      onPatch({ discountingEligibility: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.invoice.invoiceDate, linkedContract?.contractId]);

  /* Auto-recompute the discount fee whenever the rate or net payable changes
     so the contractor sees the cost in real time. */
  useEffect(() => {
    if (!form.discountingEligible) return;
    const gross = parseFloat(form.bill.netPayableAmount || form.invoice.netPayableAmount || "0") || 0;
    const rate = parseFloat(form.discountingRate || "0") || 0;
    const computed = ((gross * rate) / 100).toFixed(2);
    if (computed !== form.discountingFee) onPatch({ discountingFee: computed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bill.netPayableAmount, form.invoice.netPayableAmount, form.discountingRate, form.discountingEligible]);

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-pink-700">
            Step 6 · PRN 3.3.1
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Bill Discounting</h2>
          <p className="mt-1 text-sm text-slate-600">
            Optional facility to receive early payment from a financial institution against an approved bill.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-700">Eligible</span>
          <input
            type="checkbox"
            checked={form.discountingEligible}
            onChange={(e) => onPatch({ discountingEligible: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
        </label>
      </header>

      {/* SRS Row 51 — eligibility evaluation breakdown */}
      <div
        className={`mt-4 grid gap-2 rounded-2xl border p-3 sm:grid-cols-4 ${
          form.discountingEligibility.eligible
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-amber-200 bg-amber-50/60"
        }`}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Days Since Submission
          </p>
          <p className="text-lg font-bold text-slate-900">
            {form.discountingEligibility.daysSinceSubmission}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            30-Day Rule
          </p>
          <p
            className={`text-sm font-bold ${
              form.discountingEligibility.thirtyDayRulePassed
                ? "text-emerald-700"
                : "text-rose-700"
            }`}
          >
            {form.discountingEligibility.thirtyDayRulePassed ? "✓ Passed" : "✗ Not yet"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Last Invoice?
          </p>
          <p
            className={`text-sm font-bold ${
              form.discountingEligibility.isLastInvoice ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {form.discountingEligibility.isLastInvoice ? "Yes (blocked)" : "No"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            SRS Row 51 Verdict
          </p>
          <p
            className={`text-sm font-bold ${
              form.discountingEligibility.eligible ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {form.discountingEligibility.eligible ? "Eligible" : "Not eligible"}
          </p>
        </div>
      </div>

      {!form.discountingEligible ? (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          This bill is not currently flagged as eligible for discounting. Tick "Eligible" above to enable the request flow.
        </p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={form.discountingRequested}
                onChange={(e) => onPatch({ discountingRequested: e.target.checked })}
                className="h-4 w-4 accent-pink-600"
              />
              <span className="text-sm font-semibold text-slate-800">Contractor has requested discounting</span>
            </label>
          </div>
          <div>
            <label className={labelClass}>Financial Institution</label>
            <select
              className={inputClass}
              value={form.discountingFiId}
              onChange={(e) => onPatch({ discountingFiId: e.target.value })}
            >
              <option value="">Select institution…</option>
              {master.financialInstitutions.map((fi) => (
                <option key={fi} value={fi}>{fi}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              RMA-licensed institutions · master-data driven
            </p>
          </div>
          <div>
            <label className={labelClass}>Discount Rate (%)</label>
            <input
              type="number"
              className={inputClass}
              value={form.discountingRate}
              onChange={(e) => onPatch({ discountingRate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Discount Fee</label>
            <input
              type="number"
              className={inputClass}
              value={form.discountingFee}
              onChange={(e) => onPatch({ discountingFee: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Net Amount Received</label>
            <input className={inputClass} value={net.toString()} readOnly />
          </div>
          <div>
            <label className={labelClass}>Discounting Status</label>
            <select
              className={inputClass}
              value={form.discountingStatus}
              onChange={(e) => onPatch({ discountingStatus: e.target.value })}
            >
              {master.discountingStatus.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}
    </section>
  );
}
