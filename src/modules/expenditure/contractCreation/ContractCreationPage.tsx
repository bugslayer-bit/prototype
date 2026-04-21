import { useCallback, useEffect, useMemo, useState } from "react";
import { contractCreationFieldSources, taxMasterRecords } from "../../../shared/data/expenditureSrsData";
import { ContractAdvancesTaxSection } from "./components/ContractAdvancesTaxSection";
import { ContractBudgetFundingSection } from "./components/ContractBudgetFundingSection";
import { ContractContractorInfoSection } from "./components/ContractContractorInfoSection";
import { ContractDurationAgencySection } from "./components/ContractDurationAgencySection";
import { ContractItemDetailsSection } from "./components/ContractItemDetailsSection";
import { ContractMethodHeaderSection } from "./components/ContractMethodHeaderSection";
import { ContractMilestonesSection } from "./components/ContractMilestonesSection";
import { ContractValidateSubmitSection } from "./components/ContractValidateSubmitSection";
import { ContractListView } from "./components/ContractApprovalQueue";
import { useContractData, type StoredContract } from "../../../shared/context/ContractDataContext";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import { creationSteps, fieldLabels, initialForm, inputClass, labelClass, lockedInputClass, methodMeta, panelClass } from "./config";
import type { ContractFormState, CreationMethod, PreconditionResult } from "./types";
import { getWorkflowConfigForModule, buildWorkflowRuntime, EXPENDITURE_MODULE_KEYS } from "../../../shared/workflow";
import { CONTRACT_ID_PREFIX, generateNextContractId, type PageView } from "./creationFlow";
import { RoleContextBanner } from "../../../shared/components/RoleContextBanner";
import { ModuleActorBanner } from "../../../shared/components/ModuleActorBanner";
import { useAuth } from "../../../shared/context/AuthContext";
import { getAgencyByCode } from "../../../shared/data/agencyPersonas";

/* ── Lazy-load Amendment page ── */
import { ContractAmendmentPage } from "../contractAmendment/ContractAmendmentPage";

/* ── Role-based capability map for contract creation ── */
function useContractRoleCapabilities() {
  const { activeRoleId } = useAuth();
  const canCreate = ["role-admin", "role-normal-user", "role-agency-staff", "role-finance-officer", "role-procurement"].includes(activeRoleId ?? "");
  const canApprove = ["role-admin", "role-finance-officer", "role-head-of-agency"].includes(activeRoleId ?? "");
  const canAmend = ["role-admin", "role-finance-officer", "role-procurement"].includes(activeRoleId ?? "");
  const isReadOnly = activeRoleId === "role-auditor";
  return {
    canCreate, canApprove, canAmend, isReadOnly,
    capabilities: [
      ...(canCreate ? ["Create Contract"] : []),
      ...(canApprove ? ["Approve/Reject"] : []),
      ...(canAmend ? ["Amend Contract"] : []),
      "View Contracts",
      ...(isReadOnly ? ["Export Data"] : []),
    ],
    blocked: [
      ...(!canCreate ? ["Create Contract"] : []),
      ...(!canApprove ? ["Approve/Reject"] : []),
      ...(!canAmend ? ["Amend Contract"] : []),
    ],
  };
}

