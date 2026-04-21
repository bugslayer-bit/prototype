import type { StoredContract } from "../../../shared/context/ContractDataContext";
import type { ContractFormState, CreationMethod } from "./types";
import { initialForm, methodMeta } from "./config";

/* ════════════════════════════════════════════════════════════════════════
   SEED CONTRACTS
   ────────────────────────────────────────────────────────────────────────
   Builds 3 fully-populated demo contracts (one per non-manual creation
   method) so the Contract Management list looks dynamic the very first
   time the user lands on the page.

   Every value comes from methodMeta[method].suggestedValues which is the
   same source of truth used by the live "Pre-fill from system" path —
   so what you see here is exactly what an eGP / CMS / File-Upload
   ingestion would produce in production.
   ════════════════════════════════════════════════════════════════════════ */

interface SeedSpec {
  method: Exclude<CreationMethod, "manual">;
  workflowStatus: string;
  contractStatus: string;
  currentApprover: string;
  /** offset (in days) so each seeded contract has a slightly older submittedAt */
  daysAgo: number;
}

const SEED_SPECS: SeedSpec[] = [
  {
    method: "egp-interface",
    workflowStatus: "submitted",
    contractStatus: "Pending Technical Review",
    currentApprover: "Technical Approver",
    daysAgo: 1,
  },
  {
    method: "cms-interface",
    workflowStatus: "technical-review",
    contractStatus: "Finance Review",
    currentApprover: "Finance Approver",
    daysAgo: 3,
  },
  {
    method: "file-upload",
    workflowStatus: "approved",
    contractStatus: "Approved",
    currentApprover: "",
    daysAgo: 5,
  },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function buildOne(spec: SeedSpec, index: number): StoredContract {
  const meta = methodMeta[spec.method];
  /* Merge initialForm + suggestedValues so EVERY ContractFormState field
     has a value — exactly what the live form does on method-select. */
  const formData: ContractFormState = {
    ...initialForm,
    ...meta.suggestedValues,
    method: spec.method,
    workflowStatus: spec.workflowStatus as ContractFormState["workflowStatus"],
    contractStatus: spec.contractStatus,
    submittedAt: isoDaysAgo(spec.daysAgo),
    approvedAt: spec.workflowStatus === "approved" ? isoDaysAgo(0) : "",
  };
  /* Make sure Gross Amount carries an initial figure in every seeded record. */
  if (!formData.grossAmount && formData.contractValue) {
    formData.grossAmount = formData.contractValue;
  }

  const id = `CTR-SEED-${spec.method.toUpperCase().replace("-", "")}-${index + 1}`;

  return {
    id,
    contractId: formData.agencyContractId || id,
    contractTitle: formData.contractTitle,
    contractValue: formData.contractValue,
    contractCategory: formData.contractCategory,
    contractClassification: formData.contractClassification,
    method: spec.method,
    agencyName: formData.agencyName,
    contractorName: formData.contractorName,
    contractorId: formData.contractorId,
    startDate: formData.startDate,
    endDate: formData.endDate,
    workflowStatus: spec.workflowStatus,
    contractStatus: spec.contractStatus,
    submittedAt: isoDaysAgo(spec.daysAgo),
    approvedAt: spec.workflowStatus === "approved" ? isoDaysAgo(0) : "",
    rejectedAt: "",
    approvalRemarks: "",
    currentApprover: spec.currentApprover,
    fundingSource: formData.fundingSource,
    expenditureType: formData.expenditureType,
    formData,
    amendmentDraft: null,
  };
}

export function buildSeedContracts(): StoredContract[] {
  return SEED_SPECS.map((spec, i) => buildOne(spec, i));
}
