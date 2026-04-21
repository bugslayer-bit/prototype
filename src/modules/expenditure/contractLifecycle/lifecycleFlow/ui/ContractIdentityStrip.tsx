/* ContractIdentityStrip — dynamic header card shown at the top of the
   Lifecycle page. Reacts instantly to the selected contract. */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";

interface Props {
  contract: StoredContract;
}

function badge(tone: "sky" | "violet" | "emerald" | "amber" | "rose" | "slate"): string {
  const map: Record<string, string> = {
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return map[tone];
}

function workflowTone(status: string): "sky" | "violet" | "emerald" | "amber" | "rose" | "slate" {
  const s = status.toLowerCase();
  if (s.includes("approved")) return "emerald";
  if (s.includes("reject")) return "rose";
  if (s.includes("review") || s.includes("submit")) return "amber";
  if (s.includes("draft")) return "slate";
  return "sky";
}

export function ContractIdentityStrip({ contract }: Props) {
  const f = contract.formData || ({} as StoredContract["formData"]);
  const contractId = contract.contractId || f.contractId || contract.id;
  const title = contract.contractTitle || f.contractTitle || "(Untitled contract)";
  const agency = contract.agencyName || f.agencyName || "";
  const contractorName = contract.contractorName || f.contractorName || "";
  const contractorId = contract.contractorId || f.contractorId || "";
  const workflow = contract.workflowStatus || f.workflowStatus || "";
  const method = contract.formData?.method || contract.method || "";
  const categories: string[] =
    Array.isArray(contract.contractCategory) && contract.contractCategory.length
      ? contract.contractCategory
      : Array.isArray(f.contractCategory)
      ? f.contractCategory
      : [];
  const classification = contract.contractClassification || f.contractClassification || "";

  return (
    <section className="rounded-[24px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            {contractId}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {agency && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${badge("slate")}`}>
                🏢 {agency}
              </span>
            )}
            {contractorName && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${badge("emerald")}`}>
                🧑‍💼 {contractorName}
                {contractorId ? ` (${contractorId})` : ""}
              </span>
            )}
            {classification && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${badge("violet")}`}>
                {classification}
              </span>
            )}
            {method && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${badge("sky")}`}>
                {String(method).replace(/-/g, " ")}
              </span>
            )}
            {workflow && (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${badge(workflowTone(workflow))}`}
              >
                {workflow.replace(/[-_]/g, " ")}
              </span>
            )}
            {categories.map((c) => (
              <span
                key={c}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${badge("amber")}`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
