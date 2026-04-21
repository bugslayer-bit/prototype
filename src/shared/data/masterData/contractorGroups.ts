import { MasterDataGroup } from "../masterData";

export const contractorGroups: MasterDataGroup[] = [
  {
    id: "entry-method",
    title: "Entry Method",
    description: "Process 1(a-c)",
    values: ["Manual Entry", "Bulk Upload", "System Interface"]
  },
  {
    id: "contractor-type",
    title: "Contractor Type",
    description: "LoV 1.1 — Individual / Business",
    values: ["Individual", "Business"]
  },
  {
    id: "contractor-category",
    title: "Entity Type",
    description: "LoV 1.2 — Entity Type (Individual/Business sub-types)",
    values: [
      "Individual",
      "Sole Proprietorship",
      "Partnership",
      "Consortium/Joint Venture",
      "Foreign Direct Investments",
      "Joint Alliances",
      "Public Private Partnerships",
      "Franchise",
      "Large Proprietary/Private Entity",
      "Corporations"
    ]
  },
  {
    id: "country-registration",
    title: "Country of Registration",
    description: "LoV 1.3 / master-data-driven",
    values: ["Bhutan", "India", "Bangladesh", "Nepal", "Thailand", "Singapore", "Japan", "Australia", "United Kingdom", "United States"]
  },
  {
    id: "contractor-status-primary",
    title: "Contractor Status - Primary",
    description: "LoV 1.4",
    values: ["Active", "Suspended", "Terminated", "Dissolved"]
  },
  {
    id: "contractor-status-secondary",
    title: "Contractor Status - Secondary",
    description: "LoV 1.5",
    values: ["Winding up", "Permanent debarment", "Temporary suspension", "Merged with another Contractor"]
  },
  {
    id: "contractor-source",
    title: "Source for Contractor Data",
    description: "LoV 1.8",
    values: ["Manual entry by the Agency", "e-GP system", "CMS", "Supplier Self Registration"]
  }
];
