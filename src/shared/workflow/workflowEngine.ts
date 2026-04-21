/* ═══════════════════════════════════════════════════════════════════════════
   IFMIS — Shared Workflow Engine
   Fully dynamic, RBAC-driven, localStorage-persistent workflow system.
   Every expenditure module uses this engine instead of hardcoded chains.
   ═══════════════════════════════════════════════════════════════════════════ */

import { getStoredRoles, resolvePermissionIds, seedRoles, type Role } from "../../modules/admin/rbac/rbacData";

/* ── Core Types ────────────────────────────────────────────────────────── */

export type WorkflowStepStatus = "pending" | "approved" | "rejected" | "skipped" | "on-hold";

export interface WorkflowStepConfig {
  key: string;
  level: number;
  label: string;
  permissionId: string;
  preferredRoleIds: string[];
  srsReference: string;
  isConditional?: boolean;
  conditionLabel?: string;
  slaHours?: number;
  canSkip?: boolean;
}

export interface WorkflowStepRuntime {
  key: string;
  level: number;
  label: string;
  role: string;
  roleIds: string[];
  requiredPermissionId: string;
  policyReference: string;
  assignee?: string;
  status: WorkflowStepStatus;
  actionAt?: string;
  actionBy?: string;
  remarks?: string;
  slaHours: number;
  canSkip: boolean;
  isConditional: boolean;
  conditionLabel: string;
}

