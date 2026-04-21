/* ═══════════════════════════════════════════════════════════════════════════
   Retention Money Management — Types (SRS PRN 9.1 – 9.3)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Retention record action type per SRS */
export type RetentionAction = "make-payment" | "forfeit" | "early-encashment";

/** Overall status of the retention record */
export type RetentionStatus =
  | "held"            // Retention currently held in Non-CF account
  | "partial-release" // Some retention released
  | "released"        // Full payment made to contractor
  | "forfeited"       // Transferred to CF account
  | "encashed"        // Early encashment via Bank Guarantee
  | "pending-action"; // Awaiting user decision

/** DLP (Defect Liability Period) status */
export type DLPStatus = "active" | "expired" | "waived";

/** A single retention record tied to a contract */
export interface RetentionRecord {
  id: string;
  contractId: string;
  contractTitle: string;
  contractorId: string;
  contractorName: string;
  agencyCode: string;
  agencyName: string;
  workId: string;
  /** Contract category: Works / Goods / Services */
  contractCategory: "Works" | "Goods" | "Services";
  /** Total contract value (Nu) */
  contractValue: number;
  /** Retention percentage (default 10% per PRR) */
  retentionPct: number;
  /** Total retention amount = sum of all bill-wise deductions */
  totalRetention: number;
  /** Amount already released/paid back */
  releasedAmount: number;
  /** Forfeited amount */
  forfeitedAmount: number;
  /** Balance = totalRetention - releasedAmount - forfeitedAmount */
  balanceRetention: number;
  /** Contract start date */
  contractStartDate: string;
  /** Contract end date */
  contractEndDate: string;
  /** DLP expiry date (typically 12 months after completion) */
  dlpExpiryDate: string;
  /** DLP status */
  dlpStatus: DLPStatus;
  /** Retention release date (when eligible) */
  releaseDate: string;
  /** Current status */
  status: RetentionStatus;
  /** Non-CF account reference */
  nonCfAccountRef: string;
  /** Bank Guarantee reference (for early encashment) */
  bankGuaranteeRef?: string;
  /** Bank Guarantee amount */
  bankGuaranteeAmount?: number;
  /** Remarks */
  remarks: string;
  /** Last action taken */
  lastAction?: RetentionAction;
  /** Timestamp of last action */
  lastActionDate?: string;
  /** Number of bills from which retention was deducted */
  billCount: number;
  /** Currency */
  currency: "Nu" | "USD" | "INR";
}

/** Action form for processing a retention record */
export interface RetentionActionForm {
  action: RetentionAction | "";
  contractStatus: "completed" | "in-progress" | "terminated" | "";
  remarks: string;
  paymentType: "full" | "partial" | "";
  deductionAmount: number;
  defectRemarks: string;
  bankGuaranteeVerified: boolean;
  bankGuaranteeAmount: number;
}

/** Retention processing step */
export type RetentionStep =
  | "select-contract"
  | "review-details"
  | "choose-action"
  | "action-form"
  | "submit";

/** Tab for the retention list view */
export type RetentionTab = "active" | "released" | "forfeited" | "all";
