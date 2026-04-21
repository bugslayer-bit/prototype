import { useState, useMemo, useEffect, useRef } from "react";
import type {
  ContractForExtension,
  ExtensionFormState,
  ExtensionValidation,
} from "./types";
import { getWorkflowConfigForModule, buildWorkflowRuntime, EXPENDITURE_MODULE_KEYS } from "../../../shared/workflow";
import { useContractData, type StoredContract } from "../../../shared/context/ContractDataContext";
import {
  storedToContractForExtension,
  buildStoredMap,
  MOCK_CONTRACTS,
  panelClass,
  headerClass,
  inputClass,
  lockedClass,
  labelClass,
  btnClass,
  ddTag,
  brTag,
  pdTag,
  SelectedContractSummary,
  ContractFullDetails,
} from "./extensionFlow";

/* ── Build dynamic approval steps for Contract Extension from workflow engine ── */
function buildExtensionApprovalSteps(): ExtensionFormState["approvalSteps"] {
  const config = getWorkflowConfigForModule(EXPENDITURE_MODULE_KEYS.CONTRACT_EXTENSION);
  if (!config) return [];
  const runtime = buildWorkflowRuntime(config);
  return runtime.map((step) => ({
    role: step.role,
    status: "pending" as const,
    approverName: "",
    timestamp: "",
    remarks: "",
  }));
}

