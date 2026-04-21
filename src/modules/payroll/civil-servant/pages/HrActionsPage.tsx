/* ═══════════════════════════════════════════════════════════════════════════
   HR Actions & Pay Updates — Civil Service
   Payroll SRS v1 · "HR action matrix" sheet · DDi 2.0
   18 HR action types, each with a conditional field set derived directly
   from the SRS matrix. Fully dynamic — employees scoped to active agency,
   field rendering driven by the selected action, draft/review/approve/post
   workflow pipeline on every submission.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useAgencyUrl } from "../../../../shared/hooks/useAgencyUrl";
import {
  usePayrollRoleCapabilities,
  payrollToneClasses,
} from "../../state/usePayrollRoleCapabilities";
import { PayrollPersonaBanner } from "../../shared/components/PayrollPersonaBanner";
import { AGENCIES } from "../../../../shared/data/agencyPersonas";
import { CS_SAMPLE_EMPLOYEES } from "../../shared/sampleData/csSampleEmployees";
import { PayrollGroupSiblingNav } from "../../shared/navigation/PayrollSubNav";
import {
  computeBasicPay,
  lookupPayScale,
} from "../../shared/payScale";

/* ─────────────────────────────────────────────────────────────────────────
   HR Action Matrix — straight from SRS "HR action matrix" sheet.
   Each action declares the field keys it requires. Rendering is dynamic.
   ───────────────────────────────────────────────────────────────────── */

type HrFieldKey =
  | "oldBasicPay"
  | "increment"
  | "newBasicPay"
  | "newPositionTitle"
  | "newPayScale"
  | "newWorkingAgency"
  | "newIncrementDate"
  | "transferType"
  | "dateOfJoining"
  | "contractExtendedDate"
  | "secondmentFromDate"
  | "secondmentUntilDate"
  | "lttFromDate"
  | "lttUntilDate"
  | "lttCountry"
  | "lttPlaceOfTraining"
  | "sttFromDate"
  | "sttUntilDate"
  | "sttCountry"
  | "sttPlaceOfTraining"
  | "leaveType"
  | "leaveTillDate"
  | "hrAuditType"
  | "legalActionType"
  | "separationType"
  | "separationDate"
  | "payArrears"
  | "allowanceArrears"
  | "otherAllowanceArrears"
  | "payFixationType"
  | "rejoinDate";

interface HrAction {
  id: string;
  label: string;
  icon: string;
  category: "compensation" | "mobility" | "learning" | "leave" | "governance" | "separation" | "financial";
  fields: HrFieldKey[];
  description: string;
}

