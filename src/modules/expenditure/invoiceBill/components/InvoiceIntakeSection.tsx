/* ═══════════════════════════════════════════════════════════════════════════
   Step 1 — Invoice Intake (PRN 3.1.1)
   Captures the SRS Invoice Header (15.1 → 15.20) and supporting documents.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import type { InvoiceBillFormState, InvoiceDocument } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { documentHelperByType } from "../config";
import { useInvoiceBillMasterData } from "../hooks/useInvoiceBillMasterData";
import { useContractData } from "../../../../shared/context/ContractDataContext";
import { useContractorData } from "../../../../shared/context/ContractorDataContext";
import type { ContactRow } from "../../../contractor/registration/stages/sharedTypes";
import type { ContractorRecord } from "../../../../shared/types";

/* Pull the contacts list out of a ContractorRecord.profile (it can be stored
   either as an array or a JSON string depending on how the record was saved). */
function parseContractorContacts(rec: ContractorRecord | undefined): ContactRow[] {
  if (!rec) return [];
  try {
    const raw = (rec.profile as Record<string, unknown> | undefined)?.contacts;
    if (Array.isArray(raw)) return raw as ContactRow[];
    if (typeof raw === "string") return JSON.parse(raw) as ContactRow[];
  } catch {
    /* ignore — return empty list below */
  }
  return [];
}

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
const labelClass = "block text-sm font-semibold text-slate-800";
const lockedInputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 outline-none";

interface Props {
  form: InvoiceBillFormState;
  onInvoiceField: <K extends keyof InvoiceBillFormState["invoice"]>(
    key: K,
    value: InvoiceBillFormState["invoice"][K],
  ) => void;
  onAddDocument: (doc: InvoiceDocument) => void;
  onRemoveDocument: (id: string) => void;
}

