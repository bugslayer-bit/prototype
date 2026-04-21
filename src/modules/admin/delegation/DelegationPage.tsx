import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "../../../shared/context/AuthContext";
import { EMPLOYEES } from "../../payroll/state/payrollSeed";
import { QUICK_PERSONAS } from "../../../shared/data/quickPersonas";
import {
  getStoredDelegations,
  addDelegation,
  revokeDelegation,
  getDelegationsByAgency,
  DELEGATABLE_MODULES,
  DELEGATION_REASONS,
  type Delegation,
  type DelegationScope,
} from "./delegationData";

/* ── Status colors ─────────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  active:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  expired: { bg: "bg-slate-100",  text: "text-slate-500",   dot: "bg-slate-400" },
  revoked: { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.expired;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

/* ── Scope badge ───────────────────────────────────────────────────────── */
function ScopeBadge({ scope }: { scope: DelegationScope }) {
  return scope === "full-role" ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
      <span>👑</span> Full Role
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      <span>📦</span> Specific Modules
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Create Delegation Modal
   ══════════════════════════════════════════════════════════════════════════ */
interface CreateModalProps {
  agencyCode: string;
  agencyName: string;
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateDelegationModal({ agencyCode, agencyName, currentUserId, onClose, onCreated }: CreateModalProps) {
  const [delegatorId, setDelegatorId] = useState("");
  const [delegateeId, setDelegateeId] = useState("");
  const [scope, setScope] = useState<DelegationScope>("specific-modules");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  /* Get agency employees + persona officers for the current agency */
  const agencyStaff = useMemo(() => {
    /* Combine seed employees and quick personas for this agency */
    const fromEmployees = EMPLOYEES
      .filter((e) => e.agencyCode === agencyCode && e.status === "active")
      .map((e) => ({
        id: e.id,
        name: e.name,
        role: e.positionTitle,
        roleId: "",
        department: e.departmentName,
      }));

    const fromPersonas = QUICK_PERSONAS
      .filter((p) => p.agencyCode === agencyCode && p.roleId !== "role-admin")
      .map((p) => ({
        id: p.userId,
        name: p.name,
        role: p.role,
        roleId: p.roleId,
        department: p.department,
      }));

    /* Merge — personas first (they have roleIds), then employees not already represented */
    const personaIds = new Set(fromPersonas.map((p) => p.id));
    return [...fromPersonas, ...fromEmployees.filter((e) => !personaIds.has(e.id))];
  }, [agencyCode]);

  const delegator = agencyStaff.find((s) => s.id === delegatorId);
  const delegatee = agencyStaff.find((s) => s.id === delegateeId);

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const canSubmit =
    delegatorId &&
    delegateeId &&
    delegatorId !== delegateeId &&
    (reason || customReason) &&
    startDate &&
    endDate &&
    new Date(endDate) > new Date(startDate) &&
    (scope === "full-role" || selectedModules.length > 0);

  const handleSubmit = () => {
    if (!canSubmit || !delegator || !delegatee) return;
    addDelegation({
      delegatorId: delegator.id,
      delegatorName: delegator.name,
      delegatorRole: delegator.role,
      delegatorRoleId: delegator.roleId,
      delegatorDepartment: delegator.department,
      delegateeId: delegatee.id,
      delegateeName: delegatee.name,
      delegateeRole: delegatee.role,
      delegateeRoleId: delegatee.roleId,
      delegateeDepartment: delegatee.department,
      agencyCode,
      agencyName,
      scope,
      delegatedModules: scope === "full-role" ? [] : selectedModules,
      reason: reason === "Other" ? customReason : reason,
      startDate,
      endDate,
      createdBy: currentUserId,
      notes: notes || undefined,
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Create Delegation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Assign authority to another officer within {agencyName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Row 1: Delegator & Delegatee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Delegating From (Absentee)</label>
              <select
                value={delegatorId}
                onChange={(e) => { setDelegatorId(e.target.value); if (e.target.value === delegateeId) setDelegateeId(""); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="">Select officer...</option>
                {agencyStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                ))}
              </select>
              {delegator && (
                <p className="mt-1 text-[10px] text-slate-400">{delegator.department}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Delegating To (Acting Officer)</label>
              <select
                value={delegateeId}
                onChange={(e) => setDelegateeId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="">Select officer...</option>
                {agencyStaff.filter((s) => s.id !== delegatorId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                ))}
              </select>
              {delegatee && (
                <p className="mt-1 text-[10px] text-slate-400">{delegatee.department}</p>
              )}
            </div>
          </div>

          {/* Arrow indicator */}
          {delegator && delegatee && (
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                  {delegator.name.charAt(0)}
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-slate-700">{delegator.name}</p>
                  <p className="text-slate-500">{delegator.role}</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                  {delegatee.name.charAt(0)}
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-slate-700">{delegatee.name}</p>
                  <p className="text-slate-500">{delegatee.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Scope */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Delegation Scope</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScope("full-role")}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  scope === "full-role"
                    ? "border-purple-400 bg-purple-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold text-slate-700">👑 Full Role</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Delegate all permissions of the role</p>
              </button>
              <button
                type="button"
                onClick={() => setScope("specific-modules")}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                  scope === "specific-modules"
                    ? "border-blue-400 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold text-slate-700">📦 Specific Modules</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Pick only certain tasks to delegate</p>
              </button>
            </div>
          </div>

          {/* Row 3: Module picker (only for specific-modules) */}
          {scope === "specific-modules" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Select Modules to Delegate
                <span className="font-normal text-slate-400 ml-1">({selectedModules.length} selected)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DELEGATABLE_MODULES.map((mod) => {
                  const selected = selectedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                        selected
                          ? "border-blue-400 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="mr-1">{mod.icon}</span> {mod.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 4: Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason for Delegation</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="">Select reason...</option>
              {DELEGATION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {reason === "Other" && (
              <input
                type="text"
                placeholder="Specify reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            )}
          </div>

          {/* Row 5: Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Row 6: Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional instructions or context..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-slate-50 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all ${
              canSubmit
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            Create Delegation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Delegation Management Page
   ══════════════════════════════════════════════════════════════════════════ */
export const DelegationPage: React.FC = () => {
  const { user, activeAgencyCode, activeRoleId } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* Get agency name from personas or employees */
  const agencyName = useMemo(() => {
    const persona = QUICK_PERSONAS.find((p) => p.agencyCode === activeAgencyCode);
    if (persona) return persona.agencyName;
    const emp = EMPLOYEES.find((e) => e.agencyCode === activeAgencyCode);
    return emp?.agencyName ?? `Agency ${activeAgencyCode}`;
  }, [activeAgencyCode]);

  /* All delegations for this agency */
  const delegations = useMemo(() => {
    void refreshKey; // dependency trigger
    return getDelegationsByAgency(activeAgencyCode);
  }, [activeAgencyCode, refreshKey]);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return delegations;
    return delegations.filter((d) => d.status === filterStatus);
  }, [delegations, filterStatus]);

  /* Stats */
  const stats = useMemo(() => ({
    total: delegations.length,
    active: delegations.filter((d) => d.status === "active").length,
    pending: delegations.filter((d) => d.status === "pending").length,
    expired: delegations.filter((d) => d.status === "expired").length,
    revoked: delegations.filter((d) => d.status === "revoked").length,
  }), [delegations]);

  const handleRevoke = (id: string) => {
    revokeDelegation(id, user?.id ?? "system");
    setRevokeConfirm(null);
    refresh();
  };

  const moduleLabel = (modId: string) =>
    DELEGATABLE_MODULES.find((m) => m.id === modId)?.label ?? modId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg text-white shadow-md">
            🔄
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Delegation of Authority</h1>
            <p className="text-xs text-slate-500">Manage acting assignments for <span className="font-semibold text-indigo-600">{agencyName}</span></p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {([
          { label: "Total", value: stats.total, color: "from-slate-500 to-slate-600", bg: "bg-slate-50" },
          { label: "Active", value: stats.active, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50" },
          { label: "Pending", value: stats.pending, color: "from-amber-500 to-amber-600", bg: "bg-amber-50" },
          { label: "Expired", value: stats.expired, color: "from-slate-400 to-slate-500", bg: "bg-slate-50" },
          { label: "Revoked", value: stats.revoked, color: "from-red-500 to-red-600", bg: "bg-red-50" },
        ] as const).map(({ label, value, bg }) => (
          <div key={label} className={`rounded-xl ${bg} border border-slate-100 px-4 py-3`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter:</span>
          {["all", "active", "pending", "expired", "revoked"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                filterStatus === s
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Delegation
        </button>
      </div>

      {/* Delegation cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-semibold text-slate-500">No delegations found</p>
          <p className="text-xs text-slate-400 mt-1">Create a new delegation to assign acting authority</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Left: delegation flow */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Delegator */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">
                      {d.delegatorName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{d.delegatorName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{d.delegatorRole}</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    <span className="text-[8px] text-slate-400 font-medium mt-0.5">delegates to</span>
                  </div>

                  {/* Delegatee */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-bold text-emerald-700">
                      {d.delegateeName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{d.delegateeName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{d.delegateeRole}</p>
                    </div>
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <StatusBadge status={d.status} />
                  {(d.status === "active" || d.status === "pending") && (
                    <>
                      {revokeConfirm === d.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRevoke(d.id)}
                            className="rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setRevokeConfirm(null)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRevokeConfirm(d.id)}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Details row */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px]">
                <ScopeBadge scope={d.scope} />

                <span className="text-slate-400">|</span>

                <span className="text-slate-500">
                  📅 {d.startDate} — {d.endDate}
                </span>

                <span className="text-slate-400">|</span>

                <span className="text-slate-500">
                  💬 {d.reason}
                </span>

                {d.scope === "specific-modules" && d.delegatedModules.length > 0 && (
                  <>
                    <span className="text-slate-400">|</span>
                    <div className="flex flex-wrap gap-1">
                      {d.delegatedModules.map((modId) => (
                        <span key={modId} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                          {moduleLabel(modId)}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {d.notes && (
                <p className="mt-2 text-[10px] text-slate-400 italic">📝 {d.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateDelegationModal
          agencyCode={activeAgencyCode}
          agencyName={agencyName}
          currentUserId={user?.id ?? "system"}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh(); }}
        />
      )}
    </div>
  );
};

export default DelegationPage;
