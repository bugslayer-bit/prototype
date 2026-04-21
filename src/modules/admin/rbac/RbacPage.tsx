import { useCallback, useEffect, useMemo, useState } from "react";
import {
  allPermissions,
  getStoredRoles,
  getStoredUsers,
  rbacModules,
  rbacActions,
  type Permission,
  type RbacUser,
  type Role,
  type UserStatus,
  writeStoredRoles,
  writeStoredUsers,
} from "./rbacData";
import {
  getStoredWorkflows,
  writeStoredWorkflows,
  stepKindStyles,
  stepKindDescriptions,
  RBAC_WORKFLOWS_VERSION_KEY,
  RBAC_WORKFLOWS_VERSION,
  seedWorkflows,
  type WorkflowProcess,
  type WorkflowStep,
  type WorkflowStepKind,
  getAllStepKinds,
} from "./workflowData";
import { useAuth } from "../../../shared/context/AuthContext";
import { getAgencyByCode, getAgenciesByType, getAllAgenciesByType, getAgencyTypeLabel, getAgencyTypeIcon, getStaffPositionForAgency, AGENCIES, DEMO_AGENCY_CODES, type AgencyType } from "../../../shared/data/agencyPersonas";
import { getAllModules, getCustomModules, writeCustomModules, type ModuleActorInfo, type WorkflowActor } from "../../../shared/data/moduleActors";
import { inp, sel, miniLbl, pillActive, type Tab } from "./rbacFlow";

/* ═══════════════════════════════════════════════════════════════════
   RBAC PAGE
   ═══════════════════════════════════════════════════════════════════ */
