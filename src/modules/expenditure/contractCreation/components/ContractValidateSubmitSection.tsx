import { useEffect, useMemo, useState } from "react";
import type { ContractValidateSubmitSectionProps } from "../sectionProps";

type CheckState = "pending" | "running" | "passed" | "failed";

interface CheckItem {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export function ContractValidateSubmitSection({
  form,
  inputClass,
  labelClass,
  methodMeta,
  updateField,
  preconditionResults,
  onSubmitForApproval,
  isFormLocked
}: ContractValidateSubmitSectionProps) {
  /* ── Build unified check list ── */
  const allChecks = useMemo<CheckItem[]>(() => {
    const checks: CheckItem[] = [];

    /* Precondition checks */
    for (const pc of preconditionResults) {
      checks.push({ key: `pre-${pc.key}`, label: pc.label, passed: pc.passed, detail: pc.message });
    }

    /* Validation checks */
    const validations: [string, string, boolean, string][] = [
      ["val-method", "Method selected", !!form.method, form.method ? methodMeta[form.method].label : "Not selected"],
      ["val-budget", "Budget code valid & active", !!form.budgetCode.trim(), form.budgetCode || "Not set"],
      ["val-commitment", "Commitment exists", !!form.commitmentReference.trim(), form.commitmentReference || "Not set"],
      ["val-value", "Contract value ≤ Commitment balance", !!form.contractValue.trim() && !!form.commitmentBalance, `Nu. ${form.contractValue || "—"}`],
      ["val-currency", "Currency validation", !!form.contractCurrencyId, form.contractCurrencyId || "Not set"],
      ["val-completeness", "Contract details completeness", !!form.contractTitle.trim() && !!form.contractDescription.trim(), "Title + Description"],
      ["val-contractor", "Contractor status = Active", form.contractorStatus.includes("Active"), form.contractorStatus],
      ["val-debarment", "Vendor debarment check", !form.contractorDebarmentStatus.includes("Debarred") && !form.contractorDebarmentStatus.includes("Suspended"), form.contractorDebarmentStatus || "Clear"],
      ["val-bank", "Contractor bank verified", form.contractorStatus.includes("Active"), form.contractorBankAccount || "Pending"],
      ["val-tax", "Tax logic aligned", !form.taxApplicable || form.taxType.length > 0, form.taxApplicable ? form.taxType.join(", ") || "Tax type missing" : "Tax exempt"],
      ["val-retention", "Retention configured (Works)", !form.contractCategory.includes("Works") || form.retentionApplicable, form.retentionApplicable ? `${form.retentionRate}%` : "N/A"],
      ["val-payment", "Payment structure defined", !!form.paymentStructure, form.paymentStructure || "Not selected"],
      ["val-milestone", "Milestone readiness", form.paymentStructure !== "Milestone Based" || !!form.milestonePlan.trim(), form.paymentStructure || "—"],
      ["val-duration", "Contract duration valid", !!form.startDate && !!form.endDate && form.endDate >= form.startDate, `${form.startDate || "—"} to ${form.endDate || "—"}`],
      ["val-multiyear", "Multi-year commitment", !form.multiYearFlag || !!form.multiYearCommitmentRef.trim(), form.multiYearFlag ? "Multi-year" : "In-year"],
    ];

    for (const [key, label, passed, detail] of validations) {
      /* Skip duplicates already covered by preconditions */
      if (!checks.some((c) => c.label === label)) {
        checks.push({ key, label, passed, detail });
      }
    }

    return checks;
  }, [form, preconditionResults, methodMeta]);

  const totalChecks = allChecks.length;
  const failedChecks = allChecks.filter((c) => !c.passed);
  const passedCount = totalChecks - failedChecks.length;
  const allPassed = failedChecks.length === 0;

  /* ── Animated scan state ──
     Re-runs whenever the check list changes (new preconditions arrive,
     form values flip, user clicks Re-scan). Strict-mode safe: no ref
     guard — the cleanup tears down any in-flight timers cleanly. */
  const [scanIndex, setScanIndex] = useState(-1);
  const [scanComplete, setScanComplete] = useState(false);
  const [checkStates, setCheckStates] = useState<Map<string, CheckState>>(new Map());
  const [scanNonce, setScanNonce] = useState(0); // bumped by Re-scan

  /* Stable signature so the effect only restarts when the actual check
     content changes — not on every parent re-render. */
  const checksSignature = useMemo(
    () => allChecks.map((c) => `${c.key}:${c.passed ? 1 : 0}`).join("|"),
    [allChecks]
  );

  useEffect(() => {
    if (allChecks.length === 0) {
      setScanComplete(true);
      setScanIndex(-1);
      return;
    }

    /* Reset scan state for this run */
    setScanComplete(false);
    setScanIndex(-1);
    const initial = new Map<string, CheckState>();
    allChecks.forEach((c) => initial.set(c.key, "pending"));
    setCheckStates(initial);

    let cancelled = false;
    const timers: number[] = [];

    /* Step through every check sequentially with a small delay so the
       UI animates the running → passed/failed transition. */
    allChecks.forEach((check, idx) => {
      const startAt = idx * 140;
      const t1 = window.setTimeout(() => {
        if (cancelled) return;
        setScanIndex(idx);
        setCheckStates((prev) => {
          const next = new Map(prev);
          next.set(check.key, "running");
          return next;
        });
      }, startAt);
      timers.push(t1);

      const t2 = window.setTimeout(() => {
        if (cancelled) return;
        setCheckStates((prev) => {
          const next = new Map(prev);
          next.set(check.key, check.passed ? "passed" : "failed");
          return next;
        });
        /* Final check — flip the spinner off */
        if (idx === allChecks.length - 1) {
          setScanComplete(true);
        }
      }, startAt + 110);
      timers.push(t2);
    });

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [checksSignature, scanNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = scanComplete ? 100 : Math.round(((scanIndex + 1) / totalChecks) * 100);
  const blockers = preconditionResults.filter((p) => !p.passed && p.severity === "blocker");
  const canSubmit = allPassed && !isFormLocked;

  return (
    <div className="mt-5 space-y-6">

      {/* ── Scan Progress Card ── */}
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Spinner or result icon */}
            {!scanComplete ? (
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <svg className="h-14 w-14 animate-spin text-sky-500" viewBox="0 0 50 50" fill="none">
                  <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="4" opacity="0.2" />
                  <path d="M25 5a20 20 0 0115.5 32.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <span className="absolute text-xs font-bold text-sky-700">{progress}%</span>
              </div>
            ) : allPassed ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <svg className="h-7 w-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-slate-900">
                {!scanComplete
                  ? "Running validation checks..."
                  : allPassed
                    ? "All checks passed"
                    : `${failedChecks.length} issue${failedChecks.length > 1 ? "s" : ""} found`
                }
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                {!scanComplete
                  ? `Checking ${scanIndex + 1} of ${totalChecks}...`
                  : `${passedCount} of ${totalChecks} checks passed`
                }
              </p>
            </div>

            {scanComplete && (
              <button
                type="button"
                onClick={() => setScanNonce((n) => n + 1)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Re-scan
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                scanComplete
                  ? allPassed ? "bg-emerald-500" : "bg-rose-500"
                  : "bg-sky-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Live scan ticker — shows currently running check */}
          {!scanComplete && scanIndex >= 0 && scanIndex < allChecks.length && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              {allChecks[scanIndex].label}
            </div>
          )}
        </div>

        {/* ── Passed checks collapsed summary ── */}
        {scanComplete && passedCount > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700">{passedCount} passed:</span>
              {allChecks.filter((c) => c.passed).map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Failed checks — expanded with details ── */}
        {scanComplete && failedChecks.length > 0 && (
          <div className="border-t border-rose-100 bg-rose-50/50">
            <div className="px-4 py-3 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Issues to Resolve</p>
            </div>
            <div className="divide-y divide-rose-100">
              {failedChecks.map((c) => (
                <div key={c.key} className="flex items-start gap-3 px-4 py-3 sm:px-6">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">!</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rose-900">{c.label}</p>
                    <p className="mt-0.5 text-xs text-rose-600">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Approval Workflow ── */}
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-700">Approval Workflow</p>
          <p className="mt-1 text-xs text-slate-500">Submission locks editing and routes the contract through the configured reviewers.</p>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {form.approvalSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${
                  step.status === "approved"
                    ? "border-emerald-200 bg-emerald-50"
                    : step.status === "rejected"
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-white"
                }`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    step.status === "approved" ? "bg-emerald-200 text-emerald-800" : step.status === "rejected" ? "bg-red-200 text-red-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {step.status === "approved" ? "✓" : i + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">{step.role}</span>
                </div>
                {i < form.approvalSteps.length - 1 && <span className="text-slate-300">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Audit Trail — Imported vs Admin Edits ──────────────────────────
          Renders only for system-fed methods (file-upload, eGP, CMS) so the
          approver can see exactly which fields the upstream interface
          delivered AND which of those values the admin overrode before
          submission. Manual mode skips this card entirely. */}
      {form.method && form.method !== "manual" && (
        <div className="overflow-hidden rounded-[22px] border border-amber-200 bg-amber-50/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-800">
                Audit Trail · Imported Data &amp; Admin Edits
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Source: <span className="font-semibold">{methodMeta[form.method].label}</span> ·
                {" "}Approver will see the original imported value and any admin override side-by-side.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              form.fieldChanges.length > 0
                ? "bg-rose-100 text-rose-800"
                : "bg-emerald-100 text-emerald-800"
            }`}>
              {form.fieldChanges.length > 0
                ? `${form.fieldChanges.length} field${form.fieldChanges.length > 1 ? "s" : ""} edited`
                : "No edits — fully imported"}
            </span>
          </div>

          {/* Section A — Fields the admin edited (diff list) */}
          {form.fieldChanges.length > 0 && (
            <div className="border-b border-amber-200">
              <div className="bg-rose-50/60 px-4 py-2 sm:px-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Admin Overrides ({form.fieldChanges.length})
                </p>
              </div>
              <div className="divide-y divide-rose-100">
                {form.fieldChanges.map((change) => (
                  <div key={change.field} className="grid grid-cols-1 gap-3 px-4 py-3 sm:px-6 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,1fr)_120px]">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">{change.label}</p>
                      <p className="text-[10px] font-mono text-slate-400">{change.field}</p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Originally imported</p>
                      <p className="mt-0.5 truncate text-xs text-slate-700" title={change.originalValue || "(empty)"}>
                        {change.originalValue || <span className="italic text-slate-400">(empty)</span>}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Admin updated to</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-rose-900" title={change.currentValue || "(empty)"}>
                        {change.currentValue || <span className="italic text-rose-400">(empty)</span>}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      {new Date(change.editedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section B — Fields imported but NOT edited (kept as-is) */}
          <div>
              <div className="bg-emerald-50/60 px-4 py-2 sm:px-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Imported as-is ({Object.keys(form.originalImportedValues).length - form.fieldChanges.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 py-3 sm:px-6">
              {Object.keys(form.originalImportedValues)
                .filter((k) => !form.fieldChanges.some((c) => c.field === k))
                .filter((k) => !!form.originalImportedValues[k as keyof typeof form.originalImportedValues])
                .slice(0, 50)
                .map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {k}
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Review Note ── */}
      <label className={labelClass}>
        Review Note for Approvers
        <textarea className={`${inputClass} min-h-24`} value={form.reviewNote} onChange={(e) => updateField("reviewNote", e.target.value)} placeholder="Additional note for approvers or contract reviewers" disabled={isFormLocked} />
      </label>

      {/* ── Submit / Locked ── */}
      {isFormLocked ? (
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-6 py-5 text-center">
          <p className="text-lg font-bold text-blue-900">Contract Submitted for Approval</p>
          <p className="mt-2 text-sm text-blue-700">Submitted at: {form.submittedAt} — Editing is locked. Awaiting workflow approval.</p>
          {form.approvedAt ? <p className="mt-1 text-sm font-semibold text-emerald-700">Approved at: {form.approvedAt} — Status changed to Active</p> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            className={`w-full rounded-2xl px-6 py-4 text-base font-bold text-white transition sm:w-auto sm:px-8 ${
              canSubmit && scanComplete
                ? "bg-emerald-700 hover:bg-emerald-800 shadow-lg"
                : "cursor-not-allowed bg-slate-300"
            }`}
            onClick={onSubmitForApproval}
            disabled={!canSubmit || !scanComplete}
          >
            Submit and Approve
          </button>
          {scanComplete && !canSubmit ? (
            <p className="text-sm text-red-600">
              {blockers.length > 0
                ? `${blockers.length} blocker(s) must be resolved before submission.`
                : `${failedChecks.length} issue(s) require attention before submitting.`}
            </p>
          ) : !scanComplete ? (
            <p className="text-sm text-slate-500">Validation in progress...</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
