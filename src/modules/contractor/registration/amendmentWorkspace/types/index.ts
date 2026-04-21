/* Types for ContractorAmendmentWorkspace */
import type { FieldMeta, StageMeta } from "../../contractorRegistrationTypes";
import type { FormState } from "../../stages/sharedTypes";

export type WorkspaceFieldMeta = Omit<FieldMeta, "key"> & {
  key: keyof FormState;
};

export type WorkspaceStageMeta = Omit<StageMeta, "fields"> & {
  fields?: WorkspaceFieldMeta[];
};

export interface FieldEditability {
  editable: boolean;
  locked: boolean;
  currentValue: string;
}
