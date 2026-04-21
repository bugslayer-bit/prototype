/* SanctionManagementPage — barrel exports */
export {
  INITIAL_SANCTION,
  INITIAL_ADVANCE,
  INITIAL_IMPREST,
  MOCK_SANCTIONS,
} from "./config/initialStates";
export {
  SANCTION_TYPE_FALLBACK,
  SANCTION_CATEGORY_FALLBACK,
  SUSPENSION_CATEGORY_FALLBACK,
  SANCTION_STATUS_FALLBACK,
  ADVANCE_TYPE_FALLBACK,
  CONTRACT_STATUS_FALLBACK,
  WORK_STATUS_FALLBACK,
  BOOLEAN_CHOICE_FALLBACK,
  UCOA_LEVEL_FALLBACK,
} from "./config/fallbacks";
export { useSanctionMasterData } from "./state/masterData";
export {
  panelClass,
  headerClass,
  inputClass,
  lockedInputClass,
  labelClass,
  btnClass,
} from "./ui/styleTokens";
export { ddBadge, brNote } from "./ui/badges";
export { statusColor, typeIcon } from "./state/display";
export { SANCTIONS_STORAGE_KEY, loadSanctions } from "./state/storage";
