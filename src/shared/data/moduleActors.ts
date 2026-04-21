/* ═══════════════════════════════════════════════════════════════════════════
   Module Actor Registry
   ─────────────────────
   Central metadata mapping every IFMIS module to its:
     • Eligible roles (who can access it)
     • Workflow steps (who does what)
     • Actor descriptions (human-readable role explanations)

   Used by:
     1. Sidebar actor preview (hover/expand on module groups)
     2. Module page actor banner (top of each page)
     3. RBAC admin panel (dynamic module ↔ role mapping)

   Data is derived from the SRS Process Descriptions + RBAC seed.
   Modules that are admin-created (dynamic) will appear here once
   registered through the RBAC UI.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Types ─────────────────────────────────────────────────────────────── */
export interface WorkflowActor {
  roleId: string;
  roleName: string;
  stepKind: "Initiator" | "Reviewer" | "Approver" | string;
  description: string;
}

export interface ModuleActorInfo {
  /** Module key — matches sidebar route or group key */
  moduleKey: string;
  /** Human-readable module name */
  moduleName: string;
  /** SRS reference (e.g. "PRN 1.1") */
  srsRef?: string;
  /** Module category */
  category: "contractor" | "expenditure" | "payroll" | "admin" | "public";
  /** Short description of the module's purpose */
  purpose: string;
  /** Ordered workflow actors: who does what in which step */
  actors: WorkflowActor[];
  /** Role IDs that can VIEW this module (superset of actors) */
  viewerRoleIds: string[];
}

/* ── Role constants ────────────────────────────────────────────────────── */
const R = {
  ADMIN:   "role-admin",
  HOA:     "role-head-of-agency",
  FIN:     "role-finance-officer",
  PROC:    "role-procurement",
  STAFF:   "role-agency-staff",
  NORMAL:  "role-normal-user",
  AUDITOR: "role-auditor",
  HR:      "role-hr-officer",
  PUBLIC:  "role-public",
} as const;

