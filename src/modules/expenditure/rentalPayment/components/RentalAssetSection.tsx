/* ═══════════════════════════════════════════════════════════════════════════
   Process 1.0 — Asset Master Management
   SRS R78 + DD 19.11 → 19.13
   User onboards every asset taken on rent/lease, picks Category + Type +
   Sub-class, and captures the SRS-mandated reference numbers.
   Fully dynamic: LoVs come from master data, lessors come from the shared
   Contractor/Vendor stores.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { RentalAsset, RentalFormState, AssetCategory, AssetType, AssetSubClass } from "../types";
import { useRentalMasterData } from "../hooks/useRentalMasterData";
import { useContractorData } from "../../../../shared/context/ContractorDataContext";

interface Props {
  form: RentalFormState;
  onChange: (next: RentalFormState) => void;
}

export function RentalAssetSection({ form, onChange }: Props) {
  const master = useRentalMasterData();
  const { vendors, contractors } = useContractorData();

  /* Lessor pool — any vendor/contractor can act as a lessor. Fully dynamic. */
  const lessors = useMemo(() => {
    const v = vendors.map((x) => ({ id: x.id, name: x.vendorName || x.id }));
    const c = contractors.map((x) => ({ id: x.id, name: x.displayName || x.id }));
    const merged = [...v, ...c];
    const seen = new Set<string>();
    return merged.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [vendors, contractors]);

  const a = form.asset;
  const setAsset = <K extends keyof RentalAsset>(key: K, value: RentalAsset[K]) =>
    onChange({ ...form, asset: { ...a, [key]: value } });

  /* Category → eligible types (LoV 10.1 mapping) */
  const typesForCategory: AssetType[] =
    a.assetCategory === "Tangible Assets"
      ? master.assetType.filter((t) => t !== "Intellectual Property")
      : a.assetCategory === "Intangible Assets"
        ? (["Intellectual Property"] as AssetType[])
        : master.assetType;

  const subClasses: AssetSubClass[] =
    a.assetType && master.assetSubClassByType[a.assetType as AssetType]
      ? master.assetSubClassByType[a.assetType as AssetType]
      : [];

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          Process 1.0
        </span>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Asset Master Management</h2>
        <p className="text-sm text-slate-600">
          Register every asset the government has taken on rent/lease. Classification and
          reference numbers follow DD 19.11 – 19.13 strictly.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Asset ID (system generated)">
          <input
            readOnly
            value={a.assetId}
            placeholder="Auto"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </Field>

        <Field label="Asset Title / Description">
          <input
            value={a.assetTitle}
            onChange={(e) => setAsset("assetTitle", e.target.value)}
            placeholder="e.g. Thimphu HQ office lease"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Asset Category (DD 19.11)">
          <select
            value={a.assetCategory}
            onChange={(e) => {
              const cat = e.target.value as AssetCategory;
              onChange({
                ...form,
                asset: {
                  ...a,
                  assetCategory: cat,
                  assetType: "",
                  assetSubClass: "",
                },
              });
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {master.assetCategory.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Asset Type (LoV 10.1)">
          <select
            value={a.assetType}
            onChange={(e) => {
              const t = e.target.value as AssetType;
              onChange({ ...form, asset: { ...a, assetType: t, assetSubClass: "" } });
            }}
            disabled={!a.assetCategory}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">— Select —</option>
            {typesForCategory.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Sub-Class (DD 19.11 / 19.12 / 19.13)">
          <select
            value={a.assetSubClass}
            onChange={(e) => setAsset("assetSubClass", e.target.value as AssetSubClass)}
            disabled={!a.assetType}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">— Select —</option>
            {subClasses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Asset Status">
          <select
            value={a.status}
            onChange={(e) => setAsset("status", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {master.assetStatus.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Sub-class specific reference numbers — only the applicable field shown */}
      {a.assetSubClass && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Reference Number — {a.assetSubClass}
          </h3>
          <p className="text-xs text-slate-600">Per DD 19.11 / 19.12 / 19.13.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {a.assetSubClass === "Land" && (
              <Field label="Thram No.">
                <input
                  value={a.thramNo}
                  onChange={(e) => setAsset("thramNo", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}
            {a.assetSubClass === "House" && (
              <Field label="House No.">
                <input
                  value={a.houseNo}
                  onChange={(e) => setAsset("houseNo", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}
            {a.assetSubClass === "House/Buildings/Structures" && (
              <Field label="Unit / Building / Flat No.">
                <input
                  value={a.unitBuildingFlatNo}
                  onChange={(e) => setAsset("unitBuildingFlatNo", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}
            {a.assetSubClass === "Vehicles" && (
              <Field label="Vehicle Registration No. (BG-1-A1080)">
                <input
                  value={a.vehicleRegistrationNo}
                  onChange={(e) => setAsset("vehicleRegistrationNo", e.target.value)}
                  placeholder="BG-1-A1080"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}
            {a.assetSubClass === "Aero Services" && (
              <Field label="Aero Services No.">
                <input
                  value={a.aeroServicesNo}
                  onChange={(e) => setAsset("aeroServicesNo", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}
            {a.assetSubClass === "Machineries" && (
              <>
                <Field label="Machineries No.">
                  <input
                    value={a.machineriesNo}
                    onChange={(e) => setAsset("machineriesNo", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Status of Machineries">
                  <input
                    value={a.machineriesStatus}
                    onChange={(e) => setAsset("machineriesStatus", e.target.value)}
                    placeholder="e.g. Operational / Under repair"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </Field>
              </>
            )}
            {[
              "Copy Rights",
              "Patents",
              "Trademarks",
              "Industrial Designs",
              "Trade Secrets",
              "Geographical Indications",
            ].includes(a.assetSubClass) && (
              <Field label="Certified / Registered Number (DD 19.13)">
                <input
                  value={a.certifiedOrRegisteredNumber}
                  onChange={(e) => setAsset("certifiedOrRegisteredNumber", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}
          </div>
        </div>
      )}

      {/* Lessor + Agency + Budget + Lease terms */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Lessor">
          <select
            value={a.lessorId}
            onChange={(e) => {
              const id = e.target.value;
              const match = lessors.find((l) => l.id === id);
              onChange({
                ...form,
                asset: { ...a, lessorId: id, lessorName: match?.name ?? "" },
              });
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">
              {lessors.length === 0 ? "No lessors — onboard via Contractor/Vendor" : "— Select lessor —"}
            </option>
            {lessors.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Agency (lessee)">
          {master.agencies.length > 0 ? (
            <select
              value={a.agencyName}
              onChange={(e) => {
                const name = e.target.value;
                onChange({
                  ...form,
                  asset: {
                    ...a,
                    agencyId: name ? name.toUpperCase().replace(/[^A-Z0-9]+/g, "-") : "",
                    agencyName: name,
                  },
                });
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select agency —</option>
              {master.agencies.map((ag) => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          ) : (
            <input
              value={a.agencyName}
              onChange={(e) =>
                onChange({
                  ...form,
                  asset: {
                    ...a,
                    agencyId: e.target.value.toUpperCase().replace(/\s+/g, "-"),
                    agencyName: e.target.value,
                  },
                })
              }
              placeholder="e.g. Ministry of Finance"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          )}
        </Field>

        <Field label="Rent Amount (Nu.)">
          <input
            type="number"
            value={a.rentAmount}
            onChange={(e) => setAsset("rentAmount", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Payment Frequency (LoV 10.1)">
          <select
            value={a.paymentFrequency}
            onChange={(e) => setAsset("paymentFrequency", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {master.paymentFrequency.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="Lease Start Date">
          <input
            type="date"
            value={a.leaseStartDate}
            onChange={(e) => setAsset("leaseStartDate", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Lease End Date">
          <input
            type="date"
            value={a.leaseEndDate}
            onChange={(e) => setAsset("leaseEndDate", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Scheduled Payment Date">
          <input
            type="date"
            value={a.scheduledPaymentDate}
            onChange={(e) => setAsset("scheduledPaymentDate", e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
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
            UCoA CWT Feb 2026 — Map this rental asset to the correct budget head,
            expenditure classification, and funding source for RGOB financial reporting.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Budget Code (UCoA Level-2)">
            <select
              value={a.budgetCode}
              onChange={(e) => setAsset("budgetCode", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select budget head —</option>
              {master.budgetCodes.map((c) => (
                <option key={c} value={c}>{c}</option>
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
              value={a.expenditureHead}
              onChange={(e) => setAsset("expenditureHead", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select expenditure head —</option>
              {master.expenditureHeads.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </Field>

          <Field label="Funding Source">
            <select
              value={a.fundingSource}
              onChange={(e) => setAsset("fundingSource", e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select funding source —</option>
              {master.fundingSources.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* PTS integration — only meaningful for immovable assets (R80) */}
      {a.assetType === "Immovable Properties" && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
          <h3 className="text-sm font-semibold text-sky-900">
            Property Tax System (PTS) Verification — R80
          </h3>
          <p className="text-xs text-sky-800">
            System fetches this immovable property from PTS to verify ownership and payment
            eligibility.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label="PTS Reference">
              <input
                value={a.ptsReference}
                onChange={(e) => setAsset("ptsReference", e.target.value)}
                placeholder="e.g. PTS-THM-00421"
                className="w-72 rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <label className="flex items-center gap-2 text-xs font-semibold text-sky-900">
              <input
                type="checkbox"
                checked={a.ptsVerified}
                onChange={(e) => setAsset("ptsVerified", e.target.checked)}
                className="h-4 w-4 accent-sky-600"
              />
              Verified via PTS API
            </label>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
