/* ═══════════════════════════════════════════════════════════════════════════
   Process 1.0 — Utility Service Provider Master Management
   SRS PRN 5.1 R75 — Admin onboards a service provider, defines the billing
   connection, monthly budget allocation, variance threshold, and maps each
   service to one or more offices.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { UtilityFormState, ServiceOfficeMap } from "../types";
import { useContractorData } from "../../../../shared/context/ContractorDataContext";
import { useUtilityMasterData } from "../hooks/useUtilityMasterData";
import { SelectedProviderSummary } from "./SelectedProviderSummary";

interface Props {
  form: UtilityFormState;
  onChange: (next: UtilityFormState) => void;
}

export function UtilityProviderSection({ form, onChange }: Props) {
  const master = useUtilityMasterData();
  const { vendors, contractors } = useContractorData();

  /* Service-provider pool = authoritative Master Data list
     (`utility-service-provider`) **plus** any Vendors flagged as
     "Utility" and Contractors in the "utility" category. Fully dynamic
     — driven by both the shared Contractor / Vendor stores and the
     admin-managed master data registry. Master-data-only providers
     use a deterministic UPROV-<SLUG> id so the wizard, bill flow and
     cross-process links can resolve them even without a vendor
     record. */
  const providers = useMemo(() => {
    const out: { id: string; name: string; source: "master" | "vendor" | "contractor" }[] = [];
    const seenNames = new Set<string>();

    /* 1) Master data providers (SRS PRN 5.1 canonical list) */
    for (const name of master.serviceProviders) {
      const norm = name.trim().toLowerCase();
      if (!norm || seenNames.has(norm)) continue;
      seenNames.add(norm);
      out.push({
        id: `UPROV-${norm.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").toUpperCase()}`,
        name,
        source: "master",
      });
    }

    /* 2) Vendor-backed utility providers (merge-by-name so a matching
          vendor upgrades the id from UPROV- → VND- without duplicating
          the row). */
    for (const v of vendors) {
      if ((v.vendorCategory ?? "").toLowerCase() !== "utility") continue;
      const name = v.vendorName || v.id;
      const norm = name.trim().toLowerCase();
      const existing = out.find((p) => p.name.trim().toLowerCase() === norm);
      if (existing) {
        existing.id = v.id;
        existing.source = "vendor";
      } else {
        seenNames.add(norm);
        out.push({ id: v.id, name, source: "vendor" });
      }
    }

    /* 3) Contractor-backed utility providers */
    for (const c of contractors) {
      if (!(c.category ?? "").toLowerCase().includes("utility")) continue;
      const name = c.displayName || c.id;
      const norm = name.trim().toLowerCase();
      if (seenNames.has(norm)) continue;
      seenNames.add(norm);
      out.push({ id: c.id, name, source: "contractor" });
    }

    return out;
  }, [master.serviceProviders, vendors, contractors]);

  /* Service-type catalogue for the currently selected provider — pulled
     live from `utility-service-type-<slug>` master data, so renaming
     or extending a provider's catalogue in /master-data flows through
     to this dropdown on the next render. */
  const serviceTypesForProvider = useMemo(
    () => master.getServiceTypesForProvider(form.header.serviceProviderName),
    [master, form.header.serviceProviderName],
  );

  /* SRS LoV 15.1 — auto-narrow utility types based on selected provider.
     When a provider is selected and has a utility-provider-types mapping,
     only show the relevant utility types (e.g. BPC → Electricity only).
     Falls back to the full list when no mapping exists. */
  const filteredUtilityTypes = useMemo(() => {
    if (!form.header.serviceProviderName) return master.utilityType;
    const providerTypes = master.getUtilityTypesForProvider(form.header.serviceProviderName);
    return providerTypes.length > 0 ? providerTypes : master.utilityType;
  }, [master, form.header.serviceProviderName]);

  const setHeader = <K extends keyof UtilityFormState["header"]>(
    key: K,
    value: UtilityFormState["header"][K],
  ) => onChange({ ...form, header: { ...form.header, [key]: value } });

  const addServiceMap = () => {
    const next: ServiceOfficeMap = {
      id: `SOM-${Date.now()}`,
      serviceName: "",
      officeId: "",
      officeName: "",
    };
    onChange({ ...form, serviceMaps: [...form.serviceMaps, next] });
  };

  const updateServiceMap = (id: string, patch: Partial<ServiceOfficeMap>) =>
    onChange({
      ...form,
      serviceMaps: form.serviceMaps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });

  const removeServiceMap = (id: string) =>
    onChange({ ...form, serviceMaps: form.serviceMaps.filter((s) => s.id !== id) });

  const selectedProvider = providers.find((p) => p.id === form.header.serviceProviderId);

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Process 1.0
          </span>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Service Provider Master Management
          </h2>
          <p className="text-sm text-slate-600">
            Onboard a utility provider, capture the connection reference, set budget &
            threshold, then map each service to the offices it serves.
          </p>
        </div>
      </header>

      {/* Fully dynamic selected-provider summary — surfaces every field
          on the linked Contractor, Vendor, and Contract registry
          records plus the full DD 19.1 → 19.10 header. */}
      {form.header.serviceProviderId && <SelectedProviderSummary form={form} />}

      {/* Empty-state banners when master data is missing. */}
      {master.agencies.length === 0 && (
        <EmptyMasterBanner
          title="Agency master data missing"
          id="affected-agencies"
          hint="Populate the agencies LoV under /master-data to enable agency selection."
        />
      )}
      {master.utilityType.length === 0 && (
        <EmptyMasterBanner
          title="Utility type master data missing"
          id="utility-type"
          hint="DD 19.3 — add Electricity / Water / Phone / Internet entries under /master-data."
        />
      )}
      {master.billingCycle.length === 0 && (
        <EmptyMasterBanner
          title="Billing cycle master data missing"
          id="utility-billing-cycle"
          hint="DD 19.7 — add Monthly / Quarterly entries under /master-data."
        />
      )}
      {master.utilityStatus.length === 0 && (
        <EmptyMasterBanner
          title="Utility status master data missing"
          id="utility-status"
          hint="DD 19.10 — add Active / Inactive / Suspended entries under /master-data."
        />
      )}

      {/* Header fields — DD 19.1-19.10 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Utility ID (DD 19.1)">
          <input
            value={form.header.utilityId}
            readOnly
            placeholder="Auto-generated"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </Field>

        <Field label="Agency (DD 19.2)">
          <select
            value={form.header.agencyName}
            onChange={(e) => {
              const name = e.target.value;
              onChange({
                ...form,
                header: {
                  ...form.header,
                  agencyId: name ? name.toUpperCase().replace(/[^A-Z0-9]+/g, "-") : "",
                  agencyName: name,
                },
              });
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select agency —</option>
            {master.agencies.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Utility Type (DD 19.3)">
          <select
            value={form.header.utilityType}
            onChange={(e) => setHeader("utilityType", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {filteredUtilityTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          {form.header.serviceProviderName &&
            filteredUtilityTypes.length < master.utilityType.length && (
              <p className="mt-1 text-[10px] text-sky-600">
                Filtered to types served by {form.header.serviceProviderName}
              </p>
            )}
        </Field>

        <Field label="Service Provider (DD 19.4)">
          <select
            value={form.header.serviceProviderId}
            onChange={(e) => {
              const id = e.target.value;
              const match = providers.find((p) => p.id === id);
              onChange({
                ...form,
                header: {
                  ...form.header,
                  serviceProviderId: id,
                  serviceProviderName: match?.name ?? "",
                },
              });
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">
              {providers.length === 0
                ? "No utility vendors — onboard via Vendor Management"
                : "— Select provider —"}
            </option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {selectedProvider && (
            <p className="mt-1 text-[11px] text-slate-500">ID: {selectedProvider.id}</p>
          )}
        </Field>

        <Field label="Connection Reference (DD 19.5)">
          <input
            value={form.header.connectionReference}
            onChange={(e) => setHeader("connectionReference", e.target.value)}
            placeholder="e.g. MTR-7742-CC"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Monthly Budget Allocation (DD 19.6) — Nu.">
          <input
            type="number"
            value={form.header.monthlyBudgetAllocation}
            onChange={(e) => setHeader("monthlyBudgetAllocation", e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Billing Cycle (DD 19.7)">
          <select
            value={form.header.billingCycle}
            onChange={(e) => setHeader("billingCycle", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select cycle —</option>
            {master.billingCycle.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Auto-Payment Enabled (DD 19.8)">
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.header.autoPaymentEnabled}
              onChange={(e) => setHeader("autoPaymentEnabled", e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span className="text-slate-700">
              {form.header.autoPaymentEnabled ? "Yes — auto-release on validation" : "No — manual approval"}
            </span>
          </label>
        </Field>

        <Field label="Variance Threshold % (DD 19.9)">
          <input
            type="number"
            value={form.header.varianceThresholdPercent}
            onChange={(e) => setHeader("varianceThresholdPercent", e.target.value)}
            placeholder="10"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Utility Status (DD 19.10)">
          <select
            value={form.header.utilityStatus}
            onChange={(e) => setHeader("utilityStatus", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select status —</option>
            {master.utilityStatus.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* ── SRS LoV 15.1 – 15.2: Payment Configuration ─────────────────── */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5">
        <div className="mb-4">
          <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            LoV 15.1 – 15.2
          </span>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">
            Payment Configuration
          </h3>
          <p className="text-xs text-slate-600">
            SRS-mandated payment method, preferred payment mode, and configurable
            billing cut-off date for this utility account.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Payment Method (LoV 15.1)">
            <select
              value={form.header.paymentMethod}
              onChange={(e) => setHeader("paymentMethod", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select —</option>
              {master.paymentMethod.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>

          <Field label="Preferred Payment Mode (LoV 15.2)">
            <select
              value={form.header.preferredPaymentMode}
              onChange={(e) => setHeader("preferredPaymentMode", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Auto-populated via API —</option>
              {master.preferredPaymentMode.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">
              Auto-populated in IFMIS via external API standards
            </p>
          </Field>

          <Field label="Cut-off Date (LoV 15.2) — Day of Month">
            <input
              type="number"
              min="1"
              max="31"
              value={form.header.cutoffDate}
              onChange={(e) => setHeader("cutoffDate", e.target.value)}
              placeholder="15"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Configurable billing cut-off day — bills received after this day roll to next cycle
            </p>
          </Field>
        </div>
      </div>

      {/* ── UCoA Integration: Budget Code, Expenditure Head, Funding Source ── */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
        <div className="mb-4">
          <span className="inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
            UCoA Integration
          </span>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">
            Budget Classification
          </h3>
          <p className="text-xs text-slate-600">
            UCoA CWT Feb 2026 — Map this utility account to the correct budget head,
            expenditure classification, and funding source for RGOB financial reporting.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Budget Code (UCoA Level-2)">
            <select
              value={form.header.budgetCode}
              onChange={(e) => setHeader("budgetCode", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select budget head —</option>
              {master.budgetCodes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {master.budgetCodes.length === 0 && (
              <p className="mt-1 text-[10px] text-amber-600">
                No budget codes in master data — populate utility-budget-code at /master-data
              </p>
            )}
          </Field>

          <Field label="Expenditure Head (Object Code)">
            <select
              value={form.header.expenditureHead}
              onChange={(e) => setHeader("expenditureHead", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select expenditure head —</option>
              {master.expenditureHeads.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Funding Source">
            <select
              value={form.header.fundingSource}
              onChange={(e) => setHeader("fundingSource", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select funding source —</option>
              {master.fundingSources.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Service → Office mapping */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Service → Office Mapping</h3>
            <p className="text-xs text-slate-600">
              Every service the provider offers (e.g. "TC Postpaid Mobile") must be mapped to
              the office(s) that consume it.
            </p>
          </div>
          <button
            type="button"
            onClick={addServiceMap}
            className="rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600"
          >
            + Add Mapping
          </button>
        </div>

        {form.serviceMaps.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-xs text-slate-500">
            No service-office mappings yet. Click <b>Add Mapping</b> to create one.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {form.serviceMaps.map((s) => (
              <div
                key={s.id}
                className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                {serviceTypesForProvider.length > 0 ? (
                  <select
                    value={s.serviceName}
                    onChange={(e) => updateServiceMap(s.id, { serviceName: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
                  >
                    <option value="">— Select service —</option>
                    {serviceTypesForProvider.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={s.serviceName}
                    onChange={(e) => updateServiceMap(s.id, { serviceName: e.target.value })}
                    placeholder={
                      form.header.serviceProviderName
                        ? `No service catalogue for ${form.header.serviceProviderName} in master data`
                        : "Service name"
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
                  />
                )}
                <select
                  value={s.officeName}
                  onChange={(e) => {
                    const name = e.target.value;
                    updateServiceMap(s.id, {
                      officeName: name,
                      officeId: name ? name.toUpperCase().replace(/[^A-Z0-9]+/g, "-") : "",
                    });
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs md:col-span-2"
                >
                  <option value="">— Select consuming office —</option>
                  {master.agencies.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeServiceMap(s.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function EmptyMasterBanner({ title, id, hint }: { title: string; id: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <p className="font-bold">⚠️ {title}</p>
      <p className="mt-0.5">
        {hint} <span className="font-mono text-[11px]">({id})</span>
      </p>
    </div>
  );
}
