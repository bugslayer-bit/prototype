/* ═══════════════════════════════════════════════════════════════════════════
   RentalPaymentPage — entry component for Rental Payment Management.
   SRS PRN 5.1 R78 – R80 + DD 19.11 – 19.13 + LoV 10.1.

   Three-step wizard:
     Process 1.0  Asset Master Management
     Process 2.0  Generate Payment Transaction & Payment Order
     Process 3.0  Payment Validation (Budget + PTS + Duplicate + Schedule)

   ★ Role-aware — uses roleSwitchEpoch to force full remount on role switch,
     RoleContextBanner shows active capabilities, and all actions gated by
     useRentalRoleCapabilities().
   ★ UCoA-integrated — budget code, expenditure head, funding source flow
     from master data through the form and into the queue display.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { RentalDataProvider, useRentalData } from "./context/RentalDataContext";
import { initialRentalForm } from "./types";
import type { RentalFormState, StoredRental } from "./types";
import { RentalQueue } from "./components/RentalQueue";
import { RentalAssetSection } from "./components/RentalAssetSection";
import { RentalPaymentSection } from "./components/RentalPaymentSection";
import { RentalValidationSection } from "./components/RentalValidationSection";
import { useRentalMasterData } from "./hooks/useRentalMasterData";
import { useRentalRoleCapabilities } from "./hooks/useRentalRoleCapabilities";
import { useAuth } from "../../../shared/context/AuthContext";
import { getRoleTheme } from "../../../shared/roleTheme";

type View = "list" | "workspace";

/* ── Per-role description text for the hero banner ────────────────────── */
function getRoleDescription(roleId: string): string {
  switch (roleId) {
    case "role-admin":
      return "Full access — register assets, configure budgets, approve transactions, release payments, manage PTS verification, and terminate leases across all agencies.";
    case "role-finance-officer":
      return "Approve rental transactions, initiate and release payments, configure budget codes, and manage PTS verification for all rental assets.";
    case "role-head-of-agency":
      return "Final approval authority for rental transactions and lease terminations within your agency.";
    case "role-procurement":
      return "Read-only view of all rental assets and transactions for procurement reference and audit trail.";
    case "role-agency-staff":
      return "Register new rental assets, enter payment transactions, and map services for your agency.";
    case "role-auditor":
      return "Read-only access to all rental data for compliance review — export reports for RAA analysis.";
    case "role-normal-user":
      return "Register rental assets and enter payment transactions within your assigned scope.";
    default:
      return "Manage every asset the government has taken on rent or lease — from tangible immovable and movable property to intellectual property.";
  }
}

export function RentalPaymentPage() {
  const { roleSwitchEpoch, activeAgencyCode, activeRoleId } = useAuth();

  /* Remount on ANY of:
     • Role switch (e.g. Admin → Finance Officer)
     • Agency switch (e.g. GovTech → MoF) — the plain agency dropdown does
       NOT bump roleSwitchEpoch, so we include the agency code in the key to
       force a clean remount back to the list view. Without this, clicking
       Review/Edit from one persona's record left the MoF persona stuck on
       the half-filled workspace form instead of landing on the full queue. */
  return (
    <RentalDataProvider>
      <RentalInner
        key={`rental-${roleSwitchEpoch}-${activeRoleId ?? "none"}-${activeAgencyCode ?? "none"}`}
      />
    </RentalDataProvider>
  );
}

function RentalInner() {
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredRental | null>(null);
  const { activeRoleId } = useAuth();
  const roleCaps = useRentalRoleCapabilities();
  const theme = getRoleTheme(activeRoleId ?? "");

  return (
    <div className="grid min-w-0 gap-6">
      {/* ── Role Context Banner ─────────────────────────────────────────── */}
      <div
        className={`overflow-hidden rounded-2xl border p-4 sm:p-5 ${theme.bannerBgClass} ${theme.bannerTextClass}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${theme.portalChipClass}`}
          >
            {theme.portalLabel}
          </span>
          <span className="min-w-0 break-words text-xs font-semibold opacity-80">
            Rental Payment Management
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roleCaps.capabilities.map((c) => (
            <span
              key={c}
              className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
            >
              {c}
            </span>
          ))}
          {roleCaps.blocked.slice(0, 4).map((b) => (
            <span
              key={b}
              className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold line-through opacity-60"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-r from-white via-white to-slate-50/70 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-7">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Expenditure
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              Rental Payment Management
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                PRN 5.1 • DD 19.11-13
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Rental Payment Management
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                {getRoleDescription(activeRoleId ?? "")}
              </p>
            </div>
          </div>
          {view === "workspace" && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setView("list");
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              ← Back to Queue
            </button>
          )}
        </div>
      </section>

      {view === "list" && (
        <RentalQueue
          onNewRecord={() => {
            setEditing(null);
            setView("workspace");
          }}
          onEditRecord={(r) => {
            setEditing(r);
            setView("workspace");
          }}
        />
      )}

      {view === "workspace" && (
        <RentalWorkspace
          existing={editing}
          onDone={() => {
            setEditing(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
}

/* ── Workspace (3-step wizard) ──────────────────────────────────────────── */
interface WorkspaceProps {
  existing: StoredRental | null;
  onDone: () => void;
}

function RentalWorkspace({ existing, onDone }: WorkspaceProps) {
  const { addRental, generateNextAssetId, generateNextRecordId } = useRentalData();
  const master = useRentalMasterData();
  const roleCaps = useRentalRoleCapabilities();

  const [form, setForm] = useState<RentalFormState>(() =>
    existing
      ? { asset: existing.asset, transactions: existing.transactions }
      : { ...initialRentalForm },
  );

  /* Seed Asset ID + master-data defaults once when creating a new record */
  useEffect(() => {
    if (existing) return;
    if (form.asset.assetId) return;
    setForm((cur) => ({
      ...cur,
      asset: {
        ...cur.asset,
        assetId: generateNextAssetId(),
        status: cur.asset.status || master.assetStatus[0] || "",
        paymentFrequency: cur.asset.paymentFrequency || master.paymentFrequency[0] || "",
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const assetReady = useMemo(
    () =>
      !!form.asset.assetCategory &&
      !!form.asset.assetType &&
      !!form.asset.assetSubClass &&
      !!form.asset.lessorId &&
      !!form.asset.agencyName &&
      parseFloat(form.asset.rentAmount || "0") > 0,
    [form.asset],
  );

  const save = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredRental = {
      id,
      asset: form.asset,
      transactions: form.transactions,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    addRental(record);
    onDone();
  };

  /* Read-only handler for auditor/procurement */
  const handleFormChange = roleCaps.isReadOnly ? () => {} : setForm;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { n: 1, label: "Asset Master" },
            { n: 2, label: "Payment Transaction" },
            { n: 3, label: "Validation" },
          ].map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => setStep(s.n as 1 | 2 | 3)}
              className={`min-w-0 rounded-xl px-4 py-2 text-left text-xs font-semibold transition ${
                step === s.n
                  ? "bg-sky-100 text-sky-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="block truncate">{s.n}. {s.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Cancel
          </button>
          {!roleCaps.isReadOnly && (
            <button
              type="button"
              onClick={save}
              disabled={!assetReady}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {existing ? "Save Changes" : "Create Rental Asset"}
            </button>
          )}
        </div>
      </div>

      {step === 1 && <RentalAssetSection form={form} onChange={handleFormChange} />}
      {step === 2 && <RentalPaymentSection form={form} onChange={handleFormChange} />}
      {step === 3 && <RentalValidationSection form={form} />}
    </div>
  );
}
