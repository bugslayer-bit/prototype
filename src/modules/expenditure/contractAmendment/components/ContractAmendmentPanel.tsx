import { useState, useMemo, useCallback } from "react";
import type {
  AmendmentFormState,
  AmendmentValidationResult,
  RevisionType,
  MilestoneChange,
  VariationDocument,
} from "../types";
import { getWorkflowConfigForModule, buildWorkflowRuntime, EXPENDITURE_MODULE_KEYS } from "../../../../shared/workflow";

/* ── Build dynamic approval steps for Contract Amendment from workflow engine ── */
function buildAmendmentApprovalSteps(): AmendmentFormState["approvalSteps"] {
  const config = getWorkflowConfigForModule(EXPENDITURE_MODULE_KEYS.CONTRACT_AMENDMENT);
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

/* ─── defaults ─── */
const INITIAL_STATE: AmendmentFormState = {
  amendmentId: `AMD-${Date.now().toString(36).toUpperCase()}`,
  contractId: "",
  contractTitle: "",
  currentContractValue: "",
  currentEndDate: "",
  amountAlreadyPaid: "",
  commitmentBalance: "",
  origin: "agency-initiated",
  justification: "",
  selectedRevisions: [],
  newContractValue: "",
  valueChangeDirection: "",
  commitmentEnhancementRef: "",
  commitmentEnhancementApproved: false,
  milestoneChanges: [],
  newEndDate: "",
  extensionJustification: "",
  multiYearImplication: false,
  newRetentionPercent: "",
  newAdvanceRecoveryRule: "",
  newTaxApplicability: "",
  newLdRule: "",
  financialChangeNote: "",
  variationDocuments: [],
  workflowStatus: "draft",
  approvalSteps: buildAmendmentApprovalSteps(),
  submittedAt: "",
  approvedAt: "",
  versionNumber: 1,
};

const REVISION_OPTIONS: { key: RevisionType; label: string; icon: string; description: string }[] = [
  { key: "value-change", label: "Contract Value Increase / Decrease", icon: "💰", description: "Modify contract value — requires commitment enhancement for increases" },
  { key: "milestone-change", label: "Milestone Change", icon: "📊", description: "Add, modify date/amount, or delete future milestones" },
  { key: "time-extension", label: "Time Extension", icon: "📅", description: "Extend contract end date within policy limits" },
  { key: "financial-rule-change", label: "Financial Rule Change", icon: "📐", description: "Change retention %, advance recovery, tax, or LD rules" },
];

const MOCK_MILESTONES: MilestoneChange[] = [
  { milestoneId: "M1", milestoneName: "Foundation Complete", action: "modify-date", originalValue: "2026-06-30", newValue: "", isPaid: true, blocked: true, blockReason: "Already paid — modification blocked" },
  { milestoneId: "M2", milestoneName: "Structural Works", action: "modify-amount", originalValue: "500000", newValue: "", isPaid: false, blocked: false, blockReason: "" },
  { milestoneId: "M3", milestoneName: "Finishing & Handover", action: "modify-date", originalValue: "2026-12-31", newValue: "", isPaid: false, blocked: false, blockReason: "" },
];

/* ─── style tokens ─── */
const panelClass = "overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(183,28,28,0.12)]";
const headerClass = "border-b border-rose-100 bg-gradient-to-r from-[#fff7f7] via-[#fff1f3] to-[#fffaf7] px-6 py-6";
const inputClass = "mt-1 w-full rounded-2xl border border-rose-200 bg-rose-50/30 px-4 py-3 text-slate-800 shadow-inner transition focus:border-[#d32f2f] focus:outline-none focus:ring-2 focus:ring-[#d32f2f]/20";
const labelClass = "flex flex-col gap-1 text-sm font-semibold text-slate-700";
const btnClass = "rounded-2xl px-5 py-3 text-sm font-bold transition shadow-lg";

export function ContractAmendmentPanel() {
  const [form, setForm] = useState<AmendmentFormState>(INITIAL_STATE);
  const [activeStep, setActiveStep] = useState(0);

  const updateField = useCallback(<K extends keyof AmendmentFormState>(key: K, value: AmendmentFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleRevision = (rev: RevisionType) => {
    setForm((prev) => {
      const selected = prev.selectedRevisions.includes(rev)
        ? prev.selectedRevisions.filter((r) => r !== rev)
        : [...prev.selectedRevisions, rev];
      const updated: Partial<AmendmentFormState> = { selectedRevisions: selected };
      if (rev === "milestone-change" && selected.includes("milestone-change") && prev.milestoneChanges.length === 0) {
        updated.milestoneChanges = MOCK_MILESTONES;
      }
      return { ...prev, ...updated };
    });
  };

  const addVariationDoc = (label: string, mandatory: boolean) => {
    const doc: VariationDocument = {
      id: `doc-${Date.now()}`,
      label,
      fileName: `${label.replace(/\s+/g, "_")}_v${form.versionNumber}.pdf`,
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString().slice(0, 10),
      mandatory,
    };
    setForm((prev) => ({ ...prev, variationDocuments: [...prev.variationDocuments, doc] }));
  };

  /* ─── validations ─── */
  const validationResults = useMemo<AmendmentValidationResult[]>(() => {
    const results: AmendmentValidationResult[] = [];
    const cv = parseFloat(form.currentContractValue) || 0;
    const nv = parseFloat(form.newContractValue) || 0;
    const paid = parseFloat(form.amountAlreadyPaid) || 0;
    const commitBal = parseFloat(form.commitmentBalance) || 0;

    results.push({
      key: "contract-selected",
      label: "Contract selected",
      passed: !!form.contractId,
      message: form.contractId ? `Contract ${form.contractId} loaded` : "Select an active contract",
      severity: "blocker",
    });
    results.push({
      key: "revision-selected",
      label: "At least one revision type selected",
      passed: form.selectedRevisions.length > 0,
      message: form.selectedRevisions.length > 0 ? `${form.selectedRevisions.length} revision(s) selected` : "Select revision types",
      severity: "blocker",
    });
    results.push({
      key: "justification",
      label: "Amendment justification provided",
      passed: form.justification.length > 10,
      message: form.justification.length > 10 ? "Justification recorded" : "Provide a justification (min 10 chars)",
      severity: "blocker",
    });

    if (form.selectedRevisions.includes("value-change")) {
      if (form.valueChangeDirection === "increase") {
        results.push({
          key: "commitment-enhancement",
          label: "Commitment enhancement approved (for value increase)",
          passed: form.commitmentEnhancementApproved,
          message: form.commitmentEnhancementApproved ? "Enhancement approved" : "Commitment enhancement must be approved before revision — no bypass allowed",
          severity: "blocker",
        });
        results.push({
          key: "new-value-within-commitment",
          label: "New value ≤ commitment balance",
          passed: nv <= commitBal || form.commitmentEnhancementApproved,
          message: nv <= commitBal ? "Within commitment balance" : "Exceeds commitment — enhancement required",
          severity: "blocker",
        });
      }
      if (form.valueChangeDirection === "decrease") {
        results.push({
          key: "decrease-above-paid",
          label: "New value ≥ amount already paid",
          passed: nv >= paid,
          message: nv >= paid ? "Valid decrease amount" : `New value (${nv}) is below amount already paid (${paid}) — blocked`,
          severity: "blocker",
        });
      }
    }

    if (form.selectedRevisions.includes("time-extension")) {
      const lastMilestoneDate = form.currentEndDate;
      results.push({
        key: "end-date-valid",
        label: "New end date ≥ last unpaid milestone",
        passed: !form.newEndDate || form.newEndDate >= lastMilestoneDate,
        message: form.newEndDate >= lastMilestoneDate ? "Extension valid" : "New end date before last milestone",
        severity: "blocker",
      });
    }

    const hasVariation = form.variationDocuments.some((d) => d.label.toLowerCase().includes("variation"));
    results.push({
      key: "variation-doc",
      label: "Variation order document uploaded (mandatory)",
      passed: hasVariation,
      message: hasVariation ? "Variation document present" : "Upload mandatory variation order document",
      severity: "blocker",
    });

    return results;
  }, [form]);

  const blockers = validationResults.filter((v) => v.severity === "blocker" && !v.passed);
  const isLocked = form.workflowStatus !== "draft" && form.workflowStatus !== "reprocessing";

  const handleSubmit = () => {
    if (blockers.length > 0) return;
    setForm((prev) => ({
      ...prev,
      workflowStatus: "submitted",
      submittedAt: new Date().toISOString(),
    }));
  };

  const STEPS = [
    { id: 0, title: "Contract & Revisions", short: "Select" },
    { id: 1, title: "Revision Details", short: "Details" },
    { id: 2, title: "Variation Documents", short: "Documents" },
    { id: 3, title: "Validate & Submit", short: "Submit" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ─── amendment status badges ─── */}
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-rose-100 px-4 py-2 text-xs font-bold text-[#d32f2f]">
          {form.workflowStatus.replace(/-/g, " ").toUpperCase()}
        </span>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
          Version {form.versionNumber}
        </span>
      </div>

      {/* ─── step navigator ─── */}
      <div className="flex gap-2 overflow-x-auto rounded-[24px] border border-rose-100 bg-white p-2 shadow-md">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-bold transition ${
              activeStep === step.id
                ? "bg-[#d32f2f] text-white shadow-lg"
                : "bg-rose-50 text-slate-700 hover:bg-rose-100"
            }`}
            onClick={() => setActiveStep(step.id)}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {step.id + 1}
            </span>
            {step.title}
          </button>
        ))}
      </div>

      {/* ─── STEP 0: Contract & Revision Selection ─── */}
      {activeStep === 0 && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">📋</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#8f1111]">CONTRACT SELECTION</h2>
                  <p className="mt-1 text-sm text-slate-600">Select an active contract to amend — only approved contracts are eligible</p>
                </div>
              </div>
            </div>
            <div className="grid gap-5 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
              <label className={labelClass}>
                <span>CONTRACT_ID <span className="text-[#d32f2f]">*</span></span>
                <input className={inputClass} value={form.contractId} onChange={(e) => updateField("contractId", e.target.value)} placeholder="Enter active contract ID" disabled={isLocked} />
              </label>
              <label className={labelClass}>
                <span>CONTRACT_TITLE</span>
                <input className={inputClass} value={form.contractTitle} onChange={(e) => updateField("contractTitle", e.target.value)} placeholder="Auto-populated on contract select" disabled={isLocked} />
              </label>
              <label className={labelClass}>
                <span>CURRENT_CONTRACT_VALUE</span>
                <input className={inputClass} type="number" value={form.currentContractValue} onChange={(e) => updateField("currentContractValue", e.target.value)} placeholder="0.00" disabled={isLocked} />
              </label>
              <label className={labelClass}>
                <span>CURRENT_END_DATE</span>
                <input className={inputClass} type="date" value={form.currentEndDate} onChange={(e) => updateField("currentEndDate", e.target.value)} disabled={isLocked} />
              </label>
              <label className={labelClass}>
                <span>AMOUNT_ALREADY_PAID</span>
                <input className={inputClass} type="number" value={form.amountAlreadyPaid} onChange={(e) => updateField("amountAlreadyPaid", e.target.value)} placeholder="0.00" disabled={isLocked} />
              </label>
              <label className={labelClass}>
                <span>COMMITMENT_BALANCE</span>
                <input className={inputClass} type="number" value={form.commitmentBalance} onChange={(e) => updateField("commitmentBalance", e.target.value)} placeholder="0.00" disabled={isLocked} />
              </label>
              <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>
                <span>AMENDMENT_ORIGIN <span className="text-[#d32f2f]">*</span></span>
                <select className={inputClass} value={form.origin} onChange={(e) => updateField("origin", e.target.value as AmendmentFormState["origin"])} disabled={isLocked}>
                  <option value="contractor-initiated">Contractor / Supplier Initiated (acted by agency staff on behalf)</option>
                  <option value="agency-initiated">Government Agency Initiated — procuring agency proposes changes</option>
                </select>
              </label>
            </div>
          </section>

          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">✏️</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#8f1111]">REVISION TYPE SELECTION</h2>
                  <p className="mt-1 text-sm text-slate-600">Multiple selections allowed — system only allows editing of permitted fields per revision type</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              {REVISION_OPTIONS.map((opt) => {
                const selected = form.selectedRevisions.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={isLocked}
                    className={`flex items-start gap-4 rounded-2xl border-2 px-5 py-4 text-left transition ${
                      selected ? "border-[#d32f2f] bg-rose-50 shadow-lg" : "border-slate-200 bg-white hover:border-rose-300"
                    }`}
                    onClick={() => toggleRevision(opt.key)}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{opt.description}</p>
                    </div>
                    <div className={`ml-auto mt-1 h-5 w-5 rounded-md border-2 ${selected ? "border-[#d32f2f] bg-[#d32f2f]" : "border-slate-300"}`}>
                      {selected && <span className="flex h-full items-center justify-center text-xs text-white">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ─── STEP 1: Revision Details ─── */}
      {activeStep === 1 && (
        <div className="space-y-6">
          {form.selectedRevisions.includes("value-change") && (
            <section className={panelClass}>
              <div className={headerClass}>
                <h2 className="text-xl font-extrabold text-[#8f1111]">💰 MODIFY CONTRACT VALUE</h2>
                <p className="mt-1 text-xs text-slate-600">If increase: must create commitment enhancement → approval → then revision allowed (No bypass)</p>
              </div>
              <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                <label className={labelClass}>
                  <span>CHANGE DIRECTION <span className="text-[#d32f2f]">*</span></span>
                  <select className={inputClass} value={form.valueChangeDirection} onChange={(e) => updateField("valueChangeDirection", e.target.value as "increase" | "decrease" | "")} disabled={isLocked}>
                    <option value="">-- Select --</option>
                    <option value="increase">Increase</option>
                    <option value="decrease">Decrease</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>NEW CONTRACT VALUE <span className="text-[#d32f2f]">*</span></span>
                  <input className={inputClass} type="number" value={form.newContractValue} onChange={(e) => updateField("newContractValue", e.target.value)} placeholder="0.00" disabled={isLocked} />
                </label>

                {form.valueChangeDirection === "increase" && (
                  <>
                    <label className={labelClass}>
                      <span>COMMITMENT ENHANCEMENT REF <span className="text-[#d32f2f]">*</span></span>
                      <input className={inputClass} value={form.commitmentEnhancementRef} onChange={(e) => updateField("commitmentEnhancementRef", e.target.value)} placeholder="Enter enhancement reference" disabled={isLocked} />
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" className="peer sr-only" checked={form.commitmentEnhancementApproved} onChange={(e) => updateField("commitmentEnhancementApproved", e.target.checked)} disabled={isLocked} />
                        <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                      </label>
                      <div>
                        <p className="text-sm font-bold text-amber-900">Enhancement Approved</p>
                        <p className="text-xs text-amber-700">Commitment enhancement must be approved before revision</p>
                      </div>
                    </div>
                  </>
                )}

                {form.valueChangeDirection === "decrease" && (
                  <div className="col-span-full rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                    <p className="text-sm font-bold text-sky-900">Decrease Validation</p>
                    <div className="mt-2 space-y-1 text-xs text-sky-800">
                      <p>New value ≥ amount already paid: {parseFloat(form.newContractValue) >= parseFloat(form.amountAlreadyPaid) ? "✅ Pass" : "❌ Blocked"}</p>
                      <p>New value ≥ unpaid milestone amounts: Validated at submission</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {form.selectedRevisions.includes("milestone-change") && (
            <section className={panelClass}>
              <div className={headerClass}>
                <h2 className="text-xl font-extrabold text-[#8f1111]">📊 MILESTONE CHANGES</h2>
                <p className="mt-1 text-xs text-slate-600">Add, modify date/amount, delete future milestones — paid milestones are blocked from modification</p>
              </div>
              <div className="px-6 py-6">
                <div className="overflow-x-auto rounded-2xl border border-rose-100">
                  <table className="w-full text-sm">
                    <thead className="bg-rose-50 text-left text-xs font-bold uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Milestone</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Original</th>
                        <th className="px-4 py-3">New Value</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.milestoneChanges.map((mc, idx) => (
                        <tr key={mc.milestoneId} className={`border-t border-rose-100 ${mc.blocked ? "bg-red-50/50" : ""}`}>
                          <td className="px-4 py-3 font-mono text-xs">{mc.milestoneId}</td>
                          <td className="px-4 py-3 font-semibold">{mc.milestoneName}</td>
                          <td className="px-4 py-3">
                            <select
                              className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                              value={mc.action}
                              disabled={mc.blocked || isLocked}
                              onChange={(e) => {
                                const updated = [...form.milestoneChanges];
                                updated[idx] = { ...mc, action: e.target.value as MilestoneChange["action"] };
                                updateField("milestoneChanges", updated);
                              }}
                            >
                              <option value="modify-date">Modify Date</option>
                              <option value="modify-amount">Modify Amount</option>
                              <option value="delete">Delete</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{mc.originalValue}</td>
                          <td className="px-4 py-3">
                            <input
                              className="w-32 rounded-xl border border-slate-200 px-2 py-1 text-xs"
                              value={mc.newValue}
                              disabled={mc.blocked || isLocked}
                              placeholder={mc.action.includes("date") ? "YYYY-MM-DD" : "Amount"}
                              onChange={(e) => {
                                const updated = [...form.milestoneChanges];
                                updated[idx] = { ...mc, newValue: e.target.value };
                                updateField("milestoneChanges", updated);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {mc.blocked ? (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">{mc.blockReason}</span>
                            ) : mc.isPaid ? (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Paid</span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Editable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-xs text-slate-600">
                    System blocks: modification of already paid milestones, reduction below amount already paid, increase exceeding contract total.
                    For multi-year: validates year-wise payout remains within approved multi-year commitment.
                  </p>
                </div>
              </div>
            </section>
          )}

          {form.selectedRevisions.includes("time-extension") && (
            <section className={panelClass}>
              <div className={headerClass}>
                <h2 className="text-xl font-extrabold text-[#8f1111]">📅 TIME EXTENSION</h2>
                <p className="mt-1 text-xs text-slate-600">End date ≥ last unpaid milestone — extension period must be allowed under policy</p>
              </div>
              <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                <label className={labelClass}>
                  <span>CURRENT END DATE</span>
                  <input className={`${inputClass} bg-slate-100`} type="date" value={form.currentEndDate} disabled />
                </label>
                <label className={labelClass}>
                  <span>NEW END DATE <span className="text-[#d32f2f]">*</span></span>
                  <input className={inputClass} type="date" value={form.newEndDate} onChange={(e) => updateField("newEndDate", e.target.value)} disabled={isLocked} />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  <span>EXTENSION JUSTIFICATION</span>
                  <textarea className={`${inputClass} min-h-[80px]`} value={form.extensionJustification} onChange={(e) => updateField("extensionJustification", e.target.value)} placeholder="Provide justification for the time extension" disabled={isLocked} />
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={form.multiYearImplication} onChange={(e) => updateField("multiYearImplication", e.target.checked)} disabled={isLocked} />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                  </label>
                  <span className="text-sm font-semibold text-slate-700">Multi-year implication flagged</span>
                </div>
              </div>
            </section>
          )}

          {form.selectedRevisions.includes("financial-rule-change") && (
            <section className={panelClass}>
              <div className={headerClass}>
                <h2 className="text-xl font-extrabold text-[#8f1111]">📐 FINANCIAL RULE CHANGES</h2>
                <p className="mt-1 text-xs text-slate-600">Cannot change rules affecting already processed invoices — changes apply only to unpaid milestones</p>
              </div>
              <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                <label className={labelClass}>
                  <span>NEW RETENTION %</span>
                  <input className={inputClass} type="number" value={form.newRetentionPercent} onChange={(e) => updateField("newRetentionPercent", e.target.value)} placeholder="e.g., 10" disabled={isLocked} />
                </label>
                <label className={labelClass}>
                  <span>ADVANCE RECOVERY RULE</span>
                  <select className={inputClass} value={form.newAdvanceRecoveryRule} onChange={(e) => updateField("newAdvanceRecoveryRule", e.target.value)} disabled={isLocked}>
                    <option value="">-- No change --</option>
                    <option value="pro-rata">Pro-rata from RA bills</option>
                    <option value="lump-sum">Lump sum</option>
                    <option value="custom">Custom schedule</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>TAX APPLICABILITY</span>
                  <select className={inputClass} value={form.newTaxApplicability} onChange={(e) => updateField("newTaxApplicability", e.target.value)} disabled={isLocked}>
                    <option value="">-- No change --</option>
                    <option value="yes">Tax Applicable</option>
                    <option value="no">Tax Exempt</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>LIQUIDATED DAMAGES RULE</span>
                  <input className={inputClass} value={form.newLdRule} onChange={(e) => updateField("newLdRule", e.target.value)} placeholder="e.g., 0.1% per day, max 10%" disabled={isLocked} />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  <span>CHANGE NOTE</span>
                  <textarea className={`${inputClass} min-h-[80px]`} value={form.financialChangeNote} onChange={(e) => updateField("financialChangeNote", e.target.value)} placeholder="Describe what is being changed and why — cannot retroactively alter tax already posted" disabled={isLocked} />
                </label>
              </div>
              <div className="mx-6 mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-xs font-bold text-amber-900">Important Rules</p>
                <div className="mt-1 space-y-1 text-xs text-amber-800">
                  <p>Cannot change rules affecting already processed invoices</p>
                  <p>Cannot retroactively alter tax already posted</p>
                  <p>If change impacts future deductions → apply only to unpaid milestones</p>
                </div>
              </div>
            </section>
          )}

          {form.selectedRevisions.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-8 py-12 text-center">
              <p className="text-lg font-bold text-slate-400">No revision types selected</p>
              <p className="mt-2 text-sm text-slate-400">Go back to Step 1 and select at least one revision type</p>
            </div>
          )}

          <label className={`${labelClass} ${panelClass}`}>
            <div className="px-6 py-6">
              <span>AMENDMENT JUSTIFICATION <span className="text-[#d32f2f]">*</span></span>
              <textarea className={`${inputClass} min-h-[100px]`} value={form.justification} onChange={(e) => updateField("justification", e.target.value)} placeholder="Provide detailed justification for the amendment request — this will be included in the approval workflow" disabled={isLocked} />
            </div>
          </label>
        </div>
      )}

      {/* ─── STEP 2: Variation Documents ─── */}
      {activeStep === 2 && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">📎</div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#8f1111]">VARIATION DOCUMENTS</h2>
                <p className="mt-1 text-sm text-slate-600">Upload variation order (mandatory) and approval authority documents</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Variation Order Document", mandatory: true },
                { label: "Approval Authority Document", mandatory: true },
                { label: "Cost Estimate / BOQ Revision", mandatory: false },
                { label: "Commitment Enhancement Approval", mandatory: form.selectedRevisions.includes("value-change") && form.valueChangeDirection === "increase" },
              ].map((docType) => {
                const uploaded = form.variationDocuments.find((d) => d.label === docType.label);
                return (
                  <div key={docType.label} className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${uploaded ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{docType.label}</p>
                      <p className="text-xs text-slate-500">{docType.mandatory ? "Mandatory" : "Optional"}</p>
                      {uploaded && <p className="mt-1 text-xs text-emerald-700">{uploaded.fileName} — {uploaded.fileSize}</p>}
                    </div>
                    {!uploaded ? (
                      <button
                        type="button"
                        className={`${btnClass} bg-[#d32f2f] text-white hover:bg-[#b71c1c]`}
                        onClick={() => addVariationDoc(docType.label, docType.mandatory)}
                        disabled={isLocked}
                      >
                        Upload
                      </button>
                    ) : (
                      <span className="text-lg">✅</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── STEP 3: Validate & Submit ─── */}
      {activeStep === 3 && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#8f1111]">AMENDMENT VALIDATION</h2>
              <p className="mt-1 text-sm text-slate-600">All blockers must pass before submission — amendment request with justification</p>
            </div>
            <div className="px-6 py-6 space-y-3">
              {validationResults.map((v) => (
                <div key={v.key} className={`flex items-start gap-3 rounded-2xl border px-5 py-3 ${v.passed ? "border-emerald-200 bg-emerald-50" : v.severity === "blocker" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                  <span className="mt-0.5 text-lg">{v.passed ? "✅" : v.severity === "blocker" ? "🚫" : "⚠️"}</span>
                  <div>
                    <p className={`text-sm font-bold ${v.passed ? "text-emerald-800" : v.severity === "blocker" ? "text-red-800" : "text-amber-800"}`}>{v.label}</p>
                    <p className={`text-xs ${v.passed ? "text-emerald-600" : v.severity === "blocker" ? "text-red-600" : "text-amber-600"}`}>{v.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={panelClass}>
            <div className={headerClass}>
              <h2 className="text-xl font-extrabold text-[#8f1111]">AMENDMENT APPROVAL WORKFLOW</h2>
              <p className="mt-1 text-xs text-slate-600">Amendment threshold-based multi-level approval with version control</p>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-2">
                {form.approvalSteps.map((step, idx) => (
                  <div key={step.role} className="flex items-center gap-2">
                    <div className={`rounded-2xl border px-4 py-3 text-center ${step.status === "approved" ? "border-emerald-300 bg-emerald-50" : step.status === "rejected" ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-xs font-bold text-slate-700">{step.role}</p>
                      <p className={`mt-1 text-xs font-bold ${step.status === "approved" ? "text-emerald-700" : step.status === "rejected" ? "text-red-700" : "text-slate-400"}`}>
                        {step.status.toUpperCase()}
                      </p>
                    </div>
                    {idx < form.approvalSteps.length - 1 && <span className="text-slate-300">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {isLocked ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-6 text-center">
              <p className="text-lg font-bold text-emerald-800">Amendment Submitted</p>
              <p className="mt-1 text-sm text-emerald-600">Submitted at: {form.submittedAt} — Contract editing is locked</p>
              <p className="mt-2 text-xs text-slate-500">Post-approval: updates contract master, creates new version, adjusts commitment and budget tables</p>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
                Save Draft
              </button>
              <button
                type="button"
                className={`${btnClass} ${blockers.length > 0 ? "cursor-not-allowed bg-slate-300 text-slate-500" : "bg-[#d32f2f] text-white hover:bg-[#b71c1c]"}`}
                disabled={blockers.length > 0}
                onClick={handleSubmit}
              >
                Submit for Approval ({blockers.length > 0 ? `${blockers.length} blockers` : "Ready"})
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-bold text-slate-700">Post-Approval Actions (System)</p>
            <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
              <p>1. Updates contract master record</p>
              <p>2. Creates new version number</p>
              <p>3. Increase = reserve additional commitment amount</p>
              <p>4. Decrease = release balance from commitment</p>
              <p>5. Updates budget control tables</p>
              <p>6. Updates contract & milestone balances</p>
              <p>7. Updates projected cash program</p>
              <p>8. Maintains historical version snapshot</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
