/* Searchable Contract Selector — works at scale (10k+ contracts) */
import { useState, useMemo, useRef, useEffect } from "react";
import { useContractData, type StoredContract } from "../../../../../shared/context/ContractDataContext";

interface Props {
  value: string;
  disabled: boolean;
  onSelect: (contract: StoredContract) => void;
}

export function ContractSearchSelector({ value, disabled, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { contracts: allContracts } = useContractData();

  /* Only show approved contracts eligible for amendment */
  const eligible = useMemo(
    () => allContracts.filter((c) => c.workflowStatus === "approved"),
    [allContracts],
  );

  /* Search — caps at 50 results for performance with 10k+ contracts */
  const results = useMemo(() => {
    if (!query.trim()) return eligible.slice(0, 50);
    const q = query.toLowerCase();
    return eligible
      .filter(
        (c) =>
          c.contractId.toLowerCase().includes(q) ||
          c.contractTitle.toLowerCase().includes(q) ||
          c.contractorName.toLowerCase().includes(q) ||
          c.agencyName.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [eligible, query]);

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedContract = allContracts.find((c) => c.contractId === value);

  return (
    <div ref={wrapRef} className="relative">
      <label className="text-sm font-semibold text-slate-700">
        Select Contract <span className="text-[#d32f2f]">*</span>
      </label>

      {/* Selected display / trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`mt-1 flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left transition ${
          open ? "border-sky-300 ring-4 ring-sky-50" : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "cursor-not-allowed bg-slate-100" : ""}`}
      >
        {selectedContract ? (
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 font-mono">{selectedContract.contractId}</span>
            <span className="truncate text-sm font-medium text-slate-900">{selectedContract.contractTitle}</span>
            <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">Nu. {selectedContract.contractValue}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">Search and select an approved contract...</span>
        )}
        <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Search input */}
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-50"
                placeholder="Search by ID, title, contractor, agency..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-400">{eligible.length} approved contract{eligible.length !== 1 ? "s" : ""} available — showing {results.length}</p>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                {eligible.length === 0 ? "No approved contracts found. Approve a contract first." : "No contracts match your search."}
              </div>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-sky-50 ${c.contractId === value ? "bg-sky-50" : ""}`}
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 font-mono">{c.contractId}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{c.contractTitle}</p>
                    <p className="text-[10px] text-slate-400">{c.contractorName} — {c.agencyName}</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs font-semibold text-slate-700">Nu. {c.contractValue}</p>
                    <p className="text-[10px] text-slate-400">{c.contractCategory.join(", ")}</p>
                  </div>
                  {c.contractId === value && (
                    <svg className="h-5 w-5 shrink-0 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
