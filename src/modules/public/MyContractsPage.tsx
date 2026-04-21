/* ═══════════════════════════════════════════════════════════════════════════
   MyContractsPage — Public Portal "My Contracts"
   SRS Contract Management (PRN 2.x) · Row 12 Contractor User Access +
   Row 24 "Open to Contractor/Supplier — Amendment initiation".

   Dynamic flow:
     1. Read logged-in contractor from AuthContext + ContractorDataContext.
     2. Filter ContractDataContext for contracts where contractorId matches,
        with fallback to contractorName (case-insensitive) for legacy records.
     3. Show per-contract status, milestones, financials.
     4. Allow the contractor to initiate an amendment REQUEST (tagged to the
        contract's amendmentDraft) — routes the record through the existing
        Contract Amendment workflow (approver = agency-side).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { useContractorData } from "../../shared/context/ContractorDataContext";
import {
  useContractData,
  type StoredContract,
} from "../../shared/context/ContractDataContext";

export default function MyContractsPage() {
  const { user, activeRoleId, activeAgencyCode } = useAuth();
  const { contractors } = useContractorData();
  const { contracts, updateContract } = useContractData();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendReason, setAmendReason] = useState("");
  const [amendType, setAmendType] = useState<string>("Time Extension");

  const myContractor = useMemo(() => {
    if (!user) return null;
    return (
      contractors.find(
        (c) => c.email?.toLowerCase() === user.email?.toLowerCase(),
      ) ??
      contractors.find(
        (c) => c.displayName?.toLowerCase() === user.name?.toLowerCase(),
      ) ??
      null
    );
  }, [contractors, user]);

  const myContracts = useMemo<StoredContract[]>(() => {
    if (!user) return [];
    return contracts.filter((c) => {
      if (myContractor && c.contractorId === myContractor.id) return true;
      const byName = c.contractorName?.toLowerCase();
      return (
        byName === user.name?.toLowerCase() ||
        byName === myContractor?.displayName?.toLowerCase()
      );
    });
  }, [contracts, myContractor, user]);

  const totals = useMemo(() => {
    const active = myContracts.filter(
      (c) => c.contractStatus === "Active" || c.workflowStatus === "Approved",
    ).length;
    const pending = myContracts.filter(
      (c) =>
        c.workflowStatus === "Pending Approval" ||
        c.workflowStatus === "Submitted",
    ).length;
    const value = myContracts.reduce(
      (s, c) => s + (parseFloat(c.contractValue || "0") || 0),
      0,
    );
    return { active, pending, value };
  }, [myContracts]);

  const selected = useMemo(
    () => myContracts.find((c) => c.id === selectedId) ?? null,
    [myContracts, selectedId],
  );

  if (activeRoleId !== "role-public" || activeAgencyCode !== "EXT") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        This page is available only to logged-in contractors / vendors.
      </div>
    );
  }

  const submitAmendment = () => {
    if (!selected || !amendReason.trim()) return;
    updateContract(selected.id, {
      amendmentDraft: {
        ...(selected.amendmentDraft ?? {}),
        amendmentType: amendType,
        justification: amendReason,
        initiatedBy: "Contractor Portal",
        initiatedByName: user?.name ?? "contractor",
        initiatedAt: new Date().toISOString(),
        status: "Requested by Contractor",
      } as any,
      workflowStatus: "Amendment Requested",
    } as any);
    setAmendOpen(false);
    setAmendReason("");
    alert(
      `Amendment request submitted for ${selected.contractId}. The agency will review under SRS PRN 2.4 workflow.`,
    );
  };

  return (
    <div className="grid gap-6">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6">
        <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
          Contractor Portal
          <span className="h-1 w-1 rounded-full bg-emerald-300" />
          PRN 2.x · Row 12/24
          <span className="h-1 w-1 rounded-full bg-emerald-300" />
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            My Contracts
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          My Contracts
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
          All government contracts awarded to you — with live status, milestones,
          and the option to request an amendment directly from the portal.
          {myContractor && (
            <span className="ml-1">
              Scoped to <span className="font-semibold">{myContractor.displayName}</span>.
            </span>
          )}
        </p>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Total Contracts" value={myContracts.length.toString()} />
        <Kpi label="Active" value={totals.active.toString()} tone="emerald" />
        <Kpi label="Pending Approval" value={totals.pending.toString()} tone="amber" />
      </section>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {myContracts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No contracts yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            We couldn't find any contracts awarded to{" "}
            <span className="font-semibold">
              {myContractor?.displayName ?? user?.name}
            </span>
            . Contracts will appear here once an agency registers one against your
            contractor profile.
          </p>
          <button
            type="button"
            onClick={() => navigate("/public/contractor-profile")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            View My Profile →
          </button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Contract ID</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Agency</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-center">Workflow</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                      {c.contractId}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="truncate font-semibold text-slate-900">
                        {c.contractTitle}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {(c.contractCategory ?? []).join(", ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{c.agencyName}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">
                      Nu. {Number(c.contractValue || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600">
                      {c.startDate} → {c.endDate}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {c.workflowStatus || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          c.contractStatus === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.contractStatus === "Closed"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.contractStatus || "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(c.id);
                          setAmendOpen(true);
                          setAmendReason("");
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Request Amendment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Amendment modal ──────────────────────────────────────────────── */}
      {amendOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Request Contract Amendment
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Contract <span className="font-mono">{selected.contractId}</span> ·{" "}
                {selected.contractTitle}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Amendment Type
                </label>
                <select
                  value={amendType}
                  onChange={(e) => setAmendType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option>Time Extension</option>
                  <option>Contract Value Change</option>
                  <option>Milestone Change</option>
                  <option>Financial Rule Change</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Justification
                </label>
                <textarea
                  rows={4}
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  placeholder="Explain the reason for the amendment request..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                Your request will be routed to the procuring agency for review per
                SRS PRN 2.4 Amendment Workflow. You will be notified when a
                decision is made.
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setAmendOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAmendment}
                disabled={!amendReason.trim()}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Submit Request
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
  value: string;
  tone?: "amber" | "emerald";
}) {
  const border =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
