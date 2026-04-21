/* SelectedContractSummary — dense dynamic card showing EVERY field on
   ContractForExtension the moment a contract is selected. Replaces the
   previous 8-field grid. */
import type { ContractForExtension } from "../../types";
import { ddTag } from "./tagHelpers";

interface Props {
  contract: ContractForExtension;
}

interface FieldDef {
  label: string;
  value: string;
  tag?: string;
  accent?: "default" | "money" | "status" | "mono";
}

export function SelectedContractSummary({ contract }: Props) {
  const fmt = (n: number) => n.toLocaleString();
  const amountRemaining = Math.max(0, contract.totalValue - contract.amountPaid);
  const paidPct =
    contract.totalValue > 0
      ? Math.round((contract.amountPaid / contract.totalValue) * 100)
      : 0;

  const fields: FieldDef[] = [
    { label: "Contract ID", value: contract.id, tag: "DD 14.1.1", accent: "mono" },
    { label: "Title", value: contract.title, tag: "DD 14.1.3" },
    { label: "Contractor", value: contract.contractorName || "—", tag: "DD 14.1.4" },
    { label: "Contractor ID", value: contract.contractorId || "—", accent: "mono" },
    { label: "Agency", value: contract.agencyName || "—", tag: "DD 14.1.21" },
    { label: "Agency ID", value: contract.agencyId || "—", accent: "mono" },
    { label: "Category", value: contract.category || "—", tag: "DD 14.1.22" },
    { label: "Currency", value: contract.currency || "BTN", tag: "DD 14.1.23" },
    { label: "Total Value", value: `${contract.currency || "BTN"} ${fmt(contract.totalValue)}`, tag: "DD 14.1.24", accent: "money" },
    { label: "Amount Paid", value: `${contract.currency || "BTN"} ${fmt(contract.amountPaid)}`, accent: "money" },
    { label: "Amount Remaining", value: `${contract.currency || "BTN"} ${fmt(amountRemaining)}`, accent: "money" },
    { label: "Paid %", value: `${paidPct}%` },
    { label: "Start Date", value: contract.startDate || "—", tag: "DD 14.1.18" },
    { label: "Current End Date", value: contract.endDate || "—", tag: "DD 14.1.19" },
    { label: "Duration", value: contract.duration || "—", tag: "DD 14.1.17" },
    { label: "Status", value: contract.status || "—", tag: "DD 14.1.37", accent: "status" },
    { label: "Commitment Ref", value: contract.commitmentRef || "—", tag: "DD 14.1.6", accent: "mono" },
    { label: "Budget Code", value: contract.budgetCode || "—", tag: "DD 14.1.7", accent: "mono" },
    { label: "Multi-Year Contract", value: contract.multiYear ? "Yes" : "No" },
    { label: "Milestones", value: String(contract.milestones.length) },
  ];

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-sky-900">📋 Selected Contract — {fields.length} fields</p>
        <span
          className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
            /active/i.test(contract.status)
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {contract.status}
        </span>
      </div>

      {/* Paid-vs-value progress bar — visible at a glance */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Amount utilised</span>
          <span className="font-bold text-slate-700">{paidPct}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-[#2563eb] transition-all duration-500"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0 rounded-xl border border-sky-100 bg-white px-3 py-2">
            <p className="text-[10px] uppercase text-slate-400">
              {f.label} {f.tag && ddTag(f.tag)}
            </p>
            <p
              className={`break-words text-sm font-bold ${
                f.accent === "money"
                  ? "text-slate-900"
                  : f.accent === "mono"
                  ? "font-mono text-xs text-slate-600"
                  : f.accent === "status"
                  ? "uppercase text-emerald-700"
                  : "text-slate-700"
              }`}
            >
              {f.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
