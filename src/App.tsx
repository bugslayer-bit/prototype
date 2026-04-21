import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import React, { Suspense, useEffect, useRef } from "react";
import { AppShell } from "./layout/AppShell";
import { ContractDataProvider } from "./shared/context/ContractDataContext";
import { ContractorDataProvider } from "./shared/context/ContractorDataContext";
import { MusterRollBeneficiaryProvider } from "./shared/context/MusterRollBeneficiaryContext";
import { MasterDataProvider } from "./shared/context/MasterDataContext";
import { SubmittedInvoiceProvider } from "./shared/context/SubmittedInvoiceContext";
import { useAuth } from "./shared/context/AuthContext";
import { PayrollScopeGuard } from "./shared/components/PayrollScopeGuard";
import { PayrollRoleBoundary } from "./modules/payroll/shared/components/PayrollRoleBoundary";
/* Hoisted to the app shell so Vendor Management can read utility accounts
   for the SRS-mandated dynamic Utility → Vendor cross-process link. */
import { UtilityDataProvider } from "./modules/expenditure/utilityManagement/context/UtilityDataContext";
import { modules } from "./shared/data/modules";
import { agencyCodeToSlug, slugToAgencyCode } from "./shared/hooks/useAgencyUrl";

/* ── Contractor module ──────────────────────────────────────────────────── */
import { ContractorLayout } from "./modules/contractor/ContractorLayout";
import { ContractorRegistrationPage } from "./modules/contractor/ContractorRegistrationPage";
import { ContractorAmendmentPage } from "./modules/contractor/ContractorAmendmentPage";
import { ContractorManagementPage } from "./modules/contractor/management/ContractorManagementPage";
import { ContactManagementPage } from "./modules/contractor/contact/ContactManagementPage";

/* ── Vendor module ──────────────────────────────────────────────────────── */
import { VendorManagementPage } from "./modules/vendor/VendorManagementPage";

/* ── Master Data ────────────────────────────────────────────────────────── */
import { MasterDataPage } from "./modules/masterData/MasterDataPage";

/* ── Expenditure modules ────────────────────────────────────────────────── */
import { ContractManagementLayout } from "./modules/expenditure/contractManagement/ContractManagementLayout";
import { RecurringVendorPaymentLayout } from "./modules/expenditure/recurringVendorPayments/RecurringVendorPaymentLayout";
import { ContractCreationPage } from "./modules/expenditure/contractCreation/ContractCreationPage";
import { ContractAmendmentPage } from "./modules/expenditure/contractAmendment/ContractAmendmentPage";
import { AdvancesPage } from "./modules/expenditure/advances/AdvancesPage";
import { InvoiceBillPage } from "./modules/expenditure/invoiceBill";

import { ContractLifecyclePage } from "./modules/expenditure/contractLifecycle/ContractLifecyclePage";
import { ContractClosurePage } from "./modules/expenditure/contractClosure/ContractClosurePage";
import { SanctionManagementPage } from "./modules/expenditure/sanctionManagement/SanctionManagementPage";
import { ContractExtensionPage } from "./modules/expenditure/contractExtension";
import { UtilityManagementPage } from "./modules/expenditure/utilityManagement";
import { RentalPaymentPage } from "./modules/expenditure/rentalPayment";
import { DebtPaymentPage } from "./modules/expenditure/debtPayment";
import { SoeFundTransferPage } from "./modules/expenditure/soeFundTransfer";
import { FinancialInstitutionPage } from "./modules/expenditure/financialInstitution";
import { SocialBenefitStipendPage } from "./modules/expenditure/socialBenefitStipend";
import { SubscriptionsContributionsPage } from "./modules/expenditure/subscriptionsContributions";
import { RetentionMoneyPage } from "./modules/expenditure/retentionMoney";
import { MusterRollWagesPage } from "./modules/expenditure/musterRollWages";

