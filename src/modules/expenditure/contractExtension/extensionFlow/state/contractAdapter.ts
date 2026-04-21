/* ══════════════════════════════════════════════════════════════════════════
   contractAdapter.ts
   Convert StoredContract (the shared context shape used by Contract
   Creation / Lifecycle / Amendment) into ContractForExtension so the
   Extension wizard can operate on the SAME live data as every other
   expenditure module. No duplicated mocks.
   ══════════════════════════════════════════════════════════════════════════ */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import type { ContractForExtension, MilestoneRecord } from "../../types";

const n = (v: unknown): number => {
  if (typeof v === "number") return v;
  const f = parseFloat(String(v ?? "0"));
  return Number.isNaN(f) ? 0 : f;
};

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/* Map the milestoneStatus string used in ContractFormState to the
   tighter union used by ContractForExtension.MilestoneRecord.status. */
function mapMilestoneStatus(raw: string): MilestoneRecord["status"] {
  const lc = raw.toLowerCase();
  if (lc.includes("paid")) return "Paid";
  if (lc.includes("complete")) return "Completed";
  if (lc.includes("overdue")) return "Overdue";
  return "Pending";
}

export function storedToContractForExtension(c: StoredContract): ContractForExtension {
  const f = c.formData || ({} as StoredContract["formData"]);
  const totalValue = n(c.contractValue || f.contractValue);
  /* Amount paid derived from milestones marked Paid. Falls back to 0 when
     no milestones or when none are paid. */
  const amountPaid = (f.milestoneRows || []).reduce((acc, m) => {
    if ((m.milestoneStatus || "").toLowerCase().includes("paid")) {
      return acc + n(m.milestoneAmountGross);
    }
    return acc;
  }, 0);

  const category: string =
    (Array.isArray(c.contractCategory) && c.contractCategory[0]) ||
    (Array.isArray(f.contractCategory) && f.contractCategory[0]) ||
    s(f.contractClassification) ||
    "—";

  const milestones: MilestoneRecord[] = (f.milestoneRows || []).map((m, i) => ({
    id: m.milestoneId || m.id || `MS-${i + 1}`,
    number: parseInt(m.milestoneNumber, 10) || i + 1,
    name: m.milestoneName || `Milestone ${i + 1}`,
    amount: n(m.milestoneAmountGross),
    estimatedDate: m.estimatedPaymentDate || "",
    status: mapMilestoneStatus(m.milestoneStatus || ""),
  }));

  return {
    id: c.contractId || c.id,
    title: c.contractTitle || f.contractTitle || "(Untitled contract)",
    contractorId: c.contractorId || f.contractorId || "",
    contractorName: c.contractorName || f.contractorName || "",
    agencyId: s(f.agencyId),
    agencyName: c.agencyName || f.agencyName || "",
    category,
    totalValue,
    amountPaid,
    startDate: c.startDate || f.startDate || "",
    endDate: c.endDate || f.endDate || "",
    duration: s(f.contractDuration) || "—",
    status: c.contractStatus || f.contractStatus || c.workflowStatus || "Active",
    currency: s(f.contractCurrencyId) || "BTN",
    commitmentRef: s(f.commitmentReference),
    budgetCode: s(f.budgetCode),
    milestones,
    multiYear: !!f.multiYearFlag,
  };
}

/* Build a side map from ContractForExtension.id → StoredContract so the UI
   can render the full snapshot panel for a real contract selection. */
export function buildStoredMap(
  contracts: StoredContract[],
): Record<string, StoredContract> {
  const map: Record<string, StoredContract> = {};
  for (const c of contracts) {
    const key = c.contractId || c.id;
    if (key) map[key] = c;
  }
  return map;
}
