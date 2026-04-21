/* Dynamic approval steps for Contract Amendment */
import type { AmendmentFormState } from "../../types";
import { getWorkflowConfigForModule, buildWorkflowRuntime, EXPENDITURE_MODULE_KEYS } from "../../../../../shared/workflow";

export function buildAmendmentApprovalSteps(): AmendmentFormState["approvalSteps"] {
  const config = getWorkflowConfigForModule(EXPENDITURE_MODULE_KEYS.CONTRACT_AMENDMENT);
  if (!config) return [];
  const runtime = buildWorkflowRuntime(config);
  return runtime.map((step) => ({
    role: step.role,
    status: "pending" as const,
    approverName: "",
    timestamp: "",
    remarks: "",
  }));
}
