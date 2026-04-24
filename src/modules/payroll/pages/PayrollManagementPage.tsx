import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../shared/data/agencyPersonas";
import { usePayrollScope } from "../../../shared/utils/payrollScope";
import { ModuleActorBanner } from "../../../shared/components/ModuleActorBanner";
import { usePayrollRoleCapabilities } from "../state/usePayrollRoleCapabilities";
import { useMasterData } from "../../../shared/context/MasterDataContext";
import { EMPLOYEES, SALARY_ADVANCES } from "../state/payrollSeed";
import { categoriesFor, mergeLovWithDirectory } from "../state/payrollEmployeeCategories";

// Shared types
import {
  EmployeeCategory,
  PayrollRole,
  HRActionType,
  FormFieldConfig,
  EmployeeData,
  HRActionData,
  PayrollData,
  TabConfig,
} from "../shared/types";

// Shared components
import { FormSection, FormSectionProps } from "../shared/components/FormSection";
import { FormFieldProps } from "../shared/components/FormField";
import { CategoryHeaderTabs } from "../shared/components/CategoryHeaderTabs";
import { EmployeeSummaryTable } from "../shared/components/EmployeeSummaryTable";
import { PostedPayrollsPanel } from "../shared/components/PostedPayrollsPanel";
import { CivilServicePayrollProcessing } from "../civil-servant/processing/CivilServicePayrollProcessing";

// Analytics components
import { PayrollAnalyticsDashboard } from "../shared/analytics/PayrollAnalyticsDashboard";
import { GovTechScopeCard } from "../../../shared/components/GovTechScopeCard";
import { PayrollOverviewFilters, PayrollOverviewMode } from "../shared/analytics/PayrollOverviewFilters";
import { PayrollOverviewSection } from "../shared/analytics/PayrollOverviewSection";

// Navigation components
import { PayrollSubNav } from "../shared/navigation/PayrollSubNav";

// Civil servant source components
// ZestSourcePanel import removed — the ZESt Integration (RCSC) status
// card was dropped from the Civil Servant landing view per user request.
// (Connection/sync details still live on the Employee Registry page.)

// Dynamic hub pages mounted as tab content
import PayrollTravelClaimsHubPage from "./PayrollTravelClaimsHubPage";
import PayrollRemittancesHubPage from "./PayrollRemittancesHubPage";

// OPS source components
import { OpsSourceTabs, OpsSourceMode } from "../other-public-servant/source/OpsSourceTabs";
import { OpsInterfacePanel } from "../other-public-servant/source/OpsInterfacePanel";
import { OpsManualPanel } from "../other-public-servant/source/OpsManualPanel";
import { OpsBulkUploadPanel } from "../other-public-servant/source/OpsBulkUploadPanel";

// Sample data imports
import { CS_SAMPLE_EMPLOYEES } from "../shared/sampleData/csSampleEmployees";
import { OPS_SAMPLE_EMPLOYEES } from "../shared/sampleData/opsSampleEmployees";

// Civil servant field config imports
import { CS_EMPLOYEE_MASTER_FIELDS } from "../civil-servant/fields/employeeMasterFields";
import { CS_HR_ACTION_FIELDS, CS_ARREARS_FIELDS, CS_PAY_FIXATION_FIELDS, CS_REJOIN_FIELDS } from "../civil-servant/fields/hrActionFields";
import { CS_PAYROLL_PROCESSING_FIELDS } from "../civil-servant/fields/payrollProcessingFields";
import { CS_SALARY_ADVANCE_FIELDS, CS_FLOATING_DEDUCTIONS_FIELDS } from "../civil-servant/fields/advancesFields";

// OPS field config imports
import { OPS_EMPLOYEE_MASTER_FIELDS } from "../other-public-servant/fields/employeeMasterFields";
import { OPS_HR_ACTION_FIELDS } from "../other-public-servant/fields/hrActionFields";
import { OPS_PAYROLL_PROCESSING_FIELDS } from "../other-public-servant/fields/payrollProcessingFields";
import { OPS_SALARY_ADVANCE_FIELDS } from "../other-public-servant/fields/advancesFields";
import { OPS_TRAVEL_ADVANCE_LOCAL_FIELDS, OPS_TRAVEL_ADVANCE_FOREIGN_FIELDS } from "../other-public-servant/fields/travelFields";
import { OPS_MUSTERROLL_DETAILS_FIELDS, OPS_MUSTERROLL_PAYMENT_FIELDS } from "../other-public-servant/fields/musterRollFields";
import { OPS_SITTING_FEE_FIELDS, OPS_HONORARIUM_FIELDS } from "../other-public-servant/fields/sittingFeeFields";
import { OPS_RETIREMENT_BENEFITS_FIELDS } from "../other-public-servant/fields/retirementBenefitsFields";
import { OPS_FLOATING_DEDUCTIONS_FIELDS } from "../other-public-servant/fields/floatingDeductionsFields";

