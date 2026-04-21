/* ═══════════════════════════════════════════════════════════════════════════
   PersonaApprovalWorkflow — interactive multi-step approval panel.
   Each step is bound to a specific RBAC role (approval persona). The button
   to approve/reject a step is only enabled when the user's currently active
   role (from the top-bar role switcher) matches the step's required role.

   Switching the top navbar "Acting as" persona instantly re-renders this
   panel — the next step lights up, and the user can take action as that
   persona. End result: a single login can drive the full workflow as if
   four different officers were taking turns.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { useAuth } from "../../../../shared/context/AuthContext";
import { getStoredRoles } from "../../../admin/rbac/rbacData";

export type ApprovalStepStatus = "pending" | "approved" | "rejected" | "skipped";

export interface PersonaApprovalStep {
  /* Stable identifier (e.g. "initiation", "review", "approval", "release") */
  id: string;
  /* Visible label split across two lines */
  title: string;
  subtitle: string;
  /* RBAC role-id that owns this step */
  roleId: string;
  /* Human-friendly role label fallback */
  roleLabel: string;
  /* Filled in when the persona acts on the step */
  status: ApprovalStepStatus;
  approverName: string;
  approverRoleLabel: string;
  actedAt: string;
  remarks: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  steps: PersonaApprovalStep[];
  onChange: (steps: PersonaApprovalStep[]) => void;
}

const STATUS_COLOR: Record<ApprovalStepStatus, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-300 bg-rose-50 text-rose-800",
  skipped: "border-amber-200 bg-amber-50 text-amber-800",
};

const BADGE_COLOR: Record<ApprovalStepStatus, string> = {
  pending: "bg-slate-200 text-slate-600",
  approved: "bg-emerald-600 text-white",
  rejected: "bg-rose-600 text-white",
  skipped: "bg-amber-500 text-white",
};

