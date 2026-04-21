/* Adapter: StoredContract → FlowContract. Pulls live contracts from the
   Contract Data Context and projects them into the shape the invoice
   flow needs. */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import type { ContractCategory, ContractStatus, FlowContract } from "../types";

export function buildDocChecklist(category: string): { name: string; mandatory: boolean }[] {
  const base = [
    { name: "Invoice Copy", mandatory: true },
    { name: "Tax Certificate", mandatory: true },
  ];
  if (category === "Works") {
    return [
      ...base,
      { name: "Measurement Book Extract", mandatory: true },
      { name: "Engineer Certificate", mandatory: false },
      { name: "Quality Certification", mandatory: false },
    ];
  }
  if (category === "Goods") {
    return [
      ...base,
      { name: "Delivery Note / GRN", mandatory: true },
      { name: "Inspection Certificate", mandatory: true },
      { name: "Warranty Bond", mandatory: false },
    ];
  }
  if (category === "Services") {
    return [
      ...base,
      { name: "Deliverable Acceptance", mandatory: true },
      { name: "Time Sheet", mandatory: false },
    ];
  }
  return [...base, { name: "Completion Certificate", mandatory: true }];
}

export function deriveStatus(c: StoredContract): ContractStatus {
  const wf = (c.workflowStatus || "").toLowerCase();
  const cs = (c.contractStatus || "").toLowerCase();
  if (wf === "approved" || cs.includes("approved") || cs.includes("active")) return "Active";
  if (wf === "rejected" || cs.includes("closed") || cs.includes("cancelled")) return "Closed";
  return "Pending";
}

export function adaptContract(c: StoredContract): FlowContract {
  const fd = c.formData;
  const rawAmount = c.contractValue || fd?.contractValue || fd?.grossAmount || "0";
  const amount = Number(String(rawAmount).replace(/[^\d.]/g, "")) || 0;
  const cats =
    c.contractCategory && c.contractCategory.length > 0 ? c.contractCategory : fd?.contractCategory || [];
  const primaryCat = (cats[0] || "Works") as string;
  const normalisedCat: ContractCategory = (
    primaryCat === "Goods" || primaryCat === "Works" || primaryCat === "Services"
      ? primaryCat
      : primaryCat.toLowerCase().includes("mixed")
        ? "Goods and Services (Mixed)"
        : "Works"
  ) as ContractCategory;

  const milestoneRows = fd?.milestoneRows || [];
  const isMilestone =
    milestoneRows.length > 0 ||
    (fd?.paymentStructure || "").toLowerCase().includes("milestone") ||
    (fd?.milestonePlan || "").toLowerCase().includes("milestone");

  const retentionPct = Number(fd?.retentionRate) || (fd?.retentionApplicable ? 10 : 0);
  const taxRate = Number(fd?.gstRate) || (fd?.taxApplicable ? 5 : 0);

  const advRules = fd?.advancePayment
    ? `Allowed up to ${fd.mobilizationAdvancePercent || fd.advanceAmount || "20"}% on contract value`
    : "No advance payment permitted";

  const milestones = milestoneRows.map((m, i) => ({
    id: m.milestoneId || `MS-${String(i + 1).padStart(3, "0")}`,
    name: m.milestoneName || `Milestone ${i + 1}`,
    amount:
      Number(m.netMilestoneAmount || m.milestoneAmountGross || "0") ||
      Math.round(amount / Math.max(milestoneRows.length, 1)),
  }));

  return {
    id: c.contractId || c.id,
    title: c.contractTitle || "(Untitled contract)",
    amount,
    status: deriveStatus(c),
    contractor: c.contractorName || "—",
    contractorId: c.contractorId || "",
    category: normalisedCat,
    isMilestone,
    retentionPct,
    taxRate,
    taxId: fd?.bftnIdNumber || `TPN-${(c.id || "").slice(-8).toUpperCase()}`,
    taxApplicability: fd?.taxApplicable ? `GST @${taxRate}% applicable` : "Tax exempt",
    advanceRules: advRules,
    currency: fd?.contractCurrencyId || "BTN",
    docChecklist: buildDocChecklist(normalisedCat),
    milestones,
    sourceMethod: c.method || "manual",
    fundingSource: c.fundingSource || fd?.fundingSource || "",
    agencyName: c.agencyName || fd?.agencyName || "",
  };
}

/* Hard-coded fallback so the flow demos out-of-the-box on a fresh tenant */
export const FALLBACK_CONTRACTS: FlowContract[] = [
  {
    id: "CNT-DEMO-00156",
    title: "[Demo] Road Maintenance Project Phase-2",
    amount: 2_500_000,
    status: "Active",
    contractor: "Bhutan Construction Pvt Ltd",
    contractorId: "CTR-DEMO-00142",
    category: "Works",
    isMilestone: true,
    retentionPct: 10,
    taxRate: 5,
    taxId: "TPN-10045678",
    taxApplicability: "GST @5% applicable",
    advanceRules: "Allowed up to 20% on contract value",
    currency: "BTN",
    docChecklist: buildDocChecklist("Works"),
    milestones: [
      { id: "MS-001", name: "Design & Planning", amount: 375_000 },
      { id: "MS-002", name: "Foundation & Excavation", amount: 625_000 },
      { id: "MS-003", name: "Structure & Framework", amount: 875_000 },
      { id: "MS-004", name: "Finishing & Testing", amount: 625_000 },
    ],
    sourceMethod: "manual",
    fundingSource: "Government of Bhutan",
    agencyName: "Department of Roads",
  },
];