const HR_ACTIONS: HrAction[] = [
  { id: "increment", label: "Increment", icon: "📈", category: "compensation",
    fields: ["oldBasicPay", "increment", "newBasicPay", "newIncrementDate"],
    description: "Annual increment within the same pay scale and level." },
  { id: "promotion", label: "Promotion", icon: "⬆️", category: "compensation",
    fields: ["oldBasicPay", "increment", "newBasicPay", "newPositionTitle", "newPayScale", "newIncrementDate", "dateOfJoining"],
    description: "Elevation to a higher position level and pay scale." },
  { id: "demotion", label: "Demotion", icon: "⬇️", category: "compensation",
    fields: ["oldBasicPay", "increment", "newBasicPay", "newPositionTitle", "newPayScale", "newIncrementDate", "dateOfJoining"],
    description: "Reduction to a lower position level." },
  { id: "transfer", label: "Transfer", icon: "🔀", category: "mobility",
    fields: ["newPositionTitle", "newWorkingAgency", "transferType", "dateOfJoining"],
    description: "Movement between agencies or within an agency." },
  { id: "contract-extension", label: "Contract Extension", icon: "📋", category: "compensation",
    fields: ["contractExtendedDate", "dateOfJoining"],
    description: "Extension of an existing contract employment term." },
  { id: "position-title-change", label: "Position Title Change", icon: "🏷️", category: "mobility",
    fields: ["newPositionTitle", "dateOfJoining"],
    description: "Rename of position without level/pay change." },
  { id: "position-remapping", label: "Position Re-mapping", icon: "🔖", category: "mobility",
    fields: ["newPositionTitle", "newPayScale"],
    description: "Re-map to a different occupational group mapping." },
  { id: "agency-restructure", label: "Agency Restructure", icon: "🏛️", category: "mobility",
    fields: ["newWorkingAgency", "dateOfJoining"],
    description: "Agency bifurcation, merger, upgradation or downgradation." },
  { id: "secondment", label: "Secondment", icon: "🤝", category: "mobility",
    fields: ["secondmentFromDate", "secondmentUntilDate", "newWorkingAgency"],
    description: "Temporary deputation to another agency." },
  { id: "ltt", label: "LTT (Long-Term Training)", icon: "🎓", category: "learning",
    fields: ["lttFromDate", "lttUntilDate", "lttCountry", "lttPlaceOfTraining", "leaveType"],
    description: "Long-term training, typically overseas." },
  { id: "stt", label: "STT / Leadership", icon: "📚", category: "learning",
    fields: ["sttFromDate", "sttUntilDate", "sttCountry", "sttPlaceOfTraining", "leaveType"],
    description: "Short-term training or leadership programme." },
  { id: "leave", label: "Leave", icon: "🌴", category: "leave",
    fields: ["leaveType", "leaveTillDate", "dateOfJoining"],
    description: "Any extended leave (EOL / SL / ML / TRG)." },
  { id: "hr-audit", label: "HR Audit", icon: "🔍", category: "governance",
    fields: ["hrAuditType", "oldBasicPay", "increment", "newBasicPay", "newPositionTitle", "newPayScale", "newIncrementDate"],
    description: "HR audit outcome applied to employee record." },
  { id: "legal", label: "Legal Action", icon: "⚖️", category: "governance",
    fields: ["legalActionType", "oldBasicPay", "newBasicPay", "newPositionTitle", "newPayScale", "newIncrementDate", "dateOfJoining"],
    description: "Legal disposition — suspension, censure, reinstatement." },
  { id: "separation", label: "Separation", icon: "🚪", category: "separation",
    fields: ["separationType", "separationDate", "dateOfJoining"],
    description: "Retirement, resignation, termination, dismissal." },
  { id: "arrears", label: "Arrears & Allowance", icon: "💵", category: "financial",
    fields: ["payArrears", "allowanceArrears", "otherAllowanceArrears", "dateOfJoining"],
    description: "Back-pay for missed increments, promotions, or allowances." },
  { id: "pay-fixation", label: "Pay Fixation", icon: "🧮", category: "compensation",
    fields: ["payFixationType", "newBasicPay", "newIncrementDate"],
    description: "Fix pay on appointment, promotion, or re-entry." },
  { id: "rejoin", label: "Re-join / Re-appointment", icon: "↩️", category: "mobility",
    fields: ["rejoinDate", "newPositionTitle"],
    description: "Re-entry after extraordinary leave or resignation." },
];

