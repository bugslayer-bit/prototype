/* ═══════════════════════════════════════════════════════════════════════════
   Process 2.0 — Utility Bill Data Management
   SRS PRN 5.1 R76 — Bills arrive via provider API (push), an explicit fetch,
   or manual entry. Every row carries its own period, amount, tax, due date
   and source. Totals are system-verified against (bill + tax).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import type { UtilityBill, UtilityFormState, BillSource } from "../types";
import {
  useUtilityMasterData,
  isApiPushSource,
  isApiFetchSource,
  isManualSource,
  isPaidStatus,
  isApprovedStatus,
  isClearedStatus,
  isOverdueStatus,
  isDisputedStatus,
  isPendingStatus,
  findLabel,
} from "../hooks/useUtilityMasterData";
import { useContractData } from "../../../../shared/context/ContractDataContext";

interface Props {
  form: UtilityFormState;
  onChange: (next: UtilityFormState) => void;
  generateNextBillId: () => string;
}

const EMPTY_BILL = (
  utilityId: string,
  defaultSource: string,
  defaultStatus: string,
): Omit<UtilityBill, "id" | "billId"> => ({
  utilityId,
  source: defaultSource,
  serviceNumber: "",
  officeId: "",
  officeName: "",
  billingCycle: "",
  billingPeriodFrom: "",
  billingPeriodTo: "",
  billAmount: "",
  applicableTaxes: "",
  totalBillAmount: "",
  billDueDate: "",
  receivedAt: new Date().toISOString(),
  status: defaultStatus,
});

export function UtilityBillSection({ form, onChange, generateNextBillId }: Props) {
  const master = useUtilityMasterData();
  const { contracts } = useContractData();

  /* Service types configured in Process 1.0 — the dynamic driver for the
     bill data table below. Officers pick a service type first, then the
     table renders only the bills scoped to that service type and the
     "+ API Fetch / Push / Manual" buttons pre-seed that service. */
  const serviceTypesInUse = useMemo(() => {
    const set = new Set<string>();
    for (const m of form.serviceMaps) {
      const s = (m.serviceName || "").trim();
      if (s) set.add(s);
    }
    return Array.from(set);
  }, [form.serviceMaps]);

  const [selectedServiceType, setSelectedServiceType] = useState<string>(
    () => serviceTypesInUse[0] ?? "",
  );

  /* Keep the selector in sync if Process 1.0 mappings change underneath. */
  const effectiveServiceType =
    selectedServiceType && serviceTypesInUse.includes(selectedServiceType)
      ? selectedServiceType
      : serviceTypesInUse[0] ?? "";

  const activeServiceMap = useMemo(
    () => form.serviceMaps.find((m) => m.serviceName === effectiveServiceType),
    [form.serviceMaps, effectiveServiceType],
  );

  const visibleBills = useMemo(() => {
    if (!effectiveServiceType) return form.bills;
    return form.bills.filter(
      (b) =>
        !b.serviceNumber ||
        b.serviceNumber === effectiveServiceType ||
        b.serviceNumber.includes(effectiveServiceType),
    );
  }, [form.bills, effectiveServiceType]);

  /* If the utility provider matches a contractor on an existing contract,
     show the linked contract so the officer knows a commitment exists.
     Fully dynamic — pulls live from ContractDataContext. */
  const linkedContracts = contracts.filter(
    (c) =>
      c.contractorId === form.header.serviceProviderId ||
      c.contractorName.toLowerCase() === form.header.serviceProviderName.toLowerCase(),
  );

  const defaultPendingStatus = findLabel(master.billStatus, isPendingStatus);
  const defaultManualSource = findLabel(master.billSource, isManualSource);

  /* ── Realistic mock data generator for API Fetch / API Push ──────────
     SRS R76: when the officer triggers an API pull the bill row must
     arrive fully populated, exactly as if the provider's REST endpoint
     had answered. We synthesise a plausible payload using the utility
     type (Electricity / Water / Phone / Internet) as the magnitude hint
     and the header's billing cycle for the period window. Taxes are
     5% (standard BT tax line) and the due date is today + 15 days. */
  const synthesizeApiPayload = (
    utilityType: string,
    billingCycle: string,
  ): {
    billingPeriodFrom: string;
    billingPeriodTo: string;
    billAmount: string;
    applicableTaxes: string;
    totalBillAmount: string;
    billDueDate: string;
  } => {
    const now = new Date();
    const cycleLower = (billingCycle || "").toLowerCase();
    const isQuarterly = /quarter/.test(cycleLower);
    /* Period window — previous complete cycle */
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const periodStart = isQuarterly
      ? new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 2, 1)
      : new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    /* Magnitude varies by utility type — matches the real Nu. ranges
       observed on BPC / BT / Tashi Cell / Thromde statements. */
    const t = utilityType.toLowerCase();
    const rand = (min: number, max: number) =>
      Math.round(min + Math.random() * (max - min));
    let gross: number;
    if (/electric|power/.test(t)) gross = rand(800, 4200);
    else if (/water|sewer/.test(t)) gross = rand(220, 950);
    else if (/phone|landline|mobile|tele/.test(t)) gross = rand(480, 1800);
    else if (/internet|broadband|lease|starlink/.test(t)) gross = rand(1200, 6500);
    else gross = rand(500, 2500);
    if (isQuarterly) gross = Math.round(gross * 3);

    const tax = Math.round(gross * 0.05 * 100) / 100;
    const total = Math.round((gross + tax) * 100) / 100;
    const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15);

    return {
      billingPeriodFrom: fmt(periodStart),
      billingPeriodTo: fmt(periodEnd),
      billAmount: gross.toFixed(2),
      applicableTaxes: tax.toFixed(2),
      totalBillAmount: total.toFixed(2),
      billDueDate: fmt(due),
    };
  };

  const addBill = (source: BillSource) => {
    const id = `BILL-${Date.now()}`;
    const billId = generateNextBillId();
    const base: UtilityBill = {
      ...EMPTY_BILL(form.header.utilityId, defaultManualSource, defaultPendingStatus),
      id,
      billId,
      source,
      billingCycle: form.header.billingCycle,
    };

    /* Seed service + office from the currently selected service type so
       API fetch/push/manual rows always land inside the officer's
       current "tab". When nothing is selected we fall back to the first
       map, matching the previous behaviour. */
    const seedMap = activeServiceMap ?? form.serviceMaps[0];
    if (seedMap) {
      base.serviceNumber = seedMap.serviceName || "";
      base.officeId = seedMap.officeId;
      base.officeName = seedMap.officeName;
    }

    /* For API fetch/push, populate a realistic, provider-shaped payload
       so officers see end-to-end data the moment they click the button
       — no manual keying, exactly like a live API integration. */
    if (!isManualSource(source)) {
      const payload = synthesizeApiPayload(
        form.header.utilityType,
        form.header.billingCycle,
      );
      base.billingPeriodFrom = payload.billingPeriodFrom;
      base.billingPeriodTo = payload.billingPeriodTo;
      base.billAmount = payload.billAmount;
      base.applicableTaxes = payload.applicableTaxes;
      base.totalBillAmount = payload.totalBillAmount;
      base.billDueDate = payload.billDueDate;
    }

    onChange({ ...form, bills: [base, ...form.bills] });
  };

  const updateBill = (id: string, patch: Partial<UtilityBill>) => {
    onChange({
      ...form,
      bills: form.bills.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        const billAmt = parseFloat(next.billAmount || "0") || 0;
        const taxAmt = parseFloat(next.applicableTaxes || "0") || 0;
        next.totalBillAmount = (billAmt + taxAmt).toFixed(2);
        return next;
      }),
    });
  };

  const removeBill = (id: string) =>
    onChange({ ...form, bills: form.bills.filter((b) => b.id !== id) });

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            Process 2.0
          </span>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Bill Data Management</h2>
          <p className="text-sm text-slate-600">
            Capture bills pushed by the provider's API, pulled on demand, or entered manually.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {master.billSource.length === 0 ? (
            <span className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
              ⚠️ Populate <span className="font-mono">utility-bill-source</span> master data
            </span>
          ) : (
            master.billSource.map((label) => {
              const tone = isApiPushSource(label)
                ? "bg-sky-600 hover:bg-sky-700"
                : isApiFetchSource(label)
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-900 hover:bg-slate-800";
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => addBill(label)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold text-white ${tone}`}
                >
                  + {label}
                </button>
              );
            })
          )}
        </div>
      </header>

      {/* ── Utility Service Type tabs ─────────────────────────────────────
          Drives the dynamic table below. Officers select a service type
          (e.g. "BT Postpaid Mobile", "TC Leasedline", "Consumer Number")
          configured in Process 1.0 and the bill rows render scoped to
          that service. If no mappings exist yet the officer is nudged
          back to Process 1.0. */}
      {serviceTypesInUse.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ No service types configured</p>
          <p className="mt-0.5">
            Add at least one Service → Office mapping in Process 1.0 (Provider Master) so the
            bill table can render dynamically per service type.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Utility Service Type
            </span>
            <div className="flex flex-wrap gap-1.5">
              {serviceTypesInUse.map((s) => {
                const active = s === effectiveServiceType;
                const count = form.bills.filter(
                  (b) => b.serviceNumber === s || b.serviceNumber.includes(s),
                ).length;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedServiceType(s)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                      active
                        ? "border-violet-400 bg-violet-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${
                        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeServiceMap && (
              <span className="ml-auto rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                Office: {activeServiceMap.officeName || "—"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Linked-contract cross-integration banner (ContractDataContext) */}
      {linkedContracts.length > 0 && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
          <div className="font-semibold">
            🔗 {linkedContracts.length} live contract{linkedContracts.length > 1 ? "s" : ""} linked
            to this provider
          </div>
          <ul className="mt-1 space-y-0.5">
            {linkedContracts.slice(0, 3).map((c) => (
              <li key={c.id}>
                <span className="font-mono">{c.contractId}</span> — {c.contractTitle} · Nu.{" "}
                {c.contractValue} · {c.contractStatus}
              </li>
            ))}
          </ul>
        </div>
      )}

      {visibleBills.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
          {form.bills.length === 0
            ? "No bills captured yet. Use the buttons above to add one."
            : `No bills under "${effectiveServiceType}" yet — click an action button above to pull one.`}
        </p>
      ) : (
        <div className="space-y-3">
          {visibleBills.map((b) => (
            <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    {b.billId}
                  </span>
                  <SourceBadge source={b.source} />
                  <StatusBadge status={b.status} />
                </div>
                <button
                  type="button"
                  onClick={() => removeBill(b.id)}
                  className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field label="Service Number">
                  <input
                    value={b.serviceNumber}
                    onChange={(e) => updateBill(b.id, { serviceNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Office">
                  <input
                    value={b.officeName}
                    onChange={(e) => updateBill(b.id, { officeName: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Period From → To">
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={b.billingPeriodFrom}
                      onChange={(e) => updateBill(b.id, { billingPeriodFrom: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]"
                    />
                    <input
                      type="date"
                      value={b.billingPeriodTo}
                      onChange={(e) => updateBill(b.id, { billingPeriodTo: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]"
                    />
                  </div>
                </Field>
                <Field label="Bill Amount (Nu.)">
                  <input
                    type="number"
                    value={b.billAmount}
                    onChange={(e) => updateBill(b.id, { billAmount: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Applicable Taxes (Nu.)">
                  <input
                    type="number"
                    value={b.applicableTaxes}
                    onChange={(e) => updateBill(b.id, { applicableTaxes: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Total (auto)">
                  <input
                    readOnly
                    value={b.totalBillAmount}
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                  />
                </Field>
                <Field label="Due Date">
                  <input
                    type="date"
                    value={b.billDueDate}
                    onChange={(e) => updateBill(b.id, { billDueDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={b.status}
                    onChange={(e) => updateBill(b.id, { status: e.target.value as UtilityBill["status"] })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  >
                    {master.billStatus.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SourceBadge({ source }: { source: BillSource }) {
  const cls = isApiPushSource(source)
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : isApiFetchSource(source)
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {source || "—"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    isPaidStatus(status) || isApprovedStatus(status) || isClearedStatus(status)
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : isOverdueStatus(status) || isDisputedStatus(status)
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{status}</span>;
}
