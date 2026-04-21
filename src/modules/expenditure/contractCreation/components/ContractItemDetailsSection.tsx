import { useEffect } from "react";
import type { ContractItemDetailsSectionProps } from "../sectionProps";
import { useMasterData } from "../../../../shared/context/MasterDataContext";

const ITEM_CATEGORY_FALLBACK = ["Goods", "Works", "Services", "Consultancy Services", "Non-Consultancy Services"];
const ITEM_UNIT_FALLBACK = ["Units", "Nos", "Kg", "Mt", "KM", "Lump Sum", "Lot", "Months"];

export function ContractItemDetailsSection({ form, inputClass, lockedInputClass, labelClass, updateField }: ContractItemDetailsSectionProps) {
  /* All LoVs pulled from MasterDataContext at runtime — admins manage them
     in /master-data so item categories and units can be updated centrally. */
  const { masterDataMap } = useMasterData();
  const itemCategories = masterDataMap.get("vendor-expenditure-category") ?? ITEM_CATEGORY_FALLBACK;
  const itemUnits = masterDataMap.get("item-unit-of-measure") ?? ITEM_UNIT_FALLBACK;
  useEffect(() => {
    const nextRows = form.contractItemRows.map((row) => {
      const quantity = Number(row.itemQuantity || 0);
      const unitRate = Number(row.itemUnitRate || 0);
      const totalAmount = quantity * unitRate;

      return {
        ...row,
        contractId: form.contractId || "Auto-linked",
        itemTotalAmount: totalAmount ? totalAmount.toFixed(2) : "",
        quantityBalance: row.itemQuantity || "",
        amountBalance: totalAmount ? totalAmount.toFixed(2) : ""
      };
    });

    if (JSON.stringify(nextRows) !== JSON.stringify(form.contractItemRows)) {
      updateField("contractItemRows", nextRows);
    }
  }, [form.contractId, form.contractItemRows, updateField]);

  function updateItemField(rowId: string, key: keyof (typeof form.contractItemRows)[number], value: string) {
    updateField(
      "contractItemRows",
      form.contractItemRows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    );
  }

  function addItemRow() {
    const index = form.contractItemRows.length + 1;
    updateField("contractItemRows", [
      ...form.contractItemRows,
      {
        id: String(index),
        contractItemId: `CI-${String(index).padStart(3, "0")}`,
        contractId: form.contractId || "Auto-linked",
        itemCode: "",
        itemDescription: "",
        itemCategory: "",
        itemSubCategory: "",
        itemQuantity: "",
        itemUnit: "",
        itemUnitRate: "",
        itemTotalAmount: "",
        quantityBalance: "",
        amountBalance: ""
      }
    ]);
  }

  function removeItemRow(rowId: string) {
    const filtered = form.contractItemRows.filter((row) => row.id !== rowId);
    updateField("contractItemRows", filtered.length ? filtered : [form.contractItemRows[0]]);
  }

  const compactInputClass = `${inputClass} mt-0 rounded-xl px-3 py-2 text-sm`;
  const compactLockedInputClass = `${lockedInputClass} mt-0 rounded-xl px-3 py-2 text-sm`;
  const compactSelectClass = `${inputClass} mt-0 rounded-xl px-3 py-2 text-sm`;

  return (
    <section className="overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(183,28,28,0.12)]">
      <div className="border-b border-rose-100 bg-gradient-to-r from-[#fff7f7] via-[#fff1f3] to-[#fffaf7] px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d32f2f] text-2xl text-white">5</div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#8f1111]">Contract Item Details</h2>
            <p className="mt-1 text-sm text-slate-600">Define item quantities, units, rates, and totals for the contract.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-5 sm:py-6 lg:px-6">
        <div className="overflow-x-auto rounded-[24px] border border-slate-200">
          <table className="min-w-[880px] w-full table-fixed border-collapse text-left text-xs sm:min-w-[1120px] sm:text-sm">
            <thead className="bg-gradient-to-r from-[#8f1111] to-[#c81d1d] text-white">
              <tr>
                {[
                  "#",
                  "Item ID",
                  "Contract Ref",
                  "Item Code",
                  "Description",
                  "Category",
                  "Sub-Category",
                  "Quantity",
                  "Unit",
                  "Unit Rate",
                  "Total Amount",
                  "Qty Balance",
                  "Amt Balance",
                  ""
                ].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-2 py-3 text-[10px] font-bold uppercase tracking-[0.06em] sm:px-3 sm:py-4 sm:text-xs">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white align-top">
              {form.contractItemRows.map((item, index) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-2 py-2.5 text-xs font-semibold text-slate-700 sm:px-3 sm:py-3 sm:text-sm">{index + 1}</td>
                  <td className="break-words px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactLockedInputClass} min-w-[84px] sm:min-w-[94px]`} value={item.contractItemId} readOnly />
                  </td>
                  <td className="break-words px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactLockedInputClass} min-w-[96px] sm:min-w-[110px]`} value={form.contractId || item.contractId} readOnly />
                  </td>
                  <td className="break-words px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactInputClass} min-w-[110px] sm:min-w-[130px]`} value={item.itemCode} onChange={(event) => updateItemField(item.id, "itemCode", event.target.value)} placeholder="Code" />
                  </td>
                  <td className="break-words px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactInputClass} min-w-[150px] sm:min-w-[190px]`} value={item.itemDescription} onChange={(event) => updateItemField(item.id, "itemDescription", event.target.value)} placeholder="Description" />
                  </td>
                  <td className="break-words px-2 py-2.5 sm:px-3 sm:py-3">
                    <select className={`${compactSelectClass} min-w-[118px] sm:min-w-[150px]`} value={item.itemCategory} onChange={(event) => updateItemField(item.id, "itemCategory", event.target.value)}>
                      <option value="">--</option>
                      {itemCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="break-words px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactInputClass} min-w-[118px] sm:min-w-[150px]`} value={item.itemSubCategory} onChange={(event) => updateItemField(item.id, "itemSubCategory", event.target.value)} placeholder="Sub-category" />
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactInputClass} min-w-[76px] sm:min-w-[92px]`} type="number" min="0" step="0.01" value={item.itemQuantity} onChange={(event) => updateItemField(item.id, "itemQuantity", event.target.value)} placeholder="0" />
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <select className={`${compactSelectClass} min-w-[76px] sm:min-w-[92px]`} value={item.itemUnit} onChange={(event) => updateItemField(item.id, "itemUnit", event.target.value)}>
                      <option value="">--</option>
                      {itemUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactInputClass} min-w-[84px] sm:min-w-[100px]`} type="number" min="0" step="0.01" value={item.itemUnitRate} onChange={(event) => updateItemField(item.id, "itemUnitRate", event.target.value)} placeholder="0" />
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactLockedInputClass} min-w-[92px] sm:min-w-[110px]`} value={item.itemTotalAmount} readOnly />
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactLockedInputClass} min-w-[84px] sm:min-w-[100px]`} value={item.quantityBalance} readOnly />
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <input className={`${compactLockedInputClass} min-w-[92px] sm:min-w-[110px]`} value={item.amountBalance} readOnly />
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 sm:py-3">
                    <button
                      type="button"
                      className="rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      onClick={() => removeItemRow(item.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Total amount, quantity balance, and amount balance are auto-calculated.
          </div>
          <button
            type="button"
            className="rounded-2xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            onClick={addItemRow}
          >
            + Add Item Row
          </button>
        </div>
      </div>
    </section>
  );
}
