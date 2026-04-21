/* ══════════════════════════════════════════════════════════════════════════
   mockContracts.ts
   Fallback demo contracts used when the shared ContractDataContext is
   empty. In normal operation the Extension wizard uses real contracts
   coming from useContractData(). These mocks exist purely so the module
   remains demo-able in isolation.
   ══════════════════════════════════════════════════════════════════════════ */
import type { ContractForExtension } from "../../types";

export const MOCK_CONTRACTS: ContractForExtension[] = [
  {
    id: "CON-2026-00142",
    title: "Thimphu–Paro Highway Resurfacing Phase II",
    contractorId: "CTR-BHU-0031",
    contractorName: "Lhaki Construction Ltd",
    agencyId: "AGY-MoWHS",
    agencyName: "Ministry of Works & Human Settlement",
    category: "Works",
    totalValue: 45000000,
    amountPaid: 18000000,
    startDate: "2025-07-01",
    endDate: "2027-06-30",
    duration: "24 months",
    status: "Active",
    currency: "BTN",
    commitmentRef: "CMT-2025-0891",
    budgetCode: "MoWHS-CAP-2025-RD-04",
    multiYear: true,
    milestones: [
      { id: "MS-001", number: 1, name: "Site Mobilization", amount: 4500000, estimatedDate: "2025-09-30", status: "Paid" },
      { id: "MS-002", number: 2, name: "Earthwork & Drainage", amount: 9000000, estimatedDate: "2026-03-31", status: "Completed" },
      { id: "MS-003", number: 3, name: "Base Course Layer", amount: 9000000, estimatedDate: "2026-09-30", status: "Pending" },
      { id: "MS-004", number: 4, name: "Asphalt Surface", amount: 13500000, estimatedDate: "2027-03-31", status: "Pending" },
      { id: "MS-005", number: 5, name: "Final Completion", amount: 9000000, estimatedDate: "2027-06-30", status: "Pending" },
    ],
  },
  {
    id: "CON-2026-00205",
    title: "Punakha Dzong Restoration Phase III",
    contractorId: "CTR-BHU-0048",
    contractorName: "Druk Heritage Builders",
    agencyId: "AGY-DoC",
    agencyName: "Department of Culture",
    category: "Works",
    totalValue: 28000000,
    amountPaid: 11200000,
    startDate: "2025-04-01",
    endDate: "2026-09-30",
    duration: "18 months",
    status: "Active",
    currency: "BTN",
    commitmentRef: "CMT-2025-0456",
    budgetCode: "DoC-CAP-2025-HR-02",
    multiYear: true,
    milestones: [
      { id: "MS-101", number: 1, name: "Structural Assessment", amount: 5600000, estimatedDate: "2025-07-31", status: "Paid" },
      { id: "MS-102", number: 2, name: "Foundation Strengthening", amount: 8400000, estimatedDate: "2025-12-31", status: "Completed" },
      { id: "MS-103", number: 3, name: "Wall & Roof Restoration", amount: 8400000, estimatedDate: "2026-06-30", status: "Pending" },
      { id: "MS-104", number: 4, name: "Final Finishing & Handover", amount: 5600000, estimatedDate: "2026-09-30", status: "Pending" },
    ],
  },
  {
    id: "CON-2026-00310",
    title: "Phuentsholing ICT Equipment Supply",
    contractorId: "CTR-BHU-0067",
    contractorName: "Bhutan Telecom Solutions",
    agencyId: "AGY-MoIC",
    agencyName: "Ministry of Information & Communications",
    category: "Goods",
    totalValue: 8500000,
    amountPaid: 4250000,
    startDate: "2025-10-01",
    endDate: "2026-06-30",
    duration: "9 months",
    status: "Active",
    currency: "BTN",
    commitmentRef: "CMT-2025-1102",
    budgetCode: "MoIC-CAP-2025-IT-07",
    multiYear: false,
    milestones: [
      { id: "MS-201", number: 1, name: "Equipment Procurement", amount: 4250000, estimatedDate: "2026-01-31", status: "Paid" },
      { id: "MS-202", number: 2, name: "Installation & Testing", amount: 2550000, estimatedDate: "2026-04-30", status: "Pending" },
      { id: "MS-203", number: 3, name: "Training & Handover", amount: 1700000, estimatedDate: "2026-06-30", status: "Pending" },
    ],
  },
];
