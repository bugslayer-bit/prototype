type SimpleForm = {
  nationality: string;
  contractorId: string;
  currencyType: string;
  ifscCode: string;
  swiftCode: string;
  accountStatus: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  contactRole: string;
  contactPerson: string;
  sanctionsCheck: string;
  workflowNote: string;
  sanctionType: string;
  sanctionStartDate: string;
  sanctionEndDate: string;
  autoReactivation: string;
  sanctionReason: string;
  sanctionCategory: string;
  affectedAgency: string;
  sanctioningAgency: string;
  supportingDocuments: string;
  sanctionStatus: string;
};

type BankRow = {
  id: string;
  holderName: string;
  accountNumber: string;
  type: string;
  category: string;
  bank: string;
  branch: string;
  primary: "Yes" | "No";
};

type ContactRow = {
  id: string;
  salutation: string;
  firstName: string;
  middleName: string;
  lastName: string;
  nationalId: string;
  gender: string;
  email: string;
  mobileNumber: string;
  landlineNumber: string;
  jobTitle: string;
  isPrimaryContact: string;
  isIfmisDesignated: string;
  isActive: string;
};

interface SharedBaseProps {
  form: SimpleForm;
  kind: "individual" | "business";
  inputClass: string;
  lockedInputClass: string;
  labelClass: string;
  masterDataMap: Map<string, string[]>;
  getMasterOptions: (map: Map<string, string[]>, id: string) => string[];
  updateField: (key: keyof SimpleForm, value: string) => void;
}

interface BankProps extends SharedBaseProps {
  bankRows: BankRow[];
  primaryAccountOptions: readonly ("Yes" | "No")[];
  updateBankRow: (rowId: string, key: keyof BankRow, value: string) => void;
  removeBankRow: (rowId: string) => void;
  addBankRow: () => void;
}

interface ContactProps extends SharedBaseProps {
  contactRows: ContactRow[];
  updateContactRow: (rowId: string, key: keyof ContactRow, value: string) => void;
  removeContactRow: (rowId: string) => void;
  addContactRow: () => void;
}

interface SanctionsProps extends SharedBaseProps {}

