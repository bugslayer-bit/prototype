import { ContractorRegistrationWorkspace } from "../registration/ContractorRegistrationWorkspace";
import type { ContractorFlowMeta } from "../registration/contractorRegistrationTypes";

const businessFlow: ContractorFlowMeta = {
  eyebrow: "Business Contractor",
  title: "Businesses",
  processDescription:
    "Initiate business contractor registration through manual entry, bulk file upload, or external integration. The system then validates business registration ID, bank details, and TPN, before routing the profile to configurable approval workflow and publishing it to contractor master.",
  lovs: ["LoV 1.1 Contractor Type", "LoV 1.2 Entity Type", "LoV 1.11 Nationality", "LoV business registration references"],
  brs: [
    "BR: business registration number must be unique in contractor master",
    "BR: one bank account per bank is allowed",
    "BR: approved contractor is selectable across IFMIS after workflow completion"
  ],
  interfaces: ["IBLS / Business Registry", "RAMIS / BITS", "CBS / Banking validation", "e-GP", "CMS"],
  methods: [
    { code: "a", title: "Manual Entry", owner: "Contractor, Agency staff, e-GP, CMS/system" },
    { code: "b", title: "Bulk Upload", owner: "Agency" },
    { code: "c", title: "System Interfaces", owner: "eGP / CMS" }
  ],
  steps: [
    { title: "Initiate contractor registration", code: "1", description: "Start business contractor creation using supported entry methods and integration channels.", refs: ["PRN 1", "SRS Process Description"] },
    { title: "Profile validation and verification", code: "2", description: "Run uniqueness checks and validate business registration ID, TPN, and bank account with internal and external references.", refs: ["DD vital fields", "BR verification"] },
    { title: "Submit registration", code: "4", description: "User submits the business registration package to workflow.", refs: ["Workflow submission"] },
    { title: "Approve and publish", code: "5", description: "On approval, system updates contractor master and exposes the contractor for IFMIS usage.", refs: ["Workflow config", "Contractor master"] }
  ],
  stages: [
    {
      title: "Business Profile",
      description: "Start a business contractor profile with the selected onboarding channel and category references.",
      refs: ["PRN 1", "LoV references"],
      fields: [
        { key: "contractorId", label: "Contractor ID", ref: "DD 10.1", hint: "Auto-generated on successful validation.", locked: true },
        { key: "contractorType", label: "Contractor Type", type: "select", options: [], ref: "LoV 1.1" },
        { key: "category", label: "Entity Type", type: "select", options: [], ref: "LoV 1.2" },
        { key: "nationality", label: "Business Origin", type: "select", options: [], ref: "LoV 1.11" },
        { key: "entryMethod", label: "Entry Method", type: "select", options: [], ref: "Process 1(a-c)" },
        { key: "contractorStatusPrimary", label: "Contractor Status - Primary", type: "select", options: [], ref: "DD 10.20 / LoV 1.4" },
        { key: "contractorStatusSecondary", label: "Contractor Status - Secondary", type: "select", options: [], ref: "DD 10.21 / LoV 1.5" },
        { key: "dataSource", label: "Source for Supplier Data", type: "select", options: [], ref: "DD 10.23 / LoV 1.8", locked: true },
        { key: "registrationDate", label: "Registration Date", ref: "DD 10.24", hint: "System timestamp.", locked: true },
        { key: "statusReason", label: "Status Reason", type: "textarea", ref: "DD 10.22", hint: "Used when status is not Active." }
      ]
    },
    { title: "Business Registration", description: "Capture the legal business profile and primary taxpayer data for validation.", refs: ["DD business profile", "IBLS / RAMIS interfaces"] },
    { title: "Address", description: "Record the registered business address for the contractor.", refs: ["DD address", "UI Sample"] },
    { title: "Bank Account", description: "Capture the active bank account profile for the business contractor.", refs: ["BR bank account rule", "bank interfaces"] },
    {
      title: "Contact(s)",
      description: "Capture responsible business contact details aligned to the registration sample and DD references.",
      refs: ["UI Sample contacts", "DD contact fields"],
      fields: [
        { key: "contactPerson", label: "Business Contact Person" },
        { key: "contactRole", label: "Role / Designation" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone Number" }
      ]
    },
    {
      title: "Review & Approve",
      description: "Review the profile and push it to approval so the contractor can be created in master data and reused across IFMIS.",
      refs: ["Process step 5", "Contractor master output"],
      review: true
    }
  ]
};

export function ContractorRegistrationBusiness() {
  return <ContractorRegistrationWorkspace kind="business" flow={businessFlow} />;
}
