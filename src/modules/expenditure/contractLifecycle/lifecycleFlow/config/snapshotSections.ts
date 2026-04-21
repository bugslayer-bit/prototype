/* ══════════════════════════════════════════════════════════════════════════
   snapshotSections.ts
   Declarative catalogue of EVERY field on a StoredContract, grouped into
   logical sections. Drives the dynamic "Details" tab on the Contract
   Lifecycle page. When the user selects a contract every getter re-runs,
   so the entire detail view is fully reactive.

   Safe-by-construction: every getter is wrapped to coerce missing /
   undefined into "" so the UI can rely on string | boolean output.
   ══════════════════════════════════════════════════════════════════════════ */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import type { SnapshotSection } from "../types";

/* ── small helpers ─────────────────────────────────────────────────────── */
const str = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
};
const fd = (c: StoredContract) => c.formData || ({} as StoredContract["formData"]);
/* Prefer explicit field on StoredContract, then fall back to formData */
const pick = (
  c: StoredContract,
  topKey: keyof StoredContract,
  formKey?: keyof StoredContract["formData"],
): string => {
  const top = str(c[topKey]);
  if (top) return top;
  if (!formKey) return "";
  return str((fd(c) as unknown as Record<string, unknown>)[formKey as string]);
};

/* ── The master section list ───────────────────────────────────────────── */
export const SNAPSHOT_SECTIONS: SnapshotSection[] = [
  /* 1. Identification */
  {
    key: "identification",
    title: "Contract Identification",
    icon: "🆔",
    accent: "bg-sky-500",
    fields: [
      { label: "Contract ID", get: (c) => pick(c, "contractId", "contractId") },
      { label: "Agency Contract ID", get: (c) => str(fd(c).agencyContractId) },
      { label: "Contract Title", get: (c) => pick(c, "contractTitle", "contractTitle") },
      { label: "Contract Description", get: (c) => str(fd(c).contractDescription), kind: "multiline" },
      {
        label: "Contract Category",
        get: (c) => c.contractCategory?.length ? c.contractCategory : str(fd(c).contractCategory),
        kind: "list",
      },
      { label: "Contract Classification", get: (c) => pick(c, "contractClassification", "contractClassification") },
      { label: "Expenditure Type", get: (c) => pick(c, "expenditureType", "expenditureType") },
      { label: "Creation Method", get: (c) => pick(c, "method", "method"), kind: "badge" },
    ],
  },

  /* 2. Status & Workflow */
  {
    key: "status",
    title: "Status & Workflow",
    icon: "📋",
    accent: "bg-violet-500",
    fields: [
      { label: "Contract Status", get: (c) => pick(c, "contractStatus", "contractStatus"), kind: "tag" },
      { label: "Workflow Status", get: (c) => pick(c, "workflowStatus", "workflowStatus"), kind: "tag" },
      { label: "Current Approver", get: (c) => str(c.currentApprover) },
      { label: "Submitted At", get: (c) => pick(c, "submittedAt", "submittedAt"), kind: "date" },
      { label: "Approved At", get: (c) => pick(c, "approvedAt", "approvedAt"), kind: "date" },
      { label: "Rejected At", get: (c) => str(c.rejectedAt), kind: "date" },
      { label: "Approval Remarks", get: (c) => str(c.approvalRemarks), kind: "multiline" },
    ],
  },

  /* 3. Dates & Duration */
  {
    key: "dates",
    title: "Dates & Duration",
    icon: "📅",
    accent: "bg-emerald-500",
    fields: [
      { label: "Start Date", get: (c) => pick(c, "startDate", "startDate"), kind: "date" },
      { label: "End Date", get: (c) => pick(c, "endDate", "endDate"), kind: "date" },
      { label: "Contract Duration", get: (c) => str(fd(c).contractDuration) },
      { label: "Multi-Year Flag", get: (c) => !!fd(c).multiYearFlag, kind: "bool" },
      { label: "Multi-Year Commitment Ref", get: (c) => str(fd(c).multiYearCommitmentRef) },
      { label: "Closure Date", get: (c) => str(fd(c).contractClosureDate), kind: "date" },
      { label: "Closure Type", get: (c) => str(fd(c).closureType) },
      { label: "Closure Reason", get: (c) => str(fd(c).closureReason), kind: "multiline" },
    ],
  },

  /* 4. Financial Overview */
  {
    key: "financial",
    title: "Financial Overview",
    icon: "💰",
    accent: "bg-amber-500",
    fields: [
      { label: "Contract Value", get: (c) => pick(c, "contractValue", "contractValue"), kind: "money" },
      { label: "Gross Amount", get: (c) => str(fd(c).grossAmount), kind: "money" },
      { label: "Net Payable", get: (c) => str(fd(c).netPayable), kind: "money" },
      { label: "Currency", get: (c) => str(fd(c).contractCurrencyId) || "BTN" },
      { label: "BFTN ID Number", get: (c) => str(fd(c).bftnIdNumber) },
      { label: "Payment Structure", get: (c) => str(fd(c).paymentStructure) },
      { label: "Milestone Plan", get: (c) => str(fd(c).milestonePlan) },
    ],
  },

  /* 5. Budget & UCoA */
  {
    key: "budget",
    title: "Budget & UCoA",
    icon: "🏛️",
    accent: "bg-indigo-500",
    fields: [
      { label: "Budget Code", get: (c) => str(fd(c).budgetCode) },
      { label: "Commitment Reference", get: (c) => str(fd(c).commitmentReference) },
      { label: "Commitment Balance", get: (c) => str(fd(c).commitmentBalance), kind: "money" },
      { label: "Expenditure Category ID", get: (c) => str(fd(c).expenditureCategoryId) },
      { label: "Sector ID", get: (c) => str(fd(c).sectorId) },
      { label: "Sub-Sector ID", get: (c) => str(fd(c).subSectorId) },
      { label: "UCoA Level", get: (c) => str(fd(c).ucoaLevel) },
      { label: "Funding Source", get: (c) => pick(c, "fundingSource", "fundingSource") },
      { label: "Funding Agency Name", get: (c) => str(fd(c).fundingAgencyName) },
      { label: "Payment Source", get: (c) => str(fd(c).paymentSource) },
      { label: "Payment Account", get: (c) => str(fd(c).paymentAccount) },
      { label: "Program / Project ID", get: (c) => str(fd(c).programProjectId) },
      { label: "Program / Project Name", get: (c) => str(fd(c).programProjectName) },
    ],
  },

  /* 6. Agency */
  {
    key: "agency",
    title: "Agency",
    icon: "🏢",
    accent: "bg-slate-600",
    fields: [
      { label: "Agency ID", get: (c) => str(fd(c).agencyId) },
      { label: "Agency Name", get: (c) => pick(c, "agencyName", "agencyName") },
    ],
  },

  /* 7. Contractor */
  {
    key: "contractor",
    title: "Contractor",
    icon: "🧑‍💼",
    accent: "bg-teal-500",
    fields: [
      { label: "Contractor ID", get: (c) => pick(c, "contractorId", "contractorId") },
      { label: "Contractor Name", get: (c) => pick(c, "contractorName", "contractorName") },
      { label: "Contractor Status", get: (c) => str(fd(c).contractorStatus), kind: "tag" },
      { label: "Bank Account", get: (c) => str(fd(c).contractorBankAccount) },
      { label: "Debarment Status", get: (c) => str(fd(c).contractorDebarmentStatus), kind: "tag" },
    ],
  },

  /* 8. Contract Officer */
  {
    key: "officer",
    title: "Contract Officer",
    icon: "👤",
    accent: "bg-rose-500",
    fields: [
      { label: "Officer ID", get: (c) => str(fd(c).officerId) },
      { label: "Officer Contract ID", get: (c) => str(fd(c).officerContractId) },
      {
        label: "Officer Name",
        get: (c) => {
          const f = fd(c);
          return [f.officerSalutation, f.officerFirstName, f.officerMiddleName, f.officerLastName]
            .filter(Boolean)
            .join(" ");
        },
      },
      { label: "Officer Email", get: (c) => str(fd(c).officerEmail) },
      { label: "Officer Phone", get: (c) => str(fd(c).officerPhoneNumber) },
    ],
  },

  /* 9. Tax Configuration */
  {
    key: "tax",
    title: "Tax Configuration",
    icon: "💱",
    accent: "bg-fuchsia-500",
    fields: [
      { label: "Tax Applicable", get: (c) => !!fd(c).taxApplicable, kind: "bool" },
      { label: "Tax Type", get: (c) => (fd(c).taxType || []) as unknown as string[], kind: "list" },
      { label: "Tax Exemption Reason", get: (c) => str(fd(c).taxExemptionReason), kind: "multiline" },
      { label: "TDS Applicable", get: (c) => !!fd(c).tdsApplicable, kind: "bool" },
      { label: "TDS Rate", get: (c) => str(fd(c).tdsRate) },
      { label: "GST Applicable", get: (c) => !!fd(c).gstApplicable, kind: "bool" },
      { label: "GST Rate", get: (c) => str(fd(c).gstRate) },
      { label: "Income Tax Applicable", get: (c) => !!fd(c).incomeTaxApplicable, kind: "bool" },
      { label: "Income Tax Rate", get: (c) => str(fd(c).incomeTaxRate) },
      { label: "Vendor Tax Type", get: (c) => str(fd(c).vendorTaxType) },
      { label: "Vendor Tax Sub-Category", get: (c) => str(fd(c).vendorTaxSubCategory) },
      { label: "Vendor Origin", get: (c) => str(fd(c).vendorOrigin) },
      { label: "GST Exempt Item", get: (c) => str(fd(c).gstExemptItem) },
      { label: "Legal Reference", get: (c) => str(fd(c).taxLegalReference) },
    ],
  },

  /* 10. Advance Payment */
  {
    key: "advance",
    title: "Advance Payment",
    icon: "⏩",
    accent: "bg-orange-500",
    fields: [
      { label: "Advance Payment", get: (c) => !!fd(c).advancePayment, kind: "bool" },
      { label: "Advance Amount", get: (c) => str(fd(c).advanceAmount), kind: "money" },
      { label: "Advance Recoverable", get: (c) => !!fd(c).advanceRecoverable, kind: "bool" },
      { label: "Recovery Method", get: (c) => str(fd(c).advanceRecoveryMethod) },
      { label: "Recovery Amount", get: (c) => str(fd(c).advanceRecoveryAmount), kind: "money" },
      { label: "Mobilization Advance", get: (c) => str(fd(c).mobilizationAdvance), kind: "money" },
      { label: "Mobilization Advance %", get: (c) => str(fd(c).mobilizationAdvancePercent) },
    ],
  },

  /* 11. Retention & Warranty */
  {
    key: "retention",
    title: "Retention & Warranty",
    icon: "🛡️",
    accent: "bg-lime-600",
    fields: [
      { label: "Retention Applicable", get: (c) => !!fd(c).retentionApplicable, kind: "bool" },
      { label: "Retention Rate", get: (c) => str(fd(c).retentionRate) },
      { label: "Warranty (months)", get: (c) => str(fd(c).warrantyMonths) },
    ],
  },

  /* 12. Deductions & Damages */
  {
    key: "deductions",
    title: "Deductions & Damages",
    icon: "✂️",
    accent: "bg-red-500",
    fields: [
      { label: "Deduction Type", get: (c) => str(fd(c).deductionType) },
      { label: "Deduction Method", get: (c) => str(fd(c).deductionMethod) },
      { label: "Liquidated Damages Limit", get: (c) => str(fd(c).liquidatedDamagesLimit), kind: "money" },
    ],
  },

  /* 13. Bill Discounting */
  {
    key: "discounting",
    title: "Bill Discounting",
    icon: "🏦",
    accent: "bg-cyan-500",
    fields: [
      { label: "Discounting Eligible", get: (c) => !!fd(c).billDiscountingEligible, kind: "bool" },
      { label: "Discounting Rate", get: (c) => str(fd(c).discountingRate) },
      { label: "Discounting Institution ID", get: (c) => str(fd(c).discountingInstitutionId) },
      { label: "Credit Limit", get: (c) => str(fd(c).creditLimit), kind: "money" },
      { label: "Outstanding Discounted Amount", get: (c) => str(fd(c).outstandingDiscountedAmount), kind: "money" },
    ],
  },

  /* 14. Payment Processing */
  {
    key: "payment",
    title: "Payment Processing",
    icon: "💳",
    accent: "bg-blue-500",
    fields: [
      { label: "Accounts Payable Ref", get: (c) => str(fd(c).apId) },
      { label: "Payment Order ID", get: (c) => str(fd(c).paymentOrderId) },
      { label: "Bank Transaction Ref", get: (c) => str(fd(c).bankTransactionReference) },
    ],
  },
];
