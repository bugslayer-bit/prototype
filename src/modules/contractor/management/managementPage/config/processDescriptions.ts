/* SRS Process Descriptions — PRN 1.1, 1.2, 1.3 */
import type { ProcessGroup } from "../types";

export const PROCESS_DESCRIPTIONS: ProcessGroup[] = [
  {
    prn: "PRN 1.1",
    title: "Contractor Registration",
    workflow: "Initiate contractor registration application with required documents",
    icon: "\uD83D\uDCDD",
    color: "sky",
    steps: [
      {
        stepNo: 1,
        title: "Contractor Registration",
        description:
          "Initiate new Contractor creation by online data entry in IFMIS, bulk file upload in prescribed format, or creation via API integration with external system. The system shall allow multiple-bank account registration; however, the system shall restrict one account per bank.",
        actor: "Users",
        subSteps: [
          { label: "a. Manual Entry", detail: "Manual online data entry in IFMIS", actor: "Contractor, Agency Staff / e-GP, CMS/System" },
          { label: "b. Bulk Upload", detail: "Bulk file upload (CSV/Excel) in prescribed format", actor: "Agency" },
          { label: "c. System Interfaces", detail: "External System Integration or API-based Integration", actor: "eGP / CMS" },
        ],
      },
      {
        stepNo: 2,
        title: "Profile Validation & Verification",
        description:
          "Internal uniqueness and external validations on vital Contractor details as described in the Data Dictionary — Business Registration ID, Bank Account, TPN, National ID, etc.",
        actor: "System",
      },
      {
        stepNo: 3,
        title: "Submit",
        description: "User submits the registration form for approval.",
        actor: "User",
      },
      {
        stepNo: 4,
        title: "Approve",
        description:
          "Approval workflow is determined by the level of approval based on configurations made in the module-specific workflow config. System outputs ensure the Contractor Master Table is updated. On approval, the system generates a unique Contractor ID (or maps to a standard). Contractor becomes available for selection across IFMIS.",
        actor: "Approver / System",
      },
    ],
  },
  {
    prn: "PRN 1.2",
    title: "Contractor Amendment",
    workflow: "Amend Contractor Profile",
    icon: "\u270F\uFE0F",
    color: "amber",
    steps: [
      {
        stepNo: 1,
        title: "Amendment Request",
        description:
          "Initiate amendment request based on allowed data fields editing rights established in the system (only certain fields can be edited such as Contractor Name, Category (LoV 1.2), Types, etc.).",
        actor: "Supplier/Contractor Self-Service Portal, Government Agencies, or System Triggered Amendments",
        subSteps: [
          { label: "Initiators", detail: "Supplier/Contractor Self-Service Portal, Government Agencies, System Triggered Amendments" },
          { label: "Approval Authority", detail: "No approval hierarchies in the agency but roles assigning authority \u2014 P Level or P Level officers other than Finance/Department domain" },
        ],
      },
      {
        stepNo: 2,
        title: "Amendment Approval",
        description:
          "Approval workflow is determined by the level of approval based on configurations made in the module-specific workflow config. System outputs ensure the Contractor Master Table is updated. On approval, the system updates the Contractor record. Contractor remains available for selection across IFMIS.",
        actor: "Approver / System",
      },
    ],
  },
  {
    prn: "PRN 1.3",
    title: "Contractor User Management",
    workflow: "Contractor User Management",
    icon: "\uD83D\uDC64",
    color: "rose",
    steps: [
      {
        stepNo: 1,
        title: "Contractor User Access",
        description:
          "Configure user access settings for contractor portal users, including role-based access control, user group administration, and access audit and monitoring.",
        actor: "Contractor",
        subSteps: [
          { label: "1. Role-Based Access Control (RBAC)", detail: "Define roles (Viewer, Submitter, Manager) and assign fine-grained permissions per module \u2014 Invoice Submission, Contract Dashboard, Payment Status, Bill Discounting, Profile Management, Document Repository, Notifications, Reports & Analytics" },
          { label: "2. User Group Administration", detail: "Create and manage user groups with shared permission sets. Designate authorized users/delegates who can act on behalf of the contractor in the IFMIS portal" },
          { label: "3. Access Audit & Monitoring", detail: "Track login history, permission changes, failed login attempts, and delegate actions. Maintain full audit trail of all user access events for compliance" },
        ],
      },
      {
        stepNo: 2,
        title: "Contractor User Authorization",
        description:
          "Define authorization and security policies for contractor portal users, including multi-factor authentication support, Bhutan NDI integration, single sign-on, password policy enforcement, and session management.",
        actor: "Contractor",
        subSteps: [
          { label: "1. Multi-Factor Authentication (MFA)", detail: "Support for Username/Password, OTP via SMS, OTP via Email, and Two-Factor Authentication (2FA) for enhanced security" },
          { label: "2. Bhutan NDI Integration", detail: "Digital Certificate authentication via Bhutan National Digital Identity for seamless and secure government-standard verification" },
          { label: "3. SSO Integration", detail: "Single Sign-On integration with government portals and enterprise systems for unified authentication experience" },
          { label: "4. Password Policy Enforcement", detail: "Configurable password expiry (30/60/90 days), minimum complexity requirements, password history, and maximum login attempts before lockout" },
          { label: "5. Session Management", detail: "Configurable session timeout (15/30/60/120 minutes), IP restriction (No Restriction / Bhutan Only / Specific IP Range), concurrent session limits, and automatic session termination" },
        ],
      },
    ],
  },
];
