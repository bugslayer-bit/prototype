/* Status / label helpers for the contract approval queue */

export const statusBadgeClass = (status: string) => {
  switch (status) {
    case "draft": return "bg-slate-100 text-slate-600 ring-slate-200";
    case "submitted": return "bg-amber-50 text-amber-700 ring-amber-200";
    case "technical-review": return "bg-sky-50 text-sky-700 ring-sky-200";
    case "finance-review": return "bg-violet-50 text-violet-700 ring-violet-200";
    case "agency-review": return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "approved": return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "rejected": return "bg-red-50 text-red-700 ring-red-200";
    default: return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

export const statusLabel = (status: string) => {
  switch (status) {
    case "draft": return "Draft";
    case "submitted": return "Submitted";
    case "technical-review": return "Technical Review";
    case "finance-review": return "Finance Review";
    case "agency-review": return "Agency Review";
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    default: return status;
  }
};

export const methodLabel = (m: string) => {
  switch (m) {
    case "manual": return "Manual";
    case "file-upload": return "File Upload";
    case "egp-interface": return "eGP";
    case "cms-interface": return "CMS";
    default: return m;
  }
};

export type FilterKey = "all" | "draft" | "submitted" | "in-review" | "approved" | "rejected";
