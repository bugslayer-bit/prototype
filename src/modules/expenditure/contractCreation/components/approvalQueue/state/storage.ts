/* Legacy localStorage helpers (kept for backward compatibility) */
import type { StoredContract } from "../../../../../../shared/context/ContractDataContext";

const LS_KEY = "ifmis_contracts";

export function loadContracts(): StoredContract[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredContract[];
  } catch { return []; }
}

export function saveContracts(contracts: StoredContract[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(contracts));
}

export function addContract(contract: StoredContract) {
  const list = loadContracts();
  const idx = list.findIndex((c) => c.id === contract.id);
  if (idx >= 0) list[idx] = contract;
  else list.unshift(contract);
  saveContracts(list);
}

export function updateStoredContract(id: string, patch: Partial<StoredContract>) {
  const list = loadContracts();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch };
  saveContracts(list);
}
