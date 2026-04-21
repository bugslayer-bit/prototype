/* ═══════════════════════════════════════════════════════════════════════════
   Muster Roll Creation Page — Payroll Module (PRN 6.1)
   Bhutan Integrated Financial Management Information System (IFMIS)
   Payroll SRS v1.1 — Muster Roll & Wage Beneficiary Management
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState, useCallback } from "react";
import { useAuth } from "../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../shared/data/agencyPersonas";
import { bhutanBankHierarchy } from "../../../shared/data/bankData";
import {
  getValidBankNames,
  getBranchOptionsForBank,
  validateBankDetails,
  verifyCbs,
  type BankFieldErrors,
} from "../../../shared/utils/bankValidation";
import { usePayrollRoleCapabilities, payrollToneClasses } from "../state/usePayrollRoleCapabilities";
import type { MusterRollProject, MusterRollBeneficiary } from "../types";
import {
  MUSTERROLL_PROJECTS,
  MUSTERROLL_BENEFICIARIES,
} from "../state/payrollSeed";

/** Dynamic bank names from bankData master — validated against hierarchy */
const BANK_NAMES = getValidBankNames();
/** Gender LoV — matches MasterDataContext GENDER_VALUES */
const GENDER_OPTIONS: Array<"Male" | "Female" | "Other"> = ["Male", "Female", "Other"];

/* ───────────────────────────────────────────────────────────────────────────
   3-Step Wizard Component
   ─────────────────────────────────────────────────────────────────────────── */

type StepType = "project-select" | "beneficiary-onboard" | "review-finalize";

interface AddBeneficiaryForm {
  name: string;
  cid: string;
  workPermit?: string;
  gender: "Male" | "Female" | "Other";
  dateOfBirth: string;
  contactNo: string;
  beneficiaryType: "skilled" | "semi-skilled";
  dailyWage: number;
  bankName: string;
  bankAccountNo: string;
  bankBranch: string;
}

const EMPTY_BENEFICIARY_FORM: AddBeneficiaryForm = {
  name: "",
  cid: "",
  workPermit: "",
  gender: "Male",
  dateOfBirth: "",
  contactNo: "",
  beneficiaryType: "semi-skilled",
  dailyWage: 400,
  bankName: "",
  bankAccountNo: "",
  bankBranch: "",
};

