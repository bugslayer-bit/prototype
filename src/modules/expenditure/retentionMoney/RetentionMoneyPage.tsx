/* ═══════════════════════════════════════════════════════════════════════════
   Retention Money Management — SRS PRN 9.1 – 9.3
   ═════════════════════════════════════════════════
   Full dynamic flow:
     1. Queue/list of retention records filtered by agency
     2. Click a record → 5-step workspace:
        Step 1: Select Contract (from retention list)
        Step 2: Review Retention Details
        Step 3: Choose Action (Make Payment / Forfeit / Early Encashment)
        Step 4: Action-specific form
        Step 5: Submit & Send to Cash Management

   SRS actors: User, System, Agency staff, Approver, P-Level officers
   ═══════════════════════════════════════════════════════════════════════════ */
import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "../../../shared/context/AuthContext";
import { resolveAgencyContext } from "../../../shared/data/agencyPersonas";
import type {
  RetentionRecord,
  RetentionActionForm,
  RetentionStep,
  RetentionTab,
  RetentionAction,
  RetentionStatus,
} from "./types";
import {
  RETENTION_SEED,
  INITIAL_ACTION_FORM,
  RETENTION_STORAGE_KEY,
  loadRetentionRecords,
} from "./state/retentionSeed";

/* ── Style tokens ───────────────────────────────────────────────────────── */
const panel = "rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm";
const hdr = "text-xs font-bold uppercase tracking-widest text-slate-400";
const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const locked = "w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600";
const lbl = "block text-xs font-semibold text-slate-500 mb-1";
const btn = "rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition";
const btnPrimary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
const btnSecondary = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;
const btnSuccess = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;
const badge = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

/* ── Status helpers ─────────────────────────────────────────────────────── */
function statusColor(s: RetentionStatus): string {
  switch (s) {
    case "held": return "bg-amber-100 text-amber-700";
    case "partial-release": return "bg-blue-100 text-blue-700";
    case "released": return "bg-emerald-100 text-emerald-700";
    case "forfeited": return "bg-red-100 text-red-700";
    case "encashed": return "bg-violet-100 text-violet-700";
    case "pending-action": return "bg-orange-100 text-orange-700";
    default: return "bg-slate-100 text-slate-600";
  }
}
function statusLabel(s: RetentionStatus): string {
  switch (s) {
    case "held": return "Held in Non-CF";
    case "partial-release": return "Partial Release";
    case "released": return "Released";
    case "forfeited": return "Forfeited to CF";
    case "encashed": return "Early Encashed";
    case "pending-action": return "Pending Action";
    default: return s;
  }
}
function actionLabel(a: RetentionAction): string {
  switch (a) {
    case "make-payment": return "Make Payment";
    case "forfeit": return "Forfeit";
    case "early-encashment": return "Early Encashment";
  }
}
function actionIcon(a: RetentionAction): string {
  switch (a) {
    case "make-payment": return "💳";
    case "forfeit": return "🚫";
    case "early-encashment": return "🏦";
  }
}
function formatNu(n: number, cur = "Nu"): string {
  if (cur === "USD") return `USD ${n.toLocaleString("en-US")}`;
  if (cur === "INR") return `INR ${n.toLocaleString("en-IN")}`;
  return `Nu ${n.toLocaleString("en-US")}`;
}