export interface ModuleWorkflowConfig {
  moduleKey: string;
  moduleLabel: string;
  srsSection: string;
  steps: WorkflowStepConfig[];
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface WorkflowInstance {
  instanceId: string;
  moduleKey: string;
  entityId: string;
  steps: WorkflowStepRuntime[];
  currentLevel: number;
  overallStatus: "draft" | "in-progress" | "approved" | "rejected" | "on-hold" | "cancelled";
  startedAt: string;
  completedAt?: string;
  auditTrail: WorkflowAuditEntry[];
}

export interface WorkflowAuditEntry {
  action: string;
  stepKey: string;
  level: number;
  performedBy: string;
  performedByRoleIds: string[];
  performedAt: string;
  remarks?: string;
  previousStatus: string;
  newStatus: string;
}

/* ── Module Keys (all expenditure modules from SRS) ─────────────────── */

export const EXPENDITURE_MODULE_KEYS = {
  CONTRACT_CREATION: "contract_creation",
  CONTRACT_AMENDMENT: "contract_amendment",
  CONTRACT_EXTENSION: "contract_extension",
  CONTRACT_CLOSURE: "contract_closure",
  CONTRACT_LIFECYCLE: "contract_lifecycle",
  INVOICE_SUBMISSION: "invoice_submission",
  INVOICE_APPROVAL: "invoice_approval",
  BILL_PROCESSING: "bill_processing",
  BILL_DISCOUNTING: "bill_discounting",
  PAYMENT_ORDER: "payment_order",
  PAYMENT_CANCELLATION: "payment_cancellation",
  UTILITY_PAYMENT: "utility_payment",
  RENTAL_PAYMENT: "rental_payment",
  DEBT_PAYMENT: "debt_payment",
  SOE_FUND_TRANSFER: "soe_fund_transfer",
  FI_REGISTRATION: "fi_registration",
  SOCIAL_BENEFITS: "social_benefits",
  STIPEND_MANAGEMENT: "stipend_management",
  SUBSCRIPTIONS: "subscriptions_contributions",
  RETENTION_RELEASE: "retention_release",
  RETENTION_FORFEITURE: "retention_forfeiture",
  ADVANCE_CONTRACTUAL: "advance_contractual",
  ADVANCE_NON_CONTRACTUAL: "advance_non_contractual",
  VENDOR_MANAGEMENT: "vendor_management",
  SANCTION_MANAGEMENT: "sanction_management",
} as const;

export type ExpenditureModuleKey = (typeof EXPENDITURE_MODULE_KEYS)[keyof typeof EXPENDITURE_MODULE_KEYS];

/* ── localStorage Keys ─────────────────────────────────────────────── */

const WORKFLOW_CONFIG_STORAGE_KEY = "ifmis_workflow_configs";
const WORKFLOW_INSTANCES_STORAGE_KEY = "ifmis_workflow_instances";

/* ── Role Resolution (same pattern as contractorRbacPolicy.ts) ──── */

function pickRoleIds(roles: Role[], step: WorkflowStepConfig): string[] {
  const candidates = step.preferredRoleIds.filter((roleId) => {
    const permissions = resolvePermissionIds([roleId], roles);
    return permissions.includes(step.permissionId);
  });
  if (candidates.length > 0) return candidates;
  return roles
    .filter((role) => role.permissionIds.includes(step.permissionId))
    .map((role) => role.id);
}

function resolveRoleLabel(roleIds: string[], roles: Role[], fallbackLabel: string): string {
  const labels = roleIds
    .map((roleId) => roles.find((role) => role.id === roleId)?.name)
    .filter((label): label is string => Boolean(label));
  return labels.length > 0 ? labels.join(" / ") : fallbackLabel;
}

/* ── Build Runtime Workflow from Config ──────────────────────────── */

export function buildWorkflowRuntime(
  config: ModuleWorkflowConfig,
  roles: Role[] = getStoredRoles()
): WorkflowStepRuntime[] {
  const effectiveRoles = roles.length > 0 ? roles : seedRoles;
  return config.steps.map((step) => {
    const roleIds = pickRoleIds(effectiveRoles, step);
    return {
      key: step.key,
      level: step.level,
      label: step.label,
      role: resolveRoleLabel(roleIds, effectiveRoles, step.label),
      roleIds,
      requiredPermissionId: step.permissionId,
      policyReference: step.srsReference,
      status: "pending" as WorkflowStepStatus,
      slaHours: step.slaHours ?? 48,
      canSkip: step.canSkip ?? false,
      isConditional: step.isConditional ?? false,
      conditionLabel: step.conditionLabel ?? "",
    };
  });
}

/* ── Workflow Headline (e.g., "L1: Agency Staff → L2: Finance Officer → L3: Head of Agency") ── */

export function getWorkflowHeadline(config: ModuleWorkflowConfig, roles: Role[] = getStoredRoles()): string {
  const runtime = buildWorkflowRuntime(config, roles);
  return runtime.map((step) => `L${step.level}: ${step.role}`).join(" → ");
}

/* ── Can User Act on Step ────────────────────────────────────────── */

export function canActOnStep(
  step: WorkflowStepRuntime,
  userRoleIds: string[],
  userPermissionIds: string[]
): boolean {
  const roleMatch = step.roleIds.length === 0 || step.roleIds.some((id) => userRoleIds.includes(id));
  const permissionMatch = !step.requiredPermissionId || userPermissionIds.includes(step.requiredPermissionId);
  return roleMatch && permissionMatch;
}

/* ── localStorage: Workflow Configs ─────────────────────────────── */

export function getStoredWorkflowConfigs(): ModuleWorkflowConfig[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(WORKFLOW_CONFIG_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ModuleWorkflowConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredWorkflowConfigs(configs: ModuleWorkflowConfig[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKFLOW_CONFIG_STORAGE_KEY, JSON.stringify(configs));
}

export function getWorkflowConfigForModule(moduleKey: string): ModuleWorkflowConfig | undefined {
  const stored = getStoredWorkflowConfigs();
  const custom = stored.find((c) => c.moduleKey === moduleKey);
  if (custom) return custom;
  return DEFAULT_WORKFLOW_CONFIGS.find((c) => c.moduleKey === moduleKey);
}

export function saveWorkflowConfigForModule(config: ModuleWorkflowConfig) {
  const stored = getStoredWorkflowConfigs();
  const idx = stored.findIndex((c) => c.moduleKey === config.moduleKey);
  if (idx >= 0) stored[idx] = config;
  else stored.push(config);
  writeStoredWorkflowConfigs(stored);
}

export function resetWorkflowConfigToDefault(moduleKey: string) {
  const stored = getStoredWorkflowConfigs();
  const filtered = stored.filter((c) => c.moduleKey !== moduleKey);
  writeStoredWorkflowConfigs(filtered);
}

/* ── localStorage: Workflow Instances ───────────────────────────── */

export function getStoredWorkflowInstances(): WorkflowInstance[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(WORKFLOW_INSTANCES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as WorkflowInstance[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredWorkflowInstances(instances: WorkflowInstance[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKFLOW_INSTANCES_STORAGE_KEY, JSON.stringify(instances));
}

export function createWorkflowInstance(
  moduleKey: string,
  entityId: string,
  startedBy: string
): WorkflowInstance {
  const config = getWorkflowConfigForModule(moduleKey);
  if (!config) throw new Error(`No workflow config found for module: ${moduleKey}`);
  const steps = buildWorkflowRuntime(config);
  const instance: WorkflowInstance = {
    instanceId: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    moduleKey,
    entityId,
    steps,
    currentLevel: 1,
    overallStatus: "in-progress",
    startedAt: new Date().toISOString(),
    auditTrail: [{
      action: "workflow_started",
      stepKey: steps[0]?.key ?? "",
      level: 1,
      performedBy: startedBy,
      performedByRoleIds: [],
      performedAt: new Date().toISOString(),
      previousStatus: "draft",
      newStatus: "in-progress",
    }],
  };
  const all = getStoredWorkflowInstances();
  all.unshift(instance);
  writeStoredWorkflowInstances(all);
  return instance;
}

export function advanceWorkflowStep(
  instanceId: string,
  action: "approved" | "rejected" | "on-hold" | "skipped",
  performedBy: string,
  performedByRoleIds: string[],
  remarks?: string
): WorkflowInstance | null {
  const all = getStoredWorkflowInstances();
  const idx = all.findIndex((i) => i.instanceId === instanceId);
  if (idx < 0) return null;
  const instance = { ...all[idx] };
  const stepIdx = instance.steps.findIndex((s) => s.level === instance.currentLevel);
  if (stepIdx < 0) return null;

  const previousStatus = instance.steps[stepIdx].status;
  instance.steps = [...instance.steps];
  instance.steps[stepIdx] = {
    ...instance.steps[stepIdx],
    status: action,
    actionAt: new Date().toISOString(),
    actionBy: performedBy,
    remarks,
  };

  instance.auditTrail = [
    ...instance.auditTrail,
    {
      action,
      stepKey: instance.steps[stepIdx].key,
      level: instance.currentLevel,
      performedBy,
      performedByRoleIds,
      performedAt: new Date().toISOString(),
      remarks,
      previousStatus,
      newStatus: action,
    },
  ];

  if (action === "approved") {
    const nextStep = instance.steps.find((s) => s.level > instance.currentLevel && s.status === "pending");
    if (nextStep) {
      instance.currentLevel = nextStep.level;
    } else {
      instance.overallStatus = "approved";
      instance.completedAt = new Date().toISOString();
    }
  } else if (action === "rejected") {
    instance.overallStatus = "rejected";
    instance.completedAt = new Date().toISOString();
  } else if (action === "on-hold") {
    instance.overallStatus = "on-hold";
  }

  all[idx] = instance;
  writeStoredWorkflowInstances(all);
  return instance;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT WORKFLOW CONFIGS — SRS-aligned defaults for every expenditure module
   Admin can override these via the Workflow Configuration UI.
   ═══════════════════════════════════════════════════════════════════════════ */

const now = new Date().toISOString();

export const DEFAULT_WORKFLOW_CONFIGS: ModuleWorkflowConfig[] = [
  /* ── 1. Contract Creation (SRS PRN 2.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.CONTRACT_CREATION,
    moduleLabel: "Contract Creation",
    srsSection: "PRN 2.1 — Contract Creation Process",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "submitter", level: 1, label: "Contract Submitter", permissionId: "contract_creation_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "PRN 2.1.1 Step 1", slaHours: 0 },
      { key: "technical-review", level: 2, label: "Technical Approver", permissionId: "contract_creation_approve", preferredRoleIds: ["role-procurement", "role-admin"], srsReference: "PRN 2.1.2 Step 2 — Technical approver", slaHours: 48 },
      { key: "finance-review", level: 3, label: "Finance Approver", permissionId: "contract_creation_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 2.1.2 Step 2 — Finance approver", slaHours: 48 },
      { key: "implementing-agency", level: 4, label: "Implementing Agency", permissionId: "contract_creation_approve", preferredRoleIds: ["role-agency-staff", "role-admin"], srsReference: "PRN 2.1.2 Step 2 — Implementing agency (if different)", slaHours: 72, isConditional: true, conditionLabel: "Only if implementing agency differs from initiating agency", canSkip: true },
      { key: "budget-agency", level: 5, label: "Budget Owning Agency", permissionId: "contract_creation_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 2.1.2 Step 2 — Budget owning agency (if budget code belongs elsewhere)", slaHours: 72, isConditional: true, conditionLabel: "Only if budget code belongs to a different agency", canSkip: true },
    ],
  },

  /* ── 2. Contract Amendment (SRS PRN 2.2) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.CONTRACT_AMENDMENT,
    moduleLabel: "Contract Amendment",
    srsSection: "PRN 2.2 — Contract Amendment Process",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "amendment-initiator", level: 1, label: "Amendment Initiator", permissionId: "contract_amendment_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-public", "role-admin"], srsReference: "PRN 2.2.1 Step 1" },
      { key: "amendment-approver", level: 2, label: "Amendment Approver", permissionId: "contract_amendment_approve", preferredRoleIds: ["role-finance-officer", "role-procurement", "role-admin"], srsReference: "PRN 2.2.3 Step 3 — Approver" },
      { key: "implementing-agency", level: 3, label: "Implementing Agency", permissionId: "contract_amendment_approve", preferredRoleIds: ["role-agency-staff", "role-admin"], srsReference: "PRN 2.2.3 — Implementing agency (if different)", isConditional: true, conditionLabel: "Only if implementing agency differs", canSkip: true },
      { key: "budget-agency", level: 4, label: "Budget Agency", permissionId: "contract_amendment_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 2.2.3 — Budget agency (if budget impact)", isConditional: true, conditionLabel: "Only if amendment has budget impact", canSkip: true },
    ],
  },

  /* ── 3. Contract Extension (SRS PRN 2.2.3) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.CONTRACT_EXTENSION,
    moduleLabel: "Contract Extension",
    srsSection: "PRN 2.2.3 — Contract Extension Processing",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "extension-initiator", level: 1, label: "Extension Initiator", permissionId: "contract_extension_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "PRN 2.2.3 Step 1" },
      { key: "extension-approver", level: 2, label: "Extension Approver", permissionId: "contract_extension_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 2.2.3 Step 2" },
      { key: "multi-year-approver", level: 3, label: "Multi-Year Approver", permissionId: "contract_extension_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 2.2.3 — Multi-year implication flagged", isConditional: true, conditionLabel: "Only if extension creates multi-year commitment", canSkip: true },
    ],
  },

  /* ── 4. Contract Closure (SRS PRN 2.5) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.CONTRACT_CLOSURE,
    moduleLabel: "Contract Closure",
    srsSection: "PRN 2.5 — Contract Closure Process",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "closure-initiator", level: 1, label: "Closure Initiator", permissionId: "contract_closure_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "PRN 2.5 — Initiate Contract Closure" },
      { key: "closure-reviewer", level: 2, label: "Finance Reviewer", permissionId: "contract_closure_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 2.5 — Settlement of dues" },
      { key: "head-of-agency", level: 3, label: "Head of Agency", permissionId: "contract_closure_approve", preferredRoleIds: ["role-admin"], srsReference: "PRN 2.5 — Accepted by head of agency" },
    ],
  },

  /* ── 5. Invoice Submission (SRS PRN 3.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.INVOICE_SUBMISSION,
    moduleLabel: "Invoice Submission",
    srsSection: "PRN 3.1 — Invoice Submission Process",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "invoice-submitter", level: 1, label: "Invoice Submitter", permissionId: "invoice_submission_submit", preferredRoleIds: ["role-public", "role-agency-staff", "role-admin"], srsReference: "PRN 3.1.1 Step 1-8 — Contractor/Agency staff submits" },
    ],
  },

  /* ── 6. Invoice Approval (SRS PRN 3.1 Step 9-16) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.INVOICE_APPROVAL,
    moduleLabel: "Invoice Approval",
    srsSection: "PRN 3.1 Steps 9-16 — Invoice Review, Verification & Approval",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "technical-verification", level: 1, label: "Technical Verification", permissionId: "invoice_approval_approve", preferredRoleIds: ["role-procurement", "role-agency-staff", "role-admin"], srsReference: "PRN 3.1 Step 9 — Technical check, ESG tagging", slaHours: 48 },
      { key: "financial-check", level: 2, label: "Financial Verification", permissionId: "invoice_approval_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 3.1 Step 14-15 — Budget/commitment check, deductions computation", slaHours: 48 },
      { key: "dept-head-approval", level: 3, label: "Department Head", permissionId: "invoice_approval_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 3.1 Step 16 — Approval for payment", slaHours: 24 },
      { key: "agency-head-approval", level: 4, label: "Agency Head", permissionId: "invoice_approval_approve", preferredRoleIds: ["role-admin"], srsReference: "PRN 3.1 Step 16 — Final agency head sign-off", slaHours: 24, isConditional: true, conditionLabel: "Required for high-value invoices per agency policy", canSkip: true },
    ],
  },

  /* ── 7. Bill Processing (SRS PRN 3.2) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.BILL_PROCESSING,
    moduleLabel: "Bill Processing",
    srsSection: "PRN 3.2 — Bill Processing",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "bill-creator", level: 1, label: "Bill Creator", permissionId: "bill_processing_create", preferredRoleIds: ["role-agency-staff", "role-finance-officer", "role-admin"], srsReference: "PRN 3.2.1 — Bill creation from approved invoice" },
      { key: "bill-verifier", level: 2, label: "Bill Verifier (Dual Authorization)", permissionId: "bill_processing_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 3.2.2 — Verification + ESG framework" },
      { key: "bill-approver", level: 3, label: "Bill Approver", permissionId: "bill_processing_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 3.2.2 — Final bill approval" },
    ],
  },

  /* ── 8. Bill Discounting (SRS PRN 2.4 / 3.3) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.BILL_DISCOUNTING,
    moduleLabel: "Bill Discounting",
    srsSection: "PRN 2.4 / 3.3 — Bill Discounting Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "discount-initiator", level: 1, label: "Contractor Initiator", permissionId: "bill_discounting_submit", preferredRoleIds: ["role-public", "role-admin"], srsReference: "PRN 3.3 Step 11-12 — Contractor opts for bill discounting" },
      { key: "agency-reviewer", level: 2, label: "Agency Reviewer", permissionId: "bill_discounting_approve", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "PRN 3.3 Step 13 — Accept/return transaction" },
      { key: "agency-approver", level: 3, label: "Agency Approver", permissionId: "bill_discounting_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 3.3 Step 13 — Approval per configurable workflow" },
    ],
  },

  /* ── 9. Payment Order (SRS PRN 4.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.PAYMENT_ORDER,
    moduleLabel: "Payment Order",
    srsSection: "PRN 4.1 — Payment Order Creation",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "po-generator", level: 1, label: "Payment Order Generator", permissionId: "payment_order_create", preferredRoleIds: ["role-finance-officer", "role-agency-staff", "role-admin"], srsReference: "PRN 4.1.1 Step 19 — Auto-generated from approved bills (FIFO)" },
      { key: "po-authorizer", level: 2, label: "Payment Authorizer", permissionId: "payment_order_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 4.1.1 Step 19 — Authorization before Cash Management" },
    ],
  },

  /* ── 10. Payment Cancellation (SRS PRN 4.1 Step 21) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.PAYMENT_CANCELLATION,
    moduleLabel: "Payment Order Cancellation",
    srsSection: "PRN 4.1 Step 21 — Payment Order Cancellation",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "cancel-initiator", level: 1, label: "Cancellation Initiator", permissionId: "payment_order_edit", preferredRoleIds: ["role-agency-staff", "role-finance-officer", "role-admin"], srsReference: "PRN 4.1 Step 21 — Option to cancel before payment release" },
      { key: "cancel-approver", level: 2, label: "Cancellation Approver", permissionId: "payment_order_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 4.1 Step 21 — Reversal entries and audit trail" },
    ],
  },

  /* ── 11. Utility Payment (SRS PRN 5.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.UTILITY_PAYMENT,
    moduleLabel: "Utility Payment",
    srsSection: "PRN 5.1 — Utility Bill Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "bill-reviewer", level: 1, label: "Agency Bill Reviewer", permissionId: "utility_payment_submit", preferredRoleIds: ["role-agency-staff", "role-admin"], srsReference: "PRN 5.1 Step 1-2 — Review billing, raise disputes" },
      { key: "bill-approver", level: 2, label: "Utility Bill Approver", permissionId: "utility_payment_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 5.1 Step 3 — Budget/MCP validation, cleared for payment" },
    ],
  },

  /* ── 12. Rental Payment (SRS PRN 5.2) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.RENTAL_PAYMENT,
    moduleLabel: "Rental Payment",
    srsSection: "PRN 5.2 — Rental/Lease Processing",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "rental-editor", level: 1, label: "Rental Transaction Editor", permissionId: "rental_payment_edit", preferredRoleIds: ["role-agency-staff", "role-admin"], srsReference: "PRN 5.2 — Edit generated payment transaction" },
      { key: "rental-approver", level: 2, label: "Rental Payment Approver", permissionId: "rental_payment_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 5.2 — Approve and send to Cash Management" },
    ],
  },

  /* ── 13. Debt Payment (SRS PRN 6.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.DEBT_PAYMENT,
    moduleLabel: "Debt Payment",
    srsSection: "PRN 6.1 — Debt Servicing Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "debt-data-entry", level: 1, label: "Debt Data Entry", permissionId: "debt_payment_create", preferredRoleIds: ["role-agency-staff", "role-finance-officer", "role-admin"], srsReference: "PRN 6.1.1 — Record debt repayment info" },
      { key: "debt-reviewer", level: 2, label: "Debt Reviewer", permissionId: "debt_payment_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 6.1.2-3 — Generate and validate payment order" },
      { key: "higher-authority", level: 3, label: "Higher Authority", permissionId: "debt_payment_approve", preferredRoleIds: ["role-admin"], srsReference: "PRN 6.1.1 — Changes to schedule need higher authority approval", isConditional: true, conditionLabel: "Only if repayment schedule was modified", canSkip: true },
    ],
  },

  /* ── 14. SOE & Fund Transfer (SRS PRN 6.2) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.SOE_FUND_TRANSFER,
    moduleLabel: "SOE & Fund Transfer",
    srsSection: "PRN 6.2 — SOE and Fund Transfer Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "transfer-creator", level: 1, label: "Transfer Creator", permissionId: "soe_fund_transfer_create", preferredRoleIds: ["role-agency-staff", "role-finance-officer", "role-admin"], srsReference: "PRN 6.2.1 — Create transfer transaction" },
      { key: "transfer-approver", level: 2, label: "Transfer Approver", permissionId: "soe_fund_transfer_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 6.2.1 — Parliament-approved transfer validation" },
    ],
  },

  /* ── 15. FI Registration (SRS PRN 7.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.FI_REGISTRATION,
    moduleLabel: "Financial Institution Registration",
    srsSection: "PRN 7.1 — FI Registration and Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "fi-applicant", level: 1, label: "FI Applicant", permissionId: "fi_registration_submit", preferredRoleIds: ["role-public", "role-admin"], srsReference: "PRN 7.1.1 — FI registration via NDI portal" },
      { key: "dta-reviewer", level: 2, label: "DTA Reviewer", permissionId: "fi_registration_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 7.1.2 — RMA validation + DTA assessment" },
      { key: "dta-approver", level: 3, label: "DTA Approver", permissionId: "fi_registration_approve", preferredRoleIds: ["role-admin"], srsReference: "PRN 7.1.2 — DTA authorized user approves, status = Active" },
    ],
  },

  /* ── 16. Social Benefits (SRS PRN 10.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.SOCIAL_BENEFITS,
    moduleLabel: "Social Benefits Payment",
    srsSection: "PRN 10.1 — Social Benefits Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "program-coordinator", level: 1, label: "Program Coordinator", permissionId: "social_benefits_create", preferredRoleIds: ["role-agency-staff", "role-admin"], srsReference: "PRN 10.1 Step 4 — Create payment transaction" },
      { key: "finance-verifier", level: 2, label: "Finance Verifier", permissionId: "social_benefits_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 10.1 Step 4 — Verify and approve" },
      { key: "head-of-institution", level: 3, label: "Head of Institution", permissionId: "social_benefits_approve", preferredRoleIds: ["role-admin"], srsReference: "PRN 10.1 Step 4 — Head of institution approval" },
    ],
  },

  /* ── 17. Stipend Management (SRS PRN 10.1) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.STIPEND_MANAGEMENT,
    moduleLabel: "Stipend Management",
    srsSection: "PRN 10.1 — Stipend Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "stipend-coordinator", level: 1, label: "Program Coordinator", permissionId: "stipend_management_create", preferredRoleIds: ["role-agency-staff", "role-admin"], srsReference: "PRN 10.1 Step 1-2 — Update beneficiary info" },
      { key: "stipend-finance", level: 2, label: "Finance Officer", permissionId: "stipend_management_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 10.1 Step 2 — Finance verification" },
      { key: "stipend-head", level: 3, label: "Head of Institution", permissionId: "stipend_management_approve", preferredRoleIds: ["role-admin"], srsReference: "PRN 10.1 Step 2 — Head of institution approval" },
    ],
  },

  /* ── 18. Subscriptions & Contributions (SRS PRN 11) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.SUBSCRIPTIONS,
    moduleLabel: "Subscriptions & Contributions",
    srsSection: "PRN 11 — Subscriptions and Contributions",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "sub-creator", level: 1, label: "Transaction Creator", permissionId: "subscriptions_contributions_create", preferredRoleIds: ["role-agency-staff", "role-finance-officer", "role-admin"], srsReference: "PRN 11.1.1 — Create payment transaction" },
      { key: "sub-approver", level: 2, label: "Transaction Approver", permissionId: "subscriptions_contributions_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 11.1.2 — Approval for payment" },
    ],
  },

  /* ── 19. Retention Release (SRS PRN 9.2) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.RETENTION_RELEASE,
    moduleLabel: "Retention Money Release",
    srsSection: "PRN 9.2 — Retention Release Processing",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "release-initiator", level: 1, label: "Release Initiator", permissionId: "retention_release_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "PRN 9.2 — Select Make Payment or Early Encashment" },
      { key: "release-approver", level: 2, label: "Release Approver", permissionId: "retention_release_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 9.2 — Approve and send to Cash Management" },
    ],
  },

  /* ── 20. Retention Forfeiture (SRS PRN 9.3) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.RETENTION_FORFEITURE,
    moduleLabel: "Retention Forfeiture",
    srsSection: "PRN 9.3 — Retention Forfeiture Processing",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "forfeiture-initiator", level: 1, label: "Forfeiture Initiator", permissionId: "retention_forfeiture_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "PRN 9.3.1 — Select Forfeit" },
      { key: "forfeiture-approver", level: 2, label: "Forfeiture Approver", permissionId: "retention_forfeiture_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 9.3.2 — Legal compliance, deposit to CF account" },
    ],
  },

  /* ── 21. Contractual Advances (SRS PRN Advances Step 1-5) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.ADVANCE_CONTRACTUAL,
    moduleLabel: "Contractual Advances",
    srsSection: "Advances — Contractual Advances",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "advance-initiator", level: 1, label: "Advance Initiator (eCMS/eGP)", permissionId: "advances_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "Advances Step 1 — Initiated from eCMS/eGP" },
      { key: "agency-finance", level: 2, label: "Agency Finance Review", permissionId: "advances_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "Advances Step 3 — Budget, commitment, advance limits" },
      { key: "head-of-agency", level: 3, label: "Head of Agency", permissionId: "advances_approve", preferredRoleIds: ["role-admin"], srsReference: "Advances Step 3 — Head of Agency approval" },
    ],
  },

  /* ── 22. Non-Contractual Advances / Imprest (SRS PRN Advances) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.ADVANCE_NON_CONTRACTUAL,
    moduleLabel: "Non-Contractual Advances (Imprest)",
    srsSection: "Advances — Non-Contractual / Official Imprest",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "imprest-requester", level: 1, label: "Employee Requester", permissionId: "advances_submit", preferredRoleIds: ["role-agency-staff", "role-admin"], srsReference: "Advances Step 1 — Employee initiates imprest request" },
      { key: "imprest-finance", level: 2, label: "Agency Finance Review", permissionId: "advances_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "Advances Step 2-3 — Ceiling limits, prior settlement check" },
      { key: "imprest-head", level: 3, label: "Head of Agency", permissionId: "advances_approve", preferredRoleIds: ["role-admin"], srsReference: "Advances Step 3 — Head of Agency approval" },
    ],
  },

  /* ── 23. Vendor Management (SRS PRN 12) ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.VENDOR_MANAGEMENT,
    moduleLabel: "Vendor Management",
    srsSection: "PRN 12 — Vendor Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "vendor-creator", level: 1, label: "Vendor Creator", permissionId: "vendor_management_submit", preferredRoleIds: ["role-agency-staff", "role-procurement", "role-admin"], srsReference: "PRN 12 Step 1-3 — Create vendor via online entry" },
      { key: "vendor-approver", level: 2, label: "Vendor Approver", permissionId: "vendor_management_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "PRN 12 Step 4 — Approve vendor registration/amendment" },
    ],
  },

  /* ── 24. Sanction Management ── */
  {
    moduleKey: EXPENDITURE_MODULE_KEYS.SANCTION_MANAGEMENT,
    moduleLabel: "Contractor Sanction/Suspension",
    srsSection: "Contractor Sanction/Suspense Management",
    version: 1,
    updatedAt: now,
    updatedBy: "system",
    steps: [
      { key: "sanction-identifier", level: 1, label: "Sanction Identifier", permissionId: "sanction_management_create", preferredRoleIds: ["role-procurement", "role-agency-staff", "role-admin"], srsReference: "Sanction Step 1 — Identify sanction on active contract" },
      { key: "sanction-approver", level: 2, label: "Sanction Approver", permissionId: "sanction_management_approve", preferredRoleIds: ["role-finance-officer", "role-admin"], srsReference: "Sanction Step 2 — Triggering points, approval" },
    ],
  },
];
