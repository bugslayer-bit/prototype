/* Local types for ContractLifecyclePage */
export interface LifecycleOverlay {
  actualDate: string;
  completionPercent: number;
  deliverableSubmitted: boolean;
  deliverableAccepted: boolean;
  invoiceSubmitted: boolean;
  paymentReleased: boolean;
  slaDeadline: string;
  esgEnvironmentTag: boolean;
  esgSocialTag: boolean;
  esgGovernanceTag: boolean;
}

export type Tab = "dashboard" | "details" | "milestones" | "alerts";

/* ── Dynamic Snapshot (Details tab) ──────────────────────────────────────── */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";

export type SnapshotFieldKind =
  | "text"
  | "money"
  | "date"
  | "bool"
  | "tag"
  | "list"
  | "badge"
  | "multiline";

export interface SnapshotFieldDef {
  label: string;
  get: (c: StoredContract) => unknown;
  kind?: SnapshotFieldKind;
  hideWhenEmpty?: boolean;
}

export interface SnapshotSection {
  key: string;
  title: string;
  icon: string;
  accent: string; // tailwind bg color e.g. "bg-sky-500"
  fields: SnapshotFieldDef[];
}