/* ── Payroll module (lazy-loaded to isolate import errors) ─────────────── */
const EmployeeRegistryPage = React.lazy(() => import("./modules/payroll/pages/EmployeeRegistryPage").then(m => ({ default: m.EmployeeRegistryPage })));
const CsHrActionsPage = React.lazy(() => import("./modules/payroll/civil-servant/pages/HrActionsPage").then(m => ({ default: m.HrActionsPage })));
const AllowanceConfigPage = React.lazy(() => import("./modules/payroll/pages/AllowanceConfigPage").then(m => ({ default: m.AllowanceConfigPage })));
const PayScaleMasterPage = React.lazy(() => import("./modules/payroll/pages/PayScaleMasterPage").then(m => ({ default: m.PayScaleMasterPage })));
const EmployeeAllowancePage = React.lazy(() => import("./modules/payroll/pages/EmployeeAllowancePage").then(m => ({ default: m.EmployeeAllowancePage })));
const EmployeePayScalePage = React.lazy(() => import("./modules/payroll/pages/EmployeePayScalePage").then(m => ({ default: m.EmployeePayScalePage })));
const PayrollSchedulePage = React.lazy(() => import("./modules/payroll/pages/PayrollSchedulePage").then(m => ({ default: m.PayrollSchedulePage })));
const PaybillStandardPage = React.lazy(() => import("./modules/payroll/pages/PaybillStandardPage").then(m => ({ default: m.PaybillStandardPage })));
const PayrollGenerationPage = React.lazy(() => import("./modules/payroll/pages/PayrollGenerationPage").then(m => ({ default: m.PayrollGenerationPage })));
const SalaryAdvancePage = React.lazy(() => import("./modules/payroll/pages/SalaryAdvancePage").then(m => ({ default: m.SalaryAdvancePage })));
const PayrollManagementPage = React.lazy(() => import("./modules/payroll/pages/PayrollManagementPage").then(m => ({ default: m.PayrollManagementPage })));
const PayslipGenerationPage = React.lazy(() => import("./modules/payroll/payslip").then(m => ({ default: m.PayslipGenerationPage })));
/* MusterRollCreationPage, MusterRollPaymentPage, SittingFeePage — now consumed
   by MusterRollWagesPage internally; old routes redirect to /modules/muster-roll-wages */

/* ── OPS Payroll module (lazy-loaded) ──────────────────────────────────── */
const OpsPayrollDashboard = React.lazy(() => import("./modules/payroll/ops/pages/OpsPayrollDashboard").then(m => ({ default: m.OpsPayrollDashboard })));
const OpsEmployeeRegistryPage = React.lazy(() => import("./modules/payroll/ops/pages/OpsEmployeeRegistryPage").then(m => ({ default: m.OpsEmployeeRegistryPage })));
const OpsAllowanceConfigPage = React.lazy(() => import("./modules/payroll/ops/pages/OpsAllowanceConfigPage").then(m => ({ default: m.OpsAllowanceConfigPage })));
const OpsScheduleConfigPage = React.lazy(() => import("./modules/payroll/ops/pages/OpsScheduleConfigPage").then(m => ({ default: m.OpsScheduleConfigPage })));
const OpsPayrollGenerationPage = React.lazy(() => import("./modules/payroll/ops/pages/OpsPayrollGenerationPage").then(m => ({ default: m.OpsPayrollGenerationPage })));
const OpsSalaryAdvancePage = React.lazy(() => import("./modules/payroll/ops/pages/OpsSalaryAdvancePage").then(m => ({ default: m.OpsSalaryAdvancePage })));
const OpsTravelClaimPage = React.lazy(() => import("./modules/payroll/ops/pages/OpsTravelClaimPage").then(m => ({ default: m.OpsTravelClaimPage })));
const PayrollTravelClaimsHubPage = React.lazy(() => import("./modules/payroll/pages/PayrollTravelClaimsHubPage"));
const PayrollRemittancesHubPage = React.lazy(() => import("./modules/payroll/pages/PayrollRemittancesHubPage"));
/* OpsMusterRollPage & OpsSittingFeeHonorariumPage — removed; routes now redirect to unified /modules/muster-roll-wages */
const OpsHrActionsPage = React.lazy(() => import("./modules/payroll/ops/pages/OpsHrActionsPage").then(m => ({ default: m.OpsHrActionsPage })));
const OpsRetirementBenefitsPage = React.lazy(() => import("./modules/payroll/ops/pages/OpsRetirementBenefitsPage").then(m => ({ default: m.OpsRetirementBenefitsPage })));

