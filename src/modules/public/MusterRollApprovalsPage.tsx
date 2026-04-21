/* ═══════════════════════════════════════════════════════════════════════════
   MusterRollApprovalsPage
   ───────────────────────────────────────────────────────────────────
   Dual-purpose approval queue:

   • Contractor persona (role-public + EXT) — sees ONLY the muster-roll
     beneficiaries who registered against one of their verified contracts.
     Can approve (forward to MoF Program Officer) or reject.

   • MoF Program Officer / Admin — sees every beneficiary that has already
     been approved by a contractor, and can clear them onto the muster roll.

   Data is pulled live from MusterRollBeneficiaryContext, so any change the
   Public Registration page pushes is reflected here instantly (cross-tab
   via storage event, same-tab via ifmis-musterroll-changed).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { useAuth } from "../../shared/context/AuthContext";
import { useContractorData } from "../../shared/context/ContractorDataContext";
import {
  useMusterRollBeneficiaries,
  type MusterRollBeneficiary,
  type MusterRollStage,
} from "../../shared/context/MusterRollBeneficiaryContext";

const STAGE_LABEL: Record<MusterRollStage, string> = {
  "submitted-to-contractor": "Pending Contractor",
  "approved-by-contractor": "Pending MoF",
  "cleared-by-mof": "Cleared",
  "rejected": "Rejected",
};

const STAGE_TONE: Record<MusterRollStage, string> = {
  "submitted-to-contractor": "bg-amber-100 text-amber-800",
  "approved-by-contractor": "bg-sky-100 text-sky-800",
  "cleared-by-mof": "bg-emerald-100 text-emerald-800",
  "rejected": "bg-rose-100 text-rose-700",
};

export default function MusterRollApprovalsPage() {
  const { user, activeRoleId } = useAuth();
  const { contractors } = useContractorData();
  const {
    beneficiaries,
    approveByContractor,
    clearByMoF,
    reject,
  } = useMusterRollBeneficiaries();

  const isContractor = activeRoleId === "role-public";
  /* MoF Program Officer / System Admin / Finance personas all share the
     same post-contractor view. */
  const isMoFish =
    activeRoleId === "role-admin" ||
    activeRoleId === "role-finance-officer" ||
    activeRoleId === "role-program-officer" ||
    activeRoleId === "role-head-of-agency";

  /* Link the current public user to their Contractor record by email so we
     can scope approvals to the contracts they actually hold. */
  const myContractor = useMemo(() => {
    if (!user?.email) return null;
    return contractors.find(
      (c) => c.email?.toLowerCase() === user.email.toLowerCase(),
    ) ?? null;
  }, [contractors, user]);

  const filterFn = (b: MusterRollBeneficiary) => {
    if (isContractor) {
      /* Contractor sees beneficiaries tagged to their contractor id OR
         tagged to their display name (fallback when id is missing). */
      if (!myContractor) return false;
      return (
        b.contractorId === myContractor.id ||
        (b.contractorName &&
          b.contractorName.toLowerCase() === myContractor.displayName.toLowerCase())
      );
    }
    /* MoF / admin view — show everything. */
    return true;
  };

  const visible = useMemo(
    () => beneficiaries.filter(filterFn).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beneficiaries, myContractor, isContractor],
  );

  /* Tabs: Pending / Approved / Cleared / Rejected */
  const [tab, setTab] = useState<"pending" | "approved" | "cleared" | "rejected">(
    isContractor ? "pending" : "approved",
  );

  const grouped = useMemo(() => {
    const pending = visible.filter((b) => b.stage === "submitted-to-contractor");
    const approved = visible.filter((b) => b.stage === "approved-by-contractor");
    const cleared = visible.filter((b) => b.stage === "cleared-by-mof");
    const rejected = visible.filter((b) => b.stage === "rejected");
    return { pending, approved, cleared, rejected };
  }, [visible]);

  const list = grouped[tab];

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const who = user?.name || "System User";

  const canActOnPending = isContractor;
  const canActOnApproved = isMoFish;

  if (!isContractor && !isMoFish) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        This page is available to contractors and MoF Program Officers only.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6">
        <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
          {isContractor ? "Contractor Portal" : "MoF Program Officer"}
          <span className="h-1 w-1 rounded-full bg-emerald-300" />
          Payroll SRS · PRN 6.1
          <span className="h-1 w-1 rounded-full bg-emerald-300" />
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
            Muster Roll Approvals
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Muster Roll Beneficiary Approvals
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
          {isContractor
            ? "Review the muster-roll beneficiaries who have registered against your verified contracts. Approving will auto-forward the record to the MoF Program Officer."
            : "Clear beneficiaries that contractors have already verified. Cleared records appear on the agency's payroll roster automatically."}
          {myContractor && (
            <span className="ml-1">
              Showing records linked to{" "}
              <span className="font-semibold">{myContractor.displayName}</span>.
            </span>
          )}
        </p>
      </section>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending Contractor" value={grouped.pending.length} tone="amber" />
        <Kpi label="Pending MoF" value={grouped.approved.length} tone="sky" />
        <Kpi label="Cleared" value={grouped.cleared.length} tone="emerald" />
        <Kpi label="Rejected" value={grouped.rejected.length} tone="rose" />
      </section>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        {([
          ["pending", "Pending Contractor", grouped.pending.length],
          ["approved", "Pending MoF", grouped.approved.length],
          ["cleared", "Cleared", grouped.cleared.length],
          ["rejected", "Rejected", grouped.rejected.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              tab === key
                ? "border-sky-400 bg-sky-100 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </section>

      {/* ── Table ────────────────────────────────────────────────────── */}
      {list.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            When beneficiaries register through the public portal they will
            appear here automatically — no refresh required.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Registration</th>
                  <th className="px-4 py-3 text-left">Beneficiary</th>
                  <th className="px-4 py-3 text-left">Project / Contract</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Bank</th>
                  <th className="px-4 py-3 text-center">Stage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-slate-900">{b.id}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(b.submittedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-900">
                        {b.firstName} {b.middleName ? b.middleName + " " : ""}{b.lastName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">CID: {b.cid}</div>
                      <div className="text-[10px] text-slate-500">{b.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">{b.projectName || "—"}</div>
                      <div className="text-[10px] text-slate-500">{b.agency}</div>
                      {b.contractorName && (
                        <div className="text-[10px] text-slate-500">Contractor: {b.contractorName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div>{b.dzongkhag || "—"}</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {b.dzongkhagCode}
                        {b.dungkhagCode ? `·${b.dungkhagCode}` : ""}
                        {b.gewogCode ? `·${b.gewogCode}` : ""}
                      </div>
                      {b.gewog && <div className="text-[10px] text-slate-500">Gewog: {b.gewog}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-semibold text-slate-900">{b.bankName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{b.bankAccountNo}</div>
                      {b.cbsVerified && (
                        <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          CBS Verified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STAGE_TONE[b.stage]}`}>
                        {STAGE_LABEL[b.stage]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {b.stage === "submitted-to-contractor" && canActOnPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => approveByContractor(b.id, who, "Approved by contractor — forwarded to MoF")}
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            >
                              Approve → MoF
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectingId(b.id); setRejectReason(""); }}
                              className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {b.stage === "approved-by-contractor" && canActOnApproved && (
                          <>
                            <button
                              type="button"
                              onClick={() => clearByMoF(b.id, who, "Cleared by MoF Program Officer")}
                              className="rounded-md bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-700"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectingId(b.id); setRejectReason(""); }}
                              className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(b.stage === "cleared-by-mof" || b.stage === "rejected") && (
                          <span className="text-[10px] text-slate-400">
                            {b.stage === "cleared-by-mof"
                              ? `Cleared by ${b.mofClearedBy}`
                              : `Rejected by ${b.rejectedBy}`}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Reject modal ─────────────────────────────────────────────── */}
      {rejectingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setRejectingId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">Reject beneficiary</h3>
            <p className="mt-1 text-xs text-slate-500">
              Provide a reason. The beneficiary and the other side of the workflow will see this note.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="e.g., CID does not match payroll records"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={() => {
                  reject(rejectingId!, who, rejectReason.trim());
                  setRejectingId(null);
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky" | "emerald" | "rose";
}) {
  const border =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "sky"
        ? "border-sky-200 bg-sky-50"
        : tone === "emerald"
          ? "border-emerald-200 bg-emerald-50"
          : "border-rose-200 bg-rose-50";
  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
