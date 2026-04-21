/* ═══════════════════════════════════════════════════════════════════════════
   GrnLookupPanel — SRS Row 45 (Process Step 1.8 / 5a)
   For Goods contracts: capture a GRN code and "look it up" in the GIMS
   stub. The stub returns line items, prices, dates and the acceptance
   authority. The user then links the GRN to the current invoice. Each GRN
   can only be linked to one invoice (BR uniqueness rule).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import type { GrnRecord, InvoiceBillFormState } from "../types";
import { useContractData } from "../../../../shared/context/ContractDataContext";

const panelClass =
  "rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

interface Props {
  form: InvoiceBillFormState;
  onGrnRecords: (rows: GrnRecord[]) => void;
}

/* GIMS stub — in real life this would call the GIMS API. For the SRS demo
   we synthesise a deterministic record from the GRN code so each lookup
   returns plausible data the user can interact with. */
function gimsStubLookup(code: string, contractRef: string): GrnRecord {
  const seed = code.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const today = new Date();
  const lines = Array.from({ length: 3 + (seed % 3) }, (_, i) => {
    const qty = 5 + ((seed + i * 11) % 20);
    const price = 100 + ((seed + i * 7) % 900);
    return {
      itemCode: `ITM-${(seed + i).toString().padStart(4, "0")}`,
      description: `GIMS-Item ${i + 1} for GRN ${code}`,
      quantityReceived: String(qty),
      unitPrice: String(price),
      lineValue: String(qty * price),
    };
  });
  const total = lines.reduce((s, l) => s + Number(l.lineValue), 0);
  return {
    grnCode: code,
    contractRef,
    receivedDate: today.toISOString().slice(0, 10),
    acceptanceDate: today.toISOString().slice(0, 10),
    acceptanceAuthority: "Stores Officer (GIMS)",
    totalValue: String(total),
    alreadyInvoicedValue: "0",
    remainingValue: String(total),
    items: lines,
    linkedToInvoice: false,
  };
}

export function GrnLookupPanel({ form, onGrnRecords }: Props) {
  const { contracts } = useContractData();
  const [grnCode, setGrnCode] = useState("");
  const [error, setError] = useState("");

  const linked = useMemo(
    () => contracts.find((c) => c.contractId === form.invoice.contractId) || null,
    [contracts, form.invoice.contractId],
  );
  const isGoods = useMemo(() => {
    const cat = linked?.contractCategory?.[0] || "";
    return /goods/i.test(cat) || /goods/i.test(form.bill.billCategory || "");
  }, [linked, form.bill.billCategory]);

  if (!isGoods) {
    return (
      <section className={panelClass}>
        <header className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">GRN / GIMS Lookup</h3>
            <p className="text-xs text-slate-500">SRS Row 45 · Step 1.8 · Goods contracts only</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Not applicable
          </span>
        </header>
        <p className="text-sm text-slate-500">
          GRN/GIMS lookup is enabled when the linked contract category is{" "}
          <strong>Goods</strong>. Pick a Goods contract on Step 1 to capture the GRN
          and pull line-items from the GIMS subsystem.
        </p>
      </section>
    );
  }

  const lookup = () => {
    setError("");
    if (!grnCode.trim()) {
      setError("Enter a GRN code first");
      return;
    }
    const dup = form.grnRecords.find((g) => g.grnCode === grnCode.trim());
    if (dup) {
      setError("This GRN is already linked to this invoice");
      return;
    }
    const rec = gimsStubLookup(grnCode.trim(), form.invoice.contractId);
    onGrnRecords([...form.grnRecords, rec]);
    setGrnCode("");
  };

  const toggleLink = (code: string) =>
    onGrnRecords(
      form.grnRecords.map((g) =>
        g.grnCode === code ? { ...g, linkedToInvoice: !g.linkedToInvoice } : g,
      ),
    );

  const remove = (code: string) =>
    onGrnRecords(form.grnRecords.filter((g) => g.grnCode !== code));

  return (
    <section className={panelClass}>
      <header className="mb-3">
        <h3 className="text-lg font-bold text-slate-900">GRN / GIMS Lookup</h3>
        <p className="text-xs text-slate-500">
          SRS Row 45 · Step 1.8 — Capture a Goods Received Note. The system retrieves
          items, quantities, unit prices, dates and acceptance authority from GIMS,
          and validates that the GRN has not already been invoiced.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            GRN Code
          </label>
          <input
            value={grnCode}
            onChange={(e) => setGrnCode(e.target.value)}
            placeholder="e.g. GRN-2026-00123"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <button
          type="button"
          onClick={lookup}
          className="rounded-xl border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Lookup in GIMS
        </button>
        {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
      </div>

      {form.grnRecords.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">No GRNs linked yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {form.grnRecords.map((g) => (
            <div key={g.grnCode} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {g.grnCode} <span className="text-slate-400">·</span>{" "}
                    <span className="text-xs font-medium text-slate-500">
                      Authority: {g.acceptanceAuthority}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Received {g.receivedDate} · Accepted {g.acceptanceDate} · Total{" "}
                    <strong className="text-slate-700">{g.totalValue}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLink(g.grnCode)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                      g.linkedToInvoice
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {g.linkedToInvoice ? "✓ Linked" : "Link to Invoice"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g.grnCode)}
                    className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-2 py-1 text-left">Item Code</th>
                      <th className="px-2 py-1 text-left">Description</th>
                      <th className="px-2 py-1 text-right">Qty</th>
                      <th className="px-2 py-1 text-right">Unit Price</th>
                      <th className="px-2 py-1 text-right">Line Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items.map((it, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 font-mono text-slate-700">{it.itemCode}</td>
                        <td className="px-2 py-1 text-slate-600">{it.description}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{it.quantityReceived}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{it.unitPrice}</td>
                        <td className="px-2 py-1 text-right tabular-nums font-semibold">
                          {it.lineValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