/* ── Public self-service ────────────────────────────────────────────────── */
import { PublicPayslipPage } from "./modules/public/PublicPayslipPage";
import { PublicDocumentsPage } from "./modules/public/PublicDocumentsPage";
import { MusterRollPublicRegistrationPage } from "./modules/public/MusterRollPublicRegistrationPage";
import MusterRollApprovalsPage from "./modules/public/MusterRollApprovalsPage";
import FIPortalPage from "./modules/public/FIPortalPage";
import ContractorProfilePage from "./modules/public/ContractorProfilePage";
import PaymentStatusPage from "./modules/public/PaymentStatusPage";
import MyContractsPage from "./modules/public/MyContractsPage";
import { InvoiceSubmissionPage } from "./modules/expenditure/invoiceBill/InvoiceSubmissionPage";

/* ── Home / generic ─────────────────────────────────────────────────────── */
import { HomePage } from "./modules/home/HomePage";
import { ModulePage } from "./modules/home/ModulePage";

/* ── Admin module ────────────────────────────────────────────────────────── */
import { AdminVerificationPage } from "./modules/admin";
import { RbacPage } from "./modules/admin/rbac/RbacPage";
import { WorkflowConfigPage } from "./modules/admin/workflow";
import { DelegationPage } from "./modules/admin/delegation/DelegationPage";

/* ── Route guard: silently redirects public/external users to home ────── */
/* ── Lazy-load fallback spinner ─────────────────────────────────────────── */
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
        <p className="text-sm text-slate-500">Loading module...</p>
      </div>
    </div>
  );
}

/* ── Route-level Error Boundary — catches lazy-load or render errors ───── */
class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackTitle?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallbackTitle?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[40vh] p-8">
          <div className="max-w-lg text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{this.props.fallbackTitle || "Page Error"}</h2>
            <p className="text-sm text-slate-600">This page encountered an error while loading.</p>
            <pre className="text-left bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 overflow-auto max-h-32">
              {this.state.error?.message || "Unknown error"}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Wrap a lazy-loaded page with Suspense + ErrorBoundary */
