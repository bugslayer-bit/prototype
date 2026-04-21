/* useSanctionMasterData — pulls all Sanction Management LoVs from MasterDataContext
   with SRS-aligned fallbacks when master data isn't available. */
import { useMemo } from "react";
import { useMasterData } from "../../../../../shared/context/MasterDataContext";
import type { SanctionType, SanctionCategory, SanctionStatus, AdvanceType } from "../../types";
import {
  SANCTION_TYPE_FALLBACK,
  SANCTION_CATEGORY_FALLBACK,
  SUSPENSION_CATEGORY_FALLBACK,
  SANCTION_STATUS_FALLBACK,
  ADVANCE_TYPE_FALLBACK,
  CONTRACT_STATUS_FALLBACK,
  WORK_STATUS_FALLBACK,
  BOOLEAN_CHOICE_FALLBACK,
  UCOA_LEVEL_FALLBACK,
} from "../config/fallbacks";

export function useSanctionMasterData() {
  const { masterDataMap } = useMasterData();
  return useMemo(() => {
    const get = <T extends string>(id: string, fb: readonly T[]): T[] => {
      const list = masterDataMap.get(id);
      return list && list.length > 0 ? (list as T[]) : [...fb];
    };
    return {
      sanctionTypes: get<SanctionType>("sanction-type", SANCTION_TYPE_FALLBACK),
      sanctionCategories: get<SanctionCategory>("sanction-category", SANCTION_CATEGORY_FALLBACK),
      suspensionCategories: get("sanction-category", SUSPENSION_CATEGORY_FALLBACK),
      sanctionStatuses: get<SanctionStatus>("sanction-status", SANCTION_STATUS_FALLBACK),
      advanceTypes: get<AdvanceType>("contractual-advance-category", ADVANCE_TYPE_FALLBACK),
      affectedAgencies: get("affected-agencies", []),
      sanctioningAgencies: get("sanctioning-agency", []),
      contractStatuses: get("advance-contract-status", CONTRACT_STATUS_FALLBACK),
      workStatuses: get("advance-work-status", WORK_STATUS_FALLBACK),
      booleanChoices: get("boolean-choice", BOOLEAN_CHOICE_FALLBACK),
      ucoaLevels: get("ucoa-level", UCOA_LEVEL_FALLBACK),
    };
  }, [masterDataMap]);
}
