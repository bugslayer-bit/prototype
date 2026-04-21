/* ═══════════════════════════════════════════════════════════════════════════
   Muster Roll — Public Beneficiary Self-Registration Page
   Bhutan Integrated Financial Management Information System (IFMIS)
   ───────────────────────────────────────────────────────────────────
   Allows public users (muster roll beneficiaries) to create their own
   accounts by providing personal info and validated bank details.
   No role guard — accessible to any authenticated user with role-public.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../shared/context/AuthContext";
import { AGENCIES } from "../../shared/data/agencyPersonas";
import { bhutanLocationHierarchy } from "../../shared/data/locationData";
import { useContractData } from "../../shared/context/ContractDataContext";
import { useMusterRollBeneficiaries } from "../../shared/context/MusterRollBeneficiaryContext";
import {
  getValidBankNames,
  getBranchOptionsForBank,
  validateBankDetails,
  verifyCbs,
} from "../../shared/utils/bankValidation";
import type { BankFieldErrors, CbsVerificationResult } from "../../shared/utils/bankValidation";

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface RegistrationFormData {
  /* Personal */
  firstName: string;
  middleName: string;
  lastName: string;
  cid: string;
  gender: "male" | "female" | "";
  dateOfBirth: string;
  phone: string;
  email: string;
  /* Location — sourced dynamically from UCoA Bhutan hierarchy so
     Dzongkhag → Dungkhag → Gewog → Village cascades correctly. */
  dzongkhag: string;
  dzongkhagCode: string;
  dungkhag: string;
  dungkhagCode: string;
  gewog: string;
  gewogCode: string;
  village: string;

  /* Work / Muster Roll context — project is now a dropdown populated
     from verified contracts pulled live from ContractDataContext. */
  workType: "daily-wage" | "seasonal" | "project-based" | "";
  agency: string;
  department: string;
  projectContractId: string;
  projectName: string;
  contractorId: string;
  contractorName: string;

  /* Bank Details */
  bankName: string;
  bankBranch: string;
  bankAccountNo: string;
  accountHolderName: string;
}

const INITIAL_FORM: RegistrationFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  cid: "",
  gender: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  dzongkhag: "",
  dzongkhagCode: "",
  dungkhag: "",
  dungkhagCode: "",
  gewog: "",
  gewogCode: "",
  village: "",
  workType: "",
  agency: "",
  department: "",
  projectContractId: "",
  projectName: "",
  contractorId: "",
  contractorName: "",
  bankName: "",
  bankBranch: "",
  bankAccountNo: "",
  accountHolderName: "",
};

const WORK_TYPES = [
  { value: "daily-wage", label: "Daily Wage Worker" },
  { value: "seasonal", label: "Seasonal Worker" },
  { value: "project-based", label: "Project-Based Worker" },
];

/* ═══════════════════════════════════════════════════════════════════════════ */

type Step = "personal" | "work" | "bank" | "review" | "success";