function LazyPage({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <RouteErrorBoundary fallbackTitle={title}>
      <Suspense fallback={<PageLoadingFallback />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

/** Same as LazyPage, but additionally wraps its children in PayrollRoleBoundary
 *  so the wizard step / form values / workflow stage fully reset on every
 *  persona switch.  Used for all routes under /payroll/**. */
function PayrollLazyPage({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <RouteErrorBoundary fallbackTitle={title}>
      <Suspense fallback={<PageLoadingFallback />}>
        <PayrollRoleBoundary>{children}</PayrollRoleBoundary>
      </Suspense>
    </RouteErrorBoundary>
  );
}

/* ── AgencyRedirect — absolute-path redirect using buildPath ────────────
   Replaces fragile `<Navigate to="../modules/..." />` relative paths with
   unambiguous absolute paths.  e.g. AgencyRedirect to="/modules/contractor/register"
   resolves to /govtech/gt70-hr-01/modules/contractor/register
   ──────────────────────────────────────────────────────────────────────── */
function AgencyRedirect({ to }: { to: string }) {
  const { agencySlug, userId } = useParams<{ agencySlug: string; userId: string }>();
  const target = `/${agencySlug}/${userId}${to.startsWith("/") ? to : `/${to}`}`;
  return <Navigate to={target} replace />;
}

const EXTERNAL_AGENCY_CODES = new Set(["EXT", "FI", "MR"]);
function InternalGuard({ children }: { children: React.ReactNode }) {
  const { activeAgencyCode, isLoading } = useAuth();
  if (isLoading) return null;
  if (EXTERNAL_AGENCY_CODES.has(activeAgencyCode)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/* ── Role constants for route guards ────────────────────────────────────── */
const ADMIN_ONLY = ["role-admin"];
const PAYROLL_ROLES = ["role-admin", "role-hr-officer", "role-finance-officer", "role-head-of-agency"];
const EXPENDITURE_ROLES = ["role-admin", "role-finance-officer", "role-head-of-agency", "role-procurement", "role-agency-staff"];
const ALL_INTERNAL = ["role-admin", "role-hr-officer", "role-finance-officer", "role-head-of-agency", "role-procurement", "role-agency-staff", "role-auditor", "role-normal-user"];

/* ── RoleGuard: shows AccessDenied panel when role doesn't match ────── */
function RoleGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { activeRoleId, activeAgencyCode, isLoading } = useAuth();

  /* Wait for auth to finish loading before checking roles — prevents flash of
     "Role Not Authorized" on page refresh while localStorage auth is resolving */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (EXTERNAL_AGENCY_CODES.has(activeAgencyCode)) {
    return <Navigate to="/" replace />;
  }
  if (!activeRoleId || !allowedRoles.includes(activeRoleId)) {
    const ROLE_LABELS: Record<string, string> = {
      "role-admin": "System Administrator", "role-hr-officer": "HR Officer",
      "role-finance-officer": "Finance Officer", "role-head-of-agency": "Head of Agency",
      "role-procurement": "Procurement Officer", "role-agency-staff": "Agency Staff",
      "role-auditor": "Auditor", "role-normal-user": "Normal User", "role-public": "Public User",
    };
    const rl = (id: string) => ROLE_LABELS[id] ?? id;
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Role Not Authorized</h2>
          <p className="text-sm text-slate-600">Your current role ({rl(activeRoleId ?? "none")}) doesn't have access. Switch to an authorized role using the persona switcher (1-9) in the header.</p>
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {allowedRoles.map(r => (
              <span key={r} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />{rl(r)}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 pt-2">Tip: Click any numbered persona (1-9) in the top header to switch roles dynamically.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AgencyRouteSync — keeps the URL prefix (:agencySlug/:userId) in sync
   ─────────────────────────────────────────────────────────────────────────
   Strategy:
     1. Wait for auth to finish loading (user is not null) before any sync.
     2. First render with user ready → sync auth FROM URL if URL has a
        different agency (handles bookmarks / direct links / page refresh).
     3. All subsequent renders → sync URL FROM auth (handles AgencyPicker,
        persona switch, role switch). Never reverts auth from URL.
   ═══════════════════════════════════════════════════════════════════════════ */
function AgencyRouteSync({ children }: { children: React.ReactNode }) {
  const { activeAgencyCode, user, setActiveAgencyCode, isLoading } = useAuth();
  const { agencySlug: urlSlug, userId: urlUserId } = useParams<{ agencySlug: string; userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const expectedSlug = agencyCodeToSlug(activeAgencyCode);
  const currentUserId = user?.id ?? "anonymous";

  /* Track whether initial URL→auth sync has completed */
  const didInitialSync = useRef(false);

  useEffect(() => {
    /* Don't sync while auth is still loading — avoids "anonymous" in URL */
    if (isLoading || !user) return;
    if (!urlSlug || !urlUserId) return;

    /* ── First sync: optionally adopt agency from URL ── */
    if (!didInitialSync.current) {
      didInitialSync.current = true;
      const urlAgencyCode = slugToAgencyCode(urlSlug);
      if (urlAgencyCode && urlAgencyCode !== activeAgencyCode) {
        setActiveAgencyCode(urlAgencyCode);
        return; // re-render will run Case 2 to fix userId in URL
      }
    }

    /* ── All subsequent syncs: push auth state → URL ── */
    if (urlSlug !== expectedSlug || urlUserId !== currentUserId) {
      const restOfPath = location.pathname
        .replace(`/${urlSlug}/${urlUserId}`, "")
        .replace(/^\/+/, "/");
      const newPath = `/${expectedSlug}/${currentUserId}${restOfPath === "/" ? "" : restOfPath}`;
      navigate(newPath + location.search + location.hash, { replace: true });
    }
  }, [
    isLoading, user,
    urlSlug, urlUserId, activeAgencyCode, expectedSlug, currentUserId,
    location.pathname, location.search, location.hash,
    navigate, setActiveAgencyCode,
  ]);

  return <>{children}</>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Root redirect — sends "/" to "/:agencySlug/:userId"
   Waits for auth to load so we never redirect with "anonymous".
   ═══════════════════════════════════════════════════════════════════════════ */
function RootRedirect() {
  const { activeAgencyCode, user, isLoading } = useAuth();

  /* Show nothing while auth resolves — avoids /mof/anonymous flash */
  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading IFMIS...</p>
        </div>
      </div>
    );
  }

  const slug = agencyCodeToSlug(activeAgencyCode);
  const userId = user.id;
  return <Navigate to={`/${slug}/${userId}`} replace />;
}

/* (Routes are defined inline below as direct <Route> children) */

export function App() {
  return (
    <MasterDataProvider>
      <ContractorDataProvider>
        <ContractDataProvider>
        <SubmittedInvoiceProvider>
        <UtilityDataProvider>
        <MusterRollBeneficiaryProvider>
        <Routes>
          {/* Root → redirect to /:agencySlug/:userId */}
          <Route path="/" element={<RootRedirect />} />

          {/* Agency-scoped layout: all IFMIS routes live under /:agencySlug/:userId */}
          <Route path=":agencySlug/:userId" element={
            <AgencyRouteSync>
              <AppShell />
            </AgencyRouteSync>
          }>
            {/* ── Home ── */}
            <Route index element={<HomePage modules={modules} />} />

            {/* ── Contractor — nested layout with top-bar tabs ── */}
            <Route path="modules/contractor" element={<ContractorLayout />}>
              <Route index element={<Navigate to="register" replace />} />
              <Route path="register" element={<ContractorRegistrationPage />} />
              <Route path="management" element={<ContractorManagementPage />} />
              <Route path="amendment" element={<ContractorAmendmentPage />} />
              <Route path="contacts" element={<ContactManagementPage />} />
            </Route>

            {/* ── Legacy contractor routes → redirect to new unified paths ── */}
            <Route path="contractor" element={<AgencyRedirect to="/modules/contractor/register" />} />
            <Route path="contractor/register" element={<AgencyRedirect to="/modules/contractor/register" />} />
            <Route path="contractor/amendment" element={<AgencyRedirect to="/modules/contractor/amendment" />} />
            <Route path="contractor/individuals" element={<AgencyRedirect to="/modules/contractor/register" />} />
            <Route path="contractor/business" element={<AgencyRedirect to="/modules/contractor/register" />} />
            <Route path="contractor-management" element={<AgencyRedirect to="/modules/contractor/management" />} />
            <Route path="contact-management" element={<AgencyRedirect to="/modules/contractor/contacts" />} />

            {/* ── Vendor ── */}
            <Route path="vendor-management" element={<AgencyRedirect to="/modules/recurring-vendor-payments/vendor" />} />

            {/* ── Master Data (internal only) ── */}
            <Route path="master-data" element={<InternalGuard><MasterDataPage /></InternalGuard>} />

            {/* ── Admin (role guard) ── */}
            <Route path="admin/rbac" element={<RoleGuard allowedRoles={ADMIN_ONLY}><RbacPage /></RoleGuard>} />
            <Route path="admin/verification" element={<RoleGuard allowedRoles={ADMIN_ONLY}><AdminVerificationPage /></RoleGuard>} />
            <Route path="admin/workflow" element={<RoleGuard allowedRoles={ADMIN_ONLY}><WorkflowConfigPage /></RoleGuard>} />
            <Route path="admin/delegation" element={<RoleGuard allowedRoles={[...ADMIN_ONLY, ...PAYROLL_ROLES]}><DelegationPage /></RoleGuard>} />

            {/* ── Contract Management — nested layout with top-bar tabs ── */}
            <Route path="modules/contract-management" element={<RoleGuard allowedRoles={[...EXPENDITURE_ROLES, "role-auditor"]}><ContractManagementLayout /></RoleGuard>}>
              <Route index element={<Navigate to="creation" replace />} />
              <Route path="creation" element={<ContractCreationPage />} />
              <Route path="amendment" element={<ContractAmendmentPage />} />
              <Route path="advances" element={<AdvancesPage />} />
              <Route path="invoice-bill" element={<InvoiceBillPage />} />
              <Route path="lifecycle" element={<ContractLifecyclePage />} />
              <Route path="extension" element={<ContractExtensionPage />} />
              <Route path="closure" element={<ContractClosurePage />} />
              <Route path="sanction" element={<SanctionManagementPage />} />
            </Route>

            {/* ── Legacy contract routes → redirect to new unified paths ── */}
            <Route path="modules/contract-creation" element={<AgencyRedirect to="/modules/contract-management/creation" />} />
            <Route path="modules/contract-amendment" element={<AgencyRedirect to="/modules/contract-management/amendment" />} />
            <Route path="modules/advances" element={<AgencyRedirect to="/modules/contract-management/advances" />} />
            <Route path="modules/invoice-bill" element={<AgencyRedirect to="/modules/contract-management/invoice-bill" />} />
            <Route path="modules/contract-lifecycle" element={<AgencyRedirect to="/modules/contract-management/lifecycle" />} />
            <Route path="modules/contract-extension" element={<AgencyRedirect to="/modules/contract-management/extension" />} />
            <Route path="modules/contract-closure" element={<AgencyRedirect to="/modules/contract-management/closure" />} />
            <Route path="modules/sanction-management" element={<AgencyRedirect to="/modules/contract-management/sanction" />} />

            {/* ── Recurring Vendor Payments — nested layout with top-bar tabs ── */}
            <Route path="modules/recurring-vendor-payments" element={<RoleGuard allowedRoles={[...EXPENDITURE_ROLES, "role-auditor"]}><RecurringVendorPaymentLayout /></RoleGuard>}>
              <Route index element={<Navigate to="utility" replace />} />
              <Route path="utility" element={<UtilityManagementPage />} />
              <Route path="rental" element={<RentalPaymentPage />} />
              <Route path="debt" element={<DebtPaymentPage />} />
              <Route path="soe-fund-transfer" element={<SoeFundTransferPage />} />
              <Route path="financial-inst" element={<FinancialInstitutionPage />} />
              <Route path="social-benefit" element={<SocialBenefitStipendPage />} />
              <Route path="subscriptions" element={<SubscriptionsContributionsPage />} />
              <Route path="retention" element={<RetentionMoneyPage />} />
              <Route path="vendor" element={<VendorManagementPage />} />
              <Route path="muster-roll-wages" element={<MusterRollWagesPage />} />
            </Route>

            {/* ── Legacy recurring vendor routes → redirect to new unified paths ── */}
            <Route path="modules/utility-management" element={<AgencyRedirect to="/modules/recurring-vendor-payments/utility" />} />
            <Route path="modules/rental-payment" element={<AgencyRedirect to="/modules/recurring-vendor-payments/rental" />} />
            <Route path="modules/debt-payment" element={<AgencyRedirect to="/modules/recurring-vendor-payments/debt" />} />
            <Route path="modules/soe-fund-transfer" element={<AgencyRedirect to="/modules/recurring-vendor-payments/soe-fund-transfer" />} />
            <Route path="modules/financial-institution" element={<AgencyRedirect to="/modules/recurring-vendor-payments/financial-inst" />} />
            <Route path="modules/social-benefit-stipend" element={<AgencyRedirect to="/modules/recurring-vendor-payments/social-benefit" />} />
            <Route path="modules/subscriptions-contributions" element={<AgencyRedirect to="/modules/recurring-vendor-payments/subscriptions" />} />
            <Route path="modules/retention-money" element={<AgencyRedirect to="/modules/recurring-vendor-payments/retention" />} />
            <Route path="modules/muster-roll-wages" element={<AgencyRedirect to="/modules/recurring-vendor-payments/muster-roll-wages" />} />

            {/* ── Payroll (HR, Finance, HoA, Admin) — lazy-loaded with error boundary ── */}
            <Route path="payroll/management" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollLazyPage title="Payroll Management"><PayrollManagementPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/travel-claims" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="Travel Claims"><PayrollTravelClaimsHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/remittances" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="Remittances"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/employees" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Employee Registry"><EmployeeRegistryPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/employee-allowances" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Allowance of Employee"><EmployeeAllowancePage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/employee-pay-scales" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Pay Scale for Employee"><EmployeePayScalePage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/hr-actions" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="HR Actions"><CsHrActionsPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/pay-fixation" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Pay Fixation"><CsHrActionsPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/arrears" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Arrears"><CsHrActionsPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/rejoin" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Re-join"><CsHrActionsPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/allowance-config" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Allowance Config"><AllowanceConfigPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/pay-scale" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollLazyPage title="Pay Scale Master"><PayScaleMasterPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/schedule" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Payroll Schedule"><PayrollSchedulePage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/paybill" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollLazyPage title="Paybill Standard"><PaybillStandardPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/generation" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Payroll Generation"><PayrollGenerationPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/salary-advance" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Salary Advance"><SalaryAdvancePage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/payslip" element={<RoleGuard allowedRoles={PAYROLL_ROLES}><PayrollScopeGuard requiredCategory="civil-servant"><PayrollLazyPage title="Payslip Generation"><PayslipGenerationPage category="civil-servant" /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            {/* ── Remittances & Payslip group (CS) — every stream lands on the shared Remittances Hub ── */}
            <Route path="payroll/recoveries" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="Paybill Recoveries"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/cm-report" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="Report to Cash Mgmt"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/remittance/pf" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="PF (NPPF)"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/remittance/gis" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="GIS (RICBL)"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/remittance/drc" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="TDS & HC (DRC)"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/remittance/rent" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="House Rent"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/remittance/csws" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="CSWS"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/remittance/audit" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="Audit Recoveries"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/musterroll" element={<AgencyRedirect to="/modules/recurring-vendor-payments/muster-roll-wages" />} />
            <Route path="payroll/musterroll-payment" element={<AgencyRedirect to="/modules/recurring-vendor-payments/muster-roll-wages" />} />
            <Route path="payroll/sitting-fee" element={<AgencyRedirect to="/modules/recurring-vendor-payments/muster-roll-wages" />} />

            {/* ── OPS Payroll — lazy-loaded with error boundary ── */}
            <Route path="payroll/ops" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Dashboard"><OpsPayrollDashboard /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/employees" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Employees"><OpsEmployeeRegistryPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/allowance-config" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Allowance Config"><OpsAllowanceConfigPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/schedule" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Schedule"><OpsScheduleConfigPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/generation" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Generation"><OpsPayrollGenerationPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/salary-advance" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Salary Advance"><OpsSalaryAdvancePage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/travel-claims" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Travel Claims"><OpsTravelClaimPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/musterroll" element={<AgencyRedirect to="/modules/recurring-vendor-payments/muster-roll-wages" />} />
            <Route path="payroll/ops/sitting-fee" element={<AgencyRedirect to="/modules/recurring-vendor-payments/muster-roll-wages" />} />
            <Route path="payroll/ops/hr-actions" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS HR Actions"><OpsHrActionsPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/retirement-benefits" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Retirement"><OpsRetirementBenefitsPage /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            <Route path="payroll/ops/payslip" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollScopeGuard requiredCategory="other-public-servant"><PayrollLazyPage title="OPS Payslip Generation"><PayslipGenerationPage category="other-public-servant" /></PayrollLazyPage></PayrollScopeGuard></RoleGuard>} />
            {/* ── Remittances & Payslip group (OPS) — shared Remittances Hub ── */}
            <Route path="payroll/ops/recoveries" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="OPS Paybill Recoveries"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/ops/cm-report" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="OPS Report to Cash Mgmt"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/ops/remittance/pf" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="OPS PF (NPPF)"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/ops/remittance/gis" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="OPS GIS (RICBL)"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/ops/remittance/drc" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="OPS TDS & HC (DRC)"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/ops/remittance/rent" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="OPS House Rent"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />
            <Route path="payroll/ops/remittance/audit" element={<RoleGuard allowedRoles={[...PAYROLL_ROLES, "role-auditor"]}><PayrollLazyPage title="OPS Audit Recoveries"><PayrollRemittancesHubPage /></PayrollLazyPage></RoleGuard>} />

            {/* ── Public self-service ── */}
            <Route path="public/payslip" element={<PublicPayslipPage />} />
            <Route path="public/salary-advance" element={<LazyPage title="Salary Advance"><SalaryAdvancePage /></LazyPage>} />
            <Route path="public/documents" element={<PublicDocumentsPage />} />
            <Route path="public/submissions" element={<PublicDocumentsPage />} />
            <Route path="public/help" element={<ModulePage />} />
            <Route path="public/contractor-profile" element={<ContractorProfilePage />} />
            <Route path="public/payment-status" element={<PaymentStatusPage />} />
            <Route path="public/my-contracts" element={<MyContractsPage />} />
            <Route path="public/invoice-submission" element={<InvoiceSubmissionPage />} />

            {/* ── Muster Roll Beneficiary ── */}
            <Route path="public/muster-roll-register" element={<MusterRollPublicRegistrationPage />} />
            <Route path="public/muster-roll-approvals" element={<MusterRollApprovalsPage />} />
            <Route path="modules/muster-roll-clearance" element={<MusterRollApprovalsPage />} />
            <Route path="muster-roll/profile" element={<MusterRollPublicRegistrationPage />} />
            <Route path="muster-roll/payments" element={<ModulePage />} />
            <Route path="muster-roll/wage-history" element={<ModulePage />} />

            {/* ── Financial Institution Portal ── */}
            <Route path="fi/register" element={<FIPortalPage />} />
            <Route path="fi/profile" element={<FIPortalPage />} />
            <Route path="fi/cbs-config" element={<FIPortalPage />} />
            <Route path="fi/bill-discounting" element={<FIPortalPage />} />
            <Route path="fi/verification-queue" element={<FIPortalPage />} />
            <Route path="fi/payment-orders" element={<FIPortalPage />} />
            <Route path="fi/settlements" element={<FIPortalPage />} />
            <Route path="fi/reconciliation" element={<FIPortalPage />} />
            <Route path="fi/reports" element={<FIPortalPage />} />

            <Route path="modules/:moduleSlug" element={<ModulePage />} />

            {/* Catch unknown sub-routes within agency scope → home */}
            <Route path="*" element={<AgencyRedirect to="/" />} />
          </Route>

          {/* Catch-all → redirect to root which sends to correct agency prefix */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
        </MusterRollBeneficiaryProvider>
        </UtilityDataProvider>
        </SubmittedInvoiceProvider>
        </ContractDataProvider>
      </ContractorDataProvider>
    </MasterDataProvider>
  );
}
