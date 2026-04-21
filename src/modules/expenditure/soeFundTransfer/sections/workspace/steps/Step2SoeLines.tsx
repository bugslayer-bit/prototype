/* ═══════════════════════════════════════════════════════════════════════
   STEP 2 — Attach Statement-of-Expenditure Lines (SRS PRN 6.2 Step 2)
   ═══════════════════════════════════════════════════════════════════════ */
import type { SoeFormState, SoeLine } from "../../../types";
import { useSoeMasterData } from "../../../state/useSoeMasterData";
import { Card } from "../../../ui/Card";
import { Select } from "../../../ui/Select";
import { Empty } from "../../../ui/Empty";
import { inputCls } from "../../../ui/inputCls";

interface SectionProps {
  form: SoeFormState;
  onChange: (next: SoeFormState | ((cur: SoeFormState) => SoeFormState)) => void;
  readOnly?: boolean;
}

export function Step2SoeLines({ form, onChange, readOnly = false }: SectionProps) {
  const master = useSoeMasterData();

  const addLine = () =>
    onChange((cur) => ({
      ...cur,
      soeLines: [
        ...cur.soeLines,
        {
          id: crypto.randomUUID(),
          expenditureCategory: master.expenditureCategory[0] ?? "",
          ucoaCode: "",
          description: "",
          amount: "",
          currency: cur.header.currency || (master.currency[0] ?? ""),
          documentType: master.supportingDocumentType[0] ?? "",
          documentRef: "",
          remarks: "",
        },
      ],
    }));

  const updateLine = (id: string, patch: Partial<SoeLine>) =>
    onChange((cur) => ({
      ...cur,
      soeLines: cur.soeLines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  const removeLine = (id: string) =>
    onChange((cur) => ({ ...cur, soeLines: cur.soeLines.filter((l) => l.id !== id) }));

  const emptyCategory = master.expenditureCategory.length === 0;
  const emptyDocType = master.supportingDocumentType.length === 0;
  const emptyCurrency = master.currency.length === 0;

  return (
    <Card
      title="2. Statement of Expenditure Lines"
      subtitle="PRN 6.2 Step 2 — Attach individual expenditure lines with UCoA mapping and supporting documents."
      className={readOnly ? "pointer-events-none select-none opacity-70" : undefined}
    >
      {(emptyCategory || emptyDocType || emptyCurrency) && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="font-bold">⚠️ Master-data list(s) empty</p>
          <p className="mt-0.5">
            Populate in <span className="font-mono">/master-data</span>:{" "}
            {[
              emptyCategory ? "soe-expenditure-category" : null,
              emptyDocType ? "soe-supporting-document-type" : null,
              emptyCurrency ? "currency-type" : null,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={addLine}
          className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          + Add SoE Line
        </button>
      </div>

      {form.soeLines.length === 0 ? (
        <Empty>No SoE lines attached yet.</Empty>
      ) : (
        <div className="grid gap-3">
          {form.soeLines.map((l) => (
            <div
              key={l.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.4fr_auto]"
            >
              <Select
                value={l.expenditureCategory}
                options={master.expenditureCategory}
                onChange={(v) => updateLine(l.id, { expenditureCategory: v })}
              />
              <input
                className={inputCls}
                placeholder="UCoA Code"
                value={l.ucoaCode}
                onChange={(e) => updateLine(l.id, { ucoaCode: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Description"
                value={l.description}
                onChange={(e) => updateLine(l.id, { description: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Amount"
                value={l.amount}
                onChange={(e) => updateLine(l.id, { amount: e.target.value })}
              />
              <Select
                value={l.currency}
                options={master.currency}
                onChange={(v) => updateLine(l.id, { currency: v })}
              />
              <div className="grid gap-2">
                <Select
                  value={l.documentType}
                  options={master.supportingDocumentType}
                  onChange={(v) => updateLine(l.id, { documentType: v })}
                />
                <input
                  className={inputCls}
                  placeholder="Doc reference"
                  value={l.documentRef}
                  onChange={(e) => updateLine(l.id, { documentRef: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLine(l.id)}
                className="self-start rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
