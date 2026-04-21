import type { ContactRow, SharedStageProps } from "./sharedTypes";

interface ContactStageProps extends SharedStageProps {
  contactRows: ContactRow[];
  updateContactRow: (rowId: string, key: keyof ContactRow, value: string) => void;
  removeContactRow: (rowId: string) => void;
  addContactRow: () => void;
}

export function ContactStage({
  getMasterOptions,
  contactRows,
  updateContactRow,
  removeContactRow,
  addContactRow
}: ContactStageProps) {
  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
  const selectCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
  const labelCls =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

  return (
    <div className="grid gap-5">
      <div className="rounded-[24px] border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4.5 text-sm text-slate-700">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="leading-7">
            Add at least one primary contact person. Each contact should include email, mobile, and job details, and at least one contact should be marked as primary.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Contact Person(s)
            <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-slate-400">
              {contactRows.length} contact{contactRows.length !== 1 ? "s" : ""}
            </span>
          </h4>
          <button
            type="button"
            onClick={addContactRow}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            + Add Another Contact
          </button>
        </div>

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[1440px] text-left">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-3">Contact ID</th>
                <th className="px-4 py-3">Salutation</th>
                <th className="px-4 py-3">First Name</th>
                <th className="px-4 py-3">Middle</th>
                <th className="px-4 py-3">Last Name</th>
                <th className="px-4 py-3">National ID / CID</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Landline</th>
                <th className="px-4 py-3">Primary</th>
                <th className="px-4 py-3">IFMIS</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-center">Remove</th>
              </tr>
            </thead>
            <tbody>
              {contactRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${
                      row.contactId?.startsWith("CI") ? "bg-sky-50 text-sky-700 border border-sky-200" :
                      row.contactId?.startsWith("CB") ? "bg-violet-50 text-violet-700 border border-violet-200" :
                      "bg-slate-50 text-slate-500"
                    }`}>
                      {row.contactId || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select className={selectCls} value={row.salutation} onChange={(e) => updateContactRow(row.id, "salutation", e.target.value)}>
                      <option value="">--</option>
                      {getMasterOptions("salutation").map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} value={row.firstName} placeholder="First name" onChange={(e) => updateContactRow(row.id, "firstName", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} value={row.middleName} placeholder="Middle" onChange={(e) => updateContactRow(row.id, "middleName", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} value={row.lastName} placeholder="Last name" onChange={(e) => updateContactRow(row.id, "lastName", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} value={row.nationalId} placeholder="CID or Passport" onChange={(e) => updateContactRow(row.id, "nationalId", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <select className={selectCls} value={row.gender} onChange={(e) => updateContactRow(row.id, "gender", e.target.value)}>
                      <option value="">--</option>
                      {getMasterOptions("gender").map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} value={row.jobTitle} placeholder="Job title" onChange={(e) => updateContactRow(row.id, "jobTitle", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} type="email" value={row.email} placeholder="Email" onChange={(e) => updateContactRow(row.id, "email", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} value={row.mobileNumber} placeholder="Mobile number" onChange={(e) => updateContactRow(row.id, "mobileNumber", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input className={inputCls} value={row.landlineNumber} placeholder="Landline" onChange={(e) => updateContactRow(row.id, "landlineNumber", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <select className={selectCls} value={row.isPrimaryContact} onChange={(e) => updateContactRow(row.id, "isPrimaryContact", e.target.value)}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className={selectCls} value={row.isIfmisDesignated} onChange={(e) => updateContactRow(row.id, "isIfmisDesignated", e.target.value)}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className={selectCls} value={row.isActive} onChange={(e) => updateContactRow(row.id, "isActive", e.target.value)}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {contactRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContactRow(row.id)}
                        className="text-lg font-bold leading-none text-slate-300 transition hover:text-red-500"
                        title="Remove"
                      >
                        &times;
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 xl:hidden">
          {contactRows.map((row, index) => (
            <div key={row.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {[row.firstName, row.lastName].filter(Boolean).join(" ") || `Contact ${index + 1}`}
                  </span>
                </div>
                {contactRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContactRow(row.id)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Contact ID</label>
                  <div className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono font-bold ${
                    row.contactId?.startsWith("CI") ? "text-sky-700" : row.contactId?.startsWith("CB") ? "text-violet-700" : "text-slate-500"
                  }`}>
                    {row.contactId || "—"}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Salutation</label>
                  <select className={selectCls} value={row.salutation} onChange={(e) => updateContactRow(row.id, "salutation", e.target.value)}>
                    <option value="">--</option>
                    {getMasterOptions("salutation").map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>First Name</label>
                  <input className={inputCls} value={row.firstName} placeholder="First name" onChange={(e) => updateContactRow(row.id, "firstName", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Middle</label>
                  <input className={inputCls} value={row.middleName} placeholder="Middle" onChange={(e) => updateContactRow(row.id, "middleName", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input className={inputCls} value={row.lastName} placeholder="Last name" onChange={(e) => updateContactRow(row.id, "lastName", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>National ID / CID</label>
                  <input className={inputCls} value={row.nationalId} placeholder="CID or Passport" onChange={(e) => updateContactRow(row.id, "nationalId", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select className={selectCls} value={row.gender} onChange={(e) => updateContactRow(row.id, "gender", e.target.value)}>
                    <option value="">--</option>
                    {getMasterOptions("gender").map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Job Title</label>
                  <input className={inputCls} value={row.jobTitle} placeholder="Job title" onChange={(e) => updateContactRow(row.id, "jobTitle", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} type="email" value={row.email} placeholder="Email" onChange={(e) => updateContactRow(row.id, "email", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Mobile</label>
                  <input className={inputCls} value={row.mobileNumber} placeholder="Mobile number" onChange={(e) => updateContactRow(row.id, "mobileNumber", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Landline</label>
                  <input className={inputCls} value={row.landlineNumber} placeholder="Landline" onChange={(e) => updateContactRow(row.id, "landlineNumber", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Primary</label>
                  <select className={selectCls} value={row.isPrimaryContact} onChange={(e) => updateContactRow(row.id, "isPrimaryContact", e.target.value)}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>IFMIS</label>
                  <select className={selectCls} value={row.isIfmisDesignated} onChange={(e) => updateContactRow(row.id, "isIfmisDesignated", e.target.value)}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Active</label>
                  <select className={selectCls} value={row.isActive} onChange={(e) => updateContactRow(row.id, "isActive", e.target.value)}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
