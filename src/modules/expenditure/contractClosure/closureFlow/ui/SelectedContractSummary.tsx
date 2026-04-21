/* SelectedContractSummary — dense dynamic card that surfaces EVERY field
   on StoredContract (and its nested ContractFormState) that matters to
   the Contract Closure flow. Modelled on the Contract Extension version
   so the two modules stay visually consistent. */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import { ddTag } from "./tagHelpers";

interface Props {
  contract: StoredContract;
  paidTotal: number;
  outstanding: number;
  retentionHeld: number;
}

interface FieldDef {
  label: string;
  value: string;
  tag?: string;
  accent?: "default" | "money" | "status" | "mono";
}

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function SelectedContractSummary({
  contract,
  paidTotal,
  outstanding,
  retentionHeld,
}: Props) {
  const f = contract.formData || ({} as StoredContract["formData"]);
  const currency = f?.contractCurrencyId || "BTN";
  const cv = parseFloat(contract.contractValue || f?.contractValue || "0") || 0;
  const paidPct = cv > 0 ? Math.round((paidTotal / cv) * 100) : 0;

  const money = (v: string | number | undefined) => {
    const n = typeof v === "number" ? v : parseFloat(v || "0") || 0;
    return `${currency} ${fmt(n)}`;
  };

  const fields: FieldDef[] = [
    { label: "Contract ID", value: contract.contractId || "—", tag: "DD 14.1.1", accent: "mono" },
    { label: "Title", value: contract.contractTitle || "—", tag: "DD 14.1.3" },
    { label: "Classification", value: contract.contractClassification || "—", tag: "DD 14.1.2" },
    { label: "Method", value: contract.method || "—", tag: "DD 14.1.5" },
    { label: "Category", value: (contract.contractCategory || []).join(", ") || "—", tag: "DD 14.1.22" },
    { label: "Agency", value: contract.agencyName || "—", tag: "DD 14.1.21" },
    { label: "Contractor", value: contract.contractorName || "—", tag: "DD 14.1.4" },
    { label: "Contractor ID", value: contract.contractorId || "—", accent: "mono" },
    { label: "Currency", value: currency, tag: "DD 14.1.23" },
    { label: "Contract Value", value: money(cv), tag: "DD 14.1.24", accent: "money" },
    { label: "Total Paid", value: money(paidTotal), accent: "money" },
    { label: "Outstanding", value: money(outstanding), accent: "money" },
    { label: "Paid %", value: `${paidPct}%` },
    { label: "Retention Held", value: money(retentionHeld), tag: "DD 14.1.32", accent: "money" },
    { label: "Retention Rate", value: f?.retentionRate ? `${f.retentionRate}%` : "—", tag: "DD 14.1.31" },
    { label: "Retention Applicable", value: f?.retentionApplicable ? "Yes" : "No" },
    { label: "Warranty (mo.)", value: f?.warrantyMonths || "—" },
    { label: "Advance Payment", value: f?.advancePayment ? "Yes" : "No", tag: "DD 14.1.28" },
    { label: "Advance Amount", value: money(f?.advanceAmount), tag: "DD 14.1.29", accent: "money" },
    { label: "Advance Recoverable", value: f?.advanceRecoverable ? "Yes" : "No" },
    { label: "Advance Recovery Amount", value: money(f?.advanceRecoveryAmount), accent: "money" },
    { label: "Advance Recovery Method", value: f?.advanceRecoveryMethod || "—" },
    { label: "Liquidated Damages Limit", value: money(f?.liquidatedDamagesLimit), tag: "DD 14.1.36", accent: "money" },
    { label: "Start Date", value: contract.startDate || f?.startDate || "—", tag: "DD 14.1.18" },
    { label: "End Date", value: contract.endDate || f?.endDate || "—", tag: "DD 14.1.19" },
    { label: "Duration", value: f?.contractDuration || "—", tag: "DD 14.1.17" },
    { label: "Multi-Year", value: f?.multiYearFlag ? "Yes" : "No" },
    { label: "Contract Status", value: contract.contractStatus || f?.contractStatus || "—", tag: "DD 14.1.37", accent: "status" },
    { label: "Workflow", value: contract.workflowStatus || "—", accent: "status" },
    { label: "Current Approver", value: contract.currentApprover || "—" },
    { label: "Budget Code", value: f?.budgetCode || "—", tag: "DD 14.1.7", accent: "mono" },
    { label: "Commitment Ref", value: f?.commitmentReference || "—", tag: "DD 14.1.6", accent: "mono" },
    { label: "Funding Source", value: contract.fundingSource || f?.fundingSource || "—" },
    { label: "Expenditure Type", value: contract.expenditureType || f?.expenditureType || "—" },
    { label: "Tax Applicable", value: f?.taxApplicable ? "Yes" : "No", tag: "DD 14.1.26" },
    { label: "Tax Types", value: (f?.taxType || []).join(", ") || "—", tag: "DD 14.1.27" },
    { label: "TDS Rate", value: f?.tdsRate ? `${f.tdsRate}%` : "—" },
    { label: "Milestones", value: String(f?.milestoneRows?.length || 0) },
    { label: "Items", value: String(f?.contractItemRows?.length || 0) },
    { label: "Documents", value: String(f?.supportingDocuments?.length || 0) },
    { label: "Submitted At", value: contract.submittedAt || "—" },
    { label: "Approved At", value: contract.approvedAt || "—" },
  ];

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-sky-900">
          📋 Selected Contract — {fields.length} fields (fully dynamic)
        </p>
        <span
          className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
            /active|approved/i.test(contract.contractStatus || contract.workflowStatus || "")
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {contract.contractStatus || contract.workflowStatus || "—"}
        </span>
      </div>

      {/* utilisation bar */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Amount utilised</span>
          <span className="font-bold text-slate-700">{paidPct}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-[#2563eb] transition-all duration-500"
            style={{ width: `${Math.min(100, paidPct)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map((fd) => (
          <div
            key={fd.label}
            className="min-w-0 rounded-xl border border-sky-100 bg-white px-3 py-2"
          >
            <p className="text-[10px] uppercase text-slate-400">
              {fd.label} {fd.tag && ddTag(fd.tag)}
            </p>
            <p
              className={`break-words text-sm font-bold ${
                fd.accent === "money"
                  ? "text-slate-900"
                  : fd.accent === "mono"
                    ? "font-mono text-xs text-slate-600"
                    : fd.accent === "status"
                      ? "uppercase text-emerald-700"
                      : "text-slate-700"
              }`}
            >
              {fd.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
