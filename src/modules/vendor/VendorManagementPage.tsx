import { useCallback, useMemo, useState } from "react";
import { useContractorData } from "../../shared/context/ContractorDataContext";
import { useContractData } from "../../shared/context/ContractDataContext";
import { useMasterData } from "../../shared/context/MasterDataContext";
/* SRS cross-process live link: Utility Management (PRN 5.1) feeds utility
   providers into Vendor Management (Process 6.0 Non-Contractual / Utility
   category). Any utility account whose serviceProviderId is not yet a
   vendor appears here as "ready to register", and editing a utility
   provider name flows through dynamically on the next render. */
import { useUtilityData } from "../expenditure/utilityManagement/context/UtilityDataContext";
import type { StoredUtility } from "../expenditure/utilityManagement/types";
import type {
  ContractorRecord,
  VendorRecord,
  VendorCategory,
  VendorIntegrationSource,
  VendorAuditEntry,
  VendorVehicleDetail,
  VendorStatus,
} from "../../shared/types";
import type { StoredContract } from "../../shared/context/ContractDataContext";
import {
  type PageView,
  type VendorFormState,
  type EnrichedVendor,
  VENDOR_CATEGORIES,
  INTEGRATION_SOURCES,
  APPROVAL_CHAIN,
  initialVehicle,
  initialForm,
  deriveContractCategories,
  statusColor,
  makeAudit,
  sortByTpn,
  ddTag,
  lovTag,
} from "./vendorPage";


