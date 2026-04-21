import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type {
  AmendmentFormState,
  AmendmentValidationResult,
  RevisionType,
  MilestoneChange,
  VariationDocument,
} from "./types";
import { useContractData, type StoredContract } from "../../../shared/context/ContractDataContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import {
  INITIAL_STATE,
  REVISION_OPTIONS,
  MOCK_MILESTONES,
  panelClass,
  headerClass,
  inputClass,
  labelClass,
  btnClass,
  sectionTitleClass,
  sectionSubtitleClass,
  stepContentShellClass,
  ContractSearchSelector,
  amendmentFromContract,
} from "./amendmentFlow";

interface ContractAmendmentPageProps {
  sourceContract?: StoredContract | null;
}


export function ContractAmendmentPage({ sourceContract = null }: ContractAmendmentPageProps) {
  const { updateContract } = useContractData();

  /* All Amendment LoVs sourced from MasterDataContext at runtime so admins
     can rename labels in /master-data without code changes. The underlying
     keys remain TypeScript-typed for safety; only the displayed text is
     master-data-driven. Falls back to SRS-defined defaults if a group is
     missing or empty. */
  const { masterDataMap } = useMasterData();
  const originLabels = useMemo(() => {
    const list = masterDataMap.get("amendment-origin-type") ?? ["Contractor-Initiated", "Agency-Initiated"];
    return {
      "contractor-initiated": list[0] ?? "Contractor-Initiated",
      "agency-initiated": list[1] ?? "Agency-Initiated",
    };
  }, [masterDataMap]);
  const directionLabels = useMemo(() => {
    const list = masterDataMap.get("amendment-direction") ?? ["Increase", "Decrease"];
    return { increase: list[0] ?? "Increase", decrease: list[1] ?? "Decrease" };
  }, [masterDataMap]);
  const milestoneAdjustmentLabels = useMemo(() => {
    const list = masterDataMap.get("milestone-adjustment-type") ?? ["Modify Date", "Modify Amount", "Delete Milestone"];
    return {
      "modify-date": list[0] ?? "Modify Date",
      "modify-amount": list[1] ?? "Modify Amount",
      delete: list[2] ?? "Delete",
    };
  }, [masterDataMap]);
  const taxLabels = useMemo(() => {
    const list = masterDataMap.get("tax-applicability") ?? ["Tax Applicable", "Tax Exempt"];
    return { yes: list[0] ?? "Tax Applicable", no: list[1] ?? "Tax Exempt" };
  }, [masterDataMap]);
  const [form, setForm] = useState<AmendmentFormState>(() => amendmentFromContract(sourceContract));
  const [activeStep, setActiveStep] = useState(0);
  const sectionRefs = {
    contractSelection: useRef<HTMLElement | null>(null),
    revisionSelection: useRef<HTMLElement | null>(null),
    valueChange: useRef<HTMLElement | null>(null),
    milestoneChange: useRef<HTMLElement | null>(null),
    timeExtension: useRef<HTMLElement | null>(null),
    financialRuleChange: useRef<HTMLElement | null>(null),
    justification: useRef<HTMLElement | null>(null),
    variationDocuments: useRef<HTMLElement | null>(null),
  };

  const updateField = useCallback(<K extends keyof AmendmentFormState>(key: K, value: AmendmentFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    setForm(amendmentFromContract(sourceContract));
    setActiveStep(0);
  }, [sourceContract]);

  useEffect(() => {
    if (!sourceContract?.id) return;
    updateContract(sourceContract.id, { amendmentDraft: form });
  }, [form, sourceContract]);

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

  function navigateToValidationIssue(key: string) {
    const goTo = (stepId: number, ref: { current: HTMLElement | null }) => {
      setActiveStep(stepId);
      requestAnimationFrame(() => {
        setTimeout(() => {
          ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      });
    };

    switch (key) {
      case "contract-selected":
        goTo(0, sectionRefs.contractSelection);
        break;
      case "revision-selected":
        goTo(0, sectionRefs.revisionSelection);
        break;
      case "justification":
        goTo(1, sectionRefs.justification);
        break;
      case "commitment-enhancement":
      case "new-value-within-commitment":
      case "decrease-above-paid":
        goTo(1, sectionRefs.valueChange);
        break;
      case "end-date-valid":
        goTo(1, sectionRefs.timeExtension);
        break;
      case "variation-doc":
        goTo(2, sectionRefs.variationDocuments);
        break;
      default:
        goTo(1, sectionRefs.revisionSelection);
        break;
    }
  }

  const StepNav = ({ step }: { step: number }) => (
    <div className="mt-auto flex items-center justify-between pt-2">
      {step > 0 ? (
        <button type="button" onClick={() => setActiveStep(step - 1)} className={`${btnClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm`}>
          ← Previous
        </button>
      ) : <div />}
      {step < STEPS.length - 1 && (
        <button type="button" onClick={() => setActiveStep(step + 1)} className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`}>
          Save and Next →
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ─── page header ─── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400">Expenditure</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Contract Amendment</h1>
          <p className="mt-1 text-sm text-slate-600">Process: Contract Amendment — Revision, validation, approval workflow, and version control</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">
            {form.workflowStatus.replace(/-/g, " ").toUpperCase()}
          </span>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
            Version {form.versionNumber}
          </span>
        </div>
      </div>

      {/* ─── step navigator ─── */}
      <div className="grid gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:grid-cols-4">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`flex min-h-[86px] w-full items-center justify-center rounded-[20px] px-4 py-3 text-sm font-bold text-center transition ${
              activeStep === step.id
                ? "bg-[linear-gradient(135deg,#eff8ff,#f7fbff)] text-sky-800 shadow-[inset_0_0_0_2px_#2563eb,0_6px_18px_rgba(37,99,235,0.08)]"
                : "bg-white text-slate-600 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)] hover:bg-slate-50"
            }`}
            onClick={() => setActiveStep(step.id)}
          >
            <span className={`mr-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              activeStep === step.id ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"
            }`}>
              {step.id + 1}
            </span>
            <span className="max-w-[170px] leading-7">{step.title}</span>
          </button>
        ))}
      </div>

      {/* ─── STEP 0: Contract & Revision Selection ─── */}
      {activeStep === 0 && (
        <div className={stepContentShellClass}>
          <section ref={sectionRefs.contractSelection} className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm">📋</div>
                <div>
                  <h2 className={sectionTitleClass}>Contract Selection</h2>
                  <p className={sectionSubtitleClass}>Select an active contract to amend — only approved contracts are eligible</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-6">
              {/* ── Searchable Contract Selector ── */}
              <ContractSearchSelector
                value={form.contractId}
                disabled={isLocked}
                onSelect={(contract: StoredContract) => {
                  setForm((prev) => ({
                    ...prev,
                    contractId: contract.contractId,
                    contractTitle: contract.contractTitle,
                    currentContractValue: contract.contractValue,
                    currentEndDate: contract.endDate,
                    commitmentBalance: contract.formData.commitmentBalance,
                    amountAlreadyPaid: contract.formData.grossAmount || "0",
                    multiYearImplication: contract.formData.multiYearFlag,
                    newRetentionPercent: contract.formData.retentionRate,
                    newAdvanceRecoveryRule: contract.formData.advanceRecoveryMethod,
                    newTaxApplicability: contract.formData.taxApplicable ? "yes" : "no",
                    newLdRule: contract.formData.liquidatedDamagesLimit,
                  }));
                }}
              />

              {/* ── Auto-populated contract details ── */}
              {form.contractId && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Contract Details (Auto-populated)</p>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contract Title</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{form.contractTitle || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Value</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">Nu. {form.currentContractValue || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current End Date</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{form.currentEndDate || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount Already Paid</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">Nu. {form.amountAlreadyPaid || "0.00"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Commitment Balance</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">Nu. {form.commitmentBalance || "0.00"}</p>
                    </div>
                  </div>
                </div>
              )}

              <label className={labelClass}>
                <span>Amendment Origin <span className="text-[#d32f2f]">*</span></span>
                <select className={inputClass} value={form.origin} onChange={(e) => updateField("origin", e.target.value as AmendmentFormState["origin"])} disabled={isLocked}>
                  <option value="contractor-initiated">{originLabels["contractor-initiated"]}</option>
                  <option value="agency-initiated">{originLabels["agency-initiated"]}</option>
                </select>
              </label>
            </div>
          </section>

          <section ref={sectionRefs.revisionSelection} className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm">✏️</div>
                <div>
                  <h2 className={sectionTitleClass}>Revision Type Selection</h2>
                  <p className={sectionSubtitleClass}>Multiple selections allowed — system only allows editing of permitted fields per revision type</p>
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
                      selected ? "border-sky-200 bg-sky-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    onClick={() => toggleRevision(opt.key)}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{opt.description}</p>
                    </div>
                    <div className={`ml-auto mt-1 h-5 w-5 rounded-md border-2 ${selected ? "border-sky-300 bg-sky-500" : "border-slate-300"}`}>
                      {selected && <span className="flex h-full items-center justify-center text-xs text-white">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <StepNav step={0} />
        </div>
      )}

      {/* ─── STEP 1: Revision Details ─── */}
      {activeStep === 1 && (
        <div className={stepContentShellClass}>
          {form.selectedRevisions.includes("value-change") && (
            <section ref={sectionRefs.valueChange} className={panelClass}>
              <div className={headerClass}>
                <h2 className={sectionTitleClass}>💰 Modify Contract Value</h2>
                <p className={sectionSubtitleClass}>If increase: must create commitment enhancement → approval → then revision allowed (No bypass)</p>
              </div>
              <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                <label className={labelClass}>
                  <span>Change Direction <span className="text-[#d32f2f]">*</span></span>
                  <select className={inputClass} value={form.valueChangeDirection} onChange={(e) => updateField("valueChangeDirection", e.target.value as "increase" | "decrease" | "")} disabled={isLocked}>
                    <option value="">-- Select --</option>
                    <option value="increase">{directionLabels.increase}</option>
                    <option value="decrease">{directionLabels.decrease}</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>New Contract Value <span className="text-[#d32f2f]">*</span></span>
                  <input className={inputClass} type="number" value={form.newContractValue} onChange={(e) => updateField("newContractValue", e.target.value)} placeholder="0.00" disabled={isLocked} />
                </label>

                {form.valueChangeDirection === "increase" && (
                  <>
                    <label className={labelClass}>
                      <span>Commitment Enhancement Ref <span className="text-[#d32f2f]">*</span></span>
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
            <section ref={sectionRefs.milestoneChange} className={panelClass}>
              <div className={headerClass}>
                <h2 className={sectionTitleClass}>📊 Milestone Changes</h2>
                <p className={sectionSubtitleClass}>Add, modify date/amount, delete future milestones — paid milestones are blocked from modification</p>
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
                              <option value="modify-date">{milestoneAdjustmentLabels["modify-date"]}</option>
                              <option value="modify-amount">{milestoneAdjustmentLabels["modify-amount"]}</option>
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
            <section ref={sectionRefs.timeExtension} className={panelClass}>
              <div className={headerClass}>
                <h2 className={sectionTitleClass}>📅 Time Extension</h2>
                <p className={sectionSubtitleClass}>End date ≥ last unpaid milestone — extension period must be allowed under policy</p>
              </div>
              <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                <label className={labelClass}>
                  <span>Current End Date</span>
                  <input className={`${inputClass} bg-slate-100`} type="date" value={form.currentEndDate} disabled />
                </label>
                <label className={labelClass}>
                  <span>New End Date <span className="text-[#d32f2f]">*</span></span>
                  <input className={inputClass} type="date" value={form.newEndDate} onChange={(e) => updateField("newEndDate", e.target.value)} disabled={isLocked} />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  <span>Extension Justification</span>
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
            <section ref={sectionRefs.financialRuleChange} className={panelClass}>
              <div className={headerClass}>
                <h2 className={sectionTitleClass}>📐 Financial Rule Changes</h2>
                <p className={sectionSubtitleClass}>Cannot change rules affecting already processed invoices — changes apply only to unpaid milestones</p>
              </div>
              <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                <label className={labelClass}>
                  <span>New Retention %</span>
                  <input className={inputClass} type="number" value={form.newRetentionPercent} onChange={(e) => updateField("newRetentionPercent", e.target.value)} placeholder="e.g., 10" disabled={isLocked} />
                </label>
                <label className={labelClass}>
                  <span>Advance Recovery Rule</span>
                  <select className={inputClass} value={form.newAdvanceRecoveryRule} onChange={(e) => updateField("newAdvanceRecoveryRule", e.target.value)} disabled={isLocked}>
                    <option value="">-- No change --</option>
                    <option value="pro-rata">Pro-rata from RA bills</option>
                    <option value="lump-sum">Lump sum</option>
                    <option value="custom">Custom schedule</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Tax Applicability</span>
                  <select className={inputClass} value={form.newTaxApplicability} onChange={(e) => updateField("newTaxApplicability", e.target.value)} disabled={isLocked}>
                    <option value="">-- No change --</option>
                    <option value="yes">{taxLabels.yes}</option>
                    <option value="no">{taxLabels.no}</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Liquidated Damages Rule</span>
                  <input className={inputClass} value={form.newLdRule} onChange={(e) => updateField("newLdRule", e.target.value)} placeholder="e.g., 0.1% per day, max 10%" disabled={isLocked} />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  <span>Change Note</span>
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
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm">📝</div>
                  <div>
                    <h2 className={sectionTitleClass}>Revision Details</h2>
                    <p className={sectionSubtitleClass}>Select one or more revision types in the previous step to open the matching amendment detail sections.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-10">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 py-14 text-center">
                  <p className="text-lg font-bold text-slate-500">No revision types selected</p>
                  <p className="mt-2 text-sm text-slate-400">Go back to Step 1 and select at least one revision type.</p>
                </div>
              </div>
            </section>
          )}

          <section ref={(node) => { sectionRefs.justification.current = node; }} className={panelClass}>
            <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm">✍️</div>
                  <div>
                    <h2 className={sectionTitleClass}>Amendment Justification</h2>
                    <p className={sectionSubtitleClass}>Provide the business reason for this amendment. This note will be included in the approval workflow.</p>
                  </div>
                </div>
              </div>
            <div className="px-6 py-6">
              <label className={labelClass}>
                <span>Amendment Justification <span className="text-[#d32f2f]">*</span></span>
                <textarea className={`${inputClass} min-h-[120px]`} value={form.justification} onChange={(e) => updateField("justification", e.target.value)} placeholder="Provide detailed justification for the amendment request — this will be included in the approval workflow" disabled={isLocked} />
              </label>
            </div>
          </section>

          <StepNav step={1} />
        </div>
      )}

      {/* ─── STEP 2: Variation Documents ─── */}
      {activeStep === 2 && (
        <div className={stepContentShellClass}>
          <section ref={sectionRefs.variationDocuments} className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm">📎</div>
                <div>
                  <h2 className={sectionTitleClass}>Variation Documents</h2>
                  <p className={sectionSubtitleClass}>Upload variation order, approval authority, and supporting evidence in one consistent workspace</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              {[
                { label: "Variation Order Document", mandatory: true },
                { label: "Approval Authority Document", mandatory: true },
                { label: "Cost Estimate / BOQ Revision", mandatory: false },
                { label: "Commitment Enhancement Approval", mandatory: false },
              ].map((doc) => (
                <div key={doc.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-5">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{doc.label}</p>
                    <p className="text-xs text-slate-500">{doc.mandatory ? "Mandatory" : "Optional"}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                    onClick={() => addVariationDoc(doc.label, doc.mandatory)}
                    disabled={isLocked}
                  >
                    Upload
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={panelClass}>
            <div className={headerClass}>
              <h2 className={sectionTitleClass}>Uploaded Files</h2>
              <p className={sectionSubtitleClass}>Review the files attached to this amendment request before final validation</p>
            </div>
            <div className="px-6 py-6">
              {form.variationDocuments.length > 0 ? (
                <div className="space-y-3">
                  {form.variationDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{doc.label}</p>
                        <p className="text-xs text-slate-500">{doc.fileName} • {doc.fileSize} • {doc.uploadedAt}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${doc.mandatory ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {doc.mandatory ? "Mandatory" : "Optional"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <p className="text-lg font-bold text-slate-400">No documents uploaded yet</p>
                  <p className="mt-2 text-sm text-slate-400">Upload the required files above to keep the amendment package complete.</p>
                </div>
              )}
            </div>
          </section>

          <StepNav step={2} />
        </div>
      )}

      {/* ─── STEP 3: Validate & Submit ─── */}
      {activeStep === 3 && (
        <div className={stepContentShellClass}>
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-700 shadow-sm">✅</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Amendment Validation</h2>
                  <p className="mt-1 text-sm text-slate-600">All blockers must pass before submission. Click any issue below to jump to the related section.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 px-6 py-6">
              {validationResults.map((result) => {
                const isClickable = !result.passed;
                return (
                  <button
                    key={result.key}
                    type="button"
                    onClick={() => isClickable && navigateToValidationIssue(result.key)}
                    className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                      result.passed
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100/70"
                    } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <p className={`text-sm font-bold ${result.passed ? "text-emerald-800" : "text-red-800"}`}>{result.label}</p>
                    <p className={`mt-1 text-xs ${result.passed ? "text-emerald-700" : "text-red-700"}`}>{result.message}</p>
                    {!result.passed && <p className="mt-2 text-[11px] font-semibold text-red-600">Click to open the related section</p>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={panelClass}>
            <div className={headerClass}>
              <h2 className="text-xl font-extrabold text-slate-900">Submit Amendment</h2>
              <p className="mt-1 text-sm text-slate-600">Once all blockers pass, the amendment request can move into the approval workflow.</p>
            </div>
            <div className="flex items-center justify-between gap-4 px-6 py-6">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className={`${btnClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm`}
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={blockers.length > 0}
                className={`${btnClass} ${blockers.length > 0 ? "cursor-not-allowed bg-slate-200 text-slate-500 shadow-none" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"}`}
              >
                Submit for Approval
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
