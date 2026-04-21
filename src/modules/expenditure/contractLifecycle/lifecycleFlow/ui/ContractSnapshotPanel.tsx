/* ContractSnapshotPanel — the fully-dynamic Details view.
   - Renders every field in SNAPSHOT_SECTIONS keyed off the selected contract
   - Also renders the repeating sub-tables (items, documents, approval chain)
   so absolutely nothing about the contract is hidden from the user. */
import type { StoredContract } from "../../../../../shared/context/ContractDataContext";
import { SNAPSHOT_SECTIONS } from "../config/snapshotSections";
import { DetailField } from "./DetailField";
import { fmt, panelClass, headerClass } from "./styleTokens";

interface Props {
  contract: StoredContract;
}

export function ContractSnapshotPanel({ contract }: Props) {
  const f = contract.formData || ({} as StoredContract["formData"]);
  const items = f.contractItemRows || [];
  const docs = f.supportingDocuments || [];
  const approvals = f.approvalSteps || [];
  const preconditions = f.preconditionResults || [];

  return (
    <div className="space-y-6">
      {/* ── Field grids — one card per section ─────────────────────────── */}
      {SNAPSHOT_SECTIONS.map((section) => (
        <section key={section.key} className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${section.accent} text-xl text-white`}
              >
                {section.icon}
              </div>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                  {section.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {section.fields.length} field{section.fields.length === 1 ? "" : "s"} pulled live from the selected contract
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
            {section.fields.map((field) => (
              <DetailField
                key={field.label}
                label={field.label}
                value={field.get(contract)}
                kind={field.kind}
              />
            ))}
          </div>
        </section>
      ))}

      {/* ── Contract Items table ───────────────────────────────────────── */}
      <section className={panelClass}>
        <div className={headerClass}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-xl text-white">
              📦
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                Contract Items ({items.length})
              </h3>
              <p className="text-xs text-slate-500">
                Every line item captured on the contract
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm italic text-slate-400">
              No items on this contract
            </p>
          ) : (
            <div className="overflow-hidden rounded-[18px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-[880px] w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Item ID</th>
                      <th className="px-3 py-2.5">Code</th>
                      <th className="px-3 py-2.5">Description</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5 text-right">Qty</th>
                      <th className="px-3 py-2.5">Unit</th>
                      <th className="px-3 py-2.5 text-right">Rate</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right">Qty Bal</th>
                      <th className="px-3 py-2.5 text-right">Amt Bal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{it.contractItemId || it.id}</td>
                        <td className="px-3 py-2">{it.itemCode || "—"}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{it.itemDescription || "—"}</td>
                        <td className="px-3 py-2">
                          {it.itemCategory}
                          {it.itemSubCategory ? ` / ${it.itemSubCategory}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right">{it.itemQuantity || "—"}</td>
                        <td className="px-3 py-2">{it.itemUnit || "—"}</td>
                        <td className="px-3 py-2 text-right">{it.itemUnitRate ? `BTN ${fmt(it.itemUnitRate)}` : "—"}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                          {it.itemTotalAmount ? `BTN ${fmt(it.itemTotalAmount)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">{it.quantityBalance || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {it.amountBalance ? `BTN ${fmt(it.amountBalance)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Supporting Documents ───────────────────────────────────────── */}
      <section className={panelClass}>
        <div className={headerClass}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-xl text-white">
              📎
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                Supporting Documents ({docs.length})
              </h3>
              <p className="text-xs text-slate-500">
                Uploads attached to the contract record
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          {docs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm italic text-slate-400">
              No supporting documents attached
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <span className="text-2xl">📄</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-800">{d.label}</p>
                    <p className="truncate text-xs text-slate-500">{d.fileName || "—"}</p>
                    <p className="text-[11px] text-slate-400">
                      {d.fileSize || "—"} · uploaded {d.uploadedAt || "—"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      d.status === "uploaded" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Approval Workflow ──────────────────────────────────────────── */}
      <section className={panelClass}>
        <div className={headerClass}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500 text-xl text-white">
              ✍️
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                Approval Workflow ({approvals.length})
              </h3>
              <p className="text-xs text-slate-500">
                Multi-level approval chain captured on the contract
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          {approvals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm italic text-slate-400">
              No approval steps recorded
            </p>
          ) : (
            <ol className="space-y-3">
              {approvals.map((step, i) => {
                const tone =
                  step.status === "approved"
                    ? "emerald"
                    : step.status === "rejected"
                    ? "rose"
                    : step.status === "skipped"
                    ? "slate"
                    : "amber";
                const toneMap: Record<string, string> = {
                  emerald: "border-emerald-200 bg-emerald-50",
                  rose: "border-rose-200 bg-rose-50",
                  slate: "border-slate-200 bg-slate-50",
                  amber: "border-amber-200 bg-amber-50",
                };
                const chipMap: Record<string, string> = {
                  emerald: "bg-emerald-100 text-emerald-700",
                  rose: "bg-rose-100 text-rose-700",
                  slate: "bg-slate-100 text-slate-600",
                  amber: "bg-amber-100 text-amber-700",
                };
                return (
                  <li
                    key={`${step.role}-${i}`}
                    className={`flex items-start gap-4 rounded-2xl border px-5 py-4 ${toneMap[tone]}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{step.role}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${chipMap[tone]}`}>
                          {step.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {step.approverName || "—"} · {step.timestamp || "pending"}
                      </p>
                      {step.remarks && (
                        <p className="mt-1 text-xs italic text-slate-500">{step.remarks}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* precondition checks — also dynamic */}
          {preconditions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Precondition checks
              </h4>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {preconditions.map((p) => (
                  <li
                    key={p.key}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-xs ${
                      p.passed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : p.severity === "blocker"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span>{p.passed ? "✅" : p.severity === "blocker" ? "❌" : "⚠️"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{p.label}</p>
                      {p.message && <p className="text-[11px] opacity-80">{p.message}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
