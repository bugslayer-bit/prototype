/* Build dynamic approval steps for Contract Closure from workflow engine */
import { getWorkflowConfigForModule, buildWorkflowRuntime, EXPENDITURE_MODULE_KEYS } from "../../../../../shared/workflow";
import type { ClosureFormState } from "../../types";

export function buildClosureApprovalSteps(): ClosureFormState["approvalSteps"] {
  const config = getWorkflowConfigForModule(EXPENDITURE_MODULE_KEYS.CONTRACT_CLOSURE);
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
