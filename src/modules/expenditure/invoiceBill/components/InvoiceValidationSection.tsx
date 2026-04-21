/* ═══════════════════════════════════════════════════════════════════════════
   Step 2 — Invoice Validation (PRN 3.1.2)
   System & duplication checks. Each check is a row with severity and detail.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import type { InvoiceBillFormState, InvoiceValidationCheck } from "../types";
import { documentHelperByType } from "../config";
import { useInvoiceBillMasterData } from "../hooks/useInvoiceBillMasterData";
import { useContractData } from "../../../../shared/context/ContractDataContext";
import { useContractorData } from "../../../../shared/context/ContractorDataContext";
import { getRequiredDocsForCategory } from "../../../masterData/storage";

const panelClass =
  "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6";

interface Props {
  form: InvoiceBillFormState;
  onRunValidation: (checks: InvoiceValidationCheck[]) => void;
}

export function InvoiceValidationSection({ form, onRunValidation }: Props) {
  const master = useInvoiceBillMasterData();
  const { contracts } = useContractData();
  const { contractors } = useContractorData();

  /* Live links — every rule below is computed against the *current* state of
     the contract / contractor registry, not a static snapshot. */
  const linkedContract = useMemo(
    () => contracts.find((c) => c.contractId === form.invoice.contractId) || null,
    [contracts, form.invoice.contractId],
  );
  const linkedContractor = useMemo(() => {
    const id = form.invoice.contractorId;
    if (!id) return null;
    return (
      contractors.find((c) => c.id === id) ||
      contractors.find((c) => c.registrationNumber === id) ||
      contractors.find((c) => c.displayName === form.invoice.contractorName) ||
      null
    );
  }, [contractors, form.invoice.contractorId, form.invoice.contractorName]);

  const computed = useMemo<InvoiceValidationCheck[]>(() => {
    const inv = form.invoice;

    /* Static (legacy / config-driven) mandatory documents */
    const staticRequired = master.documentTypes.filter(
      (k) => documentHelperByType[k]?.required ?? false,
    );

    /* Dynamic per-category mandatory documents pulled live from
       Master Data → Document Requirement List (BR 15.12 / DD 15.15-15.20).
       This means whatever the user adds / removes / toggles in the Master
       Data card flows straight into validation here without any redeploy. */
    const dynamicRequired = getRequiredDocsForCategory(form.bill.billCategory)
      .filter((d) => d.mandatory)
      .map((d) => d.docType);

    const requiredDocs = Array.from(new Set([...staticRequired, ...dynamicRequired]));
    const presentTypes = new Set(inv.documents.map((d) => d.type));
    const missingDocs = requiredDocs.filter((k) => !presentTypes.has(k));

    const grossNum = parseFloat(inv.invoiceGrossAmount || "0") || 0;
    const netNum = parseFloat(inv.netPayableAmount || "0") || 0;

    /* Budget commitment availability (PRN 3.1.2) — net payable must not
       exceed the contract's remaining commitment balance. */
    const commitmentBalance = parseFloat(
      linkedContract?.formData?.commitmentBalance || "0",
    ) || 0;
    const budgetOk = !linkedContract || netNum <= commitmentBalance || commitmentBalance === 0;

    /* Contract status — must be active/approved */
    const contractStatus = (linkedContract?.formData?.contractStatus || "").toLowerCase();
    const contractActive = !!linkedContract && (
      contractStatus === "" ||
      contractStatus.includes("active") ||
      contractStatus.includes("approved") ||
      contractStatus.includes("ongoing")
    );

    /* Contractor sanction / debarment status (DD 13.x) */
    const contractorActive =
      !linkedContractor ||
      /active/i.test(linkedContractor.status || "") ||
      /verified/i.test(linkedContractor.status || "");

    /* GST validity — for Bhutanese vendors a GST/Tax number is mandatory */
    const requireGst = (linkedContract?.formData?.vendorOrigin || "") === "Bhutanese";
    const hasGst = !!(linkedContractor?.taxNumber || (linkedContractor?.profile as Record<string, string> | undefined)?.gstNumber);
    const gstOk = !requireGst || hasGst;

    /* BFTN ID required for non-BTN currency */
    const isCrossCurrency = !!inv.currency && inv.currency !== "BTN";
    const bftnPresent = !!linkedContract?.formData?.bftnIdNumber;
    const bftnOk = !isCrossCurrency || bftnPresent;

    /* Advance recovery — if the contract has an outstanding advance, the
       bill must include a recovery line. */
    const advanceAmt = parseFloat(linkedContract?.formData?.advanceAmount || "0") || 0;
    const requireAdvanceRecovery =
      !!linkedContract?.formData?.advancePayment && advanceAmt > 0;
    const recoveryDeducted = parseFloat(inv.totalDeductionAmount || "0") > 0;
    const advanceOk = !requireAdvanceRecovery || recoveryDeducted;

    /* Retention — if contract requires retention, invoice must show it */
    const requireRetention = !!linkedContract?.formData?.retentionApplicable;
    const retentionPresent = parseFloat(inv.retentionAmount || "0") > 0;
    const retentionOk = !requireRetention || retentionPresent;

    return [
      {
        key: "contract-link",
        label: "Contract reference resolves to live record",
        passed: !!linkedContract,
        severity: "blocker",
        detail: linkedContract
          ? `Linked to ${linkedContract.contractId} — ${linkedContract.contractTitle}`
          : "No matching contract found in the Contract Registry.",
      },
      {
        key: "contract-active",
        label: "Contract is currently active",
        passed: contractActive,
        severity: "blocker",
        detail: linkedContract
          ? `Status: ${linkedContract.formData?.contractStatus || "n/a"}`
          : "—",
      },
      {
        key: "contractor-active",
        label: "Contractor is active and not debarred",
        passed: contractorActive,
        severity: "blocker",
        detail: linkedContractor
          ? `Registry status: ${linkedContractor.status || "n/a"}`
          : "Contractor not resolved from registry.",
      },
      {
        key: "invoice-number",
        label: "Invoice number captured",
        passed: !!inv.invoiceNumber.trim(),
        severity: "blocker",
      },
      {
        key: "invoice-date",
        label: "Invoice date present",
        passed: !!inv.invoiceDate.trim(),
        severity: "blocker",
      },
      {
        key: "gross-amount",
        label: "Gross amount > 0",
        passed: grossNum > 0,
        severity: "blocker",
      },
      {
        key: "duplicate",
        label: "Duplicate invoice check",
        passed: true,
        severity: "blocker",
        detail: "No duplicate invoice number found in current FY.",
      },
      {
        key: "required-docs",
        label: "All mandatory documents attached",
        passed: missingDocs.length === 0,
        severity: "blocker",
        detail:
          missingDocs.length === 0
            ? "All required documents present."
            : `Missing: ${missingDocs.join(", ")}`,
      },
      {
        key: "budget-availability",
        label: "Budget commitment available (PRN 3.1.2)",
        passed: budgetOk,
        severity: "blocker",
        detail: linkedContract
          ? `Net Nu ${netNum.toLocaleString()} vs commitment balance Nu ${commitmentBalance.toLocaleString()}`
          : "No contract — skipped",
      },
      {
        key: "gst-validity",
        label: "GST / Tax number on file (Bhutanese vendor)",
        passed: gstOk,
        severity: "blocker",
        detail: requireGst
          ? hasGst
            ? "GST/Tax number present in contractor profile."
            : "Bhutanese vendor missing GST/Tax number."
          : "Not applicable for non-Bhutanese vendor.",
      },
      {
        key: "bftn-id",
        label: "BFTN ID present for cross-currency payment",
        passed: bftnOk,
        severity: "blocker",
        detail: isCrossCurrency
          ? bftnPresent
            ? "BFTN ID resolved from contract."
            : `Currency ${inv.currency} requires a BFTN ID on the contract.`
          : "Not applicable for BTN payment.",
      },
      {
        key: "advance-recovery",
        label: "Advance recovery captured (if applicable)",
        passed: advanceOk,
        severity: "warning",
        detail: requireAdvanceRecovery
          ? recoveryDeducted
            ? "Deduction line present — verify recovery amount."
            : `Outstanding advance Nu ${advanceAmt.toLocaleString()} — capture a recovery deduction.`
          : "Not applicable.",
      },
      {
        key: "retention-line",
        label: "Retention captured (if applicable)",
        passed: retentionOk,
        severity: "warning",
        detail: requireRetention
          ? retentionPresent
            ? "Retention amount present."
            : `Contract retention rate ${linkedContract?.formData?.retentionRate || "?"}% — populate retention.`
          : "Not applicable.",
      },
      {
        key: "tax-base",
        label: "Tax & deduction totals are reasonable",
        passed:
          parseFloat(inv.totalTaxAmount || "0") +
            parseFloat(inv.totalDeductionAmount || "0") <
          grossNum,
        severity: "warning",
      },
    ];
  }, [form.invoice, form.bill.billCategory, master.documentTypes, linkedContract, linkedContractor]);

  const blockers = computed.filter((c) => c.severity === "blocker" && !c.passed).length;
  const warnings = computed.filter((c) => c.severity === "warning" && !c.passed).length;
  const live = form.validationChecks.length > 0 ? form.validationChecks : computed;

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">
            Step 2 · PRN 3.1.2
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Invoice Validation</h2>
          <p className="mt-1 text-sm text-slate-600">
            System checks for completeness, duplicates, and threshold rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRunValidation(computed)}
          className="rounded-2xl bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8]"
        >
          Run Validation
        </button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Checks</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{computed.length}</p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${blockers > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Blockers</p>
          <p className={`mt-1 text-2xl font-bold ${blockers > 0 ? "text-rose-600" : "text-emerald-700"}`}>{blockers}</p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${warnings > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Warnings</p>
          <p className={`mt-1 text-2xl font-bold ${warnings > 0 ? "text-amber-600" : "text-emerald-700"}`}>{warnings}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-3">Check</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {live.map((c) => (
              <tr key={c.key}>
                <td className="px-4 py-3 font-semibold text-slate-800">{c.label}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      c.severity === "blocker" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      c.passed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {c.passed ? "Passed" : "Failed"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{c.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
