/* SRS-aligned LoV fallbacks for Sanction Management */
import type { SanctionType, SanctionCategory, SanctionStatus, AdvanceType } from "../../types";

export const SANCTION_TYPE_FALLBACK: SanctionType[] = ["Suspension", "Debarment", "Warning"];
export const SANCTION_CATEGORY_FALLBACK: SanctionCategory[] = ["Financial", "Contractual", "Legal"];
export const SUSPENSION_CATEGORY_FALLBACK = ["Temporary Suspension", "Permanent Suspension"];
export const SANCTION_STATUS_FALLBACK: SanctionStatus[] = ["Active", "Lifted", "Expired"];
export const ADVANCE_TYPE_FALLBACK: AdvanceType[] = ["Mobilization", "Material", "Secured"];
export const CONTRACT_STATUS_FALLBACK = ["Active", "Inactive", "Closed"];
export const WORK_STATUS_FALLBACK = ["In Progress", "Not Started", "Completed"];
export const BOOLEAN_CHOICE_FALLBACK = ["Yes", "No"];
export const UCOA_LEVEL_FALLBACK = [
  "Fund",
  "Sector",
  "Sub-Sector",
  "Programme",
  "Sub-Programme",
  "Activity",
  "Sub-Activity",
  "Object Code",
];