export function MusterRollPublicRegistrationPage() {
  const { activeRoleId, user } = useAuth();
  const { contracts } = useContractData();
  const { addBeneficiary } = useMusterRollBeneficiaries();
  /* `activeRoleId` is unused directly here but kept to mirror the other
     public-portal pages' pattern; the ESLint rule is silenced. */
  void activeRoleId;

  /* ── Form state ──────────────────────────────────────────────────────── */
  const [form, setForm] = useState<RegistrationFormData>(INITIAL_FORM);
  const [step, setStep] = useState<Step>("personal");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  /* ── Bank validation state ───────────────────────────────────────────── */
  const [bankFieldErrors, setBankFieldErrors] = useState<BankFieldErrors>({});
  const [cbsStatus, setCbsStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [cbsMessage, setCbsMessage] = useState("");

  /* ── Derived data ────────────────────────────────────────────────────── */
  const bankNames = useMemo(() => getValidBankNames(), []);
  const branchOptions = useMemo(
    () => (form.bankName ? getBranchOptionsForBank(form.bankName) : []),
    [form.bankName]
  );

  /** Departments cascade from selected agency */
  const departmentOptions = useMemo(() => {
    if (!form.agency) return [];
    const agency = AGENCIES.find((a) => a.name === form.agency);
    return agency ? agency.departments : [];
  }, [form.agency]);

  /* ── UCoA location hierarchy (live cascade) ─────────────────────────── */
  const dzongkhagOptions = useMemo(
    () => bhutanLocationHierarchy.map((d) => ({ code: d.code, name: d.name })),
    [],
  );
  const selectedDzongkhag = useMemo(
    () => bhutanLocationHierarchy.find((d) => d.name === form.dzongkhag),
    [form.dzongkhag],
  );
  const dungkhagOptions = useMemo(
    () => (selectedDzongkhag ? selectedDzongkhag.dungkhags.filter((x) => x.name) : []),
    [selectedDzongkhag],
  );
  const selectedDungkhag = useMemo(
    () => selectedDzongkhag?.dungkhags.find((x) => x.name === form.dungkhag) ?? null,
    [selectedDzongkhag, form.dungkhag],
  );
  /* If the selected Dzongkhag has no "real" Dungkhag (empty name), gewogs
     still exist directly under the dzongkhag-level dungkhag record. */
  const gewogOptions = useMemo(() => {
    if (!selectedDzongkhag) return [];
    if (selectedDungkhag) return selectedDungkhag.gewogs;
    const direct = selectedDzongkhag.dungkhags.find((x) => !x.name);
    return direct ? direct.gewogs : [];
  }, [selectedDzongkhag, selectedDungkhag]);

  /* ── Dynamic Project list (sourced from verified contracts) ─────────── */
  const agencyProjectOptions = useMemo(() => {
    if (!form.agency) return [];
    /* Only surface contracts that are verified / approved so the beneficiary
       cannot attach themselves to a draft or rejected contract. */
    const VALID_STATUSES = new Set([
      "Approved",
      "approved",
      "Verified",
      "verified",
      "Active",
      "active",
    ]);
    return contracts
      .filter((c) => c.agencyName === form.agency)
      .filter(
        (c) =>
          VALID_STATUSES.has(c.contractStatus) ||
          VALID_STATUSES.has(c.workflowStatus) ||
          Boolean(c.approvedAt),
      );
  }, [contracts, form.agency]);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const updateField = useCallback(<K extends keyof RegistrationFormData>(
    key: K,
    value: RegistrationFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const handleBankChange = useCallback((bankName: string) => {
    setForm((prev) => ({ ...prev, bankName, bankBranch: "" }));
    setCbsStatus("idle");
    setCbsMessage("");
    setBankFieldErrors({});
  }, []);

  /* ── Live CBS verify: fires 700ms after the account number reaches a
     plausible length and the bank/branch/account-holder fields are filled.
     Keeps the visible "Verify Bank Account" button as a manual override,
     but most users will never need to click it. */
  const verifyReqIdRef = useRef(0);
  useEffect(() => {
    const acct = form.bankAccountNo.trim();
    if (!form.bankName || !form.bankBranch || acct.length < 9 || !/^\d+$/.test(acct)) {
      return;
    }
    if (cbsStatus === "verifying" || cbsStatus === "verified") return;
    const thisReq = ++verifyReqIdRef.current;
    const t = window.setTimeout(async () => {
      if (thisReq !== verifyReqIdRef.current) return;
      setCbsStatus("verifying");
      const result = await verifyCbs(
        form.bankName,
        form.bankBranch,
        acct,
        form.accountHolderName || `${form.firstName} ${form.lastName}`.trim(),
      );
      if (thisReq !== verifyReqIdRef.current) return;
      setCbsStatus(result.verified ? "verified" : "failed");
      setCbsMessage(result.message);
      /* Auto-fill account holder name if the CBS returned one and the user
         hasn't typed anything yet — makes the form feel truly live. */
      if (result.verified && result.accountHolderName && !form.accountHolderName) {
        setForm((prev) => ({ ...prev, accountHolderName: result.accountHolderName! }));
      }
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bankName, form.bankBranch, form.bankAccountNo]);

  const handleVerifyBank = useCallback(async () => {
    const validation = validateBankDetails(form.bankName, form.bankBranch, form.bankAccountNo);
    if (!validation.valid) {
      const fe: BankFieldErrors = {};
      validation.errors.forEach((e) => {
        if (e.toLowerCase().includes("bank name")) fe.bankName = e;
        else if (e.toLowerCase().includes("branch")) fe.bankBranch = e;
        else if (e.toLowerCase().includes("account")) fe.bankAccountNo = e;
      });
      setBankFieldErrors(fe);
      setCbsStatus("failed");
      setCbsMessage(validation.errors.join("; "));
      return false;
    }
    setBankFieldErrors({});
    setCbsStatus("verifying");
    const result: CbsVerificationResult = await verifyCbs(
      form.bankName,
      form.bankBranch,
      form.bankAccountNo,
      form.accountHolderName || `${form.firstName} ${form.lastName}`
    );
    setCbsStatus(result.verified ? "verified" : "failed");
    setCbsMessage(result.message);
    return result.verified;
  }, [form]);

  /* ── Step validation ─────────────────────────────────────────────────── */
  const validatePersonal = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.cid.trim()) errs.cid = "CID is required";
    else if (!/^\d{11}$/.test(form.cid.trim())) errs.cid = "CID must be 11 digits";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    if (!form.dzongkhag) errs.dzongkhag = "Dzongkhag is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const validateWork = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.workType) errs.workType = "Work type is required";
    if (!form.agency) errs.agency = "Agency is required";
    if (!form.projectContractId)
      errs.projectContractId = "Please pick the verified contract you will be working under";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const validateBank = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.bankName) errs.bankName = "Bank is required";
    if (!form.bankBranch) errs.bankBranch = "Branch is required";
    if (!form.bankAccountNo.trim()) errs.bankAccountNo = "Account number is required";
    if (!form.accountHolderName.trim()) errs.accountHolderName = "Account holder name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleNext = useCallback(async () => {
    if (step === "personal" && validatePersonal()) setStep("work");
    else if (step === "work" && validateWork()) setStep("bank");
    else if (step === "bank") {
      if (!validateBank()) return;
      const verified = await handleVerifyBank();
      if (verified) setStep("review");
    }
  }, [step, validatePersonal, validateWork, validateBank, handleVerifyBank]);

  const handleBack = useCallback(() => {
    if (step === "work") setStep("personal");
    else if (step === "bank") setStep("work");
    else if (step === "review") setStep("bank");
  }, [step]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    /* Simulate API call */
    await new Promise((r) => setTimeout(r, 1200));
    const id = `MR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    /* Push the record into the shared MusterRollBeneficiaryContext so the
       contractor persona gets a live notification and can approve → MoF. */
    addBeneficiary({
      id,
      firstName: form.firstName,
      middleName: form.middleName || undefined,
      lastName: form.lastName,
      cid: form.cid,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      phone: form.phone,
      email: form.email || undefined,
      dzongkhag: form.dzongkhag,
      dzongkhagCode: form.dzongkhagCode,
      dungkhag: form.dungkhag || undefined,
      dungkhagCode: form.dungkhagCode || undefined,
      gewog: form.gewog || undefined,
      gewogCode: form.gewogCode || undefined,
      village: form.village || undefined,
      workType: form.workType,
      agency: form.agency,
      department: form.department || undefined,
      projectContractId: form.projectContractId || undefined,
      projectName: form.projectName,
      contractorId: form.contractorId || undefined,
      contractorName: form.contractorName || undefined,
      bankName: form.bankName,
      bankBranch: form.bankBranch,
      bankAccountNo: form.bankAccountNo,
      accountHolderName: form.accountHolderName,
      cbsVerified: cbsStatus === "verified",
      stage: "submitted-to-contractor",
      submittedAt: new Date().toISOString(),
      remarks: user?.name ? `Self-registered by ${user.name}` : undefined,
    });
    setRegistrationId(id);
    setStep("success");
    setSubmitting(false);
  }, [form, cbsStatus, addBeneficiary, user]);

  /* ── Step progress ───────────────────────────────────────────────────── */
  const steps: { id: Step; label: string; num: number }[] = [
    { id: "personal", label: "Personal Info", num: 1 },
    { id: "work", label: "Work Details", num: 2 },
    { id: "bank", label: "Bank Details", num: 3 },
    { id: "review", label: "Review & Submit", num: 4 },
  ];

  const currentStepIdx = steps.findIndex((s) => s.id === step);

  /* ── Agency list from master data ────────────────────────────────────── */
  const agencyList = useMemo(
    () => AGENCIES.map((a) => a.name).sort(),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-700">
            Muster Roll Beneficiary Registration
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Create Your Muster Roll Account
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Register as a muster roll beneficiary to receive wages for daily wage,
            seasonal, or project-based work under government agencies.
          </p>
        </div>

        {/* ── Step Progress Bar ─────────────────────────────────────────── */}
        {step !== "success" && (
          <div className="flex items-center justify-center gap-0">
            {steps.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                      i < currentStepIdx
                        ? "bg-green-500 text-white"
                        : i === currentStepIdx
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {i < currentStepIdx ? "✓" : s.num}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      i <= currentStepIdx ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 mx-2 rounded ${
                      i < currentStepIdx ? "bg-green-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Form Card ────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          {/* ── Step 1: Personal Information ────────────────────────────── */}
          {step === "personal" && (
            <div className="p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              <p className="text-xs text-slate-500">Fields marked with * are required</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="First Name *" error={errors.firstName}>
                  <input type="text" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)}
                    className={inputCls(errors.firstName)} placeholder="Tenzin" />
                </FormField>
                <FormField label="Middle Name" error={errors.middleName}>
                  <input type="text" value={form.middleName} onChange={(e) => updateField("middleName", e.target.value)}
                    className={inputCls()} placeholder="Optional" />
                </FormField>
                <FormField label="Last Name *" error={errors.lastName}>
                  <input type="text" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)}
                    className={inputCls(errors.lastName)} placeholder="Dorji" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="CID (Citizenship ID) *" error={errors.cid}>
                  <input type="text" value={form.cid} onChange={(e) => updateField("cid", e.target.value)}
                    className={inputCls(errors.cid)} placeholder="11234567890" maxLength={11} />
                </FormField>
                <FormField label="Gender *" error={errors.gender}>
                  <select value={form.gender} onChange={(e) => updateField("gender", e.target.value as any)}
                    className={inputCls(errors.gender)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </FormField>
                <FormField label="Date of Birth *" error={errors.dateOfBirth}>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    className={inputCls(errors.dateOfBirth)} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Phone Number *" error={errors.phone}>
                  <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)}
                    className={inputCls(errors.phone)} placeholder="+975 17XXXXXX" />
                </FormField>
                <FormField label="Email (optional)" error={errors.email}>
                  <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)}
                    className={inputCls()} placeholder="name@example.com" />
                </FormField>
              </div>

              {/* Location cascade — Dzongkhag → Dungkhag → Gewog, sourced
                  dynamically from UCoA's Bhutan hierarchy. Village stays a
                  free-text input because UCoA does not maintain village-
                  level codes. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="Dzongkhag *" error={errors.dzongkhag}>
                  <select
                    value={form.dzongkhagCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const d = dzongkhagOptions.find((x) => x.code === code);
                      setForm((prev) => ({
                        ...prev,
                        dzongkhagCode: code,
                        dzongkhag: d?.name ?? "",
                        dungkhag: "",
                        dungkhagCode: "",
                        gewog: "",
                        gewogCode: "",
                      }));
                      setErrors((prev) => { const n = { ...prev }; delete n.dzongkhag; return n; });
                    }}
                    className={inputCls(errors.dzongkhag)}
                  >
                    <option value="">Select Dzongkhag</option>
                    {dzongkhagOptions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} · {d.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Drungkhag (Dungkhag)">
                  <select
                    value={form.dungkhagCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const d = dungkhagOptions.find((x) => x.code === code);
                      setForm((prev) => ({
                        ...prev,
                        dungkhagCode: code,
                        dungkhag: d?.name ?? "",
                        gewog: "",
                        gewogCode: "",
                      }));
                    }}
                    className={inputCls()}
                    disabled={!form.dzongkhagCode || dungkhagOptions.length === 0}
                  >
                    <option value="">
                      {dungkhagOptions.length === 0 ? "No Drungkhag (direct)" : "Select Drungkhag"}
                    </option>
                    {dungkhagOptions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} · {d.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Gewog">
                  <select
                    value={form.gewogCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const g = gewogOptions.find((x) => x.code === code);
                      setForm((prev) => ({
                        ...prev,
                        gewogCode: code,
                        gewog: g?.name ?? "",
                      }));
                    }}
                    className={inputCls()}
                    disabled={!form.dzongkhagCode || gewogOptions.length === 0}
                  >
                    <option value="">Select Gewog</option>
                    {gewogOptions.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.code} · {g.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Village">
                  <input type="text" value={form.village} onChange={(e) => updateField("village", e.target.value)}
                    className={inputCls()} placeholder="Village name" />
                </FormField>
              </div>
              {form.dzongkhagCode && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <strong>UCoA Location Code:</strong>{" "}
                  <span className="font-mono">
                    {form.dzongkhagCode}
                    {form.dungkhagCode ? `·${form.dungkhagCode}` : ""}
                    {form.gewogCode ? `·${form.gewogCode}` : ""}
                  </span>{" "}
                  — {form.dzongkhag}
                  {form.dungkhag ? ` / ${form.dungkhag}` : ""}
                  {form.gewog ? ` / ${form.gewog}` : ""}
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Work Details ───────────────────────────────────── */}
          {step === "work" && (
            <div className="p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Work Details</h2>
              <p className="text-xs text-slate-500">Specify the type of work and the agency you will be working under.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Work Type *" error={errors.workType}>
                  <select value={form.workType} onChange={(e) => updateField("workType", e.target.value as any)}
                    className={inputCls(errors.workType)}>
                    <option value="">Select Work Type</option>
                    {WORK_TYPES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </FormField>
                <FormField
                  label="Project / Contract *"
                  error={errors.projectContractId}
                >
                  {/* Project dropdown is now populated LIVE from verified
                      contracts in ContractDataContext, filtered by the
                      agency the beneficiary just picked. Selecting a
                      project also auto-binds the contractor (so the
                      contractor persona can later approve the beneficiary
                      against that contract). */}
                  <select
                    value={form.projectContractId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const c = agencyProjectOptions.find((x) => x.id === id);
                      setForm((prev) => ({
                        ...prev,
                        projectContractId: id,
                        projectName: c?.contractTitle ?? "",
                        contractorId: c?.contractorId ?? "",
                        contractorName: c?.contractorName ?? "",
                      }));
                      setErrors((p) => { const n = { ...p }; delete n.projectContractId; return n; });
                    }}
                    className={inputCls(errors.projectContractId)}
                    disabled={!form.agency}
                  >
                    <option value="">
                      {!form.agency
                        ? "Select agency first"
                        : agencyProjectOptions.length === 0
                          ? "No verified contracts yet"
                          : `Select from ${agencyProjectOptions.length} verified contracts`}
                    </option>
                    {agencyProjectOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contractId} · {c.contractTitle} ({c.contractorName})
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              {form.projectContractId && form.contractorName && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200/60 p-3">
                  <p className="text-xs text-emerald-800">
                    <strong>Linked contractor:</strong> {form.contractorName}.
                    Your registration will be sent to this contractor for
                    verification before reaching MoF.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Agency *" error={errors.agency}>
                  <select value={form.agency}
                    onChange={(e) => { updateField("agency", e.target.value); updateField("department", ""); }}
                    className={inputCls(errors.agency)}>
                    <option value="">Select Agency</option>
                    {agencyList.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </FormField>
                <FormField label="Department">
                  <select value={form.department} onChange={(e) => updateField("department", e.target.value)}
                    className={inputCls()} disabled={!form.agency}>
                    <option value="">Select Department</option>
                    {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </FormField>
              </div>

              {form.agency && (
                <div className="rounded-lg bg-blue-50/80 border border-blue-200/50 p-3">
                  <p className="text-xs text-blue-700">
                    You are registering under <strong>{form.agency}</strong>
                    {form.department && <> — <strong>{form.department}</strong></>}.
                    Your registration will be reviewed by the agency's payroll officer.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Bank Details ───────────────────────────────────── */}
          {step === "bank" && (
            <div className="p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Bank Account Details</h2>
              <p className="text-xs text-slate-500">
                Your muster roll wages will be deposited into this bank account.
                All bank details are validated against Bhutan's banking hierarchy.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Bank Name *" error={bankFieldErrors.bankName || errors.bankName}>
                  <select value={form.bankName}
                    onChange={(e) => handleBankChange(e.target.value)}
                    className={inputCls(bankFieldErrors.bankName || errors.bankName)}>
                    <option value="">Select Bank</option>
                    {bankNames.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </FormField>
                <FormField label="Branch *" error={bankFieldErrors.bankBranch || errors.bankBranch}>
                  <select value={form.bankBranch}
                    onChange={(e) => { updateField("bankBranch", e.target.value); setCbsStatus("idle"); }}
                    className={inputCls(bankFieldErrors.bankBranch || errors.bankBranch)}
                    disabled={!form.bankName}>
                    <option value="">Select Branch</option>
                    {branchOptions.map((br) => (
                      <option key={br.value} value={br.value}>
                        {br.label} — {br.bfsc}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Account Number *" error={bankFieldErrors.bankAccountNo || errors.bankAccountNo}>
                  <input type="text" value={form.bankAccountNo}
                    onChange={(e) => { updateField("bankAccountNo", e.target.value); setCbsStatus("idle"); }}
                    className={inputCls(bankFieldErrors.bankAccountNo || errors.bankAccountNo)}
                    placeholder="9-16 digits" maxLength={16} />
                </FormField>
                <FormField label="Account Holder Name *" error={errors.accountHolderName}>
                  <input type="text" value={form.accountHolderName}
                    onChange={(e) => updateField("accountHolderName", e.target.value)}
                    className={inputCls(errors.accountHolderName)}
                    placeholder="Name as it appears on the account" />
                </FormField>
              </div>

              {/* CBS Verification Status — auto-triggers 700ms after the
                  account number reaches a plausible length, no click
                  required. Manual button remains as a re-try. */}
              {cbsStatus !== "idle" && (
                <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
                  cbsStatus === "verifying" ? "bg-blue-50 border border-blue-200 text-blue-700" :
                  cbsStatus === "verified" ? "bg-green-50 border border-green-200 text-green-700" :
                  "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    cbsStatus === "verifying" ? "bg-blue-100 text-blue-700" :
                    cbsStatus === "verified" ? "bg-emerald-100 text-emerald-700" :
                    "bg-rose-100 text-rose-700"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                      cbsStatus === "verifying" ? "bg-blue-500" :
                      cbsStatus === "verified" ? "bg-emerald-500" :
                      "bg-rose-500"
                    }`} />
                    Live CBS · Auto
                  </span>
                  <span className="flex-1">
                    {cbsStatus === "verifying" && "Verifying account with Core Banking System…"}
                    {cbsStatus === "verified" && `Bank account verified. ${cbsMessage}`}
                    {cbsStatus === "failed" && `Verification failed: ${cbsMessage}`}
                  </span>
                </div>
              )}

              <button onClick={handleVerifyBank}
                disabled={cbsStatus === "verifying" || !form.bankName || !form.bankBranch || !form.bankAccountNo}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  cbsStatus === "verified"
                    ? "bg-green-600 text-white cursor-default"
                    : cbsStatus === "verifying"
                    ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700 text-white"
                }`}>
                {cbsStatus === "verifying" ? "Verifying..." : cbsStatus === "verified" ? "Verified" : "Verify Bank Account"}
              </button>
            </div>
          )}

          {/* ── Step 4: Review & Submit ────────────────────────────────── */}
          {step === "review" && (
            <div className="p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Review Your Registration</h2>
              <p className="text-xs text-slate-500">Please review all details before submitting.</p>

              <div className="space-y-4">
                <ReviewSection title="Personal Information">
                  <ReviewRow label="Full Name" value={`${form.firstName}${form.middleName ? " " + form.middleName : ""} ${form.lastName}`} />
                  <ReviewRow label="CID" value={form.cid} />
                  <ReviewRow label="Gender" value={form.gender === "male" ? "Male" : "Female"} />
                  <ReviewRow label="Date of Birth" value={form.dateOfBirth} />
                  <ReviewRow label="Phone" value={form.phone} />
                  {form.email && <ReviewRow label="Email" value={form.email} />}
                  <ReviewRow label="Dzongkhag" value={form.dzongkhag} />
                  {form.gewog && <ReviewRow label="Gewog" value={form.gewog} />}
                  {form.village && <ReviewRow label="Village" value={form.village} />}
                </ReviewSection>

                <ReviewSection title="Work Details">
                  <ReviewRow label="Work Type" value={WORK_TYPES.find((w) => w.value === form.workType)?.label || form.workType} />
                  <ReviewRow label="Agency" value={form.agency} />
                  {form.department && <ReviewRow label="Department" value={form.department} />}
                  {form.projectName && <ReviewRow label="Project" value={form.projectName} />}
                </ReviewSection>

                <ReviewSection title="Bank Details">
                  <ReviewRow label="Bank" value={form.bankName} />
                  <ReviewRow label="Branch" value={form.bankBranch} />
                  <ReviewRow label="Account No" value={form.bankAccountNo} />
                  <ReviewRow label="Account Holder" value={form.accountHolderName} />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      CBS Verified
                    </span>
                  </div>
                </ReviewSection>
              </div>

              {/* Declaration checkbox */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs text-amber-800">
                  By submitting this registration, I confirm that all information provided is
                  true and accurate. I understand that false information may result in rejection
                  of my registration and potential legal consequences under the laws of Bhutan.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 5: Success ────────────────────────────────────────── */}
          {step === "success" && (
            <div className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 text-3xl">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Registration Submitted!</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Your registration has been submitted successfully. It has been
                sent <strong>live</strong> to {form.contractorName || "the contractor"}
                {" "}for verification. Once approved, it will be forwarded
                automatically to the MoF Program Officer for final clearance.
              </p>
              <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Approval pipeline</p>
                <ol className="mt-1.5 space-y-1 text-xs text-slate-700">
                  <li>✓ Submitted to {form.contractorName || "Contractor"}</li>
                  <li className="text-slate-400">→ Contractor verifies &amp; forwards</li>
                  <li className="text-slate-400">→ MoF Program Officer clears</li>
                </ol>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 inline-block">
                <p className="text-xs text-blue-600 font-medium">Your Registration ID</p>
                <p className="text-lg font-bold text-blue-800 font-mono">{registrationId}</p>
              </div>
              <p className="text-xs text-slate-400">
                Please save this registration ID for tracking your application status.
              </p>
              <button
                onClick={() => { setForm(INITIAL_FORM); setStep("personal"); setRegistrationId(null); setCbsStatus("idle"); setErrors({}); }}
                className="mt-4 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                Register Another Beneficiary
              </button>
            </div>
          )}

          {/* ── Navigation Footer ──────────────────────────────────────── */}
          {step !== "success" && (
            <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 flex justify-between items-center">
              <button
                onClick={handleBack}
                disabled={step === "personal"}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <div className="text-xs text-slate-400">
                Step {currentStepIdx + 1} of {steps.length}
              </div>
              {step === "review" ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition ${
                    submitting
                      ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {submitting ? "Submitting..." : "Submit Registration"}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SRS Footer ───────────────────────────────────────────────── */}
        <div className="text-center text-xs text-slate-400 pt-4">
          <p>SRS: Payroll SRS v1.1, PRN 6.1 — Muster Roll Creation | Public Self-Registration</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════════════════════════════ */

function inputCls(error?: string): string {
  return `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
    error
      ? "border-red-300 focus:ring-red-500 bg-red-50/30"
      : "border-slate-300 focus:ring-blue-500 focus:border-transparent"
  }`;
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
