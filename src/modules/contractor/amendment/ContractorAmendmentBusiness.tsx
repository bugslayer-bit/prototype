import { ContractorAmendmentWorkspace } from "../registration/ContractorAmendmentWorkspace";
import type { ContractorFlowMeta } from "../registration/contractorRegistrationTypes";

const businessAmendmentFlow: ContractorFlowMeta = {
  eyebrow: "Business Contractor Amendment",
  title: "Amendment of Business Contractor Profile",
  processDescription:
    "Amend an existing business contractor profile to update legal name, registration details, contact information, address, bank account, or other editable fields. Business registration number and other source-owned fields remain locked. The amendment is tracked for audit purposes and submitted for approval before being published to the IFMIS contractor master.",
  lovs: [
    "LoV 1.1 Contractor Type",
    "LoV 1.2 Entity Type",
    "LoV 1.3 Country of Registration",
    "LoV 1.4 Contractor Status Primary",
    "LoV 1.5 Contractor Status Secondary",
    "LoV 1.8 Data Source",
    "LoV 1.11 Nationality",
    "LoV 2.1 Gewog",
    "LoV 2.2 Dungkhag",
    "LoV 2.3 Thromde",
    "LoV 2.4 Dzongkhag",
    "LoV 3.x Bank references",
    "LoV 5.x Contact roles",
    "LoV 6.2 Sanction Category"
  ],
  brs: [
    "BR: Amendment audit trail must be maintained for all changes",
    "BR: Business Registration Number (BRN) remains locked (from source systems)",
    "BR: Business Name, registration date, and TPN are locked (from IBLS/RAMIS)",
    "BR: Trade name, phone, email, address, bank, and status are editable",
    "BR: One bank account per bank is allowed, while multiple banks can be registered",
    "BR: Amendment must be approved before updating contractor master"
  ],
  interfaces: [
    "IBLS (for business registration verification)",
    "RAMIS / BITS (for TPN validation)",
    "Bank CBS (for bank account validation)",
    "e-GP (for notification)",
    "CMS (for notification)"
  ],
  methods: [
    { code: "a", title: "Self-Service Portal", owner: "Business representative" },
    { code: "b", title: "Government Agency", owner: "Agency staff" },
    { code: "c", title: "System Triggered", owner: "System" }
  ],
  steps: [
    {
      title: "Lookup & Amendment Request",
      code: "0",
      description: "Search for existing business contractor and initiate amendment with justification.",
      refs: ["Amendment Request"]
    },
    {
      title: "Personal Information",
      code: "1",
      description: "Review and modify contractor type, category, nationality, and status (where editable).",
      refs: ["PRN 1", "LoV 1.1", "LoV 1.2", "LoV 1.11"]
    },
    {
      title: "Identity & Registration",
      code: "2",
      description: "Business registration details locked to IBLS source. Trade name and other editable fields can be updated.",
      refs: ["DD contractor header", "IBLS / RAMIS interfaces"]
    },
    {
      title: "Address",
      code: "3",
      description: "Update business address information aligned to registered address format.",
      refs: ["DD address"]
    },
    {
      title: "Contact(s)",
      code: "4",
      description: "Manage contact persons and communication details for the business.",
      refs: ["DD 10.19", "Contact management"]
    },
    {
      title: "Bank Account",
      code: "5",
      description: "Update or add bank account information used in payment processing.",
      refs: ["BR one account per bank", "Bank interfaces"]
    },
    {
      title: "Review & Submit",
      code: "6",
      description: "Review change summary and submit amendment for approval.",
      refs: ["Amendment approval workflow", "Audit trail"]
    }
  ],
  stages: [
    {
      title: "Lookup & Amendment Request",
      description: "Search for the contractor and provide amendment justification.",
      refs: ["Amendment Initiation"]
    },
    {
      title: "Personal Information",
      description: "Review and modify contractor classification and status.",
      refs: ["PRN 1", "LoV 1.1", "LoV 1.2", "LoV 1.11"]
    },
    {
      title: "Identity & Registration Numbers",
      description: "Business registration details locked to IBLS. Update trade name and other editable fields.",
      refs: ["DD contractor header", "IBLS / RAMIS interfaces"]
    },
    {
      title: "Address",
      description: "Update business registered address with regional/district details.",
      refs: ["DD address", "Geographic master data"]
    },
    {
      title: "Contact(s)",
      description: "Manage contact persons and communication details for the business.",
      refs: ["DD 10.19", "Contact management"]
    },
    {
      title: "Bank Account",
      description: "Update bank account details used in payment processing.",
      refs: ["BR one account per bank", "Bank interfaces"]
    },
    {
      title: "Review & Approve",
      description: "Review changes summary and submit amendment for approval.",
      refs: ["Amendment approval workflow"]
    }
  ]
};

export function ContractorAmendmentBusiness() {
  return <ContractorAmendmentWorkspace kind="business" flow={businessAmendmentFlow} />;
}
