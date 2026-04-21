import { useState, useMemo, useCallback, useEffect } from "react";
import type {
  ClosureFormState,
  ClosureValidationResult,
  SettlementItem,
  ClosureDocument,
} from "./types";
import { useContractData } from "../../../shared/context/ContractDataContext";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import {
  InvoiceBillDataProvider,
  useInvoiceBillData,
} from "../invoiceBill/context/InvoiceBillDataContext";
import {
  useContractClosureMasterData,
  closureLabelToKey,
  closureKeyToLabel,
  triggerForCategory,
  isCompletionKey,
  isCourtVerdictKey,
  isForceMajeureKey,
  isTerminationKey,
  isSettlementInflow,
  isRetentionReleaseType,
  isAdvanceRecoveryType,
} from "./hooks/useContractClosureMasterData";
import {
  INITIAL_STATE,
  closureTypeIcon,
  panelClass,
  headerClass,
  inputClass,
  labelClass,
  btnClass,
  SelectedContractSummary,
  ContractFullDetails,
} from "./closureFlow";
export function ContractClosurePage() {
  /* The closure module reads paid bills from the Invoice & Bill registry to
     auto-derive total paid / outstanding balance, so it needs to live inside
     the same provider that the Invoice & Bill page uses. */
  return (
    <InvoiceBillDataProvider>
      <ContractClosureInner />
    </InvoiceBillDataProvider>
  );
}

