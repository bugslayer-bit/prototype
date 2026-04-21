/* Sanctions list persistence — hydrated from localStorage, falling back to seed rows */
import type { ContractorSanctionRecord } from "../../types";
import { MOCK_SANCTIONS } from "../config/initialStates";

export const SANCTIONS_STORAGE_KEY = "ifmis-sanctions";

export const loadSanctions = (): ContractorSanctionRecord[] => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(SANCTIONS_STORAGE_KEY) : null;
    if (!raw) return MOCK_SANCTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : MOCK_SANCTIONS;
  } catch {
    return MOCK_SANCTIONS;
  }
};
