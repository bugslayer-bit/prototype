/* ═══════════════════════════════════════════════════════════════════════════
   Step 4 — Tax & Deductions (DD 16.5.x)
   Allows admin to add multiple tax rows (TDS / PIT / BIT / GST).
   Each row is calculated as taxBase × rate / 100. The grand total is
   pushed back into bill.taxAmount and invoice.totalTaxAmount.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import type { BillTaxDetail, InvoiceBillFormState } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { taxCodeDefaultRate } from "../config";
import { useInvoiceBillMasterData } from "../hooks/useInvoiceBillMasterData";
import { useContractData } from "../../../../shared/context/ContractDataContext";
import {
  resolveTaxMasterRecord,
  tdsRateBook,
} from "../../../../shared/data/expenditureSrsData";

const panelClass =
  "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6";
const tdInputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400";

interface Props {
  form: InvoiceBillFormState;
  onTaxRows: (rows: BillTaxDetail[]) => void;
}

export function TaxDeductionsSection({ form, onTaxRows }: Props) {
  const master = useInvoiceBillMasterData();
  const { contracts } = useContractData();
  const [pendingDelete, setPendingDelete] = useState<BillTaxDetail | null>(null);

  /* Resolve the linked contract → its category & vendor type drive the
     Tax Master record we apply. This is the dynamic bridge between
     Contract Creation (PRN 2.1) and Tax & Deductions (PRN 3.2 / DD 16.5). */
  const linkedContract = useMemo(
    () => contracts.find((c) => c.contractId === form.invoice.contractId),
    [contracts, form.invoice.contractId],
  );

  const taxMasterRecord = useMemo(() => {
    if (!linkedContract) return undefined;
    /* Vendor classification — pulled from the contract's Tax Master fields.
       Order of preference:
         1. vendorTaxType (DD 14.1.42 — set during Contract Creation)
         2. vendorOrigin (Bhutanese / Non-Bhutanese)
         3. contractClassification (Domestic / International) */
    const fd = linkedContract.formData as
      | { vendorTaxType?: string; vendorOrigin?: string }
      | undefined;
    const vendorType =
      fd?.vendorTaxType ||
      fd?.vendorOrigin ||
      linkedContract.contractClassification ||
      undefined;
    return resolveTaxMasterRecord(linkedContract.contractCategory, vendorType);
  }, [linkedContract]);

  const totalTax = useMemo(
    () => form.taxRows.reduce((s, r) => s + (parseFloat(r.taxAmount || "0") || 0), 0),
    [form.taxRows],
  );

  /* Suggest tax rows from the Tax Master record. Builds TDS + GST lines
     based on the resolved record, applying the correct rate from
     tdsRateBook for the contractor's origin. */
  const applyTaxMaster = () => {
    if (!taxMasterRecord) return;
    const base = form.bill.billAmountGross || form.invoice.invoiceGrossAmount || "0";
    const rows: BillTaxDetail[] = [];

    /* TDS row — origin from contract.vendorOrigin overrides Tax Master vendor type label */
    if (taxMasterRecord.tds === "YES") {
      const fd = linkedContract?.formData as
        | { vendorOrigin?: string; vendorTaxType?: string }
        | undefined;
      const origin = fd?.vendorOrigin || "";
      const isHiring =
        /transport|hiring/i.test(taxMasterRecord.vendorType) ||
        /transport|hiring/i.test(fd?.vendorTaxType || "");
      const isInternational =
        origin === "Non-Bhutanese" ||
        /international|non.?bhutanese|foreign/i.test(taxMasterRecord.vendorType);
      const rate = isHiring
        ? tdsRateBook.hiringChargesPercent
        : isInternational
          ? tdsRateBook.nonBhutaneseStandardPercent
          : tdsRateBook.bhutaneseStandardPercent;
      rows.push({
        id: `tx-${Date.now()}-tds`,
        billTaxId: `BT-${rows.length + 1}`,
        billId: form.bill.billId,
        taxId: `TM-${taxMasterRecord.contractType}-TDS`,
        taxCode: "TDS",
        taxBaseAmount: base,
        taxRate: rate.toString(),
        taxAmount: (((parseFloat(base) || 0) * rate) / 100).toFixed(2),
      });
    }

    /* GST row */
    if (taxMasterRecord.gst === "YES" && taxMasterRecord.gstRatePercent != null) {
      const rate = taxMasterRecord.gstRatePercent;
      rows.push({
        id: `tx-${Date.now()}-gst`,
        billTaxId: `BT-${rows.length + 1}`,
        billId: form.bill.billId,
        taxId: `TM-${taxMasterRecord.contractType}-GST`,
        taxCode: "GST",
        taxBaseAmount: base,
        taxRate: rate.toString(),
        taxAmount: (((parseFloat(base) || 0) * rate) / 100).toFixed(2),
      });
    }

    onTaxRows(rows);
  };

  const addRow = () => {
    const firstCode = master.taxCodes[0] ?? "TDS";
    const next: BillTaxDetail = {
      id: `tx-${Date.now()}`,
      billTaxId: `BT-${form.taxRows.length + 1}`,
      billId: form.bill.billId,
      taxId: "",
      taxCode: firstCode,
      taxBaseAmount: form.bill.billAmountGross || form.invoice.invoiceGrossAmount || "0",
      taxRate: taxCodeDefaultRate[firstCode] ?? "0",
      taxAmount: "0",
    };
    onTaxRows([...form.taxRows, next]);
  };

  const update = (id: string, patch: Partial<BillTaxDetail>) => {
    onTaxRows(
      form.taxRows.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...patch };
        const base = parseFloat(merged.taxBaseAmount || "0") || 0;
        const rate = parseFloat(merged.taxRate || "0") || 0;
        merged.taxAmount = ((base * rate) / 100).toFixed(2);
        return merged;
      }),
    );
  };

  const remove = (id: string) => {
    const row = form.taxRows.find((r) => r.id === id);
    if (row) setPendingDelete(row);
  };

  const confirmRemove = () => {
    if (pendingDelete) {
      onTaxRows(form.taxRows.filter((r) => r.id !== pendingDelete.id));
    }
    setPendingDelete(null);
  };

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
            Step 4 · DD 16.5.x
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Tax & Deductions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Compute tax base, retention, and deductions per tax code defined in the Tax Master.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-50 px-4 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Tax</p>
            <p className="text-lg font-bold text-slate-900">{totalTax.toLocaleString()}</p>
          </div>
          {taxMasterRecord && (
            <button
              type="button"
              onClick={applyTaxMaster}
              title={`Apply Tax Master: ${taxMasterRecord.contractType} / ${taxMasterRecord.vendorType}`}
              className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              ⚡ Apply Tax Master
            </button>
          )}
          <button type="button" onClick={addRow} className="rounded-2xl bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]">
            + Add Tax Line
          </button>
        </div>
      </header>

      {/* Tax Master resolution banner — proves the dynamic link between
          Contract Creation (PRN 2.1) and Tax & Deductions (DD 16.5.x). */}
      {linkedContract ? (
        taxMasterRecord ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
            <p className="font-bold uppercase tracking-wider">Tax Master · Resolved</p>
            <p className="mt-1">
              Contract <strong>{linkedContract.contractId}</strong> ({(linkedContract.contractCategory || []).join(", ")})
              → matched <strong>{taxMasterRecord.contractType} / {taxMasterRecord.vendorType}</strong> ·
              TDS {taxMasterRecord.tds} · GST {taxMasterRecord.gst}
              {taxMasterRecord.gstRatePercent != null && ` (${taxMasterRecord.gstRatePercent}%)`} ·
              Income Tax Mode: {taxMasterRecord.incomeTaxMode}
            </p>
            {taxMasterRecord.notes && (
              <p className="mt-1 italic text-emerald-700">Note: {taxMasterRecord.notes}</p>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
            Linked contract <strong>{linkedContract.contractId}</strong> has no matching Tax Master entry — add tax lines manually.
          </div>
        )
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          No contract linked in Step 1 — Tax Master suggestions are unavailable until a contract is selected.
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2">Bill Tax ID</th>
              <th className="px-3 py-2">Tax Code</th>
              <th className="px-3 py-2">Tax Master ID</th>
              <th className="px-3 py-2">Base Amount</th>
              <th className="px-3 py-2">Rate (%)</th>
              <th className="px-3 py-2">Tax Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {form.taxRows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No tax lines yet.</td></tr>
            )}
            {form.taxRows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{r.billTaxId}</td>
                <td className="px-3 py-2">
                  <select
                    className={tdInputClass}
                    value={r.taxCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      update(r.id, {
                        taxCode: code,
                        taxRate: taxCodeDefaultRate[code] ?? r.taxRate,
                      });
                    }}
                  >
                    {master.taxCodes.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2"><input className={tdInputClass} value={r.taxId} onChange={(e) => update(r.id, { taxId: e.target.value })} /></td>
                <td className="px-3 py-2"><input className={tdInputClass} value={r.taxBaseAmount} onChange={(e) => update(r.id, { taxBaseAmount: e.target.value })} /></td>
                <td className="px-3 py-2"><input className={tdInputClass} value={r.taxRate} onChange={(e) => update(r.id, { taxRate: e.target.value })} /></td>
                <td className="px-3 py-2 font-semibold text-slate-800">{Number(r.taxAmount).toLocaleString()}</td>
                <td className="px-3 py-2"><button type="button" onClick={() => remove(r.id)} className="text-rose-500 hover:text-rose-700">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bill Gross</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{Number(form.bill.billAmountGross || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">- Total Tax</p>
          <p className="mt-1 text-lg font-bold text-amber-700">{totalTax.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">= Net Payable</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            {(
              (parseFloat(form.bill.billAmountGross || "0") || 0) -
              totalTax -
              (parseFloat(form.bill.retentionAmount || "0") || 0) -
              (parseFloat(form.bill.deductionAmount || "0") || 0)
            ).toLocaleString()}
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="Delete Tax Line?"
        message={
          pendingDelete
            ? `You are about to permanently remove tax line "${pendingDelete.taxCode}" (${pendingDelete.billTaxId}) from this bill. This action cannot be undone.`
            : ""
        }
        detail={
          pendingDelete
            ? `Tax Master: ${pendingDelete.taxId || "—"} · Base ${Number(pendingDelete.taxBaseAmount || 0).toLocaleString()} × Rate ${pendingDelete.taxRate || "0"}% = ${Number(pendingDelete.taxAmount || 0).toLocaleString()}`
            : undefined
        }
        confirmLabel="Yes, Delete Tax Line"
        cancelLabel="Cancel"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