export function ContractorBankAccountSection({
  form,
  kind,
  inputClass,
  lockedInputClass,
  labelClass,
  masterDataMap,
  getMasterOptions,
  updateField,
  bankRows,
  primaryAccountOptions,
  updateBankRow,
  removeBankRow,
  addBankRow
}: BankProps) {
  const isNational = form.nationality === "Bhutanese";

  return (
    <div className="mt-6 grid gap-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Profile Type:</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700">{kind === "individual" ? "Individual" : "Business"}</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700">{isNational ? "National" : "International"}</span>
        </div>
        <p className="mt-2 leading-6">
          {isNational
            ? "National bank accounts are validated via Bank CBS."
            : "International bank accounts require IFSC and SWIFT support, while only one primary account should be active for the contractor."}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-gray-900">Bank Account Details</h3>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
          <strong>{isNational ? "National:" : "International:"}</strong>{" "}
          {isNational ? "Validated via Bank CBS." : "IFSC/SWIFT mandatory. Only one primary account per contractor."}
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-[980px] w-full text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {["#", "Holder Name", "Account No.", "Type", "Category", "Bank", "Branch", "Primary", ""].map((heading) => (
                  <th key={heading} className="border-b border-gray-200 px-4 py-3 text-sm font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bankRows.map((row, index) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{index + 1}</td>
                  <td className="px-4 py-3"><input className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.holderName} placeholder="Holder name" onChange={(event) => updateBankRow(row.id, "holderName", event.target.value)} /></td>
                  <td className="px-4 py-3"><input className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.accountNumber} placeholder="Account no." onChange={(event) => updateBankRow(row.id, "accountNumber", event.target.value)} /></td>
                  <td className="px-4 py-3">
                    <select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.type} onChange={(event) => updateBankRow(row.id, "type", event.target.value)}>
                      <option value="">--</option>
                      {getMasterOptions(masterDataMap, "account-type").map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.category} onChange={(event) => updateBankRow(row.id, "category", event.target.value)}>
                      <option value="">--</option>
                      {getMasterOptions(masterDataMap, "bank-category").map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.bank} onChange={(event) => updateBankRow(row.id, "bank", event.target.value)}>
                      <option value="">-- Bank --</option>
                      {getMasterOptions(masterDataMap, "bank-name").map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.branch} onChange={(event) => updateBankRow(row.id, "branch", event.target.value)}>
                      <option value="">-- Branch --</option>
                      {getMasterOptions(masterDataMap, "bank-branch-name").map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.primary} onChange={(event) => updateBankRow(row.id, "primary", event.target.value)}>
                      {primaryAccountOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center"><button type="button" className="text-lg font-bold text-gray-600" onClick={() => removeBankRow(row.id)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="mt-4 rounded-2xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50" onClick={addBankRow}>
          + Add Bank Account
        </button>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Account ID
            <input className={lockedInputClass} type="text" value="Unique, sequential (system)" readOnly />
          </label>
          <label className={labelClass}>
            Contractor ID
            <input className={lockedInputClass} type="text" value={form.contractorId || "REF to Contractor"} readOnly />
          </label>
          <label className={labelClass}>
            Currency
            <select className={inputClass} value={form.currencyType} onChange={(event) => updateField("currencyType", event.target.value)}>
              {getMasterOptions(masterDataMap, "currency-type").map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          {!isNational ? (
            <>
              <label className={labelClass}>
                IFSC Code
                <input className={inputClass} type="text" value={form.ifscCode} placeholder="Enter IFSC code" onChange={(event) => updateField("ifscCode", event.target.value)} />
              </label>
              <label className={labelClass}>
                SWIFT Code
                <input className={inputClass} type="text" value={form.swiftCode} placeholder="Enter SWIFT code" onChange={(event) => updateField("swiftCode", event.target.value)} />
              </label>
            </>
          ) : null}
          <label className={labelClass}>
            Account Status
            <select className={inputClass} value={form.accountStatus} onChange={(event) => updateField("accountStatus", event.target.value)}>
              {getMasterOptions(masterDataMap, "account-status").map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export function ContractorContactSection({
  form,
  kind,
  inputClass,
  lockedInputClass,
  labelClass,
  masterDataMap,
  getMasterOptions,
  updateField,
  contactRows,
  updateContactRow,
  removeContactRow,
  addContactRow
}: ContactProps) {
  const yesNoOptions = getMasterOptions(masterDataMap, "boolean-choice");

  return (
    <div className="mt-6 grid gap-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Profile Type:</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700">{kind === "individual" ? "Individual" : "Business"}</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700">{form.nationality}</span>
        </div>
        <p className="mt-2 leading-6">At least one IFMIS designated contact is required. Default `Contact Active` should be `Yes` for a new contact profile.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-gray-900">Point of Contact(s) for the Contractor</h3>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
          National ID can be pulled from Census / DCRC where applicable. At least one IFMIS designated contact is required.
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-[980px] w-full text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {["#", "Salutation", "First Name", "Middle", "Last Name", "National ID (CID)", "Gender", ""].map((heading) => (
                  <th key={heading} className="border-b border-gray-200 px-4 py-3 text-sm font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contactRows.map((row, index) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{index + 1}</td>
                  <td className="px-4 py-3"><select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.salutation} onChange={(event) => updateContactRow(row.id, "salutation", event.target.value)}><option value="">--</option>{getMasterOptions(masterDataMap, "salutation").map((option) => <option key={option}>{option}</option>)}</select></td>
                  <td className="px-4 py-3"><input className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.firstName} placeholder="First name" onChange={(event) => updateContactRow(row.id, "firstName", event.target.value)} /></td>
                  <td className="px-4 py-3"><input className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.middleName} placeholder="Mid" onChange={(event) => updateContactRow(row.id, "middleName", event.target.value)} /></td>
                  <td className="px-4 py-3"><input className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.lastName} placeholder="Last name" onChange={(event) => updateContactRow(row.id, "lastName", event.target.value)} /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><input className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.nationalId} placeholder="CID" onChange={(event) => updateContactRow(row.id, "nationalId", event.target.value)} /><button type="button" className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700">⌕</button></div></td>
                  <td className="px-4 py-3"><select className="w-full rounded-xl border border-gray-200 px-3 py-2" value={row.gender} onChange={(event) => updateContactRow(row.id, "gender", event.target.value)}><option value="">--</option>{getMasterOptions(masterDataMap, "gender").map((option) => <option key={option}>{option}</option>)}</select></td>
                  <td className="px-4 py-3 text-center"><button type="button" className="text-lg font-bold text-gray-600" onClick={() => removeContactRow(row.id)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}><span>Contact ID</span><input className={lockedInputClass} type="text" value="Unique, sequential" readOnly /></label>
          <label className={labelClass}><span>Contractor ID</span><input className={lockedInputClass} type="text" value={form.contractorId || "REF to Contractor"} readOnly /></label>
          <label className={labelClass}>Email<input className={inputClass} type="email" value={form.email} placeholder="Email (validated)" onChange={(event) => updateField("email", event.target.value)} /></label>
          <label className={labelClass}>Mobile Number<input className={inputClass} type="text" value={form.phone} placeholder="+975 XX XX XX XX" onChange={(event) => updateField("phone", event.target.value)} /></label>
          <label className={labelClass}>Landline Number<input className={inputClass} type="text" value={form.secondaryPhone} placeholder="Optional" onChange={(event) => updateField("secondaryPhone", event.target.value)} /></label>
          <label className={labelClass}>Job Title<input className={inputClass} type="text" value={form.contactRole} placeholder="Auto-populated from Census/CID" onChange={(event) => updateField("contactRole", event.target.value)} /></label>
          <label className={labelClass}>
            Primary Contact?
            <div className="mt-3 flex flex-wrap gap-5">{yesNoOptions.map((option) => <label key={option} className="inline-flex items-center gap-2"><input type="radio" name="primary-contact" value={option} checked={form.contactPerson === option} onChange={(event) => updateField("contactPerson", event.target.value)} />{option}</label>)}</div>
          </label>
          <label className={labelClass}>
            Designated for e-Services for IFMIS?
            <div className="mt-3 flex flex-wrap gap-5">{yesNoOptions.map((option) => <label key={option} className="inline-flex items-center gap-2"><input type="radio" name="designated-contact" value={option} checked={form.sanctionsCheck === option} onChange={(event) => updateField("sanctionsCheck", event.target.value)} />{option}</label>)}</div>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Contact Active?
            <div className="mt-3 flex flex-wrap gap-5">{yesNoOptions.map((option) => <label key={option} className="inline-flex items-center gap-2"><input type="radio" name="contact-active" value={option} checked={form.workflowNote === option} onChange={(event) => updateField("workflowNote", event.target.value)} />{option}</label>)}</div>
          </label>
        </div>

        <button type="button" className="mt-5 rounded-2xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50" onClick={addContactRow}>
          + Add Another Contact
        </button>
      </div>
    </div>
  );
}

export function ContractorSanctionsSection({
  form,
  kind,
  inputClass,
  lockedInputClass,
  labelClass,
  masterDataMap,
  getMasterOptions,
  updateField
}: SanctionsProps) {
  const yesNoOptions = getMasterOptions(masterDataMap, "boolean-choice");
  const sanctionRecordReady = Boolean(form.sanctionType || form.sanctionCategory || form.sanctionReason || form.sanctionStatus);

  return (
    <div className="mt-6 grid gap-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Profile Type:</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700">{kind === "business" ? "Contractor" : "Individual"}</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700">{form.nationality}</span>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 font-semibold text-gray-700">{sanctionRecordReady ? "Sanction Draft Active" : "Post-Registration Stage"}</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-gray-900">Contractor Sanctions</h3>
        </div>
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
          <strong>Sanctions are applied post-registration.</strong> Sanction records can be auto-generated or completed during sanctioning workflow approval.
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}><span>Sanction ID</span><input className={lockedInputClass} type="text" value="System Generated" readOnly /></label>
          <label className={labelClass}><span>Contractor ID / Supplier ID</span><input className={lockedInputClass} type="text" value={form.contractorId || "REF to Contractor"} readOnly /></label>
          <label className={labelClass}>Sanction Type<select className={inputClass} value={form.sanctionType} onChange={(event) => updateField("sanctionType", event.target.value)}><option value="">--</option>{getMasterOptions(masterDataMap, "sanction-type").map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className={labelClass}>Sanction Start Date<input className={inputClass} type="date" value={form.sanctionStartDate} onChange={(event) => updateField("sanctionStartDate", event.target.value)} /></label>
          <label className={labelClass}>Sanction End Date<input className={inputClass} type="date" value={form.sanctionEndDate} onChange={(event) => updateField("sanctionEndDate", event.target.value)} /></label>
          <label className={labelClass}>Auto Reactivation?<div className="mt-3 flex flex-wrap gap-5">{yesNoOptions.map((option) => <label key={option} className="inline-flex items-center gap-2"><input type="radio" name="auto-reactivation" value={option} checked={form.autoReactivation === option} onChange={(event) => updateField("autoReactivation", event.target.value)} />{option}</label>)}</div></label>
          <label className={`${labelClass} md:col-span-2`}>Sanction Reason<textarea className={`${inputClass} min-h-24`} value={form.sanctionReason} onChange={(event) => updateField("sanctionReason", event.target.value)} /></label>
          <label className={labelClass}>Sanction Category<select className={inputClass} value={form.sanctionCategory} onChange={(event) => updateField("sanctionCategory", event.target.value)}><option value="">--</option>{getMasterOptions(masterDataMap, "sanction-category").map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className={labelClass}>Affected Agencies<select className={inputClass} value={form.affectedAgency} onChange={(event) => updateField("affectedAgency", event.target.value)}><option value="">-- Agency Master --</option>{getMasterOptions(masterDataMap, "affected-agencies").map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className={labelClass}>Sanctioning Agency<input className={inputClass} type="text" value={form.sanctioningAgency} onChange={(event) => updateField("sanctioningAgency", event.target.value)} /></label>
          <label className={labelClass}>Supporting Documents<input className={inputClass} type="text" value={form.supportingDocuments} onChange={(event) => updateField("supportingDocuments", event.target.value)} /></label>
          <label className={labelClass}>Sanction Status<select className={inputClass} value={form.sanctionStatus} onChange={(event) => updateField("sanctionStatus", event.target.value)}><option value="">--</option>{getMasterOptions(masterDataMap, "sanction-status").map((option) => <option key={option}>{option}</option>)}</select></label>
        </div>
      </div>
    </div>
  );
}