type Step = 1 | 2 | 3 | 4 | 5;

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export function ContractExtensionPage() {
  const [step, setStep] = useState<Step>(1);
  const [contractSearch, setContractSearch] = useState("");
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractForExtension | null>(null);
  /* Side-channel link to the original StoredContract so we can render the
     full dynamic snapshot (every field) when a real contract is picked. */
  const [selectedStored, setSelectedStored] = useState<StoredContract | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  /* ── Pull live contracts from shared context ──────────────────────────
     Every other expenditure module (Creation, Lifecycle, Amendment) reads
     the same ContractDataContext. Extension now does too — so selecting a
     contract here shows the SAME data that was captured at creation. */
  const { contracts: storedContracts } = useContractData();
  const storedMap = useMemo(() => buildStoredMap(storedContracts), [storedContracts]);
  const CONTRACTS: ContractForExtension[] = useMemo(() => {
    const adapted = storedContracts.map(storedToContractForExtension);
    /* Merge mock fallbacks in for demo purposes only if their IDs don't
       collide with a real contract. */
    const existing = new Set(adapted.map((c) => c.id));
    const merged = [...adapted];
    for (const m of MOCK_CONTRACTS) {
      if (!existing.has(m.id)) merged.push(m);
    }
    return merged;
  }, [storedContracts]);

  const [form, setForm] = useState<ExtensionFormState>({
    extensionId: `EXT-${Date.now().toString(36).toUpperCase()}`,
    contractId: "",
    newEndDate: "",
    extensionDays: 0,
    extensionJustification: "",
    multiYearImplication: false,
    milestoneAdjustments: [],
    documents: [
      { id: "d1", label: "Variation Order Document", fileName: "", fileSize: "", uploadedAt: "", mandatory: true, uploaded: false },
      { id: "d2", label: "Approval Authority Document", fileName: "", fileSize: "", uploadedAt: "", mandatory: true, uploaded: false },
      { id: "d3", label: "Time Extension Justification Letter", fileName: "", fileSize: "", uploadedAt: "", mandatory: true, uploaded: false },
      { id: "d4", label: "Revised Work Schedule", fileName: "", fileSize: "", uploadedAt: "", mandatory: false, uploaded: false },
    ],
    status: "draft",
    approvalSteps: buildExtensionApprovalSteps(),
    submittedAt: "",
    approvedAt: "",
    versionNumber: 1,
  });

  const updateForm = <K extends keyof ExtensionFormState>(k: K, v: ExtensionFormState[K]) => setForm(p => ({ ...p, [k]: v }));

  /* Search — runs against the merged dynamic list */
  const filteredContracts = useMemo(() => {
    if (!contractSearch.trim()) return CONTRACTS;
    const q = contractSearch.toLowerCase();
    return CONTRACTS.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.contractorName.toLowerCase().includes(q) ||
      c.agencyName.toLowerCase().includes(q) ||
      c.budgetCode.toLowerCase().includes(q)
    );
  }, [contractSearch, CONTRACTS]);

  const selectContract = (c: ContractForExtension) => {
    setSelectedContract(c);
    setSelectedStored(storedMap[c.id] || null);
    setContractSearch("");
    setShowContractDropdown(false);
    updateForm("contractId", c.id);
    updateForm("milestoneAdjustments", c.milestones.filter(m => m.status !== "Paid").map(m => ({
      milestoneId: m.id, originalDate: m.estimatedDate, newDate: "", adjusted: false,
    })));
  };

  /* Compute extension days */
  useEffect(() => {
    if (form.newEndDate && selectedContract) {
      const orig = new Date(selectedContract.endDate);
      const ext = new Date(form.newEndDate);
      const diff = Math.ceil((ext.getTime() - orig.getTime()) / (1000 * 60 * 60 * 24));
      updateForm("extensionDays", diff);
      /* Multi-year check */
      const origYear = orig.getFullYear();
      const extYear = ext.getFullYear();
      if (extYear > origYear && !selectedContract.multiYear) {
        updateForm("multiYearImplication", true);
      } else {
        updateForm("multiYearImplication", false);
      }
    }
  }, [form.newEndDate, selectedContract]);

  /* Validation engine */
  const validations = useMemo<ExtensionValidation[]>(() => {
    if (!selectedContract || !form.newEndDate) return [];
    const lastUnpaidMilestone = selectedContract.milestones.filter(m => m.status !== "Paid").sort((a, b) => new Date(b.estimatedDate).getTime() - new Date(a.estimatedDate).getTime())[0];
    return [
      { id: "v-active", check: "Contract status is Active", pass: selectedContract.status === "Active", source: "IFMIS", ref: "PD Row 29" },
      { id: "v-end-gt-milestone", check: "New end date >= last unpaid milestone date", pass: lastUnpaidMilestone ? new Date(form.newEndDate) >= new Date(lastUnpaidMilestone.estimatedDate) : true, source: "IFMIS", ref: "PD Row 29" },
      { id: "v-end-gt-current", check: "New end date > current end date", pass: new Date(form.newEndDate) > new Date(selectedContract.endDate), source: "IFMIS", ref: "PD Row 29" },
      { id: "v-policy", check: "Extension period allowed under policy", pass: form.extensionDays > 0 && form.extensionDays <= 730, source: "IFMIS", ref: "PD Row 29" },
      { id: "v-multi-year", check: selectedContract.multiYear ? "Multi-year commitment exists" : "No multi-year implication (single FY)", pass: selectedContract.multiYear || !form.multiYearImplication, source: "IFMIS", ref: "PD Row 29" },
      { id: "v-justification", check: "Extension justification provided", pass: form.extensionJustification.trim().length > 10, source: "User", ref: "PD Row 31" },
      { id: "v-docs", check: "All mandatory documents uploaded", pass: form.documents.filter(d => d.mandatory).every(d => d.uploaded), source: "User", ref: "PD Row 31" },
    ];
  }, [selectedContract, form]);

  const allPassed = validations.length > 0 && validations.every(v => v.pass);
  const failedCount = validations.filter(v => !v.pass).length;

  /* Auto-validation animation for Step 3 */
  const [validating, setValidating] = useState(false);
  const [validationStep, setValidationStep] = useState(-1);
  const [validationComplete, setValidationComplete] = useState(false);
  const validationTriggered = useRef(false);

  useEffect(() => {
    if (step === 3 && validations.length > 0 && !validationTriggered.current) {
      validationTriggered.current = true;
      setValidating(true);
      setValidationStep(0);
      let idx = 0;
      const run = () => {
        if (idx >= validations.length) {
          setValidating(false);
          setValidationComplete(true);
          return;
        }
        setValidationStep(idx);
        idx++;
        setTimeout(run, 500 + Math.random() * 400);
      };
      setTimeout(run, 400);
    }
  }, [step, validations]);

  useEffect(() => {
    if (step !== 3) {
      validationTriggered.current = false;
      setValidating(false);
      setValidationStep(-1);
      setValidationComplete(false);
    }
  }, [step]);

  /* Approval workflow animation for Step 4 */
  const [approvalIdx, setApprovalIdx] = useState(-1);
  const [approvalComplete, setApprovalComplete] = useState(false);
  const approvalTriggered = useRef(false);

  useEffect(() => {
    if (step === 4 && allPassed && !approvalTriggered.current) {
      approvalTriggered.current = true;
      setApprovalIdx(0);
      let idx = 0;
      const stepsToRun = form.multiYearImplication ? 3 : 2; /* Skip budget review if not multi-year */
      const run = () => {
        if (idx >= stepsToRun) {
          setApprovalComplete(true);
          setForm(p => ({
            ...p,
            status: "approved",
            approvedAt: new Date().toISOString(),
            approvalSteps: p.approvalSteps.map((s, i) => i < stepsToRun ? { ...s, status: "approved" as const, approverName: ["Tshering Wangchuk", "Karma Dorji", "Pema Namgay"][i], timestamp: new Date().toISOString() } : i === 2 && !form.multiYearImplication ? { ...s, status: "skipped" as const } : s),
          }));
          return;
        }
        setApprovalIdx(idx);
        idx++;
        setTimeout(run, 1200 + Math.random() * 800);
      };
      setTimeout(run, 500);
    }
  }, [step, allPassed]);

  useEffect(() => {
    if (step !== 4) { approvalTriggered.current = false; setApprovalIdx(-1); setApprovalComplete(false); }
  }, [step]);

  const goStep = (s: Step) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const submitExtension = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setStep(1);
      setSelectedContract(null);
      setSelectedStored(null);
    }, 4000);
  };

  const STEPS = [
    { n: 1, label: "Select Contract", icon: "\uD83D\uDCC4", source: "PD", ref: "PD Step 1" },
    { n: 2, label: "Extension Details", icon: "\uD83D\uDCC5", source: "PD", ref: "PD Row 29" },
    { n: 3, label: "Validation & Documents", icon: "\uD83D\uDD0D", source: "BR", ref: "PD Row 31" },
    { n: 4, label: "Approval Workflow", icon: "\u2705", source: "PD", ref: "PD Row 33" },
    { n: 5, label: "Post Approval", icon: "\uD83D\uDD04", source: "PD", ref: "PD Row 34" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* PAGE HEADER */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400">EXPENDITURE MODULE — CONTRACT EXTENSION</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Contract Extension Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Time Extension for Active Contracts — SRS PD Row 29 — DD 14.1.17–19 — Validates end date, milestones, multi-year implications
        </p>
      </div>

      {/* SUCCESS */}
      {showSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 shadow-lg animate-pulse">
          <span className="text-2xl">{"\u2705"}</span>
          <div>
            <p className="text-sm font-bold text-emerald-900">Contract Extension Approved & Applied</p>
            <p className="text-xs text-emerald-700">Extension ID: {form.extensionId} — Contract end date updated, milestones adjusted, version incremented.</p>
          </div>
        </div>
      )}

      {/* STEPPER */}
      <div className="flex flex-nowrap items-center gap-0 overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm md:flex-wrap md:gap-2 md:overflow-visible">
        {STEPS.map((s, i) => {
          const srcColor = s.source === "PD" ? "bg-sky-100 text-sky-700" : "bg-blue-50 text-blue-700";
          return (
            <div key={s.n} className="flex items-center">
              <button type="button"
                className={`group relative flex items-center gap-2 rounded-[18px] px-3 py-2.5 text-xs font-semibold transition whitespace-nowrap ${step === s.n ? "bg-blue-50 text-blue-700" : step > s.n ? "text-slate-700" : "text-slate-400"}`}
                onClick={() => { if (s.n <= step) goStep(s.n as Step); }}
                title={s.ref}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${step === s.n ? "bg-[#2563eb] text-white" : step > s.n ? "bg-blue-100 text-blue-700" : "border-2 border-slate-200 text-slate-400"}`}>
                  {step > s.n ? "\u2713" : s.n}
                </span>
                <span>{s.icon} {s.label}</span>
                <span className={`rounded px-1 py-0.5 text-[7px] font-bold ${srcColor}`}>{s.ref}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`mx-1 h-[2px] w-4 ${step > s.n ? "bg-blue-200" : "bg-slate-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* ═══ STEP 1: Select Contract ═══ */}
      {step === 1 && (
        <section className={`${panelClass} overflow-visible`}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-xl text-white font-bold">{"\uD83D\uDCC4"}</div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 1: Select Contract for Extension</h2>
                <p className="mt-1 text-xs text-slate-500">Search and select an active contract to apply time extension {pdTag("PD Row 29")}</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5">
            {/* Search */}
            <label className={`${labelClass} min-w-0`}>
              <span>Search Contract {ddTag("DD 14.1.1")}</span>
              <div className="relative min-w-0">
                <input className={inputClass} value={contractSearch}
                  onChange={e => { setContractSearch(e.target.value); setShowContractDropdown(true); }}
                  onFocus={() => setShowContractDropdown(true)}
                  placeholder="Search by Contract ID, Title, or Contractor Name..." />
                {showContractDropdown && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl md:max-h-72 max-md:static max-md:mt-3 max-md:max-h-[320px]">
                    {filteredContracts.length === 0 && (
                      <div className="px-4 py-6 text-center text-xs italic text-slate-400">
                        No contracts match your search
                      </div>
                    )}
                    {filteredContracts.map(c => {
                      const isStored = !!storedMap[c.id];
                      return (
                        <button key={c.id} type="button" className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-0"
                          onClick={() => selectContract(c)}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">{c.id}</span>
                            <div className="flex items-center gap-1.5">
                              {isStored && (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                                  LIVE
                                </span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${/active/i.test(c.status) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.status}</span>
                            </div>
                          </div>
                          <p className="mt-0.5 text-xs font-semibold text-slate-700">{c.title}</p>
                          <p className="text-[10px] text-slate-400">
                            {c.contractorName || "—"} · {c.agencyName || "—"} · {c.category} · {c.currency} {c.totalValue.toLocaleString()} · Ends {c.endDate || "—"}
                          </p>
                          {c.budgetCode && (
                            <p className="font-mono text-[10px] text-slate-400">{c.budgetCode}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>

            {/* Selected contract — dynamic summary + optional full snapshot */}
            {selectedContract && (
              <>
                <SelectedContractSummary contract={selectedContract} />

                {/* Full dynamic snapshot — only when the selection is a real
                    stored contract (i.e. has every field of StoredContract). */}
                {selectedStored && <ContractFullDetails contract={selectedStored} />}

                {/* Milestones */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-sm font-bold text-slate-800">{"\uD83D\uDCCA"} Contract Milestones {ddTag("DD 14.4.x")}</p>
                  <div className="mt-2 space-y-1.5">
                    {selectedContract.milestones.map(m => (
                      <div key={m.id} className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-2 text-xs ${m.status === "Paid" ? "border border-emerald-200 bg-emerald-50" : m.status === "Completed" ? "border border-sky-200 bg-sky-50" : m.status === "Overdue" ? "border border-red-200 bg-red-50" : "border border-slate-200 bg-white"}`}>
                        <span className="w-16 font-bold text-slate-700">MS-{m.number}</span>
                        <span className="min-w-[180px] flex-1 font-medium text-slate-700">{m.name}</span>
                        <span className="text-slate-500">BTN {m.amount.toLocaleString()}</span>
                        <span className="text-slate-400">{m.estimatedDate}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${m.status === "Paid" ? "bg-emerald-200 text-emerald-700" : m.status === "Completed" ? "bg-sky-200 text-sky-700" : m.status === "Overdue" ? "bg-red-200 text-red-700" : "bg-slate-200 text-slate-600"}`}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
              <button type="button" className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`} onClick={() => goStep(2)}>
                    Proceed to Extension Details {"\u2192"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ═══ STEP 2: Extension Details ═══ */}
      {step === 2 && selectedContract && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-xl text-white font-bold">{"\uD83D\uDCC5"}</div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 2: Time Extension Details {pdTag("PD Row 29")}</h2>
                <p className="mt-1 text-xs text-slate-500">Set new end date, provide justification, and review milestone impact</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5">
            {/* Current vs New dates */}
            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelClass}>
                <span>Current End Date {ddTag("DD 14.1.19")}</span>
                <input className={lockedClass} value={selectedContract.endDate} readOnly />
              </label>
              <label className={labelClass}>
                <span>New End Date <span className="text-[#d32f2f]">*</span> {ddTag("DD 14.1.19")}</span>
                <input className={inputClass} type="date" value={form.newEndDate} onChange={e => updateForm("newEndDate", e.target.value)} min={selectedContract.endDate} />
              </label>
              <label className={labelClass}>
                <span>Extension Duration</span>
                <div className={`${lockedClass} flex items-center gap-2`}>
                  <span className={`text-lg font-extrabold ${form.extensionDays > 0 ? "text-blue-600" : "text-slate-400"}`}>{form.extensionDays > 0 ? `+${form.extensionDays} days` : "—"}</span>
                  {form.extensionDays > 365 && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">&gt;1 Year</span>}
                </div>
              </label>
            </div>

            {/* Multi-year warning */}
            {form.multiYearImplication && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3">
                <p className="text-sm font-bold text-blue-900">{"\u26A0\uFE0F"} Multi-Year Implication Detected {brTag("PD Row 29")}</p>
                <p className="text-xs text-blue-800 mt-1">Extension crosses fiscal year boundary. Budget Agency approval will be required. Multi-year commitment verification triggered.</p>
              </div>
            )}

            {/* Justification */}
            <label className={labelClass}>
              <span>Extension Justification <span className="text-[#d32f2f]">*</span> {pdTag("PD Row 31")}</span>
              <textarea className={`${inputClass} min-h-[100px]`} value={form.extensionJustification} onChange={e => updateForm("extensionJustification", e.target.value)} placeholder="Provide detailed justification for the time extension (e.g., weather delays, supply chain issues, scope clarification)..." />
            </label>

            {/* Milestone adjustments */}
            {form.milestoneAdjustments.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 space-y-3">
                <p className="text-sm font-bold text-slate-800">{"\uD83D\uDCC5"} Milestone Date Adjustments {ddTag("DD 14.4.6")}</p>
                <p className="text-xs text-slate-500">Optionally adjust unpaid milestone dates to align with the new end date.</p>
                <div className="space-y-2">
                  {form.milestoneAdjustments.map((ma, idx) => {
                    const ms = selectedContract.milestones.find(m => m.id === ma.milestoneId);
                    return (
                      <div key={ma.milestoneId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <span className="text-xs font-bold text-slate-700 w-24">MS-{ms?.number}</span>
                        <span className="text-xs text-slate-600 flex-1">{ms?.name}</span>
                        <span className="text-xs text-slate-400">{ma.originalDate}</span>
                        <span className="text-slate-300">{"\u2192"}</span>
                        <input type="date" className="rounded-lg border border-rose-200 bg-rose-50/30 px-2 py-1 text-xs" value={ma.newDate}
                          min={ma.originalDate}
                          onChange={e => {
                            const updated = [...form.milestoneAdjustments];
                            updated[idx] = { ...updated[idx], newDate: e.target.value, adjusted: !!e.target.value };
                            updateForm("milestoneAdjustments", updated);
                          }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(1)}>{"\u2190"} Back</button>
              <button type="button" className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`} onClick={() => goStep(3)} disabled={!form.newEndDate}>
                Continue to Validation {"\u2192"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ STEP 3: Validation & Documents ═══ */}
      {step === 3 && selectedContract && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-xl text-white font-bold">{"\uD83D\uDD0D"}</div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 3: Validation & Document Upload {brTag("PD Row 31")}</h2>
                <p className="mt-1 text-xs text-slate-500">System auto-validates extension rules, upload required variation documents</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5">
            {/* Auto-validation */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-indigo-900">{"\u2705"} System Validation Checks {brTag("PD Row 29")}
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">AUTO-TRIGGERED</span>
                </p>
                {validationComplete && (
                  <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${allPassed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {allPassed ? `ALL ${validations.length} PASSED` : `${failedCount} FAILED`}
                  </span>
                )}
              </div>
              {validating && (
                <div className="h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
                  <div className="h-full rounded-full bg-[#2563eb] transition-all duration-500" style={{ width: `${((validationStep + 1) / validations.length) * 100}%` }} />
                </div>
              )}
              <div className="space-y-1.5">
                {validations.map((v, idx) => {
                  const isDone = idx <= validationStep || validationComplete;
                  const isCurrent = idx === validationStep && validating;
                  return (
                    <div key={v.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all duration-500 ${isDone && !isCurrent ? (v.pass ? "bg-emerald-50/80 border border-emerald-200" : "bg-red-50 border border-red-200") : isCurrent ? "bg-white border-2 border-blue-200 shadow-md" : "border border-transparent opacity-30"}`}>
                      <span className="w-5 text-center text-base">
                        {isCurrent ? <span className="inline-block animate-spin">{"\u23F3"}</span> : isDone ? (v.pass ? "\u2705" : "\u274C") : "\u23F8\uFE0F"}
                      </span>
                      <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${v.source === "IFMIS" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{v.source}</span>
                      <span className={`font-medium flex-1 ${isDone && !isCurrent ? (v.pass ? "text-emerald-700" : "text-red-700 font-bold") : isCurrent ? "text-indigo-900" : "text-slate-400"}`}>{v.check}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${isCurrent ? "bg-blue-100 text-blue-600" : isDone ? (v.pass ? "bg-emerald-200/60 text-emerald-700" : "bg-red-200/60 text-red-700") : "bg-slate-100 text-slate-400"}`}>
                        {isCurrent ? "CHECKING..." : isDone ? (v.pass ? "PASS" : "FAIL") : v.ref}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900">{"\uD83D\uDCCE"} Variation Documents {pdTag("PD Row 31")}</p>
              <p className="text-xs text-slate-500">Upload required documents per SRS: Variation order (mandatory), Approval authority document (mandatory).</p>
              <div className="grid gap-3 md:grid-cols-2">
                {form.documents.map(d => (
                  <button key={d.id} type="button"
                    className={`rounded-2xl border-2 px-4 py-4 text-left transition ${d.uploaded ? "border-emerald-400 bg-emerald-50" : d.mandatory ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-blue-200"}`}
                    onClick={() => {
                      const updated = form.documents.map(dd => dd.id === d.id ? { ...dd, uploaded: !dd.uploaded, fileName: dd.uploaded ? "" : `${d.label.replace(/ /g, "_")}.pdf`, uploadedAt: dd.uploaded ? "" : new Date().toISOString() } : dd);
                      updateForm("documents", updated);
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-800">{d.uploaded ? "\u2705" : "\uD83D\uDCC4"} {d.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${d.mandatory ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>{d.mandatory ? "Required" : "Optional"}</span>
                    </div>
                    <p className="text-xs text-slate-500">{d.uploaded ? `Uploaded: ${d.fileName}` : "Click to upload document"}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(2)}>{"\u2190"} Back</button>
              {validationComplete && allPassed ? (
                <button type="button" className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`} onClick={() => goStep(4)}>Submit for Approval {"\u2192"}</button>
              ) : (
                <button type="button" disabled className={`${btnClass} cursor-not-allowed bg-slate-300 text-slate-500`}>
                  {validationComplete ? `${failedCount} validation(s) failed` : "Validating..."} {"\u2192"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ STEP 4: Approval Workflow ═══ */}
      {step === 4 && selectedContract && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-xl text-white font-bold">{"\u2705"}</div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 4: Approval Workflow {pdTag("PD Row 33")}</h2>
                <p className="mt-1 text-xs text-slate-500">Multi-level approval: Approver → Implementing Agency → Budget Agency (if multi-year)</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-emerald-900">{"\uD83D\uDD04"} Approval Workflow Processing</p>
                {approvalComplete && <span className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-extrabold text-white shadow">APPROVED</span>}
              </div>
              <div className="space-y-2">
                {form.approvalSteps.map((as, idx) => {
                  const isDone = idx <= approvalIdx || approvalComplete;
                  const isCurrent = idx === approvalIdx && !approvalComplete;
                  const isSkipped = as.status === "skipped";
                  return (
                    <div key={as.role} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs transition-all duration-500 ${isSkipped ? "bg-slate-50 border border-slate-200 opacity-50" : isDone ? "bg-emerald-50 border border-emerald-200" : isCurrent ? "bg-white border-2 border-emerald-300 shadow-md" : "bg-slate-50 border border-slate-100 opacity-40"}`}>
                      <span className="w-6 text-center text-base">
                        {isSkipped ? "\u23ED\uFE0F" : isCurrent ? <span className="inline-block animate-spin">{"\u23F3"}</span> : isDone ? "\u2705" : "\u23F8\uFE0F"}
                      </span>
                      <span className="font-medium flex-1">{as.role}</span>
                      {isDone && as.approverName && <span className="text-emerald-600">{as.approverName}</span>}
                      <span className={`rounded px-2 py-0.5 text-[8px] font-bold ${isSkipped ? "bg-slate-200 text-slate-500" : isDone ? "bg-emerald-200 text-emerald-700" : isCurrent ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-slate-100 text-slate-400"}`}>
                        {isSkipped ? "SKIPPED" : isDone ? "APPROVED" : isCurrent ? "REVIEWING..." : "PENDING"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(3)}>{"\u2190"} Back</button>
              {approvalComplete ? (
                <button type="button" className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`} onClick={() => goStep(5)}>View Post Approval Actions {"\u2192"}</button>
              ) : (
                <button type="button" disabled className={`${btnClass} cursor-not-allowed bg-slate-300 text-slate-500`}>Processing Approval... {"\u2192"}</button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ STEP 5: Post Approval ═══ */}
      {step === 5 && selectedContract && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-xl text-white font-bold">{"\uD83D\uDD04"}</div>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 5: Post Approval Actions {pdTag("PD Row 34")}</h2>
                <p className="mt-1 text-xs text-slate-500">System automatically applies extension to contract master record</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-5 py-4">
              <p className="text-sm font-bold text-emerald-900">{"\u2705"} Extension Applied Successfully</p>
              <p className="text-xs text-emerald-700 mt-1">The following updates have been applied to the contract master record:</p>
            </div>

            <div className="grid gap-2">
              {[
                { action: "Contract end date updated", detail: `${selectedContract.endDate} → ${form.newEndDate} (+${form.extensionDays} days)`, ref: "DD 14.1.19" },
                { action: "New version number created", detail: `Version ${form.versionNumber + 1}`, ref: "PD Row 34" },
                { action: "Contract duration updated", detail: `${selectedContract.duration} → Extended`, ref: "DD 14.1.17" },
                ...(form.multiYearImplication ? [{ action: "Multi-year commitment updated", detail: "Year-wise distribution adjusted", ref: "PD Row 34" }] : []),
                { action: "Milestone balances updated", detail: `${form.milestoneAdjustments.filter(m => m.adjusted).length} milestones adjusted`, ref: "PD Row 34" },
                { action: "Projected cash program updated", detail: "Cash flow projections recalculated", ref: "PD Row 34" },
                { action: "Historical version snapshot maintained", detail: "Previous version archived", ref: "PD Row 34" },
                { action: "e-CMS notified", detail: "Extension synced with Contract Management System", ref: "Int Sys" },
              ].map(a => (
                <div key={a.action} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
                  <span className="text-base">{"\u2705"}</span>
                  <span className="font-medium flex-1">{a.action}</span>
                  <span className="text-emerald-600">{a.detail}</span>
                  <span className="rounded bg-emerald-200/60 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">{a.ref}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(4)}>{"\u2190"} Back</button>
              <button type="button" className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`} onClick={submitExtension}>
                Complete Extension {"\u2713"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
