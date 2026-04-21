/* ═══════════════════════════════════════════════════════════════════════════
   UtilityManagementPage — entry component for SRS PRN 5.1 (Utility Management).
   ─────────────────────────────────────────────────────────────────────────
   Hosts the queue (list view) and the 3-step workspace wizard:
     Process 1.0  →  Provider & Connection Master
     Process 2.0  →  Bill Data Management
     Process 3.0  →  Bill Validation (Budget / MCP / Connection / Due Date)

   Role-aware: entire page remounts on role switch via roleSwitchEpoch.
   RoleContextBanner, stat cards, action buttons, and filters all adapt
   dynamically to the active persona.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { useUtilityData } from "./context/UtilityDataContext";
import { initialUtilityForm } from "./types";
import type { StoredUtility, UtilityFormState } from "./types";
import { UtilityQueue } from "./components/UtilityQueue";
import { UtilityProviderSection } from "./components/UtilityProviderSection";
import { UtilityBillSection } from "./components/UtilityBillSection";
import { UtilityValidationSection } from "./components/UtilityValidationSection";
import { useUtilityMasterData } from "./hooks/useUtilityMasterData";
import { useUtilityRoleCapabilities } from "./hooks/useUtilityRoleCapabilities";
import { useAuth } from "../../../shared/context/AuthContext";
import { getRoleTheme } from "../../../shared/roleTheme";
import { RoleContextBanner } from "../../../shared/components/RoleContextBanner";
import { resolveAgencyContext } from "../../../shared/data/agencyPersonas";
import { GovTechScopeCard } from "../../../shared/components/GovTechScopeCard";

type View = "list" | "workspace";

export function UtilityManagementPage() {
  const { roleSwitchEpoch } = useAuth();
  return <UtilityInner key={`utility-${roleSwitchEpoch}`} />;
}

function UtilityInner() {
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<StoredUtility | null>(null);
  const { activeRoleId, activeAgencyCode } = useAuth();
  const theme = getRoleTheme(activeRoleId);
  const roleCaps = useUtilityRoleCapabilities();

  return (
    <div className="grid min-w-0 gap-6">
      {/* Role Context Banner */}
      <RoleContextBanner capabilities={roleCaps.capabilities} blocked={roleCaps.blocked} />

      {/* Page Header — role-themed */}
      <section
        className={`overflow-hidden rounded-[24px] border border-slate-200 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-500 sm:p-7 ${theme.bannerBgClass}`}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Expenditure
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                Utility & Service Payment Management
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${theme.portalChipClass}`}>
                {theme.portalLabel}
              </span>
              {roleCaps.isReadOnly && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                  Read-Only
                </span>
              )}
            </div>
            <div>
              <h1 className={`text-3xl font-bold tracking-tight sm:text-4xl transition-colors duration-500 ${theme.bannerTextClass}`}>
                Utility & Service Payment Management
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                {getRoleDescription(activeRoleId)}
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
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Back to Queue
            </button>
          )}
        </div>
      </section>

      {/* GovTech integration-owner scope (only rendered when agency 70). */}
      {view === "list" && (
        <GovTechScopeCard module="expenditure" agencyCode={activeAgencyCode} />
      )}

      {view === "list" && (
        <UtilityQueue
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
        <UtilityWorkspace
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

/* ── Per-role page descriptions ────────────────────────────────────────── */
function getRoleDescription(activeRoleId: string | null): string {
  switch (activeRoleId) {
    case "role-admin":
      return "Full administration: register utility service providers, configure billing connections, manage disputes, set cut-off dates, and process utility bills through all three SRS sub-processes. DD 19.1 – 19.10.";
    case "role-finance-officer":
      return "Review and approve utility bills, initiate payment orders to Cash Management, configure billing cut-off dates, and manage dispute resolution workflows. LoV 15.1 – 15.2.";
    case "role-head-of-agency":
      return "Final approval authority for utility bills and dispute escalations. Authorize payment orders before release to Cash Management.";
    case "role-procurement":
      return "Read-only view of utility service provider contracts and billing history for procurement compliance monitoring.";
    case "role-agency-staff":
      return "Enter utility bills manually or via API fetch, map service connections to offices, and manage provider master data for your agency. DD 19.1 – 19.5.";
    case "role-auditor":
      return "Read-only audit access: review all utility accounts, bills, payment orders, and dispute history. Export data for Royal Audit Authority compliance.";
    case "role-normal-user":
      return "Register utility service providers, configure billing connections, and enter utility bills. Submit for approval through the standard workflow.";
    default:
      return "Register utility service providers, configure billing connections, and process utility bills through the three SRS-mandated sub-processes. DD 19.1 – 19.10.";
  }
}

/* ── Workspace (3-step wizard) ──────────────────────────────────────────── */
interface WorkspaceProps {
  existing: StoredUtility | null;
  onDone: () => void;
}

function UtilityWorkspace({ existing, onDone }: WorkspaceProps) {
  const {
    addUtility,
    generateNextUtilityId,
    generateNextBillId,
    generateNextRecordId,
  } = useUtilityData();
  const master = useUtilityMasterData();
  const roleCaps = useUtilityRoleCapabilities();
  const { activeRoleId } = useAuth();
  const theme = getRoleTheme(activeRoleId);

  /* Auto-prefill the agency for non-central personas so they can never
     accidentally create a utility record under another agency. MoF
     (isCentral) keeps the dropdown free. */
  const agencyCtx = resolveAgencyContext(activeRoleId);
  const prefilledAgency =
    agencyCtx && !agencyCtx.agency.isCentral ? agencyCtx.agency.name : "";

  const [form, setForm] = useState<UtilityFormState>(() =>
    existing
      ? { header: existing.header, serviceMaps: existing.serviceMaps, bills: existing.bills }
      : {
          ...initialUtilityForm,
          header: {
            ...initialUtilityForm.header,
            agencyCode: agencyCtx && !agencyCtx.agency.isCentral ? activeAgencyCode : "",
            agencyName: prefilledAgency,
          },
        },
  );

  useEffect(() => {
    if (existing) return;
    if (form.header.utilityId) return;
    setForm((cur) => ({
      ...cur,
      header: {
        ...cur.header,
        utilityId: generateNextUtilityId(),
        /* Prefill agency once on mount if the persona is scoped */
        agencyCode: cur.header.agencyCode || (agencyCtx && !agencyCtx.agency.isCentral ? activeAgencyCode : ""),
        agencyName: cur.header.agencyName || prefilledAgency,
        billingCycle: cur.header.billingCycle || master.billingCycle[0] || "",
        utilityStatus: cur.header.utilityStatus || master.utilityStatus[0] || "",
        paymentMethod: cur.header.paymentMethod || master.paymentMethod[0] || "",
        preferredPaymentMode: cur.header.preferredPaymentMode || master.preferredPaymentMode[0] || "",
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const headerReady = useMemo(
    () =>
      !!form.header.agencyName &&
      !!form.header.utilityType &&
      !!form.header.serviceProviderId &&
      !!form.header.connectionReference &&
      parseFloat(form.header.monthlyBudgetAllocation || "0") > 0,
    [form.header],
  );

  const save = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredUtility = {
      id,
      header: form.header,
      serviceMaps: form.serviceMaps,
      bills: form.bills,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    addUtility(record);
    onDone();
  };

  const saveAndNext = () => {
    const id = existing?.id ?? generateNextRecordId();
    const now = new Date().toISOString();
    const record: StoredUtility = {
      id,
      header: form.header,
      serviceMaps: form.serviceMaps,
      bills: form.bills,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    addUtility(record);
    if (step < 3) {
      setStep(((step + 1) as 1 | 2 | 3));
    } else {
      onDone();
    }
  };

  /* Read-only roles can view the workspace but not modify. */
  const readOnly = roleCaps.isReadOnly;

  return (
    <div className="grid gap-6">
      {/* Read-only notice for audit/procurement roles */}
      {readOnly && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600">
            !
          </span>
          <div>
            <p className="text-sm font-semibold text-rose-800">Read-Only Mode</p>
            <p className="text-xs text-rose-600">
              Your role ({theme.personaName}) has view-only access to utility accounts. Changes cannot be saved.
            </p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className={`flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 transition-all duration-500`}>
        {[
          { n: 1, label: "Provider Master" },
          { n: 2, label: "Bill Data" },
          { n: 3, label: "Validation" },
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n as 1 | 2 | 3)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              step === s.n
                ? "bg-sky-100 text-sky-800"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s.n}. {s.label}
          </button>
        ))}
        {!readOnly && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveAndNext}
              disabled={!headerReady}
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {step < 3 ? `Save & Next → ${step === 1 ? "Bill Data" : "Validation"}` : "Save & Finish"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!headerReady}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {existing ? "Save Changes" : "Create Utility Account"}
            </button>
          </div>
        )}
        {readOnly && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Back
            </button>
          </div>
        )}
      </div>

      {step === 1 && <UtilityProviderSection form={form} onChange={readOnly ? () => {} : setForm} />}
      {step === 2 && (
        <UtilityBillSection
          form={form}
          onChange={readOnly ? () => {} : setForm}
          generateNextBillId={generateNextBillId}
        />
      )}
      {step === 3 && <UtilityValidationSection form={form} onChange={readOnly ? () => {} : setForm} />}
    </div>
  );
}