/* ── Registry ─────────────────────────────────────────────────────────── */
export const MODULE_ACTORS: ModuleActorInfo[] = [

  /* ════════════════════════════════════════════════════════════════════════
     CONTRACTOR
     ════════════════════════════════════════════════════════════════════ */
  {
    moduleKey: "contractor-registration",
    moduleName: "Contractor Registration",
    srsRef: "PRN 1.1",
    category: "contractor",
    purpose: "Register new individual or business contractors in IFMIS. Public users self-register; Procurement reviews; HoA approves.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Public User / Contractor", stepKind: "Initiator", description: "Self-registers via public portal with CID, licence, trade details" },
      { roleId: R.STAFF,  roleName: "Agency Staff",             stepKind: "Initiator", description: "Registers contractors on behalf of agency" },
      { roleId: R.PROC,   roleName: "Procurement Officer",      stepKind: "Reviewer",  description: "Verifies documents, cross-checks CDB, validates licence" },
      { roleId: R.HOA,    roleName: "Head of Agency",           stepKind: "Approver",  description: "Final approval for contractor registration" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR, R.PUBLIC],
  },
  {
    moduleKey: "contractor-management",
    moduleName: "Contractor Management",
    srsRef: "PRN 1.3",
    category: "contractor",
    purpose: "Manage active contractors — suspension, blacklisting, status updates, and performance tracking.",
    actors: [
      { roleId: R.PROC,   roleName: "Procurement Officer", stepKind: "Initiator", description: "Initiates suspension/blacklist actions" },
      { roleId: R.FIN,    roleName: "Finance Officer",     stepKind: "Reviewer",  description: "Reviews financial standing and pending payments" },
      { roleId: R.HOA,    roleName: "Head of Agency",      stepKind: "Approver",  description: "Approves suspension, blacklisting, or reinstatement" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "contractor-amendment",
    moduleName: "Contractor Amendment",
    srsRef: "PRN 1.2",
    category: "contractor",
    purpose: "Amend contractor details — bank accounts, addresses, licences, classifications, and contact information.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Contractor",          stepKind: "Initiator", description: "Submits amendment request with supporting documents" },
      { roleId: R.PROC,   roleName: "Procurement Officer", stepKind: "Reviewer",  description: "Validates amendment documents and cross-checks" },
      { roleId: R.HOA,    roleName: "Head of Agency",      stepKind: "Approver",  description: "Final approval for contractor data changes" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR, R.PUBLIC],
  },

  /* ════════════════════════════════════════════════════════════════════════
     EXPENDITURE — Contract Management
     ════════════════════════════════════════════════════════════════════ */
  {
    moduleKey: "contract-creation",
    moduleName: "Contract Creation",
    srsRef: "PRN 2.1",
    category: "expenditure",
    purpose: "Create new contracts from awarded works/goods/services. Agency Staff initiates; Finance reviews budget; HoA approves.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",     stepKind: "Initiator", description: "Creates contract with all header and line data" },
      { roleId: R.FIN,   roleName: "Finance Officer",  stepKind: "Reviewer",  description: "Verifies budget availability, UCoA codes, and financial terms" },
      { roleId: R.HOA,   roleName: "Head of Agency",   stepKind: "Approver",  description: "Signs off on the contract as the authorised signatory" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "advances",
    moduleName: "Advances",
    srsRef: "PRN 3",
    category: "expenditure",
    purpose: "Manage mobilisation, material, and secured advances. Agency Staff initiates; Finance reviews; HoA approves.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Originates advance request with justification" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Reviews advance amount, budget, and recovery schedule" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves advance disbursement" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "invoice-bill",
    moduleName: "Invoice & Bill",
    srsRef: "PRN 3",
    category: "expenditure",
    purpose: "Submit, verify, and approve contractor invoices and generate bills for payment.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Contractor",      stepKind: "Initiator", description: "Submits invoice against contract milestones" },
      { roleId: R.STAFF,  roleName: "Agency Staff",    stepKind: "Initiator", description: "Creates bill from verified invoice" },
      { roleId: R.FIN,    roleName: "Finance Officer", stepKind: "Reviewer",  description: "Verifies invoice amounts, deductions, and generates PO" },
      { roleId: R.HOA,    roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves bill for payment release" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR, R.PUBLIC],
  },
  {
    moduleKey: "contract-lifecycle",
    moduleName: "Contract Lifecycle",
    category: "expenditure",
    purpose: "Dashboard tracking contract status, milestones, completion, and financial summary.",
    actors: [
      { roleId: R.FIN, roleName: "Finance Officer", stepKind: "Reviewer", description: "Monitors contract financial performance" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "contract-extension",
    moduleName: "Contract Extension",
    category: "expenditure",
    purpose: "Extend contract timelines with justification. Agency Staff initiates; Finance reviews; HoA approves.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Submits extension request with revised schedule" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Reviews financial implications of the extension" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves timeline extension" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "contract-closure",
    moduleName: "Contract Closure",
    category: "expenditure",
    purpose: "Close completed contracts with final settlement. Finance initiates; HoA approves closure and retention release.",
    actors: [
      { roleId: R.FIN, roleName: "Finance Officer", stepKind: "Initiator", description: "Prepares closure with final accounts reconciliation" },
      { roleId: R.HOA, roleName: "Head of Agency",  stepKind: "Approver",  description: "Signs off on contract closure and retention release" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.AUDITOR],
  },
  {
    moduleKey: "sanction-management",
    moduleName: "Sanction Management",
    srsRef: "PRN 4",
    category: "expenditure",
    purpose: "Manage contractor sanctions — debarment, suspension, and penalty enforcement.",
    actors: [
      { roleId: R.PROC, roleName: "Procurement Officer", stepKind: "Initiator", description: "Initiates sanction action with evidence" },
      { roleId: R.FIN,  roleName: "Finance Officer",     stepKind: "Reviewer",  description: "Reviews financial impact and pending payments" },
      { roleId: R.HOA,  roleName: "Head of Agency",      stepKind: "Approver",  description: "Approves sanction action" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.AUDITOR],
  },

  /* ════════════════════════════════════════════════════════════════════════
     EXPENDITURE — Recurring Vendor Payments
     ════════════════════════════════════════════════════════════════════ */
  {
    moduleKey: "utility-management",
    moduleName: "Utility & Service Payment",
    srsRef: "PRN 5.1",
    category: "expenditure",
    purpose: "Process utility bills — electricity, water, telecom, internet. Agency Staff initiates; Finance reviews; HoA approves.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Enters utility bill with meter reading and amount" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Verifies bill against budget head and utility agreement" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves utility payment" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "rental-payment",
    moduleName: "Rental Payment",
    srsRef: "PRN 5.1",
    category: "expenditure",
    purpose: "Process rental payments for land, buildings, and vehicles.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Records rental agreement and periodic payment" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Verifies lease terms and budget allocation" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves rental payment" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "debt-payment",
    moduleName: "Debt Payment Management",
    srsRef: "PRN 6.1",
    category: "expenditure",
    purpose: "Service government debt — loan repayments, interest, donor obligations.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Captures donor/lender details and payment schedule" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Generates payment orders and validates exchange rates" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Authorises Meridian sync and payment release" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "soe-fund-transfer",
    moduleName: "SOE & Fund Transfer",
    srsRef: "PRN 6.2",
    category: "expenditure",
    purpose: "Inter-agency fund transfers and Statement of Expenditure management.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Originates fund transfer request" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Validates budget availability and transfer rules" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves inter-agency fund transfer" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "financial-institution",
    moduleName: "Financial Institution",
    srsRef: "PRN 7.1",
    category: "expenditure",
    purpose: "Register and manage financial institutions for bill discounting and payment processing.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Financial Institution", stepKind: "Initiator", description: "Self-registers via public portal" },
      { roleId: R.FIN,    roleName: "Finance Officer",       stepKind: "Reviewer",  description: "Reviews FI credentials and compliance" },
      { roleId: R.HOA,    roleName: "Head of Agency",        stepKind: "Approver",  description: "Approves FI registration" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR, R.PUBLIC],
  },
  {
    moduleKey: "social-benefit-stipend",
    moduleName: "Social Benefits & Stipend",
    srsRef: "PRN 8.1",
    category: "expenditure",
    purpose: "Manage welfare programs, student stipends, and trainee allowances.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Submits beneficiary list and payment request" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Verifies beneficiary eligibility and budget" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves social benefit payment" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "subscriptions-contributions",
    moduleName: "Subscriptions & Contributions",
    srsRef: "PRN 9.1",
    category: "expenditure",
    purpose: "Manage subscriptions to international organisations and government contributions.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Originates subscription/contribution request" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Reviews membership terms and budget allocation" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves subscription payment" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "retention-money",
    moduleName: "Retention Money",
    srsRef: "PRN 9",
    category: "expenditure",
    purpose: "Manage retention money — DLP release and default forfeiture.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",    stepKind: "Initiator", description: "Initiates retention release or forfeiture" },
      { roleId: R.FIN,   roleName: "Finance Officer", stepKind: "Reviewer",  description: "Verifies DLP period and contract compliance" },
      { roleId: R.HOA,   roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves retention action" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.STAFF, R.NORMAL, R.AUDITOR],
  },
  {
    moduleKey: "vendor-management",
    moduleName: "Vendor Management",
    srsRef: "Exp SRS",
    category: "expenditure",
    purpose: "Register and manage non-contractual vendors for recurring payments.",
    actors: [
      { roleId: R.STAFF, roleName: "Agency Staff",         stepKind: "Initiator", description: "Registers vendor with banking and tax details" },
      { roleId: R.PROC,  roleName: "Procurement Officer",  stepKind: "Reviewer",  description: "Validates vendor credentials" },
      { roleId: R.FIN,   roleName: "Finance Officer",      stepKind: "Approver",  description: "Approves vendor for payment processing" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.PROC, R.STAFF, R.NORMAL, R.AUDITOR],
  },

  /* ════════════════════════════════════════════════════════════════════════
     PAYROLL
     ════════════════════════════════════════════════════════════════════ */
  {
    moduleKey: "employee-master",
    moduleName: "Employee Master",
    srsRef: "PRN 1.1",
    category: "payroll",
    purpose: "Employee registry synced from ZESt HR — manage employee data, position levels, and pay scales.",
    actors: [
      { roleId: R.HR,  roleName: "HR Officer",       stepKind: "Initiator", description: "Syncs employee data from ZESt, manages records" },
      { roleId: R.FIN, roleName: "Finance Officer",  stepKind: "Reviewer",  description: "Reviews employee financial data and bank details" },
      { roleId: R.HOA, roleName: "Head of Agency",   stepKind: "Approver",  description: "Approves employee master changes" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.HR, R.AUDITOR],
  },
  {
    moduleKey: "allowance-config",
    moduleName: "Allowance & Deduction Config",
    srsRef: "PRN 1.2",
    category: "payroll",
    purpose: "Configure allowance and deduction rules — UCoA mapped, used in payroll computation.",
    actors: [
      { roleId: R.HR,  roleName: "HR Officer",       stepKind: "Initiator", description: "Configures allowance/deduction master (LE, LTC, PF, GIS, etc.)" },
      { roleId: R.FIN, roleName: "Finance Officer",  stepKind: "Reviewer",  description: "Validates UCoA mapping and budget heads" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.HR, R.AUDITOR],
  },
  {
    moduleKey: "payroll-schedule",
    moduleName: "Payroll Schedule",
    srsRef: "PRN 2.0",
    category: "payroll",
    purpose: "Set payroll calendar, data-freeze dates, and processing deadlines.",
    actors: [
      { roleId: R.HR,  roleName: "HR Officer",       stepKind: "Initiator", description: "Sets payroll schedule, holidays, and freeze dates" },
      { roleId: R.FIN, roleName: "Finance Officer",  stepKind: "Reviewer",  description: "Confirms schedule aligns with fiscal calendar" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.HR, R.AUDITOR],
  },
  {
    moduleKey: "payroll-generation",
    moduleName: "Payroll Generation",
    srsRef: "PRN 2.1",
    category: "payroll",
    purpose: "6-step payroll run: Select Dept → Confirm Data → System Checks → Draft PayBill → Finalize → POST to MCP.",
    actors: [
      { roleId: R.HR,  roleName: "HR Officer",      stepKind: "Initiator", description: "Selects department, confirms employee data, runs system checks, drafts paybill" },
      { roleId: R.FIN, roleName: "Finance Officer", stepKind: "Reviewer",  description: "Reviews paybill computations and UCoA postings" },
      { roleId: R.HOA, roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves final paybill and authorises MCP journal posting" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.HR, R.AUDITOR],
  },
  {
    moduleKey: "salary-advance",
    moduleName: "Salary Advance",
    srsRef: "PRN 3.1",
    category: "payroll",
    purpose: "Process salary advance requests with recovery tracking.",
    actors: [
      { roleId: R.HR,  roleName: "HR Officer",      stepKind: "Initiator", description: "Creates advance request on behalf of employee" },
      { roleId: R.FIN, roleName: "Finance Officer", stepKind: "Reviewer",  description: "Validates advance amount against rules (max 2 months)" },
      { roleId: R.HOA, roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves salary advance disbursement" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.HR, R.AUDITOR],
  },
  {
    moduleKey: "muster-roll",
    moduleName: "Muster Roll",
    srsRef: "PRN 6.1-7.1",
    category: "payroll",
    purpose: "Create muster rolls for daily-wage workers, process attendance, and generate payments.",
    actors: [
      { roleId: R.HR,  roleName: "HR Officer",      stepKind: "Initiator", description: "Creates muster roll with project and beneficiary data" },
      { roleId: R.FIN, roleName: "Finance Officer", stepKind: "Reviewer",  description: "Validates payment computation and budget availability" },
      { roleId: R.HOA, roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves muster roll payment" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.HR, R.AUDITOR],
  },
  {
    moduleKey: "sitting-fee",
    moduleName: "Sitting Fee & Honorarium",
    srsRef: "PRN 8.1",
    category: "payroll",
    purpose: "Process sitting fees for committee members and honorarium payments.",
    actors: [
      { roleId: R.HR,  roleName: "HR Officer",      stepKind: "Initiator", description: "Onboards beneficiaries and records attendance" },
      { roleId: R.FIN, roleName: "Finance Officer", stepKind: "Reviewer",  description: "Reviews payment calculations and deductions" },
      { roleId: R.HOA, roleName: "Head of Agency",  stepKind: "Approver",  description: "Approves sitting fee / honorarium payment" },
    ],
    viewerRoleIds: [R.ADMIN, R.HOA, R.FIN, R.HR, R.AUDITOR],
  },

  /* ════════════════════════════════════════════════════════════════════════
     PUBLIC SELF-SERVICE
     ════════════════════════════════════════════════════════════════════ */
  {
    moduleKey: "public-contractor-registration",
    moduleName: "Contractor Self-Registration",
    category: "public",
    purpose: "Self-service contractor registration with CID verification, licence upload, and trade classification.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Public User",          stepKind: "Initiator", description: "Fills out registration form with all required documents" },
      { roleId: R.PROC,   roleName: "Procurement Officer",  stepKind: "Reviewer",  description: "Verifies documents and CDB cross-check" },
      { roleId: R.HOA,    roleName: "Head of Agency",       stepKind: "Approver",  description: "Approves registration" },
    ],
    viewerRoleIds: [R.PUBLIC, R.ADMIN, R.PROC, R.HOA],
  },
  {
    moduleKey: "public-invoice-submission",
    moduleName: "Invoice Submission",
    category: "public",
    purpose: "Submit invoices against active contracts and track payment status.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Contractor",       stepKind: "Initiator", description: "Submits invoice with milestone evidence" },
      { roleId: R.FIN,    roleName: "Finance Officer",  stepKind: "Reviewer",  description: "Verifies invoice against contract terms" },
      { roleId: R.HOA,    roleName: "Head of Agency",   stepKind: "Approver",  description: "Approves payment" },
    ],
    viewerRoleIds: [R.PUBLIC, R.ADMIN, R.FIN, R.HOA],
  },
  {
    moduleKey: "public-payslip",
    moduleName: "My Payslip",
    category: "public",
    purpose: "View and download monthly payslip with full breakdown of earnings and deductions.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Employee (Self-Service)", stepKind: "Initiator", description: "Views own payslip after authentication" },
    ],
    viewerRoleIds: [R.PUBLIC, R.ADMIN],
  },
  {
    moduleKey: "public-fi-registration",
    moduleName: "FI Registration",
    srsRef: "PRN 7.1",
    category: "public",
    purpose: "Financial institutions register for bill discounting and payment processing services.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Financial Institution", stepKind: "Initiator", description: "Self-registers with banking licence and regulatory details" },
      { roleId: R.FIN,    roleName: "Finance Officer",       stepKind: "Reviewer",  description: "Reviews FI credentials" },
      { roleId: R.HOA,    roleName: "Head of Agency",        stepKind: "Approver",  description: "Approves FI registration" },
    ],
    viewerRoleIds: [R.PUBLIC, R.ADMIN, R.FIN, R.HOA],
  },
  {
    moduleKey: "public-document-upload",
    moduleName: "Document Upload",
    category: "public",
    purpose: "Upload supporting documents for registration, amendments, and invoice submissions.",
    actors: [
      { roleId: R.PUBLIC, roleName: "Public User", stepKind: "Initiator", description: "Uploads documents against active submissions" },
    ],
    viewerRoleIds: [R.PUBLIC, R.ADMIN],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   AGENCY-SPECIFIC WORKFLOW OVERRIDES
   Some agencies have different workflow actors than the default.
   Key format: "agencyCode::moduleKey" → partial ModuleActorInfo
   ═══════════════════════════════════════════════════════════════════════════ */
const AGENCY_MODULE_OVERRIDES: Record<string, Pick<ModuleActorInfo, "actors" | "purpose">> = {
  /* GovTech (Code 70): leaner workflow — Accountant initiates, Head of Finance approves */
  "70::employee-master": {
    purpose: "Employee registry synced from ZESt HR — manage employee data, position levels, and pay scales.",
    actors: [
      { roleId: R.FIN,  roleName: "Accountant",       stepKind: "Initiator", description: "Manages employee records, syncs data from ZESt, maintains pay details" },
      { roleId: R.HOA,  roleName: "Head of Finance",   stepKind: "Approver",  description: "Reviews and approves employee master changes and payroll data" },
    ],
  },
  "70::allowance-config": {
    purpose: "Configure allowance and deduction rules — UCoA mapped, used in payroll computation.",
    actors: [
      { roleId: R.FIN,  roleName: "Accountant",       stepKind: "Initiator", description: "Configures allowance/deduction master (LE, LTC, PF, GIS, etc.)" },
      { roleId: R.HOA,  roleName: "Head of Finance",   stepKind: "Approver",  description: "Validates UCoA mapping and approves configuration changes" },
    ],
  },
  "70::payroll-generation": {
    purpose: "Monthly payroll generation — compute, verify, and submit for approval.",
    actors: [
      { roleId: R.FIN,  roleName: "Accountant",       stepKind: "Initiator", description: "Generates monthly payroll, verifies computations" },
      { roleId: R.HOA,  roleName: "Head of Finance",   stepKind: "Approver",  description: "Reviews and approves payroll for payment processing" },
    ],
  },
};

/* ── Lookup helpers ────────────────────────────────────────────────────── */

/** Get actor info for a specific module by key, with optional agency-specific overrides */
export function getModuleActors(moduleKey: string, agencyCode?: string): ModuleActorInfo | undefined {
  const base = MODULE_ACTORS.find((m) => m.moduleKey === moduleKey);
  if (!base || !agencyCode) return base;
  const overrideKey = `${agencyCode}::${moduleKey}`;
  const override = AGENCY_MODULE_OVERRIDES[overrideKey];
  if (!override) return base;
  return { ...base, ...override };
}

/** Get all modules a specific role can participate in (as an actor) */
export function getModulesForRole(roleId: string): ModuleActorInfo[] {
  return MODULE_ACTORS.filter(
    (m) => m.actors.some((a) => a.roleId === roleId) || m.viewerRoleIds.includes(roleId)
  );
}

/** Get all modules in a category */
export function getModulesByCategory(category: ModuleActorInfo["category"]): ModuleActorInfo[] {
  return MODULE_ACTORS.filter((m) => m.category === category);
}

/** Get actor info for a specific role within a module */
export function getRoleInModule(moduleKey: string, roleId: string): WorkflowActor | undefined {
  const mod = getModuleActors(moduleKey);
  return mod?.actors.find((a) => a.roleId === roleId);
}

/** Check if a role is an active actor (not just viewer) in a module */
export function isActorInModule(moduleKey: string, roleId: string, agencyCode?: string): boolean {
  const mod = getModuleActors(moduleKey, agencyCode);
  return mod?.actors.some((a) => a.roleId === roleId) ?? false;
}

/** Group key mapping: maps sidebar group keys to module keys for preview */
export const GROUP_TO_MODULES: Record<string, string[]> = {
  "contractor": ["contractor-registration", "contractor-management", "contractor-amendment"],
  "contract-mgmt": ["contract-creation", "advances", "invoice-bill", "contract-lifecycle", "contract-extension", "contract-closure", "sanction-management"],
  "recurring-vendor-payments": ["utility-management", "rental-payment", "debt-payment", "soe-fund-transfer", "financial-institution", "social-benefit-stipend", "subscriptions-contributions", "retention-money", "vendor-management"],
  "payroll-employee": ["employee-master", "allowance-config"],
  "payroll-processing": ["payroll-generation", "salary-advance", "payroll-schedule"],
  "payroll-musterroll": ["muster-roll", "sitting-fee"],
  "public-registration": ["public-contractor-registration", "public-fi-registration", "public-document-upload"],
  "public-invoices": ["public-invoice-submission", "public-payslip"],
};

/** Get unique actors across all modules in a sidebar group */
export function getGroupActors(groupKey: string): { roleId: string; roleName: string; stepKinds: string[] }[] {
  const moduleKeys = GROUP_TO_MODULES[groupKey] ?? [];
  const roleMap = new Map<string, { roleName: string; stepKinds: Set<string> }>();

  for (const mKey of moduleKeys) {
    const mod = getModuleActors(mKey);
    if (!mod) continue;
    for (const actor of mod.actors) {
      const existing = roleMap.get(actor.roleId);
      if (existing) {
        existing.stepKinds.add(actor.stepKind);
      } else {
        roleMap.set(actor.roleId, { roleName: actor.roleName, stepKinds: new Set([actor.stepKind]) });
      }
    }
  }

  return Array.from(roleMap.entries()).map(([roleId, data]) => ({
    roleId,
    roleName: data.roleName,
    stepKinds: Array.from(data.stepKinds),
  }));
}

/* ── Dynamic module support (for admin-created modules) ────────────────── */
const CUSTOM_MODULES_KEY = "ifmis_custom_modules";

export function getCustomModules(): ModuleActorInfo[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CUSTOM_MODULES_KEY) ?? "[]");
  } catch { return []; }
}

export function writeCustomModules(modules: ModuleActorInfo[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_MODULES_KEY, JSON.stringify(modules));
}

/** Get ALL modules including custom ones */
export function getAllModules(): ModuleActorInfo[] {
  return [...MODULE_ACTORS, ...getCustomModules()];
}
