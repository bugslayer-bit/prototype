import { useState, useMemo } from "react";
import { useContractorData } from "../../shared/context/ContractorDataContext";

/* ═══════════════════════════════════════════════════════════════════════════
   Admin Verification Center
   ═══════════════════════════════════════════════════════════════════════════
   Three tabs:
     1. Contractor Registrations — approve/reject new registrations
     2. Amendment Requests — review field changes from public portal
     3. Contract Submissions — approve/reject contract submissions
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Types ───────────────────────────────────────────────────────────── */
interface ContractorRegistration {
  id: string;
  date: string;
  submitterName: string;
  submitterEmail: string;
  companyName: string;
  companyRegistration: string;
  cidPassportNumber: string;
  cidPassportStatus?: "valid" | "invalid" | "pending";
  tpnNumber: string;
  tpnStatus?: "valid" | "invalid" | "pending";
  bankAccountNumber: string;
  bankAccountStatus?: "valid" | "invalid" | "pending";
  status: "pending" | "approved" | "rejected";
  remarks?: string;
  submissionData: Record<string, unknown>;
}

interface AmendmentRequest {
  id: string;
  contractorId: string;
  contractorName: string;
  changes: { field: string; oldValue: string; newValue: string }[];
  reason: string;
  status: "Pending Verification" | "Approved" | "Rejected";
  submittedAt: string;
  reviewedAt?: string;
  adminRemarks?: string;
}

interface ContractSubmission {
  id: string;
  date: string;
  submitterName: string;
  submitterEmail: string;
  contractTitle: string;
  contractorName: string;
  budgetAmount: number;
  budgetValidationStatus?: "valid" | "invalid" | "pending";
  contractorVerificationStatus?: "verified" | "unverified" | "pending";
  status: "pending" | "approved" | "rejected";
  remarks?: string;
  submissionData: Record<string, unknown>;
}

type TabType = "registrations" | "amendments" | "contracts";

/* ── localStorage keys ─────────────────────────────────────────────── */
const AMEND_KEY = "ifmis-amendment-requests";
const CONTRACT_KEY = "ifmis-public-contract-submissions";
const CONTRACTOR_STORE_KEY = "ifmis-contractors";

