export { contractorGroups } from "./contractorGroups";
export { contractGroups } from "./contractGroups";
export { personGroups } from "./personGroups";
export { locationGroups } from "./locationGroups";
export { bankGroups } from "./bankGroups";
export { miscGroups } from "./miscGroups";

import { contractorGroups } from "./contractorGroups";
import { contractGroups } from "./contractGroups";
import { personGroups } from "./personGroups";
import { locationGroups } from "./locationGroups";
import { bankGroups } from "./bankGroups";
import { miscGroups } from "./miscGroups";

export interface MasterDataGroup {
  id: string;
  title: string;
  description: string;
  values: string[];
}

export const contractorMasterData: MasterDataGroup[] = [
  ...contractorGroups,
  ...contractGroups,
  ...personGroups,
  ...locationGroups,
  ...bankGroups,
  ...miscGroups
];

export const contractorMasterDataMap = new Map(contractorMasterData.map((group) => [group.id, group.values]));
