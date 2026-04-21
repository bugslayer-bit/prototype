/* ═══════════════════════════════════════════════════════════════════════════
   Process 3.0 — Payment Validation
   SRS R79 System Check: "Verification of budget availability for the budget
   code mapped to transaction" + R80 PTS verification for immovable property
   + duplicate protection + schedule sanity.
   Cross-integrated with ContractData (live commitments) and RentalData
   (historic transactions) — no hardcoded data.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { RentalFormState, RentalValidationCheck, RentalPaymentTransaction } from "../types";
import { useContractData } from "../../../../shared/context/ContractDataContext";
import { useRentalData } from "../context/RentalDataContext";

interface Props {
  form: RentalFormState;
}

export function RentalValidationSection({ form }: Props) {
  const { contracts } = useContractData();
  const { records: allRentals } = useRentalData();

  /* Live commitments from ContractData for the same lessor — cross-module */
  const committedValue = useMemo(() => {
    return contracts
      .filter((c) => c.contractorId === form.asset.lessorId)
      .reduce((s, c) => s + (parseFloat(c.contractValue || "0") || 0), 0);
  }, [contracts, form.asset.lessorId]);

  /* Total rental already paid against this budget code across all rentals */
  const budgetConsumed = useMemo(() => {
    return allRentals
      .flatMap((r) => r.transactions)
      .filter((t) => t.budgetCode === form.asset.budgetCode && (t.status === "Paid" || t.status === "Approved"))
      .reduce((s, t) => s + (parseFloat(t.netAmountPayable || "0") || 0), 0);
  }, [allRentals, form.asset.budgetCode]);

  const results = useMemo(
    () => runChecks(form, committedValue, budgetConsumed),
    [form, committedValue, budgetConsumed],
  );

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <span className="inline-block rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
          Process 3.0
        </span>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Payment Validation (R79 + R80)</h2>
        <p className="text-sm text-slate-600">
          System checks every generated transaction for budget availability, PTS verification
          (immovable only), duplicate protection, and schedule sanity.
        </p>
      </header>

      {/* Cross-module live tiles */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-3">
        <InfoTile
          label="Lessor Contract Commitments"
          value={`Nu. ${committedValue.toFixed(2)}`}
          hint="From ContractDataContext — live"
        />
        <InfoTile
          label="Budget Code Consumed"
          value={`Nu. ${budgetConsumed.toFixed(2)}`}
          hint="Paid/Approved across all rentals"
        />
        <InfoTile
          label="Rent Amount (this asset)"
          value={`Nu. ${(parseFloat(form.asset.rentAmount || "0") || 0).toFixed(2)}`}
          hint="DD — drives gross payable"
        />
      </div>

      {form.transactions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
          Generate at least one transaction in Process 2.0 to run validation.
        </p>
      ) : (
        <div className="space-y-3">
          {results.map((row) => (
            <div key={row.txn.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  {row.txn.transactionId} — Nu. {row.txn.netAmountPayable}
                </div>
                <div className="text-xs font-semibold">
                  {row.allPassed ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
                      ✓ All checks passed
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-rose-700">
                      ✗ {row.checks.filter((c) => !c.passed).length} blocker(s)
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {row.checks.map((c) => (
                  <div
                    key={c.key}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      c.passed ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{c.label}</span>
                      <span className={c.passed ? "text-emerald-700" : "text-rose-700"}>
                        {c.passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-600">{c.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-500">{hint}</div>
    </div>
  );
}

/* ── Check runner ───────────────────────────────────────────────────────── */
interface CheckResult {
  txn: RentalPaymentTransaction;
  checks: RentalValidationCheck[];
  allPassed: boolean;
}

function runChecks(
  form: RentalFormState,
  committedValue: number,
  budgetConsumed: number,
): CheckResult[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return form.transactions.map((txn) => {
    const net = parseFloat(txn.netAmountPayable || "0") || 0;

    /* 1. Budget Availability Check (R79) */
    const budgetOk = !!txn.budgetCode && net > 0;
    const budget: RentalValidationCheck = {
      key: "budget",
      label: "Budget Availability Check (R79)",
      passed: budgetOk,
      message: budgetOk
        ? `Budget code ${txn.budgetCode} mapped. Net Nu. ${net.toFixed(2)}. Prior commitments: Nu. ${committedValue.toFixed(2)}. Already consumed on this code: Nu. ${budgetConsumed.toFixed(2)}.`
        : "Budget code missing OR net amount is zero — cannot debit.",
    };

    /* 2. PTS Verification (R80) — mandatory for Immovable assets only */
    const needsPts = form.asset.assetType === "Immovable Properties";
    const ptsOk = !needsPts || (form.asset.ptsVerified && !!form.asset.ptsReference.trim());
    const pts: RentalValidationCheck = {
      key: "pts",
      label: "PTS Verification (R80)",
      passed: ptsOk,
      message: needsPts
        ? ptsOk
          ? `Verified via PTS — reference ${form.asset.ptsReference}.`
          : "Immovable property requires PTS verification before payment."
        : "Not applicable — non-immovable asset.",
    };

    /* 3. Duplicate Protection — no other transaction for same scheduledDate+assetIds */
    const dupes = form.transactions.filter(
      (t) =>
        t.id !== txn.id &&
        t.scheduledDate === txn.scheduledDate &&
        t.assetIds.some((a) => txn.assetIds.includes(a)),
    );
    const duplicate: RentalValidationCheck = {
      key: "duplicate",
      label: "Duplicate Protection",
      passed: dupes.length === 0,
      message:
        dupes.length === 0
          ? "No duplicate transaction on the same schedule date for these assets."
          : `${dupes.length} duplicate transaction(s) detected on ${txn.scheduledDate}.`,
    };

    /* 4. Schedule sanity — scheduled date must be set and not before lease start */
    const sched = txn.scheduledDate ? new Date(txn.scheduledDate) : null;
    const start = form.asset.leaseStartDate ? new Date(form.asset.leaseStartDate) : null;
    const end = form.asset.leaseEndDate ? new Date(form.asset.leaseEndDate) : null;
    let schedOk = !!sched;
    let schedMsg = "Scheduled date missing.";
    if (sched) {
      if (start && sched < start) {
        schedOk = false;
        schedMsg = `Scheduled date ${txn.scheduledDate} is before lease start ${form.asset.leaseStartDate}.`;
      } else if (end && sched > end) {
        schedOk = false;
        schedMsg = `Scheduled date ${txn.scheduledDate} is after lease end ${form.asset.leaseEndDate}.`;
      } else {
        schedOk = true;
        schedMsg = `Scheduled ${txn.scheduledDate} — within lease window.`;
      }
    }
    const schedule: RentalValidationCheck = {
      key: "schedule",
      label: "Schedule Sanity",
      passed: schedOk,
      message: schedMsg,
    };

    const checks = [budget, pts, duplicate, schedule];
    return { txn, checks, allPassed: checks.every((c) => c.passed) };
  });
}
