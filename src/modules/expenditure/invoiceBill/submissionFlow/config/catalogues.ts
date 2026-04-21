/* Submission channel catalogue, colour tones, step list and initial form state */
import type { ChannelMeta, InvoiceForm } from "../types";

export const CHANNEL_META: ChannelMeta[] = [
  {
    id: "Manual entry by the Agency",
    icon: "👤",
    short: "Manual",
    endpoint: "ifmis://agency.local/manual",
    description: "Direct keyboard entry by an agency officer. No upstream system required.",
    color: "sky",
  },
  {
    id: "e-GP system",
    icon: "🏛️",
    short: "e-GP",
    endpoint: "https://egp.gov.bt/api/v3/invoices/inbox",
    description: "Pull approved e-GP procurement invoices from the national e-GP gateway.",
    color: "indigo",
  },
  {
    id: "CMS",
    icon: "📂",
    short: "CMS",
    endpoint: "https://cms.gov.bt/api/contract/{id}/invoices",
    description: "Sync invoices linked to the Contract Management System contract registry.",
    color: "violet",
  },
  {
    id: "Supplier Self Registration",
    icon: "🛒",
    short: "Supplier Portal",
    endpoint: "https://supplier.ifmis.gov.bt/api/self-service/invoices",
    description: "Vendor-submitted invoices via the Supplier Self-Service portal.",
    color: "emerald",
  },
];

export const CHANNEL_TONE: Record<
  string,
  { ring: string; bg: string; text: string; chip: string; btn: string }
> = {
  sky: { ring: "ring-sky-500", bg: "bg-sky-50", text: "text-sky-700", chip: "bg-sky-100 text-sky-700", btn: "from-sky-600 to-sky-500" },
  indigo: { ring: "ring-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700", chip: "bg-indigo-100 text-indigo-700", btn: "from-indigo-600 to-indigo-500" },
  violet: { ring: "ring-violet-500", bg: "bg-violet-50", text: "text-violet-700", chip: "bg-violet-100 text-violet-700", btn: "from-violet-600 to-violet-500" },
  emerald: { ring: "ring-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700", btn: "from-emerald-600 to-emerald-500" },
};

export const STEPS = [
  { id: 1, name: "Initiation", icon: "🚀", srs: "SRS 48–51" },
  { id: 2, name: "Bind Contract", icon: "📜", srs: "SRS 49" },
  { id: 3, name: "Auto-populate", icon: "⚙️", srs: "SRS 50" },
  { id: 4, name: "Header & Amounts", icon: "💰", srs: "SRS 51" },
  { id: 5, name: "Milestone Details", icon: "🎯", srs: "SRS 52" },
  { id: 6, name: "Documents", icon: "📎", srs: "SRS 53" },
  { id: 7, name: "Validation", icon: "✔️", srs: "SRS 54" },
  { id: 8, name: "Submit", icon: "📤", srs: "SRS 55–58" },
] as const;

export const INITIAL_FORM: InvoiceForm = {
  channel: "",
  submitterName: "",
  submitterRole: "",
  contractorId: "",
  authTime: "",
  authVerified: false,
  contractId: "",
  searchQuery: "",
  filterStatus: "",
  taxType: "",
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  invoiceCategory: "",
  grossAmount: "",
  notes: "",
  milestoneAllocations: {},
  grnNumber: "",
  documentsUploaded: {},
  uploadedFiles: [],
  submissionRemarks: "",
};
