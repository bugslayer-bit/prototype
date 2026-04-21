/* Lifecycle overlay helpers for ContractLifecyclePage */
import type { LifecycleOverlay } from "../types";
import { todayISO } from "./dateHelpers";

export const overlayKey = (cid: string, mid: string) => `${cid}::${mid}`;

export const defaultOverlay = (): LifecycleOverlay => ({
  actualDate: "",
  completionPercent: 0,
  deliverableSubmitted: false,
  deliverableAccepted: false,
  invoiceSubmitted: false,
  paymentReleased: false,
  slaDeadline: "",
  esgEnvironmentTag: true,
  esgSocialTag: true,
  esgGovernanceTag: true,
});

/* Seed sensible overlay defaults from milestone status so that contracts
   created with `milestoneStatus = "Paid" / "Completed"` already display
   correct workflow chips on first load. */
export function seedOverlayFromStatus(status: string): LifecycleOverlay {
  const o = defaultOverlay();
  const s = (status || "").toLowerCase();
  if (s === "paid") {
    o.deliverableSubmitted = true;
    o.deliverableAccepted = true;
    o.invoiceSubmitted = true;
    o.paymentReleased = true;
    o.completionPercent = 100;
    o.actualDate = todayISO();
  } else if (s === "completed" || s === "achieved") {
    o.deliverableSubmitted = true;
    o.deliverableAccepted = true;
    o.completionPercent = 100;
    o.actualDate = todayISO();
  } else if (s === "in progress" || s === "in-progress") {
    o.deliverableSubmitted = true;
    o.completionPercent = 50;
  }
  return o;
}
