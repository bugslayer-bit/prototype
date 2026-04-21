import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ContractFormState } from "../../modules/expenditure/contractCreation/types";
import type { AmendmentFormState } from "../../modules/expenditure/contractAmendment/types";
import { SEED_CONTRACTS } from "./contractSeed";

/* ═══════════════════════════════════════════════════════════════════════════
   StoredContract — mirrors the shape already used in ContractApprovalQueue
   ═══════════════════════════════════════════════════════════════════════════ */

export interface StoredContract {
  id: string;
  contractId: string;
  contractTitle: string;
  contractValue: string;
  contractCategory: string[];
  contractClassification: string;
  method: string;
  agencyName: string;
  contractorName: string;
  contractorId: string;
  startDate: string;
  endDate: string;
  workflowStatus: string;
  contractStatus: string;
  submittedAt: string;
  approvedAt: string;
  rejectedAt: string;
  approvalRemarks: string;
  currentApprover: string;
  fundingSource: string;
  expenditureType: string;
  formData: ContractFormState;
  amendmentDraft?: AmendmentFormState | null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Context value
   ═══════════════════════════════════════════════════════════════════════════ */

interface ContractDataContextValue {
  contracts: StoredContract[];
  addContract: (contract: StoredContract) => void;
  updateContract: (id: string, patch: Partial<StoredContract>) => void;
  removeContract: (id: string) => void;
}

const LS_KEY = "ifmis_contracts";
const CONTRACTS_API = "/api/contracts";

const ContractDataContext = createContext<ContractDataContextValue | null>(null);

function readStorage(): StoredContract[] {
  if (typeof window === "undefined") return SEED_CONTRACTS;
  const raw = window.localStorage.getItem(LS_KEY);
  if (!raw) return SEED_CONTRACTS;
  try {
    const parsed = JSON.parse(raw) as StoredContract[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_CONTRACTS;
    /* Ensure the seed contracts always exist (merge by id, local wins) so the
       Secured-Advance demo contract is always available even after the user
       has created their own contracts. */
    const byId = new Map<string, StoredContract>();
    for (const s of SEED_CONTRACTS) byId.set(s.id, s);
    for (const p of parsed) byId.set(p.id, p);
    return Array.from(byId.values());
  } catch {
    return SEED_CONTRACTS;
  }
}

export function ContractDataProvider({ children }: { children: ReactNode }) {
  const [contracts, setContracts] = useState<StoredContract[]>(() => readStorage());
  const hydratedRef = useRef(false);

  /* ── Hydrate from shared dev API (one-shot, then merge by id) ──
     The previous version polled every 5s and overwrote local state with the
     remote payload. That wiped freshly-created contracts whenever the dev
     API was empty or stale. Now we only fetch once on mount and merge by
     id, so a locally-created contract can never disappear. */
  useEffect(() => {
    let active = true;

    async function hydrateOnce() {
      try {
        const response = await fetch(CONTRACTS_API, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load shared contracts");
        const remote = (await response.json()) as StoredContract[];
        if (!active || !Array.isArray(remote)) { hydratedRef.current = true; return; }

        if (remote.length > 0) {
          setContracts((local) => {
            /* Merge by id — local entries always win because the user just
               created/edited them in this tab. */
            const byId = new Map<string, StoredContract>();
            for (const r of remote) byId.set(r.id, r);
            for (const l of local) byId.set(l.id, l);
            return Array.from(byId.values());
          });
        }
      } catch {
        /* Network or 404 — fall back to localStorage state already loaded. */
      } finally {
        hydratedRef.current = true;
      }
    }

    void hydrateOnce();
    return () => { active = false; };
  }, []);

  /* ── Persist to localStorage ── */
  useEffect(() => { window.localStorage.setItem(LS_KEY, JSON.stringify(contracts)); }, [contracts]);

  /* ── Push to shared dev API ── */
  useEffect(() => {
    if (!hydratedRef.current) return;
    void (async () => {
      try {
        await fetch(CONTRACTS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contracts),
        });
      } catch { /* localStorage fallback */ }
    })();
  }, [contracts]);

  const value = useMemo<ContractDataContextValue>(
    () => ({
      contracts,
      addContract: (contract) => setContracts((cur) => {
        const idx = cur.findIndex((c) => c.id === contract.id);
        if (idx >= 0) {
          const updated = [...cur];
          updated[idx] = contract;
          return updated;
        }
        return [contract, ...cur];
      }),
      updateContract: (id, patch) => setContracts((cur) =>
        cur.map((c) => c.id === id ? { ...c, ...patch } : c)
      ),
      removeContract: (id) => setContracts((cur) => cur.filter((c) => c.id !== id)),
    }),
    [contracts],
  );

  return <ContractDataContext.Provider value={value}>{children}</ContractDataContext.Provider>;
}

export function useContractData() {
  const context = useContext(ContractDataContext);
  if (!context) throw new Error("useContractData must be used within ContractDataProvider");
  return context;
}
