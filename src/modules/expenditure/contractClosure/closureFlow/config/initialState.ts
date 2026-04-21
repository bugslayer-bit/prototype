/* Initial closure form state.

   ❗ No static catalogue of closure types lives here — the page derives
   its list of closure types directly from the `closure-type` master
   data via `useContractClosureMasterData`. */
import type { ClosureFormState } from "../../types";
import { buildClosureApprovalSteps } from "../state/approvalSteps";

export const INITIAL_STATE: ClosureFormState = {
  closureId: `CLO-${Date.now().toString(36).toUpperCase()}`,
  contractId: "",
  contractTitle: "",
  contractValue: "",
  totalPaid: "",
  outstandingBalance: "",
  retentionHeld: "",
  closureType: "",
  closureJustification: "",
  closureDate: "",
  settlementItems: [],
  netSettlementAmount: "0",
  allDuesSettled: false,
  budgetReleaseTriggered: false,
  budgetBalanceOnActivity: "",
  commitmentReleaseAmount: "",
  egpNotified: false,
  cmsNotified: false,
  contractCategoryForTrigger: "",
  retentionReleaseTriggered: false,
  retentionReleaseAmount: "",
  retentionReleaseDate: "",
  totalTaxOnSettlement: "0",
  finalPaymentOrderRef: "",
  closureDocuments: [],
  workflowStatus: "draft",
  approvalSteps: buildClosureApprovalSteps(),
  submittedAt: "",
  approvedAt: "",
  closedAt: "",
};

/* A small, purely visual icon catalogue keyed by slug keywords. This is
   NOT a list of closure types — it only provides an emoji decoration for
   known categories. All labels and the selectable list come from master
   data. Unknown slugs fall back to a neutral icon. */
export function closureTypeIcon(slug: string): string {
  const s = (slug || "").toLowerCase();
  if (/complet/.test(s)) return "\u2705";
  if (/court|arbitrat/.test(s)) return "\u2696\uFE0F";
  if (/mutual/.test(s)) return "\uD83E\uDD1D";
  if (/default|breach/.test(s)) return "\u26A0\uFE0F";
  if (/force|majeure/.test(s)) return "\uD83C\uDF0A";
  if (/terminat/.test(s)) return "\uD83D\uDED1";
  return "\uD83C\uDFC1";
}