// LOV definition imports
import { CS_LOV_DEFINITIONS } from "../shared/lov/csLovDefinitions";
import { OPS_LOV_DEFINITIONS } from "../shared/lov/opsLovDefinitions";









// ============================================================================
// OTHER PUBLIC SERVANT FIELDS CONFIGURATION
// ============================================================================













// ============================================================================
// LIST OF VALUES (LoV) DEFINITIONS
// ============================================================================



const SHARED_LOV_DEFINITIONS: Record<string, string[]> = {
  genderValues: ["Male", "Female", "Others"],
  countryList: [
    "Bhutan",
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Cape Verde",
    "Central African Republic",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Congo",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "East Timor",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Grenada",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hong Kong",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Ivory Coast",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Macao",
    "Macedonia",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "North Korea",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and The Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Swaziland",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "The Democratic Republic Of The Congo",
    "Timor-Leste",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zambia",
    "Zimbabwe",
  ],
  designationList: [
    "Director",
    "Deputy Director",
    "Senior Officer",
    "Officer",
    "Assistant",
    "Specialist",
    "Administrator",
    "Coordinator",
    "Magistrate",
    "Judge",
    "Dzongrab",
    "Inspector",
    "Constable",
    "Member",
  ],
  agencyList: [
    "Ministry of Finance",
    "Ministry of Health & Human Services",
    "Ministry of Education & HR Development",
    "Department of Road Safety & Transport",
    "Ministry of Information & Communications",
    "Ministry of Labour & Human Resources",
    "Department of Gedu College of Teacher Education",
    "Royal University of Bhutan",
  ],
  opsAgencyList: [
    "Royal Bhutan Police",
    "Judiciary",
    "Local Government",
    "Parliament",
    "Constitutional Bodies",
    "Religious Services",
    "Foreign Services",
    "Royal University of Bhutan",
  ],
  orgSegmentList: [
    "Central Government",
    "Local Government",
    "Constitutional Bodies",
  ],
  opsOrgSegmentList: [
    "Central Government",
    "Local Government",
    "Constitutional Bodies",
    "Judiciary",
    "Parliament",
  ],
  bankNames: ["BoB", "BNB", "DPNB", "T-Bank", "DK", "BDBL"],
  bankBranches: [
    "Thimphu Main",
    "Paro Branch",
    "Punakha Branch",
    "Jakar Branch",
    "Gelephu Branch",
    "Samdrup Jongkhar Branch",
  ],
  yesNoValues: ["Yes", "No"],
  hrActionTypes: [
    "Increment",
    "Promotion",
    "Demotion",
    "Transfer",
    "Contract Extension",
    "Position Title Change",
    "Position Re-mapping",
    "Agency Bifurcation/Merger/Upgradation/Downgradation",
    "Secondment",
    "LTT",
    "STT/Leadership",
    "Leave",
    "HR Audit",
    "Legal",
    "Separation",
    "Arrears & Allowance",
    "Pay Fixation",
    "Re-join",
  ],
  promotionTypes: [
    "Vertical Promotion",
    "Horizontal Promotion",
    "Special Promotion",
  ],
  transferTypes: [
    "Regular Transfer",
    "Deputation",
    "Special Transfer",
    "Inter-agency Transfer",
  ],
  leaveTypes: [
    "Annual Leave",
    "Sick Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Compassionate Leave",
    "Study Leave",
    "Sabbatical Leave",
  ],
  separationTypes: [
    "Superannuation",
    "Voluntary Resignation",
    "Early Retirement Scheme",
    "Special Retirement Scheme",
    "Compulsory Retirement",
    "Termination",
    "Agency Severance",
    "Transfer",
    "Medical Termination",
    "End of Contract",
    "Dismissal",
    "Deceased",
  ],
  payFixationTypes: [
    "On Initial Appointment",
    "Promotion",
    "Transfer",
    "Reversion",
    "Reinstatement",
    "Regularization",
    "Pay Scale Revision",
    "Pay Correction",
    "Reemployment",
    "Demotion",
    "Broad Banding",
  ],
  deductionMethods: [
    "One Time Deduction",
    "Equal Monthly Installment",
    "Fixed Monthly Amount",
    "Percentage of Basic Pay",
    "Lump Sum Adjustment",
    "Recovery From Dues",
    "Recovery From Gratuity",
  ],
  floatingDeductionMethods: [
    "Statutory Monthly",
    "Other Floating Monthly",
    "Fortnightly Both",
  ],
  musterrollJobs: [
    "Unskilled",
    "Semi-skilled",
    "Skilled",
    "Craftspeople",
    "Master Craftspeople",
  ],
  musterrollAllowances: [
    "Overtime",
    "Night Duty",
    "Risk or Hardship",
    "Special Duty",
    "Uniform or Safety Gear",
    "Meal",
    "Travel",
  ],
  musterrollDeductions: [
    "Absenteeism",
    "Advance Recovery",
    "Tool or Equipment Damage",
    "Admin Fine or Penalty",
    "TDS",
  ],
  retirementTypes: [
    "Superannuation",
    "Compulsory Retirement",
    "Termination with Benefits",
    "Early Retirement",
    "Voluntary Resignation",
    "Disability-Medical",
  ],
  currencyList: ["BTN", "INR", "USD", "EUR", "GBP", "JPY", "CHF", "CNY", "AUD", "CAD"],
};