function ContractClosureInner() {
  const [form, setForm] = useState<ClosureFormState>(INITIAL_STATE);
  const [activeStep, setActiveStep] = useState(0);

  /* ── Live data sources (PRN 5.x dynamic wiring) ─────────────────────── */
  const { contracts } = useContractData();
  const { contractors } = useContractorData();
  const { records: invoiceBillRecords } = useInvoiceBillData();
  const master = useContractClosureMasterData();

  /* Eligible contracts: anything that's not already closed/draft. We
     intentionally show all approved/active/expired contracts so the
     officer can pick the one they want to close. */
  const eligibleContracts = useMemo(() => {
    return contracts.filter((c) => {
      const status = (c.formData?.contractStatus || "").toLowerCase();
      const wf = (c.workflowStatus || "").toLowerCase();
      if (wf === "closed" || status === "closed") return false;
      return true;
    });
  }, [contracts]);

  /* Slug-based semantic keys derived from the current form state. */
  const closureSlug = form.closureType || "";
  const isCompletionClosure = isCompletionKey(closureSlug);
  const isCourtVerdictClosure = isCourtVerdictKey(closureSlug);
  const isForceMajeureClosure = isForceMajeureKey(closureSlug);
  const isTerminationClosure = isTerminationKey(closureSlug);

  /* The currently linked contract — drives every auto-derive below. */
  const linkedContract = useMemo(
    () => contracts.find((c) => c.contractId === form.contractId) || null,
    [contracts, form.contractId],
  );

  /* The contractor associated with the linked contract — resolved from the
     Contractor Registry by id → registration # → display name. */
  const linkedContractor = useMemo(() => {
    if (!linkedContract) return null;
    const f = linkedContract.formData;
    return (
      contractors.find((cn) => cn.id === f?.contractorId) ||
      contractors.find((cn) => cn.registrationNumber === f?.contractorId) ||
      contractors.find((cn) => cn.displayName === f?.contractorName) ||
      null
    );
  }, [contractors, linkedContract]);

  /* Paid bills against this contract — drives totalPaid / outstandingBalance.
     We treat any record whose workflowStatus contains "paid" or "approved"
     and whose linked contractId matches as a settled obligation. */
  const paidBills = useMemo(() => {
    if (!linkedContract) return [];
    return invoiceBillRecords.filter((r) => {
      if (r.invoice?.contractId !== linkedContract.contractId) return false;
      const wf = (r.workflowStatus || "").toLowerCase();
      return wf.includes("paid") || wf.includes("released") || wf.includes("approved");
    });
  }, [invoiceBillRecords, linkedContract]);

  const paidBillsTotal = useMemo(
    () =>
      paidBills.reduce(
        (sum, r) => sum + (parseFloat(r.bill?.netPayableAmount || r.invoice?.netPayableAmount || "0") || 0),
        0,
      ),
    [paidBills],
  );

  const retentionWithheldFromBills = useMemo(
    () =>
      paidBills.reduce(
        (sum, r) => sum + (parseFloat(r.bill?.retentionAmount || r.invoice?.retentionAmount || "0") || 0),
        0,
      ),
    [paidBills],
  );

  /* ── Auto-fill the closure header from the linked contract ───────────── */
  useEffect(() => {
    if (!linkedContract) return;
    const f = linkedContract.formData;
    const contractValue = f?.contractValue || linkedContract.contractValue || "";
    const totalPaid = paidBillsTotal.toFixed(2);
    const outstanding = Math.max(
      0,
      (parseFloat(contractValue) || 0) - paidBillsTotal,
    ).toFixed(2);

    /* Retention held — prefer the sum collected from paid bills, fall
       back to contract.retentionRate × contractValue. */
    const retentionRate = parseFloat(f?.retentionRate || "0") || 0;
    const retentionFromContract =
      retentionRate > 0 ? (((parseFloat(contractValue) || 0) * retentionRate) / 100).toFixed(2) : "0";
    const retentionHeld =
      retentionWithheldFromBills > 0 ? retentionWithheldFromBills.toFixed(2) : retentionFromContract;

    /* Suggested trigger category — pick the first master-data category
       whose keyword matches the contract's own category string. We never
       hardcode category labels; they come from
       master.triggerCategories. */
    const rawCat = (linkedContract.contractCategory?.[0] || "").toLowerCase();
    const matchedCat =
      master.triggerCategories.find((m) => rawCat.includes(m.toLowerCase())) ||
      "";
    const triggerCat = matchedCat.toLowerCase();

    /* Suggested closure type — if the contract already carries one, slugify
       it. If master.closureTypes is populated we keep the existing
       closureType only when the slug still matches one of the options. */
    const fromContractSlug = closureLabelToKey(f?.closureType || "");
    const allowedSlugs = master.closureTypes.map(closureLabelToKey);
    const suggestedClosureKey =
      fromContractSlug && allowedSlugs.includes(fromContractSlug)
        ? fromContractSlug
        : "";

    setForm((prev) => ({
      ...prev,
      contractTitle: linkedContract.contractTitle || prev.contractTitle,
      contractValue: contractValue || prev.contractValue,
      totalPaid,
      outstandingBalance: outstanding,
      retentionHeld,
      contractCategoryForTrigger: prev.contractCategoryForTrigger || triggerCat,
      closureType: prev.closureType || suggestedClosureKey,
      closureJustification:
        prev.closureJustification || (f?.closureReason || ""),
      commitmentReleaseAmount: prev.commitmentReleaseAmount || outstanding,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedContract?.contractId, paidBillsTotal, retentionWithheldFromBills]);

  /* ── Auto-seed settlement items from contract data ───────────────────── */
  useEffect(() => {
    if (!linkedContract) return;
    if (form.settlementItems.length > 0) return; // never trample manual edits
    const seeded: SettlementItem[] = [];
    const f = linkedContract.formData;

    /* Resolve settlement line-type slugs from the master-data list so
       the seeded rows always match options the admin actually configured. */
    const findType = (predicate: (label: string) => boolean): string => {
      const match = master.settlementLineTypes.find(predicate);
      return match ? closureLabelToKey(match) : "";
    };
    const retentionType = findType((l) => /retention/i.test(l));
    const advanceType = findType((l) => /advance/i.test(l));
    const ldType = findType((l) => /\bld\b|liquidat|damage/i.test(l));

    const retNum = parseFloat(form.retentionHeld || "0") || 0;
    if (retNum > 0 && retentionType) {
      seeded.push({
        id: `SI-RET-${Date.now()}`,
        description: `Retention release on contract ${linkedContract.contractId}`,
        amount: retNum.toFixed(2),
        type: retentionType,
        settled: false,
        taxApplicable: false,
        taxAmount: "",
        taxType: "",
      });
    }

    const advNum = parseFloat(f?.advanceRecoveryAmount || f?.advanceAmount || "0") || 0;
    if (advNum > 0 && f?.advanceRecoverable !== false && advanceType) {
      seeded.push({
        id: `SI-ADV-${Date.now() + 1}`,
        description: `Outstanding advance recovery (${f?.advanceRecoveryMethod || "method TBD"})`,
        amount: advNum.toFixed(2),
        type: advanceType,
        settled: false,
        taxApplicable: false,
        taxAmount: "",
        taxType: "",
      });
    }

    const ldLimit = parseFloat(f?.liquidatedDamagesLimit || "0") || 0;
    if (ldLimit > 0 && isTerminationKey(form.closureType) && ldType) {
      seeded.push({
        id: `SI-LD-${Date.now() + 2}`,
        description: `Liquidated damages (max ${ldLimit.toFixed(2)})`,
        amount: ldLimit.toFixed(2),
        type: ldType,
        settled: false,
        taxApplicable: false,
        taxAmount: "",
        taxType: "",
      });
    }

    if (seeded.length > 0) {
      setForm((prev) => ({ ...prev, settlementItems: seeded }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedContract?.contractId, form.closureType]);

  /* ── Auto-fire eGP / CMS notification when category resolves ──────────── */
  useEffect(() => {
    const trig = triggerForCategory(form.contractCategoryForTrigger);
    if (!trig) return;
    if (trig === "egp" && !form.egpNotified) {
      setForm((prev) => ({ ...prev, egpNotified: true }));
    } else if (trig === "cms" && !form.cmsNotified) {
      setForm((prev) => ({ ...prev, cmsNotified: true }));
    }
  }, [form.contractCategoryForTrigger, form.egpNotified, form.cmsNotified]);

  const updateField = useCallback(<K extends keyof ClosureFormState>(key: K, value: ClosureFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addSettlementItem = () => {
    const item: SettlementItem = {
      id: `SI-${Date.now()}`,
      description: "",
      amount: "",
      type: "due-to-contractor",
      settled: false,
      taxApplicable: false,
      taxAmount: "",
      taxType: "",
    };
    setForm((prev) => ({ ...prev, settlementItems: [...prev.settlementItems, item] }));
  };

  const updateSettlementItem = (id: string, field: keyof SettlementItem, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      settlementItems: prev.settlementItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addClosureDoc = (label: string, mandatory: boolean) => {
    const doc: ClosureDocument = {
      id: `cdoc-${Date.now()}`,
      label,
      fileName: `${label.replace(/\s+/g, "_")}.pdf`,
      fileSize: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString().slice(0, 10),
      mandatory,
    };
    setForm((prev) => ({ ...prev, closureDocuments: [...prev.closureDocuments, doc] }));
  };

  /* ─── settlement calculation ─── */
  const netSettlement = useMemo(() => {
    let total = 0;
    for (const item of form.settlementItems) {
      const amt = parseFloat(item.amount) || 0;
      const tax = item.taxApplicable ? (parseFloat(item.taxAmount) || 0) : 0;
      if (isSettlementInflow(item.type)) {
        total += amt - tax;
      } else {
        total -= amt;
      }
    }
    return total;
  }, [form.settlementItems]);

  const totalTaxOnSettlement = useMemo(() => {
    return form.settlementItems.reduce((sum, item) => {
      return sum + (item.taxApplicable ? (parseFloat(item.taxAmount) || 0) : 0);
    }, 0);
  }, [form.settlementItems]);

  /* ─── validations (rule-driven against linked contract / contractor) ─── */
  const validationResults = useMemo<ClosureValidationResult[]>(() => {
    const results: ClosureValidationResult[] = [];

    /* 1. Contract resolves to a live record in the registry. */
    results.push({
      key: "contract-selected",
      label: "Contract selected & resolved from registry",
      passed: !!linkedContract,
      message: linkedContract
        ? `Linked to ${linkedContract.contractId} — ${linkedContract.contractTitle}`
        : "Select a contract from the registry dropdown.",
      severity: "blocker",
    });

    /* 2. Closure type captured. */
    results.push({
      key: "closure-type",
      label: "Closure type selected",
      passed: !!form.closureType,
      message: form.closureType
        ? closureKeyToLabel(form.closureType, master.closureTypes) || form.closureType
        : "Select closure type",
      severity: "blocker",
    });

    /* 3. Justification minimum length. */
    results.push({
      key: "justification",
      label: "Closure justification provided",
      passed: form.closureJustification.length > 10,
      message:
        form.closureJustification.length > 10
          ? "Provided"
          : "Minimum 10 characters",
      severity: "blocker",
    });

    /* 4. All paid bills tally — totalPaid + outstanding ≈ contractValue. */
    const cv = parseFloat(form.contractValue || "0") || 0;
    const tp = parseFloat(form.totalPaid || "0") || 0;
    const ob = parseFloat(form.outstandingBalance || "0") || 0;
    const tally = Math.abs(cv - (tp + ob)) < 0.01;
    results.push({
      key: "financial-tally",
      label: "Contract value reconciles with paid + outstanding",
      passed: cv === 0 || tally,
      message: tally
        ? `Nu ${cv.toLocaleString()} = paid Nu ${tp.toLocaleString()} + outstanding Nu ${ob.toLocaleString()}`
        : `Nu ${cv.toLocaleString()} ≠ paid Nu ${tp.toLocaleString()} + outstanding Nu ${ob.toLocaleString()}`,
      severity: "blocker",
    });

    /* 5. Completion-of-work closure requires the contract to be fully paid. */
    if (isCompletionClosure) {
      results.push({
        key: "fully-paid",
        label: "Contract is fully paid (completion closure)",
        passed: cv === 0 || tp >= cv - 0.01,
        message:
          tp >= cv - 0.01
            ? "All bills paid — eligible for completion closure."
            : `Outstanding Nu ${ob.toLocaleString()} — pay or change closure type.`,
        severity: "blocker",
      });
    }

    /* 6. Contractor active & not debarred. */
    results.push({
      key: "contractor-active",
      label: "Contractor is active in registry",
      passed:
        !linkedContractor ||
        /active/i.test(linkedContractor.status || "") ||
        /verified/i.test(linkedContractor.status || ""),
      message: linkedContractor
        ? `Registry status: ${linkedContractor.status || "n/a"}`
        : "No contractor resolved.",
      severity: "warning",
    });

    /* 7. No open advances — pulled from contract.advanceRecoveryAmount. */
    const openAdv = parseFloat(linkedContract?.formData?.advanceRecoveryAmount || "0") || 0;
    const advLineSettled =
      form.settlementItems
        .filter((i) => isAdvanceRecoveryType(i.type) && i.settled)
        .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) >= openAdv;
    results.push({
      key: "advance-cleared",
      label: "Advance recovery captured & settled",
      passed: openAdv === 0 || advLineSettled,
      message:
        openAdv === 0
          ? "No outstanding advances on this contract."
          : advLineSettled
            ? "Advance recovery line settled."
            : `Outstanding advance Nu ${openAdv.toLocaleString()} — settle on closure.`,
      severity: "blocker",
    });

    /* 8. Retention captured if contract requires it. */
    const retApplicable = !!linkedContract?.formData?.retentionApplicable;
    const retSettled =
      form.settlementItems
        .filter((i) => isRetentionReleaseType(i.type) && i.settled)
        .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) > 0;
    results.push({
      key: "retention-handled",
      label: "Retention release captured (if applicable)",
      passed: !retApplicable || retSettled || form.retentionReleaseTriggered,
      message: retApplicable
        ? form.retentionReleaseTriggered || retSettled
          ? "Retention released."
          : "Trigger retention release before closure."
        : "Not applicable.",
      severity: retApplicable ? "blocker" : "warning",
    });

    /* 9. Dues settled toggle. */
    results.push({
      key: "dues-settled",
      label: "All dues and obligations settled",
      passed: form.allDuesSettled,
      message: form.allDuesSettled
        ? "All settled"
        : "Mark settlement complete after verifying all items",
      severity: "blocker",
    });

    /* 10. Mandatory documents uploaded — entirely driven by the
       closure-document-type master data. A document is mandatory when
       its label carries a keyword that matches the currently selected
       closure semantics. */
    const mandatoryLabels = master.documentTypes.filter((label) => {
      const lc = label.toLowerCase();
      if (lc.includes("court") || lc.includes("arbitrat")) return isCourtVerdictClosure;
      if (lc.includes("force") || lc.includes("majeure")) return isForceMajeureClosure;
      if (lc.includes("terminat")) return isTerminationClosure;
      return lc.includes("completion") || lc.includes("settlement") || lc.includes("final account") || lc.includes("closure report");
    });
    const uploadedLabels = new Set(form.closureDocuments.map((d) => d.label));
    const missingDocs = mandatoryLabels.filter((l) => !uploadedLabels.has(l));
    results.push({
      key: "documents",
      label: "Mandatory closure documents uploaded",
      passed: missingDocs.length === 0,
      message:
        missingDocs.length === 0
          ? `${form.closureDocuments.length} document(s) uploaded`
          : `Missing: ${missingDocs.join(", ")}`,
      severity: "blocker",
    });

    /* 11. Trigger category captured. */
    results.push({
      key: "category-trigger",
      label: "Contract category set for system triggers",
      passed: !!form.contractCategoryForTrigger,
      message: form.contractCategoryForTrigger
        ? `Category: ${form.contractCategoryForTrigger} → ${triggerForCategory(form.contractCategoryForTrigger).toUpperCase()}`
        : "Set contract category for eGP/CMS notification",
      severity: "warning",
    });

    return results;
  }, [
    form,
    linkedContract,
    linkedContractor,
    master.documentTypes,
    master.closureTypes,
    isCompletionClosure,
    isCourtVerdictClosure,
    isForceMajeureClosure,
    isTerminationClosure,
  ]);

  const blockers = validationResults.filter((v) => v.severity === "blocker" && !v.passed);
  const isLocked = form.workflowStatus !== "draft";

  const handleSubmit = () => {
    if (blockers.length > 0) return;
    setForm((prev) => ({
      ...prev,
      workflowStatus: "submitted",
      submittedAt: new Date().toISOString(),
      totalTaxOnSettlement: totalTaxOnSettlement.toFixed(2),
    }));
  };

  const handleTriggerBudgetRelease = () => {
    setForm((prev) => ({
      ...prev,
      budgetReleaseTriggered: true,
      budgetBalanceOnActivity: (parseFloat(prev.outstandingBalance) || 0).toFixed(2),
      commitmentReleaseAmount: (parseFloat(prev.outstandingBalance) || 0).toFixed(2),
    }));
  };

  const handleTriggerRetentionRelease = () => {
    setForm((prev) => ({
      ...prev,
      retentionReleaseTriggered: true,
      retentionReleaseAmount: (parseFloat(prev.retentionHeld) || 0).toFixed(2),
      retentionReleaseDate: new Date().toISOString().slice(0, 10),
      finalPaymentOrderRef: `PO-CLO-${Date.now().toString(36).toUpperCase()}`,
    }));
  };

  const handleTriggerSystemNotification = () => {
    const trig = triggerForCategory(form.contractCategoryForTrigger);
    setForm((prev) => ({
      ...prev,
      egpNotified: trig === "egp",
      cmsNotified: trig === "cms",
    }));
  };

  const STEPS = [
    { id: 0, title: "Contract & Closure Type", short: "Select" },
    { id: 1, title: "Settlement of Dues", short: "Settlement" },
    { id: 2, title: "Budget Release & System Triggers", short: "Triggers" },
    { id: 3, title: "Documents & Submission", short: "Submit" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ─── header ─── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400">EXPENDITURE</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Contract Closure</h1>
          <p className="mt-1 text-sm text-slate-600">Initiate closure — settlement, budget release, eGP/CMS notification, and final approval</p>
        </div>
        <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
          {form.workflowStatus.replace(/-/g, " ").toUpperCase()}
        </span>
      </div>

      {/* ─── step navigator ─── */}
      <div className="flex gap-2 overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
        {STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-bold transition ${
              activeStep === step.id ? "bg-[#2563eb] text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setActiveStep(step.id)}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{step.id + 1}</span>
            {step.title}
          </button>
        ))}
      </div>

      {/* ─── STEP 0: Contract & Closure Type ─── */}
      {activeStep === 0 && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">📋</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">CONTRACT DETAILS</h2>
                  <p className="mt-1 text-sm text-slate-600">Select the contract to close — Roles: P-Level or above of the agency</p>
                </div>
              </div>
            </div>
            {/* Live linked-contract banner — shows the resolution that drives
                every auto-filled field below. */}
            {linkedContract && (
              <div className="mx-6 mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                      ✅ Linked to live contract
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-900">
                      {linkedContract.contractId} — {linkedContract.contractTitle}
                    </p>
                    <p className="text-xs text-emerald-700">
                      Category: {linkedContract.contractCategory?.join(", ") || "—"} ·
                      Status: {linkedContract.formData?.contractStatus || "—"} ·
                      Paid bills: {paidBills.length}
                    </p>
                  </div>
                  {linkedContractor && (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                        Contractor
                      </p>
                      <p className="text-sm font-bold text-emerald-900">{linkedContractor.displayName}</p>
                      <p className="text-xs text-emerald-700">
                        {linkedContractor.registrationNumber || "—"} · {linkedContractor.status || "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fully dynamic summary of the selected contract — every
                field of StoredContract relevant to closure. */}
            {linkedContract && (
              <div className="px-6 pt-6 space-y-4">
                <SelectedContractSummary
                  contract={linkedContract}
                  paidTotal={paidBillsTotal}
                  outstanding={Math.max(
                    0,
                    (parseFloat(linkedContract.contractValue || linkedContract.formData?.contractValue || "0") || 0) -
                      paidBillsTotal,
                  )}
                  retentionHeld={
                    retentionWithheldFromBills > 0
                      ? retentionWithheldFromBills
                      : ((parseFloat(linkedContract.contractValue || linkedContract.formData?.contractValue || "0") || 0) *
                          (parseFloat(linkedContract.formData?.retentionRate || "0") || 0)) /
                        100
                  }
                />
                <ContractFullDetails contract={linkedContract} />
              </div>
            )}

            <div className="grid gap-5 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
              <label className={labelClass}>
                <span>CONTRACT_ID <span className="text-[#d32f2f]">*</span> <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.1</span></span>
                <select
                  className={inputClass}
                  value={form.contractId}
                  onChange={(e) => updateField("contractId", e.target.value)}
                  disabled={isLocked}
                >
                  <option value="">— Select contract from registry —</option>
                  {eligibleContracts.map((c) => (
                    <option key={c.id} value={c.contractId}>
                      {c.contractId} · {c.contractTitle}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500">
                  {eligibleContracts.length} eligible contract(s) — closed contracts excluded
                </span>
              </label>
              <label className={labelClass}>
                <span>
                  CONTRACT_TITLE
                  <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.3</span>
                  {linkedContract && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">from contract</span>}
                </span>
                <input
                  className={`${inputClass} ${linkedContract ? "bg-emerald-50/60" : ""}`}
                  value={form.contractTitle}
                  onChange={(e) => updateField("contractTitle", e.target.value)}
                  placeholder="Auto-populated"
                  disabled={isLocked || !!linkedContract}
                />
              </label>
              <label className={labelClass}>
                <span>
                  CONTRACT_VALUE
                  <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.24</span>
                  {linkedContract && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">from contract</span>}
                </span>
                <input
                  className={`${inputClass} ${linkedContract ? "bg-emerald-50/60" : ""}`}
                  type="number"
                  value={form.contractValue}
                  onChange={(e) => updateField("contractValue", e.target.value)}
                  placeholder="0.00"
                  disabled={isLocked || !!linkedContract}
                />
              </label>
              <label className={labelClass}>
                <span>
                  TOTAL_PAID
                  <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.38</span>
                  {linkedContract && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">from paid bills</span>}
                </span>
                <input
                  className={`${inputClass} ${linkedContract ? "bg-emerald-50/60" : ""}`}
                  type="number"
                  value={form.totalPaid}
                  onChange={(e) => updateField("totalPaid", e.target.value)}
                  placeholder="0.00"
                  disabled={isLocked || !!linkedContract}
                />
                {linkedContract && (
                  <span className="text-[10px] text-emerald-700">
                    Σ {paidBills.length} paid bill(s) from Invoice & Bill registry
                  </span>
                )}
              </label>
              <label className={labelClass}>
                <span>
                  OUTSTANDING_BALANCE
                  <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.38</span>
                  {linkedContract && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">auto</span>}
                </span>
                <input
                  className={`${inputClass} ${linkedContract ? "bg-emerald-50/60" : ""}`}
                  type="number"
                  value={form.outstandingBalance}
                  onChange={(e) => updateField("outstandingBalance", e.target.value)}
                  placeholder="0.00"
                  disabled={isLocked || !!linkedContract}
                />
              </label>
              <label className={labelClass}>
                <span>
                  RETENTION_HELD
                  <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.32</span>
                  {linkedContract && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">auto</span>}
                </span>
                <input
                  className={`${inputClass} ${linkedContract ? "bg-emerald-50/60" : ""}`}
                  type="number"
                  value={form.retentionHeld}
                  onChange={(e) => updateField("retentionHeld", e.target.value)}
                  placeholder="0.00"
                  disabled={isLocked || !!linkedContract}
                />
              </label>
            </div>
          </section>

          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">🏁</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">CLOSURE TYPE</h2>
                  <p className="mt-1 text-sm text-slate-600">Select the type of contract closure</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
              {master.closureTypes.length === 0 && (
                <div className="col-span-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs font-bold text-amber-700">
                  ⚠️ No closure types configured in master data. Populate the
                  <span className="font-mono"> closure-type </span> list under
                  /master-data to enable closure type selection.
                </div>
              )}
              {master.closureTypes.map((label) => {
                /* Every entry here is sourced from the
                   closure-type master-data list — no hardcoded catalogue. */
                const key = closureLabelToKey(label);
                const selected = form.closureType === key;
                return (
                  <button
                    key={key || label}
                    type="button"
                    disabled={isLocked}
                    className={`flex items-start gap-3 rounded-2xl border-2 px-5 py-4 text-left transition ${
                      selected ? "border-[#2563eb] bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"
                    }`}
                    onClick={() => updateField("closureType", key)}
                  >
                    <span className="text-2xl">{closureTypeIcon(key)}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Closure type sourced from master data
                        <span className="ml-1 font-mono text-[10px] text-slate-400">({key})</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-6 pb-6">
              <label className={labelClass}>
                <span>CLOSURE JUSTIFICATION <span className="text-[#d32f2f]">*</span> <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.40</span></span>
                <textarea className={`${inputClass} min-h-[100px]`} value={form.closureJustification} onChange={(e) => updateField("closureJustification", e.target.value)} placeholder="Provide justification for the closure" disabled={isLocked} />
              </label>
              <label className={`${labelClass} mt-4`}>
                <span>CLOSURE DATE <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.38</span></span>
                <input className={inputClass} type="date" value={form.closureDate} onChange={(e) => updateField("closureDate", e.target.value)} disabled={isLocked} />
              </label>
            </div>
          </section>
        </div>
      )}

      {/* ─── STEP 1: Settlement of Dues ─── */}
      {activeStep === 1 && (
        <section className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">💳</div>
              <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">SETTLEMENT OF DUES & OBLIGATIONS</h2>
                <p className="mt-1 text-sm text-slate-600">Upon settlement of all dues and obligations to contractor on termination — accepted by head of agency</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 space-y-4">
            {/* settlement items table */}
            {form.settlementItems.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-rose-100">
                <table className="w-full text-sm">
                  <thead className="bg-rose-50 text-left text-xs font-bold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount (BTN)</th>
                      <th className="px-4 py-3">Tax Applicable</th>
                      <th className="px-4 py-3">Tax Type</th>
                      <th className="px-4 py-3">Tax Amt (BTN)</th>
                      <th className="px-4 py-3">Settled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.settlementItems.map((item) => (
                      <tr key={item.id} className="border-t border-rose-100">
                        <td className="px-4 py-3">
                          <input className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs" value={item.description} onChange={(e) => updateSettlementItem(item.id, "description", e.target.value)} placeholder="Description" disabled={isLocked} />
                        </td>
                        <td className="px-4 py-3">
                          <select className="rounded-xl border border-slate-200 px-2 py-1 text-xs" value={item.type} onChange={(e) => updateSettlementItem(item.id, "type", e.target.value)} disabled={isLocked}>
                            <option value="">—</option>
                            {master.settlementLineTypes.map((label) => {
                              const value = closureLabelToKey(label);
                              return <option key={label} value={value}>{label}</option>;
                            })}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input className="w-28 rounded-xl border border-slate-200 px-2 py-1 text-xs" type="number" value={item.amount} onChange={(e) => updateSettlementItem(item.id, "amount", e.target.value)} placeholder="0.00" disabled={isLocked} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={item.taxApplicable} onChange={(e) => updateSettlementItem(item.id, "taxApplicable", e.target.checked)} disabled={isLocked} />
                        </td>
                        <td className="px-4 py-3">
                          <select className="rounded-xl border border-slate-200 px-2 py-1 text-xs" value={item.taxType} onChange={(e) => updateSettlementItem(item.id, "taxType", e.target.value)} disabled={isLocked || !item.taxApplicable}>
                            <option value="">--</option>
                            {master.taxCodes.map((tc) => (
                              <option key={tc} value={tc}>{tc}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input className="w-24 rounded-xl border border-slate-200 px-2 py-1 text-xs" type="number" value={item.taxAmount} onChange={(e) => updateSettlementItem(item.id, "taxAmount", e.target.value)} placeholder="0.00" disabled={isLocked || !item.taxApplicable} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={item.settled} onChange={(e) => updateSettlementItem(item.id, "settled", e.target.checked)} disabled={isLocked} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

              <button type="button" className={`${btnClass} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`} onClick={addSettlementItem} disabled={isLocked}>
              + Add Settlement Item
            </button>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-sm font-bold text-slate-700">Net Settlement Amount:</p>
                <p className={`text-xl font-extrabold ${netSettlement >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  BTN {netSettlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
                <p className="text-sm font-bold text-violet-800">Total Tax on Settlement: <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">SRS DD 14.1.27</span></p>
                <p className="text-xl font-extrabold text-violet-700">
                  BTN {totalTaxOnSettlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={form.allDuesSettled} onChange={(e) => updateField("allDuesSettled", e.target.checked)} disabled={isLocked} />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
              <div>
                <p className="text-sm font-bold text-amber-900">All Dues & Obligations Settled</p>
                <p className="text-xs text-amber-700">Confirm that all financial obligations between the Government (procuring agency) and contractor have been settled</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── STEP 2: Budget Release & System Triggers ─── */}
      {activeStep === 2 && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">🏦</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">BUDGET RELEASE</h2>
                  <p className="mt-1 text-sm text-slate-600">Trigger Budget Management module for budget balance on activity/program, sub-program</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                <p className="text-sm font-bold text-sky-900">Budget Release Process</p>
                <div className="mt-2 space-y-1 text-xs text-sky-800">
                  <p>Upon settlement and approval by Head of Agency, the Expenditure Management module triggers the Budget Management module</p>
                  <p>Budget balance on that activity/program, sub-program and activity is released</p>
                  <p>The budget balance should be utilized by awarding to a new contract</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  <span>COMMITMENT RELEASE AMOUNT <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.6</span></span>
                  <input className={`${inputClass} ${form.budgetReleaseTriggered ? "bg-emerald-50 border-emerald-200" : ""}`} value={form.commitmentReleaseAmount} onChange={(e) => updateField("commitmentReleaseAmount", e.target.value)} placeholder="Auto-calculated from outstanding balance" disabled={isLocked} />
                </label>
                <label className={labelClass}>
                  <span>BUDGET BALANCE ON ACTIVITY <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.7</span></span>
                  <input className={`${inputClass} ${form.budgetReleaseTriggered ? "bg-emerald-50 border-emerald-200" : ""}`} value={form.budgetBalanceOnActivity} onChange={(e) => updateField("budgetBalanceOnActivity", e.target.value)} placeholder="Updated after trigger" disabled={isLocked} />
                </label>
              </div>

              <button
                type="button"
                className={`${btnClass} ${form.budgetReleaseTriggered ? "bg-emerald-600 text-white" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"}`}
                onClick={handleTriggerBudgetRelease}
                disabled={isLocked || form.budgetReleaseTriggered}
              >
                {form.budgetReleaseTriggered ? "✅ Budget Release Triggered" : "Trigger Budget Release"}
              </button>
            </div>
          </section>

          {/* ─── Retention Release (SRS DLP / Retention Money Management) ─── */}
          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">🔒</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">RETENTION RELEASE</h2>
                  <p className="mt-1 text-sm text-slate-600">Release retention money held during DLP — issues final Payment Order to contractor</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
                <p className="text-sm font-bold text-violet-900">Retention Release Process</p>
                <div className="mt-2 space-y-1 text-xs text-violet-800">
                  <p>On contract closure, retention money held during the Defect Liability Period is released to the contractor</p>
                  <p>The system creates a Final Payment Order Reference linked to this closure</p>
                  <p>Triggered by P-Level / Head of Agency upon successful closure validation</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className={labelClass}>
                  <span>RETENTION HELD <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.32</span></span>
                  <input className={inputClass} type="number" value={form.retentionHeld} readOnly placeholder="0.00" />
                </label>
                <label className={labelClass}>
                  <span>RETENTION RELEASE AMOUNT <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.34</span></span>
                  <input className={`${inputClass} ${form.retentionReleaseTriggered ? "bg-emerald-50 border-emerald-200" : ""}`} value={form.retentionReleaseAmount} onChange={(e) => updateField("retentionReleaseAmount", e.target.value)} placeholder="Auto on trigger" disabled={isLocked} />
                </label>
                <label className={labelClass}>
                  <span>RETENTION RELEASE DATE <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.35</span></span>
                  <input className={`${inputClass} ${form.retentionReleaseTriggered ? "bg-emerald-50 border-emerald-200" : ""}`} type="date" value={form.retentionReleaseDate} onChange={(e) => updateField("retentionReleaseDate", e.target.value)} disabled={isLocked} />
                </label>
              </div>

              <label className={labelClass}>
                <span>FINAL PAYMENT ORDER REF <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.40</span></span>
                <input className={`${inputClass} ${form.finalPaymentOrderRef ? "bg-emerald-50 border-emerald-200" : ""}`} value={form.finalPaymentOrderRef} onChange={(e) => updateField("finalPaymentOrderRef", e.target.value)} placeholder="Auto-generated on retention release" disabled={isLocked} />
              </label>

              <button
                type="button"
                className={`${btnClass} ${form.retentionReleaseTriggered ? "bg-emerald-600 text-white" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"}`}
                onClick={handleTriggerRetentionRelease}
                disabled={isLocked || form.retentionReleaseTriggered || !form.retentionHeld}
              >
                {form.retentionReleaseTriggered ? "✅ Retention Released — Final PO Issued" : "Trigger Retention Release"}
              </button>
            </div>
          </section>

          <section className={panelClass}>
            <div className={headerClass}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-2xl text-white">🔗</div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">SYSTEM TRIGGERS (eGP / CMS)</h2>
                  <p className="mt-1 text-sm text-slate-600">Trigger eGP for Goods & Services, CMS for Works contracts</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              <label className={labelClass}>
                <span>CONTRACT CATEGORY FOR TRIGGER <span className="text-[#d32f2f]">*</span> <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">DD 14.1.22</span></span>
                <select className={inputClass} value={form.contractCategoryForTrigger} onChange={(e) => updateField("contractCategoryForTrigger", e.target.value)} disabled={isLocked}>
                  <option value="">-- Select --</option>
                  {master.triggerCategories.map((cat) => {
                    const value = cat.toLowerCase();
                    const trig = triggerForCategory(cat).toUpperCase();
                    return (
                      <option key={cat} value={value}>
                        {cat} — triggers {trig || "—"}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${form.egpNotified ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                  <span className="text-2xl">{form.egpNotified ? "✅" : "⬜"}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">eGP Notification</p>
                    <p className="text-xs text-slate-500">For Goods and Services contracts</p>
                  </div>
                </div>
                <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${form.cmsNotified ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                  <span className="text-2xl">{form.cmsNotified ? "✅" : "⬜"}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">CMS Notification</p>
                    <p className="text-xs text-slate-500">For Works contracts</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`${btnClass} ${form.egpNotified || form.cmsNotified ? "bg-emerald-600 text-white" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"}`}
                onClick={handleTriggerSystemNotification}
                disabled={isLocked || !form.contractCategoryForTrigger || form.egpNotified || form.cmsNotified}
              >
                {form.egpNotified || form.cmsNotified ? "✅ System Notified" : "Trigger System Notification"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ─── STEP 3: Documents & Submission ─── */}
      {activeStep === 3 && (
        <div className="space-y-6">
          <section className={panelClass}>
            <div className={headerClass}>
              <h2 className="text-xl font-extrabold text-slate-900">📎 CLOSURE DOCUMENTS</h2>
              <p className="mt-1 text-xs text-slate-600">Upload required closure / termination documents</p>
            </div>
            <div className="grid gap-3 px-6 py-6 md:grid-cols-2">
              {master.documentTypes.map((label) => {
                const lc = label.toLowerCase();
                const mandatory =
                  lc.includes("completion") ||
                  lc.includes("settlement statement") ||
                  lc.includes("final account") ||
                  lc.includes("closure report") ||
                  (lc.includes("terminat") && isTerminationClosure) ||
                  ((lc.includes("court") || lc.includes("arbitrat")) && isCourtVerdictClosure) ||
                  ((lc.includes("force") || lc.includes("majeure")) && isForceMajeureClosure);
                const docType = { label, mandatory };
                return docType;
              }).map((docType) => {
                const uploaded = form.closureDocuments.find((d) => d.label === docType.label);
                return (
                  <div key={docType.label} className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${uploaded ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{docType.label}</p>
                      <p className="text-xs text-slate-500">{docType.mandatory ? "Mandatory" : "Optional"}</p>
                      {uploaded && <p className="mt-1 text-xs text-emerald-700">{uploaded.fileName} — {uploaded.fileSize}</p>}
                    </div>
                    {!uploaded ? (
                      <button type="button" className={`${btnClass} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`} onClick={() => addClosureDoc(docType.label, docType.mandatory)} disabled={isLocked}>
                        Upload
                      </button>
                    ) : (
                      <span className="text-lg">✅</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className={panelClass}>
            <div className={headerClass}>
              <h2 className="text-xl font-extrabold text-slate-900">CLOSURE VALIDATION</h2>
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
              <h2 className="text-xl font-extrabold text-slate-900">APPROVAL WORKFLOW</h2>
              <p className="mt-1 text-xs text-slate-600">Agency Staff (P-Level or above) → Head of Agency</p>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-3">
                {form.approvalSteps.map((step, idx) => (
                  <div key={step.role} className="flex items-center gap-3">
                    <div className={`rounded-2xl border px-5 py-4 text-center ${step.status === "approved" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-xs font-bold text-slate-700">{step.role}</p>
                      <p className={`mt-1 text-xs font-bold ${step.status === "approved" ? "text-emerald-700" : "text-slate-400"}`}>{step.status.toUpperCase()}</p>
                    </div>
                    {idx < form.approvalSteps.length - 1 && <span className="text-slate-300">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {isLocked ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-6 text-center">
              <p className="text-lg font-bold text-emerald-800">Closure Submitted</p>
              <p className="mt-1 text-sm text-emerald-600">Submitted at: {form.submittedAt}</p>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Save Draft</button>
              <button
                type="button"
                className={`${btnClass} ${blockers.length > 0 ? "cursor-not-allowed bg-slate-300 text-slate-500" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"}`}
                disabled={blockers.length > 0}
                onClick={handleSubmit}
              >
                Submit for Closure ({blockers.length > 0 ? `${blockers.length} blockers` : "Ready"})
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-bold text-slate-700">Post-Closure Actions (System)</p>
            <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
              <p>1. Contract status changed to Closed</p>
              <p>2. Budget balance released on activity/program</p>
              <p>3. eGP triggered for Goods & Services</p>
              <p>4. CMS triggered for Works contracts</p>
              <p>5. Budget balance available for new contract award</p>
              <p>6. Invoice submission capability deactivated</p>
              <p>7. Commitment balance fully reconciled</p>
              <p>8. Historical record maintained for audit</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