export function ContractCreationPage() {
  const [view, setView] = useState<PageView>("list");
  const [selectedContract, setSelectedContract] = useState<StoredContract | null>(null);
  const [preselectedContractorId, setPreselectedContractorId] = useState<string | null>(null);
  const roleCaps = useContractRoleCapabilities();

  return (
    <div className="grid min-w-0 gap-6">
      {/* ── List View (default landing) ── */}
      {view === "list" && (
        <>
          {/* Role Context Banner — updates dynamically on role switch */}
          <RoleContextBanner
            capabilities={roleCaps.capabilities}
            blocked={roleCaps.blocked.length > 0 ? roleCaps.blocked : undefined}
          />

          {/* Page Header */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-7">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Expenditure
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  Contract Management
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Contract Management</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                    View, create, and manage all IFMIS contracts. Track approval status, review pending contracts, and initiate new contract creation or amendments.
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                {roleCaps.canAmend && (
                  <button
                    onClick={() => setView("amendment")}
                    className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">✎</span>
                    Contract Amendment
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">PRN 2.2</span>
                  </button>
                )}
                {roleCaps.isReadOnly && (
                  <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-400">
                    Read-only mode
                  </span>
                )}
              </div>
            </div>
          </section>

          <ModuleActorBanner moduleKey="contract-creation" />

          <ContractListView
            onNewContract={(contractorId) => {
              setSelectedContract(null);
              setPreselectedContractorId(contractorId ?? null);
              setView("creation");
            }}
            onEditContract={(contract) => {
              setSelectedContract(contract);
              setPreselectedContractorId(null);
              setView("creation");
            }}
            onAmendContract={(contract) => {
              setSelectedContract(contract);
              setView("amendment");
            }}
          />
        </>
      )}

      {/* ── Creation Form View ── */}
      {view === "creation" && (
        <ContractCreationInner
          initialContract={selectedContract}
          preselectedContractorId={preselectedContractorId}
          onBackToList={() => {
            setSelectedContract(null);
            setPreselectedContractorId(null);
            setView("list");
          }}
        />
      )}

      {/* ── Amendment View ── */}
      {view === "amendment" && (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Contracts
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Contract Amendment
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">PRN 2.2</span>
            </div>
          </div>
          <ContractAmendmentPage sourceContract={selectedContract} />
        </>
      )}
    </div>
  );
}

/* ─── The original Contract Creation form, extracted into its own component ─── */

interface ContractCreationInnerProps {
  initialContract: StoredContract | null;
  preselectedContractorId?: string | null;
  onBackToList: () => void;
}

function ContractCreationInner({ initialContract, preselectedContractorId, onBackToList }: ContractCreationInnerProps) {
  const { addContract, contracts } = useContractData();
  const { contractors } = useContractorData();
  const { activeAgencyCode, activeRoleId } = useAuth();

  /* ── Loose session persistence ──
     New (un-submitted) contracts persist their in-progress draft to
     localStorage so the configured data survives tab switches, sidebar
     navigation, page refreshes, browser restarts and even closing the
     tab entirely. The draft NEVER expires in the background — whatever
     the admin entered stays until they (a) successfully submit the
     contract or (b) explicitly click "Discard draft". Editing an existing
     contract bypasses persistence so each saved record stays isolated. */
  const DRAFT_KEY = "ifmis.contractCreation.draft.v2";
  const STEP_KEY = "ifmis.contractCreation.step.v2";
  const SAVED_AT_KEY = "ifmis.contractCreation.savedAt.v2";

  const readPersistedDraft = (): { form: ContractFormState; step: number; savedAt: string | null } | null => {
    if (typeof window === "undefined") return null;
    try {
      const rawForm = window.localStorage.getItem(DRAFT_KEY);
      if (!rawForm) return null;
      const parsedForm = JSON.parse(rawForm) as ContractFormState;
      const rawStep = window.localStorage.getItem(STEP_KEY);
      const parsedStep = rawStep ? Math.max(1, Math.min(creationSteps.length, Number(rawStep) || 1)) : 1;
      const savedAt = window.localStorage.getItem(SAVED_AT_KEY);
      return { form: parsedForm, step: parsedStep, savedAt };
    } catch {
      return null;
    }
  };

  const hydrateForm = (incoming: ContractFormState | undefined): ContractFormState => {
    const base = incoming ?? initialForm;
    /* Backfill audit-trail fields for legacy drafts saved before the audit
       trail existed. Without these defaults updateField crashes when calling
       hasOwnProperty on undefined. */
    const withAudit: ContractFormState = {
      ...base,
      originalImportedValues: base.originalImportedValues ?? {},
      fieldChanges: base.fieldChanges ?? [],
    };
    /* Backfill Gross Amount from Contract Value when missing — guarantees the
       Duration & Agency stage always has an initial figure to display. */
    if (!withAudit.grossAmount && withAudit.contractValue) {
      return { ...withAudit, grossAmount: withAudit.contractValue };
    }
    return withAudit;
  };

  /* Initial state — prefer initialContract (editing), then sessionStorage
     draft (resumed in-progress create), then a fresh blank form. */
  const persistedOnMount = !initialContract ? readPersistedDraft() : null;
  const [form, setForm] = useState<ContractFormState>(() =>
    persistedOnMount ? hydrateForm(persistedOnMount.form) : hydrateForm(initialContract?.formData)
  );
  const [activeStep, setActiveStep] = useState(persistedOnMount?.step ?? 1);
  const [submitted, setSubmitted] = useState(false);
  const [draftRestored, setDraftRestored] = useState(!!persistedOnMount);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(persistedOnMount?.savedAt ?? null);
  const [commitmentValidated, setCommitmentValidated] = useState(false);

  useEffect(() => {
    if (initialContract) {
      setForm(hydrateForm(initialContract.formData));
      setActiveStep(1);
      setSubmitted(false);
      setCommitmentValidated(!!initialContract.formData.commitmentReference);
      setDraftRestored(false);
    }
  }, [initialContract]);

  /* ── Auto-assign sequential Contract ID for new (un-submitted) drafts ──
     The user sees the next AGY-CTR-NNN immediately when they open the
     creation page, so the ID stays in lockstep with the contracts list.
     We only assign when:
       (a) it's a new contract (not editing an existing one)
       (b) the current contractId is still the placeholder or empty
       (c) the workflow has not yet been submitted
     This means once a draft has an ID, refreshing the page or restoring
     from localStorage will keep that same ID — never silently shift it.
     If contracts in the list change (e.g. another tab created one) before
     this draft is submitted, the next-id is recomputed so we never collide. */
  useEffect(() => {
    if (initialContract) return;
    if (form.workflowStatus === "submitted" || form.workflowStatus === "approved" || form.workflowStatus === "locked") return;
    const placeholderRe = /^(System Generated|Auto[-\s]?linked)/i;
    const needsAssignment = !form.contractId || placeholderRe.test(form.contractId);
    if (!needsAssignment) return;
    const nextId = generateNextContractId(contracts);
    if (nextId !== form.contractId) {
      setForm((current) => ({ ...current, contractId: nextId }));
    }
  }, [initialContract, contracts, form.contractId, form.workflowStatus]);

  /* Auto-save the in-progress draft to localStorage whenever the form
     mutates. Skipped while editing an existing contract or after the
     workflow has been submitted. localStorage is durable across browser
     restarts and never expires in the background. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialContract) return;
    if (form.workflowStatus === "submitted" || form.workflowStatus === "approved" || form.workflowStatus === "locked") return;
    try {
      const now = new Date().toISOString();
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      window.localStorage.setItem(SAVED_AT_KEY, now);
      setDraftSavedAt(now);
    } catch {
      /* Quota exceeded or storage disabled — silent */
    }
  }, [form, initialContract]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialContract) return;
    try {
      window.localStorage.setItem(STEP_KEY, String(activeStep));
    } catch {
      /* silent */
    }
  }, [activeStep, initialContract]);

  function clearPersistedDraft() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(STEP_KEY);
      window.localStorage.removeItem(SAVED_AT_KEY);
      setDraftSavedAt(null);
    } catch {
      /* silent */
    }
  }

  function discardDraft() {
    clearPersistedDraft();
    setForm(hydrateForm(undefined));
    setActiveStep(1);
    setSubmitted(false);
    setCommitmentValidated(false);
    setDraftRestored(false);
  }

  /* ── Pre-fill contractor when "Initiate Contract" was clicked from the
       Approved Contractors panel on the dashboard. Only runs for new
       contracts (not when editing) and only when the contractor exists in
       the live ContractorDataContext. */
  useEffect(() => {
    if (initialContract) return;
    if (!preselectedContractorId) return;
    const match = contractors.find((c) => c.id === preselectedContractorId);
    if (!match) return;
    setForm((prev) => ({
      ...prev,
      contractorId: match.id,
      contractorName: match.displayName,
      contractorStatus: match.status === "Active and verified" ? "Active and verified" : "Pending verification",
      contractorBankAccount: match.bankAccountNumber ? `${match.bankName}-${match.bankAccountNumber}` : prev.contractorBankAccount,
      contractorDebarmentStatus: "Clear — No sanctions",
    }));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [preselectedContractorId, initialContract, contractors]);

  const methodConfig = form.method ? methodMeta[form.method] : null;
  const isEditing = !!initialContract;
  const isFormLocked = !isEditing && (form.workflowStatus === "submitted" || form.workflowStatus === "locked" || form.workflowStatus === "approved");

  const hasInvalidContractItems = form.contractItemRows.some(
    (row) => !row.itemCode.trim() || !row.itemDescription.trim() || !row.itemCategory.trim() || !row.itemQuantity.trim() || !row.itemUnit.trim() || !row.itemUnitRate.trim()
  );
  const hasInvalidMilestones = form.milestoneRows.some(
    (row) => !row.milestoneNumber.trim() || !row.milestoneName.trim() || !row.estimatedPaymentDate.trim() || !row.milestoneAmountGross.trim() || !row.milestoneStatus.trim()
  );

  const preconditionResults = useMemo<PreconditionResult[]>(() => {
    const results: PreconditionResult[] = [];

    results.push({
      key: "budget-exists",
      label: "Budget exists for relevant budget code",
      passed: !!form.budgetCode.trim(),
      message: form.budgetCode ? `Budget code: ${form.budgetCode}` : "No budget code selected",
      severity: "blocker"
    });

    results.push({
      key: "commitment-exists",
      label: "Commitment exists (if required by object code)",
      passed: commitmentValidated && !!form.commitmentReference.trim(),
      message: commitmentValidated ? `Commitment ${form.commitmentReference} validated` : "Commitment not yet validated",
      severity: "blocker"
    });

    results.push({
      key: "commitment-balance",
      label: "Contract value ≤ Commitment balance",
      passed: commitmentValidated && !!form.contractValue.trim(),
      message: form.contractValue ? `Contract value: Nu. ${form.contractValue}` : "Contract value not set",
      severity: "blocker"
    });

    results.push({
      key: "budget-active",
      label: "Budget code valid and active",
      passed: !!form.budgetCode.trim() && commitmentValidated,
      message: form.budgetCode ? `${form.budgetCode} — ${commitmentValidated ? "Active" : "Not verified"}` : "Budget code missing",
      severity: "blocker"
    });

    results.push({
      key: "contractor-active",
      label: "Contractor is Active (not suspended/debarred)",
      passed: form.contractorStatus.includes("Active"),
      message: form.contractorStatus,
      severity: "blocker"
    });

    results.push({
      key: "contractor-debarment",
      label: "Vendor debarment status check",
      passed: !form.contractorDebarmentStatus.includes("Debarred") && !form.contractorDebarmentStatus.includes("Suspended"),
      message: form.contractorDebarmentStatus || "Clear — No sanctions",
      severity: "blocker"
    });

    results.push({
      key: "contractor-bank",
      label: "Contractor bank account verified",
      passed: form.contractorStatus.includes("Active"),
      message: form.contractorBankAccount || "Pending verification",
      severity: "warning"
    });

    results.push({
      key: "duration-valid",
      label: "Contract duration within allowed period",
      passed: !!form.startDate && !!form.endDate && form.endDate >= form.startDate,
      message: form.startDate && form.endDate ? `${form.startDate} to ${form.endDate}` : "Dates not set",
      severity: "blocker"
    });

    if (form.multiYearFlag) {
      results.push({
        key: "multi-year-commitment",
        label: "Multi-year commitment exists",
        passed: !!form.multiYearCommitmentRef.trim(),
        message: form.multiYearCommitmentRef || "Multi-year commitment reference required",
        severity: "blocker"
      });
    }

    results.push({
      key: "payment-structure",
      label: "Payment structure defined",
      passed: !!form.paymentStructure,
      message: form.paymentStructure || "Not selected",
      severity: "blocker"
    });

    if (form.contractCategory.includes("Works")) {
      results.push({
        key: "retention-works",
        label: "Retention configured for Works contract (10% per PRR)",
        passed: form.retentionApplicable,
        message: form.retentionApplicable ? `${form.retentionRate}% retention enabled` : "Retention not enabled — required for Works",
        severity: "warning"
      });
    }

    results.push({
      key: "tax-configured",
      label: "Tax rules configured (Refer Tax Master)",
      passed: !form.taxApplicable || form.taxType.length > 0,
      message: form.taxApplicable ? (form.taxType.length > 0 ? form.taxType.join(", ") : "Tax type(s) required") : "Tax exempt",
      severity: "blocker"
    });

    return results;
  }, [form, commitmentValidated]);

  const validation = useMemo(() => {
    const errors: Partial<Record<string, string>> = {};
    if (!form.method) errors.method = "Choose a creation method.";
    if (!form.contractTitle.trim()) errors.contractTitle = "Contract title is required.";
    if (!form.contractDescription.trim()) errors.contractDescription = "Contract description is required.";
    if (!form.expenditureType) errors.expenditureType = "Select a type of expenditure.";
    if (form.contractCategory.length === 0) errors.contractCategory = "Select a contract category.";
    if (!form.contractClassification) errors.contractClassification = "Select the contract classification.";
    if (!form.budgetCode.trim()) errors.budgetCode = "Budget code is required.";
    if (!form.commitmentReference.trim()) errors.commitmentReference = "Commitment reference is required.";
    if (!form.contractValue.trim()) errors.contractValue = "Contract value is required.";
    if (!form.fundingSource) errors.fundingSource = "Choose the funding source.";
    if (!form.contractDuration.trim()) errors.contractDuration = "Contract duration is required.";
    if (!form.startDate) errors.startDate = "Start date is required.";
    if (!form.endDate) errors.endDate = "End date is required.";
    if (form.startDate && form.endDate && form.endDate < form.startDate) errors.endDate = "End date must be after the start date.";
    if (!form.agencyId.trim()) errors.agencyId = "Agency ID is required.";
    if (!form.contractCurrencyId.trim()) errors.contractCurrencyId = "Contract currency is required.";
    if (!form.grossAmount.trim()) errors.grossAmount = "Initial amount is required.";
    if (!form.agencyName.trim()) errors.agencyName = "Agency name is required.";
    if (!form.contractClosureDate) errors.contractClosureDate = "Contract closure date is required.";
    if (!form.contractorId.trim()) errors.contractorId = "Contractor ID is required.";
    if (!form.officerFirstName.trim()) errors.officerFirstName = "Project officer first name is required.";
    if (!form.officerLastName.trim()) errors.officerLastName = "Project officer last name is required.";
    if (!form.officerEmail.trim()) errors.officerEmail = "Project officer email is required.";
    if (!form.officerPhoneNumber.trim()) errors.officerPhoneNumber = "Project officer phone number is required.";
    if (!form.paymentStructure) errors.paymentStructure = "Select the payment structure.";
    if (hasInvalidContractItems) errors.contractItemRows = "Complete all contract item rows.";
    if (form.paymentStructure === "Milestone Based" && !form.milestonePlan.trim()) errors.milestonePlan = "Describe the milestone plan.";
    if (form.paymentStructure === "Milestone Based" && hasInvalidMilestones) errors.milestoneRows = "Complete all milestone rows.";
    if (form.taxApplicable && form.taxType.length === 0) errors.taxType = "Select at least one tax type when tax is applicable.";
    if (!form.taxApplicable && !form.taxExemptionReason.trim()) errors.taxExemptionReason = "Tax exemption reason is required when tax is not applicable.";
    if (form.contractCategory.includes("Works") && !form.retentionApplicable) errors.retentionApplicable = "Retention is mandatory for Works contracts.";
    return errors;
  }, [form, hasInvalidContractItems, hasInvalidMilestones]);

  const completedSteps = useMemo(() => {
    return {
      1: !!form.method && !!form.contractTitle.trim() && !!form.contractDescription.trim() && !!form.expenditureType && form.contractCategory.length > 0 && !!form.contractClassification,
      2: !!form.budgetCode.trim() && !!form.commitmentReference.trim() && !!form.contractValue.trim() && !!form.fundingSource && commitmentValidated && !!form.contractCurrencyId.trim() && !!form.grossAmount.trim(),
      3: !!form.contractDuration.trim() && !!form.startDate && !!form.endDate && !!form.contractClosureDate && form.endDate >= form.startDate && form.contractClosureDate >= form.endDate && !!form.agencyId.trim(),
      4: !!form.contractorId.trim() && form.contractorStatus.includes("Active") && !!form.officerFirstName.trim() && !!form.officerLastName.trim() && !!form.officerEmail.trim() && !!form.officerPhoneNumber.trim() && !!form.paymentStructure,
      5: form.contractCategory.length > 0 && form.contractItemRows.length > 0 && !hasInvalidContractItems,
      6: (!form.taxApplicable || form.taxType.length > 0) && (!form.contractCategory.includes("Works") || form.retentionApplicable),
      7: form.paymentStructure !== "Milestone Based" || (!!form.milestonePlan.trim() && !hasInvalidMilestones),
      8: Object.keys(validation).length === 0 && preconditionResults.every((p) => p.passed || p.severity !== "blocker")
    };
  }, [form, commitmentValidated, hasInvalidContractItems, hasInvalidMilestones, validation, preconditionResults]);

  const readiness = Math.round((Object.values(completedSteps).filter(Boolean).length / creationSteps.length) * 100);

  /* ── Field-lock policy ─────────────────────────────────────────────────
     For system-fed methods (file-upload, eGP, CMS) the imported fields are
     no longer hard-locked. They are now ALWAYS editable so admins can
     correct or override any value the upstream interface sent. The
     "locked" concept is downgraded to "imported" — fields that came in
     from the upstream system get a visual marker but stay editable, and
     every override is recorded in the audit trail. */
  function isFieldLocked(field: keyof ContractFormState) {
    if (isFormLocked) return true;
    /* Imported fields used to be hard-locked. They are now ALWAYS editable
       so the admin can override values that came in from eGP / CMS / File
       Upload. Every override is captured in the audit trail. The function
       intentionally returns false here so existing call sites can keep
       passing `isFieldLocked(...)` without breaking. */
    void field;
    return false;
  }

  const updateField = useCallback(function updateField<Key extends keyof ContractFormState>(key: Key, value: ContractFormState[Key]) {
    setForm((current) => {
      if (isFormLocked) return current;
      const next = { ...current, [key]: value };
      if (key === "commitmentReference") setCommitmentValidated(false);

      /* ── Audit trail diff ────────────────────────────────────────────
         Only tracks fields that were originally imported by the upstream
         interface. Manual entry sets originalImportedValues = {} so this
         block is a no-op for the manual method. */
      const importedSnapshot = current.originalImportedValues ?? {};
      const existingChanges = current.fieldChanges ?? [];
      if (Object.prototype.hasOwnProperty.call(importedSnapshot, key)) {
        const original = (importedSnapshot as Partial<ContractFormState>)[key];
        const stringify = (v: unknown): string => {
          if (v === null || v === undefined) return "";
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "boolean") return v ? "Yes" : "No";
          return String(v);
        };
        const originalStr = stringify(original);
        const newStr = stringify(value);
        const filtered = existingChanges.filter((c) => c.field !== key);
        if (originalStr !== newStr) {
          next.fieldChanges = [
            ...filtered,
            {
              field: key as string,
              label: fieldLabels[key] ?? (key as string),
              originalValue: originalStr,
              currentValue: newStr,
              editedAt: new Date().toISOString(),
            },
          ];
        } else {
          /* Admin reverted to the originally imported value — drop the entry */
          next.fieldChanges = filtered;
        }
      }

      if (key === "contractValue") {
        const incomingValue = String(value ?? "");
        if (!current.grossAmount || current.grossAmount === current.contractValue) {
          next.grossAmount = incomingValue;
        }
      }

      if (key === "endDate") {
        const incomingValue = String(value ?? "");
        if (!current.contractClosureDate || current.contractClosureDate === current.endDate) {
          next.contractClosureDate = incomingValue;
        }
      }

      if (key === "contractClassification") {
        next.multiYearFlag = value === "Multi-Year";
      }
      if (key === "contractCategory" && Array.isArray(value) && (value as string[]).includes("Works")) {
        next.retentionApplicable = true;
        next.retentionRate = next.retentionRate || "10";
      }
      return next;
    });
    setSubmitted(false);
  }, [methodConfig]);

  function handleMethodSelect(method: CreationMethod) {
    const config = methodMeta[method];
    const merged: ContractFormState = { ...initialForm, method, ...config.suggestedValues };

    /* ── Override agency fields with active persona context ─────────────
       suggestedValues carries static example agencies ("Ministry of Finance").
       Replace with the agency the user is actually operating within so the
       form is always grounded in the real persona. */
    const activeAgency = getAgencyByCode(activeAgencyCode);
    if (activeAgency) {
      merged.agencyName = activeAgency.name;
      merged.agencyId = `AGY-${activeAgency.shortCode}-001`;
      merged.fundingAgencyName = activeAgency.name;
    }

    /* Ensure Gross Amount always carries the contract value as its initial figure
       so the Duration & Agency stage never displays 0.00 after a system intake. */
    if (!merged.grossAmount && merged.contractValue) {
      merged.grossAmount = merged.contractValue;
    }
    /* ── Snapshot original imported values for audit trail ────────────────
       For system-fed methods we deep-copy whatever the upstream interface
       sent into `originalImportedValues`. The diff engine inside
       updateField uses this snapshot to detect admin overrides and
       populate `fieldChanges`. Manual stays empty. */
    if (method === "manual") {
      merged.originalImportedValues = {};
      merged.fieldChanges = [];
    } else {
      merged.originalImportedValues = JSON.parse(
        JSON.stringify(config.suggestedValues)
      ) as Partial<ContractFormState>;
      merged.fieldChanges = [];
    }
    setForm(merged);
    setCommitmentValidated(method !== "manual" && !!config.suggestedValues.commitmentReference);
    setSubmitted(false);
  }

  function toggleCategory(category: string) {
    if (isFieldLocked("contractCategory")) return;
    setForm((current) => {
      const next = current.contractCategory.includes(category) ? [] : [category];
      const updates: Partial<ContractFormState> = { contractCategory: next };
      if (next.includes("Works")) {
        updates.retentionApplicable = true;
        updates.retentionRate = current.retentionRate || "10";
      }
      return { ...current, ...updates };
    });
    setSubmitted(false);
  }

  function verifyContractor() {
    if (form.contractorId.trim()) {
      setForm((current) => ({
        ...current,
        contractorStatus: "Active and verified",
        contractorDebarmentStatus: "Clear",
        contractorBankAccount: "ACC-" + current.contractorId.replace(/\s/g, "").slice(0, 8) + "-001"
      }));
    }
  }

  function addMilestoneRow() {
    setForm((current) => ({
      ...current,
      milestoneRows: [
        ...current.milestoneRows,
        {
          id: String(current.milestoneRows.length + 1),
          milestoneId: `MS-${String(current.milestoneRows.length + 1).padStart(3, "0")}`,
          contractId: current.contractId || "Auto-linked",
          milestoneNumber: String(current.milestoneRows.length + 1),
          milestoneName: "",
          milestoneDescription: "",
          estimatedPaymentDate: "",
          milestoneAmountGross: "",
          milestoneTaxAmount1: "",
          milestoneTaxAmount2: "",
          milestoneDeduction1: "",
          milestoneDeduction2: "",
          netMilestoneAmount: "",
          milestoneStatus: "Pending"
        }
      ]
    }));
  }

  function updateMilestoneRow(
    id: string,
    key: "milestoneNumber" | "milestoneName" | "milestoneDescription" | "estimatedPaymentDate" | "milestoneAmountGross" | "milestoneTaxAmount1" | "milestoneTaxAmount2" | "milestoneDeduction1" | "milestoneDeduction2" | "milestoneStatus",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      milestoneRows: current.milestoneRows.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    }));
  }

  function addSupportingDocument(label: string) {
    setForm((current) => ({
      ...current,
      supportingDocLabels: current.supportingDocLabels.includes(label) ? current.supportingDocLabels : [...current.supportingDocLabels, label]
    }));
  }

  function validateCommitmentReference() {
    if (!form.commitmentReference.trim()) {
      setCommitmentValidated(false);
      return;
    }
    setForm((current) => ({
      ...current,
      expenditureCategoryId: current.expenditureCategoryId || "EXP-CAT-2026-001",
      sectorId: current.sectorId || "Auto from UCoA (LoV 7.8)",
      budgetCode: current.budgetCode || "BUD-2026-0045",
      fundingSource: current.fundingSource || "RGOB",
      commitmentBalance: "5,000,000"
    }));
    setCommitmentValidated(true);
  }

  function onSubmitForApproval() {
    const hasBlockers = preconditionResults.some((p) => !p.passed && p.severity === "blocker");
    if (hasBlockers) return;

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const contractUniqueId = initialContract?.id ?? `CTR-${Date.now().toString(36).toUpperCase()}`;

    /* Build the new form snapshot OUTSIDE setForm so we can use it both for
       state AND for the persisted record without violating React's rule that
       state updaters must be pure (and run twice in strict mode). */
    const updated: ContractFormState = {
      ...form,
      workflowStatus: "submitted",
      contractStatus: "Submitted",
      submittedAt: now,
      approvalSteps: form.approvalSteps.map((step, i) =>
        i === 0 ? { ...step, status: "pending" as const, approverName: "Pending assignment" } : step
      )
    };

    /* Resolve next approver dynamically from the workflow engine. */
    const cfg = getWorkflowConfigForModule(EXPENDITURE_MODULE_KEYS.CONTRACT_CREATION);
    const runtime = cfg ? buildWorkflowRuntime(cfg) : [];
    const nextApprover = runtime.length > 1 ? runtime[1].role : runtime[0]?.role ?? "Approver";

    const stored: StoredContract = {
      id: contractUniqueId,
      contractId: form.contractId || contractUniqueId,
      contractTitle: form.contractTitle,
      contractValue: form.contractValue,
      contractCategory: form.contractCategory,
      contractClassification: form.contractClassification,
      method: form.method,
      agencyName: form.agencyName,
      contractorName: form.contractorName,
      contractorId: form.contractorId,
      startDate: form.startDate,
      endDate: form.endDate,
      workflowStatus: "submitted",
      contractStatus: "Submitted",
      submittedAt: now,
      approvedAt: "",
      rejectedAt: "",
      approvalRemarks: "",
      currentApprover: nextApprover,
      fundingSource: form.fundingSource,
      expenditureType: form.expenditureType,
      formData: updated,
      amendmentDraft: initialContract?.amendmentDraft ?? null,
    };

    /* Persist first, then update local form state, then bounce back to the
       list so the user immediately sees their new contract in the queue. */
    addContract(stored);
    setForm(updated);
    /* In-progress draft is now committed — clear the session-side cache so
       the next "New Contract" click starts from a clean slate. */
    clearPersistedDraft();
    setDraftRestored(false);
    onBackToList();
  }

  function goNext() {
    setSubmitted(true);
    if (activeStep < creationSteps.length) setActiveStep((current) => current + 1);
  }

  function goPrevious() {
    setActiveStep((current) => Math.max(1, current - 1));
  }

  function helperFor(fieldKey: keyof typeof contractCreationFieldSources) {
    void fieldKey;
    return <></>;
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)] sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            {/* Back to list button */}
            <button
              onClick={onBackToList}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Contracts
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Expenditure
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              {initialContract ? "Contract Edit" : "Contract Creation"}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl xl:text-4xl">{initialContract ? "Edit Contract" : "New Contract"}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                {initialContract
                  ? "Review and update the contract details, then resubmit the updated version into the IFMIS approval workflow."
                  : "Create and validate a new IFMIS contract using one of the approved intake methods, then route it through the configured approval workflow."}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600">Form 5</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600">PRN 2.1</span>
            <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${isFormLocked ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>
              {form.contractStatus}
            </span>
            {methodConfig ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600">{methodConfig.label}</span> : null}
          </div>
        </div>
      </section>

      {/* Draft persistence banner — visible only while creating a new contract */}
      {!initialContract && form.workflowStatus !== "submitted" && (
        <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${
          draftRestored
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}>
          <div className="flex min-w-0 items-start gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
              draftRestored ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              {draftRestored ? "↺" : "✓"}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-semibold">
                {draftRestored ? "In-progress draft restored" : "Auto-saving draft · never expires"}
              </p>
              <p className="text-xs leading-5 opacity-80">
                {draftRestored
                  ? `Resumed at Step ${activeStep}/${creationSteps.length} · every value you configured is intact across all tabs.`
                  : "Every change is persisted locally — switching tabs, closing the browser or coming back days later will not lose your data."}
                {draftSavedAt && (
                  <span className="ml-1 font-medium">
                    · Last saved {new Date(draftSavedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draftRestored && (
              <button
                type="button"
                onClick={() => setDraftRestored(false)}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                Continue editing
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Discard the in-progress draft and start a fresh contract? This cannot be undone.")) {
                  discardDraft();
                }
              }}
              className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Discard draft
            </button>
          </div>
        </div>
      )}

      {/* Sticky step navigation — stays visible while user scrolls long forms.
          Dynamic progress bar + emerald-themed pills that visibly distinguish
          active / completed / upcoming. Width of the progress bar tracks the
          number of cleared steps so the user always sees how far they are. */}
      {(() => {
        const totalSteps = creationSteps.length;
        const doneCount = creationSteps.filter(
          (s) => completedSteps[s.id as keyof typeof completedSteps]
        ).length;
        /* Progress = the furthest you've reached, never less than the active
           step you're currently editing. */
        const progressCount = Math.max(doneCount, activeStep);
        const progressPct = Math.round((progressCount / totalSteps) * 100);
        return (
          <nav className="sticky top-0 z-20 -mx-3 -mt-2 overflow-hidden border-y border-slate-200 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:-mx-4 lg:-mx-8">
            {/* Top header strip: mode + counter + thin progress bar */}
            <div className="flex flex-wrap items-center gap-2 px-3 pt-3 sm:px-4 lg:px-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {initialContract ? "Editing" : "Creating"}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Step <span className="text-emerald-700">{activeStep}</span> of {totalSteps}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">·</span>
              <span className="max-w-full truncate text-[11px] font-semibold text-slate-500">
                {creationSteps[activeStep - 1]?.title}
              </span>
              <div className="ml-0 flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Step pills row */}
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto px-3 pb-3 pt-2 [scrollbar-width:none] sm:px-4 lg:px-8 [&::-webkit-scrollbar]:hidden">
              {creationSteps.map((step, idx) => {
                const isActive = step.id === activeStep;
                const isDone = !!completedSteps[step.id as keyof typeof completedSteps];
                const isFuture = !isActive && !isDone;
                const isLast = idx === creationSteps.length - 1;
                return (
                  <div key={step.id} className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.25)]"
                          : isDone
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                      }`}
                      title={
                        isActive
                          ? `Currently editing: ${step.title}`
                          : isDone
                            ? `Completed: ${step.title} — click to revisit`
                            : `Upcoming: ${step.title}`
                      }
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                          isActive
                            ? "bg-white/20 text-white ring-1 ring-white/50"
                            : isDone
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isDone && !isActive ? (
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          step.id
                        )}
                      </span>
                      <span className="whitespace-nowrap">{step.title}</span>
                      {isActive && (
                        <span className="ml-0.5 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      )}
                    </button>
                    {!isLast && (
                      <span
                        className={`mx-1 hidden h-px w-4 transition-colors sm:inline-block ${
                          isDone || isActive ? "bg-emerald-300" : "bg-slate-200"
                        }`}
                        aria-hidden
                      />
                    )}
                    {!isLast && isFuture === false && false && null}
                  </div>
                );
              })}
            </div>
          </nav>
        );
      })()}

      <section>
        <article className={`${panelClass} overflow-hidden`}>
          {activeStep === 1 ? (
            <ContractMethodHeaderSection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} methodMeta={methodMeta} submitted={submitted} methodError={validation.method} isFieldLocked={isFieldLocked} updateField={updateField} handleMethodSelect={handleMethodSelect} toggleCategory={toggleCategory} helperFor={helperFor} />
          ) : null}

          {activeStep === 2 ? (
            <ContractBudgetFundingSection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} isFieldLocked={isFieldLocked} updateField={updateField} validateCommitmentReference={validateCommitmentReference} commitmentValidated={commitmentValidated} preconditionResults={preconditionResults} helperFor={helperFor} />
          ) : null}

          {activeStep === 3 ? (
            <ContractDurationAgencySection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} updateField={updateField} helperFor={helperFor} />
          ) : null}

          {activeStep === 4 ? (
            <ContractContractorInfoSection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} isFieldLocked={isFieldLocked} updateField={updateField} verifyContractor={verifyContractor} helperFor={helperFor} />
          ) : null}

          {activeStep === 5 ? (
            <ContractItemDetailsSection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} updateField={updateField} helperFor={helperFor} />
          ) : null}

          {activeStep === 6 ? (
            <ContractAdvancesTaxSection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} updateField={updateField} helperFor={helperFor} />
          ) : null}

          {activeStep === 7 ? (
            <ContractMilestonesSection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} updateField={updateField} updateMilestoneRow={updateMilestoneRow} addMilestoneRow={addMilestoneRow} addSupportingDocument={addSupportingDocument} helperFor={helperFor} />
          ) : null}

          {activeStep === 8 ? (
            <ContractValidateSubmitSection form={form} inputClass={inputClass} lockedInputClass={lockedInputClass} labelClass={labelClass} methodMeta={methodMeta} updateField={updateField} preconditionResults={preconditionResults} onSubmitForApproval={onSubmitForApproval} isFormLocked={isFormLocked} />
          ) : null}

          {!isFormLocked ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <button type="button" className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50" onClick={goPrevious}>
                ← Previous
              </button>
              <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                {activeStep < creationSteps.length ? (
                  <button type="button" className="w-full rounded-2xl bg-[#b71c1c] px-6 py-3 font-semibold text-white transition hover:bg-[#8f1111] sm:w-auto" onClick={goNext}>
                    Save and Next →
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
}
