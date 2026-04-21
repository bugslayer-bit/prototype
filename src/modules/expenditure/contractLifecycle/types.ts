export type MilestoneTrackingStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "overdue"
  | "paid";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType =
  | "milestone-due"
  | "milestone-overdue"
  | "payment-eligible"
  | "contract-expiring"
  | "budget-threshold"
  | "sla-breach"
  | "esg-flag";

export interface TrackedMilestone {
  milestoneId: string;
  milestoneNumber: number;
  milestoneName: string;
  plannedDate: string;
  actualDate: string;
  grossAmount: string;
  netAmount: string;
  status: MilestoneTrackingStatus;
  completionPercent: number;
  deliverableSubmitted: boolean;
  deliverableAccepted: boolean;
  invoiceSubmitted: boolean;
  paymentReleased: boolean;
  daysOverdue: number;
  /* SRS 3.2.2.4 — ESG Framework Tags */
  esgEnvironmentTag: boolean;
  esgSocialTag: boolean;
  esgGovernanceTag: boolean;
  /* SRS — SLA tracking */
  slaDeadline: string;
  slaBreached: boolean;
}

export interface ContractAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  contractId: string;
  milestoneId?: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface ContractProgressSummary {
  contractId: string;
  contractTitle: string;
  contractValue: string;
  amountPaid: string;
  amountRemaining: string;
  startDate: string;
  endDate: string;
  percentComplete: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  milestonesPending: number;
  milestonesOverdue: number;
  timelineAdherence: "on-track" | "at-risk" | "delayed";
  paymentAdherence: "on-track" | "ahead" | "behind";
  /* SRS 3.2.2.4 — ESG composite score (0–100) */
  esgScore: number;
  /* SRS — SLA compliance percentage */
  slaCompliancePercent: number;
}

export interface LifecycleState {
  contracts: ContractProgressSummary[];
  milestones: TrackedMilestone[];
  alerts: ContractAlert[];
  selectedContractId: string;
}
