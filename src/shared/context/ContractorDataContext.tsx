import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ContractorRecord, VendorRecord } from "../types";
import { SEED_CONTRACTORS } from "./demoSeed";
import { SEED_VENDORS } from "../../modules/vendor/vendorSeed";

interface ContractorDataContextValue {
  contractors: ContractorRecord[];
  vendors: VendorRecord[];
  addContractor: (record: ContractorRecord) => void;
  updateContractor: (id: string, updates: Partial<ContractorRecord>) => void;
  deleteContractor: (id: string) => void;
  addVendor: (record: VendorRecord) => void;
  updateVendor: (id: string, updates: Partial<VendorRecord>) => void;
  deleteVendor: (id: string) => void;
}

const CONTRACTORS_KEY = "ifmis-contractors";
const VENDORS_KEY = "ifmis-vendors";
const CONTRACTORS_API = "/api/contractors";

const ContractorDataContext = createContext<ContractorDataContextValue | null>(null);

function readStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw) as T[]; } catch { return []; }
}

/** Read contractors from localStorage and merge the demo seed set so the
 *  Contractor Management list, dropdowns on Contract Creation, etc. always
 *  have at least 10 believable entries to link against. Existing locally
 *  created contractors always win over seed entries with the same id. */
function readContractors(): ContractorRecord[] {
  const parsed = readStorage<ContractorRecord>(CONTRACTORS_KEY);
  const byId = new Map<string, ContractorRecord>();
  for (const s of SEED_CONTRACTORS) byId.set(s.id, s);
  for (const p of parsed) byId.set(p.id, p);
  return Array.from(byId.values());
}

/** Same merge-by-id pattern for Vendor Management: the SRS-aligned
 *  seed set (Utility, Subscription, Contribution, Others + Vehicle)
 *  is always present, but any locally-edited vendor wins, so pushing
 *  a seed vendor through the maker/checker workflow or amending
 *  bank details persists across reloads without losing the rest. */
function readVendors(): VendorRecord[] {
  const parsed = readStorage<VendorRecord>(VENDORS_KEY);
  const byId = new Map<string, VendorRecord>();
  for (const s of SEED_VENDORS) byId.set(s.id, s);
  for (const p of parsed) byId.set(p.id, p);
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

export function ContractorDataProvider({ children }: { children: ReactNode }) {
  const [contractors, setContractors] = useState<ContractorRecord[]>(() => readContractors());
  const [vendors, setVendors] = useState<VendorRecord[]>(() => readVendors());
  const hydratedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function hydrateFromSharedStore() {
      try {
        const response = await fetch(CONTRACTORS_API, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load shared contractors");
        }
        const remote = (await response.json()) as ContractorRecord[];
        if (!active || !Array.isArray(remote)) {
          hydratedRef.current = true;
          return;
        }
        /* Merge seed + remote so the demo contractors are always present even
           if the shared dev API starts empty. Remote entries (what other tabs
           have produced) win over seed entries with the same id. */
        const merged = new Map<string, ContractorRecord>();
        for (const s of SEED_CONTRACTORS) merged.set(s.id, s);
        for (const r of remote) merged.set(r.id, r);
        setContractors(Array.from(merged.values()));
        hydratedRef.current = true;
      } catch {
        hydratedRef.current = true;
      }
    }

    void hydrateFromSharedStore();

    const pollId = window.setInterval(() => {
      void hydrateFromSharedStore();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, []);

  useEffect(() => { window.localStorage.setItem(CONTRACTORS_KEY, JSON.stringify(contractors)); }, [contractors]);
  useEffect(() => { window.localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors)); }, [vendors]);

  /* ── Live cross-tab sync ───────────────────────────────────────────────
     When the contractor-portal persona submits an amendment in one tab,
     MoF / Admin persona open in another tab should see the pending item
     appear in the NotificationBell immediately — without a page reload.
     We listen for the browser-native `storage` event (fires in OTHER tabs
     of the same origin) and a custom `ifmis-contractors-changed` event
     (fires in the SAME tab when a persona is switched without reload). */
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === CONTRACTORS_KEY) setContractors(readContractors());
      if (e.key === VENDORS_KEY) setVendors(readVendors());
    }
    function onLocalChange() {
      setContractors(readContractors());
      setVendors(readVendors());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("ifmis-contractors-changed", onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ifmis-contractors-changed", onLocalChange);
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    void (async () => {
      try {
        await fetch(CONTRACTORS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contractors)
        });
      } catch {
        /* Keep localStorage as fallback if the shared dev API is unavailable. */
      }
    })();
  }, [contractors]);

  const value = useMemo<ContractorDataContextValue>(
    () => ({
      contractors,
      vendors,
      addContractor: (record) => setContractors((cur) => [record, ...cur]),
      updateContractor: (id, updates) => setContractors((cur) => cur.map(c => c.id === id ? { ...c, ...updates } : c)),
      deleteContractor: (id) => setContractors((cur) => cur.filter(c => c.id !== id)),
      addVendor: (record) => setVendors((cur) => [record, ...cur]),
      updateVendor: (id, updates) => setVendors((cur) => cur.map((v) => v.id === id ? { ...v, ...updates } : v)),
      deleteVendor: (id) => setVendors((cur) => cur.filter((v) => v.id !== id)),
    }),
    [contractors, vendors]
  );

  return <ContractorDataContext.Provider value={value}>{children}</ContractorDataContext.Provider>;
}

export function useContractorData() {
  const context = useContext(ContractorDataContext);
  if (!context) throw new Error("useContractorData must be used within ContractorDataProvider");
  return context;
}