export function VendorManagementPage() {
  const { contractors, vendors, addVendor, updateVendor } = useContractorData();
  const { contracts } = useContractData();
  const { masterDataMap } = useMasterData();
  const { records: utilityRecords } = useUtilityData();
  const getOptions = useCallback((id: string) => masterDataMap.get(id) ?? [], [masterDataMap]);
  const currentUser = "DSD (Finance Officer)"; // Wired to session user in production

  const [view, setView] = useState<PageView>("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<VendorFormState>(initialForm);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [detailVendor, setDetailVendor] = useState<EnrichedVendor | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  /* ── Approved contracts → auto-detect vendor-ready contractors ── */
  const approvedContracts = useMemo(
    () => contracts.filter((c) => c.workflowStatus === "approved"),
    [contracts],
  );

  const existingVendorContractorIds = useMemo(
    () => new Set(vendors.map((v) => v.contractorId)),
    [vendors],
  );

  /* Utility provider ids already registered as vendors (either via
     contractorId or captured in the audit trail). */
  const utilityVendorProviderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const v of vendors) {
      if (v.vendorCategory === "Utility" && v.contractorId) ids.add(v.contractorId);
    }
    return ids;
  }, [vendors]);

  /* Utility accounts (PRN 5.1) whose service providers are NOT yet
     vendors — the SRS-mandated Utility → Vendor dynamic link. This
     recomputes automatically whenever a utility record is added,
     edited or a vendor is approved, so no manual refresh is needed. */
  const utilityReadyProviders = useMemo(() => {
    const seen = new Set<string>();
    const out: { utility: StoredUtility }[] = [];
    for (const u of utilityRecords) {
      const pid = u.header.serviceProviderId;
      if (!pid) continue;
      if (utilityVendorProviderIds.has(pid)) continue;
      if (seen.has(pid)) continue;
      seen.add(pid);
      out.push({ utility: u });
    }
    return out;
  }, [utilityRecords, utilityVendorProviderIds]);

  /* Contractors from approved contracts that aren't vendors yet */
  const contractReadyContractors = useMemo(() => {
    const seen = new Set<string>();
    const result: { contractor: ContractorRecord; contract: StoredContract }[] = [];
    for (const contract of approvedContracts) {
      if (!contract.contractorId || existingVendorContractorIds.has(contract.contractorId) || seen.has(contract.contractorId)) continue;
      const contractor = contractors.find((c) => c.id === contract.contractorId);
      if (contractor) {
        seen.add(contract.contractorId);
        result.push({ contractor, contract });
      }
    }
    return result;
  }, [approvedContracts, contractors, existingVendorContractorIds]);

  /* Verified contractors that aren't vendors yet */
  const availableContractors = useMemo(
    () =>
      contractors.filter((c) => {
        if (existingVendorContractorIds.has(c.id)) return false;
        if (c.status !== "Active and verified") return false;
        if (c.verification !== "Verified") return false;
        if (Array.isArray(c.workflowSteps) && c.workflowSteps.length > 0) {
          return c.workflowSteps.every((step) => step.status === "approved" || step.status === "skipped");
        }
        return true;
      }),
    [contractors, existingVendorContractorIds],
  );

  /* Enriched vendor list for dashboard — sorted alphabetically by TPN per SRS */
  const enrichedVendors: EnrichedVendor[] = useMemo(() => {
    const enriched = vendors.map((v) => {
      const ctr = contractors.find((c) => c.id === v.contractorId);
      const linked = approvedContracts.filter((c) => c.contractorId === v.contractorId);
      return {
        ...v,
        contractorName: ctr?.displayName || v.vendorName,
        contractorPhone: ctr?.phone || "",
        contractorEmail: ctr?.email || "",
        linkedContracts: linked,
        source: v.contractorId ? ("contractor" as const) : ("manual" as const),
      };
    });
    return sortByTpn(enriched);
  }, [vendors, contractors, approvedContracts]);

  /* Filtered vendors for dashboard */
  const filteredVendors = useMemo(() => {
    let list = enrichedVendors;
    if (statusFilter !== "all") {
      list = list.filter((v) => {
        if (statusFilter === "approved") return v.status === "Approved";
        if (statusFilter === "pending") return v.status === "Pending approval";
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        v.id.toLowerCase().includes(q) ||
        v.vendorName.toLowerCase().includes(q) ||
        v.contractorId.toLowerCase().includes(q) ||
        v.serviceCategory.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrichedVendors, statusFilter, search]);

  /* Stats */
  const stats = useMemo(() => ({
    total: vendors.length,
    approved: vendors.filter((v) => v.status === "Approved").length,
    pending: vendors.filter((v) => v.status === "Pending approval").length,
    contractReady: contractReadyContractors.length,
  }), [vendors, contractReadyContractors]);

  /* ── Actions ── */
  function updateField<K extends keyof VendorFormState>(key: K, value: VendorFormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function startFromContractor(contractor: ContractorRecord, linkedContract?: StoredContract) {
    const cats = deriveContractCategories(contractor);
    setForm({
      contractorId: contractor.id,
      vendorType: "Contractual Vendor",
      vendorCategory: "Contract",
      vendorName: contractor.displayName,
      cid: contractor.profile?.cid || "",
      tpn: contractor.taxNumber,
      registrationNumber: contractor.registrationNumber,
      address: contractor.address,
      phone: contractor.phone,
      email: contractor.email,
      contactPerson: contractor.profile.contactRole || "",
      bankName: contractor.bankName,
      bankAccountNumber: contractor.bankAccountNumber,
      bankAccountName: contractor.bankAccountName,
      swiftCode: "",
      expenditureCategory: cats[0] || "",
      contractorType: contractor.contractorType,
      fundingSource: contractor.profile.dataSource?.includes("Donor") ? "Donor Agency" : "RGOB",
      paymentFrequency: "As Needed",
      contractCategories: cats,
      remarks: "",
      integrationSource: "System",
      linkedContractId: linkedContract?.contractId || "",
      linkedContractTitle: linkedContract?.contractTitle || "",
      hasVehicleDetails: false,
      vehicle: initialVehicle,
    });
    setFormStep(1);
    setShowSuccess(false);
    setView("register");
  }

  function startNonContractual(category: VendorCategory = "Utility") {
    setForm({
      ...initialForm,
      vendorType: "Non-Contractual Vendor",
      vendorCategory: category,
      contractorId: "",
      integrationSource: "Manual",
    });
    setFormStep(1);
    setShowSuccess(false);
    setView("register");
  }

  /* SRS cross-process: pre-fill the vendor form from a Utility Management
     account so a registered utility provider can be promoted to a vendor
     in one click. The contractorId mirrors the utility serviceProviderId
     so `utilityReadyProviders` stops listing it the moment the vendor is
     submitted. */
  function startFromUtility(utility: StoredUtility) {
    setForm({
      ...initialForm,
      vendorType: "Non-Contractual Vendor",
      vendorCategory: "Utility",
      contractorId: utility.header.serviceProviderId,
      vendorName: utility.header.serviceProviderName,
      expenditureCategory: utility.header.utilityType,
      contractCategories: [utility.header.utilityType],
      paymentFrequency: utility.header.billingCycle || "Monthly",
      fundingSource: "RGOB",
      integrationSource: "System",
      linkedContractId: utility.header.utilityId,
      linkedContractTitle: `${utility.header.utilityType} — ${utility.header.agencyName}`,
      remarks: `Auto-pulled from Utility account ${utility.header.utilityId} (PRN 5.1).`,
    });
    setFormStep(1);
    setShowSuccess(false);
    setView("register");
  }

  function submitVendor() {
    const newId = `VND-${String(vendors.length + 1).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const audit: VendorAuditEntry = makeAudit(
      "Submitted for approval",
      currentUser,
      "Draft",
      "Pending approval",
      form.remarks || undefined,
    );
    const vendor: VendorRecord = {
      id: newId,
      contractorId: form.contractorId,
      cid: form.cid || undefined,
      vendorName: form.vendorName,
      bankName: form.bankName || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
      bankAccountName: form.bankAccountName || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      tpn: form.tpn || undefined,
      vendorCategory: form.vendorCategory,
      serviceCategory: form.expenditureCategory || form.contractCategories.join(", "),
      contractCategories: form.contractCategories,
      contactStatus: "Active",
      contactCategory: form.contactPerson || "General Contact",
      paymentFrequency: form.paymentFrequency,
      fundingSource: form.fundingSource,
      integrationSource: form.integrationSource,
      status: "Pending approval",
      createdAt: now,
      submittedAt: now,
      currentApprover: APPROVAL_CHAIN[0],
      vehicleDetail: form.hasVehicleDetails ? form.vehicle : undefined,
      auditTrail: [audit],
    };
    addVendor(vendor);
    setShowSuccess(true);
    setFormStep(3);
  }

  function openDetail(v: EnrichedVendor) {
    setDetailVendor(v);
    setView("detail");
  }

  function approveVendor(v: EnrichedVendor) {
    const now = new Date().toISOString();
    const audit = makeAudit("Approved", currentUser, v.status, "Approved");
    const newTrail = [...(v.auditTrail || []), audit];
    updateVendor(v.id, {
      status: "Approved",
      approvedAt: now,
      approvedBy: currentUser,
      currentApprover: undefined,
      auditTrail: newTrail,
    });
    /* Refresh detail view in place */
    setDetailVendor({ ...v, status: "Approved", approvedAt: now, approvedBy: currentUser, auditTrail: newTrail });
  }

  function rejectVendor(v: EnrichedVendor, remarks: string) {
    const audit = makeAudit("Rejected", currentUser, v.status, "Rejected", remarks);
    const newTrail = [...(v.auditTrail || []), audit];
    updateVendor(v.id, {
      status: "Rejected",
      rejectedAt: new Date().toISOString(),
      rejectionRemarks: remarks,
      currentApprover: undefined,
      auditTrail: newTrail,
    });
    setDetailVendor({ ...v, status: "Rejected", rejectionRemarks: remarks, auditTrail: newTrail });
  }

  function requestAmendment(v: EnrichedVendor, remarks: string) {
    const audit = makeAudit("Amendment requested", currentUser, v.status, "Amendment requested", remarks);
    const newTrail = [...(v.auditTrail || []), audit];
    updateVendor(v.id, {
      status: "Amendment requested",
      amendmentRequested: true,
      amendmentRemarks: remarks,
      auditTrail: newTrail,
    });
    setDetailVendor({ ...v, status: "Amendment requested", amendmentRequested: true, amendmentRemarks: remarks, auditTrail: newTrail });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDERS
     ══════════════════════════════════════════════════════════════════════════ */

  /* ── Dashboard ── */
  function renderDashboard() {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Expenditure
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                Vendor Management
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Vendor Management <span className="text-base font-medium text-slate-400">(Postal, Fuels, NGO, etc.)</span></h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                  SRS-compliant vendor module — auto-pulls Contract category vendors from approved contractors (System), and allows manual registration of Utility, Subscription, Contribution, and Other vendors via API-Banks, BITS, RAMIS, and IBLS. All maker-checker actions are recorded in the audit trail.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {VENDOR_CATEGORIES.filter((c) => c !== "Contract").map((cat) => (
                <button
                  key={cat}
                  onClick={() => startNonContractual(cat)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  + {cat}
                </button>
              ))}
              <button onClick={() => { setForm({ ...initialForm, vendorCategory: "Contract" }); setFormStep(1); setShowSuccess(false); setView("register"); }} className="flex items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Register Contract Vendor
              </button>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total Vendors", value: stats.total, color: "text-slate-900", key: "all" },
            { label: "Approved", value: stats.approved, color: "text-emerald-700", key: "approved" },
            { label: "Pending Approval", value: stats.pending, color: "text-amber-700", key: "pending" },
            { label: "Contract-Ready", value: stats.contractReady, color: "text-sky-700", key: "ready" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key === statusFilter ? "all" : s.key)}
              className={`rounded-2xl border p-5 text-left transition-all ${
                statusFilter === s.key
                  ? "border-[#2563eb] bg-[#2563eb] text-white shadow-lg"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${statusFilter === s.key ? "text-slate-300" : "text-slate-500"}`}>{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${statusFilter === s.key ? "text-white" : s.color}`}>{s.value}</p>
            </button>
          ))}
        </div>

        {/* Utility-ready notification — SRS PRN 5.1 → Vendor Process 6.0 link */}
        {utilityReadyProviders.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-900">
                  {utilityReadyProviders.length} utility provider{utilityReadyProviders.length > 1 ? "s" : ""} ready for vendor registration
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Pulled live from Utility Management (PRN 5.1). Registering them here creates the Utility-category vendor per SRS Process 6.0.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {utilityReadyProviders.slice(0, 5).map(({ utility }) => (
                <div key={utility.id} className="flex items-center justify-between rounded-xl bg-white/80 border border-emerald-100 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{utility.header.serviceProviderName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {utility.header.utilityId} — <span className="font-medium text-emerald-700">{utility.header.utilityType}</span> · {utility.header.agencyName}
                    </p>
                  </div>
                  <button
                    onClick={() => startFromUtility(utility)}
                    className="shrink-0 ml-3 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    Register as Vendor
                  </button>
                </div>
              ))}
              {utilityReadyProviders.length > 5 && (
                <p className="text-xs text-emerald-700 text-center pt-1">+ {utilityReadyProviders.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        {/* Contract-ready notification */}
        {contractReadyContractors.length > 0 && (
          <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-sky-900">{contractReadyContractors.length} contractor{contractReadyContractors.length > 1 ? "s" : ""} from approved contracts ready for vendor registration</p>
                <p className="text-xs text-sky-600 mt-0.5">These contractors have approved contracts but aren't registered as vendors yet.</p>
              </div>
            </div>
            <div className="space-y-2">
              {contractReadyContractors.slice(0, 5).map(({ contractor, contract }) => (
                <div key={contractor.id} className="flex items-center justify-between rounded-xl bg-white/80 border border-sky-100 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{contractor.displayName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {contractor.id} — Contract: <span className="font-medium text-sky-700">{contract.contractTitle}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => startFromContractor(contractor, contract)}
                    className="shrink-0 ml-3 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 transition"
                  >
                    Register as Vendor
                  </button>
                </div>
              ))}
              {contractReadyContractors.length > 5 && (
                <p className="text-xs text-sky-600 text-center pt-1">+ {contractReadyContractors.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        {/* Search and filter bar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search vendor ID, name, contractor, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-100 transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">{filteredVendors.length} of {enrichedVendors.length} shown</p>
        </div>

        {/* Vendor table */}
        <div className="rounded-[30px] border border-slate-200/90 bg-white p-7 shadow-[0_22px_55px_rgba(15,23,42,0.05)]">
          {filteredVendors.length === 0 ? (
            <div className="text-center py-16">
              <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-sm font-medium text-slate-500">{search ? "No vendors match your search." : "No vendors registered yet."}</p>
              <p className="text-xs text-slate-400 mt-1">
                {contractors.length > 0
                  ? "Select a contractor below to create a vendor, or create a non-contractual vendor."
                  : "Register contractors first, then create vendors from them."}
              </p>
              {availableContractors.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {availableContractors.slice(0, 3).map((c) => (
                    <button key={c.id} onClick={() => startFromContractor(c)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50 transition">
                      Register {c.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      {["Vendor ID", "Name", "TPN", "SRS Category", "Source", "Contractor", "Contracts", "Status", "Created", ""].map((h) => (
                        <th key={h} className="pb-3 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((v) => (
                      <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                        <td className="py-3.5 pr-3 font-mono text-xs text-indigo-600 font-semibold whitespace-nowrap">{v.id}</td>
                        <td className="py-3.5 pr-3">
                          <button onClick={() => openDetail(v)} className="text-left">
                            <span className="font-medium text-gray-900 hover:text-indigo-700 transition">{v.vendorName}</span>
                          </button>
                        </td>
                        <td className="py-3.5 pr-3 text-xs text-gray-600 font-mono">{v.tpn || "—"}</td>
                        <td className="py-3.5 pr-3">
                          <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">{v.vendorCategory || v.serviceCategory || "—"}</span>
                        </td>
                        <td className="py-3.5 pr-3">
                          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-200">{v.integrationSource || "Manual"}</span>
                        </td>
                        <td className="py-3.5 pr-3 text-xs text-gray-500 font-mono">{v.contractorId || "—"}</td>
                        <td className="py-3.5 pr-3">
                          {v.linkedContracts.length > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200">
                              {v.linkedContracts.length} contract{v.linkedContracts.length > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusColor(v.status)}`}>
                            {v.status === "Pending approval" ? "Pending" : v.status}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5">
                          <button onClick={() => openDetail(v)} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3">
                {filteredVendors.map((v) => (
                  <button key={v.id} onClick={() => openDetail(v)} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{v.vendorName}</p>
                        <p className="text-[10px] font-mono text-indigo-600 mt-0.5">{v.id}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusColor(v.status)}`}>
                        {v.status === "Pending approval" ? "Pending" : v.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{v.serviceCategory}</span>
                      {v.contractorId && <><span>|</span><span>{v.contractorId}</span></>}
                      {v.linkedContracts.length > 0 && <><span>|</span><span className="text-sky-600 font-medium">{v.linkedContracts.length} contract{v.linkedContracts.length > 1 ? "s" : ""}</span></>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Available contractors section */}
        {availableContractors.length > 0 && (
          <div className="rounded-[30px] border border-slate-200/90 bg-white p-7 shadow-[0_22px_55px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Available Contractors</h2>
                <p className="text-xs text-slate-500 mt-0.5">{availableContractors.length} verified contractor{availableContractors.length > 1 ? "s" : ""} available for vendor registration</p>
              </div>
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    {["Contractor ID", "Name", "Type", "Tax / TPN", "Linked Contract", "Status", "Action"].map((header) => (
                      <th key={header} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availableContractors.slice(0, 12).map((c) => {
                    const linkedContract = approvedContracts.find((ct) => ct.contractorId === c.id);
                    return (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 whitespace-nowrap">{c.id}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-900">{c.displayName}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{c.email || c.phone || "Verified contractor"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                            {c.contractualType || c.contractorType || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{c.taxNumber || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {linkedContract ? (
                            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200">
                              {linkedContract.contractId}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                            Verified
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => startFromContractor(c, linkedContract)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
                          >
                            Register as Vendor
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {availableContractors.slice(0, 12).map((c) => {
                const linkedContract = approvedContracts.find((ct) => ct.contractorId === c.id);
                return (
                  <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{c.displayName}</p>
                        <p className="mt-0.5 text-[10px] font-mono text-indigo-600">{c.id}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        Verified
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span>{c.contractualType || c.contractorType || "—"}</span>
                      {c.taxNumber && <><span>|</span><span>{c.taxNumber}</span></>}
                      {linkedContract && <><span>|</span><span className="font-medium text-sky-700">{linkedContract.contractId}</span></>}
                    </div>
                    <button
                      onClick={() => startFromContractor(c, linkedContract)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
                    >
                      Register as Vendor
                    </button>
                  </div>
                );
              })}
            </div>
            {availableContractors.length > 12 && (
              <p className="mt-3 text-center text-xs text-slate-400">Showing 12 of {availableContractors.length} verified contractors</p>
            )}
          </div>
        )}

        {/* SRS reference */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Vendor Management (Expenditure SRS)</p>
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
            {["Row 121: Vendor Entry", "Row 122: Registration", "Row 123: Submission & Approval", "Row 124: Amendment"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 font-semibold">{step}</span>
                {i < 3 && <span className="text-slate-400">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Registration form ── */
  function renderRegister() {
    const isContractual = !!form.contractorId;
    const lockedClass = "mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 cursor-not-allowed text-sm";
    const inputCls = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm";

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button onClick={() => { setView("dashboard"); setShowSuccess(false); }} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </button>

        {/* Step indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { id: 1, label: "Vendor Details", icon: "1" },
              { id: 2, label: "Review & Documents", icon: "2" },
              { id: 3, label: "Submitted", icon: "3" },
            ].map((step, i) => {
              const isActive = formStep === step.id;
              const isDone = formStep > step.id;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? "border border-sky-200 bg-sky-50 text-sky-800" :
                    isDone ? "bg-emerald-50 text-emerald-700" : "text-slate-400"
                  }`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isDone ? "bg-emerald-100 text-emerald-700" :
                      isActive ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400"
                    }`}>{isDone ? "✓" : step.icon}</span>
                    <span>{step.label}</span>
                  </div>
                  {i < 2 && <span className="hidden h-[2px] w-6 bg-slate-200 md:block" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Success state */}
        {showSuccess && formStep === 3 && (
          <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-8 text-center shadow-lg">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Vendor Submitted for Approval</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              <span className="font-semibold text-indigo-700">{form.vendorName}</span> has been registered and submitted for approval.
              The approval chain: Finance Officer → Department Head → Finance Controller → Final Approval.
            </p>
            {form.linkedContractId && (
              <p className="mt-2 text-xs text-sky-700">
                Linked to contract: <span className="font-semibold">{form.linkedContractId}</span> — {form.linkedContractTitle}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => setView("dashboard")} className="rounded-2xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition">
                Back to Dashboard
              </button>
              <button onClick={() => { setForm(initialForm); setFormStep(1); setShowSuccess(false); }} className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Register Another
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Vendor details */}
        {formStep === 1 && (
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/50 px-6 py-5">
              <h2 className="text-xl font-semibold text-slate-900">
                {isContractual ? "Contractual Vendor Registration" : "Non-Contractual Vendor Registration"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isContractual
                  ? `Auto-populated from contractor ${form.contractorId}. Review and adjust details as needed.`
                  : "Enter vendor details manually for non-contractual payments (postal, fuel, NGOs, government bodies)."}
              </p>
            </div>

            {/* Auto-populated notice */}
            {isContractual && (
              <div className="mx-6 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-emerald-800">
                  <span className="font-bold">Auto-populated</span> from contractor registration. Fields with a lock icon are pre-filled — you can still edit them.
                  {form.linkedContractId && <> Linked to contract <span className="font-bold">{form.linkedContractId}</span>.</>}
                </p>
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* SRS Vendor Category — drives entire flow (rows 109-110) */}
              <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Vendor Category {ddTag("SRS 110")}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Required by SRS Process Description rows 109–110</p>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold text-indigo-700">{form.integrationSource}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {VENDOR_CATEGORIES.map((cat) => {
                    const active = form.vendorCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => updateField("vendorCategory", cat)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          active ? "border-indigo-500 bg-indigo-600 text-white shadow-md" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  <span className="font-semibold">Contract</span> auto-pulls from approved contractors (System).
                  Other categories require manual entry sourced from API-Banks / BITS / RAMIS / IBLS.
                </p>
              </div>

              {/* Integration source selector for non-contractual flows */}
              {!isContractual && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">Integration Source {ddTag("SRS 109")}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {INTEGRATION_SOURCES.map((src) => {
                      const active = form.integrationSource === src.value;
                      return (
                        <button
                          key={src.value}
                          type="button"
                          onClick={() => updateField("integrationSource", src.value)}
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${
                            active ? "border-teal-400 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                          }`}
                        >
                          <p className="text-xs font-bold">{src.label}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{src.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Basic info */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Basic Information</h3>
                <div className="grid gap-4 xl:grid-cols-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Vendor Type <span className="text-red-500">*</span> {ddTag("DD 10.2")} {lovTag("LoV 1.1")}
                    <select className={inputCls} value={form.vendorType} onChange={(e) => updateField("vendorType", e.target.value)}>
                      {(getOptions("vendor-type").length ? getOptions("vendor-type") : ["Contractual Vendor", "Non-Contractual Vendor", "Utility"]).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Vendor Name <span className="text-red-500">*</span> {ddTag("DD 10.4")}
                    <input className={isContractual ? lockedClass : inputCls} value={form.vendorName} onChange={(e) => updateField("vendorName", e.target.value)} readOnly={isContractual} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Registration Number <span className="text-red-500">*</span> {ddTag("DD 10.11")}
                    <input className={isContractual ? lockedClass : inputCls} value={form.registrationNumber} onChange={(e) => updateField("registrationNumber", e.target.value)} readOnly={isContractual} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    TPN {ddTag("DD 27.8")}
                    <input className={isContractual ? lockedClass : inputCls} value={form.tpn} onChange={(e) => updateField("tpn", e.target.value)} readOnly={isContractual} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    CID {ddTag("DD 27.2")}
                    <input className={inputCls} value={form.cid} onChange={(e) => updateField("cid", e.target.value)} placeholder="Citizenship ID / Org code" />
                  </label>
                  {form.contractorId && (
                    <label className="block text-sm font-semibold text-slate-700">
                      Linked Contractor {ddTag("DD 10.1")}
                      <input className={lockedClass} value={form.contractorId} readOnly />
                    </label>
                  )}
                </div>
              </div>

              {/* Address & Contact */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Address & Contact</h3>
                <div className="grid gap-4 xl:grid-cols-3">
                  <label className="block text-sm font-semibold text-slate-700 xl:col-span-3">
                    Physical Address <span className="text-red-500">*</span> {ddTag("DD 10.25")}
                    <textarea className={`${isContractual ? lockedClass : inputCls} min-h-20`} value={form.address} onChange={(e) => updateField("address", e.target.value)} readOnly={isContractual} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Phone <span className="text-red-500">*</span> {ddTag("DD 10.18")}
                    <input className={isContractual ? lockedClass : inputCls} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} readOnly={isContractual} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Email <span className="text-red-500">*</span> {ddTag("DD 10.19")}
                    <input className={isContractual ? lockedClass : inputCls} value={form.email} onChange={(e) => updateField("email", e.target.value)} readOnly={isContractual} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Contact Person {ddTag("PRN")}
                    <input className={inputCls} value={form.contactPerson} onChange={(e) => updateField("contactPerson", e.target.value)} placeholder="Contact person name" />
                  </label>
                </div>
              </div>

              {/* Bank details */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Bank Account Details</h3>
                <div className="grid gap-4 xl:grid-cols-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Bank Name <span className="text-red-500">*</span> {ddTag("DD 11.8")} {lovTag("LoV 3.2")}
                    {isContractual && form.bankName ? (
                      <input className={lockedClass} value={form.bankName} readOnly />
                    ) : (
                      <select className={inputCls} value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)}>
                        <option value="">Select Bank</option>
                        {getOptions("bank-name").map((o) => <option key={o}>{o}</option>)}
                      </select>
                    )}
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Account Number <span className="text-red-500">*</span> {ddTag("DD 11.4")}
                    <input className={isContractual ? lockedClass : inputCls} value={form.bankAccountNumber} onChange={(e) => updateField("bankAccountNumber", e.target.value)} readOnly={isContractual} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    SWIFT Code {ddTag("PRN")}
                    <input className={inputCls} value={form.swiftCode} onChange={(e) => updateField("swiftCode", e.target.value)} placeholder="SWIFT/BIC code" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Account Holder Name <span className="text-red-500">*</span> {ddTag("DD 11.0")}
                    <input className={isContractual ? lockedClass : inputCls} value={form.bankAccountName} onChange={(e) => updateField("bankAccountName", e.target.value)} readOnly={isContractual} />
                  </label>
                </div>
              </div>

              {/* Category assignment */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Category Assignment</h3>
                <div className="grid gap-4 xl:grid-cols-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Expenditure Category <span className="text-red-500">*</span> {ddTag("PRN")}
                    <select className={inputCls} value={form.expenditureCategory} onChange={(e) => updateField("expenditureCategory", e.target.value)}>
                      <option value="">Select category</option>
                      {(getOptions("vendor-expenditure-category").length ? getOptions("vendor-expenditure-category") : ["Works", "Goods", "Services", "Consultancy Services"]).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Funding Source {ddTag("PRN")}
                    <select className={inputCls} value={form.fundingSource} onChange={(e) => updateField("fundingSource", e.target.value)}>
                      {(getOptions("vendor-funding-source").length ? getOptions("vendor-funding-source") : ["RGOB", "Donor Agency"]).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Payment Frequency {ddTag("PRN")}
                    <select className={inputCls} value={form.paymentFrequency} onChange={(e) => updateField("paymentFrequency", e.target.value)}>
                      {(getOptions("payment-frequency").length ? getOptions("payment-frequency") : ["As Needed", "Monthly", "Quarterly"]).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Contract category selector */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contract Category</p>
                      <p className="text-xs text-slate-400 mt-0.5">Select applicable categories</p>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400">14.1.22</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {(getOptions("vendor-contract-category").length ? getOptions("vendor-contract-category") : ["Goods", "Works", "Services", "Goods and Services (Mixed)", "Works and Goods (Mixed)"]).map((cat) => {
                      const selected = form.contractCategories.includes(cat);
                      return (
                        <button
                          key={cat} type="button"
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                            selected ? "border-sky-200 bg-sky-50 text-sky-800 font-semibold" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                          onClick={() => {
                            setForm((p) => ({
                              ...p,
                              contractCategories: p.contractCategories.includes(cat)
                                ? p.contractCategories.filter((c) => c !== cat)
                                : [...p.contractCategories, cat],
                            }));
                          }}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${selected ? "border-sky-300 bg-white text-sky-700 text-xs" : "border-slate-300 bg-white"}`}>
                            {selected ? "✓" : ""}
                          </span>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Vehicle Management Sub-Form (DD 27.1.1-27.1.8) — only for fuel/vehicle vendors */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Vehicle Management {ddTag("DD 27.1.1–27.1.8")}</h3>
                    <p className="mt-1 text-xs text-slate-500">Required only for fuel providers and vehicle expense vendors.</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={form.hasVehicleDetails}
                      onChange={(e) => updateField("hasVehicleDetails", e.target.checked)}
                    />
                    Add vehicle details
                  </label>
                </div>
                {form.hasVehicleDetails && (
                  <div className="mt-4 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 xl:grid-cols-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      Vehicle Number {ddTag("27.1.1")}
                      <input className={inputCls} value={form.vehicle.vehicleNumber} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, vehicleNumber: e.target.value } }))} placeholder="BP-1-A1234" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Agency Code {ddTag("27.1.2")}
                      <input className={inputCls} value={form.vehicle.agencyCode} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, agencyCode: e.target.value } }))} placeholder="MoF-DPA" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Budget Code {ddTag("27.1.3")}
                      <input className={inputCls} value={form.vehicle.budgetCode} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, budgetCode: e.target.value } }))} placeholder="33-01-001" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Expenditure Type {ddTag("27.1.4")}
                      <input className={inputCls} value={form.vehicle.expenditureType} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, expenditureType: e.target.value } }))} placeholder="Recurrent" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Vehicle Expense Type {ddTag("27.1.5")}
                      <input className={inputCls} value={form.vehicle.vehicleExpensesType} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, vehicleExpensesType: e.target.value } }))} placeholder="Fuel / Maintenance / Insurance" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Vehicle Type {ddTag("27.1.6")}
                      <input className={inputCls} value={form.vehicle.vehicleType} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, vehicleType: e.target.value } }))} placeholder="SUV / Truck / Sedan" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Fuel Provider Name {ddTag("27.1.7")}
                      <input className={inputCls} value={form.vehicle.fuelProvidersName} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, fuelProvidersName: e.target.value } }))} placeholder="Druk Petroleum" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Payable Amount {ddTag("27.1.8")}
                      <input className={inputCls} value={form.vehicle.payableAmount} onChange={(e) => setForm((p) => ({ ...p, vehicle: { ...p.vehicle, payableAmount: e.target.value } }))} placeholder="Nu. 25,000" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <button onClick={() => { setView("dashboard"); setShowSuccess(false); }} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                onClick={() => setFormStep(2)}
                disabled={!form.vendorName || form.contractCategories.length === 0}
                className="rounded-2xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review & Submit →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & submit */}
        {formStep === 2 && !showSuccess && (
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/50 px-6 py-5">
              <h2 className="text-xl font-semibold text-slate-900">Review & Submit</h2>
              <p className="text-sm text-slate-500 mt-1">Verify the vendor details below before submitting for approval.</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
                {[
                  { l: "Vendor Name", v: form.vendorName },
                  { l: "Vendor Type", v: form.vendorType },
                  { l: "Registration No.", v: form.registrationNumber },
                  { l: "TPN", v: form.tpn },
                  { l: "CID", v: form.cid },
                  { l: "Vendor Category", v: form.vendorCategory },
                  { l: "Integration Source", v: form.integrationSource },
                  { l: "Contractor ID", v: form.contractorId || "—" },
                  { l: "Address", v: form.address },
                  { l: "Phone", v: form.phone },
                  { l: "Email", v: form.email },
                  { l: "Contact Person", v: form.contactPerson },
                  { l: "Bank", v: form.bankName },
                  { l: "Account No.", v: form.bankAccountNumber },
                  { l: "Account Holder", v: form.bankAccountName },
                  { l: "Category", v: form.expenditureCategory },
                  { l: "Funding Source", v: form.fundingSource },
                  { l: "Payment Freq.", v: form.paymentFrequency },
                  { l: "Contract Categories", v: form.contractCategories.join(", ") },
                ].map((d) => (
                  <div key={d.l}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{d.l}</p>
                    <p className="mt-0.5 text-sm text-slate-800">{d.v || "—"}</p>
                  </div>
                ))}
              </div>

              {form.linkedContractId && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-xs font-bold text-sky-800">Linked Contract</p>
                  <p className="text-sm text-sky-700 mt-1">{form.linkedContractId} — {form.linkedContractTitle}</p>
                </div>
              )}

              {/* Approval workflow preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Approval Workflow</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {["Finance Officer", "Department Head", "Finance Controller", "Final Approval"].map((role, i) => (
                    <div key={role} className="flex items-center gap-2">
                      <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">{role}</span>
                      {i < 3 && <span className="text-slate-300 text-xs">→</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <label className="block text-sm font-semibold text-slate-700">
                Additional Remarks
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 min-h-24"
                  value={form.remarks}
                  onChange={(e) => updateField("remarks", e.target.value)}
                  placeholder="Any additional information for approvers..."
                />
              </label>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <button onClick={() => setFormStep(1)} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                ← Back to Details
              </button>
              <button onClick={submitVendor} className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-lg">
                Submit for Approval
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Detail view ── */
  function renderDetail() {
    if (!detailVendor) return null;
    const v = detailVendor;
    return (
      <div className="space-y-6">
        <button onClick={() => setView("dashboard")} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </button>

        <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-indigo-600 font-semibold">{v.id}</p>
                <h2 className="text-2xl font-semibold text-slate-900 mt-1">{v.vendorName}</h2>
                <p className="text-sm text-slate-500 mt-1">{v.serviceCategory} — {v.fundingSource}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${statusColor(v.status)}`}>
                {v.status === "Pending approval" ? "Pending Approval" : v.status}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
              {[
                { l: "Vendor Category (SRS)", v: v.vendorCategory || "—" },
                { l: "Integration Source", v: v.integrationSource || "—" },
                { l: "TPN", v: v.tpn || "—" },
                { l: "CID", v: v.cid || "—" },
                { l: "Contractor ID", v: v.contractorId || "—" },
                { l: "Bank", v: v.bankName ? `${v.bankName} • ${v.bankAccountNumber}` : "—" },
                { l: "Address", v: v.address || "—" },
                { l: "Phone", v: v.phone || "—" },
                { l: "Email", v: v.email || "—" },
                { l: "Payment Frequency", v: v.paymentFrequency },
                { l: "Funding Source", v: v.fundingSource },
                { l: "Created", v: new Date(v.createdAt).toLocaleDateString() },
                { l: "Contract Categories", v: (v.contractCategories || []).join(", ") || "—" },
              ].map((d) => (
                <div key={d.l}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{d.l}</p>
                  <p className="mt-0.5 text-sm text-slate-800">{d.v}</p>
                </div>
              ))}
            </div>

            {/* Contact info from contractor */}
            {v.contractorId && (v.contractorPhone || v.contractorEmail) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Contact (from Contractor Registration)</p>
                <div className="flex flex-wrap gap-6 text-sm text-slate-700">
                  {v.contractorPhone && <span>Phone: {v.contractorPhone}</span>}
                  {v.contractorEmail && <span>Email: {v.contractorEmail}</span>}
                </div>
              </div>
            )}

            {/* Linked contracts */}
            {v.linkedContracts.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Linked Contracts ({v.linkedContracts.length})</p>
                <div className="space-y-2">
                  {v.linkedContracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{c.contractTitle}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{c.contractId} — Nu. {c.contractValue} — {c.agencyName}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusColor(c.workflowStatus === "approved" ? "Approved" : c.contractStatus)}`}>
                        {c.contractStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle details if present */}
            {v.vehicleDetail && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-3">Vehicle Management {ddTag("DD 27.1")}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                  {[
                    { l: "Vehicle No.", v: v.vehicleDetail.vehicleNumber },
                    { l: "Agency Code", v: v.vehicleDetail.agencyCode },
                    { l: "Budget Code", v: v.vehicleDetail.budgetCode },
                    { l: "Expense Type", v: v.vehicleDetail.expenditureType },
                    { l: "Vehicle Expense", v: v.vehicleDetail.vehicleExpensesType },
                    { l: "Vehicle Type", v: v.vehicleDetail.vehicleType },
                    { l: "Fuel Provider", v: v.vehicleDetail.fuelProvidersName },
                    { l: "Payable", v: v.vehicleDetail.payableAmount },
                  ].map((d) => (
                    <div key={d.l}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">{d.l}</p>
                      <p className="mt-0.5 text-sm text-slate-800">{d.v || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval workflow */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Approval Workflow {lovTag("SRS 112")}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {APPROVAL_CHAIN.map((role, i) => {
                  const isCurrent = role === v.currentApprover;
                  const isDone = v.status === "Approved";
                  const isRejected = v.status === "Rejected";
                  return (
                    <div key={role} className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                        isDone ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        isRejected ? "bg-red-50 border-red-200 text-red-700" :
                        isCurrent ? "bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-300" :
                        "bg-white border-slate-200 text-slate-400"
                      }`}>
                        {isDone ? "✓" : isCurrent ? "●" : "○"} {role}
                      </span>
                      {i < APPROVAL_CHAIN.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action panel — real maker-checker actions per SRS row 112 */}
            {(v.status === "Pending approval" || v.status === "Amendment requested") && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-700 mb-3">Approver Actions</p>
                <p className="text-xs text-slate-600 mb-4">Acting as <span className="font-semibold">{currentUser}</span>. All actions are recorded in the audit trail.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => approveVendor(v)}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-md"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => {
                      const remarks = window.prompt("Reason for rejection?");
                      if (remarks && remarks.trim()) rejectVendor(v, remarks.trim());
                    }}
                    className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition"
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={() => {
                      const remarks = window.prompt("Amendment notes?");
                      if (remarks && remarks.trim()) requestAmendment(v, remarks.trim());
                    }}
                    className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition"
                  >
                    ↻ Request Amendment
                  </button>
                </div>
              </div>
            )}

            {/* Status detail bar */}
            {(v.approvedAt || v.rejectedAt || v.amendmentRequested) && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                v.status === "Approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                v.status === "Rejected" ? "border-red-200 bg-red-50 text-red-800" :
                "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                {v.status === "Approved" && <span><span className="font-bold">Approved</span> by {v.approvedBy} on {v.approvedAt && new Date(v.approvedAt).toLocaleString()}</span>}
                {v.status === "Rejected" && <span><span className="font-bold">Rejected</span> on {v.rejectedAt && new Date(v.rejectedAt).toLocaleString()} — {v.rejectionRemarks}</span>}
                {v.status === "Amendment requested" && <span><span className="font-bold">Amendment requested</span> — {v.amendmentRemarks}</span>}
              </div>
            )}

            {/* Audit Trail (SRS row 112 — mandatory) */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Audit Trail {ddTag("SRS 112")}</p>
              {v.auditTrail && v.auditTrail.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-500">When</th>
                        <th className="px-3 py-2 font-semibold text-slate-500">Action</th>
                        <th className="px-3 py-2 font-semibold text-slate-500">By</th>
                        <th className="px-3 py-2 font-semibold text-slate-500">Transition</th>
                        <th className="px-3 py-2 font-semibold text-slate-500">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.auditTrail.map((entry, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-600">{new Date(entry.at).toLocaleString()}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{entry.action}</td>
                          <td className="px-3 py-2 text-slate-600">{entry.by}</td>
                          <td className="px-3 py-2 text-slate-500">{entry.fromStatus} → {entry.toStatus}</td>
                          <td className="px-3 py-2 text-slate-500">{entry.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No audit entries yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="space-y-6">
      {view === "dashboard" && renderDashboard()}
      {view === "register" && renderRegister()}
      {view === "detail" && renderDetail()}
    </div>
  );
}