/* Field metadata (label, type, group) */
interface FieldMeta { label: string; type: "text" | "number" | "date" | "select"; options?: string[]; group: string; }
const FIELD_META: Record<HrFieldKey, FieldMeta> = {
  oldBasicPay:           { label: "Old Basic Pay (Nu)", type: "number", group: "Pay" },
  increment:             { label: "Increment (Nu)", type: "number", group: "Pay" },
  newBasicPay:           { label: "New Basic Pay (Nu)", type: "number", group: "Pay" },
  newPositionTitle:      { label: "New Position Title", type: "text", group: "Position" },
  newPayScale:           { label: "New Pay Scale / Level", type: "select", options: ["EX","ES-1","ES-2","ES-3","EX-1","EX-2","EX-3","SS-1","SS-2","SS-3","P-1","P-2","P-3","P-4","P-5","S-1","S-2","S-3","S-4","S-5","O-1","O-2","O-3","O-4","GSC-I","GSC-II"], group: "Position" },
  newWorkingAgency:      { label: "New Working Agency", type: "text", group: "Position" },
  newIncrementDate:      { label: "New Increment Date", type: "date", group: "Dates" },
  transferType:          { label: "Transfer Type", type: "select", options: ["Lateral","Upward","Downward","Mutual","On-Request","Administrative"], group: "Type" },
  dateOfJoining:         { label: "Date of Joining", type: "date", group: "Dates" },
  contractExtendedDate:  { label: "Contract Extended Until", type: "date", group: "Dates" },
  secondmentFromDate:    { label: "Secondment From", type: "date", group: "Dates" },
  secondmentUntilDate:   { label: "Secondment Until", type: "date", group: "Dates" },
  lttFromDate:           { label: "LTT From", type: "date", group: "Dates" },
  lttUntilDate:          { label: "LTT Until", type: "date", group: "Dates" },
  lttCountry:            { label: "LTT Country", type: "text", group: "Training" },
  lttPlaceOfTraining:    { label: "LTT Place of Training", type: "text", group: "Training" },
  sttFromDate:           { label: "STT From", type: "date", group: "Dates" },
  sttUntilDate:          { label: "STT Until", type: "date", group: "Dates" },
  sttCountry:            { label: "STT Country", type: "text", group: "Training" },
  sttPlaceOfTraining:    { label: "STT Place of Training", type: "text", group: "Training" },
  leaveType:             { label: "Leave Type", type: "select", options: ["EOL (Extra-Ordinary Leave)","SL (Study Leave)","ML (Maternity Leave)","TRG (Training)","Earned Leave","Medical Leave"], group: "Leave" },
  leaveTillDate:         { label: "Leave Until", type: "date", group: "Dates" },
  hrAuditType:           { label: "HR Audit Type", type: "select", options: ["Compliance","Performance","Pay Correction","Position Correction"], group: "Type" },
  legalActionType:       { label: "Legal Action Type", type: "select", options: ["Suspension","Censure","Warning","Reinstatement","Dismissal"], group: "Type" },
  separationType:        { label: "Separation Type", type: "select", options: ["Voluntary Resignation","Superannuation","Compulsory Retirement","Termination","Dismissal","Deceased"], group: "Type" },
  separationDate:        { label: "Separation Date", type: "date", group: "Dates" },
  payArrears:            { label: "Pay Arrears (Nu)", type: "number", group: "Arrears" },
  allowanceArrears:      { label: "Allowance Arrears (Nu)", type: "number", group: "Arrears" },
  otherAllowanceArrears: { label: "Other Allowance Arrears (Nu)", type: "number", group: "Arrears" },
  payFixationType:       { label: "Pay Fixation Type", type: "select", options: ["On Appointment","On Promotion","On Re-entry","On Re-instatement","On Re-mapping"], group: "Type" },
  rejoinDate:            { label: "Re-join Date", type: "date", group: "Dates" },
};

