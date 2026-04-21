/* Derivation engine for ContractLifecyclePage */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import type {
  TrackedMilestone,
  ContractAlert,
  ContractProgressSummary,
  MilestoneTrackingStatus,
} from "../../types";
import type { LifecycleOverlay } from "../types";
import { todayISO, daysBetween } from "./dateHelpers";
import { overlayKey, seedOverlayFromStatus } from "./overlay";

export function deriveMilestoneStatus(
  plannedDate: string,
  overlay: LifecycleOverlay,
): MilestoneTrackingStatus {
  if (overlay.paymentReleased) return "paid";
  if (overlay.deliverableAccepted) return "completed";
  if (overlay.completionPercent > 0) {
    if (plannedDate && plannedDate < todayISO() && overlay.completionPercent < 100) return "overdue";
    return "in-progress";
  }
  if (plannedDate && plannedDate < todayISO()) return "overdue";
  return "not-started";
}

export function buildTrackedMilestone(
  contract: StoredContract,
  rowIndex: number,
  overlayMap: Record<string, LifecycleOverlay>,
): TrackedMilestone {
  const row = contract.formData.milestoneRows[rowIndex];
  const mid = row.milestoneId || row.id || `M${rowIndex + 1}`;
  const overlay =
    overlayMap[overlayKey(contract.id, mid)] ?? seedOverlayFromStatus(row.milestoneStatus);
  const status = deriveMilestoneStatus(row.estimatedPaymentDate, overlay);
  const daysOverdue =
    status === "overdue" && row.estimatedPaymentDate
      ? Math.max(0, daysBetween(row.estimatedPaymentDate, todayISO()))
      : 0;
  /* SLA deadline = planned date + 7 days (SRS BR 21.11 — Processing_Time_Days) */
  const slaDeadline =
    overlay.slaDeadline ||
    (row.estimatedPaymentDate
      ? new Date(new Date(row.estimatedPaymentDate).getTime() + 7 * 86_400_000)
          .toISOString()
          .slice(0, 10)
      : "");
  const slaBreached = !!slaDeadline && slaDeadline < todayISO() && status !== "paid";

  return {
    milestoneId: mid,
    milestoneNumber: parseInt(row.milestoneNumber, 10) || rowIndex + 1,
    milestoneName: row.milestoneName || `Milestone ${rowIndex + 1}`,
    plannedDate: row.estimatedPaymentDate || "",
    actualDate: overlay.actualDate,
    grossAmount: row.milestoneAmountGross || "0",
    netAmount: row.netMilestoneAmount || "0",
    status,
    completionPercent: status === "paid" || status === "completed" ? 100 : overlay.completionPercent,
    deliverableSubmitted: overlay.deliverableSubmitted,
    deliverableAccepted: overlay.deliverableAccepted,
    invoiceSubmitted: overlay.invoiceSubmitted,
    paymentReleased: overlay.paymentReleased,
    daysOverdue,
    esgEnvironmentTag: overlay.esgEnvironmentTag,
    esgSocialTag: overlay.esgSocialTag,
    esgGovernanceTag: overlay.esgGovernanceTag,
    slaDeadline,
    slaBreached,
  };
}

export function buildContractSummary(
  contract: StoredContract,
  milestones: TrackedMilestone[],
): ContractProgressSummary {
  const contractValue = parseFloat(contract.contractValue || contract.formData.contractValue || "0") || 0;

  const grossSum = milestones.reduce((s, m) => s + (parseFloat(m.grossAmount) || 0), 0);
  /* Weighted percent complete — falls back to even weighting if all
     milestones are zero-amount. */
  const percentComplete = milestones.length
    ? Math.round(
        milestones.reduce((s, m) => {
          const w = grossSum > 0 ? (parseFloat(m.grossAmount) || 0) / grossSum : 1 / milestones.length;
          return s + m.completionPercent * w;
        }, 0),
      )
    : 0;

  const amountPaid = milestones
    .filter((m) => m.paymentReleased)
    .reduce((s, m) => s + (parseFloat(m.grossAmount) || 0), 0);
  const amountRemaining = Math.max(0, contractValue - amountPaid);

  const milestonesCompleted = milestones.filter((m) => m.status === "paid" || m.status === "completed").length;
  const milestonesOverdue = milestones.filter((m) => m.status === "overdue").length;
  const milestonesPending = milestones.length - milestonesCompleted - milestonesOverdue;

  /* Timeline adherence — derived from elapsed-vs-planned ratio + overdue count */
  let timelineAdherence: ContractProgressSummary["timelineAdherence"] = "on-track";
  if (milestonesOverdue >= 2) timelineAdherence = "delayed";
  else if (milestonesOverdue === 1) timelineAdherence = "at-risk";
  else if (contract.startDate && contract.endDate) {
    const total = daysBetween(contract.startDate, contract.endDate) || 1;
    const elapsed = Math.max(0, daysBetween(contract.startDate, todayISO()));
    const elapsedPct = Math.min(100, Math.round((elapsed / total) * 100));
    if (percentComplete + 15 < elapsedPct) timelineAdherence = "at-risk";
    if (percentComplete + 30 < elapsedPct) timelineAdherence = "delayed";
  }

  /* Payment adherence — paid value vs expected paid (proportional to completion) */
  let paymentAdherence: ContractProgressSummary["paymentAdherence"] = "on-track";
  const expectedPaid = (percentComplete / 100) * contractValue;
  if (amountPaid > expectedPaid * 1.05) paymentAdherence = "ahead";
  else if (amountPaid < expectedPaid * 0.85) paymentAdherence = "behind";

  /* ESG composite — count of ESG tags set across all milestones (max 3 per
     milestone). SRS 3.2.2.4. */
  const esgPossible = milestones.length * 3;
  const esgActual = milestones.reduce(
    (s, m) => s + (m.esgEnvironmentTag ? 1 : 0) + (m.esgSocialTag ? 1 : 0) + (m.esgGovernanceTag ? 1 : 0),
    0,
  );
  const esgScore = esgPossible > 0 ? Math.round((esgActual / esgPossible) * 100) : 0;

  /* SLA compliance — % of milestones whose SLA was NOT breached */
  const slaCompliancePercent = milestones.length
    ? Math.round((milestones.filter((m) => !m.slaBreached).length / milestones.length) * 100)
    : 100;

  return {
    contractId: contract.contractId || contract.id,
    contractTitle: contract.contractTitle || "(Untitled contract)",
    contractValue: String(contractValue),
    amountPaid: String(amountPaid),
    amountRemaining: String(amountRemaining),
    startDate: contract.startDate || "",
    endDate: contract.endDate || "",
    percentComplete,
    milestonesTotal: milestones.length,
    milestonesCompleted,
    milestonesPending,
    milestonesOverdue,
    timelineAdherence,
    paymentAdherence,
    esgScore,
    slaCompliancePercent,
  };
}