/* ── Step config ────────────────────────────────────────────────────────── */
const STEPS: { key: RetentionStep; label: string; icon: string }[] = [
  { key: "select-contract", label: "Select Contract", icon: "1" },
  { key: "review-details", label: "Review Details", icon: "2" },
  { key: "choose-action", label: "Choose Action", icon: "3" },
  { key: "action-form", label: "Process Action", icon: "4" },
  { key: "submit", label: "Submit", icon: "5" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════════ */
export function RetentionMoneyPage() {
  const { activeRoleId, activeAgencyCode } = useAuth();
  const ctx = useMemo(() => resolveAgencyContext(activeRoleId), [activeRoleId, activeAgencyCode]);
  const agencyName = ctx?.agency.name ?? "All Agencies";

  /* ── State ────────────────────────────────────────────────────────────── */
  const [records, setRecords] = useState<RetentionRecord[]>(loadRetentionRecords);
  const [view, setView] = useState<"list" | "workspace">("list");
  const [selected, setSelected] = useState<RetentionRecord | null>(null);
  const [step, setStep] = useState<RetentionStep>("select-contract");
  const [actionForm, setActionForm] = useState<RetentionActionForm>(INITIAL_ACTION_FORM);
  const [activeTab, setActiveTab] = useState<RetentionTab>("active");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState(false);

  /* Persist */
  useEffect(() => {
    try { window.localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(records)); } catch { /* */ }
  }, [records]);

  /* ── Agency filter ────────────────────────────────────────────────────── */
  const isAdmin = activeRoleId === "role-admin" || activeRoleId === "role-auditor";
  const agencyRecords = useMemo(() => {
    if (isAdmin) return records;
    return records.filter((r) => r.agencyCode === activeAgencyCode);
  }, [records, activeAgencyCode, isAdmin]);

  /* ── Tab filter ───────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = agencyRecords;
    if (activeTab === "active") list = list.filter((r) => ["held", "partial-release", "pending-action"].includes(r.status));
    else if (activeTab === "released") list = list.filter((r) => ["released", "encashed"].includes(r.status));
    else if (activeTab === "forfeited") list = list.filter((r) => r.status === "forfeited");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.contractorName.toLowerCase().includes(q) ||
        r.contractTitle.toLowerCase().includes(q) ||
        r.contractId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [agencyRecords, activeTab, search]);

  /* ── Tab counts ───────────────────────────────────────────────────────── */
  const counts = useMemo(() => ({
    active: agencyRecords.filter((r) => ["held", "partial-release", "pending-action"].includes(r.status)).length,
    released: agencyRecords.filter((r) => ["released", "encashed"].includes(r.status)).length,
    forfeited: agencyRecords.filter((r) => r.status === "forfeited").length,
    all: agencyRecords.length,
  }), [agencyRecords]);

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const openRecord = useCallback((r: RetentionRecord) => {
    setSelected(r);
    setStep("review-details");
    setActionForm(INITIAL_ACTION_FORM);
    setView("workspace");
    setSuccess(false);
  }, []);

  const goBack = useCallback(() => {
    setSelected(null);
    setView("list");
    setStep("select-contract");
    setActionForm(INITIAL_ACTION_FORM);
    setSuccess(false);
  }, []);

  const updateForm = useCallback(<K extends keyof RetentionActionForm>(k: K, v: RetentionActionForm[K]) => {
    setActionForm((p) => ({ ...p, [k]: v }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selected || !actionForm.action) return;
    const now = new Date().toISOString().slice(0, 10);
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== selected.id) return r;
        const updated = { ...r, lastAction: actionForm.action as RetentionAction, lastActionDate: now, remarks: actionForm.remarks || r.remarks };
        if (actionForm.action === "make-payment") {
          const paid = actionForm.paymentType === "full"
            ? r.balanceRetention
            : actionForm.deductionAmount > 0
              ? r.balanceRetention - actionForm.deductionAmount
              : r.balanceRetention;
          updated.releasedAmount = r.releasedAmount + paid;
          updated.balanceRetention = r.balanceRetention - paid;
          updated.status = updated.balanceRetention <= 0 ? "released" : "partial-release";
        } else if (actionForm.action === "forfeit") {
          updated.forfeitedAmount = r.forfeitedAmount + r.balanceRetention;
          updated.balanceRetention = 0;
          updated.status = "forfeited";
        } else if (actionForm.action === "early-encashment") {
          updated.releasedAmount = r.releasedAmount + r.balanceRetention;
          updated.balanceRetention = 0;
          updated.status = "encashed";
          updated.bankGuaranteeRef = `BG-${now.replace(/-/g, "")}`;
          updated.bankGuaranteeAmount = actionForm.bankGuaranteeAmount;
        }
        return updated;
      })
    );
    setSuccess(true);
    setStep("submit");
  }, [selected, actionForm]);

  /* ── Role access ──────────────────────────────────────────────────────── */
  const canProcess = ["role-admin", "role-finance-officer", "role-head-of-agency", "role-agency-staff"].includes(activeRoleId ?? "");
  const isAuditor = activeRoleId === "role-auditor";

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="grid min-w-0 gap-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className={`${panel} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {view === "workspace" && (
                <button onClick={goBack} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <h1 className="text-lg font-bold text-slate-800">Retention Money Management</h1>
              <span className={`${badge} bg-indigo-100 text-indigo-700`}>PRN 9.1 – 9.3</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {agencyName} &middot; {isAuditor ? "Read-only audit view" : canProcess ? "Process retention actions" : "View only"}
            </p>
          </div>
          {view === "list" && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Held: {formatNu(agencyRecords.filter(r => r.status === "held").reduce((s, r) => s + r.balanceRetention, 0))}</span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" /> Pending: {counts.active}</span>
            </div>
          )}
        </div>

        {/* Role context banner */}
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">SRS Actors:</span>
          <span className={badge + " bg-blue-50 text-blue-600"}>User / Agency Staff</span>
          <span className={badge + " bg-emerald-50 text-emerald-600"}>System (eCMS / eGP)</span>
          <span className={badge + " bg-violet-50 text-violet-600"}>Approver / P-Level</span>
          <span className="ml-auto text-[10px] text-slate-400">Retention 10% per PRR for all Works contracts</span>
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className={`${panel} overflow-hidden`}>
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-slate-100 px-4">
            {(["active", "released", "forfeited", "all"] as RetentionTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`relative px-4 py-3 text-xs font-semibold capitalize transition ${activeTab === t ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                {t} ({counts[t]})
                {activeTab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-500" />}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 py-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contractor, contract..."
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 w-56"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Contract</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Contractor</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Contract Value</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Retention Held</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Balance</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">DLP</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No retention records found</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/40 transition cursor-pointer" onClick={() => openRecord(r)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700">{r.contractTitle}</div>
                      <div className="text-[10px] text-slate-400">{r.contractId} &middot; {r.agencyName}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.contractorName}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{formatNu(r.contractValue, r.currency)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{formatNu(r.totalRetention, r.currency)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatNu(r.balanceRetention, r.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`${badge} ${r.dlpStatus === "active" ? "bg-green-100 text-green-700" : r.dlpStatus === "expired" ? "bg-slate-100 text-slate-600" : "bg-yellow-100 text-yellow-700"}`}>
                        {r.dlpStatus === "active" ? "Active" : r.dlpStatus === "expired" ? "Expired" : "Waived"}
                      </span>
                      <div className="mt-0.5 text-[10px] text-slate-400">{r.dlpExpiryDate}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`${badge} ${statusColor(r.status)}`}>{statusLabel(r.status)}</span></td>
                    <td className="px-4 py-3">
                      {(r.status === "held" || r.status === "partial-release" || r.status === "pending-action") && canProcess ? (
                        <button className={`${btn} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[11px]`} onClick={(e) => { e.stopPropagation(); openRecord(r); }}>
                          Process
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">{r.lastAction ? actionLabel(r.lastAction) : "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[11px] text-slate-500">
            <span>Showing {filtered.length} of {agencyRecords.length} retention records</span>
            <div className="flex items-center gap-4">
              <span>Total Retained: <strong className="text-slate-700">{formatNu(agencyRecords.reduce((s, r) => s + r.totalRetention, 0))}</strong></span>
              <span>Total Balance: <strong className="text-amber-600">{formatNu(agencyRecords.reduce((s, r) => s + r.balanceRetention, 0))}</strong></span>
              <span>Released: <strong className="text-emerald-600">{formatNu(agencyRecords.reduce((s, r) => s + r.releasedAmount, 0))}</strong></span>
              <span>Forfeited: <strong className="text-red-600">{formatNu(agencyRecords.reduce((s, r) => s + r.forfeitedAmount, 0))}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ── WORKSPACE VIEW ────────────────────────────────────────────── */}
      {view === "workspace" && selected && (
        <div className="grid gap-5">
          {/* Step indicator */}
          <div className={`${panel} px-5 py-4`}>
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => {
                const stepIdx = STEPS.findIndex((x) => x.key === step);
                const done = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={s.key} className="flex flex-1 items-center">
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${active ? "bg-indigo-600 text-white shadow" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : done ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>{done ? "✓" : s.icon}</span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`mx-2 h-px flex-1 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Step 2: Review Details ──────────────────────────────── */}
          {step === "review-details" && (
            <div className={`${panel} p-5`}>
              <h2 className="text-sm font-bold text-slate-700 mb-4">Retention Record Details</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Contract ID" value={selected.contractId} />
                <Field label="Contract Title" value={selected.contractTitle} />
                <Field label="Contractor" value={selected.contractorName} />
                <Field label="Agency" value={selected.agencyName} />
                <Field label="Work ID" value={selected.workId} />
                <Field label="Category" value={selected.contractCategory} />
                <Field label="Contract Value" value={formatNu(selected.contractValue, selected.currency)} />
                <Field label="Retention %" value={`${selected.retentionPct}%`} />
                <Field label="Total Retention" value={formatNu(selected.totalRetention, selected.currency)} highlight="amber" />
                <Field label="Released Amount" value={formatNu(selected.releasedAmount, selected.currency)} highlight="green" />
                <Field label="Forfeited Amount" value={formatNu(selected.forfeitedAmount, selected.currency)} highlight="red" />
                <Field label="Balance Retention" value={formatNu(selected.balanceRetention, selected.currency)} highlight="indigo" />
                <Field label="Contract Period" value={`${selected.contractStartDate} → ${selected.contractEndDate}`} />
                <Field label="DLP Expiry" value={selected.dlpExpiryDate} />
                <Field label="DLP Status" value={selected.dlpStatus.toUpperCase()} />
                <Field label="Release Date" value={selected.releaseDate} />
                <Field label="Non-CF Account" value={selected.nonCfAccountRef} />
                <Field label="Bills Processed" value={String(selected.billCount)} />
                {selected.bankGuaranteeRef && <Field label="Bank Guarantee" value={`${selected.bankGuaranteeRef} (${formatNu(selected.bankGuaranteeAmount ?? 0, selected.currency)})`} />}
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                <strong className="text-slate-600">Remarks:</strong> {selected.remarks}
              </div>

              {/* SRS business rule notes */}
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <strong>SRS PRN 9.1:</strong> For every contractual payment of WORKS, system retains {selected.retentionPct}% (defined in PRR) of total bill amount.
                Retention is held in Non-CF account ({selected.nonCfAccountRef}).
              </div>

              <div className="mt-5 flex gap-3">
                <button className={btnSecondary} onClick={goBack}>Cancel</button>
                {canProcess && selected.balanceRetention > 0 && (
                  <button className={btnPrimary} onClick={() => setStep("choose-action")}>
                    Proceed to Action &rarr;
                  </button>
                )}
                {isAuditor && (
                  <span className="flex items-center text-xs text-slate-400 italic">Audit mode — read only</span>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Choose Action ──────────────────────────────── */}
          {step === "choose-action" && (
            <div className={`${panel} p-5`}>
              <h2 className="text-sm font-bold text-slate-700 mb-2">Choose Retention Action</h2>
              <p className="text-xs text-slate-500 mb-5">
                Contract: <strong>{selected.contractTitle}</strong> &middot; Balance: <strong className="text-indigo-600">{formatNu(selected.balanceRetention, selected.currency)}</strong>
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Make Payment */}
                <ActionCard
                  icon="💳"
                  title="Make Payment"
                  description="Release retention to contractor after DLP completion or satisfactory work. System auto-generates payment order sent to Cash Management."
                  srsRef="SRS PRN 9.2 — Step 4"
                  selected={actionForm.action === "make-payment"}
                  onClick={() => updateForm("action", "make-payment")}
                  color="emerald"
                />
                {/* Forfeit */}
                <ActionCard
                  icon="🚫"
                  title="Forfeit"
                  description="Transfer retention from Non-CF to CF account. Used when contractor fails to adhere to contract terms/SBD during DLP."
                  srsRef="SRS PRN 9.3 — Step 3"
                  selected={actionForm.action === "forfeit"}
                  onClick={() => updateForm("action", "forfeit")}
                  color="red"
                />
                {/* Early Encashment */}
                <ActionCard
                  icon="🏦"
                  title="Early Encashment"
                  description="Release retention against Bank Guarantee from CMS. Verify BG details, amount, then release to contractor and update balance."
                  srsRef="SRS PRN 9.2 — Step 5"
                  selected={actionForm.action === "early-encashment"}
                  onClick={() => updateForm("action", "early-encashment")}
                  color="violet"
                />
              </div>

              <div className="mt-5 flex gap-3">
                <button className={btnSecondary} onClick={() => setStep("review-details")}>&larr; Back</button>
                {actionForm.action && (
                  <button className={btnPrimary} onClick={() => setStep("action-form")}>
                    Continue to {actionLabel(actionForm.action as RetentionAction)} &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Action Form ────────────────────────────────── */}
          {step === "action-form" && (
            <div className={`${panel} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{actionForm.action ? actionIcon(actionForm.action as RetentionAction) : ""}</span>
                <h2 className="text-sm font-bold text-slate-700">{actionForm.action ? actionLabel(actionForm.action as RetentionAction) : ""} — Process Form</h2>
              </div>

              {/* Make Payment form */}
              {actionForm.action === "make-payment" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Contract Status</label>
                    <select className={inp} value={actionForm.contractStatus} onChange={(e) => updateForm("contractStatus", e.target.value as RetentionActionForm["contractStatus"])}>
                      <option value="">— Select —</option>
                      <option value="completed">Completed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Payment Type</label>
                    <select className={inp} value={actionForm.paymentType} onChange={(e) => updateForm("paymentType", e.target.value as RetentionActionForm["paymentType"])}>
                      <option value="">— Select —</option>
                      <option value="full">Full Payment ({formatNu(selected.balanceRetention, selected.currency)})</option>
                      <option value="partial">Partial Payment (with Deduction)</option>
                    </select>
                  </div>
                  {actionForm.paymentType === "partial" && (
                    <>
                      <div>
                        <label className={lbl}>Deduction Amount (defect/incomplete)</label>
                        <input type="number" className={inp} value={actionForm.deductionAmount || ""} onChange={(e) => updateForm("deductionAmount", Number(e.target.value))} placeholder="0" />
                      </div>
                      <div>
                        <label className={lbl}>Defect Remarks</label>
                        <input className={inp} value={actionForm.defectRemarks} onChange={(e) => updateForm("defectRemarks", e.target.value)} placeholder="Describe defects..." />
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <label className={lbl}>Remarks</label>
                    <textarea className={inp} rows={2} value={actionForm.remarks} onChange={(e) => updateForm("remarks", e.target.value)} placeholder="Payment processing remarks..." />
                  </div>

                  {/* Payment summary */}
                  <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                    <strong>Payment Summary:</strong> Balance {formatNu(selected.balanceRetention, selected.currency)}
                    {actionForm.paymentType === "partial" && actionForm.deductionAmount > 0 && (
                      <> &minus; Deduction {formatNu(actionForm.deductionAmount, selected.currency)} = <strong>Net Payment {formatNu(selected.balanceRetention - actionForm.deductionAmount, selected.currency)}</strong></>
                    )}
                    {actionForm.paymentType === "full" && <> → <strong>Full release to contractor</strong></>}
                    <div className="mt-1 text-[10px] text-emerald-600">System will auto-generate payment order and send to Cash Management</div>
                  </div>
                </div>
              )}

              {/* Forfeit form */}
              {actionForm.action === "forfeit" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <strong>Warning:</strong> Forfeiting retention of <strong>{formatNu(selected.balanceRetention, selected.currency)}</strong> will transfer from Non-CF account ({selected.nonCfAccountRef}) to CF Account. This action is irreversible. The contract will be removed from the active retention list.
                  </div>
                  <div>
                    <label className={lbl}>Contract Status</label>
                    <select className={inp} value={actionForm.contractStatus} onChange={(e) => updateForm("contractStatus", e.target.value as RetentionActionForm["contractStatus"])}>
                      <option value="">— Select —</option>
                      <option value="terminated">Terminated / Breach</option>
                      <option value="in-progress">In Progress (Performance Failure)</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Forfeiture Reason</label>
                    <select className={inp} value={actionForm.defectRemarks} onChange={(e) => updateForm("defectRemarks", e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="defect-during-dlp">Defect detection during DLP</option>
                      <option value="contract-breach">Contract breach</option>
                      <option value="performance-failure">Performance failure</option>
                      <option value="quality-non-compliance">Quality non-compliance</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Remarks (with accounting interest treatment)</label>
                    <textarea className={inp} rows={2} value={actionForm.remarks} onChange={(e) => updateForm("remarks", e.target.value)} placeholder="Forfeiture justification and accounting notes..." />
                  </div>
                </div>
              )}

              {/* Early Encashment form */}
              {actionForm.action === "early-encashment" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700">
                    <strong>SRS PRN 9.2.2:</strong> Early encashment requires Bank Guarantee verification from CMS. System pulls BG details against Contract ID, Contractor ID, and Agency Code.
                  </div>
                  <div>
                    <label className={lbl}>Contract Status</label>
                    <select className={inp} value={actionForm.contractStatus} onChange={(e) => updateForm("contractStatus", e.target.value as RetentionActionForm["contractStatus"])}>
                      <option value="">— Select —</option>
                      <option value="completed">Completed</option>
                      <option value="in-progress">Work In-Progress</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Bank Guarantee Amount</label>
                    <input type="number" className={inp} value={actionForm.bankGuaranteeAmount || ""} onChange={(e) => updateForm("bankGuaranteeAmount", Number(e.target.value))} placeholder="BG amount..." />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="bg-verified" checked={actionForm.bankGuaranteeVerified} onChange={(e) => updateForm("bankGuaranteeVerified", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                    <label htmlFor="bg-verified" className="text-xs text-slate-600">Bank Guarantee verified from CMS system (Contract ID: {selected.contractId}, Contractor: {selected.contractorId}, Agency: {selected.agencyCode})</label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Remarks</label>
                    <textarea className={inp} rows={2} value={actionForm.remarks} onChange={(e) => updateForm("remarks", e.target.value)} placeholder="Early encashment notes..." />
                  </div>

                  {/* Summary */}
                  <div className="sm:col-span-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700">
                    <strong>Encashment Summary:</strong> Release {formatNu(selected.balanceRetention, selected.currency)} against BG of {formatNu(actionForm.bankGuaranteeAmount || 0, selected.currency)}. Post-payment, retention balance will be updated.
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button className={btnSecondary} onClick={() => setStep("choose-action")}>&larr; Back</button>
                {canSubmit(actionForm, selected) ? (
                  <button className={actionForm.action === "forfeit" ? btnDanger : actionForm.action === "early-encashment" ? `${btn} bg-violet-600 text-white hover:bg-violet-700` : btnSuccess} onClick={handleSubmit}>
                    {actionForm.action === "forfeit" ? "Confirm Forfeiture" : actionForm.action === "early-encashment" ? "Process Encashment" : "Send to Cash Management"} &rarr;
                  </button>
                ) : (
                  <span className="flex items-center text-xs text-slate-400 italic">Fill all required fields to proceed</span>
                )}
              </div>
            </div>
          )}

          {/* ── Step 5: Submit / Success ───────────────────────────── */}
          {step === "submit" && success && (
            <div className={`${panel} p-8 text-center`}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                {actionForm.action === "forfeit" ? "🚫" : actionForm.action === "early-encashment" ? "🏦" : "✅"}
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {actionForm.action === "make-payment" && "Payment Order Generated"}
                {actionForm.action === "forfeit" && "Retention Forfeited"}
                {actionForm.action === "early-encashment" && "Early Encashment Processed"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {actionForm.action === "make-payment" && `Payment order auto-generated with unique reference. Forwarded to Cash Management for release.`}
                {actionForm.action === "forfeit" && `Retention of ${formatNu(selected.totalRetention, selected.currency)} transferred from Non-CF to CF account. Contract removed from active list.`}
                {actionForm.action === "early-encashment" && `Retention released against Bank Guarantee. Balance updated for Contract ${selected.contractId}.`}
              </p>

              {/* Post-action SRS notes */}
              <div className="mx-auto mt-4 max-w-lg rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 text-left">
                <strong>Post-Action (SRS):</strong>
                <div className="mt-1">
                  {actionForm.action === "make-payment" && "IFMIS Public Portal updated — contractor can track payment status. Contract removed from retention list upon full payment."}
                  {actionForm.action === "forfeit" && "Non-CF account debited, CF account credited. Contract removed from active retention list. Audit trail recorded."}
                  {actionForm.action === "early-encashment" && "Retention money balance updated against Contract ID, Contractor ID, Agency Code. Bank Guarantee details recorded."}
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button className={btnSecondary} onClick={goBack}>Back to List</button>
                <button className={btnPrimary} onClick={() => { goBack(); }}>Done</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Helper: Field display ──────────────────────────────────────────────── */
function Field({ label, value, highlight }: { label: string; value: string; highlight?: "amber" | "green" | "red" | "indigo" }) {
  const colors = highlight
    ? highlight === "amber" ? "text-amber-700 bg-amber-50 border-amber-200"
    : highlight === "green" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : highlight === "red" ? "text-red-700 bg-red-50 border-red-200"
    : "text-indigo-700 bg-indigo-50 border-indigo-200"
    : "text-slate-600 bg-slate-50 border-slate-100";
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{label}</span>
      <span className={`block rounded-lg border px-3 py-2 text-sm font-medium ${colors}`}>{value}</span>
    </div>
  );
}

/* ── Helper: Action card ────────────────────────────────────────────────── */
function ActionCard({ icon, title, description, srsRef, selected, onClick, color }: {
  icon: string; title: string; description: string; srsRef: string; selected: boolean; onClick: () => void; color: string;
}) {
  const ring = selected
    ? color === "emerald" ? "ring-2 ring-emerald-400 border-emerald-300 bg-emerald-50/60"
    : color === "red" ? "ring-2 ring-red-400 border-red-300 bg-red-50/60"
    : "ring-2 ring-violet-400 border-violet-300 bg-violet-50/60"
    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
  return (
    <button onClick={onClick} className={`rounded-xl border p-4 text-left transition ${ring}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-bold text-slate-700">{title}</div>
      <div className="mt-1 text-[11px] text-slate-500 leading-relaxed">{description}</div>
      <div className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{srsRef}</div>
    </button>
  );
}

/* ── Validation ─────────────────────────────────────────────────────────── */
function canSubmit(form: RetentionActionForm, record: RetentionRecord): boolean {
  if (!form.action || !form.contractStatus) return false;
  if (form.action === "make-payment" && !form.paymentType) return false;
  if (form.action === "make-payment" && form.paymentType === "partial" && form.deductionAmount <= 0) return false;
  if (form.action === "make-payment" && form.paymentType === "partial" && form.deductionAmount >= record.balanceRetention) return false;
  if (form.action === "forfeit" && !form.defectRemarks) return false;
  if (form.action === "early-encashment" && !form.bankGuaranteeVerified) return false;
  if (form.action === "early-encashment" && form.bankGuaranteeAmount <= 0) return false;
  return true;
}