export function RbacPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<RbacUser[]>(() => getStoredUsers());
  const [roles, setRoles] = useState<Role[]>(() => getStoredRoles());
  const [workflows, setWorkflows] = useState<WorkflowProcess[]>(() => {
    /* Version-bust: if stored workflows use old step-kind vocabulary, reset to new PFM seeds */
    if (typeof window !== "undefined") {
      const storedVer = window.localStorage.getItem(RBAC_WORKFLOWS_VERSION_KEY);
      if (storedVer !== RBAC_WORKFLOWS_VERSION) {
        window.localStorage.removeItem("ifmis_rbac_workflows");
        window.localStorage.setItem(RBAC_WORKFLOWS_VERSION_KEY, RBAC_WORKFLOWS_VERSION);
        return seedWorkflows;
      }
    }
    return getStoredWorkflows();
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    writeStoredUsers(users);
  }, [users]);

  useEffect(() => {
    writeStoredRoles(roles);
  }, [roles]);

  useEffect(() => {
    writeStoredWorkflows(workflows);
  }, [workflows]);

  return (
    <div className="mx-auto max-w-[1260px] px-4 py-6">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Role-Based Access Control</h1>
        <p className="text-sm text-slate-500 mt-1">Manage users, roles, and permissions for the IFMIS system</p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-2 mb-6 rounded-2xl bg-slate-100 p-1.5 w-fit">
        {([
          { key: "users" as Tab, label: "Users", count: users.length },
          { key: "roles" as Tab, label: "Roles", count: roles.length },
          { key: "permissions" as Tab, label: "Permission Matrix", count: null },
          { key: "workflow" as Tab, label: "Workflow", count: workflows.length },
          { key: "modules" as Tab, label: "Modules", count: getAllModules().length },
        ]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setSearch(""); }}
            className={`${pillActive} ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
            {t.count !== null && <span className="ml-1.5 text-[10px] font-medium text-slate-400">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {tab === "users" && <UsersTab users={users} setUsers={setUsers} roles={roles} search={search} setSearch={setSearch} />}
      {tab === "roles" && <RolesTab roles={roles} setRoles={setRoles} users={users} search={search} setSearch={setSearch} />}
      {tab === "permissions" && <PermissionsTab roles={roles} setRoles={setRoles} />}
      {tab === "workflow" && <WorkflowTab workflows={workflows} setWorkflows={setWorkflows} roles={roles} />}
      {tab === "modules" && <ModulesTab roles={roles} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   USERS TAB
   ═══════════════════════════════════════════════════════════════════ */
function UsersTab({ users, setUsers, roles, search, setSearch }: {
  users: RbacUser[]; setUsers: React.Dispatch<React.SetStateAction<RbacUser[]>>;
  roles: Role[]; search: string; setSearch: (s: string) => void;
}) {
  const { user: currentUser, activeRoleId, activeAgencyCode, setActiveRoleId } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Partial<RbacUser>>({});
  const [agencyFilter, setAgencyFilter] = useState<string>("active"); // "active" | "all" | specific code

  const effectiveAgencyFilter = agencyFilter === "active" ? activeAgencyCode : agencyFilter;
  const activeAgency = getAgencyByCode(activeAgencyCode);
  /* Demo agencies for dropdowns — show only the focused set */
  const demoAgencies = useMemo(() =>
    DEMO_AGENCY_CODES.length > 0
      ? AGENCIES.filter(a => DEMO_AGENCY_CODES.includes(a.code))
      : AGENCIES
  , []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q);
      const matchesAgency = effectiveAgencyFilter === "all" || u.agencyCode === effectiveAgencyFilter ||
        /* DSD super-user always visible */
        u.id === "user-001" ||
        /* Public/external users (contractors, vendors, FIs) are visible alongside any agency */
        u.agencyCode === "EXT";
      return matchesSearch && matchesAgency;
    });
  }, [users, search, effectiveAgencyFilter]);

  const roleNameById = useCallback((id: string) => roles.find(r => r.id === id)?.name || id, [roles]);

  function startAdd() {
    setDraft({ name: "", email: "", employeeId: "", department: "", agencyCode: activeAgencyCode, roleIds: [], status: "Active" });
    setShowAdd(true);
    setEditingId(null);
  }

  function saveNewUser() {
    if (!draft.name?.trim() || !draft.email?.trim()) return;
    const newUser: RbacUser = {
      id: `user-${Date.now()}`,
      name: draft.name!,
      email: draft.email!,
      employeeId: draft.employeeId || "—",
      department: draft.department || "—",
      agencyCode: draft.agencyCode || activeAgencyCode,
      roleIds: draft.roleIds || [],
      status: (draft.status as UserStatus) || "Active",
      lastLogin: "—",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setUsers(cur => [...cur, newUser]);
    setShowAdd(false);
    setDraft({});
  }

  function startEdit(u: RbacUser) {
    setEditingId(u.id);
    setDraft({ ...u });
    setShowAdd(false);
  }

  function saveEdit() {
    if (!editingId) return;
    setUsers(cur => cur.map(u => u.id === editingId ? { ...u, ...draft } as RbacUser : u));
    setEditingId(null);
    setDraft({});
  }

  function cancelEdit() { setEditingId(null); setShowAdd(false); setDraft({}); }

  function toggleRole(roleId: string) {
    setDraft(cur => {
      const ids = cur.roleIds || [];
      return { ...cur, roleIds: ids.includes(roleId) ? ids.filter(r => r !== roleId) : [...ids, roleId] };
    });
  }

  function removeUser(id: string) { setUsers(cur => cur.filter(u => u.id !== id)); }

  const statusColor: Record<UserStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Inactive: "bg-slate-100 text-slate-600 ring-slate-200",
    Suspended: "bg-red-50 text-red-600 ring-red-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden">
      {/* Agency filter bar */}
      <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Agency:</span>
          <button
            type="button"
            onClick={() => setAgencyFilter("active")}
            className={`rounded-full px-2.5 py-1 font-semibold transition ring-1 ${agencyFilter === "active" ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"}`}
          >
            {activeAgency?.shortCode ?? "Active"} ({users.filter(u => u.agencyCode === activeAgencyCode || u.id === "user-001" || u.agencyCode === "EXT").length})
          </button>
          <button
            type="button"
            onClick={() => setAgencyFilter("all")}
            className={`rounded-full px-2.5 py-1 font-semibold transition ring-1 ${agencyFilter === "all" ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"}`}
          >
            All Agencies ({users.length})
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input className={inp} placeholder="Search users by name, email, or department..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="button" onClick={startAdd} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#1d4ed8]">
          + Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="border-b border-slate-100 bg-indigo-50/30 px-5 py-4">
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700 mb-3">New User</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className={miniLbl}>Full Name *</label><input className={inp} value={draft.name || ""} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} placeholder="Full name" /></div>
            <div><label className={miniLbl}>Email *</label><input className={inp} type="email" value={draft.email || ""} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} placeholder="email@gov.bt" /></div>
            <div><label className={miniLbl}>Employee ID</label><input className={inp} value={draft.employeeId || ""} onChange={e => setDraft(p => ({ ...p, employeeId: e.target.value }))} placeholder="EMP-XXX" /></div>
            <div><label className={miniLbl}>Department</label><input className={inp} value={draft.department || ""} onChange={e => setDraft(p => ({ ...p, department: e.target.value }))} placeholder="Department" /></div>
          </div>
          <div className="mt-3">
            <label className={miniLbl}>Agency</label>
            <select className={sel} value={draft.agencyCode || activeAgencyCode} onChange={e => setDraft(p => ({ ...p, agencyCode: e.target.value }))}>
              {demoAgencies.map(a => (
                <option key={a.code} value={a.code}>{a.shortCode} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <label className={miniLbl}>Assign Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ring-1 ${(draft.roleIds || []).includes(r.id) ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"}`}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button type="button" onClick={saveNewUser} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-emerald-700">Save User</button>
            <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 transition hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              <th className="px-4 py-2.5 w-10">#</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Agency</th>
              <th className="px-4 py-2.5">Department</th>
              <th className="px-4 py-2.5">Roles</th>
              <th className="px-4 py-2.5 w-44">Acting As</th>
              <th className="px-4 py-2.5 w-20">Status</th>
              <th className="px-4 py-2.5 w-28">Last Login</th>
              <th className="px-4 py-2.5 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, idx) => {
              const isEditing = editingId === u.id;

              if (isEditing) {
                return (
                  <tr key={u.id} className="bg-amber-50/30 border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3"><input className={inp} value={draft.name || ""} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} /></td>
                    <td className="px-4 py-3"><input className={inp} type="email" value={draft.email || ""} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} /></td>
                    <td className="px-4 py-3">
                      <select className={sel} value={draft.agencyCode || u.agencyCode} onChange={e => setDraft(p => ({ ...p, agencyCode: e.target.value }))}>
                        {demoAgencies.map(a => <option key={a.code} value={a.code}>{a.shortCode}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><input className={inp} value={draft.department || ""} onChange={e => setDraft(p => ({ ...p, department: e.target.value }))} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roles.map(r => (
                          <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ring-1 ${(draft.roleIds || []).includes(r.id) ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-500 ring-slate-200"}`}>
                            {r.name}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-400 italic">save first</td>
                    <td className="px-4 py-3">
                      <select className={sel} value={draft.status || "Active"} onChange={e => setDraft(p => ({ ...p, status: e.target.value as UserStatus }))}>
                        <option>Active</option><option>Inactive</option><option>Suspended</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.lastLogin}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={saveEdit} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700">Save</button>
                        <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.employeeId}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const ag = getAgencyByCode(u.agencyCode);
                      return ag ? (
                        <div>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">{ag.shortCode}</span>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400 max-w-[120px]">{ag.name}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.department}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roleIds.map(rid => (
                        <span key={rid} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                          {roleNameById(rid)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.id === currentUser?.id && u.roleIds.length > 0 ? (
                      <select
                        className="w-full rounded-lg border border-indigo-200 bg-indigo-50/40 px-2 py-1.5 text-[11px] font-semibold text-indigo-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        value={activeRoleId || u.roleIds[0]}
                        onChange={(e) => setActiveRoleId(e.target.value)}
                        title="Switch the role you are acting as"
                      >
                        {u.roleIds.map((rid) => (
                          <option key={rid} value={rid}>{roleNameById(rid)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusColor[u.status]}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{u.lastLogin}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" onClick={() => startEdit(u)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition" title="Edit">
                        Edit
                      </button>
                      {!u.name.includes("(You)") && (
                        <button type="button" onClick={() => removeUser(u.id)} className="rounded-lg border border-slate-200 bg-white w-6 h-6 flex items-center justify-center text-slate-300 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition" title="Remove">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">No users match your search</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROLES TAB
   ═══════════════════════════════════════════════════════════════════ */
function RolesTab({ roles, setRoles, users, search, setSearch }: {
  roles: Role[]; setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  users: RbacUser[]; search: string; setSearch: (s: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Partial<Role>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return roles.filter(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [roles, search]);

  function usersWithRole(roleId: string) { return users.filter(u => u.roleIds.includes(roleId)); }

  function startAdd() {
    setDraft({ name: "", description: "", permissionIds: [], isSystem: false });
    setShowAdd(true);
    setEditingId(null);
  }

  function saveNewRole() {
    if (!draft.name?.trim()) return;
    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: draft.name!,
      description: draft.description || "",
      isSystem: false,
      permissionIds: draft.permissionIds || [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setRoles(cur => [...cur, newRole]);
    setShowAdd(false);
    setDraft({});
  }

  function startEdit(r: Role) {
    setEditingId(r.id);
    setDraft({ ...r });
    setShowAdd(false);
  }

  function saveEdit() {
    if (!editingId) return;
    setRoles(cur => cur.map(r => r.id === editingId ? { ...r, name: draft.name || r.name, description: draft.description || r.description, permissionIds: draft.permissionIds || r.permissionIds } : r));
    setEditingId(null);
    setDraft({});
  }

  function cancelEdit() { setEditingId(null); setShowAdd(false); setDraft({}); }

  function removeRole(id: string) { setRoles(cur => cur.filter(r => r.id !== id)); }

  function togglePermInDraft(permId: string) {
    setDraft(cur => {
      const ids = cur.permissionIds || [];
      return { ...cur, permissionIds: ids.includes(permId) ? ids.filter(p => p !== permId) : [...ids, permId] };
    });
  }

  function toggleModuleInDraft(mod: string) {
    const modPermIds = allPermissions.filter(p => p.module === mod).map(p => p.id);
    setDraft(cur => {
      const ids = cur.permissionIds || [];
      const allSelected = modPermIds.every(pid => ids.includes(pid));
      return { ...cur, permissionIds: allSelected ? ids.filter(pid => !modPermIds.includes(pid)) : [...new Set([...ids, ...modPermIds])] };
    });
  }

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input className={inp} placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="button" onClick={startAdd} className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#1d4ed8]">
          + Create Role
        </button>
      </div>

      {/* Add role form */}
      {showAdd && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700 mb-3">New Role</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
            <div><label className={miniLbl}>Role Name *</label><input className={inp} value={draft.name || ""} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Budget Analyst" /></div>
            <div><label className={miniLbl}>Description</label><input className={inp} value={draft.description || ""} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} placeholder="What can this role do?" /></div>
          </div>
          <label className={miniLbl}>Permissions — click module header to toggle all</label>
          <PermissionGrid permissionIds={draft.permissionIds || []} onTogglePerm={togglePermInDraft} onToggleModule={toggleModuleInDraft} />
          <div className="flex items-center gap-2 mt-4">
            <button type="button" onClick={saveNewRole} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-emerald-700">Save Role</button>
            <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Role cards */}
      {filtered.map(role => {
        const isExpanded = expandedId === role.id;
        const isEditing = editingId === role.id;
        const usersCount = usersWithRole(role.id).length;
        const permCount = role.permissionIds.length;
        const totalPerms = allPermissions.length;

        return (
          <div key={role.id} className={`rounded-2xl border overflow-hidden transition-colors ${isEditing ? "border-amber-200 bg-amber-50/20" : "border-slate-200 bg-white"} shadow-[0_6px_20px_rgba(15,23,42,0.03)]`}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-4 cursor-pointer" onClick={() => !isEditing && setExpandedId(isExpanded ? null : role.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isEditing ? (
                    <input className={inp} value={draft.name || ""} onClick={e => e.stopPropagation()} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
                  ) : (
                    <h4 className="text-sm font-bold text-slate-900">{role.name}</h4>
                  )}
                  {role.isSystem && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">System</span>}
                </div>
                {isEditing ? (
                  <input className={inp} value={draft.description || ""} onClick={e => e.stopPropagation()} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
                ) : (
                  <p className="text-xs text-slate-500 truncate">{role.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">{usersCount}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-indigo-600">{permCount}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">of {totalPerms}</div>
                </div>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={e => { e.stopPropagation(); saveEdit(); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700">Save</button>
                      <button type="button" onClick={e => { e.stopPropagation(); cancelEdit(); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={e => { e.stopPropagation(); startEdit(role); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition">Edit</button>
                      {!role.isSystem && (
                        <button type="button" onClick={e => { e.stopPropagation(); removeRole(role.id); }} className="rounded-lg border border-slate-200 bg-white w-7 h-7 flex items-center justify-center text-slate-300 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                      <svg className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded: permission grid or users list */}
            {(isExpanded || isEditing) && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40">
                {isEditing ? (
                  <>
                    <label className={miniLbl}>Permissions — click module header to toggle all</label>
                    <PermissionGrid permissionIds={draft.permissionIds || []} onTogglePerm={togglePermInDraft} onToggleModule={toggleModuleInDraft} />
                  </>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Permissions summary */}
                    <div>
                      <h5 className={miniLbl}>Permissions by Module</h5>
                      <div className="grid gap-1.5">
                        {rbacModules.map(mod => {
                          const modPerms = allPermissions.filter(p => p.module === mod);
                          const granted = modPerms.filter(p => role.permissionIds.includes(p.id));
                          if (granted.length === 0) return null;
                          return (
                            <div key={mod} className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-slate-700 min-w-[160px]">{mod}</span>
                              <div className="flex flex-wrap gap-1">
                                {granted.map(p => (
                                  <span key={p.id} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600">{p.action}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Users assigned */}
                    <div>
                      <h5 className={miniLbl}>Assigned Users ({usersCount})</h5>
                      {usersWithRole(role.id).length > 0 ? (
                        <div className="grid gap-1.5">
                          {usersWithRole(role.id).map(u => (
                            <div key={u.id} className="flex items-center gap-2 text-xs">
                              <span className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">{u.name[0]}</span>
                              <span className="font-medium text-slate-700">{u.name}</span>
                              <span className="text-slate-400">{u.email}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No users assigned to this role</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PERMISSIONS MATRIX TAB
   ═══════════════════════════════════════════════════════════════════ */
function PermissionsTab({ roles, setRoles }: { roles: Role[]; setRoles: React.Dispatch<React.SetStateAction<Role[]>> }) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || "");
  const role = roles.find(r => r.id === selectedRoleId);

  function togglePerm(permId: string) {
    setRoles(cur => cur.map(r => {
      if (r.id !== selectedRoleId) return r;
      const ids = r.permissionIds.includes(permId)
        ? r.permissionIds.filter(p => p !== permId)
        : [...r.permissionIds, permId];
      return { ...r, permissionIds: ids };
    }));
  }

  function toggleModule(mod: string) {
    const modPermIds = allPermissions.filter(p => p.module === mod).map(p => p.id);
    setRoles(cur => cur.map(r => {
      if (r.id !== selectedRoleId) return r;
      const allSelected = modPermIds.every(pid => r.permissionIds.includes(pid));
      const ids = allSelected
        ? r.permissionIds.filter(pid => !modPermIds.includes(pid))
        : [...new Set([...r.permissionIds, ...modPermIds])];
      return { ...r, permissionIds: ids };
    }));
  }

  return (
    <div className="grid gap-4">
      {/* Role selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Editing permissions for:</label>
        <select className={sel + " max-w-xs"} value={selectedRoleId} onChange={e => setSelectedRoleId(e.target.value)}>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.permissionIds.length} permissions)</option>)}
        </select>
      </div>

      {role && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{role.name}</h4>
              <p className="text-[10px] text-slate-400">{role.description}</p>
            </div>
            <span className="text-xs font-bold text-indigo-600">{role.permissionIds.length} / {allPermissions.length} permissions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-2.5 min-w-[200px] sticky left-0 bg-slate-50 z-10">Module</th>
                  {rbacActions.map(act => (
                    <th key={act} className="px-3 py-2.5 text-center w-20">{act}</th>
                  ))}
                  <th className="px-3 py-2.5 text-center w-16">All</th>
                </tr>
              </thead>
              <tbody>
                {rbacModules.map(mod => {
                  const modPerms = allPermissions.filter(p => p.module === mod);
                  const allChecked = modPerms.every(p => role.permissionIds.includes(p.id));
                  const someChecked = modPerms.some(p => role.permissionIds.includes(p.id));

                  return (
                    <tr key={mod} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 sticky left-0 bg-white z-10">{mod}</td>
                      {rbacActions.map(act => {
                        const perm = allPermissions.find(p => p.module === mod && p.action === act);
                        if (!perm) return <td key={act} className="px-3 py-3 text-center"><span className="text-slate-200">—</span></td>;
                        const checked = role.permissionIds.includes(perm.id);
                        return (
                          <td key={act} className="px-3 py-3 text-center">
                            <button type="button" onClick={() => togglePerm(perm.id)}
                              className={`w-6 h-6 rounded-lg border-2 transition flex items-center justify-center ${checked ? "border-indigo-500 bg-indigo-500" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
                              {checked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center">
                        <button type="button" onClick={() => toggleModule(mod)}
                          className={`w-6 h-6 rounded-lg border-2 transition flex items-center justify-center ${allChecked ? "border-indigo-500 bg-indigo-500" : someChecked ? "border-indigo-300 bg-indigo-100" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
                          {allChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          {someChecked && !allChecked && <span className="w-2.5 h-0.5 bg-indigo-500 rounded-full" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   REUSABLE: Permission Grid (compact checkboxes used in role editing)
   ═══════════════════════════════════════════════════════════════════ */
function PermissionGrid({ permissionIds, onTogglePerm, onToggleModule }: {
  permissionIds: string[];
  onTogglePerm: (id: string) => void;
  onToggleModule: (mod: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-50 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
            <th className="px-3 py-2 min-w-[160px]">Module</th>
            {rbacActions.map(act => <th key={act} className="px-2 py-2 text-center w-14">{act}</th>)}
            <th className="px-2 py-2 text-center w-10">All</th>
          </tr>
        </thead>
        <tbody>
          {rbacModules.map(mod => {
            const modPerms = allPermissions.filter(p => p.module === mod);
            const allChecked = modPerms.every(p => permissionIds.includes(p.id));

            return (
              <tr key={mod} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-1.5 font-medium text-slate-600 text-[11px]">{mod}</td>
                {rbacActions.map(act => {
                  const perm = allPermissions.find(p => p.module === mod && p.action === act);
                  if (!perm) return <td key={act} />;
                  const on = permissionIds.includes(perm.id);
                  return (
                    <td key={act} className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onTogglePerm(perm.id)}
                        className={`w-4.5 h-4.5 rounded border-2 transition inline-flex items-center justify-center ${on ? "border-indigo-500 bg-indigo-500" : "border-slate-200 bg-white hover:border-indigo-300"}`}
                        style={{ width: 18, height: 18 }}>
                        {on && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={() => onToggleModule(mod)}
                    className={`rounded border-2 transition inline-flex items-center justify-center ${allChecked ? "border-indigo-500 bg-indigo-500" : "border-slate-200 bg-white hover:border-indigo-300"}`}
                    style={{ width: 18, height: 18 }}>
                    {allChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WORKFLOW TAB — map roles to approval steps per process
   ═══════════════════════════════════════════════════════════════════ */
function WorkflowTab({ workflows, setWorkflows, roles }: {
  workflows: WorkflowProcess[];
  setWorkflows: React.Dispatch<React.SetStateAction<WorkflowProcess[]>>;
  roles: Role[];
}) {
  const [selectedId, setSelectedId] = useState<string>(workflows[0]?.id || "");
  const selected = workflows.find(w => w.id === selectedId) || workflows[0];

  const stepKindOptions: WorkflowStepKind[] = getAllStepKinds();

  function updateProcess(updater: (p: WorkflowProcess) => WorkflowProcess) {
    setWorkflows(cur => cur.map(p => (p.id === selected.id ? updater(p) : p)));
  }

  function updateStep(stepId: string, patch: Partial<WorkflowStep>) {
    updateProcess(p => ({
      ...p,
      steps: p.steps.map(s => (s.id === stepId ? { ...s, ...patch } : s)),
    }));
  }

  function moveStep(stepId: string, dir: -1 | 1) {
    updateProcess(p => {
      const idx = p.steps.findIndex(s => s.id === stepId);
      if (idx < 0) return p;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= p.steps.length) return p;
      const next = [...p.steps];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return { ...p, steps: next.map((s, i) => ({ ...s, order: i + 1 })) };
    });
  }

  function removeStep(stepId: string) {
    updateProcess(p => ({
      ...p,
      steps: p.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  }

  function addStep() {
    updateProcess(p => {
      const newStep: WorkflowStep = {
        id: `${p.id}-step-${Date.now()}`,
        order: p.steps.length + 1,
        kind: "Reviewer",
        label: "New Step",
        roleId: roles[0]?.id || "",
        slaHours: 24,
      };
      return { ...p, steps: [...p.steps, newStep] };
    });
  }

  function resetToSeed() {
    if (!confirm("Reset all workflows to default? This clears any customisations.")) return;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ifmis_rbac_workflows");
      window.localStorage.setItem(RBAC_WORKFLOWS_VERSION_KEY, RBAC_WORKFLOWS_VERSION);
    }
    setWorkflows(seedWorkflows);
  }

  /* Show agency-type-aware position titles in the workflow chain display */
  const { activeAgencyCode } = useAuth();
  const activeAgency = getAgencyByCode(activeAgencyCode ?? "16");
  const activeAgencyType = activeAgency?.type ?? "ministry";

  const roleNameById = (id: string) => {
    /* Prefer agency-specific position title, fall back to RBAC role name */
    const pos = getStaffPositionForAgency(id, activeAgencyType);
    if (pos) return pos.title;
    return roles.find(r => r.id === id)?.name || "—";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* ── Process list ── */}
      <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">Processes</h4>
          <p className="mt-0.5 text-[10px] text-slate-400">Each process has its own approval chain.</p>
        </div>
        <ul className="max-h-[640px] overflow-y-auto py-1">
          {workflows.map(w => {
            const isActive = w.id === selected?.id;
            return (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(w.id)}
                  className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition ${isActive ? "bg-indigo-50/60 border-l-2 border-indigo-500" : "border-l-2 border-transparent hover:bg-slate-50"}`}
                >
                  <span className={`text-xs font-bold ${isActive ? "text-indigo-700" : "text-slate-700"}`}>{w.name}</span>
                  <span className="text-[10px] text-slate-400">{w.steps.length} step{w.steps.length !== 1 ? "s" : ""} · {w.module}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3">
          <button
            type="button"
            onClick={resetToSeed}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            Reset to defaults
          </button>
        </div>
      </aside>

      {/* ── Selected process editor ── */}
      {selected && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/40 to-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">{selected.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{selected.description}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">Module: <span className="font-bold text-slate-600">{selected.module}</span></p>
              </div>
              <button
                type="button"
                onClick={addStep}
                className="shrink-0 rounded-xl bg-[#2563eb] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#1d4ed8]"
              >
                + Add Step
              </button>
            </div>
          </div>

          {/* Visual chain */}
          <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              {selected.steps.map((s, idx) => {
                const sty = stepKindStyles[s.kind];
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ${sty.bg} ${sty.ring}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sty.dot}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${sty.text}`}>{s.kind}</span>
                      <span className="text-[10px] text-slate-500">·</span>
                      <span className="text-[11px] font-semibold text-slate-700">{roleNameById(s.roleId)}</span>
                    </div>
                    {idx < selected.steps.length - 1 && (
                      <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                );
              })}
              {selected.steps.length === 0 && (
                <p className="text-xs text-slate-400 italic">No steps configured. Click "+ Add Step" to start the chain.</p>
              )}
            </div>
          </div>

          {/* Step editor table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-12 px-4 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5 w-32">Kind</th>
                  <th className="px-4 py-2.5">Step Label</th>
                  <th className="px-4 py-2.5 w-56">Role (dynamic)</th>
                  <th className="px-4 py-2.5 w-24">SLA (hrs)</th>
                  <th className="w-32 px-4 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selected.steps.map((s, idx) => {
                  const sty = stepKindStyles[s.kind];
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className={`w-full rounded-lg border px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] outline-none transition ${sty.ring} ${sty.bg} ${sty.text}`}
                          value={s.kind}
                          title={stepKindDescriptions[s.kind]}
                          onChange={(e) => updateStep(s.id, { kind: e.target.value as WorkflowStepKind })}
                        >
                          {stepKindOptions.map(k => <option key={k} value={k} title={stepKindDescriptions[k]}>{k}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className={inp}
                          value={s.label}
                          onChange={(e) => updateStep(s.id, { label: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className={sel}
                          value={s.roleId}
                          onChange={(e) => updateStep(s.id, { roleId: e.target.value })}
                        >
                          {roles.map(r => <option key={r.id} value={r.id}>{roleNameById(r.id)}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          className={inp}
                          value={s.slaHours ?? 0}
                          onChange={(e) => updateStep(s.id, { slaHours: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveStep(s.id, -1)}
                            disabled={idx === 0}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(s.id, 1)}
                            disabled={idx === selected.steps.length - 1}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(s.id)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-300 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            title="Remove step"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {selected.steps.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No steps yet — add one to begin building the chain.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer hint */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <p className="text-[10px] text-slate-500">
              <span className="font-bold text-slate-600">Tip:</span> Re-bind any step to a different role from the dropdown.
              The change is saved instantly and the rest of the system reads the workflow dynamically — no redeploy needed.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODULES TAB — create & manage dynamic modules with workflow steps
   ═══════════════════════════════════════════════════════════════════ */
function ModulesTab({ roles }: { roles: Role[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const allMods = useMemo(() => getAllModules(), []);
  const customMods = useMemo(() => getCustomModules(), []);
  const isCustom = (mod: ModuleActorInfo) => customMods.some(c => c.moduleKey === mod.moduleKey);

  const [draft, setDraft] = useState<Partial<ModuleActorInfo>>({});
  const [draftSteps, setDraftSteps] = useState<WorkflowActor[]>([]);
  const [draftViewerRoles, setDraftViewerRoles] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allMods.filter(m => {
      const matchesSearch = m.moduleName.toLowerCase().includes(q) || m.moduleKey.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === null || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allMods, search, categoryFilter]);

  const categoryColors: Record<string, string> = {
    contractor: "bg-amber-50 text-amber-700 ring-amber-200",
    expenditure: "bg-sky-50 text-sky-700 ring-sky-200",
    payroll: "bg-teal-50 text-teal-700 ring-teal-200",
    admin: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    public: "bg-slate-50 text-slate-700 ring-slate-200",
  };

  function startCreate() {
    setDraft({
      moduleKey: "",
      moduleName: "",
      category: "admin",
      srsRef: "",
      purpose: "",
      actors: [],
      viewerRoleIds: [],
    });
    setDraftSteps([]);
    setDraftViewerRoles([]);
    setShowCreate(true);
  }

  function generateModuleKey(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  function onModuleNameChange(name: string) {
    setDraft(p => ({
      ...p,
      moduleName: name,
      moduleKey: generateModuleKey(name),
    }));
  }

  function addStep() {
    setDraftSteps(s => [
      ...s,
      {
        roleId: roles[0]?.id || "",
        roleName: roles[0]?.name || "—",
        stepKind: "Initiator",
        description: "",
      },
    ]);
  }

  function updateStep(idx: number, patch: Partial<WorkflowActor>) {
    setDraftSteps(s => {
      const next = [...s];
      next[idx] = { ...next[idx], ...patch };
      if (patch.roleId) {
        const role = roles.find(r => r.id === patch.roleId);
        if (role) next[idx].roleName = role.name;
      }
      return next;
    });
  }

  function moveStep(idx: number, dir: -1 | 1) {
    setDraftSteps(s => {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= s.length) return s;
      const next = [...s];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  function removeStep(idx: number) {
    setDraftSteps(s => s.filter((_, i) => i !== idx));
  }

  function toggleViewerRole(roleId: string) {
    setDraftViewerRoles(r =>
      r.includes(roleId) ? r.filter(rid => rid !== roleId) : [...r, roleId]
    );
  }

  function saveModule() {
    if (!draft.moduleName?.trim() || !draft.moduleKey?.trim()) return;

    const newModule: ModuleActorInfo = {
      moduleKey: draft.moduleKey,
      moduleName: draft.moduleName,
      category: (draft.category as any) || "admin",
      srsRef: draft.srsRef,
      purpose: draft.purpose || "",
      actors: draftSteps,
      viewerRoleIds: draftViewerRoles,
    };

    const custom = getCustomModules();
    const updated = custom.some(c => c.moduleKey === newModule.moduleKey)
      ? custom.map(c => c.moduleKey === newModule.moduleKey ? newModule : c)
      : [...custom, newModule];
    writeCustomModules(updated);

    setShowCreate(false);
    setDraft({});
    setDraftSteps([]);
    setDraftViewerRoles([]);
  }

  function deleteModule(moduleKey: string) {
    if (!confirm("Delete this custom module? This cannot be undone.")) return;
    const custom = getCustomModules();
    writeCustomModules(custom.filter(c => c.moduleKey !== moduleKey));
  }

  function startEdit(mod: ModuleActorInfo) {
    setDraft({ ...mod });
    setDraftSteps([...mod.actors]);
    setDraftViewerRoles([...mod.viewerRoleIds]);
    setShowCreate(true);
    setExpandedId(null);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            className={inp}
            placeholder="Search modules by name or key..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className={sel}
          value={categoryFilter || ""}
          onChange={e => setCategoryFilter(e.target.value || null)}
          style={{ maxWidth: 160 }}
        >
          <option value="">All Categories</option>
          <option value="contractor">Contractor</option>
          <option value="expenditure">Expenditure</option>
          <option value="payroll">Payroll</option>
          <option value="admin">Admin</option>
          <option value="public">Public</option>
        </select>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#1d4ed8]"
        >
          + Create Module
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="border-b border-slate-100 bg-indigo-50/30 px-5 py-4">
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700 mb-4">
            {draft.moduleKey && allMods.some(m => m.moduleKey === draft.moduleKey) ? "Edit Module" : "New Module"}
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
            <div>
              <label className={miniLbl}>Module Name *</label>
              <input
                className={inp}
                value={draft.moduleName || ""}
                onChange={e => onModuleNameChange(e.target.value)}
                placeholder="e.g. Invoice Processing"
              />
            </div>
            <div>
              <label className={miniLbl}>Module Key (auto-generated)</label>
              <input
                className={inp}
                value={draft.moduleKey || ""}
                readOnly
                placeholder="invoice-processing"
                style={{ backgroundColor: "#f9fafb" }}
              />
            </div>
            <div>
              <label className={miniLbl}>Category</label>
              <select
                className={sel}
                value={draft.category || "admin"}
                onChange={e => setDraft(p => ({ ...p, category: e.target.value as any }))}
              >
                <option value="contractor">Contractor</option>
                <option value="expenditure">Expenditure</option>
                <option value="payroll">Payroll</option>
                <option value="admin">Admin</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className={miniLbl}>SRS Reference (optional)</label>
            <input
              className={inp}
              value={draft.srsRef || ""}
              onChange={e => setDraft(p => ({ ...p, srsRef: e.target.value }))}
              placeholder="e.g. PRN 3.1"
            />
          </div>

          <div className="mb-4">
            <label className={miniLbl}>Purpose *</label>
            <textarea
              className={inp}
              value={draft.purpose || ""}
              onChange={e => setDraft(p => ({ ...p, purpose: e.target.value }))}
              placeholder="Describe what this module does..."
              rows={3}
            />
          </div>

          {/* Workflow Steps */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className={miniLbl}>Workflow Steps</label>
              <button
                type="button"
                onClick={addStep}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {draftSteps.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No workflow steps yet — add one to define who does what.</p>
              ) : (
                draftSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end bg-white p-2 rounded border border-slate-200">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Role</label>
                      <select
                        className={sel}
                        value={step.roleId}
                        onChange={e => updateStep(idx, { roleId: e.target.value })}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Step Kind</label>
                      <select
                        className={sel}
                        value={step.stepKind}
                        onChange={e => updateStep(idx, { stepKind: e.target.value })}
                        style={{ fontSize: "0.75rem" }}
                      >
                        <option value="Initiator">Initiator</option>
                        <option value="Reviewer">Reviewer</option>
                        <option value="Approver">Approver</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Description</label>
                      <input
                        className={inp}
                        value={step.description}
                        onChange={e => updateStep(idx, { description: e.target.value })}
                        placeholder="What does this role do?"
                        style={{ fontSize: "0.75rem", padding: "0.5rem" }}
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-400 transition hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 1)}
                        disabled={idx === draftSteps.length - 1}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-400 transition hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-300 transition hover:text-red-500"
                        title="Remove step"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Viewer Roles */}
          <div className="mb-4">
            <label className={miniLbl}>Viewer Roles — who can view this module?</label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {roles.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleViewerRole(r.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ring-1 ${
                    draftViewerRoles.includes(r.id)
                      ? "bg-indigo-600 text-white ring-indigo-600"
                      : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Save/Cancel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveModule}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-emerald-700"
            >
              Save Module
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Module List */}
      <div className="divide-y divide-slate-100">
        {filtered.map(mod => {
          const isExpanded = expandedId === mod.moduleKey;
          const isCust = isCustom(mod);

          return (
            <div key={mod.moduleKey} className="px-5 py-4">
              {/* Header/summary */}
              <div
                className="flex items-start justify-between gap-4 cursor-pointer pb-3"
                onClick={() => setExpandedId(isExpanded ? null : mod.moduleKey)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!isCust && <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>}
                    <h4 className="text-sm font-bold text-slate-900">{mod.moduleName}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ring-1 ${categoryColors[mod.category]}`}>
                      {mod.category}
                    </span>
                    {!isCust && <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Built-in</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{mod.purpose}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-600">{mod.actors.length}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400">Steps</div>
                  </div>
                  {isCust && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          startEdit(mod);
                        }}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        title="Edit module"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          deleteModule(mod.moduleKey);
                        }}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-300 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        title="Delete module"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded detail view */}
              {isExpanded && (
                <div className="border-t border-slate-100 pt-3 mt-3">
                  {mod.srsRef && (
                    <p className="text-xs text-slate-600 mb-2">
                      <span className="font-bold text-slate-700">SRS Reference:</span> {mod.srsRef}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mb-3">
                    <span className="font-bold text-slate-700">Purpose:</span> {mod.purpose}
                  </p>

                  {/* Workflow Pipeline */}
                  {mod.actors.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-slate-700 mb-2">Workflow Steps:</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {mod.actors.map((actor, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="rounded-lg bg-indigo-50 px-3 py-2 border border-indigo-200">
                              <div className="text-[10px] font-bold text-indigo-700">{actor.stepKind}</div>
                              <div className="text-[9px] text-indigo-600">{actor.roleName}</div>
                              {actor.description && (
                                <div className="text-[8px] text-indigo-500 mt-0.5">{actor.description}</div>
                              )}
                            </div>
                            {idx < mod.actors.length - 1 && (
                              <div className="text-slate-400">→</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Viewer Roles */}
                  {mod.viewerRoleIds.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-slate-700 mb-2">Viewer Roles:</p>
                      <div className="flex flex-wrap gap-1">
                        {mod.viewerRoleIds.map(roleId => {
                          const role = roles.find(r => r.id === roleId);
                          return (
                            <span
                              key={roleId}
                              className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200"
                            >
                              {role?.name || roleId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!isCust && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-200">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">System module — read only</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-slate-400">No modules match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
