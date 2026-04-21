/* ═══════════════════════════════════════════════════════════════════════════
   Step 3 — Bill Creation (PRN 3.2.1)
   Auto-create the bill from an approved invoice. Captures Bill Header
   (16.1.x) plus dynamic detail rows for Goods (16.2.x) / Works (16.3.x) /
   Services (16.4.x). Only the table relevant to the selected category is
   shown to keep the workspace focused.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import type {
  BillDetailGoods,
  BillDetailServices,
  BillDetailWorks,
  InvoiceBillFormState,
} from "../types";
import { getSubCategoriesFor, useInvoiceBillMasterData } from "../hooks/useInvoiceBillMasterData";
import { useContractData } from "../../../../shared/context/ContractDataContext";
import { ConfirmDialog } from "./ConfirmDialog";

type DeleteTarget =
  | { kind: "goods"; id: string; label: string; detail: string }
  | { kind: "works"; id: string; label: string; detail: string }
  | { kind: "services"; id: string; label: string; detail: string };

const panelClass =
  "rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6";
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
const labelClass = "block text-sm font-semibold text-slate-800";
const tdInputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400";

interface Props {
  form: InvoiceBillFormState;
  onBillField: <K extends keyof InvoiceBillFormState["bill"]>(
    key: K,
    value: InvoiceBillFormState["bill"][K],
  ) => void;
  onGoodsRows: (rows: BillDetailGoods[]) => void;
  onWorksRows: (rows: BillDetailWorks[]) => void;
  onServicesRows: (rows: BillDetailServices[]) => void;
  onAutoCreateFromInvoice: () => void;
}

export function BillCreationSection({
  form,
  onBillField,
  onGoodsRows,
  onWorksRows,
  onServicesRows,
  onAutoCreateFromInvoice,
}: Props) {
  const bill = form.bill;
  const master = useInvoiceBillMasterData();
  const subCats = getSubCategoriesFor(master, bill.billCategory);
  const { contracts } = useContractData();
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "goods") {
      onGoodsRows(form.goodsRows.filter((r) => r.id !== pendingDelete.id));
    } else if (pendingDelete.kind === "works") {
      onWorksRows(form.worksRows.filter((r) => r.id !== pendingDelete.id));
    } else {
      onServicesRows(form.servicesRows.filter((r) => r.id !== pendingDelete.id));
    }
    setPendingDelete(null);
  };
  const linkedContract = useMemo(
    () => contracts.find((c) => c.contractId === form.invoice.contractId),
    [contracts, form.invoice.contractId],
  );

  const calcGross = useMemo(() => {
    if (bill.billCategory === "Goods") {
      return form.goodsRows.reduce((s, r) => s + (parseFloat(r.itemAmountInvoice || "0") || 0), 0);
    }
    if (bill.billCategory === "Works") {
      return form.worksRows.reduce((s, r) => s + (parseFloat(r.workAmountCurrent || "0") || 0), 0);
    }
    return form.servicesRows.reduce((s, r) => s + (parseFloat(r.serviceAmount || "0") || 0), 0);
  }, [bill.billCategory, form.goodsRows, form.worksRows, form.servicesRows]);

  /* ── Goods row ops ─────────────────────────────────────────────────────── */
  const addGoods = () => {
    const next: BillDetailGoods = {
      id: `g-${Date.now()}`,
      billDetailId: `BD-G-${form.goodsRows.length + 1}`,
      billId: bill.billId,
      grnId: "",
      itemName: "",
      itemQuantityContract: "",
      itemRateContract: "",
      itemBalanceContract: "",
      itemSuppliedPrevious: "",
      itemQuantityInvoice: "",
      itemRateInvoice: "",
      itemAmountInvoice: "0",
      acceptanceAuthorityId: "",
    };
    onGoodsRows([...form.goodsRows, next]);
  };
  const updGoods = (id: string, patch: Partial<BillDetailGoods>) => {
    onGoodsRows(
      form.goodsRows.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...patch };
        const q = parseFloat(merged.itemQuantityInvoice || "0") || 0;
        const rate = parseFloat(merged.itemRateInvoice || "0") || 0;
        merged.itemAmountInvoice = (q * rate).toString();
        return merged;
      }),
    );
  };
  const delGoods = (id: string) => {
    const row = form.goodsRows.find((r) => r.id === id);
    if (!row) return;
    setPendingDelete({
      kind: "goods",
      id,
      label: row.itemName || row.billDetailId,
      detail: `Goods line ${row.billDetailId} · GRN ${row.grnId || "—"} · Qty ${row.itemQuantityInvoice || "0"} × Rate ${row.itemRateInvoice || "0"} = ${Number(row.itemAmountInvoice || 0).toLocaleString()}`,
    });
  };

  /* ── Works row ops ─────────────────────────────────────────────────────── */
  const addWorks = () => {
    const next: BillDetailWorks = {
      id: `w-${Date.now()}`,
      billDetailId: `BD-W-${form.worksRows.length + 1}`,
      billId: bill.billId,
      workItemCode: "",
      workDescription: "",
      workQuantityContract: "",
      workRateContract: "",
      workCompletedPrevious: "",
      workCompletedCurrent: "",
      workAmountCurrent: "0",
      workCompletionPercentage: "0",
    };
    onWorksRows([...form.worksRows, next]);
  };
  const updWorks = (id: string, patch: Partial<BillDetailWorks>) => {
    onWorksRows(
      form.worksRows.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...patch };
        const cur = parseFloat(merged.workCompletedCurrent || "0") || 0;
        const rate = parseFloat(merged.workRateContract || "0") || 0;
        const qty = parseFloat(merged.workQuantityContract || "0") || 0;
        merged.workAmountCurrent = (cur * rate).toString();
        merged.workCompletionPercentage =
          qty > 0 ? (((parseFloat(merged.workCompletedPrevious || "0") || 0) + cur) / qty * 100).toFixed(1) : "0";
        return merged;
      }),
    );
  };
  const delWorks = (id: string) => {
    const row = form.worksRows.find((r) => r.id === id);
    if (!row) return;
    setPendingDelete({
      kind: "works",
      id,
      label: row.workDescription || row.workItemCode || row.billDetailId,
      detail: `Works line ${row.billDetailId} · BOQ ${row.workItemCode || "—"} · Done now ${row.workCompletedCurrent || "0"} · Amount ${Number(row.workAmountCurrent || 0).toLocaleString()}`,
    });
  };

  /* ── Services row ops ──────────────────────────────────────────────────── */
  const addServices = () => {
    const next: BillDetailServices = {
      id: `s-${Date.now()}`,
      billDetailId: `BD-S-${form.servicesRows.length + 1}`,
      billId: bill.billId,
      serviceDescription: "",
      servicePeriodFrom: "",
      servicePeriodTo: "",
      serviceRate: "",
      serviceDays: "0",
      serviceAmount: "0",
    };
    onServicesRows([...form.servicesRows, next]);
  };
  const updServices = (id: string, patch: Partial<BillDetailServices>) => {
    onServicesRows(
      form.servicesRows.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...patch };
        const days = parseFloat(merged.serviceDays || "0") || 0;
        const rate = parseFloat(merged.serviceRate || "0") || 0;
        merged.serviceAmount = (days * rate).toString();
        return merged;
      }),
    );
  };
  const delServices = (id: string) => {
    const row = form.servicesRows.find((r) => r.id === id);
    if (!row) return;
    setPendingDelete({
      kind: "services",
      id,
      label: row.serviceDescription || row.billDetailId,
      detail: `Service line ${row.billDetailId} · ${row.servicePeriodFrom || "?"} → ${row.servicePeriodTo || "?"} · Days ${row.serviceDays || "0"} × Rate ${row.serviceRate || "0"} = ${Number(row.serviceAmount || 0).toLocaleString()}`,
    });
  };

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">
            Step 3 · PRN 3.2.1
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Bill Creation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Auto-create the bill from the approved invoice and populate detail rows (16.1 → 16.4).
          </p>
        </div>
        <button
          type="button"
          onClick={onAutoCreateFromInvoice}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          ⚡ Auto-create from invoice + contract
        </button>
      </header>

      {linkedContract && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
          <p className="font-bold uppercase tracking-wider">Linked Contract</p>
          <p className="mt-1">
            <strong>{linkedContract.contractId}</strong> · {linkedContract.contractTitle || "(untitled)"} ·
            Category {(linkedContract.contractCategory || []).join(", ") || "—"} ·
            {linkedContract.formData?.contractItemRows?.length || 0} contract item(s) ·
            {linkedContract.formData?.milestoneRows?.length || 0} milestone(s).
            Auto-create will pull bill category and detail rows from this contract.
          </p>
        </div>
      )}

      {/* Bill Header (16.1.x) */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass}>16.1.1 Bill ID</label>
          <input className={inputClass} value={bill.billId || "Auto on save"} readOnly />
        </div>
        <div>
          <label className={labelClass}>16.1.2 Invoice ID <span className="ml-1 text-[10px] font-normal text-emerald-600">· from invoice</span></label>
          <input className={`${inputClass} bg-slate-50 text-slate-500`} value={bill.invoiceId} readOnly />
        </div>
        <div>
          <label className={labelClass}>16.1.3 Contract ID <span className="ml-1 text-[10px] font-normal text-emerald-600">· from invoice</span></label>
          <input className={`${inputClass} bg-slate-50 text-slate-500`} value={bill.contractId} readOnly />
        </div>
        <div>
          <label className={labelClass}>16.1.4 Bill Date</label>
          <input
            className={inputClass}
            value={bill.billDate}
            onChange={(e) => onBillField("billDate", e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        </div>
        <div>
          <label className={labelClass}>16.1.5 Bill Category</label>
          <select
            className={inputClass}
            value={bill.billCategory}
            onChange={(e) => {
              const cat = e.target.value;
              onBillField("billCategory", cat);
              const firstSub = getSubCategoriesFor(master, cat)[0] ?? "";
              onBillField("billSubCategory", firstSub);
            }}
          >
            {master.billCategory.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>16.1.6 Bill Sub-Category</label>
          <select
            className={inputClass}
            value={bill.billSubCategory}
            onChange={(e) => onBillField("billSubCategory", e.target.value)}
          >
            {subCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>
            UCoA Level
            <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">UCoA</span>
          </label>
          <select
            className={inputClass}
            value={bill.ucoaLevel || ""}
            onChange={(e) => onBillField("ucoaLevel", e.target.value)}
          >
            <option value="">Select UCoA Level</option>
            {master.ucoaLevels.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>16.1.7 Bill Gross Amount</label>
          <input
            type="number"
            className={inputClass}
            value={bill.billAmountGross}
            onChange={(e) => onBillField("billAmountGross", e.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-500">From rows: {calcGross.toLocaleString()}</p>
        </div>
        <div>
          <label className={labelClass}>16.1.10 Retention Amount</label>
          <input
            type="number"
            className={inputClass}
            value={bill.retentionAmount}
            onChange={(e) => onBillField("retentionAmount", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>16.1.12 Bill Status</label>
          <select
            className={inputClass}
            value={bill.billStatus}
            onChange={(e) => onBillField("billStatus", e.target.value)}
          >
            {master.billStatus.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Detail tables */}
      {bill.billCategory === "Goods" && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Bill Details — Goods (16.2.x)</h3>
            <button type="button" onClick={addGoods} className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8]">
              + Add Item
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2">GRN ID</th>
                  <th className="px-3 py-2">Item Name</th>
                  <th className="px-3 py-2">Qty (Contract)</th>
                  <th className="px-3 py-2">Rate (Contract)</th>
                  <th className="px-3 py-2">Qty (Invoice)</th>
                  <th className="px-3 py-2">Rate (Invoice)</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Authority</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {form.goodsRows.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">No items yet. Click "Add Item".</td></tr>
                )}
                {form.goodsRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.grnId} onChange={(e) => updGoods(r.id, { grnId: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.itemName} onChange={(e) => updGoods(r.id, { itemName: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.itemQuantityContract} onChange={(e) => updGoods(r.id, { itemQuantityContract: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.itemRateContract} onChange={(e) => updGoods(r.id, { itemRateContract: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.itemQuantityInvoice} onChange={(e) => updGoods(r.id, { itemQuantityInvoice: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.itemRateInvoice} onChange={(e) => updGoods(r.id, { itemRateInvoice: e.target.value })} /></td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{Number(r.itemAmountInvoice).toLocaleString()}</td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.acceptanceAuthorityId} onChange={(e) => updGoods(r.id, { acceptanceAuthorityId: e.target.value })} /></td>
                    <td className="px-3 py-2"><button type="button" onClick={() => delGoods(r.id)} className="text-rose-500 hover:text-rose-700">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bill.billCategory === "Works" && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Bill Details — Works (16.3.x)</h3>
            <button type="button" onClick={addWorks} className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8]">
              + Add Work Item
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2">BOQ Code</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Qty (BOQ)</th>
                  <th className="px-3 py-2">Rate (BOQ)</th>
                  <th className="px-3 py-2">Done Prev</th>
                  <th className="px-3 py-2">Done Now</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">% Done</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {form.worksRows.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">No work items yet.</td></tr>
                )}
                {form.worksRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.workItemCode} onChange={(e) => updWorks(r.id, { workItemCode: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.workDescription} onChange={(e) => updWorks(r.id, { workDescription: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.workQuantityContract} onChange={(e) => updWorks(r.id, { workQuantityContract: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.workRateContract} onChange={(e) => updWorks(r.id, { workRateContract: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.workCompletedPrevious} onChange={(e) => updWorks(r.id, { workCompletedPrevious: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.workCompletedCurrent} onChange={(e) => updWorks(r.id, { workCompletedCurrent: e.target.value })} /></td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{Number(r.workAmountCurrent).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{r.workCompletionPercentage}%</td>
                    <td className="px-3 py-2"><button type="button" onClick={() => delWorks(r.id)} className="text-rose-500 hover:text-rose-700">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bill.billCategory === "Services" && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Bill Details — Services (16.4.x)</h3>
            <button type="button" onClick={addServices} className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8]">
              + Add Service Line
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Period From</th>
                  <th className="px-3 py-2">Period To</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-3 py-2">Days</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {form.servicesRows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No service lines yet.</td></tr>
                )}
                {form.servicesRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.serviceDescription} onChange={(e) => updServices(r.id, { serviceDescription: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.servicePeriodFrom} onChange={(e) => updServices(r.id, { servicePeriodFrom: e.target.value })} placeholder="DD/MM/YYYY" /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.servicePeriodTo} onChange={(e) => updServices(r.id, { servicePeriodTo: e.target.value })} placeholder="DD/MM/YYYY" /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.serviceRate} onChange={(e) => updServices(r.id, { serviceRate: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className={tdInputClass} value={r.serviceDays} onChange={(e) => updServices(r.id, { serviceDays: e.target.value })} /></td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{Number(r.serviceAmount).toLocaleString()}</td>
                    <td className="px-3 py-2"><button type="button" onClick={() => delServices(r.id)} className="text-rose-500 hover:text-rose-700">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={
          pendingDelete?.kind === "goods"
            ? "Delete Goods Line?"
            : pendingDelete?.kind === "works"
              ? "Delete Works Line?"
              : "Delete Services Line?"
        }
        message={
          pendingDelete
            ? `You are about to permanently remove "${pendingDelete.label}" from this bill. This action cannot be undone.`
            : ""
        }
        detail={pendingDelete?.detail}
        confirmLabel="Yes, Delete Line"
        cancelLabel="Cancel"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
