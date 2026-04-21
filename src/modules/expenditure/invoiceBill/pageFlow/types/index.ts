/* Types for InvoiceBillPage */
export type View =
  | "list"
  | "workspace"
  | "submission"
  | "submission-wizard"
  | "processing"
  | "approval"
  | "paymentOrder"
  | "reversal"
  | "setup-sanctions";

export interface DashboardTileDef {
  key: string;
  view: View;
  icon: string;
  title: string;
  cta: string;
  accent: string; // base accent text color (e.g. "sky-600")
  border: string; // base border class
  bg: string; // base bg-gradient class
  iconBg: string; // base icon gradient class
}