export function PersonaApprovalWorkflow({ title, subtitle, steps, onChange }: Props) {
  const { activeRoleId, user, roleIds } = useAuth();
  const [pendingRemarks, setPendingRemarks] = useState<Record<string, string>>({});

  const allRoles = getStoredRoles();
  const activeRoleName =
    allRoles.find((r) => r.id === activeRoleId)?.name || "—";

  const userHasRole = (roleId: string) => roleIds.includes(roleId);

  /* Index of the first non-completed (pending) step — that's the one that's
     "live" right now and waiting for action. Steps before it must already be
     approved/rejected. */
  const liveIdx = steps.findIndex((s) => s.status === "pending");

  const act = (idx: number, status: "approved" | "rejected") => {
    const step = steps[idx];
    const next: PersonaApprovalStep = {
      ...step,
      status,
      approverName: user?.name || "Current User",
      approverRoleLabel: activeRoleName,
      actedAt: new Date().toISOString(),
      remarks: pendingRemarks[step.id] || step.remarks,
    };
    const updated = steps.map((s, i) => (i === idx ? next : s));
    onChange(updated);
    setPendingRemarks((p) => ({ ...p, [step.id]: "" }));
  };

  const reset = () => {
    onChange(
      steps.map((s) => ({
        ...s,
        status: "pending",
        approverName: "",
        approverRoleLabel: "",
        actedAt: "",
        remarks: "",
      })),
    );
    setPendingRemarks({});
  };

  const allApproved = steps.every((s) => s.status === "approved");
  const anyRejected = steps.some((s) => s.status === "rejected");

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {title || "Approval Workflow"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {subtitle ||
              "Each step is owned by a different RBAC persona. Switch your active role from the top navbar to act on the matching step."}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            {activeRoleName[0] || "?"}
          </span>
          <span className="text-[11px] font-bold text-indigo-700">
            Acting as: {activeRoleName}
          </span>
        </div>
      </header>

      {/* Status banner */}
      {anyRejected && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          ✗ A step was rejected — workflow halted. Reset to restart the chain.
        </div>
      )}
      {allApproved && (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
          ✓ All approvals complete — workflow finalised, ready to proceed to the next stage.
        </div>
      )}

      {/* Step grid */}
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => {
          const isLive = i === liveIdx && !anyRejected;
          const blocked = i > liveIdx && liveIdx !== -1; /* upstream not done yet */
          const canActUser = userHasRole(s.roleId);
          const canActNow = isLive && activeRoleId === s.roleId && !anyRejected;
          return (
            <li
              key={s.id}
              className={`relative rounded-2xl border p-3 transition ${STATUS_COLOR[s.status]} ${
                isLive ? "ring-2 ring-indigo-300 ring-offset-1" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Step {i + 1}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{s.title}</p>
                  <p className="text-[11px] text-slate-500">{s.subtitle}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${BADGE_COLOR[s.status]}`}
                >
                  {s.status}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                <span className="rounded-full bg-white px-2 py-0.5 font-bold text-indigo-700">
                  {s.roleLabel}
                </span>
                {!canActUser && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-500">
                    Not your role
                  </span>
                )}
              </div>

              {/* Approver footer */}
              {s.status !== "pending" && (
                <div className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-[10px]">
                  <p className="font-bold text-slate-700">{s.approverName}</p>
                  <p className="text-slate-500">
                    as <em>{s.approverRoleLabel}</em>
                    {s.actedAt && (
                      <> · {s.actedAt.slice(0, 16).replace("T", " ")}</>
                    )}
                  </p>
                  {s.remarks && (
                    <p className="mt-1 italic text-slate-600">"{s.remarks}"</p>
                  )}
                </div>
              )}

              {/* Action panel — only on the live step for the active role */}
              {canActNow && (
                <div className="mt-3 space-y-2 rounded-lg bg-white p-2 ring-1 ring-indigo-100">
                  <textarea
                    value={pendingRemarks[s.id] || ""}
                    onChange={(e) =>
                      setPendingRemarks((p) => ({ ...p, [s.id]: e.target.value }))
                    }
                    placeholder="Remarks (optional)"
                    rows={2}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => act(i, "approved")}
                      className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => act(i, "rejected")}
                      className="flex-1 rounded-lg bg-rose-600 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Hint for live step but wrong active role */}
              {isLive && activeRoleId !== s.roleId && !anyRejected && s.status === "pending" && (
                <p className="mt-2 rounded-md border border-dashed border-indigo-200 bg-indigo-50/60 px-2 py-1 text-[10px] font-semibold text-indigo-700">
                  ⏳ Waiting for <strong>{s.roleLabel}</strong> — switch your top-bar role to act.
                </p>
              )}

              {blocked && (
                <p className="mt-2 text-[10px] text-slate-400">
                  Locked until previous step is approved.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          ↺ Reset Workflow
        </button>
      </div>
    </section>
  );
}

/* Helper: build the default 4-step Advances approval chain. */
export function buildAdvanceApprovalChain(): PersonaApprovalStep[] {
  return [
    {
      id: "initiation",
      title: "Initiation",
      subtitle: "from eCMS",
      roleId: "role-agency-staff",
      roleLabel: "Initiator (eCMS)",
      status: "pending",
      approverName: "",
      approverRoleLabel: "",
      actedAt: "",
      remarks: "",
    },
    {
      id: "review",
      title: "Review",
      subtitle: "Agency Finance",
      roleId: "role-finance-officer",
      roleLabel: "Agency Finance",
      status: "pending",
      approverName: "",
      approverRoleLabel: "",
      actedAt: "",
      remarks: "",
    },
    {
      id: "approval",
      title: "Approval",
      subtitle: "Head of Agency",
      roleId: "role-head-of-agency",
      roleLabel: "Head of Agency",
      status: "pending",
      approverName: "",
      approverRoleLabel: "",
      actedAt: "",
      remarks: "",
    },
    {
      id: "release",
      title: "Payment",
      subtitle: "Payment Release",
      roleId: "role-finance-officer",
      roleLabel: "Payment Release Officer",
      status: "pending",
      approverName: "",
      approverRoleLabel: "",
      actedAt: "",
      remarks: "",
    },
  ];
}
