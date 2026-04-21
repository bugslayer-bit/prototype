/* ═══════════════════════════════════════════════════════════════════════
   STEP 1 — Create Transfer Transaction (SRS PRN 6.2 Step 1)
   ═══════════════════════════════════════════════════════════════════════
   Captures the Fund Transfer header. Every dropdown option is sourced
   from master data. If a master-data list is empty an amber banner
   instructs the admin to populate it — nothing is assumed. */
import type { SoeFormState } from "../../../types";
import { useSoeMasterData } from "../../../state/useSoeMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SoeFormState;
  onChange: (next: SoeFormState | ((cur: SoeFormState) => SoeFormState)) => void;
  readOnly?: boolean;
}

export function Step1Header({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSoeMasterData();
  const h = form.header;

  const set = <K extends keyof SoeFormState["header"]>(key: K, value: SoeFormState["header"][K]) =>
    onChange((cur) => ({ ...cur, header: { ...cur.header, [key]: value } }));

  const lovChecks: { key: string; label: string; values: string[] }[] = [
    { key: "soe-transfer-type", label: "Transfer Type", values: master.transferType },
    { key: "soe-direction", label: "Direction", values: master.direction },
    { key: "soe-source-of-fund", label: "Source of Fund", values: master.sourceOfFund },
    { key: "soe-destination-account-type", label: "Destination Account Type", values: master.destinationAccountType },
    { key: "currency-type", label: "Currency", values: master.currency },
    { key: "payment-frequency", label: "Reporting Frequency", values: master.reportingFrequency },
    { key: "soe-expenditure-category", label: "Expenditure Category", values: master.expenditureCategory },
    { key: "soe-transfer-status", label: "Transfer Status", values: master.transferStatus },
  ];
  const emptyLovs = lovChecks.filter((c) => c.values.length === 0);

  return (
    <div className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`} aria-disabled={readOnly}>
      {emptyLovs.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ {emptyLovs.length} master-data list(s) empty</p>
          <p className="mt-0.5">
            Populate in <span className="font-mono">/master-data</span>:{" "}
            {emptyLovs.map((l) => l.key).join(", ")}
          </p>
        </div>
      )}

      <Card
        title="1. Fund Transfer Header"
        subtitle="PRN 6.2 Step 1 — Create a new Fund Transfer transaction. Transfer ID is system-generated."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Transfer ID (auto)">
            <input className={inputCls} value={h.transferId} readOnly placeholder="SOE-YYYY-NNNN" />
          </Field>
          <Field label="Transfer Type">
            <Select value={h.transferType} options={master.transferType} onChange={(v) => set("transferType", v)} />
          </Field>
          <Field label="Direction">
            <Select value={h.direction} options={master.direction} onChange={(v) => set("direction", v)} />
          </Field>

          <Field label="Source of Fund">
            <Select value={h.sourceOfFund} options={master.sourceOfFund} onChange={(v) => set("sourceOfFund", v)} />
          </Field>
          <Field label="Destination Account Type">
            <Select
              value={h.destinationAccountType}
              options={master.destinationAccountType}
              onChange={(v) => set("destinationAccountType", v)}
            />
          </Field>
          <Field label="Expenditure Category">
            <Select
              value={h.expenditureCategory}
              options={master.expenditureCategory}
              onChange={(v) => set("expenditureCategory", v)}
            />
          </Field>

          <Field label="Originating Agency">
            <input className={inputCls} value={h.originatingAgency} onChange={(e) => set("originatingAgency", e.target.value)} />
          </Field>
          <Field label="Receiving Agency">
            <input className={inputCls} value={h.receivingAgency} onChange={(e) => set("receivingAgency", e.target.value)} />
          </Field>
          <Field label="Parliament Sanction Ref">
            <input
              className={inputCls}
              value={h.parliamentSanctionRef}
              placeholder="PRN 6.2.1 — appropriation reference"
              onChange={(e) => set("parliamentSanctionRef", e.target.value)}
            />
          </Field>

          <Field label="Budget Head Code (UCoA)">
            <input className={inputCls} value={h.budgetHeadCode} onChange={(e) => set("budgetHeadCode", e.target.value)} />
          </Field>
          <Field label="Currency">
            <Select value={h.currency} options={master.currency} onChange={(v) => set("currency", v)} />
          </Field>
          <Field label="Exchange Rate">
            <input className={inputCls} value={h.exchangeRate} onChange={(e) => set("exchangeRate", e.target.value)} />
          </Field>

          <Field label="Total Amount">
            <input className={inputCls} value={h.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} />
          </Field>
          <Field label="Value Date">
            <input
              className={inputCls}
              type="date"
              value={h.valueDate}
              onChange={(e) => set("valueDate", e.target.value)}
            />
          </Field>
          <Field label="Reporting Frequency">
            <Select
              value={h.reportingFrequency}
              options={master.reportingFrequency}
              onChange={(v) => set("reportingFrequency", v)}
            />
          </Field>

          <Field label="Transfer Status">
            <Select value={h.transferStatus} options={master.transferStatus} onChange={(v) => set("transferStatus", v)} />
          </Field>

          <Field label="Narrative / Purpose" className="md:col-span-2 lg:col-span-3">
            <textarea
              className={inputCls + " min-h-[80px]"}
              value={h.narrative}
              onChange={(e) => set("narrative", e.target.value)}
              placeholder="Purpose of the transfer, Parliament sanction notes, donor-fund conditions…"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
