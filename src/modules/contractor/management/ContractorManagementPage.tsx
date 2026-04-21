import { useState, useMemo, useCallback } from "react";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import type { ContractorRecord } from "../../../shared/types";
import {
  type Step,
  type PortalAccess,
  type AccountStatus,
  type AuthMethod,
  type DelegateRole,
  type DelegateStatus,
  type DelegateUser,
  type PermissionModule,
  type UserAccessConfig,
  type EditFormState,
  type ProcessStep,
  type ProcessGroup,
  DEFAULT_PERMISSIONS,
  PROCESS_DESCRIPTIONS,
  panelClass,
  headerClass,
  inputClass,
  lockedInputClass,
  labelClass,
  btnClass,
} from "./managementPage";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function ContractorManagementPage() {
  const { contractors, updateContractor } = useContractorData();
  const { masterDataMap } = useMasterData();
  const [step, setStep] = useState<Step>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  /* ─── contractor search ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedKind, setSelectedKind] = useState<"individual" | "business">("business");

  /* ─── edit modal state ─── */
  const [editTarget, setEditTarget] = useState<ContractorRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    displayName: "", contractorType: "", category: "", email: "", phone: "",
    address: "", bankName: "", bankAccountNumber: "", bankAccountName: "",
    taxNumber: "", registrationNumber: "", nationality: "",
  });
  const [editRemarks, setEditRemarks] = useState("");

  /* ─── user access config ─── */
  const [config, setConfig] = useState<UserAccessConfig>({
    portalAccess: "",
    accountStatus: "",
    username: "",
    email: "",
    mobile: "",
    authMethod: "",
    delegates: [],
    permissions: DEFAULT_PERMISSIONS.map((p) => ({ ...p })),
    accessFrom: "",
    accessUntil: "",
    ipRestriction: "No Restriction",
    maxLoginAttempts: "5",
    sessionTimeout: "30",
    passwordExpiry: "90",
    remarks: "",
  });

  const updateConfig = useCallback(<K extends keyof UserAccessConfig>(k: K, v: UserAccessConfig[K]) => {
    setConfig((prev) => ({ ...prev, [k]: v }));
  }, []);

  /* ─── use real contractors only (no mock data) ─── */
  const allContractors = useMemo(() => {
    return contractors.map((c) => ({
      id: c.id,
      name: c.displayName,
      category: c.contractorType || (c.kind === "individual" ? "Individual Contractor" : "Business Contractor"),
      tpn: c.taxNumber || c.registrationNumber || "\u2014",
      status: c.status === "Active and verified" ? ("Active" as const) : ("Inactive" as const),
      portalAccess: (c.profile?.portalAccess as string) === "Enabled" ? ("Enabled" as const) : (c.profile?.portalAccess as string) === "Locked" ? ("Locked" as const) : ("Disabled" as const),
      kind: c.kind,
      verification: c.verification,
    }));
  }, [contractors]);

  /* ─── filtered list ─── */
  const filteredContractors = useMemo(() => {
    let list = allContractors;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.tpn.toLowerCase().includes(q));
    }
    if (filterCategory) list = list.filter((c) => c.category === filterCategory);
    if (filterStatus) list = list.filter((c) => c.status === filterStatus);
    return list;
  }, [allContractors, searchQuery, filterCategory, filterStatus]);

  /* ─── dynamic categories from real data ─── */
  const uniqueCategories = useMemo(() => {
    const cats = new Set(allContractors.map((c) => c.category));
    return Array.from(cats).sort();
  }, [allContractors]);

  /* ─── stats ─── */
  const stats = useMemo(() => ({
    total: allContractors.length,
    withAccess: allContractors.filter((c) => c.portalAccess === "Enabled").length,
    withoutAccess: allContractors.filter((c) => c.portalAccess === "Disabled").length,
    locked: allContractors.filter((c) => c.portalAccess === "Locked").length,
  }), [allContractors]);

  /* ─── select contractor ─── */
  const selectContractor = (id: string, name: string, kind: "individual" | "business") => {
    setSelectedId(id);
    setSelectedName(name);
    setSelectedKind(kind);
    updateConfig("username", id.toLowerCase().replace(/-/g, ""));

    /* Pre-fill email/phone from contractor record */
    const rec = contractors.find((c) => c.id === id);
    if (rec) {
      updateConfig("email", rec.email || "");
      updateConfig("mobile", rec.phone || "");
    }
  };

  /* ─── open edit modal ─── */
  const openEdit = (contractor: ContractorRecord) => {
    setEditTarget(contractor);
    setEditForm({
      displayName: contractor.displayName,
      contractorType: contractor.contractorType,
      category: contractor.category,
      email: contractor.email,
      phone: contractor.phone,
      address: contractor.address,
      bankName: contractor.bankName,
      bankAccountNumber: contractor.bankAccountNumber,
      bankAccountName: contractor.bankAccountName,
      taxNumber: contractor.taxNumber,
      registrationNumber: contractor.registrationNumber,
      nationality: contractor.nationality,
    });
    setEditRemarks("");
  };

  /* ─── save edit ─── */
  const saveEdit = () => {
    if (!editTarget) return;

    const changes: { field: string; oldValue: string; newValue: string }[] = [];
    const fields: (keyof EditFormState)[] = ["displayName", "contractorType", "category", "email", "phone", "address", "bankName", "bankAccountNumber", "bankAccountName", "taxNumber", "registrationNumber", "nationality"];

    for (const field of fields) {
      const oldVal = (editTarget as any)[field] || "";
      const newVal = editForm[field] || "";
      if (oldVal !== newVal) {
        changes.push({ field, oldValue: oldVal, newValue: newVal });
      }
    }

    if (changes.length === 0) {
      setEditTarget(null);
      return;
    }

    const historyEntry = {
      editedBy: "DSD (System Admin)",
      editedAt: new Date().toISOString(),
      changes,
      remarks: editRemarks || undefined,
    };

    updateContractor(editTarget.id, {
      displayName: editForm.displayName,
      contractorType: editForm.contractorType,
      category: editForm.category,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address,
      bankName: editForm.bankName,
      bankAccountNumber: editForm.bankAccountNumber,
      bankAccountName: editForm.bankAccountName,
      taxNumber: editForm.taxNumber,
      registrationNumber: editForm.registrationNumber,
      nationality: editForm.nationality,
      editHistory: [...(editTarget.editHistory || []), historyEntry],
    });

    setEditTarget(null);
    setSuccessMessage(`Contractor "${editForm.displayName}" updated successfully \u2014 ${changes.length} field${changes.length > 1 ? "s" : ""} changed.`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  /* ─── delegates ─── */
  const addDelegate = () => {
    const d: DelegateUser = { id: `del-${Date.now()}`, name: "", cid: "", email: "", mobile: "", role: "Viewer", status: "Active" };
    updateConfig("delegates", [...config.delegates, d]);
  };
  const removeDelegate = (id: string) => updateConfig("delegates", config.delegates.filter((d) => d.id !== id));
  const updateDelegate = (id: string, field: keyof DelegateUser, value: string) => {
    updateConfig("delegates", config.delegates.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  /* ─── permissions ─── */
  const togglePermission = (permId: string) => {
    updateConfig("permissions", config.permissions.map((p) => (p.id === permId ? { ...p, granted: !p.granted } : p)));
  };
  const grantedCount = config.permissions.filter((p) => p.granted).length;

  /* ─── navigation ─── */
  const goStep = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitForm = () => {
    /* Save portal access status back to the contractor record */
    if (selectedId) {
      const portalAccessValue = config.portalAccess === "enabled" ? "Enabled" : config.portalAccess === "disabled" ? "Disabled" : "";
      if (portalAccessValue) {
        updateContractor(selectedId, {
          profile: {
            ...(contractors.find(c => c.id === selectedId)?.profile || {}),
            portalAccess: portalAccessValue,
            accountStatus: config.accountStatus,
            authMethod: config.authMethod,
            accessFrom: config.accessFrom,
            accessUntil: config.accessUntil,
            ipRestriction: config.ipRestriction,
            maxLoginAttempts: config.maxLoginAttempts,
            sessionTimeout: config.sessionTimeout,
            passwordExpiry: config.passwordExpiry,
          },
        });
      }
    }

    setSuccessMessage(`User Management for "${selectedName}" submitted successfully.`);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setStep(1);
      setSelectedId("");
      setSelectedName("");
      setConfig({
        ...config,
        portalAccess: "",
        accountStatus: "",
        username: "",
        email: "",
        mobile: "",
        authMethod: "",
        delegates: [],
        permissions: DEFAULT_PERMISSIONS.map((p) => ({ ...p })),
        remarks: "",
      });
    }, 4000);
  };

  /* status badge */
  const statusBadge = (s: string) => {
    if (s === "Active" || s === "Enabled") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "Inactive" || s === "Disabled") return "bg-slate-100 text-slate-500 border-slate-200";
    if (s === "Locked" || s === "Blocked") return "bg-red-100 text-red-700 border-red-200";
    if (s === "Pending") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-500 border-slate-200";
  };

  const verificationBadge = (v: string) => {
    if (v === "Verified") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (v === "Rejected") return "bg-red-100 text-red-700 border-red-200";
    if (v === "Resubmitted") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  const STEPS = [
    { n: 1, label: "Search", icon: "\uD83D\uDD0D" },
    { n: 2, label: "Access", icon: "\uD83D\uDC64" },
    { n: 3, label: "Security", icon: "\uD83D\uDD10" },
    { n: 4, label: "Review", icon: "\u2705" },
  ];

  /* ─── master data lookups ─── */
  const nationalities = masterDataMap.get("nationality") || [];
  const contractorCategories = masterDataMap.get("contractor-category") || [];
  const contractorTypes = masterDataMap.get("contractor-type") || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* PAGE HEADER */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-500">CONTRACTOR</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Contractor Management</h1>
        <p className="mt-1 text-sm text-slate-600">Manage contractor portal access, security settings, and delegated users.</p>
      </div>

      {/* success toast */}
      {showSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
          <span className="text-2xl">{"\u2705"}</span>
          <div>
            <p className="text-sm font-bold text-emerald-900">{successMessage || "Operation completed successfully"}</p>
            <p className="text-xs text-emerald-700">Reference: USR-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 900) + 100).padStart(5, "0")} \u2014 Changes saved.</p>
          </div>
        </div>
      )}

      {/* empty state */}
      {contractors.length === 0 && step === 1 && (
        <section className={panelClass}>
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">{"\uD83D\uDC64"}</div>
            <h3 className="text-lg font-bold text-slate-800">No Contractors Registered Yet</h3>
            <p className="mt-2 text-sm text-slate-500">Register contractors first in the Contractor Registration page, then manage their portal access here.</p>
            <a href="/contractor/register" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-bold text-sky-800 transition hover:bg-sky-100">
              Go to Contractor Registration {"\u2192"}
            </a>
          </div>
        </section>
      )}

      {/* STEPPER (only shown when contractors exist) */}
      {contractors.length > 0 && (
        <div className="flex items-center gap-0 overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <button
                type="button"
                className={`flex items-center gap-2 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
                  step === s.n
                    ? "border border-sky-200 bg-sky-50 text-sky-800"
                    : step > s.n
                      ? "text-slate-600"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`}
                onClick={() => { if (s.n <= step || (s.n === 2 && !!selectedId)) goStep(s.n as Step); }}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                  step === s.n
                    ? "bg-sky-100 text-sky-800"
                    : step > s.n
                      ? "bg-emerald-100 text-emerald-700"
                      : "border border-slate-200 bg-white text-slate-400"
                }`}>{step > s.n ? "\u2713" : s.n}</span>
                <span>{s.icon} {s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`mx-1 h-[2px] w-5 ${step > s.n ? "bg-emerald-200" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         STEP 1 — SEARCH & SELECT CONTRACTOR
         ═══════════════════════════════════════════════════════════ */}
      {step === 1 && contractors.length > 0 && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-bold text-slate-700 shadow-sm">{"\uD83D\uDD0D"}</div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Search & Select Contractor</h2>
                  <p className="mt-1 text-xs text-slate-500">Search and select a registered contractor to configure portal access, or edit their details.</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5">
            {/* search bar */}
            <div className="flex flex-wrap gap-3">
              <input
                className={`flex-1 min-w-[220px] ${inputClass}`}
                placeholder="Search by Contractor ID, Name, TPN, or CID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select className={`${inputClass} w-auto min-w-[160px]`} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <select className={`${inputClass} w-auto min-w-[140px]`} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            {/* stat cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { val: stats.total, label: "Total Contractors", color: "text-slate-900" },
                { val: stats.withAccess, label: "With Portal Access", color: "text-emerald-600" },
                { val: stats.withoutAccess, label: "Without Portal Access", color: "text-amber-600" },
                { val: stats.locked, label: "Locked Accounts", color: "text-red-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center hover:shadow-md transition">
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                    <th className="px-4 py-3 text-left font-semibold">Contractor ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                    <th className="px-4 py-3 text-left font-semibold">TPN/CID</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Verification</th>
                    <th className="px-4 py-3 text-left font-semibold">Portal Access</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContractors.map((c) => {
                    const fullRecord = contractors.find((r) => r.id === c.id);
                    return (
                      <tr key={c.id} className={`border-b border-slate-100 transition hover:bg-slate-50 ${selectedId === c.id ? "bg-slate-50" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{c.id}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-800">{c.name}</p>
                            <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${c.kind === "individual" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {c.kind === "individual" ? "Individual" : "Business"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{c.category}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{c.tpn}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold ${statusBadge(c.status)}`}>{c.status === "Active" ? "\u25CF" : "\u25CB"} {c.status}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold ${verificationBadge(c.verification)}`}>{c.verification}</span></td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold ${statusBadge(c.portalAccess)}`}>{c.portalAccess === "Enabled" ? "\u25CF" : c.portalAccess === "Locked" ? "\uD83D\uDD12" : "\u25CB"} {c.portalAccess}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Edit button */}
                            {fullRecord && (
                              <button
                                type="button"
                                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                                onClick={() => openEdit(fullRecord)}
                              >
                                Edit
                              </button>
                            )}
                            {/* Select for user management */}
                            <button
                              type="button"
                              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                                selectedId === c.id
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                              }`}
                              onClick={() => selectContractor(c.id, c.name, c.kind)}
                            >
                              {selectedId === c.id ? "\u2713 Selected" : "Select"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredContractors.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">No contractors found matching your criteria</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className={`${btnClass} ${
                  !selectedId
                    ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    : "border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                }`}
                disabled={!selectedId}
                onClick={() => goStep(2)}
              >
                {selectedId ? `Continue with ${selectedName} \u2192` : "Select a Contractor to Continue \u2192"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
         STEP 2 — USER ACCESS CONFIGURATION
         ═══════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-bold text-slate-700 shadow-sm">{"\uD83D\uDC64"}</div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Contractor User Access</h2>
                  <p className="mt-1 text-xs text-slate-500">Configure access settings and delegate users for the selected contractor.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-5">
              {/* selected contractor info */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 flex items-center gap-3">
                <span className="text-lg">{selectedKind === "individual" ? "\uD83D\uDC64" : "\uD83C\uDFE2"}</span>
                <p className="text-sm"><span className="font-bold text-emerald-900">{selectedName}</span> <span className="text-emerald-800">({selectedId})</span></p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedKind === "individual" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                  {selectedKind === "individual" ? "Individual" : "Business"}
                </span>
              </div>

              {/* system-locked fields */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className={labelClass}>
                  <div className="flex items-center gap-2"><span>Contractor ID</span><span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">System</span></div>
                  <input className={lockedInputClass} value={selectedId} readOnly />
                </label>
                <label className={labelClass}>
                  <div className="flex items-center gap-2"><span>Contractor Name</span><span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">System</span></div>
                  <input className={lockedInputClass} value={selectedName} readOnly />
                </label>
                <label className={labelClass}>
                  <div className="flex items-center gap-2"><span>Registration Date</span><span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">System</span></div>
                  <input className={lockedInputClass} value={contractors.find(c => c.id === selectedId)?.createdAt?.split("T")[0] || "\u2014"} readOnly />
                </label>
                <label className={labelClass}>
                  <div className="flex items-center gap-2"><span>Primary Status</span><span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">System</span></div>
                  <input className={lockedInputClass} value={contractors.find(c => c.id === selectedId)?.status || "\u2014"} readOnly />
                </label>
              </div>

              <hr className="border-slate-200" />
              <h4 className="text-sm font-bold text-slate-900">Portal Access Settings</h4>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {/* portal access toggle */}
                <label className={labelClass}>
                  <span>Portal Access <span className="text-slate-500">*</span></span>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${config.portalAccess === "enabled" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"}`}
                      onClick={() => updateConfig("portalAccess", "enabled")}
                    >{"\u2705"} Enable</button>
                    <button
                      type="button"
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${config.portalAccess === "disabled" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-500 hover:border-red-300"}`}
                      onClick={() => updateConfig("portalAccess", "disabled")}
                    >{"\uD83D\uDEAB"} Disable</button>
                  </div>
                </label>

                <label className={labelClass}>
                  <span>Account Status <span className="text-slate-500">*</span></span>
                  <select className={inputClass} value={config.accountStatus} onChange={(e) => updateConfig("accountStatus", e.target.value as AccountStatus)}>
                    <option value="">-- Select --</option>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Locked</option>
                    <option>Blocked</option>
                  </select>
                </label>

                <label className={labelClass}>
                  <span>Username <span className="text-slate-500">*</span><span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">Auto-generated</span></span>
                  <input className={lockedInputClass} value={config.username} readOnly />
                </label>

                <label className={labelClass}>
                  <span>Registered Email <span className="text-slate-500">*</span></span>
                  <input className={inputClass} type="email" value={config.email} onChange={(e) => updateConfig("email", e.target.value)} placeholder="contractor@email.com" />
                </label>

                <label className={labelClass}>
                  <span>Registered Mobile <span className="text-slate-500">*</span></span>
                  <input className={inputClass} type="tel" value={config.mobile} onChange={(e) => updateConfig("mobile", e.target.value)} placeholder="+975-XXXXXXXX" />
                </label>

                <label className={labelClass}>
                  <span>Authentication Method <span className="text-slate-500">*</span></span>
                  <select className={inputClass} value={config.authMethod} onChange={(e) => updateConfig("authMethod", e.target.value as AuthMethod)}>
                    <option value="">-- Select --</option>
                    <option>Username/Password</option>
                    <option>OTP via SMS</option>
                    <option>OTP via Email</option>
                    <option>Two-Factor Authentication (2FA)</option>
                    <option>Digital Certificate (Bhutan NDI)</option>
                  </select>
                </label>
              </div>

              <hr className="border-slate-200" />
              <h4 className="text-sm font-bold text-slate-900">Authorized Users / Delegates</h4>

              {/* delegates table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                      <th className="px-3 py-2.5 text-left font-semibold">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Delegate Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold">CID/Passport</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Email</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Mobile</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Role</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                      <th className="px-3 py-2.5 text-left font-semibold">{"\uD83D\uDDD1\uFE0F"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.delegates.map((d, i) => (
                      <tr key={d.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-xs text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={d.name} onChange={(e) => updateDelegate(d.id, "name", e.target.value)} placeholder="Full Name" /></td>
                        <td className="px-3 py-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={d.cid} onChange={(e) => updateDelegate(d.id, "cid", e.target.value)} placeholder="CID Number" /></td>
                        <td className="px-3 py-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={d.email} onChange={(e) => updateDelegate(d.id, "email", e.target.value)} placeholder="Email" /></td>
                        <td className="px-3 py-2"><input className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={d.mobile} onChange={(e) => updateDelegate(d.id, "mobile", e.target.value)} placeholder="+975-XX" /></td>
                        <td className="px-3 py-2">
                          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={d.role} onChange={(e) => updateDelegate(d.id, "role", e.target.value)}>
                            <option>Viewer</option><option>Submitter</option><option>Manager</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={d.status} onChange={(e) => updateDelegate(d.id, "status", e.target.value)}>
                            <option>Active</option><option>Inactive</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <button type="button" className="text-red-500 hover:text-red-700 font-bold" onClick={() => removeDelegate(d.id)}>{"\u2715"}</button>
                        </td>
                      </tr>
                    ))}
                    {config.delegates.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-slate-400">No delegates added yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button type="button" className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100" onClick={addDelegate}>
                + Add Delegate User
              </button>

              <div className="flex justify-between">
                <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(1)}>{"\u2190"} Back to Search</button>
                <button type="button" className={`${btnClass} border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`} onClick={() => goStep(3)}>Continue to Authorization {"\u2192"}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         STEP 3 — AUTHORIZATION & PERMISSIONS
         ═══════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-bold text-slate-700 shadow-sm">{"\uD83D\uDD10"}</div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Security & Permissions</h2>
                  <p className="mt-1 text-xs text-slate-500">Set module permissions and sign-in restrictions for this contractor account.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-5">
              <h4 className="text-sm font-bold text-slate-900">Module Access <span className="ml-2 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-700">{grantedCount} / {config.permissions.length} granted</span></h4>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {config.permissions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`rounded-2xl border-2 px-4 py-4 text-left transition hover:shadow-sm ${p.granted ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    onClick={() => togglePermission(p.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{p.icon}</span>
                      <div className={`h-5 w-9 rounded-full transition relative ${p.granted ? "bg-emerald-500" : "bg-slate-200"}`}>
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${p.granted ? "left-[18px]" : "left-0.5"}`} />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{p.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                  </button>
                ))}
              </div>

              <hr className="border-slate-200" />
              <h4 className="text-sm font-bold text-slate-900">Access Restrictions</h4>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className={labelClass}>
                  <span>Access Valid From</span>
                  <input className={inputClass} type="date" value={config.accessFrom} onChange={(e) => updateConfig("accessFrom", e.target.value)} />
                </label>
                <label className={labelClass}>
                  <span>Access Valid Until</span>
                  <input className={inputClass} type="date" value={config.accessUntil} onChange={(e) => updateConfig("accessUntil", e.target.value)} />
                  <span className="text-[10px] text-slate-400">Leave blank for indefinite access</span>
                </label>
                <label className={labelClass}>
                  <span>IP Restriction</span>
                  <select className={inputClass} value={config.ipRestriction} onChange={(e) => updateConfig("ipRestriction", e.target.value)}>
                    <option>No Restriction</option>
                    <option>Bhutan Only</option>
                    <option>Specific IP Range</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Max Login Attempts</span>
                  <select className={inputClass} value={config.maxLoginAttempts} onChange={(e) => updateConfig("maxLoginAttempts", e.target.value)}>
                    <option>3</option><option>5</option><option>10</option><option>Unlimited</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Session Timeout (minutes)</span>
                  <select className={inputClass} value={config.sessionTimeout} onChange={(e) => updateConfig("sessionTimeout", e.target.value)}>
                    <option>15</option><option>30</option><option>60</option><option>120</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Password Expiry (days)</span>
                  <select className={inputClass} value={config.passwordExpiry} onChange={(e) => updateConfig("passwordExpiry", e.target.value)}>
                    <option>30</option><option>60</option><option>90</option><option>Never</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-between">
                <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(2)}>{"\u2190"} Back to User Access</button>
                <button type="button" className={`${btnClass} border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`} onClick={() => goStep(4)}>Continue to Review {"\u2192"}</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         STEP 4 — REVIEW & SUBMIT
         ═══════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Contractor Details */}
          <section className={panelClass}>
            <div className={headerClass}><div className="flex items-center gap-3"><span className="text-lg">{"\uD83D\uDC64"}</span><h3 className="text-base font-bold text-slate-800">Contractor Details</h3></div></div>
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                { l: "Contractor ID", v: selectedId },
                { l: "Contractor Name", v: selectedName },
                { l: "Type", v: selectedKind === "individual" ? "Individual" : "Business" },
                { l: "Portal Access", v: config.portalAccess === "enabled" ? "Enabled" : config.portalAccess === "disabled" ? "Disabled" : "Not set" },
                { l: "Account Status", v: config.accountStatus || "Not set" },
                { l: "Username", v: config.username },
                { l: "Email", v: config.email || "Not set" },
                { l: "Authentication", v: config.authMethod || "Not set" },
              ].map((item) => (
                <div key={item.l} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">{item.l}</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{item.v}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Permissions Summary */}
          <section className={panelClass}>
            <div className={headerClass}><div className="flex items-center gap-3"><span className="text-lg">{"\uD83D\uDD10"}</span><h3 className="text-base font-bold text-slate-800">Permissions Summary</h3></div></div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-2">
                {config.permissions.filter((p) => p.granted).map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {p.icon} {p.title}
                  </span>
                ))}
                {grantedCount === 0 && <p className="text-xs text-slate-400">No permissions granted</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Max Login: {config.maxLoginAttempts}</span>
                <span>Session: {config.sessionTimeout}min</span>
                <span>Password Expiry: {config.passwordExpiry} days</span>
                <span>IP: {config.ipRestriction}</span>
                <span>Delegates: {config.delegates.length}</span>
              </div>
            </div>
          </section>

          {/* Delegates Summary */}
          {config.delegates.length > 0 && (
            <section className={panelClass}>
              <div className={headerClass}><div className="flex items-center gap-3"><span className="text-lg">{"\uD83D\uDC65"}</span><h3 className="text-base font-bold text-slate-800">Delegates ({config.delegates.length})</h3></div></div>
              <div className="px-6 py-5 space-y-2">
                {config.delegates.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
                    <span className="font-bold text-slate-500">{i + 1}.</span>
                    <span className="font-bold text-slate-700">{d.name || "Unnamed"}</span>
                    <span className="text-slate-400">{d.cid || "\u2014"}</span>
                    <span className="text-slate-400">{d.email || "\u2014"}</span>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700">{d.role}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${d.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{d.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Remarks */}
          <section className={panelClass}>
            <div className="px-6 py-5">
              <label className={labelClass}>
                <span>Remarks / Justification</span>
                <textarea className={`${inputClass} min-h-[80px]`} value={config.remarks} onChange={(e) => updateConfig("remarks", e.target.value)} placeholder="Enter any remarks or justification for the user access changes..." />
              </label>
            </div>
          </section>

          <div className="flex justify-between">
            <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(3)}>{"\u2190"} Back to Authorization</button>
            <button type="button" className={`${btnClass} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={submitForm}>{"\u2705"} Approve</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         EDIT MODAL — Admin can edit contractor details
         ═══════════════════════════════════════════════════════════ */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)}>
          <div
            className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 px-7 py-5">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Edit Contractor</h2>
                <p className="text-xs text-slate-500">Admin editing \u2014 {editTarget.id} ({editTarget.kind})</p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                onClick={() => setEditTarget(null)}
              >{"\u2715"}</button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-7 py-6">
              {/* Identity */}
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Identity & Classification</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    <span>Display Name <span className="text-red-500">*</span></span>
                    <input className={inputClass} value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
                  </label>
                  <label className={labelClass}>
                    <span>Contractor Type</span>
                    <select className={inputClass} value={editForm.contractorType} onChange={(e) => setEditForm({ ...editForm, contractorType: e.target.value })}>
                      <option value="">-- Select --</option>
                      {contractorTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Category</span>
                    <select className={inputClass} value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                      <option value="">-- Select --</option>
                      {contractorCategories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Nationality</span>
                    <select className={inputClass} value={editForm.nationality} onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}>
                      <option value="">-- Select --</option>
                      {nationalities.map((n) => <option key={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {/* Tax & Registration */}
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Tax & Registration</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    <span>Tax Number (TPN)</span>
                    <input className={inputClass} value={editForm.taxNumber} onChange={(e) => setEditForm({ ...editForm, taxNumber: e.target.value })} />
                  </label>
                  <label className={labelClass}>
                    <span>Registration / CID Number</span>
                    <input className={inputClass} value={editForm.registrationNumber} onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })} />
                  </label>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Contact Information</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    <span>Email</span>
                    <input className={inputClass} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </label>
                  <label className={labelClass}>
                    <span>Phone</span>
                    <input className={inputClass} type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>
                    <span>Address</span>
                    <input className={inputClass} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                  </label>
                </div>
              </div>

              {/* Bank */}
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Bank Details</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className={labelClass}>
                    <span>Bank Name</span>
                    <input className={inputClass} value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} />
                  </label>
                  <label className={labelClass}>
                    <span>Account Number</span>
                    <input className={inputClass} value={editForm.bankAccountNumber} onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })} />
                  </label>
                  <label className={labelClass}>
                    <span>Account Name</span>
                    <input className={inputClass} value={editForm.bankAccountName} onChange={(e) => setEditForm({ ...editForm, bankAccountName: e.target.value })} />
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <label className={labelClass}>
                <span>Admin Remarks</span>
                <textarea className={`${inputClass} min-h-[60px]`} value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} placeholder="Reason for changes (optional)..." />
              </label>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-7 py-4">
              <button
                type="button"
                className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                onClick={() => setEditTarget(null)}
              >Cancel</button>
              <button
                type="button"
                className={`${btnClass} bg-amber-500 text-white hover:bg-amber-600`}
                onClick={saveEdit}
              >Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
