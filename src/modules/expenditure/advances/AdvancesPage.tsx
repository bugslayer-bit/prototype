import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useContractorData } from "../../../shared/context/ContractorDataContext";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import { useContractData } from "../../../shared/context/ContractDataContext";
import { ModuleActorBanner } from "../../../shared/components/ModuleActorBanner";
import {
  PersonaApprovalWorkflow,
  buildAdvanceApprovalChain,
  type PersonaApprovalStep,
} from "./components/PersonaApprovalWorkflow";
import {
  type AdvanceMode,
  type Step,
  type ContractRecord,
  type AdvanceForm,
  type SanctionValidation,
  panelClass,
  headerClass,
  inputClass,
  lockedClass,
  labelClass,
  btnClass,
  ddTag,
  lovTag,
  brTag,
  SanctioningAutoValidator,
  mapStoredToAdvanceContract,
  ADVANCE_CATEGORIES_FALLBACK,
  NON_CONTRACT_ADVANCE_CATEGORIES_FALLBACK,
  MOCK_EMPLOYEES,
} from "./advanceFlow";

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function AdvancesPage() {
  const { contractors } = useContractorData();
  const { masterDataMap } = useMasterData();
  const { contracts: storedContracts } = useContractData();

  /* Map shared contracts into the local ContractRecord shape.
     BR: The Advances list ONLY contains contracts that have opted-in to an
     advance payment (formData.advancePayment === true). If the contract
     officer toggles "Advance Payment?" to No and updates the contract, the
     contract must disappear from this list dynamically and instead be
     picked up by the Invoice & Bill flow directly. This mirrors the SRS
     expenditure rule: a contract without an advance skips the Advances
     process and goes straight to invoicing. */
  const availableContracts: ContractRecord[] = useMemo(
    () => storedContracts
      .filter((c) => c.workflowStatus === "approved")
      .filter((c) => !!c.formData?.advancePayment)
      .map(mapStoredToAdvanceContract),
    [storedContracts],
  );

  /* Resolve dropdown values from Master Data context (LoVs) with fallbacks */
  const ADVANCE_CATEGORIES = masterDataMap.get("contractual-advance-category") ?? ADVANCE_CATEGORIES_FALLBACK;
  const NON_CONTRACT_ADVANCE_CATEGORIES = masterDataMap.get("non-contractual-advance-category") ?? NON_CONTRACT_ADVANCE_CATEGORIES_FALLBACK;
  const BG_BANKS = masterDataMap.get("advance-bank-guarantee-bank") ?? ["Bank of Bhutan", "Bhutan National Bank", "T Bank Limited", "Bhutan Development Bank", "Druk PNB Bank"];
  const RECOVERY_METHODS = masterDataMap.get("advance-recovery-method") ?? ["Proportional Deduction", "Lump Sum Recovery", "Percentage per Invoice", "Final Bill Adjustment"];
  const POST_ADJUSTMENT_METHODS = masterDataMap.get("advance-post-adjustment-method") ?? ["Fractions", "Whole Sum", "Cash Surrender"];
  const IMPREST_PURPOSES = masterDataMap.get("advance-imprest-purpose") ?? ["Workshop and Training Expenses", "Site Inspection Expenses", "Emergency Procurement", "Official Expenses"];
  const IMPREST_BUDGET_CODES = masterDataMap.get("advance-imprest-budget-code") ?? masterDataMap.get("contract-budget-code") ?? [
    "BUD-1606-2026 \u2014 Department of Treasury and Accounts (Ministry of Finance)",
    "BUD-2003-2026 \u2014 Department of Health Services (Ministry of Health)",
    "BUD-2203-2026 \u2014 Department of School Education (Ministry of Education and Skills Development)",
    "BUD-1904-2026 \u2014 Department of Infrastructure Development (Ministry of Infrastructure and Transport)",
    "BUD-1706-2026 \u2014 Department of Agriculture (Ministry of Agriculture and Livestock)"
  ];

  const [mode, setMode] = useState<AdvanceMode>("contractual");
  const [step, setStep] = useState<Step>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contractSearch, setContractSearch] = useState("");
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  /* ── Payment Order ID — BR 25.1.8 / DD 14.1.40 ──
     "One Payment Order per approved advance — Duplicate payment orders shall not be allowed"
     Generated ONCE when entering Step 5 (post-approval) and persisted in state.
     Format: PO-<MOD>-<YYYY>-<NNNNN>  where MOD = ADV (contractual) | IMP (imprest) */
  const [paymentOrderId, setPaymentOrderId] = useState<string>("");
  const paymentOrderGenerated = useRef(false);

  const generatePaymentOrderId = useCallback((m: AdvanceMode) => {
    const yr = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 90000) + 10000);
    const tag = m === "contractual" ? "ADV" : "IMP";
    return `PO-${tag}-${yr}-${seq}`;
  }, []);

  const [form, setForm] = useState<AdvanceForm>({
    contractId: "", contractorId: "", agencyId: "", advanceCategory: "",
    amount: "", purpose: "", contractStatus: "", ucoaLevel: "", budgetCode: "", commitmentRef: "",
    bankGuaranteeRef: "", bankGuaranteeAmount: "", bankGuaranteeBank: "",
    bankGuaranteeExpiry: "", siteInspectionReport: false, materialVerification: false,
    securityInsurance: false, remarks: "",
    employeeId: "", employeeName: "", designation: "", department: "",
    ministryCode: "", orgCode: "", ministryName: "",
    imprestPurpose: "", imprestAmount: "", previousSettled: true,
  });

  const updateForm = <K extends keyof AdvanceForm>(k: K, v: AdvanceForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  /* ── RBAC-driven approval chain ──────────────────────────────────────
     One chain instance per advance request — each step is locked to a
     specific RBAC persona and can only be actioned by the user when
     their currently-active role (top navbar) matches the step's owner. */
  const [approvalChain, setApprovalChain] = useState<PersonaApprovalStep[]>(() =>
    buildAdvanceApprovalChain(),
  );
  const allChainApproved = approvalChain.every((s) => s.status === "approved");

  /* contract search */
  const filteredContracts = useMemo(() => {
    if (!contractSearch.trim()) return availableContracts;
    const q = contractSearch.toLowerCase();
    return availableContracts.filter((c) =>
      c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) ||
      c.contractorName.toLowerCase().includes(q) || c.contractorId.toLowerCase().includes(q)
    );
  }, [contractSearch, availableContracts]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return MOCK_EMPLOYEES;
    const q = employeeSearch.toLowerCase();
    return MOCK_EMPLOYEES.filter((e) =>
      e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.cid.includes(q)
    );
  }, [employeeSearch]);

  const selectContract = (c: ContractRecord) => {
    setSelectedContract(c);
    setContractSearch("");
    setShowContractDropdown(false);
    updateForm("contractId", c.id);
    updateForm("contractorId", c.contractorId);
    updateForm("agencyId", c.agencyId);
    updateForm("contractStatus", c.status);
    /* Auto-fetch financial fields from Contract Creation (DD 14.1.x) */
    updateForm("budgetCode", c.budgetCode);
    updateForm("commitmentRef", c.commitmentRef);
    updateForm("amount", String(c.advanceAmount));
  };

  const selectEmployee = (e: typeof MOCK_EMPLOYEES[0]) => {
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
    updateForm("employeeId", e.id);
    updateForm("employeeName", e.name);
    updateForm("designation", e.designation);
    updateForm("department", e.department);
    updateForm("ministryCode", e.ministryCode);
    updateForm("orgCode", e.orgCode);
    updateForm("ministryName", e.ministryName);
    /* Auto-default budget code to the employee's own department code (UCoA Level-2)
       Picks the first BUD-{orgCode}- entry from IMPREST_BUDGET_CODES if available. */
    const defaultCode = IMPREST_BUDGET_CODES.find((b) => b.startsWith(`BUD-${e.orgCode}-`));
    if (defaultCode) updateForm("budgetCode", defaultCode);
    else updateForm("budgetCode", "");
  };

  /* Budget Code list filtered by selected employee's ministry (UCoA Level-1, 2 digits).
     If no employee selected → empty list (forces user to pick employee first). */
  const filteredBudgetCodes = useMemo(() => {
    if (!form.ministryCode) return [] as string[];
    const prefixes = [`BUD-${form.ministryCode}`];
    return IMPREST_BUDGET_CODES.filter((b) => prefixes.some((p) => b.startsWith(p)));
  }, [form.ministryCode, IMPREST_BUDGET_CODES]);

  const maxMobilization = selectedContract ? selectedContract.value * 0.1 : 0;

  const isMobilization = form.advanceCategory === "Mobilization Advance";
  const isMaterial = form.advanceCategory === "Material Advance";
  const isSecured = form.advanceCategory === "Secured Advance";
  const isWorksContract = selectedContract?.category === "Works";

  /* ── e-GP / e-CMS Auto-Validation Engine for Secured Advance ──
     When Secured Advance is selected and user enters Step 2,
     documents are auto-validated sequentially from external systems. */
  interface DocValidationStep {
    id: string;
    label: string;
    system: string;
    detail: string;
    duration: number; /* ms to simulate */
  }
  const SECURED_DOC_STEPS: DocValidationStep[] = [
    { id: "connect-ecms", label: "Connecting to e-CMS", system: "e-CMS", detail: "Establishing secure connection to Contract Management System...", duration: 800 },
    { id: "fetch-contract", label: "Fetching contract documents", system: "e-CMS", detail: `Retrieving document registry for ${selectedContract?.id || "contract"}...`, duration: 1200 },
    { id: "verify-security", label: "Security & Insurance Documents", system: "e-CMS", detail: "Validating insurance coverage and material security documentation...", duration: 1500 },
    { id: "connect-egp", label: "Connecting to e-GP", system: "e-GP", detail: "Establishing secure connection to Government Procurement System...", duration: 700 },
    { id: "verify-cert", label: "Verification Certificate", system: "e-GP", detail: "Validating engineer certification and site verification records...", duration: 1400 },
    { id: "cross-validate", label: "Cross-system validation", system: "IFMIS", detail: "Cross-referencing e-CMS and e-GP records with IFMIS ledger...", duration: 1000 },
    { id: "complete", label: "All documents verified", system: "IFMIS", detail: "Document validation complete — all checks passed.", duration: 500 },
  ];

  const [securedAutoValidating, setSecuredAutoValidating] = useState(false);
  const [securedValidationStep, setSecuredValidationStep] = useState(-1);
  const [securedValidationComplete, setSecuredValidationComplete] = useState(false);
  const securedValidationTriggered = useRef(false);

  const runSecuredAutoValidation = useCallback(() => {
    if (securedValidationTriggered.current) return;
    securedValidationTriggered.current = true;
    setSecuredAutoValidating(true);
    setSecuredValidationStep(0);
    setSecuredValidationComplete(false);

    let stepIdx = 0;
    const runNext = () => {
      if (stepIdx >= SECURED_DOC_STEPS.length) {
        setSecuredAutoValidating(false);
        setSecuredValidationComplete(true);
        /* Auto-set the document flags as validated */
        setForm(p => ({ ...p, securityInsurance: true, materialVerification: true }));
        return;
      }
      setSecuredValidationStep(stepIdx);
      const delay = SECURED_DOC_STEPS[stepIdx].duration;
      stepIdx++;
      setTimeout(runNext, delay);
    };
    runNext();
  }, [SECURED_DOC_STEPS.length]);

  /* Trigger auto-validation when entering Step 2 with Secured Advance */
  useEffect(() => {
    if (step === 2 && isSecured && selectedContract && !securedValidationTriggered.current) {
      /* Small delay so the UI renders first */
      const t = setTimeout(() => runSecuredAutoValidation(), 400);
      return () => clearTimeout(t);
    }
  }, [step, isSecured, selectedContract, runSecuredAutoValidation]);

  /* Reset auto-validation state when category changes */
  useEffect(() => {
    if (!isSecured) {
      securedValidationTriggered.current = false;
      setSecuredAutoValidating(false);
      setSecuredValidationStep(-1);
      setSecuredValidationComplete(false);
    }
  }, [isSecured]);

  /* ── Auto-triggered Validation Engine (BR 25.1) ──
     Validations compute automatically from form state — no human intervention.
     Only failed validations surface as errors. All-pass = auto-proceed enabled. */
  const step2Validations = useMemo(() => {
    if (!form.advanceCategory) return [];
    const all = [
      { id: "contract-active", check: "Contract status is Active and awarded", pass: selectedContract?.status === "Active", show: true, severity: "critical" as const },
      { id: "contract-works", check: "Contract category is Works", pass: isWorksContract, show: isMobilization || isSecured, severity: "critical" as const },
      { id: "mob-limit", check: "Advance within 10% mobilization limit (PRR)", pass: Number(form.amount) <= maxMobilization, show: isMobilization, severity: "critical" as const },
      { id: "secured-pct", check: "Advance within permissible secured percentage", pass: true, show: isSecured, severity: "critical" as const },
      { id: "budget", check: "Budget availability confirmed", pass: !!form.budgetCode, show: true, severity: "critical" as const },
      { id: "commitment", check: "Commitment linkage verified", pass: !!form.commitmentRef, show: true, severity: "critical" as const },
      { id: "date-range", check: "Contract within valid date range (start-end)", pass: true, show: true, severity: "critical" as const },
      { id: "bg-amount", check: "Bank Guarantee amount >= Advance amount", pass: Number(form.bankGuaranteeAmount) >= Number(form.amount), show: isMobilization, severity: "critical" as const },
      { id: "bg-bank", check: "BG issued by approved Bank", pass: !!form.bankGuaranteeBank, show: isMobilization, severity: "critical" as const },
      { id: "bg-expiry", check: "BG valid until full recovery", pass: !!form.bankGuaranteeExpiry, show: isMobilization, severity: "critical" as const },
      { id: "site-report", check: "Site Inspection Report attached", pass: form.siteInspectionReport, show: isMaterial, severity: "critical" as const },
      { id: "material-site", check: "Material at approved storage site/depot", pass: true, show: isMaterial, severity: "info" as const },
      { id: "security-docs", check: "Security & insurance documents uploaded", pass: form.securityInsurance, show: isSecured, severity: "critical" as const },
      { id: "verification-cert", check: "Verification certificate attached", pass: form.materialVerification, show: isSecured, severity: "critical" as const },
    ];
    return all.filter(v => v.show);
  }, [form, selectedContract, isMobilization, isMaterial, isSecured, isWorksContract, maxMobilization]);

  const step2AllPassed = step2Validations.length > 0 && step2Validations.every(v => v.pass);
  const step2FailedCount = step2Validations.filter(v => !v.pass).length;
  const step2CriticalFailed = step2Validations.filter(v => !v.pass && v.severity === "critical");

  /* ── Step 3: Sanctioning Validation Engine (PD Row 120, BR 25.1.6) ──
     Category-specific validations per SRS Process Description.
     Auto-runs sequentially when entering Step 3 — no manual trigger. */
  const sanctioningValidations = useMemo(() => {
    if (!form.advanceCategory) return [];
    const common = [
      { id: "s-contract-active", check: "Contract status is Active and awarded", pass: selectedContract?.status === "Active", source: "IFMIS", ref: "PD Row 120" },
      { id: "s-date-range", check: "Contract within start date and end date (incl. amendments)", pass: true, source: "e-CMS", ref: "PD Row 120" },
    ];
    if (isMobilization) return [...common,
      { id: "s-mob-prr", check: "10% of contract value as per PRR", pass: Number(form.amount) <= maxMobilization, source: "IFMIS", ref: "BR 25.1.6" },
      { id: "s-mob-award", check: "Can be sanctioned only after contract award", pass: true, source: "e-CMS", ref: "PD Row 120" },
      { id: "s-mob-works", check: "Applicable only for Works contracts", pass: isWorksContract, source: "e-CMS", ref: "BR 25.1.6" },
      { id: "s-mob-bg-amount", check: "Bank Guarantee >= advance amount", pass: Number(form.bankGuaranteeAmount) >= Number(form.amount), source: "IFMIS", ref: "PD Row 120" },
      { id: "s-mob-bg-bank", check: "BG issued by approved Bank", pass: !!form.bankGuaranteeBank, source: "IFMIS", ref: "PD Row 120" },
      { id: "s-mob-bg-valid", check: "BG valid until full recovery of the advance", pass: !!form.bankGuaranteeExpiry, source: "IFMIS", ref: "PD Row 120" },
    ];
    if (isSecured) return [...common,
      { id: "s-sec-pct", check: "Advance amount <= permissible secured percentage", pass: true, source: "IFMIS", ref: "PD Row 120" },
      { id: "s-sec-terms", check: "% amount as per Contract Terms or MoF guidelines", pass: true, source: "e-CMS", ref: "BR 25.1.6" },
      { id: "s-sec-verified", check: "Sanctioned only against secured and verified materials", pass: true, source: "e-GP", ref: "PD Row 120" },
      { id: "s-sec-docs", check: "Material security & insurance documents uploaded", pass: form.securityInsurance, source: "e-CMS", ref: "PD Row 120" },
      { id: "s-sec-cert", check: "Verification certificate available", pass: form.materialVerification, source: "e-GP", ref: "PD Row 120" },
      { id: "s-sec-ecms", check: "Submitted in e-CMS and approved by procuring agency", pass: true, source: "e-CMS", ref: "PD Row 120" },
    ];
    if (isMaterial) return [...common,
      { id: "s-mat-amount", check: "Advance amount <= amount of procured materials", pass: true, source: "e-CMS", ref: "BR 25.1.6" },
      { id: "s-mat-progress", check: "Work Status = In Progress (validated from e-CMS)", pass: true, source: "e-CMS", ref: "BR 25.1.6" },
      { id: "s-mat-terms", check: "% amount as per Contract Terms or MoF guidelines", pass: true, source: "IFMIS", ref: "BR 25.1.6" },
      { id: "s-mat-report", check: "Site Inspection Report attached", pass: form.siteInspectionReport, source: "e-GP", ref: "PD Row 120" },
    ];
    return [...common,
      { id: "s-gen-budget", check: "Budget availability confirmed", pass: !!form.budgetCode, source: "IFMIS", ref: "BR 25.1.4" },
      { id: "s-gen-commit", check: "Commitment linkage verified", pass: !!form.commitmentRef, source: "IFMIS", ref: "BR 25.1.5" },
      { id: "s-gen-authority", check: "Sanctioning Authority certified", pass: true, source: "IFMIS", ref: "BR 25.1.7" },
    ];
  }, [form, selectedContract, isMobilization, isMaterial, isSecured, isWorksContract, maxMobilization]);

  const sanctionAllPassed = sanctioningValidations.length > 0 && sanctioningValidations.every(v => v.pass);
  const [sanctionValidationComplete, setSanctionValidationComplete] = useState(false);

  /* Reset sanction validation when step or category changes */
  useEffect(() => {
    if (step !== 3) setSanctionValidationComplete(false);
  }, [step, form.advanceCategory]);

  /* ── BR 25.1.8 — Generate ONE Payment Order ID per approved advance ──
     Fires exactly once when user first enters Step 5 (post-approval).
     Persists across re-renders so the ID is stable on screen. */
  useEffect(() => {
    if (step === 5 && !paymentOrderGenerated.current) {
      paymentOrderGenerated.current = true;
      setPaymentOrderId(generatePaymentOrderId(mode));
    }
  }, [step, mode, generatePaymentOrderId]);

  const goStep = (s: Step) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const submitForm = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false); setStep(1); setSelectedContract(null);
      /* Reset PO state so next advance gets a fresh one-time ID */
      paymentOrderGenerated.current = false;
      setPaymentOrderId("");
      setForm({ contractId: "", contractorId: "", agencyId: "", advanceCategory: "", amount: "", purpose: "", contractStatus: "", ucoaLevel: "", budgetCode: "", commitmentRef: "", bankGuaranteeRef: "", bankGuaranteeAmount: "", bankGuaranteeBank: "", bankGuaranteeExpiry: "", siteInspectionReport: false, materialVerification: false, securityInsurance: false, remarks: "", employeeId: "", employeeName: "", designation: "", department: "", ministryCode: "", orgCode: "", ministryName: "", imprestPurpose: "", imprestAmount: "", previousSettled: true });
    }, 4000);
  };

  const statusBadge = (s: string) => {
    if (s === "Active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "Inactive" || s === "Completed") return "bg-slate-100 text-slate-500 border-slate-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  /* ── Step definitions with SRS traceability ──
     Each step label traced to its SRS origin:
     PD = Process Description row, DD = Data Dictionary, BR = Business Rule, LoV = List of Values */
  const STEPS_CONTRACTUAL = [
    { n: 1, label: "Create Advance",         icon: "\uD83D\uDCDD", source: "PD", ref: "PD Step 1",   srsLine: "Row 119 — Create Contract advances" },
    { n: 2, label: "Documents & Validation",  icon: "\uD83D\uDD0D", source: "BR",  ref: "BR 25.1.6",  srsLine: "Row 120 — Advance Sanctioning Validation Control" },
    { n: 3, label: "Sanctioning",             icon: "\u2705",       source: "BR",  ref: "BR 25.1.7",  srsLine: "Row 120 — LoV 19.1 + PRR Rules" },
    { n: 4, label: "Approval",                icon: "\uD83D\uDCCB", source: "PD",  ref: "PD Step 3",  srsLine: "Row 121 — Approval process" },
    { n: 5, label: "Payment Order",           icon: "\uD83D\uDCB0", source: "PD",  ref: "PD Step 4",  srsLine: "Row 122 — Transactions and Payment order creation" },
    { n: 6, label: "Post Adjustment",         icon: "\uD83D\uDD04", source: "PD",  ref: "PD Step 5",  srsLine: "Row 123 — POST Advance Adjustment" },
  ];

  const STEPS_NON_CONTRACTUAL = [
    { n: 1, label: "Create Imprest",          icon: "\uD83D\uDCDD", source: "PD",  ref: "PD Step 1",  srsLine: "Row 124 — Create official imprest advances" },
    { n: 2, label: "Validation",              icon: "\uD83D\uDD0D", source: "BR",  ref: "BR 25.2.7",  srsLine: "Row 125 — Advance Sanctioning" },
    { n: 3, label: "Sanctioning",             icon: "\u2705",       source: "BR",  ref: "BR 25.2.8",  srsLine: "Row 125 — LoV 20.1 + Settlement Rules" },
    { n: 4, label: "Approval",                icon: "\uD83D\uDCCB", source: "PD",  ref: "PD Step 3",  srsLine: "Row 126 — Approval process" },
    { n: 5, label: "Payment Order",           icon: "\uD83D\uDCB0", source: "PD",  ref: "PD Step 4",  srsLine: "Row 127 — Transactions and Payment order creation" },
    { n: 6, label: "Post Adjustment",         icon: "\uD83D\uDD04", source: "PD",  ref: "PD Step 5",  srsLine: "Row 128 — POST Advance Adjustment" },
  ];

  const steps = mode === "contractual" ? STEPS_CONTRACTUAL : STEPS_NON_CONTRACTUAL;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* PAGE HEADER */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-slate-400">Expenditure Module</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Advances Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage contractual and official imprest advances with a simple guided workflow.
        </p>
      </div>

      <ModuleActorBanner moduleKey="advances" />

      {/* SUCCESS TOAST */}
      {showSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 shadow-lg animate-pulse">
          <span className="text-2xl">{"\u2705"}</span>
          <div>
            <p className="text-sm font-bold text-emerald-900">Advance Request Submitted Successfully</p>
            <p className="text-xs text-emerald-700">Reference: ADV-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 9000) + 1000)} — Routed to approval workflow.</p>
          </div>
        </div>
      )}

      {/* MODE TOGGLE */}
      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
        <button type="button" className={`flex-1 rounded-[20px] px-5 py-3.5 text-sm font-bold transition ${mode === "contractual" ? "border border-sky-200 bg-[linear-gradient(135deg,#eff8ff,#f7fbff)] text-sky-800" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => { setMode("contractual"); setStep(1); }}>
          {"\uD83C\uDFD7\uFE0F"} Contractual Advances
        </button>
        <button type="button" className={`flex-1 rounded-[20px] px-5 py-3.5 text-sm font-bold transition ${mode === "non-contractual" ? "border border-sky-200 bg-[linear-gradient(135deg,#eff8ff,#f7fbff)] text-sky-800" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => { setMode("non-contractual"); setStep(1); }}>
          {"\uD83D\uDC64"} Non Contractual Advances (Official Imprest)
        </button>
      </div>

      {/* STEPPER */}
      <div className="flex items-center gap-0 overflow-x-auto rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
        {steps.map((s, i) => {
          return (
            <div key={s.n} className="flex items-center">
              <button type="button"
                className={`group relative flex items-center gap-2 rounded-[18px] px-3 py-2.5 text-xs font-semibold transition whitespace-nowrap ${
                  step === s.n
                    ? "border border-sky-200 bg-[linear-gradient(135deg,#eff8ff,#f8fcff)] text-sky-800"
                    : step > s.n
                      ? "bg-white text-slate-700"
                      : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                }`}
                onClick={() => { if (s.n <= step) goStep(s.n as Step); }}
                title={s.label}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                  step === s.n
                    ? "bg-sky-100 text-sky-700"
                    : step > s.n
                      ? "bg-emerald-100 text-emerald-700"
                      : "border border-slate-200 bg-white text-slate-400"
                }`}>
                  {step > s.n ? "\u2713" : s.n}
                </span>
                <span>{s.icon} {s.label}</span>
              </button>
              {i < steps.length - 1 && <div className={`mx-1 h-[2px] w-4 ${step > s.n ? "bg-emerald-200" : "bg-slate-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
         CONTRACTUAL ADVANCES
         ═══════════════════════════════════════════════════════════════════ */}
      {mode === "contractual" && (
        <>
          {/* STEP 1: Create Contract Advances */}
          {step === 1 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-xl text-white font-bold">{"\uD83D\uDCDD"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 1: Create Contract Advances</h2>
                    <p className="mt-1 text-xs text-slate-500">Select an eligible contract and create the required advance request.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                {/* Contract Search */}
                <div className="relative">
                  <label className={labelClass}>
                    <span>Contract <span className="text-[#d32f2f]">*</span></span>
                    <span className="text-[10px] text-slate-400">Search active contracts by ID, title, or contractor name.</span>
                  </label>
                  <input
                    className={inputClass}
                    placeholder="Search by Contract ID, Title, or Contractor Name..."
                    value={contractSearch}
                    onChange={(e) => { setContractSearch(e.target.value); setShowContractDropdown(true); }}
                    onFocus={() => setShowContractDropdown(true)}
                  />
                  {showContractDropdown && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-rose-200 bg-white shadow-xl">
                      {filteredContracts.map((c) => (
                        <button key={c.id} type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-rose-50 transition border-b border-slate-100 last:border-0" onClick={() => selectContract(c)}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800">{c.id} — {c.title}</p>
                            <p className="text-xs text-slate-500">{c.contractorName} | {c.agencyName} | {c.category} | {c.budgetCode}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge(c.status)}`}>{c.status}</span>
                          {c.advanceApplicable ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">ADV</span> : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">No ADV</span>}
                          <span className="text-xs font-bold text-slate-600">BTN {(c.value / 1000000).toFixed(1)}M</span>
                        </button>
                      ))}
                      {filteredContracts.length === 0 && <p className="px-4 py-3 text-xs text-slate-400">No matching contracts found</p>}
                    </div>
                  )}
                </div>

                {/* Selected Contract Card */}
                {selectedContract && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{"\uD83D\uDCC4"}</span>
                      <p className="text-sm font-bold text-emerald-900">Selected Contract</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge(selectedContract.status)}`}>{selectedContract.status}</span>
                    </div>
                    <p className="mt-1 text-[10px] font-extrabold uppercase text-slate-400">Contract Summary</p>
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {[
                        { l: "Contract ID", v: selectedContract.id, s: "eCMS" },
                        { l: "Contract Title", v: selectedContract.title, s: "eCMS" },
                        { l: "Contractor ID", v: selectedContract.contractorId, s: "Contractor Master" },
                        { l: "Contractor Name", v: selectedContract.contractorName, s: "Contractor Master" },
                        { l: "Agency ID", v: selectedContract.agencyId, s: "Agency Master" },
                        { l: "Agency Name", v: selectedContract.agencyName, s: "Agency Master" },
                        { l: "Category", v: selectedContract.category, s: "Contract Creation" },
                        { l: "Expenditure Type", v: selectedContract.expenditureType, s: "UCoA" },
                        { l: "Contract Value (BTN)", v: selectedContract.value.toLocaleString(), s: "Contract Creation" },
                        { l: "Currency", v: selectedContract.contractCurrency, s: "Contract Creation" },
                        { l: "Start Date", v: selectedContract.startDate, s: "Contract Creation" },
                        { l: "End Date", v: selectedContract.endDate, s: "Contract Creation" },
                        { l: "Status", v: selectedContract.status, s: "eCMS" },
                      ].map((item) => (
                        <div key={item.l} className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase text-slate-400">{item.l}</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{item.v}</p>
                          <p className="text-[8px] text-slate-400 italic">from {item.s}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-[10px] font-extrabold uppercase text-slate-400">Budget & Financial</p>
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {[
                        { l: "Budget Code", v: selectedContract.budgetCode, s: "Budget Mgmt / UCoA" },
                        { l: "Commitment Reference", v: selectedContract.commitmentRef, s: "Commitment Mgmt" },
                        { l: "Commitment Balance", v: `BTN ${selectedContract.commitmentBalance.toLocaleString()}`, s: "Commitment Mgmt" },
                        { l: "Funding Source", v: selectedContract.fundingSource, s: "Contract Creation" },
                        { l: "Payment Source", v: selectedContract.paymentSource, s: "Contract Creation" },
                        { l: "Sector", v: selectedContract.sectorId, s: "UCoA" },
                        { l: "Sub-Sector", v: selectedContract.subSectorId, s: "UCoA" },
                      ].map((item) => (
                        <div key={item.l} className="rounded-xl border border-amber-100 bg-amber-50/30 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase text-slate-400">{item.l}</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{item.v}</p>
                          <p className="text-[8px] text-slate-400 italic">from {item.s}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-[10px] font-extrabold uppercase text-slate-400">Advance Configuration</p>
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {[
                        { l: "Advance Applicable", v: selectedContract.advanceApplicable ? "Yes" : "No", s: "Contract Creation" },
                        { l: "Advance Limit (BTN)", v: selectedContract.advanceAmount.toLocaleString(), s: "Contract Creation" },
                        { l: "Recovery Method", v: selectedContract.advanceRecoveryMethod || "N/A", s: "Contract Settings" },
                        { l: "Mobilization %", v: `${selectedContract.mobilizationPercent}%`, s: "PRR / MoF" },
                        { l: "Max Mobilization", v: `BTN ${maxMobilization.toLocaleString()}`, s: "Calculated from contract value" },
                      ].map((item) => (
                        <div key={item.l} className="rounded-xl border border-rose-100 bg-rose-50/30 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase text-slate-400">{item.l}</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{item.v}</p>
                          <p className="text-[8px] text-slate-400 italic">from {item.s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-fetched fields from Contract */}
                <div className="grid gap-4 md:grid-cols-3">
                  <label className={labelClass}>
                    <span>Contractor ID <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Auto-fetch</span></span>
                    <input className={lockedClass} value={form.contractorId || "Auto-fetch from Contract"} readOnly />
                  </label>
                  <label className={labelClass}>
                    <span>Agency ID <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Auto-fetch</span></span>
                    <input className={lockedClass} value={form.agencyId || "Implementing agency"} readOnly />
                  </label>
                  <label className={labelClass}>
                    <span>Contract Status <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Validated</span></span>
                    <input className={lockedClass} value={form.contractStatus || "-- Validate --"} readOnly />
                  </label>
                </div>

                {/* Advance not applicable warning */}
                {selectedContract && !selectedContract.advanceApplicable && (
                  <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4">
                    <p className="text-sm font-bold text-red-900">{"\u274C"} Advance Not Applicable</p>
                    <p className="text-xs text-red-800 mt-1">This contract was configured with Advance Applicable = <span className="font-bold">No</span> during Contract Creation (Step 6). Advances cannot be processed for this contract.</p>
                  </div>
                )}

                {/* Advance Details */}
                <hr className="border-rose-100" />
                <h4 className="text-sm font-bold text-[#8f1111]">{"\uD83D\uDCCA"} Advance Details</h4>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className={labelClass}>
                    <span>Advance Category <span className="text-[#d32f2f]">*</span></span>
                    <select className={inputClass} value={form.advanceCategory} onChange={(e) => updateForm("advanceCategory", e.target.value)}>
                      <option value="">-- Select --</option>
                      {ADVANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Amount (BTN) <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Auto-fetch</span></span>
                    <input className={lockedClass} value={form.amount ? `${Number(form.amount).toLocaleString()}` : "0"} readOnly />
                    <span className="text-[9px] italic text-slate-400">Pulled from the selected contract advance configuration.</span>
                    {isMobilization && Number(form.amount) > maxMobilization && maxMobilization > 0 && (
                      <p className="text-xs font-semibold text-red-600 mt-1">{"\u26A0\uFE0F"} Exceeds {selectedContract?.mobilizationPercent || 10}% mobilization limit of BTN {maxMobilization.toLocaleString()} {brTag("BR PRR")}</p>
                    )}
                  </label>
                  <label className={labelClass}>
                    <span>Budget Code <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Auto-fetch</span></span>
                    <input className={lockedClass} value={form.budgetCode || "-- Select Contract --"} readOnly />
                  </label>
                  <label className={labelClass}>
                    <span>Commitment Reference <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Auto-fetch</span></span>
                    <input className={lockedClass} value={form.commitmentRef || "-- Select Contract --"} readOnly />
                  </label>
                  <label className={labelClass}>
                    <span>Funding Source <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Auto-fetch</span></span>
                    <input className={lockedClass} value={selectedContract?.fundingSource || "-- Select Contract --"} readOnly />
                  </label>
                  <label className={labelClass}>
                    <span>Payment Source <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 ml-1">Auto-fetch</span></span>
                    <input className={lockedClass} value={selectedContract?.paymentSource || "-- Select Contract --"} readOnly />
                  </label>
                </div>

                <label className={labelClass}>
                  <span>Purpose</span>
                  <textarea className={`${inputClass} min-h-[80px]`} value={form.purpose} onChange={(e) => updateForm("purpose", e.target.value)} placeholder="Purpose of advance request — must align with contract scope and budget head" />
                </label>

                {/* Category-specific info */}
                {isMobilization && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <p className="text-sm font-bold text-amber-900">{"\uD83C\uDFD7\uFE0F"} Mobilization Advance Rules</p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-800">
                      <li>• 10% of contract value as per Procurement Rules & Regulations</li>
                      <li>• Can be sanctioned only after contract award</li>
                      <li>• Mandatory Bank Guarantee with equal or greater amount</li>
                      <li>• BG must be issued by approved Bank and valid until full recovery</li>
                    </ul>
                  </div>
                )}
                {isMaterial && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
                    <p className="text-sm font-bold text-blue-900">{"\uD83E\uDDF1"} Material Advance Rules</p>
                    <ul className="mt-2 space-y-1 text-xs text-blue-800">
                      <li>• Advance amount must not exceed amount of procured materials</li>
                      <li>• Contract status must be Active, Work Status = In Progress (validated from eCMS)</li>
                      <li>• Percentage as per Contract Terms or MoF guidelines</li>
                      <li>• Approval based on physical verification — Site Inspection Report must be attached</li>
                    </ul>
                  </div>
                )}
                {isSecured && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
                    <p className="text-sm font-bold text-indigo-900">{"\uD83D\uDD12"} Secured Advance Rules</p>
                    <ul className="mt-2 space-y-1 text-xs text-indigo-800">
                      <li>• Contract status must be Active</li>
                      <li>• Advance amount must not exceed permissible secured percentage</li>
                      <li>• Can be sanctioned only against secured and verified materials</li>
                      <li>• Material security and insurance documents must be uploaded, Verification certificate if available</li>
                    </ul>
                  </div>
                )}

                {isMobilization && selectedContract && !isWorksContract && (
                  <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4">
                    <p className="text-sm font-bold text-red-900">{"\u274C"} Contract Category Mismatch</p>
                    <p className="text-xs text-red-800 mt-1">Mobilization Advance is applicable only for <span className="font-bold">Works</span> contracts (construction, civil works). Current contract category: <span className="font-bold">{selectedContract.category}</span>. Not applicable for supply-only contracts or service contracts unless specifically approved.</p>
                  </div>
                )}
                {isSecured && selectedContract && !isWorksContract && (
                  <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4">
                    <p className="text-sm font-bold text-red-900">{"\u274C"} Contract Category Mismatch</p>
                    <p className="text-xs text-red-800 mt-1">Secured Advance is not applicable for supply contracts. Current contract category: <span className="font-bold">{selectedContract.category}</span>.</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="button" className={`${btnClass} ${!selectedContract || !selectedContract.advanceApplicable ? "cursor-not-allowed bg-slate-300 text-slate-500" : "bg-[#d32f2f] text-white hover:bg-[#b71c1c]"}`} disabled={!selectedContract || !selectedContract.advanceApplicable} onClick={() => goStep(2)}>
                    Continue to Validation {"\u2192"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2: Documents & Validation */}
          {step === 2 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-xl text-white font-bold">{"\uD83D\uDD0D"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 2: Documents & Validation Control</h2>
                    <p className="mt-1 text-xs text-slate-500">Upload supporting documents, bank guarantees, and site inspection reports as per advance category</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                {/* Dynamic: Category not yet selected */}
                {!form.advanceCategory && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <p className="text-sm font-bold text-amber-900">{"\u26A0\uFE0F"} Select Advance Category First</p>
                    <p className="text-xs text-amber-800 mt-1">Please go back to Step 1 and select an Advance Category to see the required documents and validation checks.</p>
                  </div>
                )}

                {/* MOBILIZATION: Bank Guarantee ONLY — no supporting documents per SRS */}
                {isMobilization && (
                  <>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                      <p className="text-xs font-bold text-emerald-900">{"\u2705"} SRS Rule — No Supporting Documents Required {brTag("BR PRN 15.1")}</p>
                      <p className="text-xs text-emerald-800 mt-1">Mobilization Advances do not require supporting documents validation as per SRS Process Description. However, a mandatory Bank Guarantee is required.</p>
                    </div>

                    <h4 className="text-sm font-bold text-[#8f1111]">{"\uD83C\uDFE6"} Bank Guarantee Details {brTag("BR Mandatory for Mobilization")} {ddTag("DD 30.1.6")}</h4>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className={labelClass}>
                        <span>BG Reference Number <span className="text-[#d32f2f]">*</span></span>
                        <input className={inputClass} value={form.bankGuaranteeRef} onChange={(e) => updateForm("bankGuaranteeRef", e.target.value)} placeholder="BG-XXXX-XXXX" />
                      </label>
                      <label className={labelClass}>
                        <span>BG Amount (BTN) <span className="text-[#d32f2f]">*</span></span>
                        <input className={inputClass} type="number" value={form.bankGuaranteeAmount} onChange={(e) => updateForm("bankGuaranteeAmount", e.target.value)} placeholder="Must be >= advance amount" />
                        {Number(form.bankGuaranteeAmount) > 0 && Number(form.bankGuaranteeAmount) < Number(form.amount) && (
                          <p className="text-xs text-red-600 mt-1">{"\u26A0\uFE0F"} BG amount must be equal or greater than advance amount</p>
                        )}
                      </label>
                      <label className={labelClass}>
                        <span>Issuing Bank {lovTag("LoV 3.2")} <span className="text-[#d32f2f]">*</span></span>
                        <select className={inputClass} value={form.bankGuaranteeBank} onChange={(e) => updateForm("bankGuaranteeBank", e.target.value)}>
                          <option value="">-- Select Bank --</option>
                          {BG_BANKS.map((b) => <option key={b}>{b}</option>)}
                        </select>
                      </label>
                      <label className={labelClass}>
                        <span>BG Expiry Date <span className="text-[#d32f2f]">*</span></span>
                        <input className={inputClass} type="date" value={form.bankGuaranteeExpiry} onChange={(e) => updateForm("bankGuaranteeExpiry", e.target.value)} />
                        <span className="text-[10px] text-slate-400">Must be valid until full recovery of advance</span>
                      </label>
                    </div>

                    {!isWorksContract && selectedContract && (
                      <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-3">
                        <p className="text-xs font-bold text-red-700">{"\u274C"} Mobilization Advance is only applicable for Works contracts — current: {selectedContract.category}</p>
                      </div>
                    )}
                  </>
                )}

                {/* MATERIAL: Site Inspection Report required — no BG */}
                {isMaterial && (
                  <>
                    <h4 className="text-sm font-bold text-[#8f1111]">{"\uD83D\uDCCE"} Supporting Documents — Material Advance {brTag("BR 25.1.6")}</h4>
                    <p className="text-xs text-slate-500">Material advances require physical verification. Site Inspection Report is mandatory.</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <button key="siteInspectionReport" type="button"
                        className={`rounded-2xl border-2 px-4 py-4 text-left transition ${form.siteInspectionReport ? "border-emerald-400 bg-emerald-50" : "border-red-300 bg-red-50/30"}`}
                        onClick={() => updateForm("siteInspectionReport", !form.siteInspectionReport)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-800">{form.siteInspectionReport ? "\u2705" : "\uD83D\uDCC4"} Site Inspection Report</span>
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">Required</span>
                        </div>
                        <p className="text-xs text-slate-500">Physical verification of materials at approved storage site/depot — confirms materials are for incorporation in the work</p>
                      </button>
                      <button key="materialVerification" type="button"
                        className={`rounded-2xl border-2 px-4 py-4 text-left transition ${form.materialVerification ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-rose-200"}`}
                        onClick={() => updateForm("materialVerification", !form.materialVerification)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-800">{form.materialVerification ? "\u2705" : "\uD83D\uDCC4"} Material Verification Certificate</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Optional</span>
                        </div>
                        <p className="text-xs text-slate-500">Verification certificate from competent engineer — if available</p>
                      </button>
                    </div>
                  </>
                )}

                {/* SECURED: Auto-validated from e-GP & e-CMS — no manual upload */}
                {isSecured && (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#8f1111]">{"\uD83D\uDCCE"} Supporting Documents — Secured Advance {brTag("BR 25.1.6")}</h4>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[8px] font-bold text-sky-700">e-CMS</span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[8px] font-bold text-indigo-700">e-GP</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">AUTO-VALIDATED</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Documents are automatically validated from e-CMS and e-GP systems — no manual upload required.</p>

                    {/* Auto-validation progress animation */}
                    {securedAutoValidating && (
                      <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 px-5 py-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-8 w-8 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                            <span className="text-xs">{"\uD83D\uDD04"}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-sky-900">Validating Documents from External Systems...</p>
                            <p className="text-[10px] text-sky-600">Step {Math.min(securedValidationStep + 1, SECURED_DOC_STEPS.length)} of {SECURED_DOC_STEPS.length}</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-sky-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-500" style={{ width: `${((securedValidationStep + 1) / SECURED_DOC_STEPS.length) * 100}%` }} />
                        </div>
                        {/* Sequential steps */}
                        <div className="space-y-1.5">
                          {SECURED_DOC_STEPS.map((ds, idx) => {
                            const isDone = idx < securedValidationStep;
                            const isCurrent = idx === securedValidationStep;
                            const isPending = idx > securedValidationStep;
                            const sysBadge = ds.system === "e-CMS" ? "bg-sky-100 text-sky-700" : ds.system === "e-GP" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700";
                            return (
                              <div key={ds.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all duration-300 ${isDone ? "bg-emerald-50 border border-emerald-200" : isCurrent ? "bg-white border-2 border-sky-300 shadow-md" : "bg-slate-50/50 border border-transparent opacity-40"}`}>
                                <span className="w-5 text-center">
                                  {isDone ? "\u2705" : isCurrent ? (
                                    <span className="inline-block animate-spin">{"\u23F3"}</span>
                                  ) : "\u23F8\uFE0F"}
                                </span>
                                <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${sysBadge}`}>{ds.system}</span>
                                <span className={`font-medium flex-1 ${isDone ? "text-emerald-700" : isCurrent ? "text-sky-900" : "text-slate-400"}`}>
                                  {ds.label}
                                </span>
                                {isCurrent && <span className="text-[10px] text-sky-600 animate-pulse">{ds.detail}</span>}
                                {isDone && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600">VERIFIED</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Completed state — documents auto-verified */}
                    {securedValidationComplete && !securedAutoValidating && (
                      <>
                        <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-lg text-white">{"\u2705"}</div>
                            <div>
                              <p className="text-sm font-bold text-emerald-900">All Documents Auto-Verified from e-CMS & e-GP</p>
                              <p className="text-xs text-emerald-700 mt-0.5">Documents validated automatically — no manual upload required. Cross-system verification complete.</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 py-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-emerald-800">{"\u2705"} Security & Insurance Documents</span>
                              <div className="flex items-center gap-1">
                                <span className="rounded bg-sky-100 px-1 py-0.5 text-[8px] font-bold text-sky-700">e-CMS</span>
                                <span className="rounded bg-emerald-200 px-1 py-0.5 text-[8px] font-bold text-emerald-700">VERIFIED</span>
                              </div>
                            </div>
                            <p className="text-xs text-emerald-600">Auto-fetched from e-CMS — insurance coverage and material security documentation verified</p>
                          </div>
                          <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 py-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-emerald-800">{"\u2705"} Verification Certificate</span>
                              <div className="flex items-center gap-1">
                                <span className="rounded bg-indigo-100 px-1 py-0.5 text-[8px] font-bold text-indigo-700">e-GP</span>
                                <span className="rounded bg-emerald-200 px-1 py-0.5 text-[8px] font-bold text-emerald-700">VERIFIED</span>
                              </div>
                            </div>
                            <p className="text-xs text-emerald-600">Auto-fetched from e-GP — engineer certification and site verification records confirmed</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Not yet started — waiting */}
                    {!securedAutoValidating && !securedValidationComplete && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="animate-pulse text-lg">{"\u23F3"}</span>
                          <div>
                            <p className="text-sm font-bold text-amber-900">Preparing Document Validation...</p>
                            <p className="text-xs text-amber-700 mt-0.5">System will auto-validate documents from e-CMS and e-GP shortly.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Auto-Triggered System Validation Engine (BR 25.1) ──
                    Validations run automatically based on form data — no manual trigger needed.
                    Failed validations show as errors; all-pass enables Continue. */}
                {form.advanceCategory && (
                  <>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#8f1111]">
                        {step2AllPassed ? "\u2705" : "\u26A0\uFE0F"} System Validation Checks {brTag("BR 25.1")}
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">AUTO-TRIGGERED</span>
                      </h4>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${step2AllPassed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {step2AllPassed ? `ALL ${step2Validations.length} PASSED` : `${step2FailedCount} of ${step2Validations.length} FAILED`}
                      </span>
                    </div>

                    {/* Auto-pass summary */}
                    {step2AllPassed && (
                      <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-lg text-white">{"\u2705"}</div>
                          <div>
                            <p className="text-sm font-bold text-emerald-900">All Validations Passed — Ready to Proceed</p>
                            <p className="text-xs text-emerald-700 mt-0.5">System has automatically validated all {step2Validations.length} checks. No manual intervention required.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Auto-fail error summary */}
                    {!step2AllPassed && step2CriticalFailed.length > 0 && (
                      <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100/30 px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-lg text-white">{"\u274C"}</div>
                          <div>
                            <p className="text-sm font-bold text-red-900">Validation Errors Detected — Cannot Proceed</p>
                            <p className="text-xs text-red-700 mt-0.5">Resolve the following {step2CriticalFailed.length} error{step2CriticalFailed.length > 1 ? "s" : ""} to continue:</p>
                            <ul className="mt-2 space-y-1">
                              {step2CriticalFailed.map(v => (
                                <li key={v.id} className="flex items-center gap-2 text-xs font-medium text-red-800">
                                  <span>{"\u274C"}</span> {v.check}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Individual validation check grid */}
                    <div className="grid gap-2 md:grid-cols-2">
                      {step2Validations.map((v) => (
                        <div key={v.id} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-all duration-300 ${v.pass ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700 shadow-sm shadow-red-100"}`}>
                          <span className="text-base">{v.pass ? "\u2705" : "\u274C"}</span>
                          <span className="font-medium flex-1">{v.check}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${v.pass ? "bg-emerald-200/60 text-emerald-700" : "bg-red-200/60 text-red-700"}`}>
                            {v.pass ? "PASS" : "FAIL"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(1)}>{"\u2190"} Back</button>
                  {step2AllPassed ? (
                    <button type="button" className={`${btnClass} bg-[#d32f2f] text-white hover:bg-[#b71c1c]`} onClick={() => goStep(3)}>Continue to Sanctioning {"\u2192"}</button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {step2FailedCount > 0 && (
                        <span className="text-xs font-medium text-red-600">{step2FailedCount} validation{step2FailedCount > 1 ? "s" : ""} failed</span>
                      )}
                      <button type="button" disabled className={`${btnClass} cursor-not-allowed bg-slate-300 text-slate-500`} title="Resolve all validation errors to proceed">Continue to Sanctioning {"\u2192"}</button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: Sanctioning — Auto-validated per SRS PD Row 120 */}
          {step === 3 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white font-bold">{"\u2705"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">
                      Step 3: Advance Sanctioning Validation Control {brTag("BR 25.1.6")}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      System auto-validates advance limits per contract terms, budget, commitment, and PRR rules — submitted via e-CMS, approved by procuring agency
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">PD Row 120</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                {/* Sanctioning Summary */}
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-sky-900">Sanctioning Summary</p>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[8px] font-bold text-sky-700">e-CMS</span>
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[8px] font-bold text-indigo-700">e-GP</span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">IFMIS</span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400">Contract {ddTag("DD 30.1.1")}</p>
                      <p className="text-sm font-bold text-slate-700">{selectedContract?.id}</p>
                    </div>
                    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400">Advance Category {lovTag("LoV 19.1")}</p>
                      <p className="text-sm font-bold text-slate-700">{form.advanceCategory || "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400">Amount (BTN) {ddTag("DD 30.1.2")}</p>
                      <p className="text-sm font-bold text-slate-700">{Number(form.amount).toLocaleString() || "0"}</p>
                    </div>
                    <div className="rounded-xl border border-sky-100 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-400">Contract Status</p>
                      <p className="text-sm font-bold text-emerald-700">{selectedContract?.status || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Auto-validation animation for sanctioning */}
                <SanctioningAutoValidator
                  category={form.advanceCategory}
                  isMobilization={isMobilization}
                  isMaterial={isMaterial}
                  isSecured={isSecured}
                  validations={sanctioningValidations}
                  onComplete={() => setSanctionValidationComplete(true)}
                  isComplete={sanctionValidationComplete}
                />

                {/* Post-validation: Show sanctioning result */}
                {sanctionValidationComplete && (
                  <>
                    {sanctionAllPassed ? (
                      <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-lg text-white">{"\u2705"}</div>
                          <div>
                            <p className="text-sm font-bold text-emerald-900">Sanctioning Validated — Status: APPROVED</p>
                            <p className="text-xs text-emerald-700 mt-0.5">All {sanctioningValidations.length} sanctioning checks passed. Advance request forwarded to Approval workflow.</p>
                          </div>
                          <span className="ml-auto rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-extrabold text-white shadow">APPROVED</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100/30 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-lg text-white">{"\u274C"}</div>
                          <div>
                            <p className="text-sm font-bold text-red-900">Sanctioning Failed — Status: HOLD</p>
                            <p className="text-xs text-red-700 mt-0.5">{sanctioningValidations.filter(v => !v.pass).length} validation(s) failed. Resolve errors and re-submit.</p>
                          </div>
                          <span className="ml-auto rounded-full bg-red-500 px-4 py-1.5 text-xs font-extrabold text-white shadow">HOLD</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(2)}>{"\u2190"} Back</button>
                  {sanctionValidationComplete && sanctionAllPassed ? (
                    <button type="button" className={`${btnClass} bg-[#d32f2f] text-white hover:bg-[#b71c1c]`} onClick={() => goStep(4)}>Continue to Approval {"\u2192"}</button>
                  ) : (
                    <button type="button" disabled className={`${btnClass} cursor-not-allowed bg-slate-300 text-slate-500`}>
                      {sanctionValidationComplete ? "Sanctioning Failed" : "Validating..."} {"\u2192"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* STEP 4: Approval */}
          {step === 4 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white font-bold">{"\uD83D\uDCCB"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 4: Approval Process</h2>
                    <p className="mt-1 text-xs text-slate-500">System validation at IFMIS — Budget availability, Commitment linkage, Advance limits, Contract status</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                  <p className="text-sm font-bold text-emerald-900">IFMIS System Validation</p>
                  <p className="text-xs text-emerald-800 mt-1">If all validations pass: Status = "Approved". If any validation fails: Status = "Hold".</p>
                </div>

                <div className="grid gap-2">
                  {[
                    "Budget availability confirmed",
                    "Commitment linkage verified",
                    "Advance limits as per contract terms validated",
                    "Contract status is Active and awarded",
                  ].map((v) => (
                    <div key={v} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
                      <span>{"\u2705"}</span> <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>

                <h4 className="text-sm font-bold text-[#8f1111]">{"\uD83D\uDD04"} Workflow Configuration — RBAC Persona Approval</h4>
                <PersonaApprovalWorkflow
                  title="Advance Approval Chain"
                  subtitle="Each step is owned by a different RBAC persona. Switch your active role from the top navbar to act on the matching step."
                  steps={approvalChain}
                  onChange={setApprovalChain}
                />

                <label className={labelClass}>
                  <span>Remarks / Justification</span>
                  <textarea className={`${inputClass} min-h-[80px]`} value={form.remarks} onChange={(e) => updateForm("remarks", e.target.value)} placeholder="Enter any remarks for the approval workflow..." />
                </label>

                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(3)}>{"\u2190"} Back</button>
                  <button
                    type="button"
                    disabled={!allChainApproved}
                    className={`${btnClass} ${allChainApproved ? "bg-[#d32f2f] text-white hover:bg-[#b71c1c]" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                    onClick={() => goStep(5)}
                  >
                    {allChainApproved ? "Continue to Payment Order \u2192" : "Awaiting all approvals\u2026"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 5: Payment Order */}
          {step === 5 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white font-bold">{"\uD83D\uDCB0"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 5: Transactions & Payment Order Creation</h2>
                    <p className="mt-1 text-xs text-slate-500">System auto-generates payment order for approved advance — forwarded to Cash Management {ddTag("DD 17.6")} {lovTag("LoV 9.2")}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                  <p className="text-xs text-sky-800">The "APPROVED" advance request is forwarded to the Cash Management component. System shall generate payment transaction for approved advance request and auto-generate payment order. The released payment from Cash Management is then visible to the agency staff.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Payment Order ID {ddTag("DD 14.1.40")}</p>
                    <p className="text-sm font-bold text-slate-700 font-mono mt-1">{paymentOrderId || "Generating..."}</p>
                    <p className="text-[8px] text-slate-400 italic mt-0.5">BR 25.1.8 — One PO per approved advance, no duplicates</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Payment Amount {ddTag("DD 17.8")}</p>
                    <p className="text-sm font-bold text-emerald-700 mt-1">BTN {Number(form.amount).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Contract ID</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedContract?.id}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Contractor</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedContract?.contractorName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
                  <span>{"\u2192"}</span>
                  <p className="text-xs text-amber-800 font-medium">Payment Order will be forwarded to <span className="font-bold">Cash Management</span> component for processing and release.</p>
                </div>

                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(4)}>{"\u2190"} Back</button>
                  <button type="button" className={`${btnClass} bg-[#d32f2f] text-white hover:bg-[#b71c1c]`} onClick={() => goStep(6)}>Continue to Post Adjustment {"\u2192"}</button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 6: Post Advance Adjustment */}
          {step === 6 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-xl text-white font-bold">{"\uD83D\uDD04"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 6: Post Advance Adjustment</h2>
                    <p className="mt-1 text-xs text-slate-500">Advances adjusted against Running Account Bill (RAB) until liquidated — Fractions or Whole Sum</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                  <p className="text-xs text-sky-800">Advances taken by the contractors have to be adjusted against the Running Account Bill (RAB). While processing the RAB, the system must adjust such advances using one of the following methods until it is liquidated and final bill payments are made to the contractors.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Contract ID {ddTag("DD 14.1.1")}</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedContract?.id}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Contractor ID {ddTag("DD 14.1.4")}</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedContract?.contractorId}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Agency Code {ddTag("DD 14.1.21")}</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{selectedContract?.agencyId}</p>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-[#8f1111]">Recovery Method</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <button type="button" className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-5 py-4 text-left">
                    <p className="text-sm font-bold text-emerald-800">{"\uD83D\uDD22"} Fractions</p>
                    <p className="text-xs text-emerald-600 mt-1">Advance recovered in proportional deductions from each Running Account Bill until fully liquidated</p>
                  </button>
                  <button type="button" className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-left hover:border-indigo-300">
                    <p className="text-sm font-bold text-slate-800">{"\uD83D\uDCB5"} Whole Sum</p>
                    <p className="text-xs text-slate-600 mt-1">Entire advance amount recovered in a single deduction from one bill</p>
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-bold text-amber-900">{"\u26A0\uFE0F"} Must be processed during invoicing/bill processing</p>
                  <p className="text-xs text-amber-800 mt-1">Against the Contract ID, Contractor ID, and Agency Code — the system must adjust advances from the RAB until the advance is fully liquidated and final bill payment is processed to the contractor.</p>
                </div>

                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(5)}>{"\u2190"} Back</button>
                  <button type="button" className={`${btnClass} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={submitForm}>{"\u2705"} Approve and send to Cash Management</button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         NON-CONTRACTUAL ADVANCES (OFFICIAL IMPREST)
         ═══════════════════════════════════════════════════════════════════ */}
      {mode === "non-contractual" && (
        <>
          {/* STEP 1: Create Official Imprest */}
          {step === 1 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white font-bold">{"\uD83D\uDCDD"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 1: Create Official Imprest Advance</h2>
                    <p className="mt-1 text-xs text-slate-500">Create a non-contractual official imprest request for eligible employees or public officials.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                {/* Employee Search */}
                <div className="relative">
                  <label className={labelClass}>
                    <span>Employee / Public Official Search <span className="text-[#d32f2f]">*</span></span>
                    <span className="text-[10px] text-slate-400">Search by CID or Employee ID — Employee must be Active and eligible</span>
                  </label>
                  <input
                    className={inputClass}
                    placeholder="Search by Employee ID, Name, or CID..."
                    value={employeeSearch}
                    onChange={(e) => { setEmployeeSearch(e.target.value); setShowEmployeeDropdown(true); }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                  />
                  {showEmployeeDropdown && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-rose-200 bg-white shadow-xl">
                      {filteredEmployees.map((e) => (
                        <button key={e.id} type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-rose-50 transition border-b border-slate-100 last:border-0" onClick={() => selectEmployee(e)}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800">{e.name}</p>
                            <p className="text-xs text-slate-500">{e.id} | CID: {e.cid} | {e.designation}</p>
                          </div>
                          <span className="text-xs text-slate-400">{e.department}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {form.employeeId && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                    <p className="text-sm font-bold text-emerald-900 mb-2">{"\uD83D\uDC64"} Selected Employee</p>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                        <p className="text-[10px] uppercase text-slate-400">Employee ID</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{form.employeeId}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                        <p className="text-[10px] uppercase text-slate-400">Name</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{form.employeeName}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                        <p className="text-[10px] uppercase text-slate-400">Designation</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{form.designation}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                        <p className="text-[10px] uppercase text-slate-400">Department</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{form.department}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className={labelClass}>
                    <span>Advance Category <span className="text-[#d32f2f]">*</span></span>
                    <select className={inputClass} value={form.advanceCategory} onChange={(e) => updateForm("advanceCategory", e.target.value)}>
                      <option value="">-- Select --</option>
                      {NON_CONTRACT_ADVANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Amount (BTN) <span className="text-[#d32f2f]">*</span></span>
                    <input className={inputClass} type="number" value={form.imprestAmount} onChange={(e) => updateForm("imprestAmount", e.target.value)} placeholder="0.00" />
                    <span className="text-[10px] text-slate-400">Ceiling limits apply based on designation/category</span>
                  </label>
                  <label className={labelClass}>
                    <span>Budget Code <span className="text-[#d32f2f]">*</span></span>
                    <select className={inputClass} value={form.budgetCode} onChange={(e) => updateForm("budgetCode", e.target.value)} disabled={!form.employeeId}>
                      <option value="">{form.employeeId ? "-- Select Department Budget Head --" : "-- Select an employee first --"}</option>
                      {filteredBudgetCodes.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <span className="text-[10px] text-slate-400">
                      {form.ministryName
                        ? `Filtered to ${form.ministryName} (UCoA Level-1 ${form.ministryCode}) — ${filteredBudgetCodes.length} department${filteredBudgetCodes.length === 1 ? "" : "s"} available`
                        : "Auto-sourced from Budget Management / UCoA (DD 14.1.7)"}
                    </span>
                  </label>
                </div>

                <label className={labelClass}>
                  <span>Purpose Category <span className="text-[#d32f2f]">*</span></span>
                  <select className={inputClass} value={form.imprestPurpose} onChange={(e) => updateForm("imprestPurpose", e.target.value)}>
                    <option value="">-- Select Purpose --</option>
                    {IMPREST_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <span className="text-[10px] text-slate-400">Purpose must align with budget head</span>
                </label>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-bold text-amber-900">{"\u26A0\uFE0F"} Validation Rules</p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-800">
                    <li>• New imprest shall not be issued if previous imprest is not settled</li>
                    <li>• Ceiling limits apply based on designation/category</li>
                    <li>• Purpose must align with budget head</li>
                    <li>• Must comply with approved financial rules and settlement requirements</li>
                    <li>• The imprest advance shall NOT hit payroll</li>
                  </ul>
                </div>

                {form.advanceCategory === "Personal Advance" && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
                    <p className="text-sm font-bold text-blue-900">{"\uD83D\uDC64"} Personal Advance Rules</p>
                    <ul className="mt-2 space-y-1 text-xs text-blue-800">
                      <li>• For personal needs of public officials during official duty</li>
                      <li>• Must be settled within prescribed time period</li>
                      <li>• Subject to ceiling limits based on designation</li>
                    </ul>
                  </div>
                )}
                {form.advanceCategory === "Official Advance" && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
                    <p className="text-sm font-bold text-indigo-900">{"\uD83C\uDFDB\uFE0F"} Official Advance Rules</p>
                    <ul className="mt-2 space-y-1 text-xs text-indigo-800">
                      <li>• For official operational purposes of the agency</li>
                      <li>• No percentage but based on professional judgment as prescribed by RGOB</li>
                      <li>• Must be settled upon production of invoices/bills</li>
                    </ul>
                  </div>
                )}
                {form.advanceCategory === "Imprest Advance" && (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
                    <p className="text-sm font-bold text-violet-900">{"\uD83D\uDCB3"} Imprest Advance Rules</p>
                    <ul className="mt-2 space-y-1 text-xs text-violet-800">
                      <li>• Time-bound — must be settled within defined period</li>
                      <li>• Imprest ceiling limit must not be exceeded</li>
                      <li>• Imprest holder must be approved</li>
                      <li>• Previous imprest must be settled or partially settled as per policy</li>
                      <li>• Shall NOT hit payroll</li>
                    </ul>
                  </div>
                )}

                {(() => {
                  const amt = Number(form.imprestAmount);
                  const canContinue = !!form.employeeId && !!form.advanceCategory && !!form.budgetCode && !!form.imprestPurpose && amt > 0;
                  const reason = !form.employeeId ? "Select an employee" : !form.advanceCategory ? "Select advance category" : !(amt > 0) ? "Enter a valid amount (BTN > 0)" : !form.budgetCode ? "Select budget code" : !form.imprestPurpose ? "Select purpose" : "";
                  return (
                    <div className="flex items-center justify-end gap-3">
                      {!canContinue && <span className="text-xs text-rose-600 font-medium">{"\u26A0\uFE0F"} {reason}</span>}
                      <button type="button" className={`${btnClass} ${!canContinue ? "cursor-not-allowed bg-slate-300 text-slate-500" : "bg-[#d32f2f] text-white hover:bg-[#b71c1c]"}`} disabled={!canContinue} onClick={() => goStep(2)}>
                        Continue to Validation {"\u2192"}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </section>
          )}

          {/* STEP 2-6 for non-contractual: similar validation/approval/payment/adjustment flow */}
          {step === 2 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-xl text-white font-bold">{"\uD83D\uDD0D"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 2: Advance Sanctioning Validation</h2>
                    <p className="mt-1 text-xs text-slate-500">System checks eligibility, previous settlement, budget, ceiling limits</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="grid gap-2">
                  {[
                    { check: "Previous imprest is settled", pass: form.previousSettled },
                    { check: "Approved budget availability confirmed", pass: !!form.budgetCode },
                    { check: "Commitment linkage verified", pass: true },
                    { check: "Purpose aligns with budget head", pass: !!form.imprestPurpose },
                    { check: "Complies with approved financial rules", pass: true },
                    { check: "Ceiling limits based on designation/category", pass: true },
                  ].map((v) => (
                    <div key={v.check} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs ${v.pass ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                      <span>{v.pass ? "\u2705" : "\u274C"}</span>
                      <span className="font-medium">{v.check}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(1)}>{"\u2190"} Back</button>
                  <button type="button" className={`${btnClass} bg-[#d32f2f] text-white hover:bg-[#b71c1c]`} onClick={() => goStep(3)}>Continue {"\u2192"}</button>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white font-bold">{"\u2705"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 3: Sanctioning Result</h2>
                    <p className="mt-1 text-xs text-slate-500">If validated: "Approved". If fails: "Hold".</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4">
                  <span className="text-2xl">{"\u2705"}</span>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Status: APPROVED</p>
                    <p className="text-xs text-emerald-700">All validation checks passed. Advance request approved for processing.</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(2)}>{"\u2190"} Back</button>
                  <button type="button" className={`${btnClass} bg-[#d32f2f] text-white hover:bg-[#b71c1c]`} onClick={() => goStep(4)}>Continue to Approval Workflow {"\u2192"}</button>
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white font-bold">{"\uD83D\uDCCB"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 4: Approval Workflow</h2>
                    <p className="mt-1 text-xs text-slate-500">Authorized workflow: Initiation → Review → Approval → Payment Release</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <PersonaApprovalWorkflow
                  title="Imprest Approval Chain"
                  subtitle="Each step is owned by a different RBAC persona. Switch your active role from the top navbar to act on the matching step."
                  steps={approvalChain}
                  onChange={setApprovalChain}
                />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
                  <p className="text-xs text-amber-800 font-medium">{"\u26A0\uFE0F"} NOTE: The imprest advance shall NOT hit payroll.</p>
                </div>
                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(3)}>{"\u2190"} Back</button>
                  <button
                    type="button"
                    disabled={!allChainApproved}
                    className={`${btnClass} ${allChainApproved ? "bg-[#d32f2f] text-white hover:bg-[#b71c1c]" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                    onClick={() => goStep(5)}
                  >
                    {allChainApproved ? "Continue to Payment Order \u2192" : "Awaiting all approvals\u2026"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white font-bold">{"\uD83D\uDCB0"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 5: Payment Order Creation</h2>
                    <p className="mt-1 text-xs text-slate-500">Auto-generated payment order forwarded to Cash Management {ddTag("DD 17.6")}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Payment Order ID {ddTag("DD 14.1.40")}</p>
                    <p className="text-sm font-bold text-slate-700 font-mono mt-1">{paymentOrderId || "Generating..."}</p>
                    <p className="text-[8px] text-slate-400 italic mt-0.5">BR 25.2.9 — One PO per approved imprest, no duplicates</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Amount {ddTag("DD 17.8")}</p>
                    <p className="text-sm font-bold text-emerald-700 mt-1">BTN {(Number(form.imprestAmount) || 0).toLocaleString()}</p>
                    <p className="text-[8px] text-slate-400 italic mt-0.5">From Step 1 — {form.imprestPurpose || "imprest purpose"}</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(4)}>{"\u2190"} Back</button>
                  <button type="button" className={`${btnClass} bg-[#d32f2f] text-white hover:bg-[#b71c1c]`} onClick={() => goStep(6)}>Continue to Post Adjustment {"\u2192"}</button>
                </div>
              </div>
            </section>
          )}

          {step === 6 && (
            <section className={panelClass}>
              <div className={headerClass}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-xl text-white font-bold">{"\uD83D\uDD04"}</div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Step 6: Post Advance Adjustment</h2>
                    <p className="mt-1 text-xs text-slate-500">Imprest adjusted upon production of invoices/bills with tax application</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                  <p className="text-xs text-sky-800">Imprest advances taken by employees must be adjusted upon the production of invoices/bills and application of taxes if any. Against the Employee ID, Budget ID, and Agency Code — the system must adjust advances as follows:</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Employee ID</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{form.employeeId}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Budget Code</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{form.budgetCode}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-400">Agency Code</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">{form.ministryCode ? `AGY-${form.ministryCode} \u2014 ${form.ministryName}` : (form.agencyId || "—")}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <button type="button" className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-5 py-4 text-left">
                    <p className="text-sm font-bold text-emerald-800">{"\uD83D\uDD22"} Fractions</p>
                    <p className="text-xs text-emerald-600 mt-1">Partial deductions from invoices</p>
                  </button>
                  <button type="button" className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-left hover:border-indigo-300">
                    <p className="text-sm font-bold text-slate-800">{"\uD83D\uDCB5"} Whole Sum</p>
                    <p className="text-xs text-slate-600 mt-1">Full amount from single bill</p>
                  </button>
                  <button type="button" className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-left hover:border-amber-300">
                    <p className="text-sm font-bold text-slate-800">{"\uD83D\uDCB0"} Cash Surrender</p>
                    <p className="text-xs text-slate-600 mt-1">Balance liquidated by surrendering cash balance (cash in hand)</p>
                  </button>
                </div>

                <div className="flex justify-between">
                  <button type="button" className={`${btnClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={() => goStep(5)}>{"\u2190"} Back</button>
                  <button type="button" className={`${btnClass} bg-emerald-600 text-white hover:bg-emerald-700`} onClick={submitForm}>{"\u2705"} Approved and send to Cash Management</button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
