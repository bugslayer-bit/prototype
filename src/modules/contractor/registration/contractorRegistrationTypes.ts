import type { ContractorKind } from "../../../shared/types";

export interface ProcessStepMeta {
  title: string;
  code: string;
  description: string;
  refs: string[];
}

export interface FieldMeta {
  key: string;
  label: string;
  type?: "text" | "textarea" | "email" | "select";
  options?: string[];
  hint?: string;
  ref?: string;
  locked?: boolean;
}

export interface StageMeta {
  title: string;
  description: string;
  refs: string[];
  fields?: FieldMeta[];
  review?: boolean;
}

export interface ContractorFlowMeta {
  eyebrow: string;
  title: string;
  processDescription: string;
  lovs: string[];
  brs: string[];
  interfaces: string[];
  methods: { code: string; title: string; owner: string }[];
  steps: ProcessStepMeta[];
  stages: StageMeta[];
}

export interface ContractorRegistrationWorkspaceProps {
  kind: ContractorKind;
  flow: ContractorFlowMeta;
}
