import { useMemo, useState, useCallback } from "react";
import { DeleteConfirmModal } from "../../shared/components/DeleteConfirmModal";
import { useMasterData } from "../../shared/context/MasterDataContext";
import { bhutanBankHierarchy } from "../../shared/data/bankData";
import { InvoiceNumberingFormatCard } from "./InvoiceNumberingFormatCard";
import { DocumentRequirementListCard } from "./DocumentRequirementListCard";
import { getStoredRoles, getStoredUsers } from "../admin/rbac/rbacData";

/** Group IDs that represent bank branch data and need structured code + name input */
const BANK_BRANCH_GROUP_IDS = new Set(["bank-branch-name", "bank-branch-code"]);

/* ── Storage keys ────────────────────────────────────────────────── */
const RBAC_CONFIG_KEY = "ifmis_rbac_agency_config";

/* ═══════════════════════════════════════════════════════════════════
   RoleUserMappingCard — Dynamic role-to-user assignment
   ═══════════════════════════════════════════════════════════════════ */
function RoleUserMappingCard() {
  const roles = useMemo(() => getStoredRoles(), []);
  const users = useMemo(() => getStoredUsers(), []);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [roles, search]);

  const usersByRole = useMemo(() => {
    const map: Record<string, typeof users> = {};
    for (const r of roles) {
      map[r.id] = users.filter((u) => u.roleIds.includes(r.id));
    }
    return map;
  }, [roles, users]);

  const roleCategories = useMemo(() => {
    const internal = filteredRoles.filter(
      (r) => !["role-public", "role-muster-roll", "role-fi"].includes(r.id)
    );
    const external = filteredRoles.filter(
      (r) => ["role-public", "role-muster-roll", "role-fi"].includes(r.id)
    );
    return { internal, external };
  }, [filteredRoles]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Role-to-User Mapping</h3>
          <p className="mt-0.5 text-xs text-slate-500">Assign users to roles dynamically — {roles.length} roles, {users.length} users</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter roles..."
          />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {/* Internal roles */}
        {roleCategories.internal.length > 0 && (
          <div>
            <div className="bg-slate-50/40 px-5 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Internal Roles</span>
            </div>
            {roleCategories.internal.map((role) => {
              const assignedUsers = usersByRole[role.id] ?? [];
              const isOpen = expanded === role.id;
              return (
                <div key={role.id} className="border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : role.id)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-slate-50/50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-[10px] font-bold text-indigo-600">
                      {role.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700">{role.name}</p>
                      <p className="text-[10px] text-slate-400">{role.id}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {assignedUsers.length} user{assignedUsers.length !== 1 ? "s" : ""}
                    </span>
                    <svg className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-3">
                      {assignedUsers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No users assigned to this role</p>
                      ) : (
                        <div className="space-y-1.5">
                          {assignedUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-slate-100">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[9px] font-bold text-indigo-600">{u.name.charAt(0)}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-700">{u.name}</p>
                                <p className="text-[10px] text-slate-400">{u.email}</p>
                              </div>
                              <span className="text-[9px] text-slate-400">{u.id}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-[10px] text-slate-400">
                        Permissions: {(role.permissions ?? []).length} assigned
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* External roles */}
        {roleCategories.external.length > 0 && (
          <div>
            <div className="bg-emerald-50/40 px-5 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">External / Portal Roles</span>
            </div>
            {roleCategories.external.map((role) => {
              const assignedUsers = usersByRole[role.id] ?? [];
              const isOpen = expanded === role.id;
              return (
                <div key={role.id} className="border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : role.id)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-slate-50/50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[10px] font-bold text-emerald-600">
                      {role.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700">{role.name}</p>
                      <p className="text-[10px] text-slate-400">{role.id}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      {assignedUsers.length} user{assignedUsers.length !== 1 ? "s" : ""}
                    </span>
                    <svg className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-emerald-50/20 px-5 py-3">
                      {assignedUsers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No users assigned to this role</p>
                      ) : (
                        <div className="space-y-1.5">
                          {assignedUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-slate-100">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-600">{u.name.charAt(0)}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-700">{u.name}</p>
                                <p className="text-[10px] text-slate-400">{u.email}</p>
                              </div>
                              <span className="text-[9px] text-slate-400">{u.id}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredRoles.length === 0 && (
        <div className="px-5 py-6 text-center text-xs text-slate-400">No roles match your search.</div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RbacPermissionMatrix — Dynamic role-process-action configuration
   Shows what each role can do across all processes, editable per agency.
   ═══════════════════════════════════════════════════════════════════ */

interface AgencyWorkflowConfig {
  processKey: string;
  initiatorRoleId: string;
  reviewerRoleId: string;
  approverRoleId: string;
  additionalReviewers: string[];
}

const PROCESS_GROUPS = [
  {
    group: "Contractor & Vendor",
    processes: [
      { key: "Contractor Registration", short: "Contractor Reg." },
      { key: "Contractor Management", short: "Contractor Mgmt." },
      { key: "Vendor Management", short: "Vendor Mgmt." },
    ],
  },
  {
    group: "Contract Lifecycle",
    processes: [
      { key: "Contract Creation", short: "Contract Create" },
      { key: "Contract Amendment", short: "Contract Amend." },
      { key: "Contract Extension", short: "Contract Ext." },
      { key: "Contract Closure", short: "Contract Close" },
    ],
  },
  {
    group: "Invoice & Payment",
    processes: [
      { key: "Invoice Submission", short: "Invoice Submit" },
      { key: "Bill Processing", short: "Bill Process" },
      { key: "Payment Order", short: "Payment Order" },
      { key: "Utility Payment", short: "Utility Pay" },
    ],
  },
  {
    group: "Advances & Sanctions",
    processes: [
      { key: "Advances", short: "Advances" },
      { key: "Sanction Management", short: "Sanctions" },
      { key: "Retention Release", short: "Retention Rel." },
    ],
  },
  {
    group: "Payroll & Social",
    processes: [
      { key: "Payroll Generation", short: "Payroll Gen." },
      { key: "Muster Roll", short: "Muster Roll" },
      { key: "Social Benefits", short: "Social Benefits" },
      { key: "Stipend Management", short: "Stipend Mgmt." },
    ],
  },
];

const ACTIONS = ["View", "Create", "Edit", "Submit", "Approve", "Reject", "Export"] as const;
const ACTION_COLORS: Record<string, string> = {
  View: "bg-slate-100 text-slate-600",
  Create: "bg-emerald-50 text-emerald-700",
  Edit: "bg-blue-50 text-blue-700",
  Submit: "bg-indigo-50 text-indigo-700",
  Approve: "bg-green-50 text-green-700 ring-1 ring-green-200",
  Reject: "bg-red-50 text-red-600",
  Export: "bg-purple-50 text-purple-600",
};

function RbacPermissionMatrix() {
  const roles = useMemo(() => getStoredRoles(), []);
  const [selectedRole, setSelectedRole] = useState(roles[0]?.id ?? "");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(PROCESS_GROUPS[0]?.group ?? null);
  const [view, setView] = useState<"capabilities" | "workflow">("capabilities");

  /* Approval workflow configuration per agency */
  const [workflows, setWorkflows] = useState<AgencyWorkflowConfig[]>(() => {
    try {
      const stored = localStorage.getItem(RBAC_CONFIG_KEY);
      if (stored) return JSON.parse(stored) as AgencyWorkflowConfig[];
    } catch {}
    return PROCESS_GROUPS.flatMap((g) =>
      g.processes.map((p) => ({
        processKey: p.key,
        initiatorRoleId: "role-agency-staff",
        reviewerRoleId: "role-finance-officer",
        approverRoleId: "role-head-of-agency",
        additionalReviewers: [],
      }))
    );
  });

  const persistWorkflows = useCallback((next: AgencyWorkflowConfig[]) => {
    setWorkflows(next);
    localStorage.setItem(RBAC_CONFIG_KEY, JSON.stringify(next));
  }, []);

  const updateWorkflow = useCallback(
    (processKey: string, field: keyof AgencyWorkflowConfig, value: string) => {
      persistWorkflows(
        workflows.map((w) => (w.processKey === processKey ? { ...w, [field]: value } : w))
      );
    },
    [workflows, persistWorkflows]
  );

  const addReviewer = useCallback(
    (processKey: string, roleId: string) => {
      persistWorkflows(
        workflows.map((w) => {
          if (w.processKey !== processKey) return w;
          if (w.additionalReviewers.includes(roleId)) return w;
          return { ...w, additionalReviewers: [...w.additionalReviewers, roleId] };
        })
      );
    },
    [workflows, persistWorkflows]
  );

  const removeReviewer = useCallback(
    (processKey: string, roleId: string) => {
      persistWorkflows(
        workflows.map((w) => {
          if (w.processKey !== processKey) return w;
          return { ...w, additionalReviewers: w.additionalReviewers.filter((r) => r !== roleId) };
        })
      );
    },
    [workflows, persistWorkflows]
  );

  const role = useMemo(() => roles.find((r) => r.id === selectedRole), [roles, selectedRole]);

  /* Build permission lookup for the selected role */
  const rolePerms = useMemo(() => {
    if (!role) return new Set<string>();
    return new Set(role.permissionIds);
  }, [role]);

  function hasPermission(processKey: string, action: string): boolean {
    const permId = `${processKey.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${action.toLowerCase()}`;
    return rolePerms.has(permId);
  }

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  const internalRoles = useMemo(
    () => roles.filter((r) => !["role-public", "role-muster-roll", "role-fi"].includes(r.id)),
    [roles]
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Role-Based Access Control</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure what each role can do across all processes and define approval workflows per agency
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("capabilities")}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${view === "capabilities" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Role Capabilities
            </button>
            <button
              type="button"
              onClick={() => setView("workflow")}
              className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${view === "workflow" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Approval Workflows
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab 1: Role Capabilities ── */}
      {view === "capabilities" && (
        <div>
          {/* Role selector */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Role</span>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    selectedRole === r.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Role info bar */}
          {role && (
            <div className="flex items-center gap-4 border-b border-slate-100 bg-indigo-50/40 px-5 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">{role.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{role.description}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-700">{role.permissionIds.length}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Permissions</p>
              </div>
            </div>
          )}

          {/* Process groups */}
          <div className="divide-y divide-slate-100">
            {PROCESS_GROUPS.map((pg) => {
              const isOpen = expandedGroup === pg.group;
              const totalPerms = pg.processes.reduce(
                (acc, p) => acc + ACTIONS.filter((a) => hasPermission(p.key, a)).length,
                0
              );
              return (
                <div key={pg.group}>
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isOpen ? null : pg.group)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <svg
                      className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="flex-1 text-xs font-bold text-slate-700">{pg.group}</span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                      {totalPerms} active
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/30">
                      {/* Action header */}
                      <div className="hidden items-center gap-0 border-b border-slate-100 px-5 py-1.5 sm:flex">
                        <div className="w-36 shrink-0" />
                        {ACTIONS.map((a) => (
                          <div key={a} className="w-16 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {a}
                          </div>
                        ))}
                      </div>

                      {/* Process rows */}
                      {pg.processes.map((p) => (
                        <div key={p.key} className="flex flex-wrap items-center gap-0 px-5 py-2 sm:flex-nowrap">
                          <div className="w-full shrink-0 text-[11px] font-medium text-slate-700 sm:w-36">
                            {p.short}
                          </div>
                          <div className="flex gap-1 sm:gap-0">
                            {ACTIONS.map((a) => {
                              const has = hasPermission(p.key, a);
                              return (
                                <div key={a} className="flex w-16 items-center justify-center">
                                  {has ? (
                                    <span className={`inline-flex h-5 items-center rounded px-1.5 text-[9px] font-bold ${ACTION_COLORS[a]}`}>
                                      {a === "Approve" ? "APR" : a === "Reject" ? "REJ" : a.slice(0, 3).toUpperCase()}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-200">—</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab 2: Approval Workflows ── */}
      {view === "workflow" && (
        <div>
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Define the approval chain for each process at the agency level.
              Assign which role initiates, reviews, and gives final approval.
              Add additional reviewers for processes that need extra verification layers.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {PROCESS_GROUPS.map((pg) => (
              <div key={pg.group}>
                <div className="bg-slate-50/60 px-5 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{pg.group}</span>
                </div>

                {pg.processes.map((p) => {
                  const wf = workflows.find((w) => w.processKey === p.key);
                  if (!wf) return null;
                  return (
                    <div key={p.key} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-xs font-semibold text-slate-800">{p.key}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {/* Initiator */}
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Initiator</p>
                          <select
                            className="w-full rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-400"
                            value={wf.initiatorRoleId}
                            onChange={(e) => updateWorkflow(p.key, "initiatorRoleId", e.target.value)}
                          >
                            {internalRoles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                            <option value="role-public">Public User</option>
                          </select>
                        </div>

                        {/* Reviewer */}
                        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600 mb-1">Reviewer</p>
                          <select
                            className="w-full rounded border border-blue-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-400"
                            value={wf.reviewerRoleId}
                            onChange={(e) => updateWorkflow(p.key, "reviewerRoleId", e.target.value)}
                          >
                            {internalRoles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Approver */}
                        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-violet-600 mb-1">Approver</p>
                          <select
                            className="w-full rounded border border-violet-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-violet-400"
                            value={wf.approverRoleId}
                            onChange={(e) => updateWorkflow(p.key, "approverRoleId", e.target.value)}
                          >
                            {internalRoles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Additional Reviewers */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Extra Reviewers
                            <span className="ml-1 text-slate-400 normal-case font-normal">(optional)</span>
                          </p>
                          {wf.additionalReviewers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {wf.additionalReviewers.map((rid) => (
                                <span key={rid} className="inline-flex items-center gap-1 rounded bg-slate-200/70 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                                  {roleName(rid)}
                                  <button type="button" onClick={() => removeReviewer(p.key, rid)} className="text-slate-400 hover:text-red-500">&times;</button>
                                </span>
                              ))}
                            </div>
                          )}
                          <select
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500 outline-none"
                            value=""
                            onChange={(e) => { if (e.target.value) addReviewer(p.key, e.target.value); }}
                          >
                            <option value="">+ Add reviewer</option>
                            {internalRoles
                              .filter((r) => !wf.additionalReviewers.includes(r.id) && r.id !== wf.reviewerRoleId && r.id !== wf.approverRoleId)
                              .map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function MasterDataPage() {
  const { masterData, addValueToGroup, removeValueFromGroup } = useMasterData();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** Separate drafts for the structured bank branch input: bfscCode and branchName */
  const [bankDrafts, setBankDrafts] = useState<Record<string, { bfscCode: string; branchName: string; bankId: string }>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ groupId: string; groupTitle: string; value: string } | null>(null);

  /* Token-based search: every whitespace-separated word in the query must match
     somewhere in the group (title / description / id / one of the values).
     This makes "contract category" match a group titled "Contract Category"
     and also lets users type fragments like "contract goods" to find a group
     whose title contains "contract" and whose values contain "goods". */
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchTokens = useMemo(
    () => normalizedSearch.split(/\s+/).filter(Boolean),
    [normalizedSearch]
  );

  const filteredGroups = useMemo(
    () =>
      masterData
        .map((group) => {
          if (searchTokens.length === 0) {
            return group;
          }

          const haystack = `${group.title} ${group.description} ${group.id}`.toLowerCase();
          const lowerValues = group.values.map((value) => value.toLowerCase());

          const groupMatchesAllTokens = searchTokens.every((token) => haystack.includes(token));

          if (groupMatchesAllTokens) {
            return group;
          }

          /* Otherwise, narrow the visible values to those that match every token */
          const matchingValues = group.values.filter((_value, idx) =>
            searchTokens.every(
              (token) => lowerValues[idx].includes(token) || haystack.includes(token)
            )
          );

          if (matchingValues.length > 0) {
            return {
              ...group,
              values: matchingValues
            };
          }

          return null;
        })
        .filter((group): group is (typeof masterData)[number] => Boolean(group)),
    [masterData, searchTokens]
  );

  return (
    <div className="grid gap-6">
      <DeleteConfirmModal
        open={Boolean(pendingDelete)}
        value={pendingDelete?.value ?? ""}
        groupTitle={pendingDelete?.groupTitle ?? ""}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }

          removeValueFromGroup(pendingDelete.groupId, pendingDelete.value);
          setPendingDelete(null);
        }}
      />

      <section className="rounded-[24px] border border-slate-200/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(255,245,236,0.82))] p-5 shadow-[0_14px_36px_rgba(39,57,64,0.10)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700">Master Data</p>
        <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight text-slate-900 sm:text-[2.35rem] lg:text-4xl">Master Data</h2>
        <div className="mt-6">
          <label className="block text-sm font-semibold text-slate-800">
            Search Master Data
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search LoV title or value"
            />
          </label>
        </div>
      </section>

      {/* Dynamic role-user mapping */}
      <RoleUserMappingCard />

      {/* Dynamic RBAC permission matrix & approval workflows */}
      <RbacPermissionMatrix />

      <InvoiceNumberingFormatCard />

      <DocumentRequirementListCard />

      <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/90 shadow-[0_14px_36px_rgba(39,57,64,0.08)]">
        <div className="hidden grid-cols-[160px_minmax(0,1fr)_120px] gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-3 lg:grid">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">LoV</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Title</div>
          <div className="text-right text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Values</div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroupId === group.id;

            return (
              <article key={group.id} className="bg-white">
                <button
                  type="button"
                  className="grid w-full gap-2 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5 lg:grid-cols-[160px_minmax(0,1fr)_120px] lg:items-center"
                  onClick={() => setExpandedGroupId((current) => (current === group.id ? null : group.id))}
                >
                  <div className="text-sm font-semibold text-teal-700">{group.description}</div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-slate-900">{group.title}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">{group.id}</p>
                      </div>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 lg:hidden">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between lg:justify-end">
                    <span className="text-xs text-slate-500 lg:hidden">Values</span>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {group.values.length}
                      </span>
                      <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 lg:inline-flex">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Values</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.values.map((value) => (
                            <div key={value} className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                              <span>{value}</span>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                                onClick={() => setPendingDelete({ groupId: group.id, groupTitle: group.title, value })}
                                aria-label={`Delete ${value} from ${group.title}`}
                              >
                                🗑
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Manage</p>
                        {BANK_BRANCH_GROUP_IDS.has(group.id) ? (
                          <div className="mt-3 flex flex-col gap-2">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                              value={bankDrafts[group.id]?.bankId ?? ""}
                              onChange={(event) =>
                                setBankDrafts((current) => ({
                                  ...current,
                                  [group.id]: { ...current[group.id], bankId: event.target.value, bfscCode: "", branchName: "" }
                                }))
                              }
                            >
                              <option value="">-- Select Bank --</option>
                              {bhutanBankHierarchy.map((bank) => (
                                <option key={bank.id} value={bank.id}>
                                  {bank.name} ({bank.id})
                                </option>
                              ))}
                            </select>
                            <input
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                              value={bankDrafts[group.id]?.bfscCode ?? ""}
                              onChange={(event) =>
                                setBankDrafts((current) => ({
                                  ...current,
                                  [group.id]: { ...current[group.id], bfscCode: event.target.value }
                                }))
                              }
                              placeholder={
                                bankDrafts[group.id]?.bankId
                                  ? `BFSC Code (e.g. ${bhutanBankHierarchy.find((b) => b.id === bankDrafts[group.id]?.bankId)?.bfscPrefix ?? ""}xxx)`
                                  : "BFSC Code (select bank first)"
                              }
                            />
                            <input
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                              value={bankDrafts[group.id]?.branchName ?? ""}
                              onChange={(event) =>
                                setBankDrafts((current) => ({
                                  ...current,
                                  [group.id]: { ...current[group.id], branchName: event.target.value }
                                }))
                              }
                              placeholder="Branch Name (e.g. Thimphu Main Branch)"
                            />
                            <button
                              type="button"
                              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
                              disabled={!bankDrafts[group.id]?.bfscCode || !bankDrafts[group.id]?.branchName || !bankDrafts[group.id]?.bankId}
                              onClick={() => {
                                const draft = bankDrafts[group.id];
                                if (!draft?.bfscCode || !draft?.branchName || !draft?.bankId) return;
                                const bankAbbr = draft.bankId;
                                const formatted =
                                  group.id === "bank-branch-name"
                                    ? `${draft.bfscCode} - ${draft.branchName} (${bankAbbr})`
                                    : `${draft.bfscCode} - ${draft.branchName}`;
                                addValueToGroup(group.id, formatted);
                                setBankDrafts((current) => ({
                                  ...current,
                                  [group.id]: { bfscCode: "", branchName: "", bankId: draft.bankId }
                                }));
                              }}
                            >
                              Add Branch
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-col gap-2">
                            <input
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                              value={drafts[group.id] ?? ""}
                              onChange={(event) => setDrafts((current) => ({ ...current, [group.id]: event.target.value }))}
                              placeholder={`Add value to ${group.title}`}
                            />
                            <button
                              type="button"
                              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                              onClick={() => {
                                addValueToGroup(group.id, drafts[group.id] ?? "");
                                setDrafts((current) => ({ ...current, [group.id]: "" }));
                              }}
                            >
                              Add Value
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {filteredGroups.length === 0 ? (
          <article className="border-t border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
            No master data values match your search.
          </article>
        ) : null}
      </section>
    </div>
  );
}
