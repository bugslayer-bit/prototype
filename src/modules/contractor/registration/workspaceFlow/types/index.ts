/* Local types for ContractorRegistrationWorkspace */
import type { FieldMeta, StageMeta } from "../../contractorRegistrationTypes";
import type { FormState } from "../../stages/sharedTypes";

export type WorkspaceFieldMeta = Omit<FieldMeta, "key"> & {
  key: keyof FormState;
};

export type WorkspaceStageMeta = Omit<StageMeta, "fields"> & {
  fields?: WorkspaceFieldMeta[];
};

export interface EntryMethodConfig {
  title: string;
  source: string;
  description: string;
  mode: "manual" | "bulk" | "external";
  lockedFields: (keyof FormState)[];
  suggestedValues: Partial<FormState>;
}
