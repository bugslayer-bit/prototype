/* ═══════════════════════════════════════════════════════════════════════
   STEP 1 — Entity Master (PD row 107, DD section 26.x)
   ═══════════════════════════════════════════════════════════════════════
   Cascading flow:
     • txnType (Subscription / Contribution) is the flow anchor
     • scope (Domestic / International) narrows Currency and toggles the
       foreign-address + SWIFT routing fields
     • beneficiaryType narrows Organisation Type
     • paymentFrequency decides whether membershipPeriodTo is required
     • Changing scope auto-clears a stale currency that no longer matches
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from "react";
import type { ScFormState } from "../../../types";
import { useScStore } from "../../../state/useScStore";
import {
  useScMasterData,
  filterCurrencyByScope,
  filterOrgByBeneficiaryType,
  isInternationalScope,
  isRecurringFrequency,
  isSubscriptionType,
} from "../../../state/useScMasterData";
import { Card } from "../../../ui/Card";
import { Field } from "../../../ui/Field";
import { Select } from "../../../ui/Select";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: ScFormState;
  onChange: (next: ScFormState | ((cur: ScFormState) => ScFormState)) => void;
  readOnly?: boolean;
}

export function Step1Entity({ form, onChange, readOnly = false }: SectionProps) {
  const master = useScMasterData();
  const { generateNextDocId } = useScStore();

  const update = <K extends keyof ScFormState["header"]>(
    key: K,
    value: ScFormState["header"][K],
  ) => onChange((cur) => ({ ...cur, header: { ...cur.header, [key]: value } }));

  /* Cascading currency list based on scope. */
  const filteredCurrencies = useMemo(
    () => filterCurrencyByScope(form.header.scope, master.currency),
    [form.header.scope, master.currency],
  );

  /* Cascading organisation list based on beneficiaryType. */
  const filteredOrgs = useMemo(
    () =>
      filterOrgByBeneficiaryType(form.header.beneficiaryType, master.organisationType),
    [form.header.beneficiaryType, master.organisationType],
  );

  /* Auto-clear currency if it falls outside the filtered set after scope change. */
  useEffect(() => {
    if (form.header.currency && !filteredCurrencies.includes(form.header.currency)) {
      update("currency", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.header.scope, filteredCurrencies.join("|")]);

  /* Auto-clear organisationType if it falls outside the new beneficiary-type filter. */
  useEffect(() => {
    if (
      form.header.organisationType &&
      !filteredOrgs.includes(form.header.organisationType)
    ) {
      update("organisationType", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.header.beneficiaryType, filteredOrgs.join("|")]);

  /* For Domestic entities the foreign-address and SWIFT fields must be blank. */
  useEffect(() => {
    if (!isInternationalScope(form.header.scope)) {
      if (form.header.addressOutside || form.header.swiftRoutingCode) {
        onChange((cur) => ({
          ...cur,
          header: { ...cur.header, addressOutside: "", swiftRoutingCode: "" },
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.header.scope]);

  const intl = isInternationalScope(form.header.scope);
  const recurring = isRecurringFrequency(form.header.paymentFrequency);
  const isSubscription = isSubscriptionType(form.header.txnType);

  /* Supporting documents — add/remove rows */
  const addDoc = () =>
    onChange((cur) => ({
      ...cur,
      documents: [
        ...cur.documents,
        {
          id: generateNextDocId(),
          documentType: "",
          reference: "",
          receivedDate: "",
          remarks: "",
        },
      ],
    }));
  const removeDoc = (id: string) =>
    onChange((cur) => ({
      ...cur,
      documents: cur.documents.filter((d) => d.id !== id),
    }));
  const updateDoc = <K extends keyof ScFormState["documents"][number]>(
    id: string,
    key: K,
    value: ScFormState["documents"][number][K],
  ) =>
    onChange((cur) => ({
      ...cur,
      documents: cur.documents.map((d) =>
        d.id === id ? { ...d, [key]: value } : d,
      ),
    }));

  /* Empty LoV banner */
  const emptyLovs = Object.entries({
    "sc-type": master.txnType,
    "sc-scope": master.scope,
    "sc-beneficiary-type": master.beneficiaryType,
    "sc-organisation-type": master.organisationType,
    "payment-frequency": master.paymentFrequency,
    "currency-type": master.currency,
    "sc-entity-status": master.entityStatus,
    "budget-codes": master.budgetCode,
    "bank-name": master.bankName,
  })
    .filter(([, v]) => v.length === 0)
    .map(([k]) => k);

  return (
    <div
      className={`grid gap-6 ${readOnly ? "pointer-events-none select-none opacity-70" : ""}`}
      aria-disabled={readOnly}
    >
      {emptyLovs.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          ⚠️ Missing master data for: <strong>{emptyLovs.join(", ")}</strong>. Ask an administrator to populate these LoVs from /master-data before registering new entities.
        </div>
      )}

      <Card
        title="1. Entity Master Data"
        subtitle="PD row 107 — register subscription/contribution entities. Every dropdown is sourced from master data; selections cascade downstream."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Entity ID" hint="System-generated on first save">
            <input className={inputCls + " bg-slate-100"} value={form.header.scId} readOnly />
          </Field>
          <Field label="Transaction Type *" hint="Drives whether this is a Subscription or Contribution">
            <Select
              value={form.header.txnType}
              options={master.txnType}
              onChange={(v) => update("txnType", v)}
            />
          </Field>
          <Field label="Scope *" hint="Domestic narrows currency to BTN; International enables SWIFT / foreign address">
            <Select
              value={form.header.scope}
              options={master.scope}
              onChange={(v) => update("scope", v)}
            />
          </Field>

          <Field label="Entity Name *">
            <input
              className={inputCls}
              value={form.header.entityName}
              onChange={(e) => update("entityName", e.target.value)}
              placeholder="e.g. World Health Organization"
            />
          </Field>
          <Field label="Short Name / Acronym">
            <input
              className={inputCls}
              value={form.header.shortName}
              onChange={(e) => update("shortName", e.target.value)}
              placeholder="e.g. WHO"
            />
          </Field>
          <Field label="Entity Status">
            <Select
              value={form.header.entityStatus}
              options={master.entityStatus}
              onChange={(v) => update("entityStatus", v)}
            />
          </Field>

          <Field label="Beneficiary Type">
            <Select
              value={form.header.beneficiaryType}
              options={master.beneficiaryType}
              onChange={(v) => update("beneficiaryType", v)}
            />
          </Field>
          <Field
            label="Organisation Type"
            hint={
              form.header.beneficiaryType
                ? `${filteredOrgs.length} option(s) for ${form.header.beneficiaryType}`
                : "Select beneficiary type first"
            }
          >
            <Select
              value={form.header.organisationType}
              options={filteredOrgs}
              onChange={(v) => update("organisationType", v)}
              disabled={!form.header.beneficiaryType}
            />
          </Field>
          <Field label="Registry Vendor ID (DD 26.1)">
            <input
              className={inputCls}
              value={form.header.registryVendorId}
              onChange={(e) => update("registryVendorId", e.target.value)}
              placeholder="Link to vendor registry"
            />
          </Field>

          <Field label="Contact Person">
            <input
              className={inputCls}
              value={form.header.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
            />
          </Field>
          <Field label="Contact No">
            <input
              className={inputCls}
              value={form.header.contactNo}
              onChange={(e) => update("contactNo", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              value={form.header.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>

          <Field label="Address in Bhutan" className="md:col-span-2 lg:col-span-3">
            <textarea
              className={inputCls + " min-h-[70px]"}
              value={form.header.addressBhutan}
              onChange={(e) => update("addressBhutan", e.target.value)}
              placeholder="Dzongkhag / Thromde / Gewog / street details"
            />
          </Field>

          {intl && (
            <Field
              label="Address Outside Bhutan *"
              hint="Only for International scope"
              className="md:col-span-2 lg:col-span-3"
            >
              <textarea
                className={inputCls + " min-h-[70px]"}
                value={form.header.addressOutside}
                onChange={(e) => update("addressOutside", e.target.value)}
                placeholder="Foreign office address for remittance correspondence"
              />
            </Field>
          )}
        </div>
      </Card>

      <Card
        title="Banking & Payment Details"
        subtitle="DD 26.2 + 26.3. SWIFT / routing section is auto-hidden for Domestic scope."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Bank Name"
            hint={`${master.bankName.length} bank(s) from canonical bank-name registry`}
          >
            <Select
              value={form.header.bankName}
              options={master.bankName}
              onChange={(v) => {
                update("bankName", v);
                /* Clear branch when bank changes */
                if (v !== form.header.bankName) update("bankBranchName", "");
              }}
            />
          </Field>
          <Field
            label="Bank Branch Name"
            hint={
              form.header.bankName
                ? `${master.bankBranch.length} branch(es) from bank-branch-name`
                : "Select bank first"
            }
          >
            <Select
              value={form.header.bankBranchName}
              options={master.bankBranch}
              onChange={(v) => update("bankBranchName", v)}
              disabled={!form.header.bankName}
            />
          </Field>
          <Field label="Bank Account Number">
            <input
              className={inputCls}
              value={form.header.bankAccountNo}
              onChange={(e) => update("bankAccountNo", e.target.value)}
            />
          </Field>

          {intl && (
            <Field label="SWIFT / Routing Code *" hint="DD 26.3 — required for foreign remittance">
              <input
                className={inputCls}
                value={form.header.swiftRoutingCode}
                onChange={(e) => update("swiftRoutingCode", e.target.value)}
                placeholder="e.g. BKCHCNBJ"
              />
            </Field>
          )}

          <Field
            label="Currency"
            hint={
              form.header.scope
                ? `${filteredCurrencies.length} option(s) for ${form.header.scope}`
                : "Select scope first"
            }
          >
            <Select
              value={form.header.currency}
              options={filteredCurrencies}
              onChange={(v) => update("currency", v)}
              disabled={!form.header.scope}
            />
          </Field>
          <Field label="Budget Code *">
            <Select
              value={form.header.budgetCode}
              options={master.budgetCode}
              onChange={(v) => update("budgetCode", v)}
            />
          </Field>
          <Field label="Payment Frequency">
            <Select
              value={form.header.paymentFrequency}
              options={master.paymentFrequency}
              onChange={(v) => update("paymentFrequency", v)}
            />
          </Field>

          <Field label={isSubscription ? "Membership / Subscription Amount" : "Contribution Amount"}>
            <input
              className={inputCls}
              value={form.header.membershipAmount}
              onChange={(e) => update("membershipAmount", e.target.value)}
              placeholder="Per-period amount in entity currency"
            />
          </Field>
          <Field label="Period From">
            <input
              type="date"
              className={inputCls}
              value={form.header.membershipPeriodFrom}
              onChange={(e) => update("membershipPeriodFrom", e.target.value)}
            />
          </Field>
          <Field
            label={recurring ? "Period To *" : "Period To"}
            hint={recurring ? "Required for recurring payments" : undefined}
          >
            <input
              type="date"
              className={inputCls}
              value={form.header.membershipPeriodTo}
              onChange={(e) => update("membershipPeriodTo", e.target.value)}
            />
          </Field>

          <Field label="Notes / Other Relevant Information" className="md:col-span-2 lg:col-span-3">
            <textarea
              className={inputCls + " min-h-[70px]"}
              value={form.header.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Supporting Documents"
        subtitle="PD row 107 — attach membership certificates, demand notes, commitment letters. Document type cascades from the sc-document-type LoV."
      >
        {form.documents.length === 0 ? (
          <p className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            No documents attached yet. Click <strong>+ Add Document</strong>.
          </p>
        ) : (
          <div className="grid gap-3">
            {form.documents.map((d) => (
              <div key={d.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{d.id}</p>
                  <button
                    type="button"
                    onClick={() => removeDoc(d.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <Field label="Document Type">
                    <Select
                      value={d.documentType}
                      options={master.documentType}
                      onChange={(v) => updateDoc(d.id, "documentType", v)}
                    />
                  </Field>
                  <Field label="Reference">
                    <input
                      className={inputCls}
                      value={d.reference}
                      onChange={(e) => updateDoc(d.id, "reference", e.target.value)}
                    />
                  </Field>
                  <Field label="Received Date">
                    <input
                      type="date"
                      className={inputCls}
                      value={d.receivedDate}
                      onChange={(e) => updateDoc(d.id, "receivedDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Remarks">
                    <input
                      className={inputCls}
                      value={d.remarks}
                      onChange={(e) => updateDoc(d.id, "remarks", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addDoc}
          className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Document
        </button>
      </Card>
    </div>
  );
}
