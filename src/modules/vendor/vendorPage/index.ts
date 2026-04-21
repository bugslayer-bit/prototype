/* VendorManagementPage — barrel exports */
export type { PageView, VendorFormState, EnrichedVendor } from "./types";
export {
  VENDOR_CATEGORIES,
  INTEGRATION_SOURCES,
  APPROVAL_CHAIN,
  initialVehicle,
  initialForm,
} from "./config/catalogues";
export {
  deriveContractCategories,
  statusColor,
  makeAudit,
  sortByTpn,
} from "./state/helpers";
export { ddTag, lovTag } from "./ui/tags";