type WorkflowStage = "draft" | "verified" | "approved" | "posted";
const WORKFLOW_STAGES: { key: WorkflowStage; label: string; role: string }[] = [
  { key: "draft",    label: "Draft",    role: "HR Officer (Initiator)" },
  { key: "verified", label: "Verified", role: "HR Manager (Reviewer)" },
  { key: "approved", label: "Approved", role: "HoA (Approver)" },
  { key: "posted",   label: "Posted",   role: "System → Payroll" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────────────── */
export function HrActionsPage() {
  const { activeAgencyCode, roleSwitchEpoch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useAgencyUrl();
  const caps = usePayrollRoleCapabilities();
  const tone = payrollToneClasses(caps.personaTone);
  /* Recompute derived state when the active persona changes. */
  void roleSwitchEpoch;

  const currentAgency = useMemo(
    () => AGENCIES.find((a) => a.code === activeAgencyCode),
    [activeAgencyCode]
  );

  /* Agency-scoped employee pool */
  const pool = useMemo(
    () =>
      activeAgencyCode === "16"
        ? CS_SAMPLE_EMPLOYEES
        : CS_SAMPLE_EMPLOYEES.filter((e) => e.agencyCode === activeAgencyCode),
    [activeAgencyCode]
  );

  /* ── Selection & form state ─────────────────────────────────────────── */
  const [actionId, setActionId] = useState<string>(HR_ACTIONS[0].id);
  const [employeeId, setEmployeeId] = useState<number | null>(pool[0]?.employeeId ?? null);
  const [stage, setStage] = useState<WorkflowStage>("draft");
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("");
  const [catFilter, setCatFilter] = useState<string>("all");

  const action = HR_ACTIONS.find((a) => a.id === actionId)!;
  const employee = pool.find((e) => e.employeeId === employeeId) || null;

  /* Auto-populate from employee + pay scale */
  const autoValues = useMemo(() => {
    if (!employee) return {} as Partial<Record<HrFieldKey, string>>;
    const ps = lookupPayScale(employee.positionLevel);
    const basic = computeBasicPay(employee.positionLevel, employee.yearsOfService);
    const incr = ps?.annualIncrement ?? 0;
    const out: Partial<Record<HrFieldKey, string>> = {
      oldBasicPay: String(basic || 0),
      newBasicPay: String((basic || 0) + incr),
      increment:   String(incr),
      newPositionTitle: employee.positionTitle,
      newPayScale: employee.positionLevel,
      newWorkingAgency: employee.workingAgency,
    };
    return out;
  }, [employee]);

  const getValue = (k: HrFieldKey): string => values[k] ?? autoValues[k] ?? "";
  const setValue = (k: HrFieldKey, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const actionsFiltered = useMemo(
    () =>
      HR_ACTIONS.filter(
        (a) =>
          (catFilter === "all" || a.category === catFilter) &&
          (!filter.trim() || a.label.toLowerCase().includes(filter.toLowerCase()))
      ),
    [catFilter, filter]
  );

  /* Group fields by FIELD_META.group for nicer rendering */
  const groupedFields = useMemo(() => {
    const groups: Record<string, HrFieldKey[]> = {};
    action.fields.forEach((f) => {
      const g = FIELD_META[f].group;
      (groups[g] ||= []).push(f);
    });
    return groups;
  }, [action]);

  /* Workflow advancement */
  const advanceStage = () => {
    const order: WorkflowStage[] = ["draft", "verified", "approved", "posted"];
    const next = order[Math.min(order.indexOf(stage) + 1, order.length - 1)];
    setStage(next);
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 p-6 max-w-full mx-auto">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <Link to={buildPath("/")} className="hover:text-blue-600 hover:underline">Home</Link>
        <span className="opacity-50">›</span>
        <button onClick={() => navigate(buildPath("/payroll/management"))} className="hover:text-blue-600 hover:underline">Payroll</button>
        <span className="opacity-50">›</span>
        <button onClick={() => navigate(buildPath("/payroll/management"))} className="hover:text-blue-600 hover:underline">Payroll Management</button>
        <span className="opacity-50">›</span>
        <span className="text-blue-700 font-semibold">Civil Service</span>
        <span className="opacity-50">›</span>
        <span className="text-slate-700 font-semibold">📋 HR Actions</span>
        <span className="opacity-50">›</span>
        <span className="text-slate-900 font-bold">HR Actions & Pay Updates</span>
      </nav>

      {/* Sibling nav (HR Actions group peers) */}
      <PayrollGroupSiblingNav category="civil-servant" currentPath={location.pathname} />

      {/* ── Persona banner — reacts live to top-bar role switch ── */}
      <PayrollPersonaBanner moduleLabel="HR Actions · DDi 2.0" caps={caps} />

      {/* Page header + workflow pipeline */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h1 className="text-xl font-black text-slate-900">HR Actions & Pay Updates</h1>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                DDi 2.0 · HR Action Matrix
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 max-w-3xl">
              Initiate, review, approve, and post any of the 18 HR action types defined in the
              Payroll SRS. Field requirements adapt to the selected action type.
              Employee list is scoped to <strong>{currentAgency?.name ?? activeAgencyCode}</strong>.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workflow Status</div>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              {stage.toUpperCase()}
            </div>
          </div>
        </div>

        {/* 4-stage workflow pipeline */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WORKFLOW_STAGES.map((s, i) => {
            const currentIdx = WORKFLOW_STAGES.findIndex((x) => x.key === stage);
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            const tone = isDone
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : isCurrent
              ? "border-blue-400 bg-blue-50 text-blue-900"
              : "border-slate-200 bg-white text-slate-500";
            return (
              <div key={s.key} className={`rounded-xl border ${tone} p-3`}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs font-bold">
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span className="text-xs font-bold">{s.label}</span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-slate-500">{s.role}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action & Employee selector + dynamic form */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Action palette */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Action Types
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">{actionsFiltered.length}/{HR_ACTIONS.length}</span>
          </div>
          <input
            type="text"
            placeholder="Search actions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {(["all","compensation","mobility","learning","leave","governance","separation","financial"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                  catFilter === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-[520px] space-y-1 overflow-y-auto pr-1">
            {actionsFiltered.map((a) => {
              const active = actionId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => { setActionId(a.id); setStage("draft"); setValues({}); }}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  <span className="text-base">{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900">{a.label}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{a.description}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>{a.category}</span>
                      <span className="text-[9px] text-slate-400">{a.fields.length} fields</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: employee + form + actions */}
        <div className="space-y-4">
          {/* Employee selector + summary */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[280px] flex-1">
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Employee (ZESt-sourced)
                </label>
                <select
                  value={employeeId ?? ""}
                  onChange={(e) => setEmployeeId(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {pool.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>
                      {e.firstName} {e.lastName} — EID {e.employeeId} · {e.positionTitle} ({e.positionLevel})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {employee && (
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <EmpTile label="CID" value={employee.cid} />
                <EmpTile label="Department" value={employee.department} />
                <EmpTile label="Sub-Division" value={employee.subdivision} />
                <EmpTile label="Position Level" value={employee.positionLevel} />
                <EmpTile label="Designation" value={employee.designation} />
                <EmpTile label="Employment Type" value={employee.employeeType} />
                <EmpTile label="Years of Service" value={`${employee.yearsOfService} yrs`} />
                <EmpTile label="Status" value={employee.employeeStatus} />
              </div>
            )}
          </div>

          {/* Dynamic form */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {action.icon} {action.label}
                </h3>
                <p className="text-xs text-slate-500">{action.description}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {action.fields.length} field{action.fields.length === 1 ? "" : "s"}
              </span>
            </div>

            {Object.keys(groupedFields).length === 0 ? (
              <p className="text-xs italic text-slate-400">No fields required for this action.</p>
            ) : (
              Object.entries(groupedFields).map(([group, keys]) => (
                <div key={group} className="mb-4 last:mb-0">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {group}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {keys.map((k) => {
                      const meta = FIELD_META[k];
                      const v = getValue(k);
                      const autoFilled = values[k] === undefined && autoValues[k] !== undefined;
                      return (
                        <div key={k}>
                          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            {meta.label}
                            {autoFilled && (
                              <span className="rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-bold text-indigo-600">
                                auto
                              </span>
                            )}
                          </label>
                          {meta.type === "select" ? (
                            <select
                              value={v}
                              onChange={(e) => setValue(k, e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              {meta.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type={meta.type}
                              value={v}
                              onChange={(e) => setValue(k, e.target.value)}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div className="mt-4">
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Remarks / Justification
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Reason for this HR action (referenced in approval trail)..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Workflow action buttons — gated per active role */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div className={`text-[11px] font-semibold ${tone.text}`}>
              Acting as <span className="font-black">{caps.activeRoleName}</span>
              {stage === "draft" && !caps.canInitiate && (
                <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100">
                  Not permitted to initiate HR actions
                </span>
              )}
              {stage === "verified" && !caps.canReview && (
                <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100">
                  Reviewer role required (Finance Officer)
                </span>
              )}
              {stage === "approved" && !caps.canApprove && (
                <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100">
                  Approver role required (Head of Agency)
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => { setStage("draft"); setValues({}); setRemarks(""); }}
                disabled={!caps.canEditDraft && !caps.canInitiate}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  caps.canEditDraft || caps.canInitiate
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "cursor-not-allowed bg-slate-50 text-slate-300"
                }`}
              >
                Reset
              </button>
              {stage === "draft" && (
                <button
                  onClick={advanceStage}
                  disabled={!caps.canSubmit}
                  className={`rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md transition ${
                    caps.canSubmit
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 hover:brightness-110"
                      : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  Submit for Verification →
                </button>
              )}
              {stage === "verified" && (
                <button
                  onClick={advanceStage}
                  disabled={!caps.canReview}
                  className={`rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md transition ${
                    caps.canReview
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700 hover:brightness-110"
                      : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  Verify & Send to Approver →
                </button>
              )}
              {stage === "approved" && (
                <button
                  onClick={advanceStage}
                  disabled={!caps.canApprove && !caps.canPostMCP}
                  className={`rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md transition ${
                    caps.canApprove || caps.canPostMCP
                      ? "bg-gradient-to-br from-emerald-600 to-emerald-700 hover:brightness-110"
                      : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  Post to Payroll →
                </button>
              )}
              {stage === "posted" && (
                <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
                  ✓ Posted — record updated in payroll.employee_master
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmpTile({ label, value }: { label: string; value: string | number | undefined }) {
  const display = value === undefined || value === null || value === "" ? "—" : String(value);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold text-slate-800">{display}</div>
    </div>
  );
}

export default HrActionsPage;