export function MusterRollCreationPage() {
  const { activeAgencyCode } = useAuth();
  const context = resolveAgencyContext(useAuth().activeRoleId);
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);
  const [currentStep, setCurrentStep] = useState<StepType>("project-select");
  const [selectedProject, setSelectedProject] = useState<MusterRollProject | null>(
    null
  );
  const [beneficiaries, setBeneficiaries] = useState<MusterRollBeneficiary[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddBeneficiaryForm>(
    EMPTY_BENEFICIARY_FORM
  );
  const [searchQuery, setSearchQuery] = useState("");

  /* ── Bank validation state ─────────────────────────────────────────── */
  const [bankFieldErrors, setBankFieldErrors] = useState<BankFieldErrors>({});
  const [cbsStatus, setCbsStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [cbsMessage, setCbsMessage] = useState("");

  /** Dynamic branch options based on selected bank */
  const branchOptions = useMemo(
    () => (formData.bankName ? getBranchOptionsForBank(formData.bankName) : []),
    [formData.bankName]
  );

  /** When bank changes, reset branch + run validation */
  const handleBankChange = useCallback((bankName: string) => {
    setFormData((prev) => ({ ...prev, bankName, bankBranch: "" }));
    setBankFieldErrors({});
    setCbsStatus("idle");
    setCbsMessage("");
  }, []);

  /** When branch changes */
  const handleBranchChange = useCallback((branchName: string) => {
    setFormData((prev) => ({ ...prev, bankBranch: branchName }));
    setCbsStatus("idle");
    setCbsMessage("");
  }, []);

  /** Validate bank details + CBS verification */
  const handleVerifyBank = useCallback(async () => {
    const result = validateBankDetails(
      formData.bankName,
      formData.bankBranch,
      formData.bankAccountNo
    );
    if (!result.valid) {
      const fe: BankFieldErrors = {};
      result.errors.forEach((e) => {
        if (e.toLowerCase().includes("bank name") || e.toLowerCase().includes("recognised")) fe.bankName = e;
        else if (e.toLowerCase().includes("branch")) fe.bankBranch = e;
        else if (e.toLowerCase().includes("account")) fe.bankAccountNo = e;
      });
      setBankFieldErrors(fe);
      setCbsStatus("failed");
      setCbsMessage(result.errors.join("; "));
      return false;
    }
    setBankFieldErrors({});
    setCbsStatus("verifying");
    setCbsMessage("Contacting Core Banking System…");
    const cbs = await verifyCbs(formData.bankName, formData.bankBranch, formData.bankAccountNo, formData.name);
    if (cbs.verified) {
      setCbsStatus("verified");
      setCbsMessage(cbs.message);
      return true;
    }
    setCbsStatus("failed");
    setCbsMessage(cbs.message);
    return false;
  }, [formData.bankName, formData.bankBranch, formData.bankAccountNo, formData.name]);

  /* Filter projects by agency */
  const filteredProjects = useMemo(() => {
    let projects = MUSTERROLL_PROJECTS;

    if (!caps.canProcessMuster) {
      projects = projects.filter(
        (p) => p.agencyCode === activeAgencyCode
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.programName.toLowerCase().includes(q) ||
          p.shortName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return projects;
  }, [activeAgencyCode, caps.canProcessMuster, searchQuery]);

  /* Get beneficiaries for selected project */
  const projectBeneficiaries = useMemo(() => {
    if (!selectedProject) return [];
    const baseBeneficiaries = MUSTERROLL_BENEFICIARIES.filter(
      (b) => b.projectId === selectedProject.id
    );
    return [...baseBeneficiaries, ...beneficiaries];
  }, [selectedProject, beneficiaries]);

  /* Summary stats for beneficiaries */
  const beneficiarySummary = useMemo(() => {
    const skilled = projectBeneficiaries.filter(
      (b) => b.beneficiaryType === "skilled"
    ).length;
    const semiSkilled = projectBeneficiaries.filter(
      (b) => b.beneficiaryType === "semi-skilled"
    ).length;
    const avgWage =
      projectBeneficiaries.length > 0
        ? Math.round(
            projectBeneficiaries.reduce((sum, b) => sum + b.dailyWage, 0) /
              projectBeneficiaries.length
          )
        : 0;
    const totalCount = projectBeneficiaries.length;
    const workingDaysPerMonth = 22;
    const monthlyCostEstimate = totalCount * avgWage * workingDaysPerMonth;

    return {
      skilled,
      semiSkilled,
      totalCount,
      avgWage,
      monthlyCostEstimate,
    };
  }, [projectBeneficiaries]);

  /* Handle add beneficiary — validates bank details against hierarchy */
  const handleAddBeneficiary = async () => {
    if (!formData.name || !formData.cid || !formData.bankAccountNo) {
      alert("Please fill in all required fields (Name, CID, Bank Account)");
      return;
    }

    /* Bank validation gate — must pass before saving */
    const bankResult = validateBankDetails(
      formData.bankName,
      formData.bankBranch,
      formData.bankAccountNo
    );
    if (!bankResult.valid) {
      const fe: BankFieldErrors = {};
      bankResult.errors.forEach((e) => {
        if (e.toLowerCase().includes("bank name") || e.toLowerCase().includes("recognised")) fe.bankName = e;
        else if (e.toLowerCase().includes("branch")) fe.bankBranch = e;
        else if (e.toLowerCase().includes("account")) fe.bankAccountNo = e;
      });
      setBankFieldErrors(fe);
      alert("Bank details validation failed:\n" + bankResult.errors.join("\n"));
      return;
    }

    /* CBS verification if not already verified */
    if (cbsStatus !== "verified") {
      const cbsOk = await handleVerifyBank();
      if (!cbsOk) {
        alert("CBS bank verification failed. Please check bank details and try again.");
        return;
      }
    }

    const newBeneficiary: MusterRollBeneficiary = {
      id: `MRB-NEW-${Date.now()}`,
      projectId: selectedProject?.id || "",
      ...formData,
      status: "active",
    };

    setBeneficiaries([...beneficiaries, newBeneficiary]);
    setFormData(EMPTY_BENEFICIARY_FORM);
    setBankFieldErrors({});
    setCbsStatus("idle");
    setCbsMessage("");
    setShowAddForm(false);
  };

  /* Handle step navigation */
  const handleNext = () => {
    if (currentStep === "project-select" && !selectedProject) {
      alert("Please select a project to continue");
      return;
    }

    if (
      currentStep === "beneficiary-onboard" &&
      projectBeneficiaries.length === 0
    ) {
      alert("Please add at least one beneficiary");
      return;
    }

    if (currentStep === "project-select") {
      setCurrentStep("beneficiary-onboard");
    } else if (currentStep === "beneficiary-onboard") {
      setCurrentStep("review-finalize");
    }
  };

  const handleBack = () => {
    if (currentStep === "beneficiary-onboard") {
      setCurrentStep("project-select");
    } else if (currentStep === "review-finalize") {
      setCurrentStep("beneficiary-onboard");
    }
  };

  const handleSaveAndClose = () => {
    alert(
      "Muster Roll saved successfully. (In production, this would persist data)"
    );
    setCurrentStep("project-select");
    setSelectedProject(null);
    setBeneficiaries([]);
    setFormData(EMPTY_BENEFICIARY_FORM);
  };

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold text-slate-900 m-0">
            Muster Roll Creation
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
            PRN 6.1
          </span>
        </div>
        <p className="text-sm text-slate-500 m-0">
          Manage wage beneficiaries and muster roll projects for{" "}
          {context?.agency.name || activeAgencyCode}
        </p>
      </div>

      {/* ── Persona Banner ── */}
      <div className={`rounded-xl border ${tone.border} ${tone.bg} p-4 mb-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
              <span className={`text-sm font-bold ${tone.text}`}>{caps.activeRoleName}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{caps.personaTagline}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {caps.capabilityList.slice(0, 3).map((c) => (
              <span key={c} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.pill}`}>{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-4 mb-8 items-center">
        {(
          [
            { id: "project-select", label: "Project Master Config", num: 1 },
            { id: "beneficiary-onboard", label: "Onboard Beneficiaries", num: 2 },
            { id: "review-finalize", label: "Data Update / Review", num: 3 },
          ] as const
        ).map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                  currentStep === step.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {step.num}
              </div>
              <span
                className={`text-sm font-medium ${
                  currentStep === step.id
                    ? "text-blue-600"
                    : "text-slate-600"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < 2 && (
              <div
                className={`flex-1 h-0.5 ${
                  currentStep === step.id ||
                  (currentStep === "review-finalize" && idx < 2)
                    ? "bg-blue-600"
                    : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Project Master Config */}
      {currentStep === "project-select" && (
        <div className="mb-8">
          {/* Search Bar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by program name, short name, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-sm font-medium">
                Filter
              </button>
            </div>
          </div>

          {/* Projects Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              label="Total Projects"
              value={filteredProjects.length}
              color="blue"
            />
            <SummaryCard
              label="Active Projects"
              value={filteredProjects.filter((p) => p.status === "active").length}
              color="green"
            />
            <SummaryCard
              label="Total Disbursed"
              value={`Nu. ${filteredProjects.reduce((sum, p) => sum + p.totalDisbursed, 0).toLocaleString()}`}
              color="purple"
            />
          </div>

          {/* Projects Cards / Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">
                      Program Name
                    </th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">
                      Short Name
                    </th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-bold text-slate-900">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">
                      Beneficiaries
                    </th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-right font-bold text-slate-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="border-t border-slate-200/50">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        <p className="m-0">
                          No projects found matching your criteria.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project, idx) => (
                      <tr
                        key={project.id}
                        className={`border-b border-slate-200/50 transition ${
                          idx % 2 === 0
                            ? "bg-white even:bg-slate-50/50"
                            : "bg-slate-50/50 even:bg-white"
                        } hover:bg-blue-50/50`}
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {project.programName}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {project.shortName}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {project.startDate} to {project.endDate}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-900">
                          {project.beneficiaryCount}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-500">
                          {project.paymentFrequency}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setBeneficiaries([]);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                              selectedProject?.id === project.id
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                            }`}
                          >
                            {selectedProject?.id === project.id
                              ? "Selected"
                              : "Select"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="border-t border-slate-200/80 bg-slate-50/50 px-6 py-3 text-xs text-slate-500">
              Showing {filteredProjects.length} of {MUSTERROLL_PROJECTS.length}{" "}
              projects
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Onboard Beneficiaries */}
      {currentStep === "beneficiary-onboard" && selectedProject && (
        <div className="mb-8">
          {/* Project Info Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-blue-50 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Selected Project
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 m-0">Program Name</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.programName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Budget Code</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.budgetCode}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Duration</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.startDate} to {selectedProject.endDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Payment Frequency</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.paymentFrequency}
                </p>
              </div>
            </div>
          </div>

          {/* Beneficiary Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              label="Total Beneficiaries"
              value={beneficiarySummary.totalCount}
              color="blue"
            />
            <SummaryCard
              label="Skilled"
              value={beneficiarySummary.skilled}
              color="green"
            />
            <SummaryCard
              label="Semi-Skilled"
              value={beneficiarySummary.semiSkilled}
              color="purple"
            />
            <SummaryCard
              label="Avg. Daily Wage"
              value={`Nu. ${beneficiarySummary.avgWage}`}
              color="blue"
            />
          </div>

          {/* Monthly Cost Estimate */}
          <div className="rounded-2xl border-2 border-blue-600 bg-blue-50 p-5 mb-6">
            <p className="text-xs text-blue-900 m-0">
              Estimated Monthly Cost (22 working days)
            </p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              Nu. {beneficiarySummary.monthlyCostEstimate.toLocaleString()}
            </p>
          </div>

          {/* Add Beneficiary Form */}
          {!showAddForm ? (
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm"
              >
                + Add Beneficiary
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-5">
                Add New Beneficiary
              </h3>

              <div className="grid grid-cols-2 gap-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* CID */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    CID *
                  </label>
                  <input
                    type="text"
                    value={formData.cid}
                    onChange={(e) =>
                      setFormData({ ...formData, cid: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Work Permit */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Work Permit
                  </label>
                  <input
                    type="text"
                    value={formData.workPermit}
                    onChange={(e) =>
                      setFormData({ ...formData, workPermit: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gender: e.target.value as "Male" | "Female" | "Other",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dateOfBirth: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Contact No */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Contact No
                  </label>
                  <input
                    type="text"
                    value={formData.contactNo}
                    onChange={(e) =>
                      setFormData({ ...formData, contactNo: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Beneficiary Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Beneficiary Type
                  </label>
                  <select
                    value={formData.beneficiaryType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        beneficiaryType: e.target.value as
                          | "skilled"
                          | "semi-skilled",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="skilled">Skilled</option>
                    <option value="semi-skilled">Semi-Skilled</option>
                  </select>
                </div>

                {/* Daily Wage */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Daily Wage (Nu.)
                  </label>
                  <input
                    type="number"
                    value={formData.dailyWage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyWage: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Bank Name — validated dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Bank Name *
                  </label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => handleBankChange(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      bankFieldErrors.bankName ? "border-red-400 bg-red-50" : "border-slate-300"
                    }`}
                  >
                    <option value="">— Select Bank —</option>
                    {BANK_NAMES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {bankFieldErrors.bankName && (
                    <p className="mt-1 text-xs text-red-600">{bankFieldErrors.bankName}</p>
                  )}
                </div>

                {/* Bank Branch — dynamic dropdown filtered by selected bank */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Bank Branch *
                  </label>
                  <select
                    value={formData.bankBranch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    disabled={!formData.bankName}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      bankFieldErrors.bankBranch ? "border-red-400 bg-red-50" : "border-slate-300"
                    } ${!formData.bankName ? "bg-slate-100 cursor-not-allowed" : ""}`}
                  >
                    <option value="">{formData.bankName ? "— Select Branch —" : "— Select bank first —"}</option>
                    {branchOptions.map((br) => (
                      <option key={br.bfsc} value={br.value}>{br.label}</option>
                    ))}
                  </select>
                  {bankFieldErrors.bankBranch && (
                    <p className="mt-1 text-xs text-red-600">{bankFieldErrors.bankBranch}</p>
                  )}
                  {formData.bankBranch && !bankFieldErrors.bankBranch && (
                    <p className="mt-1 text-xs text-emerald-600">
                      BFSC: {branchOptions.find((b) => b.value === formData.bankBranch)?.bfsc ?? "—"}
                    </p>
                  )}
                </div>

                {/* Bank Account No — validated */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Bank Account No *
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountNo}
                    onChange={(e) => {
                      setFormData({ ...formData, bankAccountNo: e.target.value });
                      setCbsStatus("idle");
                      setCbsMessage("");
                    }}
                    placeholder="9-16 digit account number"
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      bankFieldErrors.bankAccountNo ? "border-red-400 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {bankFieldErrors.bankAccountNo && (
                    <p className="mt-1 text-xs text-red-600">{bankFieldErrors.bankAccountNo}</p>
                  )}
                </div>

                {/* CBS Bank Verification */}
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={handleVerifyBank}
                    disabled={!formData.bankName || !formData.bankBranch || !formData.bankAccountNo || cbsStatus === "verifying"}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      cbsStatus === "verified"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : cbsStatus === "failed"
                        ? "bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
                        : cbsStatus === "verifying"
                        ? "bg-blue-100 text-blue-600 border border-blue-300 cursor-wait"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                    } ${(!formData.bankName || !formData.bankBranch || !formData.bankAccountNo) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {cbsStatus === "verifying" ? "Verifying with CBS…" : cbsStatus === "verified" ? "CBS Verified" : cbsStatus === "failed" ? "Retry CBS Verification" : "Verify with Bank (CBS)"}
                  </button>
                  {cbsMessage && (
                    <p className={`mt-1.5 text-xs ${cbsStatus === "verified" ? "text-emerald-600" : cbsStatus === "failed" ? "text-red-600" : "text-blue-600"}`}>
                      {cbsMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 mt-5 pt-5 border-t border-slate-200/50">
                <button
                  onClick={handleAddBeneficiary}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm"
                >
                  Save Beneficiary
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData(EMPTY_BENEFICIARY_FORM);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-slate-200 text-slate-900 font-semibold hover:bg-slate-300 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Beneficiaries Table */}
          {projectBeneficiaries.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        Name
                      </th>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        CID
                      </th>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        Type
                      </th>
                      <th className="px-5 py-3 text-right font-bold text-slate-900">
                        Daily Wage
                      </th>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        Bank
                      </th>
                      <th className="px-5 py-3 text-center font-bold text-slate-900">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="border-t border-slate-200/50">
                    {projectBeneficiaries.map((beneficiary, idx) => (
                      <tr
                        key={beneficiary.id}
                        className={`border-b border-slate-200/50 transition ${
                          idx % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50/50"
                        } hover:bg-blue-50/50`}
                      >
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {beneficiary.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600 font-mono text-xs">
                          {beneficiary.cid}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {beneficiary.beneficiaryType}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900">
                          Nu. {beneficiary.dailyWage.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-slate-600 text-xs">
                          {beneficiary.bankName}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={beneficiary.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200/80 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
                Total: {projectBeneficiaries.length} beneficiaries
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Data Update / Review */}
      {currentStep === "review-finalize" && selectedProject && (
        <div className="mb-8">
          {/* Project Summary */}
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Project Summary
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-xs text-slate-500 m-0">Program Name</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.programName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Short Name</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.shortName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Budget Code</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.budgetCode}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Duration</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.startDate} to {selectedProject.endDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Payment Frequency</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {selectedProject.paymentFrequency}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 m-0">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedProject.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Beneficiary Summary & Costs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              label="Total Beneficiaries"
              value={beneficiarySummary.totalCount}
              color="blue"
            />
            <SummaryCard
              label="Skilled Workers"
              value={beneficiarySummary.skilled}
              color="green"
            />
            <SummaryCard
              label="Semi-Skilled Workers"
              value={beneficiarySummary.semiSkilled}
              color="purple"
            />
          </div>

          {/* Monthly Cost Estimate */}
          <div className="rounded-2xl border-2 border-green-600 bg-green-50 p-5 mb-6">
            <p className="text-xs text-green-900 m-0">
              Estimated Monthly Cost (22 working days)
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              Nu. {beneficiarySummary.monthlyCostEstimate.toLocaleString()}
            </p>
            <p className="text-xs text-green-700 mt-2 m-0">
              Avg wage: Nu. {beneficiarySummary.avgWage}/day x {beneficiarySummary.totalCount} beneficiaries x 22 days
            </p>
          </div>

          {/* Full Beneficiary List */}
          {projectBeneficiaries.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur shadow-xl overflow-hidden mb-6">
              <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-200/80 text-sm font-semibold text-slate-900">
                Complete Beneficiary List ({projectBeneficiaries.length} beneficiaries)
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        Name
                      </th>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        CID
                      </th>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        Gender
                      </th>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        Type
                      </th>
                      <th className="px-5 py-3 text-right font-bold text-slate-900">
                        Daily Wage
                      </th>
                      <th className="px-5 py-3 text-right font-bold text-slate-900">
                        Monthly Est.
                      </th>
                      <th className="px-5 py-3 text-left font-bold text-slate-900">
                        Bank Account
                      </th>
                      <th className="px-5 py-3 text-center font-bold text-slate-900">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="border-t border-slate-200/50">
                    {projectBeneficiaries.map((beneficiary, idx) => (
                      <tr
                        key={beneficiary.id}
                        className={`border-b border-slate-200/50 transition ${
                          idx % 2 === 0
                            ? "bg-white"
                            : "bg-slate-50/50"
                        } hover:bg-blue-50/50`}
                      >
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {beneficiary.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600 font-mono text-xs">
                          {beneficiary.cid}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {beneficiary.gender}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {beneficiary.beneficiaryType}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900">
                          Nu. {beneficiary.dailyWage.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900">
                          Nu. {(beneficiary.dailyWage * 22).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-slate-600 text-xs">
                          {beneficiary.bankAccountNo}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={beneficiary.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200/80 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
                <strong>Total Monthly Disbursement:</strong> Nu.{" "}
                {projectBeneficiaries
                  .reduce((sum, b) => sum + b.dailyWage * 22, 0)
                  .toLocaleString()}
              </div>
            </div>
          )}

          {/* SRS Reference Footer */}
          <div className="border-t border-slate-200/50 pt-4 text-xs text-slate-500">
            <p className="m-0">
              SRS Reference: Payroll SRS v1.1, PRN 6.1 — Muster Roll & Wage
              Beneficiary Management
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 justify-end pt-6 border-t border-slate-200/50">
        {currentStep !== "project-select" && (
          <button
            onClick={handleBack}
            className="px-5 py-2.5 rounded-lg bg-slate-200 text-slate-900 font-semibold hover:bg-slate-300 transition text-sm"
          >
            Back
          </button>
        )}

        {currentStep !== "review-finalize" && (
          <button
            onClick={handleNext}
            disabled={!caps.canProcessMuster}
            className={`px-5 py-2.5 rounded-lg font-semibold transition text-sm ${
              caps.canProcessMuster
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        )}

        {currentStep === "review-finalize" && (
          <button
            onClick={handleSaveAndClose}
            disabled={!caps.canProcessMuster}
            className={`px-5 py-2.5 rounded-lg font-semibold transition text-sm ${
              caps.canProcessMuster
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Save & Close
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Helper Components
   ─────────────────────────────────────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "purple";
}) {
  const colorClasses: Record<string, Record<string, string>> = {
    blue: {
      container: "rounded-xl border border-blue-200 bg-blue-50 p-4",
      label: "text-blue-900",
      value: "text-blue-900",
    },
    green: {
      container: "rounded-xl border border-green-200 bg-green-50 p-4",
      label: "text-green-900",
      value: "text-green-900",
    },
    purple: {
      container: "rounded-xl border border-purple-200 bg-purple-50 p-4",
      label: "text-purple-900",
      value: "text-purple-900",
    },
  };

  const styles = colorClasses[color];

  return (
    <div className={styles.container}>
      <p
        className={`text-xs font-bold uppercase tracking-wider opacity-75 ${styles.label} m-0`}
      >
        {label}
      </p>
      <p className={`text-2xl font-bold mt-2 ${styles.value}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    inactive: "bg-slate-100 text-slate-600",
  };

  const colorClass = statusColorMap[status] || "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${colorClass}`}
    >
      {status}
    </span>
  );
}