export function buildAlerts(
  contract: StoredContract,
  summary: ContractProgressSummary,
  milestones: TrackedMilestone[],
): ContractAlert[] {
  const alerts: ContractAlert[] = [];
  const today = todayISO();

  milestones.forEach((m) => {
    /* (3.0.2) Overdue milestone alert */
    if (m.status === "overdue") {
      alerts.push({
        id: `${contract.id}-${m.milestoneId}-OD`,
        type: "milestone-overdue",
        severity: "critical",
        title: "Milestone Overdue",
        message: `${m.milestoneName} is ${m.daysOverdue} day(s) overdue \u2014 ${summary.contractId}`,
        contractId: summary.contractId,
        milestoneId: m.milestoneId,
        createdAt: today,
        acknowledged: false,
      });
    }
    /* (3.0.1) Upcoming milestone reminder — within next 14 days */
    if (m.status === "not-started" && m.plannedDate) {
      const days = daysBetween(today, m.plannedDate);
      if (days >= 0 && days <= 14) {
        alerts.push({
          id: `${contract.id}-${m.milestoneId}-UP`,
          type: "milestone-due",
          severity: days <= 3 ? "warning" : "info",
          title: "Upcoming Milestone",
          message: `${m.milestoneName} due ${m.plannedDate} (${days}d) \u2014 ${summary.contractId}`,
          contractId: summary.contractId,
          milestoneId: m.milestoneId,
          createdAt: today,
          acknowledged: false,
        });
      }
    }
    /* (3.0.3) Payment eligibility — deliverable accepted but not yet paid */
    if (m.deliverableAccepted && !m.paymentReleased) {
      alerts.push({
        id: `${contract.id}-${m.milestoneId}-PE`,
        type: "payment-eligible",
        severity: "info",
        title: "Payment Eligible",
        message: `${m.milestoneName} verified \u2014 payment can be released for ${summary.contractId}`,
        contractId: summary.contractId,
        milestoneId: m.milestoneId,
        createdAt: today,
        acknowledged: false,
      });
    }
    /* SLA breach (BR 21.11) */
    if (m.slaBreached) {
      alerts.push({
        id: `${contract.id}-${m.milestoneId}-SLA`,
        type: "sla-breach",
        severity: "critical",
        title: "SLA Breach",
        message: `${m.milestoneName} breached SLA deadline ${m.slaDeadline} \u2014 escalate`,
        contractId: summary.contractId,
        milestoneId: m.milestoneId,
        createdAt: today,
        acknowledged: false,
      });
    }
    /* ESG framework flag (3.2.2.4) — any tag missing */
    if (!(m.esgEnvironmentTag && m.esgSocialTag && m.esgGovernanceTag)) {
      alerts.push({
        id: `${contract.id}-${m.milestoneId}-ESG`,
        type: "esg-flag",
        severity: "warning",
        title: "ESG Compliance Flag",
        message: `${m.milestoneName} is missing one or more ESG tags \u2014 review framework`,
        contractId: summary.contractId,
        milestoneId: m.milestoneId,
        createdAt: today,
        acknowledged: false,
      });
    }
  });

  /* Contract expiry — within 60 days */
  if (summary.endDate) {
    const days = daysBetween(today, summary.endDate);
    if (days >= 0 && days <= 60) {
      alerts.push({
        id: `${contract.id}-EXP`,
        type: "contract-expiring",
        severity: days <= 14 ? "critical" : "warning",
        title: "Contract Expiring",
        message: `${summary.contractTitle} ends ${summary.endDate} (${days}d) \u2014 ${summary.contractId}`,
        contractId: summary.contractId,
        createdAt: today,
        acknowledged: false,
      });
    }
  }

  /* Budget threshold — > 80% utilised */
  const utilisation =
    parseFloat(summary.contractValue) > 0
      ? parseFloat(summary.amountPaid) / parseFloat(summary.contractValue)
      : 0;
  if (utilisation >= 0.8) {
    alerts.push({
      id: `${contract.id}-BT`,
      type: "budget-threshold",
      severity: utilisation >= 0.95 ? "critical" : "warning",
      title: "Budget Threshold",
      message: `${Math.round(utilisation * 100)}% of contract value disbursed for ${summary.contractId}`,
      contractId: summary.contractId,
      createdAt: today,
      acknowledged: false,
    });
  }

  return alerts;
}
