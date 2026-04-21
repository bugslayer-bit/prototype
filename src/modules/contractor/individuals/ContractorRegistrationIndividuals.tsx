import { ContractorRegistrationWorkspace } from "../registration/ContractorRegistrationWorkspace";
import type { ContractorFlowMeta } from "../registration/contractorRegistrationTypes";

const individualFlow: ContractorFlowMeta = {
  eyebrow: "Individual Contractor",
  title: "Contractor registration for individuals",
  processDescription:
    "Initiate contractor registration through manual online data entry, bulk upload, or external system interfaces. The profile then goes through internal uniqueness checks and external verification of national ID, TPN, bank account, and related master details before submission and approval.",
  lovs: ["LoV 1.1 Contractor Type", "LoV 1.2 Entity Type", "LoV 1.11 Nationality", "LoV 5.x Bank references"],
  brs: [
    "BR: contractor profile must remain unique across contractor master",
    "BR: one bank account per bank is allowed, while multiple banks can be registered",
    "BR: vital details are validated against internal and external source systems"
  ],
  interfaces: ["Census System / DCRC", "RAMIS / BITS", "IBLS", "e-GP", "CMS"],
  methods: [
    { code: "a", title: "Manual Entry", owner: "Contractor, Agency staff, e-GP, CMS/system" },
    { code: "b", title: "Bulk Upload", owner: "Agency" },
    { code: "c", title: "System Interfaces", owner: "eGP / CMS" }
  ],
  steps: [
    { title: "Initiate contractor registration", code: "1", description: "Start contractor creation from online entry, bulk upload, or API-based integration.", refs: ["PRN 1", "SRS Process Description"] },
    { title: "Profile validation and verification", code: "2", description: "Run uniqueness checks and verify national ID, TPN, registration, and bank account against internal and external sources.", refs: ["DD vital fields", "BR verification"] },
    { title: "Submit registration", code: "4", description: "User submits the completed registration profile for approval.", refs: ["Workflow submission"] },
    { title: "Approve and publish", code: "5", description: "Approval workflow updates contractor master and makes the contractor available across IFMIS.", refs: ["Workflow config", "Contractor master"] }
  ],
  stages: [
    {
      title: "Personal Information",
      description: "Select contractor type, category, nationality, salutation, and entry method exactly as the process starts in the SRS.",
      refs: ["PRN 1", "LoV 1.1", "LoV 1.2", "LoV 1.11"],
      fields: [
        { key: "contractorId", label: "Contractor ID", ref: "DD 10.1", hint: "Auto-generated on successful validation.", locked: true },
        { key: "contractorType", label: "Contractor Type", type: "select", options: [], ref: "LoV 1.1" },
        { key: "category", label: "Entity Type", type: "select", options: [], ref: "LoV 1.2" },
        { key: "nationality", label: "Nationality", type: "select", options: [], ref: "LoV 1.11" },
        { key: "entryMethod", label: "Entry Method", type: "select", options: [], ref: "Process 1(a-c)" },
        { key: "salutation", label: "Salutation", type: "select", options: [], ref: "DD 10.5 / LoV 1.9" },
        { key: "contractorStatusPrimary", label: "Contractor Status - Primary", type: "select", options: [], ref: "DD 10.20 / LoV 1.4" },
        { key: "contractorStatusSecondary", label: "Contractor Status - Secondary", type: "select", options: [], ref: "DD 10.21 / LoV 1.5" },
        { key: "dataSource", label: "Source for Supplier Data", type: "select", options: [], ref: "DD 10.23 / LoV 1.8", locked: true },
        { key: "registrationDate", label: "Registration Date", ref: "DD 10.24", hint: "System timestamp.", locked: true },
        { key: "isPrimaryContractor", label: "Is Primary Contractor?", type: "select", options: ["No", "Yes"], ref: "DD 10.35" },
        { key: "statusReason", label: "Status Reason", type: "textarea", ref: "DD 10.22", hint: "Used when status is not Active." }
      ]
    },
    { title: "Identity & Registration", description: "Capture individual identity and taxpayer details that will later be validated by source systems.", refs: ["DD contractor header", "Census / RAMIS interfaces"] },
    { title: "Address", description: "Capture contact address aligned to the individual registration format and interface-driven profile.", refs: ["DD address", "UI Sample"] },
    { title: "Bank Account", description: "Capture the active bank account profile used later in payment processing.", refs: ["BR one account per bank", "Bank interfaces"] },
    {
      title: "Contact(s)",
      description: "Set the contact point and primary communication profile for the contractor record.",
      refs: ["DD 10.19", "UI Sample contacts"],
      fields: [
        { key: "contactPerson", label: "Contact Person" },
        { key: "contactRole", label: "Contact Role / Designation" }
      ]
    },
    {
      title: "Review & Approve",
      description: "Review the registration package, then submit and route it for approval so the contractor can be published to the IFMIS master.",
      refs: ["Process step 4", "Process step 5"],
      review: true
    }
  ]
};

export function ContractorRegistrationIndividuals() {
  return <ContractorRegistrationWorkspace kind="individual" flow={individualFlow} />;
}
