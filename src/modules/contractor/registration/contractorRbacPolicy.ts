import type { WorkflowStep } from "../../../shared/types";
import type { FormState } from "./stages/sharedTypes";
import { getStoredRoles, resolvePermissionIds, seedRoles, type Role } from "../../admin/rbac/rbacData";

const CONTRACTOR_EDIT_PERMISSION_IDS = [
  "contractor_registration_create",
  "contractor_registration_edit",
  "contractor_registration_submit",
];

const CONTRACTOR_APPROVAL_PERMISSION_ID = "contractor_registration_approve";

const SYSTEM_CONTROLLED_FIELDS = new Set<keyof FormState>([
  "contractorId",
  "dataSource",
  "registrationDate",
  "contractorStatusPrimary",
]);

const APPROVER_EDITABLE_FIELDS = new Set<keyof FormState>([
  "remarks",
  "workflowNote",
  "statusReason",
  "contractorStatusSecondary",
]);

interface ContractorWorkflowPolicyTemplate {
  key: string;
  level: number;
  fallbackRoleLabel: string;
  permissionId: string;
  preferredRoleIds: string[];
  srsReference: string;
}

const CONTRACTOR_WORKFLOW_POLICY: ContractorWorkflowPolicyTemplate[] = [
  {
    key: "registration-maker",
    level: 1,
    fallbackRoleLabel: "Registration Maker",
    permissionId: "contractor_registration_submit",
    preferredRoleIds: ["role-public", "role-agency-staff", "role-procurement", "role-admin"],
    srsReference: "PRN 1.1 Step 4",
  },
  {
    key: "agency-reviewer",
    level: 2,
    fallbackRoleLabel: "Agency Reviewer",
    permissionId: CONTRACTOR_APPROVAL_PERMISSION_ID,
    preferredRoleIds: ["role-procurement", "role-agency-staff", "role-admin"],
    srsReference: "PRN 1.1 Step 5",
  },
  {
    key: "authorized-approver",
    level: 3,
    fallbackRoleLabel: "Authorized Agency Approver",
    permissionId: CONTRACTOR_APPROVAL_PERMISSION_ID,
    preferredRoleIds: ["role-finance-officer", "role-admin", "role-procurement"],
    srsReference: "PRN 1.1 Step 5 / RBAC-configured authority",
  },
];

function pickPolicyRoleIds(roles: Role[], template: ContractorWorkflowPolicyTemplate) {
  const candidates = template.preferredRoleIds.filter((roleId) => {
    const permissions = resolvePermissionIds([roleId], roles);
    return permissions.includes(template.permissionId);
  });

  if (candidates.length > 0) {
    return candidates;
  }

  return roles
    .filter((role) => role.permissionIds.includes(template.permissionId))
    .map((role) => role.id);
}

function roleLabel(roleIds: string[], roles: Role[], fallbackLabel: string) {
  const labels = roleIds
    .map((roleId) => roles.find((role) => role.id === roleId)?.name)
    .filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels.join(" / ") : fallbackLabel;
}

export function buildContractorRegistrationWorkflow(roles: Role[] = getStoredRoles()): WorkflowStep[] {
  const effectiveRoles = roles.length > 0 ? roles : seedRoles;

  return CONTRACTOR_WORKFLOW_POLICY.map((template) => {
    const roleIds = pickPolicyRoleIds(effectiveRoles, template);
    return {
      level: template.level,
      role: roleLabel(roleIds, effectiveRoles, template.fallbackRoleLabel),
      roleIds,
      requiredPermissionId: template.permissionId,
      policyReference: template.srsReference,
      policyKey: template.key,
      status: "pending",
    };
  });
}

export function canEditContractorRegistrationField(fieldKey: keyof FormState | undefined, permissionIds: string[]) {
  const hasDataEntryPermission = CONTRACTOR_EDIT_PERMISSION_IDS.some((permissionId) => permissionIds.includes(permissionId));
  const hasApprovalPermission = permissionIds.includes(CONTRACTOR_APPROVAL_PERMISSION_ID);

  if (!fieldKey) {
    return hasDataEntryPermission;
  }

  if (SYSTEM_CONTROLLED_FIELDS.has(fieldKey)) {
    return false;
  }

  if (hasDataEntryPermission) {
    return true;
  }

  if (hasApprovalPermission && APPROVER_EDITABLE_FIELDS.has(fieldKey)) {
    return true;
  }

  return false;
}

export function canActOnContractorWorkflowStep(step: WorkflowStep, roleIds: string[], permissionIds: string[]) {
  const roleMatch = (step.roleIds ?? []).length === 0 || (step.roleIds ?? []).some((roleId) => roleIds.includes(roleId));
  const permissionMatch = !step.requiredPermissionId || permissionIds.includes(step.requiredPermissionId);
  return roleMatch && permissionMatch;
}

export function getContractorPolicyHeadline(roles: Role[] = getStoredRoles()) {
  const workflow = buildContractorRegistrationWorkflow(roles);
  return workflow.map((step) => `L${step.level}: ${step.role}`).join(" -> ");
}
