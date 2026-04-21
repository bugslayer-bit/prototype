import type { ModuleDefinition } from "../types";

export const modules: ModuleDefinition[] = [
  {
    slug: "contract-creation",
    title: "Contract Creation",
    shortTitle: "Contract Creation",
    category: "Expenditure",
    summary:
      "Expenditure submodule for Contract Creation with process traceability back to PRN, DD, LoV, and interfacing systems.",
    sourceFile: "ContractCreation.html",
    routeLabel: "/modules/contract-creation",
    metrics: [
      { label: "Process status", value: "0 complete", tone: "warn" },
      { label: "Main source", value: "Expenditure" },
      { label: "Primary form", value: "Form 5", tone: "good" }
    ],
    steps: [
      {
        title: "Method and header",
        owner: "User / System",
        description: "PRN 2.1 step 1.0 with manual, file upload, eGP, and CMS entry modes."
      },
      {
        title: "Budget and funding",
        owner: "Budget module",
        description: "DD 14.1.6 to 14.1.16 with commitment, funding, and budget validation."
      },
      {
        title: "Duration and agency",
        owner: "Implementing agency",
        description: "DD 14.1.17 to 14.1.25 with date, agency, currency, and value logic."
      },
      {
        title: "Contractor and review",
        owner: "Finance / Approver",
        description: "Contractor verification, financial rules, milestones, and workflow submission."
      }
    ],
    sections: [
      {
        title: "Why this module comes first",
        description: "You asked to build the expenditure sidebar one submodule at a time instead of loading all 29 screens at once.",
        bullets: [
          "The sidebar now starts with Expenditure and contains this single submodule.",
          "The page includes process traceability from the original HTML source.",
          "Later we can add the next expenditure submodule under the same group."
        ]
      }
    ],
    process: [
      { title: "Trace", summary: "Track where each field and step is coming from." },
      { title: "Build", summary: "Convert the process into reusable TSX components." },
      { title: "Expand", summary: "Add the next expenditure submodule after this one is stable." }
    ]
  }
];

export const moduleMap = new Map(modules.map((module) => [module.slug, module]));
