import { useEffect, useState } from "react";
import type { ContractMilestonesSectionProps } from "../sectionProps";

const REQUIRED_DOCUMENTS = [
  { key: "contract-award", label: "Contract Award Letter", category: "all" },
  { key: "variation-order", label: "Variation Order", category: "works" },
  { key: "milestone-cert", label: "Milestone Certificate", category: "milestone" },
  { key: "approval-authority", label: "Approval Authority Document", category: "all" },
  { key: "bank-guarantee", label: "Bank Guarantee (Mobilization Advance)", category: "works" },
  { key: "contract-validity", label: "Contract Validity Document", category: "all" },
  { key: "performance-guarantee", label: "Performance Guarantee", category: "works" }
];

export function ContractMilestonesSection({
  form,
  inputClass,
  labelClass,
  updateField,
  updateMilestoneRow,
  addMilestoneRow,
  addSupportingDocument,
  helperFor
}: ContractMilestonesSectionProps) {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* Auto-calculate net amounts */
  useEffect(() => {
    const nextRows = form.milestoneRows.map((row) => {
      const gross = Number(row.milestoneAmountGross || 0);
      const tax1 = Number(row.milestoneTaxAmount1 || 0);
      const tax2 = Number(row.milestoneTaxAmount2 || 0);
      const deduction1 = Number(row.milestoneDeduction1 || 0);
      const deduction2 = Number(row.milestoneDeduction2 || 0);
      const net = gross - tax1 - tax2 - deduction1 - deduction2;

      return {
        ...row,
        contractId: form.contractId || "Auto-linked",
        netMilestoneAmount: Number.isFinite(net) && net !== 0 ? net.toFixed(2) : gross || tax1 || tax2 || deduction1 || deduction2 ? "0.00" : ""
      };
    });

    if (JSON.stringify(nextRows) !== JSON.stringify(form.milestoneRows)) {
      updateField("milestoneRows", nextRows);
    }
  }, [form.contractId, form.milestoneRows, updateField]);

  function handleDocumentUpload(docKey: string) {
    setUploadingDoc(docKey);
    setTimeout(() => {
      addSupportingDocument(docKey);
      setUploadingDoc(null);
    }, 800);
  }

  const isWorksContract = form.contractCategory.includes("Works");

  /* ── Milestone totals ── */
  const totalGross = form.milestoneRows.reduce((s, r) => s + Number(r.milestoneAmountGross || 0), 0);
  const totalNet = form.milestoneRows.reduce((s, r) => s + Number(r.netMilestoneAmount || 0), 0);

  const fieldInputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50";
  const fieldLockedClass = "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500";
  const fieldSelectClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-50";

  return (
    <div className="mt-5 space-y-6">
      <label className={labelClass}>
        Milestone Planning Notes
        <textarea
          className={`${inputClass} min-h-24`}
          value={form.milestonePlan}
          onChange={(e) => updateField("milestonePlan", e.target.value)}
          placeholder="Describe milestone planning, payment schedule, and workflow notes"
        />
      </label>

      {form.paymentStructure === "Milestone Based" ? (
        <>
          {/* ── Summary Bar ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Milestones</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{form.milestoneRows.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gross</p>
              <p className="mt-1 text-xl font-bold text-slate-900">Nu. {totalGross.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Net</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">Nu. {totalNet.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</p>
              <p className="mt-1 text-xl font-bold text-amber-600">{form.milestoneRows.filter((r) => r.milestoneStatus === "Pending").length}</p>
            </div>
          </div>

          {/* ── Milestone Cards ── */}
          <div className="space-y-3">
            {form.milestoneRows.map((row, index) => {
              const isEditing = editingId === row.id;
              const gross = Number(row.milestoneAmountGross || 0);
              const net = Number(row.netMilestoneAmount || 0);
              const statusColor = row.milestoneStatus === "Completed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : row.milestoneStatus === "Paid" ? "bg-sky-50 text-sky-700 ring-sky-200" : "bg-amber-50 text-amber-700 ring-amber-200";

              return (
                <div key={row.id} className={`rounded-2xl border bg-white transition-all ${isEditing ? "border-sky-300 shadow-lg ring-4 ring-sky-50" : "border-slate-200 hover:border-slate-300"}`}>
                  {/* Card Header — always visible, click to expand */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 px-5 py-4 text-left"
                    onClick={() => setEditingId(isEditing ? null : row.id)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{row.milestoneName || `Milestone ${index + 1}`}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.milestoneId} — {row.estimatedPaymentDate ? new Date(row.estimatedPaymentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date not set"}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">Nu. {gross.toLocaleString()}</p>
                        {net !== gross && net > 0 && <p className="text-[10px] text-slate-400">Net: Nu. {net.toLocaleString()}</p>}
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusColor}`}>
                        {row.milestoneStatus}
                      </span>
                    </div>
                    <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isEditing ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Mobile badges */}
                  {!isEditing && (
                    <div className="flex items-center gap-2 px-5 pb-3 sm:hidden">
                      <span className="text-sm font-bold text-slate-900">Nu. {gross.toLocaleString()}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusColor}`}>
                        {row.milestoneStatus}
                      </span>
                    </div>
                  )}

                  {/* Expanded Edit Panel */}
                  {isEditing && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Milestone ID</label>
                          <input className={fieldLockedClass} value={row.milestoneId} readOnly />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Contract Ref</label>
                          <input className={fieldLockedClass} value={row.contractId} readOnly />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Number</label>
                          <input className={fieldInputClass} value={row.milestoneNumber} onChange={(e) => updateMilestoneRow(row.id, "milestoneNumber", e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-slate-500">Name</label>
                          <input className={fieldInputClass} value={row.milestoneName} onChange={(e) => updateMilestoneRow(row.id, "milestoneName", e.target.value)} placeholder="Milestone name" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">Est. Payment Date</label>
                          <input className={fieldInputClass} type="date" value={row.estimatedPaymentDate} onChange={(e) => updateMilestoneRow(row.id, "estimatedPaymentDate", e.target.value)} />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-xs font-semibold text-slate-500">Description</label>
                          <textarea className={`${fieldInputClass} min-h-[60px]`} value={row.milestoneDescription} onChange={(e) => updateMilestoneRow(row.id, "milestoneDescription", e.target.value)} placeholder="Milestone description" />
                        </div>
                      </div>

                      {/* Financial row */}
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Financial Details</p>
                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Gross Amount</label>
                            <input className={fieldInputClass} value={row.milestoneAmountGross} onChange={(e) => updateMilestoneRow(row.id, "milestoneAmountGross", e.target.value)} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Tax 1</label>
                            <input className={fieldInputClass} value={row.milestoneTaxAmount1} onChange={(e) => updateMilestoneRow(row.id, "milestoneTaxAmount1", e.target.value)} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Tax 2</label>
                            <input className={fieldInputClass} value={row.milestoneTaxAmount2} onChange={(e) => updateMilestoneRow(row.id, "milestoneTaxAmount2", e.target.value)} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Deduction 1</label>
                            <input className={fieldInputClass} value={row.milestoneDeduction1} onChange={(e) => updateMilestoneRow(row.id, "milestoneDeduction1", e.target.value)} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Deduction 2</label>
                            <input className={fieldInputClass} value={row.milestoneDeduction2} onChange={(e) => updateMilestoneRow(row.id, "milestoneDeduction2", e.target.value)} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500">Net Amount</label>
                            <input className={fieldLockedClass} value={row.netMilestoneAmount} readOnly />
                          </div>
                        </div>
                      </div>

                      {/* Status + close */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-semibold text-slate-500">Status</label>
                          <select className={`${fieldSelectClass} w-auto`} value={row.milestoneStatus} onChange={(e) => updateMilestoneRow(row.id, "milestoneStatus", e.target.value)}>
                            {["Pending", "Completed", "Paid"].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" className="rounded-xl border-2 border-dashed border-[#b71c1c] bg-rose-50 px-4 py-3 text-sm font-semibold text-[#b71c1c] transition hover:bg-rose-100" onClick={addMilestoneRow}>
            + Add Milestone
          </button>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">Payment structure is <strong>{form.paymentStructure || "not selected"}</strong>. Milestone table is only shown for Milestone Based contracts.</p>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-[#8f1111]">Supporting Documents</h3>
        <p className="mt-1 text-xs text-slate-500">Upload required supporting documents for this contract.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REQUIRED_DOCUMENTS.filter((doc) => {
            if (doc.category === "works" && !isWorksContract) return false;
            if (doc.category === "milestone" && form.paymentStructure !== "Milestone Based") return false;
            return true;
          }).map((doc) => {
            const uploaded = form.supportingDocLabels.includes(doc.key);
            const isUploading = uploadingDoc === doc.key;
            return (
              <button
                key={doc.key}
                type="button"
                className={`rounded-2xl border-2 border-dashed p-5 text-left transition ${uploaded ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-rose-200"} ${isUploading ? "animate-pulse" : ""}`}
                onClick={() => !uploaded && handleDocumentUpload(doc.key)}
                disabled={uploaded || isUploading}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${uploaded ? "bg-emerald-200 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                    {uploaded ? "✓" : isUploading ? "..." : "+"}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${uploaded ? "text-emerald-800" : "text-slate-700"}`}>{doc.label}</p>
                    <p className="text-xs text-slate-500">{uploaded ? "Document uploaded" : isUploading ? "Uploading..." : "Click to upload"}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