/* ── Component ──────────────────────────────────────────────────────── */
export function AdminVerificationPage() {
  const { contractors, updateContractor } = useContractorData();
  const [activeTab, setActiveTab] = useState<TabType>("registrations");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Load data ──────────────────────────────────────────────────── */
  const registrations = useMemo<ContractorRegistration[]>(() => {
    return contractors
      .filter((contractor) => contractor.submittedVia === "public")
      .map((contractor) => ({
        id: contractor.id,
        date: contractor.createdAt,
        submitterName: contractor.displayName,
        submitterEmail: contractor.email,
        companyName: contractor.displayName,
        companyRegistration: contractor.registrationNumber,
        cidPassportNumber: contractor.registrationNumber,
        cidPassportStatus: contractor.verification === "Verified" ? "valid" : contractor.verification === "Rejected" ? "invalid" : "pending",
        tpnNumber: contractor.taxNumber,
        tpnStatus: contractor.verification === "Verified" ? "valid" : contractor.verification === "Rejected" ? "invalid" : "pending",
        bankAccountNumber: contractor.bankAccountNumber,
        bankAccountStatus: contractor.verification === "Verified" ? "valid" : contractor.verification === "Rejected" ? "invalid" : "pending",
        status: contractor.verification === "Verified" ? "approved" : contractor.verification === "Rejected" ? "rejected" : "pending",
        remarks: contractor.reviewRemarks,
        submissionData: contractor.profile
      }));
  }, [contractors]);

  const amendments = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(AMEND_KEY) || "[]") as AmendmentRequest[]; }
    catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const contracts = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(CONTRACT_KEY) || "[]") as ContractSubmission[]; }
    catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  /* ── Filtering ──────────────────────────────────────────────────── */
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || item.submitterName.toLowerCase().includes(q) || item.companyName.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [registrations, statusFilter, searchQuery]);

  const filteredAmendments = useMemo(() => {
    return amendments.filter((item) => {
      const statusMap: Record<string, string> = { "Pending Verification": "pending", "Approved": "approved", "Rejected": "rejected" };
      const matchesStatus = statusFilter === "all" || statusMap[item.status] === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || item.contractorName.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.contractorId.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [amendments, statusFilter, searchQuery]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || item.submitterName.toLowerCase().includes(q) || item.contractTitle.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [contracts, statusFilter, searchQuery]);

  /* ── Stats ──────────────────────────────────────────────────────── */
  const getStats = () => {
    if (activeTab === "registrations") return {
      pending: registrations.filter((r) => r.status === "pending").length,
      approved: registrations.filter((r) => r.status === "approved").length,
      rejected: registrations.filter((r) => r.status === "rejected").length,
    };
    if (activeTab === "amendments") return {
      pending: amendments.filter((a) => a.status === "Pending Verification").length,
      approved: amendments.filter((a) => a.status === "Approved").length,
      rejected: amendments.filter((a) => a.status === "Rejected").length,
    };
    return {
      pending: contracts.filter((c) => c.status === "pending").length,
      approved: contracts.filter((c) => c.status === "approved").length,
      rejected: contracts.filter((c) => c.status === "rejected").length,
    };
  };
  const stats = getStats();

  /* ── Actions ────────────────────────────────────────────────────── */
  const handleRegistrationAction = (id: string, status: "approved" | "rejected") => {
    const c = contractors.find(x => x.id === id);
    const auditEntry = { action: status === "approved" ? "Admin Verification: Approved" : "Admin Verification: Rejected", performedBy: "Admin", performedAt: new Date().toISOString(), details: remarks[id] || "" };
    const trail = [...(c?.auditTrail || []), auditEntry];
    updateContractor(id, {
      verification: status === "approved" ? "Verified" : "Rejected",
      status: status === "approved" ? "Active and verified" : "Draft",
      verifiedBy: "Admin",
      verifiedAt: new Date().toISOString(),
      reviewRemarks: remarks[id] || "",
      auditTrail: trail
    });
    setRefreshKey((k) => k + 1);
  };

  const handleAmendmentAction = (id: string, action: "Approved" | "Rejected") => {
    try {
      const data: AmendmentRequest[] = JSON.parse(localStorage.getItem(AMEND_KEY) || "[]");
      const target = data.find((a) => a.id === id);

      // If approving, update the contractor record with the new values
      if (action === "Approved" && target) {
        try {
          const contractors = JSON.parse(localStorage.getItem(CONTRACTOR_STORE_KEY) || "[]");
          const updatedContractors = contractors.map((c: Record<string, unknown>) => {
            if ((c as { id: string }).id === target.contractorId) {
              const updated = { ...c };
              // Map field labels back to record keys
              const fieldKeyMap: Record<string, string> = {
                "Contractor Name": "displayName",
                "Contractor Type": "contractorType",
                "Category": "category",
                "Nationality": "nationality",
                "Registration Number": "registrationNumber",
                "Tax Number": "taxNumber",
                "Email": "email",
                "Phone": "phone",
                "Address": "address",
                "Bank Name": "bankName",
                "Bank Account Number": "bankAccountNumber",
                "Bank Account Name": "bankAccountName",
              };
              for (const change of target.changes) {
                const key = fieldKeyMap[change.field];
                if (key) {
                  (updated as Record<string, unknown>)[key] = change.newValue;
                }
              }
              return updated;
            }
            return c;
          });
          localStorage.setItem(CONTRACTOR_STORE_KEY, JSON.stringify(updatedContractors));
        } catch { /* silent */ }
      }

      // Update the amendment status
      const updated = data.map((a) =>
        a.id === id ? { ...a, status: action, adminRemarks: remarks[id] || "", reviewedAt: new Date().toISOString() } : a
      );
      localStorage.setItem(AMEND_KEY, JSON.stringify(updated));
      setRefreshKey((k) => k + 1);
    } catch { /* silent */ }
  };

  const handleContractAction = (id: string, status: "approved" | "rejected") => {
    try {
      const data = JSON.parse(localStorage.getItem(CONTRACT_KEY) || "[]");
      const updated = data.map((item: Record<string, unknown>) =>
        (item as { id: string }).id === id ? { ...item, status, remarks: remarks[id] || "" } : item
      );
      localStorage.setItem(CONTRACT_KEY, JSON.stringify(updated));
      setRefreshKey((k) => k + 1);
    } catch { /* silent */ }
  };

  /* ── Badge helpers ──────────────────────────────────────────────── */
  const statusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "pending" || normalized === "pending verification")
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending</span>;
    if (normalized === "approved")
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Approved</span>;
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 px-2.5 py-1 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Rejected</span>;
  };

  const validationBadge = (status?: string) => {
    if (!status) return null;
    if (status === "valid" || status === "verified")
      return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Valid</span>;
    if (status === "invalid" || status === "unverified")
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">Invalid</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Pending</span>;
  };

  /* ── Shared layout helper ──────────────────────────────────────── */
  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verification Center</h1>
        <p className="mt-1 text-sm text-gray-500">Review and approve public submissions, amendment requests, and contracts.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div><p className="text-xs text-gray-500">Pending</p><p className="text-xl font-bold text-gray-900">{stats.pending}</p></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" />
            </svg>
          </div>
          <div><p className="text-xs text-gray-500">Approved</p><p className="text-xl font-bold text-gray-900">{stats.approved}</p></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
            </svg>
          </div>
          <div><p className="text-xs text-gray-500">Rejected</p><p className="text-xl font-bold text-gray-900">{stats.rejected}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-4">
        <div className="flex border-b border-gray-200">
          {([
            { key: "registrations" as TabType, label: "Registrations", count: registrations.length },
            { key: "amendments" as TabType, label: "Amendment Requests", count: amendments.length },
            { key: "contracts" as TabType, label: "Contracts", count: contracts.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchQuery(""); setStatusFilter("all"); setExpandedId(null); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition border-b-2 ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 p-4 border-b border-gray-100">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ═══════════ REGISTRATIONS TAB ═══════════ */}
      {activeTab === "registrations" && (
        <div className="space-y-3">
          {filteredRegistrations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">No contractor registrations found.</div>
          ) : filteredRegistrations.map((reg) => (
            <div key={reg.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{reg.companyName}</p>
                  <p className="text-xs text-gray-500">{reg.id} · {reg.submitterName} · {new Date(reg.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(reg.status)}
                  <svg className={`w-4 h-4 text-gray-400 transition ${expandedId === reg.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === reg.id && (
                <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 space-y-4">
                  {/* Validation */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Auto-Validation</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs text-gray-500">CID / Passport</p>
                        <div className="mt-1">{validationBadge(reg.cidPassportStatus || "pending")}</div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs text-gray-500">TPN</p>
                        <div className="mt-1">{validationBadge(reg.tpnStatus || "pending")}</div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs text-gray-500">Bank Account</p>
                        <div className="mt-1">{validationBadge(reg.bankAccountStatus || "pending")}</div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow label="Company" value={reg.companyName} />
                    <DetailRow label="Submitter" value={reg.submitterName} />
                    <DetailRow label="Email" value={reg.submitterEmail} />
                    <DetailRow label="Registration No." value={reg.companyRegistration} />
                    <DetailRow label="CID / Passport" value={reg.cidPassportNumber} />
                    <DetailRow label="TPN" value={reg.tpnNumber} />
                    <DetailRow label="Bank Account" value={reg.bankAccountNumber} />
                    <DetailRow label="Date" value={new Date(reg.date).toLocaleString()} />
                  </div>

                  {/* Existing remarks */}
                  {reg.status !== "pending" && reg.remarks && (
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                      <p className="text-xs font-medium text-gray-500">Remarks</p>
                      <p className="mt-1 text-sm text-gray-900">{reg.remarks}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {reg.status === "pending" && (
                    <div className="space-y-3">
                      <textarea
                        value={remarks[reg.id] || ""}
                        onChange={(e) => setRemarks({ ...remarks, [reg.id]: e.target.value })}
                        placeholder="Remarks (optional)..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <div className="flex gap-3">
                        <button onClick={() => handleRegistrationAction(reg.id, "approved")} className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">Approve</button>
                        <button onClick={() => handleRegistrationAction(reg.id, "rejected")} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">Reject</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ AMENDMENTS TAB ═══════════ */}
      {activeTab === "amendments" && (
        <div className="space-y-3">
          {filteredAmendments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">No amendment requests found.</div>
          ) : filteredAmendments.map((amend) => (
            <div key={amend.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === amend.id ? null : amend.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{amend.contractorName}</p>
                  <p className="text-xs text-gray-500">
                    {amend.id} · Contractor: {amend.contractorId} · {new Date(amend.submittedAt).toLocaleDateString()}
                    {" · "}{amend.changes.length} change{amend.changes.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(amend.status)}
                  <svg className={`w-4 h-4 text-gray-400 transition ${expandedId === amend.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === amend.id && (
                <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 space-y-4">
                  {/* Reason */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Reason for Update</p>
                    <p className="text-sm text-gray-900 bg-white rounded-lg border border-gray-200 px-4 py-3">{amend.reason}</p>
                  </div>

                  {/* Changes table */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Requested Changes</p>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Field</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Current Value</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Requested Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amend.changes.map((c, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-b-0">
                              <td className="px-4 py-2.5 font-medium text-gray-700">{c.field}</td>
                              <td className="px-4 py-2.5">
                                <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs font-mono">{c.oldValue || "—"}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs font-mono">{c.newValue || "—"}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* If already reviewed */}
                  {amend.status !== "Pending Verification" && (
                    <div className={`rounded-lg px-4 py-3 text-sm ${
                      amend.status === "Approved"
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-red-50 border border-red-200 text-red-800"
                    }`}>
                      <p className="font-medium">{amend.status === "Approved" ? "Approved" : "Rejected"}</p>
                      {amend.adminRemarks && <p className="mt-1 text-xs opacity-80">Remarks: {amend.adminRemarks}</p>}
                      {amend.reviewedAt && <p className="mt-1 text-xs opacity-60">Reviewed: {new Date(amend.reviewedAt).toLocaleDateString()}</p>}
                    </div>
                  )}

                  {/* Action buttons for pending */}
                  {amend.status === "Pending Verification" && (
                    <div className="space-y-3">
                      <textarea
                        value={remarks[amend.id] || ""}
                        onChange={(e) => setRemarks({ ...remarks, [amend.id]: e.target.value })}
                        placeholder="Admin remarks (optional)..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAmendmentAction(amend.id, "Approved")}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                        >
                          Approve & Update Contractor
                        </button>
                        <button
                          onClick={() => handleAmendmentAction(amend.id, "Rejected")}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
                        >
                          Reject
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">Approving will automatically update the contractor's profile with the requested changes.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ CONTRACTS TAB ═══════════ */}
      {activeTab === "contracts" && (
        <div className="space-y-3">
          {filteredContracts.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">No contract submissions found.</div>
          ) : filteredContracts.map((ct) => (
            <div key={ct.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === ct.id ? null : ct.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{ct.contractTitle}</p>
                  <p className="text-xs text-gray-500">{ct.id} · {ct.submitterName} · {new Date(ct.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(ct.status)}
                  <svg className={`w-4 h-4 text-gray-400 transition ${expandedId === ct.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === ct.id && (
                <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 space-y-4">
                  {/* Validation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">Budget Validation</p>
                      <div className="mt-1">{validationBadge(ct.budgetValidationStatus || "pending")}</div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <p className="text-xs text-gray-500">Contractor Verification</p>
                      <div className="mt-1">{validationBadge(ct.contractorVerificationStatus || "pending")}</div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow label="Contract" value={ct.contractTitle} />
                    <DetailRow label="Submitter" value={ct.submitterName} />
                    <DetailRow label="Email" value={ct.submitterEmail} />
                    <DetailRow label="Contractor" value={ct.contractorName} />
                    <DetailRow label="Budget" value={ct.budgetAmount?.toLocaleString("en-US", { style: "currency", currency: "BTN" }) ?? "—"} />
                    <DetailRow label="Date" value={new Date(ct.date).toLocaleString()} />
                  </div>

                  {ct.status !== "pending" && ct.remarks && (
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                      <p className="text-xs font-medium text-gray-500">Remarks</p>
                      <p className="mt-1 text-sm text-gray-900">{ct.remarks}</p>
                    </div>
                  )}

                  {ct.status === "pending" && (
                    <div className="space-y-3">
                      <textarea
                        value={remarks[ct.id] || ""}
                        onChange={(e) => setRemarks({ ...remarks, [ct.id]: e.target.value })}
                        placeholder="Remarks (optional)..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <div className="flex gap-3">
                        <button onClick={() => handleContractAction(ct.id, "approved")} className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">Approve</button>
                        <button onClick={() => handleContractAction(ct.id, "rejected")} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">Reject</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
