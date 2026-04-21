/* Dynamic approval chain helpers sourced from the workflow engine */
import {
  getWorkflowConfigForModule,
  buildWorkflowRuntime,
  EXPENDITURE_MODULE_KEYS,
} from "../../../../../../shared/workflow";

export function buildApprovalChain(): { key: string; role: string; short: string }[] {
  const config = getWorkflowConfigForModule(EXPENDITURE_MODULE_KEYS.CONTRACT_CREATION);
  if (!config) return [];
  const runtime = buildWorkflowRuntime(config);
  return runtime.map((step) => ({
    key: step.key,
    role: step.role,
    short: step.label.split(" ").map((w) => w[0]).join("").slice(0, 4),
  }));
}

/** Given a contract's workflowStatus, find its position in the dynamic chain */
export function findStepIndex(chain: { key: string }[], status: string): number {
  return chain.findIndex((s) => s.key === status);
}

/** All step keys that represent "in-review" (anything between submitted and approved) */
export function getInReviewKeys(chain: { key: string }[]): string[] {
  return chain.slice(1).map((s) => s.key); // everything after submitter step
}
