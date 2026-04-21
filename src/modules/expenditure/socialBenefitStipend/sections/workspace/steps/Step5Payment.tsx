/* ═══════════════════════════════════════════════════════════════════════
   STEP 5 — Payment Processing (PRN rows 100 / 105, DD 28.14-28.29)
   ═══════════════════════════════════════════════════════════════════════
   Finance Officer builds payment transactions for each beneficiary, Head
   of Agency approves, Payment Release Officer flips to Released. Net
   payable is auto-derived from gross − total deductions, and a Payment
   Order ID is auto-generated when the status moves past Approved.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from "react";
import type { SbFormState } from "../../../types";
import { useSbStore } from "../../../state/useSbStore";
import {
  useSbMasterData,
  nextAllowedTxnStatuses,
  isApprovedStatus,
  isPoGeneratedTxn,
  isReleasedTxn,
} from "../../../state/useSbMasterData";
import { useSbRoleCapabilities } from "../../../state/useSbRoleCapabilities";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SbFormState;
  onChange: (next: SbFormState | ((cur: SbFormState) => SbFormState)) => void;
  readOnly?: boolean;
}

export function Step5Payment({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSbMasterData();
  const { generateNextTxnId } = useSbStore();
  const caps = useSbRoleCapabilities();

  /* Beneficiary ref options cascaded from Step 2 roster. */
  const benRefOptions = useMemo(
    () =>
      form.beneficiaries.map(
        (b) =>
          `${b.id} · ${[b.firstName, b.lastName].filter(Boolean).join(" ") || "(unnamed)"}${
            b.studentCode ? " · " + b.studentCode : ""
          }`,
      ),
    [form.beneficiaries],
  );

  /* Total deductions per beneficiary id (from Step 3 rows). */
  const deductionByBeneficiary = useMemo(() => {
    const map = new Map<string, number>();
    form.deductions.forEach((d) => {
      const refId = d.beneficiaryRefId.split(" · ")[0];
      const amt = parseFloat(d.amount || "0") || 0;
      map.set(refId, (map.get(refId) || 0) + amt);
    });
    return map;
  }, [form.deductions]);

  /* Auto-compute deductionAmount + netPayableAmount whenever gross or ref
     changes. Also auto-generate paymentOrderId once status advances past
     Approved. And auto-clean txns referencing removed beneficiaries. */
  useEffect(() => {
    const ids = new Set(form.beneficiaries.map((b) => b.id));
    onChange((cur) => ({
      ...cur,
      transactions: cur.transactions
        .filter((t) => {
          const refId = t.beneficiaryRefId.split(" · ")[0];
          return !t.beneficiaryRefId || ids.has(refId);
        })
        .map((t) => {
          const refId = t.beneficiaryRefId.split(" · ")[0];
          const ded = deductionByBeneficiary.get(refId) || 0;
          const gross = parseFloat(t.grossAmount || "0") || 0;
          const net = Math.max(0, gross - ded);
          const poNeeded =
            isPoGeneratedTxn(t.txnStatus) || isReleasedTxn(t.txnStatus);
          return {
            ...t,
            deductionAmount: ded ? ded.toFixed(2) : t.deductionAmount || "",
            netPayableAmount: gross ? net.toFixed(2) : t.netPayableAmount || "",
            paymentOrderId:
              poNeeded && !t.paymentOrderId
                ? `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
                : t.paymentOrderId,
          };
        }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.beneficiaries.map((b) => b.id).join("|"), deductionByBeneficiary]);

  const addTxn = () =>
    onChange((cur) => ({
      ...cur,
      transactions: [
        ...cur.transactions,
        {
          id: generateNextTxnId(),
          beneficiaryRefId: "",
          invoiceId: "",
          billId: "",
          grossAmount: "",
          deductionAmount: "",
          netPayableAmount: "",
          paymentOrderId: "",
          period: "",
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
  const update = <K extends keyof SbFormState["transactions"][number]>(
    id: string,
    key: K,
    value: SbFormState["transactions"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      transactions: cur.transactions.map((t) =>
        t.id === id ? { ...t, [key]: value } : t,
      ),
    }));

  if (form.beneficiaries.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Onboard at least one beneficiary on Step 2 before generating payment transactions.
      </div>
    );
  }

  /* Budget sanity: total gross across txns vs allocatedBudget */
  const totalGross = form.transactions.reduce(
    (a, t) => a + (parseFloat(t.grossAmount || "0") || 0),
    0,
  );
  const allocated = parseFloat(form.header.allocatedBudget || "0") || 0;
  const overBudget = allocated > 0 && totalGross > allocated;

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      <Card
        title="5. Payment Transactions"
        subtitle="PRN rows 100 / 105 — DD 28.14-28.29. Finance creates, Head approves, Payment Release Officer releases. Net payable = Gross − Σ Step-3 deductions."
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Kpi label="Allocated Budget" value={allocated ? allocated.toFixed(2) : "—"} tone="slate" />
          <Kpi label="Total Gross Requested" value={totalGross.toFixed(2)} tone={overBudget ? "rose" : "emerald"} />
          <Kpi
            label="Remaining"
            value={allocated ? (allocated - totalGross).toFixed(2) : "—"}
            tone={overBudget ? "rose" : "sky"}
          />
        </div>
        {overBudget && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
            ⚠️ Requested total exceeds the allocated budget. Finance must reduce gross amounts or secure a budget revision before approval.
          </div>
        )}

        {form.transactions.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No payment transactions yet. Click <strong>+ Add Transaction</strong> below.
          </p>
        ) : (
          <div className="grid gap-3">
            {form.transactions.map((t) => {
              const allowed = nextAllowedTxnStatuses(t.txnStatus, master.txnStatus);
              const statusOptions =
                allowed.length === 0 ? master.txnStatus : [t.txnStatus, ...allowed].filter(Boolean);
              const approvedLocked = isApprovedStatus(t.txnStatus) && !caps.canApprove;
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
                    <LabeledField label="Beneficiary">
                      <Select
                        value={t.beneficiaryRefId}
                        options={benRefOptions}
                        onChange={(v) => update(t.id, "beneficiaryRefId", v)}
                      />
                    </LabeledField>
                    <LabeledField label="Period (YYYY-MM)">
                      <input
                        type="month"
                        className={inputCls}
                        value={t.period}
                        onChange={(e) => update(t.id, "period", e.target.value)}
                      />
                    </LabeledField>
                    <LabeledField
                      label="Transaction Status"
                      hint={
                        approvedLocked
                          ? "Status already Approved — only Head can revise"
                          : `${allowed.length} onward transition(s)`
                      }
                    >
                      <Select
                        value={t.txnStatus}
                        options={statusOptions}
                        onChange={(v) => update(t.id, "txnStatus", v)}
                        disabled={approvedLocked}
                      />
                    </LabeledField>

                    <LabeledField label="Invoice ID">
                      <input
                        className={inputCls}
                        value={t.invoiceId}
                        onChange={(e) => update(t.id, "invoiceId", e.target.value)}
                      />
                    </LabeledField>
                    <LabeledField label="Bill ID">
                      <input
                        className={inputCls}
                        value={t.billId}
                        onChange={(e) => update(t.id, "billId", e.target.value)}
                      />
                    </LabeledField>
                    <LabeledField label="Gross Amount">
                      <input
                        className={inputCls}
                        value={t.grossAmount}
                        onChange={(e) => update(t.id, "grossAmount", e.target.value)}
                      />
                    </LabeledField>

                    <LabeledField label="Deduction Amount (auto)">
                      <input
                        className={inputCls + " bg-slate-100"}
                        value={t.deductionAmount}
                        readOnly
                      />
                    </LabeledField>
                    <LabeledField label="Net Payable (auto)">
                      <input
                        className={inputCls + " bg-slate-100"}
                        value={t.netPayableAmount}
                        readOnly
                      />
                    </LabeledField>
                    <LabeledField label="Payment Order ID (auto on PO)">
                      <input
                        className={inputCls + " bg-slate-100"}
                        value={t.paymentOrderId}
                        readOnly
                      />
                    </LabeledField>

                    <LabeledField label="Remarks" className="md:col-span-2 lg:col-span-3">
                      <input
                        className={inputCls}
                        value={t.remarks}
                        onChange={(e) => update(t.id, "remarks", e.target.value)}
                      />
                    </LabeledField>
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

function LabeledField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1 ${className ?? ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  const toneMap: Record<string, string> = {
    slate: "from-slate-50 to-white ring-slate-200 text-slate-900",
    emerald: "from-emerald-50 to-white ring-emerald-200 text-emerald-800",
    sky: "from-sky-50 to-white ring-sky-200 text-sky-800",
    rose: "from-rose-50 to-white ring-rose-200 text-rose-800",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br p-3 shadow-sm ring-1 ${toneMap[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}