// ============================================================================
// SUB-COMPONENTS — Imported from shared modules
// ============================================================================


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PayrollManagementPage() {
  const auth = useAuth();
  const agencyContext = resolveAgencyContext(auth?.activeAgencyCode || "");
  const caps = usePayrollRoleCapabilities();
  const { masterDataMap } = useMasterData();

  /* Persona-level CS/OPS scope. Drives which category tabs, overviews and
     drill-downs are visible. Recomputes automatically when the acting persona
     is switched (AuthContext bumps roleSwitchEpoch). */
  const payrollScope = usePayrollScope();
  const allowedCategories = useMemo<EmployeeCategory[]>(
    () =>
      payrollScope === "all"
        ? ["civil-servant", "other-public-servant"]
        : [payrollScope],
    [payrollScope],
  );

  /*
   * State Management — null = landing analytics view (both categories shown)
   * For a single-scope persona (e.g. OPS-only) we default straight into that
   * category so the user never sees the opposite channel's landing copy.
   */
  /* ── URL-backed stream selection ──────────────────────────────────────
     The Payroll Management page lives at a single route, but we want the
     browser URL to reflect which stream is open so users can deep-link,
     share, and use Back/Forward.  We encode it as `?stream=civil-servant`
     or `?stream=ops`; absence of the param = the two-card landing. */
  const [searchParams, setSearchParams] = useSearchParams();
  const streamParam = searchParams.get("stream");
  const parseStream = (p: string | null): EmployeeCategory | null =>
    p === "civil-servant" || p === "cs"
      ? "civil-servant"
      : p === "ops" || p === "other-public-servant"
        ? "other-public-servant"
        : null;
  const selectedCategory: EmployeeCategory | null =
    parseStream(streamParam) ??
    (payrollScope === "all" ? null : payrollScope);

  const setSelectedCategory = useCallback(
    (next: EmployeeCategory | null) => {
      const params = new URLSearchParams(searchParams);
      if (next === null) {
        params.delete("stream");
      } else {
        params.set("stream", next === "civil-servant" ? "civil-servant" : "ops");
      }
      setSearchParams(params, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  /* When the acting persona changes, re-align selectedCategory to the new
     scope for single-scope users so they can't see the opposite channel's
     URL. Cross-scope users keep whatever they have in the URL. */
  useEffect(() => {
    if (payrollScope === "all") return;
    const current = parseStream(searchParams.get("stream"));
    if (current !== payrollScope) {
      const params = new URLSearchParams(searchParams);
      params.set("stream", payrollScope === "civil-servant" ? "civil-servant" : "ops");
      setSearchParams(params, { replace: true });
    }
  }, [payrollScope, searchParams, setSearchParams]);
  const [overviewMode, setOverviewMode] = useState<PayrollOverviewMode>("all");
  /* Sub-category filter inside a selected stream. "all" = the whole stream
     (e.g. every Civil Servant category).  Anything else is a single canonical
     category label from the payroll-employee-category LoV. */
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  /* Reset the chip filter whenever the user jumps between streams so the
     previous selection doesn't leak across CS ↔ OPS. */
  useEffect(() => {
    setCategoryFilter("all");
  }, [selectedCategory]);
  const [opsSourceMode, setOpsSourceMode] = useState<OpsSourceMode>("interface");
  const [selectedRole, setSelectedRole] = useState<PayrollRole | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

  const [employeeData, setEmployeeData] = useState<EmployeeData>({});
  const [hrActionData, setHrActionData] = useState<HRActionData>({});
  const [payrollData, setPayrollData] = useState<PayrollData>({});
  const [salaryAdvanceData, setSalaryAdvanceData] = useState<Record<string, any>>({});
  const [floatingDeductionsData, setFloatingDeductionsData] = useState<
    Record<string, any>
  >({});
  const [travelAdvanceLocalData, setTravelAdvanceLocalData] = useState<
    Record<string, any>
  >({});
  const [travelAdvanceForeignData, setTravelAdvanceForeignData] = useState<
    Record<string, any>
  >({});
  const [musterrollDetailsData, setMusterrollDetailsData] = useState<
    Record<string, any>
  >({});
  const [musterrollPaymentData, setMusterrollPaymentData] = useState<
    Record<string, any>
  >({});
  const [sittingFeeData, setSittingFeeData] = useState<Record<string, any>>({});
  const [honorariumData, setHonorariumData] = useState<Record<string, any>>({});
  const [retirementBenefitsData, setRetirementBenefitsData] = useState<
    Record<string, any>
  >({});

  // Build complete LoV map from both CS and OPS definitions plus shared
  const lovMap = useMemo(() => {
    let map: Record<string, string[]> = { ...SHARED_LOV_DEFINITIONS };

    if (selectedCategory === "civil-servant") {
      map = { ...map, ...CS_LOV_DEFINITIONS };
    } else if (selectedCategory === "other-public-servant") {
      map = { ...map, ...OPS_LOV_DEFINITIONS };
    }

    // Override with master data if available
    Object.entries(map).forEach(([key, values]) => {
      const mdValues = masterDataMap.get(key) || [];
      if (mdValues.length > 0) {
        map[key] = mdValues;
      }
    });

    return map;
  }, [selectedCategory, masterDataMap]);

  // Event handlers
  const handleEmployeeChange = useCallback((fieldId: string, value: any) => {
    setEmployeeData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleHRActionChange = useCallback((fieldId: string, value: any) => {
    setHrActionData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handlePayrollChange = useCallback((fieldId: string, value: any) => {
    setPayrollData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSalaryAdvanceChange = useCallback((fieldId: string, value: any) => {
    setSalaryAdvanceData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleFloatingDeductionsChange = useCallback(
    (fieldId: string, value: any) => {
      setFloatingDeductionsData((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  const handleTravelAdvanceLocalChange = useCallback(
    (fieldId: string, value: any) => {
      setTravelAdvanceLocalData((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  const handleTravelAdvanceForeignChange = useCallback(
    (fieldId: string, value: any) => {
      setTravelAdvanceForeignData((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  const handleMusterrollDetailsChange = useCallback(
    (fieldId: string, value: any) => {
      setMusterrollDetailsData((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  const handleMusterrollPaymentChange = useCallback(
    (fieldId: string, value: any) => {
      setMusterrollPaymentData((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  const handleSittingFeeChange = useCallback((fieldId: string, value: any) => {
    setSittingFeeData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleHonorariumChange = useCallback((fieldId: string, value: any) => {
    setHonorariumData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleRetirementBenefitsChange = useCallback(
    (fieldId: string, value: any) => {
      setRetirementBenefitsData((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  // Category-specific tab configurations
  // NOTE — Civil Servant workflow tabs have been moved to dedicated routes
  // (Employee Registry, HR Actions, Pay Fixation, Arrears, etc.) and are
  // reached via the PayrollSubNav header. Only "Employee Master" remains as
  // an in-page summary tab rendering the ZESt-sourced info card.
  const CS_TABS: TabConfig[] = [
    {
      id: "employee-master",
      label: "Employee Master",
      icon: "👤",
      visible: true,
    },
    {
      id: "travel-claims",
      label: "Travel Claims",
      icon: "✈️",
      visible: true,
    },
    {
      id: "remittances-payslip",
      label: "Remittances",
      icon: "🏦",
      visible: true,
    },
  ];

  const OPS_TABS: TabConfig[] = [
    {
      id: "employee-master",
      label: "Employee Master",
      icon: "👤",
      visible: true,
    },
    {
      id: "hr-actions",
      label: "HR Actions & Pay Updates",
      icon: "📋",
      visible: selectedRole !== "agency-staff",
    },
    {
      id: "payroll-generation",
      label: "Payroll Processing",
      icon: "💰",
      visible:
        selectedRole === "finance-officer" || selectedRole === "system-administrator",
    },
    {
      id: "salary-advance",
      label: "Salary Advance",
      icon: "💳",
      visible: true,
    },
    {
      id: "travel-claims",
      label: "Travel Claims",
      icon: "✈️",
      visible: true,
    },
    {
      id: "musterroll",
      label: "Muster Roll & Wages",
      icon: "🏗️",
      visible:
        selectedRole === "finance-officer" || selectedRole === "system-administrator",
    },
    {
      id: "sitting-honorarium",
      label: "Sitting Fee & Honorarium",
      icon: "🎖️",
      visible: true,
    },
    {
      id: "retirement-benefits",
      label: "Retirement Benefits",
      icon: "🏛️",
      visible:
        selectedRole === "finance-officer" || selectedRole === "system-administrator",
    },
    {
      id: "floating-deductions",
      label: "Floating Deductions",
      icon: "📊",
      visible:
        selectedRole === "finance-officer" || selectedRole === "system-administrator",
    },
    {
      id: "remittances-payslip",
      label: "Remittances",
      icon: "🏦",
      visible: true,
    },
  ];

  const tabs = selectedCategory === "civil-servant" ? CS_TABS : OPS_TABS;
  const visibleTabs = tabs.filter((t) => t.visible);

  // Set initial tab when category changes
  useMemo(() => {
    if (selectedCategory && visibleTabs.length > 0) {
      if (!activeTab || !visibleTabs.some((t) => t.id === activeTab)) {
        setActiveTab(visibleTabs[0].id);
      }
    }
  }, [selectedCategory, visibleTabs, activeTab]);

  // Determine theme colors
  const themeClass =
    selectedCategory === "civil-servant"
      ? "border-blue-400 bg-blue-50"
      : "border-amber-400 bg-amber-50";

  // Render tab content
  const renderTabContent = () => {
    if (!selectedCategory || !activeTab) {
      return null;
    }

    if (selectedCategory === "civil-servant") {
      switch (activeTab) {
        case "employee-master":
          /* Civil Servant Records table has been removed from the Payroll
             Management landing view entirely. The full table lives on the
             dedicated Employee Registry / Employee Master route and is
             reached via the workflow pills / sub-nav. */
          return null;
        case "hr-actions":
          return (
            <>
              <FormSection
                title="HR Actions & Pay Updates"
                fields={CS_HR_ACTION_FIELDS}
                data={hrActionData}
                onFieldChange={handleHRActionChange}
                lovMap={lovMap}
              />
              <FormSection
                title="Arrears"
                fields={CS_ARREARS_FIELDS}
                data={hrActionData}
                onFieldChange={handleHRActionChange}
                lovMap={lovMap}
              />
              <FormSection
                title="Pay Fixation"
                fields={CS_PAY_FIXATION_FIELDS}
                data={hrActionData}
                onFieldChange={handleHRActionChange}
                lovMap={lovMap}
              />
              <FormSection
                title="Re-join"
                fields={CS_REJOIN_FIELDS}
                data={hrActionData}
                onFieldChange={handleHRActionChange}
                lovMap={lovMap}
              />
            </>
          );
        case "payroll-generation":
          return (
            <CivilServicePayrollProcessing
              employees={CS_SAMPLE_EMPLOYEES}
              agencyCode={auth?.activeAgencyCode || ""}
            />
          );
        case "salary-advance":
          return (
            <FormSection
              title="Civil Service Salary Advance"
              fields={CS_SALARY_ADVANCE_FIELDS}
              data={salaryAdvanceData}
              onFieldChange={handleSalaryAdvanceChange}
              lovMap={lovMap}
            />
          );
        case "floating-deductions":
          return (
            <FormSection
              title="Civil Service Floating Deductions"
              fields={CS_FLOATING_DEDUCTIONS_FIELDS}
              data={floatingDeductionsData}
              onFieldChange={handleFloatingDeductionsChange}
              lovMap={lovMap}
            />
          );
        case "travel-claims":
          return <PayrollTravelClaimsHubPage />;
        case "remittances-payslip":
          return <PayrollRemittancesHubPage />;
        default:
          return null;
      }
    } else {
      // OPS Category
      switch (activeTab) {
        case "employee-master":
          /* OPS Records table now renders ONLY when the Employee Master
             tab is the active selection. */
          return (
            <EmployeeSummaryTable
              employees={OPS_SAMPLE_EMPLOYEES}
              category="other-public-servant"
              agencyCode={(auth?.activeAgencyCode === "16" ? "all" : (auth?.activeAgencyCode || ""))}
            />
          );
        case "hr-actions":
          return (
            <FormSection
              title="HR Actions & Pay Updates"
              fields={OPS_HR_ACTION_FIELDS}
              data={hrActionData}
              onFieldChange={handleHRActionChange}
              lovMap={lovMap}
            />
          );
        case "payroll-generation":
          return (
            <FormSection
              title="Other Public Service Payroll Processing"
              fields={OPS_PAYROLL_PROCESSING_FIELDS}
              data={payrollData}
              onFieldChange={handlePayrollChange}
              lovMap={lovMap}
            />
          );
        case "salary-advance":
          return (
            <FormSection
              title="Other Public Service Salary Advance"
              fields={OPS_SALARY_ADVANCE_FIELDS}
              data={salaryAdvanceData}
              onFieldChange={handleSalaryAdvanceChange}
              lovMap={lovMap}
            />
          );
        case "travel-claims":
          return <PayrollTravelClaimsHubPage />;
        case "remittances-payslip":
          return <PayrollRemittancesHubPage />;
        case "musterroll":
          return (
            <>
              <FormSection
                title="Muster Roll Details"
                fields={OPS_MUSTERROLL_DETAILS_FIELDS}
                data={musterrollDetailsData}
                onFieldChange={handleMusterrollDetailsChange}
                lovMap={lovMap}
              />
              <FormSection
                title="Muster Roll Payment"
                fields={OPS_MUSTERROLL_PAYMENT_FIELDS}
                data={musterrollPaymentData}
                onFieldChange={handleMusterrollPaymentChange}
                lovMap={lovMap}
              />
            </>
          );
        case "sitting-honorarium":
          return (
            <>
              <FormSection
                title="Sitting Fee"
                fields={OPS_SITTING_FEE_FIELDS}
                data={sittingFeeData}
                onFieldChange={handleSittingFeeChange}
                lovMap={lovMap}
              />
              <FormSection
                title="Honorarium"
                fields={OPS_HONORARIUM_FIELDS}
                data={honorariumData}
                onFieldChange={handleHonorariumChange}
                lovMap={lovMap}
              />
            </>
          );
        case "retirement-benefits":
          return (
            <FormSection
              title="Retirement Benefits"
              fields={OPS_RETIREMENT_BENEFITS_FIELDS}
              data={retirementBenefitsData}
              onFieldChange={handleRetirementBenefitsChange}
              lovMap={lovMap}
            />
          );
        case "floating-deductions":
          return (
            <FormSection
              title="Other Public Service Floating Deductions"
              fields={OPS_FLOATING_DEDUCTIONS_FIELDS}
              data={floatingDeductionsData}
              onFieldChange={handleFloatingDeductionsChange}
              lovMap={lovMap}
            />
          );
        default:
          return null;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f7fb_0%,#eef4ff_45%,#f8fafc_100%)]">
      <ModuleActorBanner moduleKey="payroll" />

      <div className="container mx-auto px-4 py-6">
        {/* ─── Cross-agency posted PayBills queue ─────────────────────────
            MoF (code 16) sees all postings and can process/pay/reject.
            Other agencies see a read-only list of their own postings. */}
        {(() => {
          const rawAgencyCodeTop = auth?.activeAgencyCode || "";
          const isCentralMoFTop = rawAgencyCodeTop === "16";
          return (
            <PostedPayrollsPanel
              activeAgencyCode={rawAgencyCodeTop}
              isCentralMoF={isCentralMoFTop}
              /* Inside a stream workspace the queue must stay stream-scoped —
                 never show OPS rows while the user is in Civil Servant and
                 vice-versa. On the two-card landing (selectedCategory=null)
                 we show the full queue so MoF can triage both channels. */
              streamFilter={selectedCategory}
            />
          );
        })()}

        {/* Compact Category Header + Real Analytics */}
        {(() => {
          const agencyCode = auth?.activeAgencyCode || "";
          const csCount = EMPLOYEES.filter(
            (e) => e.category === "civil-servant" && (!agencyCode || e.agencyCode === agencyCode)
          ).length;
          const opsCount = EMPLOYEES.filter(
            (e) => e.category === "other-public-servant" && (!agencyCode || e.agencyCode === agencyCode)
          ).length;
          return (
            <>
              {/* ─── DYNAMIC HEADER — changes with selected category ─── */}
              {selectedCategory === null ? (
                <div className="mb-4 rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(241,246,255,0.98))] px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/80">
                  <div className="flex flex-col items-center gap-4">
                    <h1 className="text-center text-3xl font-black tracking-tight text-slate-900">
                      Payroll Management
                    </h1>
                    {/* <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">Home</span>
                      <span>/</span>
                      <span className="font-semibold text-slate-700">Payroll</span>
                      <span>/</span>
                      <span className="font-semibold text-slate-900">Payroll Management</span>
                    </div> */}
                    {/* <CategoryHeaderTabs
                      selectedCategory={selectedCategory}
                      onSelectCategory={(c) => {
                        setSelectedCategory(c);
                        setActiveTab("");
                      }}
                      csCount={csCount}
                      opsCount={opsCount}
                      allowedCategories={allowedCategories}
                    /> */}
                  </div>
                  {/* GovTech integration-owner surface — only rendered when
                      active agency is GovTech (code 70). Operating agencies
                      never see this card. */}
                  <GovTechScopeCard
                    module="payroll"
                    agencyCode={auth?.activeAgencyCode}
                  />
                </div>
              ) : (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setActiveTab("");
                      }}
                      className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                      aria-label="Back to overview"
                    >
                      <span className="text-sm leading-none">←</span>
                      Back
                    </button>
                    <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 min-w-0">
                      <span className="text-slate-400">Home</span>
                      <span className="opacity-50">›</span>
                      <button
                        onClick={() => {
                          setSelectedCategory(null);
                          setActiveTab("");
                        }}
                        className="transition hover:text-slate-900"
                      >
                        Payroll
                      </button>
                      <span className="opacity-50">›</span>
                      <button
                        onClick={() => setActiveTab("")}
                        className={`truncate transition hover:opacity-80 ${
                          selectedCategory === "civil-servant"
                            ? "text-blue-700"
                            : "text-amber-700"
                        }`}
                      >
                        {selectedCategory === "civil-servant"
                          ? "Civil Service"
                          : "Other Public Service"}
                      </button>
                      {activeTab && (() => {
                        const tabList =
                          selectedCategory === "civil-servant" ? CS_TABS : OPS_TABS;
                        const currentTab = tabList.find((t) => t.id === activeTab);
                        if (!currentTab) return null;
                        return (
                          <>
                            <span className="opacity-50">›</span>
                            <span className="truncate text-slate-900 normal-case tracking-normal">
                              {currentTab.icon} {currentTab.label}
                            </span>
                          </>
                        );
                      })()}
                    </nav>
                    <span className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg leading-none">
                        {selectedCategory === "civil-servant" ? "👨‍💼" : "🏛️"}
                      </span>
                      <h1 className="truncate text-sm font-bold text-slate-900">
                        {selectedCategory === "civil-servant"
                          ? "Civil Servant Payroll"
                          : "Other Public Service Payroll"}
                      </h1>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-bold ${
                        selectedCategory === "civil-servant"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {selectedCategory === "civil-servant" ? csCount : opsCount}{" "}
                      Employees
                    </span>
                    <span className="hidden sm:inline rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-semibold text-slate-600">
                      {selectedCategory === "civil-servant"
                        ? "Source: ZESt (RCSC) · read-only"
                        : "Source: Interface / Manual / Bulk"}
                    </span>
                    {allowedCategories.length > 1 && (
                      <button
                        onClick={() => {
                          setSelectedCategory(
                            selectedCategory === "civil-servant"
                              ? "other-public-servant"
                              : "civil-servant"
                          );
                          setActiveTab("");
                        }}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Switch to{" "}
                        {selectedCategory === "civil-servant"
                          ? "Other Public Service"
                          : "Civil Service"}{" "}
                        →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── LANDING ANALYTICS VIEW — flowing stacked overview ─── */}
              {selectedCategory === null && (
                <div className="mb-4 space-y-4">
                  {allowedCategories.includes("civil-servant") &&
                    (overviewMode === "all" || overviewMode === "civil-servant") && (
                    <PayrollOverviewSection
                      category="civil-servant"
                      count={csCount}
                      agencyCode={agencyCode}
                      onDrillDown={() => setSelectedCategory("civil-servant")}
                    />
                  )}

                  {allowedCategories.includes("other-public-servant") &&
                    (overviewMode === "all" || overviewMode === "other-public-servant") && (
                    <PayrollOverviewSection
                      category="other-public-servant"
                      count={opsCount}
                      agencyCode={agencyCode}
                      onDrillDown={() => setSelectedCategory("other-public-servant")}
                    />
                  )}
                </div>
              )}

              {/* ─── DRILL-DOWN VIEW — shown only after a category is picked ─── */}
              {selectedCategory !== null && (
                <>
                  {/* Inside: dynamic sub-nav + source panels, no redundant header */}
                  <div
                    className={`mb-4 overflow-hidden rounded-[30px] border shadow-[0_26px_70px_rgba(15,23,42,0.08)] ${
                      selectedCategory === "civil-servant"
                        ? "border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))]"
                        : "border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))]"
                    }`}
                  >
                    <div className="space-y-4 p-4">
                      <PayrollSubNav category={selectedCategory} />

                      {/* ── Dynamic Employee Category chips ─────────────
                          Sub-filter by canonical category label (driven by
                          Master Data → payroll-employee-category).  Each
                          stream surfaces only the categories attached to it
                          via payrollEmployeeCategories.ts, plus any custom
                          LoV values users add in /master-data. */}
                      {(() => {
                        const lov = masterDataMap.get("payroll-employee-category") || [];
                        const streamCategories = lov.length
                          ? mergeLovWithDirectory(lov, selectedCategory)
                          : categoriesFor(selectedCategory);
                        if (streamCategories.length === 0) return null;
                        const tone =
                          selectedCategory === "civil-servant"
                            ? {
                                active: "bg-blue-600 text-white border-blue-600 shadow-sm",
                                idle: "bg-white text-blue-700 border-blue-200 hover:border-blue-400",
                                headerBg: "bg-blue-50/70",
                                label: "Civil Servant",
                              }
                            : {
                                active: "bg-amber-600 text-white border-amber-600 shadow-sm",
                                idle: "bg-white text-amber-700 border-amber-200 hover:border-amber-400",
                                headerBg: "bg-amber-50/70",
                                label: "Other Public Servant",
                              };
                        /* Count employees per category within the stream for chip badges */
                        const pool = EMPLOYEES.filter((e) => e.category === selectedCategory);
                        const counts: Record<string, number> = {};
                        pool.forEach((e) => {
                          const k = e.employeeCategoryLabel || "";
                          if (k) counts[k] = (counts[k] ?? 0) + 1;
                        });
                        const totalInStream = pool.length;
                        const activeMeta = streamCategories.find((c) => c.label === categoryFilter);
                        const activeCount = categoryFilter === "all"
                          ? totalInStream
                          : (counts[categoryFilter] ?? 0);
                        const selectTone =
                          selectedCategory === "civil-servant"
                            ? "border-blue-300 bg-blue-50/40 text-blue-900 focus:border-blue-500 focus:ring-blue-200"
                            : "border-amber-300 bg-amber-50/40 text-amber-900 focus:border-amber-500 focus:ring-amber-200";
                        const pillTone =
                          selectedCategory === "civil-servant"
                            ? "bg-blue-600 text-white"
                            : "bg-amber-600 text-white";
                        return (
                          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                            <div className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 ${tone.headerBg}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                                  {tone.label} · Employee Category
                                </span>
                                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                  {streamCategories.length} categories · {totalInStream.toLocaleString()} staff
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Source · payroll-employee-category (Master Data)
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 p-3">
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <span className="text-slate-500">Filter by Category</span>
                                <select
                                  value={categoryFilter}
                                  onChange={(e) => setCategoryFilter(e.target.value)}
                                  title={activeMeta?.description || "Scope the dashboard to a specific employee category"}
                                  className={`min-w-[280px] rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm outline-none transition focus:ring-2 ${selectTone}`}
                                >
                                  <option value="all">
                                    🗂️  All Categories  ({totalInStream.toLocaleString()} staff)
                                  </option>
                                  {streamCategories.map((c) => {
                                    const n = counts[c.label] ?? 0;
                                    return (
                                      <option key={c.label} value={c.label}>
                                        {c.icon}  {c.label}  ({n.toLocaleString()})
                                      </option>
                                    );
                                  })}
                                </select>
                              </label>
                              <span
                                title={activeMeta?.description || "All categories in this stream"}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm ${pillTone}`}
                              >
                                <span>{activeMeta?.icon || "🗂️"}</span>
                                <span className="uppercase tracking-wide">
                                  {activeMeta?.short || activeMeta?.label || "All Categories"}
                                </span>
                                <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {activeCount.toLocaleString()}
                                </span>
                              </span>
                              {categoryFilter !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => setCategoryFilter("all")}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  ✕ Clear
                                </button>
                              )}
                              {activeMeta && (
                                <span className="ml-auto max-w-xl text-[11px] italic text-slate-500">
                                  {activeMeta.description}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      <PayrollAnalyticsDashboard
                        category={selectedCategory}
                        agencyCode={auth?.activeAgencyCode || ""}
                        categoryFilter={categoryFilter}
                      />

                      {/* ZESt Integration (RCSC) info card removed per user
                          request — CS records are still sourced from ZESt, but
                          the status panel clutters the Civil Servant landing
                          view. Connection/sync details live on the Employee
                          Registry → ZESt Integration Pipeline page. */}
                      {selectedCategory === "other-public-servant" && (
                        <>
                          <OpsSourceTabs
                            mode={opsSourceMode}
                            onChange={setOpsSourceMode}
                          />
                          {opsSourceMode === "interface" && <OpsInterfacePanel />}
                          {opsSourceMode === "manual" && <OpsManualPanel />}
                          {opsSourceMode === "bulk" && <OpsBulkUploadPanel />}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          );
        })()}

        {/* Show content */}
        {selectedCategory && (() => {
          const rawAgencyCode = auth?.activeAgencyCode || "";
          /* MoF (code 16) is the central oversight agency — it must see
             every agency's records with the full set of filters. Every
             other agency is scoped to its own agencyCode. */
          const isCentralMoF = rawAgencyCode === "16";
          const agencyCode = isCentralMoF ? "all" : rawAgencyCode;
          /* agencyCode / isCentralMoF are still used by the tab renderers
             below (via auth) — keep them referenced to avoid unused-var
             warnings when TS strict mode is on. */
          void agencyCode; void isCentralMoF;
          return (
          <>
            {/* "Workflow Sections / Continue through the payroll flow"
                block removed per user request — navigation to the peer
                sections (Employee Master, Travel Claims, Remittances,
                etc.) is now done through the top-level sub-nav header
                instead of these inline workflow cards. */}

            {/* Tab Content */}
            {activeTab && (
              <>
                {renderTabContent()}

                {/* Action Buttons — hidden for Civil Servant Employee Master (ZESt-sourced, read-only) */}
                {!(selectedCategory === "civil-servant" && activeTab === "employee-master") && (
                <div className="flex flex-wrap justify-center gap-4 rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
                  <button className="rounded-2xl bg-slate-200 px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-300">
                    Clear Form
                  </button>
                  <button
                    className={`rounded-2xl px-6 py-3 font-semibold text-white transition ${
                      selectedCategory === "civil-servant"
                        ? "bg-[linear-gradient(135deg,#2563eb,#3b82f6)] shadow-[0_16px_30px_rgba(37,99,235,0.18)] hover:brightness-105"
                        : "bg-[linear-gradient(135deg,#d97706,#f59e0b)] shadow-[0_16px_30px_rgba(217,119,6,0.18)] hover:brightness-105"
                    }`}
                  >
                    Save & Continue
                  </button>
                  <button
                    className={`rounded-2xl px-6 py-3 font-semibold text-white transition ${
                      selectedCategory === "civil-servant"
                        ? "bg-[linear-gradient(135deg,#1e40af,#2563eb)] shadow-[0_16px_30px_rgba(30,64,175,0.2)] hover:brightness-105"
                        : "bg-[linear-gradient(135deg,#92400e,#d97706)] shadow-[0_16px_30px_rgba(146,64,14,0.2)] hover:brightness-105"
                    }`}
                  >
                    Submit for Review
                  </button>
                </div>
                )}
              </>
            )}
          </>
          );
        })()}
      </div>
    </div>
  );
}
