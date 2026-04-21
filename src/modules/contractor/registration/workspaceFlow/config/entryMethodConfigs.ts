/* Entry method configuration catalogues for ContractorRegistrationWorkspace */
import type { ContractorKind } from "../../../../../shared/types";
import type { EntryMethodConfig } from "../types";

export const entryMethodConfigs: Record<ContractorKind, Record<string, EntryMethodConfig>> = {
  individual: {
    "Manual Entry": {
      title: "Manual Online Data Entry in IFMIS",
      source: "User-driven initiation",
      description: "User enters the contractor profile directly in IFMIS. All relevant fields remain editable.",
      mode: "manual",
      lockedFields: [],
      suggestedValues: {}
    },
    "Bulk Upload": {
      title: "Bulk File Upload (CSV/Excel)",
      source: "Agency upload template",
      description: "Core identity details are loaded from the uploaded file. Only operational fields stay editable in the form.",
      mode: "bulk",
      lockedFields: ["contractorType", "category", "nationality", "salutation", "registrationNumber", "displayName", "firstName", "middleName", "lastName", "gender", "taxNumber"],
      suggestedValues: {
        contractorType: "Individual Contractor",
        category: "Individual",
        nationality: "Bhutanese",
        salutation: "Mr.",
        registrationNumber: "CID-FROM-BULK-UPLOAD",
        firstName: "Imported",
        middleName: "Profile",
        lastName: "Record",
        displayName: "Imported Profile Record",
        gender: "Male",
        taxNumber: "TPN-FROM-UPLOAD"
      }
    },
    "System Integration": {
      title: "External System Integration / API",
      source: "CMS / e-GP / source systems",
      description: "Profile values are received from connected systems. Source-owned fields are locked and only selected operational fields should be edited locally.",
      mode: "external",
      lockedFields: ["contractorType", "category", "nationality", "registrationNumber", "displayName", "firstName", "middleName", "lastName", "gender", "taxNumber", "businessRegistrationDate", "countryOfRegistration"],
      suggestedValues: {
        contractorType: "Individual Contractor",
        category: "Individual",
        nationality: "Bhutanese",
        registrationNumber: "CID-FROM-BCRS",
        firstName: "Interface",
        middleName: "Linked",
        lastName: "Individual",
        displayName: "Interface Linked Individual",
        gender: "Female",
        taxNumber: "TPN-FROM-INTERFACE"
      }
    }
  },
  business: {
    "Manual Entry": {
      title: "Manual Online Data Entry in IFMIS",
      source: "User-driven initiation",
      description: "User enters the business contractor profile directly in IFMIS. All relevant fields remain editable.",
      mode: "manual",
      lockedFields: [],
      suggestedValues: {}
    },
    "Bulk Upload": {
      title: "Bulk File Upload (CSV/Excel)",
      source: "Agency upload template",
      description: "Business registration and taxpayer details are loaded from the bulk file. Address, bank, and workflow completion can still be adjusted in IFMIS.",
      mode: "bulk",
      lockedFields: ["contractorType", "category", "nationality", "registrationNumber", "displayName", "secondaryName", "businessRegistrationDate", "countryOfRegistration", "taxNumber"],
      suggestedValues: {
        contractorType: "Contractor",
        category: "Business",
        nationality: "Bhutanese",
        registrationNumber: "BRN-FROM-UPLOAD",
        displayName: "Imported Business Contractor",
        secondaryName: "Uploaded Trade Name",
        businessRegistrationDate: "2026-01-15",
        countryOfRegistration: "Bhutan",
        taxNumber: "TPN-FROM-UPLOAD"
      }
    },
    "System Integration": {
      title: "External System Integration / API",
      source: "CMS / e-GP / business systems",
      description: "Business contractor values are pulled from external systems. Source-owned fields remain locked while IFMIS-specific completion fields stay editable.",
      mode: "external",
      lockedFields: ["contractorType", "category", "nationality", "registrationNumber", "displayName", "secondaryName", "businessRegistrationDate", "countryOfRegistration", "taxNumber"],
      suggestedValues: {
        contractorType: "Contractor",
        category: "Business",
        nationality: "Bhutanese",
        registrationNumber: "BRN-FROM-INTERFACE",
        displayName: "Interface Business Contractor",
        secondaryName: "CMS / eGP Record",
        businessRegistrationDate: "2026-02-01",
        countryOfRegistration: "Bhutan",
        taxNumber: "TPN-FROM-INTERFACE"
      }
    }
  }
};