export function InvoiceIntakeSection({ form, onInvoiceField, onAddDocument, onRemoveDocument }: Props) {
  const inv = form.invoice;
  const master = useInvoiceBillMasterData();
  const { contracts } = useContractData();
  const { contractors } = useContractorData();
  const [pendingDocDelete, setPendingDocDelete] = useState<InvoiceDocument | null>(null);

  /* Approved / active contracts only — these are the ones eligible for invoicing.
     Falls back to "all" if nothing matches so the dropdown is never empty. */
  const eligibleContracts = useMemo(() => {
    const approved = contracts.filter(
      (c) => c.workflowStatus === "approved" || c.contractStatus?.toLowerCase() === "active",
    );
    return approved.length > 0 ? approved : contracts;
  }, [contracts]);

  const linkedContract = useMemo(
    () => contracts.find((c) => c.contractId === inv.contractId),
    [contracts, inv.contractId],
  );

  /* Resolve the *live* ContractorRecord by matching on either the canonical
     contractor ID stored on the contract, or the contractor display name as a
     last-resort fallback. This guarantees the invoice always reflects the
     latest contractor profile (bank, GST #, contacts) — not a stale snapshot. */
  const linkedContractor = useMemo(() => {
    if (!linkedContract) return undefined;
    const cid = linkedContract.contractorId;
    const cname = linkedContract.contractorName;
    return (
      contractors.find((c) => c.id === cid) ||
      contractors.find((c) => c.registrationNumber === cid) ||
      contractors.find((c) => c.displayName === cname)
    );
  }, [linkedContract, contractors]);

  /* Contact persons (DD 12.x) belonging to the linked contractor. */
  const linkedContacts = useMemo(
    () => parseContractorContacts(linkedContractor),
    [linkedContractor],
  );

  /* Milestones from the linked contract — feeds the 15.3 dropdown. */
  const linkedMilestones = useMemo(
    () => linkedContract?.formData?.milestoneRows ?? [],
    [linkedContract],
  );

  const handleContractSelect = (contractId: string) => {
    const c = contracts.find((row) => row.contractId === contractId);
    if (!c) {
      onInvoiceField("contractId", contractId);
      return;
    }
    /* Resolve the live contractor record so we can prefer its current name
       over whatever stale value was on the contract snapshot. */
    const liveContractor =
      contractors.find((row) => row.id === c.contractorId) ||
      contractors.find((row) => row.displayName === c.contractorName);

    onInvoiceField("contractId", c.contractId);
    onInvoiceField("contractorId", liveContractor?.id || c.contractorId || "");
    onInvoiceField("contractorName", liveContractor?.displayName || c.contractorName || "");
    onInvoiceField("agencyName", c.agencyName || "");
    if (c.formData?.contractCurrencyId) {
      onInvoiceField("currency", c.formData.contractCurrencyId);
    }
    if (!inv.invoiceGrossAmount && c.contractValue) {
      onInvoiceField("invoiceGrossAmount", c.contractValue);
    }
    /* Reset linked sub-records — admin must pick a milestone & a contact. */
    onInvoiceField("milestoneId", "");
    onInvoiceField("contactId", "");
    onInvoiceField("contactName", "");
  };

  const handleContactSelect = (contactId: string) => {
    onInvoiceField("contactId", contactId);
    const ct = linkedContacts.find((row) => row.contactId === contactId);
    if (ct) {
      const fullName = [ct.salutation, ct.firstName, ct.middleName, ct.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      onInvoiceField("contactName", fullName);
    } else {
      onInvoiceField("contactName", "");
    }
  };

  const calculatedNet = useMemo(() => {
    const gross = parseFloat(inv.invoiceGrossAmount || "0") || 0;
    const tax = parseFloat(inv.totalTaxAmount || "0") || 0;
    const ret = parseFloat(inv.retentionAmount || "0") || 0;
    const ded = parseFloat(inv.totalDeductionAmount || "0") || 0;
    return Math.max(0, gross - tax - ret - ded);
  }, [inv.invoiceGrossAmount, inv.totalTaxAmount, inv.retentionAmount, inv.totalDeductionAmount]);

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            Step 1 · PRN 3.1.1
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Invoice Intake</h2>
          <p className="mt-1 text-sm text-slate-600">
            Capture the invoice header and attach supporting documents (DD 15.1 → 15.20).
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Payable (auto)</p>
          <p className="text-lg font-bold text-slate-900">{calculatedNet.toLocaleString()} {inv.currency}</p>
        </div>
      </header>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass}>15.1 Invoice ID</label>
          <input className={lockedInputClass} value={inv.invoiceId || "Auto on save"} readOnly />
        </div>
        <div>
          <label className={labelClass}>15.2 Contract ID *</label>
          <select
            className={inputClass}
            value={inv.contractId}
            onChange={(e) => handleContractSelect(e.target.value)}
          >
            <option value="">— Select an approved contract —</option>
            {eligibleContracts.map((c) => (
              <option key={c.id} value={c.contractId}>
                {c.contractId} · {c.contractTitle || c.contractorName || "(untitled)"}
              </option>
            ))}
          </select>
          {linkedContract && (
            <p className="mt-1 text-[11px] text-emerald-700">
              ✓ Linked: {linkedContract.contractTitle || "—"} · Value{" "}
              {Number(linkedContract.contractValue || 0).toLocaleString()} · Category{" "}
              {(linkedContract.contractCategory || []).join(", ") || "—"}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>15.3 Milestone ID</label>
          {linkedMilestones.length > 0 ? (
            <select
              className={inputClass}
              value={inv.milestoneId}
              onChange={(e) => {
                onInvoiceField("milestoneId", e.target.value);
                /* Auto-fill the gross amount from the milestone if it has one */
                const ms = linkedMilestones.find((m) => m.milestoneId === e.target.value);
                if (ms?.milestoneAmountGross) {
                  onInvoiceField("invoiceGrossAmount", ms.milestoneAmountGross);
                }
              }}
            >
              <option value="">— Select milestone —</option>
              {linkedMilestones.map((m) => (
                <option key={m.id} value={m.milestoneId}>
                  {m.milestoneId} · {m.milestoneName || m.milestoneNumber}
                  {m.milestoneAmountGross ? ` · ${Number(m.milestoneAmountGross).toLocaleString()}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={linkedContract ? lockedInputClass : inputClass}
              value={inv.milestoneId}
              onChange={(e) => onInvoiceField("milestoneId", e.target.value)}
              placeholder={linkedContract ? "Contract has no milestones defined" : "Pick a contract first"}
              disabled={!!linkedContract}
            />
          )}
        </div>
        <div>
          <label className={labelClass}>15.4 Invoice Number *</label>
          <input
            className={inputClass}
            value={inv.invoiceNumber}
            onChange={(e) => onInvoiceField("invoiceNumber", e.target.value)}
            placeholder="VEN-2026-0419"
          />
        </div>
        <div>
          <label className={labelClass}>15.5 Invoice Date *</label>
          <input
            className={inputClass}
            value={inv.invoiceDate}
            onChange={(e) => onInvoiceField("invoiceDate", e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        </div>
        <div>
          <label className={labelClass}>15.13 Currency</label>
          <select
            className={inputClass}
            value={inv.currency}
            onChange={(e) => onInvoiceField("currency", e.target.value)}
          >
            {master.currency.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>15.6 Invoice Gross Amount *</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={inv.invoiceGrossAmount}
            onChange={(e) => onInvoiceField("invoiceGrossAmount", e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>15.7 Total Tax Amount</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={inv.totalTaxAmount}
            onChange={(e) => onInvoiceField("totalTaxAmount", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>15.8 Retention Amount</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={inv.retentionAmount}
            onChange={(e) => onInvoiceField("retentionAmount", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>15.9 Total Deductions</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={inv.totalDeductionAmount}
            onChange={(e) => onInvoiceField("totalDeductionAmount", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>15.11 Net Payable Amount</label>
          <input className={lockedInputClass} value={calculatedNet.toString()} readOnly />
        </div>
        <div>
          <label className={labelClass}>15.10 Document Type</label>
          <input
            className={inputClass}
            value={inv.documentType}
            onChange={(e) => onInvoiceField("documentType", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>15.12 Invoice Status</label>
          <select
            className={inputClass}
            value={inv.invoiceStatus}
            onChange={(e) => onInvoiceField("invoiceStatus", e.target.value)}
          >
            {master.invoiceStatus.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>15.14 Submission Channel</label>
          <select
            className={inputClass}
            value={inv.submissionChannel}
            onChange={(e) => onInvoiceField("submissionChannel", e.target.value)}
          >
            {master.submissionChannel.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Contractor Name {linkedContract && <span className="ml-1 text-[10px] font-normal text-emerald-600">· from contract</span>}
          </label>
          <input
            className={linkedContract ? lockedInputClass : inputClass}
            value={inv.contractorName}
            onChange={(e) => onInvoiceField("contractorName", e.target.value)}
            readOnly={!!linkedContract}
          />
        </div>
        <div>
          <label className={labelClass}>
            Contractor ID {linkedContract && <span className="ml-1 text-[10px] font-normal text-emerald-600">· from contract</span>}
          </label>
          <input
            className={linkedContract ? lockedInputClass : inputClass}
            value={inv.contractorId}
            onChange={(e) => onInvoiceField("contractorId", e.target.value)}
            readOnly={!!linkedContract}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass}>
            Agency Name {linkedContract && <span className="ml-1 text-[10px] font-normal text-emerald-600">· from contract</span>}
          </label>
          <input
            className={linkedContract ? lockedInputClass : inputClass}
            value={inv.agencyName}
            onChange={(e) => onInvoiceField("agencyName", e.target.value)}
            readOnly={!!linkedContract}
          />
        </div>

        {/* DD 12.x — Contact person from the linked contractor's contact list */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass}>
            Contact Person · DD 12.x
            {linkedContractor && (
              <span className="ml-1 text-[10px] font-normal text-emerald-600">
                · {linkedContacts.length} contact(s) from {linkedContractor.displayName}
              </span>
            )}
          </label>
          {linkedContractor && linkedContacts.length > 0 ? (
            <select
              className={inputClass}
              value={inv.contactId}
              onChange={(e) => handleContactSelect(e.target.value)}
            >
              <option value="">— Select submitting contact —</option>
              {linkedContacts.map((ct) => {
                const fullName = [ct.salutation, ct.firstName, ct.middleName, ct.lastName]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <option key={ct.id || ct.contactId} value={ct.contactId}>
                    {ct.contactId} · {fullName || "(unnamed)"}
                    {ct.jobTitle ? ` · ${ct.jobTitle}` : ""}
                    {ct.isPrimaryContact === "Yes" ? " · PRIMARY" : ""}
                  </option>
                );
              })}
            </select>
          ) : linkedContractor ? (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-700">
              Contractor <strong>{linkedContractor.displayName}</strong> has no registered contacts. Add one in
              Contractor → Contact Management before invoicing.
            </p>
          ) : (
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Pick a contract above to load the contractor's contact list.
            </p>
          )}
          {inv.contactName && (
            <p className="mt-1 text-[11px] text-slate-500">
              Selected: <strong className="text-slate-700">{inv.contactName}</strong> · {inv.contactId}
            </p>
          )}
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass}>Remarks</label>
          <textarea
            className={inputClass}
            rows={2}
            value={inv.remarks}
            onChange={(e) => onInvoiceField("remarks", e.target.value)}
          />
        </div>
      </div>

      {/* ── Live Contractor Profile (read-only mirror) ─────────────────────
         Pulled directly from ContractorDataContext via the linked contract.
         Proves the invoice is anchored to the live contractor record — every
         field below updates automatically when an admin edits the contractor
         in Contractor → Registration. */}
      {linkedContractor && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
            <h3 className="text-sm font-bold text-emerald-900">
              Contractor Profile · live from Contractor Registry
            </h3>
            <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              {linkedContractor.verification}
            </span>
          </div>
          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Display Name</p>
              <p className="mt-0.5 font-semibold text-slate-900">{linkedContractor.displayName || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Registration #</p>
              <p className="mt-0.5 font-mono text-slate-900">{linkedContractor.registrationNumber || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Tax / GST #</p>
              <p className="mt-0.5 font-mono text-slate-900">{linkedContractor.taxNumber || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Email</p>
              <p className="mt-0.5 text-slate-900">{linkedContractor.email || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Phone</p>
              <p className="mt-0.5 text-slate-900">{linkedContractor.phone || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Nationality</p>
              <p className="mt-0.5 text-slate-900">{linkedContractor.nationality || "—"}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Address</p>
              <p className="mt-0.5 text-slate-900">{linkedContractor.address || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Bank</p>
              <p className="mt-0.5 text-slate-900">{linkedContractor.bankName || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">A/C Number</p>
              <p className="mt-0.5 font-mono text-slate-900">{linkedContractor.bankAccountNumber || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">A/C Holder</p>
              <p className="mt-0.5 text-slate-900">{linkedContractor.bankAccountName || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Document checklist (15.15 → 15.20) — types pulled from master data */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <h3 className="text-sm font-bold text-slate-800">Supporting Documents · DD 15.15 → 15.20</h3>
        <p className="mt-1 text-xs text-slate-500">
          Document types are managed in <span className="font-semibold text-slate-700">Master Data → Invoice Document Type</span>.
          Required items must be present before validation passes.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {master.documentTypes.map((docType) => {
            const meta = documentHelperByType[docType] ?? { required: false, helper: "Supporting document" };
            const uploaded = inv.documents.find((d) => d.type === docType);
            return (
              <div
                key={docType}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                  uploaded
                    ? "border-emerald-200 bg-emerald-50"
                    : meta.required
                    ? "border-amber-200 bg-white"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {docType} {meta.required && <span className="text-rose-500">*</span>}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{meta.helper}</p>
                </div>
                {uploaded ? (
                  <button
                    type="button"
                    onClick={() => setPendingDocDelete(uploaded)}
                    className="ml-3 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onAddDocument({
                        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        type: docType,
                        fileName: `${docType.replace(/\s+/g, "_")}.pdf`,
                        fileSize: "—",
                        uploadedAt: new Date().toISOString(),
                      })
                    }
                    className="ml-3 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Attach
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDocDelete !== null}
        tone="danger"
        title="Remove Supporting Document?"
        message={
          pendingDocDelete
            ? `You are about to remove the uploaded "${pendingDocDelete.type}" attachment from this invoice. If it is required, validation in Step 2 will fail until a replacement is attached.`
            : ""
        }
        detail={
          pendingDocDelete
            ? `${pendingDocDelete.fileName} · ${pendingDocDelete.fileSize} · Uploaded ${new Date(pendingDocDelete.uploadedAt).toLocaleString()}`
            : undefined
        }
        confirmLabel="Yes, Remove Document"
        cancelLabel="Cancel"
        onCancel={() => setPendingDocDelete(null)}
        onConfirm={() => {
          if (pendingDocDelete) onRemoveDocument(pendingDocDelete.id);
          setPendingDocDelete(null);
        }}
      />
    </section>
  );
}
