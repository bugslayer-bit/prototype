import { useState } from "react";
import { ContractorRegistrationIndividuals } from "./individuals/ContractorRegistrationIndividuals";
import { ContractorRegistrationBusiness } from "./business/ContractorRegistrationBusiness";
import { useContractorData } from "../../shared/context/ContractorDataContext";
import type { ContractorKind } from "../../shared/types";
import { cardClass, shellClass } from "./registrationPage";

/**
 * ContractorRegistrationPage — thin orchestrator.
 *
 * Shows a list/dashboard of existing contractors and launches the appropriate
 * full wizard (ContractorRegistrationIndividuals / ContractorRegistrationBusiness)
 * which internally render ContractorRegistrationWorkspace with the correct flow.
 */
type ListFilter = "all" | "individual" | "business" | "draft" | "verified" | "pending";

export function ContractorRegistrationPage() {
  const { contractors } = useContractorData();
  const [activeKind, setActiveKind] = useState<ContractorKind | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [search, setSearch] = useState("");

  if (activeKind === "individual") {
    return (
      <div>
        <button
          onClick={() => setActiveKind(null)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to contractor list
        </button>
        <ContractorRegistrationIndividuals />
      </div>
    );
  }

  if (activeKind === "business") {
    return (
      <div>
        <button
          onClick={() => setActiveKind(null)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to contractor list
        </button>
        <ContractorRegistrationBusiness />
      </div>
    );
  }

  const pendingCount = contractors.filter((c) => c.verification !== "Verified").length;
  const stats: { label: string; value: number; filter: ListFilter }[] = [
    { label: "Total", value: contractors.length, filter: "all" },
    { label: "Individual", value: contractors.filter((c) => c.kind === "individual").length, filter: "individual" },
    { label: "Business", value: contractors.filter((c) => c.kind === "business").length, filter: "business" },
    { label: "Draft", value: contractors.filter((c) => c.status === "Draft").length, filter: "draft" },
    { label: "Verified", value: contractors.filter((c) => c.verification === "Verified").length, filter: "verified" },
    { label: "Pending", value: pendingCount, filter: "pending" },
  ];

  const filtered = contractors.filter((c) => {
    if (listFilter === "individual" && c.kind !== "individual") return false;
    if (listFilter === "business" && c.kind !== "business") return false;
    if (listFilter === "draft" && c.status !== "Draft") return false;
    if (listFilter === "verified" && c.verification !== "Verified") return false;
    if (listFilter === "pending" && c.verification === "Verified") return false;
    if (search && !c.displayName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contractor Registration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage contractor onboarding — register individuals or businesses using the full SRS wizard.
        </p>
      </div>

      <div className={`${shellClass} space-y-6`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <button
              key={s.label}
              onClick={() => setListFilter(s.filter)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                listFilter === s.filter
                  ? "border-[#2563eb] bg-[#2563eb] text-white shadow-lg"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p
                className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${
                  listFilter === s.filter ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {s.label}
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  listFilter === s.filter ? "text-white" : "text-slate-900"
                }`}
              >
                {s.value}
              </p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search contractors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[240px] rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setActiveKind("individual")}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Register Individual
          </button>
          <button
            onClick={() => setActiveKind("business")}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Register Business
          </button>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className={`${cardClass} p-8 text-center text-slate-500`}>
              No contractors match the current filter.
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`${cardClass} flex items-center justify-between p-4`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{c.displayName}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {c.kind}
                    </span>
                    {c.verification === "Verified" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Verified
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.id} · Status: {c.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ContractorRegistrationPage;
