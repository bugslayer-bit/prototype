/* ═══════════════════════════════════════════════════════════════════════════
   ContractorProfilePage — Public Portal "My Profile"
   SRS PRN 1.1 (Contractor Registration) + PRN 1.2 (Amendment) + Row 12
   "Contractor user access — the contractor logging in the public portal
    should be able to access their own information."

   Dynamic flow:
     1. Read logged-in user from AuthContext (role-public, EXT agency).
     2. Look up the matching contractor record via email (ContractorDataContext,
        backed by localStorage `ifmis-contractors`).
     3. Display verification status, bank details, KYC, workflow history.
     4. Allow "Request Amendment" — routes to /contractor/amendment prefilled.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { useContractorData } from "../../shared/context/ContractorDataContext";

export default function ContractorProfilePage() {
  const { user, activeRoleId, activeAgencyCode } = useAuth();
  const { contractors, updateContractor } = useContractorData();
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(false);

  /* Match contractor by email first, then by display name. */
  const myRecord = useMemo(() => {
    if (!user) return null;
    const byEmail = contractors.find(
      (c) => c.email?.toLowerCase() === user.email?.toLowerCase(),
    );
    if (byEmail) return byEmail;
    return contractors.find(
      (c) => c.displayName?.toLowerCase() === user.name?.toLowerCase(),
    ) ?? null;
  }, [contractors, user]);

  if (activeRoleId !== "role-public" || activeAgencyCode !== "EXT") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        This page is available only to logged-in contractors / vendors (Public Portal).
      </div>
    );
  }

  if (!myRecord) {
    return (
      <div className="grid gap-6">
        <HeroBanner user={user} />
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            No matching contractor profile found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            We couldn't match <span className="font-semibold">{user?.email}</span> to
            any registered contractor. Please complete your registration first.
          </p>
          <button
            type="button"
            onClick={() => navigate("/modules/contractor/register")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Register as Contractor →
          </button>
        </section>
      </div>
    );
  }

  const verifStyle =
    myRecord.verification === "Verified"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : myRecord.verification === "Rejected"
        ? "bg-rose-100 text-rose-700 border-rose-300"
        : "bg-amber-100 text-amber-800 border-amber-300";

  return (
    <div className="grid gap-6">
      <HeroBanner user={user} record={myRecord} />

      {/* ── Status strip ────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Contractor ID" value={myRecord.id} />
        <Kpi label="Kind" value={myRecord.kind === "business" ? "Business" : "Individual"} />
        <Kpi label="Category" value={myRecord.category || "—"} />
        <Kpi
          label="Verification"
          value={myRecord.verification ?? "Pending"}
          badgeClass={verifStyle}
        />
      </section>

      {/* ── Identity & contact ───────────────────────────────────────────── */}
      <Section title="Identity & Contact" subtitle="SRS PRN 1.1 · Contractor Profile">
        <Grid>
          <Field label="Display Name" value={myRecord.displayName} />
          <Field label="Email" value={myRecord.email} />
          <Field label="Phone" value={myRecord.phone} />
          <Field label="Address" value={myRecord.address} />
          <Field label="Nationality" value={myRecord.nationality} />
          <Field label="Contractor Type" value={myRecord.contractorType} />
          <Field label="Contractual Type" value={myRecord.contractualType ?? "—"} />
          <Field label="Registration No." value={myRecord.registrationNumber} />
          <Field label="Tax / TPN" value={myRecord.taxNumber} />
        </Grid>
      </Section>

      {/* ── Bank ─────────────────────────────────────────────────────────── */}
      <Section title="Bank Account" subtitle="SRS PRN 1.1 Step 2 · Bank validation">
        <Grid>
          <Field label="Bank Name" value={myRecord.bankName} />
          <Field label="Account Number" value={myRecord.bankAccountNumber} />
          <Field label="Account Holder" value={myRecord.bankAccountName} />
        </Grid>
      </Section>

      {/* ── Verification checks ──────────────────────────────────────────── */}
      {Array.isArray(myRecord.verificationChecks) &&
        myRecord.verificationChecks.length > 0 && (
          <Section title="Verification Checks" subtitle="IBLS · BITS · Bank API">
            <div className="grid gap-2 sm:grid-cols-2">
              {myRecord.verificationChecks.map((v: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{v.name ?? v.label ?? "Check"}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      (v.status === "Pass" || v.status === "Verified")
                        ? "bg-emerald-100 text-emerald-700"
                        : v.status === "Fail"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

      {/* ── Workflow timeline ────────────────────────────────────────────── */}
      {Array.isArray(myRecord.workflowSteps) && myRecord.workflowSteps.length > 0 && (
        <Section title="Registration Workflow" subtitle="Maker → Reviewer → Approver">
          <ol className="space-y-2">
            {myRecord.workflowSteps.map((s: any, i: number) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {s.step ?? s.label ?? `Step ${i + 1}`}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    {s.actor ?? s.role ?? "—"}
                    {s.at && ` · ${new Date(s.at).toLocaleString()}`}
                  </div>
                  {s.remarks && (
                    <div className="mt-1 text-xs italic text-slate-500">"{s.remarks}"</div>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    s.status === "Approved" || s.status === "Completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : s.status === "Rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {s.status ?? "Pending"}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <section className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => navigate("/modules/contractor/amendment")}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          Request Profile Amendment →
        </button>
        <button
          type="button"
          onClick={() => navigate("/public/my-contracts")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          View My Contracts
        </button>
        <button
          type="button"
          onClick={() => navigate("/public/payment-status")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Payment Status
        </button>
        <button
          type="button"
          onClick={() =>
            updateContractor(myRecord.id, {
              editHistory: [
                ...(myRecord.editHistory ?? []),
                {
                  at: new Date().toISOString(),
                  by: user?.name ?? "self",
                  action: "Viewed profile from public portal",
                } as any,
              ],
            })
          }
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Log access
        </button>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          {showRaw ? "Hide raw JSON" : "Show raw JSON"}
        </button>
      </section>

      {showRaw && (
        <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-900 p-4 text-[11px] leading-relaxed text-emerald-300">
{JSON.stringify(myRecord, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── Presentational helpers ────────────────────────────────────────────── */
function HeroBanner({ user, record }: { user: any; record?: any }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-6">
      <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600">
        Contractor Portal
        <span className="h-1 w-1 rounded-full bg-sky-300" />
        PRN 1.1 · 1.2
        <span className="h-1 w-1 rounded-full bg-sky-300" />
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          My Profile
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        Welcome, {record?.displayName ?? user?.name ?? "Contractor"}
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">
        View your registered information, verification status, and request amendments.
        All changes go through the configured maker-reviewer-approver workflow.
      </p>
    </section>
  );
}

function Kpi({
  label,
  value,
  badgeClass,
}: {
  label: string;
  value: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      {badgeClass ? (
        <span
          className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badgeClass}`}
        >
          {value}
        </span>
      ) : (
        <div className="mt-1 truncate text-lg font-bold text-slate-900">{value}</div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-baseline justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{title}</h2>
        {subtitle && <span className="text-[11px] font-semibold text-slate-500">{subtitle}</span>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 break-words text-sm font-medium text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}
