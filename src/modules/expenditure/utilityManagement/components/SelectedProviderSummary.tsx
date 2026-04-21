/* ═══════════════════════════════════════════════════════════════════════════
   SelectedProviderSummary
   ───────────────────────
   Dense dynamic card that surfaces EVERY attribute held for the
   currently-selected utility service provider:

     1. The full Utility Header (DD 19.1 – 19.10)  — from the form state
     2. Every field of the resolved Contractor Record                — from
        ContractorDataContext
     3. Every field of the resolved Vendor Record                    — from
        ContractorDataContext
     4. Every Contract that is live against the provider             — from
        ContractDataContext
     5. The full Service → Office mapping table                      — from
        the form state

   There is NO hardcoded copy / assumption data — every value flows from
   live stores.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { UtilityFormState } from "../types";
import { useContractorData } from "../../../../shared/context/ContractorDataContext";
import { useContractData } from "../../../../shared/context/ContractDataContext";

interface Props {
  form: UtilityFormState;
}

interface Row {
  label: string;
  value: string;
  tag?: string;
  accent?: "mono" | "money" | "status" | "default";
}

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function SelectedProviderSummary({ form }: Props) {
  const { contractors, vendors } = useContractorData();
  const { contracts } = useContractData();

  const header = form.header;
  const providerId = header.serviceProviderId;
  const providerName = header.serviceProviderName;

  const contractor = useMemo(
    () =>
      contractors.find((c) => c.id === providerId) ||
      contractors.find((c) => c.displayName === providerName) ||
      null,
    [contractors, providerId, providerName],
  );

  const vendor = useMemo(
    () =>
      vendors.find((v) => v.id === providerId) ||
      vendors.find(
        (v) => (v.vendorName || "").toLowerCase() === (providerName || "").toLowerCase(),
      ) ||
      null,
    [vendors, providerId, providerName],
  );

  const linkedContracts = useMemo(
    () =>
      contracts.filter(
        (c) =>
          c.contractorId === providerId ||
          c.contractorName.toLowerCase() === (providerName || "").toLowerCase(),
      ),
    [contracts, providerId, providerName],
  );

  if (!providerId && !providerName) return null;

  /* ── Section 1 — Utility Header (DD 19.1 – 19.10) ─────────────────── */
  const monthlyAlloc = parseFloat(header.monthlyBudgetAllocation || "0") || 0;
  const headerRows: Row[] = [
    { label: "Utility ID", value: header.utilityId || "—", tag: "DD 19.1", accent: "mono" },
    { label: "Agency", value: header.agencyName || "—", tag: "DD 19.2" },
    { label: "Agency ID", value: header.agencyId || "—", accent: "mono" },
    { label: "Utility Type", value: header.utilityType || "—", tag: "DD 19.3" },
    { label: "Service Provider", value: header.serviceProviderName || "—", tag: "DD 19.4" },
    { label: "Provider ID", value: header.serviceProviderId || "—", accent: "mono" },
    { label: "Connection Ref.", value: header.connectionReference || "—", tag: "DD 19.5", accent: "mono" },
    { label: "Monthly Allocation", value: `Nu. ${fmt(monthlyAlloc)}`, tag: "DD 19.6", accent: "money" },
    { label: "Billing Cycle", value: header.billingCycle || "—", tag: "DD 19.7" },
    { label: "Auto-Payment", value: header.autoPaymentEnabled ? "Enabled" : "Disabled", tag: "DD 19.8" },
    { label: "Variance Threshold", value: header.varianceThresholdPercent ? `${header.varianceThresholdPercent}%` : "—", tag: "DD 19.9" },
    { label: "Utility Status", value: header.utilityStatus || "—", tag: "DD 19.10", accent: "status" },
  ];

  /* ── Section 2 — Contractor Registry ──────────────────────────────── */
  const contractorRows: Row[] = contractor
    ? [
        { label: "Contractor ID", value: contractor.id, accent: "mono" },
        { label: "Display Name", value: contractor.displayName || "—" },
        { label: "Kind", value: contractor.kind || "—" },
        { label: "Contractor Type", value: contractor.contractorType || "—" },
        { label: "Contractual Type", value: contractor.contractualType || "—" },
        { label: "Category", value: contractor.category || "—" },
        { label: "Nationality", value: contractor.nationality || "—" },
        { label: "Registration #", value: contractor.registrationNumber || "—", accent: "mono" },
        { label: "Tax #", value: contractor.taxNumber || "—", accent: "mono" },
        { label: "Email", value: contractor.email || "—" },
        { label: "Phone", value: contractor.phone || "—" },
        { label: "Address", value: contractor.address || "—" },
        { label: "Bank", value: contractor.bankName || "—" },
        { label: "Account #", value: contractor.bankAccountNumber || "—", accent: "mono" },
        { label: "Account Name", value: contractor.bankAccountName || "—" },
        { label: "Status", value: contractor.status || "—", accent: "status" },
        { label: "Verification", value: contractor.verification || "—", accent: "status" },
        { label: "Verified By", value: contractor.verifiedBy || "—" },
        { label: "Verified At", value: contractor.verifiedAt || "—" },
        { label: "Created At", value: contractor.createdAt || "—" },
      ]
    : [];

  /* ── Section 3 — Vendor Registry (DD 27.x) ────────────────────────── */
  const vendorRows: Row[] = vendor
    ? [
        { label: "Vendor ID", value: vendor.id, tag: "DD 27.1", accent: "mono" },
        { label: "Vendor Name", value: vendor.vendorName || "—", tag: "DD 27.3" },
        { label: "CID", value: vendor.cid || "—", tag: "DD 27.2", accent: "mono" },
        { label: "TPN", value: vendor.tpn || "—", tag: "DD 27.8", accent: "mono" },
        { label: "Vendor Category", value: vendor.vendorCategory || "—" },
        { label: "Service Category", value: vendor.serviceCategory || "—" },
        { label: "Contract Categories", value: (vendor.contractCategories || []).join(", ") || "—" },
        { label: "Integration Source", value: vendor.integrationSource || "—" },
        { label: "Payment Frequency", value: vendor.paymentFrequency || "—" },
        { label: "Funding Source", value: vendor.fundingSource || "—" },
        { label: "Bank", value: vendor.bankName || "—", tag: "DD 27.4" },
        { label: "Account #", value: vendor.bankAccountNumber || "—", accent: "mono" },
        { label: "Account Name", value: vendor.bankAccountName || "—" },
        { label: "Address", value: vendor.address || "—", tag: "DD 27.5" },
        { label: "Phone", value: vendor.phone || "—", tag: "DD 27.6" },
        { label: "Email", value: vendor.email || "—", tag: "DD 27.7" },
        { label: "Contact Status", value: vendor.contactStatus || "—", accent: "status" },
        { label: "Vendor Status", value: vendor.status || "—", accent: "status" },
        { label: "Current Approver", value: vendor.currentApprover || "—" },
        { label: "Submitted At", value: vendor.submittedAt || "—" },
        { label: "Approved At", value: vendor.approvedAt || "—" },
      ]
    : [];

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-emerald-900">
          ✅ Selected Provider — {headerRows.length + contractorRows.length + vendorRows.length} fields (fully dynamic)
        </p>
        {contractor && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm">
            Linked to Contractor Registry
          </span>
        )}
        {vendor && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-sky-700 shadow-sm">
            Linked to Vendor Registry (DD 27)
          </span>
        )}
      </div>

      <SummaryGrid title="Utility Header — DD 19.1 → 19.10" rows={headerRows} tone="violet" />

      {contractorRows.length > 0 && (
        <SummaryGrid
          title="Contractor Registry — live record"
          rows={contractorRows}
          tone="emerald"
        />
      )}

      {vendorRows.length > 0 && (
        <SummaryGrid
          title="Vendor Registry — DD 27.1 → 27.8"
          rows={vendorRows}
          tone="sky"
        />
      )}

      {linkedContracts.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
            🔗 Linked live contracts ({linkedContracts.length})
          </p>
          <div className="mt-2 space-y-1 text-[11px]">
            {linkedContracts.map((c) => {
              const cv = parseFloat(c.contractValue || "0") || 0;
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"
                >
                  <span className="font-mono text-slate-700">{c.contractId}</span>
                  <span className="flex-1 truncate text-slate-700">{c.contractTitle}</span>
                  <span className="text-slate-600">Nu. {fmt(cv)}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {c.contractStatus || c.workflowStatus || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {form.serviceMaps.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Service → Office mapping ({form.serviceMaps.length})
          </p>
          <div className="mt-2 space-y-1 text-[11px]">
            {form.serviceMaps.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5"
              >
                <span className="font-bold text-slate-700">{s.serviceName || "(no name)"}</span>
                <span className="text-slate-400">→</span>
                <span className="text-slate-700">{s.officeName || "(no office)"}</span>
                {s.officeId && (
                  <span className="font-mono text-[10px] text-slate-400">{s.officeId}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small grid helper ──────────────────────────────────────────────── */
function SummaryGrid({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: Row[];
  tone: "violet" | "emerald" | "sky";
}) {
  const toneMap = {
    violet: "border-violet-100 text-violet-700 bg-violet-50",
    emerald: "border-emerald-100 text-emerald-700 bg-emerald-50",
    sky: "border-sky-100 text-sky-700 bg-sky-50",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <p className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneMap}`}>
        {title}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <p className="text-[10px] uppercase text-slate-400">
              {r.label}
              {r.tag && (
                <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">
                  {r.tag}
                </span>
              )}
            </p>
            <p
              className={`break-words text-xs font-bold ${
                r.accent === "money"
                  ? "text-slate-900"
                  : r.accent === "mono"
                    ? "font-mono text-[11px] text-slate-600"
                    : r.accent === "status"
                      ? "uppercase text-emerald-700"
                      : "text-slate-700"
              }`}
            >
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
