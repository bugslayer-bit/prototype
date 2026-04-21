import { ContractorAmendmentWorkspace } from "../registration/ContractorAmendmentWorkspace";
import type { ContractorFlowMeta } from "../registration/contractorRegistrationTypes";

const individualAmendmentFlow: ContractorFlowMeta = {
  eyebrow: "Individual Contractor Amendment",
  title: "Amendment of Individual Contractor Profile",
  processDescription:
    "Amend an existing individual contractor profile to update personal details, contact information, address, bank account, or other editable fields. The amendment is tracked for audit purposes and submitted for approval before being published to the IFMIS contractor master.",
  lovs: [
    "LoV 1.1 Contractor Type",
    "LoV 1.2 Entity Type",
    "LoV 1.4 Contractor Status Primary",
    "LoV 1.5 Contractor Status Secondary",
    "LoV 1.9 Salutation",
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
    "BR: CID, first/middle/last name, and gender remain locked (Census data)",
    "BR: Salutation, TPN, phone, email, address, bank, and status are editable",
    "BR: One bank account per bank is allowed, while multiple banks can be registered",
    "BR: Amendment must be approved before updating contractor master"
  ],
  interfaces: [
    "Census System / DCRC (for identity verification)",
    "RAMIS / BITS (for TPN validation)",
    "Bank CBS (for bank account validation)",
    "e-GP (for notification)",
    "CMS (for notification)"
  ],
  methods: [
    { code: "a", title: "Self-Service Portal", owner: "Contractor" },
    { code: "b", title: "Government Agency", owner: "Agency staff" },
    { code: "c", title: "System Triggered", owner: "System" }
  ],
  steps: [
    {
      title: "Lookup & Amendment Request",
      code: "0",
      description: "Search for existing contractor and initiate amendment with justification.",
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
      description: "Individual identity details locked to Census data. TPN and salutation are editable.",
      refs: ["DD contractor header", "Census / RAMIS interfaces"]
    },
    {
      title: "Address",
      code: "3",
      description: "Update address information aligned to individual registration format.",
      refs: ["DD address"]
    },
    {
      title: "Contact(s)",
      code: "4",
      description: "Manage contact person and communication details.",
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
      title: "Identity & Reg.",
      description: "Individual identity locked to Census data. Update salutation, TPN, and other editable fields.",
      refs: ["DD contractor header", "Census / RAMIS interfaces"]
    },
    {
      title: "Address",
      description: "Update address information with regional/district details.",
      refs: ["DD address", "Geographic master data"]
    },
    {
      title: "Contact(s)",
      description: "Manage contact persons and communication details.",
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

export function ContractorAmendmentIndividuals() {
  return <ContractorAmendmentWorkspace kind="individual" flow={individualAmendmentFlow} />;
}
