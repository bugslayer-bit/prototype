/* Pure helper functions for VendorManagementPage */
import type {
  ContractorRecord,
  VendorAuditEntry,
  VendorStatus,
} from "../../../../shared/types";

export function deriveContractCategories(contractor: ContractorRecord) {
  const ct = contractor.contractualType ?? "";
  if (ct === "Goods Supplier") return ["Goods"];
  if (ct === "Works Contractor") return ["Works"];
  if (ct === "Consultancy Services" || ct === "Non-Consultancy Services" || contractor.contractorType === "Consultant") return ["Services"];
  if (contractor.category === "Business" && contractor.contractorType === "Contractor") return ["Works"];
  return ["Services"];
}

export function statusColor(status: string) {
  if (status === "Approved" || status === "Active") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "Pending approval" || status === "Pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "Rejected") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

/* Build an audit entry — used by submit/approve/reject/amend */
export function makeAudit(action: string, by: string, fromStatus?: VendorStatus, toStatus?: VendorStatus, remarks?: string): VendorAuditEntry {
  return { at: new Date().toISOString(), by, action, fromStatus, toStatus, remarks };
}

/* Sort vendors alphabetically by TPN, falling back to vendorName (SRS row 109) */
export function sortByTpn<T extends { tpn?: string; vendorName: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const at = (a.tpn || "").toLowerCase();
    const bt = (b.tpn || "").toLowerCase();
    if (at && bt) return at.localeCompare(bt);
    if (at) return -1;
    if (bt) return 1;
    return a.vendorName.localeCompare(b.vendorName);
  });
}
