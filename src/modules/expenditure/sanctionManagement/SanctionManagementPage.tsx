import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import type {
  ContractorSanctionRecord,
  ContractualAdvanceRecord,
  EmployeeImprestRecord,
  SanctionDocument,
  SanctionTab,
  SanctionValidationResult,
  SanctionType,
  SanctionCategory,
  SanctionStatus,
  AdvanceType,
} from "./types";
import {
  INITIAL_SANCTION,
  INITIAL_ADVANCE,
  INITIAL_IMPREST,
  MOCK_SANCTIONS,
  useSanctionMasterData,
  panelClass,
  headerClass,
  inputClass,
  lockedInputClass,
  labelClass,
  btnClass,
  ddBadge,
  brNote,
  statusColor,
  typeIcon,
  SANCTIONS_STORAGE_KEY,
  loadSanctions,
} from "./sanctionFlow";

export function SanctionManagementPage() {
  const { contractors } = useContractorData();
  const master = useSanctionMasterData();
  const [activeTab, setActiveTab] = useState<SanctionTab>("contractor-sanctions");
  const [sanctions, setSanctions] = useState<ContractorSanctionRecord[]>(loadSanctions);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SANCTIONS_STORAGE_KEY, JSON.stringify(sanctions));
      }
    } catch {
      /* localStorage may be unavailable in some contexts — ignore silently */
    }
  }, [sanctions]);
  const [editingSanction, setEditingSanction] = useState<ContractorSanctionRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  /* contractor sanction form */
  const [sanctionForm, setSanctionForm] = useState<ContractorSanctionRecord>(INITIAL_SANCTION);
  const updateSanction = useCallback(<K extends keyof ContractorSanctionRecord>(k: K, v: ContractorSanctionRecord[K]) => {
    setSanctionForm((p) => ({ ...p, [k]: v }));
  }, []);

  /* contractor search state */
  const [contractorSearch, setContractorSearch] = useState("");
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<{
    id: string;
    name: string;
    kind: string;
    type: string;
    category: string;
    nationality: string;
    status: string;
    taxNumber: string;
    registrationNumber: string;
    email: string;
    phone: string;
  } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowContractorDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* filtered contractors for search */
  const filteredContractors = useMemo(() => {
    if (!contractorSearch.trim()) return contractors;
    const q = contractorSearch.toLowerCase();
    return contractors.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.registrationNumber.toLowerCase().includes(q) ||
        c.taxNumber.toLowerCase().includes(q)
    );
  }, [contractors, contractorSearch]);

  const selectContractor = (c: typeof contractors[0]) => {
    setSelectedContractor({
      id: c.id,
      name: c.displayName,
      kind: c.kind,
      type: c.contractorType,
      category: c.category,
      nationality: c.nationality,
      status: c.status,
      taxNumber: c.taxNumber,
      registrationNumber: c.registrationNumber,
      email: c.email,
      phone: c.phone,
    });
    updateSanction("contractorId", c.id);
    updateSanction("contractorName", c.displayName);
    setContractorSearch(c.displayName);
    setShowContractorDropdown(false);
  };

  const clearContractor = () => {
    setSelectedContractor(null);
    updateSanction("contractorId", "");
    updateSanction("contractorName", "");
    setContractorSearch("");
  };

  /* advance form */
  const [advanceForm, setAdvanceForm] = useState<ContractualAdvanceRecord>(INITIAL_ADVANCE);
  const updateAdvance = useCallback(<K extends keyof ContractualAdvanceRecord>(k: K, v: ContractualAdvanceRecord[K]) => {
    setAdvanceForm((p) => ({ ...p, [k]: v }));
  }, []);

  /* imprest form */
  const [imprestForm, setImprestForm] = useState<EmployeeImprestRecord>(INITIAL_IMPREST);
  const updateImprest = useCallback(<K extends keyof EmployeeImprestRecord>(k: K, v: EmployeeImprestRecord[K]) => {
    setImprestForm((p) => ({ ...p, [k]: v }));
  }, []);

  /* ─── Contractor Sanction validation ─── */
  const sanctionValidation = useMemo<SanctionValidationResult[]>(() => {
    const f = sanctionForm;
    const r: SanctionValidationResult[] = [];
    r.push({ key: "contractor", label: "Contractor ID provided (DD 13.2)", passed: !!f.contractorId, message: f.contractorId ? `${f.contractorId} — ${f.contractorName}` : "Search and select a registered contractor", severity: "blocker" });
    r.push({ key: "type", label: "Sanction type selected (DD 13.3)", passed: !!f.sanctionType, message: f.sanctionType || "Suspension / Debarment / Warning", severity: "blocker" });
    r.push({ key: "start", label: "Start date set (DD 13.4)", passed: !!f.sanctionStartDate, message: f.sanctionStartDate || "DD/MM/YYYY", severity: "blocker" });
    r.push({ key: "reason", label: "Sanction reason (DD 13.7)", passed: f.sanctionReason.length > 5, message: f.sanctionReason ? "Provided" : "Required — justification", severity: "blocker" });
    r.push({ key: "category", label: "Sanction category (DD 13.8)", passed: !!f.sanctionCategory, message: f.sanctionCategory || "Financial / Contractual / Legal", severity: "blocker" });
    r.push({ key: "agencies", label: "Affected agencies (DD 13.9)", passed: f.affectedAgencies.length > 0, message: f.affectedAgencies.length > 0 ? f.affectedAgencies.join(", ") : "Select at least one", severity: "blocker" });
    r.push({ key: "sanctioning", label: "Sanctioning agency (DD 13.10)", passed: !!f.sanctioningAgency, message: f.sanctioningAgency || "Required — immutable after creation", severity: "blocker" });
    if (f.sanctionEndDate && f.sanctionStartDate) {
      r.push({ key: "date-order", label: "End date after start date", passed: f.sanctionEndDate >= f.sanctionStartDate, message: f.sanctionEndDate >= f.sanctionStartDate ? "Valid" : "End date must be after start date", severity: "blocker" });
    }
    if (selectedContractor && selectedContractor.status !== "Active and verified") {
      r.push({ key: "contractor-status", label: "Contractor status check", passed: false, message: `Contractor status is "${selectedContractor.status}" — only Active and verified contractors can be sanctioned`, severity: "blocker" });
    }
    r.push({ key: "docs", label: "Supporting documents (DD 13.11)", passed: f.supportingDocuments.length > 0, message: f.supportingDocuments.length > 0 ? `${f.supportingDocuments.length} document(s)` : "Optional but recommended", severity: "warning" });
    return r;
  }, [sanctionForm, selectedContractor]);

  const sanctionBlockers = sanctionValidation.filter((v) => v.severity === "blocker" && !v.passed);

  /* ─── Advance validation ─── */
  const advanceValidation = useMemo<SanctionValidationResult[]>(() => {
    const f = advanceForm;
    const r: SanctionValidationResult[] = [];
    r.push({ key: "contract", label: "Contract ID", passed: !!f.contractId, message: f.contractId || "Required", severity: "blocker" });
    r.push({ key: "type", label: "Advance type", passed: !!f.advanceType, message: f.advanceType || "Mobilization / Material / Secured", severity: "blocker" });
    r.push({ key: "amount", label: "Amount provided", passed: !!f.amount && parseFloat(f.amount) > 0, message: f.amount ? `BTN ${parseFloat(f.amount).toLocaleString("en-IN")}` : "Required", severity: "blocker" });
    r.push({ key: "contract-active", label: "Contract status = Active", passed: f.contractStatus === "Active", message: f.contractStatus || "Must be active", severity: "blocker" });
    if (f.advanceType === "Mobilization") {
      r.push({ key: "bg", label: "Bank Guarantee valid", passed: f.bankGuaranteeValid, message: f.bankGuaranteeValid ? "Valid BG attached" : "Mandatory — BG >= advance amount, issued by approved bank", severity: "blocker" });
      r.push({ key: "max10", label: "Amount <= 10% contract value", passed: !!f.maxAllowable && parseFloat(f.amount) <= parseFloat(f.maxAllowable), message: f.maxAllowable ? `Max: BTN ${f.maxAllowable}` : "Set contract value first", severity: "blocker" });
    }
    if (f.advanceType === "Material") {
      r.push({ key: "wip", label: "Work status = In Progress", passed: f.workStatus === "In Progress", message: f.workStatus || "Validated from eCMS", severity: "blocker" });
      r.push({ key: "site", label: "Site inspection report attached", passed: f.siteInspectionReport, message: f.siteInspectionReport ? "Attached" : "Physical verification required", severity: "blocker" });
      r.push({ key: "mat-site", label: "Material at approved site", passed: f.materialAtApprovedSite, message: f.materialAtApprovedSite ? "Confirmed" : "Must be at approved storage depot", severity: "blocker" });
    }
    if (f.advanceType === "Secured") {
      r.push({ key: "sec-docs", label: "Security & insurance docs", passed: f.securityDocuments, message: f.securityDocuments ? "Uploaded" : "Material security & insurance required", severity: "blocker" });
    }
    r.push({ key: "authority", label: "Sanctioning authority", passed: !!f.sanctioningAuthority, message: f.sanctioningAuthority || "Certified engineer / department head / agency head", severity: "blocker" });
    return r;
  }, [advanceForm]);

  /* ─── handlers ─── */
  const startNewSanction = () => {
    setIsCreating(true);
    setEditingSanction(null);
    setSelectedContractor(null);
    setContractorSearch("");
    setShowSuccess(false);
    setSanctionForm({ ...INITIAL_SANCTION, sanctionId: `SAN-${new Date().getFullYear()}-${String(sanctions.length + 1).padStart(4, "0")}` });
  };

  const saveSanction = () => {
    if (sanctionBlockers.length > 0) return;
    const now = new Date().toISOString().slice(0, 10);
    const newRecord: ContractorSanctionRecord = { ...sanctionForm, createdAt: now };
    setSanctions((prev) => [newRecord, ...prev]);
    setIsCreating(false);
    setSanctionForm(INITIAL_SANCTION);
    setSelectedContractor(null);
    setContractorSearch("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const addSupportingDoc = () => {
    const doc: SanctionDocument = {
      id: `doc-${Date.now()}`,
      label: "Supporting Evidence",
      fileName: `sanction_evidence_${Date.now().toString(36)}.pdf`,
      fileSize: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    updateSanction("supportingDocuments", [...sanctionForm.supportingDocuments, doc]);
  };

  const toggleAffectedAgency = (agency: string) => {
    const current = sanctionForm.affectedAgencies;
    if (agency === "All Agencies") {
      if (current.includes("All Agencies")) {
        updateSanction("affectedAgencies", []);
      } else {
        updateSanction("affectedAgencies", ["All Agencies"]);
      }
      return;
    }
    const filtered = current.filter((a) => a !== "All Agencies");
    const updated = filtered.includes(agency) ? filtered.filter((a) => a !== agency) : [...filtered, agency];
    updateSanction("affectedAgencies", updated);
  };

  const TABS: { key: SanctionTab; label: string; icon: string; description: string }[] = [
    { key: "contractor-sanctions", label: "Contractor Sanctions", icon: "\uD83D\uDEAB", description: "DD 13.0 — Suspension, Debarment, Warning" },
    { key: "advance-contractual", label: "Advance Sanctioning", icon: "\uD83D\uDCB0", description: "Process 15.1 — Mobilization, Material, Secured" },
    { key: "advance-imprest", label: "Employee Imprest", icon: "\uD83D\uDC64", description: "Process 15.2 — Official Imprest Advances" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ─── PAGE HEADER ─── */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400">EXPENDITURE — CONTRACT MANAGEMENT</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Sanction Management</h1>
        <p className="mt-1 text-sm text-slate-600">Contractor disciplinary sanctions (DD 13) and advance sanctioning (Process 15) — integrated with eGP, eCMS, IBLS, DRC</p>
      </div>

      {/* success toast */}
      {showSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 shadow-lg animate-pulse">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-emerald-900">Sanction created successfully</p>
            <p className="text-xs text-emerald-700">Sanction record has been added to the registry and is now active.</p>
          </div>
        </div>
      )}

      {/* ─── TAB NAV ─── */}
      <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`min-w-0 flex-1 rounded-[20px] px-4 py-3 text-left transition ${
              activeTab === tab.key ? "bg-amber-100 text-amber-900 shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="mr-2 text-lg">{tab.icon}</span>
            <span className="text-sm font-bold">{tab.label}</span>
            <p className={`mt-0.5 text-xs ${activeTab === tab.key ? "text-amber-800/80" : "text-slate-500"}`}>{tab.description}</p>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         TAB 1 — CONTRACTOR SANCTIONS (DD 13.0)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "contractor-sanctions" && (
        <div className="space-y-6">
          {/* existing sanctions list */}
          {!isCreating && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Active Sanctions Registry</h2>
                  <p className="text-xs text-slate-500">{sanctions.length} sanction(s) on record — {sanctions.filter(s => s.sanctionStatus === "Active").length} active</p>
                </div>
                <button type="button" className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`} onClick={startNewSanction}>
                  + New Sanction
                </button>
              </div>

              <section className={panelClass}>
                <div className="overflow-hidden rounded-[20px] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1180px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Contractor</th>
                          <th className="px-4 py-3">Sanction</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3">Dates</th>
                          <th className="px-4 py-3">Auto Reactivation</th>
                          <th className="px-4 py-3">Sanctioning Agency</th>
                          <th className="px-4 py-3">Affected Agencies</th>
                          <th className="px-4 py-3 text-right">Meta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {sanctions.map((s) => (
                          <tr key={s.sanctionId} className={s.sanctionStatus === "Active" ? "bg-sky-50/30" : "hover:bg-slate-50/70"}>
                            <td className="px-4 py-4">
                              <div className="flex items-start gap-3">
                                <span className="text-lg">{typeIcon(s.sanctionType)}</span>
                                <div>
                                  <p className="font-bold text-slate-800">{s.contractorName}</p>
                                  <p className="text-xs text-slate-500">{s.sanctionId} — {s.contractorId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusColor(s.sanctionStatus)}`}>{s.sanctionStatus}</span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{s.sanctionType}</span>
                                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">{s.sanctionCategory}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-600">{s.sanctionReason}</td>
                            <td className="px-4 py-4 text-xs text-slate-600">
                              <div className="space-y-1">
                                <p>Start: {s.sanctionStartDate}</p>
                                <p>End: {s.sanctionEndDate || "Indefinite"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-600">{s.autoReactivation === "Y" ? "Yes" : "No"}</td>
                            <td className="px-4 py-4 text-xs text-slate-600">{s.sanctioningAgency}</td>
                            <td className="px-4 py-4">
                              <div className="flex max-w-[240px] flex-wrap gap-1">
                                {s.affectedAgencies.map((a) => (
                                  <span key={a} className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{a}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right text-xs text-slate-400">
                              <p>Created: {s.createdAt}</p>
                              {s.supportingDocuments.length > 0 && <p>{s.supportingDocuments.length} doc(s)</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* CREATE / EDIT SANCTION FORM — Form 4: Suspension of Contractor */}
          {isCreating && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Form 4: Suspension / Sanction of Contractor in IFMIS</h2>
                  <p className="text-xs text-slate-500 mt-1">PRN 1.3 — Contractor Sanction — applies to both Individual and Business contractors</p>
                </div>
                <button type="button" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={() => { setIsCreating(false); clearContractor(); }}>
                  Cancel
                </button>
              </div>

              {/* ─── STEP 1: CONTRACTOR LOOKUP ─── */}
              <section className={panelClass}>
                <div className={headerClass}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-xl text-white font-bold">1</div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-slate-800">CONTRACTOR IDENTIFICATION</h2>
                      <p className="mt-1 text-xs text-slate-500">DD 13.2 — Search by Contractor ID, Name, TPN, or BRN — supports both Individual and Business contractors</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-4">
                  {/* search */}
                  <div ref={searchRef} className="relative">
                    <label className={labelClass}>
                      <div className="flex items-center gap-3">
                        <span>Search Contractor <span className="text-[#d32f2f]">*</span></span>
                        <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.2</span>
                        {contractors.length === 0 && <span className="rounded-full bg-amber-100 px-3 py-0.5 text-[10px] font-semibold text-amber-700">No contractors registered yet — register one first</span>}
                      </div>
                      <div className="relative">
                        <input
                          className={`${inputClass} pr-20`}
                          value={contractorSearch}
                          onChange={(e) => {
                            setContractorSearch(e.target.value);
                            setShowContractorDropdown(true);
                            if (!e.target.value) clearContractor();
                          }}
                          onFocus={() => setShowContractorDropdown(true)}
                          placeholder="Type contractor name, ID, TPN, or BRN..."
                          disabled={!!selectedContractor}
                        />
                        {selectedContractor && (
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-300"
                            onClick={clearContractor}
                          >
                            Change
                          </button>
                        )}
                      </div>
                    </label>
                    {brNote("Must reference a valid registered contractor — immutable after sanction creation")}

                    {/* dropdown */}
                    {showContractorDropdown && !selectedContractor && (
                      <div className="absolute z-50 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[320px] overflow-y-auto">
                        {filteredContractors.length === 0 && (
                          <div className="px-5 py-6 text-center">
                            <p className="text-sm text-slate-500">{contractors.length === 0 ? "No contractors registered in the system" : "No matching contractors found"}</p>
                            <p className="mt-1 text-xs text-slate-400">{contractors.length === 0 ? "Register a contractor under Contractor menu first" : "Try a different search term"}</p>
                          </div>
                        )}
                        {filteredContractors.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full border-b border-slate-100 px-5 py-3 text-left transition hover:bg-slate-50 last:border-0"
                            onClick={() => selectContractor(c)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{c.displayName}</p>
                                <p className="text-xs text-slate-500">{c.id} — {c.kind === "individual" ? "Individual" : "Business"} — {c.contractorType}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.kind === "individual" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                                  {c.kind === "individual" ? "Individual" : "Business"}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "Active and verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  {c.status}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* selected contractor detail card */}
                  {selectedContractor && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white ${selectedContractor.kind === "individual" ? "bg-blue-500" : "bg-purple-500"}`}>
                          {selectedContractor.kind === "individual" ? "\uD83D\uDC64" : "\uD83C\uDFE2"}
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-800">{selectedContractor.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedContractor.kind === "individual" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {selectedContractor.kind === "individual" ? "Individual Contractor" : "Business Contractor"}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedContractor.status === "Active and verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {selectedContractor.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3 text-xs">
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                          <p className="text-slate-400 font-semibold">Contractor ID</p>
                          <p className="font-bold text-slate-700 mt-0.5">{selectedContractor.id}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                          <p className="text-slate-400 font-semibold">Type / Category</p>
                          <p className="font-bold text-slate-700 mt-0.5">{selectedContractor.type} — {selectedContractor.category}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                          <p className="text-slate-400 font-semibold">Nationality</p>
                          <p className="font-bold text-slate-700 mt-0.5">{selectedContractor.nationality}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                          <p className="text-slate-400 font-semibold">{selectedContractor.kind === "individual" ? "CID / Passport" : "BRN"}</p>
                          <p className="font-bold text-slate-700 mt-0.5">{selectedContractor.registrationNumber || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                          <p className="text-slate-400 font-semibold">TPN</p>
                          <p className="font-bold text-slate-700 mt-0.5">{selectedContractor.taxNumber || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                          <p className="text-slate-400 font-semibold">Contact</p>
                          <p className="font-bold text-slate-700 mt-0.5">{selectedContractor.email || selectedContractor.phone || "—"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ─── STEP 2: SANCTION DETAILS ─── */}
              <section className={panelClass}>
                <div className={headerClass}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-xl text-white font-bold">2</div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-slate-900">SANCTION DETAILS</h2>
                      <p className="mt-1 text-xs text-slate-500">DD 13.1–13.12 — Contractor Sanction record fields — PRN 1.3</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                  {/* 13.1 Sanction ID */}
                  <label className={labelClass}>
                    <div className="flex items-center gap-3"><span>Sanction ID</span><span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.1</span><span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">Auto-Generated</span></div>
                    <input className={lockedInputClass} value={sanctionForm.sanctionId || "System Generated"} readOnly />
                    {brNote("Auto-generated upon successful validation of all required data fields")}
                  </label>

                  {/* 13.3 Sanction Type */}
                  <label className={labelClass}>
                    <div className="flex items-center gap-3"><span>Sanction Type <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-600">LoV 6.4</span></div>
                    <select className={inputClass} value={sanctionForm.sanctionType} onChange={(e) => {
                      const v = e.target.value as SanctionType;
                      updateSanction("sanctionType", v);
                      if (v === "Warning") updateSanction("suspensionCategory", "");
                    }}>
                      <option value="">-- Select --</option>
                      {master.sanctionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {brNote("Suspension / Debarment / Warning — immutable after creation")}
                  </label>

                  {/* 13.4 Start Date */}
                  <label className={labelClass}>
                    <div className="flex items-center gap-3"><span>Sanction Start Date <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.4</span></div>
                    <input className={inputClass} type="date" value={sanctionForm.sanctionStartDate} onChange={(e) => updateSanction("sanctionStartDate", e.target.value)} />
                    {brNote("Effective date — immutable after creation")}
                  </label>

                  {/* 13.5 End Date */}
                  <label className={labelClass}>
                    <div className="flex items-center gap-3"><span>Sanction End Date</span><span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.5</span></div>
                    <input className={inputClass} type="date" value={sanctionForm.sanctionEndDate} onChange={(e) => updateSanction("sanctionEndDate", e.target.value)} />
                    {brNote("Optional for open-ended sanctions — amendable")}
                  </label>

                  {/* 13.6 Auto Reactivation */}
                  <label className={labelClass}>
                    <div className="flex items-center gap-3"><span>Auto Reactivation <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-600">LoV 6.1</span></div>
                    <div className="mt-2 flex gap-5">
                      {/* boolean-choice master group: first entry = Yes (Y), second = No (N).
                          We keep the persisted value as the strict "Y" | "N" union so
                          downstream reporting and filters stay type-safe, but the display
                          label is admin-editable via the master-data admin page. */}
                      {(["Y", "N"] as const).map((opt, idx) => (
                        <label key={opt} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="auto-react" checked={sanctionForm.autoReactivation === opt} onChange={() => updateSanction("autoReactivation", opt)} className="accent-[#d32f2f]" />
                          {master.booleanChoices[idx] ?? (opt === "Y" ? "Yes" : "No")}
                        </label>
                      ))}
                    </div>
                    {brNote("Controls automatic reinstatement after sanction end date — amendable")}
                  </label>

                  {/* 13.8 Category */}
                  <label className={labelClass}>
                    <div className="flex items-center gap-3"><span>Sanction Category <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-600">LoV 6.2</span></div>
                    <select className={inputClass} value={sanctionForm.sanctionCategory} onChange={(e) => updateSanction("sanctionCategory", e.target.value as SanctionCategory)}>
                      <option value="">-- Select --</option>
                      {master.sanctionCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {brNote("Financial / Contractual / Legal grounds — amendable")}
                  </label>

                  {/* LoV 6.2 Suspension Category */}
                  {(sanctionForm.sanctionType === "Suspension" || sanctionForm.sanctionType === "Debarment") && (
                    <label className={labelClass}>
                      <div className="flex items-center gap-3"><span>Suspension Category</span><span className="ml-1.5 rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-600">LoV 6.2</span></div>
                      <select className={inputClass} value={sanctionForm.suspensionCategory} onChange={(e) => updateSanction("suspensionCategory", e.target.value as ContractorSanctionRecord["suspensionCategory"])}>
                        <option value="">-- Select --</option>
                        {master.suspensionCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {brNote("Temporary Suspension / Permanent Suspension")}
                    </label>
                  )}

                  {/* 13.12 Sanction Status */}
                  <label className={labelClass}>
                    <div className="flex items-center gap-3"><span>Sanction Status <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.12</span></div>
                    <select className={inputClass} value={sanctionForm.sanctionStatus} onChange={(e) => updateSanction("sanctionStatus", e.target.value as SanctionStatus)}>
                      {master.sanctionStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {brNote("Active / Lifted / Expired — amendable")}
                  </label>

                  {/* 13.7 Reason */}
                  <label className={`${labelClass} md:col-span-2`}>
                    <div className="flex items-center gap-3"><span>Sanction Reason <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.7</span></div>
                    <textarea className={`${inputClass} min-h-[100px]`} value={sanctionForm.sanctionReason} onChange={(e) => updateSanction("sanctionReason", e.target.value)} placeholder="Detailed justification, decision basis, or disciplinary reference" />
                    {brNote("Justification for the sanction action — amendable")}
                  </label>
                </div>
              </section>

              {/* ─── STEP 3: AGENCIES & DOCUMENTS ─── */}
              <section className={panelClass}>
                <div className={headerClass}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-xl text-white font-bold">3</div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-slate-800">AGENCIES & SUPPORTING DOCUMENTS</h2>
                      <p className="mt-1 text-xs text-slate-500">DD 13.9–13.11 — Affected agencies, sanctioning authority, and evidence</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-6 space-y-5">
                  {/* 13.9 Affected Agencies */}
                  <div className={labelClass}>
                    <div className="flex items-center gap-3"><span>Affected Agencies <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-600">LoV 6.3</span></div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {master.affectedAgencies.map((a) => {
                        const selected = sanctionForm.affectedAgencies.includes(a) || (a !== "All Agencies" && sanctionForm.affectedAgencies.includes("All Agencies"));
                        return (
                          <button
                            key={a}
                            type="button"
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected ? "border-[#2563eb] bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}
                            onClick={() => toggleAffectedAgency(a)}
                          >
                            {selected && "\u2713 "}{a}
                          </button>
                        );
                      })}
                    </div>
                    {brNote("List of agency IDs impacted by this sanction — amendable")}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {/* 13.10 Sanctioning Agency */}
                    <label className={labelClass}>
                      <div className="flex items-center gap-3"><span>Sanctioning Agency <span className="text-[#d32f2f]">*</span></span><span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.10</span></div>
                      <select className={inputClass} value={sanctionForm.sanctioningAgency} onChange={(e) => updateSanction("sanctioningAgency", e.target.value)}>
                        <option value="">-- Select sanctioning authority --</option>
                        {master.sanctioningAgencies.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                      {brNote("Authority responsible for sanction — immutable after creation")}
                    </label>

                    {/* placeholder for layout */}
                    <div />
                  </div>

                  {/* 13.11 Supporting Documents */}
                  <div className={labelClass}>
                    <div className="flex items-center gap-3"><span>Supporting Documents</span><span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 13.11</span></div>
                    <div className="mt-2 space-y-2">
                      {sanctionForm.supportingDocuments.map((doc, i) => (
                        <div key={doc.id} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <span className="text-lg">{"\uD83D\uDCCE"}</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">{doc.label} {i + 1}</p>
                            <p className="text-xs text-slate-500">{doc.fileName} — {doc.fileSize} — {doc.uploadedAt}</p>
                          </div>
                          <button
                            type="button"
                            className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                            onClick={() => updateSanction("supportingDocuments", sanctionForm.supportingDocuments.filter(d => d.id !== doc.id))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button type="button" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100" onClick={addSupportingDoc}>
                        + Upload Document
                      </button>
                    </div>
                    {brNote("Optional — evidence, approval note, or disciplinary records")}
                  </div>
                </div>
              </section>

              {/* ─── STEP 4: VALIDATION CHECKLIST ─── */}
              <section className={panelClass}>
                <div className={headerClass}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white font-bold">4</div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight text-slate-800">VALIDATION CHECKLIST</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {sanctionBlockers.length === 0 ? "All validations passed — ready to create" : `${sanctionBlockers.length} blocker(s) remaining`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 px-6 py-6">
                  {sanctionValidation.map((v) => (
                    <div key={v.key} className={`flex items-start gap-3 rounded-2xl border px-5 py-3 ${v.passed ? "border-emerald-200 bg-emerald-50" : v.severity === "blocker" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                      <span className="mt-0.5 text-lg">{v.passed ? "\u2705" : v.severity === "blocker" ? "\uD83D\uDEAB" : "\u26A0\uFE0F"}</span>
                      <div>
                        <p className={`text-sm font-bold ${v.passed ? "text-emerald-800" : v.severity === "blocker" ? "text-red-800" : "text-amber-800"}`}>{v.label}</p>
                        <p className={`text-xs ${v.passed ? "text-emerald-600" : v.severity === "blocker" ? "text-red-600" : "text-amber-600"}`}>{v.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-end gap-3">
                <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => { setIsCreating(false); clearContractor(); }}>Cancel</button>
                <button
                  type="button"
                  className={`${btnClass} ${sanctionBlockers.length > 0 ? "cursor-not-allowed bg-slate-300 text-slate-500" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"}`}
                  disabled={sanctionBlockers.length > 0}
                  onClick={saveSanction}
                >
                  {sanctionBlockers.length > 0 ? `Create Sanction (${sanctionBlockers.length} blockers)` : "\u2713 Create Sanction"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         TAB 2 — CONTRACTUAL ADVANCE SANCTIONING (Process 15.1)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "advance-contractual" && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">{"\uD83D\uDCB0"}</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">CONTRACTUAL ADVANCE SANCTIONING</h2>
                  <p className="mt-1 text-sm text-slate-600">Process 15.1 — Create, validate, and approve contractual advances (Mobilization, Material, Secured)</p>
                  <p className="mt-1 text-xs text-slate-400">Integrated with eCMS for approved advance details — Actors: Agency staff / triggered by CMS and eGP</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                <p className="text-sm font-bold text-sky-900">Step 1: Create Contract Advances</p>
                <p className="mt-1 text-xs text-sky-700">System integrated with eCMS — only WORKS contracts with ACTIVE status eligible</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <label className={labelClass}>
                  <span>Contract ID <span className="text-[#d32f2f]">*</span></span>
                  <input className={inputClass} value={advanceForm.contractId} onChange={(e) => updateAdvance("contractId", e.target.value)} placeholder="From eCMS" />
                </label>
                <label className={labelClass}>
                  <span>Contractor ID <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 10.1</span></span>
                  <input className={inputClass} value={advanceForm.contractorId} onChange={(e) => updateAdvance("contractorId", e.target.value)} placeholder="Auto-fetch" />
                </label>
                <label className={labelClass}>
                  <span>Agency ID</span>
                  <input className={inputClass} value={advanceForm.agencyId} onChange={(e) => updateAdvance("agencyId", e.target.value)} placeholder="Implementing agency" />
                </label>
                <label className={labelClass}>
                  <span>Contract Status <span className="text-[#d32f2f]">*</span></span>
                  <select className={inputClass} value={advanceForm.contractStatus} onChange={(e) => updateAdvance("contractStatus", e.target.value)}>
                    <option value="">-- Validate --</option>
                    {master.contractStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className={labelClass}>
                  <span>UCoA Level <span className="ml-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">UCoA</span></span>
                  <select
                    className={inputClass}
                    value={advanceForm.ucoaLevel}
                    onChange={(e) => updateAdvance("ucoaLevel", e.target.value)}
                  >
                    <option value="">-- Select Level --</option>
                    {master.ucoaLevels.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Advance Type <span className="text-[#d32f2f]">*</span></span>
                  <select className={inputClass} value={advanceForm.advanceType} onChange={(e) => {
                    const v = e.target.value as AdvanceType;
                    updateAdvance("advanceType", v);
                    if (v === "Mobilization") updateAdvance("maxAllowable", String(parseFloat(advanceForm.amount || "0") * 10));
                  }}>
                    <option value="">-- Select --</option>
                    {master.advanceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Amount (BTN) <span className="text-[#d32f2f]">*</span></span>
                  <input className={inputClass} type="number" value={advanceForm.amount} onChange={(e) => updateAdvance("amount", e.target.value)} placeholder="0.00" />
                </label>
                <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>
                  <span>Purpose</span>
                  <input className={inputClass} value={advanceForm.purpose} onChange={(e) => updateAdvance("purpose", e.target.value)} placeholder="Purpose of advance request" />
                </label>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-bold text-amber-900">Step 3: Advance Sanctioning Validation Control</p>
              </div>

              {advanceForm.advanceType === "Mobilization" && (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
                  <h3 className="col-span-full text-sm font-bold text-slate-800">Mobilization Advance — 10% of contract value, after award, with Bank Guarantee</h3>
                  <label className={labelClass}>
                    <span>10% Max Allowable (BTN)</span>
                    <input className={inputClass} value={advanceForm.maxAllowable} onChange={(e) => updateAdvance("maxAllowable", e.target.value)} placeholder="Auto-calculate" />
                  </label>
                  <label className={labelClass}>
                    <span>Bank Guarantee Reference</span>
                    <input className={inputClass} value={advanceForm.bankGuaranteeRef} onChange={(e) => updateAdvance("bankGuaranteeRef", e.target.value)} placeholder="BG number" />
                  </label>
                  <label className={labelClass}>
                    <span>Bank Guarantee Amount</span>
                    <input className={inputClass} type="number" value={advanceForm.bankGuaranteeAmount} onChange={(e) => updateAdvance("bankGuaranteeAmount", e.target.value)} placeholder="Must be >= advance amount" />
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" checked={advanceForm.bankGuaranteeValid} onChange={(e) => updateAdvance("bankGuaranteeValid", e.target.checked)} />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                    <span className="text-sm font-semibold text-slate-700">BG Valid (issued by approved bank, valid until full recovery)</span>
                  </div>
                </div>
              )}

              {advanceForm.advanceType === "Material" && (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
                  <h3 className="col-span-full text-sm font-bold text-slate-800">Material Advance — During work-in-progress, physical verification required</h3>
                  <label className={labelClass}>
                    <span>Work Status</span>
                    <select className={inputClass} value={advanceForm.workStatus} onChange={(e) => updateAdvance("workStatus", e.target.value)}>
                      <option value="">-- From eCMS --</option>
                      {master.workStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Physical Progress %</span>
                    <input className={inputClass} type="number" value={advanceForm.physicalProgressPercent} onChange={(e) => updateAdvance("physicalProgressPercent", e.target.value)} placeholder="Min % required" />
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={advanceForm.siteInspectionReport} onChange={(e) => updateAdvance("siteInspectionReport", e.target.checked)} className="accent-[#d32f2f]" />
                    <span className="text-sm text-slate-700">Site inspection report attached</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={advanceForm.materialAtApprovedSite} onChange={(e) => updateAdvance("materialAtApprovedSite", e.target.checked)} className="accent-[#d32f2f]" />
                    <span className="text-sm text-slate-700">Material at approved storage site/depot</span>
                  </div>
                </div>
              )}

              {advanceForm.advanceType === "Secured" && (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
                  <h3 className="col-span-full text-sm font-bold text-slate-800">Secured Advance — Against secured and verified materials at site</h3>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={advanceForm.securityDocuments} onChange={(e) => updateAdvance("securityDocuments", e.target.checked)} className="accent-[#d32f2f]" />
                    <span className="text-sm text-slate-700">Material security & insurance documents uploaded</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={advanceForm.verificationCertificate} onChange={(e) => updateAdvance("verificationCertificate", e.target.checked)} className="accent-[#d32f2f]" />
                    <span className="text-sm text-slate-700">Verification certificate attached (if available)</span>
                  </div>
                </div>
              )}

              <label className={labelClass}>
                <span>Sanctioning Authority <span className="text-[#d32f2f]">*</span></span>
                <input className={inputClass} value={advanceForm.sanctioningAuthority} onChange={(e) => updateAdvance("sanctioningAuthority", e.target.value)} placeholder="Competent engineer / head of department / agency head" />
                {brNote("Must be certified by competent engineers/head of departments/agency")}
              </label>

              <section className={panelClass}>
                <div className={headerClass}><h2 className="text-lg font-bold text-slate-900">Step 4: Advance Sanctioning — Validation</h2></div>
                <div className="space-y-2 px-6 py-6">
                  {advanceValidation.map((v) => (
                    <div key={v.key} className={`flex items-start gap-3 rounded-2xl border px-5 py-3 ${v.passed ? "border-emerald-200 bg-emerald-50" : v.severity === "blocker" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                      <span className="mt-0.5">{v.passed ? "\u2705" : "\uD83D\uDEAB"}</span>
                      <div>
                        <p className={`text-sm font-bold ${v.passed ? "text-emerald-800" : "text-red-800"}`}>{v.label}</p>
                        <p className={`text-xs ${v.passed ? "text-emerald-600" : "text-red-600"}`}>{v.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-sm font-bold text-slate-700">Step 6: POST Advance Adjustment</p>
                <p className="mt-1 text-xs text-slate-600">Advances taken by contractors are adjusted against the Running Account Bill (RAB) — ContractID, ContractorID, AgencyCode</p>
                <p className="mt-1 text-xs text-slate-600">Payment order creation and intimation to Cash Management</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         TAB 3 — EMPLOYEE IMPREST (Process 15.2)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "advance-imprest" && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">{"\uD83D\uDC64"}</div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">NON-CONTRACTUAL ADVANCES — EMPLOYEE IMPREST</h2>
                <p className="mt-1 text-sm text-slate-600">Process 15.2 — Official imprest advances to public officials for operational purposes</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
              <p className="text-sm font-bold text-sky-900">Step 1: Create Official Imprest Advances</p>
              <p className="mt-1 text-xs text-sky-700">Search by CID / Employee ID — check: Active, eligible for imprest, display designation and payroll department</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <label className={labelClass}>
                <span>Employee ID / CID <span className="text-[#d32f2f]">*</span></span>
                <input className={inputClass} value={imprestForm.employeeId} onChange={(e) => updateImprest("employeeId", e.target.value)} placeholder="Search from employee master" />
              </label>
              <label className={labelClass}>
                <span>Employee Name</span>
                <input className={lockedInputClass} value={imprestForm.employeeName} readOnly placeholder="Auto-populated" />
              </label>
              <label className={labelClass}>
                <span>Designation</span>
                <input className={lockedInputClass} value={imprestForm.designation} readOnly placeholder="For advance ceiling" />
              </label>
              <label className={labelClass}>
                <span>Agency Code</span>
                <input className={inputClass} value={imprestForm.agencyCode} onChange={(e) => updateImprest("agencyCode", e.target.value)} placeholder="Payroll department" />
              </label>
              <label className={labelClass}>
                <span>Amount (BTN) <span className="text-[#d32f2f]">*</span></span>
                <input className={inputClass} type="number" value={imprestForm.amount} onChange={(e) => updateImprest("amount", e.target.value)} placeholder="0.00" />
              </label>
              <label className={labelClass}>
                <span>Ceiling Limit</span>
                <input className={lockedInputClass} value={imprestForm.ceilingLimit} readOnly placeholder="Based on designation/category" />
              </label>
              <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>
                <span>Purpose <span className="text-[#d32f2f]">*</span></span>
                <input className={inputClass} value={imprestForm.purpose} onChange={(e) => updateImprest("purpose", e.target.value)} placeholder="Purpose and category" />
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-bold text-amber-900">Step 4: Advance Sanctioning — System Validation</p>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Previous imprest settled", checked: imprestForm.previousImprestSettled, key: "previousImprestSettled" as const },
                  { label: "Approved budget availability", checked: imprestForm.budgetAvailable, key: "budgetAvailable" as const },
                  { label: "Commitment linkage verified", checked: imprestForm.commitmentLinked, key: "commitmentLinked" as const },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <input type="checkbox" checked={item.checked} onChange={(e) => updateImprest(item.key, e.target.checked)} className="accent-[#d32f2f]" />
                    <span className={`text-sm ${item.checked ? "font-semibold text-emerald-700" : "text-slate-600"}`}>{item.label}</span>
                    {item.checked && <span className="text-xs text-emerald-500">{"\u2713"} Validated</span>}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-bold text-slate-700">Decision:</span>
                <span className={`rounded-full px-4 py-1 text-xs font-bold ${imprestForm.previousImprestSettled && imprestForm.budgetAvailable && imprestForm.commitmentLinked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {imprestForm.previousImprestSettled && imprestForm.budgetAvailable && imprestForm.commitmentLinked ? "APPROVED" : "HOLD"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-bold text-slate-700">Step 5: Transactions & Payment Order</p>
              <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                <p>1. Initiation — Employee requests imprest via system</p>
                <p>2. Review — Agency Finance</p>
                <p>3. Approval — Head of Agency</p>
                <p>4. Payment — Cash Management component</p>
              </div>
              <p className="mt-2 text-xs font-semibold text-amber-700">NOTE: The imprest advance shall not hit payroll</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-bold text-slate-700">Step 6: POST Advance Adjustment</p>
              <p className="mt-1 text-xs text-slate-600">Imprest advances adjusted upon production of invoices/bills — application of taxes if applicable</p>
              <div className="mt-2 text-xs text-slate-600">
                <p>Against EmployeeId, BudgetId, AgencyCode:</p>
                <p className="mt-1">Fractions → Whole sum → Balance liquidated by surrendering cash balance (cash in hand)</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Report Reference ─── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-sm font-bold text-slate-700">Report No. 105 — Contractor Status</p>
        <p className="mt-1 text-xs text-slate-600">List of contractor status for works/supplies awarded but contractor is debarred — sourced from eGP, eCMS, ACC, DRC, DoT, CDB</p>
      </div>
    </div>
  );
}
