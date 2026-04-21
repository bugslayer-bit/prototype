import { useState, useEffect, useCallback } from "react";
import type { BankAccountRow, SharedStageProps } from "./sharedTypes";
import { getAllBanks, getBranchesForBank } from "../../../../shared/data/bankData";

interface BankAccountStageProps extends SharedStageProps {
  bankRows: BankAccountRow[];
  primaryAccountOptions: readonly ("Yes" | "No")[];
  updateBankRow: (rowId: string, key: keyof BankAccountRow, value: string) => void;
  addBankRow: () => void;
  removeBankRow: (rowId: string) => void;
  isBhutanese?: boolean;
  onCbsVerify?: (rowId: string, accountNumber?: string) => void;
  cbsVerifyingRowId?: string | null;
  /** When 'amendment', CBS-verified account numbers are read-only (external system data) */
  mode?: 'registration' | 'amendment';
}

/* Snapshot of a row before editing — used for cancel/restore */
type RowSnapshot = Omit<BankAccountRow, "id">;

function snapshotRow(r: BankAccountRow): RowSnapshot {
  const { id: _, ...rest } = r;
  return rest;
}

export function BankAccountStage({
  kind,
  form,
  inputClass,
  labelClass,
  lockedInputClass,
  getMasterOptions,
  updateField,
  bankRows,
  updateBankRow,
  addBankRow,
  removeBankRow,
  isBhutanese = false,
  onCbsVerify,
  cbsVerifyingRowId = null,
  mode = 'registration',
}: BankAccountStageProps) {
  /* In amendment mode, CBS-verified account numbers are read-only (external system) */
  const isAmendment = mode === 'amendment';
  const [pendingAccNum, setPendingAccNum] = useState("");
  const [pendingVerifyAccNum, setPendingVerifyAccNum] = useState("");
  const isVerifying = cbsVerifyingRowId !== null;
  const hasRows = bankRows.length > 0;

  /* ── Edit-mode state ── */
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<RowSnapshot | null>(null);

  const startEdit = useCallback((row: BankAccountRow) => {
    setEditSnapshot(snapshotRow(row));
    setEditingRowId(row.id);
  }, []);

  const cancelEdit = useCallback(() => {
    if (editingRowId && editSnapshot) {
      /* Restore original values */
      const keys = Object.keys(editSnapshot) as (keyof RowSnapshot)[];
      keys.forEach(k => {
        updateBankRow(editingRowId, k, String(editSnapshot[k]));
      });
    }
    setEditingRowId(null);
    setEditSnapshot(null);
  }, [editingRowId, editSnapshot, updateBankRow]);

  const saveEdit = useCallback(() => {
    setEditingRowId(null);
    setEditSnapshot(null);
  }, []);

  /* ── CBS verify helpers ── */
  function handleAddAndVerify() {
    if (!pendingAccNum.trim() || !onCbsVerify) return;
    const accNum = pendingAccNum.trim();
    const targetRow = bankRows.find(r => !r.cbsVerified && !r.accountNumber.trim());
    if (targetRow) {
      onCbsVerify(targetRow.id, accNum);
      setPendingAccNum("");
    } else {
      addBankRow();
      setPendingVerifyAccNum(accNum);
      setPendingAccNum("");
    }
  }

  useEffect(() => {
    if (!pendingVerifyAccNum || !onCbsVerify || isVerifying) return;
    const lastRow = bankRows[bankRows.length - 1];
    if (lastRow && !lastRow.cbsVerified && !lastRow.accountNumber.trim()) {
      const accNum = pendingVerifyAccNum;
      setPendingVerifyAccNum("");
      onCbsVerify(lastRow.id, accNum);
    }
  }, [bankRows, pendingVerifyAccNum, onCbsVerify, isVerifying]);

  /* Shared cell styles */
  const cellCls = "px-4 py-3 text-sm align-middle";
  const inpCls = "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
  const selCls = "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
  const miniLabel = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

  /* ── Render helper: editable or read-only cell ── */
  function renderCell(row: BankAccountRow, isEditing: boolean, field: keyof BankAccountRow, display: React.ReactNode, editEl: React.ReactNode) {
    return isEditing ? editEl : display;
  }

  return (
    <div className="grid gap-5">
      {/* ── Verify input for Bhutanese ── */}
      {isBhutanese && (
        <div className="rounded-[30px] border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">Add Bank Account</h4>
          <p className="text-[10px] text-slate-400 mb-4">Enter account number and verify with CBS — details auto-populate into the table below</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className={labelClass}>Account Number <span className="text-red-400">*</span></label>
              <input
                className={inputClass}
                value={pendingAccNum}
                placeholder="Enter bank account number"
                onChange={e => setPendingAccNum(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddAndVerify(); }}
              />
            </div>
            <button
              type="button"
              disabled={isVerifying || !pendingAccNum.trim()}
              onClick={handleAddAndVerify}
              className="shrink-0 rounded-xl bg-[#2563eb] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isVerifying ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Verifying…
                </span>
              ) : "Verify & Add"}
            </button>
          </div>
        </div>
      )}

      {/* ── Accounts table ── */}
      {hasRows && (
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Bank Accounts
              <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-slate-400">
                {bankRows.filter(r => r.cbsVerified).length > 0
                  ? `${bankRows.filter(r => r.cbsVerified).length} verified`
                  : `${bankRows.length} account(s)`}
              </span>
            </h4>
            {!isBhutanese && (
              <button type="button" onClick={addBankRow} className="rounded-lg bg-[#2563eb] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#1d4ed8]">
                + Add Account
              </button>
            )}
          </div>

          {/* ══════ Desktop table ══════ */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-2.5 w-10">#</th>
                  <th className="px-4 py-2.5">Bank Name</th>
                  <th className="px-4 py-2.5">Branch</th>
                  <th className="px-4 py-2.5">Account No.</th>
                  <th className="px-4 py-2.5">Account Name</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5 w-24">Currency</th>
                  <th className="px-4 py-2.5 w-24">Primary?</th>
                  <th className="px-4 py-2.5 w-20">Status</th>
                  <th className="px-4 py-2.5 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bankRows.map((row, idx) => {
                  const v = row.cbsVerified;
                  const isRowVerifying = cbsVerifyingRowId === row.id;
                  const isEditing = editingRowId === row.id;
                  /* For Bhutanese: only show rows that are verified or being verified */
                  if (isBhutanese && !v && !isRowVerifying) return null;

                  /* ── Verifying spinner row ── */
                  if (isRowVerifying && !v) {
                    return (
                      <tr key={row.id} className="animate-pulse border-b border-slate-100 bg-slate-50">
                        <td className={`${cellCls} font-semibold text-slate-400`}>{idx + 1}</td>
                        <td colSpan={8} className={`${cellCls} text-slate-500 italic`}>
                          <span className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            Verifying account with CBS…
                          </span>
                        </td>
                        <td className={cellCls}></td>
                      </tr>
                    );
                  }

                  /* Whether this row shows editable inputs */
                  const editable = !v || isEditing;

                  return (
                    <tr key={row.id} className={`border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60 ${isEditing ? "bg-amber-50/30" : v ? "bg-white" : "bg-slate-50/40"}`}>
                      {/* # */}
                      <td className={`${cellCls} font-semibold text-slate-400`}>
                        <div className="flex items-center gap-1.5">
                          {idx + 1}
                          {v && !isEditing && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="CBS Verified" />}
                          {isEditing && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" title="Editing" />}
                        </div>
                      </td>
                      {/* Bank Name */}
                      <td className={cellCls}>
                        {editable ? (
                          <select className={selCls} value={row.bank} onChange={e => { updateBankRow(row.id, "bank", e.target.value); updateBankRow(row.id, "branch", ""); }}>
                            <option value="">-- Select Bank --</option>
                            {getAllBanks().map(o => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <span className="font-medium text-slate-800">{row.bank}</span>
                        )}
                      </td>
                      {/* Branch */}
                      <td className={cellCls}>
                        {editable ? (
                          <select className={selCls} value={row.branch} onChange={e => updateBankRow(row.id, "branch", e.target.value)}>
                            <option value="">-- Branch --</option>
                            {(row.bank ? getBranchesForBank(row.bank) : []).map(o => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-600">{row.branch}</span>
                        )}
                      </td>
                      {/* Account No. */}
                      <td className={cellCls}>
                        {editable ? (
                          <input className={inpCls} value={row.accountNumber} placeholder="Account no." onChange={e => updateBankRow(row.id, "accountNumber", e.target.value)} />
                        ) : (
                          <span className="font-mono text-slate-700">{row.accountNumber}</span>
                        )}
                      </td>
                      {/* Account Name */}
                      <td className={cellCls}>
                        {editable ? (
                          <input className={inpCls} value={row.holderName} placeholder="Account name" onChange={e => updateBankRow(row.id, "holderName", e.target.value)} />
                        ) : (
                          <span className="font-medium text-slate-800">{row.holderName}</span>
                        )}
                      </td>
                      {/* Type */}
                      <td className={cellCls}>
                        {editable ? (
                          <select className={selCls} value={row.type} onChange={e => updateBankRow(row.id, "type", e.target.value)}>
                            <option value="">--</option>
                            {getMasterOptions("account-type").map(o => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-600">{row.type}</span>
                        )}
                      </td>
                      {/* Currency */}
                      <td className={cellCls}>
                        {editable ? (
                          <select className={selCls} value={row.currency || "BTN"} onChange={e => updateBankRow(row.id, "currency", e.target.value)}>
                            <option value="">--</option>
                            {getMasterOptions("currency-type").map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <span className="text-slate-600">{row.currency || "BTN"}</span>
                        )}
                      </td>
                      {/* Primary? */}
                      <td className={cellCls}>
                        <select
                          className={editable ? selCls : "w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-sm outline-none"}
                          value={row.primary}
                          onChange={e => updateBankRow(row.id, "primary", e.target.value)}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      {/* Status */}
                      <td className={cellCls}>
                        {editable ? (
                          <select className={selCls} value={row.status || "Active"} onChange={e => updateBankRow(row.id, "status", e.target.value)}>
                            <option value="">--</option>
                            {getMasterOptions("account-status").map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          row.status === "Active" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                          ) : row.status === "Inactive" ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">Inactive</span>
                          ) : row.status === "Suspended" ? (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">Suspended</span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )
                        )}
                      </td>
                      {/* Actions */}
                      <td className={`${cellCls} text-center`}>
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              {/* Save */}
                              <button
                                type="button"
                                onClick={saveEdit}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-700"
                                title="Save changes"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Save
                              </button>
                              {/* Cancel */}
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:bg-slate-50"
                                title="Cancel editing"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Edit */}
                              {v && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(row)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                  title="Edit this account"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  Edit
                                </button>
                              )}
                              {/* Remove */}
                              {bankRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeBankRow(row.id)}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white w-6 h-6 text-slate-300 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                  title="Remove"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Empty state */}
                {isBhutanese && bankRows.filter(r => r.cbsVerified).length === 0 && !isVerifying && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <p className="text-sm text-slate-400">No accounts added yet</p>
                      <p className="text-[10px] text-slate-300 mt-1">Enter an account number above and verify with CBS</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ══════ Mobile cards ══════ */}
          <div className="grid gap-3 p-4 lg:hidden">
            {bankRows.map((row, idx) => {
              const v = row.cbsVerified;
              const isRowVerifying = cbsVerifyingRowId === row.id;
              const isEditing = editingRowId === row.id;
              if (isBhutanese && !v && !isRowVerifying) return null;

              if (isRowVerifying && !v) {
                return (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <svg className="h-4 w-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying account with CBS…
                    </div>
                  </div>
                );
              }

              const editable = !v || isEditing;

              return (
                <div key={row.id} className={`rounded-2xl border p-4 transition-colors ${isEditing ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-white"}`}>
                  {/* Card header */}
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{idx + 1}</span>
                      <span className="text-sm font-semibold text-slate-800">{row.holderName || `Account ${idx + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {v && !isEditing && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Verified</span>}
                      {isEditing && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">Editing</span>}
                      {row.primary === "Yes" && <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">Primary</span>}
                    </div>
                  </div>

                  {/* Card fields */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={miniLabel}>Bank Name</label>
                      {editable ? (
                        <select className={selCls} value={row.bank} onChange={e => { updateBankRow(row.id, "bank", e.target.value); updateBankRow(row.id, "branch", ""); }}>
                          <option value="">-- Select Bank --</option>
                          {getAllBanks().map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.bank || "—"}</div>
                      )}
                    </div>
                    <div>
                      <label className={miniLabel}>Branch</label>
                      {editable ? (
                        <select className={selCls} value={row.branch} onChange={e => updateBankRow(row.id, "branch", e.target.value)}>
                          <option value="">-- Branch --</option>
                          {(row.bank ? getBranchesForBank(row.bank) : []).map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.branch || "—"}</div>
                      )}
                    </div>
                    <div>
                      <label className={miniLabel}>Account No.</label>
                      {editable ? (
                        <input className={inpCls} value={row.accountNumber} placeholder="Account number" onChange={e => updateBankRow(row.id, "accountNumber", e.target.value)} />
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">{row.accountNumber || "—"}</div>
                      )}
                    </div>
                    <div>
                      <label className={miniLabel}>Account Name</label>
                      {editable ? (
                        <input className={inpCls} value={row.holderName} placeholder="Account name" onChange={e => updateBankRow(row.id, "holderName", e.target.value)} />
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.holderName || "—"}</div>
                      )}
                    </div>
                    <div>
                      <label className={miniLabel}>Type</label>
                      {editable ? (
                        <select className={selCls} value={row.type} onChange={e => updateBankRow(row.id, "type", e.target.value)}>
                          <option value="">-- Select --</option>
                          {getMasterOptions("account-type").map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.type || "—"}</div>
                      )}
                    </div>
                    <div>
                      <label className={miniLabel}>Currency</label>
                      {editable ? (
                        <select className={selCls} value={row.currency || "BTN"} onChange={e => updateBankRow(row.id, "currency", e.target.value)}>
                          <option value="BTN">BTN</option>
                          <option value="USD">USD</option>
                          <option value="INR">INR</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.currency || "BTN"}</div>
                      )}
                    </div>
                    <div>
                      <label className={miniLabel}>Primary?</label>
                      <select className={selCls} value={row.primary} onChange={e => updateBankRow(row.id, "primary", e.target.value)}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className={miniLabel}>Status</label>
                      {editable ? (
                        <select className={selCls} value={row.status || "Active"} onChange={e => updateBankRow(row.id, "status", e.target.value)}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.status || "Active"}</div>
                      )}
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <button type="button" onClick={saveEdit} className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-emerald-700">Save</button>
                        <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 transition hover:bg-slate-50">Cancel</button>
                      </>
                    ) : (
                      <>
                        {v && (
                          <button type="button" onClick={() => startEdit(row)} className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                            Edit
                          </button>
                        )}
                        {bankRows.length > 1 && (
                          <button type="button" onClick={() => removeBankRow(row.id)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                            Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* International: manual add row button (in footer for non-Bhutanese) */}
          {!isBhutanese && (
            <div className="border-t border-slate-100 px-5 py-3 lg:hidden">
              <button type="button" className="text-sm font-semibold text-slate-500 transition hover:text-slate-900" onClick={addBankRow}>
                + Add Bank Account
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── System auto-generated fields ── */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Account ID <span className="text-[10px] text-gray-400 normal-case tracking-normal font-normal">(auto)</span></label>
          <input className={lockedInputClass} value="System generated" readOnly />
        </div>
        <div>
          <label className={labelClass}>Contractor ID <span className="text-[10px] text-gray-400 normal-case tracking-normal font-normal">(auto)</span></label>
          <input className={lockedInputClass} value={form.contractorId || "Linked to contractor"} readOnly />
        </div>
        <div>
          <label className={labelClass}>Account Category <span className="text-[10px] text-gray-400 normal-case tracking-normal font-normal">(auto)</span></label>
          <input className={lockedInputClass} value={isBhutanese ? "Domestic" : "International"} readOnly />
        </div>
        {!isBhutanese && (
          <div>
            <label className={labelClass}>SWIFT Code</label>
            <input className={inputClass} value={form.swiftCode} placeholder="e.g. BHUBBTBT001" onChange={e => updateField("swiftCode", e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}
