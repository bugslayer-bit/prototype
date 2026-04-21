import { MasterDataGroup } from "../masterData";

const vendorExpenditureCategories = [
  "Goods",
  "Works",
  "Consultancy Services",
  "Non-Consultancy Services"
];

export const miscGroups: MasterDataGroup[] = [
  {
    id: "sanction-type",
    title: "Sanction Type",
    description: "DD 13.3",
    values: ["Suspension", "Debarment", "Warning"]
  },
  {
    id: "sanction-category",
    title: "Sanction Category",
    description: "LoV 6.2",
    values: ["Temporary Suspension", "Permanent Suspension"]
  },
  {
    id: "affected-agencies",
    title: "Affected Agencies",
    description: "DD 13.9 / master-data-driven",
    values: [
      "Ministry of Finance",
      "PPD",
      "Works and Human Settlement",
      "Health",
      "Education",
      "Local Government",
      "Ministry of Education & Skills Development",
      "Ministry of Agriculture and Livestock",
      "Ministry of Energy and Natural Resources",
      "Ministry of Infrastructure and Transport",
      "Ministry of Industry, Commerce and Employment",
      "Ministry of Foreign Affairs & External Trade",
      "Royal Audit Authority",
      "National Assembly",
      "GovTech Agency",
      "Royal Court of Justice",
      "Anti-Corruption Commission",
      "Royal Civil Service Commission",
      "National Environment Commission",
      "Gelephu Thromde",
      "Paro Dzongkhag Administration",
      "Punakha Dzongkhag Administration",
      "Bumthang Dzongkhag Administration",
      "Phuentsholing Thromde",
      "Gelephu Thromde"
    ]
  },
  {
    id: "sanction-status",
    title: "Sanction Status",
    description: "DD 13.12 / master-data-driven",
    values: ["Active", "Lifted", "Expired"]
  },
  {
    id: "boolean-choice",
    title: "Yes / No",
    description: "LoV 5.1 / LoV 5.3 / general boolean master data",
    values: ["Yes", "No"]
  },
  {
    id: "vendor-type",
    title: "Vendor Type",
    description: "Vendor Management / Process Descriptions",
    values: [
      "Contractual Vendor",
      "Utility",
      "Contract",
      "Subscription",
      "Contribution",
      "Others (vendor expenditure)",
      "Postal Services",
      "Fuel Suppliers",
      "NGOs",
      "Government Bodies",
      "International Organizations"
    ]
  },
  {
    id: "vendor-contact-status-filter",
    title: "Vendor Contact Status Filter",
    description: "Vendor Management dynamic filter",
    values: ["All", "Active", "Inactive"]
  },
  {
    id: "vendor-contact-category",
    title: "Vendor Contact Category",
    description: "Vendor Management dynamic contact categories",
    values: [
      "Primary e-Services Contact",
      "Primary Contact",
      "e-Services Contact",
      "Business Contact",
      "General Contact"
    ]
  },
  {
    id: "vendor-contract-category",
    title: "Vendor Contract Category",
    description: "DD 14.1.22 / vendor registration selection",
    values: ["Goods", "Works", "Services", "Goods and Services (Mixed)", "Works and Goods (Mixed)"]
  },
  {
    id: "vendor-expenditure-category",
    title: "Vendor Expenditure Category",
    description: "Expenditure SRS / Tax Master aligned categories",
    values: vendorExpenditureCategories
  },
  {
    id: "vendor-funding-source",
    title: "Vendor Funding Source",
    description: "LoV 7.2 / expenditure-aligned funding source values",
    values: ["RGOB", "Donor Agency", "Project Fund"]
  },
  {
    id: "vendor-amendment-type",
    title: "Vendor Amendment Type Filter",
    description: "Vendor amendment search filter",
    values: ["All Types", "Contractual Vendor", "Non-Contractual Vendor"]
  },
  {
    id: "advance-imprest-purpose",
    title: "Imprest Advance Purpose Category",
    description: "Operational purpose categories for Non-Contractual / Official Imprest Advances. SRS Process Description Row 123 captures Purpose as a user-entered field with validation 'Purpose must align with budget head' (Row 124). Admin-managed picklist; values may be added/removed as RGOB issues operational guidance.",
    values: [
      "Workshop and Training Expenses",
      "Site Inspection Expenses",
      "Emergency Procurement",
      "Official Expenses"
    ]
  },
  {
    id: "advance-imprest-budget-code",
    title: "Imprest Advance Budget Code",
    description: "Sourced from RGOB UCoA (Feb 2026) — Organization Level-2 (Department) budget heads. Used by Non-Contractual / Official Imprest Advances. DD 14.1.7.",
    values: [
      "BUD-2201-2026 — Office of the Minister (Ministry of Education & Skills Development)",
      "BUD-2202-2026 — Secretariat Services / Office of the Secretary (Ministry of Education & Skills Development)",
      "BUD-2203-2026 — Department of School Education (Ministry of Education & Skills Development)",
      "BUD-2204-2026 — Department of Higher Education (Ministry of Education & Skills Development)",
      "BUD-2205-2026 — Department of Technical & Vocational Training (Ministry of Education & Skills Development)",
      "BUD-2206-2026 — Department of Adult Literacy (Ministry of Education & Skills Development)",
      "BUD-2207-2026 — Department of Curriculum Development (Ministry of Education & Skills Development)",
      "BUD-1601-2026 — Office of the Minister (Ministry of Finance)",
      "BUD-1602-2026 — Secretariat Services / Office of Secretary (Ministry of Finance)",
      "BUD-1603-2026 — Department of Planning, Budget and Performance (Ministry of Finance)",
      "BUD-1604-2026 — Department of Procurement and Properties (Ministry of Finance)",
      "BUD-1605-2026 — Department of Macro-Fiscal and Development Finance (Ministry of Finance)",
      "BUD-1606-2026 — Department of Treasury and Accounts (Ministry of Finance)",
      "BUD-1607-2026 — Department of Revenue and Customs (Ministry of Finance)",
      "BUD-1701-2026 — Office of the Minister (Ministry of Agriculture and Livestock)",
      "BUD-1702-2026 — Secretariat Services (Ministry of Agriculture and Livestock)",
      "BUD-1703-2026 — National Biodiversity Centre (Ministry of Agriculture and Livestock)",
      "BUD-1704-2026 — Department of Agricultural Marketing and Cooperatives (Ministry of Agriculture and Livestock)",
      "BUD-1705-2026 — Department of Livestock (Ministry of Agriculture and Livestock)",
      "BUD-1706-2026 — Department of Agriculture (Ministry of Agriculture and Livestock)",
      "BUD-1801-2026 — Office of the Minister (Ministry of Energy and Natural Resources)",
      "BUD-1802-2026 — Secretariat (Ministry of Energy and Natural Resources)",
      "BUD-1803-2026 — Department of Geology and Mines (Ministry of Energy and Natural Resources)",
      "BUD-1804-2026 — Department of Energy (Ministry of Energy and Natural Resources)",
      "BUD-1805-2026 — Department of Forest and Park Services (Ministry of Energy and Natural Resources)",
      "BUD-1806-2026 — Department of Water (Ministry of Energy and Natural Resources)",
      "BUD-1807-2026 — Department of Environment and Climate Change (Ministry of Energy and Natural Resources)",
      "BUD-1808-2026 — Electricity Regulatory Authority (Ministry of Energy and Natural Resources)",
      "BUD-1901-2026 — Office of the Minister (Ministry of Infrastructure and Transport)",
      "BUD-1902-2026 — Secretariat Services (Ministry of Infrastructure and Transport)",
      "BUD-1903-2026 — Department of Human Settlement (Ministry of Infrastructure and Transport)",
      "BUD-1904-2026 — Department of Infrastructure Development (Ministry of Infrastructure and Transport)",
      "BUD-1905-2026 — Department of Surface Transport (Ministry of Infrastructure and Transport)",
      "BUD-1906-2026 — Department of Air Transport (Ministry of Infrastructure and Transport)",
      "BUD-1907-2026 — Bhutan Construction and Transport Authority (Ministry of Infrastructure and Transport)",
      "BUD-1908-2026 — Bhutan Civil Aviation Authority (Ministry of Infrastructure and Transport)",
      "BUD-2001-2026 — Office of the Minister (Ministry of Health)",
      "BUD-2002-2026 — Secretariat Services (Ministry of Health)",
      "BUD-2003-2026 — Department of Health Services (Ministry of Health)",
      "BUD-2004-2026 — Royal Center for Disease Control (Ministry of Health)",
      "BUD-2005-2026 — Department of Public Health (Ministry of Health)",
      "BUD-2006-2026 — Department of Medical Services (Ministry of Health)",
      "BUD-2007-2026 — Bhutan Food and Drug Authority (Ministry of Health)",
      "BUD-2101-2026 — Office of the Minister (Ministry of Industry, Commerce and Employment)",
      "BUD-2102-2026 — Secretariat Services (Ministry of Industry, Commerce and Employment)",
      "BUD-2103-2026 — Department of Labour (Ministry of Industry, Commerce and Employment)",
      "BUD-2104-2026 — Department of Employment and Entrepreneurship (Ministry of Industry, Commerce and Employment)",
      "BUD-2105-2026 — Department of Tourism (Ministry of Industry, Commerce and Employment)",
      "BUD-2106-2026 — Department of Media, Creative Industry and Intellectual Property (Ministry of Industry, Commerce and Employment)",
      "BUD-2107-2026 — Department of Trade (Ministry of Industry, Commerce and Employment)",
      "BUD-2108-2026 — Department of Industry (Ministry of Industry, Commerce and Employment)",
      "BUD-2109-2026 — Bhutan Information Communication and Media Authority (Ministry of Industry, Commerce and Employment)",
      "BUD-2110-2026 — Bhutan Standard Bureau (Ministry of Industry, Commerce and Employment)",
      "BUD-2111-2026 — Consumer Competition Affairs Authority (Ministry of Industry, Commerce and Employment)",
      "BUD-2201-2026 — Office of the Minister (Ministry of Education and Skills Development)",
      "BUD-2202-2026 — Secretariat Services (Ministry of Education and Skills Development)",
      "BUD-2203-2026 — Department of School Education (Ministry of Education and Skills Development)",
      "BUD-2204-2026 — Department of Education Programmes (Ministry of Education and Skills Development)",
      "BUD-2205-2026 — Department of Workforce Planning and Skills Development (Ministry of Education and Skills Development)",
      "BUD-2206-2026 — Bhutan Qualifications and Professionals Certification Authority (Ministry of Education and Skills Development)",
      "BUD-2207-2026 — Bhutan Council for School Examinations and Assessment (Ministry of Education and Skills Development)",
      "BUD-2301-2026 — Office of the Minister (Ministry of Foreign Affairs & External Trade)",
      "BUD-2302-2026 — Secretariat Services / Office of Secretary (Ministry of Foreign Affairs & External Trade)",
      "BUD-2303-2026 — Royal Bhutanese Embassies, Missions, and Consulates (Ministry of Foreign Affairs & External Trade)",
      "BUD-2304-2026 — Department of Bilateral Affairs (Ministry of Foreign Affairs & External Trade)",
      "BUD-2305-2026 — Department of Multilateral Affairs (Ministry of Foreign Affairs & External Trade)",
      "BUD-2306-2026 — Department of Protocol & Consular Affairs (Ministry of Foreign Affairs & External Trade)",
      "BUD-2307-2026 — Department of Economic & Tech Diplomacy (Ministry of Foreign Affairs & External Trade)"
    ]
  },
  {
    id: "contractual-advance-category",
    title: "Contractual Advance Category",
    description: "LoV 19.1 / Contractual advance types per SRS",
    values: [
      "Mobilization Advance",
      "Secured Advance",
      "Material Advance"
    ]
  },
  {
    id: "non-contractual-advance-category",
    title: "Non-Contractual Advance Category",
    description: "LoV 20.1 / Non-contractual advance types per SRS",
    values: [
      "Personal Advance",
      "Official Advance",
      "Imprest Advance"
    ]
  },
  {
    id: "advance-recovery-method",
    title: "Advance Recovery Method",
    description: "LoV 19.1 / Recovery deduction method for advances",
    values: [
      "Proportional Deduction",
      "Lump Sum Recovery",
      "Percentage per Invoice",
      "Final Bill Adjustment"
    ]
  },
  {
    id: "advance-post-adjustment-method",
    title: "Advance Post Adjustment Method",
    description: "LoV 19.2 / Post-advance adjustment settlement method",
    values: ["Fractions", "Whole Sum", "Cash Surrender"]
  },
  {
    id: "advance-status",
    title: "Advance Status",
    description: "LoV 9.3 / Lifecycle status of an advance request",
    values: ["Draft", "Pending Validation", "Sanctioned", "Approved", "Payment Ordered", "Adjusted", "Rejected"]
  },
  {
    id: "advance-workflow-stage",
    title: "Advance Workflow Stage",
    description: "LoV 9.4 / Workflow routing stages for advance processing",
    values: ["Initiation", "Review", "Approval", "Payment Release"]
  },
  {
    id: "advance-imprest-purpose",
    title: "Imprest Purpose",
    description: "LoV 20.2 / Purpose categories for official imprest advances",
    values: [
      "Field Travel & Per Diem",
      "Emergency Procurement",
      "Petty Cash Replenishment",
      "Workshop & Training Expenses",
      "Site Inspection Expenses",
      "Other Official Purpose"
    ]
  },
  {
    id: "invoice-status",
    title: "Invoice Status",
    description: "DD 15.12 — Invoice workflow status (LoV 15.1)",
    values: ["Draft", "Submitted", "Verified", "Approved", "Rejected", "Returned", "Cancelled"]
  },
  {
    id: "invoice-submission-channel",
    title: "Invoice Submission Channel",
    description: "DD 15.14 — How the invoice was received (LoV 15.2)",
    values: ["Contractor Portal", "Email", "Manual", "System Interface", "Bulk Upload"]
  },
  {
    id: "invoice-document-type",
    title: "Invoice Document Type",
    description: "DD 15.15 → 15.20 — Supporting document checklist",
    values: [
      "Invoice Copy",
      "GRN",
      "Completion Certificate",
      "Contract Validity",
      "Tax Clearance",
      "Bank Guarantee"
    ]
  },
  {
    id: "bill-status",
    title: "Bill Status",
    description: "DD 16.1.12 — Bill workflow status (LoV 16.1)",
    values: ["Draft", "Created", "Submitted", "Verified", "Approved", "Paid", "Rejected", "On Hold"]
  },
  {
    id: "bill-category",
    title: "Bill Category",
    description: "DD 16.1.5 — Top-level category of the bill",
    values: ["Goods", "Works", "Services"]
  },
  {
    id: "bill-sub-category-goods",
    title: "Bill Sub-Category (Goods)",
    description: "DD 16.1.6 — Sub-category when bill category = Goods",
    values: [
      "IT Equipment",
      "Office Supplies",
      "Vehicles",
      "Medical Supplies",
      "Furniture",
      "Construction Materials"
    ]
  },
  {
    id: "bill-sub-category-works",
    title: "Bill Sub-Category (Works)",
    description: "DD 16.1.6 — Sub-category when bill category = Works",
    values: [
      "Civil Works",
      "Electrical Works",
      "Mechanical Works",
      "Plumbing Works",
      "Road Works",
      "Renovation"
    ]
  },
  {
    id: "bill-sub-category-services",
    title: "Bill Sub-Category (Services)",
    description: "DD 16.1.6 — Sub-category when bill category = Services",
    values: [
      "Consultancy",
      "Maintenance",
      "Training",
      "Auditing",
      "Legal Services",
      "Hospitality"
    ]
  },
  {
    id: "tax-code",
    title: "Tax Code",
    description: "DD 16.5.4 — Tax codes pulled from the Tax Master",
    values: ["TDS", "PIT", "BIT", "GST", "VAT", "CIT"]
  },
  {
    id: "approval-decision",
    title: "Approval Decision",
    description: "Canonical workflow LoV — used by every multi-stage approval chain (Invoice, Bill, FI, SoE, Social Benefits, Subscriptions, Debt, etc.). Declare once, use everywhere.",
    values: ["Pending", "In Progress", "Approved", "Rejected", "Returned", "Returned for Clarification", "Deferred", "Skipped"]
  },
  {
    id: "approval-level",
    title: "Approval Level",
    description: "Canonical approval ladder reused by every workflow in the SRS (Finance Officer → Agency Finance → Head of Agency → Payment Release Officer etc.). Declare once, use everywhere.",
    values: [
      "Initiator",
      "Finance Officer",
      "Agency Finance",
      "Head of Agency",
      "Payment Release Officer",
      "System Administrator"
    ]
  },
  {
    id: "payment-frequency",
    title: "Payment Frequency",
    description: "Canonical cadence LoV — reused by vendor payment terms, rental schedules, debt repayments, SoE transfers, subscriptions/contributions, utility bills etc. Declare once, use everywhere.",
    values: [
      "One-time",
      "Daily",
      "Weekly",
      "Fortnightly",
      "Monthly",
      "Quarterly",
      "Half-yearly",
      "Annual",
      "Biennial",
      "On-demand",
      "As Needed"
    ]
  },
  {
    id: "esg-category",
    title: "ESG Attribution Category",
    description: "Canonical ESG tagging pillars reused by Invoice Processing (Row 9/50), Contract Lifecycle ESG tagging, and any ESG-linked budget classification. Declare once, use everywhere.",
    values: ["Environment", "Social", "Governance"]
  },
  {
    id: "discounting-status",
    title: "Bill Discounting Status",
    description: "PRN 3.3.1 — Bill discounting workflow status",
    values: ["Not Requested", "Requested", "Approved", "Settled", "Rejected"]
  },
  {
    id: "approval-matrix-invoice",
    title: "Approval Matrix — Invoice",
    description: "PRN 3.1.3 — Threshold-driven invoice approval routing. Format: max|key:label:role",
    values: [
      "500000|verifier:Verification:Procurement Officer",
      "500000|finance:Finance Review:Finance Officer",
      "5000000|verifier:Verification:Procurement Officer",
      "5000000|finance:Finance Review:Finance Officer",
      "5000000|approver:Approving Officer:Head of Agency",
      "∞|verifier:Verification:Procurement Officer",
      "∞|finance:Finance Review:Finance Officer",
      "∞|approver:Approving Officer:Head of Agency",
      "∞|secretary:Secretary Endorsement:Agency Secretary"
    ]
  },
  {
    id: "approval-matrix-bill",
    title: "Approval Matrix — Bill",
    description: "PRN 3.2.2 — Threshold-driven bill approval routing. Format: max|key:label:role",
    values: [
      "500000|tech:Technical Verify:Technical Officer",
      "500000|finance:Finance Approval:Finance Controller",
      "500000|release:Payment Release:Treasury",
      "5000000|tech:Technical Verify:Technical Officer",
      "5000000|audit:Internal Audit:Internal Auditor",
      "5000000|finance:Finance Approval:Finance Controller",
      "5000000|release:Payment Release:Treasury",
      "∞|tech:Technical Verify:Technical Officer",
      "∞|audit:Internal Audit:Internal Auditor",
      "∞|finance:Finance Approval:Finance Controller",
      "∞|secretary:Secretary Endorsement:Agency Secretary",
      "∞|release:Payment Release:Treasury"
    ]
  },
  {
    id: "closure-type",
    title: "Closure Type",
    description: "DD 14.1.39 — Reason / mode of contract closure (LoV 14.4)",
    values: [
      "Completion of Work",
      "Court Verdict / Arbitration",
      "Mutual Termination",
      "Default / Breach",
      "Force Majeure"
    ]
  },
  {
    id: "closure-workflow-status",
    title: "Closure Workflow Status",
    description: "PRN 5.x — Lifecycle status for a closure record",
    values: [
      "Draft",
      "Pending Settlement",
      "Submitted",
      "Head of Agency Review",
      "Approved",
      "Budget Released",
      "eGP/CMS Notified",
      "Closed",
      "Rejected"
    ]
  },
  {
    id: "closure-settlement-type",
    title: "Closure Settlement Line Type",
    description: "DD 14.1.27 — Settlement line types on closure",
    values: [
      "Due to Contractor",
      "Due from Contractor",
      "Retention Release",
      "LD Deduction",
      "Advance Recovery"
    ]
  },
  {
    id: "closure-trigger-category",
    title: "Closure Trigger Category",
    description: "PRN 5.2 — Decides whether closure notifies eGP or CMS",
    values: ["Goods", "Services", "Works"]
  },
  {
    id: "closure-document-type",
    title: "Closure Document Type",
    description: "PRN 5.x — Mandatory & optional documents on contract closure",
    values: [
      "Completion Certificate / Closure Report",
      "Settlement Statement",
      "Final Account Statement",
      "Termination Notice",
      "Court Order / Arbitration Decision",
      "Force Majeure Evidence",
      "No-Dues Certificate",
      "Performance Evaluation Report"
    ]
  },
  {
    id: "utility-type",
    title: "Utility Type",
    description: "DD 19.3 — Type of utility service (aligned with SRS mockup)",
    values: [
      "Electricity",
      "Sewerage",
      "Water",
      "Telephone",
      "Internet/Leasedline",
      "Gasoline",
      "Oil Company"
    ]
  },
  {
    id: "utility-billing-cycle",
    title: "Utility Billing Cycle",
    description: "DD 19.7 — Billing frequency for utility provider",
    values: ["Monthly", "Bi-Monthly", "Quarterly", "Yearly"]
  },
  {
    id: "utility-status",
    title: "Utility Status",
    description: "DD 19.10 — Lifecycle status of a utility provider account",
    values: ["Active", "Inactive", "Suspended", "Terminated"]
  },
  {
    id: "utility-bill-status",
    title: "Utility Bill Status",
    description: "PRN 5.1 R76 — Status of an individual utility bill",
    values: ["Pending", "Cleared for Payment", "Approved", "Paid", "Overdue", "Disputed"]
  },
  {
    id: "utility-bill-source",
    title: "Utility Bill Source",
    description: "PRN 5.1 R76 — How the bill entered the system",
    values: ["API Push", "API Fetch", "Manual"]
  },
  {
    id: "utility-variance-action",
    title: "Utility Variance Action",
    description: "PRN 5.1 R77 — Action taken when bill exceeds variance threshold",
    values: ["Flag for Review", "Auto-Hold", "Escalate to Approver"]
  },
  {
    id: "utility-service-provider",
    title: "Utility Service Providers",
    description: "PRN 5.1 — Canonical list of utility service providers. Each provider has its own service-type LoV (utility-service-type-<slug>).",
    values: [
      "Bhutan Telecom Ltd",
      "Tashi Cell",
      "Bhutan Power Corporation Ltd",
      "Bhutan Starlink",
      "Municipalities & Thromdes"
    ]
  },
  {
    id: "utility-service-type-bhutan-telecom-ltd",
    title: "Service Types — Bhutan Telecom Ltd",
    description: "PRN 5.1 — Service catalogue offered by Bhutan Telecom Ltd",
    values: [
      "BT Landline",
      "BT Postpaid Mobile",
      "BT Broadband Postpaid",
      "BT Leasedline"
    ]
  },
  {
    id: "utility-service-type-tashi-cell",
    title: "Service Types — Tashi Cell",
    description: "PRN 5.1 — Service catalogue offered by Tashi Cell",
    values: ["TC Postpaid Mobile", "TC Leasedline"]
  },
  {
    id: "utility-service-type-bhutan-power-corporation-ltd",
    title: "Service Types — Bhutan Power Corporation Ltd",
    description: "PRN 5.1 — Service catalogue offered by Bhutan Power Corporation Ltd",
    values: ["Consumer Number"]
  },
  {
    id: "utility-service-type-bhutan-starlink",
    title: "Service Types — Bhutan Starlink",
    description: "PRN 5.1 — Service catalogue offered by Bhutan Starlink",
    values: ["Consumer Number / Service Number"]
  },
  {
    id: "utility-service-type-municipalities-thromdes",
    title: "Service Types — Municipalities & Thromdes",
    description: "PRN 5.1 — Service catalogue offered by Municipalities & Thromdes",
    values: ["Water & Sewerage: Meter Number"]
  },
  {
    id: "utility-provider-types-bhutan-telecom-ltd",
    title: "Provider Utility Types — Bhutan Telecom Ltd",
    description: "SRS LoV 15.1 — Utility types served by Bhutan Telecom Ltd",
    values: ["Telephone", "Internet/Leasedline"]
  },
  {
    id: "utility-provider-types-tashi-cell",
    title: "Provider Utility Types — Tashi Cell",
    description: "SRS LoV 15.1 — Utility types served by Tashi Cell",
    values: ["Telephone", "Internet/Leasedline"]
  },
  {
    id: "utility-provider-types-bhutan-power-corporation-ltd",
    title: "Provider Utility Types — Bhutan Power Corporation Ltd",
    description: "SRS LoV 15.1 — Utility types served by BPC",
    values: ["Electricity"]
  },
  {
    id: "utility-provider-types-bhutan-starlink",
    title: "Provider Utility Types — Bhutan Starlink",
    description: "SRS LoV 15.1 — Utility types served by Bhutan Starlink",
    values: ["Internet/Leasedline"]
  },
  {
    id: "utility-provider-types-municipalities-thromdes",
    title: "Provider Utility Types — Municipalities & Thromdes",
    description: "SRS LoV 15.1 — Utility types served by Municipalities & Thromdes",
    values: ["Water", "Sewerage"]
  },
  {
    id: "utility-payment-method",
    title: "Utility Payment Method",
    description: "SRS LoV 15.1 — How utility payments are grouped for processing",
    values: ["Individual", "Consolidated"]
  },
  {
    id: "utility-preferred-payment-mode",
    title: "Preferred Payment Mode",
    description: "SRS LoV 15.2 — Payment mode preference for utility bills. Auto-populated in IFMIS via external API standards.",
    values: [
      "Consolidated: Line Departments",
      "Individual: Based on Service Provider",
      "Individual: Based on Region"
    ]
  },
  {
    id: "utility-budget-code",
    title: "Utility Budget Code (UCoA Level-2)",
    description: "UCoA CWT Feb 2026 — Organization Level-2 budget heads applicable to utility expenditure. Each entry maps to a department-level budget allocation.",
    values: [
      "BUD-2201-2026 — Office of the Minister (Ministry of Education & Skills Development)",
      "BUD-1601-2026 — Office of the Minister (Ministry of Finance)",
      "BUD-1602-2026 — Secretariat Services / Office of Secretary (Ministry of Finance)",
      "BUD-1603-2026 — Department of Planning, Budget and Performance (Ministry of Finance)",
      "BUD-1701-2026 — Office of the Minister (Ministry of Agriculture and Livestock)",
      "BUD-1801-2026 — Office of the Minister (Ministry of Energy and Natural Resources)",
      "BUD-1901-2026 — Office of the Minister (Ministry of Infrastructure and Transport)",
      "BUD-2001-2026 — Office of the Minister (Ministry of Health)",
      "BUD-2101-2026 — Office of the Minister (Ministry of Industry, Commerce and Employment)",
      "BUD-2201-2026 — Office of the Minister (Ministry of Education and Skills Development)",
      "BUD-2301-2026 — Office of the Minister (Ministry of Foreign Affairs & External Trade)",
      "BUD-0101-2026 — National Assembly Secretariat",
      "BUD-0201-2026 — National Council Secretariat",
      "BUD-0301-2026 — Royal Audit Authority",
      "BUD-0401-2026 — Anti-Corruption Commission",
      "BUD-0501-2026 — Royal Civil Service Commission",
      "BUD-0601-2026 — Election Commission of Bhutan",
      "BUD-0701-2026 — Royal Court of Justice",
      "BUD-4601-2026 — Gelephu Thromde",
      "BUD-3102-2026 — Phuentsholing Thromde",
      "BUD-3103-2026 — Gelephu Thromde",
      "BUD-3201-2026 — Bumthang Dzongkhag",
      "BUD-3202-2026 — Punakha Dzongkhag",
      "BUD-4001-2026 — Gross National Happiness Commission",
      "BUD-4002-2026 — National Environment Commission",
      "BUD-4003-2026 — Government Technology Agency (GovTech)",
      "BUD-4004-2026 — Policy and Planning Division (PPD)"
    ]
  },
  {
    id: "utility-expenditure-head",
    title: "Utility Expenditure Head (UCoA Object Code)",
    description: "UCoA object-code level expenditure classification for utility payments. Maps to the expenditure classification hierarchy.",
    values: [
      "2111 — Electricity Charges",
      "2112 — Water & Sewerage Charges",
      "2113 — Telephone & Communication Charges",
      "2114 — Internet & Data Service Charges",
      "2115 — Fuel & Oil Charges",
      "2119 — Other Utility Charges",
      "2121 — Leased Line & Connectivity Charges"
    ]
  },
  {
    id: "utility-funding-source",
    title: "Utility Funding Source",
    description: "SRS / UCoA funding source classification for utility expenditure. RGOB for government-funded, Donor for externally funded, Loan for debt-financed utilities.",
    values: ["RGOB", "Donor", "Loan", "Project Fund"]
  },
  {
    id: "rental-asset-category",
    title: "Rental Asset Category",
    description: "LoV 10.1 — Top-level asset classification",
    values: ["Tangible Assets", "Intangible Assets"]
  },
  {
    id: "rental-asset-type",
    title: "Rental Asset Type",
    description: "LoV 10.1 — Asset type within a category",
    values: ["Immovable Properties", "Movable Properties", "Intellectual Property"]
  },
  {
    id: "rental-subclass-immovable",
    title: "Rental Asset Sub-Class (Immovable)",
    description: "LoV 10.1 — Immovable property sub-classes",
    values: ["Land", "House", "House/Buildings/Structures"]
  },
  {
    id: "rental-subclass-movable",
    title: "Rental Asset Sub-Class (Movable)",
    description: "LoV 10.1 — Movable property sub-classes",
    values: ["Vehicles", "Aero Services", "Machineries"]
  },
  {
    id: "rental-subclass-ip",
    title: "Rental Asset Sub-Class (Intellectual Property)",
    description: "LoV 10.1 — Intellectual property sub-classes",
    values: [
      "Copy Rights",
      "Patents",
      "Trademarks",
      "Industrial Designs",
      "Trade Secrets",
      "Geographical Indications"
    ]
  },
  {
    id: "rental-payment-status",
    title: "Rental Payment Status",
    description: "DD 19.13 — Status of a rental payment",
    values: ["Pending", "Approved", "Paid", "Rejected"]
  },
  {
    id: "rental-asset-status",
    title: "Rental Asset Status",
    description: "DD 19.11 — Lifecycle status of a rented asset",
    values: ["Active", "Inactive", "Lease Ended", "Terminated"]
  },
  {
    id: "rental-transaction-status",
    title: "Rental Transaction Status",
    description: "PRN 5.1 R79 — Status of a payment transaction",
    values: ["Draft", "Pending", "Approved", "Paid", "Rejected"]
  },
  {
    id: "rental-deduction-code",
    title: "Rental Deduction Code",
    description: "PRN 5.1 R79 — Applicable deductions for rental payments",
    values: ["TDS", "PIT", "BIT", "GST", "Service Tax"]
  },
  {
    id: "item-unit-of-measure",
    title: "Item Unit of Measure",
    description: "DD 14.1.21 — Units used in contract item details",
    values: ["Units", "Nos", "Kg", "Mt", "KM", "Litre", "Lump Sum", "Lot", "Months", "Hours", "Days"]
  },
  {
    id: "sanctioning-agency",
    title: "Sanctioning Agency",
    description: "DD 13.x — Agency that issued the sanction",
    values: [
      "Ministry of Finance",
      "Procurement Policy Division",
      "Anti-Corruption Commission",
      "Royal Audit Authority",
      "Office of the Attorney General",
      "Royal Civil Service Commission"
    ]
  },
  {
    id: "contact-status",
    title: "Contact Status",
    description: "Contractor Contact — Lifecycle status of a contractor contact",
    values: ["Active", "Inactive"]
  },
  {
    id: "advance-contract-status",
    title: "Advance — Contract Status",
    description: "Sanction Mgmt (Advance Sanctioning) — Contract status validation LoV",
    values: ["Active", "Inactive", "Closed"]
  },
  {
    id: "advance-work-status",
    title: "Advance — Work Status",
    description: "Sanction Mgmt (Material Advance) — Work progress status from eCMS",
    values: ["In Progress", "Not Started", "Completed"]
  },
  {
    id: "advance-decision-status",
    title: "Advance — Decision Status",
    description: "Sanction Mgmt (Advance Sanctioning) — Decision/approval outcome",
    values: ["Pending", "Approved", "Hold", "Rejected"]
  },
  {
    id: "debt-creditor-type",
    title: "Debt — Creditor Type",
    description: "SRS PRN 6.1 Step 1 — type of donor / lender / creditor whose master record is being maintained",
    values: [
      "Donor Agency",
      "Bilateral Lender",
      "Multilateral Lender",
      "Development Partner",
      "Financial Institution",
      "Government Donor",
      "Commercial Creditor"
    ]
  },
  {
    id: "debt-data-source",
    title: "Debt — Data Source",
    description: "PRN 6.1 Step 1 — three SRS-mandated channels for recording donor & debt info",
    values: ["Manual Entry", "Excel Upload", "Meridian System Integration"]
  },
  {
    id: "debt-category",
    title: "Debt — Category",
    description: "DD 20.4 / LoV 17.1 / BR 23.4 — categorisation of debts per the Debt Management Division, MoF",
    values: [
      "Domestic Loans",
      "External Loans",
      "Multilateral Loans",
      "Bilateral Loans",
      "Bonds",
      "Term Loans",
      "Revolving Loans",
      "T-Bills"
    ]
  },
  {
    id: "debt-payment-type",
    title: "Debt — Type of Payment",
    description: "LoV 17.1 (Type of Payments) — Principal / Interest / Composite payment classification",
    values: ["Principal", "Interest", "Composite", "Penalty", "Fees & Charges"]
  },
  {
    id: "debt-payment-status",
    title: "Debt — Payment Status",
    description: "DD 20.9 / BR 23.9 — workflow status for each debt servicing transaction & related payment order",
    values: ["Pending", "Approved", "Processed", "Paid", "Partially Paid", "Overdue", "Cancelled"]
  },
  {
    id: "debt-loan-term-unit",
    title: "Debt — Loan Term Unit",
    description: "LoV 17.1 (Loan Term) — unit used to express the loan tenure",
    values: ["Days", "Months", "Years"]
  },
  {
    id: "debt-amortization-schedule",
    title: "Debt — Amortization Schedule",
    description: "LoV 17.1 (Amortization Schedule) — how principal is repaid over the loan term",
    values: ["Linear", "Equal Installment", "Bullet", "Step-Up", "Step-Down"]
  },
  {
    id: "debt-payment-order-channel",
    title: "Debt — Payment Order Transmission",
    description: "PRN 6.1 Step 2 — how the generated payment order is transmitted to the executing bank",
    values: ["Print (Manual Transmission)", "System Push to Bank API"]
  },
  {
    id: "debt-source-of-fund",
    title: "Debt — Source of Fund",
    description: "PRN 6.1 Step 2 — fund source recorded on a manual debt payment order",
    values: [
      "Consolidated Fund",
      "Refinancing Account",
      "Sinking Fund",
      "Donor Designated Account",
      "Foreign Exchange Reserve"
    ]
  },
  {
    id: "debt-applicable-deduction",
    title: "Debt — Applicable Deduction",
    description: "PRN 6.1 Step 1 — statutory or contractual deductions applied to debt servicing",
    values: [
      "Withholding Tax",
      "Service Charge",
      "Bank Charges",
      "Foreign Exchange Loss",
      "None"
    ]
  },
  {
    id: "debt-meridian-action",
    title: "Debt — Meridian POST-Payment Action",
    description: "PRN 6.1 Step 4 — POST payment options for synchronising data with the MERIDIAN debt-management system",
    values: [
      "Download Meridian Format File",
      "Push via Meridian API",
      "Generate Payment Obligation Report",
      "Generate Repayment-by-Lender Report"
    ]
  },
  {
    id: "debt-validation-rule",
    title: "Debt — Validation Rule",
    description: "PRN 6.1 Step 3 — System validation rules applied during creation/approval",
    values: [
      "Repayment Schedule Match",
      "Auto-Populate Servicing Requirements",
      "Duplicate Transaction Check",
      "Authorised User Check",
      "Fund Availability Check"
    ]
  },
  {
    id: "soe-transfer-type",
    title: "SOE — Transfer Type",
    description: "PRN 6.2 Step 1 — category of Statement-of-Expenditure / fund transfer transaction",
    values: [
      "Intra-Agency Transfer",
      "Inter-Agency Transfer",
      "Donor Fund Transfer",
      "Re-appropriation Transfer",
      "Supplementary Budget Transfer",
      "Return of Unspent Fund",
      "Advance Clearance Transfer"
    ]
  },
  {
    id: "soe-direction",
    title: "SOE — Transfer Direction",
    description: "PRN 6.2 Step 1 — funds flow direction (incoming / outgoing relative to the initiating agency)",
    values: ["Outgoing", "Incoming", "Internal Reclassification"]
  },
  {
    id: "soe-source-of-fund",
    title: "SOE — Source of Fund",
    description: "PRN 6.2 Step 1 — originating budget / cash pool of the transfer (from LoVs sheet)",
    values: [
      "Consolidated Fund",
      "Donor Grant Account",
      "Donor Loan Account",
      "Capital Budget",
      "Recurrent Budget",
      "Supplementary Budget",
      "Imprest Account",
      "Revenue Account"
    ]
  },
  {
    id: "soe-destination-account-type",
    title: "SOE — Destination Account Type",
    description: "PRN 6.2 Step 1 — type of receiving account on the fund-transfer transaction",
    values: [
      "Agency Operating Account",
      "Consolidated Fund",
      "Donor Designated Account",
      "Project Account",
      "Sub-Imprest Account",
      "Revenue Collection Account"
    ]
  },
  {
    id: "soe-transfer-status",
    title: "SOE — Transfer Status",
    description: "DD — workflow status for each SOE / Fund Transfer transaction (PRN 6.2.x)",
    values: [
      "Draft",
      "Submitted",
      "Validated",
      "Approved",
      "Parliament Sanctioned",
      "Released",
      "Reconciled",
      "Rejected",
      "Cancelled"
    ]
  },
  {
    id: "soe-expenditure-category",
    title: "SOE — Expenditure Category",
    description: "PRN 6.2 Step 2 — broad classification of the expenditure being reported on the SOE",
    values: [
      "Capital",
      "Recurrent",
      "Subsidy",
      "Grant",
      "Loan Servicing",
      "Operating",
      "Other Current Expenditure"
    ]
  },
  {
    id: "soe-supporting-document-type",
    title: "SOE — Supporting Document Type",
    description: "PRN 6.2 Step 2 — documents that may be attached to the SOE for audit evidence",
    values: [
      "Payment Voucher",
      "Bank Advice",
      "Receipt / Invoice",
      "Parliament Appropriation Notice",
      "Budget Release Order",
      "Reconciliation Statement",
      "Donor Disbursement Letter"
    ]
  },
  {
    id: "soe-validation-rule",
    title: "SOE — Validation Rule",
    description: "PRN 6.2 Step 3 — system validation rules applied on creation / approval of an SOE transfer",
    values: [
      "Source Fund Availability Check",
      "Parliament Appropriation Limit Check",
      "Duplicate Transaction Check",
      "Authorised Initiator Check",
      "Destination Account Active Check",
      "UCoA Mapping Check",
      "Exchange Rate Present (Foreign Currency)"
    ]
  },
  {
    id: "soe-release-channel",
    title: "SOE — Release Channel",
    description: "PRN 6.2 Step 4 — how the approved transfer is executed against the core banking system",
    values: [
      "RMA Core Banking Push",
      "Manual Bank Advice",
      "SWIFT Wire",
      "Internal Ledger Journal",
      "Meridian System Sync"
    ]
  },
  {
    id: "soe-reconciliation-status",
    title: "SOE — Reconciliation Status",
    description: "PRN 6.2 Step 5 — bank / ledger reconciliation outcome of the fund transfer",
    values: [
      "Not Started",
      "In Progress",
      "Matched",
      "Partially Matched",
      "Unmatched",
      "Disputed"
    ]
  },
  {
    id: "fi-institution-type",
    title: "FI — Institution Type",
    description: "PRN 7.1 Step 1 — class of financial institution (LoVs sheet row 283)",
    values: [
      "Commercial Bank",
      "Development Bank",
      "Insurance Company",
      "Non-Banking Financial Institution",
      "Micro-Finance Institution",
      "Payment System Operator",
      "Credit Information Bureau"
    ]
  },
  {
    id: "fi-ownership-type",
    title: "FI — Ownership Type",
    description: "PRN 7.1 Step 1 — legal ownership structure of the institution",
    values: [
      "Public — Government Owned",
      "Private — Domestic",
      "Private — Foreign",
      "Joint Venture",
      "Cooperative",
      "Subsidiary"
    ]
  },
  {
    id: "fi-licence-category",
    title: "FI — Licence Category",
    description: "PRN 7.1 Step 1 — RMA licence classification (cascades from Institution Type)",
    values: [
      "Full Banking Licence",
      "Restricted Banking Licence",
      "Insurance Licence — Life",
      "Insurance Licence — Non-Life",
      "Insurance Licence — Composite",
      "NBFI Licence",
      "MFI Licence — Tier I",
      "MFI Licence — Tier II",
      "Payment Systems Licence"
    ]
  },
  {
    id: "fi-regulatory-body",
    title: "FI — Regulatory Body",
    description: "PRN 7.1 Step 1 — supervising / issuing authority",
    values: [
      "Royal Monetary Authority of Bhutan",
      "Ministry of Finance",
      "Department of Revenue & Customs",
      "Financial Institutions Training Institute",
      "Department of Treasury & Accounts"
    ]
  },
  {
    id: "fi-registration-status",
    title: "FI — Registration Status",
    description: "DD 7.1.3 — workflow lifecycle status of an FI record",
    values: [
      "Draft",
      "Submitted",
      "Under RMA Review",
      "Under DTA Review",
      "Deferred",
      "Approved",
      "Active",
      "Suspended",
      "Revoked",
      "Rejected",
      "Expired"
    ]
  },
  {
    id: "fi-document-type",
    title: "FI — Supporting Document Type",
    description: "PRN 7.1 Step 1 — mandatory / optional attachments for FI registration",
    values: [
      "Certificate of Incorporation",
      "RMA Licence Certificate",
      "Board Resolution",
      "Memorandum & Articles of Association",
      "Tax Clearance Certificate",
      "Audited Financial Statement",
      "Capital Adequacy Report",
      "AML / KYC Policy",
      "Fit & Proper Declaration",
      "Beneficial Ownership Disclosure"
    ]
  },
  {
    id: "fi-validation-rule",
    title: "FI — Validation Rule",
    description: "PRN 7.1 Step 2 — system validations executed on submission / activation",
    values: [
      "Duplicate Licence Check",
      "RMA Licence Active Check",
      "Capital Adequacy Threshold Check",
      "AML / KYC Compliance Check",
      "Tax Clearance Validity Check",
      "Beneficial Ownership Disclosure Check",
      "Authorised Signatory Check",
      "Regulatory Blacklist Check"
    ]
  },
  {
    id: "fi-service-category",
    title: "FI — Service Category",
    description: "PRN 7.1 Step 3 — banking / financial services offered by the institution",
    values: [
      "Core Banking",
      "Loan Origination",
      "Bill Discounting",
      "Treasury & FX",
      "Trade Finance",
      "Remittance",
      "Digital Payments",
      "Custodian Services",
      "Insurance Underwriting",
      "Claims Settlement"
    ]
  },
  {
    id: "fi-risk-rating",
    title: "FI — Risk Rating",
    description: "PRN 7.1 Step 2 — DTA-assigned risk tier used for monitoring frequency",
    values: ["Low", "Moderate", "Elevated", "High", "Critical"]
  },
  {
    id: "fi-review-frequency",
    title: "FI — Review Frequency",
    description: "PRN 7.1 Step 4 — periodic re-review cadence (drives scheduled-tasks)",
    values: ["Monthly", "Quarterly", "Half-Yearly", "Annually", "Biennial", "On Demand"]
  },
  {
    id: "fi-monitoring-status",
    title: "FI — Monitoring Status",
    description: "PRN 7.1 Step 4 — DTA ongoing-supervision state",
    values: [
      "Not Scheduled",
      "Scheduled",
      "In Progress",
      "Observations Raised",
      "Rectification Pending",
      "Closed"
    ]
  },
  {
    id: "sb-program-type",
    title: "Social Benefits — Program Type",
    description: "PRN Social Benefits row 97 / Stipend row 102 — the top-level scheme type",
    values: ["Social Benefit Program", "Stipend Program"]
  },
  {
    id: "sb-beneficiary-type",
    title: "Social Benefits — Beneficiary Type",
    description: "PRN row 97 (1.0) — Beneficiary Category Master: Individual / Institutional",
    values: ["Individual", "Institutional"]
  },
  {
    id: "sb-beneficiary-category",
    title: "Social Benefits — Beneficiary Category",
    description: "PRN row 97 (1.0) + LoVs 14.2 — Students, Disabled Individual, Age-old Pensioner, Orphaned, Educational Institution",
    values: [
      "Students",
      "Disabled / Impaired Individual",
      "Age-old Pensioner",
      "Orphaned",
      "Educational Institutional Set-up"
    ]
  },
  {
    id: "sb-expenditure-type",
    title: "Social Benefits — Expenditure Type",
    description: "DD 28.15 + LoVs 14.3 — COFOG expenditure classification",
    values: ["Expenses", "Non-financial Assets"]
  },
  {
    id: "sb-budget-source",
    title: "Social Benefits — Budget Source",
    description: "LoVs 14.4 — budget code sourcing",
    values: [
      "Agency (on advice from Government)",
      "Operating Budgetary Agency",
      "Sources of Funds"
    ]
  },
  {
    id: "sb-payment-account",
    title: "Social Benefits — Payment Account",
    description: "LoVs 14.5 — disbursing account",
    values: ["TSA (Treasury Single Account)", "RGoB"]
  },
  {
    id: "sb-deduction-type",
    title: "Stipend — Deduction Type",
    description: "DD 28.10-28.12 — House Rent / Mess / Other deductions",
    values: ["House Rent", "Mess", "Other"]
  },
  {
    id: "sb-program-status",
    title: "Social Benefits — Program Status",
    description: "PRN row 99 (3.0) + row 101 (5.0) — lifecycle of a social benefits program",
    values: ["Draft", "Active", "Suspended", "Closed", "Expired"]
  },
  {
    id: "sb-beneficiary-status",
    title: "Social Benefits — Beneficiary Status",
    description: "PRN row 98 (2.0) + row 103-104 (2.0/3.0) — beneficiary on-boarding workflow state",
    values: [
      "Draft",
      "Submitted",
      "Under Coordinator Review",
      "Under Finance Review",
      "Under Head Approval",
      "Approved",
      "Active",
      "Suspended",
      "Rejected"
    ]
  },
  {
    id: "sb-txn-status",
    title: "Social Benefits — Payment Transaction Status",
    description: "PRN row 100 (4.0) + row 105 (4.0) — payment order / transaction lifecycle",
    values: [
      "Draft",
      "Submitted",
      "Under Validation",
      "Approved",
      "Payment Order Generated",
      "Released",
      "Rejected"
    ]
  },
  {
    id: "sb-validation-rule",
    title: "Social Benefits — Validation Rules",
    description: "PRN row 101 (5.0) + row 106 (5.0) — SRS mandated system validation checks",
    values: [
      "Authorised user only (audit trail maintained)",
      "No duplicate beneficiary registration",
      "Beneficiary not registered to multiple stipends",
      "Beneficiary profile meets eligibility criteria of program",
      "Students studying in school (enrolment verified)",
      "Budget availability check",
      "Commitment availability check"
    ]
  },
  {
    id: "sb-document-type",
    title: "Social Benefits — Supporting Document Type",
    description: "PRN row 98 (2.0) — documents captured during onboarding (CID, enrolment proof, bank verification, etc.)",
    values: [
      "CID / ID Proof",
      "Enrolment Letter",
      "Disability Certificate",
      "Pensioner Card",
      "Bank Account Verification",
      "Institutional Letter",
      "Program Eligibility Proof"
    ]
  },
  {
    id: "sc-type",
    title: "Subscription / Contribution — Transaction Type",
    description: "PD row 107 — governs whether the entity is a periodic subscription or a one-off contribution",
    values: ["Subscription", "Contribution"]
  },
  {
    id: "sc-scope",
    title: "Subscription / Contribution — Scope",
    description: "DD 26.1 — Domestic / International distinguishes BTN-denominated local payments from foreign remittances",
    values: ["Domestic", "International"]
  },
  {
    id: "sc-beneficiary-type",
    title: "Subscription / Contribution — Beneficiary Type",
    description: "PD row 107 — Individual beneficiary or Institutional / Organisational entity",
    values: ["Individual", "Institutional"]
  },
  {
    id: "sc-organisation-type",
    title: "Subscription / Contribution — Organisation Type",
    description: "PD row 107 eg. UN agencies (WHO, UNESCO, UNICEF), regional organisations (SAARC, BIMSTEC, World Bank, IMF)",
    values: [
      "UN Agency",
      "Regional Organisation",
      "Bilateral Organisation",
      "Multilateral Organisation",
      "Professional Body",
      "NGO / INGO",
      "Other"
    ]
  },
  {
    id: "sc-entity-status",
    title: "Subscription / Contribution — Entity Status",
    description: "PD row 107 — Active / Inactive plus workflow states until approval and lifecycle close",
    values: [
      "Draft",
      "Submitted",
      "Under Validation",
      "Approved",
      "Active",
      "Inactive",
      "Suspended",
      "Closed"
    ]
  },
  {
    id: "sc-txn-status",
    title: "Subscription / Contribution — Payment Transaction Status",
    description: "PD row 108 — Finance creates, Head approves, Cash Management releases. Status moves Draft → Submitted → Under Validation → Approved → Payment Order Generated → Released.",
    values: [
      "Draft",
      "Submitted",
      "Under Validation",
      "Approved",
      "Payment Order Generated",
      "Released",
      "Rejected"
    ]
  },
  {
    id: "sc-validation-rule",
    title: "Subscription / Contribution — Validation Rule",
    description: "PD row 109 — SYSTEM VALIDATION checks",
    values: [
      "Authorised user check — amendment audit trail maintained",
      "Budget availability check",
      "Commitment availability check",
      "Registry-as-vendor cross-check (DD 26.1)",
      "SWIFT / Routing code format check (DD 26.3) for international payments",
      "Duplicate entity registration check",
      "Currency vs scope consistency check (Domestic = BTN)"
    ]
  },
  {
    id: "sc-document-type",
    title: "Subscription / Contribution — Supporting Document Type",
    description: "PD row 107 — supporting documents captured during registration",
    values: [
      "Membership Certificate",
      "Invoice / Demand Note",
      "Commitment Letter",
      "Approval Memo",
      "Bank Verification",
      "Foreign Exchange Clearance",
      "Other"
    ]
  },
  {
    id: "ucoa-level",
    title: "UCoA Hierarchy Level",
    description: "Universal Chart of Accounts — hierarchy levels used across Contract, Sanction, Invoice/Bill and Advances modules",
    values: [
      "Fund",
      "Sector",
      "Sub-Sector",
      "Programme",
      "Sub-Programme",
      "Activity",
      "Sub-Activity",
      "Object Code"
    ]
  },
  {
    id: "payroll-employee-category",
    title: "Employee Category",
    description: "Payroll SRS — Canonical employee category LoV. Every category belongs to one of two payroll streams (Civil Servant or Other Public Servant); the mapping is defined in payrollEmployeeCategories.ts so it stays in sync with payroll processing rules.",
    values: [
      "Civil Servants",
      "Constitutional Bodies",
      "Foreign Services",
      "Foreign Services (Local Recruit)",
      "Judiciary",
      "Local Government",
      "Parliament (Members of NA/NC)",
      "Religious Services",
      "Other Public Servants: RUB",
      "Royal Bhutan Police",
      "Royal Bhutan Police (Civil)",
      "Local Recruits"
    ]
  },
  {
    id: "payroll-employee-type",
    title: "Employee Type",
    description: "Payroll SRS — Appointment / engagement type used on the paybill (Regular, Contract variants, GSP/ESP, Para-Regular)",
    values: [
      "Regular",
      "Contract",
      "Consolidated-Contract",
      "Contract: GSP / ESP (General & Elementary Service Personnel)",
      "Para-Regular"
    ]
  },
  {
    id: "payroll-employee-status",
    title: "Employee Status",
    description: "Payroll SRS — Employment status values",
    values: ["Active", "On Leave", "Suspended", "Separated", "Transferred"]
  },
  {
    id: "payroll-data-source",
    title: "Employee Data Source",
    description: "Payroll SRS — System source of employee record",
    values: ["ZESt (RCSC)", "Manual Entry", "Excel Upload"]
  },
  {
    id: "payroll-nppf-tier",
    title: "NPPF Tier",
    description: "National Pension & Provident Fund tier classification",
    values: ["Tier 1", "Tier 2", "Both"]
  },
  {
    id: "payroll-tds-slab",
    title: "TDS Slabs (Income Tax)",
    description: "Tax Deducted at Source — progressive monthly slab brackets. Format: threshold|rate",
    values: ["0|0", "25000|10", "33333|15", "41667|20", "58333|25"]
  },
  {
    id: "payroll-gis-slab",
    title: "GIS Premium Slabs",
    description: "Group Insurance Scheme — monthly premium by position tier. Format: tier|amount",
    values: ["Executive (EX–ES3)|1500", "Professional (P1–P5A)|1000", "Supervisory & Below|500"]
  },
  {
    id: "payroll-one-off-fixed",
    title: "One-off Fixed Payment Slabs",
    description: "One-off fixed monthly payment by position tier. Format: tier|amount",
    values: ["Professional I–IV (P1–P4A)|1000", "Professional V to Supervisory IV (P5–S4A)|1500", "Supervisory V & Below (S5–ESP)|2000"]
  },
  {
    id: "payroll-advance-rules",
    title: "Salary Advance Rules",
    description: "Salary Advance — business rules. Format: rule|value",
    values: ["Max Advance (months of gross)|3", "Min Monthly Deduction (Nu.)|5000", "Max Installments|5"]
  },
  {
    id: "payroll-frequency",
    title: "Payroll Frequency",
    description: "Payroll SRS — Pay processing frequency",
    values: ["Monthly", "Fortnightly"]
  },
  {
    id: "payroll-allowance-calc-method",
    title: "Allowance Calculation Method",
    description: "Payroll SRS — How allowance amount is computed",
    values: ["Fixed Amount", "% of Basic Pay", "Slab-Based"]
  },
  {
    id: "payroll-deduction-category",
    title: "Deduction Category",
    description: "Payroll SRS — Statutory / Floating / Recovery deduction classification",
    values: ["Statutory", "Floating", "Recovery"]
  },
  {
    id: "payroll-remit-to",
    title: "Deduction Remittance Party",
    description: "Payroll SRS — Organisations receiving statutory deductions",
    values: ["NPPF", "RICBL", "DRC", "RCSC", "NHDCL/DRC", "Internal"]
  },
  {
    id: "musterroll-beneficiary-type",
    title: "Muster Roll Beneficiary Type",
    description: "Payroll SRS PRN 6.1 — Worker classification for muster roll",
    values: ["Skilled", "Semi-Skilled"]
  },
  {
    id: "musterroll-payment-frequency",
    title: "Muster Roll Payment Frequency",
    description: "Payroll SRS PRN 7.1 — Wage disbursement frequency",
    values: ["Daily", "Weekly", "Monthly", "Quarterly"]
  },
  {
    id: "musterroll-project-status",
    title: "Muster Roll Project Status",
    description: "Payroll SRS PRN 6.1 — Project lifecycle status",
    values: ["Active", "Completed", "Inactive"]
  },
  {
    id: "sitting-fee-category",
    title: "Sitting Fee / Honorarium Category",
    description: "Payroll SRS PRN 8.1 — Beneficiary payment category",
    values: ["Sitting Fee", "Honorarium"]
  }
];
