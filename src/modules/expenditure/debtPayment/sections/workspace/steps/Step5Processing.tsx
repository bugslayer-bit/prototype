/* ═══════════════════════════════════════════════════════════════════════
   STEP 5 — Debt Payment Processing (PRN 6.1 Step 5)
   Every value shown here is derived from the wizard's live form state.
   No hardcoded strings — status and currency checks go through semantic
   helpers so admin-renamed master-data values still classify correctly.
   ═══════════════════════════════════════════════════════════════════════ */
import type { DebtFormState } from "../../../types";
import { Card } from "../../../ui/Card";
import {
  isPaidStatus,
  isLocalCurrency,
} from "../../../state/useDebtMasterData";

export function Step5Processing({ form }: { form: DebtFormState }) {
  const totalScheduled = form.repayments.reduce(
    (sum, r) => sum + parseFloat(r.amountToPay || "0"),
    0,
  );
  const paid = form.repayments.filter((r) => isPaidStatus(r.status)).length;
  const pending = form.repayments.length - paid;

  const items = [
    { label: "1. Scheduled Payment Processing", value: `${form.repayments.length} order(s) scheduled` },
    {
      label: "2. Multi-Currency Payment Handling",
      value:
        Array.from(new Set(form.repayments.map((r) => r.currency).filter(Boolean))).join(", ") ||
        "—",
    },
    {
      label: "3. Exchange Rate Application",
      value: !form.header.paymentCurrencyId
        ? "—"
        : isLocalCurrency(form.header.paymentCurrencyId)
          ? "Local currency — no conversion"
          : "Apply RMA daily rate",
    },
    {
      label: "4. Bank Charges / Deduction",
      value: form.header.applicableDeduction || "Not configured",
    },
    {
      label: "5. Payment Confirmation Checking",
      value: `${paid} paid · ${pending} pending`,
    },
    {
      label: "6. Payment Order ID(s)",
      value: form.repayments.map((r) => r.paymentOrderId).join(", ") || "—",
    },
  ];

  return (
    <Card
      title="5. Debt Payment Processing"
      subtitle="PRN 6.1 Step 5 — Scheduled Payment Processing, Multi-Currency Handling, Exchange Rate Application, Bank Charges, Payment Confirmation Checking, and Payment Order tracking."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{it.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{it.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800">
        Total scheduled repayments: <strong>{totalScheduled.toLocaleString()}</strong>{" "}
        {form.header.paymentCurrencyId || ""}
      </div>
    </Card>
  );
}
