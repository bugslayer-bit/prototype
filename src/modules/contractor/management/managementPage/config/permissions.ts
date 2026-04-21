/* Default contractor portal permission matrix */
import type { PermissionModule } from "../types";

export const DEFAULT_PERMISSIONS: PermissionModule[] = [
  { id: "invoice", title: "Invoice Submission", description: "Submit invoices against active contracts, upload supporting documents", icon: "\uD83D\uDCDD", granted: false },
  { id: "contract-dash", title: "Contract Dashboard", description: "View contract details, milestones, payment history, and status", icon: "\uD83D\uDCCA", granted: false },
  { id: "payment", title: "Payment Status", description: "Track payment orders, view payment history and schedules", icon: "\uD83D\uDCB0", granted: false },
  { id: "bill-discount", title: "Bill Discounting", description: "Request bill discounting, view eligibility and discounting status", icon: "\uD83D\uDCC4", granted: false },
  { id: "profile", title: "Profile Management", description: "Update contractor profile, bank details, contact information", icon: "\uD83D\uDC64", granted: false },
  { id: "documents", title: "Document Repository", description: "Upload, view, and manage contractor documents and certificates", icon: "\uD83D\uDCCE", granted: false },
  { id: "notifications", title: "Notifications", description: "Receive system alerts, contract updates, payment notifications", icon: "\uD83D\uDD14", granted: false },
  { id: "reports", title: "Reports & Analytics", description: "Generate contractor-specific reports, export data", icon: "\uD83D\uDCC8", granted: false },
];
