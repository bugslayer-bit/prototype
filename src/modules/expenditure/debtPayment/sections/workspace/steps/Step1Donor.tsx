/* ═══════════════════════════════════════════════════════════════════════
   STEP 1 — Debt Servicing Data Integration
   ────────────────────────────────────────
   (a) Donor / Lender / Creditor Master Record
   (b) Debt Servicing Header (DD 20.1 → 20.12)
   ═══════════════════════════════════════════════════════════════════════ */
import type { DebtFormState, DonorMaster } from "../../../types";
import { initialDonor } from "../../../types";
import { useDebtStore } from "../../../state/useDebtStore";
import { useDebtMasterData } from "../../../state/useDebtMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";
import { SelectedDonorSummary } from "./SelectedDonorSummary";

interface SectionProps {
  form: DebtFormState;
  onChange: (next: DebtFormState | ((cur: DebtFormState) => DebtFormState)) => void;
  readOnly?: boolean;
}

export function Step1Donor({ form, onChange, readOnly = false }: SectionProps) {
  const master = useDebtMasterData();
  const { donors, upsertDonor, generateNextDonorId } = useDebtStore();

  const setHeader = (field: keyof DebtFormState["header"], value: string) =>
    onChange((cur) => ({ ...cur, header: { ...cur.header, [field]: value } }));

  const setDonorField = <K extends keyof DonorMaster>(field: K, value: DonorMaster[K]) =>
    onChange((cur) => ({
      ...cur,
      donor: { ...(cur.donor ?? initialDonor), [field]: value },
    }));

  const ensureDonorObject = () => {
    if (form.donor) return;
    onChange((cur) => ({
      ...cur,
      donor: { ...initialDonor, donorId: generateNextDonorId(), createdAt: new Date().toISOString() },
    }));
  };

  const saveDonor = () => {
    if (!form.donor) return;
    if (!form.donor.name) return;
    const donor: DonorMaster = {
      ...form.donor,
      id: form.donor.id || form.donor.donorId,
    };
    upsertDonor(donor);
    onChange((cur) => ({
      ...cur,
      donor,
      header: { ...cur.header, creditorId: donor.donorId, creditorName: donor.name },
    }));
  };

  const selectExistingDonor = (donorId: string) => {
    const d = donors.find((x) => x.donorId === donorId) || null;
    onChange((cur) => ({
      ...cur,
      donor: d,
      header: {
        ...cur.header,
        creditorId: d?.donorId ?? "",
        creditorName: d?.name ?? "",
      },
    }));
  };

  /* Collect every LoV used on this step + the bound master-data key so
     we can render a warning banner for each missing list. Admins fix these
     from /master-data — we never invent fallback values. */
  const lovChecks: Array<{ title: string; id: string; list: string[] }> = [
    { title: "Data Source list is empty", id: "debt-data-source", list: master.dataSource },
    { title: "Creditor Type list is empty", id: "debt-creditor-type", list: master.creditorType },
    { title: "Country of Registration list is empty", id: "country-registration", list: master.countries },
    { title: "Debt Category list is empty", id: "debt-category", list: master.debtCategory },
    { title: "Payment Type list is empty", id: "debt-payment-type", list: master.paymentType },
    { title: "Payment Currency list is empty", id: "currency-type", list: master.paymentCurrency },
    { title: "Loan Term Unit list is empty", id: "debt-loan-term-unit", list: master.loanTermUnit },
    { title: "Repayment Frequency list is empty", id: "payment-frequency", list: master.repaymentFrequency },
    { title: "Amortization Schedule list is empty", id: "debt-amortization-schedule", list: master.amortizationSchedule },
    { title: "Applicable Deduction list is empty", id: "debt-applicable-deduction", list: master.applicableDeduction },
    { title: "Payment Status list is empty", id: "debt-payment-status", list: master.paymentStatus },
  ];
  const missingLoVs = lovChecks.filter((l) => l.list.length === 0);

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      {/* Dense live snapshot — appears once a donor/creditor is picked */}
      <SelectedDonorSummary form={form} />

      {/* Missing master-data warnings */}
      {missingLoVs.length > 0 && (
        <div className="space-y-2">
          {missingLoVs.map((m) => (
            <EmptyMasterBanner key={m.id} title={m.title} id={m.id} />
          ))}
        </div>
      )}

      {/* (a) Donor master */}
      <Card title="1(a). Donor / Lender / Creditor Master" subtitle="SRS PRN 6.1 Step 1 — Donor master record. Three SRS data sources supported.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Existing Donor (load record)">
            <select
              className={inputCls}
              value={form.donor?.donorId ?? ""}
              onChange={(e) => selectExistingDonor(e.target.value)}
            >
              <option value="">— New donor —</option>
              {donors.map((d) => (
                <option key={d.donorId} value={d.donorId}>
                  {d.donorId} — {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data Source (LoV)">
            <Select
              value={form.donor?.dataSource ?? ""}
              options={master.dataSource}
              onChange={(v) => {
                ensureDonorObject();
                setDonorField("dataSource", v);
              }}
            />
          </Field>

          <Field label="Donor ID">
            <input className={inputCls} readOnly value={form.donor?.donorId ?? "auto on save"} />
          </Field>
          <Field label="Name *">
            <input
              className={inputCls}
              value={form.donor?.name ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("name", e.target.value);
              }}
            />
          </Field>
          <Field label="Unique Identification No *">
            <input
              className={inputCls}
              value={form.donor?.uniqueIdentificationNo ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("uniqueIdentificationNo", e.target.value);
              }}
            />
          </Field>
          <Field label="Creditor Type (LoV)">
            <Select
              value={form.donor?.creditorType ?? ""}
              options={master.creditorType}
              onChange={(v) => {
                ensureDonorObject();
                setDonorField("creditorType", v);
              }}
            />
          </Field>
          <Field label="Origin Country (LoV)">
            <Select
              value={form.donor?.originCountry ?? ""}
              options={master.countries}
              onChange={(v) => {
                ensureDonorObject();
                setDonorField("originCountry", v);
              }}
            />
          </Field>
          <Field label="Address">
            <input
              className={inputCls}
              value={form.donor?.address ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("address", e.target.value);
              }}
            />
          </Field>
          <Field label="Contact Person">
            <input
              className={inputCls}
              value={form.donor?.contactName ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("contactName", e.target.value);
              }}
            />
          </Field>
          <Field label="Contact Phone">
            <input
              className={inputCls}
              value={form.donor?.contactPhone ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("contactPhone", e.target.value);
              }}
            />
          </Field>
          <Field label="Contact Email">
            <input
              className={inputCls}
              type="email"
              value={form.donor?.contactEmail ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("contactEmail", e.target.value);
              }}
            />
          </Field>
          <Field label="Bank Name">
            <input
              className={inputCls}
              value={form.donor?.bankName ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("bankName", e.target.value);
              }}
            />
          </Field>
          <Field label="Bank Account Number">
            <input
              className={inputCls}
              value={form.donor?.bankAccountNumber ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("bankAccountNumber", e.target.value);
              }}
            />
          </Field>
          <Field label="Routing Information">
            <input
              className={inputCls}
              value={form.donor?.routingInformation ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("routingInformation", e.target.value);
              }}
            />
          </Field>
          <Field label="SWIFT Code">
            <input
              className={inputCls}
              value={form.donor?.swiftCode ?? ""}
              onChange={(e) => {
                ensureDonorObject();
                setDonorField("swiftCode", e.target.value);
              }}
            />
          </Field>
          <Field label="Linked to Meridian">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.donor?.meridianLinked ?? false}
                onChange={(e) => {
                  ensureDonorObject();
                  setDonorField("meridianLinked", e.target.checked);
                }}
              />
              API based integration with Meridian
            </label>
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={saveDonor}
            disabled={!form.donor?.name}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Save Donor & Use as Creditor
          </button>
        </div>
      </Card>

      {/* (b) Debt Servicing Header */}
      <Card title="1(b). Debt Servicing Information" subtitle="DD 20.1 → 20.12 — register the debt instrument and repayment requirements.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Debt Servicing ID (20.1)">
            <input className={inputCls} readOnly value={form.header.debtServicingId} />
          </Field>
          <Field label="Data Source (LoV)">
            <Select
              value={form.header.dataSource}
              options={master.dataSource}
              onChange={(v) => setHeader("dataSource", v)}
            />
          </Field>
          <Field label="Loan/Instrument No (Government) (20.2) *">
            <input
              className={inputCls}
              value={form.header.loanInstrumentIdGov}
              onChange={(e) => setHeader("loanInstrumentIdGov", e.target.value)}
            />
          </Field>
          <Field label="Loan/Instrument No (Lender) (20.2)">
            <input
              className={inputCls}
              value={form.header.loanInstrumentIdLender}
              onChange={(e) => setHeader("loanInstrumentIdLender", e.target.value)}
            />
          </Field>
          <Field label="Project ID / Project Number">
            <input
              className={inputCls}
              value={form.header.projectId}
              onChange={(e) => setHeader("projectId", e.target.value)}
            />
          </Field>
          <Field label="Creditor (20.3) *">
            <input
              className={inputCls}
              readOnly
              value={form.header.creditorName ? `${form.header.creditorId} — ${form.header.creditorName}` : ""}
              placeholder="Save donor above to populate"
            />
          </Field>
          <Field label="Description of Loan" className="md:col-span-2">
            <textarea
              className={`${inputCls} min-h-[72px]`}
              value={form.header.loanDescription}
              onChange={(e) => setHeader("loanDescription", e.target.value)}
            />
          </Field>
          <Field label="Debt Category (20.4 / LoV)">
            <Select
              value={form.header.debtCategory}
              options={master.debtCategory}
              onChange={(v) => setHeader("debtCategory", v)}
            />
          </Field>
          <Field label="Type of Payment (LoV)">
            <Select
              value={form.header.paymentType}
              options={master.paymentType}
              onChange={(v) => setHeader("paymentType", v)}
            />
          </Field>
          <Field label="Principal Loan Amount (20.5) *">
            <input
              className={inputCls}
              type="number"
              min="0"
              step="0.01"
              value={form.header.principalLoanAmount}
              onChange={(e) => setHeader("principalLoanAmount", e.target.value)}
            />
          </Field>
          <Field label="Interest Rate (% pa) (20.6)">
            <input
              className={inputCls}
              type="number"
              min="0"
              step="0.01"
              value={form.header.interestRate}
              onChange={(e) => setHeader("interestRate", e.target.value)}
            />
          </Field>
          <Field label="Payment Currency (20.8 / LoV)">
            <Select
              value={form.header.paymentCurrencyId}
              options={master.paymentCurrency}
              onChange={(v) => setHeader("paymentCurrencyId", v)}
            />
          </Field>
          <Field label="Loan Term — Value (20.11)">
            <input
              className={inputCls}
              type="number"
              min="0"
              value={form.header.loanTermValue}
              onChange={(e) => setHeader("loanTermValue", e.target.value)}
            />
          </Field>
          <Field label="Loan Term — Unit (20.11 / LoV)">
            <Select
              value={form.header.loanTermUnit}
              options={master.loanTermUnit}
              onChange={(v) => setHeader("loanTermUnit", v)}
            />
          </Field>
          <Field label="Repayment Frequency (20.11 / LoV)">
            <Select
              value={form.header.repaymentFrequency}
              options={master.repaymentFrequency}
              onChange={(v) => setHeader("repaymentFrequency", v)}
            />
          </Field>
          <Field label="Amortization Schedule (21.11 / LoV)">
            <Select
              value={form.header.amortizationSchedule}
              options={master.amortizationSchedule}
              onChange={(v) => setHeader("amortizationSchedule", v)}
            />
          </Field>
          <Field label="Grace Period End Date (20.12)">
            <input
              className={inputCls}
              type="date"
              value={form.header.gracePeriodEnd}
              onChange={(e) => setHeader("gracePeriodEnd", e.target.value)}
            />
          </Field>
          <Field label="Applicable Deduction (LoV)">
            <Select
              value={form.header.applicableDeduction}
              options={master.applicableDeduction}
              onChange={(v) => setHeader("applicableDeduction", v)}
            />
          </Field>
          <Field label="Meridian Reference ID (20.10)">
            <input
              className={inputCls}
              value={form.header.meridianReferenceId}
              onChange={(e) => setHeader("meridianReferenceId", e.target.value)}
            />
          </Field>
          <Field label="Payment Status (20.9 / LoV)">
            <Select
              value={form.header.paymentStatus}
              options={master.paymentStatus}
              onChange={(v) => setHeader("paymentStatus", v)}
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}

/* ── Shared banner — points admins at /master-data when a LoV is empty. */
function EmptyMasterBanner({ title, id }: { title: string; id: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <p className="font-bold">⚠️ {title}</p>
      <p className="mt-0.5">
        Populate this list in <span className="font-mono">/master-data</span> before capturing debt
        servicing data. Master-data key:{" "}
        <span className="font-mono text-[11px]">({id})</span>
      </p>
    </div>
  );
}
