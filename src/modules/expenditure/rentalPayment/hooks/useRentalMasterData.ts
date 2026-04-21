/* ═══════════════════════════════════════════════════════════════════════════
   useRentalMasterData
   ───────────────────
   Pulls every LoV needed by Rental Payment Management from the shared
   MasterDataContext, so admins can add/remove options from /master-data
   without touching code. Soft fallbacks mirror the SRS LoV 10.1 values.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { useMasterData } from "../../../../shared/context/MasterDataContext";
import type { AssetCategory, AssetSubClass, AssetType } from "../types";

export interface RentalMasterData {
  assetCategory: AssetCategory[];
  assetType: AssetType[];
  /* LoV 10.1 — sub-classes mapped to a category + type */
  assetSubClassByType: Record<AssetType, AssetSubClass[]>;
  paymentFrequency: string[];       /* LoV 10.1 */
  paymentStatus: string[];          /* LoV 10.1 */
  assetStatus: string[];            /* Active / Inactive / Terminated */
  transactionStatus: string[];      /* Pending / Approved / Paid */
  deductionCodes: string[];         /* TDS / BIT / Other — from Tax Master */
  /* UCoA Integration */
  budgetCodes: string[];            /* UCoA Level-2 budget heads */
  expenditureHeads: string[];       /* UCoA object codes */
  fundingSources: string[];         /* RGOB / Donor / Loan / Project Fund */
  agencies: string[];               /* affected-agencies master data */
}

const FALLBACK = {
  assetCategory: ["Tangible Assets", "Intangible Assets"] as AssetCategory[],
  assetType: ["Immovable Properties", "Movable Properties", "Intellectual Property"] as AssetType[],
  assetSubClassByType: {
    "Immovable Properties": ["Land", "House", "House/Buildings/Structures"],
    "Movable Properties": ["Vehicles", "Aero Services", "Machineries"],
    "Intellectual Property": [
      "Copy Rights",
      "Patents",
      "Trademarks",
      "Industrial Designs",
      "Trade Secrets",
      "Geographical Indications",
    ],
  } as Record<AssetType, AssetSubClass[]>,
  paymentFrequency: ["Monthly", "Quarterly", "Yearly", "Fiscal Year"],
  paymentStatus: ["Pending", "Approved", "Paid"],
  assetStatus: ["Active", "Inactive", "Terminated"],
  transactionStatus: ["Pending", "Approved", "Paid"],
  deductionCodes: ["TDS", "BIT"],
} as const;

function get(map: Map<string, string[]>, id: string, fallback: readonly string[]): string[] {
  const list = map.get(id);
  return list && list.length > 0 ? list : [...fallback];
}

export function useRentalMasterData(): RentalMasterData {
  const { masterDataMap } = useMasterData();

  return useMemo(() => {
    const immovable = get(
      masterDataMap,
      "rental-subclass-immovable",
      FALLBACK.assetSubClassByType["Immovable Properties"],
    ) as AssetSubClass[];
    const movable = get(
      masterDataMap,
      "rental-subclass-movable",
      FALLBACK.assetSubClassByType["Movable Properties"],
    ) as AssetSubClass[];
    const ip = get(
      masterDataMap,
      "rental-subclass-ip",
      FALLBACK.assetSubClassByType["Intellectual Property"],
    ) as AssetSubClass[];

    return {
      assetCategory: get(masterDataMap, "rental-asset-category", FALLBACK.assetCategory) as AssetCategory[],
      assetType: get(masterDataMap, "rental-asset-type", FALLBACK.assetType) as AssetType[],
      assetSubClassByType: {
        "Immovable Properties": immovable,
        "Movable Properties": movable,
        "Intellectual Property": ip,
      },
      paymentFrequency: get(masterDataMap, "payment-frequency", FALLBACK.paymentFrequency),
      paymentStatus: get(masterDataMap, "rental-payment-status", FALLBACK.paymentStatus),
      assetStatus: get(masterDataMap, "rental-asset-status", FALLBACK.assetStatus),
      transactionStatus: get(masterDataMap, "rental-transaction-status", FALLBACK.transactionStatus),
      deductionCodes: get(masterDataMap, "tax-code", FALLBACK.deductionCodes),
      budgetCodes: get(masterDataMap, "utility-budget-code", []),
      expenditureHeads: get(masterDataMap, "utility-expenditure-head", []),
      fundingSources: get(masterDataMap, "utility-funding-source", []),
      agencies: get(masterDataMap, "affected-agencies", []),
    };
  }, [masterDataMap]);
}
